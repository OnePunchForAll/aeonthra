# IMPLEMENTATION LEDGER

## 2026-04-16

### Ultimate bridge completion and restore-scope remount hardening

**Files changed**: `packages/schema/src/index.ts`, `apps/extension/src/core/storage.ts`, `apps/extension/src/service-worker.ts`, `apps/web/src/App.tsx`, `apps/extension/src/core/storage.test.ts`, `apps/extension/src/core/service-worker.test.ts`, `apps/web/src/App.test.ts`, `apps/web/src/lib/bridge.test.ts`

**What changed**
- Completed the correlated handoff queue around `BridgeHandoffEnvelopeSchema`, `requestId`, `handoffId`, and `packId`.
- Enforced exact `handoffId + packId` clearing and legacy single-slot migration on read.
- Fixed queue freshness by stamping `queuedAt` from actual queue time instead of bundle capture time.
- Allowed valid extension-originated `NF_PACK_READY` messages to land even when request state has already cleared, while still ignoring mismatched active requests.
- Forced `AeonthraShell` to remount on explicit offline replay restore so scoped notes cannot bleed across same-instance restores.

**Why**: the bridge needed end-to-end correlation and truthful timing, and the web shell still had one live scoped-notes bug on direct replay restore.

**Downstream effects**: queued handoffs now age correctly, exact acknowledgements clear only the matching queue entry, real `Open AEONTHRA` timing drift no longer drops valid packs, and restored note scopes are safer.

### Purge stale worktree mirrors and disposable QA artifacts from the repo root

**Files changed**: `.gitignore`, `.claude/worktrees/**`, `forge-screen.png`, `home-screen.png`, `workspace-screen.png`

**What changed**
- Removed the malformed tracked `.claude/worktrees/**` gitlinks and deleted the duplicate worktree directories from the filesystem.
- Deleted the tracked root screenshots that were only referenced by the old purge note.
- Deleted disposable `.playwright-cli/`, `dse-extracted/`, and `test-results/` directories plus temporary web logs where the filesystem allowed it.
- Added ignore coverage for `.claude/worktrees/`, `dse-extracted/`, `test-results/`, and temporary web logs.

**Why**: these artifacts were not canonical runtime source and they created real extension-load ambiguity plus noisy repo state.

**Downstream effects**: the repo is materially leaner, the canonical unpacked extension path is clearer, and disposable QA artifacts are less likely to drift back into versioned state.

### Bridge contract unification and canonical browser-local persistence

**Files changed**: `packages/schema/src/index.ts`, `apps/extension/src/service-worker.ts`, `apps/web/src/App.tsx`, `apps/web/src/lib/source-workspace.ts`, `apps/web/src/lib/storage.ts`, `apps/extension/src/core/service-worker.test.ts`, `apps/web/src/App.test.ts`, `apps/web/src/lib/storage.test.ts`

**What changed**
- Added the shared `inspectCanvasCourseKnowledgePack()` classifier and reused it at queue, relay, and app-import boundaries.
- Replaced the old generic bridge misclassification with exact file and bridge failure reasons for malformed, wrong-source, empty, and textbook-only queued packs.
- Treated `learning-freedom:source-workspace` as the canonical live source-pointer store and pushed the legacy merged-bundle key into migration-only compatibility.
- Added one-time legacy unscoped-progress migration and kept notes and progress scoped by `learningBundle.synthesis.deterministicHash`.

**Why**: the bridge failure exposed that worker relay, app import, and browser-local persistence were not all using the same source-of-truth rules.

**Downstream effects**: current handoff behavior is more truthful, stale legacy state is less likely to bleed into current workspaces, and the bridge contract has a single inspected definition instead of several near-matches.

### Docs and ledger truth alignment after the bridge repair pass

**Files changed**: `README.md`, `docs/architecture.md`, `docs/extension-handoff.md`, `docs/truth-boundaries.md`, `.omega/DECISIONS.md`, `.omega/DIAGNOSTIC_PROTOCOL.md`, `.omega/ERROR_LEDGER.md`, `.omega/IMPLEMENTATION_LEDGER.md`, `.omega/TODO_NOW.md`, and the then-current audit artifacts

**What changed**
- Reframed the bridge failure as a historical incident fixed in current source and tests.
- Documented the canonical persistence model, the remaining single-slot handoff limitation, and the verified repo-hygiene and build-determinism gaps.
- Marked the old request-only bridge policy and global-reset claim as historical or superseded where the live runtime no longer behaves that way.

**Why**: the docs and ledgers had drifted into an intermediate state that mixed pre-fix failures, superseded policies, and current runtime behavior.

**Downstream effects**: contributor-facing docs, ledgers, and audit artifacts now describe the same runtime contract and the same remaining open issues.

### Ultimate docs, purge, and stop-rule alignment

**Files changed**: `README.md`, `COMMAND_CAPABILITY_MATRIX.md`, `HUMAN_TRIGGER_SEQUENCE.md`, `AGENT_SWARM_ROSTER.md`, `SKILL_GAP_AND_CREATION_PLAN.md`, `ITERATION_SCOREBOARD.md`, `AUDIT_ULTIMATE_PASS.md`, `EXECUTION_PLAN_ULTIMATE_PASS.md`, `BRIDGE_FAILURE_ROOT_CAUSE_ULTIMATE.md`, `PURGE_REPORT_ULTIMATE.md`, `.omega/DECISIONS.md`, `.omega/DIAGNOSTIC_PROTOCOL.md`, `.omega/ERROR_LEDGER.md`, `.omega/IMPLEMENTATION_LEDGER.md`, `.omega/TODO_NOW.md`

