# Intend: a checkpoint survives unreadable paths

## Failure (2026-10-18, coordinator report)

All six clean-room lanes stopped. `src/task-runtime.mjs` threw `RoutingHoldError`
"Checkpoint required before execution: git add failed …", the proxy answered HTTP 409, and
Claude showed "API Error: 409" and ended the session.

- The sessions ran in a macOS sandbox that denied reads on some repository paths:
  `could not open directory 'plan/review/': Operation not permitted`,
  `fatal: unable to stat 'plan/confirmations.json'`.
- The coordinator worked around it by listing those paths in the target repo's
  `.git/info/exclude`.

## Reproduction (this run)

`sandbox-exec` with `(deny file-read* …)` on a directory, a tracked file and an untracked file
in a temp repo: `git status` exits 0 with warnings; `git add -A` dies with
`fatal: unable to stat 'plan/untracked-deny': Operation not permitted` (exit 128).
`git add -A --ignore-errors` dies the same way, so that flag is not a fix. Tracked files that
cannot be stat'd keep their index entry (not recorded as deleted). With `chmod 000` (EACCES)
git only warns and exits 0.

## Evidence coverage

Six of six lanes (coordinator count). The analyzer has no record of these holds as routing
outcomes; no routing-quality evidence is involved and routing policy is not changed.

## Intent

1. Unreadable paths are skipped, recorded in the receipt and the checkpoint commit, and do not
   fail the checkpoint.
2. When a checkpoint still cannot be made, keep the hold by default.

## Disagreement with the request

The coordinator asked that a checkpoint failure become a per-turn warning by default, with a
strict mode to hold. `Intend.md` item 5 (owner intent) says "fail before execution if a
required checkpoint cannot be made", and the existing test "failure is never fail-open" pins
that. Following the procedure (the contract wins), hold stays the default and warn is an
explicit opt-in (`checkpointOptions.onFailure: "warn"`), local execution only. Changing the
default needs the owner's decision and an `Intend.md` edit.
