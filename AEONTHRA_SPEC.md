# AEONTHRA LEARNING SYSTEM — Complete Codex Build Specification

**Version:** 1.0 · **Target:** GitHub Pages static site + Chrome Extension · **Runtime:** 100% deterministic, zero AI API calls

---

## 0. EXECUTIVE VISION

A single GitHub Pages static site that transforms captured Canvas course data and uploaded textbooks into a premium, interactive learning environment. No backend. No AI API calls. All processing happens in the browser using deterministic algorithms, regex pattern matching, and pre-bundled dictionaries.

**Four Integrated Engines:**

1. **Canvas Capture Engine** — A Chrome Extension reads Canvas pages as the student visits them, extracts assignments/discussions/modules/syllabus into structured JSON, and hands off to the static site.

2. **Neural Forge Content Engine** — Processes captured Canvas data OR uploaded textbook files into concepts, questions, dilemmas, mnemonics, and a complete 5-phase 100-minute learning experience. Entirely algorithmic.

3. **Fusion Engine (Canvas + Textbook Pairing)** — Cross-references uploaded textbook chapters against captured assignments. When the student opens an assignment, the system automatically suggests which textbook chapters contain the relevant concepts. Creates a unified learning graph.

4. **Submission Engine** — A rich text editor where students write their assignment responses. A "GRADE & EXPORT" button runs 7 deterministic checkers (requirements, grammar, punctuation, spelling, APA, readability, structure), generates a .docx in Bahnschrift 12pt with title page (student name, professor, date, assignment), color-coded margin annotations (green/yellow/red), and copies clean text to clipboard.

**Five Main Views:**
- **Home / Mission Control** — Dashboard with progress summary
- **Timeline** — Horizontal sideways-scrolling chronological view of all assignments/discussions/quizzes with premium motion
- **Assignment Breakdown** — Full decomposition of one assignment with suggested textbook chapters, submission workspace, and grading
- **Concept Map** — A living visual map of all concepts, colored by mastery level that fills in as the student completes work
- **Neural Forge** — The immersive 5-phase learning mode

**Non-Negotiable Constraints:**
- Zero runtime AI/LLM calls
- Zero backend services
- Zero secret keys
- Must deploy to GitHub Pages as pure static files
- All data persists in IndexedDB + localStorage
- Must feel premium, motivating, and emotionally supportive
- Bahnschrift 12pt in all generated Word documents
- Must never invent content — everything grounded in captured/uploaded source

---

## 1. DESIGN SYSTEM — "NEURAL FORGE" AESTHETIC

Every view in the app uses this system. No generic React defaults. No developer-tool look.

### 1.1 Color Palette

```css
:root {
  /* Base atmosphere */
  --bg-void: #020208;
  --bg-deep: #04040c;
  --bg-card: #06060f;
  --bg-card-raised: #0a0a1a;
  --bg-card-active: #0d0d20;

  /* Borders & dividers */
  --border-default: #1a1a3a;
  --border-subtle: #0f0f20;
  --border-glow: rgba(0, 240, 255, 0.2);

  /* Text hierarchy */
  --text-primary: #e0e0ff;
  --text-secondary: #b0b0d0;
  --text-muted: #6a6a9a;
  --text-dim: #3a3a5a;
  --text-whisper: #1a1a3a;

  /* Phase/accent colors */
  --cyan: #00f0ff;        /* Primary / Forge / data */
  --teal: #06d6a0;        /* Genesis / growth / ready */
  --green: #00ff88;       /* Mastery / success / done */
  --gold: #ffd700;        /* Transcend / achievement */
  --orange: #ff6b2b;      /* Crucible / warning */
  --red: #ff4466;         /* Error / overdue */
  --purple: #a855f7;      /* Architect / synthesis */
  --pink: #ff2bbb;        /* Special / rare events */

  /* Gradients */
  --grad-cyan: linear-gradient(135deg, #00f0ff, #0080ff);
  --grad-teal: linear-gradient(135deg, #06d6a0, #00b894);
  --grad-gold: linear-gradient(135deg, #ffd700, #ff8800);
  --grad-orange: linear-gradient(135deg, #ff6b2b, #ff4466);
  --grad-purple: linear-gradient(135deg, #a855f7, #7c3aed);
  --grad-atmosphere: radial-gradient(ellipse at top, #0a0a1a 0%, #020208 60%);
}
```

### 1.2 Typography

```css
/* Fonts loaded from Google Fonts */
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=JetBrains+Mono:wght@400;700&family=Sora:wght@300;400;600;700;800&display=swap');

:root {
  --font-display: 'Orbitron', sans-serif;  /* Headers, glow text, phase labels */
  --font-body: 'Sora', sans-serif;          /* Body text, UI */
  --font-mono: 'JetBrains Mono', monospace; /* Timers, numbers, codes */
}

/* Note: Bahnschrift is used ONLY inside generated .docx files, not in the web UI */
```

### 1.3 Motion Principles

- **Entrance animations:** fade + translateY(8px) over 400ms ease-out
- **Phase transitions:** crossfade with scale(0.98 → 1.0) over 600ms
- **Timeline scroll:** momentum scrolling with snap points, parallax background layers
- **Concept map:** nodes pulse gently when active (2s cycle), new connections animate as flowing light
- **Button hover:** subtle lift (translateY(-2px)) + glow intensification
- **Loading states:** orbital spinner (3 dots rotating) OR progress bar with gradient shimmer
- **Success moments:** brief scale(1.0 → 1.05 → 1.0) + gold flash at edges
- **All timing functions:** `cubic-bezier(0.22, 1, 0.36, 1)` for the elegant deceleration
- **Reduce-motion respect:** all animations check `prefers-reduced-motion: reduce`

### 1.4 Component Primitives

**Card:**
```
background: var(--bg-card)
border: 1px solid var(--border-default)
border-radius: 14px
padding: 1.25rem
transition: all 400ms
hover: border-color brightens, subtle shadow
```

**Button Primary:**
```
background: var(--grad-cyan)
color: #000
border: none
border-radius: 10px
padding: .75rem 2rem
font-weight: 800
letter-spacing: .05em
box-shadow: 0 0 20px rgba(0, 240, 255, 0.15)
hover: scale(1.02), shadow intensifies
```

**Glow Text:**
```
color: var(--cyan)
font-family: var(--font-display)
text-shadow: 0 0 20px rgba(0, 240, 255, 0.4)
letter-spacing: .08em
```

**Progress Bar:**
```
background: #1a1a2e
height: 6px
border-radius: 20px
fill: var(--grad-cyan)
transition: width 500ms ease
```

### 1.5 Layout Grid

- Max content width: 1200px (1400px for timeline view only)
- Mobile breakpoint: 768px
- Tablet breakpoint: 1024px
- All views respect a 16px base unit for spacing (0.25rem increments)
- Cards have a minimum 1rem padding on mobile, 1.25rem on desktop

### 1.6 Empty States

Every view has a designed empty state — never a blank screen. Empty states include:
- An icon or illustration (SVG, minimal)
- A one-sentence explanation of what should be here
- A clear call-to-action button
- Soft ambient text explaining the next step

---

## 2. ARCHITECTURE OVERVIEW

### 2.1 Monorepo Structure

```
aeonthra/
├── package.json                 # workspace root
├── pnpm-workspace.yaml
├── README.md
├── .github/workflows/deploy.yml # GitHub Pages deploy action
│
├── packages/
│   ├── shared-types/            # TypeScript types used by all packages
│   │   ├── src/canvas.ts
│   │   ├── src/textbook.ts
│   │   ├── src/concepts.ts
│   │   ├── src/progress.ts
│   │   └── src/index.ts
│   │
│   ├── content-engine/          # Deterministic processing
│   │   ├── src/
│   │   │   ├── normalize.ts        # Stage 1: HTML/text cleanup
│   │   │   ├── segment.ts          # Stage 2: Block detection
│   │   │   ├── extract-concepts.ts # Stage 3: Concept identification
│   │   │   ├── map-relations.ts    # Stage 4: Relationship graph
│   │   │   ├── generate-questions.ts # Stage 5: All question types
│   │   │   ├── assemble.ts         # Stage 6: Output bundle
│   │   │   ├── mnemonics.ts        # Mnemonic template engine
│   │   │   ├── dictionaries/
│   │   │   │   ├── stopwords.json
│   │   │   │   ├── word-frequency.json  (~10K words)
│   │   │   │   ├── synonyms.json        (~3K pairs)
│   │   │   │   ├── philosophers.json    (~200 names)
│   │   │   │   └── domains.json         (scenario templates)
│   │   │   └── index.ts
│   │   └── src/__tests__/
│   │
│   ├── submission-engine/       # Writing + grading
│   │   ├── src/
│   │   │   ├── editor-parse.ts
│   │   │   ├── check-requirements.ts
│   │   │   ├── check-grammar.ts
│   │   │   ├── check-punctuation.ts
│   │   │   ├── check-spelling.ts
│   │   │   ├── check-apa.ts
│   │   │   ├── check-readability.ts
│   │   │   ├── check-structure.ts
│   │   │   ├── score-aggregator.ts
│   │   │   ├── docx-generator.ts
│   │   │   ├── dictionaries/
│   │   │   │   ├── english-50k.json
│   │   │   │   └── academic-terms.json
│   │   │   └── index.ts
│   │   └── src/__tests__/
│   │
│   └── fusion-engine/           # Canvas ↔ Textbook pairing
│       ├── src/
│       │   ├── pair-chapters.ts
│       │   ├── build-concept-graph.ts
│       │   ├── compute-mastery.ts
│       │   └── index.ts
│       └── src/__tests__/
│
├── apps/
│   ├── web/                     # GitHub Pages static SPA (React + Vite)
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   ├── src/
│   │   │   ├── main.tsx
│   │   │   ├── App.tsx
│   │   │   ├── routes/
│   │   │   │   ├── Home.tsx
│   │   │   │   ├── Timeline.tsx
│   │   │   │   ├── AssignmentDetail.tsx
│   │   │   │   ├── ConceptMap.tsx
│   │   │   │   ├── NeuralForge.tsx
│   │   │   │   ├── TextbookUpload.tsx
│   │   │   │   └── Settings.tsx
│   │   │   ├── components/
│   │   │   │   ├── primitives/         # Button, Card, Tag, Glow, etc.
│   │   │   │   ├── timeline/           # TimelineTrack, EventCard, DateMarker
│   │   │   │   ├── concept-map/        # Graph renderer, nodes, edges
│   │   │   │   ├── forge-phases/       # Genesis, Forge, Crucible, Architect, Transcend
│   │   │   │   ├── editor/             # Rich text editor + toolbar
│   │   │   │   └── shared/             # TopBar, NavRail, LoadingOrbital
│   │   │   ├── state/                  # Zustand stores
│   │   │   │   ├── canvas-store.ts
│   │   │   │   ├── textbook-store.ts
│   │   │   │   ├── forge-store.ts
│   │   │   │   ├── progress-store.ts
│   │   │   │   └── settings-store.ts
│   │   │   ├── persistence/            # IndexedDB + localStorage wrappers
│   │   │   │   ├── db.ts
│   │   │   │   └── migrations.ts
│   │   │   ├── styles/
│   │   │   │   ├── tokens.css
│   │   │   │   ├── global.css
│   │   │   │   └── animations.css
│   │   │   └── bridge/
│   │   │       └── receive-capture.ts  # postMessage receiver from extension
│   │   └── public/
│   │       └── fonts/                  # Bahnschrift fallback if needed
│   │
│   └── extension/               # Chrome Extension MV3
│       ├── manifest.json
│       ├── src/
│       │   ├── service-worker.ts
│       │   ├── content-canvas.ts       # Runs on Canvas pages
│       │   ├── content-bridge.ts       # Runs on GitHub Pages app
│       │   ├── popup/
│       │   │   ├── popup.html
│       │   │   ├── popup.ts
│       │   │   └── popup.css
│       │   ├── options/
│       │   │   ├── options.html
│       │   │   └── options.ts
│       │   └── lib/
│       │       ├── extract-assignment.ts
│       │       ├── extract-discussion.ts
│       │       ├── extract-module.ts
│       │       ├── extract-syllabus.ts
│       │       └── storage.ts
│       └── public/
│           └── icons/
│
└── fixtures/                    # Sample data for development/testing
    ├── canvas/
    │   ├── sample-assignment.json
    │   ├── sample-discussion.json
    │   ├── sample-module.json
    │   ├── sample-syllabus.json
    │   └── full-course-capture.json
    ├── textbooks/
    │   ├── ethics-intro-chapter.txt
    │   └── ethics-full-book.txt
    └── expected-outputs/
        ├── concepts-from-ethics.json
        └── paired-learning-graph.json
```

