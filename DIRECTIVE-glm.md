# Directive: fast visible decision for `jev-glm`

Source of intent: [Intend-glm.md](Intend-glm.md).

The ZAI CLI renders a **tool call** the moment its stream ends, and `echo` is on its
read-only list, so it runs without confirmation. The proxy therefore answers the first
request of each routed turn itself, with a synthetic `bash` tool call whose command echoes
the decision. The CLI shows it at once, runs `echo`, and sends the tool result back; the
proxy strips the synthetic exchange and forwards the real request to the routed model.

1. **Proxy (`src/glm-proxy.mjs`)**
   - On a new user turn: ask Jev, then respond immediately (stream or non-stream, matching
     the request) with one assistant message: `tool_calls = [{ id: "jev-note-<n>", type:
     "function", function: { name: "bash", arguments: { command: "echo '<decision line>'" } } }]`,
     `finish_reason: "tool_calls"`. Do not contact z.ai for this request.
   - On the follow-up whose last message is `role: "tool"` with `tool_call_id` starting with
     `jev-note-`: remove every synthetic assistant/tool pair from `messages`, apply the
     stored model and `reasoning_effort`, and forward to z.ai as today.
   - Keep the `[Jev]` line out of the model's context: `stripGlmNotes` removes synthetic
     pairs from any later history as well.
   - Keep `onDecision` (terminal title) and `writeDecision` (status file).
   - If Jev fails, still show `[Jev] unavailable; using <model>.` the same way.
2. **CLI (`src/glm-cli.mjs`)**: unchanged apart from the title text.
3. **Tests (`test/glm-proxy.test.mjs`)**: the first request returns the synthetic tool
   call without any upstream request; the follow-up strips the pair and forwards with the
   routed model and effort; later turns never contain `jev-note-` messages; non-stream
   requests get a JSON tool-call response.
4. **Verification**: an independent QA sub-agent drives the real `jev-glm` TUI in a pty and
   measures Enter → `[Jev] routed` visible in the chat area, three tries, target < 0.5 s
   on all three. Miss → `DROP_REPORT_GLM_LATENCY.md` is updated with the result.
5. **Docs**: README (EN/KR) GLM section describes the echo line and that the model never
   sees it.
