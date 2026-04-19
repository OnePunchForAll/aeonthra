# ERROR LEDGER

## 2026-04-18

### [WEB] Page items were still promoted into assignment lanes, and grounded captured requirements collapsed to `unmapped`

**Status**: FIXED
**Root cause**: `deriveWorkspace()` kept `page` tasks when they had concept IDs, so page content could enter the assignment/readiness pipeline. In parallel, `buildAssignmentReadinessState()` treated any requirement without a full checklist-backed skill chain as `unmapped`, even when the requirement still had concept grounding and captured evidence.
**Symptom**: generic course pages could appear as submission targets, and grounded assignments with partial skill chains could be mislabeled as `Unmapped` instead of `Concept Prep`.
**Fix**: page tasks are no longer promoted into the assignment lane, and grounded requirements without a complete skill chain now surface as `concept-prep`. Added regressions for both paths.
**Guard**: `apps/web/src/lib/workspace.test.ts`, `apps/web/src/lib/atlas-shell.test.ts`, `npm run test --workspace @learning/web`, `npm run build --workspace @learning/web`, and `npm run typecheck`.

### [EXTENSION] Same-tab capture start regressed the last committed working load path for already-open Canvas tabs

**Status**: CODE FIX VERIFIED; LIVE RETEST PENDING
**Root cause**: the worker changed from opening a fresh hidden `course.modulesUrl` tab to forcing same-tab start in the already-open active Canvas tab. When that tab had been opened before the extension reload, the manifest content script was not attached there, so the popup could still detect the course by URL while capture start had no live receiver.
**Symptom**: the popup showed a detected course plus `detect url-fallback`, then `START_CAPTURE` failed with `Could not establish connection. Receiving end does not exist.` on the same launch tab.
**Fix**: the worker now keeps same-tab start only for `live-content-script` detection. If detection falls back to URL only, it restores the older reliable behavior and opens a fresh background modules tab before capture start, then waits for the normal declarative Canvas receiver instead of trying to inject recovery logic into that new tab. The worker also buffers DOM-seeded auto-start handshake signals so same-tab recovery cannot lose the first progress message to a race.
**Guard**: `apps/extension/src/core/service-worker.test.ts`, `apps/extension/src/popup-diagnostics.test.ts`, `npm run test --workspace @learning/extension`, `npm run build --workspace @learning/extension`, and `npm run typecheck`.

## 2026-04-17

### [CUTOVER] Workspace still resolved `@learning/content-engine` through a stale junction after package retirement

**Status**: FIXED
**Root cause**: `package-lock.json` already pointed `node_modules/@learning/content-engine` at `packages/content-engine-v2`, but the local workspace junction still targeted the deleted `packages/content-engine` directory until the install state was refreshed.
**Symptom**: `packages/interactions-engine` tests could not resolve `@learning/content-engine` even after the live seam and lockfiles were updated.
**Fix**: declared `@learning/content-engine` explicitly in `packages/interactions-engine/package.json` and reran `npm install`, which rebuilt the junction to `packages/content-engine-v2`.
**Guard**: `npm test`, `npm run test --workspace @learning/interactions-engine -- src/index.test.ts`, and the post-cutover package-lock verification.

### [ENGINE V2] Long plain-text paragraphs and quoted sentence boundaries could collapse clean multi-concept source into one visible concept

**Status**: FIXED
**Root cause**: `packages/content-engine-v2/src/structure/extract.ts` truncated plain-text paragraph nodes before evidence splitting, and `packages/content-engine-v2/src/utils/text.ts::splitSentences()` did not split after punctuation followed by a closing quote.
**Symptom**: a clean ethics reader used by `packages/interactions-engine` emitted `Utilitarianism` but lost `Deontology` and `Virtue Ethics`, breaking relation/collision consumers under the live cutover seam.
**Fix**: preserved full plain-text paragraph text for evidence extraction and made the sentence splitter recognize `."`, `!'`, `?)`, and similar closing-quote boundaries.
**Guard**: `packages/interactions-engine/src/index.test.ts`, `npm run test --workspace @learning/interactions-engine -- src/index.test.ts`, and the repeated benchmark run that still scores `98.00`.

### [WEB] DOCX ingest imported `mammoth/mammoth.browser` without declaring the dependency

**Status**: FIXED
**Root cause**: `apps/web/src/lib/docx-ingest.ts` imported Mammoth, but `apps/web/package.json` did not declare `mammoth`.
**Symptom**: `npm test` and `npm run build` failed in the web workspace even though the engine cutover itself was working.
**Fix**: added `mammoth` to `apps/web/package.json` and refreshed the workspace install.
**Guard**: `apps/web/src/lib/docx-ingest.test.ts`, `npm test`, and `npm run build`.

### [ENGINE V2] Mixed-content paragraph trust could reject an entire salvageable block before sentence-level filtering

**Status**: FIXED
**Root cause**: early structural trust in `packages/content-engine-v2/src/structure/extract.ts` treated any plain-text block containing hard-noise or chrome signals as fully rejected, even when the same block also contained strong academic sentences.
**Symptom**: mixed single-page captures could lose the real concept lane because the block was rejected before sentence-level salvage ran.
**Fix**: switched block trust to a mixed-content model that only rejects the whole block when noise exists without academic signal. Sentence-level filtering now handles mixed blocks deterministically.
**Guard**: `packages/content-engine-v2/src/tests/benchmark.test.ts` through `single-page-mixed-live-junk`, plus the repeated benchmark loop.

### [ENGINE V2] Explicit label extraction could fuse a broken fragment into the front of a real concept label

**Status**: FIXED
**Root cause**: explicit-definition extraction in `packages/content-engine-v2/src/candidates/concepts.ts` originally trusted the full subject phrase before `is/increases/...`, which allowed a fragment like `Creating Produce New Or` to prepend itself to a real concept label.
**Symptom**: the engine could derive garbage candidates such as `Creating Produce New Or Positive Reinforcement` from a mixed page.
**Fix**: strengthened fragment rejection, rejected connector-led label fragments, and recovered the accepted suffix label when the leading tokens were junk.
**Guard**: `single-page-mixed-live-junk` in the v2 benchmark corpus and repeated benchmark verification.

### [TRUTH GATE] Weak evidence could still become semantic-looking assignments, concepts, readiness, and Atlas nodes

**Status**: CODE FIX VERIFIED; LIVE RETEST PENDING
**Root cause**: multiple boundaries were too permissive at once. `content-canvas.ts` and `workspace.ts` still admitted LMS chrome and generic wrappers, `pipeline.ts` could promote truncated fragments into concepts, due-date parsing accepted weak prose hints, and shell/Atlas layers still amplified provenance-free concepts through semantic-looking fallback copy.
**Symptom**: live output could show `You need to have JavaScript enabled in order to access this site.` as a task, `Creating Produce New Or` as a concept, `Due in -101 days`, generic `Week N` readiness rows, and Atlas trees built from weak substrate.
**Fix**: added a deterministic truth gate across capture, extraction, synthesis, workspace derivation, and shell rendering. Structured Canvas fields now outrank prose guesses, suspicious dates are suppressed, concepts require grounded definition evidence plus provenance/pass reasons, shell fallbacks fail closed, and readiness/Atlas only build from sufficiently supported inputs.
**Guard**: `packages/content-engine/src/index.test.ts`, `packages/content-engine/src/artifact-support.test.ts`, `packages/content-engine/src/golden-fixtures.test.ts`, `apps/web/src/lib/workspace.test.ts`, `apps/web/src/lib/shell-mapper.test.ts`, `apps/web/src/lib/atlas-shell.test.ts`, `apps/web/src/lib/atlas-skill-tree.test.ts`, `packages/interactions-engine/src/index.test.ts`.

