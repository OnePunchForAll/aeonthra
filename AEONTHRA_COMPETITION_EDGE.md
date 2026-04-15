# AEONTHRA COMPETITION EDGE — The Final Polish That Wins

## Eight Features That Separate "Impressive Project" from "Undeniable Winner"

**Codex: this is the final directive. Execute after all previous passes are complete and verified. Every feature below exists because competition judges have specific patterns — they scan READMEs, they click demos, they check accessibility, they remember moments. This pass engineers those moments deliberately.**

**None of these features are large. Most are 1-2 day implementations. Together they close every gap a judge might use to rank you second instead of first.**

---

## 1. ONE-CLICK DEMO MODE (THE MOST IMPORTANT FEATURE IN THIS DOCUMENT)

### 1.1 Why this wins competitions

A judge opens your GitHub Pages link. They see "Import. Forge. Master." They don't have a Canvas account. They don't have a textbook PDF. They have 90 seconds of attention before moving to the next submission.

If they have to figure out how to get data into the app, **you lose.**

If they click one button and the entire app fills with a beautiful pre-loaded course, concept map coloring in, timeline populating, Neural Forge ready to play — **you win.**

Demo mode is the single highest-ROI feature you can build. It transforms the app from "looks impressive but I can't try it" to "I just experienced it and I'm blown away."

### 1.2 Implementation

**Pre-baked demo bundle:** Ship a complete `ForgeBundle` + `CapturedCourse` + `ConceptGraph` + sample `Progress` as static JSON files in `apps/web/public/demo/`.

The demo data should represent a realistic 8-week philosophy course with:
- 6 assignments (mix of papers, short responses, reflections)
- 4 discussions (with full prompts and word count requirements)
- 2 quizzes
- 8 modules
- 12 textbook concepts fully extracted with definitions, mnemonics, relationships
- 15 rapid fire questions, 12 deep drill, 5 corruptions, 3 cross-exams, 3 domain transfers, 3 teach-backs, 3 dilemmas, 10 boss fight questions
- A concept graph with 12 nodes and 18 edges
- Simulated partial progress: 3 concepts at 60-80% mastery, 4 at 20-40%, 5 at 0%
- 2 assignments unlocked, 4 still gated
- A pre-written draft in one assignment's submission workspace
- Timeline spanning 8 weeks with goals woven in

**Demo entry point:** On the import screen, the "OPEN NEURAL FORGE DEMO" button already exists. Upgrade it:

```tsx
function DemoButton() {
  const [loading, setLoading] = useState(false);
  
  const loadDemo = async () => {
    setLoading(true);
    
    // Fetch all demo files
    const [course, bundle, graph, progress] = await Promise.all([
      fetch('/demo/course.json').then(r => r.json()),
      fetch('/demo/forge-bundle.json').then(r => r.json()),
      fetch('/demo/concept-graph.json').then(r => r.json()),
      fetch('/demo/progress.json').then(r => r.json()),
    ]);
    
    // Write to IndexedDB as if a real capture arrived
    await db.put('canvas_captures', course);
    await db.put('forge_bundles', bundle);
    await db.put('concept_graphs', graph);
    await db.put('progress', progress);
    
    // Navigate to dashboard
    navigate('/dashboard');
    setLoading(false);
    
    // Show a subtle banner indicating demo mode
    setDemoMode(true);
  };
  
  return (
    <button className="btn btn-gold demo-btn" onClick={loadDemo} disabled={loading}>
      {loading ? (
        <span className="loader-inline" />
      ) : (
        <>⚡ EXPERIENCE THE DEMO</>
      )}
    </button>
  );
}
```

**Demo mode banner:** When in demo mode, a thin gold banner appears at the top of every view:

```
┌──────────────────────────────────────────────────────────────────┐
│ ⚡ DEMO MODE — Exploring PHIL 101: Ethics. Import your own       │
│   course to replace this data.                      [ DISMISS ] │
└──────────────────────────────────────────────────────────────────┘
```

```css
.demo-banner {
  background: linear-gradient(90deg, rgba(255, 215, 0, 0.08), rgba(255, 136, 0, 0.08));
  border-bottom: 1px solid rgba(255, 215, 0, 0.2);
  padding: var(--space-2) var(--space-4);
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  color: var(--gold);
  display: flex;
  align-items: center;
  justify-content: space-between;
}
```

**Guided tour overlay (optional but powerful):** On first demo load, a 5-step tooltip tour highlights key features:

1. "This is your **Timeline** — every assignment, discussion, and goal for the semester" (arrow pointing to timeline)
2. "This is the **Concept Map** — concepts color in as you master them" (arrow to concept map)
3. "This assignment is **locked** — complete Neural Forge first to unlock it" (arrow to gated assignment)
4. "Try **Neural Forge** now — click to start a 5-phase learning session" (arrow to Forge nav pill)
5. "When you're ready, **import your own Canvas course** to replace this demo" (arrow to import button)

Each tooltip advances on click. Can be skipped entirely. Uses a simple array of `{ target: string, text: string, position: 'top' | 'bottom' | 'left' | 'right' }` rendered as positioned popovers with spring animation.

### 1.3 The demo fixture must be EXCELLENT

The demo is the first thing every judge sees. The concepts, questions, and mnemonics in the demo bundle must be the best output the engine is capable of. Do NOT auto-generate the demo from the engine and ship whatever comes out. Instead:

