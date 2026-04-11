# OMEGA FORGE — MONOLITHIC ONE-PASS CODEX MASTER BUILD SPEC

## Truth boundary

This file is intentionally maximal. It is designed to be the **single document** you hand to Codex so Codex can build the entire system in one sustained run.

This file does **not** assume magical capabilities. Codex can iterate, test, review, refactor, generate helper artifacts, and repair failures during a run. It can also create repository-local instructions and skills for future reuse. It cannot literally retrain or rewrite its own base model weights in the middle of the task. Therefore this specification simulates “learning from itself” through deterministic memory, error ledgers, selector confidence maps, alias libraries, revision logs, regression fixtures, and repo-local skill bundles.

The objective is to get as close as possible to a **single-pass, self-scaffolding, self-testing, self-repairing software build** without lying about what the tool can do.

---

## 0. Mission lock

Build an end-to-end, production-quality, local-first system that does all of the following in one repository:

1. Captures student-visible Canvas course content through a Manifest V3 browser extension as the student navigates.
2. Supports manual import of textbook PDF and TXT files.
3. Transfers the captured/imported content into a static GitHub Pages web application.
4. Converts that content into deterministic, high-quality learning modules aligned to instructor emphasis.
5. Runs the full learning experience with no runtime API calls and no backend.
6. Stores progress, mastery, calibration, revision memory, selector memory, and user corrections locally.
7. Exports/imports all significant data as JSON.
8. Ships with tests, fixtures, seeded sample content, diagnostic tooling, and a polished UI.

This is not a toy. Build it as if it will be used repeatedly, inspected by technical judges, and maintained over time.

---

## 1. Non-negotiable constraints

- No paid runtime APIs.
- No LLM calls.
- No hidden network dependencies after initial page load.
- No server or database backend.
- Static hosting only for the web app.
- Browser extension may read only pages the student actually visits or chooses to import.
- All semantic generation, ranking, pairing, drills, traps, calibration, and learning analytics must be deterministic.
- All “adaptive” behavior must come from deterministic local memory and update rules.
- The system must remain useful even if Canvas DOM structure varies moderately.
- The system must degrade gracefully when text quality is poor.
- The system must be buildable in one repository by Codex without requiring additional prose from the user.

---

## 2. Product identity

Use this internal unified product naming system throughout the codebase:

- **Product umbrella:** OMEGA FORGE
- **Extension codename:** SENTINEL
- **Static app codename:** ATLAS
- **Deterministic ingestion / normalization engine:** SMELT
- **Instructor-focus alignment engine:** ALIGN
- **Concept graph engine:** LATTICE
- **Learning artifact synthesis engine:** KILN
- **Retention and revisit engine:** ECHO
- **Deterministic adaptive memory engine:** EMBER
- **Build-time self-repair / QA loop:** REFORGE
- **Unified exported course/chapter artifact format:** FOUNDRY JSON

These names are not cosmetic. Use them as package/module boundaries and in docs.

---

## 3. What Codex must do in one run

Codex should treat this as a long-horizon engineering task and complete as much of the following as possible in one run, in this order:

1. Scaffold the repository.
2. Create root instructions and reusable repo-local skills.
3. Create shared schemas and config types.
4. Implement extension capture and handoff.
5. Implement import pipeline for PDF/TXT.
6. Implement deterministic semantic engines.
7. Implement runtime UI for all learning phases.
8. Implement persistence, export/import, and diagnostics.
9. Implement tests and golden fixtures.
10. Run checks, inspect failures, patch defects, and rerun until acceptance criteria are met or only clearly documented hard blockers remain.
11. Produce a final engineering summary, known limits, and next-highest-leverage follow-ups.

Do not stop at scaffolding. Do not stop at partial UI. Do not stop at data types. Drive toward a working integrated vertical slice.

---

## 4. One-pass Codex operating doctrine

### 4.1 Codex role

Codex must behave as all of the following simultaneously:

- systems architect
- staff frontend engineer
- extension engineer
- deterministic algorithm designer
- test engineer
- QA lead
- documentation author
- adversarial reviewer
- refactoring specialist

### 4.2 Default behavior

- Do not ask clarifying questions unless there is a catastrophic ambiguity that would otherwise make the repository nonfunctional.
- Prefer concrete implementation over abstract notes.
- Keep a running implementation ledger inside the repo.
- After each major subsystem, run tests or targeted validation.
- When a test fails, diagnose root cause, patch it, add or improve tests, and rerun.
- Prefer deterministic utilities over clever brittle heuristics.
- Prefer transparent scoring formulas over opaque magic numbers.
- Prefer small pure functions for text transforms.
- Prefer fixtures and golden snapshots for extraction/regression.
- Prefer typed data contracts everywhere.

### 4.3 Internal working files Codex must create immediately

At the beginning of the run, create these files:

- `AGENTS.md`
- `.omega/IMPLEMENTATION_LEDGER.md`
- `.omega/ERROR_LEDGER.md`
- `.omega/DECISIONS.md`
- `.omega/TODO_NOW.md`
- `.omega/DIAGNOSTIC_PROTOCOL.md`
- `.agents/skills/` directory with the skills defined below

These are not optional. They are part of the architecture.

### 4.4 How “learning from itself” must be implemented honestly

The system and the build process may become better during the run or across future runs, but only through these mechanisms:

- writing new repo-local skill bundles
- refining code after test failures
- updating heuristic priority tables
- building selector-confidence ledgers
- recording successful parsing patterns
- recording user-approved concept merges/aliases
- recording user confusion patterns
- storing regression fixtures and golden outputs
- using prior local artifacts as future reference

The system must never falsely claim model retraining.

---

## 5. Repo-local skills Codex must create

Create these repo-local skills as directories under `.agents/skills/`. Each skill must contain a valid `SKILL.md` with YAML front matter and clear instructions. Add supporting scripts and references when useful.

### 5.1 `canvas-dom-recon`
Purpose: reverse engineer Canvas page structures from visited DOM snapshots and keep selectors resilient.

Must cover:
- how to classify Canvas page types
- how to stabilize DOM reads
- how to prefer semantic selectors over brittle class chains
- how to record selector success/failure rates
- how to create fixture snapshots from live pages
- how to update fallback selector maps safely

### 5.2 `pdf-text-forensics`
Purpose: extract text deterministically from PDF with layout-aware cleanup.

Must cover:
- page extraction
- line merge rules
- hyphenation repair
- header/footer suppression
- repeated margin artifact suppression
- confidence scoring for extraction quality
- fallback if text layer is weak

### 5.3 `deterministic-semantic-forge`
Purpose: generate concepts, relations, pairings, drills, traps, and modules from text with no AI.

Must cover:
- concept extraction methods
- salience ranking
- instructor-focus alignment
- confusion pair mining
- drill and trap generation rules
- provenance logging

### 5.4 `reforge-qa`
Purpose: drive the build-time repair loop.

Must cover:
- when to run unit tests
- when to run integration tests
- how to inspect failures
- how to write a root-cause note
- how to add regression tests before or with the fix
- rerun order

### 5.5 `ui-systems-polish`
Purpose: keep the UI coherent and accessible.

Must cover:
- typography scale
- card system
- focus states
- high-contrast mode
- reduced-motion mode
- keyboard navigation
- responsive layout priorities

### 5.6 `fixture-golden-tests`
Purpose: maintain fixture-based regression testing for deterministic outputs.

Must cover:
- how to store fixtures
- how to normalize nondeterministic values
- how to update snapshots only intentionally
- how to compare generator outputs across revisions

### 5.7 `ember-memory`
Purpose: maintain deterministic adaptive memory.

Must cover:
- selector memory
- alias memory
- confusion memory
- retention profile memory
- instructor phrase memory
- how user corrections update local models

### 5.8 Important honesty rule for skill creation

Create these skills early. Do not assume Codex will magically reload them into its current instruction context after writing them. Instead, after writing them, explicitly consult them as ordinary repo files for the remainder of the run, and preserve them so future runs can load them natively.

---

## 6. Root AGENTS.md that Codex must create

Codex must write a root `AGENTS.md` that encodes the following operating policy:

1. This repo is deterministic and offline-first.
2. Never add runtime API calls or analytics beacons.
3. Always run relevant tests before concluding a task.
4. Keep all text transforms provenance-visible where practical.
5. Never silently change schemas.
6. When uncertain between cleverness and transparency, choose transparency.
7. Build extension first enough to capture data, but do not postpone the semantic engine.
8. Keep fixture coverage high for Canvas pages and textbook inputs.
9. Preserve accessibility and keyboard operability.
10. Never ship broken GitHub Pages paths.
11. Keep dependencies minimal and justified.
12. Record important design decisions in `.omega/DECISIONS.md`.
13. Record each nontrivial defect and fix in `.omega/ERROR_LEDGER.md`.

Codex should then follow that file for the rest of the run.

---

## 7. High-level repository architecture

Use a monorepo with shared packages.

```text
omega-forge/
  AGENTS.md
  README.md
  package.json
  pnpm-workspace.yaml
  tsconfig.base.json
  .gitignore
  .omega/
    IMPLEMENTATION_LEDGER.md
    ERROR_LEDGER.md
    DECISIONS.md
    TODO_NOW.md
    DIAGNOSTIC_PROTOCOL.md
  .agents/
    skills/
      canvas-dom-recon/
      pdf-text-forensics/
      deterministic-semantic-forge/
      reforge-qa/
      ui-systems-polish/
      fixture-golden-tests/
      ember-memory/
  apps/
    atlas-web/
      public/
      src/
      tests/
      vite.config.ts
      package.json
    sentinel-extension/
      public/
      src/
      tests/
      manifest.config.ts
      package.json
  packages/
    foundry-schema/
    smelt/
    align/
    lattice/
    kiln/
    echo/
    ember/
    ui-core/
    dictionaries/
    fixtures/
    test-utils/
  docs/
    architecture/
    diagnostics/
    user-guides/
  scripts/
    build-all.ts
    test-all.ts
    generate-fixtures.ts
    verify-golden.ts
```

Use `pnpm` unless a specific blocker forces otherwise.

---

## 8. Technology stack

### Web app
- React
- TypeScript
- Vite
- React Router
- IndexedDB wrapper (`idb` or equivalent tiny wrapper)
- CSS Modules or a clean tokenized CSS architecture; no CSS-in-JS dependency unless extremely justified

### Extension
- Manifest V3
- TypeScript
- Vite or equivalent extension-friendly bundling
- service worker background
- content scripts
- popup UI
- options page if useful
- storage.local for small state and session metadata

### Testing
- Vitest for unit tests
- React Testing Library for component tests
- Playwright for key flows if feasible
- fixture/golden tests for deterministic engines

### PDF
- `pdfjs-dist` for text extraction in-browser

### Utilities
- keep dependencies sparse
- bundle small local dictionaries if needed for synonym/rhyme/frequency support
- do not add large NLP libraries unless their deterministic value materially exceeds cost

---

## 9. Runtime deployment model

### 9.1 Static app
Deploy `apps/atlas-web` to GitHub Pages.

### 9.2 Extension
Build `apps/sentinel-extension` as unpacked Chrome/Edge extension.

### 9.3 No backend
There is no backend. Everything after initial asset load runs client-side.

### 9.4 Data handoff
Primary method:
- extension collects visited Canvas content
- student clicks **Done Learning**
- extension opens/focuses the static app
- extension sends serialized FOUNDRY JSON through a safe page bridge
- static app imports it, validates it, persists it, and synthesizes learning artifacts

Fallback:
- export FOUNDRY JSON to disk
- manually import into static app

---

## 10. Variable registry

Implement all config through typed config objects rather than magic literals.

### 10.1 Branding
- `PRODUCT_NAME = "OMEGA FORGE"`
- `WEB_APP_NAME = "ATLAS"`
- `EXTENSION_NAME = "SENTINEL"`
- `FOUNDRY_FORMAT_VERSION = "1.0.0"`

### 10.2 Extension behavior
- `CANVAS_HOST_PATTERNS: string[]`
- `CAPTURE_ON_NAVIGATION: boolean = true`
- `CAPTURE_DEBOUNCE_MS: number = 900`
- `DOM_STABLE_MUTATION_IDLE_MS: number = 700`
- `MAX_CAPTURED_PAGES_PER_SESSION: number = 500`
- `MAX_HTML_CHARS_PER_ITEM: number = 250000`
- `SELECTOR_CONFIDENCE_DECAY: number = 0.92`
- `UNMATCHED_BLOCK_LOG_LIMIT: number = 200`

### 10.3 Import behavior
- `MAX_TXT_IMPORT_BYTES`
- `MAX_PDF_PAGES`
- `PDF_HEADER_REPEAT_THRESHOLD`
- `PDF_FOOTER_REPEAT_THRESHOLD`
- `PDF_HYPHEN_REPAIR_ENABLED`
- `PDF_LINE_JOIN_MAX_GAP`
- `OCR_DISABLED = true` (unless explicitly added later; do not use by default)

### 10.4 Semantic engine
- `TARGET_CONCEPT_MIN = 12`
- `TARGET_CONCEPT_MAX = 18`
- `MIN_TERM_FREQ = 3`
- `TFIDF_TOP_PERCENTILE = 0.95`
- `KEYWORD_OVERLAP_REL_THRESHOLD = 0.2`
- `RELATED_CONCEPT_THRESHOLD = 0.3`
- `CONTRAST_SIGNAL_WEIGHT`
- `EXPLICIT_DEFINITION_WEIGHT`
- `BOLD_TERM_WEIGHT`
- `TFIDF_WEIGHT`
- `FRAMEWORK_PATTERN_WEIGHT`
- `INSTRUCTOR_ALIGNMENT_WEIGHT`
- `CONCEPT_PRESSURE_HIGH_THRESHOLD`
- `TRAP_COUNT_PER_CHAPTER_MIN`
- `DOMAIN_TRANSFER_COUNT = 3`
- `DILEMMA_COUNT = 3`

### 10.5 Runtime learning
- `PHASE_MINUTES = 20`
- `STRICT_TIMER_DEFAULT = false`
- `CALIBRATION_OVERCONFIDENCE_THRESHOLD = 4`
- `CALIBRATION_UNDERCONFIDENCE_THRESHOLD = 2`
- `MASTERY_GREEN_MIN = 2`
- `MASTERY_YELLOW_MIN = 0`

### 10.6 EMBER adaptive memory
- `SELECTOR_MEMORY_ENABLED = true`
- `ALIAS_MEMORY_ENABLED = true`
- `CONFUSION_MEMORY_ENABLED = true`
- `RETENTION_PROFILE_ENABLED = true`
- `USER_CORRECTION_WEIGHT`
- `SELECTOR_SUCCESS_BONUS`
- `SELECTOR_FAILURE_PENALTY`
- `CONFUSION_BOOST_ON_MISS`
- `RETENTION_INTERVAL_MULTIPLIERS`

### 10.7 Diagnostics
- `ENABLE_PROVENANCE_VIEW = true`
- `ENABLE_DEBUG_PANELS = true` in development
- `MAX_ERROR_LEDGER_ITEMS`
- `MAX_DIAGNOSTIC_EXPORT_BYTES`

---

## 11. Foundry data contracts

Codex must define and use shared TypeScript interfaces in `packages/foundry-schema`.

### 11.1 Raw capture layer

```ts
export interface CaptureSession {
  id: string;
  createdAt: number;
  updatedAt: number;
  source: "canvas-extension" | "manual-import";
  sourceMeta: SourceMeta;
  course: CourseMeta | null;
  items: CapturedItem[];
  diagnostics: CaptureDiagnostic[];
}

export interface SourceMeta {
  canvasBaseUrl?: string;
  captureVersion: string;
  extensionVersion?: string;
  importFilename?: string;
  importType?: "pdf" | "txt" | "json";
}

export interface CourseMeta {
  id?: string;
  title: string;
  code?: string;
  term?: string;
  instructorNames?: string[];
}

export interface CapturedItem {
  id: string;
  kind:
    | "course-home"
    | "module"
    | "page"
    | "assignment"
    | "discussion"
    | "announcement"
    | "syllabus"
    | "resource-link"
    | "external-resource"
    | "textbook-chapter"
    | "manual-note";
  url?: string;
  title: string;
  moduleTitle?: string;
  dueAt?: string | null;
  sourceHtml?: string | null;
  plainText: string;
  headings: string[];
  links: CapturedLink[];
  hashes: ContentHashes;
  provenance: ProvenanceEntry[];
  diagnostics?: ItemDiagnostic[];
}

export interface CapturedLink {
  id: string;
  title: string;
  url: string;
  linkType: "internal" | "external" | "file" | "media" | "unknown";
  visited?: boolean;
}

export interface ContentHashes {
  textSha256: string;
  structureHash: string;
}
```

### 11.2 Structured text layer

```ts
export interface Section {
  id: string;
  title: string;
  level: 1 | 2 | 3 | 4 | 5 | 6 | 0;
  text: string;
  wordCount: number;
  startIndex: number;
  endIndex: number;
  sourceItemIds: string[];
}
```

### 11.3 Concept layer

```ts
export interface Concept {
  id: string;
  name: string;
  aliases: string[];
  category: string;
  core: string;
  detail: string;
  primer: string;
  mnemonic: string;
  keywords: string[];
  relatedConceptIds: string[];
  oppositeConceptIds: string[];
  instructorAlignment: number;
  salience: number;
  pressureScore: number;
  boundaryNotes: BoundaryNote[];
  provenance: ProvenanceEntry[];
}

export interface BoundaryNote {
  id: string;
  note: string;
  trigger: string;
  contrastConceptIds: string[];
}
```

### 11.4 Relationship layer

```ts
export interface Relationship {
  id: string;
  fromId: string;
  toId: string;
  type:
    | "overlap"
    | "cooccurrence"
    | "contrast"
    | "builds-on"
    | "prerequisite"
    | "objection"
    | "applies-with";
  label: string;
  strength: number;
  provenance: ProvenanceEntry[];
}
```

### 11.5 Learning artifact layer

```ts
export interface Dilemma { /* defined fully in code */ }
export interface TrueFalse { /* defined fully in code */ }
export interface MultipleChoice { /* defined fully in code */ }
export interface Corruption { /* defined fully in code */ }
export interface CrossExam { /* defined fully in code */ }
export interface TransferScenario { /* defined fully in code */ }
export interface TeachBackPrompt { /* defined fully in code */ }
```

### 11.6 Chapter bundle layer

```ts
export interface ChapterData {
  id: string;
  title: string;
  sourceWordCount: number;
  generatedAt: number;
  concepts: Concept[];
  relationships: Relationship[];
  dilemmas: Dilemma[];
  rapidFire: TrueFalse[];
  deepDrill: MultipleChoice[];
  corruptions: Corruption[];
  crossExam: CrossExam[];
  domainTransfer: TransferScenario[];
  teachBack: TeachBackPrompt[];
  bossFight: MultipleChoice[];
  sectionMap: Section[];
  diagnostics: GenerationDiagnostic[];
}
```

### 11.7 Adaptive memory layer

```ts
export interface EmberMemory {
  selectorMemory: SelectorMemoryStore;
  aliasMemory: AliasMemoryStore;
  confusionMemory: ConfusionMemoryStore;
  retentionMemory: RetentionMemoryStore;
  instructorPhraseMemory: InstructorPhraseMemoryStore;
  userCorrectionLog: UserCorrectionEntry[];
}
```

Define every subordinate type in code with strong typing and comments.

---

## 12. Unified subsystem architecture

### 12.1 SENTINEL (extension)
Responsibilities:
- detect route changes
- stabilize DOM
- classify page kind
- extract visible content deterministically
- dedupe visited content
- store capture session
- expose progress in popup
- export FOUNDRY JSON
- perform one-click handoff to ATLAS
- log selector success/failure for EMBER

### 12.2 ATLAS (static app)
Responsibilities:
- import handoff payloads / files
- validate FOUNDRY schema
- persist datasets
- run all deterministic synthesis
- render learning phases
- persist user progress and corrections
- expose diagnostics, provenance, mastery, calibration, and review views
- export final mastery reports and foundry bundles

