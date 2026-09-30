# Implementation before QA attempt 1

Date: 2026-09-30. Sole implementation writer: delegated Codex worker. The required native maintenance owner reached its weekly quota before edits; this fallback is not evidence that another owner model/host is equivalent. Read CLAUDE.md, Intend.md, DIRECTIVE.md, intention.md, directive.md and the improvement procedure. Coordinator supplied verified pre-execution checkpoint e13f954ccae47f4ed702755ce736020d19360983. No commits, native terminal launches or runtime activation by this worker.

## Implemented behavior

- Conservative Korean 평가/검토/채점/리뷰 and English evaluate/review/QA/grade identify an evaluation stage. Mixed implementation-plus-review requests retain local routing. A later evaluation request selects the current read-only stage while keeping the whole first objective across runtime restarts. Codex bootstrap AGENTS instructions stay in private receiver context and do not replace the task objective.
- Optional explicit user preferences authorize an exact external CLI/model/effort separately from supported outcome rules. Fresh catalog/candidate eligibility, supported avoidance evidence, handoff enablement and manual selection safeguards remain required. `task.handoff.selection.kind` is `user-preference` or `outcome-evidence`. Preferences never manufacture model successes, sample counts or confidence.
- Codex passes receiver-only `localContext` containing available instructions, assistant/user textual artifact references, function call arguments and tool/check outputs. It is removed from classifier route arguments. Non-text unavailable content is visibly recorded rather than copied as binary data. Objective, current request and essential textual context remain whole; the existing 64 KiB renderer refuses oversized required packets before launch.
- Evaluation grants explicit `authority: "read-only"`, `stage: "evaluation"`, constraints and verification requirements. Packet header, generic executor procedure wording and actual Orca submission line all state no edits/commits/configuration activation/messages. This is an executor instruction contract, not an OS sandbox.
- Existing `handoffTask` does all real sender gating, checkpoint verification, public Orca native launch and receipt persistence. Runtime writes the fence before calling it. Accepted input, observed start and completion remain separate. HTTP 409 hold includes the available terminal handle and stops local generation; duplicate/restarted/manual-model retries retain the fence.

## Exact proposed local configuration schema

```json
{
  "routingPreferences": [{
    "id": "lion-codex-evaluation-claude",
    "sourceCli": "codex",
    "taskType": "evaluation",
    "target": { "cli": "claude", "model": "claude-sonnet-5-5", "effort": null },
    "provenance": { "kind": "user-preference", "source": "Lion request 2026-09-30" },
    "reason": "Lion prefers native Claude for evaluation and review"
  }],
  "externalModels": [{ "cli": "claude", "id": "claude-sonnet-5-5" }]
}
```

This is a schema, not a fabricated catalog. Coordinator must check exact native model/default effort and install an actual dated `externalCatalog.claude.models["claude-sonnet-5-5"]` entry with `efforts: [null]`, nonempty evidence and checkedAt within 24 hours before live verification/activation. Native default effort is `null`, not the string `"default"`. Other config fields remain coordinator-owned.

Runtime input API for local receiver context:

```js
runtime.route({
  taskKey, prompt, taskHistory, models, efforts,
  localContext: { instructions: 'Available local constraints', items: [
    { type: 'message', role: 'assistant', text: 'Artifact and check evidence' },
    { type: 'function_call_output', callId: 'id', output: 'Verification output' }
  ] }
});
```

## Owned changes

- src/evidence-policy.mjs: evaluation signals/category and independently labeled user preference eligibility.
- src/task-runtime.mjs: current-stage profiling, whole objective, private receiver context, selection metadata, read-only packet and handle-bearing hold.
- src/codex-proxy.mjs: receiver context extraction, bootstrap objective filtering, checkpoint/handoff dependency injection for meaningful adapter tests.
- src/handoff.mjs: explicit evaluation authority in packet and native Orca prompt, no change to sender gate or durable receipt lifecycle.
- test/evaluation-routing.test.mjs: 24 focused behavioral cases, including actual HTTP Codex routing with zero upstream generation after preference delegation.
- test/handoff.test.mjs: real handoff rendering/mock Orca submission checks for read-only authority.
- docs/improvement-harness.md and docs/execution-safeguards.md: preference schema, evidence distinction, stage/context transfer, whole objective limits and read-only instruction contract.
- This implementation report.

## Verification