1. Run the engine on the sample ethics textbook chapter from the fixtures
2. Inspect every generated concept, question, and mnemonic
3. Hand-tune anything that reads awkwardly
4. Save the hand-tuned version as the static demo bundle

This is the ONE place where hand-tuning is justified — it's a showcase, not a test of the engine.

### 1.4 Acceptance test

Open the app with no prior data. Click "EXPERIENCE THE DEMO." Within 2 seconds, the dashboard loads with a full course. Navigate to Timeline — events populate with week columns and goals. Navigate to Concept Map — 12 nodes with 3 glowing gold/teal (partially mastered). Navigate to an assignment — see gating with concept requirements. Navigate to Forge — start a real interactive quiz. All of this works on the first click.

---

## 2. PDF TEXTBOOK INGESTION

### 2.1 Why this matters

Students have their textbooks as PDFs, not text files. Pasting a 300-page textbook into a textarea is absurd. Drag-and-drop a PDF is natural. This is the second-biggest UX gap after demo mode.

### 2.2 Implementation

Use Mozilla's `pdf.js` library (open source, runs entirely client-side, ~500KB bundled).

```typescript
// packages/content-engine/src/pdf-ingest.ts
import * as pdfjsLib from 'pdfjs-dist';

// Set worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

interface PDFExtractionResult {
  title: string;
  totalPages: number;
  text: string;
  chapters: PDFChapter[];
  metadata: PDFMetadata;
}

interface PDFChapter {
  title: string;
  startPage: number;
  endPage: number;
  text: string;
}

export async function extractTextFromPDF(
  file: File,
  onProgress?: (page: number, total: number) => void
): Promise<PDFExtractionResult> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const totalPages = pdf.numPages;
  
  // Extract metadata
  const metadata = await pdf.getMetadata();
  const title = metadata.info?.Title || inferTitleFromFilename(file.name);
  
  // Extract text page by page
  const pageTexts: string[] = [];
  for (let i = 1; i <= totalPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    
    // Reconstruct text with layout awareness
    const items = textContent.items as any[];
    let pageText = '';
    let lastY: number | null = null;
    let lastFontSize: number = 0;
    
    for (const item of items) {
      const y = item.transform[5];
      const fontSize = item.transform[0]; // approximate
      
      // Detect line breaks
      if (lastY !== null && Math.abs(y - lastY) > 2) {
        // Detect heading-level font size changes
        if (fontSize > lastFontSize * 1.3 && item.str.trim().length > 0) {
          pageText += '\n\n[H2]' + item.str;
          // Will close the heading when font size returns to normal
        } else {
          pageText += '\n';
        }
      }
      
      pageText += item.str;
      lastY = y;
      lastFontSize = fontSize;
    }
    
    pageTexts.push(pageText);
    
    if (onProgress) onProgress(i, totalPages);
    
    // Yield to prevent blocking
    if (i % 5 === 0) await new Promise(r => setTimeout(r, 0));
  }
  
  const fullText = pageTexts.join('\n\n--- PAGE BREAK ---\n\n');
  
  // Detect chapter boundaries
  const chapters = detectChapters(pageTexts, fullText);
  
  return {
    title,
    totalPages,
    text: fullText,
    chapters,
    metadata: {
      author: metadata.info?.Author || 'Unknown',
      subject: metadata.info?.Subject || '',
      pageCount: totalPages,
      fileSize: file.size,
    },
  };
}

function detectChapters(pageTexts: string[], fullText: string): PDFChapter[] {
  const chapters: PDFChapter[] = [];
  
  // Strategy 1: Look for "Chapter N" headings
  const chapterPattern = /(?:^|\n)\s*(?:CHAPTER|Chapter)\s+(\d+)[:\s.\-—]+(.+?)(?:\n|$)/g;
  let match;
  const chapterStarts: Array<{ num: number; title: string; pageIndex: number; charIndex: number }> = [];
  
  let runningCharIndex = 0;
  for (let pageIdx = 0; pageIdx < pageTexts.length; pageIdx++) {
    const pageText = pageTexts[pageIdx];
    chapterPattern.lastIndex = 0;
    
    while ((match = chapterPattern.exec(pageText)) !== null) {
      chapterStarts.push({
        num: parseInt(match[1]),
        title: match[2].trim(),
        pageIndex: pageIdx,
        charIndex: runningCharIndex + match.index,
      });
    }
    
    runningCharIndex += pageText.length + 20; // account for page break separator
  }
  
  // Build chapter ranges
  for (let i = 0; i < chapterStarts.length; i++) {
    const start = chapterStarts[i];
    const end = chapterStarts[i + 1];
    
    const startCharIdx = start.charIndex;
    const endCharIdx = end ? end.charIndex : fullText.length;
    
    chapters.push({
      title: `Chapter ${start.num}: ${start.title}`,
      startPage: start.pageIndex + 1,
      endPage: end ? end.pageIndex : pageTexts.length,
      text: fullText.substring(startCharIdx, endCharIdx),
    });
  }
  
  // If no chapters detected, treat the whole document as one chapter
  if (chapters.length === 0) {
    chapters.push({
      title: 'Full Document',
      startPage: 1,
      endPage: pageTexts.length,
      text: fullText,
    });
  }
  
  return chapters;
}
```

### 2.3 UI for PDF upload

Replace the current "Paste textbook text here" textarea with a smart upload zone that handles both:

```tsx
function TextbookUploadZone() {
  const [dragOver, setDragOver] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ page: 0, total: 0 });
  const [mode, setMode] = useState<'idle' | 'pdf' | 'paste'>('idle');
  
  const handleFile = async (file: File) => {
    if (file.type === 'application/pdf') {
      setMode('pdf');
      setProcessing(true);
      
      const result = await extractTextFromPDF(file, (page, total) => {
        setProgress({ page, total });
      });
      
      // Show chapter detection results
      setChapters(result.chapters);
      setProcessing(false);
    } else if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
      const text = await file.text();
      handleTextUpload(text, file.name);
    }
  };
  
  return (
    <div
      className={cls('upload-zone', { 'upload-zone--drag': dragOver })}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
      }}
    >
      {processing ? (
        <div className="upload-progress">
          <div className="loader-orbital" />
          <p className="upload-progress__stage">
            Extracting page {progress.page} of {progress.total}
          </p>
          <ProgressBar value={progress.page} max={progress.total} />
        </div>
      ) : (
        <>
          <div className="upload-zone__icon">📖</div>
          <h3 className="upload-zone__title">UPLOAD TEXTBOOK</h3>
          <p className="upload-zone__hint">
            Drop a PDF or text file here, or paste text below
          </p>
          
          <div className="upload-zone__actions">
            <label className="btn btn-primary">
              CHOOSE FILE
              <input
                type="file"
                accept=".pdf,.txt,.text,.md"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
                hidden
              />
            </label>
          </div>
          
          <div className="upload-zone__divider">— or paste —</div>
          
          <textarea
            className="upload-zone__textarea"
            placeholder="Paste textbook text here..."
            onPaste={(e) => {
              const text = e.clipboardData.getData('text');
              if (text.length > 500) {
                e.preventDefault();
                handleTextUpload(text, 'Pasted textbook');
              }
            }}
          />
        </>
      )}
    </div>
  );
}
```

### 2.4 Chapter selection after PDF extraction

After a PDF is extracted, show a chapter picker:

```
┌────────────────────────────────────────────────────────────────┐
│  PDF EXTRACTED: Introduction to Ethics (Bradley Thames)         │
│  Pages: 342  ·  Chapters detected: 8  ·  Size: 47K words       │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  SELECT CHAPTERS TO PROCESS                                    │
│                                                                │
│  ☑ Chapter 1: What is Ethics? (pp 1-38) .......... 4,200 words │
│  ☑ Chapter 2: Cultural Relativism (pp 39-64) ..... 3,800 words │
│  ☑ Chapter 3: Utilitarianism (pp 65-98) .......... 5,100 words │
│  ☑ Chapter 4: Kantian Ethics (pp 99-132) ......... 4,700 words │
│  ☑ Chapter 5: Virtue Ethics (pp 133-160) ......... 3,900 words │
│  ☐ Chapter 6: Social Contract (pp 161-194) ....... 4,400 words │
│  ☐ Chapter 7: Applied Ethics (pp 195-236) ........ 5,800 words │
│  ☐ Chapter 8: Metaethics (pp 237-280) ............ 6,200 words │
│                                                                │
│  Selected: 5 chapters · ~21,700 words                          │
│  Estimated processing time: ~15 seconds                        │
│                                                                │
│  ┌────────────────────────────────────────────────────┐        │
│  │  ⚡ PROCESS SELECTED CHAPTERS                      │        │
│  └────────────────────────────────────────────────────┘        │
│                                                                │
│  [ SELECT ALL ]  [ DESELECT ALL ]                              │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

This lets the student process only the chapters they need right now (e.g., "I only need Chapters 1-5 for the midterm") instead of processing the entire book.

### 2.5 Acceptance test

Drag a real PDF textbook (200+ pages) onto the upload zone. See page-by-page extraction progress. Chapter detection identifies chapter boundaries. Chapter picker shows detected chapters with page ranges and word counts. Select 3 chapters. Click PROCESS. Content engine runs in Web Worker. Concepts are extracted. Neural Forge bundles are built. All within 30 seconds for 3 chapters.

---

## 3. SPACED REPETITION ENGINE

### 3.1 Why this matters

Neural Forge teaches concepts once in a single session. But the forgetting curve is real — within 7 days, 80% of what you learned is gone unless you review it. A spaced repetition system (SRS) that surfaces "review these concepts today" on the dashboard gives the app daily return value and makes the learning actually stick.

No other Codex competition entry will have this. It's a scientifically-backed differentiator.

### 3.2 Implementation — SM-2 Algorithm (deterministic)

SM-2 is the algorithm behind Anki, one of the most successful learning tools ever built. It's fully deterministic — no AI needed.

```typescript
// packages/content-engine/src/spaced-repetition.ts

interface ReviewCard {
  conceptId: string;
  interval: number;       // days between reviews (starts at 1)
  easeFactor: number;     // 2.5 default, adjusts with performance
  repetitions: number;    // how many times successfully recalled
  nextReviewDate: number; // timestamp
  lastReviewDate: number;
}

/**
 * SM-2 algorithm: computes next review interval based on quality of recall
 * @param quality 0-5 rating (0=total blackout, 5=perfect recall)
 */
function sm2(card: ReviewCard, quality: number): ReviewCard {
  let { interval, easeFactor, repetitions } = card;
  
  if (quality >= 3) {
    // Successful recall
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions += 1;
  } else {
    // Failed recall — reset
    repetitions = 0;
    interval = 1;
  }
  
  // Adjust ease factor
  easeFactor = Math.max(
    1.3,
    easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  );
  
  const nextReviewDate = Date.now() + interval * 24 * 60 * 60 * 1000;
  
  return {
    ...card,
    interval,
    easeFactor,
    repetitions,
    nextReviewDate,
    lastReviewDate: Date.now(),
  };
}

