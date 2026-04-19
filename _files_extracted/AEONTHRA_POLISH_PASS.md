# AEONTHRA POLISH PASS — Stability & Quality Fixes

**Codex: read this document first. Execute all fixes below before starting the novel interactions pass. The foundation is mostly correct but several engine bugs are producing garbage content that would propagate into the nine new interactions and ruin them.**

**This pass does not add new features. It fixes what exists so the next pass has a clean foundation to build on. Every fix is backed by a specific bug visible in the current build.**

---

## 0. WHAT'S WORKING (DON'T BREAK THESE)

Before touching anything, understand what's already right so you don't regress it:

- ✅ **Import screen is excellent.** "IMPORT. FORGE. MASTER." hero, two-card layout, Neural Forge Demo entry, footer pill. Do not touch this view.
- ✅ **Dark atmosphere is correct.** Background, wordmark glow, nav pills, timer in mono — all matching the design system.
- ✅ **Phase cards are themed correctly.** Genesis teal, Forge cyan, Crucible orange, Architect purple, Transcend gold.
- ✅ **Three-column Assignment Detail layout works.** Breakdown + Submission Workspace + Textbook Bridge render correctly.
- ✅ **Progress Gating Engine is working.** Assignments show "PREPARE FIRST" with specific concept requirements and a "PREPARE IN NEURAL FORGE" button. Practice Mode toggle unlocks everything.
- ✅ **Link Resolution Engine is working.** Source Trail shows `STRONGLY-RELATED` badges with concept matches tagged by match type (`content`, `keyword`). This is the Breath prompt's Engine 6 executed correctly.
- ✅ **Mission Control dashboard layout is correct.** Capture Summary, Mission Control stats, Timeline, Active Work zones.
- ✅ **Navigation pills work.** Dashboard, Timeline, Concept Map, Forge, Assignment all route correctly.
- ✅ **Mastery IS tracked under the hood.** The "Navigating Online Environment 32%" shows it's computing — the UI just isn't displaying it consistently everywhere.

Keep all of the above. The fixes below are specific bugs in specific places.

---

## 1. CRITICAL ENGINE BUGS (FIX THESE FIRST)

These are producing garbage content that makes the app feel broken even though the structure is right.

### BUG 1: Word-Salad Quiz Questions

**What I see:** The Rapid Fire question reads:

> *"Navigating Online Environment is best understood like this: Module 5 - Time Blocking and Prioritization Time Blocking and Prioritization Now that you have a clear understanding of the specific ways you use time and have reflected on your future schedule, we will learn methods..."*

**What's wrong:** Three failures compounding:
1. A question about Concept A ("Navigating Online Environment") is being filled with the definition of Concept B ("Time Blocking and Prioritization"). The content-matching between question stem and concept body is broken.
2. The content is un-deduplicated. "Time Blocking and Prioritization Time Blocking and Prioritization" is the module header + concept name concatenated with no deduplication.
3. The question stem template `"{concept} is best understood like this: {definition}"` is a lazy fallback that produces nonsense when the definition is a module chunk.

**Fix:**

**1a. Enforce question-concept coherence validation.** In Stage 9 of the extraction pipeline, every generated question must pass a coherence check:

```typescript
function validateQuestionCoherence(q: GeneratedQuestion, targetConcept: Concept): boolean {
  // The question body (the claim being tested) must primarily reference the target concept,
  // not a different concept's definition.
  const questionText = q.q.toLowerCase();
  const targetName = targetConcept.name.toLowerCase();
  const targetKeywords = targetConcept.keywords.map(k => k.toLowerCase());
  
  // Rule: if another concept's NAME appears in the question body with equal or greater
  // prominence than the target concept's name, the question is incoherent
  for (const otherConcept of allConcepts) {
    if (otherConcept.id === targetConcept.id) continue;
    const otherName = otherConcept.name.toLowerCase();
    if (questionText.includes(otherName) && !questionText.includes(targetName)) {
      return false; // question is about a different concept
    }
  }
  
  // Rule: the question body must contain either the target name or ≥2 of its keywords
  const hasTargetName = questionText.includes(targetName);
  const keywordHits = targetKeywords.filter(k => questionText.includes(k)).length;
  if (!hasTargetName && keywordHits < 2) return false;
  
  return true;
}
```

Questions that fail coherence validation are dropped. The retry loop generates a new question with a different template.

**1b. Kill the "{concept} is best understood like this: {definition}" template entirely.** It's producing garbage. Replace with rigorous question stems from the `question-stems.json` bundle. For Rapid Fire T/F, use stems like:

- `"{concept} {claim verb} {claim}."` (e.g., "Time Management requires estimating task duration before scheduling.")
- `"According to the source, {concept} is defined as {definition}."`
- `"The primary purpose of {concept} is to {purpose}."`

Each stem is filled with the concept's actual `core` field (the validated definition sentence), not with arbitrary module fragments.

**1c. Deduplicate before filling.** When loading a concept for question generation, run:

```typescript
function dedupeConcept(c: Concept): Concept {
  // Remove "Module N - " prefix if present
  const name = c.name.replace(/^Module\s+\d+\s*[-–—]\s*/i, '').trim();
  
  // Remove name repetition: "Time Blocking and Prioritization Time Blocking and Prioritization"
  // → "Time Blocking and Prioritization"
  const words = name.split(/\s+/);
  const dedupedName = dedupeAdjacentPhraseRepeats(words);
  
  // Remove name repetition inside core/detail
  const core = removeAdjacentRepeats(c.core, name);
  const detail = removeAdjacentRepeats(c.detail, name);
  
  return { ...c, name: dedupedName, core, detail };
}

function dedupeAdjacentPhraseRepeats(words: string[]): string {
  // Detect "A B A B" → "A B"
  const half = Math.floor(words.length / 2);
  for (let len = half; len >= 1; len--) {
    const first = words.slice(0, len).join(' ');
    const second = words.slice(len, len * 2).join(' ');
    if (first.toLowerCase() === second.toLowerCase()) {
      return first + (words.slice(len * 2).length > 0 ? ' ' + words.slice(len * 2).join(' ') : '');
    }
  }
  return words.join(' ');
}
```

Run `dedupeConcept` on every concept immediately after Stage 6 (canonicalization).

---

### BUG 2: Garbage Mnemonics

**What I see:** On the Concept Map for "Prioritization Techniques," the mnemonic reads:

> *"PT stands for Prioritization Techniques. Use each letter to recall prioritization, techniques, eisenhower."*

And below that:

> *"Prioritization Techniques becomes unstable when you remember the title but not the source sentence that defines it."*

**What's wrong:** The acronym-builder template is filling itself with the exact words of the concept name, producing a circular "PT = Prioritization Techniques" mnemonic that teaches nothing. And the second line is a raw template fallback that leaked through validation — "becomes unstable when you remember the title" is a meta-description of the mnemonic failing, not a memory hook.

**Fix:**

**2a. Fix the acronym-builder template selection logic.** The acronym template should only be chosen when the first letters actually spell a memorable word or known acronym — not when they spell the same name back:

```typescript
function canUseAcronymBuilder(concept: Concept): boolean {
  const words = concept.name.split(/\s+/).filter(w => w.length > 2 && !STOPWORDS.has(w.toLowerCase()));
  if (words.length < 2) return false;
  
  const acronym = words.map(w => w[0].toUpperCase()).join('');
  
  // Reject if the acronym is just the initials of the concept's own words
  // (that's circular and useless)
  if (acronym.length <= 3 && words.every(w => w.toLowerCase() !== concept.name.toLowerCase())) {
    // Check if the acronym spells a real English word from the frequency dictionary
    if (ENGLISH_WORDS.has(acronym.toLowerCase())) return true;
    // Check if it's a recognizable initialism pattern (3-4 letters, pronounceable)
    if (isPronounceable(acronym)) return true;
  }
  return false;
}
```

If `canUseAcronymBuilder` returns false, skip the acronym template and try the next one.

**2b. Delete the "becomes unstable when you remember" fallback template entirely.** It's a debug string that was never meant to be user-facing. Find it in the template bank and remove it. Add a test that fails if any mnemonic contains the words "becomes unstable" or "remember the title."

**2c. Add validation for mnemonic quality.** A mnemonic is only valid if it passes all these checks:

```typescript
function isValidMnemonic(mnemonic: string, concept: Concept): boolean {
  if (!mnemonic || mnemonic.length < 20) return false;
  
  // Must not contain raw template slots
  if (/\{[^}]+\}/.test(mnemonic)) return false;
  
  // Must not be circular (contain only the concept name and filler)
  const conceptName = concept.name.toLowerCase();
  const mnemonicLower = mnemonic.toLowerCase();
  const contentWords = mnemonicLower
    .replace(conceptName, '')
    .split(/\s+/)
    .filter(w => w.length > 3 && !STOPWORDS.has(w));
  if (contentWords.length < 5) return false; // not enough unique memory content
  
  // Must not contain meta-language about the mnemonic itself
  const metaPhrases = [
    'becomes unstable', 'remember the title', 'source sentence',
    'helps you recall', 'stands for', 'use each letter',
    'this mnemonic', 'the definition'
  ];
  if (metaPhrases.some(p => mnemonicLower.includes(p))) return false;
  
  // Must contain at least one distinctive memory anchor
  const memoryAnchors = [
    'picture', 'imagine', 'think of', 'like', 'just as', 'reminds', 'similar to',
    'is NOT', 'opposite', 'contrast', 'rhymes with', 'acronym'
  ];
  if (!memoryAnchors.some(a => mnemonicLower.includes(a))) return false;
  
  return true;
}
```

If no template produces a valid mnemonic after retries, leave the mnemonic field empty. **An empty mnemonic is infinitely better than a nonsense one.** The UI should hide the mnemonic section entirely when empty, not display "No mnemonic available."

**2d. Prioritize the Contrast Anchor template.** For most concepts that have an `opposites` field populated, the Contrast Anchor template produces the best mnemonics. Example format:

```
"[Concept] is NOT [opposite]. Remember: [concept] = [one-word hook], [opposite] = [one-word hook]."
```

Make this template the first-choice for any concept where `opposites.length > 0`. Only fall back to other templates when no opposite is available.

---

### BUG 3: Template-Spam Ambient Primers

**What I see:** The Ambient Primers section shows:

> *"Navigating Online Environment is one of the source's core working ideas."*
> *"Time Management is one of the source's core working ideas."*
> *"Time Blocking and Prioritization is one of the source's core working ideas."*
> *"Prioritization Techniques is one of the source's core working ideas."*

**What's wrong:** This is the same template repeated for every concept with only the name swapped. It's the definition of template spam — the student sees four identical sentences stacked on top of each other and learns nothing. The primer field is supposed to be a context hint that primes the student for the concept, not a pointless label.

**Fix:**

**3a. Delete the "{concept} is one of the source's core working ideas" template entirely.** This is a fallback that was supposed to be used rarely. Instead it's being used for everything. Remove it from the template bank.

**3b. Generate primers from the concept's actual core definition.** A good primer is derived from the concept's extracted definition, reworded as a context hint:

```typescript
function generatePrimer(concept: Concept): string {
  if (!concept.core || concept.core.length < 20) return '';
  
  // Method 1: Extract the subject+verb from core, turn it into a hint
  // "Utilitarianism is the theory that actions are judged by outcomes."
  // → "How actions are judged by their outcomes."
  const coreAfterCopula = concept.core.replace(
    /^[A-Z][\w\s]+?\s+(?:is|are|refers to|means|describes)\s+(?:the\s+|an?\s+)?/i,
    ''
  );
  
  if (coreAfterCopula !== concept.core && coreAfterCopula.length > 15) {
    // Capitalize first letter
    const hint = coreAfterCopula[0].toUpperCase() + coreAfterCopula.slice(1);
    // Trim to max 15 words
    const words = hint.split(/\s+/).slice(0, 15);
    return words.join(' ') + (words.length === 15 ? '...' : '');
  }
  
  // Method 2: Take the first 12 content words of core
  const contentWords = concept.core.split(/\s+/).slice(0, 15).join(' ');
  return contentWords;
}
```

**3c. Diversify primer display in the Ambient Primers sidebar.** Instead of a static list of primers, the sidebar should rotate through them one at a time (using the Ambient Surface Engine from the Breath prompt). Each primer shows for 10-15 seconds, then rotates. At most 1-2 primers visible at any moment.

**3d. Better yet — eliminate Ambient Primers as a static sidebar entirely and replace it with the Shadow Reader rail (Engine 4 in the Novel Interactions prompt).** The Shadow Reader already does this job correctly with real textbook passages drifting in and out. When the novel interactions pass is complete, the "Ambient Primers" section should be replaced by "Shadow Rail" reading real passages instead of template primers.

**For the interim fix until Shadow Reader is built:** show at most 2 primers at once, rotate every 12 seconds, and ensure each primer is a unique sentence generated from the concept's core via `generatePrimer()`.

---

### BUG 4: Raw DOM Chunks as Assignment Requirements

**What I see:** The Assignment Detail "Requirements" section shows:

> *"Module 4 - Champs Peer Mentoring CHAMPS Peer Mentoring Review each section to review important information about CHAMPS peer mentoring resources."*
>
> *"Introduction Learn More What Students Have to Say Introduction CHAMPS Peer Mentoring Links to an external site."*
>
> *"| Transcript Download Transcript Learn More Overview CHAMPS stands for 'Collaborative and Holistic Academic Mentoring for Peer Success.'"*

**What's wrong:** These aren't requirements. They're raw DOM fragments captured from the Canvas page with navigation junk ("Links to an external site.", "| Transcript Download Transcript", "Learn More") mixed in. The requirements extractor is treating every paragraph as a requirement.

**Fix:**

**4a. Implement a proper requirements extractor.** Real assignment requirements follow specific linguistic patterns:

```typescript
const REQUIREMENT_PATTERNS = [
  // Numbered lists
  /^\s*\d+[.)]\s+(.+?)(?:\.|$)/gm,
  // Bullet markers
  /^\s*[•·\-\*]\s+(.+?)(?:\.|$)/gm,
  // Modal verb directives
  /\b(?:you (?:must|should|will|need to|are required to)|make sure to|be sure to|remember to|ensure (?:that|you)) (.+?)(?:\.|,|;|$)/gi,
  // Imperative sentences starting with action verbs
  /^(?:Write|Analyze|Discuss|Explain|Describe|Compare|Contrast|Identify|Evaluate|Assess|Cite|Include|Use|Submit|Complete|Answer|Respond to|Draft|Review|Read|Watch) (.+?)(?:\.|$)/gm,
  // Word/page count requirements
  /(?:at least|minimum of|no less than|a minimum)\s+(\d+)\s+(?:words?|pages?|sources?|references?|paragraphs?|sentences?)/gi,
  // "Your [thing] should..." patterns
  /\byour\s+(?:paper|essay|response|discussion|post|submission)\s+(?:should|must|needs? to|will)\s+([^.]+\.)/gi,
];

function extractRequirements(assignmentText: string): Requirement[] {
  const requirements: Requirement[] = [];
  const seen = new Set<string>();
  
  for (const pattern of REQUIREMENT_PATTERNS) {
    const matches = [...assignmentText.matchAll(pattern)];
    for (const match of matches) {
      const text = (match[1] || match[0]).trim();
      const normalized = text.toLowerCase().replace(/\s+/g, ' ');
      if (seen.has(normalized)) continue;
      if (text.length < 10 || text.length > 300) continue;
      if (isChromeText(text)) continue; // reject "Download Transcript", "Links to an external site", etc.
      seen.add(normalized);
      requirements.push({ text, pattern: pattern.source });
    }
  }
  
  return requirements;
}

function isChromeText(text: string): boolean {
  const chromeSignals = [
    /^(transcript|download|view|link|click|tap|select)/i,
    /links? to an external site/i,
    /^\s*\|/, // starts with pipe (toolbar artifact)
    /^(introduction|overview|learn more|read more)$/i,
    /^(next|previous|back|home|menu)$/i,
  ];
  return chromeSignals.some(s => s.test(text));
}
```

