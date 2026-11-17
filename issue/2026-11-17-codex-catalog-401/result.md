# Result

## Change

- Added same-account ChatGPT OAuth refresh handling to the Codex proxy.
- The current `CODEX_HOME/auth.json` bearer is used for the cold model-catalog lookup and the forwarded Responses request only when `auth_mode` is `chatgpt` and the account ids match.
- API-key requests, mismatched accounts, unreadable files and malformed auth data preserve the original request headers.
- Updated the authentication behavior documented in `README.md`.

## Verification

- Live diagnosis: the affected proxy began 2026-11-13, its auth file refreshed 2026-11-16, and a same-proxy catalog request with the current token returned HTTP 200 with 12 models.
- `node --test test/codex.test.mjs test/catalog.test.mjs`: 23 passed, 0 failed before the regression was split into its own file.
- `npm test`: 294 passed, 0 failed, including the two new OAuth refresh tests.
- `git diff --check`: passed.
- Live smoke test through a new installed `jev-codex` process: routed to `gpt-6.2-sol` and returned `OK`; no catalog 401 or routing 503.

## Scope and recovery

- Pre-execution checkpoint: `40f3130de530b904a53e032d42d0f57d3be5a66a`.
- Checkpoint ref: `refs/jev/checkpoints/2026-11-17-codex-catalog-401/20261117T175744775Z-40f3130de530`.
- The pre-existing automatic-effort changes in `src/codex-proxy.mjs` and unrelated Hermes/HTML files were preserved and are excluded from this issue commit.
- `/Users/lioncho/.local/lib/node_modules/jev-router` resolves to this checkout, so the committed source is the installed launcher source; already-running processes must restart to load it.
