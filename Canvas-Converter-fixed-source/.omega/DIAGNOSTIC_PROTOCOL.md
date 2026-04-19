# DIAGNOSTIC PROTOCOL

## Standard loop

1. Reproduce with the smallest deterministic input possible.
2. Identify the failing boundary:
   - extension capture
   - extension storage
   - page bridge
   - schema validation
   - content generation
   - web runtime
3. Add or update a regression test when the failure is logic-related.
4. Patch the root cause instead of the symptom.
5. Run:
   - `npm run typecheck`
   - `npm test`
   - `npm run build`
6. Record nontrivial defects and repairs in `.omega/ERROR_LEDGER.md`.

## Bridge-specific checks

1. Run a course capture from the extension popup or side panel.
2. Confirm the worker validates the bundle with `inspectCanvasCourseKnowledgePack()` before queueing or relaying it.
3. Inspect `aeonthra:pending-handoffs`:
   - newest-first
   - max `5`
   - deduped by `packId`
   - TTL `24h`
   - legacy `aeonthra:pending-bundle` migrated on read
4. Open AEONTHRA from the extension handoff path or trigger an import request from the app.
5. Confirm the message flow:
   - `NF_IMPORT_REQUEST`
   - `NF_PACK_READY`
   - `NF_PACK_ACK`
   - `NF_IMPORT_RESULT`
6. If import fails, record the exact issue code or user-facing rejection reason.
7. If import succeeds, confirm the acknowledged `handoffId + packId` pair clears only the matching queue entry.

## Manual-proof boundary

The checked-in automated proof is typecheck, unit tests, integration tests, and build. A real browser-mediated extension capture/import remains a manual verification step until a browser harness exists in the repo.
