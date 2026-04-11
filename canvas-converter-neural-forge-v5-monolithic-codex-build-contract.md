
# CANVAS CONVERTER + NEURAL FORGE v5 MONOLITHIC CODEX BUILD CONTRACT
## Single-file master specification for one-pass Codex execution
### Deterministic. Local-first. No runtime AI. No runtime API. No backend.

---

## 0. How this document is meant to be used

This file is intentionally monolithic. It is not a short product brief. It is the authoritative build contract for Codex.

Give this entire file to Codex and instruct it to:

1. create the full monorepo,
2. implement the browser extension and the static app,
3. implement the deterministic semantic engine,
4. implement the full Neural Forge runtime,
5. create tests and fixtures,
6. run the tests,
7. patch failures,
8. run build/lint/typecheck,
9. patch until all acceptance criteria pass,
10. write docs and developer notes,
11. stop only when the defined acceptance criteria are satisfied or a concrete blocker is documented.

Codex should treat this file as the top-level truth. Where this file leaves a gap, Codex should make the smallest coherent deterministic choice that preserves the constraints in Section 2.

This document deliberately incorporates and expands the prior Canvas Converter architecture, deterministic semantic engine architecture, and the Neural Forge v4 mechanics.

---

## 1. Truth constraints and engineering posture

### 1.1 Truth constraints
The implementation must not pretend to do anything it does not actually do.

The system must **not** claim:
- semantic understanding equivalent to an LLM,
- live scholarly search without a search backend,
- universal extraction from pages the student never visited,
- perfect grading of open-ended responses,
- omniscient understanding of any arbitrary textbook.

The system **may** claim:
- deterministic parsing,
- concept extraction by rule-based heuristics,
- alignment between textbook material and instructor emphasis,
- generated learning modules,
- generated quiz items,
- generated mnemonics,
- generated misconceptions/corruption drills,
- generated transfer prompts,
- generated mastery and calibration analysis,
- local-only persistence,
- zero network calls after the initial app load.

### 1.2 Engineering posture
The codebase must be:
- TypeScript-first,
- deterministic,
- testable,
- modular inside the repo even though this specification is monolithic,
- robust to partial input quality,
- transparent in how outputs are produced,
- configurable by constants and JSON,
- suitable for GitHub Pages deployment for the static app,
- suitable for Chrome/Edge MV3 packaging for the extension.

### 1.3 One-pass posture
The objective is to maximize the probability that Codex can build the entire system in one pass. That means the implementation plan must explicitly include:
- scaffold-first creation,
- fixture-first algorithm development,
- invariant checks,
- self-review loops,
- automatic repair loops against tests,
- fallback behavior when source inputs are messy,
- configuration-driven thresholds,
- generated synthetic fixtures where real fixtures are unavailable.

---

## 2. Mission and non-negotiable constraints

### 2.1 Mission
Build a system that takes course material captured from Canvas or imported from local files, extracts structure and concepts deterministically, aligns them to the instructor’s emphasis, and transforms them into a complete interactive learning environment called **Neural Forge**.

### 2.2 Product outcome
The product is a two-part local-first system:

1. **Canvas Collector Extension**
   - A Chrome/Edge Manifest V3 extension.
   - Captures visited Canvas course content as the student navigates.
   - Stores normalized course artifacts locally.
   - Exports/imports structured course data.
   - Performs one-click handoff to the static learning app.

2. **Static Learning App**
   - A GitHub Pages-compatible SPA.
   - Ingests the captured course data or local files (PDF/TXT/HTML/JSON).
   - Builds deterministic learning packs and chapter-level study sessions.
   - Provides the full 5-phase Neural Forge runtime.
   - Saves progress locally and can resume.

### 2.3 Hard constraints
The implementation must preserve all of these:

- No runtime AI model calls.
- No OpenAI API calls.
- No Groq API calls.
- No third-party inference endpoints.
- No backend server.
- No secret keys.
- No remote database.
- No analytics vendor required.
- No cloud dependency beyond static asset hosting and the browser.
- All generation logic runs in the extension or app bundle.
- All persistence is local: IndexedDB, localStorage, file export/import.
- The app must continue functioning with the network disconnected after the initial bundle is loaded.

### 2.4 Allowed dependencies
Dependencies are allowed only if they do **not** violate the no-runtime-API rule.

Approved classes of dependencies:
- UI/runtime: `react`, `react-dom`, `vite`
- routing: `react-router-dom` using `HashRouter` for GitHub Pages compatibility
- storage: `idb`, `idb-keyval`, or `dexie`
- PDF parsing: `pdfjs-dist`
- ZIP parsing: `fflate` or similar small local library
- utility: light libraries that run entirely locally
- testing: `vitest`, `@testing-library/react`, `playwright` if feasible, `tsd`, `eslint`, `typescript`
- build tooling: standard TS/Vite stack

Disallowed dependencies:
- cloud SDKs that require remote inference
- runtime telemetry SDKs
- hidden analytics
- SaaS-hosted content generation services
- anything requiring API keys for basic functionality

---

## 3. System names, subsystem map, and conceptual vocabulary

To keep the codebase coherent, implement the following subsystem naming:

- **SMELT** — raw ingestion, normalization, text cleanup, artifact stripping
- **QUARRY** — sectioning, passage detection, structural segmentation
- **MINT** — concept extraction, enrichment, mnemonic generation
- **ANCHOR** — instructor focus extraction and alignment
- **BRAID** — relationship graph, misconception graph, conflict map, dependency map
- **FORGE** — question/content generation for all five learning phases
- **RUNTIME** — Neural Forge UI, state machines, timers, interactions
- **LEDGER** — local persistence, save/resume, exports/imports, progress rollups
- **KILN** — internal implementation harness, validations, fixture runners, self-repair orchestration for Codex during build

These names should appear in the folder structure and in internal docs.

---

## 4. End-to-end product flow

### 4.1 Course capture flow
1. Student installs the extension.
2. Student browses Canvas normally.
3. The extension detects route changes and page readiness.
4. The extension extracts supported page types:
   - modules,
   - assignments,
   - pages,
   - discussions,
   - syllabi,
   - files metadata pages,
   - announcements if present.
5. The extension stores structured visited content in local extension storage.
6. Student clicks **Done Learning**.
7. Extension compiles a `CourseKnowledgePack`.
8. Extension either:
   - hands the pack to the static app via tab messaging/bridge, or
   - downloads it as JSON for manual import.

### 4.2 Local import flow
The static app can also ingest:
- PDF textbook chapters,
- TXT lecture notes,
- HTML pages,
- JSON exports from the extension,
- merged manual paste.

### 4.3 Learning pack generation flow
1. The app ingests raw course artifacts.
2. SMELT normalizes them.
3. QUARRY segments them.
4. MINT extracts concepts and enriches them.
5. ANCHOR builds the instructor focus vector from assignment/discussion/rubric language.
6. BRAID maps relationships, contrasts, prerequisites, misconceptions, and transfer edges.
7. FORGE generates all phase content.
8. RUNTIME serves the five learning phases.
9. LEDGER stores progress and mastery.
10. The app exports summary packets and course-level review packs.

---

## 5. Variable registry

All critical thresholds and behaviors must be configured through a strongly typed config object.

```ts
export interface AppConfig {
  app: {
    name: string;
    version: string;
    staticAppUrl: string;
    mode: 'development' | 'production' | 'test';
  };
  capture: {
    canvasHostPatterns: string[];
    routeDebounceMs: number;
    mutationSettleMs: number;
    maxPageHtmlChars: number;
    maxPlainTextCharsPerItem: number;
    maxLinksPerItem: number;
    captureVisitedOnly: boolean;
    autoCaptureOnNavigation: boolean;
    includeAnnouncements: boolean;
    includeFilesIndex: boolean;
    includeExternalLinkMetadata: boolean;
    storeRawHtml: boolean;
  };
  ingestion: {
    preserveHeaders: boolean;
    preserveLists: boolean;
    paragraphMergeMinWords: number;
    sectionMinWords: number;
    sectionTopicShiftThreshold: number;
    removeRepeatedHeaderFooterThreshold: number;
    maxDocumentWordsPerChunk: number;
    sentenceMinWords: number;
    sentenceMaxWords: number;
  };
  pdf: {
    enabled: boolean;
    maxPages: number;
    mergeBrokenLines: boolean;
    mergeHyphenatedLineBreaks: boolean;
    pageMarkerFormat: string;
  };
  concept: {
    minConcepts: number;
    maxConcepts: number;
    tfidfPercentile: number;
    minTermFrequency: number;
    keywordOverlapForRelation: number;
    keywordOverlapForRelatedConcept: number;
    definitionPatternBoost: number;
    emphasisMarkupBoost: number;
    frameworkPatternBoost: number;
    repeatedSectionBoost: number;
    explicitContrastBoost: number;
    firstMentionBoost: number;
  };
  instructorFocus: {
    assignmentVerbWeight: number;
    rubricCriterionWeight: number;
    discussionPromptWeight: number;
    repeatedDirectiveWeight: number;
    headingWeight: number;
    dueDateProximityWeight: number;
    focusTermMinScore: number;
    focusParagraphBoost: number;
  };
  relationship: {
    jaccardMin: number;
    cooccurrenceMin: number;
    prerequisiteVerbBoost: number;
    contrastiveCueBoost: number;
    hierarchyBoost: number;
  };
  generation: {
    dilemmasPerChapter: number;
    conceptsPerSessionMin: number;
    rapidFireCount: number;
    deepDrillCount: number;
    corruptionCount: number;
    crossExamCount: number;
    transferCount: number;
    teachBackCount: number;
    bossFightCount: number;
    questionShuffleSeedMode: 'stable-by-chapter' | 'random';
  };
  runtime: {
    phaseMinutes: number;
    timerModeDefault: 'advisory' | 'strict' | 'hidden';
    allowSkipSubmodes: boolean;
    autoSaveDebounceMs: number;
    confidenceScaleMin: number;
    confidenceScaleMax: number;
  };
  scoring: {
    forgeWeight: number;
    crucibleWeight: number;
    transcendWeight: number;
    masteryGreenThreshold: number;
    masteryYellowThreshold: number;
    calibrationLowConfidenceMax: number;
    calibrationHighConfidenceMin: number;
  };
  storage: {
    dbName: string;
    dbVersion: number;
    progressStore: string;
    packsStore: string;
    captureStore: string;
    configStore: string;
    enableCompression: boolean;
  };
}
```

