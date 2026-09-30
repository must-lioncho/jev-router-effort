# Drop report — two attempts exhausted

Date: 2026-09-30. Final status: **DROPPED / not accepted / automatic Codex→Claude evaluation preference inactive**. The acceptance contract was not changed to obtain a pass. No third correction, live evaluation or QA attempt will be performed under this issue.

| Stage | Result | Intent coverage |
| --- | --- | --- |
| QA attempt 1 | FAIL: R1 Korean mixed-request classification, R5 native completion, R8 activation | 5/8, 62.5% |
| Sole correction | D1 repaired; 17 mixed forms retain local execution, 12 noun/negated controls retain evaluation | Final npm test 240/240 pass |
| QA attempt 2 | FAIL: R5 native completion and R8 activation still unmet | 6/8, 75% |

## Why the accepted feature was dropped

Both real live evaluations routed through the Codex task runtime, actual checkpoint and Orca to the installed native Claude Sonnet 5.5 executor. Both were accepted and an execution start was observed. Both native sessions responded only with a weekly usage-limit rejection (rate_limit/HTTP 429), without the required fixture evaluation result. Native launch requested default effort; session metadata recorded medium. No successful model inference/tool execution occurred. Delivery and start are proven; actual evaluation completion is not.

The local runtime preference/catalog fields were deliberately not activated because native completion and 100% acceptance were not achieved. The existing runtime configuration is preserved: externalModels:[], externalCatalog:{}, no routingPreferences. Thus R5 and R8 are not fulfilled. The failure is not reclassified as success because tests or catalog checks pass. No paid-credit switch, account swap or quota reset was attempted.

## Retained work and evidence

The scoped source/tests/documentation remain as an **uncommitted review draft**, with no accepted implementation commit or publishing. Implemented paths cover evaluation-stage detection, exact user-preference selection independent of performance evidence, private assistant/check/constraint transfer, read-only receiver authority and persisted local holds. Tests pass, including actual local HTTP adapter checks that prevent local upstream execution after delegation. This does not establish comparative Claude quality.

The installed jev-codex is linked to this checkout. Draft code may be read by new local CLI processes; the rejected automatic cross-CLI preference remains inactive because no candidate/catalog/preference was installed and no supported evaluation rule was promoted. Existing running processes were not restarted or reconfigured.

Retained reports: intention.md, directive.md, intend.md/intended.md references, implementation.md, qa-attempt-1.md, qa-attempt-2.md, 확인.md, live-attempt-1.md, live-attempt-2.md, execution-evidence.md and result.md. Private receipts/packets remain in .git/jev/; raw native transcripts and private Analyzer evidence are not committed or published.

Checkpoint references are preserved, including the initial working/index snapshot and correction/live snapshots. No shared-workspace rollback or destructive restore was run. english_voice_tutor.html and server.mjs hashes match their pre-work values; the original staging remains unchanged. Ignored paths were never covered by checkpoints, as recorded in receipts.

All three created Claude terminals initially returned terminal_stop_unverifiable on close. Later read-only show checks reported orphaned, disconnected, not writable and operator_close; independent QA confirmed both live evaluation terminals exited. The earlier error receipts are retained honestly. No further input or alternate-host stop retry was sent.

## Boundary for any future resumption

A new authorized attempt would need available native Claude quota, a freshly checked exact model/effort catalog, a completed real evaluation result and independent acceptance before local activation/commit. This issue does not schedule or start that work. The maximum two requested QA attempts have ended.
