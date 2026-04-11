# Architecture

This repository currently ships a truthful vertical slice of the larger OMEGA FORGE concept.

## Current mapping

- `apps/extension`: SENTINEL capture extension
- `apps/web`: ATLAS static learning app
- `packages/schema`: FOUNDRY JSON transport and bridge contracts
- `packages/content-engine`: deterministic learning synthesis

## Flow

1. SENTINEL captures a highlight or visible page.
2. The extension merges the capture into a local bundle.
3. `Done Learning` stores the bundle as a pending pack and opens or focuses ATLAS.
4. The page bridge requests the pending pack.
5. ATLAS validates and imports the pack.
6. The deterministic engine derives the five-phase learning protocol and four engine profiles.
7. The workspace persists locally and can export the bundle again.

## Truthful scope

- The extension captures what the user explicitly captures today.
- The app generates deterministic study content from the imported material.
- The system does not rely on any runtime API or backend.
