# Image-reading benchmark: agy / claude / codex / GLM

Date: 2026-09-29, 18:21-18:43 IST (12:51-13:13 UTC). Intent: [Intend-image-bench.md](Intend-image-bench.md). Directive: [DIRECTIVE-image-bench.md](DIRECTIVE-image-bench.md).
Raw data (scripts, every stdout/stderr, timings, grades):
`/private/tmp/claude-501/-Users-lioncho-Work-lion-personal-jev-router/b43ef7a4-dd7d-4d8e-86aa-7e227b863fa4/scratchpad/bench/` (`harness.mjs`, `results.jsonl`, `runs/`, `scored.json`, `grades.json`, `floor.log`).

## Result

- Every CLI was called directly, not through `jev-*` wrappers or the Jev proxy. Every image-capable CLI read both images correctly (A 4/4 on all 18 runs of the three CLIs).
- **Fastest at full accuracy: Codex `gpt-6-luna`, 7.3 s median** (A 4/4, B 4/5). Fastest default model: Claude Code default (`claude-opus-5-5`), 9.2 s (A 4/4, B 5/5).
- **GLM cannot read images through the ZAI CLI.** All 12 GLM runs failed, on both default and cheapest models.
- **No CLI process is fast enough for the 4 s description budget.** A text-only "reply OK" takes 5-6 s on Claude/Codex and 14-17 s on AGY, before any image. The 2.2 s direct-HTTP call to `gemini-3.5-flash-lite` that the router uses now was not re-measured here, but it is the only path under the budget.

## Environment

| Item | Value |
| --- | --- |
| Machine / network | one Mac (Darwin 25.6.0), same network, runs sequential and back-to-back, no parallel load from this benchmark |
| Order | round-robin: 3 rounds x (image A, image B) x (eval 1, eval 2) x 4 CLIs; the CLI starting each block rotates every round |
| Runs | 3 per CLI x model x image = 48 runs; median reported |
| `agy` | 1.2.13 (`~/.gemini/antigravity-cli/settings.json` model "Gemini 3.8 Flash (High)") |
| `claude` | 2.1.284 |
| `codex` | codex-cli 0.158.0 (`CODEX_HOME` is the Orca-managed account home; `config.toml`: `model = "gpt-6-astra"`, `model_reasoning_effort = "low"`) |
| ZAI CLI | `zai` 0.3.5 launched through `glm` (as `src/glm-cli.mjs` resolves it: `glm` first, then `zai`); CLI default `glm-4.6` from `~/.zai/user-settings.json` |
| Images | A: `scratchpad/real3/img-b.png` (1346x878, sha1 b5670991...). B: the user's `orca-paste-1790680433453-....png` still existed (278x466, sha1 8be9fee1...). Copies in the bench dir as `imgA.png`, `imgB.png` |
| Working dir | bench dir in the scratchpad for every run. No permission bypass flag used anywhere; no global CLI config changed |

The session that ran this benchmark had `ANTHROPIC_BASE_URL`, `ANTHROPIC_MODEL=jev-router` and related variables pointing Claude Code at the Jev proxy. A first smoke run went through it (`unrecognized_model jev-router`). All measured Claude runs strip every `ANTHROPIC_*` and `CLAUDE*` variable (`cleanenv.mjs`) so they use Claude Code's own login and defaults. The Claude default model resolved to `claude-opus-5-5` (from the stream-json `init` message).

## How each CLI takes an image (headless)

| CLI | Mechanism | Tool turn needed |
| --- | --- | --- |
| Codex | `codex exec -i <png>` attaches the image to the prompt | no (one model turn) |
| Claude Code | path in the prompt + `--allowedTools Read` (Read displays images) | yes (Read, then answer) |
| AGY | path in the prompt; the model opens it with its own `view_file`. `agy --help` shows no image attach flag | yes |
| ZAI CLI | none. `zai --help` has no image or attachment option; the package `dist` has no image handling; its only file tool `view_file` fails with `fs.stat is not a function` on any file | not possible |

Codex therefore sees the image inline while the others spend an extra model round trip on a tool call. That difference is part of what each CLI costs in headless mode.

