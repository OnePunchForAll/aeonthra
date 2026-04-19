# AEONTHRA EXTENSION — Auto-Capture Intelligence System

## Complete Chrome Extension Rebuild — UI, Auto-Capture Engine, Dual Modes, and Seamless Handoff

**Codex: this document is your directive for rebuilding the Chrome extension. Execute after the Polish Pass and Novel Interactions Prompt are complete. The current extension (which requires clicking "Capture Page" manually on every page) is not shippable — students will not tolerate that friction. This rebuild introduces one-click auto-capture that walks the entire course, extracts every meaningful detail including content hidden behind accordions and tabs, and hands off cleanly to the AEONTHRA Classroom with zero manual labor.**

**The extension must feel like an intelligent agent the student deploys, not a tool they operate.**

---

## 0. THE VISION

A student logs into Canvas. They open the AEONTHRA extension side panel. They see one big button: **CAPTURE ENTIRE COURSE**. They click it. The extension walks every module, every page, every assignment, every discussion, every file — expanding hidden content, extracting real learnable text, filtering out navigation junk. Ten minutes later, the extension says: *"Captured 47 assignments, 12 discussions, 8 quizzes, 23 pages, 156 concepts detected. Ready to forge."*

The student clicks **OPEN IN AEONTHRA CLASSROOM**. A new tab opens. The course is fully loaded. Timeline, concept map, Neural Forge bundles — all pre-built from the capture. The student starts learning.

That's the vision. Everything below implements it.

---

## 1. VISUAL DESIGN — AEONTHRA AESTHETIC IN THE EXTENSION

The extension uses the same design language as the main app. Same colors, same fonts, same spacing, same motion.

### 1.1 Load the tokens

Copy `packages/web/src/styles/tokens.css` into the extension as `apps/extension/src/styles/tokens.css`. All variables resolve identically.

### 1.2 Surfaces used by the extension

