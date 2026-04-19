# CODEX COMPLETE HANDOFF — AEONTHRA Learning Platform

**Date:** April 11, 2026
**Version:** Final Shell with Reader OS, Transcript Mode, Margin Intelligence, Highlight Pipeline
**File:** `aeonthra-final.jsx` (1,938 lines, 172KB)
**Location:** `C:\Users\aquae\OneDrive\Documents (Dokyumento)\Canvas Converter\aeonthra-final.jsx`

---

## TABLE OF CONTENTS

1. What This Is
2. Project Structure (Canvas Converter)
3. Complete File Map (aeonthra-final.jsx)
4. All 18 Systems — What Each Does
5. All 13 Views — What Each Renders
6. All Data Structures — Schema + Real Examples
7. Integration: How to Wire Real Data
8. Critical Technical Notes (Bugs That WILL Recur)
9. What to Keep vs Replace
10. Success Criteria
11. Companion Files

---

## 1. WHAT THIS IS

`aeonthra-final.jsx` is a **complete, working React component** that defines the entire visual layer, interaction model, learning systems, and UI for the AEONTHRA learning platform. It currently runs as a standalone Claude artifact with hardcoded demo data for PHI 208 (Ethics and Moral Reasoning).

**Codex's mission:** Wire real Canvas data, textbook content, and the existing content/interaction pipelines into this shell, replacing hardcoded data while preserving every visual detail.

The shell is not a mockup. Every surface, animation, interaction pattern, and learning system has been tested. The file contains:
- 6 hardcoded ethics concepts with full question banks
- 6 assignments with enriched readiness data
- 5 modules mapped to textbook chapters
- 6 philosophers with tagged quotes
- 3 distinction pairs with exercises
- 2 textbook chapters with rich reading content
- 1 lecture transcript with timestamped lines
- 8 margin annotations across chapters
- A highlight pipeline with 6 tag types
- A threaded discussion stub (data removed for size, structure preserved)
- A complete welcome-to-mastery user journey

---

## 2. PROJECT STRUCTURE (Canvas Converter)

```
Canvas Converter/
├── apps/
│   ├── web/                          ← MAIN WEB APP (Vite + React + TS)
│   │   ├── src/
│   │   │   ├── App.tsx               ← Current root (REPLACE visual layer with shell)
│   │   │   ├── main.tsx              ← Entry point (keep)
│   │   │   ├── components/           ← Old components (reference for data patterns, then remove)
│   │   │   │   ├── MissionControl.tsx
│   │   │   │   ├── ForgeStudio.tsx
│   │   │   │   ├── OraclePanel.tsx
│   │   │   │   ├── AssignmentWorkbench.tsx
│   │   │   │   ├── CollisionLab.tsx
│   │   │   │   ├── ConceptMapBoard.tsx
│   │   │   │   ├── TimelineBoard.tsx
│   │   │   │   ├── GravityFieldBoard.tsx
│   │   │   │   ├── DuelArena.tsx
│   │   │   │   ├── InteractionDeck.tsx
│   │   │   │   ├── ShadowReaderRail.tsx
│   │   │   │   └── primitives/       ← Button, Card, Glow, Loader, Timer
│   │   │   ├── lib/                  ← Data logic (KEEP ALL — this is the engine)
│   │   │   │   ├── demo.ts           ← Demo data generator
│   │   │   │   ├── storage.ts        ← localStorage persistence
│   │   │   │   ├── workspace.ts      ← Workspace derivation (tasks, chapters, concepts)
│   │   │   │   ├── forge-session.ts  ← Forge session creation (5-phase question engine)
│   │   │   │   ├── bridge.ts         ← Chrome extension bridge
│   │   │   │   ├── pdf-ingest.ts     ← PDF text extraction
│   │   │   │   ├── textbook-processor.ts ← Content engine bridge (Web Worker)
│   │   │   │   ├── interactions-runtime.ts ← Interaction engine (oracle, collisions, duels)
│   │   │   │   ├── interactions-storage.ts ← Interaction persistence
│   │   │   │   ├── export.ts         ← Markdown export
│   │   │   │   ├── display.ts        ← Display utilities
│   │   │   │   ├── tts.ts            ← Text-to-speech
│   │   │   │   └── submission.ts     ← Assignment submission
│   │   │   └── styles/               ← CSS (REMOVE — shell uses inline styles)
│   │   ├── index.html
│   │   └── vite.config.ts
│   └── extension/                    ← Chrome extension (leave untouched)
├── packages/
│   ├── content-engine/               ← Deterministic content processing
│   ├── interactions-engine/          ← Interaction generation (oracle, collisions, duels)
│   └── schema/                       ← Zod schemas (CaptureBundle, LearningBundle, etc.)
├── aeonthra-final.jsx               ← THE SHELL (this file)
├── CODEX_COMPLETE_HANDOFF.md        ← THIS DOCUMENT
└── package.json                     ← Monorepo root (Vite, React 18, framer-motion, zod)
```