**What changed**
- Rewrote the repo-facing docs so they describe the live correlated queue, provenance, practice truth gate, Atlas model, and manual-proof boundary instead of older intermediate claims.
- Recorded the iteration scoreboard through the final no-delta review loops.
- Documented the final bridge root cause, purge decisions, canonical source-of-truth files, and manual human-trigger sequence.

**Why**: the repo had reached a materially stronger runtime state than the docs and ledgers were willing to claim.

**Downstream effects**: stop-time claims now line up with what was actually built, verified, and left as a documented limitation.

### AeonthraShell concentration reduction: extract Atlas projection and readiness derivation into a typed helper

**Files changed**: `apps/web/src/AeonthraShell.tsx`, `apps/web/src/lib/atlas-shell.ts`, `apps/web/src/lib/atlas-shell.test.ts`

**What changed**
- Extracted the pure Atlas materialization, assignment-readiness derivation, and chapter-reward state labeling out of `AeonthraShell.tsx` into `apps/web/src/lib/atlas-shell.ts`.
- Rewired the shell to consume the shared projection instead of rebuilding the same readiness contract inline across home, journey, and assignment views.
- Added regression coverage for `building`, `ready`, `concept-prep`, and `unmapped` assignment states plus chapter reward label mapping.

**Why**: the shell was carrying deterministic Atlas projection logic inline beside JSX, which made safe changes harder and increased drift risk across surfaces that should agree on one progression contract.

**Downstream effects**: Atlas/readiness changes now have one typed seam and one focused test file, while the large shell loses some of its highest-value pure-logic concentration without a broad component rewrite.

### Extension release hardening: fail closed when unpacked dist and manifest drift

**Files changed**: `apps/extension/scripts/build.mjs`, `apps/extension/scripts/build.test.mjs`

**What changed**
- Refactored the extension build script into explicit entrypoint and copied-asset lists so the generated unpacked output is described in one place.
- Added a post-build validation pass that parses `apps/extension/dist/manifest.json`, confirms every referenced file exists in `dist`, and rejects absolute or out-of-tree manifest paths.
- Added direct regression tests for manifest file collection, missing-file detection, complete-dist acceptance, and path-escape rejection.

**Why**: the extension build previously trusted `manifest.json` blindly. A manifest/build drift could still produce a "successful" build that loaded as a broken unpacked extension in Chrome.

**Downstream effects**: `npm run build:extension` now fails closed on last-mile output drift instead of shipping an incomplete unpacked extension.

### Replay and course-identity compatibility repair

**Files changed**: `apps/web/src/lib/offline-site.ts`, `apps/web/src/lib/offline-site.test.ts`, `apps/web/src/lib/source-workspace.ts`, `apps/web/src/lib/source-workspace.test.ts`

**What changed**
- Added dual hash validation so legacy offline replay bundles exported before `notes` existed still restore deterministically.
- Reconciled mixed legacy/new course identity by comparing course ids first and only enforcing host equality when both hosts are known, with URL-based host inference as a fallback.
- Added regression tests for both compatibility paths.

**Why**: the overhaul correctly tightened replay determinism and host-aware course identity, but it also broke honest existing user data created before those new fields existed.

**Downstream effects**: replay imports remain fail-closed for tampered payloads, while same-course carry-forward still rejects different course ids and conflicting known hosts.

### Shell accessibility and mobile hardening: respect reduced motion, restore focus, and stop mobile overflow on mounted views

**Files changed**: `apps/web/src/AeonthraShell.tsx`

**What changed**
- Added viewport and reduced-motion awareness to the live shell so Atlas edge-scroll RAF and Reader rail smooth-scroll both fail closed when motion should be reduced.
- Removed inline `outline: none` overrides from the mounted text-entry fields so the global `:focus-visible` ring can render again.
- Added responsive layout switches for the mounted nav, Atlas, Explore, Courseware, Reader, and Transcript surfaces to stop the worst mobile overflow paths.
- Added keyboard semantics to pointer-only module cards and transcript seeking.

**Why**: the mounted shell still had real accessibility regressions after the core semantic/Atlas pass, especially in the exact surfaces the user spends time in.

**Downstream effects**: reduced-motion preferences now affect JS-driven movement, keyboard users regain visible focus in text fields, and the main shell is less hostile on narrow screens.

### Deterministic semantic hardening: preserve application and misconception evidence lanes instead of filtering them out

**Files changed**: `packages/content-engine/src/pipeline.ts`, `packages/content-engine/src/index.ts`, `packages/content-engine/src/synthesis.ts`, `packages/content-engine/src/index.test.ts`

**What changed**
- Split strict concept-definition validation from broader evidence-sentence validation so instructional and misconception-shaped sentences can survive into concept evidence lanes.
- Extended concept candidate context gathering to pull nearby structured block evidence instead of treating a single definition sentence as the whole semantic lane.
- Reserved evidence sentences for summary, confusion, and transfer roles so the distinctness gate blanks duplicates instead of reusing one sentence for every concept-facing field.
- Re-ranked final concept output by support after stabilization so high-signal concepts surface ahead of title-heavy noise.
- Added regression coverage for transfer/confusion distinctness collapse.