### 5.1 Default values
Codex should instantiate these defaults unless the repo already provides better equivalents.

```ts
export const DEFAULT_CONFIG: AppConfig = {
  app: {
    name: 'Canvas Converter Neural Forge',
    version: '0.1.0',
    staticAppUrl: 'https://YOUR_GITHUB_USERNAME.github.io/canvas-converter',
    mode: 'production'
  },
  capture: {
    canvasHostPatterns: ['*://*.instructure.com/*', '*://*/courses/*'],
    routeDebounceMs: 350,
    mutationSettleMs: 900,
    maxPageHtmlChars: 400000,
    maxPlainTextCharsPerItem: 120000,
    maxLinksPerItem: 200,
    captureVisitedOnly: true,
    autoCaptureOnNavigation: true,
    includeAnnouncements: true,
    includeFilesIndex: true,
    includeExternalLinkMetadata: true,
    storeRawHtml: true
  },
  ingestion: {
    preserveHeaders: true,
    preserveLists: true,
    paragraphMergeMinWords: 20,
    sectionMinWords: 50,
    sectionTopicShiftThreshold: 0.30,
    removeRepeatedHeaderFooterThreshold: 3,
    maxDocumentWordsPerChunk: 2500,
    sentenceMinWords: 3,
    sentenceMaxWords: 45
  },
  pdf: {
    enabled: true,
    maxPages: 600,
    mergeBrokenLines: true,
    mergeHyphenatedLineBreaks: true,
    pageMarkerFormat: '[PAGE {n}]'
  },
  concept: {
    minConcepts: 10,
    maxConcepts: 18,
    tfidfPercentile: 0.95,
    minTermFrequency: 3,
    keywordOverlapForRelation: 0.20,
    keywordOverlapForRelatedConcept: 0.30,
    definitionPatternBoost: 4,
    emphasisMarkupBoost: 3,
    frameworkPatternBoost: 2,
    repeatedSectionBoost: 1,
    explicitContrastBoost: 2,
    firstMentionBoost: 1
  },
  instructorFocus: {
    assignmentVerbWeight: 5,
    rubricCriterionWeight: 6,
    discussionPromptWeight: 4,
    repeatedDirectiveWeight: 3,
    headingWeight: 2,
    dueDateProximityWeight: 1,
    focusTermMinScore: 4,
    focusParagraphBoost: 3
  },
  relationship: {
    jaccardMin: 0.2,
    cooccurrenceMin: 2,
    prerequisiteVerbBoost: 2,
    contrastiveCueBoost: 3,
    hierarchyBoost: 2
  },
  generation: {
    dilemmasPerChapter: 3,
    conceptsPerSessionMin: 12,
    rapidFireCount: 10,
    deepDrillCount: 12,
    corruptionCount: 5,
    crossExamCount: 3,
    transferCount: 3,
    teachBackCount: 4,
    bossFightCount: 10,
    questionShuffleSeedMode: 'stable-by-chapter'
  },
  runtime: {
    phaseMinutes: 20,
    timerModeDefault: 'advisory',
    allowSkipSubmodes: true,
    autoSaveDebounceMs: 300,
    confidenceScaleMin: 1,
    confidenceScaleMax: 5
  },
  scoring: {
    forgeWeight: 0.25,
    crucibleWeight: 0.25,
    transcendWeight: 0.50,
    masteryGreenThreshold: 2,
    masteryYellowThreshold: 0,
    calibrationLowConfidenceMax: 2,
    calibrationHighConfidenceMin: 4
  },
  storage: {
    dbName: 'canvas-converter-neural-forge',
    dbVersion: 1,
    progressStore: 'progress',
    packsStore: 'packs',
    captureStore: 'captures',
    configStore: 'config',
    enableCompression: true
  }
};
```

---

## 6. Monorepo structure

Codex must generate the following high-level repo layout.

```text
/
├─ README.md
├─ docs/
│  ├─ architecture.md
│  ├─ algorithms.md
│  ├─ data-contracts.md
│  ├─ extension-notes.md
│  ├─ static-app-notes.md
│  └─ test-plan.md
├─ packages/
│  ├─ config/
│  │  ├─ src/
│  │  │  ├─ defaultConfig.ts
│  │  │  ├─ schema.ts
│  │  │  └─ index.ts
│  ├─ shared-types/
│  │  ├─ src/
│  │  │  ├─ contracts.ts
│  │  │  ├─ enums.ts
│  │  │  └─ index.ts
│  ├─ core-engine/
│  │  ├─ src/
│  │  │  ├─ smelt/
│  │  │  ├─ quarry/
│  │  │  ├─ mint/
│  │  │  ├─ anchor/
│  │  │  ├─ braid/
│  │  │  ├─ forge/
│  │  │  ├─ ledger/
│  │  │  ├─ util/
│  │  │  └─ index.ts
│  │  └─ tests/
│  ├─ dictionaries/
│  │  ├─ src/
│  │  │  ├─ stopwords.ts
│  │  │  ├─ philosopherNames.ts
│  │  │  ├─ synonyms.ts
│  │  │  ├─ rhymes.ts
│  │  │  ├─ scenarioDomains.ts
│  │  │  └─ stemRules.ts
│  └─ fixture-lab/
│     ├─ src/
│     │  ├─ sampleCourseEthics.ts
│     │  ├─ sampleCourseBiology.ts
│     │  ├─ sampleCourseHistory.ts
│     │  ├─ syntheticChapterFactory.ts
│     │  └─ assertionHelpers.ts
├─ apps/
│  ├─ static-app/
│  │  ├─ src/
│  │  │  ├─ routes/
│  │  │  ├─ features/import/
│  │  │  ├─ features/course/
│  │  │  ├─ features/neural-forge/
│  │  │  ├─ features/reports/
│  │  │  ├─ state/
│  │  │  ├─ components/
│  │  │  ├─ hooks/
│  │  │  ├─ workers/
│  │  │  ├─ styles/
│  │  │  └─ main.tsx
│  │  └─ tests/
│  └─ extension/
│     ├─ src/
│     │  ├─ manifest.ts
│     │  ├─ service-worker/
│     │  ├─ content-scripts/
│     │  ├─ popup/
│     │  ├─ options/
│     │  ├─ bridge/
│     │  ├─ storage/
│     │  ├─ extractors/
│     │  ├─ route-detection/
│     │  └─ util/
│     └─ tests/
├─ scripts/
│  ├─ generate-fixtures.ts
│  ├─ validate-build.ts
│  ├─ smoke-run-engine.ts
│  ├─ package-extension.ts
│  └─ gh-pages-build.ts
├─ package.json
├─ pnpm-workspace.yaml
├─ tsconfig.base.json
├─ eslint.config.js
└─ vitest.config.ts
```

---

## 7. Primary data contracts

Codex must implement strongly typed contracts matching the following shape.