### 12.3 SMELT
Responsibilities:
- normalize HTML/plaintext/PDF text
- preserve structural markers
- suppress repeated junk
- fix common broken line wraps and hyphenation
- segment into sections with confidence scores

### 12.4 ALIGN
Responsibilities:
- detect instructor emphasis from assignments, discussions, rubrics, prompts, and repeated teacher language
- score concepts and sections against instructor focus
- produce an Instructor Focus Profile

### 12.5 LATTICE
Responsibilities:
- extract concept candidates
- merge aliases
- rank salience
- classify concept type
- extract relationships and contrasts
- produce concept graph

### 12.6 KILN
Responsibilities:
- synthesize all learning artifacts
- create question sets and traps
- create transfer scenarios
- create teach-back prompts
- create dilemmas
- create runtime-ready chapter bundles

### 12.7 ECHO
Responsibilities:
- sequence revisits within and across study sessions
- create retention reminders
- adjust revisit order from performance

### 12.8 EMBER
Responsibilities:
- store local deterministic memory
- update selector priority from observed success
- store user-approved aliases and pairings
- track confusion pairs from wrong answers
- calibrate revisit intervals
- improve future deterministic outputs without APIs

### 12.9 REFORGE
Responsibilities:
- build-time self-review
- diff review
- regression test enforcement
- failure diagnosis
- issue-specific patching
- final quality gate

---

## 13. SENTINEL detailed architecture

### 13.1 Manifest permissions
Keep permissions narrow.

Required:
- Canvas host patterns
- GitHub Pages host for handoff page bridge
- storage
- tabs / activeTab if needed
- scripting only if justified

### 13.2 Route detection
Implement both:
- URL observation
- DOM mutation stabilization

Canvas may navigate partially or fully. Use:
- interval or event-based location checks
- MutationObserver
- delayed capture after mutation quiet period

### 13.3 Page-type detection
Create deterministic classifiers using URL + DOM cues:
- course home
- modules index
- page
- assignment
- discussion
- syllabus
- announcement
- quiz-like page if visible (capture text only; no answer automation)

### 13.4 Extraction strategy
For each page type:
1. pick title selector candidates
2. pick main content container candidates
3. extract text preserving heading order, lists, callouts, tables as plain structured text where possible
4. harvest links with context
5. hash content
6. compare against previous capture
7. if materially new, save/update item

### 13.5 Selector priority system
Each selector entry must have:
- selector string
- page type
- success count
- failure count
- lastSuccessAt
- confidenceScore

When extraction succeeds, boost confidence.
When extraction fails, penalize.
When a selector falls below threshold, demote it but keep it for diagnostics.
This is deterministic adaptation, not AI.

### 13.6 DOM diagnostics
If extraction partially fails:
- record top unmatched content blocks
- log candidate semantic containers
- allow debug export in dev mode
- never crash the session

### 13.7 Popup requirements
Popup shows:
- current course title
- items captured
- last capture status
- current page type
- toggle capture on/off
- buttons:
  - Capture Now
  - Done Learning
  - Export JSON
  - Reset Session
  - Diagnostics

### 13.8 Done Learning handoff
Flow:
1. compile current session bundle
2. validate minimum viable completeness
3. serialize bundle
4. open/focus ATLAS import route
5. pass payload through content-script/page bridge
6. show success/error state
7. preserve local copy

### 13.9 Extension test coverage
Need tests for:
- page classification
- selector confidence updates
- dedupe logic
- bundle serialization
- bridge message contract

---

## 14. ATLAS detailed architecture

### 14.1 App routes
Use explicit routes:
- `/`
- `/import`
- `/library`
- `/course/:courseId`
- `/chapter/:chapterId`
- `/study/:chapterId/:phase`
- `/mastery/:chapterId`
- `/diagnostics/:chapterId`
- `/settings`

### 14.2 State architecture
Use:
- normalized domain stores
- reducer or store pattern
- serializable state
- hydration from IndexedDB

### 14.3 Core views
- Dashboard / library
- Capture import review
- Chapter generation summary
- Concept map
- Phase runner
- Mastery report
- Diagnostics / provenance
- Settings and memory reset

### 14.4 Import flow
On import:
1. validate schema
2. fingerprint source bundle
3. split into chapter-like units if needed
4. allow user to confirm or rename chapters
5. run synthesis pipeline
6. persist generated artifacts
7. show generation report

### 14.5 Manual PDF/TXT import
Support:
- PDF chapter or whole book
- TXT chapter or notes
- pasted text
- optional pairing to a selected course or module

### 14.6 UX principle
No cold, confusing blank screen.
Every major step must show:
- what was imported
- what was generated
- how confident the system is
- where to inspect source evidence
- what to do next

---

## 15. SMELT — unified deterministic ingestion engine

SMELT must fuse and supersede the earlier normalizer concepts from prior specs.

### 15.1 Inputs
- raw Canvas HTML
- plaintext
- PDF text items from `pdfjs-dist`
- manual paste

### 15.2 Core transforms
1. decode entities
2. normalize whitespace
3. preserve heading markers
4. preserve list markers
5. repair wrapped lines
6. repair split hyphenation cautiously
7. remove repeated headers/footers
8. suppress page numbers / figure noise / copyright noise
9. preserve paragraph boundaries
10. produce both clean plaintext and structured lines

### 15.3 PDF-specific rules
- detect repeated header/footer lines across pages
- remove them when repetition exceeds threshold
- join lines when punctuation and indentation suggest continuity
- preserve bullet and heading breaks
- compute extraction confidence
- if confidence low, mark diagnostics and continue

### 15.4 Section detection
Detection order:
1. explicit heading markers
2. numbered section patterns
3. all-caps / title-like lines
4. topic-shift heuristic using section-level term vector similarity
5. fallback chunking by paragraph bands

### 15.5 Output guarantees
Every ingested text bundle must emit:
- normalized text
- structured lines
- section array
- extraction diagnostics
- confidence score
- provenance map back to source item ids

---

## 16. ALIGN — instructor-focus extraction and pairing

ALIGN is critical because the engine should not just summarize textbook content. It should emphasize what the instructor seems to care about.

### 16.1 Instructor signals to mine
From captured Canvas items:
- assignment verbs
- rubric language
- discussion prompt verbs
- repeated emphasis words
- learning objective phrases
- module intro phrasing
- “be sure to,” “compare,” “distinguish,” “analyze,” “justify,” etc.
- due-date clustering around specific topics

### 16.2 Instructor phrase memory
EMBER must store repeated instructor emphasis phrases across chapters and courses so later chapter generation can weight them deterministically.

### 16.3 Output
Produce an `InstructorFocusProfile` containing:
- top themes
- favored cognitive moves
- high-emphasis terms
- chapter-to-assignment pairings
- section emphasis scores
- concept alignment scores

### 16.4 Pairing model
Each textbook chapter or captured section gets scored against instructor artifacts using:
- term overlap
- phrase overlap
- verb ontology overlap
- shared named entities / concept aliases
- temporal proximity to assignment due dates
- rubric criterion matches
- discussion prompt cue matches

### 16.5 Output usage
This score changes:
- which concepts rise into top 12–18
- which drills get more weight
- which traps get generated
- which transfer scenarios get priority
- which review items appear first

---

## 17. LATTICE — concept graph engine

LATTICE must combine the strongest portions of the TESSERA and Neural Forge concept extractors.

### 17.1 Extraction methods (run all, merge later)
1. explicit definition patterns
2. emphasized term extraction from HTML
3. TF-IDF lite across sections
4. framework / doctrine / principle / theory / dilemma / fallacy / objection pattern matching
5. glossary-style colon patterns
6. repeated contrast structures
7. instructor-emphasis boosted terms
8. title/subtitle noun phrase extraction

### 17.2 Deduplication
Use:
- lowercase normalization
- punctuation stripping
- singular/plural normalization
- basic stemming
- alias memory from EMBER
- containment heuristics
- acronym expansion where obvious

### 17.3 Ranking formula
Rank each concept by weighted sum of:
- explicit definition confidence
- emphasis markup evidence
- tf-idf strength
- section prominence
- repetition across source items
- instructor alignment
- relation centrality
- boundary/contrast richness

### 17.4 Enrichment
For each concept generate:
- canonical name
- aliases
- core definition
- detailed explanation
- primer hint
- mnemonic
- keyword set
- relation links
- contrast links
- pressure score
- boundary of use notes
- provenance snippets

### 17.5 Boundary of use notes
A boundary note answers:
- where this concept applies
- where it stops applying
- what nearby concept students confuse it with
- what signal distinguishes them

### 17.6 Pressure score
Pressure score represents how likely the concept is to produce exam confusion, based on:
- number of similar neighbors
- qualifier density
- contrast structures
- objection density
- user confusion history from EMBER

---

## 18. Deterministic mnemonic generation

Create good-enough memory hooks with templates, not poetry. Keep them short and sticky.

Priority logic:
1. contrast anchor if a strong opposite exists
2. acronym if the name has multiple important words
3. number hook if definition includes cardinality
4. philosopher-persona analogy if person-linked
5. vivid visual scene
6. rhyme if bundled dictionary supports it
7. first-letter chain
8. concise “not X, but Y” distinction hook

Every mnemonic must be stored with provenance label `generated-deterministically`.

---

## 19. BRAID / relationship mapping inside LATTICE

Map relationships using:
- keyword overlap
- co-occurrence
- contrast phrases
- definition references
- objection-response sequences
- same-section proximity
- instructor pairing co-focus

Generate typed edges with strength scores and labels.

---

## 20. KILN — learning artifact synthesis engine

KILN must synthesize all artifacts ahead of runtime so phase execution is UI-only plus scoring/state updates.

### 20.1 Artifact families
- immersive dilemmas
- concept scan cards
- rapid fire true/false
- deep drill multiple choice
- corruption challenges
- cross-exam challenges
- domain transfer scenarios
- teach-back prompts
- boss fight questions
- mastery summary scaffolds

### 20.2 Evidence integrity rule
Whenever possible, artifacts should be backed by source phrases or concept provenance. Store provenance references on each artifact.

### 20.3 Difficulty control
Use explicit difficulty tiers. Difficulty changes:
- how many concepts combine
- whether distractors are near-neighbor or far-neighbor
- how many qualifiers matter
- whether scenario transfer is direct or abstracted

---

## 21. True/False generation

Use and extend the prior deterministic strategies:

### True generation
- simplify concept cores into declarative statements
- remove attribution if not needed
- preserve qualifiers if they are concept-defining

### False generation methods
1. term swap
2. negation insertion/removal
3. attribute swap
4. exaggeration / absolutization
5. category error
6. qualifier deletion
7. temporal reversal
8. objection-as-definition corruption

Each false item must include a precise explanation of the error.

---

## 22. Multiple choice generation

Support at minimum the 12 types defined in prior specs, plus two additional types:

### Type 13 — Boundary of Use
Question asks where a concept applies or fails.
Correct option reflects the boundary note.
Distractors misuse scope.

### Type 14 — Instructor Lens
Question asks which concept or distinction best addresses the instructor’s stated focus for a chapter or assignment.
This directly operationalizes ALIGN.

Boss Fight should include these advanced types more often.

---

## 23. Corruption generator

Generate escalating subtlety:
1. wrong framework
2. reversed relation
3. subtle attribute swap
4. correct fact, wrong implication
5. single qualifier word mutation
6. contrast collapse
7. scope overextension
8. instructor-focus misapplication

Store:
- corrupted statement
- error explanation
- corrected truth
- hint
- corruption method
- target concept ids

---

## 24. Cross-exam generator

Source order:
1. explicit textbook objections
2. textbook limitations
3. contrast-based synthetic objections
4. scope-edge-case challenges
5. instructor-lens challenge

Each cross-exam needs:
- challenge text
- hint
- rebuttal
- involved concept ids
- provenance

---

## 25. Domain transfer generator

Maintain a broad static bank of modern domains and scenario shells.

At least these domains:
- AI ethics
- social media
- medicine
- climate policy
- criminal justice
- economic justice
- education policy
- privacy
- labor / workplace
- biotech
- policing
- public health
- family law
- platform governance
- autonomous vehicles
- corporate whistleblowing
- resource rationing
- disability access
- environmental cleanup
- housing policy

Scenario generation must combine:
- domain template
- concept verbs
- consequence language
- tradeoff language
- instructor emphasis if relevant

---

## 26. Teach-back generator

Select highest-leverage concepts by:
- salience
- centrality
- instructor alignment
- confusion pressure

Prompt types:
- explain to a novice
- correct a misconception
- compare two nearby concepts
- apply to a concrete case
- compress into a 3-sentence rule

Also include keyword evidence checking and a transparent note that keyword presence is only a coarse support check.

---

## 27. Immersive dilemma generator

Generate 3 dilemmas per chapter.

Rules:
- exactly 3 choices
- each maps to a distinct moral/analytical orientation when possible
- no option should feel obviously stupid
- reveal must explain all 3 paths
- if chapter domain is not moral philosophy, adapt to chapter-appropriate framework poles (for example, empirical vs normative vs procedural; rule vs outcome vs character; thesis vs objection vs synthesis)

This broader framework mapping makes the engine more portable beyond ethics chapters.

---

## 28. ECHO — retention and revisit engine

ECHO must operate both within-session and across sessions.

### 28.1 Within-session
- resurface high-pressure concepts later in the same chapter run
- surface blind spots after Boss Fight
- sequence review by mastery deficit and instructor emphasis

### 28.2 Across sessions
- maintain spaced review intervals locally
- update intervals from actual performance and confidence calibration
- bias toward concepts that are both weak and instructor-aligned

### 28.3 Compression ladders
For every concept cluster, generate:
- 1-sentence version
- 3-sentence version
- bullet-list version
- compare/contrast version
- exam-warning version

This supports faster restudy.

---

## 29. EMBER — deterministic adaptive memory engine

This is how the system “learns” locally without APIs.

### 29.1 Selector memory
Store selector outcomes per Canvas page type:
- selector string
- page type
- success/failure counts
- average extracted text length
- last successful DOM signature
- confidence score

Use this to reorder selector attempts on future captures.

### 29.2 Alias memory
When the user merges concepts, renames a concept, or approves an alias, store it locally.
Future concept extraction uses this alias lexicon during dedupe and pairing.

### 29.3 Confusion memory
When the user repeatedly misses questions involving concept pairs, increase the confusion score for that pair.
Future KILN generation should produce more distinction-focused artifacts for that pair.

### 29.4 Retention memory
Track:
- concept performance
- confidence mismatch
- revisit completion
- time to mastery
Use this to tune revisit priority and interval multipliers.

### 29.5 Instructor phrase memory
Cache repeated instructor emphasis phrases and assignment verbs for that course.
Use them to boost alignment on future imports.

### 29.6 User correction log
Store:
- corrected concepts
- corrected pairings
- corrected definitions
- dismissed false relations
- accepted mnemonic overrides

### 29.7 Deterministic adaptation rules
All updates must be explicit formulas, e.g.:

```ts
selector.confidence =
  selector.confidence * SELECTOR_CONFIDENCE_DECAY +
  (success ? SELECTOR_SUCCESS_BONUS : -SELECTOR_FAILURE_PENALTY);
```

and

```ts
confusionPair.score += CONFUSION_BOOST_ON_MISS;
```

No hidden heuristics.

### 29.8 Memory controls
User must be able to:
- inspect memory
- reset memory by course
- reset global memory
- export memory
- import memory

---

## 30. Runtime phase architecture

Implement the five learning phases, with the richest behaviors from previous specs.

### Phase 1 — Genesis
- immersive dilemmas
- concept scan
- natural framework map / intuitive profile

### Phase 2 — Forge
- rapid fire
- deep drill with Learn First
- score/streak feedback
- primer propagation

### Phase 3 — Crucible
- spot the lie
- cross-exam
- domain transfer
- self-ratings
- completion hub

### Phase 4 — Architect
- teach back
- key points
- keyword support check
- self-ratings

### Phase 5 — Transcend
- confidence-before-options
- boss fight
- blind spot detection
- hidden strengths
- meta-reflection on misses
- calibration dashboard

All phases must be resumable from persisted progress.

---

## 31. Calibration and mastery model

### 31.1 Forge score
Weighted from rapid fire and deep drill.

### 31.2 Crucible score
Weighted from self-ratings and participation completion.
Do not overstate precision; this is semi-structured self-assessment.

### 31.3 Transcend score
Primary objective performance score.

### 31.4 Overall mastery
Use weighted rollup:
- Forge 25%
- Crucible 25%
- Transcend 50%

### 31.5 Calibration metrics
Compute:
- overconfidence count
- underconfidence count
- calibration percentage
- miss-reason distribution

### 31.6 Concept mastery map
Per concept:
- correct items involving concept
- wrong items involving concept
- self-rated success on teach-back / crucible
- revisit completion bonus
- confusion penalty

Render green / yellow / red status with review guidance.

---

## 32. Provenance and diagnostics

Every major generated artifact should expose:
- source concept ids
- source section ids
- generator method
- difficulty
- fallback status if used

Provide a diagnostics panel showing:
- capture completeness
- import confidence
- concept extraction counts by method
- instructor pairing summary
- relation graph stats
- question counts by type
- low-confidence outputs needing review

---

## 33. Accessibility and UX requirements

- keyboard navigable
- visible focus rings
- high contrast mode
- reduced motion mode
- larger text mode
- no motion-only meaning
- color not sole indicator
- timer can be hidden or made advisory
- all self-rating controls have accessible labels

---

## 34. Visual system requirements

Create a coherent visual system:
- calm dark theme default with good contrast
- modular card layout
- clearly differentiated result states
- strong reading typography
- compact but readable dashboards
- phase color accents without excess noise
- diagrams or graph views only if they improve clarity

Do not create a garish “AI toy” aesthetic.

---

## 35. Export and import requirements

Support export/import of:
- capture sessions
- chapter bundles
- progress
- mastery reports
- EMBER memory
- diagnostics bundles

Exports should be JSON first.
Optional: printable HTML report; Word export only if time remains and does not compromise core quality.

---

## 36. Testing strategy

### 36.1 Unit tests
Must cover:
- normalization transforms
- section detection
- concept extraction
- ranking
- relation mapping
- question generation
- corruption generation
- confidence and mastery scoring
- memory update formulas

### 36.2 Fixture tests
Include fixtures for:
- sample Canvas assignment page HTML
- module page HTML
- discussion page HTML
- textbook PDF extracted text
- ambiguous paragraph structures
- noisy PDFs
- philosophy-like chapter
- non-philosophy chapter

### 36.3 Golden tests
For deterministic inputs, compare:
- concept list
- top concepts
- relationship graph edges
- question counts and types
- generated mnemonics
- instructor pairings
- mastery rollup math

### 36.4 UI tests
At minimum test:
- import flow
- concept scan
- learn-first flow
- boss fight confidence flow
- resume flow

### 36.5 Regression rule
Every fixed defect that affected output quality should add or improve a regression test.

---

## 37. REFORGE — build-time self-repair loop

Codex must implement and follow this repair loop during the build.

### 37.1 Loop
For each major milestone:
1. run relevant tests/checks
2. inspect failures
3. write root-cause note to `.omega/ERROR_LEDGER.md`
4. patch defect
5. add or update regression test
6. rerun
7. review diff for accidental regressions
8. continue

### 37.2 Review classes
Check for:
- type errors
- pathing mistakes
- broken GitHub Pages asset base
- extension manifest errors
- message contract mismatches
- IndexedDB hydration bugs
- deterministic drift
- accidental API usage
- stale import schemas
- accessibility regressions

### 37.3 Final review
Before declaring success:
- run all available tests
- build app
- build extension
- verify static asset paths
- verify import/export roundtrip
- verify one-click handoff if feasible
- verify at least one end-to-end sample chapter run

---

## 38. Exact file set Codex must create

At minimum create:

### Root/docs/config
- `README.md`
- `AGENTS.md`
- `.omega/*` ledgers
- `.agents/skills/*`
- shared workspace files

### Extension
- manifest
- service worker
- content scripts for Canvas and GitHub Pages bridge
- popup UI
- storage utilities
- selector memory
- fixture tests

