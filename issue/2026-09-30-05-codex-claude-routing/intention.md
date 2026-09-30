# Codex → Claude task routing

Date: 2026-09-30. Source: Lion's request in this session. This is a user preference for evaluation work, not measured proof that Claude is universally better.

## Acceptance requirements

R1. A task started through jev-codex can select a native Claude executor for evaluation/review work. Recognize Korean 평가/검토/채점 and English evaluate/review/QA requests. A review continuation after implementation keeps the original objective but routes the current evaluation stage. Mentioning evaluation in an implementation request alone must not transfer the whole implementation.

R2. Selection is explicit and inspectable: supported outcome evidence may authorize external routing; this user's configured evaluation preference may also authorize it, separately labeled as user preference. Never manufacture successful samples or overwrite the distributable empty policy. Exact CLI/model/effort and fresh availability evidence are required. No applicable preference/evidence, disabled handoff, stale/missing catalogs and manual model/effort choices retain compatible existing behavior.

R3. Launch Claude via the public Orca CLI in the same checkout. Preserve the original objective, current request, available conversation/artifact context, constraints, failure feedback and a verified Git checkpoint. Evaluation transfers read-only authority; ownership and verification instructions must be explicit. Keep private context out of commits and the classification service. Oversized required context must refuse or visibly report omission, never silently lose the essential objective.

R4. Persist the handoff fence before launch; prevent duplicate prompts and concurrent Codex/Claude writes across retries/restarts. Distinguish accepted input, observed turn start and completion. Provide a usable receipt/terminal handle. Receiving a prompt is not completion or a QA pass.

R5. Demonstrate an actual harmless Codex-runtime → Orca → native Claude evaluation handoff, read its completed result, and verify it against a fixture or these documents. Record exact observed model/effort or unknown, delivery stages, output and limits. Automated regression checks must cover the Codex adapter and no local upstream execution after handoff.

R6. Execute implementation in a sub-agent, then independent QA. QA checks every R1–R8 against this intention document in 確認/확인.md, with source/test/live evidence. Attempt 1 passes only at 100% acceptance coverage with no known failure. On failure, permit one correction and QA attempt 2. If attempt 2 fails, stop attempts, write drop-report.md, and do not activate rejected behavior. Retain both reports; no rewording acceptance to manufacture a pass.

R7. Create intention.md and directive.md before implementation; keep canonical intend.md and requested intended.md pointing to this single acceptance contract. Write result.md and 확인.md with the final coverage and unresolved work; make one scoped commit if accepted, preserving unrelated edits. No push/publish/scheduled job.

R8. Activate the accepted, scoped Codex evaluation preference in the user's existing local runtime configuration using actually checked catalog data. Explain that new jev-codex processes load it and that existing processes are not reconfigured. Preserve other config fields and unrelated files. If activation cannot be completed, QA must mark R8 incomplete.

## Existing evidence and checkpoint

The current runtime enables handoffs but has empty externalModels/externalCatalog and zero supported policy rules. src/task-runtime.mjs already has evidence-gated external handoffs; src/evidence-policy.mjs has no evaluation category and profiles the combined original/follow-up text, masking a later evaluation stage. src/codex-proxy.mjs currently passes user taskHistory only, losing assistant artifact references and verification outcomes.

Pre-execution checkpoint: e13f954ccae47f4ed702755ce736020d19360983 at refs/jev/checkpoints/2026-09-30-05-codex-claude-routing/20260930T102534445Z-e13f954ccae4. HEAD and staging preserved. It covers pre-existing untracked english_voice_tutor.html and server.mjs. Ignored .zai/, Analyzer/private/ and node_modules/ are excluded by the existing checkpoint contract.

The 24h collector sampled 148/709 eligible sessions (20.9%) in private run 24h-20260930T102552Z. Sample selection is not human/QA review; no comparative quality result or new validated performance rule is claimed in this implementation.
