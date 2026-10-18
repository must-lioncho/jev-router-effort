# Directive: strip Jev notes from Claude history

Single writer: jev-router-improver.

## Owned files

- `src/proxy.mjs`: add `stripClaudeNotes(body)`; call it on every `/v1/messages` request
  before forwarding.
- `test/proxy.test.mjs`: regression tests.
- `issue/2026-10-18-claude-note-history/{intend,directive,result}.md`

Not changed: routing policy, `docs/routing-policy.json`, `docs/routing-evidence.md` (no
routing change), Codex/AGY/GLM proxies.

## Rules

- Only assistant messages. Only leading lines of a text block that start with
  `[Jev] routed this turn to ` or `[Jev] unavailable;` (whole line, which covers the
  capabilities sentence), plus blank lines between them.
- A text block left empty is dropped; an assistant message left with no content is dropped.
- `tool_use`, `thinking`, `redacted_thinking` and user messages are never modified.

## Checks

- Stacked fake notes removed; content after them preserved byte for byte.
- `[Jev]` text in the middle of a reply and in user messages is preserved.
- tool_use blocks and their order unchanged.
- Streaming still inserts exactly one note per new turn.
- `npm test` passes.
