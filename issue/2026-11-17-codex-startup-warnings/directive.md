# Directive

1. Change only the SessionEnd hook timeout from 60 to 3 in the Orca account and default Codex homes.
2. Preserve `service_tier = "ultrafast"`; it is valid for several current account models.
3. Build the synthetic `jev-router` service-tier and additional-speed-tier lists from the account catalog without duplicates.
4. After routing, remove a non-default service tier only if the selected concrete model does not advertise it.
5. Add focused regression tests, run the full suite, and verify with a fresh installed Codex process.
6. Preserve the existing automatic-effort edit and all unrelated Hermes/HTML work.