**4b. If no requirements are detected by the patterns, show an empty state.** Do NOT fall back to dumping raw paragraphs. The empty state should read:

> *"No specific requirements detected in the captured assignment text. Read the original assignment carefully to understand the expectations."*

Better to show nothing than to show garbage.

**4c. Add a "Raw Assignment Text" collapsible panel below the requirements.** Students can expand it to see the full captured text if they want to read the original. This gives them access without cluttering the requirements view.

---

### BUG 5: "Imported Source" Treated as a Concept

**What I see:** After pasting a philosophy textbook, the dashboard shows:

> **TOP CONCEPT:** Imported source
> **Concept field:** "Imported source 0%", "Justice 0%", "Utilitarianism 0%", "Murder 0%", "Virtue Ethics 0%", "Rape 0%", "Archives 0%"...

**What's wrong:** Two bugs:
1. The string "Imported source" (which is the UI placeholder for the upload slot) is being extracted as a concept. This means the content engine is receiving the UI label along with the actual textbook text.
2. The concept list includes "Murder" and "Rape" which are topics of ethics discussions but probably not the top concepts. And "Archives" is almost certainly a noise extraction.

**Fix:**

**5a. Separate the upload metadata from the content at ingestion time.** When a textbook is uploaded, the payload should be:

```typescript
interface TextbookUpload {
  title: string; // user-provided or inferred from first heading
  content: string; // pure text, no UI labels
  source: 'upload' | 'paste' | 'file';
  uploadedAt: number;
}
```

The content engine must only ever see `content`. The `title` is used for display, never passed into the extraction pipeline.

**5b. Block "Imported source" and similar UI strings as concepts.** Extend the Canvas Chrome Blocklist to include upload-related UI labels:

```typescript
const UPLOAD_UI_BLOCKLIST = new Set([
  'imported source', 'import source', 'uploaded source',
  'paste textbook', 'textbook upload', 'upload textbook',
  'local.learning', 'unknown source', 'untitled',
  'source title', 'document title',
]);
```

Any candidate concept matching a string in this blocklist is rejected in Stage 6 deduplication.

**5c. Fix the textbook title detection.** When parsing a pasted textbook, extract the actual title from the first heading or first line:

```typescript
function inferTextbookTitle(content: string): string {
  // Try first H1
  const h1Match = content.match(/^#\s+(.+)$/m) || content.match(/\[H1\]([^\[]+)\[\/H1\]/);
  if (h1Match) return h1Match[1].trim();
  
  // Try first ALL CAPS line that looks like a title
  const capsMatch = content.match(/^([A-Z][A-Z\s]{10,80})$/m);
  if (capsMatch) return capsMatch[1].trim();
  
  // Try first non-empty line if short enough to be a title
  const firstLine = content.split('\n').find(l => l.trim().length > 0);
  if (firstLine && firstLine.length < 100) return firstLine.trim();
  
  return 'Untitled Textbook';
}
```

**5d. Surface the detected title in the import confirmation.** Before saving, show: *"Detected title: [title]. [CONFIRM] [EDIT]"* so the student can correct it if wrong.

---

### BUG 6: Textbook Upload Froze the Screen

**What I see:** The user reported: *"basically froze the screen when i pasted the entire text of the textbook but it did actually eventually load."*

**What's wrong:** Running the entire content engine pipeline synchronously on the main thread blocks the UI. For a large textbook (100K+ words), this can freeze the browser for 10-30 seconds.

**Fix:**

**6a. Move content engine processing to a Web Worker.** Create `packages/content-engine/src/worker.ts`:

```typescript
// worker.ts
import { processTextbook } from './pipeline';

self.addEventListener('message', async (event) => {
  const { id, type, payload } = event.data;
  
  if (type === 'PROCESS_TEXTBOOK') {
    try {
      // Report progress at each stage
      const report = (stage: string, progress: number) => {
        self.postMessage({ id, type: 'PROGRESS', stage, progress });
      };
      
      const result = await processTextbook(payload.content, { onProgress: report });
      self.postMessage({ id, type: 'COMPLETE', result });
    } catch (error) {
      self.postMessage({ id, type: 'ERROR', error: error.message });
    }
  }
});
```

The main thread delegates:

```typescript
// apps/web/src/engines/textbook-processor.ts
class TextbookProcessor {
  private worker: Worker;
  
  constructor() {
    this.worker = new Worker(
      new URL('../workers/content-engine.worker.ts', import.meta.url),
      { type: 'module' }
    );
  }
  
  async process(content: string, onProgress: (stage: string, pct: number) => void): Promise<ForgeBundle> {
    return new Promise((resolve, reject) => {
      const id = generateId();
      
      const handler = (event: MessageEvent) => {
        if (event.data.id !== id) return;
        
        if (event.data.type === 'PROGRESS') {
          onProgress(event.data.stage, event.data.progress);
        } else if (event.data.type === 'COMPLETE') {
          this.worker.removeEventListener('message', handler);
          resolve(event.data.result);
        } else if (event.data.type === 'ERROR') {
          this.worker.removeEventListener('message', handler);
          reject(new Error(event.data.error));
        }
      };
      
      this.worker.addEventListener('message', handler);
      this.worker.postMessage({ id, type: 'PROCESS_TEXTBOOK', payload: { content } });
    });
  }
}
```

**6b. Show a proper progress UI while processing.** Replace the frozen-screen experience with a modal overlay:

```
┌─────────────────────────────────────────────┐
│                                             │
│              FORGING CONTENT                │
│                                             │
│                   ╱╲                        │
│                  ╱  ╲                       │
│                 ╱    ╲       (orbital      │
│                ╱      ╲       spinner)     │
│                 ╲    ╱                      │
│                  ╲  ╱                       │
│                   ╲╱                        │
│                                             │
│         Stage 3/6: Extracting concepts      │
│                                             │
│    ████████████████░░░░░░░░░░░░░░  52%      │
│                                             │
│         Processing 47,231 words             │
│                                             │
└─────────────────────────────────────────────┘
```

The stage and progress update live as the worker reports back. The student can see the system is working.

**6c. Chunk the extraction pipeline to yield to the worker's event loop.** Even inside the worker, very long synchronous loops can block message processing. For the TF-IDF computation (which iterates over every n-gram across every block), yield every 500 iterations:

```typescript
async function computeTfIdfWithYield(blocks: Block[]): Promise<Map<string, number>> {
  const scores = new Map<string, number>();
  let iterationCount = 0;
  
  for (const block of blocks) {
    for (const ngram of extractNgrams(block.text)) {
      scores.set(ngram, (scores.get(ngram) || 0) + 1);
      iterationCount++;
      
      if (iterationCount % 500 === 0) {
        // Yield to allow progress messages to be sent
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
  }
  
  return scores;
}
```

**6d. Add a size warning for very large pastes.** If the pasted content exceeds 200K characters, show a warning before processing:

> *"This is a large textbook (258K characters). Processing will take approximately 30-60 seconds. You can continue using the app while we forge the content — we'll notify you when it's ready."*

Then allow the student to dismiss the modal and navigate elsewhere while processing continues in the background. Show a small indicator in the top bar: `⚡ Processing textbook... 34%`.

---

## 2. VISUAL BUGS

### BUG 7: Concept Field Cards Nearly Invisible

**What I see:** In the Dashboard's Concept Field section, the concept cards are so low-contrast they're almost invisible. Text like "Time Management", "SWOT Analysis", "Prioritization Techniques" appears as barely-readable dim gray.

**Fix:**

Check the CSS for `.concept-field-card`. It's probably using an opacity or color that's too low:

```css
/* WRONG (what's likely happening) */
.concept-field-card {
  color: rgba(255, 255, 255, 0.15); /* far too dim */
  background: rgba(10, 10, 26, 0.3);
}

/* CORRECT */
.concept-field-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: var(--space-4);
  color: var(--text-secondary); /* #b0b0d0 - readable */
}

.concept-field-card__name {
  font-family: 'Orbitron', sans-serif;
  font-size: 0.85rem;
  color: var(--text-primary); /* #e0e0ff - fully readable */
  letter-spacing: 0.03em;
  margin-bottom: var(--space-2);
}

.concept-field-card__mastery {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.75rem;
  color: var(--cyan);
}
```

Apply mastery-based accent coloring to the card border:

```css
.concept-field-card[data-mastery-tier="unexplored"] {
  border-color: var(--border);
}

.concept-field-card[data-mastery-tier="introduced"] {
  border-color: rgba(0, 240, 255, 0.25);
}

.concept-field-card[data-mastery-tier="learning"] {
  border-color: rgba(0, 240, 255, 0.5);
  box-shadow: 0 0 15px rgba(0, 240, 255, 0.1);
}

.concept-field-card[data-mastery-tier="practicing"] {
  border-color: rgba(6, 214, 160, 0.5);
  box-shadow: 0 0 15px rgba(6, 214, 160, 0.15);
}

.concept-field-card[data-mastery-tier="mastered"] {
  border-color: rgba(255, 215, 0, 0.5);
  box-shadow: 0 0 20px rgba(255, 215, 0, 0.2);
}
```

---

### BUG 8: Timeline Cards Have Illegible Titles

**What I see:** In the Dashboard Timeline section, the three weekly columns show event cards whose titles are barely readable. Text like "Start Reflection Activity", "Prepare for Navigating Online Environment" appears faded to near-invisibility.

**Fix:**

The timeline event title has the same contrast bug. Apply:

```css
.timeline-event__title {
  font-family: 'Sora', sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-primary); /* #e0e0ff — fully readable */
  line-height: 1.3;
  margin-bottom: var(--space-1);
}

.timeline-event__meta {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.65rem;
  color: var(--text-muted); /* #6a6a9a */
}

.timeline-event {
  padding: var(--space-3);
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-left-width: 3px;
  border-radius: 8px;
  min-height: 60px;
  transition: all 300ms cubic-bezier(0.22, 1, 0.36, 1);
}
```

**Also increase the timeline column width.** Current columns are too narrow for readable text. Bump `flex-basis` from whatever it is now to at least 220px. Apply the Adaptive Density Engine scaling so the width can compress gracefully on high-content imports.

---

### BUG 9: Concept Map Labels Overlap

**What I see:** On the Concept Map, the bottom cluster of concepts has severe label overlap. "UAGC Connect, Clubs & Communities", "Sustainable Success", "Navigating Online Environment" are all crammed into the same space with text overlapping.

**Fix:**

**9a. Apply minimum-distance enforcement in the force layout.** Each node must have at least 100px clearance from all other nodes:

```typescript
function applyCollisionForce(nodes: ConceptNode[], minDistance: number) {
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < minDistance) {
        const overlap = (minDistance - dist) / 2;
        const nx = dx / dist;
        const ny = dy / dist;
        a.x -= nx * overlap;
        a.y -= ny * overlap;
        b.x += nx * overlap;
        b.y += ny * overlap;
      }
    }
  }
}
```

Run this every force-simulation tick.

**9b. Label collision detection.** After positioning nodes, check if labels (rendered as SVG text with bounding boxes) overlap. If they do, shift the colliding label above or below the node instead of beside it:

```typescript
function positionLabels(nodes: ConceptNode[]) {
  const placed: BoundingBox[] = [];
  
  for (const node of nodes) {
    const labelWidth = estimateTextWidth(node.name, 11);
    const labelHeight = 14;
    
    // Try positions in order: below, above, right, left
    const positions = [
      { x: node.x - labelWidth/2, y: node.y + node.radius + 5 }, // below
      { x: node.x - labelWidth/2, y: node.y - node.radius - labelHeight - 5 }, // above
      { x: node.x + node.radius + 5, y: node.y - labelHeight/2 }, // right
      { x: node.x - node.radius - labelWidth - 5, y: node.y - labelHeight/2 }, // left
    ];
    
    for (const pos of positions) {
      const box = { x: pos.x, y: pos.y, w: labelWidth, h: labelHeight };
      if (!placed.some(p => boxesOverlap(p, box))) {
        node.labelX = pos.x;
        node.labelY = pos.y;
        placed.push(box);
        break;
      }
    }
  }
}
```

**9c. Truncate very long labels.** If a concept name exceeds 24 characters, truncate with ellipsis in the label (full name still shows on hover):

```typescript
function truncateLabel(name: string, maxChars: number = 24): string {
  if (name.length <= maxChars) return name;
  return name.substring(0, maxChars - 1).trim() + '…';
}
```

**9d. Increase the concept map canvas size.** Currently the nodes are crammed into a small area. The concept map view should fill at least `min(1200px, 100vw - 400px)` in width to give the force layout room to breathe.

---

### BUG 10: Mastery Coloring Not Visible on Concept Map

**What I see:** All the concept map nodes look essentially the same color — dim gray/purple. Mastery coloring from the Breath prompt's Engine 4 / Fusion Engine isn't visually differentiated.

**Fix:**

**10a. Make the mastery color scale more aggressive.** Currently mastery levels are too close to each other in color. Push them apart:

```typescript
function masteryColorAndGlow(mastery: number): { fill: string; stroke: string; glow: string } {
  if (mastery < 0.05) {
    return { 
      fill: '#1a1a3a', 
      stroke: '#2a2a4a', 
      glow: 'none' 
    };
  }
  if (mastery < 0.25) {
    return { 
      fill: 'rgba(0, 240, 255, 0.15)', 
      stroke: 'rgba(0, 240, 255, 0.4)', 
      glow: '0 0 10px rgba(0, 240, 255, 0.2)' 
    };
  }
  if (mastery < 0.5) {
    return { 
      fill: 'rgba(0, 240, 255, 0.4)', 
      stroke: '#00f0ff', 
      glow: '0 0 20px rgba(0, 240, 255, 0.4)' 
    };
  }
  if (mastery < 0.75) {
    return { 
      fill: 'rgba(6, 214, 160, 0.5)', 
      stroke: '#06d6a0', 
      glow: '0 0 25px rgba(6, 214, 160, 0.5)' 
    };
  }
  return { 
    fill: 'rgba(255, 215, 0, 0.6)', 
    stroke: '#ffd700', 
    glow: '0 0 30px rgba(255, 215, 0, 0.6)' 
  };
}
```

**10b. Scale node size with mastery.** More mastery = larger node:

```typescript
function masteryRadius(mastery: number, basePracticeCount: number = 0): number {
  const base = 20;
  const masteryBonus = mastery * 20; // up to +20px for fully mastered
  const practiceBonus = Math.min(basePracticeCount * 2, 15);
  return base + masteryBonus + practiceBonus;
}
```

