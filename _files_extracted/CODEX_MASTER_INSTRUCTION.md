# CODEX MASTER INSTRUCTION — AEONTHRA Shell Integration

## STATUS
The file `aeonthra-final.jsx` has been placed in the project root at:
```
C:\Users\aquae\OneDrive\Documents (Dokyumento)\Canvas Converter\aeonthra-final.jsx
```

This file is a **complete, working React component** (2,000+ lines) that defines the entire visual layer, interaction model, learning systems, and UI for the AEONTHRA learning platform. It currently runs as a standalone Claude artifact with hardcoded demo data.

**Your mission**: integrate this shell into the existing Canvas Converter Vite+React+TypeScript monorepo so that real Canvas data, textbook content, and the existing content pipeline power the AEONTHRA UI.

---

## PROJECT STRUCTURE (existing)

```
Canvas Converter/
├── apps/
│   ├── web/                          ← MAIN WEB APP (Vite + React + TS)
│   │   ├── src/
│   │   │   ├── App.tsx               ← Current root component (REPLACE visual layer)
│   │   │   ├── main.tsx              ← Entry point (keep)
│   │   │   ├── components/           ← Existing components (reference for data patterns)
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
│   │   │   │   └── primitives/
│   │   │   ├── lib/                  ← Data logic (KEEP ALL)
│   │   │   │   ├── demo.ts           ← Demo data generator
│   │   │   │   ├── storage.ts        ← localStorage persistence
│   │   │   │   ├── workspace.ts      ← Workspace derivation
│   │   │   │   ├── forge-session.ts  ← Forge session creation
│   │   │   │   ├── bridge.ts         ← Extension bridge
│   │   │   │   ├── pdf-ingest.ts     ← PDF processing
│   │   │   │   ├── textbook-processor.ts ← Content engine bridge
│   │   │   │   ├── interactions-runtime.ts ← Interaction engine bridge
│   │   │   │   ├── interactions-storage.ts ← Interaction persistence
│   │   │   │   └── export.ts         ← Export utilities
│   │   │   └── styles/               ← CSS (REPLACE with inline styles from shell)
│   │   │       ├── app.css           ← Main CSS (had the void bug)
│   │   │       ├── global.css
│   │   │       └── tokens.css
│   │   ├── index.html
│   │   └── vite.config.ts
│   └── extension/                    ← Chrome extension (leave alone for now)
├── packages/
│   ├── content-engine/               ← Deterministic content processing
│   ├── interactions-engine/          ← Interaction generation
│   └── schema/                       ← Zod schemas for data types
├── aeonthra-final.jsx               ← THE NEW SHELL (this file)
└── package.json                     ← Monorepo root
```

---

## WHAT TO DO — STEP BY STEP

### PHASE 1: Understand the Data Flow

The existing app has this pipeline:
1. User imports a Canvas JSON bundle OR uploads a PDF/text textbook
2. `textbook-processor.ts` runs the content engine (in a Web Worker) to produce a `LearningBundle`
3. `workspace.ts` derives tasks, chapters, concepts, relations from the bundle
4. Components render surfaces using this derived data
5. `storage.ts` persists progress to localStorage

The key data types (from `@learning/schema`):
- `CaptureBundle` — raw imported data (Canvas pages, assignments, etc.)
- `LearningBundle` — processed learning content (concepts, relations, chapters, etc.)
- `AppProgress` — student progress (concept mastery, chapter completion, etc.)

The key derived types (from `workspace.ts`):
- `tasks` — assignments/discussions with due dates, points, etc.
- `chapters` — textbook chapters with concept associations
- `concepts` — individual concepts with definitions, relations
- `weeks` — time-grouped task collections

### PHASE 2: Convert the Shell from JSX to TSX

The `aeonthra-final.jsx` file uses:
- `import { useState, useCallback, useEffect } from "react"` — standard React hooks
- Inline styles (no CSS files needed)
- Google Fonts loaded via `@import` in a `<style>` tag
- All data hardcoded as `const` arrays

Convert it to TypeScript:
1. Copy `aeonthra-final.jsx` to `apps/web/src/AeonthrShell.tsx`
2. Add TypeScript types for the hardcoded data structures
3. Replace hardcoded data with props or context that receive real data

### PHASE 3: Map Hardcoded Data to Real Data

The shell has these hardcoded data arrays that need to be replaced:

#### `CD` (Concept Data) → Map from `LearningBundle.concepts`
```typescript
// SHELL (hardcoded):
const CD = [
  { id: "util", name: "Utilitarianism", cat: "Consequentialism",
    core: "...", depth: "...", dist: "...", hook: "...", trap: "...",
    kw: [...], conn: [...],
    dil: { t: "...", o: [...] },
    tf: [...], mc: [...] }
];

// REAL DATA: Map from LearningBundle
// concepts: Array<{ id, name, definition, keyPoints, relations }>
// The content engine already extracts concepts from textbook content.
// Map each concept's fields:
//   core → concept.definition
//   depth → concept.keyPoints joined
//   dist → derive from relations (find contrasting concepts)
//   hook → generate from concept.definition (first sentence simplified)
//   trap → derive from common confusions in relations
//   kw → concept.keyTerms or extracted keywords
//   conn → concept.relations.map(r => r.targetId)
//   tf/mc → generate from forge-session.ts questions
```

#### `ASSIGNMENTS` → Map from `workspace.tasks`
```typescript
// SHELL (hardcoded):
const ASSIGNMENTS = [
  { id: "a1", title: "Ethics Paper 1", sub: "...", type: "📝",
    due: 7, pts: 100, con: ["util"],
    reallyAsking: "...", demand: "Apply + Evaluate",
    secretCare: "...", failModes: [...], evidence: "...", quickPrep: "..." }
];

// REAL DATA: Map from workspace.tasks
// tasks: Array<{ id, title, type, dueDate, pointsPossible, conceptIds }>
// Map:
//   title → task.title
//   sub → task.subtitle or first concept name
//   type → task.type === "assignment" ? "📝" : task.type === "discussion" ? "💬" : "❓"
//   due → Math.ceil((task.dueDate - Date.now()) / 86400000)
//   pts → task.pointsPossible
//   con → task.conceptIds
//   reallyAsking → generate from task description + concept analysis
//   demand → classify from task.description keywords (apply/compare/defend/synthesize)
//   failModes → generate from concept traps + common patterns
```

#### `MODULES` → Map from `LearningBundle.chapters` grouped
```typescript
// SHELL (hardcoded):
const MODULES = [
  { id: "m1", title: "Module 1: ...", ch: "Chapters 1-2", pages: "pp. 1-55",
    desc: "...", concepts: ["util", "felicific"],
    textbook: [{ title: "...", pages: "1-18", summary: "..." }] }
];

// REAL DATA: Map from learning.chapters
// chapters already have: id, title, conceptIds, passages
// Group chapters into modules by sequence
```

#### `PH` (Philosophers) → Map from `interactions-runtime.ts` thinker roster
```typescript
// SHELL (hardcoded):
const PH = [
  { n: "Jeremy Bentham", t: "Utilitarianism",
    q: [{ x: "quote...", p: 44, tg: ["tag1", "tag2"] }] }
];

// REAL DATA: The interactions engine already has a thinker roster
// Map from interactions.thinkerRoster
```

#### `DISTS` (Distinction Pairs) → Generate from `LearningBundle.relations`
```typescript
// SHELL (hardcoded distinction data)
// REAL DATA: Generate from concept relations where type === "contrasts" or "relates"
// For each pair of contrasting concepts, generate border/trap/twins/enemy text
```

### PHASE 4: Preserve the Import Pipeline

The shell currently shows a welcome screen immediately. The real app needs the import flow:

1. **No bundle loaded** → Show the existing import UI (file upload, PDF, paste, extension handoff) BUT styled with the AEONTHRA aesthetic (dark theme, cyan accents, Space Grotesk font)
2. **Bundle loading/processing** → Show a processing overlay styled with AEONTHRA aesthetic
3. **Bundle + LearningBundle ready** → Show the AEONTHRA shell with real data

The import flow from the current `App.tsx` should be preserved exactly — it handles:
- JSON bundle import from file
- Extension bridge handoff
- PDF upload and extraction
- Text paste import
- Demo mode

### PHASE 5: Wire Progress and Persistence

The shell tracks these internally — wire them to `storage.ts`:

| Shell State | Real Storage |
|-------------|-------------|
| `cc[i].mastery` | `progress.conceptMastery[conceptId]` |
| `done` Set | `progress.chapterCompletion[chapterId] >= 1` |
| `draft[assignmentId]` | `drafts[taskId]` (already in storage.ts) |
| `sessionTime` | New — add to storage.ts |
| `streak`, `bestStreak` | New — add to storage.ts |
| `conceptStats` | New — add to storage.ts |
| `memoryState` | New — add to storage.ts |
| `ghosts` | New — add to storage.ts |
| Flow state signals | New — runtime only (no persistence needed) |