---

## 3. COMPLETE FILE MAP (aeonthra-final.jsx)

### Line-by-line structure

```
Lines     1-4      Import (React hooks: useState, useCallback, useEffect, useRef)
Lines     5-115    CD — Concept Data (6 concepts with TF/MC questions)
Lines   116-160    ASSIGNMENTS — 6 enriched assignments
Lines   161-162    Section comments
Lines   163-179    READING — 2 textbook chapters with sections + body text
Lines   180-204    MARGINS — 8 contextual annotations keyed by readingId:sectionIdx
Lines   205-215    MARGIN_TYPES — 8 annotation type definitions
Lines   216-218    DISCUSSIONS — stub (empty array, structure preserved)
Lines   219-220    QUALITY_META — stub (empty object)
Lines   222-239    TRANSCRIPTS — 1 lecture with 2 segments, 9 timestamped lines
Lines   241-266    DISTS — 3 distinction pairs with border/trap/twins/enemy text
Lines   268-298    PH — 6 philosophers with quotes, page numbers, tags
Lines   299-300    Module-level helpers (mc2, P)

Lines   301        export default function App() {

Lines   302-336    React state: view, launched, fade, selectedConcept, selectedAssignment,
                   cc (concepts with mastery), done, Forge state (phase/indices/answers),
                   Oracle state, streak, scores, toast, practice state, etc.
Lines   337-395    MEMORY FOSSILIZATION SYSTEM — state + stage calculation + ghost tracking
Lines   396-402    ARGUMENT FORGE — state (forgeStage, thesis, outline, draft)
Lines   403-461    FLOW-STATE CONDUCTOR — rolling speed, streak, miss tracking,
                   state inference (cold/warming/flow/struggling/recovering/cruising),
                   recordAnswerFlow function with ghost creation
Lines   462-476    READER OS — state (readerContent, readerSection, sectionMarks,
                   readingPositions, sectionsRead, readerSaved)
Lines   477-519    HIGHLIGHT PIPELINE — state (highlights, hlPopover, hlTrayOpen),
                   mouseup selection handler, addHighlight with mastery boost,
                   hlTagColor + hlTagIcon helpers
Lines   520-542    SCROLLSPY — IntersectionObserver for active section tracking,
                   auto-scroll left rail
Lines   543-559    TRANSCRIPT + DISCUSSION state
Lines   560-599    More state: sessionTime timer, generateQuestions engine,
                   keyboard handler (T/F/Space/Enter shortcuts)
Lines   600-665    go() navigation callback, bump() mastery helper, flash() toast,
                   triggerCelebration, openReader, openReaderForChapter,
                   openTranscript, formatTime, playback timer effect,
                   derived values (mastered, avg, nextA), askO (oracle query)

Lines   666-706    STYLE CONSTANTS + computed helpers:
                   B, CD2, BD, CY, TL, GD, RD, TX, T2, MU, DM (colors)
                   card, ey, hd, bt, innr (style objects)
                   flowColor, flowExplanationDensity, flowShouldShowHint,
                   flowFeedbackIntensity, flowCardGlow, flowBorderColor (flow-state derived)
                   sectionMarkIcon, sectionMarkColor (memory mark helpers)
                   thesisTemplates (4 demand types × 3 templates)
                   paraTypes (7 paragraph skeleton types)
                   MODULES (5 modules with chapters, concepts, textbook links)

Lines   707-718    return( — main JSX begins
                   Ambient glow orbs (2 fixed radial gradients)

Lines   719-753    WELCOME SCREEN — quadrant tiles with ripple effect
Lines   755-792    LAUNCHED WRAPPER — nav bar, toast overlay, celebration overlay, <main>

Lines   794-940    HOME — adaptive greeting, progress ring, quick paths, Next Win card,
                   assignment readiness strip, module progress cards
Lines   941-1015   ATLAS (Journey) — horizontal scrolling landscape with ascending modules
Lines  1016-1088   CONCEPTS (Explore) — 2-column grid with concept cards + detail panel
Lines  1089-1304   ASSIGNMENT — readiness ring, demand translation, failure modes,
                   Argument Forge (thesis templates), discussion thread access
Lines  1305-1537   FORGE (Learn) — 6-phase Neural Forge with flow-state adaptation,
                   memory fossilization, ghost surfacing, streak celebration
Lines  1538-1558   COMPARE — Who Said This? attribution game
Lines  1559-1659   ORACLE — philosopher tribunal with 4 modes
Lines  1660-1746   COURSEWARE — chapter browser with practice launcher
Lines  1747-1789   PRACTICE — standalone question runner
Lines  1790-1835   READER OS — three-column reading surface
Lines  1836-1855   TRANSCRIPT MODE — time-synchronized transcript viewer
Lines  1856-1874   DISTINCTION GYM — concept pair exercises
Lines  1875-1888   SETTINGS — question count, difficulty, learning mode
Lines  1889-1900   STATS — mastery overview + per-concept breakdown
Lines  1901        </main></>} — close launched wrapper

Lines  1902-1934   <style> — CSS animations (fadeUp, pulse, shimmer, glow, float,
                   gradientMove, celebrate, floatParticle, rippleExpand, flowPulse,
                   masterySurge, completionBloom, unlockGlow, countUp, streakFire,
                   phaseComplete) + global styles + scrollbar theming
Lines  1935-1937   </div>); } — close component
```

