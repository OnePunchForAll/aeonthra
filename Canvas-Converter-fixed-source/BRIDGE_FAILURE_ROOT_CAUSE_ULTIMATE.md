# Bridge Failure Root Cause Ultimate

## Exact symptom

The app reported that a queued bridge import was valid JSON but not a Canvas extension capture, even though the extension had captured a real Canvas course page and the user was following the extension handoff path.

## Reproduction path

### Historical failure path

1. Build the extension and load `apps/extension/dist`.
2. Capture a real Canvas course page or save a visited-page session as a normal history record.
3. Open AEONTHRA locally at `http://127.0.0.1:5176/`.
4. Trigger the extension handoff path.
5. Observe one of the pre-fix failures:
   - the worker queued or relayed a schema-valid bundle that was not an importable Canvas extension capture
   - the queue treated a fresh handoff as expired because `queuedAt` inherited the older bundle capture time
   - the app ignored a valid extension-originated `NF_PACK_READY` because request state had already cleared

### Current manual proof path

The current manual proof sequence is documented in `HUMAN_TRIGGER_SEQUENCE.md`. In this environment, the checked-in proof remains automated tests plus build/typecheck; the real Chrome-mediated capture/import is still manual.

## Actual emitted payload shape

### Stored queue envelope

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

Storage key:

- `chrome.storage.local["aeonthra:pending-handoffs"]`

Queue rules:

- newest-first
- max `5`
- dedupe by `packId`
- TTL `24h`
- exact clear on `handoffId + packId`
- legacy `aeonthra:pending-bundle` migrates on read

### Bridge message

```ts
{
  source: "learning-freedom-bridge",
  type: "NF_PACK_READY",
  requestId,
  handoffId,
  packId,
  pack
}
```

## Actual accepted payload shape

The app accepts only a bridge-tagged `NF_PACK_READY` whose `pack` passes `inspectCanvasCourseKnowledgePack()`.

A valid accepted pack must be:

- `source === "extension-capture"`
- non-empty
- not textbook-only
- backed by `captureMeta.courseId`
- backed by `captureMeta.sourceHost`
- traceable to one Canvas host and one Canvas course identity through captured URLs

## Exact mismatch(s)

Three real mismatches were involved across the live failure and the final hardening pass:

1. Historical contract mismatch:
   - the worker once treated "schema-valid capture bundle" as enough
   - the app required "importable Canvas extension capture"
   - result: valid JSON could still fail the Canvas bridge intake truth boundary

2. Queue freshness mismatch:
   - `apps/extension/src/core/storage.ts` was stamping `queuedAt` from `bundle.capturedAt`
   - result: a newly queued handoff built from an older saved capture could look expired immediately under the `24h` queue TTL

3. Timing / request-state mismatch:
   - the extension could emit a valid `NF_PACK_READY` for the `Open AEONTHRA` flow after the app had already cleared local request state
   - result: the app could ignore a real importable pack purely because the page timing drifted

## Stale build involvement

No logic root cause in the final fix depended on stale build artifacts, but stale human loading remains a real risk if Chrome is pointed at the wrong folder.

Canonical unpacked extension folder after the fix:

- `apps/extension/dist`

Contributors should never load `apps/extension/` as the unpacked extension root.

## Exact files changed

- `packages/schema/src/index.ts`
- `apps/extension/src/core/storage.ts`
- `apps/extension/src/service-worker.ts`
- `apps/web/src/App.tsx`
- `apps/extension/src/core/storage.test.ts`
- `apps/extension/src/core/service-worker.test.ts`
- `apps/web/src/App.test.ts`
- `apps/web/src/lib/bridge.test.ts`

## Exact tests added or tightened

- `apps/extension/src/core/storage.test.ts`
  - legacy slot migration
  - queue dedupe by `packId`
  - queue expiry
  - malformed queue rejection
  - exact `handoffId + packId` clearing
- `apps/extension/src/core/service-worker.test.ts`
  - malformed pending handoff rejection
  - wrong-source rejection
  - exact `NF_PACK_READY` envelope emission
- `apps/web/src/App.test.ts`
  - requested pack acceptance
  - exact rejection reasons
  - valid extension-originated `NF_PACK_READY` acceptance with no active request
  - stale request-id ignore behavior
- `apps/web/src/lib/bridge.test.ts`
  - same-window schema filtering
  - exact ACK envelope emission

## Exact validation steps

Verified in this environment:

- `npm run test --workspace @learning/web`
- `npm run test --workspace @learning/extension -- src/core/service-worker.test.ts src/core/storage.test.ts`
- `npm run typecheck`
- `npm test`
- `npm run build`

Not fully agent-proven in this environment:

- a real Chrome-mediated `capture -> open AEONTHRA -> import -> NF_PACK_ACK -> queue clear` run against a live Canvas page

## Canonical conclusion

The bridge failure was not one thing. It was a contract-truth problem first, then a queue-timestamp problem, then a timing-drift acceptance problem. The current source tree fixes all three in code and tests. The remaining gap is manual browser proof, not a known unresolved contract mismatch.
