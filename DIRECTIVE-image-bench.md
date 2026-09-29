# Directive: image-reading benchmark across agy / claude / codex / GLM

Source of intent: [Intend-image-bench.md](Intend-image-bench.md). Read it first.

Work in `/private/tmp/claude-501/-Users-lioncho-Work-lion-personal-jev-router/b43ef7a4-dd7d-4d8e-86aa-7e227b863fa4/scratchpad/bench/`.
Write every script, raw output and timing there.

## Steps

1. **Inventory**
   - Record the version and default model of each CLI. For the defaults, use the CLI's
     catalog or config; for Codex check `~/.codex/config.toml`, for GLM read how
     `src/glm-cli.mjs` launches it.
   - List the models each CLI offers that accept images.
   - Pick the cheapest of those models, citing the pricing page URL or catalog field
     used. Verify prices with web search, not from memory.
2. **How each CLI takes an image in headless mode**
   - Find the documented way:
     - Codex: `codex exec -i <png>`.
     - Claude Code: `claude -p` with the image path and `--allowedTools Read`, or stdin
       image support.
     - AGY: `agy -p` with the path. It showed earlier that it reads a pasted path only
       through a tool unless the image is attached. Use AGY's own attach mechanism if one
       exists; otherwise allow only its `view_file` tool, with the cwd set to the
       scratchpad.
     - GLM: its CLI's image or attachment flag, if one exists.
   - Record the exact command. Set effort to low with each CLI's own flag, for example
     Claude `--effort low` or its settings env var, Codex `-c model_reasoning_effort="low"`,
     an AGY `-low` model variant, and the GLM reasoning_effort flag or setting.
3. **Prompt, identical for all runs**
   - "Describe this image factually in at most 60 words: what UI, code or error is shown,
     all visible text quoted exactly, and anything broken or cut off. Do not use any tool
     other than reading the image."
4. **Runs**
   - Evaluations 1 (default model) and 2 (cheapest image-capable model), times images A
     and B, 3 runs each.
   - Interleave the CLIs round-robin, not all runs of one CLI in a row.
   - Measure wall time with a Node harness (`child_process.spawn`, `performance.now()`),
     plus time to first stdout byte.
   - Save stdout and stderr for every run.
5. **Scoring**
   - A: score out of 4 by script plus manual check.
   - B: have a separate grader sub-agent score the anonymised answers blind, 1–5, with
     the rubric from the intent file.
6. **Report**
   - Write `BENCH_IMAGE.md` in the repo root.
   - Keep `Intend-image-bench.md` accurate: if a planned measurement turned out to be
     impossible, say so in the report. Do not delete it from the plan.

## Rules

- Do not touch `src/`, `test/`, the READMEs or the pending edits.
- Do not change any CLI's global config.
- Do not commit.
- Never print tokens.