1. Focused regression run before the final bootstrap objective refinement: `node --test test/evaluation-routing.test.mjs test/task-runtime.test.mjs test/handoff.test.mjs`: exit 0, 66/66 passed, zero failed/skipped/cancelled, ~6.24 seconds.
2. Full repository suite after bootstrap objective refinement: `npm test`: exit 0, 237/237 passed, zero failed/skipped/cancelled, ~9.26 seconds. Final rerun after the noun-reference refinement (`Review the fix` / `Evaluate the build` versus actual mixed commands): exit 0, 237/237 passed, zero failed/skipped/cancelled, ~9.47 seconds. Implementation frozen at this point for independent QA.
3. `git diff --check`: exit 0.

Focused coverage includes KR/EN stages, implementation→evaluation with objective preservation/restart, mixed requests, empty preference/policy, disabled handoff, stale/missing/uncited catalogs/candidates, wrong provenance/source/task/model/effort, manual models/efforts, preference versus observed outcome metadata, supported avoid veto, checkpoint failure, oversized required objective rejection, private conversation transfer, visible non-text omissions, duplicate fences and HTTP no-local-upstream generation after delegation.

Existing tests also cover concurrent task ownership, unknown exact effort/evidence, prelaunch rejection versus ambiguous launch, exact native target gate, checkpoint preservation of HEAD/index/worktree and accepted-only receipt semantics. No comparative Claude/Codex quality claim follows from these executable checks.

## Outstanding coordinator evidence

R5 actual native Claude completion and R8 local activation are coordinator-owned and were not performed by this worker. A native quota refusal must remain a live failure, even when automated tests pass. Independent QA must inspect all R1–R8 and the actual live/config evidence before acceptance. Original non-text/compacted conversation content cannot be reconstructed from text-only inputs. Existing proxy processes do not reread runtime configuration automatically. Pre-existing english_voice_tutor.html and server.mjs remain untouched. No policy sample expansion, global agent definition changes, publishing, pushes or scheduled jobs.

## Sole correction round after QA attempt 1

Read qa-attempt-1.md and 확인.md. QA attempt 1 failed 5/8 (62.5%); D1 identified four mixed Korean deployment/commit/delete/refactor requests being incorrectly delegated under read-only authority. Only this routing defect is within the worker's correction scope. R5 native completion and R8 activation remain coordinator-owned; no quota/account changes or native launches were attempted by the worker.

Before corrections, current tracked/non-ignored untracked work was checkpointed at ab82dd09b9a13a5a6ff8357be876db36678ca066, ref refs/jev/checkpoints/2026-09-30-05-correction/20260930T105213300Z-ab82dd09b9a1. ensureCheckpoint returned ok and the ref was independently resolved by git rev-parse. HEAD/staging/worktree were preserved. Ignored .zai/, Analyzer/private/ and node_modules/ remain excluded. An initial `checkpoint --help` unexpectedly created an additional harmless manual ref because this subcommand does not recognize help: refs/jev/checkpoints/manual/20260930T105157843Z-0884cb284ac8 at 0884cb284ac8ab5dbdc44c0b81310db6497c3094. It was verified and retained; no destructive cleanup.

Correction paths only: src/evidence-policy.mjs, test/evaluation-routing.test.mjs, this report. Shared Korean action detection now recognizes ordinary deployment, commit, deletion, refactoring, push/publication/merge and related verbs with particles and imperative/conjunctive/request forms. Mixed requests retain local routing and a mutating profile. Negated actions and artifact nouns retain evaluation: examples include `커밋을 검토해`, `배포 결과를 평가해`, `리팩터링 결과를 리뷰해`, `커밋하지 말고 검토해`, and `파일을 지우지 말고 리뷰해`.

Three additional regression tests exercise 17 mixed Korean requests and 12 artifact/negated requests. Direct classifier checks assert mixed requests are non-evaluation and mutating. Runtime checks with a valid preference/catalog assert zero handoffs and no local fence for all mixed requests, including all four independent QA reproductions and nearby conjugations. Positive runtime controls assert noun/negated requests still hand off read-only.

Correction verification:

- `node --test test/evaluation-routing.test.mjs test/task-runtime.test.mjs test/handoff.test.mjs`: exit 0, 70/70 passed, zero failed/skipped/cancelled, ~6.40 seconds.
- `npm test`: exit 0, 240/240 passed, zero failed/skipped/cancelled, ~9.44 seconds.
- `git diff --check`: exit 0.

Implementation is frozen for final independent QA attempt 2. This exhausts the permitted correction cycle. Automated success does not resolve the recorded native Claude quota refusal or prove R5/R8. No source/config/QA-document edits outside the assigned correction paths, commits, publishing, pushes or scheduled jobs.
