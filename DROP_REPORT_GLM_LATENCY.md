# DROP: jev-glm routing decision in the chat area within 0.5 s

Date: 2026-09-29
Verdict: **DROP**. 2 of 3 tries met the 500 ms target; try 2 missed it (589 ms). The turn itself continued normally in every try.

## Target

The text `[Jev] routed this turn to ...` (or `[Jev] unavailable`) must appear in the chat area of `jev-glm` (not inside an `ESC ]0; ... BEL` title escape) within 500 ms of pressing Enter.

## Method

- Independent QA harness (`scratchpad/qa/tui_probe2.py`): a Python `pty` drove the real interactive `node bin/jev-glm.mjs` (ZAI CLI through the `glm` wrapper, 140x40, `JEV_DEBUG=1`), one fresh process per try.
- It waited for `Ask me anything`, typed the prompt, timestamped Enter, and timestamped every `read()` from the pty.
- The output was stripped of all escape sequences (OSC title, CSI, 2-byte ESC) with a byte-position map; the first `[Jev] routed this turn to` / `[Jev] unavailable` match in the stripped text is by construction outside any title escape. Its raw byte position was mapped to the time of the read that delivered it. The title escape time was recorded separately for reference.
- Enter times were cross-checked against the proxy's own decision log line in `~/.jev-claude.log` (`[jev] glm ... -> model/effort`).
- Each try had a 60 s budget; the process group was killed with SIGINT/SIGTERM/SIGKILL and a hard alarm, so shutdown cannot hang.

## Results

| Try | Prompt | Enter→title | Enter→chat line | Proxy decision log (from Enter) | vs 500 ms |
|---|---|---|---|---|---|
| 1 | routing test | 425 ms (`glm-5.3-flash · low`) | **484 ms** | 425 ms | PASS |
| 2 | refactor the auth module to use JWT | 530 ms (`glm-5.3 · high`) | **589 ms** | 529 ms | FAIL |
| 3 | hi | 369 ms (`glm-5.3-flash · low`) | **422 ms** | 369 ms | PASS |

Chat line rendered as `⏺ Bash(echo '[Jev] routed this turn to ...')` followed by `⎿ ✓ echo ...` and the echo output.

Turn continuation (try 1, observed for 45 s after Enter): after the echo block the model's real turn ran (`Bash(ls -la)`, `Bash(ls test/ && grep ...)`, "Executing tools: 6/6 completed", "Compiling..."). The fast path did not break the turn.

## Root cause

The synthetic `bash` tool call works: the chat line appears a constant 53–59 ms after the proxy's decision (chat minus title: 58.6 / 59.0 / 52.7 ms). The remaining 369–530 ms is Enter → proxy decision, which is dominated by the remote Jev (`api.typesafe.ai`) round trip in `askJev()`, and that time varies per prompt. The earlier report measured 290–490 ms for warm `askJev()` calls and about 300 ms time-to-first-byte for a bare `HEAD`. With a ~55 ms render cost, the target is only met when Jev answers in under ~445 ms, which it did in 2 of 3 tries. There is no headroom in this repo's code: proxy, CLI and render overhead together are already under 60 ms.

## What 0.5 s would require

- **Faster or more consistent Jev API:** p100 under ~440 ms per call. Outside this repo's control.
- **Local or provisional decision:** show a heuristic/local decision immediately and correct it when Jev answers. Trade-off: the first shown decision may be wrong and would change mid-turn, and the synthetic tool call cannot be edited once rendered.
- **Relax the target:** 0.5 s is a coin flip against the current API latency; ~0.65 s would have covered all three measured tries.

## Evidence files

`scratchpad/qa/t1.raw`, `t2.raw`, `t3.raw` (raw pty bytes) and `*.raw.txt` (stripped, de-duplicated text) in the session scratchpad `qa/` directory.
