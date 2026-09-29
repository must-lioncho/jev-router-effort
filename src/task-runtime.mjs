import { appendFileSync, chmodSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { taskProfile, loadEvidencePolicy, selectEvidence } from './evidence-policy.mjs';
import { detectOverride } from './policy.mjs';
import { acquireFileLock } from './checkpoint.mjs';
import { validateTarget } from './handoff.mjs';

const hash = text => createHash('sha256').update(text).digest('hex').slice(0, 24);
const bounded = value => String(value ?? '').slice(0, 6000);
const failure = text => /깨졌|깨먹|날려|안\s?돼|안\s?되|실패|잘못|틀렸|regression|broken|failed|incorrect|doesn.t work/i.test(text);
const newTask = text => /^\s*(?:\/new-task\b|새\s*(?:작업|주제)\s*[:：]|new task\s*:)/i.test(text);

export class RoutingHoldError extends Error {
  constructor(message, detail = {}) { super(message); this.name = 'RoutingHoldError'; this.routingHold = true; this.detail = detail; }
}

export function runtimeConfig(path = process.env.JEV_RUNTIME_CONFIG ?? join(homedir(), '.config/jev-router/runtime.json')) {
  if (process.env.JEV_RUNTIME_DISABLED === '1' || !existsSync(path)) return { enabled: false };
  const config = JSON.parse(readFileSync(path, 'utf8'));
  if (config.schemaVersion !== 1) throw new RoutingHoldError('Unsupported JEV runtime configuration');
  return config;
}

function save(file, value) {
  mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
  const tmp = `${file}.${randomUUID()}.tmp`;
  writeFileSync(tmp, JSON.stringify(value, null, 2) + '\n', { mode: 0o600 });
  renameSync(tmp, file);
}

export function createTaskRuntime({ cli, route, cwd = process.cwd(), workspaceError, config, checkpoint, handoff, now = Date.now } = {}) {
  // Config errors are deliberately not treated as 'Jev unavailable'.
  config ??= runtimeConfig();
  if (!config.enabled) return { route, assertLocal() {}, assertModel() {} };
  const stateDir = config.stateDir ?? join(homedir(), '.local/state/jev-router');
  const fileFor = key => join(stateDir, 'tasks', `${hash(`${resolve(cwd)}:${cli}:${key}`)}.json`);
  const read = key => {
    const file = fileFor(key);
    if (!existsSync(file)) return null;
    try { return JSON.parse(readFileSync(file, 'utf8')); }
    catch { throw new RoutingHoldError(`Cannot read task state: ${file}`); }
  };
  const append = (name, event) => {
    mkdirSync(stateDir, { recursive: true, mode: 0o700 });
    const file = join(stateDir, name);
    appendFileSync(file, JSON.stringify(event) + '\n', { mode: 0o600 });
    chmodSync(file, 0o600);
  };
  const assertLocal = key => {
    const task = read(key);
    if (task?.handoff) throw new RoutingHoldError(`Task handed off to ${task.handoff.target?.cli ?? 'another CLI'}; local execution remains held. Receipt: ${fileFor(key)}`, task.handoff);
  };
  const assertModel = ({ taskKey, model, effort = null }) => {
    const task = read(taskKey);
    if (!task || task.manualOverride) return;
    try {
      const policy = loadEvidencePolicy(config.policyPath);
      const { avoid } = selectEvidence({ policy, taskType: task.profile.taskType, cli, now: now() });
      if (avoid.some(r => r.model === model && (r.effort === null || r.effort === effort))) {
        throw new RoutingHoldError('Final model is excluded by validated task evidence; execution held');
      }
    } catch (error) {
      if (error.routingHold) throw error;
      throw new RoutingHoldError(`Cannot verify final model: ${error.message}`);
    }
  };
  const inFlight = new Map();
  const run = async input => {
    const { taskKey = 'default', taskHistory = [], manualEffort = null } = input;
    assertLocal(taskKey);
    const old = read(taskKey);
    const reset = newTask(input.prompt);
    const objective = reset ? input.prompt : old?.objective ?? taskHistory.find(Boolean) ?? input.prompt;
    const task = reset || !old ? { id: randomUUID(), objective: bounded(objective), failures: [], followups: [], createdAt: now() } : old;
    const digest = hash(input.prompt);
    // A retried turn shares task state and never creates duplicate feedback records.
    if (task.lastPromptHash !== digest) {
      task.followups = [...task.followups, bounded(input.prompt)].slice(-4);
      if (failure(input.prompt)) {
        const entry = { id: randomUUID(), at: now(), source: 'user-or-qa-report', text: bounded(input.prompt), taskId: task.id, cli, model: input.current, verified: false };
        task.failures = [...task.failures, entry].slice(-8);
        append('feedback.jsonl', entry);
      }
    }
    task.lastPromptHash = digest;
    const profile = taskProfile([task.objective, ...task.followups].join('\n'));
    task.profile = profile;
    task.manualOverride = !!detectOverride(input.prompt);
    task.updatedAt = now();
    save(fileFor(taskKey), task);
    const taskContext = { objective: task.objective, recentRequests: task.followups, failures: task.failures.map(f => ({ text: f.text, source: f.source })), ...profile };
    let answer = await route({ ...input, taskContext });
    const policy = loadEvidencePolicy(config.policyPath);
    // An expired availability catalog cannot establish an external candidate.
    const externalModels = (config.externalModels ?? []).filter(model => {
      const entry = config.externalCatalog?.[model.cli]?.models?.[model.id];
      try { validateTarget({ cli: model.cli, model: model.id, effort: entry?.efforts?.[0] ?? null }, config.externalCatalog, new Date(now())); return true; }
      catch { return false; }
    }).map(model => ({ ...model, efforts: config.externalCatalog[model.cli].models[model.id].efforts }));
    const choice = selectEvidence({ policy, taskType: profile.taskType, cli, models: input.models,
      efforts: input.efforts, manualEffort, externalModels, now: now() });
    const measuredComplexity = answer?.metrics?.taskComplexity >= 0.65 || answer?.metrics?.toolComplexity >= 0.65;
    const willDelegate = !detectOverride(input.prompt) && choice.kind === 'external' && config.handoff === true;
    const needsCheckpoint = willDelegate || (config.checkpoint === true && profile.mutating && (profile.complex || measuredComplexity));
    if (needsCheckpoint) {
      try {
        if (workspaceError) throw new Error(workspaceError);
        const fn = checkpoint ?? (await import('./checkpoint.mjs')).ensureCheckpoint;
        const options = config.checkpointOptions ?? {};
        task.checkpoint = await fn({ sensitive: options.sensitive, acknowledgeUncovered: options.acknowledgeUncovered,
          maxFileBytes: options.maxFileBytes, cwd, taskId: task.id, reason: `JEV ${profile.taskType}: ${profile.signals.join(', ')}` });
        if (!task.checkpoint?.ok || !task.checkpoint.commit || !task.checkpoint.ref) throw new Error('Incomplete checkpoint receipt');
        save(fileFor(taskKey), task);
      } catch (err) { throw new RoutingHoldError(`Checkpoint required before execution: ${err.message}`); }
    }
    const override = detectOverride(input.prompt);
    if (!override && choice.kind === 'local') {
      const r = choice.rule;
      answer = { ...answer, choice: r.model, effort: r.effort ?? answer?.effort,
        // JEV's confidence belongs to its own proposal, not our evidence override.
        confidence: null, effortConfidence: null,
        evidence: { enforced: true, ruleId: r.id, policyVersion: policy.version, sampleSize: r.sampleSize,
          originalChoice: answer?.choice ?? null, originalConfidence: answer?.confidence ?? null,
          originalEffortConfidence: answer?.effortConfidence ?? null } };
    } else if (willDelegate) {
      const r = choice.rule;
      task.handoff = { state: 'preparing', target: { cli: r.cli, model: r.model, effort: r.effort }, ruleId: r.id, at: now() };
      save(fileFor(taskKey), task); // Fence local execution before any external effect.
      try {
        const fn = handoff ?? (await import('./handoff.mjs')).handoffTask;
        const receipt = await fn({ cwd, taskId: task.id, target: task.handoff.target, execute: true, catalog: config.externalCatalog,
          packet: { ...taskContext, currentRequest: input.prompt, sourceCli: cli, stateFile: fileFor(taskKey), evidenceRule: r.id },
          checkpoint: task.checkpoint });
        task.handoff = { ...task.handoff, receipt, state: receipt?.delivery?.turnStarted ? 'delegated'
          : receipt?.delivery?.accepted ? 'accepted_unverified' : 'not_started' };
        save(fileFor(taskKey), task);
        if (!receipt?.delivery?.accepted) throw new Error(`Handoff did not accept the prompt (${receipt?.state ?? 'no receipt'})`);
      } catch (err) {
        if (['unsupported_target', 'catalog_stale', 'executor_unavailable', 'executor_gate_rejected', 'checkpoint_required', 'checkpoint_mismatch', 'invalid_packet', 'packet_too_large', 'not_git_repo'].includes(err.code)) {
          // These typed rejections precede terminal creation. Keep this request held,
          // but do not leave a permanent writer fence when no writer was launched.
          task.lastHandoffRejection = { ...task.handoff, error: err.message };
          delete task.handoff;
          save(fileFor(taskKey), task);
          throw new RoutingHoldError(`External preflight refused before launch: ${err.message}`);
        }
        task.handoff.error = err.message;
        save(fileFor(taskKey), task);
        throw new RoutingHoldError(`External handoff needs inspection; local execution held: ${err.message}`, task.handoff);
      }
      append('decisions.jsonl', { at: now(), taskId: task.id, cli, taskType: profile.taskType, handoff: task.handoff });
      const delivery = task.handoff.state === 'delegated' ? 'Delegated' : 'Prompt accepted; executor start unverified';
      throw new RoutingHoldError(`${delivery} to ${r.cli}/${r.model}; local execution held. See ${fileFor(taskKey)}`, task.handoff);
    } else if (!override && choice.avoid.some(r => r.model === (answer?.choice ?? input.current) && (r.effort === null || r.effort === (answer?.effort ?? input.currentEffort)))) {
      // Do not silently replace a known-bad choice with another unproven candidate.
      throw new RoutingHoldError('Selected model is excluded by validated task evidence; no compatible verified replacement is available');
    }
    if (answer) answer = { ...answer, taskContext, checkpoint: task.checkpoint ?? null };
    append('decisions.jsonl', { at: now(), taskId: task.id, cli, taskType: profile.taskType, proposedModel: answer?.choice ?? null,
      proposedEffort: answer?.effort ?? null, evidence: answer?.evidence ?? null, checkpoint: task.checkpoint?.commit ?? null });
    return answer;
  };
  return {
    assertLocal,
    assertModel,
    route(input) {
      const key = input.taskKey ?? 'default';
      const prior = inFlight.get(key) ?? Promise.resolve();
      const pending = prior.catch(() => {}).then(async () => {
        // More than one proxy process can serve the same conversation after a restart.
        mkdirSync(dirname(fileFor(key)), { recursive: true, mode: 0o700 });
        const release = acquireFileLock(`${fileFor(key)}.lock`, key);
        try { return await run(input); } finally { release(); }
      }).catch(error => {
        if (error.routingHold) throw error;
        throw new RoutingHoldError(`JEV task preflight failed: ${error.message}`);
      });
      inFlight.set(key, pending);
      pending.finally(() => { if (inFlight.get(key) === pending) inFlight.delete(key); }).catch(() => {});
      return pending;
    },
  };
}

export function sendRoutingHold(res, error) {
  if (!error?.routingHold) return false;
  res.writeHead(409, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ error: { type: 'jev_execution_held', code: 409, message: error.message, detail: error.detail } }));
  return true;
}
