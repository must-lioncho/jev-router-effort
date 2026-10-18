# Result: Keychain key fallback and loud no-key mode

## Changed

- `src/credentials.mjs` (new): `loadJevKey()` (env > `./.env` > `~/.jev-router.env` >
  `~/.jev-claude.env` > macOS Keychain `typesafe-ai-api`, darwin only, `execFileSync` with an
  argument array, stderr ignored, 3 s timeout, key never printed), `noKeyWarning()`,
  `checkKey()`, `requireKey()`.
- `bin/jev-claude.mjs`: uses `loadJevKey()`; it had its own env loading without the
  Keychain. With no key: multi-line warning, `JEV_REQUIRE=1` exits 3, otherwise starts Claude
  with `JEV_ROUTER_OFF=no key` and the Jev status line. A routed child clears an inherited
  `JEV_ROUTER_OFF`.
- `bin/jev-statusline.mjs`: red `Jev Router OFF: no key` when `JEV_ROUTER_OFF` is set.
- `src/codex-cli.mjs` (`loadEnv` now delegates), `src/anti-cli.mjs`, `src/glm-cli.mjs`:
  shared warning and `JEV_REQUIRE`.
- `README.md`: Keychain lookup, `JEV_REQUIRE`, OFF indicators.
- `test/credentials.test.mjs` (new, 10 tests).

## Checks

- `node --test test/credentials.test.mjs`: 10/10 pass. Includes end-to-end exec of
  `bin/jev-claude.mjs` with a temp HOME and a PATH of fake `claude`/`security` scripts: no key
  -> warning, `OFF=no key`, exit 0; `JEV_REQUIRE=1` -> exit 3, Claude not started; fake
  Keychain -> `ANTHROPIC_BASE_URL=http://127.0.0.1:<port>`; key absent from all output.
- `npm test`: 281/281 pass.
- Live check on this machine: `env -i HOME=$HOME PATH=<fake claude>:/usr/bin:/bin node
  bin/jev-claude.mjs` with no env files present printed `BASE=http://127.0.0.1:53335`, so the
  real Keychain item enabled routing without the shell function.

## Coverage and limitations

- The analyzer cannot count unrouted sessions (no routing logs); the failure count (6/6
  lanes) is the coordinator's process/env check.
- A user-configured Claude `statusLine` still wins, so in that setup the only no-key signal
  is the stderr warning.
- A locked Keychain in a non-interactive context may prompt or fail; failure falls through to
  the loud warning within 3 s.
- `~/.config/jev-router/shell.zsh` is untouched and still works; its Keychain read is now
  redundant.
- Running sessions keep the launcher code they started with; restart them to pick this up.