/**
 * Get concepts that are due for review today
 */
function getDueReviews(cards: ReviewCard[], now: number = Date.now()): ReviewCard[] {
  return cards
    .filter(c => c.nextReviewDate <= now)
    .sort((a, b) => a.nextReviewDate - b.nextReviewDate);
}
```

### 3.3 Integration with Neural Forge

After completing any Neural Forge phase, each concept the student encountered is added to the SRS deck:

```typescript
function onForgePhaseComplete(conceptIds: string[], scores: Record<string, number>) {
  for (const conceptId of conceptIds) {
    const existing = srsStore.getCard(conceptId);
    const quality = scoreToQuality(scores[conceptId]); // maps 0-100% to 0-5 scale
    
    if (existing) {
      const updated = sm2(existing, quality);
      srsStore.updateCard(updated);
    } else {
      // New card — first exposure
      srsStore.addCard({
        conceptId,
        interval: 1,
        easeFactor: 2.5,
        repetitions: 0,
        nextReviewDate: Date.now() + 24 * 60 * 60 * 1000, // review tomorrow
        lastReviewDate: Date.now(),
      });
    }
  }
}

function scoreToQuality(score: number): number {
  if (score >= 90) return 5;
  if (score >= 75) return 4;
  if (score >= 60) return 3;
  if (score >= 40) return 2;
  if (score >= 20) return 1;
  return 0;
}
```

### 3.4 Dashboard Review Widget

On the Home / Dashboard view, show a review card when concepts are due:

```
┌─────────────────────────────────────────────────────────────────┐
│  🔁 DAILY REVIEW                         5 concepts due today   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Your brain forgets 80% within 7 days.                          │
│  5 minutes of review keeps everything you've learned alive.     │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                                                           │  │
│  │   CONCEPT: Categorical Imperative                         │  │
│  │                                                           │  │
│  │   Can you recall what this means?                         │  │
│  │                                                           │  │
│  │   [ REVEAL DEFINITION ]                                   │  │
│  │                                                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  After revealing: rate your recall                              │
│  [ BLANK ] [ HARD ] [ GOOD ] [ EASY ] [ PERFECT ]               │
│     0        2        3        4         5                      │
│                                                                 │
│  Card 1 of 5                    ████░░░░░░░░░░░  20%            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

Interaction flow:
1. Student sees concept name
2. Tries to recall the definition mentally
3. Clicks REVEAL DEFINITION to check
4. Rates their recall quality (0-5)
5. SM-2 computes the next review interval
6. Advances to next card
7. After all cards: "Review complete! Next review: 3 concepts tomorrow, 2 in 3 days."

### 3.5 Review Stats on Dashboard

```
┌─────────────────────────────────────────┐
│  MEMORY HEALTH                          │
│                                         │
│  Concepts in review deck: 24            │
│  Due today: 5                           │
│  Due this week: 12                      │
│  Current streak: 3 days                 │
│                                         │
│  Retention estimate: 87%                │
│  (based on your review consistency)     │
│                                         │
│  ████████████████████░░░░░  87%         │
└─────────────────────────────────────────┘
```

Retention estimate = percentage of reviews where quality ≥ 3 (successful recall) over the last 30 days. Purely deterministic from review history data.

### 3.6 Acceptance test

Complete Neural Forge for a chapter. Next day (or simulate by adjusting system clock), open the dashboard. "DAILY REVIEW" widget shows 5+ concepts due. Complete the review by revealing and rating each. Review widget disappears (no more due today). Next review dates are scheduled based on SM-2. Over a week of simulated usage, intervals lengthen for well-recalled concepts and shorten for forgotten ones.

---

## 4. README THAT READS LIKE A PITCH DECK

### 4.1 Why this matters

Competition judges open the GitHub repo. They see the README. If it's a bland "Getting Started" doc, they skim it and move on. If it's a visually striking pitch that tells a story, they remember it.

### 4.2 The README structure

Write this exact file as `README.md` in the repo root:

