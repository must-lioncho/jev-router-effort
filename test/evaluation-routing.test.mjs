import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import http from 'node:http';
import { createTaskRuntime } from '../src/task-runtime.mjs';
import { taskProfile, isEvaluationRequest } from '../src/evidence-policy.mjs';
import { renderPacket } from '../src/handoff.mjs';
import { codexHandoffContext, codexTaskHistory, startCodexProxy } from '../src/codex-proxy.mjs';

const target = { cli: 'claude', model: 'claude-sonnet-5-5', effort: null };
const preference = { id: 'lion-evaluation', sourceCli: 'codex', taskType: 'evaluation', target,
  provenance: { kind: 'user-preference', source: 'Lion request 2026-09-30' }, reason: 'Evaluation preference requested by Lion' };
const models = [{ id: 'gpt-6-sol', tier: 'opus', efforts: ['high'] }];
const recommendation = { choice: 'gpt-6-sol', effort: 'high', confidence: 0.8 };
const checkpoint = { ok: true, commit: 'a'.repeat(40), ref: 'refs/jev/checkpoints/fixture/x' };

function fixture(t, overrides = {}) {
  const cwd = mkdtempSync(join(tmpdir(), 'jev-evaluation-'));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  const config = { enabled: true, schemaVersion: 1, stateDir: join(cwd, 'private-state'), handoff: true,
    routingPreferences: [preference], externalModels: [{ cli: target.cli, id: target.model }],
    externalCatalog: { claude: { models: { [target.model]: { efforts: [null], evidence: ['catalog-fixture-only'], checkedAt: new Date().toISOString() } } } },
    ...overrides.config };
  let calls = 0;
  let packet;
  let classified;
  const dependencies = {
    cli: 'codex', cwd, config,
    route: async input => { classified = input; return recommendation; },
    checkpoint: async () => checkpoint,
    handoff: async input => { calls++; packet = input.packet; return { handle: 'term_fixture', delivery: { accepted: true, turnStarted: true }, completion: 'unknown' }; },
    ...overrides, config,
  };
  const runtime = createTaskRuntime(dependencies);
  return { runtime, cwd, config, dependencies, get calls() { return calls; }, get packet() { return packet; }, get classified() { return classified; } };
}
const request = (prompt = 'Review the implementation against its acceptance criteria') => ({ taskKey: 'conversation', prompt, models, efforts: ['high'] });

test('KR/EN evaluation stage detection is conservative for mixed mutation requests', () => {
  for (const text of ['결과 평가해줘', '코드를 검토해주세요', '요구사항 채점해', 'QA 실행해', 'Evaluate the implemented feature', 'Review the code', 'Review the fix', 'Evaluate the build', 'QA this implementation']) {
    assert.equal(isEvaluationRequest(text), true, text);
    assert.equal(taskProfile(text).taskType, 'evaluation', text);
    assert.equal(taskProfile(text).mutating, false, text);
  }
  for (const text of ['Implement the feature then review it', 'Fix the code and evaluate it', 'Update the code after review', 'Review and fix the code', '구현하고 평가해', '코드를 수정하고 검토해', '검토 후 수정', '평가 기준에 맞게 수정 바랍니다', '평가용 파일을 만들어', 'Add QA tests']) {
    assert.equal(isEvaluationRequest(text), false, text);
    assert.notEqual(taskProfile(text).taskType, 'evaluation', text);
  }
  assert.equal(isEvaluationRequest('수정하지 말고 검토해'), true);
  assert.equal(isEvaluationRequest('Review without editing the code'), true);
});

const koreanMixed = [
  'QA 후 배포해줘', '코드 검토하고 커밋해줘', '리뷰하고 파일을 지워줘', '코드를 리팩터링하고 평가해줘',
  '검토하고 삭제해', '리뷰한 후 배포해주세요', 'QA 후 배포를 진행해줘', '코드를 검토하고 커밋도 해줘',
  '리뷰 후 커밋 부탁드립니다', '채점 후 파일을 지우세요', '파일을 지우고 평가해', 'QA 후 파일을 지워 주세요',
  '코드를 리팩토링해 주고 검토해', '리팩터링을 수행하고 QA 해줘', '검토 후 변경사항을 푸시해줘',
  '평가 후 결과를 게시해', '검토 후 수정 사항을 반영해줘',
];
const koreanReadOnly = [
  '커밋을 검토해', '배포 결과를 평가해', '리팩터링 결과를 리뷰해', '삭제한 파일 목록을 검토해',
  '배포하지 말고 평가해', '커밋하지 말고 검토해', '파일을 지우지 말고 리뷰해',
  '리팩터링하지 말고 평가해', '배포는 하지 말고 검토해', '커밋도 하지 말고 QA만 해줘',
  '파일을 지우지 않고 평가해', '삭제하지 말고 검토해',
];