### Web app
- routes
- state layer
- import flow
- phase runners
- mastery report
- diagnostics view
- settings / memory controls
- IndexedDB persistence

### Packages
- schemas/types
- SMELT
- ALIGN
- LATTICE
- KILN
- ECHO
- EMBER
- dictionaries
- fixtures
- UI core

---

## 39. Implementation order inside the one run

Codex should follow this exact order unless a strong dependency reason requires adjustment.

1. scaffold repo and workspace
2. write root AGENTS and `.omega` ledgers
3. create repo-local skills
4. define shared types and config
5. implement deterministic utility package
6. implement SMELT with tests
7. implement ALIGN with tests
8. implement LATTICE with tests
9. implement KILN with tests
10. implement ECHO and EMBER with tests
11. implement ATLAS persistence + import flow
12. implement SENTINEL capture flow
13. implement handoff bridge
14. implement runtime phases/UI
15. add diagnostics and memory views
16. add integration tests and fixtures
17. run REFORGE loop until quality stabilizes

---

## 40. Stop conditions

Codex should stop only when one of the following is true:

1. the integrated repository builds and major flows work end to end; or
2. a clearly documented blocker remains that cannot be resolved without external credentials, unsupported browser behavior, or unavailable fixtures.

If blocked:
- leave the repository in the best runnable state
- document blocker precisely
- include exact next actions

Do not stop simply because the system is large.

---

## 41. Final acceptance criteria

### Core product
- Canvas extension captures visited pages deterministically.
- Static app imports FOUNDRY JSON and manual PDF/TXT.
- Deterministic engines generate chapter bundles.
- All five learning phases work.
- Progress resumes after reload.
- Mastery report renders.

### Quality
- no runtime API calls
- no backend assumptions
- no TypeScript compile errors
- stable JSON contracts
- meaningful tests
- fixture coverage for extraction
- diagnostics available

### Adaptive behavior
- selector confidence memory updates
- confusion memory updates
- retention memory updates
- alias memory updates
- user can inspect/reset/export memory

### Delivery
- repository clearly organized
- docs present
- scripts usable
- GitHub Pages compatible
- extension buildable

---

## 42. Explicit anti-patterns

Do not do any of the following:

- fake the semantic engine with placeholder lorem ipsum
- add an API “just temporarily”
- bury important logic in a single giant component
- use randomization without seeded determinism
- silently drop provenance
- hardcode one Canvas DOM shape only
- depend on remote embeddings or remote search
- overuse localStorage for large structured data
- omit tests because the system is big
- stop after writing documentation without code

---

## 43. Master prompt Codex should follow

Use this as the direct build mandate inside the repository:

> Build the complete OMEGA FORGE system described in this file as a monorepo with a GitHub Pages static web app and a Manifest V3 Canvas capture extension. Follow the operating doctrine, create the required repo-local skills and ledgers first, then implement the full deterministic ingestion, instructor alignment, concept graph, learning artifact synthesis, adaptive memory, runtime phases, diagnostics, and tests. Keep everything offline-first and deterministic, with no runtime APIs or backend. After each major milestone run checks, diagnose failures, patch defects, and continue until the system is integrated and stable. Treat repo-local skills created during this run as explicit reference files for the remainder of the task. Preserve provenance, accessibility, export/import, and GitHub Pages compatibility.

---

## 44. Appendices policy

The appendices below are not decorative. They are part of the build context. Codex must reconcile them into a single coherent implementation.

Reconciliation rules:
1. This master spec takes precedence where conflicts exist.
2. Keep the strongest deterministic mechanics from each appendix.
3. Prefer shared packages over duplicated logic.
4. Prefer names from this master spec for final code architecture.
5. Reuse thresholds and generator templates unless better justified.
6. Document any materially changed thresholds in `.omega/DECISIONS.md`.

---

# APPENDIX A — PREVIOUS CANVAS CONVERTER ARCHITECTURE SPEC

# Canvas Converter — Variable-Driven Architecture Spec for Codex

## 1) Product Objective

Build a **local-first Canvas learning enhancer** composed of:

1. a **Chrome/Edge extension** that captures course content **as the student navigates Canvas**, and
2. a **static GitHub Pages web app** that receives the captured dataset and **algorithmically** transforms it into a better learning workspace **without any paid API, model runtime, or server backend**.

The system must be:

- free to host and run
- deterministic / algorithmic only
- privacy-preserving
- resilient to Canvas page variation
- easy to demo
- modular enough to extend later

---

## 2) Core Architecture Decision

### Chosen pattern

**Manifest V3 browser extension + static GitHub Pages SPA + local browser persistence + one-click handoff**

### Why this pattern

- Canvas access belongs inside the extension because the student is already authenticated in the browser.
- The static app should remain a pure viewer/processor with no backend and no secrets.
- Data must be captured incrementally as the student moves, then compiled at the end of a session.
- The enhancement layer should run entirely in-browser on the imported dataset.

### Explicit non-goals for v1

- no Canvas OAuth flow
- no Canvas REST API usage
- no server database
- no paid API/model calls
- no cloud sync
- no automatic ingestion of unvisited course pages
- no promise of deep semantic tutoring equivalent to an LLM

---

## 3) Variable Registry

All variables below are intended to be edited before generation.

### Product / branding

- `APP_NAME = "Canvas Converter"`
- `APP_SLUG = "canvas-converter"`
- `APP_TAGLINE = "Capture Canvas locally, then build a better learning workspace."`
- `STATIC_APP_URL = "https://<github-username>.github.io/<repo-name>/"`
- `STATIC_APP_ORIGIN = "https://<github-username>.github.io"`

### Browser targets

- `TARGET_BROWSERS = ["chrome", "edge"]`
- `MANIFEST_VERSION = 3`
- `EXTENSION_NAME = "Canvas Converter Capture"`
- `EXTENSION_VERSION = "0.1.0"`

### Allowed hosts

- `CANVAS_HOST_PATTERNS = ["https://<school>.instructure.com/*"]`
- `STATIC_APP_MATCH_PATTERNS = ["https://<github-username>.github.io/*"]`
- `OPTIONAL_EXTERNAL_CAPTURE_HOSTS = []`

### Capture behavior

- `ENABLE_PASSIVE_CAPTURE = true`
- `ENABLE_MANUAL_CAPTURE = true`
- `CAPTURE_ON_NAVIGATION = true`
- `CAPTURE_ON_DOM_SETTLED = true`
- `CAPTURE_EXTERNAL_LINK_METADATA = true`
- `CAPTURE_EXTERNAL_LINK_CONTENT = false`
- `CAPTURE_FILES_METADATA_ONLY = true`
- `CAPTURE_DISCUSSIONS = true`
- `CAPTURE_ASSIGNMENTS = true`
- `CAPTURE_PAGES = true`
- `CAPTURE_MODULES = true`
- `CAPTURE_SYLLABUS = true`

### Storage / performance

- `USE_EXTENSION_INDEXEDDB = true`
- `USE_EXTENSION_STORAGE_LOCAL_FOR_SETTINGS = true`
- `USE_WEBAPP_INDEXEDDB = true`
- `MAX_CAPTURED_HTML_BYTES_PER_ITEM = 250000`
- `MAX_CAPTURED_TEXT_BYTES_PER_ITEM = 250000`
- `DEDUPLICATION_STRATEGY = "content-hash-plus-url-id"`
- `NAV_DEBOUNCE_MS = 800`
- `DOM_SETTLE_MS = 1200`
- `MAX_LINKS_PER_ITEM = 200`

### Handoff behavior

- `HANDOFF_MODE = "extension-to-static-tab-message"`
- `ENABLE_JSON_EXPORT_FALLBACK = true`
- `IMPORT_ROUTE = "#/import"`
- `POSTMESSAGE_CHANNEL = "CANVAS_CONVERTER_IMPORT"`
- `POSTMESSAGE_TARGET_ORIGIN = STATIC_APP_ORIGIN`

### Algorithmic processing

- `TASK_EXTRACTION_MODE = "rule-based"`
- `CONCEPT_EXTRACTION_MODE = "frequency-plus-structure"`
- `RESOURCE_MATCHING_MODE = "keyword-overlap-weighted"`
- `DUE_DATE_EXTRACTION_MODE = "regex-plus-dom"`
- `OUTPUT_SUMMARY_MODE = "template-generated"`
- `ENABLE_USER_CONFIRMATION_UI = true`

### Security / privacy

- `STORE_DATA_LOCALLY_ONLY = true`
- `ALLOW_NETWORK_REQUESTS_FROM_WEBAPP = false`
- `ALLOW_NETWORK_REQUESTS_FROM_EXTENSION = false`
- `RENDER_RAW_IMPORTED_HTML = false`
- `SANITIZE_IMPORTED_HTML = true`
- `LOG_LEVEL = "info"`

### UI / UX

- `DEFAULT_THEME = "system"`
- `SHOW_CAPTURE_PROGRESS = true`
- `SHOW_SESSION_SUMMARY = true`
- `SHOW_DONE_LEARNING_BUTTON = true`
- `ENABLE_EDITABLE_OUTPUTS = true`

---

## 4) System Overview

### Subsystem A — Browser Extension

Responsible for:

- detecting Canvas page visits
- extracting content from visited pages
- classifying page type
- normalizing data into a shared schema
- deduplicating captured items
- persisting capture state locally
- compiling a course/session dataset
- handing that dataset to the static app

### Subsystem B — Static GitHub Pages Web App

Responsible for:

- receiving the dataset from the extension or JSON import
- validating and storing the dataset locally
- running deterministic enrichment algorithms
- building the enhanced learning workspace
- allowing user review, correction, export, and reuse

### Shared package

Responsible for:

- TypeScript schemas / interfaces
- validation helpers
- hashing utilities
- parsing utilities
- scoring utilities
- common constants

---

## 5) Recommended Repo Layout

```text
canvas-converter/
  apps/
    extension/
      public/
        icons/
      src/
        manifest.ts
        service-worker/
          index.ts
          routing.ts
          session-manager.ts
          handoff.ts
        content/
          canvas-capture.ts
          github-pages-bridge.ts
          dom/
            detectPageType.ts
            extractCourseMeta.ts
            extractModule.ts
            extractAssignment.ts
            extractDiscussion.ts
            extractPage.ts
            extractSyllabus.ts
            extractLinks.ts
            cleanHtml.ts
            textify.ts
          observers/
            routeObserver.ts
            domSettleObserver.ts
        popup/
          Popup.tsx
          popup.css
        options/
          Options.tsx
        storage/
          extensionDb.ts
          settingsStore.ts
        utils/
          hash.ts
          logger.ts
          url.ts
          time.ts
      package.json
      vite.config.ts
      tsconfig.json

    web/
      public/
      src/
        main.tsx
        App.tsx
        routes/
          ImportRoute.tsx
          WorkspaceRoute.tsx
          ReviewRoute.tsx
        ingest/
          receiveFromExtension.ts
          importJsonFile.ts
          validateImport.ts
        storage/
          webDb.ts
        processing/
          pipeline.ts
          normalize.ts
          extractTasks.ts
          extractConcepts.ts
          matchResources.ts
          buildStudyViews.ts
        components/
          ImportPanel.tsx
          SessionSummary.tsx
          AssignmentBoard.tsx
          ConceptPanel.tsx
          ResourceMap.tsx
          StudyChecklist.tsx
        security/
          sanitize.ts
        utils/
          logger.ts
      package.json
      vite.config.ts
      tsconfig.json

  packages/
    schema/
      src/
        types.ts
        validators.ts
        constants.ts
    core/
      src/
        hashing.ts
        scoring.ts
        text.ts
        dates.ts
        ids.ts

  package.json
  pnpm-workspace.yaml
  README.md
```

---

## 6) Extension Architecture

### 6.1 Manifest requirements

Use Manifest V3.

Required permissions:

- `storage`
- `tabs`
- `scripting`
- `activeTab` (optional but useful for explicit user-triggered actions)
- `unlimitedStorage` (recommended)

Required host permissions:

- all entries in `CANVAS_HOST_PATTERNS`
- all entries in `STATIC_APP_MATCH_PATTERNS`
- optionally entries in `OPTIONAL_EXTERNAL_CAPTURE_HOSTS`

### 6.2 Extension runtime components

#### A. Service worker

Responsibilities:

- maintain event listeners
- receive capture payloads from Canvas content scripts
- merge payloads into current session
- persist session metadata
- open or focus the GitHub Pages tab on “Done Learning”
- send compiled dataset to the bridge content script in the static app tab

Do **not** rely on global in-memory state surviving across idle periods.

#### B. Canvas content script

Injected on Canvas host patterns.

Responsibilities:

- detect route/page changes
- wait for DOM to stabilize
- identify the current page type
- extract raw page data
- convert to normalized item shape
- hash and dedupe
- send capture messages to the service worker

#### C. GitHub Pages bridge content script

Injected on `STATIC_APP_MATCH_PATTERNS`.

Responsibilities:

- receive import payload from service worker via `chrome.tabs.sendMessage`
- relay payload into the static page context using `window.postMessage`
- never persist sensitive payload longer than needed

#### D. Popup UI

Responsibilities:

- show current course/session title if detectable
- show capture counts by type
- show last captured page
- provide buttons:
  - `Capture Current Page`
  - `Pause/Resume Capture`
  - `Done Learning`
  - `Export JSON`
  - `Clear Session`

#### E. Options page

Responsibilities:

- configure host patterns
- configure capture modes
- configure size limits
- configure whether external links metadata/content is allowed
- configure debug logging

---

## 7) Web App Architecture

### 7.1 Runtime model

The web app is a **static SPA** hosted on GitHub Pages.

Responsibilities:

- receive import payload
- validate against shared schema
- persist course/session locally
- run processing pipeline
- present editable results
- export processed workspace JSON

### 7.2 Routes

- `/` or `#/` → Landing / Import
- `#/import` → waiting state for extension handoff
- `#/workspace/:courseId` → enhanced workspace
- `#/review/:courseId` → review / correct extracted outputs

### 7.3 Client persistence

Use IndexedDB for imported course/session data and derived outputs.
Use localStorage only for small UI preferences.

### 7.4 Web app modules

#### Ingest layer

- accept extension handoff
- accept local JSON import fallback
- validate schema
- store raw import

#### Processing layer

- normalize raw items
- generate per-assignment task lists
- identify concept candidates
- score resources against assignments
- build module summaries and study views

#### Presentation layer

- assignment dashboard
- concept map / concept list
- module timeline
- resource-to-assignment matrix
- checklist views
- editable notes and overrides

---

## 8) Data Flow

### 8.1 Passive capture flow

1. Student navigates inside Canvas.
2. Content script observes URL change or DOM-ready/settled condition.
3. Page type is detected.
4. Extractors build a normalized `VisitedItem`.
5. `VisitedItem` is hashed.
6. Content script sends `PAGE_CAPTURED` message to service worker.
7. Service worker merges item into current `CaptureSession`.
8. Session counters and indexes update.

### 8.2 Done Learning flow

1. Student clicks `Done Learning` in popup.
2. Service worker finalizes current `CaptureSession`.
3. Service worker opens or focuses `STATIC_APP_URL + IMPORT_ROUTE`.
4. When the GitHub Pages tab is ready, service worker sends the session payload to the GitHub Pages bridge content script.
5. Bridge content script relays payload into the page via `window.postMessage`.
6. Web app validates payload, stores it, runs processing, and navigates to the workspace view.

### 8.3 Fallback flow

1. Student clicks `Export JSON`.
2. Extension downloads `course-session.json`.
3. Student uploads it into the GitHub Pages app manually.
4. Processing proceeds identically.

---

## 9) Shared Schema

### 9.1 Top-level session shape

```ts
export interface CaptureSession {
  sessionId: string;
  createdAt: string;
  updatedAt: string;
  source: "canvas-extension";
  captureVersion: string;
  canvasBaseUrl: string;
  course: CourseMeta;
  stats: CaptureStats;
  visitedItems: VisitedItem[];
  linkIndex: LinkRecord[];
  warnings: CaptureWarning[];
}
```

### 9.2 Course metadata

```ts
export interface CourseMeta {
  courseId: string;
  courseName: string;
  courseCode?: string;
  term?: string;
  syllabusUrl?: string;
}
```

### 9.3 Visited item

```ts
export type VisitedItemType =
  | "module"
  | "assignment"
  | "discussion"
  | "page"
  | "syllabus"
  | "file"
  | "external-link";

export interface VisitedItem {
  itemId: string;
  type: VisitedItemType;
  url: string;
  title: string;
  courseId: string;
  moduleId?: string;
  moduleTitle?: string;
  assignmentGroup?: string;
  dueAt?: string;
  html?: string;
  text: string;
  extractedAt: string;
  contentHash: string;
  links: LinkRecord[];
  metadata: Record<string, unknown>;
}
```

### 9.4 Links

```ts
export interface LinkRecord {
  linkId: string;
  parentItemId: string;
  href: string;
  text?: string;
  kind: "canvas-internal" | "external" | "file";
  domain?: string;
}
```

### 9.5 Derived outputs

```ts
export interface DerivedWorkspace {
  courseId: string;
  generatedAt: string;
  assignments: DerivedAssignment[];
  moduleSummaries: ModuleSummary[];
  conceptIndex: ConceptRecord[];
  resourceMatches: ResourceMatch[];
}
```

---

## 10) Capture Logic

### 10.1 Page type detection

Implement deterministic page classification using:

- URL path signatures
- Canvas-specific DOM markers
- heading labels
- presence of assignment/discussion/module structures

Create an ordered classifier with confidence scores. Example priority:

1. assignment
2. discussion
3. module
4. syllabus
5. page
6. file/index
7. unknown

### 10.2 DOM stabilization

Because LMS pages can render progressively, do not extract immediately at first paint.

Use:

- initial URL observation
- debounced extraction
- MutationObserver-backed “settled” detection
- second-pass extraction if required content is missing

### 10.3 Dedupe

Dedupe by:

- stable URL
- extracted platform object ID when available
- normalized content hash

If an item changes meaningfully, update the stored version rather than creating duplicates.

---

## 11) Algorithmic Enrichment Pipeline

No API calls. No model inference.

### 11.1 Normalization

- strip navigation noise
- keep headings, lists, tables if possible
- generate plain text and structured blocks
- retain a sanitized HTML snapshot for optional rendering/debugging

### 11.2 Task extraction

Input:
- assignment/discussion text

Output:
- ordered action list
- deliverables
- evidence / citation cues
- response requirements

Method:
- sentence splitting
- imperative verb detection
- cue phrase dictionaries (`analyze`, `compare`, `discuss`, `respond`, `cite`, `submit`, `reply`, etc.)
- rubric cue extraction
- due date / reply date regex

### 11.3 Concept extraction

Input:
- assignment text + linked page text + module headings

Output:
- ranked concept candidates

Method:
- tokenize
- stopword removal
- heading-weighted frequency scoring
- noun-phrase heuristics
- repeated-term promotion across module items
- optional user confirmation UI

### 11.4 Resource matching

Input:
- assignments/discussions
- internal pages/files/links within same module/course

Output:
- scored resource matches per assignment

Method:
- exact phrase overlap
- weighted keyword overlap
- module co-location bonus
- title-term bonus
- manual override support

### 11.5 Study workspace generation

Generate:

- assignment cards
- concept panels
- linked resource lists
- module summaries
- prioritized checklist
- printable “study packet” view

---

## 12) Security, Privacy, and Safety Rules

1. **No external AI/model/API calls.**
2. **No backend secrets.**
3. **No remote code in the extension.**
4. **Do not render raw imported HTML unsafely.** Sanitize or convert to safe display blocks.
5. **Store user data locally only.**
6. **Give user explicit controls** for clear/delete/export.
7. **Minimize host permissions** to the Canvas domain(s) and the GitHub Pages app domain.
8. **External links should default to metadata-only** unless the user explicitly enables broader capture.
9. **Show the user what has been captured** and let them remove items before handoff.

---

## 13) Recommended Handoff Design

### Primary handoff

Use extension-to-page transfer through a bridge:

- service worker opens/focuses the GitHub Pages tab
- service worker sends payload to the GitHub Pages content script with `tabs.sendMessage`
- GitHub Pages content script relays the payload into the page via `window.postMessage`
- the page validates `origin`, `channel`, and schema before import

### Fallback handoff

Always keep JSON export/import available.

This is critical for:

- debugging
- browser differences
- sessions too large for direct in-memory transfer
- manual archival

---

## 14) Storage Strategy

### Extension

- Use `chrome.storage.local` for small settings and session index metadata.
- Use IndexedDB for full captured item bodies and compiled session payloads.

### Web app

- Use IndexedDB for raw imports and derived outputs.
- Use localStorage only for UI preferences like theme, last-opened course, filters.

### Rationale

Course sessions can become too large and too structured for small preference storage alone.

---

## 15) UI Requirements

### Extension popup

Must show:

- current course name if detectable
- items captured by type
- last capture time
- capture status (active/paused)
- buttons:
  - `Capture Current Page`
  - `Pause Capture`
  - `Resume Capture`
  - `Done Learning`
  - `Export JSON`
  - `Clear Current Session`

### Web app

Must show:

- import success state
- course summary
- assignment list
- concept list
- resource match panel
- checklist panel
- edit/correct controls
- export processed workspace button

---

## 16) Error Handling

Codex must implement explicit errors for:

- unsupported Canvas page shape
- missing course metadata
- duplicate session collision
- payload validation failure
- message bridge timeout
- import size overflow
- sanitized HTML render refusal

Each error should:

- be logged locally
- show a user-readable explanation
- provide safe fallback behavior

---

## 17) Observability / Debugging

Implement a debug mode controlled by `LOG_LEVEL`.

Debug mode should support:

- capture event logs
- page classifier result logs
- extraction timing logs
- dedupe decisions
- handoff state transitions
- import validation output

Do not send logs to any remote service.

---

## 18) Acceptance Criteria

### Extension acceptance criteria

- When the user visits supported Canvas pages, the extension captures visited content deterministically.
- Re-visiting the same page does not create uncontrolled duplicates.
- The popup reflects capture counts accurately.
- Clicking `Done Learning` transfers the full compiled session into the web app or cleanly falls back to JSON export.

### Web app acceptance criteria

- The web app imports a valid session without any server.
- The processing pipeline completes entirely in-browser.
- The workspace displays assignments, concepts, resources, and checklists from the imported data.
- The user can edit outputs and export processed data.

### Security acceptance criteria

- No runtime API keys exist anywhere.
- No backend is required.
- No remote code is loaded by the extension.
- All imported HTML is sanitized or converted before display.

---

## 19) Build Sequence for Codex

### Phase 1 — Shared schema + repo scaffolding

- create monorepo
- create shared `schema` and `core` packages
- create TypeScript types and validators
- set up build tooling

### Phase 2 — Extension capture MVP

- MV3 manifest
- Canvas content script
- page type detection
- popup
- storage of visited items
- JSON export

### Phase 3 — Static web app MVP

- import JSON file
- validate schema
- persist in IndexedDB
- basic workspace views

### Phase 4 — One-click handoff

- GitHub Pages bridge content script
- service worker tab orchestration
- postMessage bridge
- import route auto-processing

### Phase 5 — Algorithmic enrichment

- task extraction
- concept extraction
- resource matching
- checklist generation

### Phase 6 — Hardening

- dedupe improvements
- large-session handling
- sanitization hardening
- UI polish
- test coverage

---

## 20) Explicit Codex Instructions

Use the following implementation constraints:

1. Use **TypeScript** throughout.
2. Use **React + Vite** for the web app.
3. Use **Manifest V3** for the extension.
4. Use a **monorepo** with shared packages for schemas and utilities.
5. Keep the system **API-free** and **backend-free**.
6. Keep **all user data local**.
7. Prefer **small pure functions** for extraction and scoring logic.
8. Add **unit tests** for classifier, dedupe, parsing, and scoring logic.
9. Add **integration tests** for capture → handoff → import flow.
10. Build with **configuration variables**, not hardcoded school-specific assumptions.

---

## 21) Final Codex Handoff Prompt

```text
Build a production-quality v1 of a project named "Canvas Converter" using the architecture below.

GOAL
Create a local-first student learning tool composed of:
1) a Chrome/Edge Manifest V3 extension that captures Canvas course content as the student navigates visited course pages, and
2) a static React + TypeScript + Vite web app intended for GitHub Pages that receives the captured dataset and algorithmically builds an enhanced learning workspace.

NON-NEGOTIABLE CONSTRAINTS
- No paid API calls.
- No LLM/model runtime.
- No backend server.
- No cloud database.
- No secrets.
- All user data must remain local to the browser.
- The extension must capture only content the student actually visits unless explicitly imported by file.
- The extension must not depend on remote code.
- Imported HTML must never be rendered unsafely.

VARIABLES
APP_NAME = "Canvas Converter"
APP_SLUG = "canvas-converter"
STATIC_APP_URL = "https://<github-username>.github.io/<repo-name>/"
STATIC_APP_ORIGIN = "https://<github-username>.github.io"
CANVAS_HOST_PATTERNS = ["https://<school>.instructure.com/*"]
STATIC_APP_MATCH_PATTERNS = ["https://<github-username>.github.io/*"]
OPTIONAL_EXTERNAL_CAPTURE_HOSTS = []
ENABLE_PASSIVE_CAPTURE = true
ENABLE_MANUAL_CAPTURE = true
CAPTURE_ON_NAVIGATION = true
CAPTURE_ON_DOM_SETTLED = true
CAPTURE_EXTERNAL_LINK_METADATA = true
CAPTURE_EXTERNAL_LINK_CONTENT = false
USE_EXTENSION_INDEXEDDB = true
USE_WEBAPP_INDEXEDDB = true
ENABLE_JSON_EXPORT_FALLBACK = true
POSTMESSAGE_CHANNEL = "CANVAS_CONVERTER_IMPORT"
IMPORT_ROUTE = "#/import"
TASK_EXTRACTION_MODE = "rule-based"
CONCEPT_EXTRACTION_MODE = "frequency-plus-structure"
RESOURCE_MATCHING_MODE = "keyword-overlap-weighted"
RENDER_RAW_IMPORTED_HTML = false
SANITIZE_IMPORTED_HTML = true

REPO STRUCTURE
Use a monorepo with:
- apps/extension
- apps/web
- packages/schema
- packages/core

EXTENSION REQUIREMENTS
- Use Manifest V3.
- Include a service worker, Canvas content script, GitHub Pages bridge content script, popup UI, options page, and local storage layer.
- The Canvas content script must detect route changes and DOM-settled states, classify the current page, extract normalized data, and send it to the service worker.
- The service worker must merge items into a capture session, dedupe them, persist state safely, and support Done Learning and Export JSON actions.
- The popup must show current capture stats and control buttons.
- The bridge content script on the GitHub Pages domain must receive import messages from the extension and relay them into the web page context.

WEB APP REQUIREMENTS
- Use React + TypeScript + Vite.
- Build a static SPA suitable for GitHub Pages.
- Support two import modes: extension handoff and manual JSON upload.
- Store raw imports and derived outputs in IndexedDB.
- Build views for course summary, assignments, concepts, resource matches, and study checklist.
- Allow user edits/corrections to derived outputs.
- Support export of processed workspace data.

DATA MODEL
Implement shared TypeScript types and validators for:
- CaptureSession
- CourseMeta
- VisitedItem
- LinkRecord
- DerivedWorkspace
- DerivedAssignment
- ModuleSummary
- ConceptRecord
- ResourceMatch

PIPELINES
Implement these deterministic pipelines:
1) page classification
2) HTML/text normalization
3) task extraction from assignment/discussion instructions
4) concept extraction using weighted frequency + heading structure
5) resource matching using weighted keyword overlap and module proximity
6) study workspace generation

DEDUPE RULES
Use URL + platform object ID when present + normalized content hash.
If content changes materially, update the existing item instead of blindly creating duplicates.

SECURITY RULES
- No remote model/API usage.
- No backend calls except loading static assets.
- No raw unsanitized imported HTML rendering.
- Minimize permissions.
- Keep data local only.

TESTING
Add:
- unit tests for classifier, dedupe, task extraction, concept extraction, and resource matching
- integration tests for capture -> done learning -> handoff -> import -> workspace render

DELIVERABLES
Produce:
1) the monorepo codebase
2) a README with setup and GitHub Pages deployment instructions
3) sample mock Canvas capture fixtures for testing
4) a clear list of any TODOs where school-specific DOM selectors may need adjustment

IMPLEMENTATION STYLE
- Strong typing
- modular architecture
- no hardcoded school-specific assumptions beyond configurable selectors and host patterns
- readable code and comments
- explicit error handling
- pure functions where possible
- pragmatic UI, not overdesigned

Start with scaffolding and shared schema first, then extension capture MVP, then web import/workspace MVP, then one-click handoff, then algorithmic enrichment, then tests and polish.
```


# APPENDIX B — PREVIOUS TESSERA DETERMINISTIC SEMANTIC ENGINE SPEC

# TESSERA v1 — Deterministic Semantic Learning Engine

## Truth boundary

This specification proposes an **original composite architecture** for a fully deterministic, non-API learning engine. It is designed to feel novel and materially different from standard quiz/flashcard systems. **I cannot verify that no one has ever thought of any individual mechanism before.** I can, however, design a coherent, high-leverage architecture whose exact composition, scoring model, and learning sequence are original within this document.

---

## 1. Mission

Build a **local-first, fully deterministic semantic engine** that can ingest a textbook chapter from **PDF or TXT**, align it to the **instructor's actual focus** for that chapter, and synthesize **high-retention learning modules** without any external API, model runtime, paid service, or backend.

The engine must:

1. Accept textbook content and instructor-focus artifacts.
2. Convert raw text into a structured semantic representation.
3. Detect what the chapter is *really teaching*.
4. Detect what the instructor is *likely to care about*.
5. Build learning outputs that improve:
   - comprehension,
   - discrimination between similar ideas,
   - recall,
   - transfer,
   - confidence calibration,
   - self-explanation,
   - retention.
6. Operate entirely through deterministic parsing, heuristics, graph construction, scoring, and templated synthesis.

---

## 2. Engine name and identity

**Engine name:** `TESSERA`

**Expansion:** `Tension-Extracted Semantic Scaffolding Engine for Retention Architecture`

TESSERA is the top-level system. It is composed of six deterministic subsystems:

1. `CHISEL` — structural extraction and chapter normalization
2. `ALIGN` — instructor-focus extraction and chapter pairing
3. `LATTICE` — concept graph construction
4. `PRISM` — confusion, contrast, and pressure analysis
5. `ANVIL` — learning-module synthesis
6. `ECHO` — retention sequencing and revisit scheduling

---

## 3. What makes this architecture distinct

The proposed novelty comes from the **combination** of these ideas inside one deterministic pipeline:

1. **Instructor-weighted semantic conversion**
   - Textbooks are not summarized generically.
   - Chapters are reweighted against the instructor's prompts, verbs, rubrics, discussions, and module language.

2. **Pressure-based learning design**
   - Content is not only explained.
   - It is pushed through four learning pressures:
     - recognition,
     - discrimination,
     - inversion,
     - transfer.

3. **Confusion mining as a first-class output**
   - The engine does not merely extract concepts.
   - It explicitly mines what learners are most likely to confuse, overgeneralize, invert, or misapply.

4. **Compression ladder generation**
   - Each major concept is rendered at multiple compression levels:
     - full explanation,
     - concise explanation,
     - one-line essence,
     - cue hook.

5. **Boundary-of-use teaching**
   - The engine generates not only “what this is,” but also:
     - where it does **not** apply,
     - what it is **not**,
     - what it is commonly confused with.

6. **Deterministic semantic topology**
   - Instead of embeddings or LLMs, TESSERA constructs an interpretable graph from:
     - document structure,
     - sentence roles,
     - concept frequency,
     - definitional patterns,
     - cue lexicons,
     - co-occurrence,
     - instructor alignment.

---

## 4. Scope boundary

### Strong target domain
TESSERA is designed primarily for:
- textbooks,
- academic chapters,
- expository prose,
- lectures converted to text,
- instructional readings,
- theory-heavy or concept-heavy material.

### Secondary domain
It can also process:
- essays,
- policy documents,
- manuals,
- research summaries,
- instructor notes.

### Weak domain
It will degrade on:
- poetry,
- fiction,
- highly mathematical proofs without OCR/math parsing,
- highly graphical PDFs,
- extremely unstructured scans.

The architecture should therefore promise **domain-general expository conversion**, not magical parity across all possible text genres.

---

## 5. Primary outputs

For each chapter or input text region, TESSERA should generate:

1. **Chapter Spine**
   - 5–9 central ideas in dependency order.

2. **Instructor Lens**
   - why this chapter matters in *this course*, not in the abstract.

3. **Concept Cards**
   - layered definition, explanation, example, cue hook.

4. **Distinction Grid**
   - confusing pairs/triples and exact differences.

5. **Pressure Drills**
   - recognition, discrimination, inversion, transfer.

6. **Trap Deck**
   - plausible wrong statements with targeted corruption.

7. **Boundary Cards**
   - where a concept fails, stops, or becomes a different concept.

8. **Teach-Back Frames**
   - prompts plus required key points.

9. **Compression Ladder**
   - 150-word summary → 60-word summary → 20-word essence → 1-line hook.

10. **Retention Map**
    - what should be revisited first and why.

11. **Confidence Calibration Pack**
    - questions that separate false confidence from real understanding.

---

## 6. Variable registry

All behavior is controlled through explicit variables so Codex can implement the engine as configurable software.

```ts
export type TesseraConfig = {
  engineVersion: string;

  // Ingestion
  inputModes: ("pdf" | "txt" | "html" | "json")[];
  pdfExtractionMode: "text-layer-first" | "ocr-disabled";
  preservePageAnchors: boolean;
  normalizeUnicode: boolean;
  stripHeadersFooters: boolean;
  dehyphenateLines: boolean;

  // Segmentation
  minChapterChars: number;
  minSectionChars: number;
  maxSectionCharsBeforeSplit: number;
  headingScoreThreshold: number;
  sentenceWindowRadius: number;

  // Concept extraction
  maxConceptsPerChapter: number;
  minConceptFrequency: number;
  minConceptSpreadSections: number;
  allowAcronymMerging: boolean;
  allowParentheticalAliasMerging: boolean;
  nounPhraseMaxTokens: number;

  // Scoring weights
  weightFrequency: number;
  weightHeadingPresence: number;
  weightDefinitionSignal: number;
  weightSectionSpread: number;
  weightTypographicEmphasis: number;
  weightExampleDensity: number;
  weightContrastDensity: number;
  weightInstructorAlignment: number;
  weightAssessmentVerbAlignment: number;

  // Instructor focus
  instructorArtifactsEnabled: boolean;
  chapterPairingMode: "title-first" | "keyword-first" | "hybrid";
  instructorVerbWeight: number;
  instructorNounWeight: number;
  instructorRubricWeight: number;
  instructorPromptWeight: number;

  // Graph construction
  maxEdgesPerConcept: number;
  relationScoreThreshold: number;
  prerequisiteCueWeight: number;
  contrastCueWeight: number;
  exampleCueWeight: number;
  causeCueWeight: number;
  exceptionCueWeight: number;

  // Confusion / trap synthesis
  confusionPairThreshold: number;
  lexicalSimilarityWeight: number;
  cooccurrenceWeight: number;
  contrastSignalWeight: number;
  siblingCategoryWeight: number;
  trapCorruptionRate: number;

  // Module synthesis
  chapterSpineConceptCount: number;
  conceptCardCountTarget: number;
  pressureDrillCountPerConcept: number;
  transferScenarioCount: number;
  teachBackPromptCount: number;
  compressionLadderEnabled: boolean;

  // Retention sequencing
  revisitSpacingSteps: number[];
  highRiskRevisitMultiplier: number;
  underconfidencePriorityBoost: number;
  overconfidencePriorityBoost: number;

  // UI and interaction
  showEvidenceSentences: boolean;
  requireUserConfirmationForLowConfidencePairs: boolean;
  allowManualConceptMerge: boolean;
  allowManualChapterReassignment: boolean;
};
```

### Recommended defaults

```ts
export const DEFAULT_TESSERA_CONFIG: TesseraConfig = {
  engineVersion: "1.0.0",

  inputModes: ["pdf", "txt", "html", "json"],
  pdfExtractionMode: "text-layer-first",
  preservePageAnchors: true,
  normalizeUnicode: true,
  stripHeadersFooters: true,
  dehyphenateLines: true,

  minChapterChars: 2500,
  minSectionChars: 500,
  maxSectionCharsBeforeSplit: 7000,
  headingScoreThreshold: 0.66,
  sentenceWindowRadius: 2,

  maxConceptsPerChapter: 24,
  minConceptFrequency: 2,
  minConceptSpreadSections: 2,
  allowAcronymMerging: true,
  allowParentheticalAliasMerging: true,
  nounPhraseMaxTokens: 5,

  weightFrequency: 1.1,
  weightHeadingPresence: 1.4,
  weightDefinitionSignal: 1.6,
  weightSectionSpread: 1.2,
  weightTypographicEmphasis: 0.8,
  weightExampleDensity: 0.7,
  weightContrastDensity: 1.0,
  weightInstructorAlignment: 1.8,
  weightAssessmentVerbAlignment: 1.3,

  instructorArtifactsEnabled: true,
  chapterPairingMode: "hybrid",
  instructorVerbWeight: 1.3,
  instructorNounWeight: 1.1,
  instructorRubricWeight: 1.6,
  instructorPromptWeight: 1.5,

  maxEdgesPerConcept: 8,
  relationScoreThreshold: 0.52,
  prerequisiteCueWeight: 1.2,
  contrastCueWeight: 1.4,
  exampleCueWeight: 0.8,
  causeCueWeight: 1.0,
  exceptionCueWeight: 1.2,

  confusionPairThreshold: 0.61,
  lexicalSimilarityWeight: 0.9,
  cooccurrenceWeight: 1.2,
  contrastSignalWeight: 1.0,
  siblingCategoryWeight: 1.1,
  trapCorruptionRate: 0.18,

  chapterSpineConceptCount: 7,
  conceptCardCountTarget: 12,
  pressureDrillCountPerConcept: 4,
  transferScenarioCount: 3,
  teachBackPromptCount: 3,
  compressionLadderEnabled: true,

  revisitSpacingSteps: [1, 3, 6, 10],
  highRiskRevisitMultiplier: 1.5,
  underconfidencePriorityBoost: 1.2,
  overconfidencePriorityBoost: 1.6,

  showEvidenceSentences: true,
  requireUserConfirmationForLowConfidencePairs: true,
  allowManualConceptMerge: true,
  allowManualChapterReassignment: true,
};
```

---

## 7. Input contract

TESSERA accepts three categories of input.

### 7.1 Primary source bundle

```ts
type PrimarySourceBundle = {
  textbookId: string;
  textbookTitle: string;
  chapters: SourceDocument[];
};

type SourceDocument = {
  sourceId: string;
  kind: "pdf" | "txt" | "html";
  title: string;
  rawText: string;
  extractedPages?: PageAnchor[];
  structuralHints?: StructuralHints;
};

type PageAnchor = {
  pageNumber: number;
  startChar: number;
  endChar: number;
};

type StructuralHints = {
  headings?: string[];
  toc?: string[];
  chapterNumber?: number;
};
```

### 7.2 Instructor focus bundle

```ts
type InstructorFocusBundle = {
  courseId: string;
  moduleTitles: string[];
  assignments: InstructorArtifact[];
  discussions: InstructorArtifact[];
  rubrics: InstructorArtifact[];
  learningObjectives: InstructorArtifact[];
  announcements?: InstructorArtifact[];
};

type InstructorArtifact = {
  artifactId: string;
  kind:
    | "assignment"
    | "discussion"
    | "rubric"
    | "objective"
    | "announcement";
  title: string;
  rawText: string;
  moduleTitle?: string;
  dueAt?: string;
};
```

### 7.3 Optional user profile bundle

