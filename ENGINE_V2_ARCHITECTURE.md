# Engine V2 Architecture

## Proposed canonical package structure

Preferred canonical path:

- `packages/content-engine-v2/`

Proposed structure:

- `src/index.ts`
- `src/contracts/`
- `src/ingestion/`
- `src/structure/`
- `src/noise/`
- `src/evidence/`
- `src/candidates/`
- `src/relations/`
- `src/fields/`
- `src/truth-gates/`
- `src/outputs/`
- `src/compatibility/`
- `src/benchmarks/`
- `src/fixtures/`
- `src/tests/`

## Exact pipeline stages

1. `ingestion`
   - normalize bundle-level metadata
   - classify each item by origin system, source family, capture modality, and trust lanes
   - prefer structured fields before freeform text

2. `structure`
   - parse HTML deterministically when available
   - select trustworthy content roots
   - preserve hierarchy into structural nodes
   - fall back to structured plain-text extraction when HTML is absent or untrustworthy

3. `noise`
   - classify nodes and units as content, chrome, accessibility fallback, admin prompt, discussion scaffold, or unknown
   - remove or downgrade noisy units with explicit reason codes
   - preserve rejected-unit ledgers

4. `evidence`
   - build evidence units from structured fields and structural nodes
   - assign stable ids, trust scores, and lane types
   - preserve exact provenance before semantics

5. `candidates`
   - generate concept and assignment/readiness candidates only from accepted evidence lanes
   - generate signatures, aliases, and dedupe keys
   - suppress malformed, fragmentary, or low-value candidates

6. `relations`
   - admit only evidence-backed supports, contrasts, applies, and extends relations
   - keep labels deterministic and terse
   - reject relation speculation

7. `fields`
   - compile visible concept fields from admitted lanes
   - apply role-specific gates for definition, depth, distinction, hook, trap, transfer, summary, primer, mnemonic, and any added roles
   - blank unsupported roles

8. `truth-gates`
   - run acceptance thresholds
   - compare overlap across roles
   - enforce provenance completeness
   - enforce blank-over-bad

9. `outputs`
   - emit canonical v2 output
   - emit rejection/debug ledger
   - expose compatibility projection for future migration

10. `benchmarks`
   - run corpus scoring
   - compare old vs new
   - produce deterministic diff reports

## Core data structures

- `SourceClassification`
  - origin system
  - source family
  - capture modality
  - content profile
  - trust tier
  - trust score
  - accepted reasons
  - rejected reasons
  - title/date/body/module/assignmentPrompt trust lanes

- `SourceDocument`
  - item reference
  - classification
  - structured fields
  - parsed root metadata
  - fallback metadata

- `StructuralNode`
  - stable node id
  - source item id
  - node kind
  - ordinal path
  - heading path
  - parent id
  - text
  - raw snippet reference
  - trust state

- `EvidenceUnit`
  - stable evidence id
  - source item id
  - source kind
  - origin system
  - capture modality
  - unit type
  - accepted excerpt
  - support score
  - acceptance reasons
  - rejection reasons
  - structural references

- `CandidateRecord`
  - candidate kind
  - label
  - signature
  - evidence ids
  - acceptance score
  - admission reasons
  - suppression reasons

- `ConceptRecord`
  - canonical id
  - label
  - accepted fields
  - field admissions
  - provenance map
  - relation ids

- `EngineV2Result`
  - source classifications
  - accepted concepts
  - accepted relations
  - accepted assignment/readiness support
  - rejection ledger
  - deterministic hash

## Interfaces

- `analyzeBundle(bundle: CaptureBundle): EngineV2Result`
- `projectToLearningBundle(result: EngineV2Result, bundle: CaptureBundle): LearningBundleProjection`
- `runBenchmark(corpus): BenchmarkReport`
- `scoreFixture(result, expectation): FixtureScore`

## Rejection model

Every rejection must carry:

- rejection code
- human-readable reason
- source item id
- evidence or node reference when applicable
- candidate or field target
- gate stage

Representative rejection code families:

- `chrome.browser-js-disabled`
- `chrome.nav-shell`
- `chrome.accessibility-hidden`
- `noise.assignment-header-metadata`
- `noise.generic-week-wrapper`
- `fragment.truncated-label`
- `fragment.stopword-heavy`
- `provenance.missing-definition-support`
- `role.low-evidence-transfer`
- `date.suspicious-range`
- `relation.unsupported`

## Provenance model

Visible outputs must point to accepted evidence units, not fuzzy matches.
The v2 canonical provenance must include:

- evidence unit ids
- source item ids
- capture modality
- source type
- accepted excerpts
- trust lane
- support score
- acceptance reason

The current schema cannot carry all of that, so the compatibility adapter will down-project to current `EvidenceFragment` fields while preserving richer v2 provenance internally.

## Benchmark model

- fixture-driven expectations
- weighted metric scoring
- deterministic snapshot outputs
- old vs new comparison on the same corpus
- repeated-run stability checks

## Why this architecture is better

- it moves truth admission ahead of prose emission
- it preserves structure and provenance instead of flattening first and guessing later
- it centralizes noise and trust decisions into one deterministic boundary
- it allows mixed bundles to keep good evidence while suppressing junk
- it keeps downstream migration possible through an explicit adapter instead of hidden coupling
