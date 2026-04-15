# IMPLEMENTATION LEDGER

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

- Capture highlight or visible page in SENTINEL.
- Queue bundle and open/focus ATLAS with `Done Learning`.
- Import queued pack automatically when the bridge is available.
- Fall back to JSON export/import when the bridge is unavailable.
- Generate the full deterministic study protocol entirely in-browser.
