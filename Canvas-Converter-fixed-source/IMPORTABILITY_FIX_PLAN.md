# Importability Fix Plan

## Goal

Make real Canvas course captures remain importable when Canvas API `html_url` values use an equivalent host different from the active course tab host.

## Narrow repair scope

1. Add a small URL-normalization helper in `apps/extension/src/content-canvas.ts`.
2. For course-bound discovered items, rewrite same-course URLs onto `payload.course.origin` before capture.
3. Keep discussion pages supported.
4. Tighten the runtime error label in `apps/extension/src/service-worker.ts` so non-empty classifier failures no longer masquerade as "no importable pages."
5. Add regression coverage for the mixed-host same-course case.
6. Rebuild `apps/extension/dist` and verify the canonical unpacked path remains `apps/extension/dist`.

## Files expected to change

- `apps/extension/src/content-canvas.ts`
- `apps/extension/src/service-worker.ts`
- `apps/extension/src/core/service-worker.test.ts`
- `packages/schema/src/index.ts` only if a test seam is needed, otherwise leave it unchanged
- `.omega/IMPLEMENTATION_LEDGER.md`
- `.omega/ERROR_LEDGER.md`
- `.omega/TODO_NOW.md`

## Verification target

- A bundle with captured course items on mixed but same-course Canvas hosts must finalize as importable after normalization.
- The runtime should only say `No Importable Pages Captured` when the bundle is actually empty.
- The built unpacked extension in `apps/extension/dist` must match the repaired source.
