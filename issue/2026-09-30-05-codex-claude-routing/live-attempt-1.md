# Live evaluation attempt 1

Command: `node issue/2026-09-30-05-codex-claude-routing/smoke.mjs qa-attempt-1`. The script used the real Codex task runtime, real Git checkpoint, actual installed executor sender gate, public Orca CLI and native Claude executor. Classification was intentionally stubbed to null to exercise the user's explicit evaluation preference, not to claim TypeSafe classification or a native Codex TUI session was tested. The automated HTTP Codex test covers adapter request/hold behavior separately.

Sender gate accepted exact claude-sonnet-5-5 with default effort; catalog checked at 2026-09-30T10:43:29.291Z using the actual gate and installed Claude Code 2.1.285. The original objective, current arithmetic evaluation and private assistant/check context were present in the packet. Evaluation authority was read-only.

Task: e8e66126-736f-4923-970e-c7fd74082801. Checkpoint: 77d2c9eadbc2138cc1296f281c9ca9e6620736de. Terminal: term_5deb1e73-db5e-48e2-9a44-54bb2ca06f27. Orca delivery accepted:true and turnStarted:true; persistent task state reported delegated and held local execution. Handoff completion remained unknown, as designed.

The coordinator read the actual receiver terminal. Its banner reported Sonnet 5.5, Claude Max, jev-claude-executor; effort was not displayed (the launch used CLI default). Independent QA inspected the corresponding native local record: exact model claude-sonnet-5-5, perTurnEffort medium, rate_limit/API 429, quota status rejected, zero tools/changed lines. This is configured session effort, not a successful completed model computation. Its first response was "You've hit your weekly limit · resets Oct 1 at 7:30pm (Asia/Calcutta)". No arithmetic evaluation or requested JEV_CLAUDE_SMOKE_PASS result appeared. Therefore actual evaluation completion failed; delivery/start are successful but R5 is not fulfilled.

No local runtime preference/catalog was activated because the required completed live result was unavailable. The user's existing config remains as before: enabled:true, checkpoint:true, handoff:true, externalModels:[], externalCatalog:{}, no routingPreferences. R8 is not fulfilled. No switch to paid usage credits or quota reset was attempted.

Closing this blocked terminal initially returned terminal_stop_unverifiable. A later independent QA read reported exited; terminal show reported orphaned:true, connected:false, writable:false, exitCause operator_close. This later evidence confirms an exited terminal without retroactively changing the earlier close receipt. No further prompt is sent to the first handle. A second live attempt, if dispatched after QA feedback, uses its own task/fence and only evaluates the same read-only fixture; it does not delete or reuse the first fence.

Full local receipt/context: .git/jev/live-codex-claude/qa-attempt-1/runtime-result.json and .git/jev/handoffs/e8e66126-736f-4923-970e-c7fd74082801/{receipt.json,packet.md}. These private files are not committed or published.

The coordinator's initial smoke script had one missing closing brace, failed at parse time without launching anything, and was corrected before this execution. This was a harness correction before QA attempt 1, not an extra completed QA attempt or executor retry.
