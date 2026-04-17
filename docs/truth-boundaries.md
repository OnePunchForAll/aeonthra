# Truth Boundaries

## The product can honestly claim

- deterministic Canvas capture and deterministic synthesis
- a correlated local bridge queue with exact acknowledgement clearing
- exact bridge-side rejection reasons for malformed, wrong-source, empty, textbook-only, or identity-mismatched packs
- source-grounded concept extraction
- field-level provenance and support quality on major concept-facing fields
- optional relation evidence
- deterministic Atlas skill-tree derivation from source structure, concept graph, assignment signals, and learner progress
- local persistence with a canonical split between source pointers and scoped learner state
- offline replay export and restore with deterministic validation
- fail-closed practice behavior when transfer or assignment evidence is weak
- no runtime API usage

## The product must not claim

- universal extraction from every Canvas or web page type
- full-course omniscience when pages were never visited
- deep semantic tutoring equal to a frontier model
- live scholarly search without new infrastructure
- perfect grading of open-ended student responses
- a checked-in automated browser proof of the full extension capture handoff path

## Current known boundaries

- The extension captures supported course material it can deterministically reach from the current Canvas course context. It does not promise universal extraction of unseen or unsupported pages.
- Visited-page session state is keyed by `origin + courseId`; it is not a separate time-bounded browsing-session identity.
- Interrupted full captures can leave temporary partial state locally, but that state is not the same as a saved history capture.
- Same-course preservation is intentionally lenient for older hostless captures so legacy local state can still match newer host-aware captures.
- Reset clears the active workspace and active scoped learner state; it does not promise to erase every historical scoped record in the browser.
- Learning quality still depends on the quality and breadth of the captured source material.
