# DECISIONS

## 2026-04-18

### Page content may support chapter/source surfaces, but it must not become an assignment target

- Decision: keep `page` items out of `deriveWorkspace()` task promotion so they can still feed chapters and source matching without entering assignment/readiness lanes.
- Why: page content was polluting assignment surfaces and creating fake submission targets from study pages.

### Grounded requirements without a full skill chain should present as `Concept Prep`, not `Unmapped`

- Decision: if Atlas has concept grounding or captured requirements but cannot assemble a complete checklist-backed skill chain, the shell should label the state as `concept-prep`.
- Why: `Unmapped` now means the system has no trustworthy grounding at all. Anything with real grounding but incomplete chain should fail closed into the more honest prep state instead.

### Same-tab capture is allowed only when the active Canvas tab proves a live receiver

- Decision: treat `detect live-content-script` as the only condition that permits same-tab capture start. If the active tab only proves `detect url-fallback`, the worker should open a fresh background `course.modulesUrl` tab and start there.
- Why: comparing against the previous working build showed that a fresh Canvas navigation was the only reliable way to guarantee manifest-declared content-script attachment after extension reloads.

### Material worker recovery changes must bump the live signature immediately

- Decision: bump the worker signature to `sw-recovery-trace-v5` and the popup signature to `popup-worker-check-v3` for this hybrid launch-path and buffered auto-start change.
- Why: the earlier `v3` to `v4` debugging loop proved that live diagnostics lose value if materially different worker behavior can still present the same signature.

## 2026-04-17

### Keep the public package id stable as `@learning/content-engine` while the canonical implementation lives in `packages/content-engine-v2`

- Decision: cut over all live consumers by redirecting the existing `@learning/content-engine` seam to `packages/content-engine-v2/src/index.ts` instead of renaming the public package id across the repo.
- Why: this minimizes blast radius at consumer call sites while still leaving one clear production engine source of truth.

### After retirement, the old engine survives only as a frozen benchmark baseline

- Decision: retain `packages/content-engine-v2/src/benchmarks/legacy-v1-surfaces.json` as migration evidence, but remove the executable old engine package and any live runtime dependency on it.
- Why: the repo still needs old-vs-new proof after cutover, but it must not keep two production engines alive or silently compare new-vs-new.

### Plain-text structural nodes must preserve full evidence text; truncation belongs only at visible excerpt boundaries

- Decision: do not truncate plain-text structural nodes before evidence-unit extraction in the canonical engine. Sentence-level splitting and visible snippets may shorten text later, but the structural stage preserves the full paragraph.
- Why: early truncation can erase later grounded concepts and relations from otherwise clean source material, which is a truth regression at the engine boundary.

### Keep the replacement engine isolated until adapter-backed superiority is proven

- Decision: `packages/content-engine-v2` remains a parallel package with its own tests, fixtures, benchmark harness, and compatibility projection. No live imports change in this pass.
- Why: the user asked for a full replacement candidate, not another risky patch on the current engine seam.

### Mixed-content blocks must degrade to sentence-level salvage, not whole-block rejection

- Decision: structural extraction in v2 may reject a whole node only when noise appears without surviving academic signal; mixed blocks must continue to sentence filtering.
- Why: real captures often contain one valid academic lane beside browser or LMS junk, and rejecting the entire block recreates the exact failure pattern this pass exists to eliminate.

### Untrusted discussion titles may not survive as assignment surfaces in v2

- Decision: discussions with untrusted wrapper titles are suppressed from the assignment surface even when the text contains academic verbs or concept mentions.
- Why: forum scaffolds and week wrappers can carry coursework language while still being dishonest task titles. The engine should salvage the academic evidence without promoting the wrapper as a visible assignment.

### The deterministic engine is a fail-closed study compiler, not a semantic fallback generator

- Decision: visible concepts, skills, readiness states, and Atlas nodes must only survive when they can point to explicit source-backed evidence, provenance metadata, and a truth-gate pass reason.
- Why: the live failures showed that deterministic-looking semantic output becomes misleading when noise, fragments, or weak dates are allowed to cross the user-facing boundary.

### Structured capture fields outrank prose inference for task truth

- Decision: assignment titles, due dates, module identity, and related task metadata should come from preserved structured Canvas fields first; prose parsing is only a fallback and must be aggressively sanity-checked.
- Why: prose-level heuristics were turning chrome text, generic week wrappers, and stray dates into misleading tasks and countdowns even though stronger structured truth already existed upstream.

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

### Canonical full-course capture is now complete-snapshot only

