# Intend: stop Jev routing notes from stacking in jev-claude answers

## Report

Lion reported that in a long jev-claude session each answer began with a growing stack of
`[Jev] routed this turn to claude-opus-5-5 (...)` lines: one at first, up to about twelve per
turn, with varying confidence values, including turns with no tool calls.

## Cause

`src/proxy.mjs` prepends one `routingNotice` line to the first text delta of a new user
turn. Claude Code stores that text as part of the assistant message and sends it back in
`messages` on every later request. The Claude proxy forwarded that history unchanged, so the
model read its own earlier turns as starting with `[Jev] ...` lines and began writing such
lines itself. The real note is then added in front of the imitations, so the stack grows over
the session. The AGY proxy (`stripAgyNotes`) and the GLM proxy (echo exchange removed) already
keep notes out of history; the Claude proxy did not.

Routing decisions are not affected. The defect is display noise, wasted output tokens and
fabricated routing claims (the imitated confidence values were never produced by Jev).

## Evidence (local, 24h window ending 2026-10-18T14:23Z)

- Analyzer run `24h-20261018T142259Z`: 283 distinct sessions, 240 eligible.
- Direct scan of 273 Claude transcripts modified in the window, first text block of each
  assistant message: 42 sessions carried at least one leading Jev note (268 note turns);
  11 sessions had stacked notes (more than one leading `[Jev]` line), 92 stacked turns.
- Worst session `claude:26d8fea0-…`: 68 note turns, 38 stacked, maximum 12 lines in one turn.
  Recorded as feedback `fb-78b7b4c197` (user, failure, unverified).
- Count series in affected sessions rise with turn index (e.g. `1,1,2,1,2,2,2,2,2,3`).

Text matching here detects the symptom; it does not label routing quality.

## Intent

Remove Jev notes, real or imitated, from the leading lines of assistant text in history before
forwarding, leaving user content, tool blocks, thinking blocks and all other text unchanged.
The live stream must still show exactly one note per new turn.