**Why**: the engine was still throwing away the exact source sentences needed for `transferHook` and `commonConfusion`, which made the shell look repetitive even when the source bundle contained stronger cues.

**Downstream effects**: concept-facing fields are materially less repetitive, hooks can stay instructional without becoming generic filler, and weak roles fail closed more honestly.

### Atlas overhaul: replace module-board progression with a deterministic skill tree

**Files changed**: `apps/web/src/lib/atlas-skill-tree.ts`, `apps/web/src/lib/atlas-skill-tree.test.ts`, `apps/web/src/lib/shell-mapper.ts`, `apps/web/src/AeonthraShell.tsx`, `apps/web/src/lib/workspace.ts`

**What changed**
- Added a deterministic Atlas skill-tree materializer with node kinds for foundational, applied, distinction, assignment-readiness, and mastery lanes.
- Derived chapter rewards and assignment skill requirements from synthesized concepts and assignment mappings rather than reusing raw module/concept lists.
- Rebuilt the live Atlas surface around locked, available, in-progress, earned, mastered, and recovery states with truthful locked-node behavior.
- Removed the old `practiceMode` unlock bypass from task gating and routed concept completion through mastery updates instead of direct UI mutation.

**Why**: the previous Atlas was still a module board with concept chips and mastery percentages, which overstated progression depth without a real skill model.

**Downstream effects**: Atlas now tells a real progression story, assignment readiness can depend on derived skills, and locked nodes stop pretending to be available.

### Workspace and replay reliability: scoped notes, host-aware course identity, and truthful offline bundles

**Files changed**: `apps/web/src/App.tsx`, `apps/web/src/App.test.ts`, `apps/web/src/lib/offline-site.ts`, `apps/web/src/lib/offline-site.test.ts`, `apps/web/src/lib/source-workspace.ts`, `apps/web/src/lib/source-workspace.test.ts`, `apps/web/src/lib/shell-runtime.ts`, `packages/schema/src/index.ts`

**What changed**
- Made offline replay bundles carry scoped notes and validate their deterministic hash on restore.
- Forced restored/exported `practiceMode` to fail closed instead of persisting a brittle unlock mode across sessions.
- Scoped same-course preservation by `sourceHost + courseId` where available, not just raw `courseId`.
- Prevented shell mount from racing ahead of scoped progress hydration and added reset behavior that clears the active workspace scope rather than flattening all notes/progress.
- Guarded textbook import progress callbacks with import tokens so stale long-running imports cannot overwrite a newer workspace.

**Why**: replay bundles were not self-contained, course identity could drift across hosts, and several orchestration paths were still loose enough to resurrect stale state.

**Downstream effects**: replay restore is more honest, stale state bleed is reduced, and scoped notes/progress are less likely to drift across unrelated workspaces.

### Extension truthfulness and build posture: support the real workflow and stop mirroring generated artifacts into source

**Files changed**: `apps/extension/src/popup.tsx`, `apps/extension/src/side-panel.tsx`, `apps/extension/src/service-worker.ts`, `apps/extension/scripts/build.mjs`, `README.md`, `docs/extension-handoff.md`

**What changed**
- Updated extension copy to say `Capture Supported Content` instead of implying omniscient whole-course capture.
- Made the popup respect the saved default capture mode.
- Clarified the interruption message so temporary partial state is not mislabeled as a saved capture.
- Declared `apps/extension/dist` as the canonical unpacked-extension build target and removed the copy-back mirror step that dirtied tracked root artifacts on every build.

**Why**: the extension still overstated what it captured and the build pipeline was duplicating generated outputs into the source tree.

**Downstream effects**: contributor workflow is cleaner, the repo is less artifact-heavy, and the extension copy stays within the product truth boundary.

### Release hardening and contributor truth alignment

**Files changed**: `.github/workflows/verify.yml`, `.gitignore`, `package.json`, `README.md`, `docs/architecture.md`, `docs/truth-boundaries.md`, `.omega/DECISIONS.md`, `.omega/ERROR_LEDGER.md`, `.omega/TODO_NOW.md`

**What changed**
- Added a dedicated CI verification workflow for `typecheck -> test -> build`.
- Pinned Node/npm expectations in the root manifest and switched quick-start docs to `npm ci`.
- Ignored `output/` so Playwright/log dumps stop appearing as repo drift.
- Updated contributor docs to describe the mounted AEONTHRA shell, Atlas skill tree, replay bundle behavior, and current extension handoff posture.

**Why**: Pages deploy alone was not a real verification gate, and contributor docs had drifted away from the runtime surface.

**Downstream effects**: the repo is closer to a shippable verification posture and the docs now describe the current product instead of a legacy shell.

## 2026-04-15

### Reader concept resolution: fail-closed dominant concept selection for hints, highlights, and practice

**Files changed**: `apps/web/src/lib/shell-mapper.ts`, `apps/web/src/lib/shell-mapper.test.ts`, `apps/web/src/AeonthraShell.tsx`