```markdown
<div align="center">

# ⚡ AEONTHRA

### The Deterministic Learning Instrument

**Turn any Canvas course into a complete, interactive, offline learning environment.**
**No AI APIs. No backend. No subscriptions. 100% your browser.**

[**→ Try the Live Demo**](https://aeonthra.github.io/aeonthra/) · [Install Extension](#install) · [How It Works](#architecture)

---

<img src="docs/screenshots/hero.png" alt="AEONTHRA Dashboard" width="800" />

</div>

## The Problem

You're a college student. You have 47 assignments, 12 discussions, and 3 textbook chapters to get through before next week. Canvas gives you a list. Your textbook gives you 300 pages. Nobody gives you a plan.

You need a system that:
- **Understands** what your course actually contains
- **Teaches** you the concepts before testing you
- **Gates** your assignments until you've prepared
- **Generates** real quizzes, dilemmas, and practice sessions from YOUR content
- **Grades** your writing before you submit it
- Works **offline**, runs **locally**, costs **nothing**

## The Solution

AEONTHRA captures your entire Canvas course with one click, processes it alongside your uploaded textbook using a 10-stage deterministic content engine, and builds a complete interactive learning environment — all in your browser.

### Four Engines
| Engine | What It Does |
|--------|-------------|
| **Canvas Capture** | Chrome extension auto-walks your entire course, captures every page, strips LMS noise |
| **Neural Forge** | 5-phase 60-minute learning ritual with real quizzes, concept scans, dilemmas, and mastery calibration |
| **Fusion** | Pairs textbook chapters with Canvas assignments. Tells you which chapters matter for which work |
| **Submission** | 7 deterministic checkers (grammar, APA, structure, spelling, readability, requirements, citations) + Bahnschrift 12pt .docx export with margin annotations |

### Nine Novel Interactions
| Mode | What Happens |
|------|-------------|
| **Echo Chamber** | Your textbook whispers relevant passages while you write |
| **Oracle Panel** | Ask philosophers from your textbook questions — they respond from their quoted positions |
| **Gravity Field** | Physics simulation where concepts pull assignments into orbit by mastery |
| **Shadow Reader** | Textbook drifts at the edge of your screen — passive ambient learning |
| **Failure Atlas** | See what F-quality work looks like BEFORE you write — learn from deliberate failure examples |
| **Collision Lab** | Drag two concepts together and watch the synthesis, tensions, and historical collisions |
| **Duel Arena** | Two concepts fight in a 5-round debate. You judge. The textbook grades your ruling |
| **Prompt Prism** | Every assignment refracts into 5+ valid interpretations with thesis scaffolds |
| **Time Capsule** | Write a letter to your future self. The system holds you to your promises |

### Performance
- Processes a 300-page PDF textbook in **~8 seconds**
- Generates 47 quiz questions from one chapter in **< 200ms**
- Full course capture (134 items) in **< 10 minutes**
- Zero network calls after initial page load
- Total bundle size: **< 2 MB**

## Screenshots

<table>
<tr>
<td><img src="docs/screenshots/timeline.png" width="400" alt="Timeline" /></td>
<td><img src="docs/screenshots/forge.png" width="400" alt="Neural Forge" /></td>
</tr>
<tr>
<td><img src="docs/screenshots/concept-map.png" width="400" alt="Concept Map" /></td>
<td><img src="docs/screenshots/assignment.png" width="400" alt="Assignment Detail" /></td>
</tr>
</table>

## Try It

### Live Demo (no install needed)
→ **[aeonthra.github.io/aeonthra](https://aeonthra.github.io/aeonthra/)**

Click "Experience the Demo" to explore a pre-loaded philosophy course.

### Install the Extension
1. Clone: `git clone https://github.com/aeonthra/aeonthra.git`
2. Install: `pnpm install`
3. Build extension: `pnpm --filter extension build`
4. Open `chrome://extensions` → Enable Developer Mode → Load Unpacked → select `apps/extension/dist`
5. Navigate to any Canvas course → Open AEONTHRA side panel → Click "Capture Entire Course"

### Run Locally
```bash
pnpm install
pnpm dev
```

## Architecture

```
Canvas Course ──(Chrome Extension)──▶ Captured JSON
                                          │
Textbook PDF ──(pdf.js client-side)──▶ Extracted Text
                                          │
                                          ▼
                              ┌─────────────────────┐
                              │  Content Engine      │
                              │  10-stage pipeline   │
                              │  Zero AI calls       │
                              └──────────┬──────────┘
                                         │
                         ┌───────────────┼───────────────┐
                         ▼               ▼               ▼
                   Concept Map     Neural Forge     Submission
                   + Mastery       5-phase ritual   7 checkers
                   + Spaced Rep    + 9 novel modes  + .docx export
```

## Tech Stack
- **Frontend:** React + TypeScript + Vite
- **Styling:** Custom design system (dark cyberpunk aesthetic)
- **State:** Zustand + IndexedDB + localStorage
- **Extension:** Chrome Manifest V3 with Side Panel API
- **PDF:** pdf.js (client-side)
- **Docs:** docx.js (client-side .docx generation)
- **Physics:** Custom spring solver
- **Deploy:** GitHub Pages (zero backend)

## License
MIT

---

<div align="center">

**Built for the student who is behind, overwhelmed, and deserves a system that actually teaches.**

