---
name: bridge-contract-auditor
description: "Audit emitted bridge payloads, accepted pack contracts, and end-to-end import truth for the extension-to-app handoff."
---

# Bridge Contract Auditor

Use this skill when changing the extension handoff, queue shape, or app import validator.

## Boundaries

- Focus on emitted shape, accepted shape, migration shape, and exact rejection reasons.
- Do not widen the contract to hide bad data.
- Keep manual JSON import and offline replay boundaries explicit.

## Inputs

- Extension queue and service-worker code
- Web bridge and import code
- Shared schema definitions
- Current failing payload examples or tests

## Outputs

- Exact mismatch list
- Contract or migration patch
- Regression tests for success, mismatch, and clear behavior
- A concise root-cause note for bridge docs

## Hard Stops

- Stop if the proposed fix would blur extension capture and manual import semantics.
- Stop if the fix depends on runtime services, remote APIs, or unverifiable browser state.
