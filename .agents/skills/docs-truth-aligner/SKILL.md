---
name: docs-truth-aligner
description: "Align README, architecture notes, handoff docs, and ledgers with the final runtime truth after implementation."
---

# Docs Truth Aligner

Use this skill when implementation changed bridge contracts, canonical paths, semantic boundaries, or Atlas behavior.

## Boundaries

- Update docs only to match code and verified behavior.
- Name historical documents as historical if they are no longer canonical.

## Inputs

- Final code state
- Ledgers
- Existing README and architecture docs

## Outputs

- Docs and ledger updates
- Canonical path declarations
- Remaining-limitations notes

## Hard Stops

- Stop if a doc statement cannot be tied back to code, tests, or a documented manual proof.