```ts
type LearnerProfile = {
  readingLevelPreference?: "standard" | "compressed" | "plain";
  moduleIntensity?: "light" | "normal" | "deep";
  chapterGoal?: "comprehend" | "exam-prepare" | "discuss" | "write";
};
```

---

## 8. Output contract

```ts
type LearningModulePack = {
  packId: string;
  courseId?: string;
  chapterId: string;
  chapterTitle: string;
  spine: ChapterSpine;
  instructorLens: InstructorLens;
  concepts: ConceptCard[];
  distinctionGrid: DistinctionGrid;
  pressureDrills: PressureDrillSet;
  trapDeck: TrapDeck;
  boundaryCards: BoundaryCard[];
  teachBackFrames: TeachBackFrame[];
  compressionLadder: CompressionLadder;
  retentionMap: RetentionMap;
  confidenceCalibration: ConfidenceCalibrationPack;
  evidenceLedger: EvidenceLedger;
};
```

---

## 9. Pipeline overview

TESSERA runs in six deterministic stages.

```text
INPUT
  -> CHISEL   (clean, segment, structural-tag)
  -> ALIGN    (detect instructor focus and chapter relevance)
  -> LATTICE  (extract concepts and relations)
  -> PRISM    (mine confusion, tension, traps, boundaries)
  -> ANVIL    (synthesize learning artifacts)
  -> ECHO     (sequence revisits and retention priorities)
  -> OUTPUT MODULE PACK
```

---

## 10. CHISEL — structural extraction and normalization

### Purpose
Transform raw PDF/TXT content into a chapter-aware, sentence-aware, section-aware substrate that later stages can reason over deterministically.

### Responsibilities
1. Extract raw text.
2. Normalize formatting noise.
3. Restore broken line joins.
4. Detect headings and section boundaries.
5. Preserve page anchors when available.
6. Split into paragraphs and sentences.
7. Tag sentence roles using fixed rules.

### Recommended implementation details
- Use `pdf.js` for browser-side PDF text extraction.
- Use deterministic sentence splitting with abbreviation-safe regex or a local tokenizer.
- Use rule-based heading detection from:
  - font size if available,
  - capitalization ratio,
  - numbering patterns,
  - surrounding whitespace,
  - TOC matches.

### Core transforms

#### 10.1 Canonical normalization
Apply, in order:
1. Unicode normalization (`NFKC`)
2. strip repeated whitespace
3. dehyphenate line-end joins
4. collapse duplicated headers/footers
5. preserve paragraph breaks
6. preserve page anchors

#### 10.2 Section detection
Compute a heading score:

```ts
headingScore =
  numberPatternScore * 0.20 +
  casingScore * 0.15 +
  whitespaceScore * 0.15 +
  tocMatchScore * 0.25 +
  shortLineScore * 0.10 +
  typographyHintScore * 0.15;
```

If `headingScore >= headingScoreThreshold`, classify line as heading.

#### 10.3 Sentence role tagging
Each sentence receives zero or more role tags based on lexicon cues and local context.

```ts
type SentenceRole =
  | "definition"
  | "example"
  | "contrast"
  | "cause"
  | "effect"
  | "procedure"
  | "exception"
  | "claim"
  | "question"
  | "application"
  | "evaluation"
  | "summary";
```

##### Example rule cues
- `definition`: “is defined as”, “refers to”, “means”, “is the process by which”
- `example`: “for example”, “for instance”, “consider”, “such as”
- `contrast`: “however”, “in contrast”, “unlike”, “whereas”, “on the other hand”
- `exception`: “unless”, “except”, “does not apply when”
- `cause/effect`: “because”, “therefore”, “thus”, “leads to”, “results in”
- `procedure`: “first”, “next”, “then”, “finally”, imperative constructions

### CHISEL output

```ts
type ChiselChapter = {
  chapterId: string;
  title: string;
  pageRange?: [number, number];
  sections: ChiselSection[];
  sentences: TaggedSentence[];
  paragraphIndex: ParagraphRecord[];
  glossaryCandidates: string[];
};
```

---

## 11. ALIGN — instructor focus extraction and chapter pairing

### Purpose
Convert course-side artifacts into a deterministic model of what the instructor emphasizes and pair that emphasis to the relevant textbook chapter.

### Key idea
The textbook tells what *could* matter. The course artifacts tell what *will likely* matter.

### Responsibilities
1. Parse assignments, discussions, rubrics, module titles, objectives.
2. Extract priority verbs and assessment nouns.
3. Detect repeated concepts and chapter-title references.
4. Pair artifacts to textbook chapters.
5. Build a chapter-specific instructor focus profile.

### Instructor signal categories

```ts
type InstructorSignal = {
  verbs: WeightedTerm[];          // analyze, compare, define, evaluate, apply
  nouns: WeightedTerm[];          // justice, obligation, utility, cognition
  phrases: WeightedPhrase[];      // “categorical imperative”, “social contract”
  rubricTerms: WeightedPhrase[];  // thesis, evidence, distinction, application
  promptPatterns: WeightedPhrase[];
  moduleAnchors: string[];
};
```

### Pairing logic
Use a hybrid score to attach each instructor artifact to one or more chapters.

```ts
pairingScore =
  titleOverlapScore * 0.30 +
  keywordOverlapScore * 0.20 +
  conceptOverlapScore * 0.20 +
  moduleTitleProximityScore * 0.15 +
  headingAliasScore * 0.10 +
  chapterNumberMatchScore * 0.05;
```

### Instructor Focus Profile

```ts
type InstructorFocusProfile = {
  chapterId: string;
  alignedArtifacts: string[];
  highPriorityVerbs: WeightedTerm[];
  highPriorityTerms: WeightedTerm[];
  likelyAssessmentMoves: AssessmentMove[];
  likelyDeliverables: DeliverableType[];
  focusScoreByConceptSeed: Record<string, number>;
};
```

### Assessment move ontology

```ts
type AssessmentMove =
  | "define"
  | "compare"
  | "contrast"
  | "apply"
  | "argue"
  | "evaluate"
  | "critique"
  | "synthesize"
  | "illustrate"
  | "defend";
```

---

## 12. LATTICE — concept graph construction

### Purpose
Convert chapter text plus instructor emphasis into an interpretable semantic topology.

### Core output
A weighted concept graph with nodes, aliases, roles, evidence spans, and relation edges.

### 12.1 Concept candidate generation
Use deterministic noun phrase extraction and pattern matching.

Sources of candidates:
1. heading terms
2. repeated noun phrases
3. glossary-style patterns
4. definition subjects
5. emphasized terms (bold/italic if available)
6. instructor overlapping terms
7. parenthetical term introductions

```ts
type ConceptCandidate = {
  rawLabel: string;
  normalizedLabel: string;
  occurrences: Occurrence[];
  sourceSignals: SourceSignal[];
};
```

### 12.2 Alias merging
Merge candidates when any of the following hold:
- exact normalized match
- acronym expansion match
- parenthetical alias pattern
- plural/singular lemma match
- title-to-body alias match

### 12.3 Concept salience scoring

```ts
salienceScore =
  normalizedFrequency * weightFrequency +
  headingPresence * weightHeadingPresence +
  definitionSignal * weightDefinitionSignal +
  sectionSpread * weightSectionSpread +
  typographicEmphasis * weightTypographicEmphasis +
  exampleDensity * weightExampleDensity +
  contrastDensity * weightContrastDensity +
  instructorAlignment * weightInstructorAlignment +
  assessmentVerbAlignment * weightAssessmentVerbAlignment;
```

Keep top `maxConceptsPerChapter` concepts after tie-broken diversity filtering.

### 12.4 Concept type classification
Deterministically classify each concept into one primary type:

```ts
type ConceptType =
  | "principle"
  | "theory"
  | "process"
  | "actor"
  | "criterion"
  | "framework"
  | "problem"
  | "mechanism"
  | "event"
  | "example"
  | "term"
  | "argument";
```

Classification uses:
- definitional cue words,
- local head nouns,
- heading context,
- syntactic context,
- nearby ontological cue lexicons.

### 12.5 Relation extraction
Build edges based on sentence-role cues and co-occurrence windows.

```ts
type RelationType =
  | "defines"
  | "requires"
  | "contrasts_with"
  | "causes"
  | "results_in"
  | "is_example_of"
  | "is_part_of"
  | "supports"
  | "criticizes"
  | "depends_on"
  | "limited_by"
  | "applies_to";
```

#### Relation score

```ts
relationScore =
  cuePatternStrength * 0.35 +
  sentenceRoleMatch * 0.20 +
  cooccurrenceWindowStrength * 0.20 +
  sectionProximity * 0.10 +
  repeatedEvidence * 0.10 +
  instructorRelevanceBoost * 0.05;
```

Only retain edges above `relationScoreThreshold`.

### LATTICE output

```ts
type ConceptGraph = {
  nodes: ConceptNode[];
  edges: RelationEdge[];
  chapterCentralityRank: string[];
};
```

---

## 13. PRISM — confusion, contrast, and pressure analysis

### Purpose
Find the exact places where a learner is likely to misunderstand the chapter.

### This is one of the most important subsystems.
Rather than merely summarizing the text, PRISM asks:
- Which concepts sound similar?
- Which concepts occupy the same category?
- Which concepts are contrasted by the author?
- Which concepts are easily inverted?
- Which concepts are overbroad if remembered sloppily?

### 13.1 Confusion pair mining
Each candidate concept pair receives a confusion score.

```ts
confusionScore =
  lexicalSimilarity * lexicalSimilarityWeight +
  sharedContextOverlap * cooccurrenceWeight +
  explicitContrastSignal * contrastSignalWeight +
  siblingCategorySimilarity * siblingCategoryWeight +
  instructorJointAppearanceBoost * 0.8;
```

High confusion pair examples:
- theory A vs theory B
- process vs outcome
- cause vs justification
- framework vs principle
- norm vs law

### 13.2 Corruption vectors
For each concept or relation, PRISM identifies ways it can be corrupted.

```ts
type CorruptionVector =
  | "definition_swap"
  | "relation_inversion"
  | "boundary_overreach"
  | "actor_misattribution"
  | "criterion_swap"
  | "example_promoted_to_rule"
  | "rule_promoted_to_exception"
  | "framework_label_swap";
```

### 13.3 Boundary detection
Boundary cards explain where a concept stops applying.

Boundary cues come from:
- exception-tagged sentences
- “however / except / unless / limited by” regions
- contrastive subsections
- author caveats

### 13.4 Pressure profile per concept
Each concept gets four learning pressures:

```ts
type PressureProfile = {
  recognitionNeed: number;     // can learner identify it?
  discriminationNeed: number;  // can learner separate it from neighbors?
  inversionRisk: number;       // likely to reverse, swap, or overgeneralize?
  transferNeed: number;        // likely to be tested in unfamiliar scenarios?
};
```

These scores control module synthesis.

---

## 14. ANVIL — learning module synthesis

### Purpose
Convert the graph and pressure model into concrete learning artifacts.

ANVIL is where the semantic engine becomes a pedagogy engine.

### 14.1 Module generation principles
Every major concept should be represented across these dimensions:
1. what it is
2. why it matters
3. what it is not
4. what it is confused with
5. where it applies
6. where it fails
7. how the instructor may ask about it

### 14.2 Generated artifact types

#### A. Chapter Spine
A dependency-ordered backbone of 5–9 concepts.

Selection formula:
- high salience
- high instructor alignment
- high graph centrality
- diverse concept types
- prerequisite ordering

Output example structure:

```ts
type ChapterSpine = {
  anchorConcepts: SpineNode[];
  dependencyFlow: string[];
  chapterEssence: string;
};
```

#### B. Instructor Lens
A chapter-specific explanation of course emphasis.

```ts
type InstructorLens = {
  whyThisChapterMattersHere: string;
  likelyPromptTypes: AssessmentMove[];
  likelyHighValueConcepts: string[];
  likelyMistakeZones: string[];
};
```

#### C. Concept Cards
Each card must include:
- term
- core definition
- plain explanation
- textbook-grounded example
- cue hook
- distinction note
- instructor-use note
- evidence sentence references

```ts
type ConceptCard = {
  conceptId: string;
  label: string;
  type: ConceptType;
  coreDefinition: string;
  plainExplanation: string;
  concreteExample: string;
  cueHook: string;
  distinctionNote: string;
  instructorUseNote: string;
  keyEvidence: EvidenceRef[];
};
```

#### D. Distinction Grid
A matrix of frequently confused concepts.

Columns:
- Concept A
- Concept B
- Same category because...
- Exact difference
- Typical student mistake
- Instructor likely cares because...

#### E. Pressure Drills
Pressure drills are the signature output type.

Each concept or concept pair can generate up to four deterministic drills:

1. **Recognition Drill**
   - identify the correct definition, example, or use.

2. **Discrimination Drill**
   - choose between near-neighbors and explain the difference.

3. **Inversion Drill**
   - detect a subtly corrupted statement.

4. **Transfer Drill**
   - apply the concept to a novel scenario constructed from domain templates.

```ts
type PressureDrill = {
  drillId: string;
  kind: "recognition" | "discrimination" | "inversion" | "transfer";
  targetConceptIds: string[];
  prompt: string;
  options?: string[];
  correctAnswer?: string;
  explanation: string;
  evidenceRefs: EvidenceRef[];
};
```

#### F. Trap Deck
The Trap Deck is built from PRISM corruption vectors.

Each trap includes:
- plausible wrong statement
- why it looks right
- exact corruption point
- corrected version

This is not a normal quiz. It is an anti-confusion machine.

#### G. Boundary Cards
Every high-importance concept should have a “where it stops” card.

Prompt pattern examples:
- “This concept applies when..., but breaks when...”
- “This is not the same as...”
- “Do not extend this concept to...”

#### H. Teach-Back Frames
Each teach-back prompt includes:
- prompt
- expected coverage points
- common omissions
- “minimum viable explanation” checklist

#### I. Compression Ladder
This is a distinctive deterministic mechanism.

Every chapter and major concept should be compressed into four layers:

1. **Full sense** — ~120–180 words
2. **Study version** — ~50–70 words
3. **Exam essence** — ~15–25 words
4. **Cue hook** — 5–10 words

Compression is not done by a model. It is done by deterministic sentence ranking and structural stripping:
- retain definition sentence,
- retain distinguishing sentence,
- retain application sentence,
- retain caveat sentence if present,
- progressively remove low-centrality modifiers.

#### J. Confidence Calibration Pack
This pack intentionally creates confidence judgments before answer reveal.

Even without AI, the engine can generate synthesis questions by combining:
- two or more related concepts,
- one application context,
- one discriminative twist,
- one common corruption vector.

---

## 15. ECHO — retention sequencing and revisit scheduling

### Purpose
Turn static module outputs into a memory-shaping sequence.

### Principle
Learning should revisit what is most fragile, not merely what is most important.

### Risk model
Each concept receives a revisit priority score.

```ts
revisitPriority =
  salienceScore * 0.20 +
  instructorAlignment * 0.20 +
  confusionRisk * 0.20 +
  inversionRisk * 0.15 +
  transferNeed * 0.10 +
  conceptCentrality * 0.10 +
  learnerErrorHistory * 0.05;
```

### Intra-session revisit windows
A concept can be revisited in the same session after these counts of intervening items:

```ts
[1, 3, 6, 10]
```

### What gets revisited
- high confusion pairs
- traps missed earlier
- concepts with high boundary complexity
- concepts the learner got right with low confidence
- concepts the learner got wrong with high confidence

---

## 16. Deterministic synthesis algorithms

This section defines how content is transformed without LLMs.

### 16.1 Sentence ranking for explanations
Rank candidate evidence sentences for each concept.

```ts
sentenceUtility =
  conceptMentionStrength * 0.30 +
  roleMatchStrength * 0.20 +
  definitionPriority * 0.20 +
  distinctivenessStrength * 0.10 +
  exampleSupport * 0.10 +
  instructorAlignmentBoost * 0.10;
```

Use top-ranked sentences to build:
- core definition,
- explanation,
- example,
- caveat.

### 16.2 Cue hook generation
Cue hooks are deterministic mnemonic-like anchors, not freeform creativity.

Build them from templates such as:
- `"[Concept] = [core distinction]"`
- `"If [condition], think [concept]"`
- `"Do not confuse [concept] with [neighbor]"`
- `"[Concept] asks: [central question]"`

### 16.3 Distinction note generation
For a confusion pair `(A, B)`:
1. extract each concept’s top definition sentence,
2. identify differentiating tokens,
3. find contrastive evidence,
4. synthesize a two-part statement:
   - “A is about...; B is about...”
   - “Students confuse them because...; the decisive difference is...”

### 16.4 Trap synthesis
Select a corruption vector and modify the source truth minimally.

Example patterns:
- swap concept label with sibling concept
- invert causality
- replace condition with exception
- generalize example into rule
- attribute argument to wrong framework

Trap quality rule:
- must remain plausible
- must preserve 70–85% surface truth
- must corrupt exactly one decisive element

### 16.5 Transfer scenario generation
Transfer scenarios are built from domain templates rather than model generation.

Each domain template includes:
- actors,
- decision point,
- competing goals,
- relevant constraints,
- ambiguity.

Example domains:
- workplace policy
- medical triage
- AI system design
- public policy
- classroom conflict
- business ethics

A concept-to-domain mapping table chooses which template types fit which concept types.

### 16.6 Teach-back prompt generation
Teach-back prompts are deterministic transformations of high-centrality concepts.

Patterns:
- “Explain [concept] as if teaching a beginner.”
- “Explain why [concept A] is not the same as [concept B].”
- “Show how [concept] would apply to [domain].”
- “Defend [concept] against this challenge: [counterpoint].”

### 16.7 Counterpoint generation
Counterpoints come from:
- known contrast concepts,
- boundary conditions,
- exception evidence,
- criticism relations.

This allows a deterministic devil’s advocate mode without AI.

---

## 17. Evidence integrity rules

Every generated artifact must preserve provenance.

```ts
type EvidenceRef = {
  chapterId: string;
  sectionId: string;
  sentenceId: string;
  pageNumber?: number;
  excerpt: string;
};
```

Rules:
1. Every concept card must cite at least 2 evidence references.
2. Every distinction note must cite at least 1 contrastive evidence reference.
3. Every trap card must cite the sentence or relation it corrupts.
4. Every instructor lens claim must cite the triggering instructor artifacts.
5. UI must allow “show source evidence” expansion.

This is critical to keep deterministic output auditable.

---

## 18. Instructor pairing model in detail

### Goal
Map chapter content to what the instructor seems to emphasize.

### Instructor emphasis features
1. repeated verbs in assignments/discussions
2. repeated noun phrases
3. rubric terminology
4. chapter or module title mentions
5. explicit references to compare/contrast/evaluate/apply
6. due-near artifacts optionally weighted more if desired

### Concept-level instructor alignment
For each concept node:

```ts
instructorAlignmentScore =
  termOverlapWithArtifacts * 0.35 +
  verbCompatibilityWithAssessmentMoves * 0.25 +
  rubricPresenceBoost * 0.20 +
  moduleTitleAnchorBoost * 0.10 +
  promptRepetitionBoost * 0.10;
```

### Result
Concepts can be tagged as:
- `core_textbook`
- `core_instructor`
- `bridge_concept`
- `background_only`

This lets the engine distinguish:
- what is central in the text,
- what is central in the course,
- what bridges them.

---

## 19. Deterministic module sequence design

This section defines the recommended learner-facing flow.

## Phase A — ORIENT
**Goal:** establish a no-shock mental map.

Outputs:
- Chapter Spine
- Instructor Lens
- 1-line cue hooks
- concept dependency map

## Phase B — ABSORB
**Goal:** convert high-salience concepts into layered cards.

Outputs:
- Concept Cards
- plain explanations
- examples
- distinction notes
- evidence snippets

## Phase C — SEPARATE
**Goal:** prevent conceptual blending.

Outputs:
- Distinction Grid
- confusion pairs
- boundary cards
- “not the same as” prompts

## Phase D — PRESSURE
**Goal:** create durable retention through targeted strain.

Outputs:
- recognition drills
- discrimination drills
- inversion drills
- transfer drills
- trap deck

