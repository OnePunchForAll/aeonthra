# AEONTHRA SPEC — CORRECTIVE ADDENDUM

**Codex: you built the wrong thing. Read this entire document before touching code. This overrides any conflicting interpretation of the original spec.**

---

## 0. WHAT YOU GOT WRONG

Looking at what you produced:

- ❌ **Cream/beige background.** Wrong. The background must be near-black deep space.
- ❌ **Orange utility buttons on light cards.** Wrong. Buttons must be cyan gradient glow on dark surfaces.
- ❌ **Serif heading font.** Wrong. Headings must be Orbitron — a futuristic display typeface.
- ❌ **Flat white cards with no atmosphere.** Wrong. Cards must be dark (#06060f) with subtle borders and glow on hover.
- ❌ **No motion, no glow, no depth.** Wrong. The entire interface must feel like a premium sci-fi learning instrument.
- ❌ **Phase cards are flat gray boxes.** Wrong. Each phase has its own neon color and must visibly pulse/glow when active.
- ❌ **"Static study chamber for deterministic understanding" dead-serif headline.** Wrong. The marketing voice should be confident, futuristic, and brief.
- ❌ **No timeline visible. No concept map. No motion.** These are the signature views and they're missing.

**The aesthetic target is: dark cyberpunk learning terminal. Not: 1990s software manual.**

---

## 1. EXACT VISUAL TARGETS (NON-NEGOTIABLE)

### 1.1 The ONE correct background

```css
body {
  background: #020208;
  /* Optional subtle atmosphere: */
  background-image: radial-gradient(ellipse at top, #0a0a1a 0%, #020208 60%);
  color: #e0e0ff;
  font-family: 'Sora', sans-serif;
  min-height: 100vh;
}
```

**If the background is anything lighter than `#0a0a1a`, you did it wrong.** No cream. No tan. No beige. No white. No light gray. No "paper" textures. This is a dark product, always.

### 1.2 Fonts — load these three exact fonts, use them exactly

```html
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=JetBrains+Mono:wght@400;700&family=Sora:wght@300;400;600;700;800&display=swap" rel="stylesheet">
```

```css
:root {
  --font-display: 'Orbitron', sans-serif;     /* H1, H2, phase labels, hero text */
  --font-body: 'Sora', sans-serif;             /* Body copy, paragraphs, UI labels */
  --font-mono: 'JetBrains Mono', monospace;    /* Timers, numbers, code, progress readouts */
}
```

- All hero headings, section titles, phase labels, and the AEONTHRA wordmark use **Orbitron** with letter-spacing `0.08em` to `0.12em`.
- All body text uses **Sora**.
- All numbers (timers, counters, progress percentages, durations) use **JetBrains Mono**.
- **Never use a serif font anywhere.** No Georgia. No Merriweather. No Playfair. No Times. No "editorial" fonts.

### 1.3 Correct color tokens — use these exact values

```css
:root {
  /* Atmosphere */
  --bg-void: #020208;
  --bg-deep: #04040c;
  --bg-card: #06060f;
  --bg-card-raised: #0a0a1a;
  --bg-card-active: #0d0d20;

  /* Borders */
  --border: #1a1a3a;
  --border-subtle: #0f0f20;
  --border-glow: rgba(0, 240, 255, 0.2);

  /* Text */
  --text-primary: #e0e0ff;
  --text-secondary: #b0b0d0;
  --text-muted: #6a6a9a;
  --text-dim: #3a3a5a;

  /* Signature neon accents */
  --cyan: #00f0ff;     /* primary / data / Forge phase */
  --teal: #06d6a0;     /* Genesis phase / growth / success glow */
  --green: #00ff88;    /* Mastery / done / correct */
  --gold: #ffd700;     /* Transcend phase / achievement / highlights */
  --orange: #ff6b2b;   /* Crucible phase / warning / urgency */
  --red: #ff4466;      /* Error / overdue / wrong */
  --purple: #a855f7;   /* Architect phase / synthesis */
  --pink: #ff2bbb;     /* Rare / special events */
}
```

**These are the only colors. No pastel lavender. No beige. No tan. No warm cream. No neutral grays. The palette is dark navy-black + bright neon accents. Period.**

### 1.4 Correct card styling

```css
.card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 1.25rem;
  transition: all 400ms cubic-bezier(0.22, 1, 0.36, 1);
}

.card:hover {
  border-color: var(--border-glow);
  box-shadow: 0 0 30px rgba(0, 240, 255, 0.08);
  transform: translateY(-2px);
}

.card--accent-cyan { border-color: rgba(0, 240, 255, 0.2); }
.card--accent-teal { border-color: rgba(6, 214, 160, 0.2); }
.card--accent-orange { border-color: rgba(255, 107, 43, 0.2); }
.card--accent-purple { border-color: rgba(168, 85, 247, 0.2); }
.card--accent-gold { border-color: rgba(255, 215, 0, 0.2); }
```

### 1.5 Correct button styling

```css
.btn-primary {
  background: linear-gradient(135deg, #00f0ff, #0080ff);
  color: #000;
  border: none;
  border-radius: 10px;
  padding: 0.75rem 2rem;
  font-family: 'Sora', sans-serif;
  font-weight: 800;
  font-size: 0.85rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  cursor: pointer;
  box-shadow: 0 0 20px rgba(0, 240, 255, 0.15);
  transition: all 300ms cubic-bezier(0.22, 1, 0.36, 1);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 0 30px rgba(0, 240, 255, 0.3);
}

.btn-ghost {
  background: #0a0a1a;
  border: 1px solid #1a1a3a;
  color: #6a6a9a;
  /* rest same as primary sizing */
}

.btn-gold {
  background: linear-gradient(135deg, #ffd700, #ff8800);
  color: #000;
}

.btn-teal {
  background: linear-gradient(135deg, #06d6a0, #00b894);
  color: #000;
}
```

**No flat orange pill buttons on white backgrounds. Buttons always have gradients, glow shadows, and live on dark surfaces.**

### 1.6 Hero/Wordmark styling

The AEONTHRA wordmark and main hero text:

```css
.wordmark {
  font-family: 'Orbitron', sans-serif;
  font-weight: 900;
  font-size: 2.2rem;
  color: #00f0ff;
  text-shadow: 0 0 20px rgba(0, 240, 255, 0.5);
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.hero-headline {
  font-family: 'Orbitron', sans-serif;
  font-weight: 700;
  font-size: 2.5rem;
  color: #e0e0ff;
  line-height: 1.1;
  letter-spacing: 0.04em;
}

.hero-subtitle {
  font-family: 'Sora', sans-serif;
  font-weight: 400;
  font-size: 0.9rem;
  color: #6a6a9a;
  letter-spacing: 0.02em;
  max-width: 560px;
  line-height: 1.6;
}
```

### 1.7 Phase cards — each phase has its identity

The 5 Neural Forge phase cards at the top of the Forge view are NOT generic gray boxes. Each is themed with its signature color:

```
PHASE 1: GENESIS     →  icon 🌊   color #06d6a0 (teal)    "Know before you know"
PHASE 2: FORGE       →  icon ⚡   color #00f0ff (cyan)    "Test under fire"
PHASE 3: CRUCIBLE    →  icon 🔥   color #ff6b2b (orange)  "Break false confidence"
PHASE 4: ARCHITECT   →  icon 🏗️   color #a855f7 (purple)  "Build from nothing"
PHASE 5: TRANSCEND   →  icon 🏆   color #ffd700 (gold)    "Prove mastery"
```

Each phase card:

```css
.phase-card {
  background: #06060f;
  border: 1px solid #1a1a3a;
  border-radius: 11px;
  padding: 0.9rem 0.6rem;
  text-align: center;
  transition: all 400ms;
}

.phase-card[data-state="active"] {
  border-color: var(--phase-color);
  box-shadow: 0 0 25px var(--phase-color-glow);
}

.phase-card[data-state="complete"] {
  border-color: #00ff8844;
}

.phase-card__icon {
  font-size: 1.4rem;
}

.phase-card__label {
  font-family: 'Orbitron', sans-serif;
  font-size: 0.6rem;
  font-weight: 700;
  color: var(--phase-color);
  letter-spacing: 0.08em;
  margin-top: 4px;
}

.phase-card__duration {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.5rem;
  color: #3a3a5a;
  margin-top: 2px;
}
```

When the active phase is CRUCIBLE, the CRUCIBLE card glows orange. When GENESIS, teal. When ARCHITECT, purple. The inactive phases are dim. This is how the student knows where they are.

### 1.8 The hero headline must be right

**Wrong:** "Static study chamber for deterministic understanding."
**Wrong:** Serif font.
**Wrong:** Left-aligned dead academic tone.

**Correct headline options (pick one, Orbitron, glowing cyan):**

```
NEURAL FORGE
→ subtitle: "100-minute deterministic mastery protocol"

or

FORGE YOUR MIND
→ subtitle: "Turn captured coursework into real understanding"

or (for the import screen)

IMPORT. FORGE. MASTER.
→ subtitle: "Your course. Your textbook. Your learning instrument."
```

The voice is confident, brief, futuristic. Not academic. Not corporate. Not verbose.

### 1.9 Motion — the interface must breathe

Every entrance animation:

```css
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.fade-in {
  animation: fadeIn 400ms cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes pulseGlow {
  0%, 100% { box-shadow: 0 0 20px var(--glow-color); }
  50% { box-shadow: 0 0 35px var(--glow-color); }
}

.active-phase {
  animation: pulseGlow 2.5s ease-in-out infinite;
}

@keyframes orbit {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.loader {
  width: 24px;
  height: 24px;
  border: 2px solid #00f0ff33;
  border-top-color: #00f0ff;
  border-radius: 50%;
  animation: orbit 1s linear infinite;
}
```

- All page/view transitions: 400ms fade + slight Y translate
- Active phase indicator: slow pulsing glow
- Loading states: orbital spinner, NOT a plain bar
- Timeline scrolls with momentum and snap points
- Concept map nodes pulse gently (2.5s cycle) when recently practiced
- Hover states: subtle lift + glow intensification, NEVER flat color change
- Respect `prefers-reduced-motion: reduce` — fall back to instant state changes

### 1.10 Layout of the import/home screen — REBUILD THIS

**Wrong layout you produced:** giant left sidebar with serif hero text + cramped right column of utility cards + warm cream backgrounds.

**Correct layout:**

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│                                                                  │
│                         AEONTHRA                                 │  ← wordmark, cyan glow, Orbitron 900
│                    ═══════════════════                           │
│                                                                  │
│              Import. Forge. Master.                              │  ← hero headline, Orbitron 700
│                                                                  │
│         Turn captured coursework into real understanding.        │  ← subtitle, Sora 400, muted
│                                                                  │
│                                                                  │
│     ┌──────────────────────────┐    ┌───────────────────────┐    │
│     │                          │    │                       │    │
│     │   📥  IMPORT CAPTURE     │    │   📖  UPLOAD TEXTBOOK │    │
│     │                          │    │                       │    │
│     │   Drop a JSON bundle     │    │   Paste or drop any   │    │
│     │   from the extension     │    │   textbook text file  │    │
│     │                          │    │                       │    │
│     │   [ CHOOSE FILE ]        │    │   [ UPLOAD ]          │    │
│     │                          │    │                       │    │
│     └──────────────────────────┘    └───────────────────────┘    │
│                                                                  │
│                                                                  │
│              ─────────  or start fresh  ─────────                │
│                                                                  │
│              [ ⚡  OPEN NEURAL FORGE DEMO ]                     │
│                                                                  │
│                                                                  │
│                                                                  │
│   Local-first · Zero API · Works offline · GitHub Pages ready   │  ← small footer pill
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Everything centered. Two parallel cards side-by-side for the two input modes. Dark everywhere. Subtle glow on the cards. Cyan wordmark pulsing gently.**

### 1.11 Loaded workspace screen — REBUILD THIS TOO

After import, the screen should feel like a mission control center. Layout:

```
┌─ TOP BAR ─────────────────────────────────────────────────────────┐
│  AEONTHRA  │  5 phase dots  │  course title  │  timer  │  menu   │
├───────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌─ CAPTURE SUMMARY ─────────────┐  ┌─ QUICK STATS ─────────┐     │
│  │  📥 LEARNING FREEDOM CAPTURE  │  │  Top concept          │     │
│  │                               │  │  PERSONNEL & POLICIES │     │
│  │  Captured: Apr 9 2026         │  │                       │     │
│  │  Source: canvas.example.edu   │  │  Guided moves: 20     │     │
│  │  Concepts extracted: 17       │  │  Forge time: 60 min   │     │
│  └───────────────────────────────┘  └───────────────────────┘     │
│                                                                    │
│  ┌─ CHOOSE YOUR PATH ────────────────────────────────────────┐    │
│  │                                                           │    │
│  │   [ 📊 WORKSPACE ]         [ ⚡ NEURAL FORGE ]            │    │
│  │   Structured study         Immersive 60-min run          │    │
│  │                                                           │    │
│  └───────────────────────────────────────────────────────────┘    │
│                                                                    │
│  ┌─ SOURCE TRAIL ────────────────────────────────────────────┐    │
│  │  → /courses/COURSE_ID/modules                             │    │
│  │  → /courses/COURSE_ID/quizzes/QUIZ_ID                     │    │
│  │  → /courses/COURSE_ID/pages/module-2                      │    │
│  └───────────────────────────────────────────────────────────┘    │
│                                                                    │
└───────────────────────────────────────────────────────────────────┘
```

All cards dark (`#06060f`), all borders subtle (`#1a1a3a`), all labels small caps with accent colors, all numbers in JetBrains Mono.

---

## 2. WHAT "LOOK LIKE NEURAL FORGE" MEANS IN ONE PARAGRAPH

The interface looks like the command deck of a spacecraft. Near-black background. Thin dark-navy borders. Cyan and teal neon accents that glow softly. Orbitron display font for headlines that feels like a sci-fi HUD. JetBrains Mono for all numbers. Every interactive element has a subtle glow on hover. Every transition is smooth and 400ms. Cards feel like they're floating in dark space. Phase indicators pulse with color. Timers tick in monospace. The overall vibe is: a calm, premium learning terminal a future student would use. **If your output looks like a light-mode dashboard, you did it wrong.**

---

## 3. THE ENGINE — WHY YOURS IS WEAK AND HOW TO MAKE IT REAL

Your extraction is surfacing things like "Personnel, Processes, & Policies" and other section-header noise instead of actual learnable concepts. That's because you're probably doing naive frequency counting on raw Canvas HTML. Here's how to make it world-class.

### 3.1 The core principle: a concept is a claim, not a phrase

A concept is NOT just "a word that appears often." A concept is a claim the source actually makes about something. To extract concepts, you must detect the **claim structure** in the text, not just noun phrases.

### 3.2 The full 8-stage extraction pipeline

Replace whatever you built with this exact pipeline.

#### Stage 1: Canvas Chrome Stripping (MANDATORY FIRST PASS)

Before any content processing, strip out all LMS navigation noise. These are never concepts:

```typescript
const CANVAS_CHROME_BLOCKLIST = new Set([
  'module', 'modules', 'item', 'items', 'assignment', 'assignments',
  'discussion', 'discussions', 'quiz', 'quizzes', 'page', 'pages',
  'score', 'scores', 'grade', 'grades', 'points', 'points possible',
  'due date', 'no due date', 'mark done', 'mark as done', 'complete',
  'completed', 'incomplete', 'to do', 'syllabus', 'home', 'announcements',
  'files', 'people', 'conferences', 'collaborations', 'canvas',
  'instructure', 'inbox', 'dashboard', 'courses', 'calendar', 'help',
  'account', 'logout', 'login', 'submit', 'save', 'cancel', 'edit',
  'delete', 'download', 'upload', 'view', 'next', 'previous', 'back',
  'close', 'open', 'expand', 'collapse', 'show', 'hide', 'more', 'less',
  'least', 'most', 'first', 'last', 'will', 'would', 'should', 'could',
  'done', 'start', 'end', 'begin', 'finish',
  // Time/date chrome
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
  'january', 'february', 'march', 'april', 'may', 'june', 'july',
  'august', 'september', 'october', 'november', 'december',
  // Academic chrome without content
  'week', 'weeks', 'day', 'days', 'hour', 'hours', 'minute', 'minutes',
  'section', 'chapter', 'unit', 'topic', 'lesson', 'lecture', 'reading',
]);
```

Additionally, strip:
- Navigation menus (`<nav>`, `[role="navigation"]`)
- Canvas sidebar (`#left-side`, `.ic-app-course-menu`)
- Canvas breadcrumbs (`.ic-app-crumbs`)
- Footer content
- Script/style tags entirely
- Anything matching `data-testid="(module|item|assignment)-(row|header|footer)"`

**If you're extracting anything from these regions, you're extracting chrome, not content. Fix the extraction scope before anything else.**

#### Stage 2: Content Block Segmentation

After chrome stripping, segment into **meaningful content blocks**. A content block is:
- A heading (`<h1>` through `<h6>`)
- A paragraph (`<p>` with at least 40 characters of real text)
- A list item (`<li>` with at least 20 characters)
- A definition list term + definition pair

For each block, capture:
```typescript
interface ContentBlock {
  type: 'heading' | 'paragraph' | 'list-item' | 'definition';
  level?: number; // for headings, 1-6
  text: string;
  wordCount: number;
  sentenceCount: number;
  position: number; // index in document order
  parentHeading: string | null; // the nearest heading ancestor
}
```

#### Stage 3: Block Quality Scoring

Score each block for learnability. Reject blocks that score low:

```typescript
function scoreBlock(block: ContentBlock): number {
  let score = 0;
  
  // Length sweet spot
  if (block.wordCount < 15) return 0; // too short, probably chrome
  if (block.wordCount > 300) score -= 5; // too long, probably dense reference
  if (block.wordCount >= 30 && block.wordCount <= 150) score += 10;
  
  // Sentence structure (real prose)
  if (block.sentenceCount >= 2) score += 5;
  if (block.sentenceCount >= 1 && endsWithPeriod(block.text)) score += 3;
  
  // Definition-like structure
  if (/\b(is|are|refers to|means|can be defined as|is defined as|describes|represents)\b/i.test(block.text)) score += 15;
  if (/\b(for example|such as|including|specifically)\b/i.test(block.text)) score += 5;
  
  // Conceptual language
  if (/\b(theory|principle|concept|idea|approach|framework|method|process)\b/i.test(block.text)) score += 8;
  
  // Reject chrome-like patterns
  if (/^(module|item|quiz|assignment|due|points?)\s/i.test(block.text)) return 0;
  if (/^(click|tap|select|choose|go to|return to)\s/i.test(block.text)) return 0;
  if (/\b(mark (as )?done|to do|complete this)\b/i.test(block.text)) return 0;
  if (/^[\d\s\W]*$/.test(block.text)) return 0; // pure punctuation/numbers
  
  // Reject navigation-like
  if (block.wordCount <= 5 && /^[A-Z][a-z]*(\s+[A-Z][a-z]*){0,3}$/.test(block.text)) return 0;
  
  return score;
}
```

Only blocks with `score >= 10` proceed to concept extraction.

#### Stage 4: Topic-Bearing Sentence Detection

Within each qualifying block, find the sentences that actually carry conceptual weight. These are sentences that:

1. **Contain an explicit definition** — match the regex:
   ```
   /([A-Z][a-zA-Z\s]{2,40}?)\s+(is|are|refers to|means|can be defined as|describes|represents)\s+([^.]+\.)/g
   ```
   The first capture group is the concept name candidate, the third is the definition.

2. **Contain a characteristic claim** — match:
   ```
   /([A-Z][a-zA-Z\s]{2,40}?)\s+(involves|includes|requires|consists of|focuses on|emphasizes)\s+([^.]+\.)/g
   ```

3. **Contain a contrastive claim** — match:
   ```
   /(unlike|in contrast to|whereas|while)\s+([^,]+),\s+([^.]+\.)/gi
   ```
   These surface contrast pairs for the concept map.

4. **Contain an example introduction** — match:
   ```
   /(for example|for instance|e\.g\.|such as),?\s+([^.]+\.)/gi
   ```
   These get attached to concepts as supporting evidence.

Extract these sentences with their block context.

#### Stage 5: Concept Candidate Generation

From the topic-bearing sentences, extract candidate concepts. A candidate is:

```typescript
interface ConceptCandidate {
  name: string;              // the phrase before "is/are/refers to"
  definition: string;        // the phrase after
  sourceBlockId: number;
  sourceSentence: string;
  extractionMethod: 'explicit-definition' | 'bold-term' | 'characteristic' | 'heading-topic';
  confidence: number;        // 0-1
  evidence: string[];        // supporting sentences
}
```

**Four extraction methods (run all, then merge):**

**Method A — Explicit Definitions (confidence 1.0):**
Sentences matching the definition regex. The captured concept name becomes the candidate.

**Method B — Bold/Emphasized Terms (confidence 0.9):**
Extract all text in `<strong>`, `<b>`, `<em>`, `<i>` from the original HTML. For each term, find the sentence containing it in the cleaned text. That sentence becomes the definition context.

**Method C — Heading-Derived Topics (confidence 0.7):**
Each heading becomes a candidate concept IF the first 1-2 sentences under it form a definition-like claim. The heading text is the concept name, the first sentences are the definition.

**Method D — Noun-Phrase Frequency (confidence 0.5):**
Extract noun phrases from the text using a simple POS heuristic:
- Sequences of capitalized words: `Personnel and Processes` (2-3 words max)
- Adjective + noun patterns: `moral relativism`, `categorical imperative`
- Technical terms (Greek/Latin roots, -ism, -ology, -ics endings)

Compute TF-IDF across blocks. Keep only phrases that:
- Appear in at least 2 different blocks
- Have TF-IDF above the median
- Are NOT in the chrome blocklist
- Have at least one definition-like sentence nearby in the same block

#### Stage 6: Concept Deduplication and Canonicalization

Merge candidates referring to the same concept:

1. **Exact match:** Case-insensitive name match → merge, keep highest confidence
2. **Stem match:** `utilitarian` and `utilitarianism` → merge, prefer longer form
3. **Alias detection:** `categorical imperative` and `Kant's categorical imperative` → merge, prefer shorter canonical form
4. **Subphrase absorption:** If `moral relativism` and `cultural moral relativism` both exist and one is a substring → merge, prefer the more specific if it appears ≥ 3 times, else prefer the shorter

After merging, rank concepts by:
```
finalScore = confidence × 100 
           + (evidenceCount × 10) 
           + (sourceBlockCount × 5)
           + (extractionMethod === 'explicit-definition' ? 30 : 0)
           + (hasBoldOrigin ? 20 : 0)
```

Take the top 12-18 concepts. If fewer than 8 pass quality threshold, the source is too noisy — return a clear "insufficient learnable content" state rather than inventing concepts.

#### Stage 7: Evidence Selection

For each final concept, select 1-3 **evidence snippets**. Each snippet must:

- Be a complete sentence (starts with capital, ends with period)
- Contain the concept name (or a stem variant)
- Be between 10 and 35 words
- Not be a duplicate of the concept's core definition
- Not contain unresolved pronouns at the start (`This`, `It`, `They`, `That`)

If no evidence sentence passes, the concept gets zero evidence — don't fabricate. The UI will show "Definition from source" without an extra evidence block.

#### Stage 8: Concept Summary Generation

For each concept, generate three readable fields:

**`core`** — the definition sentence, cleaned up:
- Strip leading filler (`Basically,`, `In essence,`, `As we'll see,`)
- Trim to max 2 sentences
- Ensure it ends with a period
- If the raw sentence is longer than 35 words, truncate at the nearest sentence boundary

**`detail`** — supporting context, max 3 sentences:
- The sentence immediately following the definition
- Plus any example sentence found in the same block
- Plus any elaboration sentence that restates the concept

**`primer`** — one sentence that primes the reader for quiz questions:
- Template: `"This relates to [subject noun from core] — how [verb phrase from core]."`
- Or if template produces awkward text: use the first 15 words of `core`
- Must be readable English, not a fragment

**`mnemonic`** — memory hook, via the template system in the original spec Section 4.3

**If any of these fields cannot be produced cleanly, leave them empty. The UI handles missing fields gracefully. Never fill with nonsense.**

### 3.3 Validation rules — reject bad output

Before saving a ForgeBundle, validate every concept against these rules. Reject any concept where:

```typescript
function isValidConcept(c: Concept): boolean {
  // Name checks
  if (c.name.length < 3) return false;
  if (c.name.length > 60) return false;
  if (CANVAS_CHROME_BLOCKLIST.has(c.name.toLowerCase())) return false;
  if (/^[\d\s\W]+$/.test(c.name)) return false; // pure punctuation/numbers
  if (/^(the|a|an|this|that|these|those)\s/i.test(c.name)) return false; // starts with article
  
  // Core checks
  if (!c.core || c.core.length < 20) return false;
  if (!/[.!?]$/.test(c.core)) return false; // must end with sentence punctuation
  if (c.core.split(' ').length < 5) return false; // too short to be a real claim
  
  // Word salad detection
  const words = c.core.toLowerCase().split(/\s+/);
  const uniqueRatio = new Set(words).size / words.length;
  if (uniqueRatio < 0.5) return false; // repetitive
  
  // Prose sanity
  if (c.core.split('.').length > 4) return false; // too many sentences = didn't cleanly segment
  
  return true;
}
```

**If fewer than 8 concepts pass validation, do not show the workspace. Show an honest error: "The captured content doesn't contain enough structured material to extract concepts. Try a different page or upload a textbook chapter instead."**

### 3.4 Question generation must also validate

Every generated question must pass these checks before being included:

```typescript
function isValidQuestion(q: MultipleChoice): boolean {
  // Basic shape
  if (!q.q || q.q.length < 10) return false;
  if (q.opts.length !== 4) return false;
  if (q.c < 0 || q.c > 3) return false;
  
  // All options must be distinct
  const uniqueOpts = new Set(q.opts.map(o => o.toLowerCase().trim()));
  if (uniqueOpts.size !== 4) return false;
  
  // All options must be plausible length
  if (q.opts.some(o => o.length < 3 || o.length > 200)) return false;
  
  // Question must be a real question (ends with ? or is a stem)
  if (!/[?:]$/.test(q.q) && !/^(which|what|how|why|when|where|who)/i.test(q.q)) return false;
  
  // Explanation must exist
  if (!q.why || q.why.length < 20) return false;
  
  return true;
}
```

Drop any question that fails. Better to have 8 good questions than 15 junk ones.

---

## 4. WHAT TO DO NOW — EXACT EXECUTION ORDER

Codex, execute these steps in order. Do not skip. Do not improvise. Do not "interpret."

### Step 1: Rip out the current UI entirely

Delete all existing stylesheets in `apps/web/src/styles/` and all component styling. Start fresh.

### Step 2: Install the design tokens

Create `apps/web/src/styles/tokens.css` with the EXACT color/font variables from Section 1.3 of this document. No substitutions, no "close enough" colors.

### Step 3: Install the global base

Create `apps/web/src/styles/global.css`:

```css
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=JetBrains+Mono:wght@400;700&family=Sora:wght@300;400;600;700;800&display=swap');

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body {
  background: #020208;
  color: #e0e0ff;
  font-family: 'Sora', sans-serif;
  font-size: 16px;
  line-height: 1.6;
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  background-image: radial-gradient(ellipse at top, #0a0a1a 0%, #020208 60%);
  background-attachment: fixed;
}

h1, h2, h3, h4, h5, h6 {
  font-family: 'Orbitron', sans-serif;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: #e0e0ff;
}

code, pre, .mono, time, .timer, .counter {
  font-family: 'JetBrains Mono', monospace;
}

button {
  font-family: inherit;
  cursor: pointer;
}

::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: #0a0a1a; }
::-webkit-scrollbar-thumb { background: #1a1a3a; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: #2a2a4a; }

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes pulseGlow {
  0%, 100% { box-shadow: 0 0 20px var(--glow, rgba(0, 240, 255, 0.2)); }
  50% { box-shadow: 0 0 35px var(--glow, rgba(0, 240, 255, 0.4)); }
}

@keyframes orbit {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Step 4: Rebuild the primitives

Rebuild `components/primitives/`:
- `Button.tsx` — with variants: primary, ghost, gold, teal, orange, purple
- `Card.tsx` — dark card with optional accent color
- `Glow.tsx` — Orbitron glowing text
- `Timer.tsx` — JetBrains Mono countdown
- `Loader.tsx` — orbital spinner
- `ProgressBar.tsx` — gradient fill
- `Tag.tsx` — small caps label with accent color

All of these must use the token colors, not hardcoded values.

### Step 5: Rebuild the Home/Import screen with the layout from Section 1.10

### Step 6: Rebuild the loaded-workspace screen with the layout from Section 1.11

### Step 7: Rebuild the Neural Forge view with the 5 phase cards themed per Section 1.7

### Step 8: Rip out the current extraction engine and rebuild using Section 3

### Step 9: Run the new engine against the "Learning Freedom capture" fixture

Verify the output. If it's still surfacing things like "Personnel, Processes, & Policies" as top concepts, the Canvas chrome stripping (Stage 1) isn't working. Fix that before moving on.

### Step 10: Show me actual screenshots and the top 10 extracted concepts

Don't ship until both match this spec.

---

## 5. ACCEPTANCE CRITERIA — I WILL CHECK ALL OF THESE

Before you declare this done, verify:

- [ ] Background is near-black (#020208) everywhere. No cream, no white, no tan.
- [ ] All headings use Orbitron. No serifs anywhere in the UI.
- [ ] All numbers use JetBrains Mono.
- [ ] All body text uses Sora.
- [ ] The wordmark "AEONTHRA" glows cyan on the home screen.
- [ ] Cards are dark (#06060f) with subtle borders.
- [ ] Buttons have gradient backgrounds and glow shadows.
- [ ] Hover states lift elements and intensify glows.
- [ ] Page transitions fade in over 400ms.
- [ ] The 5 phase cards each have their own signature color and icon.
- [ ] The active phase card pulses with its color.
- [ ] Timer counts in JetBrains Mono.
- [ ] Loading states show an orbital spinner.
- [ ] Concept extraction does NOT surface Canvas chrome (no "module", "item", "score", etc.).
- [ ] Top concepts from the Learning Freedom fixture look like actual study topics, not nav labels.
- [ ] Every concept has a readable definition that ends in a period.
- [ ] Every generated question has 4 distinct plausible options.
- [ ] The UI feels like a premium sci-fi learning terminal, not a tax prep site.

**If any of these fail, you're not done.**

---

## 6. THE TONE OF THE PRODUCT

The voice of the interface:
- Confident, brief, futuristic
- Never chatty, never academic, never verbose
- Uses uppercase labels for UI ("CHOOSE YOUR PATH", "SOURCE TRAIL", "ACTIVE PHASE")
- Mixes small caps labels (Sora 700, letter-spacing .1em, color muted) with bright Orbitron headlines
- Numbers and timers feel like a HUD
- Success moments are celebratory but quick (brief gold flash, not a trophy screen)

**Do not write marketing fluff. Do not write tutorial prose. Do not pad with explanations. The interface speaks with tight, high-confidence language. Every word earns its place.**

---

## 7. FINAL WARNING

If your next output still looks like a beige tax site with serif headlines and flat cards, it means you did not read this document. Read it again before writing code.

The aesthetic target, one more time:

**Dark cyberpunk learning terminal. Near-black background. Cyan and teal neon accents. Orbitron display font. JetBrains Mono numbers. Subtle glow everywhere. Premium, calm, futuristic. Not light. Not warm. Not academic. Not corporate.**

Now go fix it.
