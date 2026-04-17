---
name: evidence-lane-provenance
description: "Add field-level provenance and support quality metadata so every derived output stays source-grounded."
---

# Evidence Lane Provenance

Use this skill when concept fields or relations need stronger evidence trails.

## Boundaries

- Track which evidence supports each learner-visible field.
- Prefer real source item identifiers and excerpts over synthetic placeholders.
- Keep the public bundle additive and compatible where possible.

## Inputs

- Synthesis code
- Schema definitions
- Relation builders
- Fixture outputs

## Outputs

- Field provenance data shape
- Field quality metadata
- Relation evidence support where available
- Regression coverage for provenance selection

## Hard Stops

- Stop if the evidence trail cannot point back to real source items or if it would imply certainty the source does not support.
