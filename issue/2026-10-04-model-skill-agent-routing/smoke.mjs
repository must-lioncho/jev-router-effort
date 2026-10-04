// Harmless live check: real installed catalog + real JEV classification, written to a
// temporary state directory. No files in any project are changed and no agent is launched.
// Usage: JEV_API_KEY=... node issue/2026-10-04-model-skill-agent-routing/smoke.mjs [stateDir]
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { askJev } from "../../src/router.mjs";
import { claudeModels } from "../../src/proxy.mjs";
import { createCapabilityRuntime } from "../../src/capability-runtime.mjs";
import { routingReport } from "../../src/routing-log.mjs";

const stateDir = process.argv[2] ?? mkdtempSync(join(tmpdir(), "jev-smoke-"));
const config = { schemaVersion: 1, enabled: true, stateDir, capabilityRouting: { mode: "apply", dataset: "regression" } };
const caps = createCapabilityRuntime({ cli: "claude", config, cwd: join(tmpdir(), "not-an-hr-folder") });
const models = claudeModels([]).filter((m) => m.tier !== "fable");

// Author-defined expectations for a smoke run. They are not ground-truth labels.
const cases = [
  { prompt: "백엔드 개발자 채용용 JD 초안 좀 써줘. 3년차 이상, Node.js", expectSkill: "hr-make-jd" },
  { prompt: "NSS 일일 모니터 보고서 오늘 거 만들어줘", expectSkill: "nss-report-daily" },
  { prompt: "SUT 프로모션 벌크 전송 CSV 만들어줘", expectSkill: "nss-promotion-usdt-sut" },
  { prompt: "파이썬 리스트 컴프리헨션이 뭐야? 짧게 설명해줘", expectSkill: null, expectAgent: null },
  { prompt: "이 함수 이름을 camelCase로 바꿔줘", expectSkill: null, expectAgent: null },
  { prompt: "/hr-pip 로 이 사람 PIP 문서 시작해줘", expectSkill: "hr-pip" },
  { prompt: "스킬 없이 JD가 뭔지만 한 줄로 알려줘", expectSkill: null },
];

const out = [];
let n = 0;
await askJev({ prompt: "warm up", current: "claude-sonnet-5-5", contextTokens: 0, models }); // TLS warm-up
for (const c of cases) {
  const ctx = caps.prepare({ prompt: c.prompt, conversationId: `smoke-${n++}`, messageCount: 1 });
  const base = await askJev({ prompt: c.prompt, current: "claude-sonnet-5-5", contextTokens: 0, models, efforts: ["low", "medium", "high"] });
  const jev = await askJev({ prompt: c.prompt, current: "claude-sonnet-5-5", contextTokens: 0, models, efforts: ["low", "medium", "high"],
    ...(ctx.questions ? { capabilityQuestions: ctx.questions } : {}) });
  const result = caps.finalize(ctx, { jev, model: jev?.choice ?? null, effort: jev?.effort ?? null, modelReason: jev ? "jev" : "jev-unavailable" });
  const d = result.decision;
  out.push({
    prompt: c.prompt,
    shortlist: { skills: ctx.shortlisted.skills.map((s) => `${s.candidate.name}:${s.score}`), agents: ctx.shortlisted.agents.map((s) => `${s.candidate.name}:${s.score}`) },
    askedClassifier: !!ctx.questions,
    model: jev?.choice ?? null, effort: jev?.effort ?? null, routerModel: jev?.routerModel ?? null, usage: jev?.usage ?? null,
    skill: { selected: d.skills.selected.map((s) => s.name), reason: d.skills.reason, confidence: d.skills.confidence ?? null },
    agent: { selected: d.agent.selected?.name ?? null, reason: d.agent.reason, confidence: d.agent.confidence ?? null },
    expectation: { skill: c.expectSkill, agent: c.expectAgent ?? "not-specified",
      skillMatches: (d.skills.selected[0]?.name ?? null) === c.expectSkill,
      agentMatches: c.expectAgent === undefined ? null : (d.agent.selected?.name ?? null) === c.expectAgent },
    latencyMs: { modelOnly: base?.ms ?? null, withCapabilities: jev?.ms ?? null },
    tokens: { modelOnly: base?.usage ?? null, withCapabilities: jev?.usage ?? null },
    applied: result.applied?.skills?.map((s) => ({ id: s.id, applied: s.applied, bytes: s.bytes })) ?? [],
  });
}
const report = routingReport({ stateDir, dataset: "regression" });
const summary = { stateDir, at: new Date().toISOString(), cases: out, report };
mkdirSync(new URL("./private/", import.meta.url), { recursive: true });
writeFileSync(new URL("./private/smoke-output.json", import.meta.url), JSON.stringify(summary, null, 2));
for (const r of out) {
  console.log(`${r.expectation.skillMatches ? "MATCH " : "DIFFER"} skill=${r.skill.selected.join("+") || "none"}(${r.skill.reason}${r.skill.confidence == null ? "" : ` ${r.skill.confidence.toFixed(2)}`}) agent=${r.agent.selected ?? "none"}(${r.agent.reason}) model=${r.model}/${r.effort} ms ${r.latencyMs.modelOnly}->${r.latencyMs.withCapabilities} tok ${r.tokens.modelOnly?.inputTokens ?? "?"}->${r.tokens.withCapabilities?.inputTokens ?? "?"} | ${r.prompt}`);
}
console.log(`events: ${stateDir}`);
