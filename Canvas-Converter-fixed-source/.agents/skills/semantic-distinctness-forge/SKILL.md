---
name: semantic-distinctness-forge
description: "Enforce deterministic distinctness across concept-facing fields and learner-visible downstream artifacts."
---

# Semantic Distinctness Forge

Use this skill when definition, summary, primer, mnemonic, hook, trap, transfer, or shell artifacts start collapsing into the same wording.

## Boundaries

- Prefer omission over generic repetition.
- Do not let one fallback template populate multiple roles.
- Compare both concept fields and downstream learner-facing artifacts.

## Inputs

- Extracted evidence
- Support scores
- Existing field outputs
- Downstream protocol, Neural Forge, and shell artifacts

## Outputs

- Distinctness thresholds
- Regeneration or blanking logic
- Regression fixtures that prove divergence or omission

## Hard Stops

- Stop if the proposed change would invent semantic content not grounded in source evidence.
