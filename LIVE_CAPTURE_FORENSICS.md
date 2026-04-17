# Live Capture Forensics

## Exact symptom

- The real Canvas course traversal completed and showed processed page counts.
- The same run still ended with `No Importable Pages Captured`.
- A prior mixed-host identity diagnosis and repair did not clear that literal live symptom.

## Exact reproduction path

### Verified repo-level reproduction

1. `apps/extension/src/content-canvas.ts` emits `chrome.runtime.sendMessage({ type: "aeon:item-captured", ... })` whenever a page actually yields a `CaptureItem`.
2. Before this pass, `apps/extension/src/service-worker.ts` only routed `type.startsWith("aeon:job-")`.
3. Because `aeon:item-captured` never entered `handleContentProgress()`, the partial bundle never grew even while traversal kept running.
4. Finalization then inspected an empty extension bundle and truthfully produced `empty-bundle`, which maps to `No Importable Pages Captured`.

### Authenticated live-browser reproduction

- Not available in this environment.
- The repo is now instrumented so the next manual retest records the missing proof directly in the extension side panel and local storage.

## Current evidence

| Field | Evidence |
| --- | --- |
| Exact live symptom | `No Importable Pages Captured` after successful traversal |
| Exact user-reported page count | `36/37` processed |
| Actual live page URLs captured | Unavailable from this environment. Next manual run exposes them in `state.forensics.itemVerdicts[].url`. |
| Actual live importable count | `0` in the failing reported run |
| Actual live rejected count | Unavailable from the original run because per-page verdicts were not being surfaced |
| Proven repo-level rejection code behind the literal message | `empty-bundle` |
| Proven primary mismatch | `aeon:item-captured` was emitted but not routed by the worker |
| Proven secondary mismatches | stale queued import-invalid handoffs could survive sanitization; checked-in `apps/extension/dist` was stale and missing `build-info.json` before rebuild |

## Actual emitted payload example

```json
{
  "type": "aeon:item-captured",
  "jobId": "job-abc123",
  "item": {
    "canonicalUrl": "https://canvas.example.test/courses/42/assignments/7",
    "kind": "assignment",
    "title": "Assignment 7"
  },
  "resources": [],
  "rawHtml": "<article>...</article>"
}
```

## Actual accepted payload contract

### Content-script to worker capture progress

- Accepted now:
  - `type === "aeon:item-captured"`
  - `type.startsWith("aeon:job-")`
- Rejected before this pass:
  - `aeon:item-captured` never entered `handleContentProgress()`

### Queue and bridge importability

- Accepted only when `inspectCanvasCourseKnowledgePack(pack).ok === true`
- Rejected with exact codes when false:
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

## Exact mismatches proven

1. `apps/extension/src/content-canvas.ts` emitted `aeon:item-captured`, but `apps/extension/src/service-worker.ts` only auto-routed `aeon:job-*`.
2. `apps/extension/src/core/storage.ts` allowed schema-valid but import-invalid queued handoffs to survive queue sanitization.
3. `apps/extension/src/core/storage.ts` had stale dead code around queue timestamp normalization after the queue-time fix landed.
4. `apps/extension/dist` was stale relative to source until `npm run build:extension` regenerated `build-info.json` and the current unpacked output.

## Exact files involved

- `apps/extension/src/service-worker.ts`
- `apps/extension/src/content-canvas.ts`
- `apps/extension/src/core/storage.ts`
- `apps/extension/src/core/types.ts`
- `packages/schema/src/index.ts`
- `apps/extension/src/side-panel.tsx`
- `apps/extension/scripts/build.mjs`

## Exact fixes applied

1. Routed `aeon:item-captured` through `handleContentProgress()` so persisted items actually reach the partial bundle.
2. Added capture forensics storage and UI surfaces for:
   - per-item verdicts
   - partial bundle counts
   - final inspection trace
   - top rejection reasons
   - loaded build identity
3. Revalidated stored handoff queue entries with `inspectCanvasCourseKnowledgePack()` and dropped poisoned entries.
4. Switched queued handoff creation to `createBridgeHandoffEnvelope()` so queue time is stamped at queue time.
5. Added a real extension build marker (`apps/extension/dist/build-info.json`) and surfaced it in the side panel.
6. Normalized discovered Canvas URLs onto the detected course origin and repaired announcement/file/module discovery metadata drift.
7. Added regression tests for the message-router failure, poisoned queue cleanup, build marker validation, and empty-bundle rejection summaries.

## Remaining blockers

- No authenticated Canvas session was available here, so the exact previously failing live page could not be rerun end-to-end in this environment.
- The next manual retest is still required to capture the real page URL list and confirm whether any page-extraction heuristics still drop too many discussion/page/quiz bodies on that specific course.
