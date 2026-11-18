# Result

## Evidence

- Orca chat journal (`agent-session-domain.db`) held 11 failed turns from 2026-11-17 to 2026-11-18 with upstream error `Invalid value: 'auto'` for `reasoning.effort`.
- Every failed session used a concrete model (`gpt-6.1-sol`, `gpt-6.2-astra`) with `effort: "auto"`. `jev-codex` sets `model_reasoning_effort="auto"` by default, and the chat picker keeps that effort after a model switch.
- The proxy resolved `auto` only on the Jev Router branch. Requests for concrete models forwarded `auto` unchanged.

## Change

- `src/codex-proxy.mjs`: for a concrete model, a non-API effort is clamped with the catalog default effort, or dropped when the catalog is not yet known.
- `src/codex-proxy.mjs` (already in the working tree, same bug): on the Jev Router branch, `auto` is resolved even when the request skipped routing.
- `test/codex.test.mjs`: regression test for both catalog states and for manual efforts.

## Verification

- Live reproduction before the change: `jev-codex app-server`, `thread/start` model `gpt-6.2-astra`, `turn/start` effort `auto` returned the same `Invalid value: 'auto'` error.
- Same reproduction after the change: turn completed.
- `jev-router` with effort `auto` through `jev-codex app-server`: routed to `gpt-6.2-sol`, effort `auto → low`, turn completed.
- `npm test`: 299 passed, 0 failed.

## Limitation

- Running chat sessions keep the old proxy. Start a new Codex chat to load the fix.
