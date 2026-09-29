# Result: execution safeguards

Status: module implementation and regression verification complete. Final installed-agent
deployment/integration is recorded separately in issue 01. Earlier verification runs below
are retained as history; the final module verification is the coordinator section.

## Delivered

- `src/checkpoint.mjs`: `ensureCheckpoint({cwd, taskId, reason, sensitive, acknowledgeUncovered,
  maxFileBytes, git, now})` and `CheckpointError`. It builds a stash-shaped local commit in
  temporary index files, creates `refs/jev/checkpoints/<task>/<stamp>-<oid>` with a create-only
  `update-ref` and verifies it. A lock per repository prevents interleaved snapshots, and a
  double `git add -A` pass plus `HEAD`/index digests detect concurrent writers. It refuses
  nested repositories, dirty submodules, credential-looking files, oversized files,
  assume-unchanged entries and conflicts unless the caller chooses explicitly. A snapshot is
  reused only when `HEAD`, the staged tree and the working tree are identical.
- `src/handoff.mjs`: `handoffTask({cwd, taskId, target, catalog, packet, checkpoint, execute,
  orca, git, readinessTimeoutMs, submitWaitSeconds, maxPacketBytes, now})` and `HandoffError`.
  It runs `worktree show` for the exact existing path, then `terminal create` of the native
  `claude`/`codex` argv, `terminal wait --for tui-idle` (at most 60 s, once more on failure)
  and `terminal send --wait-submit`. `--retry-request` replays only an ambiguous send that has
  an Orca request id. Per-task lock, atomic receipt and packet live under
  `.git/jev/handoffs/<task>/`. Target validation requires an exact catalog entry with efforts,
  cited evidence and `checkedAt` no older than 24 h. `ok` means Orca observed `turn_started`;
  `completion` stays `unknown`.
- Coordinator follow-ups applied: the renderer preserves the full runtime packet from
  `src/task-runtime.mjs` (`currentRequest`, `recentRequests`, `{text, source}` failures,
  profile, `sourceCli`, `stateFile`, `evidenceRule`, unknown fields). It trims only older
  history and never the objective or current request. `checkedAt` is required, and the receipt
  records catalog evidence.
- `docs/execution-safeguards.md`: contract, refusal codes, receipt states, limits and manual
  recovery.

## Verification

- `node --test test/checkpoint.test.mjs test/handoff.test.mjs`: 26/26 pass. Checkpoint tests
  use disposable repositories under the OS temp dir and cover dirty, staged, deleted,
  untracked and ignored files, byte-identical `HEAD`/index/status, reuse rules, unborn repos,
  secrets, nested repos, dirty submodules, assume-unchanged, conflicts, size limits, locks,
  stale locks and a racing writer. Handoff tests use a scripted Orca and cover the happy path,
  duplicates, readiness failure and resume, unproven turns, ambiguous sends with and without
  request ids, create ambiguity, workspace mismatch, catalog, freshness, checkpoint and packet
  rejection, packet refresh before send, concurrent writers and shell quoting.
- `npm test`: 177/177 pass (includes other workers' current files).
- Live smoke (approved by the coordinator as option B), 2026-09-29T21:37Z (03:07 IST), in this checkout:
  - Checkpoint `56b8e42a0ba06d49822631f6a60d22c256c60388` at
    `refs/jev/checkpoints/smoke-20260930-a/20260929T213751620Z-56b8e42a0ba0` covered 50 changed
    paths, with 4 ignored paths reported as unprotected.
  - The handoff ran `claude --model claude-haiku-4-5-20251001` (effort `null`, because the repo
    documents Haiku as not supporting effort) in terminal
    `term_f31e1288-784f-4610-bada-4cca7509f009`. Stages were
    `input_accepted → turn_started` (request `f255f886-74d6-4624-b6e6-999b22d05c0c`).
  - A separate `tui-idle` wait was satisfied. The screen showed the executor reading 2 files
    and replying `JEV_SMOKE_OK`. `package.json` is unchanged against the checkpoint.
  - `terminal close` returned `terminal_stop_unverifiable`. The terminal then left
    `terminal list`, and `ps` showed no remaining executor process.
  - Left in place for the coordinator to keep or remove: the smoke ref above and
    `.git/jev/handoffs/smoke-20260930-a/`.

## Follow-up (task_1733097910b5): parent review fixes

- Staged content is now screened. Credential-looking and oversized checks cover paths whose
  index entry differs from `HEAD`, not only working files, so a `.env` staged then deleted from
  disk is refused. With `sensitive: "exclude"` or an acknowledged oversized path, the entry is
  reset to its `HEAD` version (or removed) in both temporary indexes. It no longer reaches the
  index commit or the working-tree commit, and the user's index is untouched.
- Skip-worktree entries whose file on disk differs from the index (`git hash-object` against
  the index oid) refuse with `skip_worktree_modified` unless acknowledged. Absent files (sparse
  checkout) and unchanged ones pass.
- Executor integration with the agent worker's global definitions (message sent to
  `term_25fb0a3c…`; no reply before completion):
  - Claude launches `claude --agent jev-claude-executor --model M [--effort E]`.
  - Codex keeps its native argv, because it has no agent flag. The prompt and packet name
    `jev-codex-executor` and `~/.codex/skills/jev-router-improvement/references/execution.md`.
  - Missing definitions refuse with `executor_unavailable` before any Orca call.
  - The packet carries the exact `check_target.py` command.
  - The packet's Reporting section states there is no dispatch and no `worker_done`: the
    executor ends with a terminal report instead.
  - The catalog gate in `handoffTask` stays the launch authority.
