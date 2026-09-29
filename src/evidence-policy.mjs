import { readFileSync } from 'node:fs';

export const TASK_TYPES = ['cross-module-change', 'local-code-change', 'analysis', 'writing', 'research', 'operations', 'general'];

/** Conservative task signals, not a model-quality judgement. Length is never a signal. */
export function taskProfile(text = '') {
  const change = /구현|개발|만들|수정|고쳐|고치|추가|복구|실행|적용|implement|build|develop|fix|refactor|restore|deploy|create|add\b/i.test(text);
  const signals = {
    integration: /플러그인|모듈|기존.{0,20}(앱|메뉴|코드)|plugin|cross.module|integrat|architecture/i.test(text),
    workflow: /승인|거절|검수|상태|자동.{0,10}발행|approve|reject|workflow|state.machine/i.test(text),
    scheduling: /스케줄|예약|매일|시간.{0,15}분|일.{0,8}(뒤|지나)|schedule|cron|background|retry/i.test(text),
    external: /슬랙|홈페이지|블로그|외부|결제|인증|slack|publish|payment|auth|external/i.test(text),
    recovery: /깨졌|깨먹|날려|삭제됐|회귀|데이터.{0,10}(손실|유실)|regression|data.loss|broke|broken/i.test(text),
  };
  const coupled = Object.entries(signals).filter(([, yes]) => yes).map(([name]) => name);
  const complex = change && (coupled.length >= 3 || (signals.integration && signals.workflow) || signals.recovery);
  const taskType = complex ? 'cross-module-change'
    : change && /코드|함수|테스트|버그|파일|code|function|test|bug|file/i.test(text) ? 'local-code-change'
      : /분석|검토|판단|analy[sz]|review|diagnos/i.test(text) ? 'analysis'
        : /번역|원고|문장|글|translate|write|prose/i.test(text) ? 'writing'
          : /조사|검색|찾아|research|search/i.test(text) ? 'research'
            : change ? 'operations' : 'general';
  return { taskType, complex, signals: coupled, mutating: change };
}

export function loadEvidencePolicy(path) {
  if (!path) return { schemaVersion: 1, rules: [] };
  const policy = JSON.parse(readFileSync(path, 'utf8'));
  if (policy.schemaVersion !== 1 || !Array.isArray(policy.rules)) throw new Error('Unsupported evidence policy schema');
  return policy;
}

export function wilsonLower(successes, n, z = 1.96) {
  if (!n) return 0;
  const p = successes / n;
  return (p + z * z / (2 * n) - z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n))) / (1 + z * z / n);
}

/** Recheck support at consumption time; a manually written 'validated' flag is insufficient. */
export function supportedRule(rule, policy, now = Date.now()) {
  if (rule?.status !== 'validated' || !TASK_TYPES.includes(rule.taskType)) return false;
  if (!['claude', 'codex', 'antigravity', 'glm'].includes(rule.cli) || typeof rule.model !== 'string' || !rule.model) return false;
  if (rule.effort !== null && typeof rule.effort !== 'string') return false;
  if (![rule.sampleSize, rule.successes, rule.failures, rule.unknown].every(n => Number.isInteger(n) && n >= 0)) return false;
  if (rule.sampleSize !== rule.successes + rule.failures + rule.unknown) return false;
  const known = rule.successes + rule.failures;
  if (known < 5 || !Array.isArray(rule.evidenceIds) || new Set(rule.evidenceIds).size < known) return false;
  const date = Date.parse(rule.evidenceAt ?? rule.generatedAt ?? policy.generatedAt);
  if (!Number.isFinite(date) || date > now + 60_000 || now - date > 30 * 86400_000) return false;
  if (rule.outcome === 'prefer') return rule.successes / known >= 0.9 && wilsonLower(rule.successes, known) >= 0.55;
  if (rule.outcome === 'avoid') return rule.failures >= 3 && rule.failures / known >= 0.5;
  return false;
}

export function selectEvidence({ policy, taskType, cli, models = [], efforts = [], manualEffort = null, externalModels = [], now }) {
  const rules = (policy?.rules ?? []).filter(r => r.taskType === taskType && supportedRule(r, policy, now));
  // null means no effort control, not evidence for every reasoning level.
  const supportedEffort = (rule, model, available) => rule.effort === null
    ? !(model?.efforts ?? available).some(e => e !== null)
    : (model?.efforts ?? available).includes(rule.effort);
  const compatible = (r, m, available) => m && supportedEffort(r, m, available) && (!manualEffort || r.effort === manualEffort);
  const avoid = rules.filter(r => r.cli === cli && r.outcome === 'avoid');
  const local = rules.filter(r => r.cli === cli && r.outcome === 'prefer'
    && compatible(r, models.find(m => m.id === r.model), efforts)
    && !avoid.some(a => a.model === r.model && (a.effort === null || a.effort === r.effort)));
  const sorted = list => list.sort((a, b) => wilsonLower(b.successes, b.successes + b.failures) - wilsonLower(a.successes, a.successes + a.failures));
  // Once the quality threshold holds, prefer a cheaper supported tier. Evidence does
  // not contain enough calibrated dollar/latency data to invent finer cost estimates.
  if (local.length) {
    const ranks = { haiku: 0, sonnet: 1, opus: 2, fable: 3 };
    const eligible = sorted(local).sort((a, b) =>
      (ranks[models.find(m => m.id === a.model)?.tier] ?? 9) - (ranks[models.find(m => m.id === b.model)?.tier] ?? 9));
    return { kind: 'local', rule: eligible[0], avoid };
  }
  const external = rules.filter(r => r.cli !== cli && ['claude', 'codex'].includes(r.cli) && r.outcome === 'prefer'
    && compatible(r, externalModels.find(m => m.cli === r.cli && m.id === r.model), [])
    && !rules.some(a => a.cli === r.cli && a.outcome === 'avoid' && a.model === r.model && (a.effort === null || a.effort === r.effort)));
  if (external.length) return { kind: 'external', rule: sorted(external)[0], avoid };
  return { kind: 'fallback', avoid };
}
