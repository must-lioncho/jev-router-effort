import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildInstruction,
  capabilityQuestions,
  decideCapabilities,
  discoverCatalog,
  explicitMentions,
  injectClaude,
  MARKER,
  optedOut,
  parseFrontMatter,
  promptHash,
  shortlist,
} from "../src/capabilities.mjs";
import { createCapabilityRuntime } from "../src/capability-runtime.mjs";
import { readEvents, routingReport } from "../src/routing-log.mjs";
import { startProxy } from "../src/proxy.mjs";
import { startCodexProxy } from "../src/codex-proxy.mjs";

const SKILLS = {
  "hr-make-jd": "HR의 Make JD 메모로 JD 초안을 작성한다. 역할·성과·업무·요건을 원문에서 도출한다. 트리거는 Make JD, JD 초안, 채용 직무기술서.",
  "hr-pip": "PIP(성과 개선 프로그램) 문서를 만든다. 트리거 - PIP 문서, 성과 개선 프로그램.",
  "nss-report-daily": "NSS 모니터 일일 보고서를 생성한다. 트리거 - NSS 일일 보고, 모니터 테이블.",
  "sut-token-ledger": "SUT 토큰 원장 대사 리포트를 만든다. 트리거 - SUT 원장, SUT 대사.",
  "mpc-ir-deck": "MPC 투자자 IR 덱 초안을 만든다. 트리거 - IR 덱, 투자 설명 자료.",
  "nss-report-daily-v1-archived": "예전 NSS 일일 보고 생성기. 트리거 - NSS 일일 보고.",
};
const AGENTS = {
  "hr-jd-writer": "HR JD 초안을 hr-make-jd 스킬로 작성하는 작업자. JD 초안 작성 요청을 위임받는다.",
  "security-pr-reviewer": "PR 보안 리뷰 전담 에이전트. 보안 취약점 리뷰를 위임받는다.",
};

