import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import {
  addAgyJevModel, agyModels, agyNewTurnPrompt, agyTierOf, applyAgyModel, startAgyProxy, stripAgyNotes,
} from "../src/agy-proxy.mjs";

// Trimmed from a real `v1internal:fetchAvailableModels` reply (AGY 1.2.12).
const CATALOG = {
  models: {
    "gemini-3.8-flash-high": { displayName: "Gemini 3.8 Flash (High)", model: "M318", thinkingBudget: 8000, maxOutputTokens: 65536 },
    "gemini-3.8-flash-low": { displayName: "Gemini 3.8 Flash (Low)", model: "M320", thinkingBudget: 1000, maxOutputTokens: 65536 },
    "gemini-3.1-pro-high": { displayName: "Gemini 3.1 Pro (High)", model: "M37" },
    "gemini-3.1-pro-low": { displayName: "Gemini 3.1 Pro (Low)", model: "M36", thinkingBudget: 1001, maxOutputTokens: 65535 },
    "claude-sonnet-4-6": { displayName: "Claude Sonnet 4.6 (Thinking)", model: "M35", thinkingBudget: 1024, maxOutputTokens: 64000 },
    "claude-opus-4-6-thinking": { displayName: "Claude Opus 4.6 (Thinking)", model: "M26", thinkingBudget: 1024, maxOutputTokens: 64000 },
    "gemini-3.5-flash-lite": { displayName: "Lite", model: "M50" },
  },
  defaultAgentModelId: "gemini-3.8-flash-high",
  agentModelSorts: [{ displayName: "Recommended", groups: [{ modelIds: [
    "gemini-3.8-flash-high", "gemini-3.8-flash-low", "gemini-3.1-pro-low", "claude-sonnet-4-6", "claude-opus-4-6-thinking",
  ] }] }],
  deprecatedModelIds: { "gemini-3.1-pro-high": { newModelId: "gemini-pro-agent" } },
};

const turn = (text, extra = []) => ({
  project: "p",
  model: "jev-router",
  requestType: "agent",
  request: {
    contents: [...extra, { role: "user", parts: [{ text: `<USER_REQUEST>\n${text}\n</USER_REQUEST>\n<ADDITIONAL_METADATA>t</ADDITIONAL_METADATA>` }] }],
    labels: { model_enum: "M318", trajectory_id: "traj-1", used_claude: "false", used_claude_conservative: "false", used_non_gemini_model: "false" },
    generationConfig: { maxOutputTokens: 65536, thinkingConfig: { includeThoughts: true, thinkingBudget: 8000 } },
  },
});

const continuation = () => ({
  ...turn("ignored"),
  request: {
    ...turn("ignored").request,
    contents: [
      { role: "user", parts: [{ text: "<USER_REQUEST>\nlist files\n</USER_REQUEST>" }] },
      { role: "model", parts: [{ text: "[Jev] routed this turn to claude-sonnet-4-6 (jev, confidence 0.90).\n\n" }, { functionCall: { name: "list_dir" } }] },
      { role: "user", parts: [{ functionResponse: { name: "list_dir", response: {} } }] },
    ],
  },
});

test("maps picker models to tiers, skipping deprecated and non-agent entries", () => {
  assert.deepEqual(agyModels(CATALOG).map((m) => [m.id, m.tier]), [
    ["gemini-3.8-flash-high", "haiku"],
    ["gemini-3.8-flash-low", "haiku"],
    ["gemini-3.1-pro-low", "opus"],
    ["claude-sonnet-4-6", "sonnet"],
    ["claude-opus-4-6-thinking", "opus"],
  ]);
  assert.equal(agyTierOf("gpt-oss-120b-medium"), "sonnet");
  assert.equal(agyTierOf("gemini-pro-agent"), "opus");
  assert.equal(agyTierOf("../../oops"), null);
});

test("adds a Jev Router row to the native picker without touching real entries", () => {
  const catalog = addAgyJevModel(structuredClone(CATALOG));
  assert.equal(catalog.models["jev-router"].displayName, "Jev Router (auto)");
  assert.equal(catalog.models["jev-router"].model, "M318");
  assert.equal(catalog.agentModelSorts[0].groups[0].modelIds[0], "jev-router");
  assert.deepEqual(catalog.models["claude-sonnet-4-6"], CATALOG.models["claude-sonnet-4-6"]);
  assert.equal(addAgyJevModel(catalog).agentModelSorts[0].groups[0].modelIds.filter((id) => id === "jev-router").length, 1);
});

test("detects new turns and ignores tool continuations", () => {
  assert.equal(agyNewTurnPrompt(turn("fix the race")), "fix the race");
  assert.equal(agyNewTurnPrompt(continuation()), null);
});

