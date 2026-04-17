# DECISIONS

## 2026-04-17

### The worker persistence boundary must accept `aeon:item-captured`, not just `aeon:job-*`

- Decision: retained page payloads emitted by the Canvas content script are part of the canonical live capture contract and must be routed explicitly by the service worker.
- Why: the real failure path was not only "final bundle importability." The worker dropped retained items before they ever reached the partial bundle, which made later classifier diagnoses incomplete.

### Canonicalize same-course Canvas URLs onto the detected course origin before importability validation

- Decision: extension discovery should rewrite same-course Canvas URLs returned on alternate but equivalent hosts onto the detected active course origin before the bundle is finalized.
- Why: importability validation is intentionally host-aware. When Canvas APIs emit mixed hosts for one course, preserving those URLs verbatim makes an otherwise valid capture look ambiguous or mismatched at the final handoff boundary.

## 2026-04-16

### Do not track ephemeral worktrees or disposable QA artifacts in the repo root

- Decision: `.claude/worktrees/` and disposable QA outputs such as `.playwright-cli/`, `dse-extracted/`, `test-results/`, temp web logs, and root screenshots are not canonical product source and should stay deleted or ignored.
- Why: they created real source-of-truth ambiguity, extension-load confusion, and noisy repo state without contributing to the shipped product.

### Keep Atlas progression projection outside `AeonthraShell.tsx`

- Decision: `apps/web/src/lib/atlas-shell.ts` is the canonical seam for materializing the Atlas skill model into shell-ready assignment readiness and chapter reward state.
- Why: the skill-tree contract is deterministic product logic, not view-local JSX glue, and it needs typed tests instead of repeated inline branches.

### Use one shared Canvas importability classifier across bridge boundaries

- Decision: `inspectCanvasCourseKnowledgePack()` in `packages/schema/src/index.ts` is the single source of truth for whether a bundle may be queued, relayed, or imported as a Canvas workspace seed.
- Why: the live bridge failure came from the worker treating "schema-valid bundle" as sufficient while the app required "importable Canvas extension capture."

### Canonical browser-local persistence is split source-workspace plus hash-scoped learner state

- Decision: `learning-freedom:source-workspace` is the canonical browser-local source pointer store, while notes and progress are scoped by the synthesized workspace hash. The legacy merged-bundle key and unscoped progress key are migration-only compatibility paths.
- Why: the older global bundle/progress model made it too easy for stale state to leak across imports and obscured which storage shape was actually canonical.

### Superseded on 2026-04-16: Current handoff queue remains single-slot until correlated queueing lands

- Historical decision: keep `aeonthra:pending-bundle` as one validated pending pack.
- Current reality: the extension now uses `aeonthra:pending-handoffs` as a correlated queue of bridge envelopes with TTL, dedupe, legacy-slot migration, and exact `handoffId + packId` clearing.
- Why superseded: the bridge repair pass landed the correlated queue and removed the old single-slot truth boundary.

### Preserve deterministic continuity across additive metadata upgrades

- Decision: replay restore and same-course state preservation should remain compatible across additive metadata upgrades when the older payload can still be validated or its course identity can still be inferred locally.
- Why: stricter deterministic checks should reject corruption and ambiguity, not strand honest prior exports or course captures created before new fields existed.

### Accept validated extension-initiated packs even when the app did not originate the request

- Decision: AEONTHRA may accept a schema-valid `NF_PACK_READY` from the extension even when the local app did not first set `requestMode`, as long as the message is bridge-tagged and comes from the configured handoff flow.
- Why: the extension's `Open AEONTHRA` path is a real local-first workflow. Dropping those packs to preserve a stricter request-only policy made legitimate handoffs fail more often than it protected users.

### Treat `apps/extension/dist` as the canonical unpacked-extension artifact

- Decision: `apps/extension/src/**` and `apps/extension/manifest.json` remain source of truth, and `apps/extension/dist` is the only generated unpacked-extension output that contributors should load in Chrome.
- Why: mirroring generated JS/HTML/CSS back into `apps/extension/` created duplicate tracked artifacts and made verification itself dirty the repo.

