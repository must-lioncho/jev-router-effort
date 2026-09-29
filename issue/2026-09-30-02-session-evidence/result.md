# Result: session evidence analyzer and first routing evidence

Date: 2026-09-30 (IST). Frozen analysis time `--now 2026-09-29T21:16:04Z` = 2026-09-30 02:46 IST.
Status: complete after the parent review fixes below; not committed (the coordinator commits
owned paths).

## Delivered

- `Analyzer/cli.mjs` with `analyze`, `review status|label`, `expand-check`,
  `feedback add|verify|import-runtime|list`, `compile`, `report`; libraries under `Analyzer/lib/`
  (read-only parsers for Claude, Codex incl. Orca account homes, Antigravity SQLite with a
  schema-less protobuf decoder, JEV status/audit/runtime files; dedupe; sampling; review; feedback;
  policy; report). `bin/jev-maintain.mjs` (coordinator) forwards to it. Usage: `Analyzer/README.md`.
- `test/analyzer.test.mjs`: 20 tests.
- `docs/routing-evidence.md`: redacted aggregate report. `docs/routing-policy.json` unchanged.
- Private, Git-ignored: `Analyzer/private/runs/{24h,48h}-20260929T211604Z/`, `feedback.jsonl`,
  `known-cases.json`, `proposed-policy.json`.

## Parent review fixes

1. **No raw identifiers in public code.** The real Publisher session is listed only in
   `Analyzer/private/known-cases.json`; `Analyzer/lib/known-cases.mjs` holds a loader and a generic
   verifier. Tests use a synthetic `publisher-fixture` conversation. A test scans every public
   `Analyzer/` file for UUIDs. `npm pack` output (53 files, including `Analyzer/` but not
   `Analyzer/private/`) contains no UUID and no `ev-` id of the case.
2. **Citations must be real evidence.** Every citation must be a ref in the session packet (no
   `Intend.md` or other free text). `user`/`qa` outcomes must cite a human follow-up; the last
   assistant message or a command is rejected, so a completion claim cannot be relabelled as QA.
   `feedback verify` resolves citations against the inventory, and `compile` re-checks every
   verified feedback record (a forged `verified: true` line is dropped and reported).
3. **Attribution from cited turns, not majority.** The model/effort of a known outcome is derived
   from the turns the cited follow-up reacts to (or the turn that ran the cited test). Two or more
   sources, or none, is rejected. The Codex gas-fee failure now cites only L595/L610
   (`gpt-6-sol`/medium); the separate L742/L756 screen-takeover stop followed `gpt-6-sol`/low and is
   left out. Aliases (`gemini-pro-agent`, `…-default`, unversioned names) and unknown efforts never
   validate a rule; AGY names that encode effort (`gemini-3.8-flash-low`) may.
4. **Check-level passes are not task success.** A `test`-basis success is reported as a
   check-level pass and counted as `unknown` in rules (`checkOnlyPasses`). Re-review:
   `ev-f0ed77ac30` → `unknown` (the 0.5 s notice goal is not shown by `npm test` 97/0 or the
   assistant's 0.6 s claim); `ev-e72757f36c` stays a check-level pass only (97/0 after the edit,
   no user confirmation) and no longer supports a `prefer` rule.
5. **Evidence time.** Each rule has `evidenceAt` = the oldest counted outcome's evidence time
   (cited follow-up or test run), never the compile time; recompiling keeps it, runtime
   `supportedRule` expires it 30 days later, and outcomes older than 30 days or without a time are
   dropped at compile.
6. **Denominator refinement, documented.** The first 24h pass counted 208 eligible sessions and
   sampled 49. Review showed router self-traffic in the pool, so three exclusions were added and
   counted: `probe-prompt` extended (arithmetic, "reply with exactly…", directory-count probes),
   `router-bench-traffic` (prompts or cwd inside a jev-router session scratchpad, 17 sessions), and
   probe detection over every user message. 24h became 182 eligible / 44 sampled (24.2%); 48h is
   405 / 93 (23.0%). Reviewed labels were kept by session key; the one new 24h pick was reviewed
   (`unknown`, image-forwarding diagnostic).

