---
name: deterministic-engine-cutover-forge
description: Use this skill whenever the isolated replacement engine is ready and the repo needs a full production cutover from the old deterministic engine to the new one. This skill is mandatory for consumer mapping, compatibility adaptation, shadow comparison, safe live cutover, old-engine retirement, and final verification.
---

# Deterministic Engine Cutover Forge

## Core mission
Replace the old live deterministic engine with the new deterministic engine without leaving the product in a broken, misleading, or half-migrated state.

## Highest law
Do not remove the old engine until the new engine has proven it can satisfy all real consumers.
Do not keep the old engine alive as production dependency once the new engine is proven.

## Cutover philosophy
- Review first
- Shadow compare second
- Adapt third
- Switch fourth
- Verify fifth
- Retire old code sixth
- Report honestly

## Non-negotiable rules
- No fake compatibility claims
- No silent contract drift
- No display-layer patching to hide engine regressions
- No preserving dead adapters that only keep migration ambiguity alive
- No vague “works on my machine” claims
- No semantic regressions on known bad-output cases
- No unrelated repo churn

## Required cutover pattern
1. map all old-engine consumers
2. document contracts
3. run old vs new through a temporary shadow harness
4. measure diffs
5. fix new engine or adapter until diffs are either neutral or intentionally better
6. switch consumers
7. rerun tests and benchmarks
8. remove old engine and dead references
9. confirm canonical source of truth

## Required truth rules
A cutover is not complete unless:
- the old engine is no longer the production path
- downstream consumers are stable
- known bad outputs remain blocked
- the repo has one clear engine source of truth
- docs match reality

## Required outputs
- consumer contract audit
- shadow diff matrix
- migration execution plan
- retirement report
- final integration closeout

End of skill.
