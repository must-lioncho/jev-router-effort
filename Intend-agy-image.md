# Intend: `jev-agy` turns that carry a screenshot are routed and answered with the image seen

Date: 2026-09-29.

When a user pastes a screenshot into `jev-agy` (Orca pastes it as a local path such as
`/var/folders/…/T/orca-paste-….png` inside the prompt text), two things must hold:

1. **The routed model actually sees the image.** Gemini is multimodal, but it can only use
   pixels it is given.
2. **Jev's routing decision accounts for the image.** Jev is text-only, so the proxy must turn
   the image into text Jev can weigh, as the user proposed: a vision-capable model describes
   it first, and that description is part of the routing input.

## Observed (2026-09-29 20:20 KST, session `agy-3360`)

Evidence: `$TMPDIR/jev-claude/agy-3360.json` (exact Jev request/response per turn).

| Turn | Prompt chars | Jev pick (prob) | Confidence | Candidates |
| --- | --- | --- | --- | --- |
| Publisher plugin + screenshot | 1,332 | `gemini-pro-agent` (0.61) | 0.57 | 11 Gemini IDs, no Claude |
| Intend/Directive/QA loop | 319 | `gemini-pro-agent` (0.69) | 0.66 | same |
| "UI is broken" + screenshot | 553 | `gemini-pro-agent` (0.74) | 0.71 | same |

- **Length was not the failure.** 1,332 chars reached Jev untruncated; Jev answered inside
  the deadline. There is no 3,000-char limit in the code path (`agyNewTurnPrompt` → `askJev`).
- **The image never reached anyone as an image.** `contextTokens = 453` (≈1.8k JSON chars)
  for a 1,332-char prompt: the request contained only text. No `inlineData`. Jev saw a file
  path; Gemini saw a file path and would only see the pixels if it chose to open the file
  with a tool. Whether it did is not yet known (see Directive step 0).
- **Routing picked the ceiling.** `gemini-pro-agent` is the strongest routable AGY model.
  The pending, uncommitted change in `src/agy-proxy.mjs` removes Claude from AGY routing
  ("Claude through AGY rejects replayed thinking parts without a signature"). So a better
  Jev answer could not have produced a stronger model for this turn.

## Required outcome

- New turn with one or more readable local image paths in `<USER_REQUEST>`:
  - The proxy attaches each image to the forwarded user message as `inlineData`
    (correct `mimeType`), unless AGY already attached image data. The model then sees the
    image without needing a tool call.
  - Before asking Jev, the proxy asks a fast vision-capable model from the signed-in AGY
    catalog (through the same upstream, same forwarded headers) for a short factual
    description of each image. Jev receives the prompt with the path replaced or annotated
    by `[image: <description>]`.
  - The description is routing input only. It is never inserted into the routed model's
    context; the model gets the real image.
- Hard latency budget for the description step (≤ 4 s total); on timeout or any error, fall
  back to `[image attached: <file name>, not described]` and route anyway. Routing stays
  fail-open.
- Text-only turns behave exactly as today: no extra upstream call, no added latency.
- Tool continuations and later turns **re-attach** the images (from a per-conversation
  cache, same bytes) but **never re-describe** them. AGY's history does not keep the
  proxy-attached `inlineData`, so without this the model loses the pixels after its first
  tool call — exactly the multi-step coding case that failed. *(Amended after QA loop 1.)*
- Size/type guard: only `png|jpg|jpeg|gif|webp` whose magic bytes match, only files that
  exist, per-image cap (7 MB) and a per-request total cap (≈14 MB raw); over the cap, paths
  stay as text.
- An upstream 4xx on a request carrying proxy-attached images is retried once without them
  before the error reaches AGY, so a bad image never breaks a turn.

## Constraints

- Preserve the pending uncommitted edits in `src/agy-proxy.mjs` and `test/agy-proxy.test.mjs`
  (Claude excluded from AGY routing). Build on top; do not revert. Do not commit.
- Never read, print, log or store the OAuth token. Extra upstream calls reuse the forwarded
  headers as received.
- Never log image bytes or the description at non-debug level (prompts are private).
- Jev's notes and the description never enter the model's history.
- Only models present in the signed-in catalog may be used for description; never invent an ID.

## Acceptance (QA scores against this file; ≥ 90/100 passes)

1. `npm test` green, with new tests: image path → `inlineData` attached; description call
   made once per new turn and fed to Jev; description timeout → fallback text, turn still
   routed; text-only turn makes zero extra upstream calls; continuations and later turns
   re-attach from cache with zero describe calls; only an image rejection (400/413/422)
   triggers a resend without images, while 429/5xx keep the images through the normal
   retry path.
2. Step-0 finding recorded: whether AGY/Gemini opened the pasted image in the failing
   session (from AGY's own logs/trajectory), stated as found / not found with the path read.
3. A real `jev-agy -p` run with a real screenshot path: the model's answer describes
   content that is only in the image (proves it saw pixels), and the decision record shows
   the `[image: …]` text in Jev's request.
4. Timing of the description step measured on the real run and reported.
5. README (EN/KR) AGY section documents image handling and the latency cost.
6. The ceiling finding (Claude excluded ⇒ Gemini Pro is the maximum) is reported to the
   user as a separate decision, not silently changed.