Prompt (identical for all runs, `$P`): "Describe this image factually in at most 60 words: what UI, code or error is shown, all visible text quoted exactly, and anything broken or cut off. Do not use any tool other than reading the image." Claude, AGY and GLM get ` Image path: <abs path>` appended, because they have no attach flag. Codex gets `-i` and no path.

Effort is low everywhere:

| CLI | Low-effort setting | Verified |
| --- | --- | --- |
| Codex | `-c model_reasoning_effort=low` | printed in the run header (`reasoning effort: low`) |
| Claude Code | `--effort low` | accepted on both models |
| AGY, eval 1 | `--effort low` on the default model | agy log shows `Resolving model gemini-3.8-flash-low`; without the flag no model is forced |
| AGY, eval 2 | effort is part of the model id (`gemini-3.6-flash-low`); `--effort` is rejected on some models (`gemini-3.5-flash-lite`) | run succeeded |
| ZAI CLI | none. `zai` has no reasoning-effort flag and `glm` ignores `--thinking` | n/a |

## Exact commands

`$P` is the prompt above; `$IMG` is the absolute path of `imgA.png` or `imgB.png`. The harness spawns each with `stdin` ignored, cwd = bench dir.

```
# Evaluation 1 (default model)
agy    -p "$P Image path: $IMG" --effort low
claude -p "$P Image path: $IMG" --allowedTools Read --effort low        # env stripped of ANTHROPIC_* / CLAUDE*
codex  exec -i "$IMG" -c model_reasoning_effort=low --skip-git-repo-check -s read-only --ephemeral "$P"
glm    --quiet --prompt "$P Image path: $IMG"                            # = zai -p; default glm-4.6; 90 s timeout

# Evaluation 2 (cheapest image-capable model)
agy    -p "$P Image path: $IMG" --model gemini-3.6-flash-low
claude -p "$P Image path: $IMG" --model haiku --allowedTools Read --effort low
codex  exec -m gpt-6-luna -i "$IMG" -c model_reasoning_effort=low --skip-git-repo-check -s read-only --ephemeral "$P"
ZAI_MODEL=glm-4.6v-flash glm --quiet --prompt "$P Image path: $IMG"      # 90 s timeout
```

## Inventory and price sources

Prices are list API prices per 1M tokens (input / output), read from the provider pages on 2026-09-29 with WebFetch. These CLIs are subscription products, so list price is the proxy for "cheapest". WebFetch summarises the page with a small model; the figures were not cross-checked against a second source.

| CLI | Default (source) | Image-capable models offered | Cheapest image-capable (source) |
| --- | --- | --- | --- |
| Codex | `gpt-6-astra`, $10 / $50 (`config.toml`; `codex debug models`) | all listed: astra, sol, luna, gpt-5.6-sol/terra/luna, gpt-5.5 (`input_modalities` = text,image); hidden `gpt-reserve`, `codex-auto-review` | **`gpt-6-luna`, $0.10 / $0.50**, catalog text "Fast and affordable model for easier tasks". Price page: https://developers.openai.com/api/docs/pricing. `gpt-reserve` has no listed price and is hidden, so excluded |
| Claude Code | `claude-opus-5-5`, $4 / $20 (stream-json `init`) | Opus/Sonnet/Haiku aliases | **`haiku` = `claude-haiku-4-5-20251001`, $1 / $5**; Haiku 3.5 is retired. Page: https://platform.claude.com/docs/en/about-claude/pricing |
| AGY | `Gemini 3.8 Flash (High)` (`settings.json`; catalog `defaultAgentModelId` gemini-3.8-flash-high) | `agy models`: Gemini 3.8/3.7/3.6 Flash (High/Med/Low), 3.1 Pro (High/Low), Claude Sonnet 4.6, Opus 4.6; GPT-OSS 120B has no image flag | Gemini 3.8 / 3.7 / 3.6 Flash all $0.75 / $3.75 (promotional through 2026-12-31, doubles 2027-01-01), so it is a three-way tie; I ran `gemini-3.6-flash-low`. Page: https://ai.google.dev/gemini-api/docs/pricing ("Last updated 2026-09-24 UTC") |
| GLM (ZAI CLI) | `glm-4.6`, $0.6 / $2.2 (text only) | CLI picker: glm-4.6/4.5/4.5-air, all text. z.ai vision models per price page: GLM-4.6V, 4.6V-FlashX, 4.5V, 4.6V-Flash, GLM-OCR | **`glm-4.6v-flash`, free** (next: 4.6V-FlashX $0.04 / $0.4). Page: https://docs.z.ai/guides/overview/pricing |

