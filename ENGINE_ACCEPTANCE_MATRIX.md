# Engine Acceptance Matrix

## Evaluation basis

All thresholds in this matrix are evaluated on the v2 benchmark corpus and repeated deterministic runs of the same inputs.
Metrics are pass/fail, not aspirational.

## Noise rejection

- Pass threshold:
  - `100%` rejection of hard-noise fixtures that contain only JS-disabled text, LMS chrome, accessibility fallback, nav/sidebar/footer text, or wrapper-only admin content
  - `0` visible concepts, relations, readiness items, or assignment titles sourced from hard-noise fixtures
  - `>= 95%` rejection accuracy on mixed/adversarial fixtures for items explicitly marked as garbage in expectations
- Fail threshold:
  - any visible concept/assignment/readiness artifact sourced only from hard-noise content
  - any benchmark fixture whose expected suppressed garbage appears in visible output

## Concept label quality

- Pass threshold:
  - `100%` of visible concept labels pass length, token, fragment, provenance, and duplication sanity
  - `0` visible labels that are generic week/module wrappers, chrome phrases, truncated fragments, malformed duplicates, or scaffold labels
  - `>= 90%` recovery of expected concept labels on structured good fixtures
- Fail threshold:
  - any visible broken fragment
  - any visible week-only or boilerplate label

## Concept provenance completeness

- Pass threshold:
  - `100%` of visible concepts have origin, source type, evidence excerpts, support score, acceptance reason, and evidence unit references
  - `100%` of visible concept fields have field-level provenance entries
- Fail threshold:
  - any visible concept or field missing required provenance fields

## Concept distinctness

- Pass threshold:
  - `0` duplicate-role collisions where two visible roles resolve to the same normalized sentence or same admitted evidence lane unless the role contract explicitly allows reuse
  - `>= 95%` of visible multi-role concepts satisfy pairwise normalized similarity below `0.82`
- Fail threshold:
  - one generic sentence wearing multiple role costumes

## Relation quality

- Pass threshold:
  - `100%` of visible relations backed by accepted evidence from both participating concepts or an explicit cross-reference lane
  - `0` relations admitted purely from templated downstream prose
  - `>= 80%` recovery of expected relations on structured good fixtures
- Fail threshold:
  - unsupported relation labels
  - relation visibility without provenance

## Due date sanity

- Pass threshold:
  - `100%` of suspicious or impossible dates are rejected with an explicit rejection reason
  - `100%` of trustworthy structured due dates in fixtures are accepted correctly
  - `0` impossible countdown semantics in adapter output
- Fail threshold:
  - any impossible or suspicious date admitted as trustworthy

## Assignment title sanity

- Pass threshold:
  - `100%` of visible assignment titles come from trusted structured/title-evidence lanes
  - `0` visible titles that are boilerplate, generic week wrappers, chrome, or truncated fragments
  - `>= 90%` recovery of expected assignment titles on trustworthy structured fixtures
- Fail threshold:
  - any visible assignment title sourced only from junk text

## Readiness honesty

- Pass threshold:
  - `0` readiness-supporting artifacts emitted when requirement evidence is absent
  - `100%` of readiness-supporting artifacts carry captured requirement or assignment-evidence provenance
  - concept-only grounding is explicitly labeled as non-readiness in debug/adapter output
- Fail threshold:
  - any confident readiness artifact without requirement evidence

## Fail-closed behavior

- Pass threshold:
  - weak-evidence fixtures emit omission plus explicit rejection/debug data rather than semantic filler
  - `100%` of suppressed visible roles record a deterministic rejection reason
  - `0` unsupported semantic roles emitted from weak evidence fixtures
- Fail threshold:
  - fallback semantic prose appearing because the engine “wanted to show something”

## Output usefulness under weak evidence

- Pass threshold:
  - weak-evidence fixtures may emit trusted structured facts, diagnostics, and rejection ledgers
  - `0` fake-semantic concepts or readiness claims
  - accepted artifacts, if any, must be `100%` provenance-complete
- Fail threshold:
  - silence with no diagnostics
  - or fake richness without support

## Deterministic reproducibility

- Pass threshold:
  - `3/3` repeated runs on the same corpus produce identical output hashes, identical accepted units, identical rejected units, and identical benchmark scores
- Fail threshold:
  - any drift across repeated runs

## Benchmark superiority over old engine

- Pass threshold:
  - v2 overall weighted benchmark score beats v1 by at least `15` points
  - v2 wins every non-negotiable safety metric:
    - noise rejection
    - provenance completeness
    - due date sanity
    - readiness honesty
    - fail-closed behavior
  - v2 does not lose more than `5` points on structured-good concept recall relative to v1
- Fail threshold:
  - v1 wins any non-negotiable safety metric
  - or v2 superiority is marginal/noisy rather than material

## Current verified result (2026-04-17)

- v1 overall weighted score: `82.67`
- v2 overall weighted score: `98.00`
- delta: `15.33`
- repeated benchmark runs: `3/3` stable inside each repeated run call, with two additional no-change judge loops also returning the same `15.33` delta
- current status against this matrix: `PASS` for the implemented isolated benchmark and package verification loop
