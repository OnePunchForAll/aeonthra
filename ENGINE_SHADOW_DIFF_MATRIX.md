# Engine Shadow Diff Matrix

## Comparison basis used before retirement

- Old output path:
  - retired `packages/content-engine`
  - old benchmark surfaces generated through `buildV1BenchmarkSurface(bundle)` before deletion
- New output path:
  - `packages/content-engine-v2/src/index.ts`
  - `buildLearningBundle(bundle)` backed by v2 analysis and compatibility projection
- Frozen legacy baseline artifact:
  - `packages/content-engine-v2/src/benchmarks/legacy-v1-surfaces.json`

## Diff matrix

| Consumer | Old output path | New output path | Neutral diffs | Intentional improvements | Breaking diffs | Fixes applied before cutover | Final disposition |
| --- | --- | --- | --- | --- | --- | --- | --- |
| content-engine worker | old `buildLearningBundleWithProgress` | v2-backed `buildLearningBundleWithProgress` | progress percentages shifted internally | same stage names, new deterministic pipeline underneath | none after wrapper landed | added v2 progress wrapper and `LearningBuildStage` export | complete |
| shell mapper | old `LearningBundle` | v2-built `LearningBundle` | some concept counts stay lower on weak bundles | stronger definition gating, blank-over-bad fields, no junk practice unlocks | none in targeted tests | richer legacy projection, hook-to-mnemonic mapping, grounded assignment intel | complete |
| workspace | old `LearningBundle.concepts` | same contract via v2 | task ordering can differ only through due-date truth | suspicious due dates remain unknown, fragment titles stay suppressed | none in targeted tests | kept concept linking fields and date fail-closed behavior | complete |
| shell runtime / concept practice | shell data from old bundle | shell data from v2 bundle | fewer weak concepts can mean fewer practice candidates | no fake filler, transfer/assignment evidence still drives unlocks | none in targeted tests | grounded transfer mapping and preserved stable concept ids | complete |
| Atlas skill tree | old `learning.synthesis` | v2-backed `learning.synthesis` | node counts can shift with cleaner concept substrate | readiness remains evidence-backed and concept-only inflation stays blocked | none in targeted tests | expanded assignment mappings beyond fully-ready-only surfaces | complete |
| interactions-engine | old `buildLearningBundle` | canonical v2 `buildLearningBundle` | none expected | cleaner concept substrate with same package id | none | kept `@learning/content-engine` stable while switching implementation | complete |
| benchmark harness | old engine live import | frozen v1 baseline + canonical v2 runtime | old engine is no longer executable live | positive delta remains provable without reviving retired code | would have become new-vs-new if left unchanged | froze legacy surfaces to JSON and rewired harness | complete |

## Verified intentional improvements

- browser/LMS fallback text still produces no visible concepts on hard-noise fixtures
- fragmentary labels stay suppressed
- suspicious due dates remain unknown
- admin/discussion wrappers do not re-enter shell or workspace assignment surfaces
- the benchmark delta remains positive and meaningful after the consumer switch

## Pre-retirement shadow result

- old overall score: `82.67`
- new overall score: `98.00`
- delta: `15.33`
- repeated-run stability: `true`

## Final disposition

- the shadow harness served its purpose and the repo now uses the frozen legacy baseline for ongoing comparison
- no live consumer remains on the retired engine path