function makeTree(t, { duplicate = null, link = false } = {}) {
  const root = mkdtempSync(join(tmpdir(), "jev-cap-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const home = join(root, "home");
  const cwd = join(root, "work", "not-hr-folder");
  const skill = (dir, name, description, extra = "") => {
    mkdirSync(join(dir, name), { recursive: true });
    writeFileSync(join(dir, name, "SKILL.md"), `---\nname: ${name}\ndescription: ${description}\n---\n\n# ${name}\n\nBody of ${name}.${extra}\n`);
  };
  for (const [name, d] of Object.entries(SKILLS)) skill(join(home, ".claude/skills"), name, d);
  mkdirSync(join(home, ".claude/agents"), { recursive: true });
  for (const [name, d] of Object.entries(AGENTS)) writeFileSync(join(home, ".claude/agents", `${name}.md`), `---\nname: ${name}\ndescription: ${d}\nmodel: inherit\n---\nAgent ${name}.\n`);
  if (duplicate) skill(join(cwd, ".claude/skills"), duplicate, SKILLS[duplicate], " Project variant.");
  if (link) { mkdirSync(join(cwd, ".claude/skills"), { recursive: true }); symlinkSync(join(home, ".claude/skills/hr-make-jd"), join(cwd, ".claude/skills/hr-make-jd")); }
  mkdirSync(cwd, { recursive: true });
  return { root, home, cwd, catalog: discoverCatalog({ cli: "claude", cwd, home }) };
}

const answer = (choice, confidence, probabilities) => ({ choice, confidence, probabilities: probabilities ?? { [choice]: confidence, none: 1 - confidence } });
const decideFor = (catalog, prompt, answers = null, extra = {}) => {
  const shortlisted = { skills: shortlist(prompt, catalog.skills, { limit: 6 }), agents: shortlist(prompt, catalog.agents, { limit: 4 }) };
  return { shortlisted, decision: decideCapabilities({ prompt, catalog, shortlisted, answers, ...extra }) };
};

test("front matter parser reads folded descriptions", () => {
  assert.deepEqual(parseFrontMatter("---\nname: x\ndescription: >-\n  first line\n  second line\nsummary: \"s\"\n---\nbody"),
    { name: "x", description: "first line second line", summary: "s" });
});

test("discovery keeps metadata, path and hash only; archived names are not auto-eligible", (t) => {
  const { catalog } = makeTree(t);
  const jd = catalog.skills.find((s) => s.name === "hr-make-jd");
  assert.equal(jd.department, "hr");
  assert.match(jd.id, /^skill:claude:user:hr-make-jd#[0-9a-f]{12}$/);
  assert.equal(jd.hash.length, 64);
  assert.ok(!("body" in jd));
  assert.equal(catalog.skills.find((s) => s.name.endsWith("archived")).autoEligible, false);
  assert.equal(catalog.agents.length, 2);
});

test("HR request from a non-HR folder selects hr-make-jd and the classifier sees metadata only", (t) => {
  const { catalog, cwd } = makeTree(t);
  assert.ok(!cwd.includes("/hr"));
  const prompt = "백엔드 개발자 채용용 JD 초안 좀 써줘";
  const { shortlisted, decision } = decideFor(catalog, prompt, { skill: answer("hr-make-jd", 0.86), agent: answer("none", 0.8) });
  assert.equal(shortlisted.skills[0].candidate.name, "hr-make-jd");
  const questions = JSON.stringify(capabilityQuestions(shortlisted));
  assert.ok(questions.includes("hr-make-jd") && !questions.includes("Body of hr-make-jd"));
  assert.deepEqual(decision.skills.selected.map((s) => s.name), ["hr-make-jd"]);
  assert.equal(decision.skills.reason, "jev");
  assert.equal(decision.agent.selected, null);
  assert.equal(decision.agent.reason, "jev-none");
});

test("department prefixes separate NSS, SUT and MPC candidates", (t) => {
  const { catalog } = makeTree(t);
  const top = (p) => shortlist(p, catalog.skills, { limit: 3 })[0]?.candidate.name;
  assert.equal(top("NSS 일일 보고 만들어줘"), "nss-report-daily");
  assert.equal(top("SUT 원장 대사 리포트 부탁해"), "sut-token-ledger");
  assert.equal(top("MPC IR 덱 초안 만들어줘"), "mpc-ir-deck");
  assert.ok(!shortlist("NSS 일일 보고 만들어줘", catalog.skills, { limit: 6 }).some((s) => s.candidate.name.endsWith("archived")));
});

test("a general question needs no skill and no agent; the classifier is not asked", (t) => {
  const { catalog } = makeTree(t);
  const { shortlisted, decision } = decideFor(catalog, "파이썬 리스트 컴프리헨션이 뭐야?");
  assert.equal(Object.keys(capabilityQuestions(shortlisted)).length, 0);
  assert.equal(decision.skills.reason, "no-candidate");
  assert.equal(decision.skills.needed, false);
  assert.equal(decision.agent.reason, "no-candidate");
});

test("skill only, agent only and both are independent dimensions", (t) => {
  const { catalog } = makeTree(t);
  const prompt = "JD 초안 작성하고 이 PR 보안 리뷰도 해줘";
  const skillOnly = decideFor(catalog, prompt, { skill: answer("hr-make-jd", 0.8), agent: answer("none", 0.9) }).decision;
  assert.equal(skillOnly.skills.selected.length, 1); assert.equal(skillOnly.agent.selected, null);
  const agentOnly = decideFor(catalog, prompt, { skill: answer("none", 0.7), agent: answer("security-pr-reviewer", 0.8) }).decision;
  assert.equal(agentOnly.skills.selected.length, 0); assert.equal(agentOnly.agent.selected.name, "security-pr-reviewer");
  const both = decideFor(catalog, prompt, { skill: answer("hr-make-jd", 0.8), agent: answer("hr-jd-writer", 0.7) }).decision;
  assert.equal(both.skills.selected[0].name, "hr-make-jd"); assert.equal(both.agent.selected.name, "hr-jd-writer");
});

test("explicit skill/agent requests are respected; topical mentions and opt-outs are distinguished", (t) => {
  const { catalog } = makeTree(t);
  assert.deepEqual(explicitMentions("/hr-pip 로 문서 만들어", catalog.skills, "skill"), ["hr-pip"]);
  assert.deepEqual(explicitMentions("hr-pip 스킬로 해줘", catalog.skills, "skill"), ["hr-pip"]);
  assert.deepEqual(explicitMentions("hr-pip 파일이 어디 있지?", catalog.skills, "skill"), []);
  assert.deepEqual(explicitMentions("@agent-hr-jd-writer 에게 맡겨", catalog.agents, "agent"), ["hr-jd-writer"]);
  const forced = decideFor(catalog, "hr-pip 스킬로 JD 초안 써줘", { skill: answer("hr-make-jd", 0.9) }).decision;
  assert.deepEqual(forced.skills.selected.map((s) => [s.name, s.source]), [["hr-pip", "explicit"]]);
  assert.equal(optedOut("스킬 없이 JD 초안만 간단히", "skill"), true);
  assert.equal(optedOut("에이전트 없이 직접 처리해", "agent"), true);
  const none = decideFor(catalog, "스킬 없이 JD 초안만 간단히", { skill: answer("hr-make-jd", 0.9) }).decision;
  assert.equal(none.skills.reason, "explicit-none"); assert.equal(none.skills.selected.length, 0);
});

test("same-name candidates are distinguished by path and hash; one linked file is one candidate", (t) => {
  const dup = makeTree(t, { duplicate: "hr-make-jd" });
  const twins = dup.catalog.skills.filter((s) => s.name === "hr-make-jd");
  assert.equal(twins.length, 2);
  assert.notEqual(twins[0].id, twins[1].id);
  const d = decideFor(dup.catalog, "hr-make-jd 스킬로 JD 써줘").decision;
  assert.equal(d.skills.reason, "duplicate-name");
  assert.equal(d.skills.needsConfirmation, true);
  assert.equal(d.conflicts[0].candidates.length, 2);
  const linked = makeTree(t, { link: true });
  assert.equal(linked.catalog.skills.filter((s) => s.name === "hr-make-jd").length, 1);
});

test("ambiguous and low-confidence answers fall back to no selection with a reason", (t) => {
  const { catalog } = makeTree(t);
  const prompt = "NSS 일일 보고 만들어줘";
  const ambiguous = decideFor(catalog, prompt, { skill: answer("nss-report-daily", 0.45, { "nss-report-daily": 0.45, "sut-token-ledger": 0.4, none: 0.15 }) }).decision;
  assert.equal(ambiguous.skills.reason, "ambiguous");
  assert.equal(ambiguous.needsConfirmation, true);
  assert.equal(ambiguous.skills.selected.length, 0);
  const low = decideFor(catalog, prompt, { skill: answer("nss-report-daily", 0.4, { "nss-report-daily": 0.4, none: 0.35, "sut-token-ledger": 0.05 }) }).decision;
  assert.equal(low.skills.reason, "low-confidence");
  const unavailable = decideFor(catalog, prompt, null).decision;
  assert.equal(unavailable.skills.reason, "jev-unavailable");
  assert.ok(unavailable.uncertainty.some((u) => u.includes("kept existing handling")));
});

test("a short continuation keeps the earlier skill; a new task drops it", (t) => {
  const { catalog } = makeTree(t);
  const first = decideFor(catalog, "JD 초안 써줘", { skill: answer("hr-make-jd", 0.9) }).decision;
  const next = decideFor(catalog, "좋아, 계속해줘", null, { previous: first }).decision;
  assert.equal(next.skills.reason, "previous-context");
  assert.equal(next.skills.selected[0].source, "context");
  assert.equal(decideFor(catalog, "새 작업: 계속해줘", null, { previous: first, newTask: true }).decision.skills.selected.length, 0);
});

test("a required skill rule is added, and an explicit opt-out conflict is reported", (t) => {
  const { catalog } = makeTree(t);
  const config = { requiredSkills: [{ id: "jd-rule", skill: "hr-make-jd", pattern: "JD" }] };
  const added = decideFor(catalog, "JD 초안 써줘", { skill: answer("none", 0.9) }, { config }).decision;
  assert.deepEqual(added.skills.selected.map((s) => s.source), ["required"]);
  const conflict = decideFor(catalog, "스킬 없이 JD 초안 써줘", null, { config }).decision;
  assert.equal(conflict.skills.selected.length, 0);
  assert.equal(conflict.conflicts[0].type, "required-vs-explicit-none");
});

test("application re-reads the skill, records hash drift and never injects in recommend mode", (t) => {
  const { catalog } = makeTree(t);
  const decision = decideFor(catalog, "JD 초안 써줘", { skill: answer("hr-make-jd", 0.9), agent: answer("hr-jd-writer", 0.8) }).decision;
  const applied = buildInstruction(decision, { mode: "apply", cli: "claude", agentSupport: "delegate" });
  assert.ok(applied.text.startsWith(MARKER));
  assert.ok(applied.text.includes("Body of hr-make-jd"));
  assert.ok(applied.text.includes('subagent_type "hr-jd-writer"'));
  assert.equal(applied.applied.skills[0].hashChanged, false);
  const drift = buildInstruction(decision, { mode: "apply", cli: "claude", agentSupport: "delegate", readFile: () => "changed" });
  assert.equal(drift.applied.skills[0].hashChanged, true);
  const missing = buildInstruction(decision, { mode: "apply", readFile: () => { throw Object.assign(new Error("gone"), { code: "ENOENT" }); } });
  assert.equal(missing.applied.skills[0].applied, false);
  assert.equal(buildInstruction(decision, { mode: "recommend" }).text, null);
  const codex = buildInstruction(decision, { mode: "apply", cli: "codex", agentSupport: "recommend-only" });
  assert.equal(codex.applied.agent.applied, false);
  assert.ok(!codex.text.includes("subagent_type"));
});

test("injection is idempotent and re-applied to the same message for cache stability", () => {
  const injections = new Map([[promptHash("JD 써줘"), `${MARKER}>x</jev-routing-capabilities>`]]);
  const body = { messages: [{ role: "user", content: "JD 써줘" }, { role: "assistant", content: [{ type: "text", text: "ok" }] }, { role: "user", content: "next" }] };
  assert.equal(injectClaude(body, injections), 1);
  assert.equal(injectClaude(body, injections), 0);
  assert.equal(body.messages[0].content.length, 2);
  assert.equal(typeof body.messages[2].content, "string");
});

function upstream(t, handler) {
  const seen = [];
  const server = http.createServer((req, res) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => { seen.push({ url: req.url, body: data ? JSON.parse(data) : null }); handler(req, res); });
  });
  t.after(() => server.close());
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve({ base: `http://127.0.0.1:${server.address().port}`, seen })));
}
const sse = (res, model) => {
  res.writeHead(200, { "content-type": "text/event-stream" });
  res.end(`event: message_start\ndata: ${JSON.stringify({ type: "message_start", message: { model } })}\n\nevent: content_block_delta\ndata: ${JSON.stringify({ type: "content_block_delta", delta: { type: "text_delta", text: "hi" } })}\n\n`);
};