- Decision: full-course capture no longer exposes `Learning Content Only` vs `Complete Snapshot` as user choices. The production capture entrypoint always runs `Complete Snapshot`, and persisted settings normalize legacy mode choices back to `complete`.
- Why: reliable import, recovery, and debugging depend on preserving the full supported Canvas surface. The split mode UI created unnecessary ambiguity and let users choose a weaker capture path while trying to solve extension reliability problems.
- Scope: this applies to full-course capture only. Passive visited-session accumulation remains a separate bounded learning-mode session until that subsystem gets its own redesign pass.

### Popup must expose live capture progress for hidden-tab runs

- Decision: when full-course capture is launched from the popup, the popup should reflect active runtime progress itself and best-effort open the side panel automatically.
- Why: the canonical full-course run happens in a hidden background tab, so a static popup leaves users without truthful visible feedback even when the capture is healthy.

### Full-course capture should prefer a visible capture tab over a hidden crawl

- Decision: the production full-course capture run now opens its modules capture tab as the active tab so the Canvas overlay is guaranteed to be visible during capture.
- Why: the existing overlay is the most truthful live progress surface, and hiding the capture tab made healthy runs look broken.

### Popup polling must not re-enter a full loading state on every refresh

- Decision: popup polling may refresh state in the background, but it must not blank the live UI every cycle.
- Why: a status surface that visibly flashes under steady-state polling destroys trust and makes active capture look broken.

### Full-course capture should run in the active Canvas tab once that tab is verified

- Decision: when capture is launched from a verified Canvas course tab, the canonical full-course run should reuse that tab as the capture runtime surface instead of opening a second copy of the course.
- Why: reopening the same course in a duplicate tab looked like a broken reload and detached the truthful loader from the page the user actually launched from.

### Missing Canvas receivers on verified course tabs should be healed automatically instead of requiring a manual refresh

- Decision: when the worker is sending a capture-start or course-context message to a verified Canvas tab and receives a missing-receiver error, it may inject `content-canvas.js` into that tab and retry once through the normal retry loop.
- Why: URL fallback can truthfully identify the course even when the content script has not reattached after an extension reload. The product should recover that seam automatically instead of failing capture and telling the user to refresh by hand.

### Popup should get out of the way after capture starts in the current tab

- Decision: once full-course capture starts successfully from the popup, the popup should close instead of trying to remain the primary live status surface.
- Why: the truthful loader for same-tab capture lives on the Canvas page itself, and the popup can physically hide that surface while making a healthy run still look broken.

### Verified Canvas tabs may bypass the message channel when receiver recovery is still unavailable

- Decision: after a verified Canvas tab hits a missing-receiver error, the worker may call a bootstrap API exposed by `content-canvas.js` through `chrome.scripting.executeScript({ func })` for course-context detection, same-tab capture start/control, and overlay rendering.
- Why: reinjecting the content script repairs many stale tabs, but the latest live evidence showed the `tabs.sendMessage(...)` channel itself can remain unavailable even after injection. The product cannot keep that port as the only way to start or surface capture on a verified page.

### Popup capture controls must show stable blocker evidence next to the start action

- Decision: the popup should render a persistent diagnostics box below the capture button that summarizes the last known popup/runtime/finalized-capture error plus whether course detection came from a live Canvas receiver or URL fallback.
- Why: transient banner text was not enough to support live debugging of repeated capture-start failures, especially when the course could still appear detected through URL fallback.

### Unrecovered missing-receiver failures must preserve recovery-stage evidence in the runtime error itself

- Decision: when a verified Canvas tab still fails after bootstrap lookup and script injection recovery attempts, the worker should throw an error message that records those attempted stages instead of rethrowing only the original Chrome missing-receiver text.
- Why: without the recovery trace, the popup can prove only that the worker is alive while still hiding whether the true blocker is failed injection, missing bootstrap after injection, or another surviving seam.

### Popup must fail closed when it can prove the worker bundle is stale

- Decision: if the popup can reach a worker that either omits the expected `workerCodeSignature` or reports `course-detected` with `detect none`, capture should be blocked and the popup should offer a direct runtime restart instead of letting the user re-trigger the same broken start path.
- Why: fresh popup assets and fresh `build-info.json` do not prove the Manifest V3 service worker itself has reloaded. Once the popup can prove that contradiction, allowing capture to proceed only generates misleading missing-receiver noise.

### Worker bootstrap probes must declare the isolated execution world explicitly

- Decision: any service-worker `chrome.scripting.executeScript({ func })` call that expects to see `content-canvas.js` runtime state must set `world: "ISOLATED"` explicitly.
- Why: once the fresh worker could still not see the injected bootstrap after successful script injection, the execution-world boundary itself became part of the contract. Leaving that implicit makes the recovery path too easy to misread and too hard to regress safely.

