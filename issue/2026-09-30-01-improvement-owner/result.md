# Result: improvement owner and executors

Status: done. The agents are deployed, but live routing quality has not been measured.

## What exists

- `jev-router-improver`, `jev-claude-executor`, `jev-codex-executor` and the skill
  `jev-router-improvement` are in the AIOS development repository. Commit: `e5eaca8`, which
  contains only these paths and their issue evidence.
- They are installed to `~/.must-aios` through a scoped release (`--component
  jev-router-improvement`, 0 conflicts). After sync, discovery works in Claude
  (`~/.claude/agents`, skill link), in Antigravity (`~/.gemini/config`), and in Codex (the
  launcher command plus skill copies in 3 homes). Installed bytes equal the committed bytes.
- The references point at this repository's `CLAUDE.md`, `AGENTS.md`, `Intend.md`,
  `DIRECTIVE.md` and `node bin/jev-maintain.mjs`. They do not copy policy.
- `scripts/check_target.py` checks exact models and efforts against the host catalogs: `codex debug models` for Codex, and `src/config.mjs`/`src/proxy.mjs` for Claude. It fails closed,
  and it rejects a packet that runs on the wrong host (it finds the nearest Codex/Claude
  ancestor process). `handoffTask` runs it with `--sender --router <package root>` before any
  launch.

## Tested configuration

The improver runs as Claude `claude-opus-5-5` (`tier: heavy`). The Claude executor runs as
`claude-sonnet-5-5` (`tier: mid`). The Codex executor runs as `gpt-6-astra` with `xhigh` effort
and `--no-daemon`, set at launch. Other runtime renderings are untested.

## Evidence (AIOS `issues/2026-09-30-jev-router-improvement/`)

- Independent review: v1 was approved; v2 was held twice; v3 was held once for the `model:` id
  and sync break; v3 with tiers was approved (`review.json`, hash-bound).
- Unit tests: 9 of 9 pass.
- Behavior, run in scratch repositories:
  - Claude executor: valid 3/3; invented model escalated 5/5 with no edit.
  - Codex executor: valid 1/1; invented model 2/2.
  - Improver: QA end-to-end 1/1 (checkpoint, dated issue, policy unchanged, one scoped commit,
    unrelated edits kept); sender refusal 3/3.

## Case for the routing owner

This is one local observation, not a ranking. When the executors inherited Jev routing and ran
on `claude-haiku-4-5-20251001`, they edited after `check_target.py` exited 2 (5 runs). The
improver on haiku also wrote a sendable packet for an invented model (1 run). Wording within
200 characters did not fix this. The mitigation is the code gate before launch plus exact
tested models.

## Limitations and follow-ups

- Samples are small, and live task-success improvement is unmeasured.
- The improver has no code-level host gate; only Claude was tested.
- The development `runtimes/codex.toml` TOML renderer and an unrelated agent's `model:
  claude-fable-5-1` block `sync.py --check` in development. Neither was changed here.
- The coordinator ran a named Orca handoff smoke (read-only) against snapshot `da54835f`: it launched `claude --agent jev-claude-executor --model claude-sonnet-5-5`; the target check and the checkpoint checks exited 0; the reply was `JEV_NAMED_SMOKE_OK`; and there were no edits. That smoke did not exercise any editing steps; the behavior fixtures cover those.

## Coordinator acceptance and invocation

Use native `claude --agent jev-router-improver --model claude-opus-5-5` for the tested owner.
The canonical AIOS `tier` metadata is required by its renderer; it is not a claim that other
providers' tiers are equivalent. Executor handoffs specify exact native CLI/model/effort.

- Coordinator independently reran `gate.py check` (195/198/198/186 characters) and
  `gate.py verify` against the approved receipt: both exited 0. Installed sender checker
  accepted the exact Claude target before any Orca launch.
- Read-only named smoke at 2026-09-29T22:29Z: checkpoint
  `da54835f85e4395dd5805ff7dd1b6b8282c290a6`, ref
  `refs/jev/checkpoints/smoke-20260930-named/20260929T222938243Z-da54835f85e4`.
  The receipt lives in `.git/jev/handoffs/smoke-20260930-named/`.
  Orca observed `input_accepted` then `turn_started`, and the terminal showed
  Sonnet 5.5 / `@jev-claude-executor`, successful target and checkpoint checks, package name
  `jev-router`, and `JEV_NAMED_SMOKE_OK`. The final `tui-idle` wait was satisfied.
- `git diff` against the smoke snapshot for package/source/CLI/docs/Analyzer/tests was empty.
  The final full `npm test` run passed **212/212**, with no failures or skips. The public
  package dry-run contained 53 files and no private evidence or unrelated user files.
- Initial unrelated `english_voice_tutor.html` and `server.mjs` remain untracked and their
  hashes match the bootstrap snapshot. No remote push, publication or scheduled job was added.

## Orchestration accounting

The Analyzer, execution and agent-definition tasks completed with accepted `worker_done`
results. A replayed worker inbox delayed follow-up delivery until its batches were
acknowledged; it was caught up before final review. An owned read-only ancestry diagnostic
exceeded five minutes and only that positively identified child was terminated; no user
terminal or implementation process was stopped.

The dedicated smoke terminal was closed, but Orca returned `terminal_stop_unverifiable`;
the exact observed shell/agent PIDs (80812/80827) were subsequently absent. Earlier settled
worker releases likewise retained `release_unknown` even after exact exited observations
and fresh release retries. These are cleanup-receipt limitations, not successful lifecycle
proofs. The final agent worker is `retained` / `user_takeover` and was left untouched.
Recovery refs and receipts are preserved; no broad terminal close or automatic restore ran.
