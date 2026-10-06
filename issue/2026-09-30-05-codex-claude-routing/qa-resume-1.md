# Independent resumed QA — round 1

Date: 2026-09-30. Verdict: **PASS — 8/8 (100%) at the acceptance gate.** The explicitly authorized resumption is recorded in resume-directive.md. The original acceptance contract is unchanged. Original failed QA/live reports and historical drop-report.md remain historical failures; this pass does not rewrite them.

The two previously unmet requirements are now supported by direct independent evidence: **R5 completed native Claude evaluation** and **R8 actual local activation**. Acceptance authorizes coordinator finalization: final result/verification update and scoped commit, followed by the user's separately requested merge/remote push. This QA does not claim those Git release actions already happened.

QA wrote only qa-resume-1.md and appended its verification matrix to 확인.md. No source/config changes, prompts/native launches, account changes, commits or remote writes were performed. Other writers' edits and unrelated files were preserved.

## Same R1–R8 matrix

| Requirement | Historical final QA | Resumed QA 1 | Evidence |
| --- | --- | --- | --- |
| R1 evaluation/current stage; mixed implementation stays local | PASS | PASS | Source/test hashes are unchanged from final QA 2. Prior independent 70/70 focused checks covered basic KR/EN, continuation/restart, 17 mixed Korean forms with zero handoffs and 12 artifact/negated controls with read-only handoffs; original D1 remains corrected. |
| R2 inspectable preference/evidence; exact eligibility and fallback/manual choices | PASS | PASS | Selection remains user-preference with provenance, not fabricated quality samples. Actual activated target is exactly claude-sonnet-5-5/default (effort:null), sourceCli:codex, taskType:evaluation. Independent validateTarget accepts the fresh actual catalog; preference selection succeeds with an empty outcome policy. Manual effort selection independently abstains. Prior cold-start/stale/missing/disabled/manual regressions remain unchanged. |
| R3 public Orca/same checkout; full context/checkpoint/read-only authority | PASS | PASS | Read actual resumed receipt and private packet; exact native launch/same checkout/checkpoint, original arithmetic objective/current request, private assistant/check context and explicit no-edit/no-commit authority are present. Checkpoint ref independently resolves to recorded commit. Private packet remains under .git, not committed. Prior context/classification/overflow tests remain valid. |
| R4 durable fence/duplicates; acceptance/start/completion and handle | PASS | PASS | Resumed task state is delegated/held with a usable terminal. Receipt separately reports input_accepted and turn_started, completion:unknown. QA reads the completed native output separately. Older task fences and receipts were retained, and resumption uses a fresh bounded task. Prior duplicate/restart/concurrency/no-upstream HTTP tests remain valid. |
| R5 actual completed native evaluation verified against fixture | FAIL | PASS | Independently read actual native terminal output: completed arithmetic evaluation, receiver target gate exit 0, no file changes, and exact final JEV_CLAUDE_SMOKE_PASS marker. Parsed values match 2+2=4 and 7*6=42. This is completed output, not an accepted-send inference. |
| R6 sub-agent implementation/independent QA/two-attempt governance | PASS at original process gate | PASS | Original implementation sub-agent and QA 1→single correction→QA 2 failures were retained; historical drop/stop were performed. User explicitly authorized resumption after resetting quota, with up to two new QA rounds. This is resumed round 1 and passes; no second resumed correction/QA is needed. Same intent, no softened requirements. |
| R7 original docs/aliases/reports and scoped commit/finalization | PASS at process gate | PASS at acceptance gate; coordinator finalization pending | intention/directive precede implementation; intend/intended aliases preserve single contract. Historical reports/drop remain; this report and appended 확인.md establish current 100%. Coordinator final result/scoped commit follows this pass; latest user authorization separately covers merge and push. Those actions are not already-completed QA evidence. |
| R8 actually activate scoped local preference, preserve config and explain reload | FAIL | PASS | Directly read actual ~/.config/jev-router/runtime.json and private preactivation backup. Independent equality assertions prove every old field except the three scoped routing fields is preserved. A new Node process loads actual config, validates fresh catalog and selects the exact preference. live-resume-1.md explains new processes load it, existing processes were not reconfigured, and catalog expires after 24h. |

