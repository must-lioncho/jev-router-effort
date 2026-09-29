# Drop report: image-aware routing for `jev-agy`

Date: 2026-09-29. Serves [Intend-agy-image.md](Intend-agy-image.md) via
[DIRECTIVE-agy-image.md](DIRECTIVE-agy-image.md). Nothing committed.

## Evidence

### Did AGY/Gemini open the pasted image in the failing session? — Not found (it did not)

Search: `grep -rl orca-paste-1790680433453` under `~/.gemini`, `~/.antigravity` (does not
exist) and `~/Library/Application Support` (no AGY store there). Matches:

- `~/.gemini/antigravity-cli/history.jsonl` (prompt history only)
- `~/.gemini/antigravity-cli/log/cli-20260929_164348.log` (`HandleUserInput called with text: "/var/folders/…/orca-paste-1790680433453-….png 왼쪽 메뉴에다가 Publisher…`)
- `~/.gemini/antigravity-cli/brain/1b8720a9-1b73-42bf-af20-e2c80da9855f/.system_generated/logs/transcript_full.jsonl`
  (and `transcript.jsonl` plus their `chunks/` copies) — the trajectory of the failing session.

Read of `transcript_full.jsonl` (45 steps):

- Step 0 (USER_INPUT, 11:20:03Z): the path is plain text inside `<USER_REQUEST>`.
- Step 1 (model reply to that turn): only `[Jev] routed this turn to gemini-pro-agent (jev, confidence 0.57).` — no tool calls.
- All tool calls in the whole trajectory: `run_command` (ls, git …), `write_to_file`,
  `invoke_subagent`. Zero `view_file` or any other call referencing a `.png`.
  `.png` strings appear only in the two USER_INPUT steps (0, 22) and in `git` output (28, 30).
- No other `brain/` trajectory (subagents included) mentions the file.

Conclusion: neither the main agent nor its subagents ever opened the screenshot; the model
worked from the text alone.

### Does a pasted path arrive with any image data? — No

Baseline run before any change (`JEV_DEBUG=1 JEV_DUMP=<scratch>/step0/dump node bin/jev-anti.mjs -p "<that png path> Without using any tools … reply exactly NO_IMAGE_PIXELS."`):

- Answer: `NO_IMAGE_PIXELS` (routed to `gemini-3.8-flash-low`).
- Dump of the agent request (`requestType: "agent"`): last user content has a single `text`
  part; no `inlineData`, no `fileData` anywhere in the body.
- Dump of AGY's title request: `model: "gemini-3.5-flash-lite"`, `requestType: "checkpoint"`,
  `requestId: "checkpoint/<uuid>"`, envelope `project, requestId, request{contents,
  systemInstruction, generationConfig, sessionId}, model, userAgent, requestType`. The
  description call mirrors this envelope (without the title system instruction).
- Real catalog (`fetchAvailableModels`): every flash model carries `supportsImages: true`;
  `tieredModelIds.flashLite = ["gemini-3.5-flash-lite"]`.

## Result

Loop 3, after QA loop 2 (88/100) and the corrected Acceptance 1.

### Implementation (`src/agy-proxy.mjs`)

- `agyImagePaths(prompt, maxTotal)`: finds absolute `png|jpg|jpeg|gif|webp` paths written
  plainly, in `"…"`/`'…'` quotes (spaces allowed), or with backslash-escaped spaces
  (`Screenshot\ … at\ ….png`, U+202F allowed). Duplicates are removed. It keeps files of
  1 B–7 MB whose magic bytes match (`agyImageType`: PNG `89504E47`, JPEG `FFD8FF`, GIF
  `GIF8`, WebP `RIFF….WEBP`), up to 14 MB in total. The MIME type comes from the bytes.
- Per-conversation cache keyed by `agyConversationKey`: path →
  `{mtimeMs, size, mimeType, data}`. The new turn fills it; the description step reads from
  the same cache, so both send identical bytes. Caches are kept in least-recently-used order
  under a proxy-wide budget of 64 MB of cached base64 (`imageBudgetBytes`). Over budget, whole
  conversation caches are evicted, oldest first, and empty conversation maps are deleted.
