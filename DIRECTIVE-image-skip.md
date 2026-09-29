# Directive: skip image description when the prompt text is ≥ 200 characters

Source of intent: [Intend-image-skip.md](Intend-image-skip.md). Read it first.

1. **Shared rule (`src/image-describe.mjs`)**
   - `DESCRIBE_PROMPT_MIN_CHARS = 200`.
   - `shouldDescribeImages(text)`: `true` when the trimmed text is shorter than 200 chars.
     Callers pass text with image paths already removed.

2. **Claude (`src/proxy.mjs`)** — describe only when `turnImages(body).length` and
   `shouldDescribeImages(prompt)`. Otherwise pass `null` descriptions so Jev sees the
   "attached, not described" marker.

3. **Codex (`src/codex-proxy.mjs`)** — same condition around `describe`.

4. **AGY (`src/agy-proxy.mjs`)** — in `choose`, measure the prompt with every image path
   mention removed; describe only when `shouldDescribeImages` of that text. When skipped,
   `agyPromptWithImages(prompt, images, null)` still marks the images.

5. **Tests** — per CLI: a short prompt + image calls `describe` once; a ≥ 200-char prompt
   + image calls it zero times and Jev still gets the marker. AGY: a long path plus a short
   request still counts as short. `npm test` fully green.

6. **Report** — result and test output appended to this file under `## Result`.

## Result (2026-09-29)

- Steps 1–5 done. `shouldDescribeImages` in `src/image-describe.mjs` (200 chars) gates the
  describe call in `src/proxy.mjs`, `src/codex-proxy.mjs` and `src/agy-proxy.mjs`.
- AGY measures the prompt with pasted image paths removed.
- New tests: AGY long-text skip + path-not-counted; Claude and Codex short (describe ×1)
  vs ≥ 200 chars (describe ×0, "attached, not described" marker).
- `npm test`: 134 tests, 134 pass, 0 fail.
- Not done: live-account run (out of scope per Intend).

### Live verification (2026-09-29, real accounts, screenshot reading "ERROR 4417: PURPLE ZEBRA")

| CLI | Prompt | Described? | Evidence |
| --- | --- | --- | --- |
| jev-agy | "이거 봐줘" | yes, imageMs=2734 | answer quotes PURPLE ZEBRA |
| jev-agy | 220 chars | no, imageMs=-, Jev 405ms | answer quotes PURPLE ZEBRA |
| jev-codex | "이거 봐줘" | yes | Jev prompt ends `[image 1: … ERROR 4417 …]` |
| jev-codex | 220 chars | no | Jev prompt ends `[image 1 attached, not described]` |
| jev-claude | "이거 봐줘" | yes (Haiku, subscription auth) | Jev prompt ends `[image 1: … ERROR 4417 …]` |
| jev-claude | 220 chars | no | answer quotes PURPLE ZEBRA |

Bug found live and fixed: Codex (`<image path="…">`) and Claude Code (`[Image: source: …]`)
write image placeholders into the text; the path alone pushed "이거 봐줘" past 200 chars.
`shouldDescribeImages` now strips them. `npm test`: 135/135.