**What changed**
- Added a pure dominant-concept resolver that scores the active section against the filtered shell concept set instead of trusting whichever concept id happened to appear first.
- Switched reader margin hints, saved highlight concept attribution, mastery bumps, and Practice CTAs to use that resolver.
- Made the resolver fail closed on weak or near-tied evidence so the shell hides concept-specific UI when the section is ambiguous instead of guessing wrong.
- Added regression coverage for both clear winner and ambiguous-section cases.

**Why**: the reader and margin system could attach the wrong concept context whenever multiple related concepts survived upstream matching, which then leaked into highlights, practice launches, and Attribute-adjacent hints.

**Downstream effects**: concept-specific reader behavior is now stricter and more truthful. Ambiguous sections may show fewer targeted hints, but they no longer silently mislabel the learner's context.

### Historical bridge request hardening before validated extension-initiated pack acceptance

**Files changed**: `apps/web/src/App.tsx`, `apps/web/src/App.test.ts`, `apps/web/src/lib/bridge.test.ts`

**What changed**
- Extracted bridge-message decision logic into a pure helper so the live app and tests share the same request-state rules.
- Tightened request-state handling first, then later relaxed final acceptance so validated extension-originated packs can still land when request mode has already cleared.
- Kept `NF_IMPORT_RESULT` as the deterministic request-lifecycle closer while moving final safety to shared pack validation and exact importability checks.
- Added app-level and bridge-level regression coverage for requested pack acceptance, exact rejection reasons, and manual vs auto import-result handling.

**Why**: the app previously trusted any schema-valid bridge pack that arrived, even if the user had not asked for an import in the current session. Later bridge repair work showed that strict request-only acceptance also blocked legitimate `Open AEONTHRA` flows.

**Downstream effects**: request state still governs status handling, but the final safety boundary is now the shared validated pack contract rather than request mode alone.

### Content-engine fixture broadening: discussion scaffold filtering, wrapper dedupe, and academic sentence recovery

**Files changed**: `packages/content-engine/src/golden-fixtures.test.ts`, `packages/content-engine/src/pipeline.ts`, `packages/content-engine/src/source-quality.ts`

**What changed**
- Added golden regression fixtures for thin-discussion, clone-heavy/admin-orientation, and full-academic capture bundles.
- Blocked discussion scaffold labels like `initial post` and `reply to classmates` from surfacing as concepts.
- Added alias-aware dedupe so wrapper variants like `Overview of X` and `Principles of X` collapse into one concept lane.
- Improved extraction/scoring for academic definition patterns like `explains how`, `is learning through`, and `is learning shaped by`.

**Why**: the pipeline still had blind spots where admin scaffolds and wrapper variants could crowd out the real academic concept lane, especially in clone-heavy or discussion-heavy captures.

**Downstream effects**: source-quality gating and concept extraction now have broader regression coverage for messy but realistic bundle shapes, which lowers the chance of future scoring drift in the deterministic pipeline.

### Extension route-aware session capture: passive visited-page accumulation with explicit save/clear

**Files changed**: `apps/extension/src/core/types.ts`, `apps/extension/src/core/storage.ts`, `apps/extension/src/core/storage.test.ts`, `apps/extension/src/service-worker.ts`, `apps/extension/src/content-canvas.ts`, `apps/extension/src/side-panel.tsx`

**What changed**
- Added a bounded per-course session layer keyed by `origin + courseId` so visited Canvas pages can accumulate locally without merging across different courses or terms.
- Reused the current content-script extractors to observe only the page the learner actually visited, keeping the session path learning-mode-only and source-grounded instead of fetching unseen course pages.
- Surfaced the session in the side panel with explicit `Save Session Capture` and `Clear Session` actions, while leaving `Capture Entire Course` unchanged as the full-crawl path.
- Materialized saved sessions into normal `extension-capture` history records only when the user explicitly saves them, so the existing handoff/open workflow still operates on standard capture records.
- Added storage regression coverage for per-course session isolation and revisited-URL replacement.

**Why**: route-aware accumulation was the largest remaining extension gap after the earlier truthfulness hardening pass. Learners could only create captures on demand, even though the product goal is to accumulate real course pages they actually visited.

**Downstream effects**: the extension now has two truthful capture modes with clear boundaries: explicit full-course crawls and passive visited-page sessions. Future work can expand this session path, but it now has a stable storage contract and UI surface instead of remaining a TODO-only concept.

### Wave-3 shell polish: prevent negation-only scaffold text from filling concept depth panels

**Files changed**: `apps/web/src/lib/shell-mapper.ts`, `apps/web/src/lib/shell-mapper.test.ts`

**What changed**
- Applied the existing negation-only scaffold filter to the depth candidate loop, not just the distinction panel path.
- Added regression coverage so Oracle/Core Idea panels no longer select `X is not Y. Keep their main moves separate.` style scaffolding when richer explanatory text is available.

**Why**: the shell was already filtering that pattern out of KEY DISTINCTION, but CORE IDEA / Going Deeper could still surface the same low-value sentence and make the concept card feel broken.

**Downstream effects**: concept cards now stay aligned with the repo's truth boundary by preferring real explanatory text over a defensive scaffold sentence.

### App orchestration regression coverage: import classification, bridge acceptance, restore hydration, and reset persistence

**Files changed**: `apps/web/src/App.tsx`, `apps/web/src/App.test.ts`