```ts
export type SourceKind =
  | 'canvas-assignment'
  | 'canvas-page'
  | 'canvas-discussion'
  | 'canvas-module'
  | 'canvas-syllabus'
  | 'canvas-announcement'
  | 'canvas-file-index'
  | 'pdf'
  | 'txt'
  | 'html'
  | 'manual-paste'
  | 'json-import';

export interface SourceLink {
  id: string;
  title: string;
  url: string;
  domain: string;
  textSnippet?: string;
  sourceKind?: string;
  visited?: boolean;
}

export interface RawSourceDocument {
  id: string;
  kind: SourceKind;
  title: string;
  courseId?: string;
  courseTitle?: string;
  moduleId?: string;
  moduleTitle?: string;
  itemId?: string;
  url?: string;
  capturedAt: number;
  html?: string;
  text?: string;
  links: SourceLink[];
  metadata: Record<string, string | number | boolean | null>;
}

export interface NormalizedDocument {
  id: string;
  title: string;
  kind: SourceKind;
  normalizedText: string;
  paragraphs: string[];
  listItems: string[];
  headings: Array<{ level: number; text: string; index: number }>;
  links: SourceLink[];
  metadata: Record<string, unknown>;
  wordCount: number;
}

export interface Section {
  id: string;
  title: string;
  text: string;
  paragraphIds: string[];
  wordCount: number;
  startIndex: number;
  endIndex: number;
  sourceDocumentIds: string[];
}

export interface Passage {
  id: string;
  text: string;
  sectionId: string;
  sentenceIds: string[];
  wordCount: number;
  headingPath: string[];
  sourceDocumentId: string;
}

export interface ConceptCandidate {
  id: string;
  name: string;
  normalizedName: string;
  evidenceKinds: Array<'explicit-definition' | 'emphasis-markup' | 'tfidf' | 'framework-pattern' | 'list-heading' | 'repeated-phrase'>;
  evidenceSpans: string[];
  sectionIds: string[];
  firstSentence: string;
  score: number;
}

export interface Concept {
  id: string;
  name: string;
  normalizedName: string;
  rank: number;
  core: string;
  detail: string;
  primer: string;
  mnemonic: string;
  category: string;
  keywords: string[];
  relatedConceptIds: string[];
  oppositeConceptIds: string[];
  sectionIds: string[];
  sourceDocumentIds: string[];
  philosopherNames: string[];
  frameworkLabels: string[];
  confusionRisk: number;
  focusScore: number;
  centralityScore: number;
}

export interface Relationship {
  id: string;
  fromId: string;
  toId: string;
  type: 'overlap' | 'contrast' | 'cooccurrence' | 'builds-on' | 'prerequisite' | 'same-family' | 'objection';
  label: string;
  strength: number;
  evidence: string[];
}

export interface InstructorSignal {
  id: string;
  sourceDocumentId: string;
  sourceKind: SourceKind;
  term: string;
  normalizedTerm: string;
  signalType: 'assignment-verb' | 'rubric-criterion' | 'discussion-prompt' | 'directive-phrase' | 'heading' | 'repeated-term' | 'due-date-nearby';
  weight: number;
  context: string;
}

export interface InstructorFocusVector {
  courseId: string;
  topTerms: Array<{ term: string; score: number; evidenceCount: number }>;
  topActions: Array<{ verb: string; score: number }>;
  paragraphsOfInterest: string[];
  conceptBoosts: Record<string, number>;
}

export interface ConceptAlignment {
  conceptId: string;
  focusScore: number;
  matchedTerms: string[];
  matchedActions: string[];
  reason: string;
}

export interface DilemmaChoice {
  id: string;
  label: string;
  framework: 'consequentialist' | 'deontological' | 'virtue';
  rationale: string;
  mappedConceptId?: string;
}

export interface Dilemma {
  id: string;
  title: string;
  scenario: string;
  choices: DilemmaChoice[];
  insightByChoice: Record<string, string>;
  tension: string;
}

export interface TrueFalseItem {
  id: string;
  conceptIds: string[];
  question: string;
  answer: boolean;
  why: string;
  generationMethod: 'true-simplify' | 'term-swap' | 'negation' | 'attribute-swap' | 'exaggeration' | 'category-error';
  difficulty: 'easy' | 'medium';
}

export interface MultipleChoiceOption {
  id: string;
  label: string;
  text: string;
  isCorrect: boolean;
  why?: string;
}

export interface MultipleChoice {
  id: string;
  conceptIds: string[];
  question: string;
  options: MultipleChoiceOption[];
  correctOptionId: string;
  explanation: string;
  primer?: string;
  generationType:
    | 'definition-match'
    | 'philosopher-attribution'
    | 'compare-contrast'
    | 'application-scenario'
    | 'negation-check'
    | 'fill-framework'
    | 'cause-effect'
    | 'objection-match'
    | 'example-identification'
    | 'sequence-process'
    | 'terminology-precision'
    | 'synthesis';
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface Corruption {
  id: string;
  conceptIds: string[];
  level: 1 | 2 | 3 | 4 | 5;
  statement: string;
  error: string;
  correct: string;
  hint: string;
}

export interface CrossExam {
  id: string;
  conceptIds: string[];
  challenge: string;
  hint: string;
  rebuttal: string;
}

export interface TransferScenario {
  id: string;
  conceptIds: string[];
  domain: string;
  scenario: string;
  question: string;
  analysis: string;
}

export interface TeachBack {
  id: string;
  conceptIds: string[];
  prompt: string;
  keyPoints: string[];
  keywordEvidence: string[][];
}

export interface PhaseTiming {
  phaseId: 'genesis' | 'forge' | 'crucible' | 'architect' | 'transcend';
  plannedMinutes: number;
}

export interface ChapterData {
  id: string;
  title: string;
  sourceWordCount: number;
  generatedAt: number;
  sourceDocumentIds: string[];
  concepts: Concept[];
  relationships: Relationship[];
  sectionMap: Section[];
  dilemmas: Dilemma[];
  rapidFire: TrueFalseItem[];
  deepDrill: MultipleChoice[];
  corruptions: Corruption[];
  crossExam: CrossExam[];
  domainTransfer: TransferScenario[];
  teachBack: TeachBack[];
  bossFight: MultipleChoice[];
  focusVector: InstructorFocusVector;
  conceptAlignments: ConceptAlignment[];
  timings: PhaseTiming[];
}

export interface CourseKnowledgePack {
  id: string;
  courseId: string;
  courseTitle: string;
  createdAt: number;
  rawSourceDocuments: RawSourceDocument[];
  normalizedDocuments: NormalizedDocument[];
  chapters: ChapterData[];
  globalFocusVector: InstructorFocusVector;
  metadata: Record<string, unknown>;
}

export interface TranscendResult {
  questionId: string;
  conceptIds: string[];
  confidence: number;
  selectedOptionId: string;
  correct: boolean;
  metaChoice?: 'never-learned' | 'confused-concepts' | 'overthought' | 'misremembered';
}

export interface Progress {
  chapterId: string;
  currentPhase: number;
  currentSubMode: string;
  currentIndex: number;
  phaseScores: Record<string, { correct: number; total: number }>;
  conceptMastery: Record<string, number>;
  seenConcepts: string[];
  completedSubModes: string[];
  totalElapsed: number;
  transcendResults: TranscendResult[];
  timestamp: number;
}
```

---

## 8. Extension architecture

### 8.1 Manifest and browser scope
Use Manifest V3.

Required capabilities:
- content scripts on Canvas host patterns
- content script or bridge on the static app URL
- service worker background
- storage
- tabs
- scripting if needed
- optional downloads for JSON export

### 8.2 Extension responsibilities
The extension must:
- detect supported Canvas routes,
- wait for content stabilization,
- extract DOM content using page-type-specific extractors,
- normalize metadata,
- deduplicate repeated captures,
- store visited page artifacts locally,
- expose a popup showing capture status,
- expose a **Done Learning** action,
- support export/import of local capture data,
- support direct handoff to the static app,
- never require a remote server.

### 8.3 Route detection
Implement a route detection layer that:
- watches `location.href`,
- debounces route changes,
- detects SPA-like navigation if Canvas uses dynamic transitions,
- uses a `MutationObserver` to wait for page stabilization,
- fires an extraction only when:
  - the route is supported,
  - sufficient content nodes are present,
  - the page is not a duplicate capture unless content changed.

Supported route classifiers:
- course home / syllabus
- module page
- assignment page
- discussion page
- page content page
- announcement page
- files index page
- unknown / unsupported

### 8.4 Extractor registry
Implement a registry where each extractor returns:

```ts
interface ExtractionResult {
  success: boolean;
  kind: SourceKind;
  title: string;
  text: string;
  html?: string;
  links: SourceLink[];
  metadata: Record<string, unknown>;
}
```

Each extractor should use:
- semantic DOM selectors first,
- fallback heuristics second,
- minimal CSS-selector fragility,
- safe HTML capture bounded by `maxPageHtmlChars`.

### 8.5 Visited-content model
The extension should capture only what the student visits. It should not claim total course coverage.

Deduplication key:
- `courseId + itemId + contentHash`
Where `contentHash` is a deterministic local hash of normalized visible text.

### 8.6 Done Learning handoff
Two handoff modes must be supported:

1. **Bridge handoff**
   - Extension compiles the `CourseKnowledgePack`.
   - Opens or focuses the static app tab.
   - Sends the pack into the static app using a bridge and `postMessage`.
   - Static app confirms receipt and persists locally.

2. **File handoff**
   - Extension downloads `course-pack.json`.
   - Static app supports manual JSON import.

### 8.7 Popup UX
Popup must show:
- current course title if detectable,
- number of captured items,
- last captured page title,
- capture status,
- buttons:
  - Capture Now
  - View Captured Items
  - Done Learning
  - Export JSON
  - Clear This Course

### 8.8 Extension acceptance behaviors
- If the student visits three assignment pages and one discussion page, all four appear in local capture history.
- Re-visiting a page without content change should not create duplicates.
- Content change should create a new version or update with revision metadata.
- Done Learning should either transfer or export without requiring a server.

---

## 9. Static app architecture

### 9.1 Host environment
The static app must be deployable on GitHub Pages. Use `HashRouter` to avoid rewrite issues.

### 9.2 Routes
At minimum implement:
- `#/` — home/dashboard
- `#/import` — import files / import JSON / inspect raw inputs
- `#/course/:courseId` — course overview
- `#/chapter/:chapterId` — chapter overview
- `#/forge/:chapterId/:phaseId` — phase runtime
- `#/report/:chapterId` — mastery report
- `#/settings` — local settings
- `#/debug` — optional debug/inspection panel

### 9.3 Home/dashboard
Show:
- course packs stored locally,
- chapter progress percentages,
- resume buttons,
- import button,
- settings,
- recent activity.

### 9.4 Import surface
Support:
- drag/drop PDF
- drag/drop TXT
- drag/drop HTML
- drag/drop JSON pack
- paste raw text
- merge imported documents into a named course/chapter
- preview extracted plain text before committing

### 9.5 Worker strategy
Heavy algorithms should run in Web Workers where appropriate:
- PDF extraction
- normalization
- concept extraction
- question generation

The UI should remain responsive and show step status:
- queued
- running
- completed
- failed

---

## 10. Ingestion engine: SMELT

SMELT is responsible for converting heterogeneous input into clean deterministic text.

### 10.1 Inputs
- Canvas HTML
- Canvas plain text
- PDF files
- TXT files
- HTML files
- manual paste

### 10.2 HTML normalization algorithm
1. Parse HTML using `DOMParser`.
2. Convert structural tags:
   - `h1..h6` -> `[Hn] heading [/Hn]`
   - `li` -> `[LI] item`
   - `blockquote` -> `[BQ] ... [/BQ]`
   - `table` -> flatten rows as delimiter-separated lines if reasonable
3. Strip script/style/noscript.
4. Decode HTML entities.
5. Normalize whitespace.
6. Remove repeated headers/footers by counting repeated line occurrences across pages/documents.
7. Remove artifact lines:
   - page number-only lines,
   - image placeholders,
   - obvious copyright boilerplate,
   - navigation chrome text if repeated frequently.
8. Normalize punctuation:
   - curly quotes -> straight quotes
   - em/en dash -> standard dash for processing
   - multiple ellipses -> `...`
9. Preserve paragraph breaks with double newlines.

### 10.3 PDF extraction algorithm
Use `pdfjs-dist`.

For each page:
1. Extract text content items.
2. Sort by y descending then x ascending if needed.
3. Reconstruct lines by y-coordinate clustering.
4. Merge hyphenated line breaks when a line ends with `-` and next line begins lowercase.
5. Merge broken lines into paragraphs using:
   - line length heuristics,
   - punctuation continuity,
   - indentation continuity,
   - blank line boundaries.
6. Inject page markers using config `pageMarkerFormat`.