function runtimeFor(t, tree, mode = "apply", extra = {}) {
  const stateDir = join(tree.root, "state");
  const config = { schemaVersion: 1, enabled: true, stateDir, capabilityRouting: { mode, dataset: "regression",
    roots: { claude: { skills: [{ dir: join(tree.home, ".claude/skills"), scope: "user" }], agents: [{ dir: join(tree.home, ".claude/agents"), scope: "user", format: "md" }] },
      codex: { skills: [{ dir: join(tree.home, ".claude/skills"), scope: "user" }], agents: [] } }, ...extra } };
  return { stateDir, config };
}

test("Claude proxy: one turn links input, candidates, decision, application, served model and masked input", async (t) => {
  const tree = makeTree(t);
  const { stateDir, config } = runtimeFor(t, tree);
  const { base, seen } = await upstream(t, (req, res) => sse(res, "claude-sonnet-5-5"));
  let asked;
  const route = async (input) => { asked = input.capabilityQuestions; return { choice: "claude-sonnet-5-5", confidence: 0.8, effort: "medium", ms: 12,
    routerModel: "test-router", usage: { inputTokens: 100, outputTokens: 5 },
    capabilityAnswers: { skill: answer("hr-make-jd", 0.85), agent: answer("hr-jd-writer", 0.7) } }; };
  const proxy = await startProxy({ upstreamURL: base, route, runtimeConfig: config, cwd: tree.cwd });
  t.after(proxy.close);
  const prompt = "JD 초안 작성해줘. 참고 token=abcdef123456 은 무시";
  const body = { model: "jev-router", tools: [{ name: "Read", input_schema: { type: "object" } }], messages: [{ role: "user", content: prompt }] };
  const res = await fetch(`http://127.0.0.1:${proxy.port}/v1/messages`, { method: "POST", body: JSON.stringify(body) });
  const text = await res.text();
  assert.match(text, /skill hr-make-jd; agent hr-jd-writer \(recommended\)/);
  assert.ok(asked.skill && asked.agent, "skill and agent questions ride on the routing call");
  const sent = seen.at(-1).body.messages[0].content;
  assert.ok(sent.some((b) => b.text?.includes("Body of hr-make-jd")), "skill content reaches the model");
  const events = readEvents(stateDir);
  const ids = new Set(events.map((e) => e.requestId));
  assert.equal(ids.size, 1);
  assert.deepEqual(events.map((e) => e.type), ["request", "candidates", "decision", "application", "served"]);
  const [request, , decision, application, served] = events;
  assert.ok(request.taskId && request.conversationId && request.routerVersion && request.catalog.hash);
  assert.ok(!request.input.text.includes("abcdef123456"), "secret masked");
  assert.equal(request.input.sha256.length, 64);
  assert.equal(decision.routerModel, "test-router");
  assert.deepEqual(decision.usage, { inputTokens: 100, outputTokens: 5 });
  assert.equal(decision.cost, "unknown");
  assert.equal(application.skills[0].applied, true);
  assert.equal(application.agent.applied, "recommendation-injected");
  assert.equal(served.model, "claude-sonnet-5-5");
  assert.equal(decision.taskId, request.taskId);
});