</div>
```

### 4.3 Screenshots

Take real screenshots of the demo data loaded into every view. Save them in `docs/screenshots/`. Minimum 4 screenshots:
- `hero.png` — the dashboard with course loaded
- `timeline.png` — the horizontal timeline with events and goals
- `forge.png` — Neural Forge mid-quiz
- `concept-map.png` — concept map with mastery coloring
- `assignment.png` — assignment detail three-column view

### 4.4 Acceptance test

A judge who has never seen the project reads the README. Within 30 seconds they understand: what it is, what's novel about it, and how to try it. The "Try the Live Demo" link works immediately.

---

## 5. ACCESSIBILITY PASS

### 5.1 Why this matters

Competition judges increasingly check for accessibility. It's also the right thing to do — students with disabilities deserve to learn too. An accessibility pass takes 1-2 days and demonstrates engineering maturity.

### 5.2 Implementation checklist

**Keyboard navigation:**
- [ ] Every interactive element is reachable via Tab key
- [ ] Focus order follows visual reading order
- [ ] Focus is visible (custom focus ring matching the design system):
  ```css
  :focus-visible {
    outline: 2px solid var(--cyan);
    outline-offset: 2px;
    border-radius: 4px;
  }
  ```
- [ ] Escape closes modals, overlays, expanded panels
- [ ] Enter/Space activate buttons and toggle cards
- [ ] Arrow keys navigate within the timeline (left/right), concept map (arrow movement), and quiz options (up/down)
- [ ] Focus is trapped inside modals when open
- [ ] Focus returns to trigger element when modal closes

**ARIA labels:**
- [ ] Every icon-only button has `aria-label`
- [ ] Progress bars have `role="progressbar"` + `aria-valuenow` + `aria-valuemin` + `aria-valuemax`
- [ ] Phase navigation has `role="tablist"` + `role="tab"` + `aria-selected`
- [ ] Concept map nodes have `role="button"` + `aria-label="[concept name], mastery [X]%"`
- [ ] Timeline events have `aria-label="[type]: [title], due [date]"`
- [ ] Gated assignments have `aria-label="Locked: complete Neural Forge for [concepts] first"`
- [ ] Quiz options have `role="radiogroup"` + `role="radio"`
- [ ] Results have `role="alert"` for screen reader announcement

**Color contrast:**
- [ ] All text meets WCAG AA minimum contrast ratio (4.5:1 for normal text, 3:1 for large text)
- [ ] Verify against the dark background:
  - `--text-primary` (#e0e0ff) on `--bg-void` (#020208) → contrast ratio ~15:1 ✓
  - `--text-secondary` (#b0b0d0) on `--bg-card` (#06060f) → check ratio ≥ 4.5
  - `--text-muted` (#6a6a9a) on dark → this is decorative, not essential info
- [ ] Mastery colors on concept map are distinguishable to colorblind users (add pattern or icon in addition to color)
- [ ] Error states use icon + text, not color alone

**Screen reader testing:**
- [ ] Test with VoiceOver (Mac) or NVDA (Windows) for:
  - Navigation through the app
  - Quiz completion flow
  - Results announcement
  - Concept map exploration
  - Timeline navigation

**Reduce motion:**
- [ ] All animations respect `prefers-reduced-motion: reduce`
- [ ] Spring physics falls back to instant state changes
- [ ] Ambient breath effect is disabled
- [ ] Page transitions are instant (no fade/slide)

### 5.3 Acceptance test

Navigate the entire app using only keyboard (no mouse). Complete a Neural Forge quiz. Navigate the concept map. Open an assignment. Start a review session. Every action must be possible without a mouse.

---

## 6. PERFORMANCE BENCHMARKS

### 6.1 Why this matters

No other competition entry will show cold, hard performance numbers. If you can display them, you project engineering confidence that judges reward.

### 6.2 Implementation

Add a small performance measurement utility that runs during content processing and stores results:

```typescript
// packages/content-engine/src/benchmark.ts
interface BenchmarkResult {
  operation: string;
  inputSize: string;
  durationMs: number;
  outputSize: string;
  timestamp: number;
}

class Benchmark {
  private results: BenchmarkResult[] = [];
  
  time<T>(operation: string, inputSize: string, fn: () => T): T {
    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;
    
    this.results.push({
      operation,
      inputSize,
      durationMs: Math.round(duration * 100) / 100,
      outputSize: '',
      timestamp: Date.now(),
    });
    
    return result;
  }
  
  async timeAsync<T>(operation: string, inputSize: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    
    this.results.push({
      operation,
      inputSize,
      durationMs: Math.round(duration * 100) / 100,
      outputSize: '',
      timestamp: Date.now(),
    });
    
    return result;
  }
  
  getResults(): BenchmarkResult[] {
    return [...this.results];
  }
}
```

Display benchmarks in a hidden Settings → Performance panel:

```
┌─────────────────────────────────────────────────────────────────┐
│  PERFORMANCE BENCHMARKS                                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Content Engine                                                 │
│  ├─ Text normalization ............ 12ms (21K words)            │
│  ├─ Block segmentation ............ 8ms (142 blocks)            │
│  ├─ Concept extraction ............ 45ms (14 concepts)          │
│  ├─ Relationship mapping .......... 6ms (18 edges)              │
│  ├─ Question generation ........... 89ms (47 questions)         │
│  └─ Full pipeline ................. 168ms total                 │
│                                                                 │
│  PDF Extraction                                                 │
│  └─ 342 pages ..................... 7,842ms                      │
│                                                                 │
│  Submission Engine                                              │
│  ├─ Grammar check (30 rules) ...... 34ms                        │
│  ├─ APA check (14 rules) .......... 12ms                        │
│  ├─ Spelling (50K dict) ........... 67ms                        │
│  ├─ Readability ................... 8ms                          │
│  ├─ Structure ..................... 11ms                         │
│  └─ Full grading pipeline ......... 156ms total                 │
│                                                                 │
│  Rendering                                                      │
│  ├─ Concept map (12 nodes) ........ 16ms first paint            │
│  ├─ Timeline (47 events) .......... 22ms first paint            │
│  └─ Force layout (200 iterations) . 89ms                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.3 Include benchmark numbers in README

Take the benchmark results from running against the demo fixture and paste them into the README's "Performance" section. Real numbers from real runs.

### 6.4 Acceptance test

Open the performance panel in settings. Verify that benchmark numbers appear for every pipeline stage. Numbers should be plausible (not zero, not suspiciously round).

---

## 7. EXPORT & SHARE FEATURES

### 7.1 Why this matters

A student finishes their Neural Forge session and wants to share their concept map or quiz deck with a classmate. Sharing turns one user into two users. It also demonstrates the app produces value worth sharing.

### 7.2 Implementation

**7.2.1 Concept Map → PNG export**