### PHASE 6: Fix the CSS Void Bug

The original project had a critical CSS void bug in `apps/web/src/styles/app.css` caused by `min-height: 100vh` on sections + grid conflicts. The shell uses **inline styles exclusively** and does not have this bug. Options:

1. **Recommended**: Keep the shell's inline style approach. Remove or minimize `app.css`. Only keep `global.css` for resets and `tokens.css` for CSS custom properties.
2. **Alternative**: Extract the shell's inline styles into CSS classes, but this is significant work for no benefit.

### PHASE 7: Wire the Forge to Real Questions

The shell's Neural Forge uses hardcoded T/F and MC questions per concept. The real app generates these via `forge-session.ts`:

```typescript
// forge-session.ts creates ForgeSession with:
// - genesis: { dilemmas, scan }
// - forge: { rapid, drill }
// - crucible: { lies, crossExam, transfer }
// - architect: { teachBack }
// - transcend: { boss }

// Map the shell's 6 phases to the real forge phases:
// Shell Orient → Real Genesis (dilemmas + scan)
// Shell Apply → Real Genesis (dilemmas specific)
// Shell Recall → Real Forge (rapid)
// Shell Prove → Real Forge (drill) + Crucible (crossExam)
// Shell Reinforce → Real Crucible (lies) — transformed to flashcard format
// Shell Attribute → Real Transcend (boss) — philosopher attribution
```

### PHASE 8: Wire the Oracle to Real Interactions

The shell's Oracle uses hardcoded philosopher quotes. The real app has `interactions-runtime.ts`:

```typescript
// interactions.oracle(question) returns:
// { responses: { [thinkerName]: { text, citations, confidence } } }
// Map each thinker response to the shell's Oracle card format
```

### PHASE 9: Wire the Question Generation Engine

The shell has a `generateQuestions` function that creates T/F and MC from concept data. Replace with the real content engine's question generation, or keep the template system but feed it real concept data instead of hardcoded arrays.

---

## WHAT TO KEEP FROM THE SHELL

Keep EVERYTHING from the shell that defines the user experience:

1. **All visual styling** — inline styles, color palette, font choices, spacing, card treatments
2. **All CSS animations** — fadeUp, pulse, shimmer, glow, float, gradientMove, celebrate, completionBloom, masterySurge, streakFire, unlockGlow, countUp, rippleExpand, flowPulse, phaseComplete, floatParticle
3. **Welcome screen** — quadrant tile layout with ripple effects and frosted center panel
4. **Home page** — adaptive greeting, progress ring, quick paths, Next Win card, readiness strip
5. **Course Atlas** — ascending horizontal landscape with modules, chapters, concepts, assignments
6. **Neural Forge** — 6-phase path, mastery ring, flow state conductor, streak banner, ghost surfacing
7. **Distinction Gym** — 4 modes (borders, corruption, neighbors, less wrong) with all interaction patterns
8. **Oracle Tribunal** — 4 modes (tribunal, single, thesis challenge, verdict) with distinct philosopher cards
9. **Assignment Alchemy** — readiness ring, real demand translation, failure modes, evidence needs
10. **Argument Forge** — 3-stage writing (thesis templates, paragraph skeleton, guided draft)
11. **Stats** — overview cards, concept breakdown, missed review, achievements
12. **Settings** — question count, difficulty, learning toggles, timer, focus concepts
13. **Flow-State Conductor** — behavioral tracking, state inference, adaptive card glow/feedback
14. **Memory Fossilization** — 5-stage model, ghost system, delayed recall, memory imprint
15. **Reward System** — all CSS animations, celebration overlay with particles
16. **Keyboard shortcuts** — T/F, Space, Enter

## WHAT TO KEEP FROM THE EXISTING PROJECT

Keep EVERYTHING from the existing project that handles data:

1. **All of `packages/`** — content-engine, interactions-engine, schema
2. **All of `apps/web/src/lib/`** — every .ts file in lib/
3. **`apps/extension/`** — Chrome extension (untouched)
4. **Import pipeline** — file upload, PDF ingest, extension bridge, text paste
5. **Storage layer** — localStorage persistence
6. **Web Worker** — textbook processing
7. **Build system** — Vite config, TypeScript config, package.json

## WHAT TO REMOVE/REPLACE

1. **`apps/web/src/styles/app.css`** — the source of the CSS void bug. Replace with minimal reset. The shell uses inline styles.
2. **All existing components in `apps/web/src/components/`** — replace with the shell's views. Reference them for data patterns but don't render them.
3. **The visual layer of `App.tsx`** — replace the JSX with the shell's views. Keep the state management, effects, and data pipeline.