## Phase E — PRODUCE
**Goal:** force active generation.

Outputs:
- teach-back prompts
- key-points checklist
- concept-to-domain explanation frames
- compression ladder completion

## Phase F — CALIBRATE
**Goal:** expose blind spots and hidden strengths.

Outputs:
- confidence-before-answer items
- overconfidence flags
- underconfidence flags
- revisit priorities

This preserves much of the spirit of your reference material, but grounds it in a deterministic graph and rule system.

---

## 20. Proposed distinctive learning mechanics

These are proposed original combinations built for deterministic synthesis.

### 20.1 Pressure Quartet
Every major concept gets tested under four forms:
- **Can you recognize it?**
- **Can you distinguish it?**
- **Can you catch it when corrupted?**
- **Can you transfer it?**

This is the core retention mechanism.

### 20.2 Boundary of Use Cards
Instead of only teaching “what a concept is,” the engine also teaches:
- where it stops,
- what invalid use looks like,
- what overreach looks like.

### 20.3 Compression Ladder
A deterministic multiscale restatement system.
The learner sees the same concept at multiple granularity levels, which improves both comprehension and retrieval cue density.

### 20.4 Instructor Lens Reweighting
The chapter is filtered through actual instructor rhetoric, which makes modules more exam-relevant and course-relevant.

### 20.5 Trap Deck
Near-miss statements deliberately target false confidence rather than mere ignorance.

### 20.6 Distinction Grid
A structured anti-confusion matrix. This is stronger than ordinary flashcards because it encodes boundaries between neighboring ideas.

### 20.7 Evidence-Visible Learning
Every generated learning artifact can trace back to source text. This improves trust and user correction.

---

## 21. Recommended repository architecture

```text
/apps
  /web
    /src
      /components
      /routes
      /state
      /modules
      /features
        /import
        /chapter-view
        /learning-pack
        /drills
        /teach-back
        /calibration
      /storage
      /workers
  /extension
    /src
      /content
      /background
      /popup
      /options
/packages
  /engine
    /src
      /config
      /types
      /lexicons
      /utils
      /chisel
      /align
      /lattice
      /prism
      /anvil
      /echo
      /serialization
      /validation
  /shared
    /src
      /types
      /schemas
      /constants
```

### Primary package responsibility

- `/packages/engine` contains all deterministic semantic logic.
- `/apps/web` provides the UI and learner flows.
- `/apps/extension` is optional; it captures Canvas/instructor artifacts and sends them into the local web app.

---

## 22. Local libraries allowed

These libraries are acceptable because they are local and deterministic.

### Strong recommendations
- `pdfjs-dist` — PDF text extraction
- `zod` — schema validation
- `idb` — IndexedDB wrapper
- `wink-nlp` or `compromise` — local tokenization / POS / lemma support
- `mini-search` or `flexsearch` — local search/indexing
- `vitest` — test harness

### Rule
No remote inference. No hidden hosted service. No runtime API key.

---

## 23. Quality standards and acceptance criteria

### Concept extraction quality
- At least 80% of top chapter concepts should be recognizable to a human reader of that chapter.
- Fewer than 20% of concept cards should be generic or low-value.

### Instructor pairing quality
- For chapters with instructor artifacts, the module should visibly reflect assignment/discussion focus.
- The top 5 “likely instructor priorities” should have traceable evidence.

### Trap quality
- Traps must be plausible, not absurd.
- Each trap must corrupt one decisive detail only.

### Boundary quality
- Boundary cards must point to real caveats, exceptions, or non-applications from the text.

### UI quality
- Every major output must expose evidence.
- Every low-confidence merge/pair decision should allow manual correction.

---

## 24. Failure modes and how to handle them

### Failure mode: weak PDF extraction
**Mitigation:**
- preserve page anchors where possible,
- detect low text density,
- prompt for TXT fallback,
- allow user chapter re-segmentation.

### Failure mode: chapter pairing ambiguity
**Mitigation:**
- show top candidate chapter matches,
- let user override,
- store override for future runs.

### Failure mode: too many concepts
**Mitigation:**
- rank by salience,
- diversify by section,
- cap sibling concepts unless instructor-aligned.

### Failure mode: poor trap generation
**Mitigation:**
- generate only from high-confidence confusion pairs,
- require a preserved evidence relation,
- drop trap if corruption plausibility score is too low.

### Failure mode: generic transfer scenarios
**Mitigation:**
- map scenario domain to concept type,
- inject instructor move if known,
- use domain templates with explicit ambiguity.

---

## 25. Pseudocode for the full engine

```ts
function runTessera(
  textbookBundle: PrimarySourceBundle,
  instructorBundle?: InstructorFocusBundle,
  learnerProfile?: LearnerProfile,
  config: TesseraConfig = DEFAULT_TESSERA_CONFIG,
): LearningModulePack[] {
  const chapters = CHISEL.process(textbookBundle, config);
  const instructorProfiles = instructorBundle
    ? ALIGN.process(chapters, instructorBundle, config)
    : [];

  return chapters.map((chapter) => {
    const focusProfile = ALIGN.selectProfileForChapter(chapter.chapterId, instructorProfiles);
    const conceptGraph = LATTICE.build(chapter, focusProfile, config);
    const pressureModel = PRISM.analyze(chapter, conceptGraph, focusProfile, config);
    const learningPack = ANVIL.synthesize(chapter, conceptGraph, pressureModel, focusProfile, learnerProfile, config);
    return ECHO.sequence(learningPack, pressureModel, learnerProfile, config);
  });
}
```

---

## 26. Core algorithms in pseudocode

### 26.1 Concept extraction

```ts
function extractConceptCandidates(chapter: ChiselChapter, config: TesseraConfig): ConceptCandidate[] {
  const headingTerms = getHeadingTerms(chapter.sections);
  const nounPhrases = extractNounPhrases(chapter.sentences, config.nounPhraseMaxTokens);
  const definitionSubjects = extractDefinitionSubjects(chapter.sentences);
  const emphasizedTerms = extractEmphasizedTerms(chapter);
  const parentheticalAliases = extractParentheticalAliases(chapter.sentences);

  return mergeAndNormalizeCandidates([
    ...headingTerms,
    ...nounPhrases,
    ...definitionSubjects,
    ...emphasizedTerms,
    ...parentheticalAliases,
  ], config);
}
```

### 26.2 Concept scoring

```ts
function scoreConcept(candidate: ConceptCandidate, chapter: ChiselChapter, focusProfile?: InstructorFocusProfile): number {
  return (
    normalizedFrequency(candidate, chapter) * DEFAULT_TESSERA_CONFIG.weightFrequency +
    headingPresence(candidate, chapter) * DEFAULT_TESSERA_CONFIG.weightHeadingPresence +
    definitionSignal(candidate, chapter) * DEFAULT_TESSERA_CONFIG.weightDefinitionSignal +
    sectionSpread(candidate, chapter) * DEFAULT_TESSERA_CONFIG.weightSectionSpread +
    typographicEmphasis(candidate, chapter) * DEFAULT_TESSERA_CONFIG.weightTypographicEmphasis +
    exampleDensity(candidate, chapter) * DEFAULT_TESSERA_CONFIG.weightExampleDensity +
    contrastDensity(candidate, chapter) * DEFAULT_TESSERA_CONFIG.weightContrastDensity +
    instructorAlignment(candidate, focusProfile) * DEFAULT_TESSERA_CONFIG.weightInstructorAlignment +
    assessmentVerbAlignment(candidate, focusProfile) * DEFAULT_TESSERA_CONFIG.weightAssessmentVerbAlignment
  );
}
```

### 26.3 Confusion pair mining

```ts
function computeConfusionScore(a: ConceptNode, b: ConceptNode, chapter: ChiselChapter, graph: ConceptGraph): number {
  return (
    lexicalSimilarity(a, b) * DEFAULT_TESSERA_CONFIG.lexicalSimilarityWeight +
    sharedContextOverlap(a, b, chapter) * DEFAULT_TESSERA_CONFIG.cooccurrenceWeight +
    explicitContrastSignal(a, b, chapter) * DEFAULT_TESSERA_CONFIG.contrastSignalWeight +
    siblingCategorySimilarity(a, b) * DEFAULT_TESSERA_CONFIG.siblingCategoryWeight +
    instructorJointAppearanceBoost(a, b) * 0.8
  );
}
```

### 26.4 Trap generation

```ts
function generateTrap(pairOrNode: ConceptNode | [ConceptNode, ConceptNode], graph: ConceptGraph): TrapCard | null {
  const corruption = chooseBestCorruptionVector(pairOrNode, graph);
  const sourceTruth = selectBestEvidenceStatement(pairOrNode, graph);
  const corrupted = corruptStatement(sourceTruth, corruption);

  if (!isPlausible(corrupted)) return null;
  if (!singleDecisiveChangeOnly(sourceTruth, corrupted)) return null;

  return {
    prompt: corrupted,
    whyItLooksRight: explainPlausibility(sourceTruth, corrupted),
    exactError: locateCorruption(sourceTruth, corrupted),
    correctedTruth: sourceTruth.text,
    evidenceRefs: sourceTruth.refs,
  };
}
```

---

## 27. UI recommendations

### Chapter dashboard
Show:
- chapter title,
- instructor lens,
- chapter spine,
- top confusion pairs,
- retention risk summary.

### Concept view
Each concept card should have tabs:
- explain
- example
- distinguish
- boundary
- instructor use
- source evidence

### Drill view
Allow filtering by:
- recognition,
- discrimination,
- inversion,
- transfer,
- only high-risk items,
- only instructor-priority items.

### Teach-back view
Text area + required key points checklist + self-rating.

### Calibration view
Confidence slider before answer reveal. Store:
- answer correctness,
- confidence,
- overconfidence count,
- underconfidence count.

---

## 28. Storage model

Use IndexedDB for:
- raw text bundles,
- extracted chapters,
- instructor artifacts,
- concept graphs,
- generated learning packs,
- learner history.

Use localStorage only for:
- UI preferences,
- recent pack IDs,
- lightweight session state.

---

## 29. Testing strategy

### Unit tests
- heading detection
- sentence role tagging
- concept alias merging
- relation extraction
- confusion pair scoring
- trap corruption integrity

### Golden tests
Maintain known chapter fixtures and expected outputs:
- top 10 concepts
- expected confusion pairs
- expected instructor alignments
- expected trap outputs

### Human review mode
Add a developer screen that shows:
- raw sentences,
- concept candidates,
- discarded candidates,
- relation evidence,
- confusion scores,
- trap provenance.

This is essential for iterative tuning.

---

## 30. Codex handoff prompt

Paste the following into Codex after placing this spec into the repo.

```text
You are implementing TESSERA v1, a fully deterministic semantic learning engine. Do not use any remote API, hosted model, inference service, or hidden backend. All logic must run locally in TypeScript.

Read the architecture spec in deterministic-semantic-learning-engine-spec.md and implement it as a monorepo with:
- /packages/engine for deterministic text processing,
- /apps/web for the learner-facing UI,
- optional /apps/extension only if instructor artifact capture is needed.

Implementation priorities:
1. Build the type system and zod schemas first.
2. Build CHISEL next: ingestion, normalization, heading detection, sentence role tagging.
3. Build ALIGN next: instructor artifact parsing, chapter pairing, focus profiles.
4. Build LATTICE next: concept extraction, alias merging, salience scoring, relation extraction.
5. Build PRISM next: confusion pair mining, corruption vectors, boundary detection, pressure profiles.
6. Build ANVIL next: chapter spine, concept cards, distinction grid, pressure drills, trap deck, boundary cards, teach-back frames, compression ladder.
7. Build ECHO last: revisit priorities and learner history integration.

Hard constraints:
- no remote fetches except for loading local files selected by the user,
- no API keys,
- no server requirement,
- every generated artifact must preserve evidence references,
- every major heuristic must be implemented as an explicit named function,
- write unit tests and golden tests,
- expose a developer debug panel showing intermediate scoring and discarded candidates.

Use clear module boundaries. Prefer interpretable heuristics over opaque shortcuts. When uncertain, choose debuggability and evidence traceability.
```

---

## 31. Final implementation stance

The strongest truthful claim for TESSERA is:

> A local, deterministic semantic engine that converts textbook and course text into instructor-aligned, evidence-backed, retention-oriented learning modules using explicit graph construction, confusion mining, pressure drills, and compression ladders.

Do **not** claim:
- universal mastery for every genre,
- global proof of novelty,
- parity with large models on open-ended generative explanation.

Do claim:
- no API cost,
- no backend requirement,
- inspectable logic,
- explainable outputs,
- strong performance on structured academic text,
- instructor-aware learning pack generation.


# APPENDIX C — PREVIOUS NEURAL FORGE v4R DETERMINISTIC CODEX SPEC

# NEURAL FORGE v4R — Deterministic Codex Implementation Spec

## Truth boundary

This document turns the provided **Neural Forge** concept into an implementation-grade, deterministic software specification for Codex.
It is designed to be **original in composition and software architecture**, but it does **not** claim provable world-first novelty for every individual mechanic.
What it does provide is a coherent, non-API, local-first engine with explicit variables, data contracts, generation rules, and acceptance criteria.

---

## 1. Mission

Build a **fully deterministic learning engine** that converts captured Canvas text, pasted text, or textbook PDF/TXT content into a complete multi-phase learning experience with:

- no model runtime,
- no API calls,
- no backend,
- no paid infrastructure,
- no hidden generation steps after initial preprocessing.

The system must:

1. ingest chapter-scale educational text,
2. extract concepts, structures, contrasts, examples, objections, and priorities,
3. align those findings to the instructor's demonstrated emphasis,
4. synthesize a complete 5-phase learning session,
5. persist all generated content and learner progress locally,
6. remain fully explainable and reproducible from the input text alone.

---

## 2. Non-negotiable constraints

```ts
export const NON_NEGOTIABLES = {
  noExternalAPIs: true,
  noLLMRuntime: true,
  noServerDependency: true,
  deterministicGeneration: true,
  localPersistenceOnly: true,
  resumableSessions: true,
  sourceGroundedOutputs: true,
  explainableScoring: true,
};
```

### Consequences of these constraints

1. The engine may be **high quality**, but it must not promise human-like open-ended reasoning.
2. Every output must trace back to:
   - source text,
   - deterministic templates,
   - lexical resources bundled with the app,
   - arithmetic or graph-based scoring.
3. “Quality” comes from:
   - better extraction,
   - better alignment,
   - better corruption generation,
   - better distinction mapping,
   - better sequencing,
   - better scaffolding,
   - better calibration.

---

## 3. System identity

**Product name:** `NEURAL FORGE v4R`  
**Engine codename:** `FORGECORE`

`FORGECORE` has seven deterministic subsystems:

1. `SMELT` — normalization and raw-text cleanup
2. `ANVIL` — sectioning and chapter structure detection
3. `MINT` — concept extraction and enrichment
4. `BRAID` — relationship, contrast, and dependency mapping
5. `KILN` — question/content synthesis
6. `RUNTIME` — 5-phase session orchestration
7. `LEDGER` — local persistence, scoring, and resumability

---

## 4. Primary outputs

For each chapter or input text region, FORGECORE must generate:

1. **Concept set**  
   12–18 structured concepts with definitions, details, mnemonics, primers, keywords, categories, and links.

2. **Relationship graph**  
   similarity, contrast, co-occurrence, build-on, objection, example-of, prerequisite.

3. **Instructor emphasis layer**  
   scores indicating which concepts and relations are most likely to matter in the actual course.

4. **Question bank**
   - rapid-fire true/false
   - deep drill MC
   - boss fight MC
   - corrupted statements
   - cross-exam prompts
   - domain transfer scenarios
   - teach-back prompts
   - immersive dilemmas

5. **Session plan**
   - Phase 1: Genesis
   - Phase 2: Forge
   - Phase 3: Crucible
   - Phase 4: Architect
   - Phase 5: Transcend

6. **Mastery and calibration report**
   - score
   - concept mastery map
   - blind spots
   - hidden strengths
   - error pattern analysis
   - review recommendations

---

## 5. Variable registry

All major behavior must be controlled through a single versioned config.

```ts
export type NeuralForgeConfig = {
  engineVersion: string;

  // Input + normalization
  inputModes: ("canvas-html" | "html" | "txt" | "pdf-text" | "json")[];
  normalizeUnicode: boolean;
  stripHeadersFooters: boolean;
  dehyphenateWrappedLines: boolean;
  preserveListMarkers: boolean;
  preserveHeadingMarkers: boolean;
  decodeHtmlEntities: boolean;
  removeRepeatingArtifacts: boolean;
  removeImagePlaceholders: boolean;

  // Section detection
  headingPatternWeights: {
    h1: number;
    h2: number;
    numberedHeading: number;
    capsHeading: number;
    boldHeadingLike: number;
  };
  topicShiftSimilarityThreshold: number;
  minSectionWords: number;
  mergeSectionWordThreshold: number;
  maxSectionWordsBeforeSplit: number;

  // Concept extraction
  minConceptCount: number;
  maxConceptCount: number;
  tfidfTopPercentile: number;
  minTermFrequency: number;
  minPhraseFrequency: number;
  maxNgramLength: 3;
  explicitDefinitionWeight: number;
  typographicTermWeight: number;
  tfidfWeight: number;
  frameworkPatternWeight: number;
  instructorFocusWeight: number;
  sectionTitleWeight: number;
  repeatedAcrossSectionsWeight: number;

  // Concept normalization
  enableStemMerge: boolean;
  enableAliasMerge: boolean;
  acronymMerge: boolean;
  maxCanonicalNameWords: number;
  relatedKeywordOverlapThreshold: number;
  oppositeKeywordWindowSentences: number;

  // Mnemonic synthesis
  mnemonicTemplateOrder: string[];
  enableRhymeDictionary: boolean;
  enableSynonymDictionary: boolean;
  enableNumberHooks: boolean;
  enableContrastAnchors: boolean;

  // Relationship mapping
  keywordJaccardThreshold: number;
  minParagraphCooccurrence: number;
  hierarchyReferenceWeight: number;
  contrastCueWeight: number;
  cooccurrenceWeight: number;
  keywordOverlapWeight: number;
  objectionCueWeight: number;
  exampleCueWeight: number;
  maxEdgesPerConcept: number;

  // Instructor alignment
  alignAssignments: boolean;
  alignDiscussions: boolean;
  alignRubrics: boolean;
  alignModuleText: boolean;
  instructorVerbWeight: number;
  instructorNounWeight: number;
  rubricCriteriaWeight: number;
  promptQuestionWeight: number;
  dueSoonBonusWeight: number;

  // Question generation counts
  rapidFireCount: number;
  deepDrillCount: number;
  bossFightCount: number;
  corruptionCount: number;
  crossExamCount: number;
  domainTransferCount: number;
  teachBackCount: number;
  dilemmaCount: number;

  // Difficulty distribution
  deepDrillEasyCount: number;
  deepDrillMediumCount: number;
  deepDrillHardCount: number;
  bossFightEasyCount: number;
  bossFightMediumCount: number;
  bossFightHardCount: number;

  // Timing
  phaseMinutes: number;
  timerModeDefault: "advisory" | "strict" | "hidden";
  pauseOnVisibilityHidden: boolean;

  // Scoring
  forgeWeight: number;
  crucibleWeight: number;
  transcendWeight: number;
  selfRatedSuccessWeight: number;
  conceptMasteryCorrectDelta: number;
  conceptMasteryWrongDelta: number;
  conceptMasterySelfRatedDelta: number;
  blindSpotConfidenceThreshold: number;
  hiddenStrengthConfidenceThreshold: number;

  // Persistence
  saveToIndexedDB: boolean;
  saveProgressToLocalStorage: boolean;
  autosaveDebounceMs: number;
  exportFormat: "json";
};
```

---

## 6. Input contract

FORGECORE accepts three classes of inputs:

### 6.1 Primary content
The main text to learn from.

```ts
export type PrimaryInput = {
  sourceId: string;
  sourceType: "canvas-page" | "canvas-assignment" | "canvas-module" | "pdf-text" | "txt" | "manual-paste";
  title: string;
  rawText?: string;
  rawHtml?: string;
  pageAnchors?: { page: number; charStart: number; charEnd: number }[];
};
```

