# Result: checkpoints survive unreadable paths

## Changed

- `src/checkpoint.mjs`: `unreadablePaths(stderr)` parses git's permission errors (status
  warnings, refresh lines, `error: open(...)`, `fatal: unable to stat`). Status stderr seeds the
  list; each failed `git add -A` that names new unreadable paths excludes them and retries (up to
  50 passes). Receipt gains `unreadable`, `excluded` entries ("unreadable here"), a warning, and
  the commit gains `Jev-Unreadable: N`. Coverage checks treat an unreadable directory as covering
  its contents. An add failure naming no new path is still `add_failed`.
- `src/task-runtime.mjs`: `checkpointOptions.onFailure` (`hold` default, `warn` for local
  execution only); the hold message names the option; `checkpointWarning()`.
- `src/proxy.mjs`, `src/codex-proxy.mjs`: per-turn note ends with
  `Checkpoint FAILED, no recovery point for this turn: <error>` in warn mode.
- `docs/execution-safeguards.md`, `docs/improvement-harness.md`.
- Tests: 5 in `test/checkpoint.test.mjs`, 2 in `test/task-runtime.test.mjs`.

## Checks

- Real `sandbox-exec` test (deny `plan/review/`, tracked `plan/confirmations.json`, untracked
  `plan/untracked.json`): checkpoint ok; tracked file keeps committed content; user HEAD, index
  and status byte-identical. Before this change the same setup reproduced
  `fatal: unable to stat ... Operation not permitted` (exit 128).
- `npm test`: 288/288 pass (281 before this issue + 7 new).

## Coverage and limitations

- Unreadable paths are not protected by the checkpoint. A sandbox that can read but not
  checkpoint a file is not covered by this case; the sandbox here denied reads to the session too.
- Hold stays the default per `Intend.md` item 5; the coordinator's request for warn-by-default
  is recorded in `intend.md` and needs an owner decision.
- AGY and GLM notes do not show the checkpoint warning.
- The coordinator's `.git/info/exclude` workaround in the target repo can be removed; it is
  outside this repo and was not touched.
- Running proxies keep the old code until their session restarts.