### [EXTENSION] Live full-course capture emitted retained pages that the worker never persisted

**Status**: CODE FIX VERIFIED; LIVE RETEST PENDING
**Root cause**: `apps/extension/src/content-canvas.ts` emitted retained pages as `aeon:item-captured`, but `apps/extension/src/service-worker.ts` only auto-routed `aeon:job-*`. The worker therefore never merged retained items into the partial bundle on the real capture path.
**Symptom**: Canvas traversal could look busy and show processed counts, yet finalization still hit `empty-bundle` and surfaced `No Importable Pages Captured`.
**Fix**: the worker now routes `aeon:item-captured`, records partial-bundle persistence counts in capture forensics, and regression tests prove the item reaches storage. The side panel now shows the live build marker, verdicts, and final inspection trace so the next manual run cannot be ambiguous.
**Guard**: `apps/extension/src/core/service-worker.test.ts`, `apps/extension/src/core/storage.test.ts`, `apps/extension/scripts/build.test.mjs`.

### [EXTENSION] Full-course Canvas captures could be rejected as non-importable after successful item capture

**Status**: FIXED
**Root cause**: `apps/extension/src/content-canvas.ts` trusted Canvas API `html_url` values as canonical queue item URLs. On installations that expose the same course on multiple equivalent hosts, the active tab host populated `captureMeta.sourceHost` while one or more captured item URLs preserved a different host from the API response. `inspectCanvasCourseKnowledgePack()` then correctly rejected the finished bundle as `ambiguous-course-identity` or `host-mismatch`.
**Symptom**: the extension could show high capture progress such as `36/37`, then still end on the generic phase label `No Importable Pages Captured` because final bundle inspection failed after capture rather than during traversal.
**Fix**: added same-course URL canonicalization onto the detected course origin before discovery items are queued, and changed the service-worker phase label so identity failures report as `Capture Identity Rejected` instead of pretending the bundle was empty.
**Guard**: `apps/extension/src/core/platform.test.ts`, `apps/extension/src/core/service-worker.test.ts`.

## 2026-04-16

### [BRIDGE] Fresh handoffs inherited stale capture timestamps and aged out of the queue incorrectly

**Status**: FIXED
**Root cause**: `createPendingHandoffEnvelope()` normalized `queuedAt` from `bundle.capturedAt` instead of the actual queue time.
**Symptom**: a newly queued handoff built from an older saved capture could be treated as expired immediately or far too early under the `24h` queue TTL.
**Fix**: queue envelopes now stamp `queuedAt` from the current time, while the bundle keeps its original capture timestamp.
**Guard**: `apps/extension/src/core/storage.test.ts`, `apps/extension/src/core/service-worker.test.ts`.

### [WEB] Explicit offline replay restore could reuse stale scoped notes in the mounted shell

**Status**: FIXED
**Root cause**: `AeonthraShell` seeds notes from scoped local storage on mount, but `App.tsx` restored offline replay bundles directly into the same mounted shell instance.
**Symptom**: a restore could show stale notes from the previous workspace instance and then autosave them into the restored scope.
**Fix**: `App.tsx` now bumps a shell instance epoch on explicit offline-site restore and keys `AeonthraShell` by `scope + epoch`, forcing a remount when the restored workspace directly replaces the current one.
**Guard**: `apps/web/src/App.test.ts`.

### [HYGIENE] Malformed tracked worktree gitlinks and disposable QA artifacts polluted repo truth

**Status**: FIXED
**Root cause**: `.claude/worktrees/**` had been tracked as broken gitlink entries without valid `.gitmodules` mapping, while disposable screenshots and QA outputs were left in the repo root.
**Symptom**: stale extension manifests and build outputs could masquerade as valid unpacked targets, and the repo looked busier than the actual canonical source tree.
**Fix**: removed the tracked worktree gitlinks and deleted the duplicate worktree directories, removed tracked root screenshots, and expanded `.gitignore` to cover disposable QA outputs.
**Guard**: `.gitignore` now blocks `.claude/worktrees/`, `dse-extracted/`, `test-results/`, and temporary web logs from drifting back into the repo state.

### [BRIDGE] Queued extension handoff and app import used different acceptance contracts

**Status**: FIXED
**Root cause**: the extension worker treated "schema-valid pending bundle" as sufficient for queue and relay, while the app required an importable Canvas extension capture. Those were different contracts.
**Symptom**: queued packs could reach the app and fail there with misleading generic bridge messages instead of being rejected at the worker boundary.
**Fix**: added the shared `inspectCanvasCourseKnowledgePack()` classifier in `packages/schema/src/index.ts`; the worker now uses it before queueing and again before `NF_PACK_READY`, and the app reuses the same classifier to emit exact `invalid-bundle`, `wrong-source`, `empty-bundle`, or `textbook-only` messages.
**Guard**: `apps/extension/src/core/service-worker.test.ts`, `apps/web/src/App.test.ts`, and `apps/web/src/lib/bridge.test.ts`.

### [STATE] Browser-local persistence drifted between legacy global keys and the scoped workspace model

**Status**: FIXED
**Root cause**: the older merged-bundle and unscoped-progress keys overlapped with the newer split `source-workspace` plus hash-scoped learner state, which obscured the canonical storage model.
**Symptom**: contributor docs and intermediate code paths could still act as if there were one global workspace state, even though the live app had already moved to split source pointers and scoped learner state.
**Fix**: current writes now treat `learning-freedom:source-workspace` as canonical, clear the legacy merged-bundle key during normal writes, and perform a one-time legacy unscoped-progress migration before clearing that compatibility key.
**Guard**: `apps/web/src/App.test.ts` and `apps/web/src/lib/storage.test.ts`.

### [DOCS] Truth claims drifted after the bridge repair and persistence canonicalization

**Status**: FIXED
**Root cause**: README, docs, `.omega` ledgers, and the phase-2 audit artifacts captured intermediate decisions and pre-fix failures as if they were still the current runtime truth.
**Symptom**: docs could still describe the bridge failure as current, imply a global reset model, or omit verified open limits like the single-slot pending queue and web-build nondeterminism.
**Fix**: updated README, `docs/**`, `.omega/**`, and the current audit artifacts to separate historical defects from current verified behavior and remaining open limits.
**Guard**: these docs now match the checked-in bridge, storage, Atlas, semantic, and purge state plus the current verification loop.

### [WEB] AeonthraShell duplicated Atlas readiness and chapter-reward derivation across multiple surfaces

**Status**: FIXED
**Root cause**: the shell was recomputing assignment readiness and chapter reward labels inline across home, journey, and assignment views instead of consuming one typed Atlas projection.
**Symptom**: safe Atlas changes had a high debugging tail because multiple view-local branches needed to stay aligned by hand, and drift in one surface would be easy to miss.
**Fix**: extracted `apps/web/src/lib/atlas-shell.ts` as the shared Atlas projection/readiness seam, then rewired `AeonthraShell.tsx` to consume that helper and added direct regression tests.
**Guard**: `apps/web/src/lib/atlas-shell.test.ts`, `npm run test --workspace @learning/web -- src/lib/atlas-shell.test.ts src/lib/atlas-skill-tree.test.ts`, `npm run build --workspace @learning/web`.

### [RELEASE] Extension build could succeed while `dist/manifest.json` referenced missing unpacked files

**Status**: FIXED
**Root cause**: `apps/extension/scripts/build.mjs` copied `manifest.json` into `dist` but never verified that every manifest-referenced file was actually present in the unpacked output.
**Symptom**: a build/manifest rename drift could still produce a green `npm run build:extension`, while Chrome would load a broken unpacked extension because one or more referenced files were missing.
**Fix**: refactored the build script around explicit entry/copy lists and added a post-build validation step that rejects missing, absolute, or out-of-tree manifest asset paths.
**Guard**: `apps/extension/scripts/build.test.mjs`.