---

## 4. ALL 18 SYSTEMS

### 4.1 Neural Forge (Learn)
The core learning engine. 6 phases in sequence:
1. **Orient** — 4 concept cards of increasing depth (core → depth → distinction → hook+trap)
2. **Apply** — Ethical dilemma with options (concept's built-in dilemma)
3. **Recall** — True/False questions from concept's `tf` array
4. **Prove** — Multiple Choice questions from concept's `mc` array
5. **Reinforce** — Flashcard review of concept definition, memory hook
6. **Attribute** — "Who Said This?" — match philosopher quotes to names

Phase path rendered as connected buttons. SVG mastery ring. Flow-state glow. Streak banner. Ghost surfacing.

### 4.2 Flow-State Conductor
Invisible behavioral tracking that adapts the UI:
- **Tracks:** rolling 10-answer speed, streak, consecutive misses, total accuracy, answer volume
- **Infers 6 states:** cold, warming, flow, struggling, recovering, cruising
- **Adapts:** card glow intensity, hint visibility, explanation density, feedback tone, recovery prompts
- **Variables:** `flowColor`, `flowExplanationDensity`, `flowShouldShowHint`, `flowFeedbackIntensity`, `flowCardGlow`, `flowBorderColor`

### 4.3 Memory Fossilization System
5-stage per-concept memory model:
- **Stages:** unseen → fragile → forming → stable → crystallized
- **Icons:** ⚫ 🟠 🔵 🟢 💎
- **Tracks:** firstSeen, lastPracticed, missCount, correctStreak, stage
- **Ghost system:** Past mistakes resurface as `{question, conceptId, missedAt, resurfaced}`. Ghosts appear during Forge sessions with "👻 This concept tripped you up before."
- **Memory imprint cards:** Shown after concept completion with core definition + hook
- **Delayed recall:** 10% chance of cross-concept recall during sessions

### 4.4 Reader OS
Three-column reading surface for textbook chapters:
- **Left rail (280px):** Chapter title, subtitle, progress bar, section outline with scrollspy, concept links with memory icons, assignment links
- **Center (680px):** Chapter header, section headings with active indicators, body text at 1.08rem/2.05 line-height, margin annotations, section mark buttons, highlight popover
- **Right rail (48px→240px):** Collapsible utility drawer with progress %, practice/oracle buttons
- **Features:** IntersectionObserver scrollspy, reading position persistence, resume indicator, section marks (understood/important/revisit/confusing), visual states (teal glow for understood, red tint for confusing), concept neighborhood indicator

### 4.5 Transcript Mode
Time-synchronized lecture viewer:
- **Left rail (260px):** Playback controls (play/pause, scrub bar, ±15s, auto-scroll), segment markers
- **Center (700px):** Timestamped transcript lines with active-line highlighting (violet), click-to-jump
- **Simulated playback:** 1x speed timer via `setInterval`, position tracking
- **Segment markers:** Chapter-like navigation for lecture structure

### 4.6 Margin Intelligence
Contextual annotations that appear below body text in the Reader:
- **8 types:** Key Insight (★), Plain English (💬), Common Confusion (⚠), Assignment Link (📋), Concept Border (⚖️), Thesis Material (✦), Philosopher's View (🏛), Memory Hook (🔗)
- **Visibility:** Full set on active section, only ⚠ and 📋 on inactive sections
- **Dismissible:** ✕ button, tracked in `marginDismissed` Set
- **Data:** `MARGINS` object keyed by `readingId:sectionIdx`

### 4.7 Highlight Pipeline
Text-to-mastery system for selected text in the Reader:
- **Selection:** mouseup handler detects 5-500 char selections
- **Popover:** 6 tag buttons appear at selection position
- **Tags:** key idea (★), evidence (📌), quote (❝), thesis fuel (✦), confusing (?), revisit (↻)
- **Mastery boost:** "key idea" and "evidence" tags call `bump(conceptId, .02)`
- **Storage:** highlights array capped at 100, displayed in Reader library
- **Colors:** `hlTagColor()` and `hlTagIcon()` helper functions

### 4.8 Distinction Gym
Concept pair exercises:
- **Grid of pairs:** Each shows two concepts with "vs" between them
- **Detail view:** Shows border (where one stops and the other begins), trap (common confusion), twins (why they seem similar), and practice buttons for each concept
- **Data:** `DISTS` array with `{a, b, label, border, trap, twins, enemy}`

### 4.9 Assignment Alchemy
Enriched assignment view:
- **Readiness ring:** SVG showing concept preparedness
- **"What It's Really Asking"** — plain-language demand translation
- **"What Instructors Secretly Care About"** — hidden evaluation criteria
- **Common Mistakes** — ranked failure modes
- **Evidence Requirements** — what the response needs
- **Fastest Path to Ready** — time estimate with concept gaps

### 4.10 Argument Forge
Writing workbench inside assignments:
- **Stage 1 (Thesis):** Templates matched to demand type (Apply/Compare/Defend/Synthesize), concept chips
- **Stage 2 (Outline):** 7 paragraph types (Framing, Claim, Evidence, Counter, Rebuttal, Synthesis, Conclusion) as colored draggable blocks
- **Stage 3 (Draft):** Guided textarea with outline sidebar

### 4.11 Oracle Tribunal
Multi-philosopher response system:
- **Ask:** Free-text question, keyword matching against philosopher quote tags
- **Display:** Philosopher cards with name, tradition, relevance score, best-matching quote with page number
- **Data:** `PH` array with `{n, t, q: [{x, p, tg}]}`

### 4.12 Course Atlas
Horizontal scrolling landscape:
- **Ascending modules:** Each module climbs 70px higher via `translateY`
- **Per-module:** Header with mastery %, textbook chapters with "Read →" buttons, concept nodes with fire/active/locked states, assignment cards
- **SVG connectors:** Curved lines between modules

### 4.13 Welcome Screen
Quadrant tile entry:
- **4 tiles:** ⚡ Quick Session, 📝 Assignment Prep, 🧠 Deep Understanding, 🌊 Calm Start
- **Ripple effect:** Material-style ripple from exact click point
- **Frosted panel:** Center panel with AEONTHRA title + course name
- **Hover:** Other tiles fade to 25% opacity

### 4.14 Home Page
Adaptive first screen:
- **Greeting:** Changes with progress level (5 variants)
- **Progress ring:** SVG mastery indicator
- **Quick paths:** 5-min review, Assignment prep, Journey map, Explore, Stats
- **"Your Next Win"** card with readiness framing
- **Assignment readiness strip:** All assignments with % bars
- **Module progress cards:** 5-card strip

### 4.15 Reward System
CSS animations for progression moments:
- `masterySurge` — mastery bar growth
- `completionBloom` — concept completion
- `unlockGlow` — new concept unlock
- `streakFire` — streak milestones
- `floatParticle` — celebration particles (20 floating emoji)
- `rippleExpand` — welcome screen tile click
- `celebrate` — general celebration pulse

### 4.16 Question Generation Engine
Deterministic question creation from concept data:
- `generateQuestions(conceptId, count)` — creates TF + MC questions
- TF: Uses concept's `tf` array, adds cross-concept confusion questions
- MC: Uses concept's `mc` array, adds keyword-based questions
- Scales from 5 to 100 questions per set via Settings

### 4.17 Courseware Library
Chapter browser + practice launcher:
- **Chapter list:** All modules with concept mastery percentages
- **Concept selector:** Click to filter by concept
- **Practice launcher:** Generate question set and enter Practice view
- **Question count:** Respects Settings (5/10/25/50)

### 4.18 Settings
Minimal controls:
- **Questions per set:** 5, 10, 25, 50
- **Difficulty:** mixed, hard, review
- **Learning mode:** learn, test, adaptive

---

## 5. ALL 13 VIEWS

| View | Route | Purpose | Key Elements |
|------|-------|---------|-------------|
| Welcome | `!launched` | Entry ritual | 4 quadrant tiles, ripple effect, frosted panel |
| Home | `v==="home"` | Orientation | Greeting, progress ring, Next Win, readiness strip |
| Atlas | `v==="journey"` | Course map | Horizontal landscape, ascending modules |
| Concepts | `v==="explore"` | Concept browser | 2-col grid, detail panel, memory stages |
| Assignment | `v==="assignment"` | Prep lab | Readiness ring, demand translation, Argument Forge |
| Forge | `v==="forge"` | Learning | 6-phase path, flow adaptation, ghosts |
| Compare | `v==="compare"` | Attribution | "Who Said This?" game |
| Oracle | `v==="oracle"` | Philosophy | Philosopher tribunal |
| Courseware | `v==="courseware"` | Library | Chapter browser, practice launcher |
| Practice | `v==="practice"` | Quiz runner | TF/MC questions, score tracking |
| Reader | `v==="reader"` | Reading | 3-col layout, scrollspy, margins, highlights |
| Transcript | `v==="transcript"` | Lectures | Time-synced lines, playback controls |
| Gym | `v==="gym"` | Distinctions | Concept pair exercises |
| Settings | `v==="settings"` | Config | Question count, difficulty, mode |
| Stats | `v==="stats"` | Progress | Mastery overview, per-concept breakdown |

---

## 6. DATA STRUCTURES

### CD — Concept Data
```javascript
const CD = [
  {
    id: "util",           // Unique identifier
    name: "Utilitarianism", // Display name
    cat: "Consequentialism", // Category/tradition
    core: "...",          // 1-sentence definition
    depth: "...",         // Deeper explanation
    dist: "...",          // What distinguishes it from similar concepts
    hook: "...",          // Memory hook
    trap: "...",          // Common student mistake
    kw: ["keyword1", ...], // Keywords for question generation
    conn: ["deont", ...],  // Connected concept IDs
    dil: {                // Ethical dilemma
      t: "Title",
      o: ["Option A", "Option B", ...]
    },
    tf: [                 // True/False questions
      { s: "Statement text", a: true },
      ...
    ],
    mc: [                 // Multiple Choice questions
      { q: "Question text", o: ["A","B","C","D"], c: 0 }, // c = correct index
      ...
    ]
  },
  // 6 concepts: util, deont, catimperative, virtue, relativism, care
];
```

**Map from LearningBundle:** `concepts.id → id`, `concepts.definition → core`, `concepts.keyPoints → depth`, etc.

### ASSIGNMENTS
```javascript
const ASSIGNMENTS = [
  {
    id: "a1", title: "Ethics Paper 1", sub: "Apply Utilitarianism",
    type: "📝",         // 📝=paper, 💬=discussion, ❓=quiz, 📊=exam
    due: 7,             // Days until due
    pts: 100,           // Point value
    con: ["util"],      // Required concept IDs
    reallyAsking: "...",     // Plain-language demand
    demand: "Apply + Evaluate", // Demand classification
    demandIcon: "🔬",
    secretCare: "...",       // What instructors evaluate
    failModes: ["...", ...], // Common mistakes
    evidence: "...",         // Evidence requirements
    quickPrep: "..."         // Time estimate
  }, ...
];
```

**Map from workspace.tasks:** `task.id → id`, `task.title → title`, `task.pointsPossible → pts`, `task.conceptIds → con`, etc.

### READING
```javascript
const READING = [
  {
    id: "r1", module: "m1",
    title: "What Is Ethics?", subtitle: "Chapter 1 · pp. 1-18",
    type: "chapter",
    concepts: ["util"],       // Related concept IDs
    assignments: ["a1"],      // Related assignment IDs
    sections: [
      { heading: "Section Title", body: "Paragraph text..." },
      ...
    ]
  }, ...
];
```

**Map from LearningBundle:** `chapters.id → id`, `chapters.title → title`, `chapters.passages → sections`

### MARGINS
```javascript
const MARGINS = {
  "r1:0": [  // readingId:sectionIdx
    { type: "hook", text: "Annotation text", color: "#ffd700" },
    { type: "confusion", text: "Warning text", color: "#ff4466" },
  ],
  "r1:1": [ ... ],
  ...
};
```

### TRANSCRIPTS
```javascript
const TRANSCRIPTS = [
  {
    id: "t1", title: "Lecture 1", speaker: "Prof. Harrison",
    duration: 2340, type: "lecture",
    concepts: ["util"], assignments: ["a1"],
    segments: [
      {
        id: "s1", label: "Opening", ts: 0,  // timestamp in seconds
        lines: [
          { t: 0, text: "Welcome everyone..." },
          { t: 8, text: "Before we define..." },
        ]
      }, ...
    ]
  }, ...
];
```

### DISTS
```javascript
const DISTS = [
  {
    a: "util", b: "deont",  // Concept pair IDs
    label: "Outcomes vs Duties",
    border: "Where one stops and the other begins",
    trap: "Why students confuse them",
    twins: "What makes them look similar",
    enemy: "Where they directly conflict"
  }, ...
];
```

### PH — Philosophers
```javascript
const PH = [
  {
    n: "Jeremy Bentham", t: "Utilitarianism",
    q: [
      { x: "Quote text", p: 44, tg: ["tag1", "tag2"] }
    ]
  }, ...
];
```

### MODULES
```javascript
const MODULES = [
  {
    id: "m1", title: "Module 1: Foundations",
    ch: "Chapters 1-2", pages: "pp. 1-55",
    desc: "Module description",
    concepts: ["util", "felicific"],
    textbook: [
      { title: "Chapter Title", pages: "1-18", summary: "..." }
    ]
  }, ...
];
```

---

## 7. INTEGRATION: HOW TO WIRE REAL DATA

### Phase 1: Convert Shell to TSX
1. Copy `aeonthra-final.jsx` to `apps/web/src/AeonthrShell.tsx`
2. Add TypeScript types for all data structures
3. Replace hardcoded data with props or context

### Phase 2: Map Data
| Shell Data | Real Source | How to Map |
|-----------|-----------|-----------|
| `CD` (concepts) | `LearningBundle.concepts` | `definition → core`, `keyPoints → depth`, generate TF/MC from content engine |
| `ASSIGNMENTS` | `workspace.tasks` | `title → title`, `pointsPossible → pts`, `conceptIds → con`, classify demand from description |
| `MODULES` | `LearningBundle.chapters` grouped | Group chapters by sequence |
| `PH` (philosophers) | `interactions.thinkerRoster` | Map thinker responses |
| `DISTS` | `LearningBundle.relations` where `type==="contrasts"` | Generate border/trap text from contrasting concepts |
| `READING` | `LearningBundle.chapters` + passages | Map `passages → sections` |
| `TRANSCRIPTS` | New — parse from video/audio content | Future feature |
| `MARGINS` | Generate from concept relations + assignment links | Content engine can infer |

### Phase 3: Preserve Import Pipeline
The shell shows a welcome screen immediately. The real app needs:
1. **No bundle** → Show import UI (file upload, PDF, paste, extension) styled with AEONTHRA aesthetic
2. **Processing** → Show processing overlay styled with AEONTHRA aesthetic
3. **Ready** → Show AEONTHRA shell with real data

The import flow from current `App.tsx` should be preserved exactly.

### Phase 4: Wire Persistence
| Shell State | Real Storage |
|------------|-------------|
| `cc[i].mastery` | `progress.conceptMastery[conceptId]` |
| `done` Set | `progress.chapterCompletion[chapterId] >= 1` |
| `draft[assignmentId]` | `drafts[taskId]` (already in storage.ts) |
| `memoryState` | New field in progress object |
| `ghosts` | New field in progress object |
| `sectionMarks` | New field in progress object |
| `readingPositions` | New field in progress object |
| `highlights` | New field in progress object |
| `streak`, `bestStreak` | New fields in progress object |
| `conceptStats` | New field in progress object |

### Phase 5: Wire Forge to Real Questions
| Shell Phase | Real Forge Phase |
|------------|-----------------|
| Orient (4 depth cards) | Genesis (dilemmas + scan) |
| Apply (dilemma) | Genesis (dilemmas specific) |
| Recall (T/F) | Forge (rapid) |
| Prove (MC) | Forge (drill) + Crucible (crossExam) |
| Reinforce (flashcards) | Crucible (lies) |
| Attribute (who said this) | Transcend (boss) |

---

## 8. CRITICAL TECHNICAL NOTES

### Bug 1: CSS Void
The original `app.css` had `min-height: 100vh` on `.view` sections + CSS Grid that created a 500-2000px black void. The shell uses **inline styles exclusively** and does not have this bug. Do NOT reintroduce `min-height: 100vh` on section containers.

### Bug 2: Scoping Order
Style constants (`CY`, `TL`, `GD`, `MU`, etc.) are defined as `const` on line 666. ANY computed value referencing these MUST be defined AFTER them. This caused "Cannot access 'X' before initialization" errors twice. In TypeScript, consider making these a `const` object at module scope.

### Bug 3: Smart Quotes
Curly/typographic quotes (`""` U+201C/U+201D) cause JSX parse failures. The file uses `❝` (U+275D) instead.

### Bug 4: Variation Selectors
Unicode variation selectors (U+FE0F) after emoji cause some JSX parsers to miscount tokens. All 15 were stripped from the file.

### Bug 5: File Size Limit
The Claude artifact renderer fails to parse JSX files over ~200KB / ~2200 lines. The current file is 172KB / 1938 lines. When adding content, stay under these limits.

### Bug 6: Missing Fragment Close
The `{launched&&<>` wrapper that contains the nav bar, toast, celebration, and `<main>` content area MUST close with `</main></>}` before the `<style>` tag. Missing this causes every view to fail with "Unexpected token, expected ';'".

### Bug 7: Duplicate Function Declarations
If `recordAnswerFlow` replaces `recordAnswer`, remove the old function entirely. Truncated dead code creates cascading parse failures.

### Note: Google Fonts
The shell loads Inter and Space Grotesk via `@import` in the `<style>` tag. In the Vite build, move to `index.html` `<link>` tags for better performance.

---

## 9. WHAT TO KEEP VS REPLACE

### KEEP from the Shell (everything visual)
- All inline styles, color palette, font choices, spacing
- All CSS animations (15 keyframe definitions)
- Welcome screen quadrant tiles with ripple
- Home page adaptive greeting + Next Win card
- Course Atlas ascending landscape
- Neural Forge 6-phase path with flow adaptation
- Reader OS three-column layout with scrollspy
- Transcript Mode with playback controls
- Margin Intelligence annotation system
- Highlight Pipeline with mastery boost
- Distinction Gym pair exercises
- Oracle Tribunal philosopher cards
- Assignment Alchemy readiness lab
- Argument Forge thesis → outline → draft
- Stats overview + per-concept breakdown
- Settings controls
- Keyboard shortcuts (T/F, Space, Enter)
- Material ripple effects, ambient glow orbs
- Memory Fossilization with ghost system
- Flow-State Conductor behavioral tracking
- Reward System (celebration overlay, streak banners)

### KEEP from the Existing Project (everything data)
- All of `packages/` (content-engine, interactions-engine, schema)
- All of `apps/web/src/lib/` (every .ts file)
- `apps/extension/` (Chrome extension)
- Import pipeline (file upload, PDF, extension bridge, text paste)
- Storage layer (localStorage)
- Web Worker (textbook processing)
- Build system (Vite, TypeScript)

### REMOVE / REPLACE
- `apps/web/src/styles/app.css` — source of CSS void bug
- All existing components in `apps/web/src/components/` — replaced by shell views
- The visual layer of `App.tsx` — replace JSX with shell, keep state/effects/pipeline

---

## 10. SUCCESS CRITERIA

1. ✅ Importing a Canvas JSON bundle or PDF works exactly as before
2. ✅ AEONTHRA welcome screen appears (quadrant tiles, ripple effects)
3. ✅ Home page shows real assignments with readiness percentages
4. ✅ Course Atlas shows real modules/chapters ascending upward
5. ✅ Neural Forge generates real questions from textbook content
6. ✅ Oracle responds with real philosopher/thinker positions
7. ✅ Distinction Gym generates real concept pair exercises
8. ✅ Reader OS displays real chapter content with scrollspy + margins
9. ✅ Transcript Mode plays real lecture content (when available)
10. ✅ Highlights boost concept mastery
11. ✅ Progress persists via localStorage
12. ✅ Flow-State Conductor adapts based on real answer data
13. ✅ Memory Fossilization tracks real concept memory stages
14. ✅ Assignment Alchemy shows real assignment analysis
15. ✅ Argument Forge persists thesis/outline/draft
16. ✅ No CSS void bug
17. ✅ All animations render smoothly
18. ✅ App works offline after first load

---

## 11. COMPANION FILES

| File | Purpose | Size |
|------|---------|------|
| `aeonthra-final.jsx` | The complete shell — source of truth for all UI | 172KB |
| `CODEX_COMPLETE_HANDOFF.md` | This document — integration blueprint | — |
| `BUILD_REPORT.md` | Documents every system built across all sessions | 48KB |
| `EXPERIENCE_NOTES.md` | Intended user journey minute by minute | 10KB |
| `CODEX_MASTER_INSTRUCTION.md` | Earlier integration spec (superseded by this doc) | 19KB |

### Build History (Transcripts)
| Session | Transcript | What Was Built |
|---------|-----------|---------------|
| Session 1 | `2026-04-10-07-26-45-neural-forge-build.txt` | Original Neural Forge v4 |
| Session 2 | `2026-04-10-09-30-38-aeonthra-codex-specs.txt` | Codex spec documents |
| Session 3 | `2026-04-11-06-32-51-aeonthra-codex-build-sessions.txt` | Codex build attempts |
| Session 4 | `2026-04-11-08-46-30-aeonthra-codex-build-sessions.txt` | More Codex build work |
| Session 5 | `2026-04-11-11-18-20-aeonthra-full-rebuild-sessions.txt` | Complete rebuild from scratch |
| Session 6 | `2026-04-11-21-38-44-aeonthra-full-rebuild-sessions-2.txt` | Reader OS, Transcript, Margins, Highlights, Discussions, bug fixes |

---

## FINAL NOTE

The shell is not a mockup. It is a complete, working product with 18 integrated systems across 13 views. Every surface, every animation, every interaction pattern has been tested and refined across 6 build sessions. The visual design, learning philosophy, and emotional intelligence are defined in this file.

Codex's job is to wire real data into these exact surfaces while preserving every detail of the experience. Do not simplify. Do not remove animations. Do not replace surfaces with simpler versions. Wire real data in, preserve the aesthetic, and ship it.