## Completed native result checked independently

Read-only Orca terminal show/read for the resumed handle shows the native executor idle after completion. Banner identifies Claude Code 2.1.285/Sonnet 5.5/jev-claude-executor. The actual response confirms both arithmetic expressions, receiving check_target.py exit 0 with accepted:true and exact model, no files/commits/messages changed, no unresolved work, and this final line:

`JEV_CLAUDE_SMOKE_PASS {"sum":4,"product":42,"readOnly":true}`

The evaluator accurately identifies the packet's earlier arithmetic-check exit 0 as transferred context, not a test it newly ran. QA independently compares the actual final values against fixture arithmetic. Default effort is requested and receiving gate returns effort:null; an internal numerical reasoning effort is not inferred from the banner. This harmless fixture demonstrates the requested handoff path, not statistical Claude superiority or a native Codex TUI/external TypeSafe benchmark.

Evidence inspected: .git/jev/live-codex-claude/resume-1/runtime-result.json and the corresponding receipt/packet under .git/jev/handoffs/. Receipt confirms real command `claude --agent jev-claude-executor --model claude-sonnet-5-5`, fresh sender gate and accepted/turnStarted. Verified checkpoint is 1e588a7c4cb20e3c16cb3e8b2917ecde518be061. The handoff module correctly leaves completion unknown; separately observed output establishes completed evaluation. No raw native session transcript or private session identifier was copied into this report.

## Activation and regression evidence

Independently loaded actual runtimeConfig in a fresh Node process, compared backup old fields with assert.deepEqual, called validateTarget with current time, and selectedRoutingPreference with actual config and an empty policy. All assertions passed: old fields preserved, one Codex evaluation preference, exact Claude default-effort target available, catalog fresh at 2026-09-30T18:02:20.000Z, selection.kind=user-preference, manual effort abstains. This read-only check neither changed config nor launched an executor.

Source hashes match previously reviewed frozen implementation: src/evidence-policy.mjs ef7a9cf1fd31581121b9da9cdb8b0c10d1e4904075ec776a0e6b4a23529127a0; task-runtime/codex-proxy/handoff hashes unchanged; focused test hash 1d2bbcce5d6da2d330091bde8c129adc5cbef951e3b39ba27a060ce37f3d9f2a. Unrelated english_voice_tutor.html and server.mjs hashes match initial evidence. Independent git diff --check exits 0.

Final unchanged source previously passed independent focused 70/70 and worker full 240/240. No source change or failure justified repeating those tests solely for this resumed evidence review. Coordinator's resumed `JEV_RUNTIME_DISABLED=1 npm test` also completed exit 0, **240/240 passed**, zero failed/skipped/cancelled, ~8.99 seconds. This environment keeps personal live preferences out of unrelated default-config fixtures; explicit runtime tests retain their injected enabled configuration. The completed regression result is recorded in live-resume-1.md.

After QA's completed-output observation, coordinator reports terminal close returned terminal_stop_unverifiable. Evaluation completion is already independently proven; a successful PTY stop is not inferred from that close result. No repeat evaluation or prompt is needed.

## Acceptance limits and next action

**No unmet R1–R8 requirement remains at the acceptance gate.** Proceed with coordinator final result/scoped commit and separately authorized Git release only after its final checks. New jev-codex processes load the preference; existing ones are not silently reconfigured. The 24h catalog expiry retains abstention if stale, and receiver read-only authority is an instruction contract rather than an OS sandbox. This is Lion's scoped preference, not measured model-quality ranking. Historical failed/drop reports stay intact.