### Worker signatures must bump when live-debugging behavior changes materially

- Decision: when a worker-side live-recovery patch changes the meaning of diagnostics or runtime error traces, `workerCodeSignature` must change as part of the same patch.
- Why: a fresh popup and fresh build marker can still talk to an older Manifest V3 service worker. Without a signature bump, materially different worker behaviors can masquerade as the same runtime version and block truthful diagnosis.
### Shipped MV3 content scripts must be validated as classic scripts, not just as existing files

- Decision: extension build validation must reject any manifest-referenced content script whose built output still contains top-level `import` or `export` syntax.
- Why: Chrome loads manifest content scripts as classic scripts. File-existence checks alone were insufficient; a built `content-canvas.js` with a trailing ESM `export { ... }` looked present and current while never registering a live receiver on Canvas tabs.

### PDF intake progress must reflect document-open stages, not just page extraction

- Decision: the web app should show PDF import progress before the first page callback and treat worker-backed `getDocument()` as a recoverable seam with a compatibility retry.
- Why: the real live stall happened before `document.numPages` resolved, so a page-only progress model made the UI look frozen at `0%` while hiding the exact phase that was blocked.

### Explicit definition lanes may satisfy support when they are the only grounded evidence that survives

- Decision: an explicit definition sentence is strong enough to keep a concept alive even if no second support lane survives, provided wrapper titles and generic container prose still fail the title gate.
- Why: the wrapper-title cleanup correctly removed fake semantic containers, but the concept builder was over-pruning plain-text textbook bundles that only exposed one grounded definitional sentence.
- Scope: this only applies to definition-led concept admission. Wrapper titles, chapter/week front matter, and generic textbook container prose remain untrusted for display labels.

### Benchmark scoring must include shell-facing projections, not just raw engine surfaces

- Decision: the canonical benchmark surface now includes derived learning-bundle, workspace, and shell projection signals for module titles, skill labels, shell assignment titles, and checklist lines, and benchmark scoring includes a `consumerProjectionIntegrity` metric.
- Why: raw engine surfaces were insufficient proof. The repo could still pass benchmark scoring while live shell modules and Atlas labels leaked wrapper text, which made the benchmark dishonest as an end-to-end acceptance gate.
- Scope: this benchmark expansion is limited to deterministic local consumers already in-repo. It does not add any runtime API dependency or change production delivery paths.

### Accepted `page` titles and concepts are not enough to create assignment surfaces

- Decision: page-backed documents must fail closed unless they satisfy the same prompt-trust requirements as real assignment-like sources. In practice, pages with grounded concepts now stay in the focus-theme/chapter lane, not the assignment/readiness lane.
- Why: treating accepted pages as assignment-like created fake `assignmentMappings` for concept-bearing pages such as `Positive Reinforcement`, `Operant Conditioning`, and `Cognitive Load Theory`, which then leaked into workspace and shell even when no real task surface existed.
- Scope: this changes deterministic projection only. Real `assignment`, `discussion`, and `quiz` sources still flow through the assignment lane when grounded evidence survives.

### Zero expected assignments means the benchmark must punish any assignment surface

- Decision: when a fixture declares `expectedAssignmentTitles: []`, both engine-level assignment scoring and shell-facing projection scoring treat any surviving assignment surface as a failure. `consumerProjectionIntegrity` is weighted at `12` to keep shell-facing truth material in the overall delta.
- Why: an empty expectation is a fail-closed contract, not a “don’t care.” Without that rule, page-only fake assignment surfaces could survive the benchmark as long as they were not explicitly named.
- Scope: this applies only to benchmark scoring. It does not alter runtime behavior directly, but it is now part of the canonical acceptance gate for semantic-output integrity.

### Canonical truth must land additively before it replaces synthesis-scoped identity

- Decision: add a new tri-channel canonical artifact (`semanticHash`, `structuralHash`, `provenanceHash`) alongside the existing synthesis-scoped `deterministicHash`, and keep the legacy hash alive as the compatibility scope for notes, progress, and offline replay until consumer migration is explicit.
- Why: `learning.synthesis.deterministicHash` already scopes note state, progress state, offline replay validation, and demo surfaces. Replacing it in one step would silently strand local learner state and make rollback opaque.
- Scope: the engine and shared schema now emit canonical artifacts additively. Future migration work may promote canonical identity to the primary scope once storage/export consumers are versioned.

### Provenance must be explicit at capture boundaries, not reconstructed later from heuristics