**What changed**
- Extracted the top-level intake classification, bridge-pack acceptance, and reset persistence logic from `App.tsx` into exported helpers that the live component now calls directly.
- Added app-level regression tests for rejecting non-Canvas Step 1 JSON, accepting real extension bridge packs, restoring offline site bundles with progress and note-scope metadata, and clearing persisted workspace state on reset.

**Why**: helper-level coverage already existed around offline bundles and storage, but the top-level orchestration decisions in `App.tsx` still lacked direct regression protection.

**Downstream effects**: future intake/restore changes now have a smaller truth-boundary blast radius because the app shell's import and reset decisions are exercised directly by tests instead of only through adjacent helpers.

### Web messy-textbook intake hardening: boilerplate stripping and extractor cleanup

**Files changed**: `apps/web/src/lib/textbook-import.ts`, `apps/web/src/lib/pdf-ingest.ts`, `apps/web/src/lib/docx-ingest.ts`, `apps/web/src/lib/textbook-import.test.ts`, `apps/web/src/lib/docx-ingest.test.ts`, `apps/web/src/lib/pdf-ingest.test.ts`

**Boilerplate and OCR cleanup**
- Added textbook-import filtering that strips obvious front-matter and page-marker noise before bundle validation, so OCR dumps and front-matter-only extracts no longer pass as meaningful textbook content.
- Kept the validation boundary truthful by rejecting imports that still do not contain enough real textbook text after cleanup.
- Normalized PDF and DOCX extraction output so repeated page markers, contents pages, copyright lines, and similar junk are removed before the web app sees them.

**Regression coverage**
- Added noisy-input tests for textbook rejection, front-matter stripping, valid body preservation, DOCX segment cleanup, and PDF page-text normalization.

**Why**: the textbook intake path was already rejecting empty input, but it still accepted some boilerplate-heavy or OCR-noisy extracts as if they were usable textbook content. That made the intake gate too permissive for the repo's truth boundary.

**Downstream effects**: the importer now behaves more conservatively on junk-heavy textbook inputs, while still preserving legitimate chapter/body text and segment structure after common extraction noise.

### Web intake hardening: Canvas-only source gate, empty-textbook rejection, and scoped notes

**Files changed**: `apps/web/src/App.tsx`, `apps/web/src/lib/source-workspace.ts`, `apps/web/src/lib/textbook-import.ts`, `apps/web/src/lib/storage.ts`, `apps/web/src/lib/source-workspace.test.ts`, `apps/web/src/lib/storage.test.ts`, `apps/web/src/lib/textbook-import.test.ts`

**Canvas-first intake truthfulness**
- Restricted Step 1 Canvas intake to actual `extension-capture` bundles so schema-valid `manual-import` or other local bundles no longer satisfy the "Canvas course content" prerequisite.
- Applied the same guard to bridge-delivered packs before they can replace the active Canvas source.

**Textbook validation and workspace isolation**
- Changed textbook bundle creation to reject effectively empty extraction results instead of constructing a fake manual-import bundle with no meaningful source text.
- Scoped notes to the current synthesized workspace hash so course notes stop bleeding across replay restores, demo workspaces, and unrelated imports.
- Tightened same-course preservation so textbook carry-forward only happens when both Canvas bundles expose the same explicit course id.

**Regression coverage**
- Added textbook validation coverage and expanded source-workspace/storage tests for Canvas intake classification, missing-course-id preservation behavior, and scoped note isolation.

**Why**: the web intake flow still overstated what counted as Canvas input, could unlock synthesis from empty textbook extraction, and could silently reuse notes or textbooks across unrelated workspaces.

**Downstream effects**: Step 1 now aligns with the repo's Canvas-first truth boundary, blank PDF/DOCX/text imports fail loudly instead of faking readiness, and note state follows the synthesized workspace instead of acting like a global scratchpad.

### Extension UI cleanup: popup mojibake removal, storage guard, and progress regression test

**Files changed**: `apps/extension/src/popup.tsx`, `apps/extension/src/options.tsx`, `apps/extension/src/ui/shared.test.tsx`

**Popup and settings cleanup**
- Rewrote the popup UI copy to remove mojibake artifacts and keep the call-to-action text neutral and readable.
- Guarded the options storage meter so zero-quota or invalid storage estimates render as `0%` instead of producing `NaN`.

**Regression coverage**
- Added `apps/extension/src/ui/shared.test.tsx` to verify the shared progress component clamps invalid values to zero width.

**Why**: the extension still had a few rendering artifacts and one unguarded storage ratio in the remaining UI slice, which could make the popup and settings panel look broken even after the backend truthfulness fixes.

**Downstream effects**: the extension UI now renders clean ASCII copy, the storage bar is resilient to missing quota, and the shared progress clamp is covered by a dedicated unit test.

### Extension truthfulness hardening: Canvas guards, discovery warnings, and bridge validation

**Files changed**: `apps/extension/package.json`, `package.json`, `apps/extension/src/core/platform.ts`, `apps/extension/src/core/platform.test.ts`, `apps/extension/src/service-worker.ts`, `apps/extension/src/content-canvas.ts`, `apps/extension/src/options.tsx`, `apps/extension/src/popup.tsx`, `apps/extension/src/popup.ts` (deleted), `apps/extension/src/popup.css` (deleted), `docs/extension-handoff.md`, `.omega/DIAGNOSTIC_PROTOCOL.md`, `.omega/DECISIONS.md`, `.omega/ERROR_LEDGER.md`

