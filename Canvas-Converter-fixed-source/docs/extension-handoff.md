# Extension Handoff

The extension and app communicate through a narrow local page bridge.

## Primary messages

- `NF_IMPORT_REQUEST`
- `NF_PACK_READY`
- `NF_PACK_ACK`
- `NF_IMPORT_RESULT`

Diagnostic `NF_PING` and `NF_PONG` still exist for bridge checks, but they are not part of the normal learner flow.

## Capture modes

- `Complete Snapshot`: broader recovery-oriented capture with raw HTML, metadata, files, discussions, and more Canvas surface.
- `Learning Content Only`: smaller forge-ready capture that strips more Canvas chrome.
- `Visited-page session`: bounded learning-mode-only accumulation of pages the learner actually visited, with explicit save and clear controls.

## Queue contract

Importable handoffs are stored in `chrome.storage.local["aeonthra:pending-handoffs"]` as:

```ts
{
  handoffId,
  packId,
  queuedAt,
  courseId,
  sourceHost,
  pack
}
```

Rules:

- newest-first
- max queue length `5`
- dedupe by `packId`
- TTL `24h`
- clear only on exact `handoffId + packId`
- migrate legacy `aeonthra:pending-bundle` on read

## Importability gate

Before queueing, relaying, or importing, both sides run `inspectCanvasCourseKnowledgePack()`.

A valid bridge pack must be:

- `source === "extension-capture"`
- non-empty
- not textbook-only
- backed by `captureMeta.courseId`
- backed by `captureMeta.sourceHost`
- traceable to one Canvas host and one Canvas course identity through captured URLs

Exact failure codes:

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

## Current flow

1. The user captures supported content or saves a visited-page session as a normal capture.
2. The worker validates the bundle and queues it as a correlated handoff envelope.
3. The extension opens or focuses AEONTHRA from the configured classroom URL when the user chooses the handoff path or when auto-handoff is enabled.
4. `NF_IMPORT_REQUEST` causes the worker to inspect the queue again before it relays `NF_PACK_READY`.
5. AEONTHRA may also accept a validated extension-originated `NF_PACK_READY` when no request is active, as long as the pack itself is bridge-tagged and importable. This keeps the `Open AEONTHRA` path from failing on page-timing drift alone.
6. The app imports the pack, emits `NF_PACK_ACK`, and the extension clears only the matching `handoffId + packId`.
7. Manual JSON import and offline replay restore remain separate from the live extension queue.

## Supported classroom URLs

Direct handoff is only supported when the bridge content script can load on the classroom origin:

- `https://*.github.io/*`
- `http://localhost/*`
- `http://127.0.0.1/*`

Load the unpacked extension from `apps/extension/dist`.

## Current limitation

The remaining limitation is proof, not queue correlation: the full browser-mediated `capture -> open AEONTHRA -> import -> ack -> queue clear` path is still a manual verification path in this repo.
