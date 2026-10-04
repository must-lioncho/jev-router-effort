# Result: model, skill and optional agent routing with evaluation logs

Status: implemented, tested and checked live on Claude Code and Codex. The distributable default is off. After Lion chose option 1, Lion's local runtime config was set to `recommend` mode (see "Activation").

Executor: native Claude Code, agent `jev-router-improver`. The system reported the model as `claude-opus-5-5`. Lion saw high effort in the TUI. This session cannot read its own effort value.

Commit: the commit that adds this file (`git log -1 -- issue/2026-10-04-model-skill-agent-routing/result.md`). There was no push, publish or new schedule.

## What changed

- **`src/capabilities.mjs` (new).** Lists the skills and agents that each CLI actually loads, using metadata, real path and SHA-256 only. Claude: `~/.claude` and `<cwd>/.claude`. Codex: `~/.codex`, `~/.agents` and `<cwd>/.agents`. Other parts:
  - Department prefixes (`hr-`, `nss-`, `sut-`, `mpc-`) work as identifiers. The working folder is context only.
  - A lexical shortlist (up to 6 skills and 4 agents) feeds TypeSafe choice questions that include `none`.
  - Detection of explicit requests (`/name`, `$name`, `@agent-name`, `name 스킬`, `name 에이전트`) and opt-outs (`스킬 없이`, `에이전트 없이`, `no agents`).
  - Same-name detection by hash, ambiguity and low-confidence fallbacks, carry-forward of the previous skill for a short continuation, and `requiredSkills` rules with reported conflicts.
  - Building the request text from a fresh read of the skill file, with hash drift recorded. Idempotent injection for Claude and Codex. Observation of Claude `Agent`/`Skill` tool calls.
- **`src/capability-runtime.mjs` (new).** Per-process state shared by both proxies:
  - Retry detection. This covers an identical resend, and a resend under a new conversation key after an upstream failure.
  - Event logging and re-injection on every routed request, which keeps the prompt-cache prefix stable.
  - Per-host support: Claude has skills plus agent delegation. Codex has skills only; agents are recommended but not delegated. Antigravity and GLM are not supported.
- **`src/routing-log.mjs` (new).** The private event log (0600) in the runtime `stateDir`, secret masking, labels (`user|qa|executable` only), the report and retention pruning.
- **`src/router.mjs`.** Skill and agent questions ride on the existing JEV call. The JEV model (`result.model`) and token usage are returned.
- **`src/proxy.mjs` and `src/codex-proxy.mjs`.** They integrate prepare, decide, apply, observe and served-model logging, and add a capability part to the routing notice.
- **`src/task-runtime.mjs`.** Exposes `config`, `taskIdFor(key)` and `isNewTaskPrompt`.
- **`bin/jev-maintain.mjs`.** New commands: `capabilities`, `routing-label`, `routing-report` and `routing-prune`.
- **Docs.** New `docs/capability-routing.md` covers selection rules, host support, log schema, storage, retention, deletion, labels and report. There is a pointer in `docs/improvement-harness.md`, and `package.json` `files` includes the new doc.
- **Tests.** New `test/capabilities.test.mjs` (21 tests) and `test/routing-log.test.mjs` (7 tests).

The existing model/effort selection, manual-override handling, task context, checkpoints, handoff fences and evidence policy are unchanged. `docs/routing-policy.json` is unchanged.

## Required regression coverage

| Requirement | Test |
| --- | --- |
| HR natural-language request from a non-HR folder | `HR request from a non-HR folder selects hr-make-jd…` |
| NSS/SUT/MPC separation | `department prefixes separate NSS, SUT and MPC…` |
| No skill needed; no agent needed | `a general question needs no skill and no agent…`, plus the `jev-none` paths |
| Skill only, agent only, both | `skill only, agent only and both are independent dimensions` |
| Explicit request and opt-out | `explicit skill/agent requests are respected…`, `the classifier is not asked a question the user already answered` |
| Same-name candidates | `same-name candidates are distinguished by path and hash…` |
| No candidate, ambiguous request | `a general question…`, `ambiguous and low-confidence answers fall back…` |
| Earlier context kept | `a short continuation keeps the earlier skill; a new task drops it` |
| Required-skill conflict | `a required skill rule is added, and an explicit opt-out conflict is reported` |
| Log linkage and masking | `Claude proxy: one turn links input, candidates, decision, application, served model and masked input`, `secrets are masked…`, `event log is private` |
| No duplicate on retry | `identical retry reuses the decision…`, `a resend under a new conversation key after HTTP 400 is linked as a retry` |
| Selection versus execution mismatch | `selection/execution mismatch is recorded in recommend mode and for a different served model`, Codex `reports agent delegation as unsupported` |
| Report without labels | `without labels every accuracy is unmeasured…`, plus labeled metrics, label refusal, dataset split and pruning |
| Off mode keeps the cold path | `mode off is the cold path: no events and an unchanged body` |

I ran two mutation checks: retry detection disabled, and the idempotency guard removed. Each made the matching tests fail. I then restored the code.

## Checks

| Command | Result |
| --- | --- |
| `node --test test/capabilities.test.mjs test/routing-log.test.mjs` | 28/28 pass, exit 0 |
| `npm test` (live personal runtime config present) | 268/268 pass, exit 0 |
| `JEV_RUNTIME_DISABLED=1 npm test` | 268/268 pass, 0 skipped or cancelled, exit 0 |
| `git diff --check` | exit 0 |
| `npm pack --dry-run` | Includes the new src files and the doc. No `private/`, issue folder or state files. |

## Live checks (harmless, temporary config and state directory)

