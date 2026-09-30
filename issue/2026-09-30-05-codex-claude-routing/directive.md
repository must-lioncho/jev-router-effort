# Execution directive

Read CLAUDE.md, Intend.md, DIRECTIVE.md and this issue's intention.md. The coordinator supervises completion as requested by Lion; this is not an unsupervised final handoff.

## Ownership

Implementation sub-agent: the required native `claude --agent jev-router-improver --model claude-opus-5-5` was launched through Orca (term_78aa9eee-7917-4e70-b86a-be13a8c28c3a). Delivery was accepted and turn_started observed, but its first response was "You've hit your weekly limit" and no implementation began. A scoped Codex worker now owns implementation under the same issue lifecycle; this is a quota fallback, not evidence validating another maintenance-owner host/model. Sole writer for src/evidence-policy.mjs, src/task-runtime.mjs, src/codex-proxy.mjs, src/handoff.mjs (only if necessary), new narrowly scoped runtime helper modules, relevant test files, docs/improvement-harness.md and docs/execution-safeguards.md. No commits or local runtime activation. Record implementation and test evidence in implementation.md under this issue. Other agents share this checkout: preserve their edits; do not revert unrelated work.

Coordinator: owns issue intent/directive/result/drop documents, live smoke fixture/receipt, user runtime activation and scoped commit. Do not edit implementation files while the implementation worker owns them. Checkpoint already verified; pass its receipt and complete objective to worker. No new global agent definitions needed.

Independent QA sub-agent: read-only source/config reviewer, sole writer for qa-attempt-1.md or qa-attempt-2.md and 확인.md. Read the original acceptance contract, inspect the real implementation, run relevant tests, check live completion evidence and actual activated config. Never infer full acceptance from a green build. Report PASS only for 8/8 fully supported requirements; otherwise list missing requirements and concrete failures. Do not repair code or soften intent.

## Implementation

Add an opt-in evaluation preference with exact source CLI, task type, target CLI/model/effort and provenance/reason. Keep preference metadata distinct from validated outcome policy. Match actual evaluation stage without discarding original objective; maintain manual overrides and exact effort compatibility. Do not automatically rank other tasks/CLIs by family.

Codex handoff must transfer bounded local conversation context including assistant artifact/check results and relevant instruction constraints, while routing classification still gets only its existing compact task context. Evaluation executor is explicitly read-only; preserve standard model gate/checkpoint and single writer fence. Use existing handoffTask and its receipt/replay logic.

## Verification and two-attempt stop rule

Regression tests: Korean/English evaluation; implementation followed by evaluation; mixed implement-plus-review; no rule/cold start; invalid/stale availability; disabled handoff; manual model/effort; full packet context and read-only authority; duplicate/restart hold; HTTP Codex adapter blocks upstream on handoff. Run npm test once after implementation (repeat only for fixes).

Coordinator runs actual harmless Codex-runtime evaluation routed through handoffTask/Orca to native Claude, reads the final output and verifies its content. Refresh catalog from installed native tooling/sender gate, not fabricated quality outcomes. Activate only the scoped local preference authorized by Lion; preserve existing config and record backup/checks. Smoke must not transfer production implementation ownership.

QA attempt 1 after implementation, live verification and activation. If it fails, coordinator reverts only this issue's local activation fields to their recorded pre-activation values, sends its findings to the same implementation owner for one correction, repeats relevant checks/live checks where needed, then runs QA attempt 2. If QA 2 fails, write drop-report.md, leave rejected behavior inactive, retain evidence and stop. On acceptance, write result.md and make a single scoped local commit; no push.
