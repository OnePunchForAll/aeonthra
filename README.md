# AEONTHRA

AEONTHRA is a local-first Canvas learning workspace. A Chrome extension captures course material, a static React app turns it into deterministic study systems, and everything stays in the browser without a backend or runtime AI calls.

Repo docs still use the OMEGA FORGE codenames:

- `SENTINEL` for the extension
- `ATLAS` for the web app
- `FOUNDRY` for the shared contracts

The shipped product and UI name in this repo is `AEONTHRA`.

## What it does

- Captures supported Canvas course content through a Manifest V3 extension in `Complete Snapshot` or `Learning Content Only` mode.
- Supports bounded visited-page sessions keyed by Canvas origin and course id, then saves them as normal local capture history on demand.
- Hands validated extension captures directly into the app through a typed local bridge contract.
- Builds deterministic concepts, relations, provenance-backed study artifacts, and a real Atlas skill tree without runtime AI calls.
- Persists the active source workspace locally, scopes notes and progress by synthesis hash, and restores offline replay bundles with deterministic validation.

## Project structure

- `apps/web` - static AEONTHRA classroom
- `apps/extension` - MV3 Chrome extension for Canvas capture and bridge handoff
- `packages/content-engine` - deterministic extraction, synthesis, provenance, and distinctness logic
- `packages/interactions-engine` - deterministic ambient and interaction systems
- `packages/schema` - shared schemas and bridge contracts
- `.agents/skills` - repo-local specialist workflows for this codebase

## Quick start

```bash
npm ci
npm run typecheck
npm test
npm run build
```

Use Node `24.x` and npm `11.x`.

### Run the web app locally

```bash
npm run dev:web
```

The local classroom is commonly available at:

`http://127.0.0.1:5176/`

### Build and load the extension

```bash
npm run build:extension
```

Load the unpacked extension from `apps/extension/dist`.

Canonical source of truth:

- `apps/extension/src/**` for extension code
- `apps/web/src/**` for the classroom
- `packages/**/src/**` for shared deterministic logic
- `apps/extension/dist/` as the generated unpacked-extension output

## Bridge contract

The extension and app communicate through a local-only bridge around:

- `NF_IMPORT_REQUEST`
- `NF_PACK_READY`
- `NF_PACK_ACK`
- `NF_IMPORT_RESULT`

Queued handoffs live in `chrome.storage.local["aeonthra:pending-handoffs"]`:

- newest-first
- max length `5`
- deduped by `packId`
- TTL `24h`
- cleared only on exact `handoffId + packId` acknowledgement
- legacy `aeonthra:pending-bundle` migrates on read

Both the extension and app reuse `inspectCanvasCourseKnowledgePack()` before queueing, relaying, or importing. A valid bridge pack must be:

- `source === "extension-capture"`
- non-empty
- not textbook-only
- backed by `captureMeta.courseId`
- backed by `captureMeta.sourceHost`
- tied to one Canvas host and one Canvas course identity

Exact rejection codes:

- `invalid-bundle`
- `wrong-source`
- `empty-bundle`
- `textbook-only`
- `missing-course-id`
- `missing-source-host`
- `missing-course-url`
- `ambiguous-course-identity`
- `host-mismatch`
- `course-identity-mismatch`

Direct bridge handoff is only supported when AEONTHRA runs on:

- `https://*.github.io/*`
- `http://localhost/*`
- `http://127.0.0.1/*`

## Browser-local persistence

- `learning-freedom:source-workspace` is the canonical stored source pointer for Canvas and textbook inputs.
- `learning-freedom:notes:<deterministicHash>` and `learning-freedom:progress:<deterministicHash>` hold scoped learner state.
- `learning-freedom:notes:active-scope` tracks the currently active note scope.
- Legacy merged-bundle and unscoped-progress keys are migration-only compatibility paths.

Reset clears the active workspace and the active scoped learner state. It does not promise to erase every historical scoped record in the browser.

## Deterministic learning posture

AEONTHRA now includes:

- field-level support metadata for `definition`, `summary`, `primer`, `mnemonic`, `commonConfusion`, and `transferHook`
- optional evidence on relations
- distinctness blanking when concept-facing fields collapse into each other
- fail-closed practice in real workspaces unless transfer or assignment evidence is source-backed
- deterministic Atlas skill nodes for foundational, applied, distinction, transfer, assignment-readiness, chapter-reward, and mastery states

When evidence is weak, the app prefers omission over generic repetition.

## Verification

Current verified command loop:

```bash
npm run typecheck
npm test
npm run build
```

Additional verified targeted coverage exists for:

- bridge queue migration, expiry, exact ack clearing, and malformed queue rejection
- bridge request and pack message handling
- field support and relation evidence
- shell practice fail-closed behavior
- Atlas prerequisite, reward, recovery, and inspector behavior
- Vite canonical path allow-listing

## Known limits

- A real browser-mediated `capture -> open AEONTHRA -> import -> NF_PACK_ACK cleanup` proof is still a manual path. The checked-in proof is unit, integration, typecheck, and build coverage.
- Same-course preservation remains intentionally lenient for older hostless captures so legacy local workspaces can still match newer host-aware captures.
- `apps/web/src/AeonthraShell.tsx` is still large and marked `// @ts-nocheck`; Atlas extraction landed, but the shell is not fully decomposed yet.
- Two legacy `output/*.log` files still remain because direct shell deletion was blocked in this desktop environment and `apply_patch` could not delete their non-UTF8 contents.

## Current scripts

- `npm run dev:web`
- `npm run test:web`
- `npm run test:extension`
- `npm run build:web`
- `npm run build:extension`
- `npm run build`
- `npm run test`
- `npm run typecheck`

## Status

AEONTHRA is a working local-first learning product, not a mockup. The current repo state includes:

- a correlated extension handoff queue with exact ack clearing
- a shared Canvas importability classifier across worker and app
- provenance-backed semantic fields and relation evidence
- fail-closed shell practice rules
- a typed Atlas skill tree with inspect-first journey UX
- repeated typecheck, test, and build verification
