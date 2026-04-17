---
name: canvas-live-zero-failure
description: Use this skill whenever the real Chrome -> Canvas -> extension -> queue -> app import flow is broken, partially broken, misleadingly green in tests, or not proven end-to-end. This skill is mandatory for any live capture/importability/bridge/classification failure. It exists to eliminate speculative root-cause claims and force evidence, instrumentation, reproduction, verification, and regression hardening until the exact live failure is actually resolved.
---

# Canvas Live Zero Failure

## Core mission
Make the real Canvas capture flow work on the actual live page path.

This skill exists because code/test/build green status is not enough.
If the live user flow still fails, the system is still broken.

## Highest law
Never declare success from code reasoning alone when the defect is live-browser-facing.

## Required philosophy
- Truth over theory
- Reproduction over storytelling
- Raw evidence over guessed root cause
- Exact rejection reason over vague labels
- Instrumentation over speculation
- Live-proof over synthetic proof
- Canonical source of truth over repo ambiguity
- Omission over fake certainty
- Working flow over pretty diff

## Hard constraints
- No runtime LLMs
- No backend
- No auth
- No analytics / telemetry
- No fake success claims
- No “probably fixed”
- No stopping at green tests if the live failure remains
- No broad repo churn unless directly useful to this failure
- No preserving stale artifacts that create source-of-truth confusion

## Trigger conditions
Use this skill immediately when any of the following occur:
- “No Importable Pages Captured”
- “Capture Identity Rejected”
- queue import fails
- extension captured pages but app rejects them
- traversal succeeds but importable count is zero
- tests pass but live Chrome flow still fails
- src/dist ambiguity exists
- payload shape disagreement exists
- metadata/classifier/identity explanations have changed more than once without fixing the live defect

## Non-negotiable workflow

### 1. Review current truth before editing
Read:
- active AGENTS.md files
- latest audit / bridge / importability docs
- current extension build script
- manifest
- apps/extension/src/**
- apps/extension/dist/**
- apps/web import / queue / bridge handlers
- schema contracts
- docs for extension handoff and canonical path
- recent error ledgers / implementation ledgers

### 2. Reproduce the exact live failure
Do not generalize from memory.
Focus on the exact user-facing symptom.
If the environment does not allow true authenticated live reproduction, recreate the closest possible path and instrument for the next manual proof.

### 3. Add forensic instrumentation before guessing
Add temporary or gated diagnostics that expose:
- actual captured page URLs
- page-type classification
- importable vs non-importable decision
- exact rejection reason per page
- exact emitted payload shape
- exact app-side accepted payload shape
- exact validator failure
- exact queue contents
- exact handoff IDs / pack IDs / metadata fields
- exact course identity fields
- exact build identity / version / timestamp of loaded extension
- whether src and dist match

### 4. Fail loudly and precisely
Replace generic labels with precise ones.
If a page is non-importable, the reason must be explicit.
If a bundle is rejected, say exactly which contract field or classifier rule failed.
If the root cause is stale build loading, prove it.

### 5. Canonicalize the extension truth
Prove the exact unpacked extension folder the user must load.
Make stale or wrong build targets hard to load incorrectly.
If necessary, add visible build identity/version markers and docs.

### 6. Fix the real contract
Do not patch only UI text.
Fix the actual failing layer:
- capture
- classification
- metadata
- packaging
- queue
- validation
- bridge
- import
- stale-state contamination
- canonicality mismatch
- or any combination of the above

### 7. Turn the live failure into regression coverage
Create fixtures/tests from the real failing shape.
Protect against:
- zero-importable false negatives
- mixed host / same course confusion
- discussion/forum misclassification
- stale dist/src mismatch
- payload discriminator mismatch
- queue poisoning / stale state carryover
- hostless / alternate-host / same-course edge cases
- per-page rejection reason regressions

### 8. Verify in layers
Verification order:
1. targeted tests
2. full test suite
3. typecheck
4. build
5. extension build
6. source-of-truth / dist verification
7. live/manual verification checklist
8. if possible, same-page live proof

### 9. Stop condition
Do not stop because the repo looks cleaner.
Stop only when one of these is true:
- the same live flow now works
- or an exact environment blocker remains and the repo now exposes the raw proof needed to resolve it quickly
- or two final review loops find no material improvement left

## Required artifacts
Create/update all of these during a run:
- LIVE_CAPTURE_FORENSICS.md
- IMPORTABILITY_DECISION_TABLE.md
- BRIDGE_CONTRACT_TRACE.md
- CANONICAL_EXTENSION_PATH.md
- LIVE_PROOF_CHECKLIST.md
- REGRESSION_GAP_REPORT.md

## Required outputs in LIVE_CAPTURE_FORENSICS.md
- exact symptom
- exact reproduction path
- actual page URLs captured
- page counts
- importable count
- rejected count
- top rejection reasons
- actual emitted payload example
- actual accepted payload contract
- exact mismatch(s)
- exact files involved
- exact fixes applied
- exact remaining blockers if any

## Required outputs in IMPORTABILITY_DECISION_TABLE.md
For each major page category:
- page type
- current classifier rule
- importable yes/no
- why
- evidence required
- expected source fields
- edge cases
- test coverage status

## Required outputs in CANONICAL_EXTENSION_PATH.md
- exact unpacked folder to load
- exact build command
- exact source-of-truth files
- how to tell if Chrome is loading the wrong build
- any build version stamp or marker added

## Final reporting law
Final report must separate:
- verified
- assumed
- unresolved

Do not claim the live defect is fixed unless the exact same flow has either:
- been proven to work, or
- been reduced to a precise external blocker with raw evidence.

End of skill.
