import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { currentCodexHeaders, startCodexProxy } from "../src/codex-proxy.mjs";

test("refreshes only same-account ChatGPT OAuth headers from auth.json", (t) => {
  const home = mkdtempSync(join(tmpdir(), "jev-codex-auth-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const authFile = join(home, "auth.json");
  writeFileSync(authFile, JSON.stringify({
    auth_mode: "chatgpt",
    OPENAI_API_KEY: null,
    tokens: { account_id: "acct", access_token: "fresh" },
  }));

  assert.deepEqual(
    currentCodexHeaders({ authorization: "Bearer stale", "chatgpt-account-id": "acct" }, authFile),
    { authorization: "Bearer fresh", "chatgpt-account-id": "acct" },
  );
  assert.deepEqual(
    currentCodexHeaders({ authorization: "Bearer other", "chatgpt-account-id": "other" }, authFile),
    { authorization: "Bearer other", "chatgpt-account-id": "other" },
  );
  assert.deepEqual(
    currentCodexHeaders({ authorization: "Bearer api-key" }, authFile),
    { authorization: "Bearer api-key" },
  );
  assert.deepEqual(
    currentCodexHeaders({ authorization: "Bearer stale", "chatgpt-account-id": "acct" }, join(home, "missing.json")),
    { authorization: "Bearer stale", "chatgpt-account-id": "acct" },
  );
});

test("uses refreshed OAuth for both cold catalog lookup and Responses forwarding", async (t) => {
  const home = mkdtempSync(join(tmpdir(), "jev-codex-auth-proxy-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const authFile = join(home, "auth.json");
  writeFileSync(authFile, JSON.stringify({
    auth_mode: "chatgpt",
    tokens: { account_id: "acct", access_token: "fresh" },
  }));
  const seen = [];
  const upstream = http.createServer(async (req, res) => {
    seen.push({ url: req.url, authorization: req.headers.authorization });
    if (req.headers.authorization !== "Bearer fresh") {
      res.writeHead(401).end();
      return;
    }
    if (req.url.startsWith("/models")) {
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ models: [{ slug: "gpt-5.6-sol", supported_in_api: true }] }));
      return;
    }
    res.end("{}");
  });
  await new Promise((resolve) => upstream.listen(0, "127.0.0.1", resolve));
  t.after(() => upstream.close());
  const base = `http://127.0.0.1:${upstream.address().port}`;
  const proxy = await startCodexProxy({
    chatgptBaseURL: base,
    apiBaseURL: base,
    codexAuthFile: authFile,
    route: async () => ({ choice: "gpt-5.6-sol", confidence: 1 }),
  });
  t.after(proxy.close);

  const response = await fetch(`http://127.0.0.1:${proxy.port}/responses`, {
    method: "POST",
    headers: {
      authorization: "Bearer stale",
      "chatgpt-account-id": "acct",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "jev-router",
      input: [{ type: "additional_tools" }, { role: "user", content: "hello" }],
    }),
  });
  await response.text();

  assert.equal(response.status, 200);
  assert.deepEqual(seen.map(({ authorization }) => authorization), ["Bearer fresh", "Bearer fresh"]);
  assert.match(seen[0].url, /^\/models\?/);
  assert.equal(seen[1].url, "/responses");
});
