# Intent: remove actionable Codex startup warnings

## Evidence

- User screenshot shows `clamping SessionEnd hook timeout to 3s` and `service tier ultrafast is not advertised ... jev-router` on every Codex start.
- Both active Codex homes configure the SessionEnd tracker with a 60-second timeout, while Codex permits at most 3 seconds for that event.
- Both Codex configs request `service_tier = "ultrafast"`.
- The live account catalog advertises `ultrafast` for GPT-6.2 Sol/Astra, GPT-6.1 Sol and GPT-6 Astra, but the synthetic `jev-router` entry copies GPT-5.6 Terra's priority-only metadata.

## Issue

The hook setting is outside Codex's accepted range. Separately, Jev's synthetic catalog entry under-reports the combined speed tiers of the models it can route to, so Codex drops a valid requested tier before routing occurs.

## Intended result

Set SessionEnd hook timeouts to Codex's 3-second maximum. Advertise the union of account-supported service tiers on `jev-router`, then retain a requested tier only when the concrete routed model supports it.
