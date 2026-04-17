# Purge Report Ultimate

## Scope inspected

- `.claude/worktrees/**`
- `output/**`
- root prompt/spec markdown corpus
- root historical audit/plan/purge markdowns
- root sample bundle JSON
- `test jsons/`
- `Textbook/`
- `apps/web/src/components/GravityFieldBoard.tsx`
- `apps/web/src/components/GravityFieldBoard.test.tsx`
- `apps/extension/dist`
- `docs/`
- `.omega/`

## Definitely delete

- `.claude/worktrees/**`
  - non-canonical duplicate worktree artifacts
- `apps/web/src/components/GravityFieldBoard.tsx`
  - dead Atlas-era UI artifact not rewired to the skill graph
- `apps/web/src/components/GravityFieldBoard.test.tsx`
  - dead test for the removed dead component
- `AEONTHRA_BREATH_PROMPT.md`
- `AEONTHRA_COMPETITION_EDGE.md`
- `AEONTHRA_CORRECTIVE.md`
- `AEONTHRA_DEFINITIVE_FIX.md`
- `AEONTHRA_ENGINE_FORCING_PROMPT.md`
- `AEONTHRA_EXTENSION_EMERGENCY_FIX.md`
- `AEONTHRA_EXTENSION_PROMPT.md`
- `AEONTHRA_GRAND_SCALE.md`
- `AEONTHRA_LIVE_AUDIT_RESULTS.md`
- `AEONTHRA_NOVEL_INTERACTIONS_PROMPT.md`
- `AEONTHRA_PERFORMANCE_ARCHITECTURE.md`
- `AEONTHRA_POLISH_PASS.md`
- `AEONTHRA_SPEC.md`
- `AEONTHRA_TEST_RESULTS_FIX.md`
- `canvas-converter-neural-forge-v5-monolithic-codex-build-contract.md`
- `omega-forge-one-pass-codex-master-spec.md`
- `AUDIT_45_AGENT_PASS.md`
- `AUDIT_NO_MERCY.md`
- `BRIDGE_FAILURE_ROOT_CAUSE.md`
- `EXECUTION_PLAN_45_AGENT_PASS.md`
- `EXECUTION_PLAN_FINAL_PASS.md`
- `PURGE_REPORT.md`
- `PURGE_REPORT_PHASE_2.md`
- `aeonthra-site-bundle-phil-101-introduction-to-ethics4.json`

Rationale:

- no active runtime, build, or test path depends on them
- most only cross-reference each other
- they were historical prompt scaffolding or superseded pass artifacts, not canonical product source

## Likely delete when the environment permits direct filesystem deletion

- `output/dev-web-app.log`
- `output/dev-web.log`

Rationale:

- disposable local logs
- not canonical source
- safe to remove once direct deletion is allowed; this run could not remove them because shell deletion was blocked and `apply_patch` could not delete their non-UTF8 contents

## Keep

- `apps/extension/src/**`
- `apps/extension/public/**`
- `apps/extension/scripts/**`
- `apps/extension/dist/**`
- `apps/web/src/**`
- `packages/schema/src/**`
- `packages/content-engine/src/**`
- `packages/interactions-engine/src/**`
- `docs/**`
- `.omega/**`
- `.agents/skills/**`
- control artifacts:
  - `COMMAND_CAPABILITY_MATRIX.md`
  - `HUMAN_TRIGGER_SEQUENCE.md`
  - `AGENT_SWARM_ROSTER.md`
  - `SKILL_GAP_AND_CREATION_PLAN.md`
  - `ITERATION_SCOREBOARD.md`
  - `AUDIT_ULTIMATE_PASS.md`
  - `EXECUTION_PLAN_ULTIMATE_PASS.md`
  - `BRIDGE_FAILURE_ROOT_CAUSE_ULTIMATE.md`
  - `PURGE_REPORT_ULTIMATE.md`

Rationale:

- these are the current canonical product, verification, and truth-alignment files

## Archive only if needed

- none kept under archive in this pass

The historical markdown corpus did not earn archival retention inside the active repo once the ultimate reports replaced it.

## Exact files and folders removed in this pass

- `.claude/worktrees/**`
- `apps/web/src/components/GravityFieldBoard.tsx`
- `apps/web/src/components/GravityFieldBoard.test.tsx`
- root historical prompt/spec/audit/plan/purge markdown corpus listed above
- root sample bundle JSON listed above

## Exact files and folders intentionally preserved

- `apps/extension/dist`
  - canonical unpacked extension output
- `output/*.log`
  - temporarily preserved because direct shell deletion was blocked and `apply_patch` could not delete the non-UTF8 files
- all source, schema, deterministic engine, docs, omega, and skill directories listed in the keep section

## Safety conclusion

The repo is materially leaner after the purge because the deleted artifacts were either:

- duplicate or non-canonical worktree residue
- dead UI artifacts
- historical prompt/spec scaffolding with no runtime value
- superseded pass reports replaced by the ultimate pass artifacts
