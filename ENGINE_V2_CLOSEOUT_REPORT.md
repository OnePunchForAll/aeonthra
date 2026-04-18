# Engine V2 Closeout Report

## 1. What the old engine did poorly

- It flattened noisy content too early and often needed downstream cleanup to suppress junk that should have died at the engine boundary.
- It could blank entire mixed bundles instead of salvaging the one real academic lane.
- It admitted alias, fragment, and wrapper decisions with too little retained provenance.
- It left readiness and relation quality too dependent on later consumers and heuristic cleanup.

## 2. What the new engine does differently

- It classifies source origin, family, modality, and trust before semantic admission.
- It preserves structure into explicit nodes and builds evidence units before concept generation.
- It rejects browser/LMS/admin noise, malformed fragments, suspicious dates, and weak discussion titles earlier.
- It salvages mixed-content blocks sentence-by-sentence instead of rejecting the whole block when one noisy sentence is present.
- It keeps a compatibility layer and benchmark harness separate from live runtime wiring.

## 3. Exact architecture

Canonical isolated package:

- `packages/content-engine-v2/`

Implemented stages:

1. `src/ingestion/classify.ts`
2. `src/structure/html-tree.ts`
3. `src/structure/extract.ts`
4. `src/evidence/build.ts`
5. `src/candidates/concepts.ts`
6. `src/fields/compile.ts`
7. `src/relations/build.ts`
8. `src/outputs/result.ts`
9. `src/compatibility/legacy-projection.ts`
10. `src/compatibility/benchmark-surface.ts`
11. `src/benchmarks/score.ts`
12. `src/benchmarks/run.ts`

Supporting contracts and utilities:

- `src/contracts/types.ts`
- `src/noise/rules.ts`
- `src/truth-gates/labels.ts`
- `src/utils/stable.ts`
- `src/utils/text.ts`
- `src/index.ts`

## 4. Exact files created or changed in this pass

Created:

- `.agents/skills/deterministic-engine-replacement-forge/SKILL.md`
- `ENGINE_REPLACEMENT_CHARTER.md`
- `ENGINE_BOUNDARY_MAP.md`
- `ENGINE_ACCEPTANCE_MATRIX.md`
- `ENGINE_FAILURE_CORPUS_PLAN.md`
- `ENGINE_MIGRATION_PLAN_DRAFT.md`
- `ENGINE_V2_ARCHITECTURE.md`
- `ENGINE_V2_BENCHMARK_PLAN.md`
- `ENGINE_V2_CLOSEOUT_REPORT.md`
- `packages/content-engine-v2/package.json`
- `packages/content-engine-v2/tsconfig.json`
- `packages/content-engine-v2/src/index.ts`
- `packages/content-engine-v2/src/benchmarks/run.ts`
- `packages/content-engine-v2/src/benchmarks/score.ts`
- `packages/content-engine-v2/src/candidates/concepts.ts`
- `packages/content-engine-v2/src/compatibility/benchmark-surface.ts`
- `packages/content-engine-v2/src/compatibility/legacy-projection.ts`
- `packages/content-engine-v2/src/contracts/types.ts`
- `packages/content-engine-v2/src/evidence/build.ts`
- `packages/content-engine-v2/src/fields/compile.ts`
- `packages/content-engine-v2/src/fixtures/corpus.ts`
- `packages/content-engine-v2/src/ingestion/classify.ts`
- `packages/content-engine-v2/src/noise/rules.ts`
- `packages/content-engine-v2/src/outputs/result.ts`
- `packages/content-engine-v2/src/relations/build.ts`
- `packages/content-engine-v2/src/structure/extract.ts`
- `packages/content-engine-v2/src/structure/html-tree.ts`
- `packages/content-engine-v2/src/tests/adapter.test.ts`
- `packages/content-engine-v2/src/tests/benchmark.test.ts`
- `packages/content-engine-v2/src/tests/engine.test.ts`
- `packages/content-engine-v2/src/truth-gates/labels.ts`
- `packages/content-engine-v2/src/utils/stable.ts`
- `packages/content-engine-v2/src/utils/text.ts`

