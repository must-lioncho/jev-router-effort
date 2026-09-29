# Intend: find the fastest accurate image reader among the four CLIs Jev routes

Date: 2026-09-29.

Jev is text-only, so image turns need a vision model to describe the screenshot first
(currently `gemini-3.5-flash-lite` through AGY, ~2.2 s median). The user wants to know, with
measurements, **which CLI and model reads an image fastest and correctly**, so that the
router uses the best one.

## What is compared

The same image and the same prompt go to four CLIs, called directly (not through the Jev proxy):

| CLI | Launcher |
| --- | --- |
| Antigravity (Gemini) | `agy` |
| Claude Code | `claude` |
| Codex | `codex` |
| GLM (ZAI CLI) | the binary `jev-glm` wraps |

Reasoning effort is **low** everywhere, using whatever each CLI calls its lowest effort
setting. Effort is not a variable in this test.

## Evaluations

1. **Default model:** each CLI's out-of-the-box default model. Which responds fastest?
2. **Cheapest model:** the cheapest model each signed-in CLI offers today *that accepts
   images*. How fast is it, and how good is the answer?

## Sample images

- **A (ground truth known):** `scratchpad/real3/img-b.png`. It contains `ORCHID-7319`,
  `The purple walrus refuses to deploy on Thursdays.`, `ERROR: quota for teacups exceeded
  (42/41)`, and a notification dialog clipped at the right edge.
- **B (realistic):** the user's real UI screenshot from the failing session
  (`orca-paste-1790680433453-….png`), if it still exists.

## Measurements (per CLI × model × image, 3 runs, median reported)

- **Total wall time:** from process start to exit.
- **Time to first output:** where the CLI streams, from start to its first output.
- **Accuracy on A:** score out of 4, one point for each item above quoted or described
  correctly. A made-up line costs a point.
- **Quality on B:** a 1–5 rubric: correct layout and menus, visible text, and anything
  broken. Graded blind by a separate grader that does not know which CLI produced the answer.

## Rules

- Honesty over coverage. If a CLI or model cannot take an image (for example a text-only
  GLM model), record that, together with the command and the error. Do not substitute
  another model silently.
- Name the source for "cheapest": the provider's pricing page or the CLI's catalog, and
  the date. Never guess prices.
- Do not bypass permissions outside the scratchpad. Do not change any CLI's global config.
  Do not commit.
- Report the environment: CLI versions, date and time, and network (same machine,
  back-to-back runs).

## Output

`BENCH_IMAGE.md` contains:
- a table for evaluation 1 and a table for evaluation 2, with the exact commands used;
- a ranking by speed, and by speed at accuracy 4/4 on A;
- a one-paragraph recommendation for the router's description step, with the
  latency/quality trade-off stated.