The documented flow is explicit: `analyze --window 24h` → `review label` → `expand-check` →
`analyze --window 48h` (same `--now`/`--seed`) → `review label` for new picks → `compile` → `report`.

## Actual scan

| window | distinct sessions | eligible | random sample (= reviewed) | confirmed success | failure | check-level pass | unknown |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 24h | 395 | 182 (claude 114, codex 21, antigravity 47) | 44 (24.2%) | 1 | 2 | 1 | 40 |
| 48h | 669 | 405 (claude 298, codex 41, antigravity 66) | 93 (23.0%) | 1 | 3 | 1 | 88 |

- Distinct-session counts include sessions that started after `now` (excluded as
  `started-after-now`), so they grow on reruns; eligible counts and samples do not.
- Other exclusions (48h): subagent prompt from a parent agent 45, router probes 54, image-helper
  calls 29, jev-router bench traffic 17, no activity in window 19, no human message 6, no
  assistant turn 8, no timestamps 3.
- 24h gave 3 user-confirmed known outcomes (<10, no group with 5), so the window was expanded once
  to 48h, the maximum. Evidence is still insufficient.
- Known outcomes: Publisher AGY `gemini-pro-agent` failure (user, step22); Claude
  `claude-opus-5`/low operations failure (user, L740); Codex `gpt-6-sol`/medium operations failure
  (user, L595/L610); Codex `gpt-6-astra`/xhigh analysis success (user, L225). Check-level pass:
  Claude `claude-opus-5`/low (L140).
- Most sampled sessions are unattended automation with no human or person-run QA verdict; they
  stay `unknown`. Agent-run QA verdicts are not QA.

## Publisher known negative

Re-verified from the conversation database each run: JEV notices `gemini-pro-agent` at confidence
0.57/0.66/0.71/0.21; generation metadata `gemini-pro-default`, enum `MODEL_PLACEHOLDER_M318`; exact
release unknown. `git reset --hard HEAD && git clean -fd` exited 0 with 130 visible `Removing …`
lines plus 48 truncated. User messages before it asked to restore the broken part (step22) and gave
general autonomy (step2); none asked to discard or clean. Reset/restore mentions in step44/50/54 are
model-written subagent messages, not authorization. Recorded with
`feedback add --authorized-by transcript`, verified against step22/31/32.

## Proposed policy

`Analyzer/private/proposed-policy.json` (schema v1): 4 rules, all `candidate` (1 known outcome
each; the AGY rule is also an alias with unknown effort), 34 abstentions. No rule can change
routing; cold-start behaviour stays.

## Verification

- `node --test test/analyzer.test.mjs`: 20 pass, 0 fail.
- `npm test`: 212 pass, 0 fail (includes other workers' tests at the time of the run).
- `review status`: 0 validation problems in both runs; `compile`: 0 problems; the report has no
  paths or raw UUIDs; `npm pack` scan clean.

## Limits

- Latency, cost and token use were not measured; no model ranking is claimed.
- Antigravity protobuf paths are inferred; AGY effort is only what model names encode.
- Codex `exec` output usually omits runner summaries, so Codex test evidence is mostly unknown.
- Codex/AGY JEV status files are keyed by process id; linkage is by exact prompt match only.
- Runtime `decisions.jsonl` and `feedback.jsonl` were absent in this window; the import path is
  tested but carried no data.
- Task types for `unknown` labels are the heuristic `taskProfile` candidates, not reviewed.

## Summary

The analyzer reviews 23–24% of eligible sessions by hand and now accepts an outcome only with a
cited human follow-up or a test verdict, attributed to the model that produced the cited work.
Four user-confirmed outcomes and one check-level pass exist; all four rules stay candidate. Real
session identifiers live only in `Analyzer/private/`.
