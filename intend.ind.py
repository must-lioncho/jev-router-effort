"""Intent: `jev -A`, `jev-a`, `jev-anti`, and `jev-antigravity` open the
real Antigravity terminal UI, just as `jev-claude` and `jev-codex` open their
respective CLIs. Do not replace that UI with a homegrown `anti>` prompt.

The CLI exposes no verified per-turn routing hook for its native UI. Forward
native sessions unchanged and say plainly that automatic per-turn routing is
not active there. A supplied `--print` prompt may still be selected by Jev
before launching Antigravity, without altering the user's CLI configuration.

Acceptance: update the directive and documentation, exercise the real native
terminal and all executable aliases, and pass the existing test suite.
"""