### 2.2 Data Flow

```
┌─────────────────┐
│  Canvas Pages   │──(DOM read)──┐
└─────────────────┘              │
                                 ▼
┌─────────────────┐      ┌───────────────┐
│ Chrome Extension│─────▶│  Capture JSON │
│    Content      │      └───────┬───────┘
│   Scripts       │              │
└─────────────────┘              │ postMessage
                                 ▼
┌────────────────────────────────────────────┐
│     GitHub Pages Static App (React)        │
│                                            │
│  ┌──────────────────┐  ┌────────────────┐  │
│  │  Canvas JSON     │  │ Textbook Text  │  │
│  │  (from ext)      │  │ (user upload)  │  │
│  └────────┬─────────┘  └────────┬───────┘  │
│           │                     │          │
│           ▼                     ▼          │
│  ┌──────────────────────────────────────┐  │
│  │     Content Engine (pure JS)         │  │
│  │  normalize → segment → extract →     │  │
│  │  relate → generate → assemble        │  │
│  └────────────────┬─────────────────────┘  │
│                   │                         │
│                   ▼                         │
│  ┌──────────────────────────────────────┐  │
│  │     Fusion Engine                    │  │
│  │  pair Canvas assignments with        │  │
│  │  relevant textbook chapters          │  │
│  └────────────────┬─────────────────────┘  │
│                   │                         │
│                   ▼                         │
│  ┌──────────────────────────────────────┐  │
│  │         IndexedDB                    │  │
│  │  canvasData, textbookData,           │  │
│  │  forgeBundle, progress, settings     │  │
│  └────────────────┬─────────────────────┘  │
│                   │                         │
│                   ▼                         │
│  ┌──────────────────────────────────────┐  │
│  │         React Views                  │  │
│  │  Home · Timeline · Assignment ·      │  │
│  │  ConceptMap · NeuralForge            │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │     Submission Engine                │  │
│  │  editor → 7 checkers → .docx         │  │
│  └──────────────────────────────────────┘  │
└────────────────────────────────────────────┘
```

### 2.3 Persistence Strategy

**localStorage** (small settings, fast access):
- `aeo_settings` — user name, professor per course, preferences
- `aeo_active_course_id`
- `aeo_theme_overrides`

**IndexedDB** (large structured data):
- `canvas_captures` — raw capture JSON by courseId
- `textbooks` — uploaded textbook text + processed bundles
- `forge_bundles` — generated Neural Forge content per chapter
- `concept_graphs` — built concept graphs per course
- `progress` — mastery scores, completion timestamps, submission history
- `submissions` — drafts and graded responses

---

## 3. ENGINE 1 — CANVAS CAPTURE PIPELINE

### 3.1 Chrome Extension (Manifest V3)

**manifest.json:**
```json
{
  "manifest_version": 3,
  "name": "AEONTHRA Canvas Capture",
  "version": "1.0.0",
  "description": "Captures Canvas course content for local learning workspace",
  "permissions": ["storage", "tabs", "activeTab"],
  "host_permissions": [
    "https://*.instructure.com/*",
    "https://canvas.*.edu/*",
    "https://*.canvas.edu/*",
    "https://YOUR_USERNAME.github.io/*"
  ],
  "background": {
    "service_worker": "service-worker.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": ["https://*.instructure.com/*", "https://canvas.*.edu/*"],
      "js": ["content-canvas.js"],
      "run_at": "document_idle"
    },
    {
      "matches": ["https://YOUR_USERNAME.github.io/*"],
      "js": ["content-bridge.js"],
      "run_at": "document_idle"
    }
  ],
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon-16.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png"
    }
  }
}
```

### 3.2 Canvas Page Detection

The content script detects which type of Canvas page it's on using URL patterns:

```typescript
// content-canvas.ts
const PAGE_PATTERNS = {
  assignment: /\/courses\/(\d+)\/assignments\/(\d+)/,
  discussion: /\/courses\/(\d+)\/discussion_topics\/(\d+)/,
  module: /\/courses\/(\d+)\/modules/,
  moduleItem: /\/courses\/(\d+)\/modules\/items\/(\d+)/,
  syllabus: /\/courses\/(\d+)\/assignments\/syllabus/,
  quiz: /\/courses\/(\d+)\/quizzes\/(\d+)/,
  page: /\/courses\/(\d+)\/pages\/([^\/]+)/,
  announcement: /\/courses\/(\d+)\/discussion_topics\/(\d+).*\?.*announcement/,
  files: /\/courses\/(\d+)\/files/,
  grades: /\/courses\/(\d+)\/grades/,
  courseHome: /\/courses\/(\d+)\/?$/,
};

function detectPageType(url: string): { type: string; courseId: string; itemId?: string } | null {
  for (const [type, pattern] of Object.entries(PAGE_PATTERNS)) {
    const match = url.match(pattern);
    if (match) return { type, courseId: match[1], itemId: match[2] };
  }
  return null;
}
```

### 3.3 Extraction Per Content Type

**Assignment Extraction:**
```typescript
async function extractAssignment(courseId: string, assignmentId: string): Promise<CapturedAssignment> {
  // Wait for Canvas React rendering to stabilize
  await waitForSelector('.user_content.enhanced', 3000);
  
  const titleEl = document.querySelector('h1.title, h1[class*="title"]');
  const dueDateEl = document.querySelector('.assignment-date-due .date_text, [data-testid="due-date"]');
  const pointsEl = document.querySelector('.points_possible, [data-testid="points-possible"]');
  const descriptionEl = document.querySelector('.user_content.enhanced, [data-testid="assignment-description"]');
  const submissionTypesEl = document.querySelector('.submission_types, [data-testid="submission-types"]');
  const rubricTable = document.querySelector('table.rubric_table, [data-testid="rubric-assessment-table"]');
  
  // Rubric extraction
  let rubric: RubricCriterion[] | null = null;
  if (rubricTable) {
    rubric = [];
    const rows = rubricTable.querySelectorAll('tr.criterion, [data-testid^="rubric-criterion"]');
    rows.forEach((row) => {
      const name = row.querySelector('.description .title, [data-testid="criterion-description"]')?.textContent?.trim() || '';
      const longDesc = row.querySelector('.long_description, [data-testid="criterion-long-description"]')?.textContent?.trim() || '';
      const ratings: RubricRating[] = [];
      row.querySelectorAll('.rating, [data-testid^="rubric-rating"]').forEach((ratingEl) => {
        const points = parseFloat(ratingEl.querySelector('.points')?.textContent || '0');
        const description = ratingEl.querySelector('.rating_description, .description')?.textContent?.trim() || '';
        ratings.push({ points, description });
      });
      rubric!.push({ name, longDescription: longDesc, ratings });
    });
  }
  
  // Extract linked files/resources from description HTML
  const linkedFiles: LinkedResource[] = [];
  descriptionEl?.querySelectorAll('a').forEach((a) => {
    const href = a.getAttribute('href') || '';
    const text = a.textContent?.trim() || '';
    if (href && text) {
      linkedFiles.push({
        url: new URL(href, location.href).href,
        title: text,
        type: href.includes('/files/') ? 'file' : 'link',
      });
    }
  });
  
  return {
    id: assignmentId,
    courseId,
    type: 'assignment',
    title: titleEl?.textContent?.trim() || 'Untitled Assignment',
    dueDate: parseCanvasDate(dueDateEl?.textContent),
    pointsPossible: parseFloat(pointsEl?.textContent?.match(/[\d.]+/)?.[0] || '0'),
    descriptionHtml: descriptionEl?.innerHTML || '',
    descriptionText: descriptionEl?.textContent?.trim() || '',
    submissionTypes: extractSubmissionTypes(submissionTypesEl),
    rubric,
    linkedResources: linkedFiles,
    capturedAt: Date.now(),
    sourceUrl: location.href,
  };
}
```

**Discussion Extraction:**
```typescript
async function extractDiscussion(courseId: string, discussionId: string): Promise<CapturedDiscussion> {
  await waitForSelector('.discussion-title, [data-testid="discussion-topic-title"]', 3000);
  
  const title = document.querySelector('.discussion-title, h1')?.textContent?.trim() || '';
  const promptEl = document.querySelector('.message_wrapper .message .user_content, [data-testid="discussion-topic-message"]');
  const dueDateEl = document.querySelector('.due_date_display, [data-testid="due-date"]');
  const pointsEl = document.querySelector('.discussion-points, [data-testid="points-possible"]');
  
  // Reply requirements are often in the prompt text
  const promptText = promptEl?.textContent || '';
  const replyMatch = promptText.match(/respond to (?:at least )?(\d+)/i);
  const wordCountMatch = promptText.match(/(\d+)[\s-]*words?/i);
  
  return {
    id: discussionId,
    courseId,
    type: 'discussion',
    title,
    dueDate: parseCanvasDate(dueDateEl?.textContent),
    pointsPossible: parseFloat(pointsEl?.textContent?.match(/[\d.]+/)?.[0] || '0'),
    promptHtml: promptEl?.innerHTML || '',
    promptText,
    repliesRequired: replyMatch ? parseInt(replyMatch[1]) : 0,
    wordCountTarget: wordCountMatch ? parseInt(wordCountMatch[1]) : null,
    linkedResources: extractLinks(promptEl),
    capturedAt: Date.now(),
    sourceUrl: location.href,
  };
}
```

**Module Extraction:**
```typescript
async function extractModules(courseId: string): Promise<CapturedModule[]> {
  await waitForSelector('.context_module', 3000);
  
  const modules: CapturedModule[] = [];
  document.querySelectorAll('.context_module').forEach((modEl) => {
    const id = modEl.id.replace('context_module_', '');
    const name = modEl.querySelector('.name, .header .collapse_module_link')?.textContent?.trim() || '';
    const items: ModuleItem[] = [];
    
    modEl.querySelectorAll('.context_module_item').forEach((itemEl) => {
      const itemId = itemEl.id.replace('context_module_item_', '');
      const title = itemEl.querySelector('.item_name .title, .title')?.textContent?.trim() || '';
      const href = itemEl.querySelector('a.ig-title')?.getAttribute('href') || '';
      
      // Detect item type from classes or href
      let itemType: ModuleItemType = 'unknown';
      if (itemEl.classList.contains('Assignment')) itemType = 'assignment';
      else if (itemEl.classList.contains('Discussion')) itemType = 'discussion';
      else if (itemEl.classList.contains('Quiz')) itemType = 'quiz';
      else if (itemEl.classList.contains('File')) itemType = 'file';
      else if (itemEl.classList.contains('Page')) itemType = 'page';
      else if (itemEl.classList.contains('ExternalUrl')) itemType = 'external';
      
      items.push({
        id: itemId,
        title,
        type: itemType,
        url: href ? new URL(href, location.href).href : null,
      });
    });
    
    modules.push({ id, courseId, name, items, capturedAt: Date.now() });
  });
  
  return modules;
}
```

### 3.4 Handoff to Static Site

When the user clicks "Send to Workspace" in the extension popup, the service worker:

1. Reads all captured data from `chrome.storage.local`
2. Opens (or focuses) the GitHub Pages static site tab
3. Sends a message to the bridge content script via `tabs.sendMessage`
4. The bridge script relays via `window.postMessage` to the React app
5. The app validates the payload, writes to IndexedDB, and navigates to Home

```typescript
// service-worker.ts
chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
  if (msg.type === 'HANDOFF_TO_WORKSPACE') {
    const captureData = await chrome.storage.local.get('captures');
    const tabs = await chrome.tabs.query({ url: 'https://YOUR_USERNAME.github.io/aeonthra/*' });
    
    let targetTab;
    if (tabs.length > 0) {
      targetTab = tabs[0];
      await chrome.tabs.update(targetTab.id!, { active: true });
    } else {
      targetTab = await chrome.tabs.create({ url: 'https://YOUR_USERNAME.github.io/aeonthra/' });
    }
    
    // Wait for tab load
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    await chrome.tabs.sendMessage(targetTab.id!, {
      type: 'AEONTHRA_CAPTURE_PAYLOAD',
      data: captureData.captures,
    });
    
    sendResponse({ success: true });
  }
});
```

```typescript
// content-bridge.ts (runs on github.io)
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'AEONTHRA_CAPTURE_PAYLOAD') {
    window.postMessage({ source: 'AEONTHRA_EXT', payload: msg.data }, location.origin);
    sendResponse({ received: true });
  }
});
```

