# Importability Root Cause

## Exact live symptom

- The extension runtime ends with the phase label `No Importable Pages Captured`.
- The same run can still show high progress such as `36/37` in the capture UI.
- That combination means the failure is not necessarily "nothing was traversed" and not necessarily "nothing was extracted." In this codebase, the final phase label is reused for every importability-classifier rejection inside `apps/extension/src/service-worker.ts`.

## Exact likely reproduction path

1. Open a real Canvas course on a host such as `https://canvas.school.edu/courses/42/modules`.
2. Start a full-course extension capture.
3. `apps/extension/src/content-canvas.ts` discovers assignments, discussions, pages, quizzes, files, announcements, and syllabus via Canvas APIs.
4. Some discovered `html_url` values come back on a different but equivalent Canvas host, such as `https://school.instructure.com/courses/42/assignments/7`.
5. The extension captures items successfully, but preserves those mixed-host URLs verbatim in `item.canonicalUrl`.
6. `apps/extension/src/service-worker.ts` finalizes the partial bundle and sends it through `inspectCanvasCourseKnowledgePack()` from `packages/schema/src/index.ts`.
7. The classifier sees more than one Canvas host for the same course and rejects the bundle as `ambiguous-course-identity` or `host-mismatch`.
8. The runtime then shows the generic phase label `No Importable Pages Captured`, even though many items were actually captured.

## Exact classifier and importability files involved

- `apps/extension/src/content-canvas.ts`
- `apps/extension/src/service-worker.ts`
- `packages/schema/src/index.ts`
- `apps/extension/src/core/service-worker.test.ts`

## Actual reason processed pages became non-importable

The full-course capture path trusted Canvas API `html_url` values as canonical item URLs without normalizing them back to the detected course origin.

That created bundles with mixed course hosts:

- `captureMeta.sourceHost` came from the active course tab host.
- one or more captured item URLs came from a different Canvas host returned by the API.

`inspectCanvasCourseKnowledgePack()` correctly treats that as not one stable Canvas course identity, so the finished bundle is rejected before it can be saved or handed off.

The user-facing runtime label then obscured the real reason by always using `No Importable Pages Captured` for every classifier rejection, not just empty bundles.

## Issue classification

- Primary cause: metadata / course-identity mismatch
- Secondary cause: misleading generic runtime labeling in the service worker
- Not the root cause: allowlist strictness
- Not the root cause: discussion/forum support removal
- Not the root cause: packaging step stripping markers
- Not the root cause: stale `dist` by itself

## Truthful conclusion

This live failure is primarily a metadata canonicalization bug in the extension capture path, not a traversal failure and not a bridge-contract regression. The importability classifier is doing what it was designed to do; the extension is feeding it mixed-host Canvas URLs for one course.
