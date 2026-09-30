# Authorized resumed live evaluation — complete

Lion reset the weekly quota and explicitly requested another execution. This new authorization is recorded in resume-directive.md; previous failed attempts/reports remain unchanged.

Command: `node issue/2026-09-30-05-codex-claude-routing/smoke.mjs resume-1`. Real Codex task runtime → real checkpoint → installed executor sender gate → public Orca CLI → native Claude Sonnet 5.5 in the same checkout. The TypeSafe classifier was deliberately stubbed to null to exercise the explicitly configured user preference; this is not a native Codex TUI or comparative-quality benchmark. The separate regression suite covers the actual local HTTP Codex adapter and no local upstream generation after a handoff.

Delivery accepted:true and observed turnStarted:true. Terminal term_82aa6794-196c-4a94-9392-469ff738889c. Task 8e5d6b3f-f1c2-4a65-b79c-e71987776c53. Checkpoint 1e588a7c4cb20e3c16cb3e8b2917ecde518be061. Exact launch model claude-sonnet-5-5 with CLI default effort, receiver gate accepted exit 0. The receiver reports the model and default effort (gate effort:null); numeric configured effort is not inferred from this banner/report. Claude Code 2.1.285.

Coordinator read the native terminal after completion and verified the actual final line:

`JEV_CLAUDE_SMOKE_PASS {"sum":4,"product":42,"readOnly":true}`

Native evaluation explicitly confirmed 2+2=4 and 7*6=42, no file changes, no commits/messages and no unresolved work. It read the handoff packet and ran the exact receiving target check. It accurately stated the prior arithmetic check's exit 0 was packet evidence, not a newly run fixture test. The coordinator independently verified the fixture arithmetic and exact marker. This demonstrates completed native evaluation, not merely prompt delivery. handoffTask's receipt still correctly records completion:unknown; the coordinator's separate observed report establishes R5 completion.

Private receipts/packet remain under .git/jev/live-codex-claude/resume-1/ and .git/jev/handoffs/8e5d6b3f-f1c2-4a65-b79c-e71987776c53/. No raw native session transcript is committed.

After this completed result, actual sender availability was refreshed at 2026-09-30T18:02:20Z and the user's runtime config was activated for Codex evaluation→claude-sonnet-5-5/default, separately labeled user-preference. A private pre-activation backup is retained at .git/jev/backups/runtime-before-resume-20260930.json. Only routingPreferences/externalModels/externalCatalog were changed; original enabled/checkpoint/handoff/policyPath/stateDir remain intact.

Fresh processes load the new config; existing CLI processes were not restarted or silently changed. The exact availability catalog expires after the existing 24h interval; stale entries abstain until refreshed from actual native tooling. No universal Claude quality ranking or successful-sample policy was fabricated. The preference is scope-limited to evaluation; manual choices and mixed mutation requests retain their existing behavior. Independent resumed QA must check the actual activated configuration and all original R1–R8.

Coordinator final full regression after resumption: `JEV_RUNTIME_DISABLED=1 npm test`, exit 0, 240/240 passed, zero failed/skipped/cancelled, 8.99 seconds. The environment switch prevents unrelated default-config adapter fixtures from loading the actual personal activated preference; tests that exercise runtime routing explicitly construct enabled configuration. This does not replace the separate real native smoke or actual-config selection checks. Original source/test hashes still match the previously frozen QA2 implementation. `git diff --check` passed; unrelated file hashes unchanged.

After reading and verifying the completed report, terminal close initially returned terminal_stop_unverifiable. Later show reported orphaned:true, connected:false, writable:false and operator_close. No further prompt or alternate-host retry was issued; successful evaluation evidence was inspected before close and retained privately. The earlier ambiguous close receipt is not rewritten as an earlier confirmed exit.