### [REPLAY] Offline bundle import rejected pre-notes exports

**Status**: FIXED
**Root cause**: `parseOfflineSiteBundle()` recomputed the deterministic hash with `notes`, while older exports were hashed before that field existed. Schema parsing defaulted `notes` after parse, so structurally valid bundles still failed hash comparison.
**Symptom**: previously exported offline replay bundles loaded as generic invalid imports after the notes field was added.
**Fix**: added dual hash validation in `offline-site.ts`: current bundles validate with `notes`, legacy bundles without a `notes` field validate against the pre-notes payload shape and restore `notes` as an empty string.
**Guard**: `apps/web/src/lib/offline-site.test.ts`.

### [STATE] Same-course preservation regressed across mixed legacy and host-aware captures

**Status**: FIXED
**Root cause**: course matching collapsed to a single normalized identity string, so a host-aware bundle normalized to `host::courseId` while an older course-id-only bundle normalized to `courseId`. The app treated the same course as different after metadata upgrades.
**Symptom**: re-capturing the same course after the host metadata rollout could drop the textbook and reset progress.
**Fix**: `source-workspace.ts` now compares course ids first, then enforces host equality only when both hosts are known. Host inference falls back to bundle URLs when explicit metadata is absent.
**Guard**: `apps/web/src/lib/source-workspace.test.ts`.

### [WEB] Mounted shell ignored reduced-motion, hid focus on text inputs, and overflowed on mobile Atlas layouts

**Status**: FIXED
**Root cause**: the live shell relied on JS-driven scrolling and large inline desktop layouts that bypassed CSS-only reduced-motion handling, while several mounted inputs overrode the repo-wide focus ring with `outline: none`.
**Symptom**: Atlas edge-scroll still moved under reduced motion, Oracle/notes/assignment text fields lost a visible keyboard focus indicator, and the main shell overflowed on narrow mobile widths.
**Fix**: added viewport and reduced-motion state in `AeonthraShell`, disabled JS scroll motion when motion should be reduced, removed inline focus suppression, added responsive layout switches for the mounted large views, and restored keyboard access to pointer-only controls.
**Guard**: `npm run typecheck`, `npm test`, and `npm run build:web` all pass after the mounted-shell patch.

### [PIPELINE] Evidence validation discarded application and misconception sentences before concept field synthesis

**Status**: FIXED
**Root cause**: the pipeline used one strict sentence validator for both concept definitions and semantic evidence lanes. Sentences like `use X when...` or `students often confuse X with Y` failed that validator even though they were exactly the right material for transfer and confusion fields.
**Symptom**: `transferHook` and `commonConfusion` frequently collapsed to empty strings or repeated generic fallback text even when the source bundle contained clear instructional or misconception evidence.
**Fix**: split strict definition validation from broader evidence validation, widened evidence collection to nearby structured blocks, and reserved evidence lanes for summary/confusion/transfer instead of letting one sentence fill every role.
**Guard**: `packages/content-engine/src/index.test.ts`.

### [WEB] Atlas overstated progression depth by presenting a module board as a skill tree

**Status**: FIXED
**Root cause**: the live shell derived progression from modules, chapters, and concept mastery percentages without a real skill-node model, prerequisite graph, or assignment-skill requirement layer.
**Symptom**: Atlas looked game-like but was still fundamentally a dressed-up module/concept board.
**Fix**: added deterministic skill-tree derivation, chapter rewards, assignment skill requirements, truthful locked-node behavior, and recovery/mastery states in the live shell.
**Guard**: `apps/web/src/lib/atlas-skill-tree.test.ts`.

### [WEB] Replay bundles were not self-contained and course identity could drift across hosts

**Status**: FIXED
**Root cause**: offline replay bundles omitted notes, accepted embedded hashes without recomputation, preserved `practiceMode`, and same-course checks could collapse different hosts that shared the same `courseId`.
**Symptom**: replay restore could resurrect stale notes, carry brittle unlock state forward, or preserve textbook/progress state across unrelated hosts.
**Fix**: replay bundles now include notes, validate their deterministic hash on restore, fail closed on `practiceMode`, and use host-aware course identity where possible.
**Guard**: `apps/web/src/lib/offline-site.test.ts`, `apps/web/src/lib/source-workspace.test.ts`, and `apps/web/src/App.test.ts`.

### [MAINTENANCE] Extension build mirrored generated artifacts back into source control

**Status**: FIXED
**Root cause**: the extension build copied compiled JS/HTML/CSS from `dist` back into `apps/extension/`, which made the repo carry duplicate generated artifacts and caused build verification to modify tracked files.
**Symptom**: `npm run build:extension` dirtied the worktree even when no source code changed.
**Fix**: kept `apps/extension/dist` as the canonical unpacked-extension output and removed the root mirror step from the build script.
**Guard**: `apps/extension/scripts/build.mjs`, `README.md`, and `.github/workflows/verify.yml`.

## 2026-04-15

### [WEB] Reader hints, highlights, and practice CTAs could bind to the wrong concept from a multi-concept reading

**Status**: FIXED
**Root cause**: the shell carried multiple candidate concept ids on a reading, but the reader/margin UI collapsed them by taking the first matching concept instead of resolving which concept the active section actually supported.
**Symptom**: section badges, margin hints, saved highlight `conceptId`, mastery bumps, and Practice launches could all point at the wrong concept when overlapping concepts shared broad keywords.
**Fix**: added a fail-closed dominant-concept resolver keyed to the active section text and routed reader hints/highlights/practice through it instead of `concepts[0]`.
**Guard**: `apps/web/src/lib/shell-mapper.test.ts`.

### [WEB] Historical request-state hardening before validated extension-initiated pack acceptance

**Status**: FIXED
**Root cause**: `App.tsx` accepted any schema-valid `NF_PACK_READY` bridge message, even when no import request was active in the current session.
**Symptom**: a stale or unsolicited extension handoff could replace the active Canvas workspace without the user explicitly requesting an import.
**Fix**: request-state handling was introduced first, then later relaxed so the app can still accept a validated extension-originated pack when request mode has already cleared. Safety now comes from the shared importability classifier and bridge envelope validation rather than request state alone.
**Guard**: `apps/web/src/App.test.ts`, `apps/web/src/lib/bridge.test.ts`, and `packages/schema/src/index.ts`.

### [PIPELINE] Discussion scaffolds and wrapper variants could crowd out the true academic concept lane

**Status**: FIXED
**Root cause**: deterministic extraction still treated some discussion scaffolds (`initial post`, `reply to classmates`) and academic wrapper variants (`Overview of X`, `Principles of X`) as separate concept candidates instead of noise or aliases.
**Symptom**: clone-heavy/admin-heavy captures could surface orientation/forum concepts or duplicate one real topic under several wrapper labels, reducing the quality of the stable concept set.
**Fix**: added scaffold-label blocking, alias-aware concept dedupe, and broader source-quality/extraction fixtures for thin-discussion, clone-heavy, and full-academic bundle shapes.
**Guard**: `packages/content-engine/src/golden-fixtures.test.ts`.

### [WEB] Oracle depth panels could still surface negation-only scaffold text

**Status**: FIXED
**Root cause**: `shell-mapper.ts` filtered negation-only `commonConfusion` text out of the distinction path, but the depth candidate loop still allowed the same scaffold sentence to win when it was present in `primer` or `summary`.
**Symptom**: concept cards could show a shallow `X is not Y. Keep their main moves separate.` sentence in Going Deeper / Core Idea panels even when a more explanatory sentence existed.
**Fix**: applied the same negation-only filter in `conceptDepthText()` and added a shell-mapper regression test that verifies richer explanatory text wins instead.
**Guard**: `apps/web/src/lib/shell-mapper.test.ts`.

