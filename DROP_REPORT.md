# Drop report: resolved — native per-turn routing for AGY

Date: 2026-09-28. AGY 1.2.12. Supersedes the earlier "not achieved" report.

Result: **native per-turn routing works.** `jev-agy` opens the real AGY terminal UI with
**Jev Router (auto)** selected in `/model`, and Jev picks an exact account model at the start of
every user turn, as `jev-claude` and `jev-codex` do.

## What the earlier report missed

It concluded AGY had "no documented provider/base-URL override". The AGY binary honours
`CLOUD_CODE_URL`; its log states `Overriding CloudCodeServerURL via CLOUD_CODE_URL environment
variable`. That is the same seam Claude Code (`ANTHROPIC_BASE_URL`) and Codex (custom provider
`base_url`) use. The `jev-router is not recognized` error occurred because the model catalog
had not been extended; once the proxy adds `jev-router` to `v1internal:fetchAvailableModels`,
AGY accepts it both as `--model jev-router` and as a native picker row.

`PreInvocation` hooks remain unsuitable: their output supports only `injectSteps`.

## Evidence

| Check | Result |
| --- | --- |
| Endpoint override | AGY traffic, including `streamGenerateContent?alt=sse`, went through the loopback proxy. |
| Sentinel | `agy --model jev-router -p ...` accepted once the catalog lists it. |
| Rewrite, Gemini | `jev-router` → `gemini-3.8-flash-low`, answer returned. |
| Rewrite, Claude + tools | `jev-router` → `claude-sonnet-4-6`; `list_dir` tool call and `functionResponse` continuation completed. |
| Print mode via `jev-agy` | `gemini-3.8-flash-high -> gemini-3.1-pro-low (jev, confidence 0.32)` for a hard prompt. |
| Native TUI (pseudo-terminal) | Header shows `Jev Router (auto)`; `/model` lists `> Jev Router (auto) (current)` above real models; two turns in one conversation each logged a Jev decision and printed `[Jev] routed this turn to ...`. |
| Native TUI, model A→B | One conversation (`9875b864`): turn 1 sent `gemini-3.6-flash-low`, upstream replied `modelVersion: gemini-3.6-flash`; turn 2 (`use sonnet: ...`) sent `claude-sonnet-4-6`, upstream replied `modelVersion: claude-sonnet-4-6`. Captured by a second logging proxy set as `CLOUD_CODE_URL`, which also shows a pre-set value is kept as the upstream. No `[Jev]` note reached the upstream history. |
| Tests | `npm test`: 94 pass, 0 fail. |

## Remaining limits

- AGY's request format (`v1internal`) is not a public contract; `JEV_DUMP` captures bodies if
  it changes.
- The decision is shown as the first streamed text part. It is removed from history before the
  next request, so the model does not read it.
- Jev's own choice decides the model; on the verified trivial and one-sentence prompts it chose
  Flash-Low, and on a design prompt it chose Pro.
