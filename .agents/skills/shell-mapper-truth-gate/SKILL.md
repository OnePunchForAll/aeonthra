---
name: shell-mapper-truth-gate
description: "Keep shell concept selection and practice generation sourced from captured evidence instead of self-referential derived text."
---

# Shell Mapper Truth Gate

Use this skill when shell practice, dominant concept selection, or transfer cues drift away from source-backed evidence.

## Boundaries

- Do not use mapper-authored concept prose as proof for dominance in real workspaces.
- Require source-backed transfer or assignment evidence before showing real practice content.
- Demo mode may keep curated fallback behavior if clearly separated.

## Inputs

- `shell-mapper.ts`
- Practice generation helpers
- Workspace mode detection
- Concept evidence and assignments

## Outputs

- Dominant concept scoring changes
- Practice gating changes
- Tests that prove fail-closed behavior

## Hard Stops

- Stop if the output would imply assignment readiness or transfer skill without actual evidence.