**Canvas detection and discovery resilience**
- Added shared platform guards so URL-only fallback detection only trusts known Canvas hosts; unknown `/courses/<id>` hosts now require the content script to confirm a real Canvas page before the extension advertises course capture.
- Hardened paginated discovery fetches in `content-canvas.ts` so network-thrown failures retry like the other fetch helpers and category-level discovery failures emit explicit warnings instead of silently zeroing assignments/pages/files/announcements.

**Handoff and settings truthfulness**
- Added AEONTHRA classroom URL validation in the service worker and options UI so direct handoff only accepts origins where `content-bridge.js` can actually run.
- Removed the unused capture-motion toggles from the live settings UI and deleted the stale legacy popup source/CSS that still described the old `capture-selection` / `Done Learning` flow.
- Updated `docs/extension-handoff.md` and `.omega/DIAGNOSTIC_PROTOCOL.md` to reflect the current capture/open-classroom flow and supported direct-handoff origins.

**Extension verification wiring**
- Added an extension `test` script, a root `test:extension` script, and `platform.test.ts` coverage for course-path parsing, known-host fallback rules, and supported handoff URL validation.

**Why**: the extension could overclaim support in three directions at once: path-only `/courses/<id>` detection on arbitrary hosts, silent category omission during discovery fetch failures, and settings that accepted classroom URLs the bridge could never support.

**Downstream effects**: side panel and popup detection now align more closely with the repo's truth boundary, failed discovery categories surface as warnings instead of disappearing silently, root `npm test` includes the extension workspace, and contributors no longer have a stale popup implementation pointing at the wrong message flow.

### Web reset truthfulness and offline export timestamps

**Files changed**: `apps/web/src/App.tsx`, `apps/web/src/lib/storage.ts`, `apps/web/src/lib/offline-site.ts`, `apps/web/src/lib/storage.test.ts`, `.omega/DECISIONS.md`, `.omega/ERROR_LEDGER.md`, `.omega/TODO_NOW.md`

**Reset semantics**
- Added `clearStoredNotes()` and `clearStoredProgress()` in `apps/web/src/lib/storage.ts`.
- Updated the reset helpers so no-scope clearing wipes all notes and progress buckets, while the live runtime reset path can clear only the active workspace scope when one is available.

**Offline export truthfulness**
- Changed `createOfflineSiteBundle()` in `apps/web/src/lib/offline-site.ts` so `exportedAt` records the actual export time instead of reusing `learningBundle.generatedAt`.

**Regression coverage**
- Expanded `apps/web/src/lib/storage.test.ts` to assert full reset semantics across notes, default progress, scoped progress, and unrelated local storage keys.

**Why**: the web app could appear reset while silently preserving old notes/mastery for the same deterministic scope, and offline replay bundles displayed the synthesis time as if it were the export time.

**Downstream effects**: reset can now be truthful in both modes: full helper-level clearing when no scope is provided, and active-workspace clearing when the runtime is operating on one synthesized scope. Offline replay metadata is also truthful, and storage regression tests cover both reset contracts directly.

### Web boundary hardening: legacy source split fix and regression expansion

**Files changed**: `apps/web/src/lib/source-workspace.ts`, `apps/web/src/lib/bridge.test.ts`, `apps/web/src/lib/offline-site.test.ts`, `apps/web/src/lib/source-workspace.test.ts`, `.omega/IMPLEMENTATION_LEDGER.md`, `.omega/ERROR_LEDGER.md`, `.omega/TODO_NOW.md`

**Boundary repair**
- Cleared `captureMeta` when reconstructing textbook bundles in `splitLegacyBundle()` so legacy merged storage does not leak Canvas course metadata into manual textbook state.

**Web regression coverage**
- Added `bridge.test.ts` to verify source-tagged bridge posts and same-window/schema filtering for inbound messages.
- Added `offline-site.test.ts` to cover deterministic replay bundle creation, parse/restore round-trips, HTML export generation, and malformed replay rejection.
- Added `source-workspace.test.ts` to cover canvas/textbook merge behavior, legacy bundle splitting, course identity checks, and app-stage derivation.

**Why**: the repo now had basic web storage coverage, but the import boundaries that govern replay restore and source merging still relied on unchecked assumptions. The legacy split path also mislabeled textbook state by carrying Canvas capture metadata forward.

**Downstream effects**: root and web-only test runs now guard the bridge contract, offline replay bundle helpers, and source-workspace transitions alongside storage.

### Contributor cleanup: docs, naming bridge, and app-level verification

**Files changed**: `package.json`, `apps/web/package.json`, `apps/web/src/lib/storage.test.ts`, `README.md`, `docs/architecture.md`, `docs/truth-boundaries.md`, `.omega/DECISIONS.md`, `.omega/ERROR_LEDGER.md`, `.omega/TODO_NOW.md`

**Docs and onboarding alignment**
- Updated `README.md` to use the verified Vite dev URL (`http://127.0.0.1:5176/`) instead of the stale `5180` value.
- Added a naming note that connects repo codenames (`SENTINEL`, `ATLAS`, `FOUNDRY`) to the shipped AEONTHRA product brand.
- Rewrote `docs/architecture.md` and `docs/truth-boundaries.md` so they describe the current course-scoped capture workflow rather than the obsolete highlight/visible-page story.

