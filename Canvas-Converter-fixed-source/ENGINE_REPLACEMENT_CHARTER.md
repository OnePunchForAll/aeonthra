# Engine Replacement Charter

## Why the old engine is not enough

The current semantic path is still too willing to turn noisy or weak evidence into learner-visible meaning.
Verified failure modes in the current repo include:

- browser/LMS chrome surviving as assignment or concept substrate
- broken or truncated fragments surviving as concept labels
- bundle-level gating that often blanks everything instead of separating junk from valid evidence
- generated semantic prose receiving fuzzy backfilled provenance instead of being compiled from accepted evidence
- heuristic scoring and downstream salvage layers carrying too much truth responsibility
- readiness-like and assignment-like outputs that can look stronger than the evidence actually supports

The replacement pass exists to end those patterns by moving truth admission into a single deterministic compiler with explicit provenance, explicit rejection reasons, and fail-closed behavior.

## What the new engine will do

- accept the existing `CaptureBundle` contract without changing live bridge or import flow
- normalize sources into typed, trust-scored documents
- preserve structure and evidence boundaries before semantic admission
- classify source origin, capture modality, content profile, and trust lanes
- reject chrome, wrappers, fragments, boilerplate, malformed titles, and suspicious dates
- generate concept, relation, and assignment/readiness candidates only from accepted evidence units
- emit learner-visible fields only when role-specific gates pass
- emit provenance and rejection reasons for everything the engine accepts or suppresses
- provide a compatibility adapter for later migration without wiring the live product now
- benchmark old vs new on the same corpus until the new engine clearly wins

## What the new engine will not do

- it will not replace the old engine in this pass
- it will not be wired into Atlas, the live app, the extension, or bridge flow in this pass
- it will not imitate an LLM with semantic-looking filler
- it will not invent hooks, traps, mnemonics, readiness, or relations from weak evidence
- it will not treat metadata bonuses as truth admission
- it will not broaden repo architecture beyond the isolated engine, adapter, fixtures, docs, and benchmarks required for replacement readiness

## Deterministic philosophy

- Omit over invent.
- Provenance over confidence theater.
- Structure before prose.
- Evidence before semantics.
- Distinctness or blank.
- Same input, same output, same rejection ledger.
- Blank is better than wrong.
- A smaller trustworthy engine is better than a larger fake-smart one.

## Success criteria

The replacement engine is only considered ready for later migration if all of the following are true:

- it exists in an isolated package and does not change live runtime behavior
- it beats the current engine on the defined benchmark corpus
- it rejects obvious LMS/browser/system noise and broken fragments
- it emits provenance for every visible concept field, relation, and readiness-supporting artifact
- it blanks unsupported fields instead of filling them with semantic prose
- it handles mixed bundles by preserving valid lanes without rescuing junk
- it records deterministic rejection reasons and support reasons
- it has regression coverage for hard-noise, mixed, adversarial, and good structured cases
- two consecutive final-judge loops produce no material benchmark gain

## Hard non-goals

- no live migration
- no old-engine deletion
- no Atlas redesign
- no UI polish pass
- no bridge or extension feature work except isolated test fixtures/harness input
- no backend or runtime API introduction
- no auth, analytics, or telemetry work
- no broad schema redesign beyond isolated internal v2 contracts and a future-facing adapter strategy

## Stop conditions

Stop this pass only when:

- the isolated engine package, fixtures, benchmarks, adapter, tests, and closeout report all exist
- verification commands pass for the isolated engine and relevant shared contracts
- the benchmark shows material superiority over the old engine
- two consecutive judge loops show no material improvement

Do not stop because green tests alone look reassuring.
Do not stop because the old engine was patched a bit.
Do not stop because the new engine is merely plausible.