```typescript
// apps/web/src/bridge/receive-capture.ts
export function initCaptureBridge(onReceive: (data: CapturePayload) => void) {
  window.addEventListener('message', (event) => {
    if (event.origin !== location.origin) return;
    if (event.data?.source !== 'AEONTHRA_EXT') return;
    onReceive(event.data.payload);
  });
}
```

### 3.5 Fallback: JSON Import/Export

If the extension isn't installed, the student can:
- Export captures from the extension popup as a `.json` file
- Drag-and-drop that file onto the static site's "Import" zone
- The app reads the file, validates against the schema, and populates the same way as the extension bridge

---

## 4. ENGINE 2 — NEURAL FORGE CONTENT ENGINE

### 4.1 Input Sources

The content engine accepts text from two sources:
1. **Canvas data** — extracted from `descriptionText` fields and linked page content
2. **Textbook uploads** — plain text, PDF (converted client-side via pdf.js), or pasted directly

### 4.2 The 6-Stage Pipeline

**Stage 1: Text Normalizer**

Input: raw HTML or plaintext.

Process:
- Strip HTML tags while preserving structure markers: `<h1>`–`<h6>` → `[H1]...[/H1]`, `<li>` → `[LI]` prefix, `<strong>`/`<em>` stripped (content kept)
- Decode HTML entities (`&amp;` → `&`, `&ldquo;` → `"`, etc.)
- Normalize whitespace: collapse multiple spaces/newlines, preserve paragraph breaks (double newline)
- Remove artifacts: page numbers (`/^\d+$/gm`), repeating headers/footers, image refs (`/\[image\]|\[figure \d+\]/gi`), copyright notices
- Fix encoding: curly quotes → straight quotes, em/en dashes → standard hyphens for processing (preserved in display)

Output: `normalizedText` with preserved structure markers.

**Stage 2: Section Detector**

Input: `normalizedText`.

Process:
1. Split on `[H1]` and `[H2]` markers for major sections
2. If no headers, use heuristic detection:
   - Paragraphs starting with bold/caps text followed by newline
   - Numbered sections (`/^\d+\.\s+[A-Z]/gm`)
   - Topic shifts detected via cosine similarity of word-frequency vectors between consecutive paragraphs (threshold < 0.3)
3. Label each section with its heading or generate a label from the first sentence's key noun phrase
4. Compute word counts; merge very short sections (< 50 words) with adjacent

Output: `Section[]` — `{ id, title, text, wordCount, startIndex, endIndex }`

**Stage 3: Concept Extractor**

The most critical stage. Four extraction methods run in parallel, results merged and ranked.

**Method 1 — Textbook Definition Pattern:**
```typescript
const DEFINITION_PATTERN = /(?:^|\. )([A-Z][a-z]+(?: [A-Z]?[a-z]+)*) (?:is|are|refers to|means|can be defined as|is defined as|is the (?:view|idea|theory|belief|claim|principle|concept|notion) that) ([^.]+\.)/gm;
```
Each match → `{ name, definition, source: "explicit", confidence: 1.0 }`

**Method 2 — Bold/Italic Term Extraction:**
From the original HTML (before normalization), extract all text in `<strong>`, `<b>`, `<em>`, `<i>`. Filter out sentence-starting words and names in citations. For each term, find the sentence containing it → contextual definition.

**Method 3 — TF-IDF Key Term Detection:**
1. Tokenize all text. Remove stopwords (bundled dictionary).
2. Count frequency of each word and bigram/trigram.
3. Compute IDF across sections: `log(totalSections / sectionsContainingTerm)`
4. Score each term: `TF × IDF`
5. Filter: top 5% AND frequency ≥ 3
6. For each high-scoring term, extract the first sentence it appears in as its contextual definition

**Method 4 — Framework Pattern Detection:**
```typescript
const FRAMEWORK_PATTERN = /\b(the )?([\w\s]+?)(?: theory| approach| framework| principle| argument| objection| dilemma| paradox| fallacy| doctrine| view| position| thesis| hypothesis| law| rule| imperative| formula| critique)\b/gi;
```

**Deduplication and Ranking:**
- Merge all method outputs
- Normalize names (lowercase comparison, stem matching — "utilitarian" ≈ "utilitarianism")
- Rank: explicit definition > bold/italic > high TF-IDF > framework pattern
- Select top 12-18 concepts
- If < 10 found, lower TF-IDF threshold and re-extract

**Concept Enrichment:**
For each concept, generate:
- `name` — canonical term
- `core` — extracted definition sentence, truncated to 2 sentences max
- `detail` — the surrounding paragraph, trimmed to 3 sentences
- `mnemonic` — generated via template system (see Stage 3b)
- `primer` — first 15 words of `core`, rephrased as context hint
- `category` — section title or clustered category
- `keywords` — significant non-stopword terms from definition + surrounding paragraph
- `relatedConcepts` — IDs of concepts with ≥30% keyword overlap
- `opposites` — concepts appearing in contrastive structures nearby ("unlike X", "in contrast to", "X differs from Y", "X vs Y")
- `sourceSection` — which section this came from
- `confidence` — 0.0 to 1.0 based on extraction method strength

**Stage 3b: Mnemonic Generator (Template-Based)**

15 templates, selected by concept properties. Algorithm chooses based on:
1. If concept has `opposites` → **Contrast Anchor**: `"[Concept] is NOT [opposite]. Remember: [concept] = [1-word], [opposite] = [1-word]."`
2. If name has 3+ words → **Acronym Builder**: `"[ACRONYM] — remember [acronym] like [memorable expansion]."`
3. If definition contains a number → **Number Hook**: `"Remember the number [N]: [concept] has [N] parts — [list]."`
4. If a proper noun appears within 3 words of concept name → **Philosopher Analogy**: `"Imagine [philosopher] at a dinner party explaining: '[simplified core]'"`
5. If concept has synonym in bundled dictionary with good rhyme → **Rhyme Template**: `"[Concept] — think '[rhyming word]' because [connection]."`
6. Otherwise → cycle through remaining templates (Visual Scene, First Letter Chain, Category Analogy, etc.)

**Stage 4: Relationship Mapper**

For each pair of concepts, compute:
1. **Keyword Jaccard:** `|A ∩ B| / |A ∪ B|` of their keyword arrays. If ≥ 0.2, create relationship with type `"overlaps"`.
2. **Co-occurrence:** Count paragraphs where both appear. If ≥ 2, create `"discussed-together"` relationship.
3. **Contrastive:** From `opposites` field, create `"contrasts-with"` relationships.
4. **Hierarchical:** If Concept A's definition contains Concept B's name, create `"builds-on"` (B → A).

Generate labels using templates:
- Overlap → `"[A] and [B] share the idea of [overlapping keyword]"`
- Co-occurrence → `"[A] is discussed alongside [B]"`
- Contrast → `"[A] contrasts with [B]"`
- Hierarchical → `"[A] builds on [B]"`

Output: `Relationship[]` — `{ fromId, toId, type, label, strength }`

**Stage 5: Question Generator**

All questions generated algorithmically from concepts + relationships + source text. See section 4.3 for detailed generation rules.

**Stage 6: Content Assembler**

Builds the final `ForgeBundle`:

```typescript
interface ForgeBundle {
  id: string;
  sourceId: string; // canvas assignment id OR textbook chapter id
  sourceType: 'canvas' | 'textbook';
  title: string;
  generatedAt: number;
  sourceWordCount: number;
  
  // Genesis phase
  dilemmas: Dilemma[];
  concepts: Concept[];
  
  // Forge phase
  rapidFire: TrueFalse[];
  deepDrill: MultipleChoice[];
  
  // Crucible phase
  corruptions: Corruption[];
  crossExam: CrossExam[];
  domainTransfer: DomainScenario[];
  
  // Architect phase
  teachBack: TeachBackPrompt[];
  
  // Transcend phase
  bossFight: MultipleChoice[];
  
  // Cross-cutting
  relationships: Relationship[];
  sections: Section[];
}
```

Stored in IndexedDB. Never regenerated unless source content changes (hash comparison).

### 4.3 Question Generation Rules

**True/False (10-15 per chapter):**
- 50% true: simplified declarative versions of concept definitions
- 50% false via 5 methods:
  1. **Term Swap** — replace concept name with another concept's name
  2. **Negation Insertion** — add/remove negation
  3. **Attribute Swap** — swap a key attribute between concepts
  4. **Exaggeration** — make statement absolute ("always", "never", "only")
  5. **Category Error** — assign concept to wrong framework

**Multiple Choice (12 types, used for Deep Drill and Boss Fight):**

1. **Definition Match** — correct def vs other concept's def vs plausible distortion vs mixed concepts
2. **Philosopher Attribution** — which philosopher is associated with this concept
3. **Compare/Contrast** — how does A differ from B (uses `opposites` field)
4. **Application Scenario** — a person doing X is applying which framework
5. **Negation Check** — which is NOT a characteristic of concept
6. **Fill the Framework** — in X's framework, blank plays role of Y
7. **Cause/Effect** — according to concept, what follows from premise
8. **Objection Match** — which is a common objection to concept
9. **Example Identification** — which scenario illustrates the concept
10. **Sequence/Process** — what step comes after X in the method
11. **Terminology Precision** — precise meaning of technical term
12. **Synthesis** (Boss Fight only) — how would A respond to B's claim

Difficulty distribution:
- Deep Drill: 4 easy + 5 medium + 3 hard = 12 questions
- Boss Fight: 2 easy + 4 medium + 4 hard = 10 questions

**Corruptions (5 levels):**
1. Wrong framework (obvious)
2. Reversed relationship
3. Subtle attribute swap
4. Correct fact, wrong implication
5. Single-word swap (hardest — qualifier words like "merely", "only", "always")

**Cross-Exam Challenges:**
Scan source for objection markers (`"critics argue"`, `"one objection"`, `"however"`, `"opponents claim"`, `"the problem with"`). Extract objection + response from surrounding paragraphs.

**Domain Transfer Scenarios:**
Use bundled `domains.json` template bank (20 domains: AI ethics, social media, medical triage, climate policy, workplace ethics, education policy, criminal justice, data privacy, genetic ethics, economic justice, etc.). Fill templates with concept keywords.

**Teach-Back Prompts:**
Select top 3-4 concepts by connection count + TF-IDF. Generate prompts using templates. Extract 3-4 key points per concept from definition + detail sentences.

**Immersive Dilemmas (Genesis):**
Use 3-framework template. Every dilemma has exactly 3 choices mapping to consequentialist / deontological / virtue ethics (or their domain equivalents). Scenarios drawn from bundled `scenario-shells.json`.

### 4.4 The 5-Phase Runtime (Neural Forge View)

Each phase reads from the pre-generated `ForgeBundle`. All logic is pure UI state.

**Phase 1: GENESIS (20 min)**
- Sub-mode A: Immersive Dilemmas (3 scenarios, intuition before theory)
- Sub-mode B: Concept Scan (flip cards with memory hooks)

**Phase 2: FORGE (20 min)**
- Sub-mode A: Rapid Fire (10 T/F, streak tracking)
- Sub-mode B: Deep Drill (12 MC with Learn First button + primer context)

