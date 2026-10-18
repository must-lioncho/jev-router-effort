# Directive: Keychain key fallback and loud no-key mode

Single writer: jev-router-improver.

## Owned files

- `src/credentials.mjs` (new): `loadJevKey()`, `noKeyWarning()`, `requireKeyOrWarn()`.
- `src/codex-cli.mjs`: `loadEnv()` delegates to `loadJevKey()`; no-key path uses the shared
  warning and `JEV_REQUIRE`.
- `src/anti-cli.mjs`, `src/glm-cli.mjs`: same no-key path.
- `bin/jev-claude.mjs`: use `loadJevKey()`; no-key path uses the shared warning, honours
  `JEV_REQUIRE`, and sets `JEV_ROUTER_OFF` plus the Jev status line for the child.
- `bin/jev-statusline.mjs`: show `Jev Router OFF: no key` when `JEV_ROUTER_OFF` is set.
- `test/credentials.test.mjs` (new): regression tests.
- `README.md`: document Keychain lookup and `JEV_REQUIRE`.
- `issue/2026-10-18-keychain-key/{intend,directive,result}.md`

Not changed: routing policy, `docs/routing-policy.json`, `docs/routing-evidence.md`, proxies.
`~/.config/jev-router/shell.zsh` is outside the repo; it keeps working and may be simplified
separately.

## Rules

- Precedence: real env > `./.env` > `~/.jev-router.env` > `~/.jev-claude.env` > Keychain.
- Keychain only on darwin, `execFileSync("security", [args])`, stderr ignored, 3000 ms
  timeout. The key is never written to stdout, stderr, logs or status files.
- A user-configured Claude status line still wins over the Jev one.

## Checks

- Env key wins over env file and Keychain (Keychain not called).
- Env file key used; Keychain not called.
- Keychain fallback with a mocked `execFile`; arguments exact; non-darwin skips it.
- Keychain failure leaves no key.
- No key: warning text lists the lookup order; `JEV_REQUIRE=1` exits non-zero (spawned
  jev-claude with an empty HOME and fake PATH).
- Status line prints `Jev Router OFF: no key` when `JEV_ROUTER_OFF` is set.
- `npm test` passes.
