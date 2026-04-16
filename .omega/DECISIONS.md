# DECISIONS

## 2026-04-09

### Use the existing repo layout and map spec codenames onto it

- Decision: keep `apps/extension` and `apps/web` rather than renaming the folders mid-stream.
- Why: it preserves the current working monorepo while still allowing docs and skills to refer to SENTINEL and ATLAS conceptually.

### Model the transport pack as the current capture bundle contract

- Decision: alias `CourseKnowledgePack` to the existing `CaptureBundle` contract for this vertical slice.
- Why: it gives the bridge a typed, validated transport immediately without inventing a second near-duplicate schema.

### Prefer bridge-then-fallback over hard failure

- Decision: the extension should queue a direct handoff when the user opens AEONTHRA or when auto-handoff is enabled, and then fall back to JSON export if the page bridge is unavailable.
- Why: this matches the local-first truth boundary and avoids pretending the bridge is universally reliable on every page load timing edge case.

## 2026-04-15

### Only accept bridge handoff packs while an import request is active

- Decision: `NF_PACK_READY` should be ignored unless the app is in an explicit `auto` or `manual` import-request state, and `NF_IMPORT_RESULT` should always settle that state.
- Why: stale bridge traffic replacing the workspace is worse than dropping an unexpected pack, because the product can recover from a missed import request but cannot truthfully justify an unsolicited workspace swap.

### Fail closed on ambiguous reader concept selection

- Decision: section-level concept-specific UI should resolve a dominant concept from the active section text and hide concept-specific hints, mastery attribution, and Practice launches when the evidence is weak or near-tied.
- Why: attaching the wrong concept to a section pollutes both learner guidance and stored progress, while omitting a concept-specific hint on ambiguous text stays within the repo's truth boundary.

### Require explicit Canvas identity before preserving cross-import state

- Decision: Step 1 intake only accepts `extension-capture` bundles as Canvas course sources, and textbook carry-forward across imports only happens when both captures expose the same explicit `courseId`.
- Why: schema-valid local bundles and title-only matching made the app preserve state across sources it could not truthfully prove were the same Canvas course.

### Scope browser notes to the synthesized workspace, not the whole app

- Decision: notes should be keyed by the active learning workspace hash instead of a single global local-storage entry.
- Why: notes are user-authored study state, so replay restores, demo workspaces, and unrelated imports must not inherit each other's scratchpad text by accident.

### Only trust URL-only Canvas fallback on known hosts, and only allow direct handoff on bridge-supported origins

- Decision: fallback course detection from the service worker may only trust URL parsing on known Canvas hosts; unknown hosts must be confirmed by the content script, and `aeonthraUrl` must be limited to origins where the bridge content script can actually load.
- Why: path-only `/courses/<id>` detection and unrestricted classroom URLs made the extension advertise capabilities it could not truthfully guarantee, which crossed the repo's stated truth boundary.

### Treat "Reset Workspace" as a full browser-local reset

- Decision: when the user chooses Reset Workspace, clear browser-local notes and all persisted progress scopes along with the stored bundle/source-workspace pointers.
- Why: a reset action that leaves course-specific mastery and notes behind looks like a clean slate in the UI while silently preserving prior state for the next import of the same deterministic bundle.

### Keep OMEGA FORGE codenames in repo docs, but document AEONTHRA as the shipped product brand

- Decision: preserve the repo's mission codenames (`SENTINEL`, `ATLAS`, `FOUNDRY`) while explicitly documenting `AEONTHRA` as the current runtime/UI brand in contributor-facing docs.
- Why: contributors were seeing both naming systems without any bridge between them, which made onboarding look like two different products.

### Keep route-aware session capture separate from full-course capture

- Decision: visited-page accumulation should be a bounded, learning-mode-only session keyed by `origin + courseId`, with explicit save/clear controls and no automatic unseen-page crawling.
- Why: this adds the missing route-aware capture path without blurring the truth boundary between "pages the learner actually visited" and "the whole course that AEONTHRA actively crawled."