Not selectable: AGY's own catalog also holds `gemini-3.5-flash-lite` (image-capable, $0.30 / $2.50, the title model and the model the router's description step uses today). `agy --model gemini-3.5-flash-lite` and `--model gemini-3.1-flash-lite` are rejected as "not recognized", so the CLI cannot run the cheapest Gemini model. The catalog file used is from the earlier capture at 17:34 today (`scratchpad/catalog.json`); `agy models` was re-run at 18:15 and matches the selectable list.

## Evaluation 1: default model, low effort

Median of 3 runs per image. Wall and first-byte columns show A / B; the median over all 6 runs is in brackets. Score columns are the median of 3.

| CLI | Model | Effort flag | Median wall s A / B (all 6) | Median first-byte s A / B (all 6) | A score /4 | B score /5 |
| --- | --- | --- | --- | --- | --- | --- |
| claude | claude-opus-5-5 | `--effort low` | 9.5 / 9.2 (9.2) | 8.9 / 8.6 (8.6) | 4 | 5 |
| codex | gpt-6-astra | `-c model_reasoning_effort=low` | 13.0 / 10.1 (11.7) | 12.5 / 9.7 (11.3) | 4 | 4 |
| agy | gemini-3.8-flash-low (default + `--effort low`) | `--effort low` | 21.7 / 21.9 (21.8) | 16.4 / 19.9 (19.0) | 4 | 5 |
| glm | glm-4.6 (default) | none available | 19.7 / 21.9 (21.9) | 19.7 / 21.9 (21.8) | 0 (cannot read image) | 1 (cannot read image) |

## Evaluation 2: cheapest image-capable model, low effort

| CLI | Model | Effort flag | Median wall s A / B (all 6) | Median first-byte s A / B (all 6) | A score /4 | B score /5 |
| --- | --- | --- | --- | --- | --- | --- |
| codex | gpt-6-luna | `-c model_reasoning_effort=low` | 7.5 / 7.2 (7.3) | 7.0 / 6.8 (6.9) | 4 | 4 |
| claude | claude-haiku-4-5 | `--effort low` | 11.9 / 10.6 (10.7) | 11.3 / 10.0 (10.2) | 4 | 4 |
| agy | gemini-3.6-flash-low | in model id | 49.6 / 52.2 (51.3) | 47.4 / 50.1 (49.4) | 4 | 4 |
| glm | glm-4.6v-flash | none available | 90.0 / 73.9 (84.9) | 79.8 / 67.0 (73.9) | 0 (cannot read image) | 1 (cannot read image) |

Per-run wall seconds (image + round):

- eval 1: claude A 8.7 / 9.9 / 9.5, B 9.2 / 9.0 / 9.2. codex A 13.0 / 11.8 / 18.3, B 9.1 / 11.7 / 10.1. agy A 21.7 / 18.9 / 25.8, B 19.9 / 26.2 / 21.9. glm A 31.5 / 19.7 / 16.6, B 21.8 / 21.9 / 34.0.
- eval 2: codex A 7.5 / 7.0 / 8.1, B 6.9 / 7.2 / 8.4. claude A 11.9 / 10.0 / 15.9, B 10.6 / 10.5 / 10.9. agy A 49.6 / 37.4 / 51.5, B 52.2 / 51.0 / 52.2. glm A 90.0 (timeout) / 79.8 / 90.0 (timeout), B 60.1 / 73.9 / 90.0 (timeout).

First-byte is within about 0.5 s of wall for Claude, Codex and GLM: in these headless modes they print the answer once, at the end. AGY prints 2-5 s before exit. None of them streams, so first-byte is not a separate latency.

### GLM failures (recorded, not substituted)

