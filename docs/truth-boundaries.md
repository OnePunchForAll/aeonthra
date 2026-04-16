# Truth Boundaries

## The product can honestly claim

- deterministic capture and synthesis
- deterministic Atlas skill-tree derivation from source structure, concept graph, assignment signals, and learner progress
- local persistence
- offline replay export and restore with scoped notes and deterministic hash validation
- no runtime API usage
- source-grounded concept extraction
- manual fallback export/import
- fail-closed semantic behavior that leaves weak concept-facing fields blank instead of inventing filler

## The product must not claim

- universal extraction from every page type
- full-course omniscience when pages were never visited
- deep semantic tutoring equal to a frontier model
- live scholarly search without new infrastructure
- perfect grading of open-ended student responses

## Current known boundaries

- The extension currently runs course-scoped capture flows from a Canvas course context, including an explicit full capture path and a bounded visited-page session path.
- Interrupted full captures can leave temporary local partial state, but that state is not a saved history capture until finalization.
- The handoff bridge is designed to be resilient, but JSON export remains the fallback path.
- Learning quality still depends on the quality and breadth of the captured source material.
- Atlas progression is deterministic, but it is only as strong as the captured chapter structure, concept graph, assignment signals, and stored mastery state.
