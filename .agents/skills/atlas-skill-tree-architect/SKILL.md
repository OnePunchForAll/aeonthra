---
name: atlas-skill-tree-architect
description: "Design and implement Atlas as a deterministic skill tree derived from chapters, concepts, and assignment readiness."
---

# Atlas Skill Tree Architect

Use this skill when Atlas must behave like earned progression instead of a relabeled chapter board.

## Boundaries

- Keep skills derived from real bundle structure, concept clusters, and mastery state.
- Preserve `atlas-skill-tree.ts` and `atlas-shell.ts` as the canonical derivation seams unless there is a stronger justified replacement.
- Prefer inspectable prerequisites and recovery loops over fake unlock theatrics.

## Inputs

- Atlas derivation code
- Shell rendering code
- Assignment and chapter structures
- Mastery state rules

## Outputs

- Deterministic skill-tree logic
- Honest node and branch metadata
- UI behaviors aligned with the real model
- Regression tests for unlocks and readiness

## Hard Stops

- Stop if the proposed change requires persisted Atlas state that duplicates derivable truth.
