# Independent QA — attempt 1

Date: 2026-09-30. Verdict: **FAIL**. QA gate coverage: **5/8 requirements (62.5%)**. R1, R5 and R8 are unmet. Green regression tests do not establish complete user intent. R7's final verdict/result update and accepted commit are coordinator finalization after QA; they are pending, not a circular reason to reject the implementation before QA can finish.

QA owns this report and 확인.md only. No source fixes, native executor launches, configuration changes, paid account switches, commits, pushes or publishing were performed. The implementation worker froze its final noun refinement before this report. The reviewed implementation is not accepted for activation.

## R1–R8 acceptance matrix

| Requirement | Status at QA gate | Evidence and limitation |
| --- | --- | --- |
| R1: evaluation routing, current stage, mixed implementation remains local | FAIL | Basic KR/EN evaluation, implementation→review continuity, noun review and common mixed requests pass tests. Independent counterexamples below show four mixed Korean write/evaluation requests incorrectly delegate as read-only evaluation and fence local work. |
| R2: inspectable evidence/preference, exact eligibility, abstention and manual controls | PASS | src/evidence-policy.mjs separates selectRoutingPreference from supportedRule; task-runtime.mjs stores selection.kind. Focused tests cover source/provenance/model/effort/catalog expiry, cold start, disabled handoff, manual choice and supported avoid veto. docs/routing-policy.json has no issue diff. Catalog receipt contains actual native CLI and sender-gate checks, not fabricated outcomes. |
| R3: public Orca, same checkout, context/checkpoint and evaluation authority | PASS | Actual receipt command launches jev-claude-executor in this checkout. Private packet preserves fixture objective/current request/assistant/check output and explicit read-only constraints. Verified checkpoint ref resolves to recorded commit. Codex receiver context is removed before classifier arguments; textual packet overflow refuses and unavailable nontext is disclosed. Authority is an instruction contract, not an OS sandbox. |
| R4: prelaunch persistent fence, duplicates, delivery stages and handle | PASS | Source saves preparing fence before calling handoff. Runtime/handoff tests cover restart/concurrent/manual retry holds and no duplicate delivery. Actual task state remains delegated with terminal handle; receipt reports accepted and turnStarted separately, no completion claim. HTTP test observes 409 and zero upstream generation after handoff. |
| R5: actual native evaluation completion and fixture verification | FAIL | Real Codex-runtime→Orca→Claude delivery and turn start occurred. Independently inspected native session contains quota rejection (429/rate_limit), no arithmetic evaluation, no requested final result, zero model/tool execution and zero changed lines. There is no completed result to verify. |
| R6: sub-agent implementation, independent QA, maximum two attempts | PASS at current process gate | Required native maintenance owner was quota blocked; scoped Codex implementation sub-agent performed edits. This is independent QA attempt 1 against the unchanged acceptance contract. Only one correction and attempt 2 remain allowed. A second failure must produce drop-report.md and leave rejected behavior inactive. No attempt 2 was launched by QA. |
| R7: original documents, aliases, reports and scoped finalization | PASS at current process gate; finalization pending | intention.md/directive.md were created before implementation; intend.md and intended.md point to the single acceptance source. Coordinator created result.md with provisional status; this report creates 확인.md. Coordinator must still update the final result and only make an accepted scoped commit if QA reaches 100%; failure must be reported without an accepted commit. Unrelated file hashes match pre-work evidence. |
| R8: accepted local configuration activation | FAIL | Direct inspection of /Users/lioncho/.config/jev-router/runtime.json finds externalModels:[], externalCatalog:{}, no routingPreferences. Coordinator deliberately did not activate because live completion failed. New processes cannot exercise this preference from that config; existing processes would require restart after eventual activation. |

## D1 — mixed Korean requests lose requested mutation

Location: src/evidence-policy.mjs, isEvaluationRequest, lines 6–12; consequent delegation in src/task-runtime.mjs.

With a valid fixture preference/catalog, each request below returns isEvaluationRequest=true and taskProfile={taskType:"evaluation",mutating:false}. Independent createTaskRuntime checks use injected checkpoint/handoff dependencies (no native launch) and confirm **four handoff calls**, packet authority="read-only", and RoutingHoldError holding local execution:

