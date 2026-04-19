# Engine V2 Benchmark Plan

## Old vs new comparison method

- Run the current engine and the isolated v2 engine on the same fixture corpus.
- Score both against fixture expectations, not against each other.
- Emit:
  - overall weighted score
  - per-metric score
  - per-fixture pass/fail
  - accepted/suppressed diffs
  - provenance completeness diffs
  - deterministic hash comparisons

## Corpus

The benchmark corpus must include:

- hard-noise fixtures
- mixed junk + valid evidence fixtures
- adversarial wrapper and duplication fixtures
- structured good fixtures
- due-date sanity fixtures
- readiness-honesty fixtures
- compatibility projection fixtures

## Metrics

Required metrics:

- noise rejection
- concept label quality
- provenance completeness
- distinctness quality
- relation usefulness
- due date sanity
- assignment title sanity
- readiness honesty
- fail-closed behavior
- output usefulness
- deterministic stability

Suggested weighting:

- noise rejection: `18`
- provenance completeness: `15`
- fail-closed behavior: `14`
- concept label quality: `12`
- readiness honesty: `10`
- due date sanity: `8`
- relation usefulness: `7`
- distinctness quality: `6`
- assignment title sanity: `5`
- output usefulness: `3`

Implemented scoring note:

- deterministic stability is enforced as a binary gate, not a weighted score row
- the current weighted score total is therefore `98`

## Iteration loop

1. typecheck/build the isolated engine
2. run targeted engine-v2 tests
3. run fixture and regression tests
4. run old vs new benchmark comparison
5. inspect failures and weak wins
6. patch only the isolated engine and its harness/docs/tests
7. rerun the benchmark
8. record the score delta and judge decision

## Stop conditions

- stop only after two consecutive judge loops show no material benchmark improvement
- “material improvement” means any of:
  - overall score increase of `>= 2` points
  - elimination of any non-negotiable safety failure
  - provenance completeness increase
  - new fixture class covered

## Minimum acceptable result

- v2 passes every row in `ENGINE_ACCEPTANCE_MATRIX.md`
- v2 beats v1 materially
- v2 is deterministic across repeated runs
- v2 remains isolated and not wired into live product surfaces

## Implemented benchmark snapshot (2026-04-17)

Checked-in benchmark corpus size:

- `12` fixtures

Verified result:

- v1 overall weighted score: `82.67`
- v2 overall weighted score: `98.00`
- delta: `15.33`
- repeated-run stability: `true`

Final no-improvement loops:

1. `delta 15.33`, `repeatedRunStable true`
2. `delta 15.33`, `repeatedRunStable true`

Result:

- two consecutive judge loops produced no material improvement after the final salvage fixes
