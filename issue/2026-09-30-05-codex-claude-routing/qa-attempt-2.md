# Independent QA — final attempt 2

Date: 2026-09-30. Verdict: **FAIL**. Final QA gate coverage: **6/8 requirements (75%)**. R1's demonstrated routing defect is corrected. **R5 actual completed native evaluation and R8 local activation remain unmet.** The original R1–R8 acceptance contract is unchanged; this is not 100% user-intent completion.

Both permitted QA attempts and the single correction are now exhausted. Stop implementation/live/QA retries under this issue. Coordinator must write drop-report.md and update result.md, preserve both reports and leave rejected behavior inactive. No accepted scoped implementation commit is authorized by this verdict. R6/R7 process finalization follows this verdict rather than being a circular prerequisite for issuing it.

QA modified only this report and 확인.md. Source/config remained unchanged; no native launch, prompt send, account or paid-usage change, commit, push, publishing or scheduling occurred.

## Final R1–R8 matrix and comparison

| Requirement | QA 1 | QA 2 | Final evidence |
| --- | --- | --- | --- |
| R1: evaluation/current stage; mixed implementation stays local | FAIL | PASS | Sole correction introduces shared Korean action/negation matching. All four independent QA 1 counterexamples now classify non-evaluation and mutating. Direct and runtime regressions cover 17 mixed forms with zero handoffs/no local fence and 12 noun/negated forms that still hand off read-only. Original KR/EN, objective-continuation/restart and English noun/mixed controls pass. |
| R2: distinct preference/evidence; exact eligibility and abstention/manual behavior | PASS | PASS | Existing selection schema unchanged; focused tests pass source/provenance/exact model/effort, missing/stale/uncited availability, cold-start, disabled handoff, manual choices, separate outcome evidence and supported avoid veto. Actual second receipt records fresh CLI/gate evidence and user-preference, not manufactured successful samples. |
| R3: same-checkout public Orca; whole context/checkpoint/read-only authority | PASS | PASS | Second real receipt/packet preserve fixture objective/current request/private assistant/check context and explicit read-only constraints. Checkpoint ref independently resolves to recorded commit. Context-removal/overflow/nontext disclosure tests pass. Receiver authority is an instruction contract, not an OS sandbox. |
| R4: durable prelaunch fence, duplicates, stage/handle semantics | PASS | PASS | Actual second runtime state remains delegated/held with terminal handle and completion unknown. Receipt separately proves input acceptance and observed turn start. HTTP no-upstream/manual-retry and restart/concurrency/receipt tests pass. Second smoke uses a distinct task; first fence was not deleted or blindly replayed. |
| R5: completed actual native evaluation verified against fixture | FAIL | FAIL | Native Claude again responds only with weekly quota rejection (429/rate_limit). No requested arithmetic final result exists. Catalog/acceptance/start and mocked tests cannot satisfy completion. |
| R6: sub-agent implementation, independent QA, maximum two attempts | PASS at process gate | PASS at final process gate | Independent QA 1 → one same-writer correction → independent QA 2 occurred. No softened acceptance or third attempt. This verdict exhausts the budget and instructs drop/inactive finalization. Coordinator's actual drop report follows the verdict. |
| R7: original intent/directive/aliases, reports and scoped finalization guard | PASS at process gate | PASS at final process gate | Original documents/aliases persist; qa-attempt-1.md retained unchanged; current report and appended 확인.md provide final coverage. Provisional result.md exists, final result/drop update remains coordinator-owned. Accepted scoped commit remains guarded and must not be made on this failure. Unrelated file hashes remain unchanged. |
| R8: activate accepted local preference with checked catalog | FAIL | FAIL | Actual local runtime configuration still has externalModels:[], externalCatalog:{}, no routingPreferences. Safe nonactivation preserves existing config but does not fulfill requested activation. New processes cannot load this preference; existing processes have not been reconfigured. |

## Correction and independent checks

