# Directive: native per-turn routing for `jev-agy`

Source of intent: [Intend.md](Intend.md).

1. **Proxy** — add `src/agy-proxy.mjs` with `startAgyProxy({ upstream, route, statusId })`, a
   loopback reverse proxy in the style of `src/codex-proxy.mjs`.
   - `POST …:fetchAvailableModels`: record the catalog; add a `jev-router` entry cloned from
     `defaultAgentModelId` (display name "Jev Router (auto)") and put it first in every
     `agentModelSorts` group.
   - `POST …:streamGenerateContent` / `…:generateContent` with `model === "jev-router"`:
     - New turn = last `contents` entry is a user message containing `<USER_REQUEST>`; take the
       prompt from inside that tag. Ask Jev with the exact picker models (deprecated IDs
       excluded), apply `decide`, remember the result per `labels.trajectory_id`.
     - Continuation = anything else; reuse the remembered model (fallback: catalog default).
     - Apply the chosen catalog entry: `model`, `labels.model_enum`, `labels.used_claude*`,
       `labels.used_non_gemini_model`, `generationConfig.maxOutputTokens`,
       `generationConfig.thinkingConfig.thinkingBudget`.
     - On a routed new turn with a 2xx SSE reply, emit one text part
       `[Jev] routed this turn to <id> (<reason>, confidence p).` before the first event,
       using the upstream event delimiter.
   - Every generate request: drop model parts whose text starts with `[Jev] ` from history.
   - Other models on a new turn: write a `manual` status. Failures fall back to the remembered
     or default model; the proxy never blocks a turn because Jev failed.
2. **Launcher** — rewrite `runAnti` in `src/anti-cli.mjs`:
   - Resolve `agy`, then `antigravity`. Subcommands (`models`, `plugin`, `mcp`, `update`, …)
     pass straight through.
   - With a Jev key: start the proxy (upstream = existing `CLOUD_CODE_URL` or the default), set
     `CLOUD_CODE_URL` for the child only, and prepend `--model jev-router` unless the user gave
     `--model`. Both the native TUI and `-p` go through the proxy.
   - Without a key: launch AGY unchanged and print how to enable routing.
   - Keep `stdio: "inherit"`, propagate exit codes, close the proxy on exit.
   - Remove the old print-only `agy models` + restart path; the proxy replaces it.
3. **Tests** — update `test/anti.test.mjs`; add `test/agy-proxy.test.mjs` against a fake
   upstream: catalog injection, new-turn routing, continuation pinning, manual pass-through,
   history stripping, decision injection, fail-open.
4. **Docs** — README.md and README.kr.md: AGY row becomes per-turn routing via the native
   picker; explain `CLOUD_CODE_URL`. Replace `DROP_REPORT.md` with the resolution.
5. **Verify** — `npm test`; real `jev-agy -p`; real TUI in a pseudo-terminal with two turns
   (one trivial, one hard) and `JEV_DEBUG=1`, reading `~/.jev-claude.log` for both decisions.

Do not touch the unrelated pending edits in `src/codex-cli.mjs`. Do not commit.