Updated in support of this isolated pass:

- `.omega/IMPLEMENTATION_LEDGER.md`
- `.omega/ERROR_LEDGER.md`
- `.omega/DECISIONS.md`
- `.omega/TODO_NOW.md`

## 5. Exact benchmark corpus used

Current checked-in fixtures:

- `hard-noise-js-disabled`
- `fragmentary-title`
- `mixed-noise-and-real-concept`
- `single-page-mixed-live-junk`
- `orientation-salvage`
- `admin-heavy-orientation-clones`
- `clean-textbook-ethics`
- `trusted-assignment`
- `suspicious-date`
- `thin-discussion-salvage`
- `academic-wrapper-dedupe`
- `html-article-header`

## 6. Benchmark scores old vs new

Verified benchmark result:

- v1 weighted score: `82.67`
- v2 weighted score: `98.00`
- delta: `15.33`
- repeated-run stability: `true`

Metric snapshot:

- `noiseRejection`: v1 `16.50`, v2 `18.00`
- `conceptLabelQuality`: v1 `5.00`, v2 `12.00`
- `provenanceCompleteness`: v1 `15.00`, v2 `15.00`
- `distinctnessQuality`: v1 `6.00`, v2 `6.00`
- `relationUsefulness`: v1 `5.25`, v2 `7.00`
- `dueDateSanity`: v1 `8.00`, v2 `8.00`
- `assignmentTitleSanity`: v1 `2.50`, v2 `5.00`
- `readinessHonesty`: v1 `9.17`, v2 `10.00`
- `failClosedBehavior`: v1 `14.00`, v2 `14.00`
- `outputUsefulness`: v1 `1.25`, v2 `3.00`

## 7. What still remains weak

- The benchmark harness is still too forgiving in some places:
  - `maxVisibleConcepts` is populated but not scored
  - fail-closed behavior is mostly auto-passed outside `hardNoiseOnly`
  - provenance scoring is concept-heavy and does not yet fully score relation or readiness provenance
- The relation layer is strongest on `contrasts`; `supports` still needs a stricter relation-lane proof model before migration.
- `hook` exists in the v2 field contract but is not implemented as a live admitted role.
- Readiness and checklist provenance are honest enough for the current corpus, but still need a richer per-checklist evidence model before cutover.

## 8. Verified vs assumed

Verified:

- `packages/content-engine-v2` exists and is isolated.
- The v2 package typechecks with the repo root `tsc --noEmit`.
- The v2 package test suite passes.
- The checked-in benchmark corpus produces a stable `15.33` win for v2 over v1.
- Two consecutive no-change benchmark loops produced the same `15.33` delta.

Assumed:

- The current compatibility adapter is sufficient for future shadow comparison work, even though it is not yet exercised through the live app runtime.
- Later migration can stay additive at the schema boundary rather than forcing an immediate public contract rewrite.

## 9. Why the engine is ready for later migration

- It is isolated behind its own package and tests.
- It has a compatibility projection instead of hidden downstream coupling.
- It materially beats the old engine on the checked-in corpus that includes real old-engine failure families.
- Its current remaining gaps are documented migration/harness issues, not hidden live wiring.

## 10. Why the old engine must remain untouched for now

- The new engine has not been wired through the full live product path yet.
- The adapter still needs shadow-comparison and migration-risk work before cutover.
- The benchmark harness itself still has documented strictness gaps that should be closed before a live switchover claim.
- This pass was explicitly limited to replacement-engine design, build, benchmark, hardening, and documentation in isolation.

## 11. Final judge ledger

- Loop 1 final-state benchmark check:
  - v1 `82.67`
  - v2 `98.00`
  - delta `15.33`
  - repeated-run stability `true`
- Loop 2 no-change benchmark check:
  - v1 `82.67`
  - v2 `98.00`
  - delta `15.33`
  - repeated-run stability `true`

Judge outcome:

- two consecutive no-change loops produced no material improvement
- closeout is justified for the isolated engine pass
- migration remains future work only