### 6.2 Instructor-focus artifacts
These bias what the engine emphasizes.

```ts
export type InstructorArtifact = {
  artifactId: string;
  artifactType: "assignment" | "discussion" | "rubric" | "module-overview" | "announcement" | "study-guide";
  title: string;
  text: string;
  dueAt?: string;
  pointsPossible?: number;
};
```

### 6.3 Engine bundle resources
Bundled static resources used algorithmically.

```ts
export type LexicalBundle = {
  stopWords: string[];
  synonymPairs?: Record<string, string[]>;
  rhymeMap?: Record<string, string[]>;
  philosopherNames?: string[];
  frameworkSuffixes: string[];
  objectionCues: string[];
  contrastCues: string[];
  sequenceCues: string[];
  definitionCues: string[];
  qualifierWords: string[];
  academicActionVerbs: string[];
};
```

---

## 7. Top-level data model

```ts
export interface Section {
  id: string;
  title: string;
  text: string;
  wordCount: number;
  startIndex: number;
  endIndex: number;
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  derivedTitle: boolean;
  sourceAnchors?: { page?: number; charStart: number; charEnd: number }[];
}

export interface Concept {
  id: string;
  name: string;
  canonicalName: string;
  aliases: string[];
  category: string;
  sourceSectionId: string;
  rankScore: number;
  extractionEvidence: {
    explicitDefinition: boolean;
    typographicTerm: boolean;
    tfidfCandidate: boolean;
    frameworkPattern: boolean;
    instructorAligned: boolean;
  };
  core: string;
  detail: string;
  primer: string;
  mnemonic: string;
  keywords: string[];
  relatedConceptIds: string[];
  oppositeConceptIds: string[];
  instructorFocusScore: number;
  frequencyScore: number;
  definitionScore: number;
  spreadScore: number;
}

export interface Relationship {
  id: string;
  fromId: string;
  toId: string;
  type: "overlap" | "cooccurrence" | "contrast" | "builds-on" | "objection" | "example-of" | "prerequisite";
  label: string;
  strength: number;
  evidenceText?: string;
}

export interface TrueFalseItem {
  id: string;
  conceptId: string;
  statement: string;
  answer: boolean;
  generationMethod: "true-simplify" | "term-swap" | "negation" | "attribute-swap" | "exaggeration" | "category-error";
  why: string;
  difficulty: "easy" | "medium";
}

export interface MultipleChoiceItem {
  id: string;
  conceptIds: string[];
  type:
    | "definition-match"
    | "philosopher-attribution"
    | "compare-contrast"
    | "application-scenario"
    | "negation-check"
    | "fill-framework"
    | "cause-effect"
    | "objection-match"
    | "example-identification"
    | "sequence-process"
    | "terminology-precision"
    | "synthesis";
  stem: string;
  primer: string;
  options: { id: string; text: string }[];
  correctOptionId: string;
  explanation: string;
  wrongExplanations: Record<string, string>;
  difficulty: "easy" | "medium" | "hard";
}

export interface CorruptionItem {
  id: string;
  conceptIds: string[];
  level: 1 | 2 | 3 | 4 | 5;
  statement: string;
  error: string;
  correct: string;
  hint: string;
}

export interface CrossExamItem {
  id: string;
  conceptId: string;
  challenge: string;
  hint: string;
  rebuttal: string;
  objectionEvidence?: string;
}

export interface DomainTransferItem {
  id: string;
  conceptIds: string[];
  domain: string;
  scenario: string;
  question: string;
  analysis: string;
}

export interface TeachBackItem {
  id: string;
  conceptIds: string[];
  prompt: string;
  keyPoints: string[];
  keywordChecks: string[][];
}

export interface DilemmaChoice {
  id: string;
  label: "A" | "B" | "C";
  text: string;
  framework: "consequentialist" | "deontological" | "virtue";
  reasoning: string;
  mappedConceptId?: string;
}

export interface DilemmaItem {
  id: string;
  title: string;
  scenario: string;
  choices: DilemmaChoice[];
  insightByChoice: Record<string, string>;
}

export interface ChapterData {
  id: string;
  title: string;
  sourceWordCount: number;
  generatedAt: number;
  normalizedText: string;
  sections: Section[];
  concepts: Concept[];
  relationships: Relationship[];
  dilemmas: DilemmaItem[];
  rapidFire: TrueFalseItem[];
  deepDrill: MultipleChoiceItem[];
  corruptions: CorruptionItem[];
  crossExam: CrossExamItem[];
  domainTransfer: DomainTransferItem[];
  teachBack: TeachBackItem[];
  bossFight: MultipleChoiceItem[];
  instructorArtifacts: InstructorArtifact[];
}
```

---

## 8. Pipeline overview

```text
INPUT
  ├─ primary text
  ├─ Canvas-captured content
  └─ instructor artifacts
      ↓
SMELT   — normalize and clean
      ↓
ANVIL   — detect sections and structure
      ↓
MINT    — extract and enrich concepts
      ↓
BRAID   — map relationships and contrasts
      ↓
KILN    — generate all learning assets
      ↓
ASSEMBLE ChapterData
      ↓
LEDGER persistence
      ↓
RUNTIME 5-phase session
      ↓
Mastery + calibration report
```

---

## 9. Stage A — SMELT (text normalizer)

### Goal
Convert HTML or text into clean, structurally annotated plaintext.

### Inputs
- `rawHtml` or `rawText`
- config
- lexical bundle

### Rules

1. Strip HTML tags while preserving structure:
   - `<h1>..</h1>` → `[H1]...[/H1]`
   - `<h2>..</h2>` → `[H2]...[/H2]`
   - ...
   - `<li>` → `[LI] ...`
   - `<p>` boundaries → double newline
2. Decode HTML entities.
3. Normalize unicode:
   - curly quotes → straight quotes
   - en/em dash → `-` for processing layer
   - preserve display-safe copy separately if desired
4. Collapse excess whitespace.
5. Remove artifacts:
   - isolated page numbers
   - repeated headers/footers
   - obvious copyright boilerplate
   - image placeholders like `[image]`, `[figure 3.2]`
6. Dehyphenate wrapped line breaks from PDF text extraction.
7. Preserve structural markers for headings and lists.

### Output
- `normalizedText`
- optional `originalFormattingHints` if needed for term extraction

### Pseudocode

```ts
function normalizeInput(input: PrimaryInput, config: NeuralForgeConfig): string {
  const raw = input.rawHtml ? htmlToMarkedText(input.rawHtml) : (input.rawText ?? "");
  let text = decodeEntities(raw);
  if (config.normalizeUnicode) text = normalizeUnicode(text);
  if (config.dehyphenateWrappedLines) text = dehyphenateWrappedLines(text);
  text = collapseWhitespacePreserveParagraphs(text);
  if (config.removeRepeatingArtifacts) text = stripRepeatingArtifacts(text);
  if (config.removeImagePlaceholders) text = stripImageMarkers(text);
  return text.trim();
}
```

---

## 10. Stage B — ANVIL (section detector)

### Goal
Split normalized text into major sections.

### Detection order

1. Explicit heading markers `[H1]`, `[H2]`, `[H3]`
2. Numbered headings:
   - `^\d+\.\s+[A-Z]`
   - `^[IVX]+\.\s+`
3. heading-like short lines:
   - title case or upper case
   - short length
   - surrounded by paragraph breaks
4. topic-shift fallback:
   - paragraph-level term-frequency vectors
   - cosine similarity between adjacent paragraph windows
   - split when similarity drops below threshold

### Merge/split rules

- merge sections under `mergeSectionWordThreshold` with nearest semantic neighbor,
- split sections over `maxSectionWordsBeforeSplit` at subheadings or large topic-shift points.

### Title derivation fallback

If no title exists:
- use the highest-scoring noun phrase from the first 2 sentences,
- cap title to `maxCanonicalNameWords`.

### Output
`Section[]`

---

## 11. Stage C — Instructor-focus extraction and alignment

### Goal
Model what the instructor likely cares about.

### Sources
- assignments
- discussions
- rubrics
- module text
- study guides
- announcements

### Extraction

For each instructor artifact:
1. tokenize,
2. extract:
   - academic action verbs,
   - repeated noun phrases,
   - rubric criteria,
   - question stems,
   - command verbs,
   - due-soon priority signal.

### Build emphasis lexicon

```ts
export interface InstructorFocusLexicon {
  weightedTerms: Record<string, number>;
  weightedVerbs: Record<string, number>;
  weightedNouns: Record<string, number>;
  rubricSignals: Record<string, number>;
  promptTypes: Record<string, number>;
}
```

### Alignment score

For each concept:
- compare its keywords and definition terms against instructor lexicon,
- compare its section title against artifact titles,
- compare its role in assignments/discussions by verb overlap.

#### Formula

```ts
concept.instructorFocusScore =
  overlapScore(concept.keywords, focus.weightedTerms) * config.instructorNounWeight +
  overlapScore(extractVerbs(concept.core + " " + concept.detail), focus.weightedVerbs) * config.instructorVerbWeight +
  rubricAlignment(concept, focus) * config.rubricCriteriaWeight +
  promptAlignment(concept, focus) * config.promptQuestionWeight;
```

This score reorders concepts, question selection, and review priority.

---

## 12. Stage D — MINT (concept extractor)

### Goal
Identify the core chapter concepts and enrich them.

### 12.1 Extraction methods

Run all methods, then merge.

#### Method 1 — explicit definition patterns
Use regex families for textbook definitional prose.

```ts
const DEFINITION_PATTERNS = [
  /(?:^|\. )([A-Z][a-z]+(?: [A-Z]?[a-z]+)*) (?:is|are|refers to|means|can be defined as|is defined as|is the (?:view|idea|theory|belief|claim|principle|concept|notion) that) ([^.]+\.)/gm,
  /([A-Z][a-z]+(?: [a-z]+){0,4})[:\-] ([^.]+\.)/gm,
];
```

#### Method 2 — typographic term extraction
From original HTML, harvest text in:
- `<strong>`
- `<b>`
- `<em>`
- `<i>`

Filter out:
- sentence-initial emphasis,
- citation surnames,
- decorative labels.

#### Method 3 — TF-IDF lite
1. tokenize and stop-word filter
2. build unigram, bigram, trigram counts
3. compute section-aware IDF
4. keep terms in top percentile and above frequency floor
5. attach first relevant sentence as contextual definition

#### Method 4 — framework suffix patterns
Match terms ending with:
- theory
- approach
- framework
- principle
- argument
- objection
- dilemma
- paradox
- fallacy
- doctrine
- view
- thesis
- hypothesis
- law
- rule
- imperative
- formula
- critique

#### Method 5 — instructor-weighted candidate boost
If a term appears in both:
- source chapter, and
- instructor artifacts,
it receives an extraction bonus.

### 12.2 Deduplication

Merge candidate concepts when:
- lowercase strings match,
- stems match,
- acronym/alias mapping suggests equivalence,
- one is a parenthetical alias of another.

### 12.3 Ranking

Rank score:

```ts
rankScore =
  explicitDefinition * config.explicitDefinitionWeight +
  typographicTerm * config.typographicTermWeight +
  tfidfScore * config.tfidfWeight +
  frameworkPattern * config.frameworkPatternWeight +
  instructorFocusScore * config.instructorFocusWeight +
  headingPresence * config.sectionTitleWeight +
  spreadAcrossSections * config.repeatedAcrossSectionsWeight;
```

Select top `minConceptCount..maxConceptCount` with diversity guard:
- do not allow more than 40% of concepts from one section unless the chapter is truly concentrated.

---

## 13. Concept enrichment rules

For each selected concept, derive:

### `core`
- first or best definition sentence,
- max 2 sentences.

### `detail`
- containing paragraph,
- trimmed to 2–3 sentences,
- include the following sentence if it adds example or elaboration.

### `primer`
A short context nudge used later in Deep Drill and Boss Fight.

Template priorities:
1. `This concept relates to [primary noun phrase].`
2. `Think about how [concept] explains [action/outcome].`
3. `This idea matters when asking whether [contrast or issue].`

### `keywords`
- non-stop words,
- noun phrases,
- high-salience verbs,
- repeated technical terms.

### `relatedConceptIds`
- keyword overlap above threshold,
- or relationship graph link.

### `oppositeConceptIds`
Extract from contrastive patterns:
- `unlike X`
- `in contrast to X`
- `X differs from Y`
- `whereas X`
- `X vs Y`
- `X versus Y`

---

## 14. Deterministic mnemonic generator

### Goal
Produce “good enough” retention hooks without pretending to be poetic.

### Template families

1. **Acronym Builder**
2. **Rule Analogy**
3. **Person-at-Dinner-Party**
4. **Distinction Anchor**
5. **Contrast Anchor**
6. **Number Hook**
7. **Visual Scene**
8. **Qualifier Trap Hook**
9. **Everyday Swap**
10. **If-Then Handle**

### Selection priority

1. If concept has opposites → `Contrast Anchor`
2. Else if name has 3+ words → `Acronym Builder`
3. Else if definition contains number → `Number Hook`
4. Else if associated with person → `Person-at-Dinner-Party`
5. Else if definition contains strong qualifier words → `Qualifier Trap Hook`
6. Else deterministic rotation by concept index modulo available templates

### Example output style
- `Doctrine of the Mean -> DOM: think “balanced structure,” meaning virtue sits between extremes.`
- `Categorical Imperative -> Not "what works," but "what rule could everyone follow?"`

---

## 15. Stage E — BRAID (relationship mapper)

### Goal
Construct an interpretable concept graph.

### Relationship types

1. `overlap`
2. `cooccurrence`
3. `contrast`
4. `builds-on`
5. `objection`
6. `example-of`
7. `prerequisite`

### Generation rules

#### Overlap
Use Jaccard similarity over `keywords`.

#### Cooccurrence
If concepts appear in the same paragraph >= threshold times.

#### Contrast
Use cue phrases and opposite extraction.

#### Builds-on
If Concept A's definition references Concept B.

#### Objection
If concept is directly followed by objection cues and critique language.

#### Example-of
If paragraph patterns say:
- `for example`
- `for instance`
- `such as`
- `consider`

#### Prerequisite
If sequence language suggests the learner must understand B before A:
- `before`
- `first understand`
- `requires`
- `depends on`

### Strength scoring

```ts
strength =
  keywordOverlapScore * config.keywordOverlapWeight +
  cooccurrenceScore * config.cooccurrenceWeight +
  contrastCueScore * config.contrastCueWeight +
  hierarchyScore * config.hierarchyReferenceWeight +
  objectionCueScore * config.objectionCueWeight +
  exampleCueScore * config.exampleCueWeight;
```

Keep top `maxEdgesPerConcept` edges.

---

## 16. Stage F — KILN (content synthesis)

KILN creates all assets for the five learning phases.

---

## 17. KILN-A — Rapid Fire true/false generator

### Target
`rapidFireCount` items with roughly 50/50 true/false balance.

### True generation
- simplify concept core into direct declarative statement,
- remove hedging and attribution when possible,
- preserve correctness.

### False generation methods
1. term swap
2. negation insertion/removal
3. attribute swap
4. exaggeration/absolutization
5. category error

### Why explanation
Every item must include a micro-lesson, not just verdict.

### Selection rule
- draw from high instructor-focus concepts first,
- ensure coverage across at least 60% of selected concepts.

---

## 18. KILN-B — Multiple choice generator

### Supported types
1. definition-match
2. philosopher-attribution
3. compare-contrast
4. application-scenario
5. negation-check
6. fill-framework
7. cause-effect
8. objection-match
9. example-identification
10. sequence-process
11. terminology-precision
12. synthesis

### Difficulty mapping
- easy: 1, 2, 3
- medium: 4, 5, 6, 7, 8
- hard: 9, 10, 11, 12

### Deep Drill composition
- easy: `deepDrillEasyCount`
- medium: `deepDrillMediumCount`
- hard: `deepDrillHardCount`

### Boss Fight composition
- easy: `bossFightEasyCount`
- medium: `bossFightMediumCount`
- hard: `bossFightHardCount`

### Wrong option construction
Wrong choices must be:
- plausible,
- concept-adjacent,
- non-random,
- explainable.

#### Distractor rules
1. use sibling concept definitions,
2. invert qualifiers,
3. blend related concepts,
4. reverse contrast relationships,
5. pull examples from the wrong framework.

### Boss Fight special rule
At least 40% of boss fight questions must span 2+ concepts.

---

## 19. KILN-C — Corruption generator

### Target
`corruptionCount` items.

### Corruption levels
1. wrong framework
2. reversed relationship
3. subtle attribute swap
4. correct fact, wrong implication
5. single-word qualifier corruption

### Hint rule
Hints should direct attention without giving away the answer:
- philosopher attribution
- qualifier precision
- comparison direction
- domain label
- implication leap

### Escalation rule
Corruptions must ramp from obvious to subtle.

---

## 20. KILN-D — Cross-exam generator

### Goal
Stress-test understanding against objections.

### Source strategy
1. extract explicit objections from source text,
2. if absent, generate structural objections from known limitations and scope clauses.

### Challenge template
`Someone argues: "[objection in confident form]." How would a defender of [concept] respond?`

### Rebuttal
Prefer source-grounded rebuttal extracted from subsequent text.
Fallback:
- reconstruct rebuttal from concept core + contrast + limitation text.

---

## 21. KILN-E — Domain transfer generator

### Goal
Force application outside the textbook’s original examples.

### Domain bank
Must include at least:
- AI ethics
- social media
- medical ethics
- climate policy
- workplace ethics
- education policy
- criminal justice
- data privacy
- genetics
- economic justice
- public health
- platform governance
- policing
- journalism
- corporate governance
- military ethics
- environmental stewardship
- school discipline
- labor relations
- civic decision-making

### Scenario generation
Use domain templates filled with verbs, values, tensions, and tradeoffs extracted from chapter concepts.

### Analysis template
- apply framework A,
- contrast with framework B,
- optionally show a third “character/virtue” angle.

---

## 22. KILN-F — Teach-back generator

### Selection
Choose top concepts by:
- rank score,
- graph centrality,
- instructor focus score.

### Prompt types
1. explain to a beginner
2. correct a misconception
3. compare two concepts
4. apply to a real-world situation

### Key point extraction
Take 3–4 must-mention points from:
- core definition,
- detail,
- linked relationships.

### Keyword check enhancement
Each key point maps to 2–3 lexical evidence strings or stems.
The runtime checks whether the student's typed response contains them.

This is **not** grading prose quality.
It is a deterministic “did you mention the essentials?” check.

---

## 23. KILN-G — Immersive dilemma generator

### Goal
Make students reason before formal labeling.

### Requirement
Each dilemma must offer exactly 3 options mapped to:
- consequentialist
- deontological
- virtue

### Generation steps
1. find the chapter’s main tension from contrastive structures,
2. map tension onto one everyday scenario shell,
3. fill 3 options using framework templates,
4. connect each option to an extracted concept where possible,
5. generate insight text after choice.

### Scenario shell examples
- workplace discovery
- friend request conflict
- public policy tradeoff
- classroom fairness issue
- medical triage decision
- online privacy conflict
- loyalty vs honesty tension

### Insight template
`You just engaged in [framework] reasoning — you prioritized [framework priority]. This connects to [concept], which the chapter describes as [compressed core].`

---

## 24. Assembly rules

All generated assets are assembled into `ChapterData`.

### Validity requirements
Before saving a chapter:
1. concept count must meet minimum,
2. every phase must have enough items,
3. every question must have:
   - explanation,
   - linked concept IDs,
   - deterministic provenance,
4. no question may have duplicate options,
5. no corrupted statement may exactly equal a true statement.

### Fallback strategy
If a generator underproduces:
1. retry with relaxed thresholds,
2. broaden source windows,
3. reduce counts only as final fallback while logging deficiency.

---

## 25. Runtime architecture

The runtime never regenerates content unless the source changes.

