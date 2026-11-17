# Directive

1. Refresh forwarded ChatGPT OAuth authorization from the active `CODEX_HOME/auth.json` only when its account id exactly matches the incoming `chatgpt-account-id`.
2. Apply the refreshed header to both the model-catalog lookup and the eventual upstream Responses request.
3. Do not read or substitute API keys. Do not use credentials across account ids.
4. Add regression coverage for a stale bearer and for mismatch/failure fallbacks.
5. Preserve the pre-existing automatic-effort edit in `src/codex-proxy.mjs` and all unrelated files.
