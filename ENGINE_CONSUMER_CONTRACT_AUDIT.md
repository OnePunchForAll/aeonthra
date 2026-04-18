# Engine Consumer Contract Audit

## Canonical live engine seam after cutover

- Public package id: `@learning/content-engine`
- Canonical implementation path: `packages/content-engine-v2/src/index.ts`
- Worker/live entrypoint: `apps/web/src/workers/content-engine.worker.ts`
- Canonical result contract consumed downstream: `LearningBundle`

## Consumer audit

### `apps/web/src/workers/content-engine.worker.ts`

- Imports:
  - `buildLearningBundleWithProgress`
  - `LearningBuildStage`
- Depends on:
  - stable progress stage names
  - final `LearningBundle` schema
- Cutover handling:
  - v2 now exposes a progress-compatible wrapper and the same stage type names
- Final status:
  - satisfied through the canonical live seam

### `apps/web/src/App.tsx`

- Imports:
  - `createDemoSourceText`
  - `LearningBuildStage`
- Depends on:
  - demo text helper
  - processing-stage labels
- Cutover handling:
  - v2 now exports both without UI call-site changes
- Final status:
  - satisfied

### `apps/web/src/lib/offline-site.test.ts`

- Imports:
  - `buildLearningBundleWithProgress`
  - `createDemoSourceText`
- Depends on:
  - deterministic `LearningBundle` generation for offline replay bundles
- Cutover handling:
  - v2 now builds the full `LearningBundle` contract used by replay export
- Final status:
  - satisfied

### `apps/web/src/lib/shell-mapper.ts`

- Imports no engine package directly, but depends on:
  - `LearningConcept.fieldSupport`
  - `LearningSynthesis.stableConceptIds`
  - `focusThemes`
  - `assignmentMappings`
- Cutover handling:
  - v2 legacy projection now preserves definition-backed concept support, assignment evidence, grounded likely skills, and focus themes where the source family supports them
- Final status:
  - satisfied by targeted shell-mapper tests and v2 consumer-compat tests

### `apps/web/src/lib/workspace.ts`

- Depends on:
  - concept ids
  - concept `sourceItemIds`, `keywords`, `definition`, `summary`
  - sane due-date behavior
- Cutover handling:
  - v2 compatibility keeps concept linking fields and preserves unknown-due fail-closed behavior
- Final status:
  - satisfied

### `apps/web/src/lib/shell-runtime.ts`

- Depends on:
  - stable concept ids flowing through shell data
  - practice gating not regressing into fake readiness
- Cutover handling:
  - v2 compatibility keeps deterministic ids and grounded assignment mappings
- Final status:
  - satisfied through shell-mapper and App/offline-site verification

### `apps/web/src/lib/concept-practice.ts`

- Depends on:
  - shell concept `core`, `depth`, `dist`, `hook`, `trap`
  - `practiceReady`
- Cutover handling:
  - v2 maps `hook` into legacy `mnemonic`, preserves grounded trap/transfer fields, and blanks weak lanes instead of filling them
- Final status:
  - satisfied

### `apps/web/src/lib/atlas-skill-tree.ts`

- Depends on:
  - `focusThemes`
  - `assignmentMappings`
  - evidence-backed checklist and readiness surfaces
- Cutover handling:
  - v2 compatibility now emits grounded assignment intelligence for trusted surfaces with evidence, rather than only fully ready assignments
- Final status:
  - satisfied

### `packages/interactions-engine/src/index.test.ts`

- Imports:
  - `buildLearningBundle`
- Depends on:
  - canonical package id and `LearningBundle` contract
- Cutover handling:
  - import path remained stable while the live implementation switched underneath it
- Final status:
  - satisfied

### Benchmark harness

- Depends on:
  - old-vs-new comparison surviving retirement
- Cutover handling:
  - old engine benchmark surfaces were frozen to `packages/content-engine-v2/src/benchmarks/legacy-v1-surfaces.json`
  - post-retirement benchmarks compare the canonical engine against that frozen legacy baseline
- Final status:
  - satisfied without live old-engine code

## Output-shape assumptions that remain live

- `LearningBundle` remains the production downstream contract.
- `LearningConcept.fieldSupport.definition.evidence` is still the hard concept-visibility gate in shell mapping.
- `LearningSynthesis.assignmentMappings` and `focusThemes` remain the Atlas and shell synthesis seams.
- Progress UI still depends on named `LearningBuildStage` values.

## What was simplified during cutover

- old engine internals were removed entirely
- no old compatibility shim calls the retired engine
- the benchmark baseline is now explicit snapshot data instead of a hidden runtime dependency

## What could not break and did not break

- worker `PROCESS_BUNDLE -> PROGRESS -> COMPLETE`
- `LearningBundleSchema` validity
- shell concept mapping assumptions about field support
- Atlas assignment requirement grounding
- offline/demo flows that import `@learning/content-engine`