test("Claude proxy: identical retry reuses the decision; tool loop keeps injection and logs delegation once", async (t) => {
  const tree = makeTree(t);
  const { stateDir, config } = runtimeFor(t, tree);
  const { base, seen } = await upstream(t, (req, res) => sse(res, "claude-sonnet-5-5"));
  let calls = 0;
  const route = async () => { calls++; return { choice: "claude-sonnet-5-5", confidence: 0.8, effort: "medium", capabilityAnswers: { skill: answer("hr-make-jd", 0.85), agent: answer("hr-jd-writer", 0.7) } }; };
  const proxy = await startProxy({ upstreamURL: base, route, runtimeConfig: config, cwd: tree.cwd });
  t.after(proxy.close);
  const post = (body) => fetch(`http://127.0.0.1:${proxy.port}/v1/messages`, { method: "POST", body: JSON.stringify(body) }).then((r) => r.text());
  const turn = { model: "jev-router", tools: [{ name: "Agent", input_schema: { type: "object" } }], messages: [{ role: "user", content: "JD 초안 작성해줘" }] };
  await post(turn);
  await post(turn); // network retry of the same request
  const loop = { ...turn, messages: [...turn.messages,
    { role: "assistant", content: [{ type: "tool_use", id: "tu1", name: "Agent", input: { subagent_type: "hr-jd-writer", prompt: "x" } }] },
    { role: "user", content: [{ type: "tool_result", tool_use_id: "tu1", content: "draft" }] }] };
  await post(loop);
  await post(loop);
  const events = readEvents(stateDir);
  assert.equal(events.filter((e) => e.type === "decision").length, 1, "no duplicate decision for a retry");
  const requests = events.filter((e) => e.type === "request");
  assert.equal(requests[1].attempt, 2);
  assert.equal(requests[1].retryOf, requests[0].requestId);
  assert.equal(events.filter((e) => e.type === "tool_observed").length, 1);
  assert.equal(events.filter((e) => e.type === "tool_result").length, 1);
  const loopBody = seen.at(-1).body.messages[0].content;
  assert.equal(loopBody.filter((b) => b.text?.startsWith(MARKER)).length, 1, "same injection in the tool loop");
  const report = routingReport({ stateDir, dataset: "regression" });
  assert.equal(report.sample.retries, 1);
  assert.equal(report.application.agent.delegationStarted, 1);
  assert.equal(report.application.agent.delegationCompleted, 1);
  assert.ok(calls >= 1);
});

