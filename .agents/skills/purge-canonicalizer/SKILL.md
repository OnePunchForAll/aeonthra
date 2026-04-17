---
name: purge-canonicalizer
description: "Remove stale artifacts only by evidence and document every keep, delete, and archive decision."
---

# Purge Canonicalizer

Use this skill when repo hygiene and source-of-truth drift need an explicit deletion pass.

## Boundaries

- Delete only what no longer earns its place.
- Record every inspected path and the reason it was deleted, kept, or archived.
- Prefer narrowing ambiguous build or doc surfaces over silent coexistence.

## Inputs

- Repo tree inventory
- Build outputs
- Docs and prompt sprawl
- Ignore rules

## Outputs

- Purge report
- Safe deletions
- Preservation rationale for anything left behind

## Hard Stops

- Stop if a path is locked or if its purpose cannot be resolved from the repo without risky guessing.