The correction is limited to src/evidence-policy.mjs and focused tests, as documented in implementation.md. Independent direct checks confirm:

- `QA 후 배포해줘`: evaluation=false, mutating=true.
- `코드 검토하고 커밋해줘`: evaluation=false, mutating=true.
- `리뷰하고 파일을 지워줘`: evaluation=false, mutating=true.
- `코드를 리팩터링하고 평가해줘`: evaluation=false, mutating=true.
- Nearby `코드 검토하고 커밋도 해줘` and `QA 후 배포를 진행해줘` remain non-evaluation/mutating.
- `커밋을 검토해`, `파일을 지우지 말고 리뷰해` and `Review the fix` remain read-only evaluation; `Review and fix the code` remains local/mutating.

The focused suite independently exercises all 17 corrected mixed requests with a valid preference/catalog at runtime: zero handoff calls, compatible Codex recommendation returned, no persistent local fence. Its 12 noun/negated controls still delegate under read-only authority. D1 is resolved within the reviewed regression scope. No new source repair was attempted by QA.

- Independent `node --test test/evaluation-routing.test.mjs test/task-runtime.test.mjs test/handoff.test.mjs`: exit 0, **70/70 passed**, zero failed/skipped/cancelled, ~6.26 seconds.
- Worker's final recorded `npm test`: exit 0, **240/240 passed**, zero failed/skipped/cancelled, ~9.44 seconds. QA ran focused checks and targeted independent controls rather than unnecessarily repeating the full unchanged suite.
- Independent `git diff --check`: exit 0.
- Final src/evidence-policy.mjs SHA-256 independently matches frozen source: ef7a9cf1fd31581121b9da9cdb8b0c10d1e4904075ec776a0e6b4a23529127a0.
- english_voice_tutor.html and server.mjs SHA-256 values still match pre-work execution-evidence.md.

## Actual second native result and activation

Independently read .git/jev/live-codex-claude/qa-attempt-2/runtime-result.json plus .git/jev/handoffs/11e317d6-11c9-4226-82c4-2bc863b832bd/receipt.json and packet.md. Launch command is `claude --agent jev-claude-executor --model claude-sonnet-5-5` in this checkout, sender gate accepted CLI default effort, fresh catalog checked at 2026-09-30T10:56:34.904Z. Receipt reports accepted=true and turnStarted=true. Checkpoint ref independently resolves to 3e48c209f031b928c6055ab1da9bebfecadde72b. Packet contains the arithmetic fixture and explicit no-write authority; module completion remains unknown.

Read-only Orca terminal show/read now report orphaned=true, connected=false, writable=false, operator_close, and exited with empty stream. This later observation does not convert the coordinator's earlier terminal_stop_unverifiable response into an earlier confirmed close. No prompt was sent.

From retained resume metadata, QA inspected the corresponding private local native session without copying its path, session identifier or transcript into Git. Model attachment names exact claude-sonnet-5-5. There is exactly one assistant record, a synthetic API error: `You've hit your weekly limit · resets Oct 1 at 7:30pm (Asia/Calcutta)`, error rate_limit, HTTP 429, quota status rejected. Launch used default effort; session error metadata records perTurnEffort="medium". There is no successful model inference or arithmetic completion. Tool duration/modified-line totals are zero; modelUsage is empty. This independently supports the failed R5 result.

Directly read /Users/lioncho/.config/jev-router/runtime.json: enabled/checkpoint/handoff remain true, candidates/catalog empty and preference absent. R8 remains incomplete. No account, quota reset or paid-credit action was used to bypass the failure.

## Final action

**Drop this issue's acceptance attempt now.** Preserve the opt-in code and evidence for review without activating it, retain both failed QA reports, and write the coordinator-owned drop/final result. Do not execute a third correction, live test or QA attempt and do not claim 100% acceptance or measured Claude superiority. Source regression validity improved, but actual completed evaluation and usable activated routing were not delivered.