test("selection/execution mismatch is recorded in recommend mode and for a different served model", async (t) => {
  const tree = makeTree(t);
  const { stateDir, config } = runtimeFor(t, tree, "recommend");
  const { base, seen } = await upstream(t, (req, res) => sse(res, "claude-opus-5-5"));
  const route = async () => ({ choice: "claude-sonnet-5-5", confidence: 0.8, capabilityAnswers: { skill: answer("hr-make-jd", 0.85), agent: answer("none", 0.9) } });
  const proxy = await startProxy({ upstreamURL: base, route, runtimeConfig: config, cwd: tree.cwd });
  t.after(proxy.close);
  await fetch(`http://127.0.0.1:${proxy.port}/v1/messages`, { method: "POST", body: JSON.stringify({ model: "jev-router", tools: [{ name: "Read", input_schema: {} }], messages: [{ role: "user", content: "JD 초안 작성해줘" }] }) }).then((r) => r.text());
  assert.equal(typeof seen.at(-1).body.messages[0].content, "string", "recommend mode does not change the request");
  const application = readEvents(stateDir).find((e) => e.type === "application");
  assert.ok(application.mismatch.some((m) => m.reason.includes("recommend mode")));
  const report = routingReport({ stateDir, dataset: "regression" });
  assert.equal(report.application.model.servedDiffersFromSelected, 1);
  assert.equal(report.application.skills.injected, 0);
});

