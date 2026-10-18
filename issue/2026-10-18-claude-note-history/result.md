# Result: strip Jev notes from Claude history

## Changed

- `src/proxy.mjs`: new `stripClaudeNotes(body)` removes leading `[Jev] routed this turn to …`
  / `[Jev] unavailable; …` lines (whole line, so the capabilities sentence goes too) from
  assistant text in `messages`, drops a text block or assistant message left empty, and never
  touches user messages, `tool_use` or `thinking` blocks. Called on every `/v1/messages`
  request before routing and forwarding, for routed and manual-model requests alike.
- `test/proxy.test.mjs`: two regression tests (unit cleanup cases; end-to-end proxy that
  checks forwarded history and the streamed note count).

Routing policy and evidence docs are unchanged; routing decisions were not part of the defect.

## Checks

- `node --test test/proxy.test.mjs`: 41/41 pass. With the call disabled, the end-to-end test
  fails (stacked notes forwarded), so the test catches the regression.
- `npm test`: 271 tests, 271 pass, 0 fail.
- Replay of the worst session transcript (`claude:26d8fea0-…`, 515 assistant entries) through
  `stripClaudeNotes`: blocks opening with a Jev note 69 → 0; `tool_use` blocks 336 → 336.

## Coverage and limitations

- Evidence: 24h window, 273 Claude transcripts scanned directly; 42 carried notes, 11 stacked
  (92 stacked turns). Analyzer run `24h-20261018T142259Z` recorded; feedback `fb-78b7b4c197`
  is unverified.
- Not measured live: that the model stops imitating after the fix. Expected because it no
  longer sees notes in history, but a long session after restart is the real check.
- Effect on prompt caching: the first request after restart re-writes history once (notes
  removed), so that request misses the cache; later requests strip identically and cache
  normally. Not measured.
- Running jev-claude processes loaded the old module; they need a restart. The global
  install links to this checkout, so new sessions get the fix.

## Remaining

- Codex proxy emits the note as a separate commentary message item and does not remove it
  from `input`. No stacking evidence for Codex in this window was collected; left unchanged.
