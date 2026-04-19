---
name: extension-canonicality-checker
description: "Verify the canonical extension source, build output, load path, and stale-build risks before claiming the bridge is fixed."
---

# Extension Canonicality Checker

Use this skill when build artifacts, unpacked load paths, or source-vs-dist ambiguity could falsify a bridge result.

## Boundaries

- Treat `apps/extension/src` as the source of truth and `apps/extension/dist` as the only supported unpacked artifact unless explicitly documented otherwise.
- Name stale folders and duplicate outputs precisely.

## Inputs

- Extension build scripts
- Extension manifest and emitted files
- Docs and human load instructions

## Outputs

- Canonical load path decision
- Build or docs changes that remove ambiguity
- Tests or checks that fail on stale assumptions

## Hard Stops

- Stop if the fix would require Chrome profile surgery or personal browser changes outside the repo.