test("Codex proxy injects the selected skill and reports agent delegation as unsupported", async (t) => {
  const tree = makeTree(t);
  const { stateDir, config } = runtimeFor(t, tree, "apply", { clis: ["claude", "codex"] });
  config.capabilityRouting.roots.codex.agents = [{ dir: join(tree.home, ".claude/agents"), scope: "user", format: "md" }];
  const { base, seen } = await upstream(t, (req, res) => {
    if (req.url.startsWith("/models")) { res.writeHead(200, { "content-type": "application/json" }); return res.end(JSON.stringify({ models: [{ slug: "gpt-5.6-terra", supported_reasoning_levels: [{ effort: "medium" }] }] })); }
    res.writeHead(200, { "content-type": "text/event-stream" });
    res.end(`data: ${JSON.stringify({ type: "response.created", response: { model: "gpt-5.6-terra" } })}\n\n`);
  });
  const route = async () => ({ choice: "gpt-5.6-terra", confidence: 0.8, effort: "medium", capabilityAnswers: { skill: answer("hr-make-jd", 0.85), agent: answer("hr-jd-writer", 0.8) } });
  const proxy = await startCodexProxy({ chatgptBaseURL: base, apiBaseURL: base, route, runtimeConfig: config, cwd: tree.cwd });
  t.after(proxy.close);
  const res = await fetch(`http://127.0.0.1:${proxy.port}/responses`, { method: "POST", headers: { "chatgpt-account-id": "x" },
    body: JSON.stringify({ model: "jev-router", input: [{ type: "additional_tools", tools: [{}] }, { role: "user", content: [{ type: "input_text", text: "JD 초안 작성해줘" }] }] }) });
  assert.match(await res.text(), /agent hr-jd-writer \(recommended\)/);
  const sent = seen.find((s) => s.url.startsWith("/responses")).body.input[1].content;
  assert.ok(sent.some((p) => p.text?.includes("Body of hr-make-jd")));
  const application = readEvents(stateDir).find((e) => e.type === "application");
  assert.equal(application.agent.applied, false);
  assert.equal(routingReport({ stateDir, dataset: "regression" }).application.agent.recommendationOnlyHost, 1);
});

