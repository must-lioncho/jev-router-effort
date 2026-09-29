# Improvement owner and Claude/Codex executors

Date: 2026-09-30. Parent contract: root `intend.md` (item 1 of `directive.md`, "Harness and agents").

## Intent

Lion wants one discoverable owner for JEV Router routing quality and two executors that can take
a bounded task in another CLI. The owner receives a user or QA failure report, analyzes evidence,
opens a dated issue, changes criteria/policy, code and tests, and makes one scoped commit per
issue. The executors run exactly one Orca handoff packet each, validate the requested model and
effort instead of inventing one, verify the checkpoint before complex work, and remain the only
writer of their owned files.

## Scope

- Global agents `jev-router-improver`, `jev-claude-executor`, `jev-codex-executor` and the
  maintained harness skill `jev-router-improvement`, created in the configured AIOS development
  repository through agent-factory `scaffold.py --source-root <dev>/sources`.
- Instruction bodies and descriptions at most 200 characters; detailed procedure in the skill's
  references, which point at this repository's contracts rather than restating them.
- Independent hash-bound review (`gate.py review`) before a scoped deployment of only these
  additions; discoverability through the Claude, Codex and Antigravity adapters after sync.
- Behavioral evidence from harmless local scratch repositories.

## Out of scope

Router `src/`, root documents, other AIOS definitions, a full AIOS package or release, publishing,
pushes and scheduled jobs. Models are inherited; no model id is invented.

## Evidence

- Incident and lifecycle requirements: root `intend.md`.
- Agent build contract: AIOS `sources/skills/agent-factory/SKILL.md` (Compact builds),
  `sources/skills/agent-build-review/references/review.md`, `docs/development-release.md`.
- Shared runtime interfaces announced by the coordinator on 2026-09-30:
  `ensureCheckpoint({cwd, taskId, reason})`, `handoffTask({cwd, taskId, target, packet, checkpoint})`,
  `src/task-runtime.mjs`, `src/evidence-policy.mjs`.