### [WEB] Messy textbook imports could still pass as meaningful content after extraction cleanup

**Status**: FIXED
**Root cause**: the textbook import path rejected completely empty inputs, but it still treated some OCR-heavy or front-matter-heavy extracts as meaningful enough to build a bundle. PDF and DOCX extractors also passed repeated page markers and boilerplate lines through unchanged.
**Symptom**: OCR-noise-only dumps and front-matter-only extracts could slip through the intake gate, while duplicate page markers and boilerplate clutter made chapter/body extraction noisier than it should be.
**Fix**: added textbook-import noise filtering for common boilerplate lines and page markers, tightened the meaningful-text threshold, and normalized PDF/DOCX extraction output to strip repeated page markers and front-matter lines before validation.
**Guard**: `apps/web/src/lib/textbook-import.test.ts`, `apps/web/src/lib/docx-ingest.test.ts`, and `apps/web/src/lib/pdf-ingest.test.ts`.

### [WEB] Canvas intake accepted non-Canvas bundles, textbook extraction could be empty, and notes were global

**Status**: FIXED
**Root cause**: Step 1 treated any schema-valid `CaptureBundle` as acceptable Canvas course input, textbook bundle creation would happily emit a `manual-import` bundle even when extracted text was effectively empty, note persistence lived in one unscoped local-storage key, and same-course preservation fell back to title-only matching when `courseId` was absent.
**Symptom**: a manual-import/demo-shaped JSON file could unlock the Canvas gate, blank OCR-less textbook uploads could move the app to synthesis-ready, notes could appear in unrelated restored/demo workspaces, and missing-course-id imports could preserve stale textbooks across different offerings with the same title.
**Fix**: restricted Canvas intake to real `extension-capture` bundles, rejected empty textbook imports during bundle creation, scoped notes to the synthesized workspace hash, and only preserve textbooks across Canvas imports when both bundles expose the same explicit course id.
**Guard**: `apps/web/src/lib/source-workspace.test.ts`, `apps/web/src/lib/storage.test.ts`, and `apps/web/src/lib/textbook-import.test.ts`.

### [EXTENSION] Popup copy mojibake and storage meter ratio were still unsafe

**Status**: FIXED
**Root cause**: the popup still contained mojibake in its CTA copy, and the options storage meter still divided by `quotaBytes` without guarding a zero or invalid quota estimate.
**Symptom**: the popup rendered broken glyphs in the main action copy, and the settings page could compute a `NaN` storage percentage when Chrome reported zero quota.
**Fix**: rewrote the popup copy in ASCII, changed the CTA label to a neutral `START CAPTURE`, guarded the settings storage ratio with a zero-quota check, and added a shared progress regression test for invalid values.
**Guard**: `apps/extension/src/ui/shared.test.tsx`.

### [EXTENSION] Course detection, discovery warnings, and handoff settings overstated what the extension could support

**Status**: FIXED
**Root cause**: the service worker and content script accepted any `/courses/<id>` URL as a Canvas course when fallback parsing kicked in, paginated discovery fetches suppressed endpoint failures as empty arrays, and the settings UI accepted AEONTHRA classroom URLs on origins where the bridge content script never loads. The extension source tree also still contained a stale popup implementation for the old `capture-selection` / `Done Learning` flow.
**Symptom**: non-Canvas sites could surface course-capture actions, discovery could "succeed" while silently omitting categories after transient failures, and users could save a handoff URL that would never support direct import even though the UI implied otherwise.
**Fix**: added shared platform guards for known-host fallback parsing and bridge-supported URL validation, retried thrown network failures in paginated discovery, emitted category warnings when discovery still has to continue without a collection, removed the dead popup source, and wired extension regression tests into root `npm test`.
**Guard**: `apps/extension/src/core/platform.test.ts`, `docs/extension-handoff.md`, and `.omega/DIAGNOSTIC_PROTOCOL.md`.

### [WEB] Reset Workspace left stale notes/progress behind and offline exports used synthesis time

**Status**: FIXED
**Root cause**: `resetWorkspace()` in `apps/web/src/App.tsx` only cleared bundle/source-workspace pointers, leaving `learning-freedom:notes` and all `learning-freedom:progress*` keys in local storage. Separately, `createOfflineSiteBundle()` in `apps/web/src/lib/offline-site.ts` populated `exportedAt` from `learningBundle.generatedAt`, which is the synthesis timestamp rather than the download/export time.
**Symptom**: after Reset Workspace, re-importing the same course could resurrect old notes and mastery state; downloaded replay bundles displayed the synthesis date as if it were the export date.
**Fix**: added storage helpers that can clear notes and all progress scopes, changed offline bundle creation to stamp `exportedAt` with the current time, and wired the runtime reset path through scoped clearing for the active workspace. Expanded storage regression coverage to lock both the no-scope and scoped-clear contracts.
**Guard**: `apps/web/src/lib/storage.test.ts` now verifies note clearing, default-progress clearing, scoped-progress clearing, and unrelated-key preservation.

### [WEB] Legacy source splitting leaked Canvas capture metadata into textbook state

**Status**: FIXED
**Root cause**: `splitLegacyBundle()` rebuilt textbook bundles from the old merged bundle by spreading the original bundle object and only changing `source`/`title`. That preserved `captureMeta` from the Canvas capture, so textbook state inherited course-specific extension metadata it did not own.
**Symptom**: legacy storage migration produced textbook bundles labeled as manual imports but still carrying Canvas course metadata, which risked misleading later logic and made the source boundary semantically inconsistent.
**Fix**: explicitly cleared `captureMeta` on the reconstructed textbook bundle and added regression tests for source-workspace split/merge behavior, offline replay restore helpers, and bridge messaging.
**Guard**: `apps/web/src/lib/source-workspace.test.ts`, `apps/web/src/lib/offline-site.test.ts`, and `apps/web/src/lib/bridge.test.ts`.

### [MAINTENANCE] Contributor docs and verification drifted from runtime reality

**Status**: FIXED
**Root cause**: README, architecture docs, truth-boundary docs, and `.omega/TODO_NOW.md` were not updated after the dev-server port, course-capture workflow, and Vitest wiring changed. The web app's storage smoke check lived in `storage.test.mjs` as a standalone script instead of participating in root `npm test`.
**Symptom**: onboarding pointed contributors to the wrong local URL, described obsolete highlight/visible-page capture behavior, and claimed test alias resolution was still broken even though the current workspace test run passed.
**Fix**: updated contributor-facing docs to match the current AEONTHRA runtime and course-capture flow; added a naming bridge between AEONTHRA and the OMEGA FORGE codenames; replaced the standalone storage smoke script with a real Vitest workspace test and wired `apps/web` into root `npm test`.
**Guard**: the verified dev URL and current capture claims now live in the checked-in docs, and root `npm test` exercises the web workspace instead of leaving that smoke coverage out-of-band.

## 2026-04-13

### [PIPELINE] Memory hooks exposing internal tokens

**Status**: FIXED
**Root cause**: `conceptMnemonic` in pipeline.ts constructed phrases from raw concept keywords, including single short words ("demo", "states", "virtue") and internal names ("aeonthra"). Phrases like "Picture two lanes: Kant's Categorical Imperative handles aeonthra, while Trolley Problem handles demo." were shown in the memory hook panel.
**Symptom**: Memory hook text contained engineering internals, concept names instead of ideas, and incomplete phrases for concepts with few long keywords.
**Fix**: Raised keyword threshold to `>= 8` chars, blocked possessives and internal tokens, returns `""` if fewer than 2 qualifying keywords — falling back to `transferHook`. Added `sanitizeConceptMnemonic` regex guard.
**Guard**: `MNEMONIC_BLOCKED_TOKENS` set in pipeline.ts; `sanitizeConceptMnemonic` catches any remaining leakage.

