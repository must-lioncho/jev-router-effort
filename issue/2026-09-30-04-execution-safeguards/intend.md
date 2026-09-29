# Execution safeguards: preflight checkpoint and Orca handoff

Date: 2026-09-30. Parent contract: root `intend.md` items 4 and 5, `directive.md` item 3
("Execution").

## Intent

The Condition Mate Publisher incident ran `git reset --hard HEAD && git clean -fd` and deleted
existing work. Lion chose a Git checkpoint commit before complex work instead of automatic
worktrees. The router also needs a way to hand a task to a real Claude Code or Codex executor
through Orca when local candidates are unsuitable, with one writer per task and without claiming
success from a send receipt.

## Scope

- `ensureCheckpoint({cwd, taskId, reason})`: a real local commit under `refs/jev/checkpoints/*`
  covering tracked and non-ignored untracked work, built with a temporary index so `HEAD`, the
  user's index and working files stay untouched. Anything it cannot cover (nested repositories,
  dirty submodules, credential-looking files, oversized files, assume-unchanged entries,
  conflicts, concurrent writers) fails before execution unless the caller chooses explicitly.
  Reuse only a snapshot proven identical, never by task id alone.
- `handoffTask({cwd, taskId, target, catalog, packet, checkpoint, execute})`: public Orca CLI
  commands only, in the existing Orca workspace, with readiness waits of at most 60 seconds,
  `turn_started` verification, durable per-task receipts and lock, and no re-send of an
  ambiguous prompt. Targets must be listed in a caller-supplied, evidence-cited catalog.
- Tests on disposable Git repositories and a mocked Orca CLI; `docs/execution-safeguards.md`.

## Out of scope

Wiring these APIs into the router runtime (`src/task-runtime.mjs`, coordinator-owned), the
executor agent definitions, automatic rollback, worktree creation, commits to this repository,
and a live executor launch without the coordinator's go-ahead.
