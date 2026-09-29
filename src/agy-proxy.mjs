import http from "node:http";
import https from "node:https";
import { writeFileSync } from "node:fs";
import { availableTiers, shouldUseExactModel } from "./config.mjs";
import { askJev, warmJev } from "./router.mjs";
import { decide } from "./policy.mjs";
import { log } from "./log.mjs";
import { writeDecision, writeStatus } from "./status.mjs";

/** AGY's own default Cloud Code server; `CLOUD_CODE_URL` overrides it in the CLI. */
export const AGY_DEFAULT_UPSTREAM = "https://daily-cloudcode-pa.googleapis.com";
export const AGY_AUTO_MODEL = "jev-router";

// Written as the first streamed part of a routed turn, and removed from history before the
// next request so the model never reads Jev's notes as its own output.
const NOTE = /\[Jev\] (?:routed this turn to|unavailable;)[^\n]*\n\n/g;

export function agyTierOf(id) {
  if (typeof id !== "string") return null;
  if (/^gemini-[\w.-]*flash-(?:extra-low|low|medium|high)$/.test(id)) return "haiku";
  if (/^gemini-[\w.-]*pro-(?:low|medium|high|agent)$/.test(id) || id === "gemini-pro-agent") return "opus";
  if (/^claude-.*opus/.test(id)) return "opus";
  if (/^claude-.*sonnet/.test(id) || /^gpt-oss-/.test(id)) return "sonnet";
  return null;
}

/** Models the native agent picker offers, excluding deprecated IDs and the router itself. */
export function agyModels(catalog) {
  const ids = [];
  for (const sort of catalog?.agentModelSorts ?? []) {
    for (const group of sort.groups ?? []) {
      for (const id of group.modelIds ?? []) if (!ids.includes(id)) ids.push(id);
    }
  }
  if (!ids.length) ids.push(...Object.keys(catalog?.models ?? {}));
  const deprecated = catalog?.deprecatedModelIds ?? {};
  return ids
    .filter((id) => id !== AGY_AUTO_MODEL && !deprecated[id] && catalog?.models?.[id] && agyTierOf(id))
    .map((id) => {
      const info = catalog.models[id];
      return {
        id,
        tier: agyTierOf(id),
        description: [
          info.displayName,
          info.tagTitle,
          info.thinkingBudget && `thinking budget ${info.thinkingBudget} tokens`,
        ].filter(Boolean).join("; "),
      };
    });
}

/** Adds the "Jev Router" row to AGY's catalog response, first in the native picker. */
export function addAgyJevModel(catalog) {
  if (!catalog?.models || catalog.models[AGY_AUTO_MODEL]) return catalog;
  const template = catalog.models[catalog.defaultAgentModelId] ??
    catalog.models[agyModels(catalog)[0]?.id];
  if (!template) return catalog;
  catalog.models[AGY_AUTO_MODEL] = {
    ...template,
    displayName: "Jev Router (auto)",
    tagTitle: "Auto",
    tagDescription: "Jev picks the model for each turn",
    recommended: true,
  };
  for (const sort of catalog.agentModelSorts ?? []) {
    for (const group of sort.groups ?? []) {
      if (Array.isArray(group.modelIds) && !group.modelIds.includes(AGY_AUTO_MODEL)) {
        group.modelIds.unshift(AGY_AUTO_MODEL);
      }
    }
  }
  return catalog;
}

/** The user's text when this request starts a new turn; null for tool continuations. */
export function agyNewTurnPrompt(body) {
  const last = body?.request?.contents?.at(-1);
  if (last?.role !== "user" || !Array.isArray(last.parts)) return null;
  for (const part of last.parts) {
    const match = typeof part?.text === "string" && /<USER_REQUEST>\s*([\s\S]*?)\s*<\/USER_REQUEST>/.exec(part.text);
    if (match?.[1]) return match[1];
  }
  return null;
}

export const agyConversationKey = (body) =>
  body?.request?.labels?.trajectory_id ?? body?.request?.sessionId ?? "default";

/** Removes Jev's own notes from the model's history. Returns the same body. */
export function stripAgyNotes(body) {
  const contents = body?.request?.contents;
  if (!Array.isArray(contents)) return body;
  body.request.contents = contents.flatMap((content) => {
    if (content?.role !== "model" || !Array.isArray(content.parts)) return [content];
    const parts = content.parts.flatMap((part) => {
      if (typeof part?.text !== "string" || part.thought || !part.text.includes("[Jev] ")) return [part];
      const text = part.text.replace(NOTE, "");
      return text ? [{ ...part, text }] : [];
    });
    return parts.length ? [{ ...content, parts }] : [];
  });
  return body;
}