1. **Real catalog and real JEV** (`smoke.mjs`; output in Git-ignored `private/smoke-output.json`). Claude catalog: 59 skills and 100 agents. JEV model: `jev-1.13.0`. Seven author-defined cases all matched the author's expectations:
   - JD → `hr-make-jd`
   - NSS daily report → `nss-report-daily`
   - SUT promotion CSV → `nss-promotion-usdt-sut`
   - A general question and a rename → no skill, no agent, and JEV was not asked
   - `/hr-pip` → explicit `hr-pip`
   - `스킬 없이…` → explicit none

   These are smoke expectations, not ground-truth labels.
   - In two runs the agent answer for the JD prompt changed from `jev-none` (0.35) to `low-confidence`. Both runs ended with no agent.
   - For `/hr-pip`, JEV also selected the agent `mustcompany-team-hr-pip-hr-zero-task` (0.91). Nobody has reviewed whether that agent is appropriate.
2. **Cost against model-only routing.** Same prompt, 5 cases where the capability questions were asked:
   - Median JEV input tokens went from 1,240 to 2,048. The largest case went from 1,250 to 2,374.
   - Median latency was 318 ms model-only and 288 ms with capability questions. The model-only call always ran first, n is 5 and the order was not randomized, so this does not show a latency difference in either direction.
   - Prompts with an empty shortlist add no tokens.
   - Dollar cost is unknown.
3. **Real Claude Code 2.1.289 through `bin/jev-claude.mjs`**, in `-p` mode with `--tools Read` and apply mode.
   - Prompt: a JD request for a data engineer with no memo. Notice: `[Jev] routed this turn to claude-haiku-4-5-20251001 (jev, confidence 0.83, effort n/a). skill hr-make-jd.`
   - The event log shows `application.skills[0].applied=true` (2,859 bytes, no hash drift) and the served model `claude-haiku-4-5-20251001`.
   - The reply followed the skill's rule. It listed "확인 필요" items instead of inventing JD facts, and named `hr-make-jd`.
4. **Real Codex CLI 0.160.0 through `bin/jev-codex.mjs exec --sandbox read-only`**, same prompt.
   - Notice `skill hr-make-jd.`, skill applied (2,859 bytes), served `gpt-6.1-sol`.
   - The reply says it applied the provided skill text and names `hr-make-jd`.
   - No agent was shortlisted.

These checks show that skill selection and application work on both hosts. They do not measure routing accuracy or task success.

## Finding during the live check (cause predates this change)

The first routed request of a Claude Code 2.1.289 print session gets HTTP 400. Claude Code then resends the same request with the trailing `role: "system"` message folded into the user turn. The HEAD build without this change shows the same 400.

Effects on this change:

- The resend arrives under a new conversation key, so it was first decided twice, and the agent answer flipped between the two decisions.
- Fixed here: such a resend within 120 seconds of an upstream failure is linked as a retry and reuses the first decision. The trailing `system` entries are not counted.
- Not fixed: the 400 itself, and the second model/effort classification call made for the resend. Each costs one extra request on the first turn. This needs its own issue.

## Activation

2026-10-04, after the commit that added this file: Lion chose option 1. I added `"capabilityRouting": { "mode": "recommend" }` to `~/.config/jev-router/runtime.json`.

- Backup: `~/.config/jev-router/runtime.json.before-capability-recommend-20261004`. All other fields are equal to the backup. The file mode is back to 0600.
- A new process loads the config and reports mode `recommend`, with the log at `~/.local/state/jev-router/routing-events.jsonl`.
- I did not make a live request with this config, so the live log has no test entries.
- Running sessions are not affected.
- Rollback: restore the backup, or set `"mode": "off"`.

Original activation notes:

Not activated at first. To enable it for Lion, add `"capabilityRouting": { "mode": "recommend" }` or `"apply"` to `~/.config/jev-router/runtime.json`, then start new `jev-claude`/`jev-codex` processes. Running sessions are not affected. Rollback: remove the field or set `"off"`.

- `recommend` logs and shows selections without changing requests.
- `apply` also puts the skill text into the user's turn.

The state directory in that config (`~/.local/state/jev-router`) would receive `routing-events.jsonl` and `routing-labels.jsonl`.

Evaluation commands:

```sh
node bin/jev-maintain.mjs capabilities --cli claude
node bin/jev-maintain.mjs routing-report --since 7d --dataset live
node bin/jev-maintain.mjs routing-label --request ID --dimension skills --expected hr-make-jd --source user --evidence "…"
node bin/jev-maintain.mjs routing-prune --days 30
```

## Not verified

- **Routing quality.** No labels exist, so skill, agent and model accuracy, and task success, are unmeasured. No comparative performance claim is made.
- **Live agent delegation.** A real Claude `Agent` tool call after a JEV recommendation was not run, because every installed agent does real work. Delegation start and completion logging is tested offline with simulated `tool_use`/`tool_result`. The subagent's exact model is not checked by JEV.
- **Codex native agent delegation** is unsupported (recommendation only). Antigravity and GLM have no capability routing.
- **Not discovered:** Claude Code plugin skills and agents, and Codex project-scope agents.
- **Not measured:** the effect of injected skill text on the main model's token cost, the cache rebuild after a proxy restart, and behavior with interactive TUI sessions over many turns.
- **Masking** covers common credential shapes only.

## Procedure notes

- Checkpoint: `refs/jev/checkpoints/2026-10-04-model-skill-agent-routing/20261004T112604782Z-6b9385eb4433` → `6b9385eb44338f57c987276e980286131c90b776`. I verified it before editing. Its parent is HEAD `1147f74`, and it holds `english_voice_tutor.html` and `server.mjs`.
- Those two files were not modified or committed.
- This was a new-feature request with no failure report, so `jev-maintain feedback` and `analyze` were not run. No policy evidence was created.