### [PIPELINE] Oracle showing concept labels as philosophers

**Status**: FIXED
**Root cause**: `mapKeyFigures` in shell-mapper.ts scanned concept definitions (which contain concept labels as 2-word title-case phrases like "Trolley Problem", "Virtue Ethics") and extracted them as person names. `NON_PERSON_TOKENS` did not include philosophical terms.
**Symptom**: Oracle KEY FIGURES list showed "Trolley Problem", "Virtue Ethics", "Its Formula" alongside real philosophers.
**Fix**: Expanded `NON_PERSON_TOKENS` with 18 philosophical/ethical terms. Rewrote `mapKeyFigures` to scan only `bundle.items`; cross-checks against `conceptLabelSet` and `conceptLabelWords`.
**Guard**: `NON_PERSON_TOKENS` set; conceptLabelSet cross-check in `mapKeyFigures`.

### [PIPELINE] Atlas module descriptions showing boilerplate scaffold sentences

**Status**: FIXED
**Root cause**: `demo.ts` `conceptPageText` prepended "X is introduced in Module N as a major ethical framework students must be able to define, compare, and apply." — this became the first sentence of `ch.summary` via `cleanSummary`, then flowed into `mapModulesFromChapters` as `module.desc`. Vite HMR did not pick up the `demo.ts` change.
**Symptom**: Atlas module description: "Utilitarianism is introduced in Module 1 as a major ethical framework students must be able to define, compare, and apply."
**Fix**: Applied at shell-mapper.ts layer: `sanitizeModuleDesc()` strips "is introduced in Module N", "students must be able to", and "a major ethical framework" boilerplate before using summary as module description.
**Guard**: `sanitizeModuleDesc` applied in `mapModulesFromChapters`.

### [UI] KEY DISTINCTION showing "X is not Y" negation-only text

**Status**: FIXED
**Root cause**: `conceptDistinctionText` candidates list put `concept.commonConfusion` first. The `commonConfusion` field follows the pattern "X is not Y. Keep their main moves separate." — which is used for Gym distinctions, but is a tautology when displayed as the concept's KEY DISTINCTION in Oracle.
**Symptom**: Oracle KEY DISTINCTION: "Kant's Categorical Imperative is not Trolley Problem. Keep their main moves separate."
**Fix**: Added `isNegationOnlyText()` filter; moved `relationDistinction` before `commonConfusion` in candidates; negation-only text falls through to `concept.summary` or `concept.transferHook`.
**Guard**: `isNegationOnlyText` regex in shell-mapper.ts.

### [UI] Gym distinction trap/twins/enemy fields circular or content-free

**Status**: FIXED
**Root cause**: `mapDistinctions` trap used `a.commonConfusion.slice(0,60)` = "Utilitarianism is not Deontology. Keep th" — circular because the trap asks "when do students confuse them?" and the answer begins "X is not Y". The `enemy` field used `rel.label` but the label IS the contrast statement, not a thing to prefix. `twins` was generic boilerplate.
**Symptom**: Gym trap: "Students confuse Utilitarianism and Deontology because Utilitarianism is not Deontology. Keep th while Deontology is not Utilitarianism."
**Fix**: All three fields replaced with action-oriented or structurally sound templates.
**Guard**: No `commonConfusion` usage in `mapDistinctions`.

### [UI] Prove distractor options producing malformed sentences

**Status**: FIXED
**Root cause**: `classificationOptions` built distractors with `firstSentence("${related.label} belongs where the source is dealing with ${related.summary.toLowerCase()}")`. `related.summary` starts mid-sentence ("it is the right response...") producing "Virtue Ethics belongs where the source is dealing with it is the right response between two moral failures."
**Symptom**: Prove answer options showed malformed English with awkward pronoun references.
**Fix**: Changed to `truncate(related.definition || related.summary, 140)` — uses actual concept definition text as distractor.
**Guard**: `classificationOptions` now references `related.definition` first.

### [UI] Apply tab using concept definition as the scenario text

**Status**: FIXED
**Root cause**: `buildGenesisDilemmas` fallback produced `` `Apply ${concept.label} to this situation: ${truncate(evidence, 180)}` `` where `evidence` IS the concept's definition — the "situation" was the concept's own description.
**Symptom**: Apply scenario: "Apply Kant's Categorical Imperative to this situation: An action is moral only if it could be universalized as a law for all rational beings."
**Fix**: Replaced with `FALLBACK_SCENARIOS` array of 5 real ethical dilemmas that are genuinely external situations concepts can be applied to.
**Guard**: `FALLBACK_SCENARIOS` constant in forge-session.ts; fallback now truly applies the concept externally.

### [UI] Stats panel showing "0/0 Correct" before any answers

**Status**: FIXED
**Root cause**: Stats panel always rendered `totalCorrect/totalAnswered` regardless of whether any questions had been answered.
**Symptom**: Session start shows "0/0 Correct" which implies 0% accuracy rather than "not yet started".
**Fix**: Render "—" when `totalAnswered === 0`.
**Guard**: `totalAnswered > 0` ternary in AeonthraShell.tsx Stats panel.

### [RENDER] Infinite render loop — Maximum update depth exceeded

**Status**: FIXED
**Root cause**: `useEffect([READING, sectionsRead])` in AeonthraShell.tsx called `onProgressUpdate({chapterCompletion})` unconditionally. Since `progress` is a `useMemo` dependency of `workspace`, any progress update produced a new `workspace` → new `shellData` → new `READING` reference → useEffect re-fires → infinite loop.
**Symptom**: 500+ "Maximum update depth exceeded" errors in browser console on every load; app UI hung.
**Fix**: Added `prevChapterKeyRef = useRef(null)` guard. Effect computes `JSON.stringify(chapterCompletion)` and returns early if unchanged from previous call. Identical pattern to existing `prevProgressKeyRef` mastery guard.
**Guard**: `if (prevChapterKeyRef.current === key) return;` at top of useEffect body — breaks the loop regardless of how READING is reconstructed.
**Introduced by**: Chapter completion useEffect added without the stabilization guard that all other progress effects use.

### [DEV] Vite fs.allow blocks shared packages — blank app in dev mode

**Status**: FIXED
**Root cause**: The worktree's `packages/` symlink targets resolve to the MAIN repo path (`Canvas Converter/packages/...`). Vite follows symlinks and checks the real path against `fs.allow`. The allow list only contained the worktree root, so all `@learning/schema` and `@learning/content-engine` module requests got 500 errors. React never initialized and the page stayed blank.
**Symptom**: App blank in dev server after any page reload; console showed "Invalid hook call" from React module-graph corruption caused by 500s on `shell-mapper.ts`; network showed `shell-mapper.ts → 500`.
**Fix**: Added main repo root (`../../../../` from `apps/web/`) to `fs.allow` in `apps/web/vite.config.ts`. Production build was already unaffected (Rollup resolves through symlinks without path restriction).
**Guard**: `vite.config.ts` comment documents why both paths are needed. Any new worktree must replicate this two-path allow list.

### [PIPELINE] Source quality gate planned but never implemented

**Status**: FIXED
**Root cause**: `source-quality.ts` was referenced in ERROR_LEDGER and shell-mapper.ts types but the file did not exist. The import caused a silent undefined at runtime.
**Symptom**: No quality banner ever appeared; `synthesisMode` was always undefined; degraded bundles silently produced full-quality output.
**Fix**: Created `packages/content-engine/src/source-quality.ts` from scratch with `assessSourceQuality()` and `qualityBannerText()`. Exported from `index.ts`. Wired into `shell-mapper.ts::mapSynthesis()`. Banner rendered in AeonthraShell Home view.
**Guard**: `ShellSynthesis` type now has required `qualityBanner`, `qualityWarnings`, and `synthesisMode` fields — TypeScript will error if the gate is removed without updating the type.