### 10.4 TXT ingestion
1. Normalize newlines.
2. Detect heading-like lines by:
   - title case density,
   - all caps,
   - short line length,
   - surrounding blank lines.
3. Convert detected headings into `[H2]`.

### 10.5 Manual paste ingestion
Wrap as a `RawSourceDocument` with kind `manual-paste`, then normalize as above.

### 10.6 SMELT outputs
SMELT returns `NormalizedDocument[]` plus diagnostic stats:
- original length
- cleaned length
- headings found
- list items found
- removed artifact counts

---

## 11. Structural segmentation engine: QUARRY

QUARRY turns normalized text into sections, passages, and sentence units.

### 11.1 Section detection
Primary strategy:
- split on `[H1]` and `[H2]`.

Fallback strategy when headings absent:
- detect numbered section lines,
- detect uppercase/title-case short lines isolated by blank lines,
- detect topic shifts using cosine similarity between paragraph TF vectors,
- start a new section when similarity drops below `sectionTopicShiftThreshold`.

### 11.2 Section labeling
Priority:
1. actual heading text if present,
2. detected heading-like line,
3. generated label from first sentence noun phrase,
4. fallback `Section N`.

### 11.3 Short-section merge
If a section is below `sectionMinWords`, merge into the adjacent section with the strongest lexical overlap.

### 11.4 Passage segmentation
Each section should be further split into passages:
- 1–3 paragraphs each,
- constrained by `maxDocumentWordsPerChunk`,
- boundaries favor list starts, paragraph breaks, and topic shifts.

### 11.5 Sentence extraction
Implement deterministic sentence splitting with protections for:
- abbreviations,
- initials,
- decimal numbers,
- list item bullets,
- titles like `Dr.` or `Prof.`.

### 11.6 Structural diagnostics
QUARRY should produce:
- section counts,
- passage counts,
- average section size,
- sections merged,
- similarity breakpoints.

---

## 12. Concept engine: MINT

MINT is the semantic heart of the deterministic system.

### 12.1 Concept candidate discovery
Run multiple extractors and merge evidence.

#### Extractor A — explicit definition patterns
Use regex families to detect textbook-style definitions, including the patterns from the prior Neural Forge draft:

```regex
(?:^|\. )([A-Z][a-z]+(?: [A-Z]?[a-z]+)*) (?:is|are|refers to|means|can be defined as|is defined as|is the (?:view|idea|theory|belief|claim|principle|concept|notion) that) ([^.]+\.)
```

Add more patterns:
- `X holds that ...`
- `X argues that ...`
- `By X, we mean ...`
- `The term X refers to ...`
- `X can be understood as ...`

#### Extractor B — emphasis markup extraction
If original HTML exists, gather `<strong>`, `<b>`, `<em>`, `<i>`.
Filter out:
- citation-only names,
- entire sentences,
- navigation items,
- stopword-only spans,
- overly long spans (> 8 words unless title case).

#### Extractor C — TF-IDF Lite
1. tokenize unigrams, bigrams, trigrams,
2. remove stopwords,
3. compute section-level IDF,
4. keep terms in top percentile and above frequency minimum,
5. prefer noun-like phrases,
6. map each term to first contextual sentence.

#### Extractor D — framework/pattern detection
Use the provided academic framework pattern and expanded suffix bank:
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
- position
- thesis
- hypothesis
- law
- rule
- imperative
- formula
- critique
- maxim
- standard
- method
- canon
- test

#### Extractor E — heading/list concept clues
If a heading or bullet list item is a short technical phrase repeated in prose, treat it as candidate evidence.

#### Extractor F — repeated phrase detector
Repeated noun phrases that appear across sections receive evidence.

### 12.2 Candidate deduplication
Normalize candidate names by:
- lowercasing,
- singularizing naive plurals,
- stripping leading articles,
- stemming common suffixes (`-ism`, `-ist`, `-ity`, `-al`, `-ive`, `-tion`) conservatively,
- comparing edit distance under a threshold for short variants.

If multiple variants refer to same concept, merge and preserve alias list internally.

### 12.3 Candidate scoring
Base score = sum of evidence weights:
- explicit definition: `definitionPatternBoost`
- emphasis markup: `emphasisMarkupBoost`
- framework pattern: `frameworkPatternBoost`
- repeated section: `repeatedSectionBoost`
- explicit contrast presence: `explicitContrastBoost`
- first mention in document: `firstMentionBoost`

Add bonuses for:
- presence in headings,
- presence in instructor focus signals,
- presence in objections or compare/contrast language.

### 12.4 Final concept selection
Select between `minConcepts` and `maxConcepts`.
If too few candidates:
- lower TF-IDF threshold,
- increase repeated-phrase sensitivity,
- include high-salience heading terms.

If too many candidates:
- keep highest scores,
- maintain diversity across sections,
- avoid overcrowding from one section.

### 12.5 Concept enrichment
For each selected concept compute:

- `core`: best definition sentence or two-sentence compressed definition
- `detail`: surrounding paragraph trimmed to 2–3 sentences
- `primer`: short hint, e.g. `This concept relates to ...`
- `category`: section title or keyword-cluster name
- `keywords`: significant terms from definition/detail
- `philosopherNames`: names detected near concept
- `frameworkLabels`: infer from co-occurring framework tokens
- `relatedConceptIds`: overlap >= configured threshold
- `oppositeConceptIds`: derived from contrastive cues
- `confusionRisk`: see 12.7
- `focusScore`: from ANCHOR
- `centralityScore`: later from BRAID graph centrality
- `mnemonic`: from 12.6

### 12.6 Deterministic mnemonic generation
Implement the template system from the Neural Forge draft and extend it.

Template family order:
1. contrast anchor if opposites exist,
2. acronym builder if 3+ words,
3. number hook if concept carries explicit count,
4. person-analogy if philosopher linked,
5. rule/principle analogy,
6. distinction analogy,
7. dilemma analogy,
8. first-letter chain,
9. rhyme dictionary if available,
10. visual scene,
11. sound-alike phrase,
12. category mnemonic,
13. cause/effect hook,
14. everyday anchor,
15. compact formula mnemonic.

The implementation does not need poetic genius. It needs consistent mnemonic utility.

### 12.7 Confusion risk score
Compute a `confusionRisk` score for each concept:
- +1 for each high-overlap neighbor
- +1 if there is an explicit opposite
- +1 if concept shares philosopher with another concept
- +1 if concept name is short/abstract
- +1 if qualifiers like `only`, `merely`, `necessarily`, `sometimes`, `valid`, `sound` appear
- +1 if the system generated multiple corruption possibilities
Normalize to 0–1.

### 12.8 Compression ladder
For each concept, generate a deterministic **compression ladder**:
- `raw`: detail
- `core`: the main definition
- `rule`: one-sentence “what makes it distinct”
- `hook`: mnemonic
- `trigger`: primer
- `testCue`: the smallest cue that should trigger recall

This ladder is used throughout the runtime.

---

## 13. Instructor alignment engine: ANCHOR

This subsystem is critical. It pairs textbook material to what the instructor appears to care about.

### 13.1 Inputs
Use all course artifacts with instructor language:
- assignments
- discussion prompts
- rubrics if visible in text
- module headings
- page titles
- syllabus
- announcements if pedagogically relevant

### 13.2 Instructor signal extraction
Extract signals from these sources:

#### Signal type A — directive verbs
Detect verbs/verb phrases like:
- compare
- contrast
- analyze
- explain
- evaluate
- justify
- discuss
- identify
- apply
- defend
- critique
- interpret
- summarize
- connect
- distinguish
- assess

Assign `assignmentVerbWeight` or the source-appropriate weight.

#### Signal type B — rubric criteria
Detect lines beginning with rubric-like language:
- demonstrates
- explains clearly
- supports with evidence
- applies concept accurately
- compares effectively
- depth of analysis
- critical thinking
- citations
- relevance

Assign high weight.

#### Signal type C — repeated topical nouns
Repeated non-stopword nouns/phrases in assignment/discussion prompts count as focus terms.

#### Signal type D — due-date proximity
If a source has an upcoming due date and references a concept area, give mild temporal weight.

#### Signal type E — heading emphasis
Module or assignment headings receive heading-based weight.

### 13.3 Focus vector
Aggregate normalized terms into an `InstructorFocusVector`:
- top terms with scores
- top action verbs with scores
- paragraphs of interest
- concept boosts after concept extraction

### 13.4 Paragraph and concept alignment
For each section/passage/concept:
1. compute lexical overlap with top focus terms,
2. compute verb-pattern overlap with focus actions,
3. boost if the passage is from a source directly tied to an assignment/discussion,
4. produce a `focusScore`.

### 13.5 Alignment reason generation
Produce deterministic reasons such as:
- `This concept aligns with repeated instructor verbs: compare, evaluate.`
- `This concept appears near rubric-like criteria emphasizing evidence and analysis.`
- `This passage contains top focus terms found in the Week 3 discussion prompt.`

### 13.6 Use of alignment in generation
Alignment influences:
- concept ranking,
- selection of drill content,
- which examples are emphasized,
- which concepts appear in “review these first,”
- chapter summaries,
- module priority order.

---

## 14. Relationship and misconception engine: BRAID

BRAID builds the graph structure used by the generators.

### 14.1 Relationship types
Create relationships via:

1. keyword overlap (Jaccard)
2. co-occurrence in paragraph/passage
3. explicit contrastive cues
4. hierarchical reference
5. prerequisite cues:
   - depends on
   - requires
   - based on
   - builds on
   - presupposes
6. objection/response edges
7. same-family framework grouping

### 14.2 Edge weighting
Strength is based on:
- normalized Jaccard,
- co-occurrence count,
- explicit cue boosts,
- hierarchy boosts,
- contrastive cue boosts,
- prerequisite cue boosts.

### 14.3 Concept centrality
Compute a simple centrality score:
- weighted degree centrality,
- extra weight for contrast and prerequisite edges,
- normalize 0–1.

### 14.4 Misconception graph
Generate likely confusion pairs:
- high lexical overlap
- opposite qualifiers
- same philosopher but distinct claim
- same framework but different sub-principle
- everyday meaning vs technical meaning
- qualifier-sensitive distinctions

