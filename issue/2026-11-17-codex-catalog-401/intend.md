# Intent: recover long-running Codex sessions after OAuth refresh

## Evidence

- User report: `503 Service Unavailable: Jev routing failed: Model catalog HTTP 401` from the local Codex proxy.
- The affected proxy process began on 2026-11-13, while its ChatGPT `auth.json` was refreshed on 2026-11-16.
- A catalog request through the same proxy using the current token returned HTTP 200 and 12 models.

## Issue

The proxy forwards the bearer captured by a long-running Codex process. When another process refreshes the ChatGPT OAuth token, the old process can continue sending the expired bearer. Jev's cold catalog lookup then turns the upstream 401 into a routing 503, and later Responses requests would retain the same stale authentication.

## Intended result

For ChatGPT OAuth only, use the current local access token when `auth.json` and the incoming request have the same account id. Preserve API-key behavior, refuse cross-account substitution, and fall back to existing forwarding if the auth file cannot be read or validated.
