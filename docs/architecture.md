# Architecture

This repository currently ships a truthful vertical slice of the larger OMEGA FORGE concept.

## Current mapping

- `apps/extension`: SENTINEL capture extension
- `apps/web`: ATLAS static learning app
- `packages/schema`: FOUNDRY JSON transport and bridge contracts
- `packages/content-engine`: deterministic learning synthesis

The repo still uses those OMEGA FORGE codenames in architecture docs. The current product surface and UI brand are AEONTHRA.

## Flow

1. SENTINEL starts from an open Canvas course and captures supported course content in `Complete Snapshot` or `Learning Content Only` mode.
2. The extension can also accumulate a bounded visited-page session keyed by `origin + courseId`, then materialize that session into normal local capture history on explicit save.
3. The extension stores finalized captures locally, then opens or focuses AEONTHRA when the user chooses `Open AEONTHRA` or when auto-handoff is enabled.
4. The page bridge and worker exchange a narrow validated handoff contract around `NF_IMPORT_REQUEST`, `NF_PACK_READY`, `NF_PACK_ACK`, and `NF_IMPORT_RESULT`.
5. AEONTHRA validates and imports the pack, preserves scoped notes/progress by workspace identity, and can also restore deterministic offline replay bundles.
6. The deterministic engine derives concepts, relations, assignment signals, and the Atlas skill tree from the imported source bundle.
7. The shell materializes learner progress into locked, available, in-progress, earned, mastered, readiness, and recovery states without any backend.

## Truthful scope

- The extension captures supported course material it can deterministically reach from the current Canvas course context; it does not promise universal extraction of arbitrary or unseen pages.
- The app generates deterministic study content, Atlas progression, and replay bundles from the imported material.
- The system does not rely on any runtime API or backend.
