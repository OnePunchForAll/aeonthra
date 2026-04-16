# Architecture

This repository currently ships a truthful vertical slice of the larger OMEGA FORGE concept.

## Current mapping

- `apps/extension`: SENTINEL capture extension
- `apps/web`: ATLAS static learning app
- `packages/schema`: FOUNDRY JSON transport and bridge contracts
- `packages/content-engine`: deterministic learning synthesis

The repo still uses those OMEGA FORGE codenames in architecture docs. The current product surface and UI brand are AEONTHRA.

## Flow

1. SENTINEL starts from an open Canvas course and discovers course-linked items it can capture from modules and core course surfaces.
2. The extension normalizes each discovered item into a local capture bundle and keeps warnings when a page is too thin or too UI-heavy.
3. The extension stores the bundle as a pending pack, then opens or focuses ATLAS when the user chooses `Open AEONTHRA` or when auto-handoff is enabled.
4. The page bridge requests the pending pack.
5. ATLAS validates and imports the pack.
6. The deterministic engine derives the five-phase learning protocol and four engine profiles.
7. The workspace persists locally and can export the bundle again.

## Truthful scope

- The extension captures course material it can reach from the current Canvas course context; it does not promise universal extraction of arbitrary or unseen pages.
- The app generates deterministic study content from the imported material.
- The system does not rely on any runtime API or backend.