**Web verification wiring**
- Added `apps/web/src/lib/storage.test.ts` as a real Vitest workspace test that exercises the actual storage helpers instead of an inline copy of them.
- Added `test` script to `apps/web/package.json`.
- Added `test:web` at the repo root and folded the web workspace into root `npm test`.

**Repo operating artifacts**
- Refreshed `.omega/TODO_NOW.md` to remove the stale alias-resolution failure note and replace it with the next real verification gap.
- Recorded the naming clarification in `.omega/DECISIONS.md`.

**Why**: the repo had working code but contributor-facing docs and verification had drifted. New contributors were being pointed at the wrong dev URL, an outdated extension behavior model, and a TODO item for a failure that no longer reproduced.

**Downstream effects**: onboarding docs now match the running app, root `npm test` includes one web workspace test, and the naming split between OMEGA FORGE docs and AEONTHRA runtime branding is explicit instead of implicit.

## 2026-04-13

### Wave-3 UI/UX coherence audit fixes

**Files changed**: `packages/content-engine/src/pipeline.ts`, `apps/web/src/lib/shell-mapper.ts`, `apps/web/src/lib/forge-session.ts`, `apps/web/src/lib/demo.ts`, `apps/web/src/AeonthraShell.tsx`

**Memory hook cleanup (pipeline.ts)**
- `conceptMnemonic`: Raised keyword length threshold to `>= 8`, blocked possessives (`k.endsWith("'s")`), blocked internal tokens (`aeonthra`, `demo`, `module`, etc.), returns `""` if fewer than 2 qualifying keywords to force fallback to `transferHook`.
- `sanitizeConceptMnemonic`: Rejects mnemonics containing internal tokens via `/\b(aeonthra|demo|module|chapter|course|source|textbook|student|canvas|bundle|import|export)\b/i`.
- `mergeCandidates` aliasKey: Collapses "Doctrine/Theory/Principle/Concept of the X" → "X" with `.replace(/\b(doctrine|theory|principle|concept)\s+of\s+the\b/gi, "")`.

**Oracle philosopher extraction (shell-mapper.ts)**
- Expanded `NON_PERSON_TOKENS` with 18 philosophical/ethical terms (Virtue, Trolley, Moral, Categorical, Felicific, Doctrine, Problem, Machine, Ethics, Theory, etc.).
- `mapKeyFigures`: Now scans only `bundle.items` (not concept definitions). Cross-checks extracted names against `conceptLabelSet` and `conceptLabelWords` to block concept labels from being treated as philosophers.

**Atlas module descriptions (shell-mapper.ts)**
- Added `sanitizeModuleDesc()`: Strips "is introduced in Module N", "students must be able to", and "a major ethical framework" boilerplate sentences from chapter summaries before use as module descriptions.
- Applied to `desc` field in `mapModulesFromChapters`.

**KEY DISTINCTION circular text (shell-mapper.ts)**
- Added `isNegationOnlyText()`: Detects and rejects "X is not Y. Keep their main moves separate." scaffold patterns.
- `conceptDistinctionText`: Moved `relationDistinction` before `commonConfusion` in candidate list; added `isNegationOnlyText` filter — concept falls through to `summary` or `transferHook` instead of showing negation-only text.

**Distinction (Gym) trap/twins/enemy text (shell-mapper.ts)**
- `mapDistinctions` trap: Replaced circular `a.commonConfusion.slice(0,60)` with `"Test yourself: state each one's core move without borrowing the other's language."`.
- twins: Replaced with `"Both ${a.label} and ${b.label} address related ethical territory, which makes them easy to swap in explanations."`.
- enemy: Uses `rel.label` directly (already a complete contrast statement like "Utilitarianism stands in contrast to Deontology.").

**Prove distractor options (forge-session.ts)**
- `classificationOptions`: Changed distractor from broken `firstSentence("${related.label} belongs where the source is dealing with ${related.summary.toLowerCase()}")` to `truncate(related.definition || related.summary, 140)`.

**Apply fallback scenarios (forge-session.ts)**
- `buildGenesisDilemmas`: Replaced concept-definition-as-scenario fallback with `FALLBACK_SCENARIOS` array of 5 real ethical dilemmas (academic dishonesty, research integrity, colleague vs family, worker rights, leaked exam).

**Stats display (AeonthraShell.tsx)**
- Fixed "0/0 Correct" showing at session start: now displays "—" when `totalAnswered === 0`.

**Why**: UI/UX audit revealed 8 categories of incoherent output: internal tokens leaking into memory hooks, philosophers contaminated by concept names, Atlas boilerplate, circular distinction text, negation-only KEY DISTINCTION, malformed Prove distractors, context-as-scenario in Apply fallback, and misleading 0/0 stats.

**Downstream effects**: All concept-facing text is now self-contained and coherent without requiring Canvas course content to be meaningful. Demo mode produces honest, non-scaffolded output for all views.

### Source quality gate (source-quality.ts)

