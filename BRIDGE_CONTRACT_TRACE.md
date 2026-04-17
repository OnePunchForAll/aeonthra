# Bridge Contract Trace

## End-to-end path

1. Canvas content script discovers queue items and fetches supported surfaces.
2. For every retained page, `apps/extension/src/content-canvas.ts` emits `aeon:item-captured`.
3. `apps/extension/src/service-worker.ts` merges the item into the partial bundle and records capture forensics.
4. Finalization builds an `extension-capture` bundle and runs `traceCanvasCourseKnowledgePack()` plus `inspectCanvasCourseKnowledgePack()`.
5. If importable, `apps/extension/src/core/storage.ts` queues a `BridgeHandoffEnvelope`.
6. `bridge-message / NF_IMPORT_REQUEST` reads the next valid handoff and emits `NF_PACK_READY`.
7. `apps/web/src/App.tsx` validates the pack with the same importability classifier.
8. If accepted, the app imports the bundle and emits `NF_PACK_ACK`.
9. The extension clears the exact matching `handoffId + packId`.

## Step-by-step contract table

| Step | Producer | Message / storage shape | Acceptance rule | Failure mode now surfaced |
| --- | --- | --- | --- | --- |
| Capture progress | `content-canvas.ts` | `aeon:item-captured` | worker must explicitly route `aeon:item-captured` | before this pass, the worker dropped the message and the partial bundle stayed empty |
| Per-page diagnostics | `content-canvas.ts` | `aeon:job-item-verdict` | worker appends verdict to forensics for the active `jobId` | missing verdicts now mean the item never reached the worker or job id drifted |
| Partial bundle | `service-worker.ts` | local `aeonthra:partial-bundle` | `mergeCaptureBundle()` must grow `items[]` | empty partial bundle now correlates directly with verdicts and persisted counts |
| Final bundle trace | `service-worker.ts` | `CaptureBundle` plus `traceCanvasCourseKnowledgePack()` | `inspectCanvasCourseKnowledgePack().ok === true` | exact rejection code and top verdict reasons are written to forensics and runtime |
| Pending queue | `core/storage.ts` | `BridgeHandoffEnvelope` | queue entries are revalidated with `inspectCanvasCourseKnowledgePack()` on every sanitize/read | poisoned schema-valid but import-invalid entries are dropped before relay |
| Bridge relay | `service-worker.ts` | `NF_PACK_READY` | only emitted for valid queued handoffs | malformed or invalid queued packs return `NF_IMPORT_RESULT` with exact error |
| App intake | `apps/web/src/App.tsx` | `NF_PACK_READY.pack` | same `inspectCanvasCourseKnowledgePack()` classifier | app rejects invalid packs with exact bridge-facing reason |
| Queue clearing | extension on `NF_PACK_ACK` | `handoffId` + `packId` | both fields must match one queued envelope | stale or unrelated acks no longer clear the wrong queue entry |

## Proven mismatches fixed in this pass

### 1. Capture-message router mismatch

- Emitted contract: `aeon:item-captured`
- Accepted contract before fix: `aeon:job-*`
- Result: no retained items ever reached the partial bundle on the live path
- Fix: the worker now routes `type === "aeon:item-captured" || type.startsWith("aeon:job-")`

### 2. Queue acceptance mismatch

- Stored contract before fix: schema-valid handoff envelopes
- App acceptance contract: importable Canvas extension captures only
- Result: stale invalid queue entries could survive until bridge/app import time
- Fix: queue sanitization now reruns `inspectCanvasCourseKnowledgePack(parsed.pack)` and drops poisoned entries

### 3. Source/dist canonicality mismatch

- Source expected: runtime-readable `build-info.json`
- Real checked-in `dist` before rebuild: missing marker
- Result: Chrome could load a stale dist build with no visible proof in the side panel
- Fix: `apps/extension/scripts/build.mjs` now writes `build-info.json`, validates it, and the side panel renders the build identity or a missing-marker warning

## Actual accepted payloads

### Worker-accepted capture progress

```json
{
  "type": "aeon:item-captured",
  "jobId": "job-abc123",
  "item": { "canonicalUrl": "https://canvas.example.test/courses/42/assignments/7" },
  "resources": []
}
```

### Queue envelope

```json
{
  "handoffId": "stable hash of pack id + queuedAt",
  "packId": "captureBundleId(pack)",
  "queuedAt": "ISO timestamp",
  "courseId": "normalized captureMeta.courseId",
  "sourceHost": "normalized captureMeta.sourceHost",
  "pack": "importable extension-capture bundle"
}
```

### Bridge pack

```json
{
  "source": "learning-freedom-bridge",
  "type": "NF_PACK_READY",
  "requestId": "bridge request id",
  "handoffId": "queued handoff id",
  "packId": "queued pack id",
  "pack": "importable extension-capture bundle"
}
```

## Current truth

- Queueing, relay, and app import now share one classifier.
- The live-path message router now accepts retained page payloads.
- The bridge can still only be fully proven against a real authenticated Canvas course by a manual retest or a future browser harness with valid course access.