```typescript
async function exportConceptMapAsPNG(svgElement: SVGSVGElement): Promise<void> {
  const svgData = new XMLSerializer().serializeToString(svgElement);
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = svgElement.viewBox.baseVal.width * 2; // 2x for retina
    canvas.height = svgElement.viewBox.baseVal.height * 2;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(2, 2);
    
    // Dark background
    ctx.fillStyle = '#020208';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.drawImage(img, 0, 0);
    
    canvas.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `aeonthra-concept-map-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    }, 'image/png');
    
    URL.revokeObjectURL(url);
  };
  img.src = url;
}
```

Button on the Concept Map view: `[ 📷 EXPORT AS PNG ]`

**7.2.2 Quiz Deck → Shareable JSON**

```typescript
function exportQuizDeck(bundle: ForgeBundle): void {
  const deck = {
    version: '1.0',
    title: bundle.title,
    generatedAt: bundle.generatedAt,
    concepts: bundle.concepts.map(c => ({
      name: c.name,
      core: c.core,
      mnemonic: c.mnemonic,
    })),
    rapidFire: bundle.rapidFire,
    deepDrill: bundle.deepDrill,
    bossFight: bundle.bossFight,
  };
  
  const json = JSON.stringify(deck, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `aeonthra-quiz-deck-${bundle.title.replace(/\s+/g, '-').toLowerCase()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}
```

On the Forge chapter selection screen, each chapter card has a `[ ↗ SHARE QUIZ DECK ]` button.

**7.2.3 Import shared quiz deck**

On the import screen, add a section below the textbook upload:

```
─── or import a shared quiz deck ───

[ DROP QUIZ DECK JSON ]
```

This reads the exported JSON and adds it as a ForgeBundle to IndexedDB. A classmate exports, sends the file, the student imports and has the same quiz deck.

**7.2.4 Study summary → Markdown export**

After completing a Neural Forge session, the results dashboard has a `[ 📋 EXPORT SUMMARY ]` button that generates a markdown file:

```markdown
# AEONTHRA Study Summary
## Utilitarianism — April 10, 2026

### Score: 87% (A)
### Time: 52 minutes
### Calibration: 78% accurate

### Concepts Mastered (≥80%)
- Utilitarianism (92%)
- Felicific Calculus (85%)
- Act vs Rule Utilitarianism (80%)

### Concepts to Review (<60%)
- Experience Machine (45%)
- Minority Harm Objection (38%)

### Error Pattern
- 2× confused similar concepts
- 1× never learned this

### Key Takeaways
(Generated from the strongest-scored concepts' core definitions)
```

### 7.3 Acceptance test

Complete a Neural Forge session. Click Export Summary — verify a clean markdown file downloads. Click Export as PNG on concept map — verify a dark-background PNG with readable nodes downloads. Click Share Quiz Deck on a chapter — verify JSON downloads. Import that JSON on a fresh browser profile — verify the quiz deck loads and is playable.

---

## 8. TEXT-TO-SPEECH LAYER

### 8.1 Why this matters

Some students are auditory learners. Some have reading disabilities. Some are commuting and can't look at a screen. The Web Speech API is free, built into every browser, and deterministic — no API calls needed. Adding voice to concept definitions, quiz questions, and Shadow Reader passages is an accessibility win and a feature differentiator simultaneously.

### 8.2 Implementation

```typescript
// packages/audio/src/tts.ts
class TextToSpeech {
  private synth: SpeechSynthesis;
  private voice: SpeechSynthesisVoice | null = null;
  private rate: number = 0.9;
  private enabled: boolean = true;
  
  constructor() {
    this.synth = window.speechSynthesis;
    this.selectBestVoice();
  }
  
  private selectBestVoice() {
    const loadVoices = () => {
      const voices = this.synth.getVoices();
      // Prefer high-quality English voices
      this.voice =
        voices.find(v => v.name.includes('Google') && v.lang.startsWith('en')) ||
        voices.find(v => v.name.includes('Samantha') && v.lang.startsWith('en')) ||
        voices.find(v => v.lang.startsWith('en-US')) ||
        voices.find(v => v.lang.startsWith('en')) ||
        voices[0] || null;
    };
    
    loadVoices();
    this.synth.addEventListener('voiceschanged', loadVoices);
  }
  
  speak(text: string): Promise<void> {
    if (!this.enabled || !text) return Promise.resolve();
    
    return new Promise((resolve, reject) => {
      // Cancel any ongoing speech
      this.synth.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = this.voice;
      utterance.rate = this.rate;
      utterance.pitch = 1.0;
      utterance.volume = 0.8;
      
      utterance.onend = () => resolve();
      utterance.onerror = (e) => reject(e);
      
      this.synth.speak(utterance);
    });
  }
  
  stop() {
    this.synth.cancel();
  }
  
  setRate(rate: number) {
    this.rate = Math.max(0.5, Math.min(2.0, rate));
  }
  
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) this.stop();
  }
}

export const tts = new TextToSpeech();
```

### 8.3 Where TTS appears in the UI

**Concept cards:** Small speaker icon next to the concept name. Click it → reads the `core` definition aloud.

```tsx
function ConceptCard({ concept }: { concept: Concept }) {
  return (
    <div className="concept-card">
      <div className="concept-card__header">
        <h3>{concept.name}</h3>
        <button
          className="btn-icon"
          aria-label={`Read definition of ${concept.name}`}
          onClick={(e) => {
            e.stopPropagation();
            tts.speak(concept.core);
          }}
        >
          🔊
        </button>
      </div>
      {/* ... */}
    </div>
  );
}
```

**Quiz questions:** Speaker icon on the question card. Reads the question + all 4 options aloud.

**Shadow Reader passages:** When a drifting passage is hovered, it auto-reads aloud at low volume (configurable).

**Daily Review:** When reviewing a concept, option to auto-read the definition after revealing it.

### 8.4 Settings integration

```
⚙ AUDIO
  
  Text-to-speech              [●─] ON
  Speech rate                 [───●──] 0.9×
  Auto-read quiz questions    [─●] OFF
  Auto-read shadow passages   [─●] OFF
  Voice preview:              [ ▶ TEST ]
```

### 8.5 Acceptance test

Enable TTS in settings. Open a concept card. Click the speaker icon. The definition reads aloud in a clear voice. Speed matches the rate setting. Clicking again during playback stops it. Works on Chrome, Edge, and Safari.

---

## 9. EXECUTION ORDER

All eight features in this document are independent and can be parallelized. However, for maximum impact:

1. **Demo Mode** — build first, it's the most important
2. **README** — write second, needs demo screenshots
3. **PDF Ingestion** — build third, enables better demo data
4. **Spaced Repetition** — build fourth, adds daily return value
5. **Accessibility** — run fifth, it's an audit + fix pass
6. **Performance Benchmarks** — capture sixth, needs all engines running
7. **Export / Share** — build seventh, adds virality
8. **Text-to-Speech** — build last, it's the cherry on top

---

## 10. THE WINNING SUBMISSION CHECKLIST

Before submitting to the competition, verify every item:

### Demo
- [ ] "Experience the Demo" loads a full course in <2 seconds
- [ ] Demo data includes realistic concepts, questions, and progress
- [ ] Demo banner is visible in all views
- [ ] Guided tour tooltip (if implemented) walks through 5 key features
- [ ] Judge can try Neural Forge, explore timeline, and see concept map without importing anything

### README
- [ ] README tells a story in 30 seconds
- [ ] "Try the Live Demo" link is the first call-to-action
- [ ] Screenshots show the actual app with real data
- [ ] Architecture diagram is clean and communicative
- [ ] Performance numbers are included
- [ ] Tech stack is listed
- [ ] Install instructions work on first try

### PDF
- [ ] Drag-and-drop PDF onto upload zone works
- [ ] Page-by-page extraction shows progress
- [ ] Chapter detection identifies boundaries correctly
- [ ] Chapter picker lets student select specific chapters
- [ ] Processing runs in Web Worker without freezing UI

### Spaced Repetition
- [ ] SM-2 algorithm produces correct intervals
- [ ] Daily Review widget appears when concepts are due
- [ ] Memory Health stats show on dashboard
- [ ] Review completion updates SRS state
- [ ] Streak tracking works

### Accessibility
- [ ] Full keyboard navigation works
- [ ] ARIA labels on all interactive elements
- [ ] Color contrast meets WCAG AA
- [ ] Screen reader can navigate the app
- [ ] Reduce motion preference is respected

### Performance
- [ ] Benchmark numbers display in settings
- [ ] Numbers are real (from actual pipeline runs)
- [ ] README includes performance section

### Export / Share
- [ ] Concept map exports as PNG with dark background
- [ ] Quiz deck exports as JSON
- [ ] Imported quiz deck plays in Neural Forge
- [ ] Study summary exports as Markdown

### Audio
- [ ] TTS reads concept definitions
- [ ] TTS reads quiz questions
- [ ] Speed setting works
- [ ] Enable/disable works
- [ ] Works in Chrome and Edge

---

## 11. THE JUDGE'S EXPERIENCE (WHAT WINS)

Here's exactly what should happen when a competition judge evaluates AEONTHRA:

**Second 0-5:** They open the GitHub repo. The README has a beautiful hero screenshot and a clear tagline. They click "Try the Live Demo."

**Second 5-10:** The app loads instantly. Dark cyberpunk aesthetic. "IMPORT. FORGE. MASTER." They click "Experience the Demo."

**Second 10-20:** A full philosophy course populates. Dashboard shows timeline with events, concept map with colored nodes, gated assignments, daily review widget. They think: "This looks like a real product, not a hackathon project."

**Second 20-40:** They click Concept Map. 12 nodes glow with different mastery colors. They click a gold node (mastered). Detail panel shows definition, mnemonic, practice history. Related nodes brighten. They think: "This actually works."

**Second 40-60:** They click Neural Forge. Start a quiz. Real questions appear with real options. They answer 3 questions. Results show scoring. They think: "This isn't a mockup — the content engine actually generates coherent questions."

**Second 60-90:** They click an assignment. See the three-column layout. See the gating. See "PREPARE FIRST" with specific concept requirements. They click "PREPARE IN NEURAL FORGE." It takes them to the relevant chapter. They think: "The whole system is integrated."

**Second 90-120:** They go back to the README. They see the architecture diagram. They see "Zero AI API calls." They see the performance numbers. They see "9 novel interactions." They scroll through the feature table.

**They close the tab and write in their scoring notes:** *"Most complete and polished submission. Real deterministic engine producing coherent output. Beautiful design. Works without any setup. Novel interaction modes I haven't seen elsewhere. Clear vision for student-first learning."*

**That's how you win.**

Every feature in this document exists to engineer that 2-minute evaluation into a maximum-score experience. Not one feature is wasted. Not one is gratuitous. Every one serves the judge's journey from "what is this?" to "this is the winner."

Build all eight. Ship it. Win.