**Files changed**: `packages/content-engine/src/source-quality.ts` (new), `packages/content-engine/src/index.ts`, `apps/web/src/lib/shell-mapper.ts`, `apps/web/src/AeonthraShell.tsx`
**What it does**: Classifies CaptureBundle as `full` / `degraded` / `blocked-with-warning` before synthesis. Scores academic vs admin signals, detects clone families, chrome ratio, and boilerplate phrase dominance. Surfaces orange quality banner in Home view for degraded bundles.
**Why**: Orientation-heavy and thin course exports silently produced high-confidence study content with no indication of source quality problems. Users were being misled.
**Downstream effects**: `ShellSynthesis` type extended with 3 new required fields. Any future mapSynthesis callers must pass `bundle` as second argument.
**Skill refs**: `source-quality-gate`

### Clone-bucket distinct-evidence scoring

**Files changed**: `packages/content-engine/src/synthesis.ts`
**What it does**: Items fingerprinted by first 80 chars of `${title} ${body}`. Clone families weighted 1.0/0.3/0.05. Support score formula uses weighted canvas/textbook/assignment counts. Textbook items always bypass discounting.
**Why**: Raw frequency scoring allowed repeated boilerplate items (8× "Reflection Activity") to outrank genuine academic concepts backed by textbook chapters.
**Downstream effects**: Concept ranking changes for courses with structural repetition. Expected: academic concepts rise, boilerplate falls.
**Skill refs**: `distinct-evidence-scoring`

### Chapter source broadening

**Files changed**: `apps/web/src/lib/workspace.ts`
**What it does**: Chapters now drawn from all item kinds with conceptIds (not just `kind === "page"`). Pages are preferred if ≥ 2 exist; otherwise any kind is used. Deduplication by moduleKey preserved.
**Why**: Discussion-only and quiz-only course exports produced empty Reader views and blank Library because zero items matched the `kind === "page"` filter.
**Downstream effects**: Reader and Library now have content for all course types. Concept-to-chapter linkage improves for non-page-heavy courses.
**Skill refs**: `category-and-module-normalization`

### Infinite render loop fix (prevChapterKeyRef guard)

**Files changed**: `apps/web/src/AeonthraShell.tsx`
**What it does**: Added `prevChapterKeyRef = useRef(null)` JSON-key guard to the `useEffect([READING, sectionsRead])` chapter completion effect. Effect returns early if computed chapterCompletion is identical to previous call.
**Why**: Unconditional `onProgressUpdate` in this effect caused progress → workspace → shellData → READING → effect → progress infinite loop. 500+ errors per load.
**Downstream effects**: Chapter completion tracking now works correctly. Zero render loop errors post-fix.
**Skill refs**: `omega-self-repair-loop`

### Skills library expansion (7 new SKILL.md files)

**Files changed**: `.agents/skills/source-quality-gate/SKILL.md`, `.agents/skills/deterministic-concept-firewall/SKILL.md`, `.agents/skills/distinct-evidence-scoring/SKILL.md`, `.agents/skills/assignment-intent-cleanroom/SKILL.md`, `.agents/skills/category-and-module-normalization/SKILL.md`, `.agents/skills/offline-export-determinism/SKILL.md`, `.agents/skills/golden-regression-fixtures/SKILL.md`, `.agents/skills/omega-self-repair-loop/SKILL.md`
**What it does**: Documents the behavioral contracts for all major pipeline systems so future agents can correctly implement and repair each system.
**Why**: Without skill docs, pipeline behavior was implicit and prone to regression during refactors.
**Downstream effects**: All future agents working on AEONTHRA should consult `.agents/skills/` before modifying any system covered by a skill doc.
**Skill refs**: `omega-self-repair-loop`

### Legacy progress migration cancellation on explicit workspace replacement

**Files changed**: `apps/web/src/App.tsx`, `apps/web/src/App.test.ts`
**What it does**: Adds `discardLegacyProgressMigration()` and calls it when Canvas import, replay restore, demo load, or full reset explicitly replace the active workspace. This clears the deprecated unscoped legacy progress bucket and disables later fallback migration for the replaced workspace.
**Why**: The old migration ref stayed armed until the first scoped hydration. If the user replaced the workspace before that hydration, a later synthesis on the new workspace could inherit unrelated legacy progress.
**Downstream effects**: Deprecated unscoped progress is now only eligible for one initial migration path. Explicit workspace replacement cancels it instead of letting it leak across imports.
**Skill refs**: `read-write-boundaries`, `state-minimization`

## 2026-04-09

### Completed

- Scaffolded the local-first monorepo with shared schema, deterministic content engine, static React app, and MV3 extension.
- Expanded the learning runtime into a five-phase, twenty-submode protocol with four engine profiles.
- Added a typed extension-to-app bridge:
  - pending bundle storage in the extension
  - `Done Learning` direct handoff
  - page bridge messages for import request, pack ready, ack, and ping/pong
  - manual JSON export fallback remains intact
- Hardened stored bundle parsing through schema validation in both extension and web app.
- Added repo operating artifacts and repo-local skills scaffolding under `.agents/skills`.
- Added architecture, handoff, and truth-boundary docs.

### Current vertical slice

- Run a course-scoped capture in SENTINEL from an open Canvas course context.
- Queue bundle and open/focus ATLAS with `Done Learning`.
- Import queued pack automatically when the bridge is available.
- Fall back to JSON export/import when the bridge is unavailable.
- Generate the full deterministic study protocol entirely in-browser.