/** Points a request at the chosen model, copying the fields AGY derives from the catalog. */
export function applyAgyModel(body, id, info) {
  body.model = id;
  const request = body.request ?? {};
  if (request.labels) {
    if (info?.model) request.labels.model_enum = info.model;
    const claude = /^claude-/.test(id);
    if ("used_claude" in request.labels) request.labels.used_claude = String(claude);
    if ("used_claude_conservative" in request.labels) request.labels.used_claude_conservative = String(claude);
    if ("used_non_gemini_model" in request.labels) request.labels.used_non_gemini_model = String(!/^gemini-/.test(id));
  }
  const config = request.generationConfig;
  if (config && info) {
    if (config.maxOutputTokens != null && info.maxOutputTokens) config.maxOutputTokens = info.maxOutputTokens;
    if (config.thinkingConfig?.thinkingBudget != null && info.thinkingBudget) {
      config.thinkingConfig.thinkingBudget = info.thinkingBudget;
    }
  }
  return body;
}

export function agyDecisionText({ model, reason, confidence }) {
  if (reason.startsWith("jev-unavailable")) return `[Jev] unavailable; using ${model}.\n\n`;
  const detail = confidence == null ? reason : `${reason}, confidence ${confidence.toFixed(2)}`;
  return `[Jev] routed this turn to ${model} (${detail}).\n\n`;
}

const agyDecisionEvent = (text, delimiter = "\r\n\r\n") =>
  `data: ${JSON.stringify({ response: { candidates: [{ content: { role: "model", parts: [{ text }] } }] } })}${delimiter}`;

// Transient upstream failures that AGY itself would retry; backoff before each extra attempt.
const RETRYABLE = new Set([429, 500, 502, 503, 504]);
const RETRY_DELAYS_MS = [1000, 2000, 4000, 8000];

const debug = (line) => process.env.JEV_DEBUG && log(line);
const isGenerate = (url) => /:(?:stream)?[gG]enerateContent(?:\?|$)/.test(url ?? "");
const isCatalog = (url) => /:fetchAvailableModels(?:\?|$)/.test(url ?? "");