---

## CRITICAL IMPLEMENTATION NOTES

### 1. The CSS Void Bug
The original `app.css` had `min-height: 100vh` on `.view` sections combined with CSS Grid that created a 500-2000px black void below the first visible section. The shell avoids this entirely by using inline styles. Do NOT reintroduce `min-height: 100vh` on any section container.

### 2. Scoping Order
The shell defines style constants (`CY`, `TL`, `GD`, `MU`, `BD`, etc.) as `const` declarations. Any computed values that reference these constants MUST be defined AFTER them in the component function body. This caused "Cannot access 'X' before initialization" errors twice during development. In TypeScript, consider making these a `const` object at module scope (outside the component) to avoid this entirely.

### 3. Google Fonts
The shell loads Inter and Space Grotesk via `@import` in a `<style>` tag. In the Vite build, add these to `index.html` as `<link>` tags for better performance:
```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet">
```

### 4. The Flow State Conductor
The flow state system tracks answer speed, streaks, and misses to infer learner state. It adapts the UI subtly. When wiring to real data, make sure `recordAnswerFlow` is called on every answer event, not just in the shell's internal handlers.

### 5. Memory Fossilization
The memory system tracks per-concept: firstSeen, lastPracticed, missCount, correctStreak. When wiring to `storage.ts`, add a `memoryState` field to the persisted progress object.

### 6. The Argument Forge
The writing workbench stores thesis, outline, and draft per assignment. Wire `thesis`, `outline`, and `draft` state to `storage.ts` for persistence across sessions.

### 7. Question Count Scaling
The shell supports 5/10/25/50/100 questions per set via the settings panel and Courseware practice launcher. The question generation engine deterministically creates questions from concept data. When using real data, ensure the content engine can generate enough question variants to fill larger sets.

---

## SUCCESS CRITERIA

The integration is complete when:

1. ✅ Importing a Canvas JSON bundle or PDF textbook works exactly as before
2. ✅ The AEONTHRA welcome screen appears (with quadrant tiles and ripple effects)
3. ✅ The home page shows real assignments with readiness percentages
4. ✅ The Course Atlas shows real modules/chapters ascending upward
5. ✅ The Neural Forge generates real questions from textbook content
6. ✅ The Oracle responds with real philosopher/thinker positions from the content engine
7. ✅ The Distinction Gym generates real concept pair exercises
8. ✅ Progress persists across sessions via localStorage
9. ✅ The Flow-State Conductor adapts based on real answer data
10. ✅ The Memory Fossilization system tracks real concept memory stages
11. ✅ The Assignment Alchemy shows real assignment analysis
12. ✅ The Argument Forge persists thesis/outline/draft across sessions
13. ✅ No CSS void bug exists
14. ✅ All animations render smoothly
15. ✅ The app works offline after first load

---

## FILE DELIVERABLES

After integration, the key files should be:

```
apps/web/src/
├── App.tsx                    ← Slimmed: import pipeline + data wiring only
├── AeonthrShell.tsx           ← The full AEONTHRA shell (from aeonthra-final.jsx)
├── main.tsx                   ← Unchanged
├── lib/                       ← All files preserved
├── styles/
│   ├── global.css             ← Minimal reset only
│   └── tokens.css             ← CSS custom properties (optional)
└── types/                     ← TypeScript types for shell data
    └── aeonthra.ts
```

---

## REFERENCE FILES

- `aeonthra-final.jsx` — The complete shell (2,000+ lines, the source of truth for all UI)
- `BUILD_REPORT.md` — Documents every system, what it does, and why (in `/mnt/user-data/outputs/`)
- `EXPERIENCE_NOTES.md` — Documents the intended user journey minute by minute (in `/mnt/user-data/outputs/`)
- `AEONTHRA_LIVE_AUDIT_RESULTS.md` — Original audit of the Codex build (in project root)

---

## FINAL NOTE

The shell is not a mockup. It is a complete, working product with 13 integrated systems. Every surface, every animation, every interaction pattern has been tested and refined across multiple passes. The visual design, learning philosophy, and emotional intelligence are defined in this file. Codex's job is to wire real data into these exact surfaces while preserving every detail of the experience.

Do not simplify the shell. Do not replace its surfaces with simpler versions. Do not remove animations, flow state, memory tracking, or distinction exercises. Wire real data in, preserve the aesthetic exactly, and ship it.
