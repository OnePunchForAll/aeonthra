---
name: fixture-golden-tests
description: "Maintain fixture-based regression testing for deterministic extraction and generation outputs."
---

# Fixture Golden Tests

Use this skill when capture or generator behavior should stay stable across revisions.

## Focus

- store compact representative fixtures
- normalize nondeterministic timestamps or ids before comparing
- update snapshots intentionally, never casually
- compare outputs at the contract boundary, not only at helper level

## Workflow

1. Add or refresh the fixture.
2. Normalize nondeterministic fields.
3. Assert the meaningful structure.
4. Document why the golden changed when it changes.