export async function startAgyProxy({
  upstream = AGY_DEFAULT_UPSTREAM,
  route = askJev,
  statusId = "",
  retryDelays = RETRY_DELAYS_MS,
} = {}) {
  if (route === askJev) warmJev();
  const states = new Map();
  let catalog = null;
  const base = new URL(upstream);
  const basePath = base.pathname.replace(/\/$/, "");
  const transport = base.protocol === "http:" ? http : https;

  const choose = async (body, key) => {
    const candidates = agyModels(catalog).filter((model) => availableTiers().includes(model.tier));
    const fallback = catalog?.models?.[catalog.defaultAgentModelId] ? catalog.defaultAgentModelId : candidates[0]?.id;
    const previous = states.get(key)?.model;
    const currentModel = candidates.some((model) => model.id === previous) ? previous : fallback;
    const prompt = agyNewTurnPrompt(body);
    if (!prompt || !candidates.length) return { model: currentModel, routing: null };

    const current = agyTierOf(currentModel) ?? "haiku";
    const contextTokens = Math.round(JSON.stringify(body.request?.contents ?? []).length / 4);
    const jev = await route({ prompt, current: currentModel, contextTokens, models: candidates });
    const chosen = candidates.find((model) => model.id === jev?.choice);
    const decision = decide({
      prompt,
      jev: jev && { ...jev, choice: chosen?.tier },
      current,
      available: [...new Set(candidates.map((model) => model.tier))],
      contextTokens,
    });
    const model = shouldUseExactModel(decision.reason, chosen?.tier, decision.tier)
      ? chosen.id
      : decision.tier === current
        ? currentModel
        : candidates.find((candidate) => candidate.tier === decision.tier)?.id ?? currentModel;
    states.set(key, { model });
    const routing = {
      prompt,
      tier: agyTierOf(model),
      model,
      confidence: jev?.confidence ?? null,
      metrics: jev?.metrics ?? null,
      reason: decision.reason,
      jev: jev ? { request: jev.request, response: jev.response } : null,
      at: Date.now(),
    };
    writeDecision(statusId, routing);
    debug(`agy ${key.slice(0, 8)} ${currentModel} -> ${model} (${decision.reason}) | ${prompt.slice(0, 60)}`);
    return { model, routing };
  };

  const server = http.createServer((req, res) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", async () => {
      let out = Buffer.concat(chunks);
      let routing = null;
      let key = null;
      const t0 = Date.now();
      const timing = { jev: null };
      if (req.method === "POST" && isGenerate(req.url)) {
        try {
          const body = stripAgyNotes(JSON.parse(out.toString()));
          if (process.env.JEV_DUMP) {
            writeFileSync(`${process.env.JEV_DUMP}.${Date.now()}.json`, JSON.stringify(body, null, 2));
          }
          if (body.model === AGY_AUTO_MODEL) {
            key = agyConversationKey(body);
            let model;
            const state = states.get(key);
            try {
              if (state?.failedPrompt && state.failedPrompt === agyNewTurnPrompt(body)) {
                // AGY's retry after an upstream error: keep the turn's model, skip Jev, and let
                // the real upstream status through so AGY can show its own error.
                model = state.model;
                state.failedPrompt = null;
              } else {
                ({ model, routing } = await choose(body, key));
              }
              timing.jev = Date.now() - t0;
            } catch (err) {
              // Routing is fail-open: keep this conversation's model, or AGY's default.
              log(`agy routing failed: ${err.message}`);
              model = states.get(key)?.model ?? catalog?.defaultAgentModelId;
            }
            if (!model) throw new Error("AGY model catalog is not loaded yet; select a model with /model");
            applyAgyModel(body, model, catalog?.models?.[model]);
          } else if (agyNewTurnPrompt(body)) {
            writeStatus(statusId, { manual: true, model: body.model, at: Date.now() });
          }
          out = Buffer.from(JSON.stringify(body));
        } catch (err) {
          res.writeHead(503, { "content-type": "application/json" });
          res.end(JSON.stringify({ error: { code: 503, message: `Jev routing failed: ${err.message}`, status: "UNAVAILABLE" } }));
          return;
        }
      }

      // Google withholds its response headers until the model's first token, which can take
      // tens of seconds. The decision is known now, so answer AGY and show it immediately.
      if (routing) {
        res.writeHead(200, { "content-type": "text/event-stream" });
        res.write(agyDecisionEvent(agyDecisionText(routing)));
        timing.note = Date.now() - t0;
      }
      // Once a 200 is sent, an upstream failure can no longer reach AGY as a status code, so
      // retry transient failures here, as AGY would. If they persist, drop the connection;
      // AGY then retries on its own and that request is passed through unrouted.
      const failAfterNote = (why) => {
        debug(`agy upstream failed after decision was shown (${why}); dropping for AGY retry`);
        const state = states.get(key);
        if (state) state.failedPrompt = routing.prompt;
        res.destroy();
      };
      let upstreamReq;
      let retryTimer;
      const retryOrFail = (attempt, why) => {
        if (res.destroyed) return;
        if (attempt >= retryDelays.length) return void failAfterNote(why);
        debug(`agy upstream ${why}; retry ${attempt + 1}/${retryDelays.length} in ${retryDelays[attempt]}ms`);
        retryTimer = setTimeout(() => send(attempt + 1), retryDelays[attempt]);
      };

      const headers = { ...req.headers, host: base.host };
      // Uncompressed replies let the proxy read the catalog and add the decision line.
      for (const name of ["content-length", "transfer-encoding", "connection", "accept-encoding"]) delete headers[name];
      headers["content-length"] = String(out.length);
      const send = (attempt = 0) => {
        upstreamReq = transport.request(
          { hostname: base.hostname, port: base.port || undefined, path: `${basePath}${req.url ?? "/"}`, method: req.method, headers },
          (response) => {
            const responseHeaders = { ...response.headers };
            const ok = response.statusCode >= 200 && response.statusCode < 300;
            if (isGenerate(req.url)) {
              timing.headers = Date.now() - t0;
              response.once("data", () => { timing.firstByte = Date.now() - t0; });
              response.once("end", () => debug(
                `agy timing ${req.url.split("?")[0].split(":").pop()} model=${JSON.parse(out).model} status=${response.statusCode} ` +
                  `jev=${timing.jev ?? "-"}ms note=${timing.note ?? "-"}ms headers=${timing.headers}ms firstByte=${timing.firstByte}ms end=${Date.now() - t0}ms`,
              ));
            }
            if (ok && req.method === "POST" && isCatalog(req.url)) {
              const body = [];
              response.on("data", (chunk) => body.push(chunk));
              response.on("end", () => {
                let data = Buffer.concat(body);
                try {
                  const parsed = JSON.parse(data.toString());
                  catalog = structuredClone(parsed);
                  data = Buffer.from(JSON.stringify(addAgyJevModel(parsed)));
                  delete responseHeaders["content-length"];
                  delete responseHeaders["transfer-encoding"];
                } catch (err) {
                  debug(`could not extend AGY model catalog: ${err.message}`);
                }
                res.writeHead(response.statusCode, responseHeaders);
                res.end(data);
              });
              return;
            }

            if (!routing) {
              res.writeHead(response.statusCode, responseHeaders);
              response.pipe(res);
              return;
            }
            if (!ok) {
              response.resume();
              if (RETRYABLE.has(response.statusCode)) return void retryOrFail(attempt, `HTTP ${response.statusCode}`);
              return void failAfterNote(`HTTP ${response.statusCode}`);
            }
            response.pipe(res);
          },
        );
        upstreamReq.on("error", (err) => {
          debug(`agy upstream error: ${err.message}`);
          if (routing) return void retryOrFail(attempt, err.message);
          if (!res.headersSent) res.writeHead(502, { "content-type": "application/json" });
          res.end(JSON.stringify({ error: { code: 502, message: err.message, status: "UNAVAILABLE" } }));
        });
        upstreamReq.end(out);
      };
      // AGY cancels background calls (analytics, quota) when it exits; stop waiting on them.
      res.on("close", () => {
        clearTimeout(retryTimer);
        if (!res.writableFinished) upstreamReq?.destroy();
      });
      send();
    });
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return {
    port: server.address().port,
    close: () => {
      server.close();
      server.closeAllConnections();
    },
  };
}