test("copies catalog-derived fields when switching model", () => {
  const body = applyAgyModel(turn("x"), "claude-sonnet-4-6", CATALOG.models["claude-sonnet-4-6"]);
  assert.equal(body.model, "claude-sonnet-4-6");
  assert.equal(body.request.labels.model_enum, "M35");
  assert.equal(body.request.labels.used_claude, "true");
  assert.equal(body.request.labels.used_non_gemini_model, "true");
  assert.equal(body.request.generationConfig.maxOutputTokens, 64000);
  assert.equal(body.request.generationConfig.thinkingConfig.thinkingBudget, 1024);
});

test("removes Jev's notes from history, keeping the model's own parts", () => {
  const body = stripAgyNotes(continuation());
  assert.deepEqual(body.request.contents[1].parts, [{ functionCall: { name: "list_dir" } }]);
  const merged = stripAgyNotes({ request: { contents: [{ role: "model", parts: [{ text: "[Jev] unavailable; using x.\n\nHello" }] }] } });
  assert.equal(merged.request.contents[0].parts[0].text, "Hello");
});

async function fakeUpstream(t) {
  const seen = [];
  const server = http.createServer((req, res) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : null;
      seen.push({ url: req.url, body, headers: req.headers });
      if (/fetchAvailableModels/.test(req.url)) {
        res.writeHead(200, { "content-type": "application/json" });
        return void res.end(JSON.stringify(CATALOG));
      }
      res.writeHead(200, { "content-type": "text/event-stream" });
      res.end('data: {"response": {"candidates": [{"content": {"role": "model","parts": [{"text": "ok"}]}}]}}\r\n\r\n');
    });
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  t.after(() => server.close());
  return { url: `http://127.0.0.1:${server.address().port}`, seen };
}

async function post(port, path, body) {
  const res = await fetch(`http://127.0.0.1:${port}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer secret" },
    body: JSON.stringify(body),
  });
  return { status: res.status, text: await res.text() };
}

test("routes each new turn, pins continuations and passes manual models through", async (t) => {
  const upstream = await fakeUpstream(t);
  const asked = [];
  const answers = ["claude-sonnet-4-6", "gemini-3.8-flash-low"];
  const proxy = await startAgyProxy({
    upstream: upstream.url,
    route: async ({ prompt, models }) => {
      asked.push({ prompt, models: models.map((m) => m.id) });
      return { choice: answers[asked.length - 1], confidence: 0.9 };
    },
  });
  t.after(proxy.close);

  const catalog = JSON.parse((await post(proxy.port, "/v1internal:fetchAvailableModels", {})).text);
  assert.equal(catalog.agentModelSorts[0].groups[0].modelIds[0], "jev-router");

  const first = await post(proxy.port, "/v1internal:streamGenerateContent?alt=sse", turn("refactor the auth module"));
  assert.match(first.text, /^data: .*\[Jev\] routed this turn to claude-sonnet-4-6 \(jev, confidence 0\.90\)/);
  assert.match(first.text, /"text": "ok"/);
  let sent = upstream.seen.at(-1);
  assert.equal(sent.body.model, "claude-sonnet-4-6");
  assert.equal(sent.body.request.labels.model_enum, "M35");
  assert.equal(sent.headers.authorization, "Bearer secret", "auth is forwarded untouched");
  assert.equal(sent.headers["accept-encoding"], undefined);

  const tool = await post(proxy.port, "/v1internal:streamGenerateContent?alt=sse", continuation());
  assert.doesNotMatch(tool.text, /\[Jev\]/);
  sent = upstream.seen.at(-1);
  assert.equal(sent.body.model, "claude-sonnet-4-6", "continuation keeps the turn's model");
  assert.equal(JSON.stringify(sent.body).includes("[Jev]"), false, "notes never reach the model");
  assert.equal(asked.length, 1, "continuations do not ask Jev");

  await post(proxy.port, "/v1internal:streamGenerateContent?alt=sse", turn("rename a variable"));
  assert.equal(upstream.seen.at(-1).body.model, "gemini-3.8-flash-low");
  assert.equal(asked[1].models.includes("gemini-3.1-pro-high"), false, "deprecated ids are never offered");

  const manual = await post(proxy.port, "/v1internal:streamGenerateContent?alt=sse", { ...turn("hi"), model: "gemini-3.1-pro-low" });
  assert.doesNotMatch(manual.text, /\[Jev\]/);
  assert.equal(upstream.seen.at(-1).body.model, "gemini-3.1-pro-low");
  assert.equal(asked.length, 2);
});

test("fails open to AGY's default model when Jev is unavailable", async (t) => {
  const upstream = await fakeUpstream(t);
  const proxy = await startAgyProxy({ upstream: upstream.url, route: async () => null });
  t.after(proxy.close);
  await post(proxy.port, "/v1internal:fetchAvailableModels", {});
  const res = await post(proxy.port, "/v1internal:streamGenerateContent?alt=sse", turn("hello"));
  assert.equal(res.status, 200);
  assert.match(res.text, /\[Jev\] unavailable; using gemini-3\.8-flash-high\./);
  assert.equal(upstream.seen.at(-1).body.model, "gemini-3.8-flash-high");
});

test("shows the decision before a slow upstream sends its first byte", async (t) => {
  const server = http.createServer((req, res) => {
    req.resume();
    req.on("end", () => {
      if (/fetchAvailableModels/.test(req.url)) {
        res.writeHead(200, { "content-type": "application/json" });
        return void res.end(JSON.stringify(CATALOG));
      }
      // Google holds headers until the first token; simulate a slow model.
      setTimeout(() => {
        res.writeHead(200, { "content-type": "text/event-stream" });
        res.end('data: {"response": {"candidates": [{"content": {"role": "model","parts": [{"text": "late"}]}}]}}\r\n\r\n');
      }, 1500);
    });
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  t.after(() => server.close());
  const proxy = await startAgyProxy({
    upstream: `http://127.0.0.1:${server.address().port}`,
    route: async () => ({ choice: "claude-sonnet-4-6", confidence: 0.9 }),
  });
  t.after(proxy.close);
  await post(proxy.port, "/v1internal:fetchAvailableModels", {});

  const started = Date.now();
  const res = await fetch(`http://127.0.0.1:${proxy.port}/v1internal:streamGenerateContent?alt=sse`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(turn("hello")),
  });
  assert.equal(res.status, 200);
  const reader = res.body.getReader();
  const first = new TextDecoder().decode((await reader.read()).value);
  assert.ok(Date.now() - started < 1000, "decision arrives before the upstream's first byte");
  assert.match(first, /\[Jev\] routed this turn to claude-sonnet-4-6/);
  let rest = "";
  for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) rest += new TextDecoder().decode(chunk.value);
  assert.match(rest, /"text": "late"/);
});

