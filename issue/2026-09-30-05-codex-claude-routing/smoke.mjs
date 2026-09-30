// Real Codex task runtime -> real checkpoint -> Orca -> native Claude.
// The classification function is deliberately stubbed: this checks the explicit
// user preference path, not comparative model quality or TypeSafe availability.
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createTaskRuntime } from '../../src/task-runtime.mjs';

const cwd = fileURLToPath(new URL('../../', import.meta.url));
const taskKey = process.argv[2] ?? 'qa-attempt-1';
if (!/^(?:qa-attempt|resume)-[12]$/.test(taskKey)) throw new Error('Smoke accepts qa-attempt-1/2 or explicitly authorized resume-1/2');
const commonDir = resolve(cwd, execFileSync('git', ['rev-parse', '--git-common-dir'], { cwd, encoding: 'utf8' }).trim());
const privateDir = join(commonDir, 'jev', 'live-codex-claude', taskKey);
const model = 'claude-sonnet-5-5';
const checker = join(homedir(), '.claude/skills/jev-router-improvement/scripts/check_target.py');
const gate = JSON.parse(execFileSync('python3', [checker, '--sender', '--cli', 'claude', '--model', model, '--router', cwd], { encoding: 'utf8' }));
if (!gate.accepted) throw new Error('Actual executor catalog check rejected target');
const cliVersion = execFileSync('claude', ['--version'], { encoding: 'utf8' }).trim();
const checkedAt = new Date().toISOString();
const config = {
  schemaVersion: 1, enabled: true, checkpoint: true, handoff: true,
  stateDir: join(privateDir, 'state'),
  routingPreferences: [{
    id: 'lion-codex-evaluation-claude', sourceCli: 'codex', taskType: 'evaluation',
    target: { cli: 'claude', model, effort: null },
    provenance: { kind: 'user-preference', source: 'Lion request 2026-09-30' },
    reason: 'Lion prefers native Claude for evaluation/review',
  }],
  externalModels: [{ cli: 'claude', id: model, efforts: [null] }],
  externalCatalog: { claude: { models: { [model]: {
    efforts: [null], checkedAt,
    evidence: [`native-cli:${cliVersion}`, 'actual-check_target.py:sender:accepted'],
  } } } },
};
const original = 'A fixture result says 2 + 2 = 4 and 7 * 6 = 42. Its artifact is this inline text; no files need modification.';
const prompt = '이 결과를 평가해 주세요. Evaluate the fixture arithmetic read-only. Return one final line exactly: JEV_CLAUDE_SMOKE_PASS {"sum":4,"product":42,"readOnly":true}. No file changes or external communication. Report your actual model/effort if known separately. The coordinator reads the final result from your terminal; no worker_done is required.';
const runtime = createTaskRuntime({ cli: 'codex', cwd, config, route: async () => null });
mkdirSync(privateDir, { recursive: true, mode: 0o700 });
let result;
try {
  const answer = await runtime.route({
    taskKey, prompt, taskHistory: [original, prompt],
    localContext: {
      instructions: 'Evaluate this arithmetic read-only; do not modify any file.',
      items: [{ role: 'assistant', type: 'message', text: 'Artifact: 2 + 2 = 4; 7 * 6 = 42.' },
        { type: 'function_call_output', callId: 'fixture-check', text: 'Arithmetic check exit 0: sum=4, product=42.' }],
    },
    models: [], efforts: [],
  });
  result = { routed: false, answer, gate, cliVersion, checkedAt };
} catch (error) {
  if (!error.routingHold) throw error;
  result = { routed: Boolean(error.detail?.receipt), hold: error.message, handoff: error.detail, gate, cliVersion, checkedAt };
}
writeFileSync(join(privateDir, 'runtime-result.json'), JSON.stringify(result, null, 2) + '\n', { mode: 0o600 });
console.log(JSON.stringify({ routed: result.routed, hold: result.hold,
  handle: result.handoff?.receipt?.handle, state: result.handoff?.state,
  delivery: result.handoff?.receipt?.delivery, completion: result.handoff?.receipt?.completion,
  evidencePath: join(privateDir, 'runtime-result.json'), checkedAt }, null, 2));
if (!result.routed) process.exitCode = 1;