- `attachAgyImages(body, cache, { maxTotal, maxTurns })` runs on every generate request
  except AGY's `checkpoint` title calls. Any user content whose `<USER_REQUEST>` names image
  paths and has no `inlineData`/`fileData` gets the cached parts, newest turn first, within
  14 MB per request. The file size is checked against the remaining room before any bytes are
  read. A changed file is re-read, a missing one is dropped, and entries the request no longer
  uses are evicted. Continuations and later turns never call the describer. The function
  returns `{ paths, turns }`.
- Image rejection only (400, 413, 422) triggers a resend with fewer images:
  - On 413, or on 400 when images from more than one turn were attached, the proxy first
    retries with only the newest turn's images, then with none. On 422, or a 400 with a
    single turn, it goes straight to none.
  - This happens before any other handling, including routed turns whose decision note was
    already written.
  - Paths are evicted only when the smaller resend succeeds.
- Other statuses keep the images:
  - 429 and 5xx go through the existing `RETRYABLE` backoff with the images still attached.
  - 401, 403, 404, 408 and other statuses pass through with no resend.
- `describeAgyImages` changes:
  - A timeout is detected by `err.name` or `err.cause?.name === "TimeoutError"`.
  - `described N image(s)` is logged only when a description came back; otherwise
    `agy image description empty` is logged.
  - Each description is trimmed to 400 chars.
  - All of these lines are `JEV_DEBUG`-only.
- `JEV_DUMP` now writes the forwarded body, after routing and attaching. Every
  `inlineData.data` is replaced by `<N base64 chars>`, so image bytes are never written.

### `npm test`

```
# tests 125
# pass 125
# fail 0
```

New or changed tests:
- Magic bytes: a fake `.png` is rejected; JPEG, GIF and WebP are detected; RIFF-WAVE is rejected.
- Quoted and backslash-escaped macOS screenshot paths.
- The total cap applies to both the description payload and the attach (newest turn first).
- Cache fill, messages that already carry media are left alone, and `checkpoint` calls are
  skipped.
- "A continuation re-attaches the same bytes with zero describe calls".
- A follow-up turn keeps the earlier image and does not describe it again.
- A single-turn 400 is resent once without images, both on a routed turn (after the note was
  written) and on a manual turn.
- A 4xx on a request without attached images is passed through after one call.
- 429 → 200: the retry still carries `inlineData`, and the next continuation re-attaches.
- 401 is sent exactly once and passed through.
- 413 with images from two turns: the first retry carries only the newest turn's image, and a
  later continuation keeps the dropped image dropped.
- Two conversations over a small budget: the older conversation's cache is evicted and the
  newer one keeps its image.
- Description timeout, and trimming of long descriptions.

### Real run: tool first, then the image, without any tool touching the image

**What the loop 2 run actually showed.** That run (trajectory
`~/.gemini/antigravity-cli/brain/52a2fc95-9bc0-4cd8-8b46-f6443edd32a1`) called `run_command ls -la`
and then `view_file` on `img-a.png`, then on `answer.txt` and `readme.txt`. Its quote after the
tool call could have come from `view_file`, so it does not prove the re-attached pixels were
used. It only proved that the continuations carried `inlineData`.

**Loop 3 run.** It ran in a new scratch dir, `<scratch>/real3`. `--dangerously-skip-permissions`
was used only with the cwd inside the scratchpad.

`JEV_DEBUG=1 JEV_DUMP=<scratch>/real3/dump node bin/jev-anti.mjs --dangerously-skip-permissions -p "First list the files in the current directory with a tool. Then, without opening, viewing or reading the image file with any tool, quote every line of text in <scratch>/real3/img-b.png from the image you were given." --print-timeout 180s`

- **Trajectory** `~/.gemini/antigravity-cli/brain/1a6e24e6-e359-456d-a2e2-2aa7b440873c/.system_generated/logs/transcript_full.jsonl`:
  four steps (USER_INPUT, PLANNER_RESPONSE with `run_command ls -la`, GENERIC, and the final
  PLANNER_RESPONSE). The only tool call is `ls -la`; no tool touched the png. The fallback
  retry with the png outside the cwd was therefore not needed.
- **Answer:** the directory listing, then `ORCHID-7319`,
  `The purple walrus refuses to deploy on Thursdays.`,
  `ERROR: quota for teacups exceeded (42/41)`, `note.txt`, and the clipped dialog fragments
  `“C` / `ac` / `fol`.
- **Forwarded requests (`JEV_DUMP`):**

  | Request | contents | last part | inlineData |
  | --- | --- | --- | --- |
  | checkpoint (title) | 1 | text | none |
  | agent, new turn | 1 | text+inlineData | contents[0] image/png, 169260 base64 chars |
  | agent, continuation (produced the answer) | 3 | functionResponse | contents[0] image/png, 169260 base64 chars |

