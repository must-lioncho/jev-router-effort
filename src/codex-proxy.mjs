import http from "node:http";
import https from "node:https";
import { createHash, randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { availableTiers, shouldUseExactModel } from "./config.mjs";
import { askJev } from "./router.mjs";
import { decide } from "./policy.mjs";
import { log } from "./log.mjs";
import { writeDecision, writeStatus } from "./status.mjs";

const CHATGPT_BASE_URL = "https://chatgpt.com/backend-api/codex";
const API_BASE_URL = "https://api.openai.com/v1";
export const CODEX_AUTO_MODEL = "jev-router";
export const CODEX_AUTO_EFFORT = "auto";
const DEFAULT_MODELS = {
  haiku: "gpt-5.6-luna",
  sonnet: "gpt-5.6-terra",
  opus: "gpt-5.6-sol",
  fable: "gpt-6-astra",
};
const MODEL_ENV = {
  haiku: "JEV_CODEX_FAST_MODEL",
  sonnet: "JEV_CODEX_BALANCED_MODEL",
  opus: "JEV_CODEX_STRONG_MODEL",
  fable: "JEV_CODEX_LONG_MODEL",
};

export const codexModelOf = (tier) => process.env[MODEL_ENV[tier]] ?? DEFAULT_MODELS[tier];

export function codexTierOf(model) {
  const configured = Object.keys(DEFAULT_MODELS).find((tier) => codexModelOf(tier) === model);
  if (configured) return configured;
  if (/(?:astra|fable|long)/i.test(model ?? "")) return "fable";
  if (/(?:sol|opus|strong|max|pro)/i.test(model ?? "")) return "opus";
  if (/(?:luna|haiku|fast|mini|nano)/i.test(model ?? "")) return "haiku";
  return /^gpt-/i.test(model ?? "") ? "sonnet" : null;
}

/** Only models reported by the account are eligible, including on cold start. */
export function codexModels(models = new Map()) {
  const available = [...models.values()]
    .filter((model) => model.slug !== CODEX_AUTO_MODEL && model.supported_in_api !== false)
    .map((model) => ({
      id: model.slug,
      tier: codexTierOf(model.slug),
      description: [
        model.display_name,
        model.description,
        model.context_window && `${model.context_window} context tokens`,
        model.supported_reasoning_levels?.length &&
          `supported reasoning efforts: ${model.supported_reasoning_levels.map((level) => level.effort).join(", ")}`,
      ].filter(Boolean).join("; "),
      efforts: model.supported_reasoning_levels?.map((level) => level.effort).filter(Boolean) ?? [],
      defaultEffort: model.default_reasoning_level ?? null,
    }))
    .filter((model) => model.tier);
  return available;
}

const modelForTier = (models, tier) =>
  models.find((model) => model.tier === tier)?.id ?? models[0]?.id;

const textOf = (content) => {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .filter((item) => item?.type === "text" || item?.type === "input_text")
    .map((item) => item.text)
    .join("\n");
};

const cleanPrompt = (text) =>
  text
    .replace(/<system[-_]reminder>[\s\S]*?<\/system[-_]reminder>/gi, "")
    .replace(/<current_datetime>[\s\S]*?<\/current_datetime>/gi, "")
    .replace(/<environment_context>[\s\S]*?<\/environment_context>/gi, "")
    .trim();

export const isCodexAuxiliaryPrompt = (prompt) =>
  /^Generate a concise, single-line task title\b/i.test(prompt);

/** User text that starts a new Codex turn, or null for tool continuations. */
export function codexNewTurnPrompt(body) {
  if (!Array.isArray(body?.input)) return null;
  if (!body.input.some((item) => item?.type === "additional_tools")) return null;
  for (const item of [...body.input].reverse()) {
    if (item?.type === "function_call_output" || item?.type === "custom_tool_call_output") return null;
    if (item?.role !== "user") continue;
    const prompt = cleanPrompt(textOf(item.content));
    if (prompt && !isCodexAuxiliaryPrompt(prompt)) return prompt;
  }
  return null;
}

export function codexConversationKey(body) {
  const stable =
    body?.prompt_cache_key ??
    body?.client_metadata?.["x-codex-turn-metadata"] ??
    `${body?.instructions ?? ""}|${textOf(body?.input?.find((item) => item?.role === "user")?.content)}`;
  return createHash("sha1").update(String(stable)).digest("hex").slice(0, 12);
}

export function addJevModel(catalog) {
  if (!Array.isArray(catalog?.models) || catalog.models.some((model) => model.slug === CODEX_AUTO_MODEL)) {
    return catalog;
  }
  const template =
    catalog.models.find((model) => model.slug === codexModelOf("sonnet")) ??
    catalog.models.find((model) => model.visibility === "list") ??
    catalog.models[0];
  if (!template) return catalog;
  const effortLevels = [];
  const seenEfforts = new Set();
  for (const model of catalog.models) {
    for (const level of model.supported_reasoning_levels ?? []) {
      if (!level?.effort || seenEfforts.has(level.effort)) continue;
      seenEfforts.add(level.effort);
      effortLevels.push(level);
    }
  }
  catalog.models.unshift({
    ...template,
    slug: CODEX_AUTO_MODEL,
    display_name: "Jev Router",
    description: "Jev picks the cheapest model that can complete each turn.",
    visibility: "list",
    supported_in_api: true,
    priority: 0,
    upgrade: null,
    default_reasoning_level: CODEX_AUTO_EFFORT,
    supported_reasoning_levels: [
      { effort: CODEX_AUTO_EFFORT, description: "Jev chooses the reasoning effort for each turn." },
      ...effortLevels,
    ],
  });
  return catalog;
}

export function applyCodexTier(body, tier, models = new Map(), model = codexModelOf(tier)) {
  body.model = model;
  const info = models.get(model);
  const efforts = info?.supported_reasoning_levels?.map((level) => level.effort);
  if (body.reasoning?.effort && efforts?.length && !efforts.includes(body.reasoning.effort)) {
    body.reasoning.effort = info.default_reasoning_level;
  }
  return body;
}

/** Keep Jev's effort only when the selected exact model advertises support for it. */
export function effortForModel(model, requested, fallback) {
  const efforts = model?.efforts ?? [];
  if (requested && efforts.includes(requested)) return requested;
  if (fallback && efforts.includes(fallback)) return fallback;
  if (model?.defaultEffort && efforts.includes(model.defaultEffort)) return model.defaultEffort;
  return efforts[0] ?? null;
}

export const upstreamFor = (
  headers,
  path = "",
  chatgptBaseURL = CHATGPT_BASE_URL,
  apiBaseURL = API_BASE_URL,
) => /\/models(?:\?|$)/.test(path) || headers["chatgpt-account-id"] ? chatgptBaseURL : apiBaseURL;

export function jevDecisionEvents({ tier, model = codexModelOf(tier), effort, effortMode, confidence, effortConfidence, reason }) {
  const detail = confidence == null ? reason : `${reason}, confidence ${confidence.toFixed(2)}`;
  const effortDetail = effort
    ? effortMode === CODEX_AUTO_EFFORT
      ? `, effort auto → ${effort}${effortConfidence == null ? "" : ` (${effortConfidence.toFixed(2)})`}`
      : `, effort ${effort} (manual)`
    : "";
  const id = `jev-${randomUUID()}`;
  const text = reason.startsWith("jev-unavailable")
    ? `[Jev] unavailable; using ${model}. Add JEV_API_KEY=... to ~/.jev-router.env and restart jev-codex.`
    : `[Jev] routed this turn to ${model} (${detail}${effortDetail}).`;
  const item = {
    type: "message",
    role: "assistant",
    id,
    phase: "commentary",
    content: [{ type: "output_text", text }],
  };
  const events = [
    { type: "response.output_item.added", item: { ...item, content: [] } },
    { type: "response.output_text.delta", item_id: id, delta: text },
    { type: "response.output_item.done", item },
  ];
  return events.map((event) => `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`).join("");
}

const debug = (line) => process.env.JEV_DEBUG && log(line);
const upstreamPath = (base, path) => `${new URL(base).pathname.replace(/\/$/, "")}${path}`;

export async function startCodexProxy({
  chatgptBaseURL = CHATGPT_BASE_URL,
  apiBaseURL = API_BASE_URL,
  route = askJev,
  statusId = "",
} = {}) {
  const states = new Map();
  const models = new Map();

  const server = http.createServer((req, res) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", async () => {
      let out = Buffer.concat(chunks);
      let routing;
      if (req.method === "POST" && /\/responses(?:\?|$)/.test(req.url ?? "")) {
        try {
          const body = JSON.parse(out.toString());
          if (process.env.JEV_DUMP) {
            writeFileSync(`${process.env.JEV_DUMP}.${Date.now()}.json`, JSON.stringify(body, null, 2));
          }
          if (body.model === CODEX_AUTO_MODEL) {
            // Codex may reuse its own catalog cache and never GET /models through us.
            // Fetch with this request's account credentials instead of inventing ids.
            if (!models.size) {
              const headers = { ...req.headers };
              for (const name of ["host", "content-length", "connection", "content-type", "accept-encoding"]) delete headers[name];
              const clientVersion = req.headers["version"] ?? /codex[^/]*\/([\d.]+)/i.exec(req.headers["user-agent"] ?? "")?.[1] ?? "0.157.1";
              const response = await fetch(`${chatgptBaseURL}/models?client_version=${encodeURIComponent(clientVersion)}`, {
                headers, signal: AbortSignal.timeout(15000),
              });
              if (!response.ok) throw new Error(`Model catalog HTTP ${response.status}`);
              const catalog = await response.json();
              if (!Array.isArray(catalog.models)) throw new Error("Invalid model catalog");
              for (const info of catalog.models) models.set(info.slug, info);
            }
            const key = codexConversationKey(body);
            const candidates = codexModels(models).filter((model) =>
              availableTiers().includes(model.tier) &&
              // Keep the CLI's wire format: Lite bodies cannot safely be sent
              // to legacy models merely by removing the protocol header.
              (req.headers["x-openai-internal-codex-responses-lite"] === undefined ||
                models.get(model.id)?.use_responses_lite === true),
            );
            const available = [...new Set(candidates.map((model) => model.tier))];
            if (!candidates.length) throw new Error("No account models available for routing");
            const previousModel = states.get(key)?.model;
            const currentModel = candidates.some((model) => model.id === previousModel)
              ? previousModel : modelForTier(candidates, "opus");
            const current = codexTierOf(currentModel) ?? "opus";
            const prompt = codexNewTurnPrompt(body);
            const explaining = prompt?.includes("<jev-explain>") || /^\$jev-explain\b/i.test(prompt ?? "");
            let tier = current;
            let model = currentModel;
            const requestedEffort = body.reasoning?.effort ?? CODEX_AUTO_EFFORT;
            const effortMode = requestedEffort === CODEX_AUTO_EFFORT ? CODEX_AUTO_EFFORT : "manual";
            let effort = effortMode === "manual" ? requestedEffort : states.get(key)?.effort ?? null;
            if (prompt && !explaining) {
              const contextTokens = Math.round(JSON.stringify(body.input).length / 4);
              const efforts = [...new Set(candidates.flatMap((candidate) => candidate.efforts))];
              const jev = await route({
                prompt,
                current: currentModel,
                currentEffort: effort,
                contextTokens,
                models: candidates,
                efforts: effortMode === CODEX_AUTO_EFFORT ? efforts : [],
              });
              const chosen = candidates.find((candidate) => candidate.id === jev?.choice);
              const decision = decide({
                prompt,
                jev: jev && { ...jev, choice: chosen?.tier },
                current,
                available,
                contextTokens,
              });
              tier = decision.tier;
              model =
                shouldUseExactModel(decision.reason, chosen?.tier, tier)
                  ? chosen.id
                  : tier === current
                    ? currentModel
                    : modelForTier(candidates, tier);
              const selected = candidates.find((candidate) => candidate.id === model);
              effort = effortForModel(
                selected,
                effortMode === CODEX_AUTO_EFFORT ? jev?.effort : requestedEffort,
                effort,
              );
              states.set(key, { tier, model, effort, effortMode });
              routing = {
                prompt,
                tier,
                model,
                effort,
                effortMode,
                confidence: jev?.confidence ?? null,
                effortConfidence: effortMode === CODEX_AUTO_EFFORT ? jev?.effortConfidence ?? null : null,
                metrics: jev?.metrics ?? null,
                reason: decision.reason,
                jev: jev ? { request: jev.request, response: jev.response } : null,
                at: Date.now(),
              };
              writeDecision(statusId, routing);
              debug(`${key} ${current} -> ${tier} (${decision.reason}) | ${prompt.slice(0, 60)}`);
            }
            if (effort) {
              body.reasoning ??= {};
              body.reasoning.effort = effort;
            }
            applyCodexTier(body, tier, models, model);
          } else {
            const prompt = codexNewTurnPrompt(body);
            const explaining = prompt?.includes("<jev-explain>") || /^\$jev-explain\b/i.test(prompt ?? "");
            if (prompt && !explaining) writeStatus(statusId, { manual: true, at: Date.now() });
          }
          out = Buffer.from(JSON.stringify(body));
        } catch (err) {
          res.writeHead(503, { "content-type": "application/json" });
          res.end(JSON.stringify({ error: { message: `Jev routing failed: ${err.message}`, type: "routing_error" } }));
          return;
        }
      }

      const base = upstreamFor(req.headers, req.url, chatgptBaseURL, apiBaseURL);
      const target = new URL(base);
      const transport = target.protocol === "http:" ? http : https;
      const headers = { ...req.headers, host: target.host };
      delete headers["content-length"];
      const upstream = transport.request(
        {
          hostname: target.hostname,
          port: target.port || undefined,
          path: upstreamPath(base, req.url ?? "/"),
          method: req.method,
          headers,
        },
        (response) => {
          const responseHeaders = { ...response.headers };
          const isModels = req.method === "GET" && /\/models(?:\?|$)/.test(req.url ?? "");
          if (isModels) {
            const body = [];
            response.on("data", (chunk) => body.push(chunk));
            response.on("end", () => {
              let data = Buffer.concat(body);
              try {
                const catalog = addJevModel(JSON.parse(data.toString()));
                models.clear();
                for (const model of catalog.models) models.set(model.slug, model);
                data = Buffer.from(JSON.stringify(catalog));
                delete responseHeaders["content-length"];
              } catch (err) {
                debug(`could not extend Codex model catalog: ${err.message}`);
              }
              res.writeHead(response.statusCode, responseHeaders);
              res.end(data);
            });
            return;
          }

          const inspectForDecision = routing && response.statusCode >= 200 && response.statusCode < 300;
          if (inspectForDecision) delete responseHeaders["content-length"];
          res.writeHead(response.statusCode, responseHeaders);
          if (!inspectForDecision) {
            response.pipe(res);
            return;
          }
          let pending = "";
          let inspected = false;
          response.on("data", (chunk) => {
            if (inspected) return void res.write(chunk);
            pending += chunk.toString();
            const end = pending.indexOf("\n\n");
            if (end < 0) return;
            const first = pending.slice(0, end + 2);
            res.write(first);
            const isSSE = /^(?:event|data):/m.test(first);
            if (isSSE) res.write(jevDecisionEvents(routing));
            debug(`codex decision display ${isSSE ? "inject" : "skip"}`);
            res.write(pending.slice(end + 2));
            pending = "";
            inspected = true;
          });
          response.on("end", () => {
            if (pending) {
              debug("codex decision display skip");
              res.write(pending);
            }
            res.end();
          });
        },
      );
      upstream.on("error", (err) => {
        debug(`codex upstream error: ${err.message}`);
        if (!res.headersSent) res.writeHead(502, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: { message: err.message, type: "proxy_error" } }));
      });
      if (out.length) upstream.write(out);
      upstream.end();
    });
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return { port: server.address().port, close: () => server.close() };
}