For each confusion pair create a `misconception pattern`:
- term swap
- reversed comparison
- everyday-vs-technical slip
- qualifier omission
- framework misattribution
- objection-as-definition slip

This graph directly powers corruption drills and wrong answer generation.

### 14.5 Coverage matrix
Create a matrix:
- rows = concepts
- columns = assignments/discussions/focus terms
- cells = alignment score
This matrix supports:
- chapter ordering,
- review priority,
- “why this matters for your course” explanations.

---

## 15. Question and module generation engine: FORGE

This section incorporates the deterministic Neural Forge design and expands it.

### 15.1 Chapter assembly strategy
For each chapter or content bundle, generate:
- concepts,
- dilemmas,
- rapid fire T/F,
- deep drill MCQ,
- corruption items,
- cross-exam items,
- domain transfer items,
- teach-back items,
- boss fight MCQ.

### 15.2 Immersive dilemmas (Genesis)
Preserve the 3-framework architecture:
- consequentialist option,
- deontological option,
- virtue ethics option.

If the chapter is not obviously moral philosophy, reinterpret the trio as:
- outcome-driven
- rule/procedure-driven
- identity/character/practice-driven

Generation steps:
1. detect the chapter’s central tension from contrastive language,
2. fill an everyday scenario shell,
3. create three choices using the three-framework template,
4. map each choice to a real concept when possible,
5. create deterministic reveal text.

### 15.3 Concept scan (Genesis)
Each concept card displays:
- name
- core
- detail
- mnemonic
- optional course alignment note: `Your instructor emphasizes this in ...`

### 15.4 Rapid Fire (Forge)
Adopt the prior true/false generator and extend it.
Generation pool:
- true simplification
- term swap
- negation insertion/removal
- attribute swap
- exaggeration
- category error
- qualifier drop
- relation reversal

Each item gets:
- question
- answer
- why
- generation method
- concept references

### 15.5 Deep Drill multiple choice
Use the 12 question templates from the prior specification. Implement all of them where source evidence exists, and fallback to viable templates where it does not.

Distribution by difficulty:
- Deep Drill: 4 easy, 5 medium, 3 hard
- Boss Fight: 2 easy, 4 medium, 4 hard

Each MCQ must include:
- primer hint
- explanation
- wrong-option explanations where feasible
- difficulty tag
- concept references

### 15.6 Corruption drills (Crucible)
Implement the five corruption levels:
1. wrong framework
2. reversed relationship
3. subtle attribute swap
4. correct fact / wrong implication
5. single-word qualifier swap

Use the misconception graph to prioritize high-value corruptions.

### 15.7 Cross-Exam
If explicit objections exist, use them.
If not, synthesize a structural challenge from:
- scope limits,
- edge cases,
- internal tensions,
- contrastive concept claims.

### 15.8 Domain Transfer
Maintain a deterministic domain template bank with at least 20 domains and enough fields to produce varied scenarios. Domains should include:
- AI ethics
- social media
- medical triage
- climate policy
- workplace reporting
- university policy
- criminal justice
- data privacy
- biotech/genetics
- economic justice
- policing
- journalism
- public health
- family life
- labor management
- consumer technology
- environmental regulation
- civic duty
- platform moderation
- scientific integrity

### 15.9 Teach Back
Teach-back items must use the highest-value concepts based on a combination of:
- concept rank
- centrality
- focusScore
- confusionRisk

Each item includes key points and keyword evidence sets.

### 15.10 Boss Fight with calibration
Boss Fight must preserve the confidence-first design:
1. read question
2. rate confidence
3. show options
4. submit answer
5. show result and blind-spot or hidden-strength messages
6. capture meta-reflection for wrong answers

### 15.11 Learning module synthesis beyond the 5 phases
In addition to Neural Forge sessions, the app should also produce deterministic **learning modules** on the chapter overview page:

For each high-focus concept produce:
- `Why this matters in your course`
- `Fast meaning`
- `Detailed meaning`
- `What it is often confused with`
- `How your instructor is likely using it`
- `What to remember for assignments`
- `Fast retention hook`
- `One-step application prompt`
- `One compare/contrast prompt`
- `One teach-back prompt`

These are not another phase. They are persistent pre-study assets.

---

## 16. Deterministic generation details by item type

### 16.1 True/False generation algorithm
Follow the prior Neural Forge specification closely.

#### True statements
Simplify `core` definitions:
- remove hedges,
- strip attributions where possible,
- split compound claims,
- keep the most stable independent clause.

#### False statements
Implement at least these methods:
- term swap,
- negation swap,
- attribute swap,
- exaggeration,
- category error,
- qualifier omission,
- consequence inversion,
- philosopher misattribution.

Selection must avoid duplicates and overconcentration on a single concept.

### 16.2 Multiple choice generation algorithm
Implement the 12 defined templates. For each template:
- verify required evidence exists,
- otherwise skip that template and fill from another eligible template,
- ensure 4 options,
- ensure one correct answer only,
- ensure plausible distractors,
- ensure explanation.

### 16.3 Wrong answer explanation engine
Use template families:
- concept-vs-concept distinction
- qualifier correction
- framework correction
- everyday-vs-technical correction
- reversed relationship correction
- objection misread correction

### 16.4 Corruption hint generator
Hints should point at:
- the qualifier word,
- the philosopher credit,
- the relationship direction,
- the scope condition,
- the category label.

### 16.5 Teach-back keyword evidence
For each key point:
1. extract 2–3 essential keywords,
2. stem them,
3. check student text for evidence,
4. show ✓ or ✗ next to each key point,
5. do not claim semantic grading.

---

## 17. Runtime specification: RUNTIME

### 17.1 Five phase structure
Phases:
1. Genesis
2. Forge
3. Crucible
4. Architect
5. Transcend

Each phase is advisory-timed for 20 minutes by default.

### 17.2 Timer system
Implement:
- global elapsed timer,
- per-phase countdown,
- pause on hidden tab,
- strict / advisory / hidden modes,
- red indicator below 2 minutes.

### 17.3 Genesis
#### Immersive Dilemmas
- show scenario,
- student chooses,
- reveal framework mapping and insight,
- record natural-framework profile.

#### Concept Scan
- card front: name + core
- card back: detail + mnemonic + optional course alignment note
- seen-state tracking
- advance only after seen all, unless skip allowed by config

### 17.4 Forge
#### Rapid Fire
- immediate correctness feedback
- streak logic
- explanation reveal

#### Deep Drill
- primer shown above question
- Learn First opens mini-lesson from concept compression ladder
- answer options
- result box
- wrong-answer explanation

### 17.5 Crucible
Hub with:
- Spot the Lie
- Cross-Exam
- Domain Transfer

Each sub-mode supports self-rating:
- missed it
- close
- nailed it

### 17.6 Architect
- teach-back textarea
- key point reveal
- keyword evidence markers
- self-rating

### 17.7 Transcend
- confidence before options
- answer
- result
- blind-spot or hidden-strength message
- wrong-answer meta-reflection required before advancing if configured

### 17.8 Results dashboards
At chapter completion show:
- overall score
- mastery grade
- calibration score
- overconfidence count
- underconfidence count
- error pattern breakdown
- concept mastery map
- review list
- links back to concept cards and selected submodes

---

## 18. Scoring and analytics

### 18.1 Phase scoring
- Forge score from Rapid Fire + Deep Drill
- Crucible score from completion + self-ratings
- Architect contributes via self-rating and keyword evidence
- Transcend score from Boss Fight accuracy and calibration

### 18.2 Overall rollup
Use config weights:
- Forge 25%
- Crucible 25%
- Transcend 50%

Architect can be folded into Crucible or treated as bonus depending on config, but default it into Crucible-style qualitative mastery support.

### 18.3 Calibration
Well-calibrated if:
- correct and confidence >= 3
- wrong and confidence <= 2

Overconfidence if:
- wrong and confidence >= 4

Underconfidence if:
- correct and confidence <= 2

### 18.4 Concept mastery
For each concept:
- +1 per correct linked question
- -1 per wrong linked question
- +0.5 per self-rated success in Crucible/Architect when linked
- optionally +0.25 if concept card fully viewed and revisited

Color bands:
- green >= masteryGreenThreshold
- yellow between masteryYellowThreshold and green threshold
- red below yellow threshold

### 18.5 Error patterns
Transcend wrong-answer meta choices:
- never learned
- confused concepts
- overthought
- misremembered

Use these to generate review advice and route suggestions.

### 18.6 Retention fingerprint
For each concept compute:
- mastery score
- confusionRisk
- focusScore
- centralityScore
- recency of last interaction

This supports a review prioritization list.

---

## 19. Persistence and local storage: LEDGER

### 19.1 Stores
Use IndexedDB for:
- course packs
- captures
- generated chapters
- progress
- settings

Use localStorage only for:
- tiny resume flags,
- recently opened course/chapter IDs,
- UI preferences if easier.

### 19.2 Autosave
Autosave on:
- phase progress changes
- seen concept updates
- answer submission
- self-rating
- settings changes

Debounce by config.

### 19.3 Export/import
Support exporting:
- entire course knowledge pack
- chapter data
- progress snapshot
- mastery report JSON
- optional printable HTML report
- optional DOCX report if `docx` added

### 19.4 Resume behavior
On app load:
- detect incomplete progress,
- offer Resume or Start Fresh,
- preserve previous completed reports.

---

## 20. PDF/TXT/Textbook conversion strategy

This section addresses the advanced semantic engine requirement for textbook conversion.

### 20.1 Goal
Convert imported textbook chapters or long text into **high-retention deterministic learning modules** that are paired to instructor emphasis.

### 20.2 Chapter inference
If the imported text lacks chapter splits:
- infer chapter boundaries from headings,
- or allow user to manually mark a chapter title,
- or chunk into thematic units using QUARRY topic shifts and large-heading cues.

### 20.3 Instructor pairing
Map textbook passages to instructor focus via ANCHOR.
For each chapter/module create:
- focus-aligned concepts,
- focus-aligned examples,
- focus-aligned transfer prompts,
- assignment-relevant compare/contrast targets,
- “likely exam/assignment pressure points.”