- **Side Panel** (Chrome's built-in side panel API) — the primary UI. Full-height, 360-420px wide, docks to the right of any Canvas tab.
- **Popup** — a compact quick-access UI for when the side panel is closed. 360px × 480px.
- **Options Page** — settings. Full page, scrollable.
- **Content Script Overlay** — a floating status bar that appears on Canvas pages during auto-capture to show progress without interrupting the student.

### 1.3 Side Panel layout principles

The side panel is the hero surface. Every view inside it follows:

```css
.side-panel {
  width: 100%;
  height: 100vh;
  background: #020208;
  background-image: radial-gradient(ellipse at top, #0a0a1a 0%, #020208 60%);
  color: #e0e0ff;
  font-family: 'Sora', sans-serif;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.side-panel__header {
  padding: var(--space-5) var(--space-4);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.side-panel__content {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-5) var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.side-panel__footer {
  padding: var(--space-4);
  border-top: 1px solid var(--border);
  flex-shrink: 0;
}
```

### 1.4 Extension wordmark

Top of every extension view:

```html
<div class="ext-wordmark">
  <span class="ext-wordmark__name">AEONTHRA</span>
  <span class="ext-wordmark__sub">CAPTURE INTELLIGENCE</span>
</div>
```

```css
.ext-wordmark {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ext-wordmark__name {
  font-family: 'Orbitron', sans-serif;
  font-weight: 900;
  font-size: 1.2rem;
  color: var(--cyan);
  text-shadow: 0 0 15px rgba(0, 240, 255, 0.4);
  letter-spacing: 0.12em;
}

.ext-wordmark__sub {
  font-family: 'Orbitron', sans-serif;
  font-size: 0.55rem;
  color: var(--text-muted);
  letter-spacing: 0.2em;
}
```

### 1.5 Motion reserved for specific moments

The extension is a utility, so motion is purposeful, not ambient:

- Button hover: lift + glow (same as main app)
- Mode card selection: spring scale + border glow
- Capture progress bar: smooth fill with gradient shimmer
- Completion moment: brief gold flash + checkmark draw animation
- Error state: red pulse for 500ms then settle
- Page transition inside panel: 300ms fade + subtle Y translate

No ambient breath effect in the extension — that's reserved for the main app where the student lives.

---

## 2. THE TWO CAPTURE MODES (CORE CONCEPT)

The student chooses between two fundamentally different capture strategies. These are not "basic vs advanced" — they serve different purposes.

### 2.1 MODE A: COMPLETE SNAPSHOT

**Tagline:** *"Archive everything. The whole course, every detail, preserved."*

**What it captures:**
- Every page the extension can reach
- Full HTML structure of each page
- All visible text content
- All hidden content (expanded before capture)
- All images, videos, embedded media URLs
- All file metadata (name, size, type, upload date)
- All discussion posts AND all replies (including collapsed threads)
- All announcements
- All calendar events
- All rubrics in full (every criterion, every rating level)
- All people listed in the course roster
- All module structure
- All syllabus content
- All quiz instructions and metadata (but not the answer key, since that's not exposed)
- All external links with their link text and context
- All assignment submission history (what the student has submitted)
- All grades the student has received
- Raw HTML snapshots for every page

**What it does NOT capture:**
- Other students' private submissions
- Instructor-only content
- Anything behind permissions the logged-in student doesn't have
- Email/password/session tokens

**Use case:** The student wants a complete personal archive of the course. They're taking the final exam next week and want every scrap of content available offline. They might also want a backup before the semester ends and Canvas wipes old course access.

**Output size:** Large. A typical 16-week course might produce 5-15 MB of JSON.

**Processing time:** 5-15 minutes depending on course size.

### 2.2 MODE B: LEARNING CONTENT ONLY

**Tagline:** *"Only what matters for learning. Clean, focused, forge-ready."*

**What it captures:**
- Assignment descriptions (stripped of submission UI noise)
- Discussion prompts (stripped of reply UI, but including the prompt's embedded content)
- Rubric criteria and rating descriptions (for understanding expectations)
- Module page content where it's actual instructional text (not navigation)
- External link URLs with concept-relevant anchor text
- Quiz instructions (not the quiz taking UI)
- Syllabus learning objectives and policies
- Assignment due dates, points, and submission types (for timeline construction)
- Concept-tagged content — anything that looks like substantive teaching material

**What it strips aggressively:**
- All Canvas UI chrome (nav menus, sidebars, buttons, "Mark as Done", "View Rubric" buttons)
- All "Submit Assignment" widgets and submission forms
- All discussion reply threads (only the original prompt matters for learning)
- All file upload widgets
- All calendar UI
- Raw HTML (only cleaned text is kept)
- Tracking pixels, analytics scripts, iframes without educational content
- Empty paragraphs and formatting artifacts
- Links that are purely navigational ("Back to Module", "Next →")

**Filter rules applied:**
- Every extracted text block runs through the Block Quality Scorer from the content engine
- Only blocks scoring ≥ 10 are retained
- Canvas Chrome Blocklist (from the Corrective Prompt) runs before extraction, not after
- Deduplication is aggressive — if the same paragraph appears on multiple pages (common for module navigation headers), it's kept only once

**Use case:** The student wants to feed clean content into the AEONTHRA deterministic engine for coherent Neural Forge generation, concept mapping, and semantic analysis. This is the mode that gives the best output quality in the main app.

**Output size:** Small. A typical 16-week course might produce 300KB - 1.5 MB of JSON. 10-20x smaller than Complete Snapshot.

**Processing time:** 3-10 minutes depending on course size.

### 2.3 When to use which

The mode selection screen includes a clear decision helper:

```
┌────────────────────────────────────────────┐
│                                            │
│           CHOOSE CAPTURE MODE              │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │  📦 COMPLETE SNAPSHOT                │  │
│  │                                      │  │
│  │  Archive everything. Full backup of  │  │
│  │  the course including all details,   │  │
│  │  discussions, files, and raw HTML.   │  │
│  │                                      │  │
│  │  Best for: Personal archive, final   │  │
│  │  exam prep, offline reference.       │  │
│  │                                      │  │
│  │  Size: ~5-15 MB  ·  Time: 5-15 min   │  │
│  │                                      │  │
│  │            [ SELECT ]                │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │  ⚡ LEARNING CONTENT ONLY            │  │
│  │                                      │  │
│  │  Only meaningful teaching content.   │  │
│  │  Stripped of Canvas chrome, filtered │  │
│  │  for concept extraction, optimized   │  │
│  │  for Neural Forge quality.           │  │
│  │                                      │  │
│  │  Best for: Building your AEONTHRA    │  │
│  │  workspace with coherent content.    │  │
│  │                                      │  │
│  │  Size: ~300KB-1.5MB  ·  Time: 3-10min│  │
│  │                                      │  │
│  │            [ SELECT ]                │  │
│  └──────────────────────────────────────┘  │
│                                            │
│   💡 Not sure? Learning Content is         │
│      recommended for most students.        │
│                                            │
└────────────────────────────────────────────┘
```

Card styling:

```css
.mode-card {
  padding: var(--space-5);
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  cursor: pointer;
  transition: all 400ms cubic-bezier(0.22, 1, 0.36, 1);
}

.mode-card:hover {
  border-color: rgba(0, 240, 255, 0.4);
  transform: translateY(-2px);
  box-shadow: 0 0 30px rgba(0, 240, 255, 0.15);
}

.mode-card[data-selected="true"] {
  border-color: var(--cyan);
  background: rgba(0, 240, 255, 0.03);
  box-shadow: 0 0 40px rgba(0, 240, 255, 0.2);
}

.mode-card__icon {
  font-size: 1.4rem;
  margin-bottom: var(--space-2);
}

.mode-card__title {
  font-family: 'Orbitron', sans-serif;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--cyan);
  letter-spacing: 0.08em;
  margin-bottom: var(--space-3);
}

.mode-card__desc {
  font-size: 0.8rem;
  color: var(--text-secondary);
  line-height: 1.5;
  margin-bottom: var(--space-3);
}

.mode-card__meta {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.65rem;
  color: var(--text-muted);
  padding-top: var(--space-3);
  border-top: 1px solid var(--border);
}

.mode-card__select {
  display: block;
  margin-top: var(--space-4);
  background: linear-gradient(135deg, #00f0ff, #0080ff);
  color: #000;
  border: none;
  padding: var(--space-3);
  border-radius: 8px;
  font-family: 'Orbitron', sans-serif;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  width: 100%;
  cursor: pointer;
  text-transform: uppercase;
}
```

---

## 3. THE AUTO-CAPTURE ENGINE

This is the intelligence that walks the course automatically. No manual clicking, no per-page prompts, no friction.

### 3.1 Architecture overview

```
┌─────────────────────────────────────────────────────────┐
│                  SERVICE WORKER                         │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │           Orchestrator                           │   │
│  │  - Detects course context                        │   │
│  │  - Builds visit queue                            │   │
│  │  - Manages capture tabs                          │   │
│  │  - Tracks progress                               │   │
│  │  - Handles rate limiting                         │   │
│  └──────────┬───────────────────────────────────────┘   │
│             │                                           │
│             ▼                                           │
│  ┌──────────────────────────────────────────────────┐   │
│  │           Visit Queue                            │   │
│  │  [modules, syllabus, assignments, discussions,   │   │
│  │   pages, quizzes, files, announcements]          │   │
│  └──────────┬───────────────────────────────────────┘   │
│             │                                           │
│             ▼                                           │
│  ┌──────────────────────────────────────────────────┐   │
│  │           Capture Controller                     │   │
│  │  - Opens each URL in dedicated tab               │   │
│  │  - Waits for page render stability               │   │
│  │  - Injects expand script (opens collapsed UI)    │   │
│  │  - Runs extractor for that page type             │   │
│  │  - Collects result                               │   │
│  │  - Closes tab                                    │   │
│  │  - Applies inter-request delay                   │   │
│  └──────────┬───────────────────────────────────────┘   │
│             │                                           │
│             ▼                                           │
│  ┌──────────────────────────────────────────────────┐   │
│  │           Result Assembler                       │   │
│  │  - Merges captures by type                       │   │
│  │  - Applies mode-specific filtering               │   │
│  │  - Builds final JSON payload                     │   │
│  │  - Persists to chrome.storage.local              │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
         │                               │
         ▼                               ▼
┌──────────────────┐            ┌──────────────────┐
│  CONTENT SCRIPTS │            │  SIDE PANEL UI   │
│  (per page type) │            │  (live progress) │
└──────────────────┘            └──────────────────┘
```

### 3.2 Discovery Phase (before visiting any pages)

When the student clicks "Capture Entire Course," the orchestrator first discovers what's in the course without visiting every page.

**Step 1: Detect course context**

```typescript
async function detectCourseContext(): Promise<CourseContext> {
  const tab = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab[0]?.url || '';
  const match = url.match(/\/courses\/(\d+)/);
  
  if (!match) {
    throw new Error('Not on a Canvas course page. Navigate to a Canvas course first.');
  }
  
  const courseId = match[1];
  const origin = new URL(url).origin;
  
  // Fetch course metadata from the course home page
  const homeResponse = await fetch(`${origin}/courses/${courseId}`, { credentials: 'include' });
  const homeHtml = await homeResponse.text();
  
  // Parse course name from the HTML
  const nameMatch = homeHtml.match(/<h2[^>]*class="[^"]*course-title[^"]*"[^>]*>([^<]+)<\/h2>/i);
  const titleMatch = homeHtml.match(/<title>([^<]+)<\/title>/);
  
  return {
    courseId,
    origin,
    name: nameMatch?.[1]?.trim() || titleMatch?.[1]?.split('-')[0]?.trim() || 'Unknown Course',
    baseUrl: `${origin}/courses/${courseId}`,
  };
}
```

**Step 2: Discover all module items via the Canvas API**

Canvas exposes a read-only API for logged-in students. The extension uses this for discovery (fast) before switching to DOM scraping (slow but complete):

```typescript
async function discoverCourseStructure(ctx: CourseContext): Promise<CourseStructure> {
  const discoveries: CourseStructure = {
    modules: [],
    assignments: [],
    discussions: [],
    quizzes: [],
    pages: [],
    files: [],
    announcements: [],
    syllabus: null,
    urls: new Set<string>(),
  };
  
  // Modules API
  try {
    const modulesRes = await fetch(`${ctx.baseUrl}/modules?include[]=items&per_page=100`, {
      headers: { 'Accept': 'application/json+canvas-string-ids, application/json' },
      credentials: 'include',
    });
    if (modulesRes.ok) {
      const modules = await modulesRes.json();
      discoveries.modules = modules;
      // Collect all module item URLs
      for (const mod of modules) {
        for (const item of mod.items || []) {
          if (item.html_url) discoveries.urls.add(item.html_url);
        }
      }
    }
  } catch (e) {
    console.warn('Modules API failed, falling back to DOM discovery');
    // Fallback: visit /modules and scrape the DOM
  }
  
  // Assignments API
  try {
    const assignRes = await fetch(`${ctx.baseUrl}/assignments?per_page=100`, {
      headers: { 'Accept': 'application/json' },
      credentials: 'include',
    });
    if (assignRes.ok) {
      discoveries.assignments = await assignRes.json();
      discoveries.assignments.forEach(a => discoveries.urls.add(a.html_url));
    }
  } catch {}
  
  // Discussions API
  try {
    const discRes = await fetch(`${ctx.baseUrl}/discussion_topics?per_page=100`, {
      credentials: 'include',
    });
    if (discRes.ok) {
      discoveries.discussions = await discRes.json();
      discoveries.discussions.forEach(d => discoveries.urls.add(d.html_url));
    }
  } catch {}
  
  // Quizzes API (both old and new quizzes)
  try {
    const quizRes = await fetch(`${ctx.baseUrl}/quizzes?per_page=100`, {
      credentials: 'include',
    });
    if (quizRes.ok) {
      discoveries.quizzes = await quizRes.json();
      discoveries.quizzes.forEach(q => discoveries.urls.add(q.html_url));
    }
  } catch {}
  
  // Pages API
  try {
    const pagesRes = await fetch(`${ctx.baseUrl}/pages?per_page=100`, {
      credentials: 'include',
    });
    if (pagesRes.ok) {
      discoveries.pages = await pagesRes.json();
      discoveries.pages.forEach(p => discoveries.urls.add(`${ctx.baseUrl}/pages/${p.url}`));
    }
  } catch {}
  
  // Files (metadata only, not actual file downloads)
  try {
    const filesRes = await fetch(`${ctx.baseUrl}/files?per_page=100`, {
      credentials: 'include',
    });
    if (filesRes.ok) {
      discoveries.files = await filesRes.json();
    }
  } catch {}
  
  // Announcements
  try {
    const annRes = await fetch(`${ctx.origin}/api/v1/announcements?context_codes[]=course_${ctx.courseId}&per_page=100`, {
      credentials: 'include',
    });
    if (annRes.ok) {
      discoveries.announcements = await annRes.json();
    }
  } catch {}
  
  // Syllabus (from course settings)
  try {
    const syllRes = await fetch(`${ctx.baseUrl}?include[]=syllabus_body`, {
      headers: { 'Accept': 'application/json' },
      credentials: 'include',
    });
    if (syllRes.ok) {
      const course = await syllRes.json();
      discoveries.syllabus = course.syllabus_body;
    }
  } catch {}
  
  return discoveries;
}
```

**Step 3: Present discovery summary before capture**

After discovery (which takes 2-5 seconds), the extension shows the student what it found and asks for confirmation:

```
┌────────────────────────────────────────────┐
│                                            │
│       DETECTED: PHI 208 · Ethics           │
│                                            │
│  Found in this course:                     │
│                                            │
│  📚  8 Modules                             │
│  📝  47 Assignments                        │
│  💬  12 Discussions                        │
│  ❓  8 Quizzes                             │
│  📄  23 Pages                              │
│  📎  31 Files                              │
│  📢  4 Announcements                       │
│  📋  1 Syllabus                            │
│                                            │
│  ─────────────────────────                 │
│  Total items to capture: 134               │
│  Estimated time: 7-10 min                  │
│  Estimated size: ~8 MB                     │
│                                            │
│  ┌────────────────────────────────────┐    │
│  │   ⚡ START CAPTURE                 │    │
│  └────────────────────────────────────┘    │
│                                            │
│           or customize scope ↓             │
│                                            │
└────────────────────────────────────────────┘
```

### 3.3 Capture Phase (the actual visiting)

Once the student confirms, the orchestrator walks the visit queue. Key behaviors:

**3.3.1 Dedicated capture tab**

Rather than taking over the student's current tab (disruptive), the orchestrator opens ONE dedicated capture tab that it navigates through the course:

```typescript
async function runCaptureQueue(queue: string[], mode: CaptureMode): Promise<CaptureResult> {
  // Open dedicated capture tab (or reuse existing one)
  let captureTab = await chrome.tabs.create({
    url: queue[0],
    active: false, // don't steal focus from student
    pinned: true,
  });
  
  const results: CaptureResult = { items: [], errors: [] };
  
  for (let i = 0; i < queue.length; i++) {
    const url = queue[i];
    
    // Navigate tab
    await chrome.tabs.update(captureTab.id!, { url });
    
    // Wait for page load
    await waitForTabComplete(captureTab.id!);
    
    // Wait for Canvas React to finish rendering
    await sleep(800); // initial settle
    
    // Inject expander script to open all collapsed UI
    await chrome.scripting.executeScript({
      target: { tabId: captureTab.id! },
      func: expandAllHiddenContent,
    });
    
    // Wait for expansions to finish
    await sleep(500);
    
    // Run the extractor for this page type
    const [extraction] = await chrome.scripting.executeScript({
      target: { tabId: captureTab.id! },
      func: extractPageContent,
      args: [mode],
    });
    
    if (extraction?.result) {
      results.items.push(extraction.result);
    } else {
      results.errors.push({ url, reason: 'Extraction returned empty' });
    }
    
    // Progress update to side panel
    broadcastProgress({
      current: i + 1,
      total: queue.length,
      currentUrl: url,
      currentTitle: extraction?.result?.title || 'Processing...',
      captured: results.items.length,
      failed: results.errors.length,
    });
    
    // Rate limit: 400-800ms between requests to avoid triggering Canvas rate limiter
    await sleep(500 + Math.random() * 300);
  }
  
  // Close capture tab
  await chrome.tabs.remove(captureTab.id!);
  
  return results;
}
```

**3.3.2 The expander script (opens hidden content)**

This is critical. Canvas hides tons of content behind accordions, tabs, and "Show More" buttons. Before extraction, every hideable element must be expanded:

```typescript
function expandAllHiddenContent() {
  // 1. Click all accordion headers that are collapsed
  const accordions = document.querySelectorAll(
    '.collapse-btn, [aria-expanded="false"], .ic-accordion-link, ' +
    '[data-testid="toggle-content"], .show-more, .expand'
  );
  accordions.forEach((el: any) => {
    try { el.click(); } catch {}
  });
  
  // 2. Expand all discussion replies
  const replyExpanders = document.querySelectorAll(
    '.discussion-replies .replies .load-more, ' +
    '[data-testid="expand-replies"], ' +
    '.discussion_entry .show-replies'
  );
  replyExpanders.forEach((el: any) => {
    try { el.click(); } catch {}
  });
  
  // 3. Expand all module sections
  const moduleToggles = document.querySelectorAll('.context_module .collapse_module_link[aria-expanded="false"]');
  moduleToggles.forEach((el: any) => {
    try { el.click(); } catch {}
  });
  
  // 4. Expand all rubric details
  const rubricToggles = document.querySelectorAll('.toggle_full_rubric, [data-testid="rubric-expand"]');
  rubricToggles.forEach((el: any) => {
    try { el.click(); } catch {}
  });
  
  // 5. Open all tabs (activate tab panels to reveal content)
  const tabs = document.querySelectorAll('[role="tab"]');
  const tabContents: string[] = [];
  tabs.forEach((tab: any, idx: number) => {
    try {
      tab.click();
      // Capture tab content after click
      setTimeout(() => {
        const panel = document.querySelector(`[role="tabpanel"][aria-labelledby="${tab.id}"]`);
        if (panel) tabContents.push(panel.textContent || '');
      }, 100);
    } catch {}
  });
  
  // 6. Auto-scroll to trigger lazy loading
  return new Promise<void>((resolve) => {
    let scrollY = 0;
    const scrollStep = 300;
    const scrollInterval = setInterval(() => {
      window.scrollTo(0, scrollY);
      scrollY += scrollStep;
      if (scrollY > document.body.scrollHeight) {
        clearInterval(scrollInterval);
        window.scrollTo(0, 0); // return to top
        resolve();
      }
    }, 100);
  });
}
```

**3.3.3 Per-page-type extractors**

After expansion, the extractor runs. The extractor detects page type from URL and runs the appropriate logic. See Section 4 for the full extractor specifications.

**3.3.4 Rate limiting and etiquette**

- Inter-request delay: 500-800ms randomized
- If Canvas returns HTTP 429 (rate limited), back off exponentially: 2s, 4s, 8s
- If Canvas returns HTTP 5xx, retry up to 3 times then log error and move on
- Respect robots.txt-style courtesy: never fetch faster than 2 requests per second
- If user pauses or cancels, finish current request cleanly and stop

**3.3.5 Progress reporting**

During capture, the side panel shows a live progress view:

```
┌────────────────────────────────────────────┐
│                                            │
│          CAPTURING COURSE                  │
│                                            │
│              ╱ 73% ╲                       │
│             ╱       ╲                      │
│            │   ⚡    │     (animated      │
│             ╲       ╱       orbital)      │
│              ╲_____╱                       │
│                                            │
│   98 of 134 items captured                 │
│                                            │
│  ████████████████████░░░░░░░  73%          │
│                                            │
│  Currently:                                │
│  Module 4 - Reflection Activity            │
│                                            │
│  ─────────────────────────                 │
│                                            │
│  ✅ Captured: 98                           │
│  ⚠️  Skipped: 3 (no content)                │
│  ❌ Failed: 0                              │
│                                            │
│  ⏱ Elapsed: 4m 23s                         │
│  ⏱ Remaining: ~2m 15s                      │
│                                            │
│  [ ⏸ PAUSE ]  [ ✕ CANCEL ]                 │
│                                            │
└────────────────────────────────────────────┘
```

The progress is updated via `chrome.runtime.sendMessage` from service worker to side panel on every item completion.

---

## 4. DEEP EXTRACTION PER PAGE TYPE

Each page type has a dedicated extractor optimized for that content. These run after the expander script, so all collapsed content is already visible.

### 4.1 Assignment Extractor

```typescript
function extractAssignment(mode: CaptureMode): CapturedAssignment {
  const extract = (selector: string, property: 'text' | 'html' = 'text') => {
    const el = document.querySelector(selector);
    if (!el) return '';
    return property === 'html' ? el.innerHTML : (el.textContent?.trim() || '');
  };
  
  // Title
  const title = extract('h1.title, h1[class*="title"], [data-testid="assignment-title"]');
  
  // Due date - try multiple selectors, Canvas varies
  const dueDateText = extract(
    '.assignment-date-due .date_text, [data-testid="due-date"], .due_at'
  );
  const dueDate = parseCanvasDate(dueDateText);
  
  // Available / lock dates
  const availableDateText = extract('[data-testid="available-from"], .available_from');
  const lockDateText = extract('[data-testid="lock-at"], .lock_at');
  
  // Points
  const pointsText = extract('.points_possible, [data-testid="points-possible"]');
  const pointsPossible = parseFloat(pointsText.match(/[\d.]+/)?.[0] || '0');
  
  // Description — the actual assignment content
  const descEl = document.querySelector('.user_content.enhanced, [data-testid="assignment-description"], #assignment_show .description');
  const descriptionHtml = descEl?.innerHTML || '';
  const descriptionText = descEl?.textContent?.trim() || '';
  
  // Submission types (from the page state)
  const submissionTypes: string[] = [];
  document.querySelectorAll('.submission_types .submission_type, [data-testid="submission-types"] li').forEach(el => {
    const t = el.textContent?.trim().toLowerCase();
    if (t) submissionTypes.push(t);
  });
  
  // Rubric extraction (deep)
  const rubric = extractRubric();
  
  // Linked resources (links within the description)
  const linkedResources = extractLinkedResources(descEl);
  
  // Attached files
  const attachedFiles = extractAttachedFiles();
  
  // Student's submission status (if visible)
  const submissionStatus = extractSubmissionStatus();
  
  // Grade (if already graded)
  const gradeEl = document.querySelector('.grade_info, [data-testid="grade"]');
  const grade = gradeEl?.textContent?.trim() || null;
  
  const base = {
    id: new URL(location.href).pathname.match(/\/assignments\/(\d+)/)?.[1] || '',
    courseId: new URL(location.href).pathname.match(/\/courses\/(\d+)/)?.[1] || '',
    type: 'assignment' as const,
    title,
    dueDate,
    availableDate: parseCanvasDate(availableDateText),
    lockDate: parseCanvasDate(lockDateText),
    pointsPossible,
    descriptionText,
    submissionTypes,
    rubric,
    linkedResources,
    attachedFiles,
    submissionStatus,
    grade,
    capturedAt: Date.now(),
    sourceUrl: location.href,
  };
  
  if (mode === 'complete') {
    return { ...base, descriptionHtml, rawHtml: document.documentElement.outerHTML };
  }
  
  // Learning content mode: strip HTML, apply chrome filter
  return {
    ...base,
    descriptionText: applyContentFilter(descriptionText),
  };
}

function extractRubric(): RubricCriterion[] | null {
  const rubricTable = document.querySelector('table.rubric_table, [data-testid="rubric-assessment-table"]');
  if (!rubricTable) return null;
  
  const criteria: RubricCriterion[] = [];
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
    
    if (name || ratings.length > 0) {
      criteria.push({ name, longDescription: longDesc, ratings });
    }
  });
  
  return criteria.length > 0 ? criteria : null;
}
```

### 4.2 Discussion Extractor

```typescript
function extractDiscussion(mode: CaptureMode): CapturedDiscussion {
  const title = document.querySelector('h1, .discussion-title, [data-testid="discussion-topic-title"]')?.textContent?.trim() || '';
  
  // The discussion prompt (the instructor's original post)
  const promptEl = document.querySelector('.message_wrapper .message .user_content, [data-testid="discussion-topic-message"], .discussion-header .user_content');
  const promptHtml = promptEl?.innerHTML || '';
  const promptText = promptEl?.textContent?.trim() || '';
  
  // Due date
  const dueDateText = document.querySelector('.due_date_display, [data-testid="due-date"]')?.textContent || '';
  const dueDate = parseCanvasDate(dueDateText);
  
  // Points
  const pointsText = document.querySelector('.discussion-points, [data-testid="points-possible"]')?.textContent || '';
  const pointsPossible = parseFloat(pointsText.match(/[\d.]+/)?.[0] || '0');
  
  // Reply requirements (parsed from the prompt text)
  const replyMatch = promptText.match(/respond to (?:at least )?(\d+)/i);
  const wordCountMatch = promptText.match(/(\d+)[\s-]*words?/i);
  
  const base = {
    id: new URL(location.href).pathname.match(/\/discussion_topics\/(\d+)/)?.[1] || '',
    courseId: new URL(location.href).pathname.match(/\/courses\/(\d+)/)?.[1] || '',
    type: 'discussion' as const,
    title,
    dueDate,
    pointsPossible,
    promptText,
    repliesRequired: replyMatch ? parseInt(replyMatch[1]) : 0,
    wordCountTarget: wordCountMatch ? parseInt(wordCountMatch[1]) : null,
    linkedResources: extractLinkedResources(promptEl),
    capturedAt: Date.now(),
    sourceUrl: location.href,
  };
  
  if (mode === 'complete') {
    // Also capture all replies for the complete snapshot
    const replies: DiscussionReply[] = [];
    document.querySelectorAll('.discussion_entry, [data-testid="discussion-entry"]').forEach((replyEl) => {
      const author = replyEl.querySelector('.author, [data-testid="author"]')?.textContent?.trim() || '';
      const content = replyEl.querySelector('.message .user_content, [data-testid="message"]')?.textContent?.trim() || '';
      const timestamp = replyEl.querySelector('.discussion-pubdate, [data-testid="pubdate"]')?.textContent?.trim() || '';
      if (content) replies.push({ author, content, timestamp });
    });
    
    return { ...base, promptHtml, replies, rawHtml: document.documentElement.outerHTML };
  }
  
  // Learning mode: no replies, no raw HTML
  return { ...base, promptText: applyContentFilter(promptText) };
}
```

### 4.3 Quiz Extractor

```typescript
function extractQuiz(mode: CaptureMode): CapturedQuiz {
  const title = document.querySelector('h1, .quiz-header__title, [data-testid="quiz-title"]')?.textContent?.trim() || '';
  
  // Quiz instructions (the description)
  const descEl = document.querySelector('.description, .quiz-description, [data-testid="quiz-description"]');
  const descriptionText = descEl?.textContent?.trim() || '';
  const descriptionHtml = descEl?.innerHTML || '';
  
  // Metadata
  const pointsText = document.querySelector('.points_possible, [data-testid="points-possible"]')?.textContent || '';
  const timeLimitText = document.querySelector('.time_limit, [data-testid="time-limit"]')?.textContent || '';
  const attemptsText = document.querySelector('.allowed_attempts, [data-testid="allowed-attempts"]')?.textContent || '';
  const questionCountText = document.querySelector('.question_count, [data-testid="question-count"]')?.textContent || '';
  const dueDateText = document.querySelector('.due_at, [data-testid="due-date"]')?.textContent || '';
  
  // Quiz rules/settings shown on the entry page
  const rules: string[] = [];
  document.querySelectorAll('.quiz-details li, [data-testid="quiz-rules"] li').forEach(el => {
    const r = el.textContent?.trim();
    if (r) rules.push(r);
  });
  
  const base = {
    id: new URL(location.href).pathname.match(/\/quizzes\/(\d+)/)?.[1] || '',
    courseId: new URL(location.href).pathname.match(/\/courses\/(\d+)/)?.[1] || '',
    type: 'quiz' as const,
    title,
    descriptionText,
    questionCount: parseInt(questionCountText.match(/\d+/)?.[0] || '0'),
    timeLimit: parseInt(timeLimitText.match(/\d+/)?.[0] || '0'),
    allowedAttempts: parseInt(attemptsText.match(/\d+/)?.[0] || '1'),
    pointsPossible: parseFloat(pointsText.match(/[\d.]+/)?.[0] || '0'),
    dueDate: parseCanvasDate(dueDateText),
    rules,
    capturedAt: Date.now(),
    sourceUrl: location.href,
  };
  
  if (mode === 'complete') {
    return { ...base, descriptionHtml, rawHtml: document.documentElement.outerHTML };
  }
  
  return { ...base, descriptionText: applyContentFilter(descriptionText) };
}
```

### 4.4 Page Extractor (for wiki pages)

```typescript
function extractPage(mode: CaptureMode): CapturedPage {
  const title = document.querySelector('h1, .page-title, [data-testid="wiki-page-title"]')?.textContent?.trim() || '';
  
  // Main page content
  const contentEl = document.querySelector('.show-content, .user_content.enhanced, [data-testid="wiki-page-body"], #wiki_page_show');
  const contentHtml = contentEl?.innerHTML || '';
  const contentText = contentEl?.textContent?.trim() || '';
  
  // Last edited info
  const editInfo = document.querySelector('.last-edit, [data-testid="last-edit"]')?.textContent?.trim() || '';
  
  // Extract all embedded media
  const embeds: MediaEmbed[] = [];
  contentEl?.querySelectorAll('iframe').forEach((iframe: HTMLIFrameElement) => {
    embeds.push({
      type: 'iframe',
      src: iframe.src,
      title: iframe.title || '',
    });
  });
  contentEl?.querySelectorAll('video').forEach((video: HTMLVideoElement) => {
    embeds.push({
      type: 'video',
      src: video.src || video.querySelector('source')?.src || '',
      title: video.title || '',
    });
  });
  
  const base = {
    id: new URL(location.href).pathname.match(/\/pages\/([^\/\?]+)/)?.[1] || '',
    courseId: new URL(location.href).pathname.match(/\/courses\/(\d+)/)?.[1] || '',
    type: 'page' as const,
    title,
    contentText,
    embeds,
    linkedResources: extractLinkedResources(contentEl),
    editInfo,
    capturedAt: Date.now(),
    sourceUrl: location.href,
  };
  
  if (mode === 'complete') {
    return { ...base, contentHtml, rawHtml: document.documentElement.outerHTML };
  }
  
  return { ...base, contentText: applyContentFilter(contentText) };
}
```

### 4.5 Module Structure Extractor

```typescript
function extractModules(mode: CaptureMode): CapturedModule[] {
  const modules: CapturedModule[] = [];
  
  document.querySelectorAll('.context_module').forEach((modEl) => {
    const id = modEl.id.replace('context_module_', '');
    const name = modEl.querySelector('.name, .header .collapse_module_link')?.textContent?.trim() || '';
    const items: ModuleItem[] = [];
    
    modEl.querySelectorAll('.context_module_item').forEach((itemEl) => {
      const itemId = itemEl.id.replace('context_module_item_', '');
      const title = itemEl.querySelector('.item_name .title, .title')?.textContent?.trim() || '';
      const href = itemEl.querySelector('a.ig-title')?.getAttribute('href') || '';
      
      // Detect item type
      let itemType: ModuleItemType = 'unknown';
      const classList = Array.from(itemEl.classList);
      if (classList.includes('Assignment')) itemType = 'assignment';
      else if (classList.includes('Discussion')) itemType = 'discussion';
      else if (classList.includes('Quiz')) itemType = 'quiz';
      else if (classList.includes('File')) itemType = 'file';
      else if (classList.includes('Page') || classList.includes('WikiPage')) itemType = 'page';
      else if (classList.includes('ExternalUrl')) itemType = 'external';
      else if (classList.includes('ExternalTool')) itemType = 'external-tool';
      else if (classList.includes('SubHeader')) itemType = 'header';
      
      // Completion status
      const completionIcon = itemEl.querySelector('.ig-row__completion .ig-row__completion-icon');
      const completionStatus = completionIcon?.getAttribute('title') || 'unknown';
      
      // Completion requirement
      const reqEl = itemEl.querySelector('.requirement_type');
      const completionRequirement = reqEl?.textContent?.trim() || null;
      
      // Points (if applicable)
      const pointsText = itemEl.querySelector('.points_possible_display')?.textContent?.trim() || '';
      const points = parseFloat(pointsText.match(/[\d.]+/)?.[0] || '0') || null;
      
      // Due date (if applicable)
      const dueDateText = itemEl.querySelector('.due_date_display')?.textContent?.trim() || '';
      
      items.push({
        id: itemId,
        title,
        type: itemType,
        url: href ? new URL(href, location.href).href : null,
        completionStatus,
        completionRequirement,
        points,
        dueDateText,
      });
    });
    
    modules.push({
      id,
      courseId: new URL(location.href).pathname.match(/\/courses\/(\d+)/)?.[1] || '',
      name,
      items,
      capturedAt: Date.now(),
    });
  });
  
  return modules;
}
```

### 4.6 File list Extractor

```typescript
function extractFiles(mode: CaptureMode): CapturedFile[] {
  const files: CapturedFile[] = [];
  
  // Canvas files page uses virtualized list; query all visible and scrollable
  document.querySelectorAll('.ef-item-row, [data-testid="file-row"]').forEach((row) => {
    const name = row.querySelector('.ef-name-col__text, [data-testid="file-name"]')?.textContent?.trim() || '';
    const size = row.querySelector('.ef-size-col, [data-testid="file-size"]')?.textContent?.trim() || '';
    const modified = row.querySelector('.ef-date-modified-col, [data-testid="date-modified"]')?.textContent?.trim() || '';
    const modifiedBy = row.querySelector('.ef-modified-by-col, [data-testid="modified-by"]')?.textContent?.trim() || '';
    const downloadLink = row.querySelector('a.ef-name-col__link')?.getAttribute('href') || '';
    
    files.push({
      name,
      size,
      modified,
      modifiedBy,
      downloadUrl: downloadLink ? new URL(downloadLink, location.href).href : '',
    });
  });
  
  return files;
}
```

### 4.7 Syllabus Extractor

```typescript
function extractSyllabus(mode: CaptureMode): CapturedSyllabus {
  const contentEl = document.querySelector('#course_syllabus, .user_content.enhanced, [data-testid="syllabus-body"]');
  const html = contentEl?.innerHTML || '';
  const text = contentEl?.textContent?.trim() || '';
  
  // Also extract the assignment schedule table (Canvas auto-generates this)
  const scheduleTable = document.querySelector('.events_list, [data-testid="syllabus-schedule"]');
  const scheduledEvents: ScheduledEvent[] = [];
  scheduleTable?.querySelectorAll('tr').forEach((row) => {
    const date = row.querySelector('.date')?.textContent?.trim() || '';
    const title = row.querySelector('.name')?.textContent?.trim() || '';
    if (date || title) scheduledEvents.push({ date, title });
  });
  
  const base = {
    courseId: new URL(location.href).pathname.match(/\/courses\/(\d+)/)?.[1] || '',
    type: 'syllabus' as const,
    text,
    scheduledEvents,
    capturedAt: Date.now(),
    sourceUrl: location.href,
  };
  
  if (mode === 'complete') {
    return { ...base, html, rawHtml: document.documentElement.outerHTML };
  }
  
  return { ...base, text: applyContentFilter(text) };
}
```

### 4.8 Content Filter (applied in Learning Content Only mode)

```typescript
function applyContentFilter(rawText: string): string {
  if (!rawText) return '';
  
  // 1. Split into blocks
  const blocks = rawText.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);
  
  // 2. Filter each block
  const goodBlocks = blocks.filter(block => {
    const wordCount = block.split(/\s+/).length;
    
    // Too short
    if (wordCount < 8) return false;
    
    // Chrome patterns
    if (CHROME_PATTERNS.some(p => p.test(block))) return false;
    
    // Chrome blocklist
    const blockLower = block.toLowerCase();
    if (CANVAS_CHROME_BLOCKLIST.has(blockLower)) return false;
    
    // Pure navigation
    if (/^(next|previous|back|home|return|view|click|tap)\b/i.test(block)) return false;
    
    // "Links to an external site" etc.
    if (/links? to an external site/i.test(block)) return false;
    
    // Transcript/download boilerplate
    if (/^(transcript|download|watch|view)\b/i.test(block) && wordCount < 15) return false;
    
    return true;
  });
  
  // 3. Deduplicate (module navigation often repeats)
  const seen = new Set<string>();
  const deduped = goodBlocks.filter(block => {
    const normalized = block.toLowerCase().replace(/\s+/g, ' ').trim();
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
  
  return deduped.join('\n\n');
}

const CHROME_PATTERNS = [
  /^(module|item|quiz|assignment)\s+\d+/i,
  /^(mark (as )?done|to do)/i,
  /^\s*\|/, // pipe-separated nav
  /^(home|dashboard|calendar|inbox|help)$/i,
  /^(jump to|skip to)\b/i,
];
```

---

## 5. THE EXTENSION UI VIEWS

The side panel contains a stack of views that transition based on state. All views use the same layout shell.

### 5.1 State machine

```typescript
type ExtensionState = 
  | 'idle'               // no Canvas tab open
  | 'detecting'          // scanning current Canvas page for course context
  | 'course-detected'    // ready to start, showing course info
  | 'discovering'        // running discovery API calls
  | 'discovery-complete' // showing discovery summary, waiting for mode selection
  | 'mode-selection'     // student choosing Complete vs Learning
  | 'capturing'          // active auto-capture in progress
  | 'paused'             // student paused the capture
  | 'complete'           // capture finished, showing results
  | 'error'              // capture failed
  | 'history';           // viewing previous captures
```

Each state maps to a view component.

### 5.2 IDLE state — no Canvas tab

```
┌────────────────────────────────────────────┐
│  AEONTHRA                                  │
│  CAPTURE INTELLIGENCE                      │
├────────────────────────────────────────────┤
│                                            │
│                  ⚡                         │
│                                            │
│           No Canvas course                 │
│              detected.                     │
│                                            │
│   Navigate to any page of a Canvas         │
│   course and I'll detect it automatically. │
│                                            │
│                                            │
│  ┌──────────────────────────────────┐      │
│  │  📚  OPEN CAPTURE HISTORY        │      │
│  └──────────────────────────────────┘      │
│                                            │
│  ┌──────────────────────────────────┐      │
│  │  ⚙   SETTINGS                    │      │
│  └──────────────────────────────────┘      │
│                                            │
└────────────────────────────────────────────┘
```

### 5.3 COURSE DETECTED state

Shows immediately when the extension detects a Canvas URL. Confirms course name and prompts for next action.

```
┌────────────────────────────────────────────┐
│  AEONTHRA                                  │
│  CAPTURE INTELLIGENCE                      │
├────────────────────────────────────────────┤
│                                            │
│  COURSE DETECTED                           │
│  ┌──────────────────────────────────────┐  │
│  │  PHI 208                             │  │
│  │  Ethics and Moral Reasoning          │  │
│  │  Dr. Jane Naughton · Spring 2026     │  │
│  │  uagc.instructure.com                │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  ┌──────────────────────────────────┐      │
│  │  ⚡  CAPTURE ENTIRE COURSE        │      │
│  └──────────────────────────────────┘      │
│                                            │
│  ┌──────────────────────────────────┐      │
│  │  🎯  CAPTURE CURRENT PAGE ONLY    │      │
│  └──────────────────────────────────┘      │
│                                            │
│  ─────────────────────────                 │
│                                            │
│  📚 Previous captures (2)                  │
│  • Apr 5 - Full snapshot (8.2 MB)          │
│  • Mar 28 - Learning content (620 KB)      │
│                                            │
└────────────────────────────────────────────┘
```

### 5.4 DISCOVERY state

Shows the discovery summary table with all counts, estimated time/size, and the next action.

```
┌────────────────────────────────────────────┐
│  AEONTHRA                                  │
├────────────────────────────────────────────┤
│                                            │
│  ◀ Back                                    │
│                                            │
│  DETECTED: PHI 208 · Ethics                │
│                                            │
│  Scanning course structure...              │
│  ┌──────────────────────────────────────┐  │
│  │  ████████████████████████  Complete  │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  Found in this course:                     │
│                                            │
│  ┌──────┬───────────────┬──────────┐       │
│  │  📚  │  Modules      │      8   │       │
│  ├──────┼───────────────┼──────────┤       │
│  │  📝  │  Assignments  │     47   │       │
│  ├──────┼───────────────┼──────────┤       │
│  │  💬  │  Discussions  │     12   │       │
│  ├──────┼───────────────┼──────────┤       │
│  │  ❓  │  Quizzes      │      8   │       │
│  ├──────┼───────────────┼──────────┤       │
│  │  📄  │  Pages        │     23   │       │
│  ├──────┼───────────────┼──────────┤       │
│  │  📎  │  Files        │     31   │       │
│  ├──────┼───────────────┼──────────┤       │
│  │  📢  │  Announce.    │      4   │       │
│  ├──────┼───────────────┼──────────┤       │
│  │  📋  │  Syllabus     │      1   │       │
│  └──────┴───────────────┴──────────┘       │
│                                            │
│  Total items: 134                          │
│                                            │
│  ┌──────────────────────────────────┐      │
│  │   CHOOSE CAPTURE MODE →          │      │
│  └──────────────────────────────────┘      │
│                                            │
│  or customize scope ↓                      │
│                                            │
└────────────────────────────────────────────┘
```

The "customize scope" expandable shows a list of categories with checkboxes so the student can exclude specific types:

```
CUSTOMIZE SCOPE
┌──────────────────────────────────────────┐
│ ☑ Modules (8)                            │
│ ☑ Assignments (47)                       │
│ ☑ Discussions (12)                       │
│ ☑ Quizzes (8)                            │
│ ☑ Pages (23)                             │
│ ☐ Files (31)  — skip file metadata      │
│ ☑ Announcements (4)                      │
│ ☑ Syllabus (1)                           │
│                                          │
│ Capture will include 103 items.          │
└──────────────────────────────────────────┘
```

### 5.5 MODE SELECTION state

The full mode selection view from Section 2.3 of this document.

### 5.6 CAPTURING state (live progress)

The live progress view from Section 3.3.5 of this document. Key behaviors:

- Progress bar fills smoothly with gradient shimmer
- Currently-processing URL and title update in real time
- Captured / Skipped / Failed counts update live
- Elapsed and Remaining timers count with JetBrains Mono font
- Pause button suspends the queue until resumed
- Cancel button stops and shows partial results
- A mini indicator appears in the extension icon badge: "47%"

### 5.7 COMPLETE state — the money view

This is the most important view. When capture finishes, the student sees this:

```
┌────────────────────────────────────────────┐
│  AEONTHRA                                  │
├────────────────────────────────────────────┤
│                                            │
│            ✓  CAPTURE COMPLETE             │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │  PHI 208 · Ethics and Moral Reasoning│  │
│  │  Learning Content Only               │  │
│  │  Captured in 6m 42s                  │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  WHAT WAS CAPTURED                         │
│                                            │
│  ✅  47 assignments                        │
│  ✅  12 discussions                        │
│  ✅  8 quizzes                             │
│  ✅  23 pages                              │
│  ✅  8 modules                             │
│  ✅  4 announcements                       │
│  ✅  1 syllabus                            │
│  ⚠   3 items skipped (empty content)       │
│                                            │
│  📊  Total size: 612 KB                    │
│  🎯  Concepts detected: 156                │
│                                            │
│  ─────────────────────────                 │
│                                            │
│  ┌──────────────────────────────────┐      │
│  │  ⚡  OPEN IN AEONTHRA CLASSROOM  │      │
│  └──────────────────────────────────┘      │
│                                            │
│  ┌──────────────────────────────────┐      │
│  │  📥  DOWNLOAD JSON               │      │
│  └──────────────────────────────────┘      │
│                                            │
│  ┌──────────────────────────────────┐      │
│  │  💾  SAVE FOR LATER              │      │
│  └──────────────────────────────────┘      │
│                                            │
│  ─────────────────────────                 │
│                                            │
│  Run another capture:                      │
│  [ Full Snapshot ]  [ Another Course ]     │
│                                            │
└────────────────────────────────────────────┘
```

The success moment has a brief celebration animation:

```css
.complete-checkmark {
  width: 80px;
  height: 80px;
  margin: 0 auto var(--space-5);
  border-radius: 50%;
  background: rgba(0, 255, 136, 0.1);
  border: 2px solid var(--green);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
  color: var(--green);
  box-shadow: 0 0 40px rgba(0, 255, 136, 0.3);
  animation: 
    checkIn 600ms cubic-bezier(0.22, 1, 0.36, 1),
    pulseGlow 3s ease-in-out infinite 600ms;
}

@keyframes checkIn {
  0% { transform: scale(0) rotate(-180deg); opacity: 0; }
  60% { transform: scale(1.1) rotate(10deg); opacity: 1; }
  100% { transform: scale(1) rotate(0deg); opacity: 1; }
}
```

### 5.8 ERROR state

When something goes wrong, show a clear explanation and recovery options:

```
┌────────────────────────────────────────────┐
│  AEONTHRA                                  │
├────────────────────────────────────────────┤
│                                            │
│              ⚠  CAPTURE FAILED             │
│                                            │
│  The capture was interrupted at 43%.       │
│                                            │
│  Reason:                                   │
│  Canvas rate limit exceeded. The server    │
│  is asking us to slow down.                │
│                                            │
│  58 items were captured before the         │
│  interruption. You can:                    │
│                                            │
│  ┌──────────────────────────────────┐      │
│  │  💾 SAVE PARTIAL CAPTURE         │      │
│  └──────────────────────────────────┘      │
│                                            │
│  ┌──────────────────────────────────┐      │
│  │  ⏱  RETRY IN 2 MINUTES           │      │
│  └──────────────────────────────────┘      │
│                                            │
│  ┌──────────────────────────────────┐      │
│  │  🔧 OPEN SETTINGS                │      │
│  └──────────────────────────────────┘      │
│                                            │
└────────────────────────────────────────────┘
```

### 5.9 HISTORY state

Previous captures, with actions per entry:

```
┌────────────────────────────────────────────┐
│  CAPTURE HISTORY                           │
├────────────────────────────────────────────┤
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │ PHI 208 · Ethics                     │  │
│  │ Learning Content · 612 KB            │  │
│  │ Apr 9, 2026 · 11:43 PM               │  │
│  │                                      │  │
│  │ [ OPEN ]  [ EXPORT ]  [ DELETE ]     │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │ PSY 101 · Intro Psychology           │  │
│  │ Full Snapshot · 14.3 MB              │  │
│  │ Apr 2, 2026 · 2:15 PM                │  │
│  │                                      │  │
│  │ [ OPEN ]  [ EXPORT ]  [ DELETE ]     │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │ PHI 208 · Ethics                     │  │
│  │ Full Snapshot · 8.2 MB               │  │
│  │ Mar 28, 2026 · 7:30 PM               │  │
│  │                                      │  │
│  │ [ OPEN ]  [ EXPORT ]  [ DELETE ]     │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  Storage used: 23.1 MB / 100 MB            │
│                                            │
└────────────────────────────────────────────┘
```

---

## 6. THE HANDOFF TO AEONTHRA CLASSROOM

This is the critical path that moves captured data to the main app. Must be seamless.

### 6.1 Handoff flow

```
1. User clicks "OPEN IN AEONTHRA CLASSROOM" in the Complete view
2. Service worker checks if an AEONTHRA tab is already open
3a. If yes: focus that tab, send the capture payload via postMessage bridge
3b. If no: open https://[user].github.io/aeonthra/ in a new tab
4. Wait for the tab to fully load
5. Send the capture payload via chrome.tabs.sendMessage → content bridge → window.postMessage → React app
6. React app validates schema, writes to IndexedDB, triggers views to refresh
7. Toast notification in the main app: "Captured course loaded ✓"
8. Extension side panel updates to show: "Opened in AEONTHRA ✓"
```

### 6.2 Handoff code

```typescript
// service-worker.ts
async function handoffToAeonthra(capturePayload: CapturePayload): Promise<HandoffResult> {
  const AEONTHRA_URL_PATTERN = 'https://*.github.io/aeonthra/*';
  
  // Check for existing AEONTHRA tab
  const existingTabs = await chrome.tabs.query({ url: AEONTHRA_URL_PATTERN });
  
  let targetTab: chrome.tabs.Tab;
  
  if (existingTabs.length > 0) {
    targetTab = existingTabs[0];
    await chrome.tabs.update(targetTab.id!, { active: true });
    await chrome.windows.update(targetTab.windowId, { focused: true });
  } else {
    // Get the configured AEONTHRA URL from settings (student may self-host)
    const settings = await chrome.storage.local.get('aeonthraUrl');
    const aeonthraUrl = settings.aeonthraUrl || 'https://aeonthra.github.io/aeonthra/';
    targetTab = await chrome.tabs.create({ url: aeonthraUrl });
  }
  
  // Wait for tab to finish loading
  await waitForTabReady(targetTab.id!);
  
  // Additional settle time for React to mount
  await sleep(1500);
  
  // Send payload via chrome.tabs.sendMessage
  try {
    const response = await chrome.tabs.sendMessage(targetTab.id!, {
      type: 'AEONTHRA_CAPTURE_PAYLOAD',
      payload: capturePayload,
    });
    
    if (response?.received) {
      return { success: true, tabId: targetTab.id };
    }
    return { success: false, error: 'App did not acknowledge payload' };
  } catch (error: any) {
    // Bridge script might not be loaded yet
    return { success: false, error: `Handoff failed: ${error.message}` };
  }
}
```

### 6.3 The content bridge (runs on the AEONTHRA domain)

```typescript
// content-bridge.ts — injected into the github.io page
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'AEONTHRA_CAPTURE_PAYLOAD') {
    // Relay to the React app via window.postMessage
    window.postMessage(
      {
        source: 'AEONTHRA_EXT',
        type: 'CAPTURE_PAYLOAD',
        payload: msg.payload,
        timestamp: Date.now(),
      },
      location.origin
    );
    sendResponse({ received: true });
    return true;
  }
});

// Also inject a small "bridge loaded" indicator the React app can detect
window.postMessage({ source: 'AEONTHRA_EXT', type: 'BRIDGE_READY' }, location.origin);
```

### 6.4 The React receiver

```typescript
// apps/web/src/bridge/receive-capture.ts
export function initCaptureBridge(
  onReceive: (payload: CapturePayload) => Promise<void>
) {
  window.addEventListener('message', async (event) => {
    if (event.origin !== location.origin) return;
    if (event.data?.source !== 'AEONTHRA_EXT') return;
    
    if (event.data.type === 'CAPTURE_PAYLOAD') {
      try {
        await onReceive(event.data.payload);
        toast.success('Capture loaded from extension');
      } catch (error) {
        toast.error(`Failed to load capture: ${error.message}`);
      }
    }
  });
}
```

### 6.5 JSON download fallback

If the handoff fails OR the student prefers manual control, the Download JSON button triggers a direct file download from the extension:

```typescript
async function downloadCaptureAsJson(capture: CapturePayload, mode: CaptureMode) {
  const filename = `aeonthra-${capture.courseCode}-${mode}-${Date.now()}.json`;
  const json = JSON.stringify(capture, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  await chrome.downloads.download({
    url,
    filename,
    saveAs: true, // let the student choose location
  });
  
  // Clean up after a moment
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
```

The student can then drag the downloaded JSON onto the main app's import zone, which is the same ingestion path as the bridge.

### 6.6 Save for Later

Captures can be saved to `chrome.storage.local` and retrieved from History later:

```typescript
async function saveCaptureForLater(capture: CapturePayload) {
  const storageKey = `capture_${capture.courseId}_${Date.now()}`;
  
  // chrome.storage.local has a 10MB limit per item and ~100MB total quota
  // For large captures, check size first
  const size = JSON.stringify(capture).length;
  if (size > 9 * 1024 * 1024) {
    // Too large for storage.local; use IndexedDB instead
    await saveToIndexedDB(storageKey, capture);
  } else {
    await chrome.storage.local.set({ [storageKey]: capture });
  }
  
  // Also add to history index
  const { history = [] } = await chrome.storage.local.get('history');
  history.unshift({
    key: storageKey,
    courseCode: capture.courseCode,
    courseName: capture.courseName,
    mode: capture.mode,
    size,
    capturedAt: Date.now(),
  });
  await chrome.storage.local.set({ history: history.slice(0, 20) }); // keep last 20
}
```

---

## 7. THE JSON EXPORT SCHEMA

Both capture modes produce JSON that conforms to this schema. The schema is a superset — Complete Snapshot fills more fields, Learning Content leaves some empty or absent.

```typescript
interface CapturePayload {
  // Metadata
  version: "1.0";
  mode: "complete" | "learning";
  capturedAt: number;
  capturedBy: "aeonthra-extension";
  extensionVersion: string;
  
  // Course identity
  courseId: string;
  courseCode: string;     // "PHI 208"
  courseName: string;     // "Ethics and Moral Reasoning"
  instructor?: string;
  term?: string;
  origin: string;         // "uagc.instructure.com"
  baseUrl: string;        // full course URL
  
  // Content
  assignments: CapturedAssignment[];
  discussions: CapturedDiscussion[];
  quizzes: CapturedQuiz[];
  pages: CapturedPage[];
  modules: CapturedModule[];
  files: CapturedFile[];
  announcements: CapturedAnnouncement[];
  syllabus: CapturedSyllabus | null;
  
  // Capture statistics
  stats: {
    totalItemsVisited: number;
    totalItemsCaptured: number;
    totalItemsSkipped: number;
    totalItemsFailed: number;
    durationMs: number;
    sizeBytes: number;
  };
  
  // Errors and warnings
  warnings: Array<{ url: string; message: string }>;
  
  // Complete-mode-only fields
  rawHtmlArchive?: Record<string, string>; // url → full HTML
}
```

Every captured item includes `sourceUrl` for traceability. Learning mode items exclude `rawHtml`, `descriptionHtml`, and `html` fields. Complete mode includes everything.

---

## 8. SETTINGS PAGE

Accessible from the side panel footer or via `chrome://extensions` options link.

### 8.1 Setting categories

```
┌────────────────────────────────────────────┐
│  SETTINGS                                  │
├────────────────────────────────────────────┤
│                                            │
│  ⚡ CAPTURE                                 │
│                                            │
│  Default mode                              │
│  [ Learning Content Only ▾ ]               │
│                                            │
│  Inter-request delay                       │
│  [────●────] 500ms                         │
│  Slower = nicer to Canvas server           │
│                                            │
│  Auto-expand hidden content                │
│  [●─] ON                                   │
│                                            │
│  Include file metadata                     │
│  [●─] ON                                   │
│                                            │
│  Auto-handoff after capture                │
│  [─●] OFF                                  │
│  When ON, automatically opens AEONTHRA     │
│  after capture completes.                  │
│                                            │
│  ─────────────────────────                 │
│                                            │
│  🌐 HANDOFF                                │
│                                            │
│  AEONTHRA Classroom URL                    │
│  [ https://aeonthra.github.io/aeonthra/ ]  │
│  Change if you self-host AEONTHRA.         │
│                                            │
│  ─────────────────────────                 │
│                                            │
│  💾 STORAGE                                │
│                                            │
│  Used: 23.1 MB / 100 MB                    │
│  ████████░░░░░░░░░░░░░░░░░░                │
│                                            │
│  [ CLEAR ALL CAPTURES ]                    │
│                                            │
│  ─────────────────────────                 │
│                                            │
│  ℹ ABOUT                                   │
│                                            │
│  Version 1.0.0                             │
│  AEONTHRA Extension                        │
│  Local-first · Zero telemetry              │
│                                            │
└────────────────────────────────────────────┘
```

### 8.2 Settings schema

```typescript
interface ExtensionSettings {
  // Capture behavior
  defaultMode: 'complete' | 'learning';
  requestDelay: number; // ms between requests
  autoExpand: boolean;
  includeFileMetadata: boolean;
  autoHandoff: boolean;
  
  // Retries
  maxRetries: number;
  retryBackoffMs: number;
  
  // Handoff
  aeonthraUrl: string;
  
  // Advanced
  concurrentTabs: number; // default 1, power users can set 2
  excludeModuleItemTypes: string[]; // e.g. ['external-tool']
  
  // Theme (inherits from main app via postMessage on handoff)
  theme: 'default' | 'high-contrast';
  reduceMotion: boolean;
}
```

Settings persist in `chrome.storage.sync` so they roam across devices the student signs into.

---

## 9. TECHNICAL IMPLEMENTATION NOTES

### 9.1 Manifest V3 configuration

```json
{
  "manifest_version": 3,
  "name": "AEONTHRA Capture Intelligence",
  "version": "1.0.0",
  "description": "Auto-capture Canvas courses for deterministic learning in AEONTHRA.",
  "permissions": [
    "storage",
    "tabs",
    "scripting",
    "sidePanel",
    "downloads",
    "activeTab"
  ],
  "host_permissions": [
    "https://*.instructure.com/*",
    "https://canvas.*.edu/*",
    "https://*.canvas.edu/*",
    "https://*.github.io/*"
  ],
  "background": {
    "service_worker": "service-worker.js",
    "type": "module"
  },
  "side_panel": {
    "default_path": "side-panel.html"
  },
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon-16.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png"
    },
    "default_title": "AEONTHRA Capture"
  },
  "options_page": "options.html",
  "content_scripts": [
    {
      "matches": ["https://*.instructure.com/*", "https://canvas.*.edu/*", "https://*.canvas.edu/*"],
      "js": ["content-canvas.js"],
      "run_at": "document_idle"
    },
    {
      "matches": ["https://*.github.io/aeonthra/*"],
      "js": ["content-bridge.js"],
      "run_at": "document_idle"
    }
  ],
  "icons": {
    "16": "icons/icon-16.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  }
}
```

### 9.2 File structure

```
apps/extension/
├── manifest.json
├── service-worker.ts          # orchestrator, API calls, queue management
├── side-panel.html             # main UI entry
├── side-panel.ts              # React root for side panel
├── popup.html                  # quick popup
├── popup.ts                    # popup UI
├── options.html                # settings page
├── options.ts                  # settings UI
├── content-canvas.ts           # runs on Canvas, performs extraction
├── content-bridge.ts           # runs on github.io, relays to React app
│
├── src/
│   ├── engines/
│   │   ├── orchestrator.ts    # discovery + queue management
│   │   ├── discovery.ts       # Canvas API calls
│   │   ├── capture-controller.ts # tab navigation + extraction
│   │   ├── extractors/
│   │   │   ├── assignment.ts
│   │   │   ├── discussion.ts
│   │   │   ├── quiz.ts
│   │   │   ├── page.ts
│   │   │   ├── module.ts
│   │   │   ├── syllabus.ts
│   │   │   ├── file.ts
│   │   │   ├── announcement.ts
│   │   │   └── expander.ts    # expand-all-hidden script
│   │   ├── content-filter.ts  # Learning mode filtering
│   │   ├── handoff.ts         # send to AEONTHRA main app
│   │   └── storage.ts         # chrome.storage wrappers
│   │
│   ├── ui/
│   │   ├── views/
│   │   │   ├── Idle.tsx
│   │   │   ├── CourseDetected.tsx
│   │   │   ├── Discovery.tsx
│   │   │   ├── ModeSelection.tsx
│   │   │   ├── Capturing.tsx
│   │   │   ├── Complete.tsx
│   │   │   ├── Error.tsx
│   │   │   └── History.tsx
│   │   ├── primitives/
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── ProgressBar.tsx
│   │   │   ├── Stat.tsx
│   │   │   └── Wordmark.tsx
│   │   └── styles/
│   │       ├── tokens.css     # copied from main app
│   │       ├── global.css
│   │       └── animations.css
│   │
│   ├── state/
│   │   ├── extension-state.ts # state machine
│   │   ├── capture-store.ts   # current capture state
│   │   └── settings-store.ts
│   │
│   └── shared-types/           # types shared with main app
│       └── (imported from packages/shared-types)
│
└── public/
    └── icons/
        ├── icon-16.png
        ├── icon-48.png
        └── icon-128.png
```

### 9.3 Build configuration

Use Vite with the `@crxjs/vite-plugin` for hot reload during development:

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json';

export default defineConfig({
  plugins: [react(), crx({ manifest })],
  build: {
    rollupOptions: {
      input: {
        'side-panel': 'side-panel.html',
        popup: 'popup.html',
        options: 'options.html',
      },
    },
  },
});
```

### 9.4 Testing the extension

Development loop:
1. `pnpm run dev` in `apps/extension/`
2. Open `chrome://extensions`
3. Enable Developer Mode
4. Click "Load unpacked" → select `apps/extension/dist`
5. Navigate to a Canvas course
6. Click the AEONTHRA icon in the toolbar
7. Side panel opens — test all states

For integration testing, use a real Canvas sandbox account (many universities provide student sandbox accounts) OR use Canvas's public test instance at `https://canvas.instructure.com` with a free account.

---

## 10. UX GUARANTEES (THE EXPERIENCE PROMISE)

These are the behavioral guarantees the extension must meet. Each is testable.

1. **Zero-clicks-per-page.** After clicking "Capture Entire Course," the student does not click anything else until capture completes. No per-page prompts. No confirmation dialogs.

2. **Never steals focus.** The capture tab operates in the background. The student can continue using their main tab, other Canvas pages, or any other app while capture runs.

3. **Honest progress.** The progress bar reflects actual items completed divided by actual items discovered. No fake easing or random jumps.

4. **Recoverable failure.** If capture fails at 73%, the 73% that was captured is saved and offered as a partial result. The student never loses work to an error.

5. **Pause and resume.** Capture can be paused at any point and resumed from the same position. The queue state persists in `chrome.storage.local`.

6. **One-click handoff.** Clicking "Open in AEONTHRA Classroom" does exactly what it says — opens the main app and loads the capture with no further prompts.

7. **Downloadable in one click.** The JSON export button downloads a file named `aeonthra-{course}-{mode}-{timestamp}.json` with no further dialogs unless the student enabled "Ask where to save" in Chrome settings.

8. **Persistent history.** Every capture is saved automatically. The student can open any previous capture from History without re-running.

9. **Respectful to Canvas.** Inter-request delays prevent rate limit violations. The extension is a good citizen of the LMS.

10. **Works offline after capture.** Once a capture is saved, it's fully accessible without network. The main app processes it entirely in the browser.

---

## 11. ACCEPTANCE CHECKLIST

Before declaring the extension rebuild complete, verify every item:

### Visual design
- [ ] Extension uses AEONTHRA dark cyberpunk aesthetic throughout
- [ ] Orbitron for headings, Sora for body, JetBrains Mono for numbers
- [ ] Cyan glow on the wordmark
- [ ] Phase color usage is semantically correct (cyan/teal/orange/purple/gold)
- [ ] All states have proper empty/loading/error designs
- [ ] Motion is purposeful (no ambient breath; use for moments only)
- [ ] Side panel is polished on 360-420px widths

### Auto-capture engine
- [ ] Discovery phase completes in <5 seconds for a typical course
- [ ] Discovery uses Canvas API where available, falls back to DOM scraping
- [ ] Discovery produces accurate counts for all content types
- [ ] Capture walks every item in the discovered queue
- [ ] Capture uses a dedicated background tab (doesn't steal focus)
- [ ] Expander script opens accordions, tabs, show-more, rubrics, discussions
- [ ] Auto-scroll triggers lazy-loaded content
- [ ] Per-page-type extractors handle all Canvas page types
- [ ] Rate limiting: 500-800ms between requests, exponential backoff on 429
- [ ] Pause/Resume functionality works
- [ ] Cancel preserves partial capture

### Two-mode system
- [ ] COMPLETE mode captures everything including raw HTML
- [ ] LEARNING mode strips Canvas chrome aggressively
- [ ] LEARNING mode filters blocks via quality scorer
- [ ] LEARNING mode deduplicates repeated content
- [ ] Mode selection UI clearly explains the difference
- [ ] Output size differs dramatically between modes (10-20x)

### Handoff to main app
- [ ] One-click handoff opens or focuses existing AEONTHRA tab
- [ ] Payload transmits via chrome.tabs.sendMessage → content bridge → window.postMessage
- [ ] Main app receives payload and validates schema
- [ ] Main app persists to IndexedDB and refreshes views
- [ ] Success toast appears in main app
- [ ] Side panel confirms handoff success

### JSON export
- [ ] Download JSON button triggers chrome.downloads.download
- [ ] Filename follows pattern: `aeonthra-{course}-{mode}-{timestamp}.json`
- [ ] JSON validates against the CapturePayload schema
- [ ] Learning mode JSON is 10-20x smaller than Complete mode
- [ ] Main app accepts downloaded JSON via drag-and-drop import

### Persistence
- [ ] Captures save to chrome.storage.local (or IndexedDB for large ones)
- [ ] History shows last 20 captures
- [ ] Individual captures can be reopened from History
- [ ] Captures can be deleted from History
- [ ] Storage usage indicator shows used/total

### Settings
- [ ] Default mode setting persists
- [ ] Request delay setting affects capture speed
- [ ] Auto-expand toggle controls expander script
- [ ] AEONTHRA URL setting supports self-hosted instances
- [ ] Settings persist via chrome.storage.sync
- [ ] Clear all captures works

### Error handling
- [ ] Rate limit errors trigger exponential backoff
- [ ] Network errors retry up to 3 times
- [ ] Failed items are logged in the warnings array
- [ ] Partial captures can be saved and reopened
- [ ] Error state UI explains cause and offers recovery actions

### UX guarantees
- [ ] Zero clicks between "Start Capture" and completion (barring pause/cancel)
- [ ] Capture does not steal focus from student's main tab
- [ ] Progress is accurate and honest
- [ ] All async operations have visible loading states
- [ ] All interactive elements have hover states
- [ ] Respects `prefers-reduced-motion`

---

## 12. THE FINAL WORD

Codex, this extension is the bridge between "the student opens Canvas" and "the student has a fully-built AEONTHRA Classroom ready to learn in." Every friction point in that bridge destroys the student's momentum. Every smooth second in that bridge builds their trust.

Make it boring in the best way — so reliable, so automatic, so effortless that the student stops thinking about the capture step at all. They click the button, they go make coffee, they come back to a fully-forged classroom. The extension disappears into the background of their workflow.

That's the test. If the student ever has to think about the extension while using it, you made it too complicated. If they never think about it at all, you nailed it.

Build it like a senior extension engineer working on a product the student will actually use every day of every semester for the rest of their degree. Because that's exactly what this is.

When this is done, AEONTHRA will have:
- ✅ A deterministic content engine that produces real concepts (Corrective + Engine Forcing)
- ✅ Nine breath engines that make the interface alive (Breath Prompt)
- ✅ Twelve interaction engines powering nine novel learning modes (Novel Interactions)
- ✅ A polished, bug-free foundation (Polish Pass)
- ✅ An auto-capture extension that fills the whole thing with real course data (this document)

That's the complete system. When all six passes are executed, Shadow has a learning instrument that does not exist anywhere else in the world.

**Build the extension. Ship it. Win the challenge.**
