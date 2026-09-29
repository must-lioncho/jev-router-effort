# Intend: `jev-glm` shows the Jev decision in the chat within 0.5 s

Date: 2026-09-29.

`jev-glm` must show the `[Jev] routed this turn to …` decision **inside the ZAI CLI chat
area within 0.5 s** of the user pressing Enter, the way `jev-codex` (~0.1 s), `jev-claude`
(~0.2 s) and `jev-agy` (~0.3 s) already do. The decision must show on every routed turn,
including turns where the model's first reply is a tool call.

## Observed (screenshot, 2026-09-29 16:54)

- Prompt `routing test` in `jev-glm`. The model ran `ls -la`, `search`, `grep`, `cat` first.
  No `[Jev]` line was visible anywhere; the thinking panel said `glm-4.5-air`.
- The decision file `$TMPDIR/jev-claude/glm-13506.json` / `glm-29120.json` shows the turn
  **was** routed (`glm-5.3-flash`, effort `low`, reason `jev`). Routing works; only the
  display is missing.

## Why the current design cannot meet it

- The proxy injects the note as the first streamed content chunk. The ZAI CLI buffers the
  **entire** model stream before rendering anything (`zai-agent.js:580`, "Process ENTIRE
  stream before continuing"), so the note appears only when the answer does.
- When that first reply is a tool call, the CLI never renders assistant content at all, so
  the note is dropped. That is what the screenshot shows.
- The terminal-title fallback added earlier reaches ~0.4–0.5 s but is outside the chat area
  and does not satisfy the target.

## Constraints

- Do not patch the installed ZAI CLI; updates would overwrite it.
- Jev's remote call costs ~0.3–0.5 s and is the floor for a Jev-backed decision.
- The routed model must never read Jev's note or any scaffolding the proxy adds.
- Tool continuations keep the turn's model and effort; no extra Jev calls.
