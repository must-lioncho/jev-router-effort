# Directive: skip unreadable paths in checkpoints; opt-in warn on failure

Single writer: jev-router-improver.

## Owned files

- `src/checkpoint.mjs`: `unreadablePaths(stderr)`; read `git status` stderr; retry `git add`
  excluding newly named unreadable paths; receipt `unreadable`; `Jev-Unreadable:` trailer.
- `src/task-runtime.mjs`: `checkpointOptions.onFailure` (`hold` default, `warn`);
  `checkpointWarning()`; hold message names the option.
- `src/proxy.mjs`, `src/codex-proxy.mjs`: append the warning to the per-turn note.
- `test/checkpoint.test.mjs`, `test/task-runtime.test.mjs`: regression tests.
- `docs/execution-safeguards.md`, `docs/improvement-harness.md`.
- `issue/2026-10-18-checkpoint-unreadable/{intend,directive,result}.md`

Not changed: `Intend.md`, routing policy, AGY/GLM notes.

## Checks

- Parser: sandbox, mode-000 and open() messages; ignores other errors.
- Injected git: fatal unreadable path -> one retry, checkpoint ok, path listed, user state
  unchanged; an add failure naming no path still throws `add_failed`.
- Mode-000 directory is listed in `unreadable`.
- Real `sandbox-exec` denial of a directory, a tracked file and an untracked file: checkpoint
  ok, tracked file keeps committed content, user HEAD/index/status unchanged.
- Runtime: default holds with a message naming `onFailure`; `warn` continues and the note
  carries "Checkpoint FAILED"; handoff still holds in `warn`.
- `npm test` passes.