### Atlas progression is now skill-first, not module-board-first

- Decision: the live Atlas surface should be derived from deterministic skill nodes, prerequisite edges, chapter rewards, and assignment skill requirements instead of module cards with concept chips.
- Why: rebranding a module/concept board as a progression system crossed the repo's truth boundary; the skill tree needed its own model.

### Replay bundles persist notes and fail closed on brittle unlock modes

- Decision: offline replay bundles should include scoped notes and validate their deterministic hash on restore, while `practiceMode` should not persist across replay/export boundaries.
- Why: replay export should be self-contained and truthful, but carrying a brittle unlock override forward would overstate learner state integrity.

### Cancel deprecated legacy-progress migration when the workspace is explicitly replaced

- Decision: once the user imports a new Canvas capture, restores a replay bundle, loads demo mode, or resets the workspace, the app should clear the deprecated unscoped legacy progress bucket and disable any pending migration from it.
- Why: legacy progress is only meaningful for the one boot-time migration path from a deprecated single-bundle workspace. Letting it survive an explicit workspace replacement creates source-of-truth drift and stale progress contamination.

### Add field-level provenance and relation evidence without changing the public learning bundle contract shape

- Decision: provenance upgrades should remain additive. Major concept-facing fields gain `fieldSupport`, and relations may carry optional `evidence`, but the core concept and relation shapes stay intact for existing consumers.
- Why: the semantic engine needed materially better truth signals without forcing a broad downstream schema rewrite.

### Fail closed on real-workspace practice unless transfer or assignment evidence is source-backed

- Decision: demo mode may keep curated fallback practice, but real imported workspaces must blank practice when transfer or assignment evidence is missing or weak.
- Why: shell practice was crossing the truth boundary by inferring readiness from already-derived mapper text instead of source-backed evidence.

### Explicit offline-site restores must remount the shell instance

- Decision: when an offline replay bundle directly replaces the current learning workspace, the app should bump a shell instance epoch and remount `AeonthraShell`.
- Why: the shell seeds notes from scoped local storage on mount. Without a remount, a same-instance restore could show stale notes and write them into the wrong restored scope.

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

### Superseded on 2026-04-16: Only accept bridge handoff packs while an import request is active

- Historical decision: `NF_PACK_READY` was restricted to explicit request windows.
- Current reality: the app still tracks `auto` and `manual` request state for status handling, but it may accept a validated extension-originated `NF_PACK_READY` even when request mode has already cleared.
- Why superseded: the stricter request-only rule broke legitimate `Open AEONTHRA` flows more often than it protected users, as long as the pack itself was already bridge-tagged and importable.

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

### Superseded on 2026-04-16: Treat "Reset Workspace" as a full browser-local reset

- Historical decision: reset was documented as clearing all scoped notes and progress.
- Current reality: the runtime reset path clears the stored source pointers and the active workspace scope when one exists. The storage helpers can still clear every scope when called without a scope.
- Why superseded: the current app favors clearing the active workspace without deleting every historical scoped record in the browser.

### Keep OMEGA FORGE codenames in repo docs, but document AEONTHRA as the shipped product brand

- Decision: preserve the repo's mission codenames (`SENTINEL`, `ATLAS`, `FOUNDRY`) while explicitly documenting `AEONTHRA` as the current runtime/UI brand in contributor-facing docs.
- Why: contributors were seeing both naming systems without any bridge between them, which made onboarding look like two different products.

### Keep route-aware session capture separate from full-course capture

- Decision: visited-page accumulation should be a bounded, learning-mode-only session keyed by `origin + courseId`, with explicit save/clear controls and no automatic unseen-page crawling.
- Why: this adds the missing route-aware capture path without blurring the truth boundary between "pages the learner actually visited" and "the whole course that AEONTHRA actively crawled."