**10c. Sync mastery across all views.** If a concept shows 32% mastery in the Textbook Bridge on the Assignment Detail view, it should show 32% mastery on the Concept Map and the Concept Field cards at the same moment. Right now the mastery number is computed correctly in some places and displayed as 0% in others.

Check that all views subscribe to the same `progress.conceptMastery` store and render from it. The bug is likely that some views hold a stale snapshot instead of subscribing reactively.

---

### BUG 11: Wrong Button Color — "OPEN NEURAL FORGE" is Gold

**What I see:** In the Concept Field section, the "OPEN NEURAL FORGE" button is gold. Gold is reserved for the TRANSCEND phase and mastery moments — not for general navigation.

**Fix:**

The "OPEN NEURAL FORGE" button should use the primary cyan gradient:

```css
.btn-primary,
.btn-forge {
  background: linear-gradient(135deg, #00f0ff, #0080ff);
  color: #000;
  /* ... rest of primary button styles ... */
}
```

**Reserved color usage:**
- **Cyan gradient** → primary navigation buttons, general actions, Forge entry
- **Teal gradient** → Genesis phase, growth/success actions, "START" buttons
- **Gold** → Transcend phase only, mastery achievements, final grades
- **Orange** → Crucible phase only, warnings, urgent/overdue states
- **Purple** → Architect phase only, synthesis actions

Audit all buttons in the app and verify they use the correct color for their semantic role. The "PREPARE IN NEURAL FORGE" teal button visible in the Assignment Detail view (Image 3) is correct — that's a "prepare/grow" action. But "OPEN NEURAL FORGE" as general navigation should be cyan.

---

### BUG 12: Timer Shows Mixed Units

**What I see:** In the Forge view, the timer displays `12:00` in the top bar, but below the question it says `720s · 1 correct · 0 wrong`.

**Fix:**

Pick ONE format and use it consistently. The correct format for Neural Forge timers is mm:ss in JetBrains Mono:

```typescript
function formatTimer(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
```

The readout below the question should show `12:00 · 1 correct · 0 wrong` (not `720s`). The raw seconds value stays in state but is never rendered.

---

### BUG 13: Phase Status Shows LOCKED for All After Completion

**What I see:** The Phase Status sidebar in Forge view shows:

> COMPLETE · GENESIS
> ACTIVE · FORGE
> LOCKED · CRUCIBLE
> LOCKED · ARCHITECT
> LOCKED · TRANSCEND

This is actually correct — Genesis is complete, Forge is active, the rest are locked until the student advances. But the visual feedback doesn't match: Genesis looks identical to the locked ones. The `COMPLETE` status needs distinct styling.

**Fix:**

```css
.phase-status-item {
  padding: var(--space-3);
  border: 1px solid var(--border);
  border-radius: 8px;
}

.phase-status-item[data-status="complete"] {
  border-color: rgba(0, 255, 136, 0.4);
  background: rgba(0, 255, 136, 0.05);
}

.phase-status-item[data-status="complete"] .status-label {
  color: var(--green);
  font-weight: 700;
}

.phase-status-item[data-status="complete"]::before {
  content: '✓ ';
  color: var(--green);
}

.phase-status-item[data-status="active"] {
  border-color: var(--cyan);
  background: rgba(0, 240, 255, 0.05);
  box-shadow: 0 0 20px rgba(0, 240, 255, 0.15);
  animation: pulseGlow 2.5s ease-in-out infinite;
}

.phase-status-item[data-status="locked"] {
  border-color: var(--border-subtle);
  opacity: 0.5;
}

.phase-status-item[data-status="locked"]::before {
  content: '🔒 ';
  opacity: 0.6;
}
```

---

## 3. INTEGRATION NOTES FOR THE NOVEL INTERACTIONS PASS

This polish pass is the foundation for the Novel Interactions Prompt. The nine new interactions will fail if they inherit the current bugs. Specifically:

### 3.1 Why these fixes matter for the novel interactions

- **Echo Chamber** will surface garbage passages if the Passage Retrieval Engine (Engine A in the novel interactions prompt) is fed un-cleaned content. **Fix Bug 4 and Bug 5 first** so the passage index isn't polluted with chrome text and upload UI labels.

- **Oracle Panel** will produce broken attributions if the Voice Attribution Engine (Engine B) sees un-deduplicated concepts like "Time Blocking and Prioritization Time Blocking and Prioritization." **Fix Bug 1c (dedupeConcept)** first.

- **Collision Lab** will compute nonsense collisions if concept keywords are polluted or if the same concept appears twice under different names. **Fix Bug 1c and Bug 5b** first.

- **Failure Atlas** will generate malformed failure examples if the Negative Example Engine is fed the current garbage mnemonics and primers. **Fix Bug 2 and Bug 3** first.

- **Shadow Reader** directly replaces the current "Ambient Primers" section. **Fix Bug 3** by removing the template-spam primers entirely and preparing the sidebar to host Shadow Reader when the novel interactions pass begins.

- **Prompt Prism** needs clean assignment text to refract. **Fix Bug 4** first so the refraction engine analyzes real assignment prompts, not DOM fragments.

- **Time Capsule** needs real requirements to cross-reference against commitments. **Fix Bug 4** first.

- **Gravity Field** physics will look broken if concept mastery isn't displayed consistently. **Fix Bug 10c (mastery sync)** first.