### 20.4 High-retention deterministic patterns
Each concept should generate several retention surfaces:
1. Definition
2. Distinction
3. Mnemonic
4. Common confusion
5. Application prompt
6. Transfer scenario
7. Teach-back prompt
8. Test cue
9. Compare/contrast cue
10. Course relevance cue

### 20.5 Novel composite systems
Do **not** claim these are globally unprecedented. Treat them as original composite deterministic subsystems for this product.

#### System A — Focus-Weighted Compression Ladder
Compression is weighted not only by concept salience but by instructor emphasis. This produces cues optimized for course relevance, not generic summary.

#### System B — Friction Map
Each chapter gets a map of where students are likely to stumble based on:
- confusion graph density,
- qualifier sensitivity,
- concept family overlap,
- objection density.

#### System C — Recall Braid
Instead of repeating the same cue style, concepts are revisited across different retrieval forms:
- intuition (dilemma)
- recognition (scan)
- quick judgment (T/F)
- controlled discrimination (MCQ)
- adversarial error detection (corruption)
- defense (cross-exam)
- transfer (domain)
- production (teach-back)
- calibrated synthesis (boss fight)

This is deterministic spacing across formats, not just spaced repetition by interval.

#### System D — Instructor Alignment Overlay
Every concept and module can explain how it connects to:
- current assignment language,
- discussion prompts,
- rubric priorities,
- repeated course terminology.

#### System E — Boundary Detector
For each concept, the engine identifies the smallest qualifier or term boundary that flips correctness. This powers high-quality corruption items and “watch this word” cues.

---

## 21. Algorithms in pseudocode

### 21.1 Normalize
```ts
function normalizeDocument(raw: RawSourceDocument, config: AppConfig): NormalizedDocument {
  const source = raw.html ?? raw.text ?? '';
  const htmlMode = Boolean(raw.html);
  let normalizedText = htmlMode ? htmlToStructuredText(raw.html!) : raw.text ?? '';
  normalizedText = decodeEntities(normalizedText);
  normalizedText = normalizeQuotesDashes(normalizedText);
  normalizedText = removeRepeatedArtifacts(normalizedText, config);
  normalizedText = normalizeWhitespace(normalizedText);
  const paragraphs = splitParagraphs(normalizedText);
  const headings = extractHeadingMarkers(normalizedText);
  const listItems = extractListMarkers(normalizedText);
  return {
    id: raw.id,
    title: raw.title,
    kind: raw.kind,
    normalizedText,
    paragraphs,
    listItems,
    headings,
    links: raw.links,
    metadata: raw.metadata,
    wordCount: countWords(normalizedText)
  };
}
```

### 21.2 Section detection
```ts
function detectSections(doc: NormalizedDocument, config: AppConfig): Section[] {
  const byHeadings = splitByHeadingMarkers(doc.normalizedText);
  let sections = byHeadings.length > 0 ? byHeadings : splitByTopicShifts(doc.paragraphs, config.ingestion.sectionTopicShiftThreshold);
  sections = sections.map(labelSectionFromHeadingOrLeadSentence);
  sections = mergeTinySections(sections, config.ingestion.sectionMinWords);
  return sections;
}
```

### 21.3 Concept extraction
```ts
function extractConcepts(sections: Section[], rawDocs: RawSourceDocument[], config: AppConfig): Concept[] {
  const candidates = [
    ...extractExplicitDefinitions(sections),
    ...extractEmphasisTerms(rawDocs),
    ...extractTfIdfTerms(sections, config),
    ...extractFrameworkPatterns(sections),
    ...extractHeadingPhraseCandidates(sections),
    ...extractRepeatedPhraseCandidates(sections)
  ];
  const merged = dedupeCandidates(candidates, config);
  const ranked = rankCandidates(merged, config);
  const selected = selectConceptRange(ranked, config.concept.minConcepts, config.concept.maxConcepts);
  return enrichConcepts(selected, sections, rawDocs, config);
}
```

### 21.4 Instructor focus
```ts
function buildInstructorFocus(rawDocs: RawSourceDocument[], concepts: Concept[], config: AppConfig): InstructorFocusVector {
  const signals = extractInstructorSignals(rawDocs, config);
  const focus = aggregateSignals(signals);
  focus.conceptBoosts = mapConceptsToFocus(concepts, focus);
  return focus;
}
```

### 21.5 Relationship graph
```ts
function buildRelationships(concepts: Concept[], sections: Section[], config: AppConfig): Relationship[] {
  const edges: Relationship[] = [];
  edges.push(...keywordOverlapEdges(concepts, config.relationship.jaccardMin));
  edges.push(...cooccurrenceEdges(concepts, sections, config.relationship.cooccurrenceMin));
  edges.push(...contrastEdges(concepts));
  edges.push(...hierarchyEdges(concepts));
  edges.push(...prerequisiteEdges(concepts, sections));
  return dedupeRelationships(edges);
}
```

### 21.6 Chapter generation
```ts
function buildChapterData(input: {
  title: string;
  sourceDocumentIds: string[];
  sections: Section[];
  concepts: Concept[];
  relationships: Relationship[];
  focusVector: InstructorFocusVector;
}, config: AppConfig): ChapterData {
  const conceptAlignments = alignConceptsToFocus(input.concepts, input.focusVector);
  const dilemmas = generateDilemmas(input.concepts, input.relationships, input.sections, config);
  const rapidFire = generateTrueFalse(input.concepts, input.relationships, input.sections, config);
  const deepDrill = generateDeepDrill(input.concepts, input.relationships, input.sections, config);
  const corruptions = generateCorruptions(input.concepts, input.relationships, input.sections, config);
  const crossExam = generateCrossExam(input.concepts, input.relationships, input.sections, config);
  const domainTransfer = generateDomainTransfer(input.concepts, input.relationships, input.sections, config);
  const teachBack = generateTeachBack(input.concepts, input.relationships, config);
  const bossFight = generateBossFight(input.concepts, input.relationships, input.sections, config);

  return {
    id: stableId(input.title),
    title: input.title,
    sourceWordCount: input.sections.reduce((n, s) => n + s.wordCount, 0),
    generatedAt: Date.now(),
    sourceDocumentIds: input.sourceDocumentIds,
    concepts: input.concepts,
    relationships: input.relationships,
    sectionMap: input.sections,
    dilemmas,
    rapidFire,
    deepDrill,
    corruptions,
    crossExam,
    domainTransfer,
    teachBack,
    bossFight,
    focusVector: input.focusVector,
    conceptAlignments,
    timings: [
      { phaseId: 'genesis', plannedMinutes: config.runtime.phaseMinutes },
      { phaseId: 'forge', plannedMinutes: config.runtime.phaseMinutes },
      { phaseId: 'crucible', plannedMinutes: config.runtime.phaseMinutes },
      { phaseId: 'architect', plannedMinutes: config.runtime.phaseMinutes },
      { phaseId: 'transcend', plannedMinutes: config.runtime.phaseMinutes }
    ]
  };
}
```

---

## 22. UI and interaction details

### 22.1 Design goal
The UI should feel serious, fast, and structured. It does not need “fun” polish at the expense of clarity.

### 22.2 Top bar
Show:
- course/chapter title
- phase progress
- global elapsed timer
- current phase timer
- save status
- settings shortcut

### 22.3 Accessibility
Implement:
- large text mode
- reduced motion
- high contrast
- keyboard navigation
- focus-visible states
- semantic headings
- aria labels for buttons and stateful controls

### 22.4 Debug panels
Implement a hidden or optional debug mode showing:
- extracted sections
- candidate concepts with scores
- focus vector terms
- relationship edges
- generated item provenance
- why a concept was selected
- why a question was generated

This is valuable for deterministic transparency and debugging.

---

## 23. Testing strategy

### 23.1 Unit tests
Write tests for:
- normalization
- section detection
- sentence splitting
- TF-IDF ranking
- candidate deduplication
- concept selection
- instructor signal extraction
- relationship building
- true/false generation
- MCQ option validity
- corruption generation
- mastery scoring
- calibration scoring
- progress save/load

### 23.2 Fixture tests
Create synthetic fixtures in at least three domains:
- ethics/philosophy
- biology/science
- history/social science

Validate that:
- at least the minimum concept count is produced,
- concepts cover multiple sections,
- relationship graph is non-empty,
- all required phase items are generated,
- no MCQ has multiple correct answers,
- corruptions include valid corrections,
- teach-back has key points.

### 23.3 Smoke tests
Run a full pack generation and verify:
- no uncaught exceptions,
- output serializes,
- app routes can load generated packs,
- extension export file imports cleanly.

### 23.4 UI tests
At minimum cover:
- import flow,
- resume flow,
- phase navigation,
- answer submission,
- timer pause/resume,
- report rendering.

---

## 24. Codex execution protocol: KILN

This section tells Codex how to work **inside a single run**.

### 24.1 Core instruction
Codex should not attempt to “improvise everything in raw sequence.” It should execute in controlled waves:

1. scaffold repo and shared types,
2. implement config and dictionaries,
3. implement core algorithms with tests,
4. implement persistence,
5. implement static app shell,
6. implement extension shell,
7. connect extension handoff,
8. implement runtime phases,
9. run tests/build/lint/typecheck,
10. fix failures,
11. generate docs,
12. run final validation.

### 24.2 Self-critique loop
After each wave Codex should:
- inspect changed files,
- run relevant tests,
- identify failures or weak points,
- patch them,
- rerun until stable.

This is the safe version of “learning from itself”: iterative local correction against explicit invariants.

### 24.3 Skill synthesis rule
If Codex discovers a missing internal capability while implementing, it should create it inside the repo. Examples:
- small tokenizer utility
- simple stemmer
- cosine similarity helper
- line clustering helper for PDF reconstruction
- qualifier detector
- focus-term extractor
- deterministic seeded shuffle

It should not wait for a new prompt if the gap is straightforward and local.