test("a persistent upstream error after the decision drops the stream; AGY's retry gets the real status", async (t) => {
  let generate = 0;
  const seen = [];
  const server = http.createServer((req, res) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      if (/fetchAvailableModels/.test(req.url)) {
        res.writeHead(200, { "content-type": "application/json" });
        return void res.end(JSON.stringify(CATALOG));
      }
      seen.push(JSON.parse(Buffer.concat(chunks).toString()).model);
      generate++;
      res.writeHead(429, { "content-type": "application/json" });
      res.end('{"error":{"code":429,"message":"quota","status":"RESOURCE_EXHAUSTED"}}');
    });
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  t.after(() => server.close());
  let asked = 0;
  const proxy = await startAgyProxy({
    upstream: `http://127.0.0.1:${server.address().port}`,
    route: async () => ({ choice: "claude-sonnet-4-6", confidence: 0.9, asked: ++asked }),
    retryDelays: [],
  });
  t.after(proxy.close);
  await post(proxy.port, "/v1internal:fetchAvailableModels", {});

  await assert.rejects(post(proxy.port, "/v1internal:streamGenerateContent?alt=sse", turn("hello")));
  const retry = await post(proxy.port, "/v1internal:streamGenerateContent?alt=sse", turn("hello"));
  assert.equal(retry.status, 429);
  assert.match(retry.text, /RESOURCE_EXHAUSTED/);
  assert.doesNotMatch(retry.text, /\[Jev\]/);
  assert.deepEqual(seen, ["claude-sonnet-4-6", "claude-sonnet-4-6"]);
  assert.equal(asked, 1, "the retry does not ask Jev again");
  assert.equal(generate, 2);
});

test("retries a transient upstream failure without ending the stream AGY already has", async (t) => {
  let generate = 0;
  const server = http.createServer((req, res) => {
    req.resume();
    req.on("end", () => {
      if (/fetchAvailableModels/.test(req.url)) {
        res.writeHead(200, { "content-type": "application/json" });
        return void res.end(JSON.stringify(CATALOG));
      }
      if (++generate === 1) {
        res.writeHead(503, { "content-type": "application/json" });
        return void res.end('{"error":{"code":503,"status":"UNAVAILABLE"}}');
      }
      res.writeHead(200, { "content-type": "text/event-stream" });
      res.end('data: {"response": {"candidates": [{"content": {"role": "model","parts": [{"text": "recovered"}]}}]}}\r\n\r\n');
    });
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  t.after(() => server.close());
  const proxy = await startAgyProxy({
    upstream: `http://127.0.0.1:${server.address().port}`,
    route: async () => ({ choice: "claude-sonnet-4-6", confidence: 0.9 }),
    retryDelays: [10],
  });
  t.after(proxy.close);
  await post(proxy.port, "/v1internal:fetchAvailableModels", {});
  const res = await post(proxy.port, "/v1internal:streamGenerateContent?alt=sse", turn("hello"));
  assert.equal(res.status, 200);
  assert.match(res.text, /^data: .*\[Jev\] routed this turn/);
  assert.match(res.text, /"text": "recovered"/);
  assert.equal(generate, 2);
});