test("mode off is the cold path: no events and an unchanged body", async (t) => {
  const tree = makeTree(t);
  const { stateDir, config } = runtimeFor(t, tree, "off");
  assert.equal(createCapabilityRuntime({ cli: "claude", config }), null);
  const { base, seen } = await upstream(t, (req, res) => sse(res, "claude-sonnet-5-5"));
  let asked = "unset";
  const proxy = await startProxy({ upstreamURL: base, route: async (input) => { asked = input.capabilityQuestions; return { choice: "claude-sonnet-5-5", confidence: 0.8 }; }, runtimeConfig: config, cwd: tree.cwd });
  t.after(proxy.close);
  await fetch(`http://127.0.0.1:${proxy.port}/v1/messages`, { method: "POST", body: JSON.stringify({ model: "jev-router", tools: [{ name: "Read", input_schema: {} }], messages: [{ role: "user", content: "JD 초안 작성해줘" }] }) }).then((r) => r.text());
  assert.equal(asked, undefined);
  assert.equal(seen.at(-1).body.messages[0].content, "JD 초안 작성해줘");
  assert.deepEqual(readEvents(stateDir), []);
  assert.ok(!JSON.stringify(readFileSync(join(stateDir, "decisions.jsonl"), "utf8")).includes("capabil"));
});

test("Korean particles attached to Latin words still shortlist (JD가)", (t) => {
  const { catalog } = makeTree(t);
  assert.equal(shortlist("JD가 뭔지 알려줘", catalog.skills, { limit: 3 })[0]?.candidate.name, "hr-make-jd");
});

test("the classifier is not asked a question the user already answered", (t) => {
  const tree = makeTree(t);
  const { config } = runtimeFor(t, tree);
  const caps = createCapabilityRuntime({ cli: "claude", config, cwd: tree.cwd });
  const named = caps.prepare({ prompt: "/hr-pip 로 PIP 문서와 JD 초안 써줘", conversationId: "a", messageCount: 1 });
  assert.ok(!named.questions?.skill, "explicit skill: no skill question");
  const optOut = caps.prepare({ prompt: "스킬 없이 JD 초안 작성해줘", conversationId: "b", messageCount: 1 });
  assert.ok(!optOut.questions?.skill, "opt-out: no skill question");
  const open = caps.prepare({ prompt: "JD 초안 작성해줘", conversationId: "c", messageCount: 1 });
  assert.ok(open.questions.skill);
});

test("Claude proxy: a resend under a new conversation key after HTTP 400 is linked as a retry", async (t) => {
  const tree = makeTree(t);
  const { stateDir, config } = runtimeFor(t, tree);
  let first = true;
  const { base, seen } = await upstream(t, (req, res) => {
    if (first) { first = false; res.writeHead(400, { "content-type": "application/json" }); return res.end("{}"); }
    sse(res, "claude-haiku-4-5-20251001");
  });
  let calls = 0;
  const route = async () => { calls++; return { choice: "claude-haiku-4-5-20251001", confidence: 0.8,
    capabilityAnswers: { skill: answer("hr-make-jd", 0.85), agent: calls === 1 ? answer("hr-jd-writer", 0.7) : answer("none", 0.9) } }; };
  const proxy = await startProxy({ upstreamURL: base, route, runtimeConfig: config, cwd: tree.cwd });
  t.after(proxy.close);
  const post = (body) => fetch(`http://127.0.0.1:${proxy.port}/v1/messages`, { method: "POST", body: JSON.stringify(body) }).then((r) => r.text());
  const turn = { model: "jev-router", tools: [{ name: "Read", input_schema: {} }], messages: [{ role: "user", content: "JD 초안 작성해줘" }] };
  await post({ ...turn, messages: [...turn.messages, { role: "system", content: "hook output" }] });
  await post({ ...turn, metadata: { user_id: JSON.stringify({ session_id: "s-after-400" }) } }); // new conversation key
  const events = readEvents(stateDir);
  assert.equal(events.filter((e) => e.type === "decision").length, 1, "decided once");
  const requests = events.filter((e) => e.type === "request");
  assert.equal(requests[1].attempt, 2);
  assert.notEqual(requests[0].conversationId, requests[1].conversationId);
  assert.ok(seen.at(-1).body.messages[0].content.some((b) => b.text?.includes('subagent_type "hr-jd-writer"')), "same delegation recommendation, not a new one");
  const report = routingReport({ stateDir, dataset: "regression" });
  assert.equal(report.sample.decisions, 1);
  assert.equal(report.application.model.servedObserved, 1);
});