test('QA D1 Korean write verbs and nearby conjugations veto read-only evaluation', () => {
  for (const prompt of koreanMixed) {
    assert.equal(isEvaluationRequest(prompt), false, prompt);
    assert.notEqual(taskProfile(prompt).taskType, 'evaluation', prompt);
    assert.equal(taskProfile(prompt).mutating, true, prompt);
  }
  for (const prompt of koreanReadOnly) {
    assert.equal(isEvaluationRequest(prompt), true, prompt);
    assert.equal(taskProfile(prompt).taskType, 'evaluation', prompt);
    assert.equal(taskProfile(prompt).mutating, false, prompt);
  }
});

test('QA D1 mixed Korean write and evaluation requests cause zero runtime handoffs', async t => {
  const f = fixture(t);
  for (const [index, prompt] of koreanMixed.entries()) {
    const taskKey = `mixed-korean-${index}`;
    const result = await f.runtime.route({ ...request(prompt), taskKey });
    assert.equal(result.choice, recommendation.choice, prompt);
    assert.notEqual(result.taskContext.taskType, 'evaluation', prompt);
    assert.equal(result.taskContext.mutating, true, prompt);
    assert.doesNotThrow(() => f.runtime.assertLocal(taskKey), prompt);
  }
  assert.equal(f.calls, 0);
});

test('QA D1 artifact nouns and negated mutations retain runtime evaluation handoff', async t => {
  const f = fixture(t);
  for (const [index, prompt] of koreanReadOnly.entries()) {
    await assert.rejects(f.runtime.route({ ...request(prompt), taskKey: `readonly-korean-${index}` }), /Delegated/, prompt);
    assert.equal(f.packet.authority, 'read-only', prompt);
    assert.equal(f.packet.currentRequest, prompt);
  }
  assert.equal(f.calls, koreanReadOnly.length);
});

test('Codex evaluation preference transfers private context with read-only authority and no fake outcome samples', async t => {
  const f = fixture(t);
  const localContext = { instructions: 'PRIVATE constraints from AGENTS.md', items: [
    { role: 'assistant', type: 'message', text: 'Artifact src/example.mjs; checks: 17/17 pass' },
    { type: 'function_call_output', output: 'npm test exit 0, 17 tests' },
  ] };
  await assert.rejects(f.runtime.route({ ...request('구현 결과를 평가해'), localContext }), /Delegated to claude\/claude-sonnet-5-5.*Terminal: term_fixture/);
  assert.equal(f.calls, 1);
  assert.equal(f.packet.authority, 'read-only');
  assert.equal(f.packet.stage, 'evaluation');
  assert.deepEqual(f.packet.context, localContext);
  assert.equal(f.packet.routingSelection.kind, 'user-preference');
  assert.equal(f.packet.routingSelection.preferenceId, preference.id);
  assert.equal(f.packet.evidenceRule, undefined);
  assert.equal(f.classified.localContext, undefined);
  assert.ok(!JSON.stringify(f.classified).includes('PRIVATE'));
  const task = JSON.parse(readFileSync(join(f.config.stateDir, 'tasks', readdirSync(join(f.config.stateDir, 'tasks'))[0]), 'utf8'));
  assert.equal(task.handoff.selection.kind, 'user-preference');
  assert.equal(task.handoff.ruleId, undefined);
  assert.equal(task.handoff.receipt.completion, 'unknown');
});

test('implementation then evaluation keeps the first objective across restart and overrides its mutation profile', async t => {
  const f = fixture(t);
  const objective = 'Implement a plugin with approval workflows and background schedules';
  assert.equal((await f.runtime.route(request(objective))).taskContext.taskType, 'cross-module-change');
  const restarted = createTaskRuntime(f.dependencies);
  await assert.rejects(restarted.route(request('이제 구현한 코드를 검토해')), /Delegated/);
  assert.equal(f.packet.objective, objective);
  assert.equal(f.packet.taskType, 'evaluation');
  assert.equal(f.packet.currentRequest, '이제 구현한 코드를 검토해');
  assert.equal(f.packet.mutating, false);
  await assert.rejects(restarted.route(request('continue')), /handed off/);
  assert.throws(() => createTaskRuntime(f.dependencies).assertLocal('conversation'), /handed off/);
  assert.equal(f.calls, 1);
});

test('objective is not silently truncated before rendering an oversized required packet', async t => {
  const objective = 'Implement feature ' + 'important requirement '.repeat(3500);
  let launched = false;
  const f = fixture(t, { handoff: async input => {
    assert.equal(input.packet.objective, objective);
    renderPacket(input.packet, { cwd: input.cwd, taskId: input.taskId, target: input.target, checkpoint: input.checkpoint });
    launched = true;
  } });
  await f.runtime.route(request(objective));
  await assert.rejects(f.runtime.route(request('Review the implementation')), /before launch.*limit/);
  assert.equal(launched, false);
  assert.doesNotThrow(() => f.runtime.assertLocal('conversation'));
});

