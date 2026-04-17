---
name: regression-orchestrator
description: "Coordinate contract, fixture, Atlas, and canonicality regressions through each verify loop."
---

# Regression Orchestrator

Use this skill when multiple deterministic subsystems need tight regression coverage after a hardening pass.

## Boundaries

- Prefer narrow tests first, then full typecheck, test, and build.
- Cover contract boundaries and user-visible truth, not just helper internals.

## Inputs

- Changed code paths
- Existing test suites
- New fixtures or canonicality checks

## Outputs

- Ordered verification commands
- Missing-test list
- Updated regression coverage tied to the changed behavior

## Hard Stops

- Stop if a claimed verification path was not actually run.
