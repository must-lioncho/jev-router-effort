# Intend: Jev routes every AGY turn, like Claude and Codex

`jev-agy` (aliases `jev -A`, `jev-a`, `jev-anti`, `jev-antigravity`) must open the real AGY
terminal UI and let Jev choose the model at the start of **each user turn**, exactly as
`jev-claude` and `jev-codex` already do. The earlier print-only result was based on a wrong
premise: AGY does expose a provider override.

## Why Claude and Codex worked and AGY did not

| | Claude Code | Codex | AGY (before) | AGY (now) |
| --- | --- | --- | --- | --- |
| Endpoint override | `ANTHROPIC_BASE_URL` | custom `model_providers.*.base_url` | not used | `CLOUD_CODE_URL` |
| Picker row | `ANTHROPIC_CUSTOM_MODEL_OPTION` | `/models` response + `jev-router` | none (`jev-router` rejected) | `jev-router` added to `v1internal:fetchAvailableModels` |
| Per-turn rewrite | proxy rewrites `model` | proxy rewrites `model` + effort | only `--model` at process start | proxy rewrites `model`, `labels.model_enum`, `generationConfig` |
| Decision shown | first streamed line + status line | commentary event | stderr, print mode only | first streamed text part |

The structural gap was the loopback proxy. Hooks (`PreInvocation`) cannot change the model,
but the AGY binary honours `CLOUD_CODE_URL` (log line: `Overriding CloudCodeServerURL via
CLOUD_CODE_URL environment variable`). Everything the proxy needs is in the request body and
the catalog response.

## Verified evidence (AGY 1.2.12, 2026-09-28)

- Default upstream: `https://daily-cloudcode-pa.googleapis.com`, turns go to
  `POST /v1internal:streamGenerateContent?alt=sse` with top-level `model`, `requestType`
  (`agent` for turns, `checkpoint` for titles) and `request.labels.trajectory_id`.
- Once the catalog contains `jev-router`, `agy --model jev-router -p ...` is accepted.
- Rewriting `jev-router` → `gemini-3.8-flash-low` and → `claude-sonnet-4-6` both completed,
  including a tool continuation (`functionResponse`) on Claude.
- A text part injected before the first SSE event is displayed and does not break the tool loop.

## Rules

- Reuse `askJev`, `decide`, status files and the fail-open policy. Only IDs from the signed-in
  catalog are eligible; never invent a model.
- Route only when the request says `jev-router`. Any other model is the user's choice and
  passes through unchanged; picking **Jev Router** again resumes routing.
- Tool continuations keep the model chosen for their turn. Titles/checkpoints are untouched.
- Strip Jev's own notes from history before forwarding, so the model never sees them.
- Never read, print or store the OAuth token; forward headers as received. Do not modify AGY's
  installation, `settings.json`, or `config.json`. An existing `CLOUD_CODE_URL` becomes the
  upstream instead of being overwritten.
- Without a Jev key, launch plain AGY and say so.

## Acceptance

1. `npm test` stays green, with new tests for catalog injection, turn detection and rewriting.
2. Real print-mode run through `jev-agy` routes and prints the decision.
3. Real native TUI session (driven through a pseudo-terminal) shows **Jev Router** and routes
   two consecutive turns, each logged with the model chosen.
4. `DROP_REPORT.md` is replaced with the resolution and its evidence.
