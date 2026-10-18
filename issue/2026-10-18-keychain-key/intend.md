# Intend: launchers find the Keychain key and never fall back silently

## Failure (2026-10-18, QA report, feedback fb-afb978907f)

Six clean-room lanes started `jev-claude` by exec (`orca terminal create --command`, scripts,
agent launchers). None of them routed. The owner could not tell why.

- `bin/jev-claude.mjs` enabled routing only when `JEV_API_KEY`/`TYPESAFE_API_KEY` was in the
  environment or in `./.env`, `~/.jev-router.env`, `~/.jev-claude.env`.
- The owner keeps the key only in macOS Keychain, service `typesafe-ai-api`. Interactive
  shells got it from the zsh function in `~/.config/jev-router/shell.zsh`. A direct exec of
  the binary skips that function.
- With no key, jev-claude printed one stderr line (`[jev] no JEV_API_KEY found`) that the
  Claude TUI covered right away, and started plain Claude.
- Coordinator check: lanes with the key had two LISTEN sockets on the jev node process and
  `ANTHROPIC_BASE_URL=http://127.0.0.1:<port>` in the child env. Lanes without the key had
  neither.

`src/codex-cli.mjs` `loadEnv()` (used by jev-codex, jev-agy, jev-glm) already read the
Keychain. jev-claude had its own copy of the env loading without it. All four launchers
shared the one-line silent warning.

## Evidence coverage

`jev-maintain analyze` reads routing logs. An unrouted session writes none, so the analyzer
cannot count these lanes; the denominator for this failure is the coordinator's process and
env check above (6 of 6 affected lanes unrouted). No routing-quality evidence is involved and
routing policy is not changed.

## Intent

1. One shared key loader for all launchers: env, then env files, then macOS Keychain
   (`security find-generic-password -s typesafe-ai-api -w`, darwin only, argument array,
   3 s timeout, key never logged). Existing precedence stays the same.
2. No key: a multi-line stderr warning before the CLI starts, a visible "Jev Router OFF: no
   key" Claude status line, and `JEV_REQUIRE=1` exits non-zero instead of falling back.
   The default is still fallback with a loud warning.