```ts
export interface LearningSessionState {
  chapterId: string;
  currentPhase: 1 | 2 | 3 | 4 | 5;
  currentSubMode: string;
  currentIndex: number;
  phaseStartedAt: number;
  totalElapsedMs: number;
  timerMode: "advisory" | "strict" | "hidden";

  seenConceptIds: string[];
  learnedConceptIds: string[];
  completedSubModes: string[];

  forgeScore: { correct: number; wrong: number };
  transcendResults: {
    questionId: string;
    confidence: 1 | 2 | 3 | 4 | 5;
    selectedOptionId: string;
    correct: boolean;
    metaReason?: "never-learned" | "confused-concepts" | "overthought" | "misremembered";
  }[];

  crucibleSelfRatings: {
    itemId: string;
    phase: "spot-the-lie" | "cross-exam" | "domain-transfer" | "teach-back";
    rating: "missed" | "partial" | "nailed";
  }[];

  conceptMastery: Record<string, number>;
  lastSavedAt: number;
}
```

---

## 26. Phase runtime behavior

### Phase 1 — Genesis
#### Sub-mode A: Immersive dilemmas
- student chooses one of three options,
- reveal mapped framework and all three labels,
- accumulate natural-framework counts.

#### Sub-mode B: Concept scan
- concept card flip,
- front: `name + core`
- back: `detail + mnemonic`
- advance only after all concepts seen.

### Phase 2 — Forge
#### Rapid Fire
- immediate correctness,
- explanation,
- streak tracking.

#### Deep Drill
- primer appears above stem,
- `Learn First` reveals concept card for linked concept,
- no penalty for using it.

### Phase 3 — Crucible
- hub with 3 sub-modes:
  - spot the lie,
  - cross-exam,
  - domain transfer.
- each item ends in self-rating.

### Phase 4 — Architect
- teach-back textarea,
- reveal key points,
- lexical evidence check,
- self-rating.

### Phase 5 — Transcend
- confidence before options,
- answer,
- explanation,
- blind-spot / hidden-strength detection,
- wrong answers require meta-reason selection.

---

## 27. Scoring model

### 27.1 Forge score
```ts
forgePct = correct / total;
```

### 27.2 Crucible score
Map self-ratings:
- missed = 0
- partial = 0.5
- nailed = 1

```ts
cruciblePct = sum(ratingValues) / totalItems;
```

### 27.3 Transcend score
```ts
transcendPct = correct / total;
```

### 27.4 Overall mastery
```ts
overallMastery =
  forgePct * config.forgeWeight +
  cruciblePct * config.crucibleWeight +
  transcendPct * config.transcendWeight;
```

Default weights:
- Forge 0.25
- Crucible 0.25
- Transcend 0.50

### 27.5 Letter grade
- S: >= 0.90
- A: >= 0.80
- B: >= 0.70
- C: >= 0.60
- D: < 0.60

### 27.6 Calibration metrics

#### Blind spots
Wrong answers with confidence >= `blindSpotConfidenceThreshold`

#### Hidden strengths
Correct answers with confidence <= `hiddenStrengthConfidenceThreshold`

#### Well-calibrated
- correct and confidence >= 3
- wrong and confidence <= 2

```ts
calibrationPct = wellCalibrated / totalBossFightQuestions;
```

---

## 28. Concept mastery map

Each interaction updates concept mastery.

### Deltas
- correct objective item: `+conceptMasteryCorrectDelta`
- wrong objective item: `-conceptMasteryWrongDelta`
- self-rated nailed in Crucible/Architect: `+conceptMasterySelfRatedDelta`
- self-rated missed: optional `-0.25 * conceptMasteryWrongDelta`

### Color mapping
- green: mastery >= 2
- yellow: mastery 0 to < 2
- red: mastery < 0

### Review recommendation rule
List all red concepts ordered by:
1. instructor focus score,
2. negative mastery magnitude,
3. graph centrality.

---

## 29. Persistence model

### IndexedDB stores
1. `chapter_data`
2. `session_progress`
3. `settings`
4. `generation_logs`

### LocalStorage stores
- last-opened chapter
- resume prompt flags
- lightweight UI prefs

### Resume rule
On load:
1. check unfinished session,
2. prompt:
   - `Resume where you left off`
   - `Start fresh`

### Export
JSON export must include:
- config version,
- chapter data,
- progress,
- timestamp.

---

## 30. Deterministic provenance logging

Every generated asset should optionally retain provenance so the app can explain where it came from.

```ts
export interface Provenance {
  sourceSectionIds: string[];
  evidenceSentences: string[];
  generator: string;
  generatorMethod: string;
}
```

Examples:
- concept from explicit definition in section 3,
- corruption from qualifier swap on sentence 12,
- cross-exam challenge from objection paragraph in section 5.

This improves debuggability and trust.

---

## 31. Implementation repo layout

```text
/apps
  /web
    /src
      /components
      /pages
      /state
      /styles
      /workers

/packages
  /forgecore
    /src
      /config
      /types
      /lexicon
      /normalize      // SMELT
      /section        // ANVIL
      /instructor     // focus extraction
      /concept        // MINT
      /relations      // BRAID
      /generate       // KILN
      /runtime
      /score
      /storage
      /provenance
      /utils

/test-fixtures
  /chapters
  /instructor-artifacts
  /expected-minimums
```

---

## 32. Suggested implementation order for Codex

1. shared types
2. config loader + defaults
3. SMELT normalizer
4. ANVIL section detector
5. instructor-focus extractor
6. MINT concept extraction
7. mnemonic generator
8. BRAID relationships
9. true/false generation
10. multiple-choice generation
11. corruption generation
12. cross-exam generation
13. domain transfer generation
14. teach-back generation
15. dilemma generation
16. ChapterData assembler
17. IndexedDB persistence
18. runtime phase state machine
19. scoring + calibration dashboard
20. UI polish and accessibility

Do **not** start with UI. Build the deterministic core first.

---

## 33. Acceptance criteria

A build is acceptable only if:

1. it runs fully offline after initial asset load,
2. it can ingest TXT and already-extracted PDF text,
3. it produces at least:
   - 10 concepts,
   - 10 rapid-fire items,
   - 12 deep drill items,
   - 4 corruptions,
   - 3 cross-exams,
   - 3 domain transfers,
   - 3 teach-back prompts,
   - 10 boss fight questions,
   - 3 dilemmas,
4. every generated question links to at least one concept,
5. every objective question has an explanation,
6. every phase is resumable after reload,
7. final report computes score, grade, mastery map, blind spots, hidden strengths, and review recommendations,
8. all outputs are reproducible from the same input + config.

---

## 34. Known limits

### Verified boundary
This is a deterministic engine, not a semantic oracle.

### It will be strongest at:
- expository prose,
- theory-heavy chapters,
- clear definitional textbooks,
- instructor materials with explicit prompts.

### It will be weaker at:
- highly implicit literature,
- sparse lecture transcripts,
- badly extracted PDF text,
- domains requiring domain-expert world knowledge not present in the text.

The system should surface these limits honestly instead of hallucinating depth.

---

## 35. Default config suggestion

```ts
export const DEFAULT_NEURAL_FORGE_CONFIG: NeuralForgeConfig = {
  engineVersion: "v4R.1",
  inputModes: ["canvas-html", "html", "txt", "pdf-text", "json"],
  normalizeUnicode: true,
  stripHeadersFooters: true,
  dehyphenateWrappedLines: true,
  preserveListMarkers: true,
  preserveHeadingMarkers: true,
  decodeHtmlEntities: true,
  removeRepeatingArtifacts: true,
  removeImagePlaceholders: true,

  headingPatternWeights: { h1: 1.0, h2: 0.9, numberedHeading: 0.8, capsHeading: 0.6, boldHeadingLike: 0.55 },
  topicShiftSimilarityThreshold: 0.30,
  minSectionWords: 50,
  mergeSectionWordThreshold: 50,
  maxSectionWordsBeforeSplit: 900,

  minConceptCount: 12,
  maxConceptCount: 18,
  tfidfTopPercentile: 0.95,
  minTermFrequency: 3,
  minPhraseFrequency: 2,
  maxNgramLength: 3,
  explicitDefinitionWeight: 4.0,
  typographicTermWeight: 2.5,
  tfidfWeight: 2.0,
  frameworkPatternWeight: 1.8,
  instructorFocusWeight: 2.5,
  sectionTitleWeight: 1.2,
  repeatedAcrossSectionsWeight: 1.6,

  enableStemMerge: true,
  enableAliasMerge: true,
  acronymMerge: true,
  maxCanonicalNameWords: 6,
  relatedKeywordOverlapThreshold: 0.30,
  oppositeKeywordWindowSentences: 3,

  mnemonicTemplateOrder: [
    "contrast-anchor",
    "acronym-builder",
    "number-hook",
    "person-dinner-party",
    "qualifier-trap-hook",
    "visual-scene",
    "if-then-handle"
  ],
  enableRhymeDictionary: true,
  enableSynonymDictionary: true,
  enableNumberHooks: true,
  enableContrastAnchors: true,

  keywordJaccardThreshold: 0.20,
  minParagraphCooccurrence: 2,
  hierarchyReferenceWeight: 1.2,
  contrastCueWeight: 1.8,
  cooccurrenceWeight: 1.3,
  keywordOverlapWeight: 1.0,
  objectionCueWeight: 1.4,
  exampleCueWeight: 1.0,
  maxEdgesPerConcept: 6,

  alignAssignments: true,
  alignDiscussions: true,
  alignRubrics: true,
  alignModuleText: true,
  instructorVerbWeight: 1.4,
  instructorNounWeight: 1.2,
  rubricCriteriaWeight: 1.3,
  promptQuestionWeight: 1.1,
  dueSoonBonusWeight: 0.4,

  rapidFireCount: 10,
  deepDrillCount: 12,
  bossFightCount: 10,
  corruptionCount: 4,
  crossExamCount: 3,
  domainTransferCount: 3,
  teachBackCount: 3,
  dilemmaCount: 3,

  deepDrillEasyCount: 4,
  deepDrillMediumCount: 5,
  deepDrillHardCount: 3,
  bossFightEasyCount: 2,
  bossFightMediumCount: 4,
  bossFightHardCount: 4,

  phaseMinutes: 20,
  timerModeDefault: "advisory",
  pauseOnVisibilityHidden: true,

  forgeWeight: 0.25,
  crucibleWeight: 0.25,
  transcendWeight: 0.50,
  selfRatedSuccessWeight: 0.5,
  conceptMasteryCorrectDelta: 1,
  conceptMasteryWrongDelta: 1,
  conceptMasterySelfRatedDelta: 0.5,
  blindSpotConfidenceThreshold: 4,
  hiddenStrengthConfidenceThreshold: 2,

  saveToIndexedDB: true,
  saveProgressToLocalStorage: true,
  autosaveDebounceMs: 400,
  exportFormat: "json",
};
```

---

## 36. Codex handoff prompt

Use the block below as the first handoff to Codex.

```text
You are implementing NEURAL FORGE v4R as a deterministic, local-first learning engine.

Hard constraints:
- no APIs
- no LLMs
- no backend
- no network calls after initial load
- TypeScript only for core engine
- all outputs must be traceable to source text + deterministic templates
- persist generated chapter data and progress locally

Build order:
1. create shared types exactly from the spec
2. create config defaults and validator
3. implement SMELT normalizer
4. implement ANVIL section detector
5. implement instructor-focus extraction
6. implement MINT concept extraction + ranking + enrichment
7. implement BRAID relationship graph
8. implement KILN generators in this order:
   a. rapidFire
   b. deepDrill
   c. bossFight
   d. corruptions
   e. crossExam
   f. domainTransfer
   g. teachBack
   h. dilemmas
9. implement ChapterData assembler
10. implement IndexedDB + localStorage persistence
11. implement runtime state machine for the 5 phases
12. implement scoring, calibration, mastery map, and final report

Quality rules:
- prefer source-grounded outputs over forced coverage
- if a generator underproduces, retry with relaxed thresholds before reducing counts
- every question must include explanation text
- every generated item must include linked concept IDs
- maintain deterministic provenance for debugging

Deliverables:
- monorepo scaffold
- core engine package
- test fixtures
- at least one end-to-end demo chapter
- no placeholder functions unless marked TODO with exact next step
```

---

## 37. Stop conditions

Stop improving the architecture when:
1. every generator is deterministic and implemented,
2. provenance exists for major outputs,
3. the same input/config reproduces the same `ChapterData`,
4. runtime sessions resume correctly,
5. the final report changes actionably when learner performance changes.

At that point, further changes should focus on:
- UI refinement,
- better bundled lexical resources,
- better PDF text extraction quality,
- more precise distractor rules,
not architectural sprawl.


# APPENDIX D — TESSERA CONFIG TEMPLATE

```json
{
  "engineVersion": "1.0.0",
  "inputModes": ["pdf", "txt", "html", "json"],
  "pdfExtractionMode": "text-layer-first",
  "preservePageAnchors": true,
  "normalizeUnicode": true,
  "stripHeadersFooters": true,
  "dehyphenateLines": true,
  "minChapterChars": 2500,
  "minSectionChars": 500,
  "maxSectionCharsBeforeSplit": 7000,
  "headingScoreThreshold": 0.66,
  "sentenceWindowRadius": 2,
  "maxConceptsPerChapter": 24,
  "minConceptFrequency": 2,
  "minConceptSpreadSections": 2,
  "allowAcronymMerging": true,
  "allowParentheticalAliasMerging": true,
  "nounPhraseMaxTokens": 5,
  "weightFrequency": 1.1,
  "weightHeadingPresence": 1.4,
  "weightDefinitionSignal": 1.6,
  "weightSectionSpread": 1.2,
  "weightTypographicEmphasis": 0.8,
  "weightExampleDensity": 0.7,
  "weightContrastDensity": 1.0,
  "weightInstructorAlignment": 1.8,
  "weightAssessmentVerbAlignment": 1.3,
  "instructorArtifactsEnabled": true,
  "chapterPairingMode": "hybrid",
  "instructorVerbWeight": 1.3,
  "instructorNounWeight": 1.1,
  "instructorRubricWeight": 1.6,
  "instructorPromptWeight": 1.5,
  "maxEdgesPerConcept": 8,
  "relationScoreThreshold": 0.52,
  "prerequisiteCueWeight": 1.2,
  "contrastCueWeight": 1.4,
  "exampleCueWeight": 0.8,
  "causeCueWeight": 1.0,
  "exceptionCueWeight": 1.2,
  "confusionPairThreshold": 0.61,
  "lexicalSimilarityWeight": 0.9,
  "cooccurrenceWeight": 1.2,
  "contrastSignalWeight": 1.0,
  "siblingCategoryWeight": 1.1,
  "trapCorruptionRate": 0.18,
  "chapterSpineConceptCount": 7,
  "conceptCardCountTarget": 12,
  "pressureDrillCountPerConcept": 4,
  "transferScenarioCount": 3,
  "teachBackPromptCount": 3,
  "compressionLadderEnabled": true,
  "revisitSpacingSteps": [1, 3, 6, 10],
  "highRiskRevisitMultiplier": 1.5,
  "underconfidencePriorityBoost": 1.2,
  "overconfidencePriorityBoost": 1.6,
  "showEvidenceSentences": true,
  "requireUserConfirmationForLowConfidencePairs": true,
  "allowManualConceptMerge": true,
  "allowManualChapterReassignment": true
}

```

# APPENDIX E — NEURAL FORGE v4R CONFIG TEMPLATE

```json
{
  "engineVersion": "v4R.1",
  "inputModes": ["canvas-html", "html", "txt", "pdf-text", "json"],
  "normalizeUnicode": true,
  "stripHeadersFooters": true,
  "dehyphenateWrappedLines": true,
  "preserveListMarkers": true,
  "preserveHeadingMarkers": true,
  "decodeHtmlEntities": true,
  "removeRepeatingArtifacts": true,
  "removeImagePlaceholders": true,
  "headingPatternWeights": {
    "h1": 1.0,
    "h2": 0.9,
    "numberedHeading": 0.8,
    "capsHeading": 0.6,
    "boldHeadingLike": 0.55
  },
  "topicShiftSimilarityThreshold": 0.3,
  "minSectionWords": 50,
  "mergeSectionWordThreshold": 50,
  "maxSectionWordsBeforeSplit": 900,
  "minConceptCount": 12,
  "maxConceptCount": 18,
  "tfidfTopPercentile": 0.95,
  "minTermFrequency": 3,
  "minPhraseFrequency": 2,
  "maxNgramLength": 3,
  "explicitDefinitionWeight": 4.0,
  "typographicTermWeight": 2.5,
  "tfidfWeight": 2.0,
  "frameworkPatternWeight": 1.8,
  "instructorFocusWeight": 2.5,
  "sectionTitleWeight": 1.2,
  "repeatedAcrossSectionsWeight": 1.6,
  "enableStemMerge": true,
  "enableAliasMerge": true,
  "acronymMerge": true,
  "maxCanonicalNameWords": 6,
  "relatedKeywordOverlapThreshold": 0.3,
  "oppositeKeywordWindowSentences": 3,
  "mnemonicTemplateOrder": [
    "contrast-anchor",
    "acronym-builder",
    "number-hook",
    "person-dinner-party",
    "qualifier-trap-hook",
    "visual-scene",
    "if-then-handle"
  ],
  "enableRhymeDictionary": true,
  "enableSynonymDictionary": true,
  "enableNumberHooks": true,
  "enableContrastAnchors": true,
  "keywordJaccardThreshold": 0.2,
  "minParagraphCooccurrence": 2,
  "hierarchyReferenceWeight": 1.2,
  "contrastCueWeight": 1.8,
  "cooccurrenceWeight": 1.3,
  "keywordOverlapWeight": 1.0,
  "objectionCueWeight": 1.4,
  "exampleCueWeight": 1.0,
  "maxEdgesPerConcept": 6,
  "alignAssignments": true,
  "alignDiscussions": true,
  "alignRubrics": true,
  "alignModuleText": true,
  "instructorVerbWeight": 1.4,
  "instructorNounWeight": 1.2,
  "rubricCriteriaWeight": 1.3,
  "promptQuestionWeight": 1.1,
  "dueSoonBonusWeight": 0.4,
  "rapidFireCount": 10,
  "deepDrillCount": 12,
  "bossFightCount": 10,
  "corruptionCount": 4,
  "crossExamCount": 3,
  "domainTransferCount": 3,
  "teachBackCount": 3,
  "dilemmaCount": 3,
  "deepDrillEasyCount": 4,
  "deepDrillMediumCount": 5,
  "deepDrillHardCount": 3,
  "bossFightEasyCount": 2,
  "bossFightMediumCount": 4,
  "bossFightHardCount": 4,
  "phaseMinutes": 20,
  "timerModeDefault": "advisory",
  "pauseOnVisibilityHidden": true,
  "forgeWeight": 0.25,
  "crucibleWeight": 0.25,
  "transcendWeight": 0.5,
  "selfRatedSuccessWeight": 0.5,
  "conceptMasteryCorrectDelta": 1,
  "conceptMasteryWrongDelta": 1,
  "conceptMasterySelfRatedDelta": 0.5,
  "blindSpotConfidenceThreshold": 4,
  "hiddenStrengthConfidenceThreshold": 2,
  "saveToIndexedDB": true,
  "saveProgressToLocalStorage": true,
  "autosaveDebounceMs": 400,
  "exportFormat": "json"
}

```

# APPENDIX F — FINAL DIRECT INSTRUCTIONS TO CODEX

Read this entire file before taking action. Then:

1. Create the repository structure.
2. Write `AGENTS.md` and all `.omega` ledgers.
3. Create all repo-local skills under `.agents/skills/`.
4. Implement shared schema and config first.
5. Implement deterministic packages in dependency order.
6. Implement the extension and the static app.
7. Build the five runtime learning phases.
8. Build EMBER adaptive memory.
9. Add fixtures, golden tests, and integration tests.
10. Run the REFORGE repair loop until stable.
11. Leave a clear README and final engineering report.

Never claim model retraining. Simulate “learning” only through deterministic local memory, tests, ledgers, fixtures, skill bundles, and revised heuristics.

If a choice must be made between elegant incompleteness and a tested integrated system, choose the tested integrated system.