- **Default `glm-4.6` (eval 1), 6 runs:** the model called `view_file` on the PNG, got `Error viewing ...: fs.stat is not a function`, and answered that it cannot see images (A 0/4; on B it produced no description). Some runs then offered OCR via bash instead. It did not fabricate.
- **`glm-4.6v-flash` (eval 2), 6 runs:** 3 timeouts at 90 s with no output; 1 `Z.ai API error: 429 ... temporarily overloaded`; 1 text "I understand, but I don't have a specific response."; 1 "I cannot access the actual content of the image file" after the same `view_file` error. I did not verify whether the coding endpoint serves this model; the CLI never delivered pixels in any case, because it has no way to attach them.
- z.ai documents a Vision MCP server for the coding plan. Installing it means `zai mcp add`, which changes global CLI config, so it was not tried. Whether it works is unverified.

## Scoring

**A (script plus manual read of all 18 non-GLM answers).** One point each for `ORCHID-7319` (any dash), the walrus sentence, `ERROR: quota for teacups exceeded (42/41)`, and the clipped dialog at the right edge. All 18 answers from claude, codex and agy scored 4/4, and none invented a line. Manual notes: Claude default quoted a fragment as "acc" instead of "ac" in two runs (r1, r3); Claude Haiku r2 called the clipped dialog a "right sidebar" and wrote "No code or errors visible" while quoting the ERROR line, and I credited the clipped-element point anyway; Claude Haiku r1 and r3 said "blue element" or "blue panel" without calling it a dialog, also credited. A stricter reader could drop Haiku to 3/4 in those runs; the medians stay 4.

