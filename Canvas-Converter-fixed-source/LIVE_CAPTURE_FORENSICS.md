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

## 2026-04-17 follow-up

### Newly proven live-only start failure

- Root cause: `apps/extension/src/service-worker.ts` opened the hidden modules tab, waited for `status === "complete"`, and then sent exactly one `aeon:start-course-capture` message. In live Chrome, page load completion did not always mean the Canvas content script had attached, so the first message could die with `Receiving end does not exist` or `Could not establish connection`.
- Symptom: capture could appear dead before any content was persisted even though the worker finalization path and existing bundle tests were still green.
- Fix: added `sendCanvasMessageWithRetry()` for retryable worker-to-Canvas messages, used it for course-context detection and capture start/control messages, and collapsed full-course capture onto one forced `Complete Snapshot` mode instead of a user-selectable weaker path.
- Guards:
  - `apps/extension/src/core/service-worker.test.ts` proves a first-start handshake failure retries and still launches in complete mode.
  - `apps/extension/src/core/storage.test.ts` proves legacy `learning` default-mode settings normalize back to `complete`.

### Newly proven duplicate-tab launch failure

- Root cause: full-course capture still opened a second active `course.modulesUrl` tab even after the startup-handshake fix. On a real course, that often looked like the same page simply reopening while the live loader remained detached from the launch surface.
- Symptom: clicking Capture appeared to open the same Canvas page in another tab and not visibly start the run on the page the user clicked from.
- Fix: full-course capture now runs in the current verified Canvas tab, reuses that tab as the capture runtime surface, and dedupes overlay broadcasts when source and capture are the same tab.
- Guards:
  - `apps/extension/src/core/service-worker.test.ts` proves `START_CAPTURE` no longer creates a duplicate tab for the full-course path.
  - extension build and root typecheck pass after the same-tab cutover.

### Newly proven missing-receiver recovery gap

- Root cause: the popup could still surface a detected course via URL fallback on a verified Canvas tab even when `content-canvas.js` was not actually attached there yet, especially right after an extension reload.
- Symptom: the popup showed `COURSE DETECTED`, but clicking Capture failed with `Could not establish connection. Receiving end does not exist.`
- Fix: the worker now injects `content-canvas.js` into the verified Canvas tab on missing-receiver errors and retries automatically through the same retry loop.
- Guards:
  - `apps/extension/src/core/service-worker.test.ts` proves `chrome.scripting.executeScript(...)` is called for `content-canvas.js` before the retry succeeds.
  - extension build, extension tests, and root typecheck pass after the recovery patch.

### Newly proven message-channel hard failure after injection

- Root cause: the inject-and-retry repair still assumed `tabs.sendMessage(...)` would recover once `content-canvas.js` was present. The latest live screenshot proved the verified Canvas tab could still report a missing receiver afterward, so the message port itself was still a failure seam.
- Symptom: the popup continued to show `Could not establish connection. Receiving end does not exist.` on the same detected Canvas modules page even after the earlier self-heal path.
- Fix: `content-canvas.ts` now exposes a bootstrap API for course-context lookup, capture start/control, and overlay rendering, and the worker falls back to invoking that bootstrap through `chrome.scripting.executeScript({ func })` when the missing-receiver path persists.
- Guards:
  - `apps/extension/src/core/service-worker.test.ts` proves full-course capture can start through the injected bootstrap even when the start message never regains a receiver.
  - extension build, extension test suite, and root typecheck pass after the bootstrap fallback patch.

### Newly proven stale-worker contradiction in the popup

- Root cause: the latest live popup evidence proved a fresh popup page and fresh `build-info.json` can still talk to an older Manifest V3 service-worker instance. That older worker omitted `workerCodeSignature` and did not report a valid course detection source, even while the popup still rendered a detected course card from the latest build.
- Symptom: `COURSE DETECTED`, `worker live`, `worker-sig missing`, and `detect none` appeared together in `START DIAGNOSTICS`, followed by the same missing-receiver capture failure.
- Fix: the popup now treats that state as a hard stale-worker contradiction, blocks capture from it, and renders a `RESTART EXTENSION RUNTIME` control that reloads the extension runtime directly so the current worker bundle can take over.
- Guards:
  - `apps/extension/src/popup-diagnostics.test.ts` proves the contradiction triggers the runtime-reload recommendation.
  - extension build, full extension test suite, and root typecheck pass after the popup recovery patch.

### Newly proven execution-world mismatch in bootstrap recovery

- Root cause: once the stale-worker contradiction was removed, the next live trace proved the fresh worker still could not see `window.__aeonthraCaptureBootstrap` after `content-canvas.js` injected successfully. That narrowed the remaining seam to the bootstrap probe world itself.
- Symptom: the popup showed `worker-sig sw-recovery-trace-v3`, `detect url-fallback`, and the recovery trace `content-canvas.js injection: succeeded; bootstrap after injection: bootstrap API unavailable...`.
- Fix: the worker now executes bootstrap probes in the isolated extension world explicitly and rewrites the trace language to `isolated extension context` so the message matches the real execution boundary.
- Guards:
  - `apps/extension/src/core/service-worker.test.ts` proves bootstrap probes run with `world: "ISOLATED"`.
  - extension build, full extension test suite, and root typecheck pass after the isolated-world patch.

### Newly proven same-tab regression versus the last committed working build

- Root cause: comparing the current worker to the last committed extension build showed a real launch-path regression, not just a stale runtime. `a4e527a` opened a fresh hidden `course.modulesUrl` tab before starting capture, which guaranteed the manifest-declared Canvas content script loaded on navigation. The newer same-tab path tried to start from an already-open tab that may have been opened before the extension reload, leaving only URL fallback and no live receiver.
- Symptom: the popup could truthfully report `detect url-fallback` and a valid course card on the already-open Canvas tab, but capture start still failed with `Receiving end does not exist` because that tab never had a live content-script receiver.
- Fix: `apps/extension/src/service-worker.ts` now uses a hybrid launch policy:
  - stay in the current tab only when detection source is `live-content-script`
  - otherwise restore the older known-good background-tab launch behavior on `course.modulesUrl`
  - keep the DOM-seeded auto-start handshake as a lower-level recovery seam only for same-tab receiver recovery
  - let fresh background capture tabs wait for the normal declarative Canvas receiver instead of escalating into manual injection and auto-start on that new tab
- Guards:
  - `apps/extension/src/core/service-worker.test.ts` proves URL-fallback detection now opens a fresh background capture tab.
  - `apps/extension/src/core/service-worker.test.ts` also proves the DOM-seeded auto-start path still starts capture if receiver and bootstrap remain unavailable.
  - extension build, targeted extension tests, full extension tests, and root typecheck pass after the hybrid fallback patch.
