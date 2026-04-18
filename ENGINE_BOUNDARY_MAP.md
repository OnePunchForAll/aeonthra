# Engine Boundary Map

## Current engine source-of-truth files

Canonical current semantic seam:

- `packages/content-engine-v2/src/index.ts`
- `packages/content-engine-v2/src/outputs/result.ts`
- `packages/content-engine-v2/src/compatibility/learning-bundle.ts`
- `packages/content-engine-v2/src/compatibility/legacy-projection.ts`
- `packages/content-engine-v2/src/source-quality.ts`

Historical retired seam from before cutover:

- `packages/content-engine/**` removed in the engine cutover pass

Shared contracts:

- `packages/schema/src/index.ts`

## Downstream consumers

Primary downstream consumers verified in the repo:

- `apps/web/src/lib/workspace.ts`
- `apps/web/src/lib/shell-mapper.ts`
- `apps/web/src/lib/shell-runtime.ts`
- `apps/web/src/lib/concept-practice.ts`
- `apps/web/src/lib/atlas-skill-tree.ts`
- `apps/web/src/lib/source-workspace.ts`

Current tests shaping expectations:

- `packages/content-engine-v2/src/tests/engine.test.ts`
- `packages/content-engine-v2/src/tests/adapter.test.ts`
- `packages/content-engine-v2/src/tests/consumer-compat.test.ts`
- `packages/content-engine-v2/src/tests/benchmark.test.ts`
- `apps/web/src/lib/shell-mapper.test.ts`
- `apps/web/src/lib/atlas-skill-tree.test.ts`
- `apps/web/src/lib/source-workspace.test.ts`
- `apps/web/src/lib/workspace.test.ts`

## Contracts and types the new engine must eventually satisfy

Stable input contract that must remain accepted by v2:

- `CaptureBundle`
- `CaptureItem`
- `CaptureResource`

Current output contract eventually needed for compatibility projection:

- `LearningBundle`
- `LearningConcept`
- `ConceptRelation`
- `LearningSynthesis`
- `EvidenceFragment`
- `FocusTheme`
- `AssignmentIntelligence`
- `RetentionModule`

Downstream truths that the adapter must preserve later:

- concept IDs must remain stable and deterministic
- `sourceItemIds` must remain trustworthy
- visible concept rendering still depends on `fieldSupport.definition.evidence`
- practice unlock still depends on assignment or transfer evidence
- Atlas readiness still depends on grounded assignment evidence and focus-theme linkage

## What can stay stable

- `CaptureBundle` input shape
- bridge/import queue and handoff logic
- workspace/source-workspace storage boundary
- downstream shell and Atlas consumers in this pass
- old engine package and live runtime wiring

## What may need adapters later

- richer internal provenance than current `EvidenceFragment`
- richer trust taxonomy than current `SourceFamily`
- richer rejection ledgers than the current schema can surface
- canonical v2 concept/relation/readiness contracts projected into current `LearningBundle`
- future handling of `engineProfiles`, `protocol`, and `neuralForge` during migration

## What must not be touched yet

- `apps/extension` runtime behavior
- bridge queueing, import, and live handoff paths
- `apps/web` live runtime wiring to the current engine
- Atlas runtime behavior except isolated compatibility tests
- production UI surfaces
- broad build workflow changes

## Verified migration seam

The safest future cutover seam is:

1. keep `CaptureBundle` unchanged
2. run `packages/content-engine-v2` in isolation
3. project v2 output through a compatibility adapter into current downstream shapes
4. compare old vs new on the same corpus and only later plan live cutover

That is the seam this pass is building toward. It is not being activated now.