### 24.4 Reverse-engineering rule
Where Canvas DOM details are uncertain, Codex should:
- create extractor registries with semantic selectors,
- implement fallbacks,
- isolate selectors in one place,
- document assumptions,
- never attempt auth bypass or non-visited crawling.

### 24.5 Failure recovery
If a question template lacks enough evidence in a chapter, Codex must:
- fall back to another eligible template,
- keep counts intact where possible,
- never emit broken empty items.

### 24.6 Deterministic guarantee
All randomization must be seedable and stable by chapter unless explicitly configured otherwise.

### 24.7 Build script expectations
Codex must provide scripts for:
- install
- dev
- build
- test
- lint
- typecheck
- generate-fixtures
- smoke-run-engine
- package-extension

---

## 25. Acceptance criteria

The job is considered complete only if all of these are met:

### 25.1 Static app
- builds successfully for GitHub Pages
- can import JSON, PDF, TXT, and manual paste
- can generate at least one valid chapter pack locally
- can run the full five-phase workflow
- can save and resume progress
- can show a final mastery report

### 25.2 Extension
- builds as MV3 extension
- captures supported Canvas page text on visited pages
- stores captures locally
- can export JSON
- can perform direct handoff to static app or degrade gracefully to file export

### 25.3 Engine
- concept extraction works on fixture domains
- instructor focus vector is generated when assignment/discussion text exists
- relationships are non-empty when concept count > 1
- all phase generators return non-empty collections with valid item structures
- no broken MCQ option sets
- no unhandled generation exceptions on fixtures

### 25.4 Testing
- unit tests pass
- smoke tests pass
- build/lint/typecheck pass
- at least one end-to-end happy-path flow is validated

### 25.5 Documentation
- README explains setup
- docs explain architecture
- docs explain known limits truthfully
- docs explain how the extension and app communicate

---

## 26. Known limits that must be documented honestly

The final implementation and docs must explicitly state:

- The extension captures **visited** Canvas content, not everything in a course automatically.
- External links may only be captured as metadata unless opened or parseable.
- Deterministic keyword evidence in teach-back is not full semantic grading.
- Question quality depends on source text quality and structure.
- Different Canvas themes/institution customizations may require selector adjustments.
- PDF extraction quality varies by source layout.
- The system does not provide live scholarly retrieval without a separate local corpus or search feature.

---

## 27. Recommended concrete dependency list

Codex may use approximately this stack unless repo context suggests a better equivalent:
- TypeScript
- Vite
- React
- React Router DOM
- `idb` or `dexie`
- `pdfjs-dist`
- `fflate`
- Vitest
- Playwright (optional but useful)
- ESLint
- Prettier (optional)
- `webextension-polyfill` if helpful

---

## 28. Final monolithic Codex prompt

The following prompt should be included in the repo docs and can be pasted into Codex if needed.

> You are implementing the full Canvas Converter + Neural Forge v5 system described in the master build contract. Treat that document as the authoritative architecture. Build the complete monorepo in one run. Use TypeScript throughout. Create the static GitHub Pages app and the Chrome/Edge MV3 extension. Implement the deterministic local-only semantic engine, course alignment engine, relationship graph, all five Neural Forge phases, local persistence, import/export, and the extension-to-app handoff.
>
> Hard constraints:
> - no runtime AI APIs
> - no backend
> - no secret keys
> - local-only generation
> - deterministic algorithms
> - GitHub Pages compatibility
> - MV3 extension compatibility
>
> Work in waves:
> 1. scaffold repo and config
> 2. create shared types and dictionaries
> 3. implement core engine modules with unit tests
> 4. implement storage/persistence
> 5. implement app import pipeline
> 6. implement Neural Forge runtime UI
> 7. implement extension capture flow and handoff
> 8. connect everything
> 9. run tests/build/lint/typecheck
> 10. fix any failures
> 11. write docs
>
> During implementation, if a required internal capability is missing, create it inside the repo. Examples include a tokenizer, stemmer, seeded shuffle, PDF line merger, similarity calculator, or DOM extractor helper. Prefer small deterministic utilities over new dependencies.
>
> Maintain truthfulness. Do not claim semantic grading, full-course omniscience, or live retrieval. Use graceful fallbacks where evidence is insufficient. If one question template is not viable for a chapter, choose another valid template. Never emit malformed learning items.
>
> Before finishing, ensure the following:
> - static app can import JSON/PDF/TXT/manual paste
> - static app can generate a course pack and run the five phases
> - extension can capture visited Canvas content and export/handoff JSON
> - tests pass
> - typecheck passes
> - build passes
> - docs are present
>
> Stop only after all acceptance criteria are satisfied or you can point to a precise blocker in the codebase with evidence.

---

## 29. Implementation order checklist for Codex

Codex should check these off implicitly during work:

- [ ] initialize workspace
- [ ] add root config
- [ ] add shared types
- [ ] add default config
- [ ] add dictionaries
- [ ] add normalization utilities
- [ ] add section detector
- [ ] add concept extraction
- [ ] add mnemonic generator
- [ ] add instructor focus extractor
- [ ] add relationship graph
- [ ] add item generators
- [ ] add scoring and calibration
- [ ] add persistence
- [ ] add importers (PDF/TXT/HTML/JSON)
- [ ] add chapter assembler
- [ ] add static app routes
- [ ] add runtime phases
- [ ] add report screens
- [ ] add extension manifest
- [ ] add route detection
- [ ] add Canvas extractors
- [ ] add extension storage
- [ ] add bridge handoff
- [ ] add JSON export fallback
- [ ] add tests
- [ ] run tests and patch
- [ ] add docs
- [ ] final validation

---

## 30. Appendix A — Domain templates for transfer scenarios

Codex should create a deterministic array like this and extend it to at least 20 domains:

```ts
export const DOMAIN_TEMPLATES = [
  { name: 'AI Ethics', template: 'An AI company must decide whether to {action}. The system would {consequence}.' },
  { name: 'Social Media', template: 'A platform discovers that {situation}. Users are {affected}.' },
  { name: 'Medical Ethics', template: 'A hospital with limited {resource} must choose between {optionA} and {optionB}.' },
  { name: 'Climate Policy', template: 'A government can adopt a policy that {benefit} but will also {cost}.' },
  { name: 'Workplace Ethics', template: 'An employee discovers their company is {action}. Reporting it would {consequence}.' },
  { name: 'Education Policy', template: 'A university must decide whether to {action} knowing that {tradeoff}.' },
  { name: 'Criminal Justice', template: 'A justice system must weigh {valueA} against {valueB} in a case involving {scenario}.' },
  { name: 'Data Privacy', template: 'A tech company can {benefitAction} by {privacyCost}.' },
  { name: 'Genetic Ethics', template: 'Parents can now {capability} for their unborn child, but {concern}.' },
  { name: 'Economic Justice', template: 'A policy would {helpGroupA} but {harmGroupB}.' },
  { name: 'Journalism', template: 'A newsroom has evidence that {situation}, but publishing it would {consequence}.' },
  { name: 'Public Health', template: 'Officials can {intervention}, which would {benefit} but also {cost}.' },
  { name: 'Family Ethics', template: 'A family must decide whether to {action} given that {context}.' },
  { name: 'Scientific Integrity', template: 'A lab discovers that {finding}, but disclosing it would {consequence}.' },
  { name: 'Environmental Policy', template: 'A region can protect {resource} by {restriction}, though it would {cost}.' },
  { name: 'Consumer Technology', template: 'A company can improve user experience by {action}, but that would {consequence}.' },
  { name: 'Civic Duty', template: 'Citizens must decide whether to {action} when {context}.' },
  { name: 'Labor Management', template: 'Management can {action} to improve efficiency, but workers would {consequence}.' },
  { name: 'Platform Moderation', template: 'A platform can {action} to reduce harm, but this may {tradeoff}.' },
  { name: 'Biotech Governance', template: 'Regulators can allow {capability}, but critics warn that {concern}.' }
];
```

---

## 31. Appendix B — Minimum dictionary sets

Codex should include small deterministic starter dictionaries:
- stopwords
- directive verbs
- philosopher names
- qualifier words
- objection cues
- compare/contrast cues
- sequence cues
- synonym pairs
- rhyme entries if using rhyme mnemonics

The dictionaries do not need to be huge. They need to be sufficient to make the engine function.

---

## 32. Appendix C — Practical truth-first positioning

The final README and docs should describe the system like this:

**Canvas Converter + Neural Forge** is a local-first deterministic study engine. It captures the course material a student actually visits in Canvas or imports from files, extracts structure and key concepts with transparent rule-based methods, aligns those concepts to instructor emphasis, and converts them into an interactive learning workflow with retrieval, discrimination, transfer, teach-back, and confidence calibration.

That positioning is both ambitious and honest.

---

## 33. End state

When the system is complete, a student should be able to:

1. browse Canvas with the extension,
2. click Done Learning,
3. open the static app,
4. import or receive the captured course pack,
5. optionally add a textbook PDF,
6. generate aligned chapter packs,
7. launch a 5-phase Neural Forge session,
8. get deterministic retention-oriented learning modules,
9. save progress locally,
10. resume later,
11. review a mastery report with blind spots, hidden strengths, and concept-specific next actions.

That is the full target.

---


## 34. Appendix D — Detailed multiple-choice template library

Codex should implement all of the following template families as discrete generator functions. Each generator should return either a valid `MultipleChoice` item or `null` if the evidence is insufficient.

### Template 1 — Definition Match
Prompt form:
- `Which of the following best describes [Concept]?`

Construction:
- correct answer = concept `core` definition with light rewording
- wrong option A = another concept’s core
- wrong option B = distorted version of the target core by exaggeration, negation, or qualifier change
- wrong option C = blend of target concept and a related concept

When to use:
- always eligible when a concept has a valid core definition

### Template 2 — Philosopher Attribution
Prompt form:
- `Which philosopher is most associated with [Concept]?`

Construction:
- extract philosophers from concept detail or nearby text
- correct = philosopher nearest the concept evidence
- distractors = philosophers from other concepts in chapter

Fallback:
- skip if no philosopher evidence