- New regressions:
  - checkpoint: staged secret deleted from disk; tracked secret excluded to its `HEAD` version;
    staged-only oversized blob; skip-worktree edited, acknowledged, absent and unchanged.
  - handoff: Claude `--agent` argv, the Codex procedure in the packet, `executor_unavailable`
    for both CLIs.
  - The handoff tests use a disposable executor home, so they no longer depend on the real `~`.
- Verification: `node --test test/checkpoint.test.mjs test/handoff.test.mjs` passes 31/31.
  `npm test` gives 196/200. The 4 failures are all in `test/analyzer.test.mjs` (collect,
  policy compile, CLI cold start, CLI end to end). That file and `Analyzer/` belong to another
  worker, are mid-edit, and do not import these modules.
- Smoke limitation: the live smoke above ran before the executor change, so it launched plain
  `claude` without `--agent`. A live run of `claude --agent jev-claude-executor` and of the
  Codex procedure prompt through Orca has not been done in this follow-up.

## Limits and open points

- Ignored files are not protected. Sensitive detection checks file names only.
  `include-local` secrets would leave with `git push --mirror`.
- The executor may stop at its own permission prompts. The receipt then stays
  `accepted_unverified`. The coordinator changed `src/task-runtime.mjs` so only
  `delivery.turnStarted` counts as delegated. An accepted-only prompt stays fenced as unverified.
- `catalog[cli].models[model]` must be populated by the caller with dated evidence. This module
  does not discover models.
- Source edits used the Write/Edit tools. `apply_patch` is not available in this Claude Code
  session.

## Coordinator final verification (2026-09-30)

- Added `checkExecutorTarget`: before any Orca call or handoff receipt is written, execute
  the installed Python checker with `--sender` and require both exit 0 and JSON
  `accepted: true`. An unsupported target, checker failure or missing affirmative result
  throws `executor_gate_rejected`. A regression proves zero Orca calls and no receipt after
  rejection. This boundary is code outside the task model, not a prose instruction.
- Both the sender check and executor packet pass `--router` as the installed JEV package
  root derived from `import.meta.url`, not the target workspace. Other projects do not
  contain the router's model configuration.
- Codex launches with `--no-daemon` to avoid long Orca account-home daemon socket paths.
  Claude uses the named executor. Neither uses the JEV wrapper to reroute the requested
  exact model. Final model support still requires the current dated catalog.
- Final checkpoint/handoff tests: **32/32 passed** (15 checkpoint, 17 handoff).
  Final full repository tests: **212/212 passed**. The earlier transient Analyzer failures
  are resolved. `git diff --check` passes.
- The live Orca smoke recorded above proved checkpoint → native terminal → accepted →
  observed start → `JEV_SMOKE_OK`; it preceded named-agent/sender-gate integration and must
  not be presented as a final named-executor smoke. Issue 01 owns that final deployment
  check. No dangerous reset/clean was replayed.
- Preserve the live smoke checkpoint and handoff receipts for recovery. The cleanup API
  returned uncertainty even though the terminal disappeared and its process was absent;
  no broad terminal close was used.

The implementation is safe to install before issue 01 finishes: an unavailable or older
checker rejects execution. The locally active task policy and external catalog are empty,
so this release does not authorize automatic cross-CLI launches.
