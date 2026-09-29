# Session evidence analyzer and first routing evidence

Date: 2026-09-30. Parent contract: root `Intend.md` (evidence and improvement lifecycle) and
`DIRECTIVE.md` item 2, "Analyzer".

## Intent

Lion wants routing rules to come from what actually happened in recent sessions, not from a
model's confidence or its own "done". The analyzer must read the local Claude, Codex (including
Orca account homes) and Antigravity sessions plus JEV decision files, count an honest denominator,
review at least 20% of eligible sessions by hand, and keep outcomes `unknown` unless a user, QA or
an executed test shows them. It must record the exact CLI, model string and effort observed, and
leave anything unobserved as unknown.

The Publisher incident (Antigravity conversation named in `Intend.md`) is a known negative: the
analysis must re-verify it from the source and separate what the user asked for from what the
agent or transcript decided (`git reset --hard HEAD && git clean -fd`).

## Scope

- `Analyzer/` CLI and library: collection, same-session dedupe, deterministic stratified sampling,
  review packets and validated labels, 24h→48h expansion check, feedback intake (manual and
  router runtime), policy v1 compilation into `Analyzer/private/proposed-policy.json`, report.
- `test/analyzer.test.mjs`; `docs/routing-evidence.md` (redacted aggregates).
- A real run over 2026-09-28 02:46 – 2026-09-30 02:46 IST (`--now 2026-09-29T21:16:04Z`, frozen
  so sessions spawned for this implementation are excluded).

## Out of scope

`docs/routing-policy.json` (unchanged), `src/`, runtime integration, commits, external model or
API calls, external messages. Latency and cost are not measured.

## Evidence

Private: `Analyzer/private/runs/{24h,48h}-20260929T211604Z/` (inventory, sample, packets, labels,
known-case verification), `Analyzer/private/feedback.jsonl`, `Analyzer/private/proposed-policy.json`.
