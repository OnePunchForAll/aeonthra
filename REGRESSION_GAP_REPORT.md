# Regression Gap Report

## Gaps closed in this pass

- The live-path message router now handles `aeon:item-captured`.
- The worker records per-item verdicts and final inspection traces.
- Empty-bundle failures now append top rejection reasons when they exist.
- Stored queue entries are revalidated for importability, not just schema shape.
- Queue envelopes now come from `createBridgeHandoffEnvelope()`.
- The unpacked extension build now carries a validated `build-info.json` marker.
- The side panel surfaces build identity and live forensics.
- Regression coverage now exists for:
  - worker routing of `aeon:item-captured`
  - build marker validation
  - poisoned queue cleanup
  - queue timestamp semantics
  - empty-bundle rejection summaries
  - extension state exposure of build/forensics

## Remaining gaps

### 1. Authenticated Canvas live proof

- Status: unresolved
- Why it remains: no authenticated Canvas session was available in this environment
- Risk: medium
- What would close it: one manual rerun of the original failing course flow using the new side-panel forensics

### 2. DOM-heavy page fixtures

- Status: unresolved
- Why it remains: the current regression suite does not yet carry real Canvas HTML fixtures for:
  - div-heavy pages
  - reply-heavy discussions
  - locked quizzes
  - iframe-heavy assignment bodies
- Risk: medium
- What would close it: checked-in content-canvas fixtures from the next live failure or near-failure capture

### 3. End-to-end browser harness for `capture -> import -> ack`

- Status: unresolved
- Why it remains: there is still no authenticated browser harness that proves queue creation, bridge relay, app import, and `NF_PACK_ACK` clearing in one run
- Risk: medium
- What would close it: a reproducible local browser proof path or a valid manual-proof capture attached to the repo

### 4. Side-panel UI render coverage

- Status: unresolved
- Why it remains: the new forensic surfaces are not under a dedicated render test
- Risk: low
- What would close it: a lightweight render test for `Build Identity` and `Live Capture Forensics`

## Current stop-rule judgment

- Material code-level improvement still existed at the start of this pass and was applied.
- Two final loops now converge on one remaining blocker: authenticated live proof of the original course path.
- The repo is no longer ambiguous about where the next manual proof must look.
