# Result: task-aware routing and local activation

Status: implemented and verified, 2026-09-30. No remote push or package publication.

## Delivered

- `src/task-runtime.mjs` retains the original objective, bounded recent requests and user/QA failure reports in private per-conversation state. New-objective prefixes reset task context only before external ownership exists. Feedback imports into Analyzer as unverified evidence; it cannot silently become a success/failure label.
- Related context reaches the existing classifier through `routingContext`; it is bounded to 3,000 objective characters, two recent requests of 1,000 each and two failure excerpts of 500 each. Private session corpora are not sent wholesale.
- The reviewed policy module from issue 02 supplies exact CLI/model/effort preferences and exclusions. No supported rule means the original choice. Evidence overrides do not reuse JEV's confidence as if it described the new model: those fields become null and the original scores remain in the decision evidence.
- Complex mutations and task/tool complexity at least 0.65 checkpoint before task generation. Workspace resolution respects Codex `-C`/`--cd` and refuses unverifiable alternate workspaces for complex work. The snapshot implementation is issue 04.
- Cross-CLI handoff persists a local execution fence before launch. HTTP 409 holds cannot fall through to the adapters' transient-error recovery. Real start, accepted-only and unknown delivery are distinct. Locks prevent duplicate writers across processes. Known prelaunch rejection clears ownership without executing that request; ambiguous external starts remain fenced.
- Claude, Codex, Antigravity and GLM adapters enforce holds. Changing to a manual model does not bypass an existing handoff fence (Claude tool-free auxiliary requests are exempt). Final-model exclusion checks also cover generic policy retaining a previous model.
- `jev-maintain` exposes status, analysis/review/feedback/compile/report, checkpoint and handoff commands. Public package files include the tooling and contracts, not local transcripts, identifiers or feedback. Analyzer requires Node 22.13+; the existing core runtime requirement remains Node 20.12+.

## Verification

- `npm test`: **212 passed, 0 failed**, run with this installation's enabled runtime configuration. This includes 25 task-runtime regressions, 32 checkpoint/handoff tests, 20 Analyzer tests and all 135 original tests.
- The runtime suite includes real disposable Git snapshots preserving staged/working/untracked content, continuation/restart, failure deduplication, lock races, evidence expiry/conflicts/unknown effort, bounded classifier input, final-model rejection, launch failures and accepted-only handoffs.
- HTTP integration checks for all four adapters prove held requests never reach task-model upstreams. Three manual-selection checks prove an existing ownership fence cannot be bypassed.
- `jev-maintain status` reports enabled, checkpoint enabled, handoff enabled and no supported policy rules. `npm link --ignore-scripts --offline` exposes the local maintenance CLI.

## Activation and limits

Local configuration is `~/.config/jev-router/runtime.json` (mode 0600), pointing at `Analyzer/private/active-policy.json` and private state under `~/.local/state/jev-router`. It is read by new proxy processes; existing running sessions were not restarted. The active policy has zero rules and is separate from `proposed-policy.json`. External model/catalog lists are empty, so automatic cross-CLI selection is not yet eligible. This honestly preserves the cold-start choice while retaining task context and checkpoint protection.

These changes do not prove comparative model quality, cost or latency improvement. Seven task categories are a bootstrap taxonomy. Session identity depends on each upstream CLI's conversation key; ignored files, arbitrary shell commands outside the declared checkout and new manually selected native sessions are not universally protected. No automatic rollback or worktree creation is added. A handoff fence has no automatic settlement/reset: inspect completion or stopped-writer evidence and start a fresh conversation; do not delete state to retry blindly. See `docs/improvement-harness.md` for the complete limits and opt-out.

## Rollback

Set `JEV_RUNTIME_DISABLED=1` before starting a new proxy to disable the opt-in layer. First resolve any existing external writer; disabling routing is not permission to run a second writer in the same workspace. Preserve private evidence and recovery refs. Revert this issue's commit only after checking for newer overlapping changes; never reset the shared working tree.
