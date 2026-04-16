# ERROR LEDGER

## 2026-04-16

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

### [WEB] Unsolicited bridge packs could overwrite the current workspace

**Status**: FIXED
**Root cause**: `App.tsx` accepted any schema-valid `NF_PACK_READY` bridge message, even when no import request was active in the current session.
**Symptom**: a stale or unsolicited extension handoff could replace the active Canvas workspace without the user explicitly requesting an import.
**Fix**: introduced request-scoped bridge message resolution so `NF_PACK_READY` is ignored unless the request mode is `auto` or `manual`, and import-result handling now clears request state deterministically.
**Guard**: `apps/web/src/App.test.ts` and `apps/web/src/lib/bridge.test.ts`.

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
**Fix**: added storage helpers to clear notes and all progress scopes, wired Reset Workspace through them, and changed offline bundle creation to stamp `exportedAt` with the current time. Expanded storage regression coverage to lock the reset contract.
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

## 2026-04-09

### Missing direct handoff between extension and app

- Symptom: the extension could export JSON and open the workspace, but it could not transfer a queued capture bundle in one flow.
- Root cause: no typed bridge protocol existed between the content script and the page, and the background worker had no pending-pack queue.
- Fix: added validated bridge messages, pending bundle storage, content-script relay logic, and a `Done Learning` action that opens the workspace and triggers import.

### Unvalidated persisted bundles

- Symptom: local storage reads in the web app trusted raw JSON without schema validation.
- Root cause: storage helpers cast parsed JSON directly to `CaptureBundle`.
- Fix: switched storage reads to `CaptureBundleSchema.safeParse(...)` so bad payloads degrade to a clean empty state instead of poisoning the workspace.
