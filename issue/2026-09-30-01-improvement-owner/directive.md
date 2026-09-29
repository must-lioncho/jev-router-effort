# Directive: improvement owner and executors

Owner of this issue: the agent definition worker (Orca task `task_fd1c8f747b30`). One writer per file.

## Owned files

AIOS development repository `/Users/lioncho/Work/lion_work/organization/mustcompany/workspace/mustcompany-aios`:

- `sources/agents/jev-router-improver.md`
- `sources/agents/jev-claude-executor.md`
- `sources/agents/jev-codex-executor.md`
- `sources/skills/jev-router-improvement/**`
- `issues/2026-09-30-jev-router-improvement/**` (review, audit, behavior and deployment evidence)

This repository: `issue/2026-09-30-01-improvement-owner/{intend,directive,result}.md` only. The
coordinator commits this issue; the worker does not commit the router repository.

## Steps

1. Checkpoint the AIOS repository (tracked and untracked, HEAD and index unchanged) before editing.
2. `scaffold.py skill|agent --dry-run`, then create with `--source-root <dev>/sources`; replace the
   scaffold text with the final compact definitions and references.
3. `gate.py check` on the three agents and `SKILL.md`; scoped `audit.py` with no new findings.
4. Behavioral scenarios in throwaway repositories: valid executor packet, invented model/effort,
   improver end to end on a synthetic QA report with no Analyzer data.
5. `gate.py review` by the independent `agent-build-reviewer`, then `gate.py verify` on exact hashes.
6. Build a package containing only the owned `sources/` paths; `release.py --component
   jev-router-improvement` preview, then `--apply` to `~/.must-aios`; `must-aios sync` and `verify`.
7. Verify installed byte hashes, adapter files for Claude/Codex/Antigravity and skill links/copies;
   re-run a behavioral scenario without a path hint to confirm discovery.
8. Commit only the owned AIOS paths after the gate. Report receipts, commit and hashes.

## Checks

The receipt's candidate hashes must equal the installed bytes. Any conflict in the release preview
stops deployment. Unmeasured: live routing quality improvement, which requires real outcomes.