- **The pixels were the only source.** The continuation's forwarded history contains no
  `ORCHID`/`walrus` text. The first step's thinking mentioned it, but AGY did not replay that
  as text, so the answer written in the continuation came from the re-attached pixels.
- **Describe ran once:** `agy described 1 image(s) with gemini-3.5-flash-lite` appears once in
  stderr. The continuation's timing line shows `images=1 imageMs=-`.
- **Decision record** `$TMPDIR/jev-claude/agy-7783.json`: `images: 1`, `imageMs: 2482`. Its
  `jev.request.state.request` is: `First list the files in the current directory with a tool. Then, without opening, viewing or reading the image file with any tool, quote every line of text in [image: A text editor window named "note.txt" displays the code/text: "ORCHID-7319", "The purple walrus refuses to deploy on Thursdays.", and "ERROR: quota for teacups exceeded (42/41)". A partially visible notification window is on the right.] from the image you were given.`
- **Nothing private in the dumps:** they contain neither the description nor any
  `ya29.`/`Bearer ` string.

### Real runs from loop 1 (same screenshot, single step)

- The screenshot is `screencapture -x -R263,132,673,439` of a TextEdit window. The file name
  reveals nothing about its content.
- Answers across the four runs:
  - All lines quoted, including `“C` / `ac` / `fol`.
  - `The ID code is ORCHID-7319 and the error quota ratio is 42/41.`
  - `Walrus`
  - `Thursday`
- **Text-only control run:** `images=0`, and no description call was made.
- **Fail-open seen live:** a trial with `thinkingBudget: 0` got HTTP 400 from the description
  call. Jev received `[image attached: capture-01.png, not described] …`, the turn was routed,
  and the model still answered `7319` from the pixels. The setting was reverted to
  `thinkingLevel: "LOW"`.
- **Measured `imageMs`** over all six successful real runs: 2712, 1904, 1734, 2873, 1976 and
  2482 ms (median about 2.2 s).

## Not done / open

### Decision: the AGY routing ceiling

**Question:** with Claude excluded from AGY routing (the pending uncommitted edit), should
AGY turns be able to go higher than Gemini Pro?

In session `agy-3360`, Jev already picked `gemini-pro-agent`, the strongest model it may
route to. A better image description could not have raised that turn.

1. Keep Claude excluded. Gemini Pro (`gemini-pro-agent` / `gemini-3.1-pro-*`) stays the
   ceiling. No work, no risk. Hard turns cap at Gemini Pro.
2. Re-enable Claude for new turns only, and strip thinking parts from the history sent to it.
   This raises the ceiling, but it needs a proven signature-safe history rewrite and a live
   test that Claude accepts it.
3. Route Claude-worthy turns outside AGY, for example by suggesting `jev-claude` when Jev
   scores a turn above Gemini Pro. AGY itself stays unchanged, but the user switches tools.

**Recommendation:** option 1 now, since it is the current and tested behaviour and the README
now states it. Treat option 2 as a separate experiment with its own live test before enabling
it.

### Other notes

- `-p` does not run tools without approval. The tool-first real runs used
  `--dangerously-skip-permissions`, with the cwd inside the scratchpad only.
- Every real run ends with a `JEV_DEBUG`-only `agy upstream error on
  /v1internal:recordTrajectoryAnalytics: socket hang up`. AGY's analytics call is still in
  flight when `-p` exits, and the existing close handler cancels it. The turn is not affected.
- Re-attaching resends the image bytes (up to 14 MB) on every continuation, which is the cost
  of the model keeping the pixels.
- Known limit: when the ~64 MB cache budget evicts an idle conversation, that conversation's
  later requests carry no image until the screenshot is pasted again (only a `JEV_DEBUG` line
  records it).
- The loop-3 continuation replays step 1's `thoughtSignature`, which may carry reasoning about
  the image. The dumps prove the pixels were present on the continuation; the quoted answer is
  strong but not strict proof that they were re-read.

## QA verdict

Independent QA sub-agent, scored against `Intend-agy-image.md`: loop 1 87 (DENY), loop 2 88
(DENY), loop 3 **94 (PASS)**. After the pass, the image-rejection resend returns early when
AGY has already closed the connection.