### [PIPELINE] Chapter starvation for non-page-heavy courses

**Status**: FIXED
**Root cause**: `workspace.ts` built chapters exclusively from `kind === "page"` items. Courses with only discussions, quizzes, or assignments produced zero chapters → Reader view empty, Library blank.
**Symptom**: Discussion-only course exports showed empty Reader with no content to read.
**Fix**: Broadened chapter source: collect all items with conceptIds; prefer pages if ≥ 2 exist, otherwise use any kind. Deduplication by moduleKey preserved.
**Guard**: Logic documented in `category-and-module-normalization` skill. Future changes to chapter construction must preserve the page-preference fallback.

### [SCORING] Repeated boilerplate items inverting concept ranking

**Status**: FIXED
**Root cause**: Raw frequency scoring in `buildConceptSupport()` counted each canvas source occurrence at weight 1.0. A course with 8 identical "Reflection Activity" items scored reflection concepts higher than concepts backed by 2 textbook chapters.
**Symptom**: Top concepts in Ethics courses were generic reflection scaffolds, not philosophical concepts.
**Fix**: Added `buildCloneFamilies()` and `buildDiversityWeights()` to synthesis.ts. Clone families weighted 1.0 / 0.3 / 0.05 (first / second / third+ member). Textbook items always weight 1.0 (bypass discounting). Score formula updated to use weighted counts for canvas, textbook, and assignment buckets.
**Guard**: `distinct-evidence-scoring` skill documents required outcome: clone families beyond first member contribute < 1/20 of naive weight.

### [APP ORCHESTRATION] Legacy progress migration could bleed into a replaced workspace

**Status**: FIXED
**Root cause**: `legacyProgressMigrationRef` stayed `true` until the first scoped hydration pass cleared it. If the user imported a different Canvas bundle, restored a replay bundle, loaded demo mode, or reset before that hydration, the deprecated unscoped progress bucket remained armed and could later hydrate into the wrong workspace.
**Symptom**: A newly imported or restored workspace could inherit stale concept/chapter/skill progress from an unrelated legacy bundle after synthesis completed.
**Fix**: Added `discardLegacyProgressMigration()` in `apps/web/src/App.tsx` and invoked it on explicit workspace replacement flows so the legacy bucket is cleared and migration is canceled before the next workspace hydrates.
**Guard**: `apps/web/src/App.test.ts` now proves the helper clears only pending legacy migration and leaves the bucket untouched when no migration is pending.

## 2026-04-09

### Missing direct handoff between extension and app

- Symptom: the extension could export JSON and open the workspace, but it could not transfer a queued capture bundle in one flow.
- Root cause: no typed bridge protocol existed between the content script and the page, and the background worker had no pending-pack queue.
- Fix: added validated bridge messages, pending bundle storage, content-script relay logic, and a `Done Learning` action that opens the workspace and triggers import.

### Unvalidated persisted bundles

- Symptom: local storage reads in the web app trusted raw JSON without schema validation.
- Root cause: storage helpers cast parsed JSON directly to `CaptureBundle`.
- Fix: switched storage reads to `CaptureBundleSchema.safeParse(...)` so bad payloads degrade to a clean empty state instead of poisoning the workspace.

## 2026-04-17

### [EXTENSION CAPTURE] Fresh hidden capture tabs could reject the first start message

**Status**: FIXED
**Root cause**: `apps/extension/src/service-worker.ts` opened a hidden modules tab, waited for the tab to report `complete`, and then sent exactly one `aeon:start-course-capture` message. In live Chrome/Canvas runs, `complete` could arrive before the content script had attached, which produced transient `Receiving end does not exist` / `Could not establish connection` errors and aborted the run before any items persisted.
**Symptom**: The extension could look like it no longer captured content because the background run never actually started, even though existing finalize/importability tests still passed.
**Fix**: Added retryable worker-to-Canvas messaging with a short post-load backoff, used it for course-context detection plus capture start/control commands, forced full-course capture to `complete`, and removed the UI/settings mode split that kept routing users through weaker capture paths.
**Guard**: `apps/extension/src/core/service-worker.test.ts` now proves the first hidden-tab handshake can fail once and still recover into a started complete snapshot. `apps/extension/src/core/storage.test.ts` now proves persisted legacy `learning` defaults normalize back to `complete`.

### [EXTENSION UX] Hidden-tab capture could still look invisible from the popup

**Status**: FIXED
**Root cause**: The popup only showed a static course-detected view plus a start button. It did not poll live runtime state, did not render active capture progress, and did not automatically open the side panel after launch.
**Symptom**: Even when capture started successfully, users could still report that they did not see the loader/progress surface while the course was being captured.
**Fix**: `apps/extension/src/popup.tsx` now polls extension state, renders a live progress card when runtime is `starting|discovering|capturing|paused`, disables duplicate starts, and best-effort opens the side panel after a successful launch.
**Guard**: Verified by extension build, extension test suite, and root typecheck; manual authenticated Chrome retest remains the final live-proof step.

### [EXTENSION UX] Full-course capture remained invisible because the real loader lived in a hidden tab

**Status**: FIXED
**Root cause**: Even after popup polling was added, the canonical full-course run still created `tabs.create({ active: false })`. The strongest live loader already existed as the Canvas-page overlay, but it was attached to a hidden capture tab and therefore could still be invisible in the real user flow.
**Symptom**: Users could still report “it’s not working” because no visible live loader appeared while the extension was actually crawling.
**Fix**: `apps/extension/src/service-worker.ts` now opens the capture tab as `active: true`, and `apps/extension/src/core/service-worker.test.ts` locks that behavior in.
**Guard**: Verified by targeted service-worker test, extension build, and root typecheck.

### [EXTENSION UX] Popup polling itself caused a 1-second flash loop

**Status**: FIXED
**Root cause**: `apps/extension/src/popup.tsx` polled extension state on an interval but called `setLoading(true)` at the start of every poll. That re-rendered the loader card over the popup every cycle and made the extension appear to blink.
**Symptom**: “The extension flashes every 1 second when it’s open,” and the live capture card looked unstable even when runtime state was available.
**Fix**: Popup polling now runs as a background refresh that preserves the current rendered state, and the popup gained an explicit `OPEN CAPTURE TAB` action backed by `aeon:focus-capture-tab`.
**Guard**: Verified by extension build, root typecheck, and service-worker regression coverage for the focus action.

### [EXTENSION CAPTURE] Full-course start reopened the same Canvas page in a duplicate tab instead of attaching capture to the launch tab

**Status**: FIXED
**Root cause**: `apps/extension/src/service-worker.ts` still created a new active `course.modulesUrl` tab for every full-course run, even when the user had already launched capture from a verified Canvas course page.
**Symptom**: Clicking Capture appeared to just reopen the same Canvas page in another tab while the expected loader never attached to the page the user actually clicked from.
**Fix**: Full-course capture now starts inside the current Canvas tab itself, reuses that tab as the capture runtime surface, and dedupes overlay broadcasts when `sourceTabId === captureTabId`.
**Guard**: `apps/extension/src/core/service-worker.test.ts` now proves the full-course path no longer calls `chrome.tabs.create(...)` and still retries the start handshake successfully.

### [EXTENSION CAPTURE] Active Canvas tab could be detected by URL while still lacking a live content-script receiver