for (const [name, config, extra] of [
  ['cold start', { routingPreferences: [] }],
  ['handoff disabled', { handoff: false }],
  ['missing catalog', { externalCatalog: {} }],
  ['missing candidates', { externalModels: [] }],
  ['wrong source CLI', { routingPreferences: [{ ...preference, sourceCli: 'claude' }] }],
  ['wrong task type', { routingPreferences: [{ ...preference, taskType: 'analysis' }] }],
  ['missing provenance', { routingPreferences: [{ ...preference, provenance: { kind: 'model-confidence' } }] }],
  ['unsupported exact model', { routingPreferences: [{ ...preference, target: { ...target, model: 'claude-unknown' } }] }],
  ['unsupported exact effort', { routingPreferences: [{ ...preference, target: { ...target, effort: 'high' } }] }],
  ['stale catalog', { externalCatalog: { claude: { models: { [target.model]: { efforts: [null], evidence: ['old-check'], checkedAt: '2020-01-01T00:00:00Z' } } } } }],
  ['uncited catalog', { externalCatalog: { claude: { models: { [target.model]: { efforts: [null], evidence: [], checkedAt: new Date().toISOString() } } } } }],
  ['manual model instruction', {}, { prompt: 'use sol. Review the code' }],
  ['manual effort even matching target', { externalCatalog: { claude: { models: { [target.model]: { efforts: ['high'], evidence: ['catalog'], checkedAt: new Date().toISOString() } } } }, routingPreferences: [{ ...preference, target: { ...target, effort: 'high' } }] }, { manualEffort: 'high' }],
]) test(`${name} retains Codex recommendation without external effects`, async t => {
  const f = fixture(t, { config });
  const result = await f.runtime.route({ ...request(), ...extra });
  assert.equal(result.choice, recommendation.choice);
  assert.equal(f.calls, 0);
  assert.doesNotThrow(() => f.runtime.assertLocal('conversation'));
});

test('mixed implementation and review stay local despite a configured evaluation preference', async t => {
  const f = fixture(t);
  await f.runtime.route(request('Implement a new function and review its code'));
  assert.equal(f.calls, 0);
});

test('external evaluation outcome rule remains distinct from user preference, and avoid evidence vetoes preference', async t => {
  const rule = { id: 'evaluated-outcome', taskType: 'evaluation', ...target, outcome: 'prefer', status: 'validated',
    sampleSize: 5, successes: 5, failures: 0, unknown: 0, evidenceIds: ['1', '2', '3', '4', '5'] };
  const f = fixture(t, { config: { routingPreferences: [] } });
  const policyPath = join(f.cwd, 'policy.json');
  writeFileSync(policyPath, JSON.stringify({ schemaVersion: 1, version: 'fixture', generatedAt: new Date().toISOString(), rules: [rule] }));
  f.config.policyPath = policyPath;
  await assert.rejects(f.runtime.route(request()), /Delegated/);
  assert.equal(f.packet.routingSelection.kind, 'outcome-evidence');
  assert.equal(f.packet.evidenceRule, rule.id);
  const g = fixture(t);
  g.config.policyPath = policyPath;
  writeFileSync(policyPath, JSON.stringify({ schemaVersion: 1, generatedAt: new Date().toISOString(), rules: [{ ...rule, outcome: 'avoid', successes: 1, failures: 4 }] }));
  await g.runtime.route(request());
  assert.equal(g.calls, 0);
});

test('required checkpoint failure blocks handoff and local generation', async t => {
  const f = fixture(t, { checkpoint: async () => { throw new Error('checkpoint locked'); } });
  await assert.rejects(f.runtime.route(request()), /Checkpoint required.*locked/);
  assert.equal(f.calls, 0);
});

test('Codex extraction preserves assistant text, tool output and instructions with explicit non-text omissions', () => {
  const context = codexHandoffContext({ instructions: 'Obey local AGENTS.md', input: [
    { type: 'additional_tools', tools: [{}] },
    { role: 'assistant', content: [{ type: 'output_text', text: 'Created artifact.md; verification passed' }] },
    { type: 'function_call', call_id: 'c1', name: 'exec_command', arguments: '{"cmd":"npm test"}' },
    { type: 'function_call_output', call_id: 'c1', output: 'Exit 0; 24 tests passed' },
    { role: 'user', content: [{ type: 'input_text', text: 'Evaluate it' }, { type: 'input_image', image_url: 'data:private-image' }] },
  ] });
  assert.equal(context.instructions, 'Obey local AGENTS.md');
  assert.equal(context.items.length, 4);
  assert.equal(context.items[0].text, 'Created artifact.md; verification passed');
  assert.equal(context.items[1].arguments, '{"cmd":"npm test"}');
  assert.equal(context.items[2].output, 'Exit 0; 24 tests passed');
  assert.equal(context.items[3].unavailableContent[0].type, 'input_image');
  assert.ok(!JSON.stringify(context).includes('data:private-image'));
});