### Template 3 — Compare / Contrast
Prompt form:
- `How does [Concept A] differ from [Concept B]?`

Construction:
- use contrast edge or oppositeConceptIds
- correct = actual distinction
- wrong A = says no difference
- wrong B = reverses the distinction
- wrong C = imports irrelevant third-concept distinction

### Template 4 — Application Scenario
Prompt form:
- `A person who [scenario] is applying which framework or concept?`

Construction:
- abstract a scenario from concept detail or keywords
- correct = target concept/framework
- distractors = related but wrong frameworks

### Template 5 — Negation Check
Prompt form:
- `Which of the following is NOT a characteristic of [Concept]?`

Construction:
- three real characteristics from target concept
- one distractor characteristic from a different concept
- correct answer is the one that does not belong

### Template 6 — Fill the Framework
Prompt form:
- `In [Philosopher or Framework], [blank] plays the role of [role].`

Construction:
- infer a role phrase from the source
- correct = the concept filling that role
- wrong options = concepts from other frameworks

### Template 7 — Cause / Effect
Prompt form:
- `According to [Concept], what follows from [Premise]?`

Construction:
- identify causal or conditional language in source
- correct = stated consequence
- distractors = inverse, another concept’s consequence, or a plausible but unsupported result

### Template 8 — Objection Match
Prompt form:
- `Which of the following is a common objection to [Concept]?`

Construction:
- find objection cues near concept
- correct = real objection
- distractors = objections belonging to other concepts or a strength disguised as weakness

### Template 9 — Example Identification
Prompt form:
- `Which scenario best illustrates [Concept]?`

Construction:
- use detail example or build one from keywords
- distractors = related but wrong examples

### Template 10 — Sequence / Process
Prompt form:
- `In [method], what step comes after [Step A]?`

Construction:
- usable only if sequence cues exist
- correct = actual next step
- distractors = wrong order or steps from another process

### Template 11 — Terminology Precision
Prompt form:
- `What is the precise meaning of [technical term] in this context?`

Construction:
- target words with everyday and technical senses
- correct = technical sense
- distractors = everyday sense, cousin concept, fabricated-sounding but plausible definition

### Template 12 — Synthesis
Prompt form:
- `How would [Philosopher A / Concept A] respond to [Philosopher B / Concept B]'s claim that [claim]?`

Construction:
- use contrast edges
- correct = response based on A’s principles
- distractors = misattribution, oversimplification, reversal

### Template scheduling
Deep Drill target distribution:
- 4 easy
- 5 medium
- 3 hard

Boss Fight target distribution:
- 2 easy
- 4 medium
- 4 hard

If evidence is insufficient to meet this exact distribution:
1. preserve hard items first for Boss Fight,
2. preserve medium items second,
3. fill remainder with strongest easy items,
4. never produce malformed items.

---

## 35. Appendix E — Detailed corruption engine recipes

Codex should implement corruption items as first-class artifacts, not ad hoc string hacks.

### Level 1 — Wrong Framework
Recipe:
- choose a concept with known framework label
- swap the framework label or philosopher family
- preserve the rest of the sentence

### Level 2 — Reversed Relationship
Recipe:
- detect comparative statements
- invert higher/lower, more/less, superior/inferior, broader/narrower, prior/posterior
- preserve grammar

### Level 3 — Attribute Swap
Recipe:
- identify a key noun phrase in the concept core
- replace with a semantically adjacent but wrong noun phrase from the chapter concept pool

### Level 4 — Correct Fact / Wrong Implication
Recipe:
- use a true statement about the concept’s criticism or limitation
- append an incorrect conclusion not warranted by the chapter’s actual treatment

### Level 5 — Single Qualifier Flip
Recipe:
- find qualifier words such as:
  - merely
  - only
  - always
  - never
  - sometimes
  - necessarily
  - primarily
  - fundamentally
- remove or replace one qualifier
- produce correction and hint

### Hint templates
- `Watch the exact qualifier in the second clause.`
- `Check which framework is actually being credited here.`
- `The sentence is mostly right; one relationship direction is reversed.`
- `A single noun phrase is doing the damage here.`
- `This takes a real criticism and overextends it into a false conclusion.`

---

## 36. Appendix F — State machines by phase

Codex should implement explicit state machines rather than loose UI booleans.

### Genesis machine
States:
- `dilemma:intro`
- `dilemma:active`
- `dilemma:reveal`
- `dilemma:complete`
- `scan:active`
- `scan:flipped`
- `scan:complete`

### Forge machine
States:
- `forge:menu`
- `rapidfire:active`
- `rapidfire:result`
- `rapidfire:complete`
- `deepdrill:active`
- `deepdrill:learnfirst`
- `deepdrill:result`
- `deepdrill:complete`
- `forge:complete`

### Crucible machine
States:
- `crucible:menu`
- `spotlie:active`
- `spotlie:reveal`
- `spotlie:rate`
- `crossexam:active`
- `crossexam:reveal`
- `crossexam:rate`
- `transfer:active`
- `transfer:reveal`
- `transfer:rate`
- `crucible:complete`

### Architect machine
States:
- `architect:active`
- `architect:checked`
- `architect:rate`
- `architect:complete`

### Transcend machine
States:
- `transcend:active`
- `transcend:confidence`
- `transcend:answer`
- `transcend:result`
- `transcend:meta`
- `transcend:complete`

Transitions must be guarded so the user cannot accidentally skip required actions like confidence rating or wrong-answer meta-reflection when configured as required.

---

## 37. Appendix G — Inter-process handoff protocol

The extension and static app should communicate using a narrow typed protocol.

```ts
type BridgeMessage =
  | { type: 'NF_PACK_READY'; pack: CourseKnowledgePack }
  | { type: 'NF_PACK_ACK'; packId: string }
  | { type: 'NF_IMPORT_REQUEST' }
  | { type: 'NF_IMPORT_RESULT'; success: boolean; packId?: string; error?: string }
  | { type: 'NF_PING' }
  | { type: 'NF_PONG' };
```

Protocol behavior:
1. extension opens static app tab if needed
2. extension waits for `NF_PONG`
3. extension sends `NF_PACK_READY`
4. app validates and persists
5. app replies `NF_PACK_ACK`
6. extension shows success UI

If bridge fails:
- extension prompts JSON export fallback

---

## 38. Appendix H — File and storage schema details

### Extension capture record
```ts
interface CaptureRecord {
  id: string;
  courseId: string;
  courseTitle: string;
  itemUrl: string;
  itemTitle: string;
  itemKind: SourceKind;
  moduleId?: string;
  moduleTitle?: string;
  capturedAt: number;
  contentHash: string;
  rawDocument: RawSourceDocument;
}
```

### Local DB logical stores
- `captureRecords`
- `coursePacks`
- `chapterData`
- `progress`
- `settings`
- `diagnostics`

### Diagnostics record
```ts
interface DiagnosticRecord {
  id: string;
  scope: 'normalizer' | 'section' | 'concept' | 'focus' | 'generation' | 'bridge' | 'runtime';
  createdAt: number;
  level: 'info' | 'warn' | 'error';
  message: string;
  payload?: unknown;
}
```

Codex should instrument the engine enough to populate diagnostics for debug mode.

---

## 39. Appendix I — Deterministic seeded randomness

Where shuffling is desirable, use a seeded RNG derived from:
- chapter ID
- concept IDs
- generation type

This ensures stable outputs between sessions unless source content changes.

Pseudo-API:
```ts
const rng = createSeededRng(hash(`${chapterId}:${generationType}`));
shuffleWithRng(items, rng);
pickWithRng(pool, rng);
```

---

## 40. Appendix J — Fixture generation protocol

Codex should generate synthetic fixtures to test the engine even before real Canvas data is available.

Fixture families:
1. philosophy/ethics
2. biology/evolution
3. history/revolution
4. law/constitutional reasoning
5. sociology/inequality

Each fixture should include:
- textbook-like prose,
- at least 8 headings,
- explicit definitions,
- at least 2 compare/contrast passages,
- at least 1 objection passage,
- at least 1 sequential process,
- at least 1 rubric-like assignment,
- at least 1 discussion prompt,
- at least 1 instructor directive cluster.

This ensures the algorithmic pipeline is stress-tested.

---

## 41. Appendix K — Command protocol for Codex

If Codex has shell access, it should run commands in this style:

```bash
pnpm install
pnpm test
pnpm lint
pnpm typecheck
pnpm build
pnpm smoke-run-engine
```

If any command fails:
1. inspect failure
2. patch the minimal coherent set of files
3. rerun the failing command
4. rerun the dependent commands
5. continue only after green

Codex should not stop after first implementation pass. It should keep repairing until acceptance or a concrete blocker is reached.

---

## 42. Appendix L — Implementation priorities if time is constrained

If Codex must prioritize within one run, this is the order:

1. shared types and config
2. normalization and sectioning
3. concept extraction
4. instructor focus vector
5. relationship graph
6. chapter assembly
7. JSON import/export
8. static app home/import/course/chapter/report routes
9. Genesis, Forge, Transcend
10. extension capture/export
11. bridge handoff
12. Crucible and Architect polish
13. debug tooling
14. DOCX export

This is a fallback ordering, not permission to skip core constraints.

---

## 43. Appendix M — Practical UX copy rules

UI copy should be:
- serious
- plain-language
- not childish
- not falsely anthropomorphic
- not overly playful

Good examples:
- `Capture complete`
- `Imported course pack`
- `This concept is often confused with...`
- `Blind spot detected`
- `Hidden strength`
- `Why this matters in your course`

Avoid:
- cartoonish gamification language
- fake AI-sounding claims
- “I understand your textbook”
- “I know exactly what your professor wants”

---

## 44. Appendix N — Future-proof hooks

Codex should leave extension points for future optional features without implementing remote dependencies now:
- local search over imported documents
- user-authored concept notes
- manual concept merge/split tool
- manual question regeneration
- local corpus scholarly library ingestion
- spaced review queue across chapters
- browser extension capture analytics dashboard stored locally

These should be reflected in architecture seams, not necessarily fully built in v1.

---
