# Architecture

This repository ships a truthful local-first vertical slice of OMEGA FORGE under the shipped AEONTHRA product brand.

## Current mapping

- `apps/extension`: SENTINEL capture extension
- `apps/web`: ATLAS static learning app
- `packages/schema`: FOUNDRY JSON transport and bridge contracts
- `packages/content-engine-v2`: canonical production implementation of `@learning/content-engine`

## End-to-end flow

1. SENTINEL captures supported Canvas course content or saves a visited-page session as a normal `extension-capture` history record.
2. Before queueing or relaying anything, the extension runs `inspectCanvasCourseKnowledgePack()` from `packages/schema/src/index.ts`.
3. Valid bridge handoffs are stored as `BridgeHandoffEnvelope` entries in `aeonthra:pending-handoffs`.
4. The page bridge and worker coordinate around `NF_IMPORT_REQUEST`, `NF_PACK_READY`, `NF_PACK_ACK`, and `NF_IMPORT_RESULT`, with additive `requestId`, `handoffId`, and `packId` correlation.
5. AEONTHRA reuses the same importability classifier before it accepts a queued extension capture.
6. The app persists source state in `learning-freedom:source-workspace`, scopes notes and progress by `learningBundle.synthesis.deterministicHash`, and can also restore deterministic offline replay bundles.
7. The deterministic engine in `packages/content-engine-v2/src` derives concepts, relations, provenance, assignment signals, and the Atlas skill tree from the imported sources.
8. The shell materializes learner progress into locked, available, in-progress, earned, mastered, readiness, and recovery states without any backend.

## Extension persistence

- `aeonthra:runtime`
- `aeonthra:history`
- `aeonthra:pending-handoffs`
- `aeonthra:sessions`
- `aeonthra:partial-bundle`
- `aeonthra:partial-warnings`
- `aeonthra:partial-raw-html`

Queue rules for `aeonthra:pending-handoffs`:

- newest-first
- max `5`
- dedupe by `packId`
- TTL `24h`
- exact clear on `handoffId + packId`
- legacy `aeonthra:pending-bundle` migration on read

## Web persistence

- Canonical source pointer store: `learning-freedom:source-workspace`
- Active note-scope pointer: `learning-freedom:notes:active-scope`
- Scoped learner state:
  - `learning-freedom:notes:<deterministicHash>`
  - `learning-freedom:progress:<deterministicHash>`
- Migration-only compatibility paths:
  - legacy merged bundle key
  - legacy unscoped progress key

## Canonical source of truth

- Extension source: `apps/extension/src`
- Unpacked extension artifact: `apps/extension/dist`
- Web app source: `apps/web/src`
- Shared contracts: `packages/schema/src`
- Deterministic content engine: `packages/content-engine-v2/src`
- Atlas seams: `apps/web/src/lib/atlas-skill-tree.ts` and `apps/web/src/lib/atlas-shell.ts`

## Verified limits

- Browser-mediated extension capture/import still lacks a checked-in full E2E browser harness; the live proof path remains manual.
- Same-course preservation is still lenient for hostless legacy captures so older local state can match newer host-aware captures.
- Reset clears the active stored workspace and active scoped learner state, not every historical scoped record in local storage.
- `AeonthraShell.tsx` remains a large shell even after Atlas extraction.
