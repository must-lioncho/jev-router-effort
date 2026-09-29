# Directive: image-aware routing and forwarding for `jev-agy`

Source of intent: [Intend-agy-image.md](Intend-agy-image.md). Read it first; QA scores
against it.

0. **Evidence first (no code).** Find AGY's local conversation/trajectory store for the
   failing session (search under `~/.gemini`, `~/.antigravity`, `~/Library/Application Support`
   for recent files mentioning `orca-paste-1790680433453`). Record whether the model called a
   file/image viewer on that PNG. Also confirm with `JEV_DUMP=<scratch>/dump` on one real
   `jev-agy -p` run that a pasted path arrives as plain text with no `inlineData`. Write the
   findings into `DROP_REPORT_AGY_IMAGE.md` (§ Evidence) regardless of outcome.

1. **Image extraction (`src/agy-proxy.mjs`)**
   - `agyImagePaths(prompt)`: absolute paths ending in `png|jpg|jpeg|gif|webp`
     (case-insensitive), deduplicated, that exist and are ≤ 7 MB. Pure except for `fs.stat`.
   - `attachAgyImages(body, paths)`: appends `{ inlineData: { mimeType, data: <base64> } }`
     parts to the last user content, skipping if that content already has any `inlineData`
     or `fileData` part. Only on new turns.

2. **Description for Jev**
   - `describeAgyImages({ paths, headers, catalog, upstream, deadlineMs = 4000 })`: pick the
     fastest vision-capable Gemini flash/lite model present in the catalog (prefer the model
     AGY itself uses for titles/checkpoints if identifiable; else lowest-tier flash). Send one
     `:generateContent` (non-stream) request via the same upstream with the forwarded request
     headers (minus hop-by-hop/length), containing the images and the instruction:
     "Describe each image factually in ≤ 60 words: what UI/code/error is shown, visible text,
     and anything broken." Mirror the request envelope shape AGY uses (`model`, `project`,
     `request`) — copy `project`/`requestType`-like fields from the turn body; use
     `requestType` of a non-agent kind if AGY has one (check a `JEV_DUMP` of a title call).
   - Returns one string per image or `null` on any failure/timeout. Never throws.
   - In `choose`, build the Jev prompt by replacing each path with
     `[image: <description>]` (or `[image attached: <basename>, not described]`). The
     forwarded body keeps the original text plus the attached image.
   - Record `imageMs` and image count in the decision record and in the debug timing line.
   - Text-only turns: skip entirely.

3. **Tests (`test/agy-proxy.test.mjs`)** against the fake upstream, using a tiny PNG
   written to a temp dir: attachment added once; existing `inlineData` respected; missing /
   oversized / non-image paths ignored; description request hits the fake upstream with a
   catalog model and the forwarded auth header; Jev receives `[image: …]`; description
   timeout → fallback text and the turn still routes; text-only turn → zero extra upstream
   requests; tool continuation → no attach, no describe. Keep every existing test green.

4. **Real verification**: `npm test`; then a real `jev-agy -p` run with `JEV_DEBUG=1` and a
   real screenshot whose content cannot be guessed from the file name (make one with
   `screencapture` of a window with distinctive text). Confirm (a) the answer mentions that
   text, (b) the decision file's `jev.request.state.request` contains `[image: …]`,
   (c) measured `imageMs`. Paste the evidence into `DROP_REPORT_AGY_IMAGE.md` (§ Result).

5. **Docs**: README.md and README.kr.md AGY section: image paths are attached for the
   model and described for Jev; state the measured latency cost and fail-open behaviour.

Rules: preserve the pending uncommitted edits in `src/agy-proxy.mjs` and
`test/agy-proxy.test.mjs`; do not commit; never log or print the OAuth token, image bytes,
or descriptions outside `JEV_DEBUG`. Match the surrounding code style (small pure helpers,
comment only the non-obvious).