test('Codex first objective excludes bootstrap AGENTS instructions while receiver keeps them', () => {
  const body = { input: [
    { role: 'user', content: '# AGENTS.md instructions for /workspace\n<INSTRUCTIONS>Preserve unrelated edits.</INSTRUCTIONS>' },
    { role: 'user', content: '<environment_context>cwd=/workspace</environment_context>' },
    { role: 'user', content: 'Implement a publisher function' },
    { role: 'assistant', content: 'Implemented src/publisher.mjs' },
    { role: 'user', content: 'Review it against acceptance criteria' },
  ] };
  assert.deepEqual(codexTaskHistory(body), ['Implement a publisher function', 'Review it against acceptance criteria']);
  assert.ok(JSON.stringify(codexHandoffContext(body)).includes('Preserve unrelated edits'));
});

test('HTTP Codex preference delegates and suppresses all generation, including retries with a manual model', async t => {
  const f = fixture(t);
  let generated = 0;
  let classified = 0;
  const upstream = http.createServer((req, res) => {
    req.resume(); req.on('end', () => {
      if (/\/models/.test(req.url)) return res.end(JSON.stringify({ models: [
        { slug: 'gpt-6-sol', supported_in_api: true, supported_reasoning_levels: [{ effort: 'high' }] },
      ] }));
      generated++; res.end('{}');
    });
  });
  await new Promise(resolve => upstream.listen(0, '127.0.0.1', resolve));
  t.after(() => upstream.close());
  const base = `http://127.0.0.1:${upstream.address().port}`;
  const proxy = await startCodexProxy({ cwd: f.cwd, runtimeConfig: f.config, chatgptBaseURL: base, apiBaseURL: base,
    route: async input => { classified++; assert.equal(input.localContext, undefined); return recommendation; },
    checkpoint: f.dependencies.checkpoint, handoff: f.dependencies.handoff });
  t.after(proxy.close);
  const body = { model: 'jev-router', prompt_cache_key: 'http-evaluation', reasoning: { effort: 'auto' }, instructions: 'PRIVATE instruction', input: [
    { type: 'additional_tools', tools: [{}] },
    { role: 'user', content: '# AGENTS.md instructions for /fixture\n<INSTRUCTIONS>Preserve edits</INSTRUCTIONS>' },
    { role: 'user', content: 'Implement a function' },
    { role: 'assistant', content: [{ type: 'output_text', text: 'src/example.mjs created; tests pass' }] },
    { type: 'function_call_output', call_id: 't1', output: 'npm test: exit 0' }, { role: 'user', content: 'Review the implementation' },
  ] };
  const send = () => fetch(`http://127.0.0.1:${proxy.port}/responses`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const response = await send();
  assert.equal(response.status, 409);
  const held = await response.json();
  assert.equal(held.error.detail.selection.kind, 'user-preference');
  assert.equal(held.error.detail.receipt.handle, 'term_fixture');
  assert.equal(f.packet.objective, 'Implement a function');
  assert.equal(f.packet.context.instructions, 'PRIVATE instruction');
  assert.ok(JSON.stringify(f.packet.context).includes('src/example.mjs created; tests pass'));
  assert.ok(JSON.stringify(f.packet.context).includes('npm test: exit 0'));
  assert.equal((await send()).status, 409);
  body.model = 'gpt-6-sol';
  assert.equal((await send()).status, 409);
  assert.equal(generated, 0);
  assert.equal(classified, 1);
  assert.equal(f.calls, 1);
});

test('fresh manual Codex model selection retains upstream behavior with evaluation preference enabled', async t => {
  const f = fixture(t);
  let generated = 0;
  const upstream = http.createServer((req, res) => { generated++; req.resume(); res.end('{}'); });
  await new Promise(resolve => upstream.listen(0, '127.0.0.1', resolve));
  t.after(() => upstream.close());
  const base = `http://127.0.0.1:${upstream.address().port}`;
  const proxy = await startCodexProxy({ cwd: f.cwd, runtimeConfig: f.config, chatgptBaseURL: base, apiBaseURL: base,
    route: async () => { throw new Error('Manual models must not classify'); } });
  t.after(proxy.close);
  const res = await fetch(`http://127.0.0.1:${proxy.port}/responses`, { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'gpt-6-sol', input: [{ type: 'additional_tools', tools: [{}] }, { role: 'user', content: 'Review the code' }] }) });
  assert.equal(res.status, 200);
  assert.equal(generated, 1);
});