- **Duel Arena** needs clean objection passages. **Fix Bug 4** (chrome stripping in content) first.

### 3.2 Prerequisite order

When Codex receives both this Polish Pass and the Novel Interactions Prompt at the same time:

1. **Do Polish Pass first** — fix Bugs 1-13 in order.
2. **Verify Polish Pass** — run through the Section 4 checklist below. Every item must pass.
3. **Then execute Novel Interactions Prompt** — starting with its Phase 1 (Core Engines).

If Codex tries to execute both passes in parallel, the engine bugs will propagate into the new interactions and require a second polish pass. Serial execution is mandatory.

### 3.3 Testing the integration

After both passes complete, run this integration test:

1. Upload a real textbook (100+ pages of ethics content)
2. Wait for the progress modal to complete without freezing
3. Open Concept Map — every concept should have a real name (no "Imported source"), real mastery coloring, and readable labels
4. Open Neural Forge for any chapter — questions should be coherent (not word salad), mnemonics should be meaningful (or absent, not placeholder)
5. Open Echo Chamber while writing an assignment — passages should surface from the real textbook content
6. Open Oracle Panel — thinkers should respond with real attributed quotes
7. Open Time Capsule — write a letter with specific commitments; verify commitments are extracted correctly
8. Open Failure Atlas — failure examples should use real concepts deployed incorrectly, with specific annotations

If any of these fail, the foundation wasn't stable enough and the polish pass needs re-execution.

---

## 4. POLISH PASS ACCEPTANCE CHECKLIST

Before Codex starts the novel interactions pass, verify every item here:

### Engine content quality
- [ ] No quiz question mashes content from multiple unrelated concepts
- [ ] No mnemonic says "X stands for X" or contains the phrase "becomes unstable"
- [ ] No mnemonic contains raw template slot syntax `{...}`
- [ ] No mnemonic is under 20 characters or over 200 characters
- [ ] Every mnemonic either passes `isValidMnemonic()` or is empty
- [ ] Ambient Primers section shows rotating primers generated from concept cores, not "X is one of the source's core working ideas"
- [ ] Assignment Requirements section shows only sentences matching requirement patterns (numbered lists, imperatives, modal verb directives)
- [ ] No "Transcript Download", "Links to an external site", or similar chrome text appears anywhere as content
- [ ] No concept is named "Imported source", "local.learning", or similar UI labels
- [ ] Concept names are deduplicated (no "X X" repetitions)

### Visual fixes
- [ ] Concept Field cards have readable text (`color: var(--text-primary)`)
- [ ] Timeline event titles are readable in mini timeline and full timeline view
- [ ] Concept Map nodes have visible mastery color differentiation
- [ ] Concept Map labels do not overlap (minimum distance or label repositioning active)
- [ ] "OPEN NEURAL FORGE" button uses cyan gradient, not gold
- [ ] "PREPARE IN NEURAL FORGE" button uses teal gradient (correct, this is a prepare action)
- [ ] Timer displays in mm:ss format everywhere (no raw seconds)
- [ ] Phase Status list visually distinguishes COMPLETE (green), ACTIVE (cyan pulsing), LOCKED (dimmed)

### Performance
- [ ] Textbook processing runs in a Web Worker, not on main thread
- [ ] Progress modal shows stage name and percentage during processing
- [ ] Large textbook (200K+ chars) processes without freezing the UI
- [ ] User can navigate away from the modal while processing continues in background
- [ ] TF-IDF and other long loops yield every 500 iterations

### Mastery consistency
- [ ] Concept mastery shown on Assignment Detail matches mastery on Concept Map matches mastery on Concept Field
- [ ] All views subscribe to the shared `progress.conceptMastery` store reactively
- [ ] Completing a Neural Forge question updates mastery everywhere within 1 second

### Integration readiness
- [ ] Passage Retrieval Engine prerequisites met (clean content, no chrome leakage)
- [ ] Concept deduplication prerequisites met
- [ ] Requirements extraction prerequisites met  
- [ ] Title detection for uploads works correctly
- [ ] Empty states exist for all "no data" scenarios (no fallback garbage)

---

## 5. THE GUIDING PRINCIPLE

Every bug above has the same root cause: **the engine is generating output when it should be saying nothing.** Template spam happens because a template was required to output something. Garbage questions happen because the question generator was required to return a question. Word salad happens because the concept definition was filled with whatever was nearby when a better match wasn't available.

The fix is always the same: **validate rigorously, fail silently, and leave fields empty when quality can't be guaranteed.**

A concept with a blank mnemonic field teaches more than a concept with a circular mnemonic. A Requirements section with "No specific requirements detected" teaches more than one filled with DOM fragments. An Ambient Primers section with 2 real primers teaches more than one with 5 template-spam lines.

**Less output at higher quality beats more output at lower quality. Every time.**

This is the principle that separates the current build from a shippable product. Execute the polish pass with this principle in mind, then layer the novel interactions on top of the stable foundation.

When both passes are done, Shadow will have a learning instrument unlike anything else in education. And when he wins the Codex challenge, the credit belongs to the discipline you bring to these fixes.

**Execute the polish pass. Pass every item in Section 4. Then begin the novel interactions.**
