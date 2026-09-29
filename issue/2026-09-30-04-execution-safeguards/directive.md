# Directive: execution safeguards

Owner: execution worker (Orca task `task_d0306c4eeeea`). Owned paths only: `src/checkpoint.mjs`,
`src/handoff.mjs`, `test/checkpoint.test.mjs`, `test/handoff.test.mjs`,
`docs/execution-safeguards.md`, this issue folder. No commits; the coordinator commits.

1. Read root `intend.md`, `directive.md`, `CLAUDE.md` and the version-matched Orca guide
   (`orca skills get orca-cli`, Orca 1.4.210). Confirm command result shapes from the installed
   CLI (`terminal create` → `result.terminal.handle`, `terminal wait` → `result.wait.satisfied`,
   `terminal send` → `result.send.{accepted, prompt.{requestId, stages}}`, errors →
   `{ok:false, error:{code, message, data.orchestrationRequestId}}`).
2. Checkpoint: temporary `GIT_INDEX_FILE` seeded from a copy of the user's index; `git add -A`
   twice to detect concurrent edits; stash-shaped `commit-tree` (working tree, `HEAD`, staged
   index); create-only `update-ref`; verify the ref and the tree's coverage. Refuse uncovered
   hazards with `CheckpointError` codes and remedies. Lock per repository.
3. Handoff: validate target against the catalog, checkpoint ref and bounded packet before any
   side effect; `worktree show` exact path; `terminal create --command` with POSIX-quoted argv;
   `terminal wait --for tui-idle` ≤ 60 s, once more on failure; `terminal send --wait-submit`;
   replay only with `--retry-request`. Receipt and packet under `<git-common-dir>/jev/handoffs/`.
4. Tests: real disposable repositories under the OS temp dir for every checkpoint path; mocked
   Orca for handoff states, duplicates, ambiguity, locking, catalog and checkpoint rejection.
5. Run `node --test test/checkpoint.test.mjs test/handoff.test.mjs` and `npm test`. A live
   executor smoke runs only when the coordinator approves it.
