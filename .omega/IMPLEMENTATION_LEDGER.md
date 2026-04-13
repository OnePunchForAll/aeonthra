# IMPLEMENTATION LEDGER

## 2026-04-13

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
