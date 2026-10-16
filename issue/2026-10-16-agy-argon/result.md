# Result

Automatic AGY candidates now allow only Gemini 3.8 Flash and Gemini 4 Argon, each with low/medium/high effort. IDs confirmed by live `agy models`. Native manual selections remain untouched. Updated proxy regression fixtures and runtime hold fixture; added retired-family exclusion coverage. README updated.

Verification: `npm test` passes 269/269; `git diff --check` passes. First run found the runtime hold fixture still using the now-ineligible Pro alias; updated that fixture, then reran all tests successfully. Installed jev-agy resolves to this checkout; existing proxy processes require restart. No publish/push.

Evidence coverage: one user catalog screenshot and one live model-list response; no session-performance sampling, comparative ranking or routing-policy changes. Argon task quality/latency remain unmeasured. Checkpoint receipt is in directive.md. Unrelated untracked english_voice_tutor.html and server.mjs preserved.

Commit: the scoped commit containing this result (`git log -1 -- issue/2026-10-16-agy-argon/result.md`).
