# Result

## Changes

- Set the Condition Mate Jira `SessionEnd` hook timeout from 60 to 3 seconds in both active Codex homes:
  - Orca account `CODEX_HOME/hooks.json`
  - default `~/.codex/hooks.json`
- Kept the corresponding `SessionStart` timeout at its original 60 seconds.
- The synthetic `jev-router` model now advertises the deduplicated union of `service_tiers` and `additional_speed_tiers` from the live account catalog.
- After Jev selects a concrete model, a non-default requested service tier is retained only when that model advertises support.
- Preserved `service_tier = "ultrafast"` in both Codex configs.

## Verification

- Hook assertions: `SessionStart == 60` and `SessionEnd == 3` passed for both Codex homes.
- Focused routing tests: 23 passed, 0 failed.
- Full repository suite: 296 passed, 0 failed.
- Fresh installed `jev-codex` smoke test routed to `gpt-6.2-sol`, returned `OK`, and emitted neither the SessionEnd clamp warning nor the `ultrafast` advertisement warning.
- `git diff --check`: passed.

## Scope and recovery

- Checkpoint commit: `b6d882c2d215ce582f3ba29714655062994e01ad`.
- Checkpoint ref: `refs/jev/checkpoints/2026-11-17-codex-startup-warnings/20261117T180724212Z-b6d882c2d215`.
- The hook JSON files are runtime configuration outside this repository and are documented here rather than committed.
- The pre-existing automatic-effort edit in `src/codex-proxy.mjs` and unrelated Hermes/HTML files remain untouched and excluded from this issue commit.