**Phase 3: CRUCIBLE (20 min)**
- Hub menu with 3 sub-modes (any order):
  - Spot the Lie (4-5 corruptions, escalating difficulty)
  - Cross-Exam (3 devil's advocate challenges)
  - Domain Transfer (3 novel domain scenarios)

**Phase 4: ARCHITECT (20 min)**
- Teach Back (3 prompts, textarea, keyword-based self-check against key points)

**Phase 5: TRANSCEND (20 min)**
- Boss Fight (10 hard MC with confidence calibration)
- Meta-reflection on wrong answers (category: never learned / confused concepts / overthought / misremembered)
- Results dashboard: grade, calibration %, overconfidence count, underconfidence count, error pattern, concept mastery map

### 4.5 Timer & Progress

Global elapsed timer + per-phase countdown. Timer turns red under 2:00. Progress saved to IndexedDB on every state change. Resume prompt on reload.

---

## 5. ENGINE 3 — FUSION ENGINE (Canvas × Textbook Pairing)

### 5.1 The Core Idea

When a student opens an assignment, the system automatically identifies which textbook chapters contain the concepts most relevant to that assignment. This creates a unified learning graph where Canvas work and textbook study reinforce each other.

### 5.2 Pairing Algorithm

**Input:**
- Canvas assignment with `descriptionText` and optional rubric
- Array of uploaded textbook chapters, each with pre-extracted `ForgeBundle`

**Process:**

1. **Extract assignment keywords:**
   - Run the same concept extraction pipeline (Stages 1-3) on the assignment description + rubric text
   - Produce an `assignmentConceptSet` — array of concept names + keywords
   - Also extract explicit references: `"Chapter N"`, `"pages X-Y"`, direct title mentions

2. **Score each textbook chapter against the assignment:**

   For each textbook chapter bundle:
   ```
   score = 0
   // Explicit references (highest weight)
   if assignment text contains chapter title → score += 100
   if assignment text contains "chapter N" matching chapter number → score += 80
   
   // Concept overlap (medium weight)
   for each concept in assignmentConceptSet:
     if chapter has concept with matching name → score += 30
     if chapter has concept with matching keyword in its keywords array → score += 15
   
   // Keyword density (lower weight)
   for each keyword in assignmentConceptSet:
     count occurrences in chapter normalizedText
     score += min(occurrences × 2, 20)
   
   // Normalize by chapter size to avoid biasing toward long chapters
   normalizedScore = score / sqrt(chapter.sourceWordCount / 1000)
   ```

3. **Rank and return:**
   - Sort chapters by `normalizedScore` descending
   - Return top 3 chapters with a relevance label:
     - `score > 80` → "Strongly recommended"
     - `40–80` → "Closely related"
     - `20–40` → "Useful background"
     - `< 20` → not shown

4. **Extract concept bridge:**
   For the top chapter, identify which specific concepts from that chapter match the assignment. Display as: `"This assignment touches on: [concept1], [concept2], [concept3] from [chapter title]"`

### 5.3 Unified Concept Graph

Across all textbook chapters + all Canvas assignments, build a single concept graph:

```typescript
interface UnifiedConcept {
  id: string;
  name: string;
  aliases: string[];
  
  // Where it appears
  textbookOccurrences: Array<{
    chapterId: string;
    sourceText: string;
    confidence: number;
  }>;
  canvasOccurrences: Array<{
    assignmentId: string;
    context: 'required' | 'mentioned' | 'implied';
  }>;
  
  // Relationships to other concepts
  relatedIds: string[];
  opposingIds: string[];
  buildsOnIds: string[];
  
  // Mastery tracking
  mastery: number; // 0.0 to 1.0
  lastPracticed: number | null;
  practiceCount: number;
}

interface ConceptGraph {
  concepts: Map<string, UnifiedConcept>;
  edges: Array<{ from: string; to: string; type: string; weight: number }>;
  clusters: Array<{ name: string; conceptIds: string[] }>; // auto-detected clusters
}
```

**Building the graph:**
1. Collect all concepts from all textbook bundles + all Canvas assignment extractions
2. Deduplicate by normalized name (lowercase, stem match) — merge aliases
3. Build edges from each bundle's relationships
4. Detect clusters using connected-component analysis on the edge graph
5. Label clusters by the most central concept (highest connection count)

### 5.4 Mastery Coloring

As the student completes work, concept mastery updates:

**Mastery deltas:**
- Complete a Rapid Fire question correctly about concept X → `+0.05`
- Complete a Deep Drill correctly → `+0.1`
- Use Learn First on concept → `+0.02` (they engaged with it)
- Complete Teach Back for concept → `+0.2`
- Boss Fight correct with high confidence → `+0.15`
- Boss Fight wrong with high confidence → `-0.1` (overconfidence correction)
- Submit assignment touching concept (graded ≥ 70%) → `+0.25`

**Mastery decay:**
- After 7 days without practice → `-0.05` per week
- Prevents stale "mastered" state

**Color mapping for Concept Map view:**
```
mastery 0.0 – 0.2  →  dim gray (#3a3a5a)        "unexplored"
mastery 0.2 – 0.4  →  soft blue (#00f0ff44)     "introduced"
mastery 0.4 – 0.6  →  cyan (#00f0ff)            "learning"
mastery 0.6 – 0.8  →  teal (#06d6a0)            "practicing"
mastery 0.8 – 1.0  →  gold (#ffd700)            "mastered"
```

Node size in the graph also scales with practice count.

---

## 6. ENGINE 4 — SUBMISSION ENGINE

### 6.1 The Writing Workspace

**Location:** Inside the Assignment Breakdown view, a "Submission" tab.

**Editor:** A `contenteditable` div (not textarea) with toolbar:
- Bold, italic, underline
- Heading levels (H1-H3)
- Bulleted/numbered lists
- Block quote (for APA long quotes)
- Reference section insert button (adds "References" heading + horizontal rule)

**Live counters** below editor:
- Word count (green if meets target, red if under)
- Sentence count
- Paragraph count
- Estimated reading time

**Context panel (sidebar):**
- Assignment title + due date
- Requirements checklist (extracted from description)
- Rubric criteria with point weights
- Word count target
- Required source count
- Top 3 suggested textbook chapters (from Fusion Engine)

**Paste from Word sanitizer:** Strips `mso-*` styles, `<o:p>` tags, excessive spans.

### 6.2 The 7 Deterministic Checkers

When the student clicks **"GRADE & EXPORT"**:

1. Extract text + HTML from editor
2. Parse into sentences, words, paragraphs
3. Run all 7 checkers in parallel (Promise.all)
4. Aggregate scores
5. Show results dashboard
6. Generate .docx on confirm

**Checker 1: Requirements Matcher**

Matches extracted assignment requirements against student text:

- **Word count check:** `wordCount >= required`. Green if met or exceeded by up to 20%, yellow if within 10% short, red if > 10% short.
- **Section check:** Count paragraphs ≥ 3 + detect intro signals (`/\b(this (paper|essay|discussion)|in this|the purpose|I will (discuss|argue|examine))\b/i`) in first paragraph + conclusion signals (`/\b(in conclusion|to (summarize|conclude)|overall|in summary)\b/i`) in last.
- **Source count check:** Count unique APA in-text citations via regex, compare to required count.
- **Topic keyword check:** For each concept in `assignmentConceptSet`, check if it (or stem) appears in student text. Green if all, yellow > 50%, red < 50%.
- **Rubric criterion check:** Extract key descriptors from highest rating of each criterion, check for keyword evidence in student text.

**Checker 2: Grammar (30 rules)**

Organized by category. Each rule is regex + severity + explanation + suggested fix.

*Subject-verb agreement (5 rules):*
1. Singular indefinite pronouns with plural verb: `/\b(everyone|everybody|someone|somebody|no one|nobody|each|every)\s+(are|were|have)\b/gi`
2. Collective nouns: `/\b(the (group|team|class|family|committee))\s+(are|were|have)\b/gi`
3. "There is/are" agreement: `/\bthere\s+(is)\s+\w+\s+and\s+/gi`
4. "One of the X": `/\b(one of the \w+)\s+(are|were)\b/gi`
5. "Neither/either": `/\b(neither|either)\s+\w+\s+(are|were)\b/gi`

*Comma errors (5 rules):*
6. Missing comma after conjunctive adverb: `/\b(however|therefore|moreover|furthermore|consequently|nevertheless|meanwhile|otherwise)\b(?!,)/gi`
7. Comma splice detection (two independent clauses joined by only a comma)
8. Missing comma before "which" (nonrestrictive)
9. Run-on sentences
10. Missing Oxford comma (style warning)

*Confused words (8 rules):*
11. their/there/they're — context-based
12. your/you're
13. its/it's
14. affect/effect
15. then/than: `/\b(more|less|better|worse|greater|fewer|rather|other)\s+then\b/`
16. to/too/two
17. accept/except
18. loose/lose

*Sentence structure (5 rules):*
19. Fragment detection (sentence starts with subordinating conjunction, no main clause)
20. Passive voice (style warning)
21. Starting with "And"/"But" (informal warning)
22. Sentences > 50 words (split suggestion)
23. Very short paragraphs (1 sentence, not transitions)

*Academic style (7 rules):*
24. First person in formal essays
25. Contractions
26. Informal language ("a lot", "kind of", "stuff", "basically", "literally")
27. Double hedging ("I think maybe")
28. Redundancy ("past history", "free gift", "end result")
29. "This" without referent noun
30. Double negatives

**Checker 3: Punctuation (10 rules)**
1. Missing period at end of paragraph
2. Double spaces
3. Space before comma/period
4. Missing space after comma/period
5. Mismatched quotation marks
6. Semicolon misuse
7. Colon after incomplete sentence
8. Possessive apostrophe errors
9. Multiple punctuation (`!!!`, `??`)
10. Missing comma in dates

**Checker 4: Spelling**
- Dictionary: 50K English words bundled as JSON or Bloom filter (~300KB)
- Domain-specific supplement (academic terms + philosophers)
- For each word: lowercase, strip possessives/suffixes, check dictionary
- If miss: Levenshtein distance ≤ 2 for suggestions, top 3 by frequency
- Ignore: ALL CAPS, proper nouns after period, URLs, emails, words in citation parens

**Checker 5: APA Format (14 rules)**

*In-text citations:*
1. Parenthetical format check
2. Narrative format check
3. Two authors: `&` in parenthetical, `and` in narrative
4. Three+ authors: `et al.`
5. Direct quotes require page numbers
6. Block quotes (40+ words) must be indented, no quote marks

*Reference list:*
7. "References" heading exists
8. Hanging indent (HTML check)
9. Author format `Last, F. M.`
10. Year in parentheses
11. Italicized title
12. DOI/URL present
13. Alphabetical order
14. Cross-reference: every citation has a matching reference and vice versa

**Checker 6: Readability**
- Flesch-Kincaid Grade Level (target 12–16 for college)
- Average sentence length (flag > 30 or < 10)
- Vocabulary diversity (type-token ratio, flag < 0.4)
- Paragraph length consistency
- Transition word density

**Checker 7: Structure**
1. Introduction present (thesis/purpose signals)
2. Thesis statement detection
3. Body paragraph topic sentences
4. Evidence integration (citations per body paragraph)
5. Conclusion present
6. Logical flow (keyword sharing between consecutive paragraphs)
7. Assignment-specific sections (if required)

### 6.3 Results Dashboard

**Overall Score:** Weighted average across all checkers.
```
weights: requirements 30%, grammar 20%, apa 15%, structure 15%, 
         spelling 10%, punctuation 5%, readability 5%
```

Displayed as percentage + letter grade, color-coded green/yellow/red.

**Checker Cards:** Each shows:
- Engine name + icon
- Score + status badge
- Count of issues
- Expandable list of specific issues with:
  - Flagged text (click to scroll editor to location)
  - Severity color
  - Explanation
  - Suggested fix (clickable to apply)

**Quick Fix Button:** Auto-applies all unambiguous corrections (double spaces, clear single-suggestion spelling, obvious punctuation). Never applies yellow/style suggestions.

### 6.4 Word Document Generator

Uses `docx` npm library (~400KB, bundled at build time, runs entirely client-side).

**Document structure:**

**Title Page (APA format) — Bahnschrift 12pt throughout:**
- Student's full name (from settings)
- Professor's name (from course settings)
- Course name + section (from captured Canvas data)
- Assignment title (from captured data)
- Date (auto: "Month Day, Year" format of current date)
- University name (from settings)
- All centered, double-spaced, **Bahnschrift 12pt**

**Body:**
- Running header: shortened title (first 50 chars) + page number
- 1-inch margins
- Double-spaced
- **Bahnschrift 12pt**
- First line of each paragraph indented 0.5"
- Student's text with preserved formatting (bold, italic, headers)

**References Page:**
- "References" centered, bold
- Hanging indent 0.5"
- Double-spaced
- **Bahnschrift 12pt**

**Grading Annotations (the innovation):**

Word-native comments inserted via the `docx` library's Comment feature:
- **GREEN ✅** comments on text meeting a rubric criterion
- **YELLOW ⚠️** comments on style issues / partial requirement fulfillment
- **RED ❌** comments on errors / missing requirements

Comment author names create visual distinction in Word's margin:
- Green: author = `"✅ AEONTHRA | Met"`
- Yellow: author = `"⚠️ AEONTHRA | Review"`
- Red: author = `"❌ AEONTHRA | Fix"`

**Final summary comment** on the last paragraph:
```
═══════════════════════════════════════
AEONTHRA PRE-SUBMISSION REPORT
═══════════════════════════════════════
Overall Grade:      87% (B+)
Requirements:       5/6 met
Word Count:         512/500 ✅
Sources Cited:      3/3 ✅
Grammar Issues:     3 flagged
APA Issues:         1 (page number missing)
Readability:        Grade 13.2 ✅
Structure:          Strong ✅

ONE-PARAGRAPH FEEDBACK:
Your response demonstrates strong engagement
with the core concepts and meets the word count.
To improve: add page numbers to direct quotes,
tighten paragraph 3 (contains two style issues),
and consider strengthening your conclusion with
a specific example from the textbook reading on
[relevant chapter]. Overall a solid submission.
═══════════════════════════════════════
```

The one-paragraph feedback is template-generated by combining checker results:
```typescript
function generateFeedback(results: CheckerResults): string {
  const strengths = [];
  const improvements = [];
  
  if (results.requirements.score >= 0.8) strengths.push("meets the assignment requirements");
  if (results.structure.score >= 0.8) strengths.push("shows strong structure");
  if (results.readability.gradeLevel >= 12) strengths.push("uses appropriate academic language");
  
  if (results.apa.issues.length > 0) improvements.push(`address ${results.apa.issues.length} APA formatting issues`);
  if (results.grammar.redIssues > 0) improvements.push(`fix ${results.grammar.redIssues} grammar errors`);
  if (results.requirements.missingCount > 0) improvements.push(`address ${results.requirements.missingCount} missing requirements`);
  
  return `Your response ${strengths.join(" and ")}. To improve, ${improvements.join(", ")}. Overall: ${results.overallGrade}.`;
}
```

### 6.5 Clipboard Copy

Simultaneously with .docx generation, clean plaintext (no annotations) copied to clipboard via `navigator.clipboard.writeText()`. Toast: "Copied to clipboard — ready to paste into Canvas."

---

## 7. THE FIVE MAIN VIEWS

### 7.1 Home / Mission Control

**Purpose:** First screen after import. Answers "what do I need to do right now?"

**Layout:**
- Top section: greeting + current course name + overall progress ring
- Three columns:
  - **OVERDUE** (red accents) — items past due
  - **THIS WEEK** (cyan) — items due in next 7 days
  - **UPCOMING** (dim) — items due later
- Each card shows:
  - Type icon (assignment / discussion / quiz)
  - Title
  - Due date + countdown
  - Estimated time
  - Completion status
  - Click → Assignment Detail view
- Bottom strip: quick links
  - [📅 Timeline]
  - [🗺 Concept Map]
  - [🔥 Neural Forge]
  - [📚 Upload Textbook]
  - [⚙️ Settings]

**Empty state:** "No course data yet. Install the Chrome extension or import a JSON file to begin."

### 7.2 Timeline (Horizontal Sideways Scroll)

**Purpose:** Premium chronological overview. The signature visual of the app.

**Layout:**
- Full-width horizontal scroll track
- X-axis = time (days/weeks)
- Y-axis = grouped by type (Assignments, Discussions, Quizzes, Modules) in horizontal lanes
- Date markers at top showing week boundaries
- "TODAY" vertical line in bright cyan with glow
- Each event is a card on its lane:
  - Floating card style with subtle glow
  - Color-coded by status (overdue red, due-soon cyan, upcoming dim, completed teal)
  - Title, due date, points
  - Hover → scale up, glow intensifies, shows estimated time
  - Click → opens Assignment Detail

**Motion:**
- Momentum scrolling (CSS `scroll-snap-type: x mandatory` with snap points on week boundaries)
- Parallax background layer (stars/grid moving at 0.3× scroll speed)
- Cards fade in as they enter viewport
- Reduce-motion fallback: clean horizontal scroll with no parallax

**Controls:**
- Jump-to buttons: "Today", "Next Due", "End of Term"
- Week zoom toggle: day view / week view / month view
- Filter pills: show/hide by type

**Implementation:** Use CSS Grid with auto-placed columns, `scroll-behavior: smooth`, IntersectionObserver for fade-in.

### 7.3 Assignment Detail

**Purpose:** Everything the student needs to complete one assignment.

**Layout:** 3-column on desktop, stacked on mobile.

**Left Column — Breakdown:**
- Title + due date + points
- **MISSION** — 1-2 sentence summary (first sentence of description, reworded)
- **REQUIREMENTS** — numbered checklist (from description extraction)
- **RUBRIC GUIDE** — each criterion collapsible, shows highest rating (what to include) and lowest (what to avoid), point weight visible
- **RESOURCES** — categorized:
  - 🔗 Links (external)
  - 📄 Files
  - 📖 **Recommended Chapters** (from Fusion Engine)
  - 🎯 Related concepts (clickable → concept map node)
- **ESTIMATED TIME**
- **SUBMISSION TYPE**

**Center Column — Submission Workspace:**
- Rich text editor (Engine 4)
- Live word count
- Toolbar
- [GRADE & EXPORT] button at bottom
- Results dashboard appears after grading
- [DOWNLOAD .DOCX] + [COPY TO CLIPBOARD] buttons

**Right Column — Textbook Pairing:**
- "Relevant Textbook Sections" header
- Top 3 chapters from Fusion Engine
- Each with: title, relevance label, key concept bridge
- Click → opens Neural Forge with that chapter loaded
- Concepts overlap diagram (simple Venn/tags showing shared concepts between assignment and chapter)

### 7.4 Concept Map

**Purpose:** Living visual of all concepts, colored by mastery.

**Layout:** Full-viewport canvas with controls overlay.

**Rendering:** Force-directed graph using a lightweight library (Cytoscape.js or D3 force simulation).

**Node appearance:**
- Size scales with practice count (min 20px, max 80px)
- Color scales with mastery (see 5.4 color mapping)
- Label: concept name, font size scales with node size
- Glow effect scales with mastery (higher mastery = more glow)
- Pulse animation on recently-practiced concepts (last 24h)

**Edge appearance:**
- Thin lines for weak relationships, thicker for strong
- Color: teal for "builds-on", orange for "contrasts-with", cyan for "overlaps"
- Animated flow when hovering connected node

**Interactions:**
- Click node → side panel with concept details (name, core, detail, mnemonic, source chapters, practice history, [PRACTICE NOW] button that opens a mini Neural Forge session focused on this concept)
- Drag nodes to rearrange (positions persist)
- Scroll to zoom
- Right-click → filter "show only connected"
- Cluster highlighting: hover a cluster label → dims non-cluster nodes

**Controls overlay:**
- Search bar
- Filter pills: "All / Mastered / Learning / Unexplored"
- Layout toggle: "Force / Hierarchical / Clustered"
- Legend: color scale + mastery levels
- Export button: save current view as PNG

**Empty state:** "No concepts yet. Import Canvas data or upload a textbook to populate the map."

### 7.5 Neural Forge (the 5-phase mode)

**Purpose:** Dedicated immersive learning experience.

**Entry:** From Home, Concept Map (practice focused), or Assignment Detail (practice relevant chapters).

**Layout:**
- Clean, focused — no sidebar clutter
- Top bar: phase indicator (5 dots with current phase highlighted), global timer, elapsed timer
- Main stage: current phase content
- Bottom: minimal controls (back to hub, skip phase with confirmation)

**Chapter selection screen (entry point):**
- Grid of available chapters (from textbook uploads + Canvas content)
- Each card shows: title, source (textbook/canvas), concept count, estimated time, mastery percentage
- Click a card → enters Genesis phase with that chapter's `ForgeBundle`

**Phase views:** See section 4.4 for detailed sub-modes.

**Ambient Learning Layer (the "background learning" idea):**
While in any phase, a subtle ambient panel at the edge of the screen rotates through:
- Concept echoes (primer sentences from concepts the student has already seen, fading in every 30-45 seconds)
- Mastery weather: brief visual indicator showing current session mastery gain (e.g., "+3 concepts strengthening")
- Future-you notes: short text snippets the student has saved previously
- No interaction required — purely ambient reinforcement

Implementation: a fixed-position sidebar strip with fade-in/fade-out messages. Messages are pulled deterministically from already-generated `ForgeBundle` concept primers, randomized per session but grounded in real source content.

---

## 8. DATA SCHEMAS (TypeScript)

### 8.1 Canvas Data

```typescript
// packages/shared-types/src/canvas.ts

export type ContentType = 'assignment' | 'discussion' | 'quiz' | 'module' | 'page' | 'syllabus' | 'announcement';
export type SubmissionType = 'text_entry' | 'file_upload' | 'url' | 'media_recording' | 'none';
export type ModuleItemType = 'assignment' | 'discussion' | 'quiz' | 'file' | 'page' | 'external' | 'unknown';

export interface LinkedResource {
  url: string;
  title: string;
  type: 'file' | 'link' | 'page' | 'video';
}

export interface RubricRating {
  points: number;
  description: string;
}

export interface RubricCriterion {
  name: string;
  longDescription: string;
  ratings: RubricRating[];
}

export interface CapturedAssignment {
  id: string;
  courseId: string;
  type: 'assignment';
  title: string;
  dueDate: number | null; // timestamp
  availableDate: number | null;
  lockDate: number | null;
  pointsPossible: number;
  descriptionHtml: string;
  descriptionText: string;
  submissionTypes: SubmissionType[];
  rubric: RubricCriterion[] | null;
  linkedResources: LinkedResource[];
  capturedAt: number;
  sourceUrl: string;
  status?: 'not_started' | 'in_progress' | 'submitted' | 'graded';
  earnedPoints?: number;
}

export interface CapturedDiscussion {
  id: string;
  courseId: string;
  type: 'discussion';
  title: string;
  dueDate: number | null;
  pointsPossible: number;
  promptHtml: string;
  promptText: string;
  repliesRequired: number;
  wordCountTarget: number | null;
  linkedResources: LinkedResource[];
  capturedAt: number;
  sourceUrl: string;
}

export interface CapturedQuiz {
  id: string;
  courseId: string;
  type: 'quiz';
  title: string;
  dueDate: number | null;
  pointsPossible: number;
  questionCount: number | null;
  timeLimit: number | null; // minutes
  allowedAttempts: number;
  descriptionText: string;
  capturedAt: number;
  sourceUrl: string;
}

export interface ModuleItem {
  id: string;
  title: string;
  type: ModuleItemType;
  url: string | null;
  completionRequirement?: string;
}

export interface CapturedModule {
  id: string;
  courseId: string;
  name: string;
  items: ModuleItem[];
  capturedAt: number;
}

export interface CapturedCourse {
  id: string;
  name: string;
  code: string;
  term?: string;
  instructor?: string;
  assignments: CapturedAssignment[];
  discussions: CapturedDiscussion[];
  quizzes: CapturedQuiz[];
  modules: CapturedModule[];
  syllabusText?: string;
  capturedAt: number;
}
```

### 8.2 Content Engine Output

```typescript
// packages/shared-types/src/concepts.ts

export interface Section {
  id: number;
  title: string;
  text: string;
  wordCount: number;
  startIndex: number;
  endIndex: number;
}

export interface Concept {
  id: number;
  name: string;
  core: string;
  detail: string;
  mnemonic: string;
  primer: string;
  category: string;
  keywords: string[];
  relatedConcepts: number[];
  opposites: number[];
  sourceSection: number;
  confidence: number; // 0.0 – 1.0
}

export interface Relationship {
  fromId: number;
  toId: number;
  type: 'overlaps' | 'discussed-together' | 'contrasts-with' | 'builds-on';
  label: string;
  strength: number;
}

export interface TrueFalse {
  id: number;
  q: string;
  a: boolean;
  why: string;
  conceptIds: number[];
}

export interface MultipleChoice {
  id: number;
  q: string;
  opts: string[];
  c: number; // correct index
  why: string;
  wrongExplanations: Record<number, string>;
  conceptIds: number[];
  difficulty: 'easy' | 'medium' | 'hard';
  questionType: string;
}

export interface Corruption {
  id: number;
  level: number; // 1-5
  statement: string;
  error: string;
  correct: string;
  hint: string;
  conceptIds: number[];
}

export interface CrossExam {
  id: number;
  challenge: string;
  hint: string;
  rebuttal: string;
  conceptIds: number[];
}

export interface DomainScenario {
  id: number;
  domain: string;
  scenario: string;
  question: string;
  analysis: string;
  conceptIds: number[];
}

export interface TeachBackPrompt {
  id: number;
  prompt: string;
  keyPoints: string[];
  conceptId: number;
}

export interface Dilemma {
  id: number;
  scenario: string;
  question: string;
  choices: Array<{
    text: string;
    label: string;
    framework: string;
    reasoning: string;
  }>;
  insight: string;
  conceptName: string;
}

export interface ForgeBundle {
  id: string;
  sourceId: string;
  sourceType: 'canvas' | 'textbook';
  title: string;
  generatedAt: number;
  sourceWordCount: number;
  sourceHash: string; // for cache invalidation
  
  dilemmas: Dilemma[];
  concepts: Concept[];
  rapidFire: TrueFalse[];
  deepDrill: MultipleChoice[];
  corruptions: Corruption[];
  crossExam: CrossExam[];
  domainTransfer: DomainScenario[];
  teachBack: TeachBackPrompt[];
  bossFight: MultipleChoice[];
  relationships: Relationship[];
  sections: Section[];
}
```

### 8.3 Unified Concept Graph

```typescript
// packages/shared-types/src/concept-graph.ts

export interface UnifiedConcept {
  id: string;
  name: string;
  aliases: string[];
  canonicalDefinition: string;
  
  textbookOccurrences: Array<{
    textbookId: string;
    chapterId: string;
    sourceText: string;
    confidence: number;
  }>;
  canvasOccurrences: Array<{
    courseId: string;
    assignmentId: string;
    context: 'required' | 'mentioned' | 'implied';
  }>;
  
  relatedIds: string[];
  opposingIds: string[];
  buildsOnIds: string[];
  
  mastery: number;
  lastPracticed: number | null;
  practiceCount: number;
  correctCount: number;
  wrongCount: number;
}

export interface ConceptGraph {
  version: number;
  lastUpdated: number;
  concepts: Record<string, UnifiedConcept>;
  edges: Array<{
    from: string;
    to: string;
    type: string;
    weight: number;
  }>;
  clusters: Array<{
    id: string;
    name: string;
    centerId: string;
    memberIds: string[];
  }>;
}
```

### 8.4 Progress & Settings

```typescript
// packages/shared-types/src/progress.ts

export interface ForgeSessionProgress {
  chapterId: string;
  currentPhase: number;
  currentSubMode: string;
  currentIndex: number;
  phaseScores: Record<string, { correct: number; total: number }>;
  conceptMastery: Record<number, number>;
  seenConcepts: number[];
  completedSubModes: string[];
  totalElapsed: number;
  transcendResults: TranscendResult[];
  timestamp: number;
}

export interface TranscendResult {
  questionId: number;
  correct: boolean;
  confidence: number;
  metaChoice: 'never_learned' | 'confused_concepts' | 'overthought' | 'misremembered' | null;
}

export interface AppSettings {
  studentName: string;
  universityName: string;
  courses: Record<string, {
    courseName: string;
    professorName: string;
    sectionNumber: string;
  }>;
  preferredCitationStyle: 'APA' | 'MLA';
  flagFirstPerson: boolean;
  flagContractions: boolean;
  forgeTimerMode: 'strict' | 'advisory' | 'hidden';
  theme: 'default' | 'high-contrast' | 'calm';
  reduceMotion: boolean;
}
```

---

## 9. SAMPLE JSON FIXTURES

### 9.1 Sample Canvas Assignment

```json
{
  "id": "assign_7829341",
  "courseId": "course_445201",
  "type": "assignment",
  "title": "Ethics Paper 1: Utilitarianism in Practice",
  "dueDate": 1713128400000,
  "availableDate": 1712523600000,
  "lockDate": 1713132000000,
  "pointsPossible": 100,
  "descriptionHtml": "<h2>Assignment Overview</h2><p>In this 1500-word paper, you will analyze a real-world ethical dilemma through the lens of <strong>utilitarianism</strong>. Drawing on Chapter 3 of the textbook, construct an argument that evaluates whether a consequentialist approach produces the best outcome in your chosen scenario.</p><h3>Requirements</h3><ol><li>Minimum 1500 words (not counting references)</li><li>Cite at least 4 scholarly sources in APA format</li><li>Include both Bentham and Mill's perspectives</li><li>Address at least one major objection to utilitarianism</li><li>Provide a specific real-world case study</li></ol><h3>Rubric Summary</h3><p>Your paper will be evaluated on: clear thesis, accurate representation of theory, quality of analysis, engagement with objections, APA formatting, and writing quality.</p>",
  "descriptionText": "Assignment Overview\n\nIn this 1500-word paper, you will analyze a real-world ethical dilemma through the lens of utilitarianism. Drawing on Chapter 3 of the textbook, construct an argument that evaluates whether a consequentialist approach produces the best outcome in your chosen scenario.\n\nRequirements\n1. Minimum 1500 words (not counting references)\n2. Cite at least 4 scholarly sources in APA format\n3. Include both Bentham and Mill's perspectives\n4. Address at least one major objection to utilitarianism\n5. Provide a specific real-world case study",
  "submissionTypes": ["text_entry", "file_upload"],
  "rubric": [
    {
      "name": "Thesis & Argument",
      "longDescription": "Clear, arguable thesis supported by evidence throughout",
      "ratings": [
        { "points": 25, "description": "Exceptionally clear thesis with sophisticated argument structure" },
        { "points": 20, "description": "Clear thesis with solid argument" },
        { "points": 15, "description": "Thesis present but argument uneven" },
        { "points": 10, "description": "Unclear thesis or weak argument" }
      ]
    },
    {
      "name": "Theory Accuracy",
      "longDescription": "Accurate representation of utilitarian theory including Bentham and Mill",
      "ratings": [
        { "points": 25, "description": "Nuanced understanding of both classical and modern utilitarianism" },
        { "points": 20, "description": "Accurate core theory with minor gaps" },
        { "points": 15, "description": "Some misunderstandings of theory" },
        { "points": 10, "description": "Significant misrepresentation" }
      ]
    },
    {
      "name": "Engagement with Objections",
      "longDescription": "Serious engagement with at least one major objection",
      "ratings": [
        { "points": 20, "description": "Steel-mans multiple objections with strong responses" },
        { "points": 15, "description": "Addresses major objection thoughtfully" },
        { "points": 10, "description": "Mentions objection but weak response" },
        { "points": 5, "description": "Ignores objections" }
      ]
    },
    {
      "name": "APA Formatting",
      "longDescription": "Proper APA 7th edition formatting throughout",
      "ratings": [
        { "points": 15, "description": "Flawless APA formatting" },
        { "points": 12, "description": "Minor APA errors" },
        { "points": 8, "description": "Multiple APA errors" },
        { "points": 5, "description": "APA format mostly absent" }
      ]
    },
    {
      "name": "Writing Quality",
      "longDescription": "Clear, error-free academic prose",
      "ratings": [
        { "points": 15, "description": "Polished, engaging academic writing" },
        { "points": 12, "description": "Clear writing with minor errors" },
        { "points": 8, "description": "Distracting errors throughout" },
        { "points": 5, "description": "Significant clarity/grammar issues" }
      ]
    }
  ],
  "linkedResources": [
    {
      "url": "https://canvas.university.edu/courses/445201/files/88231/download",
      "title": "APA 7 Quick Reference Guide.pdf",
      "type": "file"
    },
    {
      "url": "https://plato.stanford.edu/entries/utilitarianism-history/",
      "title": "Stanford Encyclopedia — Utilitarianism",
      "type": "link"
    }
  ],
  "capturedAt": 1712600000000,
  "sourceUrl": "https://canvas.university.edu/courses/445201/assignments/7829341"
}
```

### 9.2 Sample Canvas Discussion

```json
{
  "id": "disc_451230",
  "courseId": "course_445201",
  "type": "discussion",
  "title": "Week 4 Discussion: The Trolley Problem",
  "dueDate": 1712696400000,
  "pointsPossible": 25,
  "promptHtml": "<p>Consider the classic trolley problem: a runaway trolley is headed toward five people tied to the track. You can pull a lever to divert it onto a side track, but there is one person tied to that track.</p><p><strong>Prompt (300 words minimum):</strong></p><ul><li>What would you do, and why?</li><li>How does a utilitarian framework analyze this? How does a deontological framework analyze it?</li><li>Does it matter if you have to actively push someone to save the five (the footbridge variant)?</li></ul><p><strong>Reply Requirements:</strong> Respond to at least 2 classmates with substantive responses (100+ words each) by Sunday. Disagree productively.</p>",
  "promptText": "Consider the classic trolley problem...",
  "repliesRequired": 2,
  "wordCountTarget": 300,
  "linkedResources": [],
  "capturedAt": 1712600000000,
  "sourceUrl": "https://canvas.university.edu/courses/445201/discussion_topics/451230"
}
```

### 9.3 Sample Canvas Course (Full Capture)

```json
{
  "id": "course_445201",
  "name": "PHIL 101: Introduction to Ethics",
  "code": "PHI208",
  "term": "Spring Term",
  "instructor": "Dr. Alex Morgan",
  "assignments": [
    { "id": "assign_7829341", "type": "assignment", "title": "Ethics Paper 1: Utilitarianism in Practice", "dueDate": 1713128400000, "pointsPossible": 100 },
    { "id": "assign_7829342", "type": "assignment", "title": "Ethics Paper 2: Kantian Analysis", "dueDate": 1714338000000, "pointsPossible": 100 },
    { "id": "assign_7829343", "type": "assignment", "title": "Final Paper: Applied Ethics Case Study", "dueDate": 1716325200000, "pointsPossible": 200 }
  ],
  "discussions": [
    { "id": "disc_451228", "title": "Week 2: What is Ethics?", "dueDate": 1711486800000, "pointsPossible": 25 },
    { "id": "disc_451229", "title": "Week 3: Cultural Relativism", "dueDate": 1712091600000, "pointsPossible": 25 },
    { "id": "disc_451230", "title": "Week 4: The Trolley Problem", "dueDate": 1712696400000, "pointsPossible": 25 },
    { "id": "disc_451231", "title": "Week 5: Categorical Imperative", "dueDate": 1713301200000, "pointsPossible": 25 }
  ],
  "quizzes": [
    { "id": "quiz_334401", "title": "Midterm Quiz", "dueDate": 1713906000000, "pointsPossible": 50, "questionCount": 25, "timeLimit": 60 }
  ],
  "modules": [
    {
      "id": "mod_88001",
      "name": "Week 1-2: Introduction to Ethics",
      "items": [
        { "id": "item_1", "title": "Chapter 1 Reading: What is Ethics?", "type": "page" },
        { "id": "item_2", "title": "Introduction Video", "type": "external" },
        { "id": "item_3", "title": "Week 2 Discussion", "type": "discussion" }
      ]
    },
    {
      "id": "mod_88002",
      "name": "Week 3-4: Utilitarianism",
      "items": [
        { "id": "item_4", "title": "Chapter 3 Reading: Utilitarianism", "type": "page" },
        { "id": "item_5", "title": "Bentham vs Mill Video", "type": "external" },
        { "id": "item_6", "title": "Week 4 Discussion: Trolley Problem", "type": "discussion" },
        { "id": "item_7", "title": "Paper 1: Utilitarianism in Practice", "type": "assignment" }
      ]
    }
  ],
  "capturedAt": 1712600000000
}
```

### 9.4 Sample Textbook Chapter (Input)

```
[H1]Chapter 3: Utilitarianism[/H1]

Utilitarianism is the ethical theory that right actions are those that maximize overall well-being. Developed primarily by Jeremy Bentham in the late 18th century and refined by John Stuart Mill in the 19th century, utilitarianism represents the most influential form of consequentialism — the view that the moral worth of an action is determined entirely by its outcomes.

[H2]Bentham's Felicific Calculus[/H2]

Jeremy Bentham proposed that we can quantify pleasure and pain using what he called the felicific calculus. According to Bentham, we should evaluate actions by considering seven factors: intensity, duration, certainty, propinquity (nearness in time), fecundity (likelihood of leading to more pleasure), purity (unlikelihood of leading to pain), and extent (number of people affected).

For Bentham, all pleasures are fundamentally equal in kind. A simple pleasure like eating ice cream is, in principle, just as valuable as the intellectual pleasure of reading philosophy, provided they produce the same quantity of happiness. This view has been famously summarized as "pushpin is as good as poetry" — pushpin being a simple 18th century pub game.

[H2]Mill's Higher and Lower Pleasures[/H2]

John Stuart Mill found Bentham's position unsatisfying. In his work Utilitarianism, Mill argued that pleasures differ not just in quantity but in quality. Some pleasures — those that engage our distinctively human capacities for thought, creativity, and moral feeling — are inherently higher than mere bodily satisfactions.

Mill famously wrote that "it is better to be a human being dissatisfied than a pig satisfied; better to be Socrates dissatisfied than a fool satisfied." This is Mill's way of arguing that higher pleasures are qualitatively superior to lower ones. To determine which pleasures are higher, Mill proposed the test of competent judges: those who have experienced both types of pleasure will consistently prefer the higher ones.

[H2]Strengths of Utilitarianism[/H2]

Utilitarianism has several important strengths as an ethical theory. First, it is impartial — it demands that we give equal weight to everyone's well-being, not privileging ourselves or those close to us. Second, it is grounded in something empirically observable — happiness and suffering are real features of the world, not metaphysical abstractions. Third, it provides clear guidance in many practical situations by asking us to consider consequences systematically.

[H2]Objections[/H2]

Despite its strengths, utilitarianism faces serious objections. The first is the calculation problem: how can we actually compute the total utility of different actions, especially when consequences ripple outward unpredictably? Bentham's calculus, while systematic, seems impossible to apply in practice.

A second and more troubling objection is that utilitarianism can seem to justify harming minorities for majority benefit. If sacrificing one innocent person would save five, a strict consequentialist calculation might demand it. Critics argue this violates fundamental notions of justice and individual rights.

A third objection comes from the "experience machine" thought experiment proposed by Robert Nozick. If we could be plugged into a machine that gave us any experience we wanted, perfectly simulating a happy life, would we choose it? Most people say no — suggesting we value more than just pleasure. We value reality, authentic connection, and genuine accomplishment.

[H2]Act vs Rule Utilitarianism[/H2]

In response to these objections, some philosophers distinguish between act utilitarianism and rule utilitarianism. Act utilitarianism evaluates each individual action by its consequences. Rule utilitarianism, by contrast, asks which general rules would produce the best outcomes if consistently followed, and then requires us to follow those rules even in cases where breaking them might produce better immediate consequences. Rule utilitarianism can defend against the minority-harm objection by noting that a general rule permitting the sacrifice of innocents would lead to disastrous consequences overall.

[H2]Conclusion[/H2]

Utilitarianism remains one of the most important ethical theories, offering a systematic way to evaluate actions by their consequences. While it faces real objections, its influence on modern ethics — from bioethics to public policy — is immense.
```

### 9.5 Expected Concept Extraction Output (for the above chapter)

```json
{
  "id": "forge_bundle_textbook_ch3_001",
  "sourceId": "textbook_ethics_chapter_3",
  "sourceType": "textbook",
  "title": "Utilitarianism",
  "generatedAt": 1712600000000,
  "sourceWordCount": 612,
  "sourceHash": "a1b2c3d4e5f6",
  "concepts": [
    {
      "id": 1,
      "name": "Utilitarianism",
      "core": "Utilitarianism is the ethical theory that right actions are those that maximize overall well-being.",
      "detail": "Developed primarily by Jeremy Bentham in the late 18th century and refined by John Stuart Mill in the 19th century, utilitarianism represents the most influential form of consequentialism.",
      "mnemonic": "Utilitarianism — think 'utility meter': actions score by how much total happiness they produce.",
      "primer": "This concept relates to maximizing overall well-being through outcomes.",
      "category": "Theory Foundation",
      "keywords": ["ethical", "theory", "maximize", "well-being", "consequentialism", "outcomes"],
      "relatedConcepts": [2, 3, 7],
      "opposites": [],
      "sourceSection": 0,
      "confidence": 1.0
    },
    {
      "id": 2,
      "name": "Felicific Calculus",
      "core": "Bentham's method to quantify pleasure and pain using seven factors: intensity, duration, certainty, propinquity, fecundity, purity, and extent.",
      "detail": "Jeremy Bentham proposed that we can quantify pleasure and pain using what he called the felicific calculus. According to Bentham, we should evaluate actions by considering seven factors.",
      "mnemonic": "Remember the number 7: the felicific calculus has 7 factors — think of a weekly pleasure planner with one factor per day.",
      "primer": "This concept relates to Bentham's systematic method for quantifying pleasure.",
      "category": "Bentham",
      "keywords": ["Bentham", "quantify", "pleasure", "pain", "factors", "intensity", "duration"],
      "relatedConcepts": [1, 3],
      "opposites": [4],
      "sourceSection": 1,
      "confidence": 1.0
    },
    {
      "id": 3,
      "name": "Higher and Lower Pleasures",
      "core": "Mill's distinction that some pleasures — those engaging human capacities for thought and creativity — are qualitatively superior to mere bodily satisfactions.",
      "detail": "Mill argued that pleasures differ not just in quantity but in quality. Some pleasures engage our distinctively human capacities. Mill wrote 'it is better to be Socrates dissatisfied than a fool satisfied.'",
      "mnemonic": "Higher and Lower Pleasures is NOT Felicific Calculus. Remember: Higher/Lower = Mill (quality matters), Felicific Calculus = Bentham (just quantity).",
      "primer": "This concept relates to Mill's argument that pleasure quality matters, not just quantity.",
      "category": "Mill",
      "keywords": ["Mill", "higher", "lower", "pleasures", "quality", "Socrates", "competent judges"],
      "relatedConcepts": [1, 2],
      "opposites": [2],
      "sourceSection": 2,
      "confidence": 1.0
    },
    {
      "id": 4,
      "name": "Calculation Problem",
      "core": "The objection that utilitarianism cannot actually compute the total utility of different actions in practice.",
      "detail": "The first major objection to utilitarianism is the calculation problem: how can we actually compute the total utility of different actions, especially when consequences ripple outward unpredictably?",
      "mnemonic": "Calculation Problem — picture Bentham with a calculator that keeps breaking because the math is impossible.",
      "primer": "This concept relates to the practical impossibility of computing utilities.",
      "category": "Objections",
      "keywords": ["calculation", "compute", "utility", "objection", "practice", "consequences"],
      "relatedConcepts": [1, 2],
      "opposites": [],
      "sourceSection": 4,
      "confidence": 0.9
    },
    {
      "id": 5,
      "name": "Minority Harm Objection",
      "core": "The objection that strict utilitarian calculation could justify harming innocent minorities for majority benefit.",
      "detail": "A troubling objection is that utilitarianism can seem to justify harming minorities for majority benefit. If sacrificing one innocent person would save five, a strict consequentialist calculation might demand it.",
      "mnemonic": "Minority Harm — think of the trolley problem: utilitarianism says pull the lever to save 5 by killing 1.",
      "primer": "This concept relates to utilitarianism's potential to sacrifice individuals for majority benefit.",
      "category": "Objections",
      "keywords": ["minority", "harm", "majority", "justice", "rights", "innocent", "sacrifice"],
      "relatedConcepts": [1, 6],
      "opposites": [],
      "sourceSection": 4,
      "confidence": 0.95
    },
    {
      "id": 6,
      "name": "Experience Machine",
      "core": "Nozick's thought experiment: would you plug into a machine that perfectly simulated a happy life? Most say no, suggesting we value more than just pleasure.",
      "detail": "If we could be plugged into a machine that gave us any experience we wanted, perfectly simulating a happy life, would we choose it? Most people say no — suggesting we value more than just pleasure.",
      "mnemonic": "Experience Machine — imagine Neo from The Matrix choosing the red pill: real life beats fake bliss.",
      "primer": "This concept relates to Nozick's argument that we value authenticity beyond pleasure.",
      "category": "Objections",
      "keywords": ["Nozick", "experience", "machine", "thought experiment", "reality", "authenticity", "pleasure"],
      "relatedConcepts": [1, 5],
      "opposites": [],
      "sourceSection": 4,
      "confidence": 1.0
    },
    {
      "id": 7,
      "name": "Act vs Rule Utilitarianism",
      "core": "Act utilitarianism evaluates each individual action; rule utilitarianism asks which general rules would produce the best outcomes if consistently followed.",
      "detail": "Some philosophers distinguish between act utilitarianism (evaluating each individual action by consequences) and rule utilitarianism (following general rules that produce best overall outcomes).",
      "mnemonic": "Act vs Rule — Act is case-by-case (like a judge ruling on each trial), Rule is follow-the-law (like a police officer enforcing rules).",
      "primer": "This concept relates to two versions of utilitarianism: one per-action, one per-rule.",
      "category": "Variations",
      "keywords": ["act", "rule", "individual", "action", "general", "rules", "consistent"],
      "relatedConcepts": [1, 5],
      "opposites": [],
      "sourceSection": 5,
      "confidence": 1.0
    }
  ],
  "relationships": [
    { "fromId": 2, "toId": 3, "type": "contrasts-with", "label": "Higher and Lower Pleasures contrasts with Felicific Calculus", "strength": 0.9 },
    { "fromId": 1, "toId": 2, "type": "builds-on", "label": "Felicific Calculus builds on Utilitarianism", "strength": 0.8 },
    { "fromId": 1, "toId": 3, "type": "builds-on", "label": "Higher and Lower Pleasures builds on Utilitarianism", "strength": 0.8 },
    { "fromId": 4, "toId": 1, "type": "contrasts-with", "label": "Calculation Problem challenges Utilitarianism", "strength": 0.7 },
    { "fromId": 5, "toId": 1, "type": "contrasts-with", "label": "Minority Harm Objection challenges Utilitarianism", "strength": 0.85 },
    { "fromId": 6, "toId": 1, "type": "contrasts-with", "label": "Experience Machine challenges Utilitarianism", "strength": 0.7 },
    { "fromId": 7, "toId": 5, "type": "discussed-together", "label": "Act vs Rule Utilitarianism responds to Minority Harm Objection", "strength": 0.6 }
  ],
  "dilemmas": [
    {
      "id": 1,
      "scenario": "A runaway trolley is headed toward five people tied to the track. You're standing by a lever that can divert the trolley onto a side track, where one person is tied. You have seconds to decide.",
      "question": "What do you do?",
      "choices": [
        {
          "text": "Pull the lever — saving five lives is worth sacrificing one",
          "label": "Maximize lives saved",
          "framework": "Consequentialism/Utilitarianism",
          "reasoning": "This reflects utilitarian thinking: the action that produces the best overall outcome (5 lives saved vs 1) is the right action. You're doing the math of happiness."
        },
        {
          "text": "Don't pull the lever — you shouldn't actively kill an innocent person",
          "label": "Don't kill",
          "framework": "Deontology",
          "reasoning": "This reflects deontological thinking: some actions (like killing an innocent) are wrong regardless of consequences. There's a moral distinction between letting die and killing."
        },
        {
          "text": "Freeze — you're not sure you have the right to decide who lives",
          "label": "Moral humility",
          "framework": "Virtue Ethics",
          "reasoning": "This reflects virtue ethics: the good person recognizes the weight of such decisions and doesn't rush to act as if ethics were simple math. Wisdom sometimes includes hesitation."
        }
      ],
      "insight": "You just encountered the trolley problem — the most famous thought experiment in modern ethics. Your gut reaction maps directly onto a major ethical framework. This is how philosophers discovered these theories: by noticing patterns in intuitions about cases.",
      "conceptName": "Utilitarianism"
    }
  ],
  "rapidFire": [
    {
      "id": 1,
      "q": "Utilitarianism judges actions by their consequences rather than their intentions.",
      "a": true,
      "why": "Utilitarianism is a form of consequentialism — it evaluates actions purely by their outcomes."
    },
    {
      "id": 2,
      "q": "Bentham and Mill agreed that all pleasures are equal in kind.",
      "a": false,
      "why": "Bentham believed all pleasures were equal in kind. Mill disagreed, arguing that some pleasures (higher) are qualitatively superior to others (lower)."
    },
    {
      "id": 3,
      "q": "The felicific calculus has seven factors.",
      "a": true,
      "why": "Bentham's felicific calculus includes intensity, duration, certainty, propinquity, fecundity, purity, and extent."
    },
    {
      "id": 4,
      "q": "Nozick's experience machine thought experiment supports utilitarianism.",
      "a": false,
      "why": "The experience machine is an objection TO utilitarianism. It suggests we value reality and authenticity, not just pleasure — contradicting the utilitarian focus on happiness alone."
    },
    {
      "id": 5,
      "q": "Rule utilitarianism evaluates each individual action by its specific consequences.",
      "a": false,
      "why": "That describes ACT utilitarianism. Rule utilitarianism evaluates which general rules would produce best outcomes if consistently followed."
    }
  ],
  "corruptions": [
    {
      "id": 1,
      "level": 1,
      "statement": "Utilitarianism is the ethical theory developed by Immanuel Kant that judges actions by their consequences.",
      "error": "Utilitarianism was not developed by Kant — it was developed by Bentham and Mill. Kant was a deontologist, which is the opposite of consequentialist.",
      "correct": "Utilitarianism is the ethical theory developed by Bentham and Mill that judges actions by their consequences.",
      "hint": "Pay attention to which philosopher is credited.",
      "conceptIds": [1]
    },
    {
      "id": 2,
      "level": 3,
      "statement": "Mill argued that higher pleasures are quantitatively superior to lower pleasures.",
      "error": "Mill argued higher pleasures are QUALITATIVELY superior, not quantitatively. The whole point of his critique of Bentham was that quality matters, not just quantity.",
      "correct": "Mill argued that higher pleasures are qualitatively superior to lower pleasures.",
      "hint": "Focus on the word describing HOW the pleasures differ.",
      "conceptIds": [3]
    },
    {
      "id": 3,
      "level": 5,
      "statement": "According to strict act utilitarianism, we should always follow general rules that produce the best outcomes.",
      "error": "Single word context error: 'act utilitarianism' judges each individual ACTION, not general rules. The description fits RULE utilitarianism, not act.",
      "correct": "According to strict act utilitarianism, we should always choose the specific action that produces the best outcomes in each situation.",
      "hint": "Check whether the description matches 'act' or 'rule' utilitarianism.",
      "conceptIds": [7]
    }
  ]
}
```

(Truncated — the full bundle would include all other question types.)

### 9.6 Sample Fusion Pairing Output

```json
{
  "assignmentId": "assign_7829341",
  "assignmentTitle": "Ethics Paper 1: Utilitarianism in Practice",
  "pairings": [
    {
      "textbookChapterId": "textbook_ethics_chapter_3",
      "chapterTitle": "Utilitarianism",
      "normalizedScore": 156.4,
      "relevance": "Strongly recommended",
      "matchingConcepts": [
        { "name": "Utilitarianism", "matchType": "exact", "weight": 30 },
        { "name": "Felicific Calculus", "matchType": "exact", "weight": 30 },
        { "name": "Higher and Lower Pleasures", "matchType": "keyword", "weight": 15 },
        { "name": "Minority Harm Objection", "matchType": "exact", "weight": 30 }
      ],
      "bridgeText": "This assignment directly asks you to analyze utilitarianism. Chapter 3 covers Bentham's felicific calculus and Mill's higher/lower pleasures distinction, plus the major objections you'll need to address — especially the minority harm objection."
    },
    {
      "textbookChapterId": "textbook_ethics_chapter_4",
      "chapterTitle": "Deontology (Kant)",
      "normalizedScore": 42.1,
      "relevance": "Useful background",
      "matchingConcepts": [
        { "name": "Consequentialism", "matchType": "keyword", "weight": 15 }
      ],
      "bridgeText": "While this assignment focuses on utilitarianism, Chapter 4 provides the contrasting deontological framework that strengthens your analysis of objections."
    }
  ]
}
```

---

## 10. BUILD ORDER FOR CODEX

Execute in this exact sequence. Do not skip ahead. Each phase should be verified before proceeding.

### Phase 0: Foundation (1-2 days)

1. Initialize pnpm workspace monorepo
2. Set up `packages/shared-types` with all TypeScript interfaces from Section 8
3. Create `fixtures/` directory with sample JSONs from Section 9
4. Set up `apps/web` as a Vite + React + TypeScript project
5. Configure ESLint, Prettier, Vitest
6. Create `styles/tokens.css` with the design system from Section 1
7. Set up routing (React Router) with placeholder routes for all 5 views
8. Set up Zustand stores (empty shells)
9. Set up IndexedDB wrapper in `persistence/db.ts`
10. Configure GitHub Actions workflow for GH Pages deploy

**Verification:** `pnpm dev` runs locally, navigation works, no console errors.

### Phase 1: Content Engine Package (3-5 days)

Build `packages/content-engine` completely before touching the UI.

1. **Stage 1 — Normalize:** Implement `normalize.ts`. Write unit tests with fixture HTML.
2. **Stage 2 — Segment:** Implement `segment.ts`. Test with the sample textbook chapter.
3. **Stage 3 — Extract:** Implement `extract-concepts.ts` with all 4 methods. Test against the sample chapter — should produce 7+ concepts matching Section 9.5.
4. **Stage 3b — Mnemonics:** Implement `mnemonics.ts` with 15 templates.
5. **Stage 4 — Relationships:** Implement `map-relations.ts`. Test edge detection.
6. **Stage 5 — Questions:** Implement `generate-questions.ts` with all 12 MC types + 5 T/F methods + corruptions + cross-exam + domain transfer + teach-back + dilemmas. This is the biggest file — split into sub-modules if needed.
7. **Stage 6 — Assemble:** Implement `assemble.ts`. Test full pipeline end-to-end.

**Bundle these dictionaries into the package:**
- `stopwords.json` — standard English stopwords
- `word-frequency.json` — top 10K English words by frequency
- `synonyms.json` — 3K common synonym pairs
- `philosophers.json` — 200 common philosopher names
- `domains.json` — 20 domain transfer scenario templates

**Verification:**
- `pnpm test` passes all content-engine tests
- Running the engine on `fixtures/textbooks/ethics-intro-chapter.txt` produces a `ForgeBundle` matching the expected structure in 9.5

### Phase 2: Static App Views with Mock Data (4-6 days)

Build all UI views using the fixture JSONs. No extension yet. No textbook upload yet.

1. **Design tokens + primitives:** `components/primitives/` — Button, Card, Tag, Glow, ProgressBar, Timer, Loader
2. **Global layout:** TopBar with navigation, reactive routing
3. **Home / Mission Control:** Reads from fixture, displays three columns with cards
4. **Timeline:** Horizontal sideways scroll implementation. Start with static data, add motion later.
5. **Assignment Detail:** Three-column layout, reads fixture, shows breakdown + placeholder submission workspace
6. **Concept Map:** Use Cytoscape.js or D3 force layout. Start with a small test graph, then render the full concept graph from the fixture.
7. **Neural Forge:** Build all 5 phase components (GenesisPhase, ForgePhase, CruciblePhase, ArchitectPhase, TranscendPhase). Use the sample ForgeBundle from 9.5.
8. **Settings:** Form for student name, professor names, university, preferences
9. **Empty states** for every view

**Verification:**
- All 5 views render correctly with fixture data
- Navigation works smoothly
- Neural Forge plays through all 5 phases end-to-end
- Timeline scrolls horizontally with premium feel
- Concept Map displays nodes colored by mastery

### Phase 3: Textbook Upload + Content Engine Integration (2 days)

1. Build the TextbookUpload route — drag-and-drop zone + paste textarea
2. Support .txt files directly, .pdf via `pdf.js` (client-side extraction)
3. On upload, run through Content Engine, save ForgeBundle to IndexedDB
4. Show generated concepts as a preview before confirming save
5. Hook Neural Forge entry screen to list all saved textbook chapters

**Verification:** Upload the sample textbook chapter, see it processed, see concepts appear, launch Neural Forge against it.

### Phase 4: Submission Engine (3-4 days)

Build `packages/submission-engine` completely.

1. **Editor component:** Rich contenteditable with toolbar, counters, paste sanitizer
2. **Checker 1 — Requirements Matcher:** Test with the sample assignment
3. **Checker 2 — Grammar:** All 30 rules with unit tests per rule
4. **Checker 3 — Punctuation:** All 10 rules
5. **Checker 4 — Spelling:** Bundle `english-50k.json` word list, implement Levenshtein suggestions
6. **Checker 5 — APA:** All 14 rules
7. **Checker 6 — Readability:** Flesch-Kincaid + metrics
8. **Checker 7 — Structure:** All 7 structure checks
9. **Score Aggregator:** Weighted scoring, letter grade assignment
10. **Docx Generator:** Using `docx` library, Bahnschrift 12pt, title page, margin comments, summary comment with one-paragraph feedback
11. **Clipboard copy:** `navigator.clipboard.writeText()` with toast confirmation
12. **Integrate into Assignment Detail view**

**Verification:** Write a sample response to the sample assignment, click GRADE & EXPORT, verify .docx downloads with correct formatting, correct annotations, and clipboard copy works.

### Phase 5: Fusion Engine (2 days)

Build `packages/fusion-engine`.

1. **Pair chapters algorithm:** Score textbook chapters against assignments
2. **Build unified concept graph:** Merge textbook + Canvas concepts
3. **Mastery tracking:** Update mastery on all relevant events
4. **Integrate into Assignment Detail:** Show recommended chapters
5. **Integrate into Concept Map:** Show unified graph with mastery colors

**Verification:** Import the sample Canvas course + upload sample textbook, verify that opening Paper 1 assignment shows Chapter 3 as strongly recommended with the correct concept bridge.

### Phase 6: Chrome Extension (3-4 days)

Build `apps/extension`.

1. **Manifest + service worker scaffolding**
2. **Content script for Canvas:** Page type detection, per-type extractors (assignment, discussion, module, syllabus, quiz)
3. **Storage:** Save captures to `chrome.storage.local`
4. **Popup UI:** List captured items, "Send to Workspace" button
5. **Content bridge for GitHub Pages:** Receive messages from service worker, relay via postMessage
6. **Bridge receiver in web app:** Accept payloads, save to IndexedDB, refresh views
7. **Handoff flow end-to-end test**

**Verification:** Install unpacked extension, visit a Canvas course, capture multiple pages, click Send to Workspace, verify data appears in the web app.

### Phase 7: Polish & Motion (2-3 days)

1. Timeline parallax and momentum
2. Concept map animations (pulsing, flowing edges)
3. Neural Forge phase transitions
4. Success moments (grade reveals, mastery gains)
5. Empty states with illustrations
6. Loading states with orbital animations
7. Reduce-motion fallbacks for everything
8. Mobile responsive polish

**Verification:** Full end-to-end flow feels premium and motivating.

### Phase 8: Testing & Documentation (2 days)

1. End-to-end integration tests (Playwright)
2. README with install + usage instructions
3. Contributing guide
4. Deploy to GitHub Pages via workflow
5. Document extension install instructions

---

## 11. THE CODEX HANDOFF PROMPT

Paste this entire block into Codex to initiate the build:

---

> **You are building AEONTHRA — a deterministic learning platform. Zero AI/LLM calls at runtime. Zero backend. 100% static site + Chrome extension. Deploys to GitHub Pages.**
>
> **Read the full specification in `AEONTHRA_SPEC.md` before writing any code.** The spec defines four integrated engines, five main views, complete data schemas, sample JSON fixtures, and an exact build order.
>
> **Your first task: Scaffold the monorepo** (Phase 0 in the spec). Set up:
> - pnpm workspaces
> - `packages/shared-types` with every TypeScript interface from Section 8 of the spec
> - `packages/content-engine`, `packages/submission-engine`, `packages/fusion-engine` (empty for now)
> - `apps/web` — Vite + React + TypeScript + React Router + Zustand
> - `apps/extension` — Manifest V3 scaffolding
> - `fixtures/` directory with the sample JSON files from Section 9 of the spec
> - `.github/workflows/deploy.yml` for GitHub Pages deployment
> - ESLint, Prettier, Vitest configuration
> - `styles/tokens.css` with the exact design system from Section 1 of the spec
>
> **After scaffolding is complete and verified (`pnpm install && pnpm dev` works), STOP and confirm before proceeding to Phase 1 (the Content Engine).**
>
> **Absolute constraints:**
> - Never add runtime AI/LLM calls
> - Never add a backend service
> - Never commit secrets or API keys
> - Every feature must work offline after initial page load
> - All Word documents must use Bahnschrift 12pt
> - All generated content must be deterministic and source-grounded
> - The UI must match the "Neural Forge" aesthetic defined in Section 1 — no generic React styling, no developer-tool look
>
> **Execute Phase 0 now. Report back when scaffolding is verified and ready for Phase 1.**

---

## 12. HONEST LIMITATIONS

To be transparent with the user about what deterministic methods can and cannot do:

1. **Concept extraction quality depends on source quality.** Well-structured textbook prose with explicit definitions produces excellent concepts. Canvas chrome, LMS boilerplate, and poorly-written content will produce weaker extractions. The engine includes quality scoring and graceful fallback — it will say less when the source supports less, rather than invent content.

2. **Question generation uses templates, not understanding.** Questions will occasionally feel formulaic. The 12 MC templates + 5 T/F methods produce variety, but sophisticated synthesis questions that a human teacher might write are beyond deterministic generation.

3. **Grammar checking catches common errors, not all errors.** 30 rules cover the majority of student writing mistakes, but context-dependent errors (e.g., "affect" vs "effect" in ambiguous contexts) require human review.

4. **Spelling uses a fixed dictionary.** Domain-specific terms (some philosophers, technical jargon) may be flagged. The supplemental academic dictionary mitigates this but won't cover everything.

5. **APA checking handles common patterns, not edge cases.** The rules cover 90%+ of undergraduate APA needs but don't handle every citation style variant (legal cases, personal communications, multimedia sources).

6. **Fusion Engine pairing is keyword-based.** It matches textbook chapters to assignments via concept overlap, not semantic understanding. It will miss pairings where the assignment uses different vocabulary than the textbook.

7. **Concept Map relationships are inferred from co-occurrence.** It may miss conceptual relationships that aren't linguistically adjacent in the source.

8. **The Chrome extension only captures pages the student visits.** It is not an omniscient Canvas API client — it reads the DOM of pages already loaded in the browser.

**When in doubt, the system says less rather than more. It never invents content the source doesn't support.**

---

## END OF SPECIFICATION

This document contains everything Codex needs to build AEONTHRA end-to-end. Hand it over, start with the Codex prompt in Section 11, and execute the phases in order.