- Decision: `CaptureItem` and `CaptureResource` now support explicit provenance metadata (`captureStrategy`, `provenanceKind`, `sourceEndpoint`, `sourceHost`, `adapterVersion`), and capture/import builders should populate those fields whenever they know them.
- Why: the deterministic engine cannot enforce a provenance firewall if upstream capture only hands it `plainText`, optional `html`, and a generic `contentHash`. Provenance inferred later is already a lossy guess.
- Scope: extension HTML/API capture, textbook import, demo seed generation, and manual import paths can now carry explicit provenance without breaking older bundles that lack those fields.

### Canonical truth must be visible in-product, not only recoverable from saved JSON

- Decision: the app must expose a first-class inspect/export route for `canonicalArtifact`, tri-channel hashes, provenance coverage, and capture lanes instead of treating those as debug-only internals.
- Why: a hidden truth boundary is not a trustworthy truth boundary. Users need to inspect the same canonical evidence that the deterministic engine uses.
- Scope: this visibility requirement currently lands in the web shell and offline-site export. Extension-side diagnostics may summarize the same lanes without duplicating the full artifact viewer.

### Shell decomposition should favor bounded route extraction over a risky router/store rewrite

- Decision: continue decomposing `AeonthraShell.tsx` by extracting route-sized surfaces into standalone components while preserving the existing state model and navigation flow.
- Why: the shell is still large, but a flag-day rewrite would multiply risk across progress state, note scope, and route behaviors that are currently green.
- Scope: compare, settings, stats, reader, and transcript routes are extracted first; `home`, `assignment`, and `practice` remain the next safe seams.

### Structural list context belongs in the canonical structural channel

- Decision: ordered vs unordered list container type is now part of the structural channel, while semantic equivalence remains text-grounded.
- Why: collapsing `ol` and `ul` into identical structure made the engine less inspectable and prevented truthful structural-only diffs for list-format changes.
- Scope: this affects only canonical structural hashing/diffing. It does not introduce fuzzy semantic equivalence or alter learner-facing synthesis directly.

### HTML code and math blocks should not fall back to plain-text extraction when that would erase meaning

- Decision: if HTML extraction yields code, math, or list-structured nodes, the canonical path should preserve the HTML-derived structure even when there is only one primary content node.
- Why: a one-node threshold was convenient for generic prose fallback, but it silently erased code whitespace semantics and list structure in legitimate single-block documents.
- Scope: the fallback rule remains for thin generic HTML, but code, math, and explicit list structure now fail closed toward the richer HTML lane instead of collapsing to normalized plain text.

### Verified dead archive exhaust should be removed once the live monorepo path is known

- Decision: tracked root zip artifacts and `_files_extracted/` historical dumps are safe to purge after verifying they are not part of the active app, extension, schema, docs, skills, or tests.
- Why: leaving known-dead archives and prompt dumps in the repo makes every later audit slower and raises the chance of mistaking stale exhaust for canonical product code.
- Scope: this purge does not authorize deletion of `Canvas-Converter-fixed-source/`, `aeonthra-lite/`, or `aeonthra-lite-extension/`; those still require explicit rollback-path review.

### Rollback roots remain quarantined until an explicit archival review proves they are disposable

- Decision: keep `Canvas-Converter-fixed-source/`, `aeonthra-lite/`, and `aeonthra-lite-extension/` in place for now.
- Why: they are outside the npm workspace graph, but they are still referenced as rollback material in `.omega` docs and still appear in local dev logs. That is enough evidence to avoid a blind delete in a surgical pass.
- Scope: future cleanup may archive or remove them only after a deliberate rollback-path review and a proof that no operator workflow still relies on them.

### DOM-vs-API parity can only be claimed when the API lane still preserves the same structure-level meaning

- Decision: treat DOM/API parity as a valid invariant only for cases where the API or plain-text lane still carries equivalent meaning.
- Why: a flattened API/plain-text lane cannot truthfully claim equivalence with DOM list structure once list semantics have already been lost upstream. The engine should not fake that parity.
- Scope: DOM/API parity tests now cover prose, code, table, and math cases that remain semantically equivalent, while list-structure behavior stays covered by structural-diff tests instead.

### AeonthraShell keeps `@ts-nocheck` until the remaining minified state core is decomposed further

- Decision: keep `// @ts-nocheck` on `apps/web/src/AeonthraShell.tsx` for this pass.
- Why: removing it exposed hundreds of implicit-any, null-inference, and untyped-state errors across the still-minified core, which is not a surgical fix. Pretending otherwise would turn this pass into a broad shell rewrite.
- Scope: the shell is still materially smaller and more componentized than before, but full typing now depends on further extractions around the remaining stateful route core.