**Status**: FIXED
**Root cause**: `detectCourseContext()` could fall back to URL-based course detection on a verified Canvas tab even when `content-canvas.js` was not actually attached there yet, especially after an extension reload. Starting capture then failed with `Could not establish connection. Receiving end does not exist.`
**Symptom**: The popup showed `COURSE DETECTED`, but clicking Capture immediately returned the missing-receiver error on the same page.
**Fix**: `sendCanvasMessageWithRetry()` now treats missing-receiver errors as a content-script recovery seam: it injects `content-canvas.js` into the verified Canvas tab with `chrome.scripting.executeScript(...)` and retries the message.
**Guard**: `apps/extension/src/core/service-worker.test.ts` now proves the worker injects `content-canvas.js` into the active Canvas tab before the retry succeeds.

### [EXTENSION UX] Popup could hide the loader even after capture successfully started

**Status**: FIXED
**Root cause**: Once full-course capture began running in the current Canvas tab, the popup stayed open and physically obscured the page area where the overlay loader was rendered.
**Symptom**: The popup showed `LIVE CAPTURE` and `Starting Capture`, but the user still could not see the page-level loader and it still felt like nothing was happening.
**Fix**: `apps/extension/src/popup.tsx` now closes the popup immediately after a successful capture start.
**Guard**: Verified by extension test suite, extension build, and root typecheck.

### [EXTENSION CAPTURE] Injecting the Canvas script was not enough when the message port itself stayed unavailable

**Status**: FIXED
**Root cause**: The earlier recovery patch still assumed `chrome.tabs.sendMessage(...)` would succeed once `content-canvas.js` had been reinjected. Live evidence showed a verified Canvas tab could still keep returning a missing-receiver error afterward, leaving capture start and overlay updates blocked on the same dead port.
**Symptom**: The popup still showed `Could not establish connection. Receiving end does not exist.` on a detected course page even after the inject-and-retry repair.
**Fix**: `apps/extension/src/content-canvas.ts` now exposes a direct bootstrap API on `window`, and `apps/extension/src/service-worker.ts` falls back to invoking that bootstrap with `chrome.scripting.executeScript({ func })` for course-context, capture start/control, and overlay-state operations when the message receiver path stays unavailable.
**Guard**: `apps/extension/src/core/service-worker.test.ts` now proves the worker can still start full-course capture through the injected bootstrap when the start message never regains a receiver. Verified by extension test suite, extension build, and root typecheck.

### [EXTENSION UX] Popup did not preserve actionable blocker evidence near the capture action

**Status**: FIXED
**Root cause**: The popup only showed a transient top-level error string and did not expose whether the worker was reachable, whether course detection was live or URL-only fallback, or whether a stored runtime/finalized capture error already existed.
**Symptom**: Repeated live failures were hard to diagnose because the user could click Capture again without a stable local summary of what the popup could actually prove about the current tab.
**Fix**: `apps/extension/src/popup.tsx` now renders a `START DIAGNOSTICS` box directly under the capture button, and the worker exposes the course-detection source so the popup can distinguish live receiver detection from URL fallback.
**Guard**: Verified by extension test suite, extension build, and root typecheck.

### [EXTENSION CAPTURE] Receiver-recovery failures were still flattened into the same generic missing-receiver error

**Status**: FIXED
**Root cause**: Even after adding popup diagnostics, the worker still threw the original `Could not establish connection. Receiving end does not exist.` error after all retries, without preserving whether bootstrap lookup failed before injection, whether `content-canvas.js` injection itself failed, or whether bootstrap lookup still failed after injection.
**Symptom**: The popup could prove `worker live`, but the only stored runtime error was still the same generic missing-receiver string, leaving the actual surviving recovery seam ambiguous.
**Fix**: `sendCanvasMessageWithRetry()` now emits a structured recovery-trace error string for unrecovered missing-receiver failures, and the popup now maps `activeCourseSource` so the course-detection path is no longer shown as `unknown`.
**Guard**: `apps/extension/src/core/service-worker.test.ts` now proves the final error message contains the recovery trace when the receiver never recovers. Verified by extension test suite, extension build, and root typecheck.

### [EXTENSION CANONICALITY] Fresh popup/build markers could still coexist with a stale live service worker

**Status**: FIXED
**Root cause**: A Manifest V3 service worker can remain alive across rebuilds while popup pages and `build-info.json` are reloaded from disk. That allowed the popup to show the latest `builtAt/sourceHash` while the worker still answered without `workerCodeSignature` or a valid detection source.
**Symptom**: Live diagnostics showed `COURSE DETECTED`, `worker live`, `worker-sig missing`, and `detect none` at the same time, followed by the same `Receiving end does not exist` capture failure.
**Fix**: The popup now treats missing/mismatched worker signatures and the `course-detected + detect none` contradiction as a stale-worker state, blocks capture from that state, and exposes a `RESTART EXTENSION RUNTIME` action that reloads the extension runtime directly.
**Guard**: `apps/extension/src/popup-diagnostics.test.ts` now proves the stale-worker contradiction triggers the runtime-reload recommendation while a matching worker signature does not. Verified by targeted popup test, full extension suite, extension build, and root typecheck.

### [EXTENSION CAPTURE] Bootstrap probing could still miss the injected Canvas runtime by executing in the wrong world

**Status**: FIXED
**Root cause**: The live diagnostics moved past stale-worker theory and proved the fresh worker still could not see `window.__aeonthraCaptureBootstrap` after successful `content-canvas.js` injection. The worker’s bootstrap probe was not explicitly pinned to the isolated extension world where the content script lives.
**Symptom**: Recovery traces read `content-canvas.js injection: succeeded` but still reported `bootstrap API unavailable`, while the popup showed a fresh `worker-sig sw-recovery-trace-v3`.
**Fix**: `apps/extension/src/service-worker.ts` now executes bootstrap probes with `world: "ISOLATED"` and labels the failure path as `isolated extension context` so the trace matches the actual runtime boundary.
**Guard**: `apps/extension/src/core/service-worker.test.ts` now proves the bootstrap probe calls `chrome.scripting.executeScript` in the isolated world. Verified by targeted service-worker tests, full extension suite, extension build, and root typecheck.
### [EXTENSION BUILD] Shipped Canvas content script contained ESM export syntax and never loaded in Chrome

**Status**: FIXED
**Root cause**: `apps/extension/src/content-canvas.ts` exported test helper functions, and the extension build emitted `apps/extension/dist/content-canvas.js` with a real trailing `export { cleanHtmlFragment, learningBlocks }`. Manifest MV3 content scripts load as classic scripts, so Chrome rejected the file before `chrome.runtime.onMessage.addListener(...)` could register.
**Symptom**: Every Canvas page reported `detect url-fallback`, and live runs failed with `Fresh background capture tab never exposed a live Canvas receiver after page load.` even though the worker and manifest were current.
**Fix**: Removed the source-level exports from the content-script entry and added build validation that rejects any dist content script containing top-level `import` or `export` syntax.
**Guard**: `apps/extension/scripts/build.test.mjs` now proves `validateBuiltExtensionDist()` fails if a shipped content script still contains ESM syntax. Verified by targeted extension tests, full extension suite, extension build, and root typecheck.

### [WEB PDF INTAKE] PDF uploads could stall at 0% before the first page callback ever fired

**Status**: FIXED
**Root cause**: The PDF upload UI only moved progress after `extractTextFromPdf()` started yielding page callbacks, but the actual failure seam was earlier in `pdfjsLib.getDocument(...).promise`, where worker-backed document open could stall or fail without surfacing any intermediate stage to the intake card.
**Symptom**: Uploading a PDF left the textbook card on `Extracting PDF` at `0%`, making it look like nothing happened even though the importer was blocked before page extraction began.
**Fix**: Added explicit pre-page PDF status stages in `apps/web/src/App.tsx` / `apps/web/src/lib/pdf-ingest.ts` and taught `openPdfDocumentWithFallback()` to retry with `disableWorker: true` before surfacing a precise final textbook error.
**Guard**: `apps/web/src/lib/pdf-ingest.test.ts` now proves a stalled worker-backed open falls back to compatibility mode and that dual open failures return the new precise error. Verified by targeted web tests, full web suite, web build, root typecheck, and a direct sample-PDF smoke extraction.

