# Directive: session evidence analyzer

Owner: analysis worker (Orca task `task_3338757eda7b`). Owned paths: `Analyzer/`,
`test/analyzer.test.mjs`, `docs/routing-evidence.md`, this issue folder. No commits; preserve other
writers' files.

1. Parse sources read-only: Claude JSONL (model, `effort`, Bash results, JEV notices), Codex JSONL
   (`turn_context`, JEV notice for `jev-router` turns, `exec` commands), Antigravity SQLite opened
   `immutable` (or a private WAL copy) with a schema-less protobuf decoder, JEV status files.
2. Merge files that share `(cli, sessionId)`. Exclude, with a counted reason: no activity in the
   window, activity only after `--now`, no human message, subagent prompt from a parent agent,
   router probes, image-helper calls, jev-router bench traffic.
3. Sample `ceil(0.2 × N)` per stratum (band × CLI × routing × kind) by `sha256(seed:key)`; keep
   routed, manual-under-JEV and unrouted sessions in separate strata.
4. Review every sampled packet by hand. `success`/`failure` only with a cited user/QA statement or
   a test-runner verdict after the last edit; attribute to the model/effort that produced the work
   the evidence reacts to. Everything else `unknown`.
5. Run 24h first; expand to 48h only when the reviewed evidence is insufficient (<10 known outcomes
   or no group with 5). 48h is the maximum.
6. Record the Publisher case through `feedback add` with `authorized-by transcript`, verify it
   against packet refs, compile policy v1 with the runtime thresholds from
   `src/evidence-policy.mjs`, and write the redacted report.
7. Tests: parsers (Claude/Codex/AGY fixture DB), sampling coverage and stability, provenance
   validation, unknown abstention, cold start, feedback intake and runtime import, known case.

Acceptance: `node --test test/analyzer.test.mjs` and `npm test` pass; both runs fully reviewed;
report states denominators, coverage, outcomes by basis, exact models and the known case;
`docs/routing-policy.json` unchanged.