| Current request | Requested mutation missed by veto |
| --- | --- |
| QA 후 배포해줘 | Deployment after QA |
| 코드 검토하고 커밋해줘 | Commit after review |
| 리뷰하고 파일을 지워줘 | File deletion after review |
| 코드를 리팩터링하고 평가해줘 | Refactoring followed by evaluation |

This is a routing/authority defect, not a stylistic objection: the executor receives the whole mixed request under no-write authority while Codex is fenced, so authorized implementation cannot proceed. The English mutation veto covers deploy/commit/remove/refactor, but the Korean veto omits their ordinary Korean equivalents. R1 expressly requires mixed implementation requests to remain local. Extend conservative mixed-request detection and add direct classification plus runtime no-handoff regressions, retaining artifact-noun and negated-mutation evaluation support. Implementation ownership stays with the implementation worker.

Private reproduction state was written only to a system-created temporary QA directory; it is not committed or published. Source code was not edited.

## Live evidence checked independently

- .git/jev/handoffs/e8e66126-736f-4923-970e-c7fd74082801/receipt.json: command `claude --agent jev-claude-executor --model claude-sonnet-5-5`, same checkout, target default effort, actual sender accepted, stages input_accepted/turn_started, usable terminal handle.
- Matching packet.md: arithmetic fixture, whole original objective/current request, receiver-only assistant/check context, explicit read-only evaluation authority.
- .git/jev/live-codex-claude/qa-attempt-1/runtime-result.json and task state: delegation persists; accepted/start are not completion.
- Orca skill guide was read from the installed CLI before read-only terminal checks. `terminal show` now reports orphaned:true, connected:false, writable:false, exitCause operator_close; `terminal read` reports exited and an empty stream. This current observation does not rewrite the coordinator's earlier terminal_stop_unverifiable error as a successful close at that earlier time.
- The corresponding local native session was located from the retained terminal resume metadata and inspected without copying its private transcript or session identifier into Git. Model attachment names exact claude-sonnet-5-5. Assistant error is `You've hit your weekly limit · resets Oct 1 at 7:30pm (Asia/Calcutta)`, apiErrorStatus 429, error rate_limit. Session error metadata records perTurnEffort="medium": launch requested CLI default; the session records medium; no successful model inference occurred. Cost/tool/modified-line totals are zero and the only assistant result is the quota refusal. No JEV_CLAUDE_SMOKE_PASS completion exists.
- Runtime config remains inactive, as described under R8.

## Verification and review boundary

- Independent focused run: `node --test test/evaluation-routing.test.mjs test/task-runtime.test.mjs test/handoff.test.mjs`, exit 0, **67/67 passed**, zero failed/skipped/cancelled, ~6.71 seconds. Includes real local HTTP adapter integration with injected external execution and zero upstream generation after delegation.
- Implementation worker's final recorded `npm test`: exit 0, **237/237 passed**, zero failed/skipped/cancelled, ~9.47 seconds after noun refinement. QA did not repeat this complete suite without a new source change; it independently ran the focused suite and additional counterexamples.
- Independent `git diff --check`: exit 0.
- Initial checkpoint ref independently resolves to e13f954ccae47f4ed702755ce736020d19360983. Live checkpoint ref independently resolves to 77d2c9eadbc2138cc1296f281c9ca9e6620736de.
- Unrelated english_voice_tutor.html and server.mjs SHA-256 values match execution-evidence.md; no change by QA.
- Reviewed src/evidence-policy.mjs SHA-256: 0a71a8d558cac846288800a4129e8d3bb067a02ba067019dc228f19eaa28c34e. Reviewed test/evaluation-routing.test.mjs SHA-256: 44bad7f03be739b28507928eab39bf54aac1163b40109a3dc2892a2521cdf3bf.

## Required next step

Coordinator may dispatch one correction for D1 and one independent QA attempt 2. R5 still requires actual completed native evaluation; a quota refusal cannot be converted into a pass by mocked results or catalog checks. R8 requires accepted actual activation and remains incomplete while config is empty. If attempt 2 cannot satisfy all R1–R8, stop, retain both reports, write drop-report.md and do not activate rejected behavior. Result/commit finalization follows that verdict. The current code has meaningful working paths and green existing tests, but has a demonstrated routing defect and does not complete the requested feature.