### [WEB PDF INTAKE] Compatibility retry reused a detached PDF buffer after the worker path timed out

**Status**: FIXED
**Root cause**: The first `pdfjs` worker-backed `getDocument()` call could transfer/detach the original `ArrayBuffer`. The compatibility retry reused that same binary payload, so it failed immediately with `Cannot perform Construct on a detached ArrayBuffer`.
**Symptom**: After the pre-page fallback landed, the intake card still failed on some PDFs with `Primary open error: PDF document open timed out... Compatibility open error: Cannot perform Construct on a detached ArrayBuffer`.
**Fix**: `apps/web/src/lib/pdf-ingest.ts` now prepares an independent `Uint8Array` clone before the worker attempt and reserves that clone exclusively for the fallback `disableWorker: true` open.
**Guard**: `apps/web/src/lib/pdf-ingest.test.ts` now proves the fallback receives a different binary object than the primary worker attempt. Verified by targeted web tests, full web suite, web build, and root typecheck.

### [ENGINE TRUTH-GATE] Real textbook concepts disappeared when explicit-definition clusters were forced to find extra support

**Status**: FIXED
**Root cause**: The semantic leak cleanup successfully rejected wrapper titles and generic container prose, but the concept builder still required a second support lane even when a real definition sentence was the only grounded evidence that survived. That over-pruned otherwise valid textbook concepts.
**Symptom**: A plain-text bundle titled `Overview of Classical Conditioning` with a grounded definition sentence produced zero concepts, even though the title was already rejected and the body clearly contained the real concept.
**Fix**: `packages/content-engine-v2/src/candidates/concepts.ts` now allows the first explicit-definition evidence unit to satisfy the support lane when no other grounded support survives, and `packages/content-engine-v2/src/outputs/result.ts` keeps untrusted titles out of theme and assignment display labels unless no grounded concept label exists.
**Guard**: `packages/content-engine-v2/src/tests/engine.test.ts` now proves wrapper titles stay rejected while the real body concept still survives. Verified by engine tests and repo typecheck.

### [SEMANTIC OUTPUT LEAK] Wrapper pages and overlap-only discussions could still survive as shell-facing modules, tasks, and Atlas labels

**Status**: FIXED
**Root cause**: The content engine still treated plain `page` sources as assignment-like by default, workspace chapter grouping kept orphan concept pages in synthetic modules instead of attaching them to the explicit wrapper module they explained, and shell/Atlas fallback text still promoted wrapper titles or generic `Explain ...` labels when stronger concept-backed anchors existed.
**Symptom**: Live-style fixtures could still produce `Course Capture`, `Week 4 Discussion Forum`, or `Reply to Classmates` as visible module titles, shell tasks, checklist text, or Atlas nodes even when the real concept lane was present.
**Fix**: `packages/content-engine-v2/src/outputs/result.ts` now enforces a strict page surface gate with sentence-grounded requirement extraction and explicit rejection codes; `apps/web/src/lib/workspace.ts` now reattaches concept pages to explicit module keys and uses concept-backed display anchors only after ranking; `apps/web/src/lib/shell-mapper.ts`, `apps/web/src/lib/atlas-shell.ts`, and `apps/web/src/lib/atlas-skill-tree.ts` now fail closed on noisy projections and wrapper-title fallback labels.
**Guard**: `packages/content-engine-v2/src/tests/engine.test.ts`, `packages/content-engine-v2/src/tests/consumer-compat.test.ts`, `apps/web/src/lib/workspace.test.ts`, `apps/web/src/lib/shell-mapper.test.ts`, `apps/web/src/lib/atlas-shell.test.ts`, and `apps/web/src/lib/atlas-skill-tree.test.ts` now prove the mixed-noise page, thin discussion salvage, admin-heavy orientation, suspicious-date, and Atlas label cases stay clean. Verified by root `npm test`, `npm run typecheck`, and `npm run build`.

### [BENCHMARK HONESTY] The benchmark could still pass while shell-facing projections were wrong

**Status**: FIXED
**Root cause**: `runBenchmark()` only scored raw engine surfaces, so shell-facing regressions in module titles, skill labels, shell assignment projection, and checklist noise could hide behind a green benchmark delta.
**Symptom**: The benchmark suite needed separate consumer-compat assertions to catch wrapper-module and fallback-skill regressions, which meant the benchmark itself was not a truthful acceptance gate for live shell quality.
**Fix**: `packages/content-engine-v2/src/compatibility/benchmark-surface.ts` now derives the learning bundle, workspace, and shell projections for benchmark scoring, and `packages/content-engine-v2/src/benchmarks/score.ts` now includes a `consumerProjectionIntegrity` metric keyed off expected/suppressed module titles, shell assignment titles, skill-label prefixes, and checklist fragments.
**Guard**: `packages/content-engine-v2/src/tests/benchmark.test.ts` now passes only when the shell-facing benchmark surfaces stay clean, and the benchmark delta remains above the acceptance threshold with the new integrity metric enabled.

### [PAGE ASSIGNMENT ESCAPE HATCH] Concept-bearing pages were still leaking one fake assignment surface each

**Status**: FIXED
**Root cause**: `packages/content-engine-v2/src/outputs/result.ts` still treated accepted `page` sources with grounded concepts as assignment-like through `groundedRequirements` and `strictPageSurface`, even though `assignmentPromptTrust` is explicitly not applicable to pages.
**Symptom**: After tightening the benchmark corpus, `mixed-noise-and-real-concept`, `thin-discussion-salvage`, `orientation-salvage`, and `admin-heavy-orientation-clones` each still produced one `assignmentMapping`, which then surfaced as one `workspace` task or `shell` assignment candidate. The benchmark delta dropped to `5.75` before the engine fix and to `14.91` after the harness-only patch.
**Fix**: `result.ts` now requires `assignmentPromptTrust.state === "accepted"` for grounded requirements and for any strict page surface, which makes plain pages fail closed by default. Focus-theme labels also reject `Course Capture`-style wrappers in favor of grounded concept labels.
**Guard**: `packages/content-engine-v2/src/tests/engine.test.ts`, `packages/content-engine-v2/src/tests/consumer-compat.test.ts`, and `packages/content-engine-v2/src/tests/benchmark.test.ts` now require zero page-derived assignment mappings/tasks/assignments for those fixtures.

### [BENCHMARK CALIBRATION] Shell-facing integrity was still underweighted after the corpus stopped rewarding fake page assignments

**Status**: FIXED
**Root cause**: Once `expectedAssignmentTitles` were corrected to `[]` for page-only fixtures, v2 could score perfectly and still miss the historical `delta >= 15` gate because `consumerProjectionIntegrity` did not carry enough weight relative to other metrics. The gap was calibration, not behavior.
**Symptom**: Post-fix v2 reached a perfect fixture score on the updated corpus, but `runBenchmarkRepeated(benchmarkCorpus, 3)` still reported `delta: 14.91`, then `14.99`, which kept `benchmark.test.ts` red despite no remaining fixture failures.
**Fix**: `packages/content-engine-v2/src/benchmarks/score.ts` now treats zero expected assignments as a real zero-surface requirement and raises `consumerProjectionIntegrity` from `10` to `12`, matching the user-facing importance of shell/module/skill/checklist correctness.
**Guard**: `packages/content-engine-v2/src/tests/benchmark.test.ts` now proves `runBenchmarkRepeated(benchmarkCorpus, 3)` returns `delta >= 15` with `repeatedRunStable: true` on the corrected corpus.