**B (blind).** A separate general-purpose sub-agent, given only the image and 23 shuffled, anonymised answers (the trailing `Summary` / `Status` sections that Claude and AGY add from the user's global instruction files were stripped so they could not identify the CLI), scored each 1-5 with the intent rubric. The key was not shared with it. The one run with no output (GLM timeout) was not graded. Scores of 4 were mostly for a trivial quote slip (`Mac S` for `Mac s`), an omitted highlight, or one wrong icon detail.

| Run set | B scores |
| --- | --- |
| eval 1 claude / agy | 5, 5, 5 / 5, 5, 5 |
| eval 1 codex | 4, 4, 4 |
| eval 2 codex / claude / agy | 4, 4, 4 / 5, 4, 4 / 4, 4, 5 |
| GLM (both evals) | 1 each (could not read the image or API error) |

The B image is small (278x466) and the differences between 4 and 5 are minor; three runs per cell do not separate the top models on B.

Word limit: the 60-word cap was not enforced in scoring. Median answer length: claude default 78, agy eval 2 78, claude haiku 52, agy default 59, codex 48-55. Claude and AGY loaded the user's global instruction files and appended a Summary/Status block, which is what pushes them over 60 words and adds output time.

## Ranking

By median wall time over all 6 runs (fastest first), image-capable CLIs only:

| Rank | Eval 1 (default) | Eval 2 (cheapest) |
| --- | --- | --- |
| 1 | claude `claude-opus-5-5` 9.2 s | codex `gpt-6-luna` 7.3 s |
| 2 | codex `gpt-6-astra` 11.7 s | claude `haiku` 10.7 s |
| 3 | agy `gemini-3.8-flash-low` 21.8 s | agy `gemini-3.6-flash-low` 51.3 s |
| - | glm `glm-4.6`: cannot read images | glm `glm-4.6v-flash`: cannot read images, mostly timeouts |

By speed at A 4/4 (all three qualify in both evals, so the order is the same). By speed at A 4/4 and B median >= 4: same order. Across both evaluations: codex `gpt-6-luna` 7.3 s, claude default 9.2 s, claude `haiku` 10.7 s, codex `gpt-6-astra` 11.7 s, agy `gemini-3.8-flash-low` 21.8 s, agy `gemini-3.6-flash-low` 51.3 s.

CLI startup floor, one text-only prompt ("Reply with the single word OK.", no image, low effort, 2 runs each, `floor.log`):

| CLI / model | s |
| --- | --- |
| claude default / haiku | 5.5, 5.8 / 5.2, 5.0 |
| codex default / gpt-6-luna | 6.1, 6.9 / 5.4, 5.9 |
| agy default (gemini-3.8-flash-low) | 15.1, 17.0 |
| agy `gemini-3.8-flash-low` explicit | 13.7, 15.4 |
| agy `gemini-3.6-flash-low` | 35.6, 41.1 |

So the image itself adds roughly 1.7 s on Codex `gpt-6-luna` (inline attach), about 3.6 s on Claude default, 5.6 s on Claude Haiku, about 5 s on Codex `gpt-6-astra`, and about 6 s on AGY default. The AGY `gemini-3.6-flash-low` time is dominated by that model's response time in this account today, not by the image. Floors are from 2 runs each.

## Recommendation for the router's description step

Keep the description step as a direct HTTP call to a small Gemini vision model (`gemini-3.5-flash-lite`, about 2.2 s median from the earlier measurement, not re-run here): every CLI process in this test has a 5-17 s floor and a headless image read of 7-52 s, so none can meet the 4 s budget the intent set for the description step, and AGY through its CLI is the slowest of the readable options. If the step ever has to shell out to a CLI, use Codex with `gpt-6-luna` and `-i` (7.3 s median, A 4/4, B 4/5, $0.10 / $0.50 per 1M tokens): it is the fastest, cheapest and sends the image inline instead of spending a tool turn. Claude Code's default model is the accuracy leader on B (5/5) and the fastest default (9.2 s) but costs 40x more per input token than `gpt-6-luna` and Haiku is slower than Codex without being more accurate. Do not use the ZAI/GLM CLI: it has no way to pass an image. The latency/quality trade-off in this data is small on quality (all three readable CLIs score 4/4 on A and 4-5 on B) and large on latency (7 s to 52 s), so pick on speed and price.

## Not measured, and why

- **The router's actual description call** (direct upstream `gemini-3.5-flash-lite`): outside the scope of "call the CLIs directly"; the 2.2 s figure comes from the intent file and was not reproduced.
- **`gemini-3.5-flash-lite` through the AGY CLI:** the CLI rejects it as a `--model` value.
- **`gemini-3.7-flash-low` / `gemini-3.8-flash-low` as eval 2:** tied on price with the model tested; the 3.8 low variant is what eval 1 already ran (21.8 s). AGY eval 2 is therefore not a fair speed test of "Gemini flash"; it measures `gemini-3.6-flash-low`, which was slow today (36-41 s even for text-only).
- **Codex `gpt-reserve`:** hidden and unpriced, so not chosen as cheapest.
- **GLM vision (Vision MCP, or any `glm-*v*` model with real pixels):** the CLI cannot attach images; the MCP route needs a global config change. No GLM accuracy number exists beyond "cannot read".
- **GLM effort:** no effort flag exists in `zai` 0.3.5. `src/glm-proxy.mjs` sets `reasoning_effort` only when it proxies, which this test avoided.
- **Claude with stdin image (`--input-format stream-json`):** tried once on Haiku in a smoke run; it also made a Read tool call (about 10 s), so it was not benchmarked separately.
- **Cost per run:** not captured by the harness (Claude reports `total_cost_usd`; a Haiku smoke run reported about $0.06, an Opus smoke run about $0.35, likely from the roughly 80k tokens of default CLI context seen in the Haiku smoke run).
- **Stability over time:** 3 runs per cell over 22 minutes; AGY and GLM had large run-to-run swings (AGY eval 2: 37-52 s; GLM 429 and timeouts).
- **Housekeeping:** my first `grep` of the Codex `config.toml` printed a local MCP URL containing a key to my own tool output. It is not in this document; saved stderr files were redacted (`key=REDACTED`) and searched for leftover secrets, none found.

## Summary

Codex with `gpt-6-luna` and `-i` is the fastest reader that scored A 4/4 (7.3 s median); Claude Code's default is the fastest default (9.2 s). GLM cannot read images through its CLI. For the router's 4 s description step, none of the CLI processes fits; keep the direct Gemini flash-lite call, and use Codex `gpt-6-luna` if a CLI is required.

Status: Complete
