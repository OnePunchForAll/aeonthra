# Engine Migration Plan Draft

> Superseded by the completed cutover recorded in `ENGINE_CUTOVER_EXECUTION_PLAN.md` and `ENGINE_V2_INTEGRATION_CLOSEOUT.md`. This file remains as the pre-cutover planning artifact.

This file is a strategy draft only.
Do not execute this plan in this pass.

## Migration strategy

1. Keep the old engine as the live runtime.
2. Build `packages/content-engine-v2` as an isolated replacement candidate.
3. Project v2 output through a compatibility adapter into current downstream shapes.
4. Run old vs new on the same corpus and on future captured fixtures.
5. Compare benchmark results plus adapter compatibility results.
6. Only after repeated superiority is proven, plan a limited integration branch.

## Adapter strategy

- Keep v2 canonical output richer than the current schema where needed for provenance, trust, and rejection reasons.
- Add an adapter surface that projects:
  - v2 concepts to current `LearningConcept`
  - v2 relations to current `ConceptRelation`
  - v2 synthesis outputs to current `LearningSynthesis`
  - v2 evidence into current `EvidenceFragment`
- Keep non-core downstream artifact generation behind an explicit compatibility layer for later migration planning.
- Do not change current live consumers now.

## How old and new outputs will be compared

- Run both engines on the same benchmark corpus.
- Score both engines against fixture expectations, not against each other’s outputs.
- Produce:
  - metric summaries
  - fixture-by-fixture diffs
  - visible acceptance/rejection deltas
  - provenance completeness deltas
  - adapter compatibility checks

## Cutover plan

Planned future cutover sequence:

1. land v2 behind a non-live comparison path
2. verify adapter parity on current downstream tests
3. run shadow comparisons on representative captured bundles
4. cut over one semantic seam at a time
5. keep old engine available for rollback until parity and quality hold

None of those steps are executed in this pass.

## Rollback plan

- preserve the old engine package and imports unchanged
- keep adapter and benchmark harness independent of live wiring
- if future cutover regresses safety or output usefulness, revert to the old engine by import boundary only
- retain the benchmark corpus as the rollback proof surface

## Explicit non-actions for this pass

- no production import rewiring
- no old engine deletion
- no schema contract cutover
- no Atlas/runtime switchover
