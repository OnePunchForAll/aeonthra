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
6. Record the defect and the fix in `.omega/ERROR_LEDGER.md` if it was nontrivial.

## Bridge-specific checks

1. Capture at least one page or highlight in the extension.
2. Click `Done Learning`.
3. Confirm the workspace opens and either:
   - auto-imports the queued pack, or
   - leaves the export fallback available.
4. If import fails, inspect:
   - extension status for a queued pack
   - page-bridge message flow
   - bundle schema validation
   - workspace status messages
