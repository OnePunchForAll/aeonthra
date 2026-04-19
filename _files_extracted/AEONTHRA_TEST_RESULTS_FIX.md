# AEONTHRA TEST RESULTS FIX PASS

## Fixes Based on Live Browser Testing — Every Bug Found, Every Fix Specified

**Codex: a live browser test was run against the current build at `127.0.0.1:5180/#demo`. This document contains every bug discovered, organized by severity. Fix them in the order listed. Do not skip any.**

---

## 0. WHAT'S ACTUALLY WORKING (DON'T BREAK THESE)

The test confirmed these features work correctly:

- ✅ **AEONTHRA wordmark** glows cyan, background is near-black, fonts load correctly
- ✅ **Demo mode** loads with 12 concepts, 6 tasks, "PHI 208: Ethics and Moral Reasoning" as course title
- ✅ **Concept Map** shows 12 nodes with differentiated mastery colors (gold for Utilitarianism at 82%, teal for Deontology at 74%, dim for unpracticed). Clicking nodes updates the detail panel with concept-specific content.
- ✅ **Concept detail panel** shows real definitions, real detail text, real mnemonics ("picture a glowing utility meter"), and a READ ALOUD button
- ✅ **Neural Forge Genesis** shows a REAL ethical dilemma ("A hospital has one dose of a life-saving drug...") with three genuinely different framework-specific choices (utilitarian, deontological, virtue ethics). This is exactly what we wanted.
- ✅ **Phase cards** are themed correctly (Genesis teal ACTIVE, others LOCKED with visual distinction)
- ✅ **Ambient Primers** panel shows concept definitions alongside the forge view
- ✅ **Nav pills** route correctly between all views (Dashboard, Timeline, Concept Map, Forge, Oracle, Gravity Field, Collision Lab, Duel Arena)
- ✅ **Active Work** section shows 6 items with correct type badges (ASSIGNMENT, DISCUSSION) and LOCKED status
- ✅ **Mission Control** shows stats (Unlocked 0/6, Mastered 1, Forge Ready 100 min)
- ✅ **Timer** displays in JetBrains Mono at 00:00 in top bar, 12:00 in forge view

**These represent real progress. Protect them while fixing the bugs below.**

---

## 1. CRITICAL BUGS (Fix First — These Make the App Look Broken)

### BUG 1: MASSIVE BLACK VOID IN DASHBOARD LAYOUT

**Severity:** CRITICAL — the dashboard has a huge empty black gap between the top sections (Capture Summary, Mission Control, Timeline, Active Work) and the bottom sections (Concept Field, Source Trail, Interactions). The gap is approximately 500-800px of pure black nothingness.

**Root cause:** Likely a CSS issue — either a fixed-height container that's too tall, an absolutely-positioned element creating dead space, or a flex/grid layout with an oversized gap or margin.

**Fix:**

```bash
# Find the culprit — run this in browser DevTools console:
document.querySelectorAll('*').forEach(el => {
  const rect = el.getBoundingClientRect();
  const style = getComputedStyle(el);
  if (rect.height > 400 && rect.height < 1000 && el.children.length === 0 && el.textContent.trim() === '') {
    console.log('EMPTY ELEMENT:', el.tagName, el.className, 'height:', rect.height);
  }
  if (parseInt(style.marginBottom) > 200 || parseInt(style.marginTop) > 200) {
    console.log('LARGE MARGIN:', el.tagName, el.className, 'marginTop:', style.marginTop, 'marginBottom:', style.marginBottom);
  }
  if (parseInt(style.paddingBottom) > 200 || parseInt(style.paddingTop) > 200) {
    console.log('LARGE PADDING:', el.tagName, el.className, 'paddingTop:', style.paddingTop, 'paddingBottom:', style.paddingBottom);
  }
});
```

Then fix by:
1. Remove any explicit `height` on the dashboard container that exceeds its content
2. Remove any `margin-bottom` or `padding-bottom` > 100px on sections
3. If using CSS Grid, check for `grid-template-rows` with explicit large values
4. Ensure no `min-height: 100vh` on individual sections (only the overall view container should have this)

**Verification:** Scroll through the entire dashboard. There should be no gap larger than 40px between any two sections. Content flows naturally from Capture Summary → Mission Control → Timeline → Active Work → Concept Field → Source Trail → Interactions with consistent spacing.

---

### BUG 2: SHADOW READER TEXT OVERLAPPING / STACKING

**Severity:** CRITICAL — the Shadow Reader rail on the right side shows multiple text passages all rendered on top of each other, creating an unreadable wall of overlapping text. The passages are not fading in/out one at a time — they're all visible simultaneously and overlapping.

**Root cause:** The Shadow Reader is appending new passages to the DOM without removing or hiding previous ones. Or all passages have `position: absolute` with the same `top` value, causing them to stack.

**Fix:**

The Shadow Reader should show AT MOST 1-2 passages at a time. Each passage should:
1. Fade in at the bottom of the rail
2. Stay visible for 10-15 seconds
3. Fade out before the next one appears
4. Only ONE passage should be fully visible at any given moment

```typescript
// In ShadowReaderRail.tsx or equivalent
function ShadowReaderRail({ passages }: { passages: Passage[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  
  useEffect(() => {
    if (passages.length === 0) return;
    
    const interval = setInterval(() => {
      // Fade out
      setVisible(false);
      
      // After fade out, switch to next passage and fade in
      setTimeout(() => {
        setCurrentIndex(prev => (prev + 1) % passages.length);
        setVisible(true);
      }, 600); // 600ms fade-out duration
    }, 12000); // Show each passage for 12 seconds
    
    return () => clearInterval(interval);
  }, [passages.length]);
  
  if (passages.length === 0) return null;
  
  const current = passages[currentIndex];
  
  return (
    <div className="shadow-rail">
      <div className="shadow-rail__header">
        <span className="shadow-rail__label">SHADOW READER</span>
        <span className="shadow-rail__counter">
          Seen: {seenCount} | Familiar: {familiarCount}
        </span>
      </div>
      <div 
        className={`shadow-passage ${visible ? 'shadow-passage--visible' : 'shadow-passage--hidden'}`}
      >
        <span className="shadow-passage__source">{current.source}</span>
        <p className="shadow-passage__text">{current.text}</p>
      </div>
    </div>
  );
}
```

```css
.shadow-rail {
  position: fixed;
  top: 80px;
  right: 0;
  width: 200px;
  height: calc(100vh - 120px);
  padding: 16px;
  border-left: 1px solid rgba(0, 240, 255, 0.08);
  overflow: hidden;
  z-index: 20;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.shadow-passage {
  transition: opacity 600ms ease;
}

.shadow-passage--visible {
  opacity: 0.6;
}

.shadow-passage--hidden {
  opacity: 0;
}

.shadow-passage__source {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.55rem;
  color: var(--text-muted);
  display: block;
  margin-bottom: 4px;
}

.shadow-passage__text {
  font-family: 'Sora', sans-serif;
  font-size: 0.7rem;
  font-style: italic;
  color: rgba(0, 240, 255, 0.4);
  line-height: 1.6;
}
```

**Also fix:** The passage source label shows "Module 1 - Utilitarianism p.1" — strip the "Module N -" prefix. Run `sanitizeDisplayText()` on all Shadow Reader passage source labels.

**Verification:** Enable Shadow Reader at Steady mode. Only 1 passage should be visible at a time. It should fade in, stay for ~12 seconds, fade out, and be replaced by the next passage. No overlapping text ever.

---

### BUG 3: TIMELINE IS VERTICAL, NOT HORIZONTAL

**Severity:** HIGH — the timeline renders as a vertical list of events in a narrow left column. It was specified to be a full-viewport horizontal scrolling landscape. This has been requested in multiple documents and still hasn't been implemented.

**Fix:** Rebuild `TimelineBoard.tsx` with horizontal layout:

```css
.timeline-view {
  width: 100%;
  min-height: calc(100vh - 64px);
  padding: 24px 0;
}

.timeline-track {
  display: flex;
  flex-direction: row;      /* HORIZONTAL, not vertical */
  gap: 0;
  overflow-x: auto;         /* horizontal scroll */
  overflow-y: hidden;
  scroll-snap-type: x proximity;
  padding: 24px 32px;
  min-height: 500px;
  cursor: grab;
}

.week-column {
  flex: 0 0 320px;          /* fixed width columns */
  scroll-snap-align: start;
  padding: 0 16px;
  display: flex;
  flex-direction: column;   /* events stack vertically WITHIN a week */
  gap: 16px;
  border-right: 1px solid rgba(26, 26, 58, 0.3);
}

.week-column__header {
  font-family: 'Orbitron', sans-serif;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: var(--text-muted);
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
}

.timeline-event {
  padding: 20px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-left-width: 4px;
  border-radius: 14px;
  min-height: 100px;
  cursor: pointer;
  transition: all 400ms cubic-bezier(0.22, 1, 0.36, 1);
}

.timeline-event:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
}
```

If a full horizontal rebuild is too risky this late, at MINIMUM:
1. Make the timeline take the FULL VIEWPORT WIDTH (not a narrow left column)
2. Make event cards large enough to read (min-height 100px, min-width 280px)
3. Remove the left-column constraint

**Verification:** Navigate to Timeline. Events are arranged in a way that fills the viewport width (either horizontal columns or a full-width vertical layout). Event titles are fully readable. Cards have adequate padding and spacing.

---

### BUG 4: TIMELINE EVENTS DON'T OPEN DETAIL PANELS

**Severity:** MEDIUM — clicking a timeline event card just highlights it with a cyan border. It doesn't navigate to the assignment detail view or show a detail panel. The student can see their events but can't act on them from the timeline.

**Fix:** Add an `onClick` handler that either:
- Option A: Navigates to the Assignment Detail view for that item
- Option B: Opens a slide-up detail panel at the bottom of the timeline (preferred)

```typescript
function TimelineEvent({ event, onClick }: { event: WorkItem; onClick: () => void }) {
  return (
    <div 
      className="timeline-event"
      data-type={event.type}
      onClick={onClick}
    >
      <div className="timeline-event__type-badge">{event.type.toUpperCase()}</div>
      <div className="timeline-event__title">{event.title}</div>
      <div className="timeline-event__meta">
        {event.dueDate && <span>{formatDate(event.dueDate)}</span>}
        {event.points && <span> · {event.points} pts</span>}
      </div>
    </div>
  );
}

// In the parent:
<TimelineEvent 
  event={event} 
  onClick={() => setView({ type: 'assignment', id: event.id })} 
/>
```

**Verification:** Click any timeline event. It should navigate to the assignment detail view or show a detail panel with the assignment's full description and action buttons.

---

## 2. QUALITY ISSUES (Fix After Critical Bugs)

### ISSUE 5: "Module 1 -" PREFIX IN SHADOW READER

The Shadow Reader source label shows "Module 1 - Utilitarianism p.1" instead of just "Utilitarianism p.1". Apply `sanitizeDisplayText()` to all Shadow Reader source labels and passage text.

### ISSUE 6: CONCEPT MAP NOT ZOOMABLE

Scrolling on the concept map doesn't zoom. The map needs scroll-wheel zoom and click-drag pan. If using SVG, add a `viewBox` manipulation on wheel events. If using Canvas, adjust the camera zoom.

### ISSUE 7: DASHBOARD MAIN CONTENT WIDTH PUSHED BY SHADOW READER

The Shadow Reader rail is `position: fixed` on the right, but the main dashboard content doesn't account for it. Main content may be partially hidden behind the rail on narrower screens. Add `padding-right: 220px` to the main content area when Shadow Reader is active, or make the Shadow Reader collapsible.

### ISSUE 8: EXPORT PNG BUTTON ON CONCEPT MAP — VERIFY IT WORKS

The test didn't verify whether the Export PNG button actually produces a downloadable image. Test it — click Export PNG, verify a `.png` file downloads with a dark background and visible node labels.

### ISSUE 9: READ ALOUD BUTTON — VERIFY IT WORKS

The test didn't verify whether clicking READ ALOUD actually triggers speech synthesis. Test it — click READ ALOUD on a concept, verify the browser speaks the definition.

### ISSUE 10: INCOMPLETE TEST COVERAGE

The live test was cut short and did NOT test:
- Oracle Panel (was shown as "waiting for thinkers" in earlier screenshots — may now be fixed with 12-concept demo)
- Collision Lab (needs verification that shared ground is sentences not keywords)
- Duel Arena (needs verification that both sides show different text)
- Gravity Field (needs verification that assignments orbit)
- Assignment Detail (needs verification of three-column layout and gating)
- Practice Mode toggle
- Reset button
- Console errors

**Each of these must be manually verified after fixing Bugs 1-4.**

---

## 3. THE EXTENSION — IT'S NOT WORKING AT ALL

### 3.1 What the user reports

The extension popup shows:
- "Loading extension state..." that never resolves (Image 10)
- "A listener indicated an asynchronous response by returning true, but the message channel closed before a response was received" (Image 11)
- START and OPEN PANEL buttons exist but don't function when not on a Canvas page

### 3.2 Root cause analysis

The MV3 service worker messaging is broken. The popup sends a message to the service worker, but:
1. The service worker's `onMessage` listener either doesn't fire or throws before responding
2. The `return true` (keeping the message channel open for async response) is used, but `sendResponse` is never called on some code paths
3. The popup receives Chrome's generic "message channel closed" error

### 3.3 The definitive fix

**Step 1: Rewrite the service worker message handler to ALWAYS respond**

```typescript
// service-worker.ts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Wrap EVERYTHING in a try-catch that ALWAYS calls sendResponse
  handleMessage(message, sender)
    .then(result => sendResponse({ ok: true, ...result }))
    .catch(error => sendResponse({ ok: false, error: error?.message || 'Unknown error' }));
  
  return true; // keep channel open for async response
});

async function handleMessage(message: any, sender: chrome.runtime.MessageSender): Promise<any> {
  switch (message.type) {
    case 'GET_STATE':
    case 'aeon:get-extension-state':
      return getExtensionState();
    
    case 'START_CAPTURE':
      return startCapture(message.mode);
    
    case 'PAUSE_CAPTURE':
      return pauseCapture();
    
    case 'CANCEL_CAPTURE':
      return cancelCapture();
    
    case 'HANDOFF':
      return handoffToAeonthra();
    
    default:
      return { state: 'idle', message: 'Unknown message type' };
  }
}

async function getExtensionState(): Promise<any> {
  try {
    // Check if we're on a Canvas page
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = tab?.url || '';
    const isCanvas = /instructure\.com|canvas\.\w+\.edu/.test(url);
    const courseMatch = url.match(/\/courses\/(\d+)/);
    
    return {
      state: isCanvas ? 'course-detected' : 'idle',
      isCanvas,
      courseId: courseMatch?.[1] || null,
      url,
      captures: await getCaptureHistory(),
    };
  } catch (error: any) {
    return { state: 'idle', message: error?.message || 'State check failed' };
  }
}
```

**Step 2: Make the popup handle ALL response states gracefully**

```typescript
// popup.tsx — state fetching
async function fetchState() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_STATE' });
    
    if (response?.ok) {
      setState(response);
    } else {
      setState({ 
        state: 'idle', 
        message: response?.error || 'Extension is initializing...' 
      });
    }
  } catch (error: any) {
    const msg = error?.message || '';
    
    // Handle ALL known Chrome MV3 messaging failures
    if (msg.includes('message channel closed') || 
        msg.includes('Receiving end does not exist') ||
        msg.includes('Extension context invalidated')) {
      setState({ 
        state: 'idle', 
        message: 'Extension is loading. Close and reopen this popup.' 
      });
    } else {
      setState({ 
        state: 'error', 
        message: `Communication error: ${msg}` 
      });
    }
  }
}
```

**Step 3: The popup UI when NOT on a Canvas page must be clear**

When the student opens the popup on a non-Canvas page (like Google or their email), the popup should show:

```
┌────────────────────────────────────────┐
│  AEONTHRA                              │
│  CAPTURE INTELLIGENCE                  │
│                                        │
│  Navigate to your Canvas course        │
│  to begin auto-capture.                │
│                                        │
│  ─────────────────────                 │
│                                        │
│  📚 CAPTURE HISTORY                    │
│  No previous captures.                 │
│                                        │
│  ⚙ OPTIONS                             │
│                                        │
└────────────────────────────────────────┘
```

No error messages. No "Loading extension state..." that never resolves. Just a clear, calm explanation of what to do next.

**Step 4: The popup UI when ON a Canvas page**

```
┌────────────────────────────────────────┐
│  AEONTHRA                              │
│  CAPTURE INTELLIGENCE                  │
│                                        │
│  COURSE DETECTED                       │
│  PHI 208 · Ethics and Moral Reasoning  │
│  uagc.instructure.com                  │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │  ⚡ CAPTURE ENTIRE COURSE        │  │
│  └──────────────────────────────────┘  │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │  🎯 CAPTURE THIS PAGE ONLY       │  │
│  └──────────────────────────────────┘  │
│                                        │
│  ⚙ OPTIONS                             │
│                                        │
└────────────────────────────────────────┘
```

**Step 5: Rebuild the extension and test**

```bash
cd apps/extension
npm run build
# or
node scripts/build.mjs
```

Then:
1. Go to `chrome://extensions`
2. Click "Update" on the AEONTHRA extension (or remove and re-load unpacked)
3. Open the popup on a non-Canvas page → should show the "Navigate to Canvas" message
4. Open the popup on a Canvas course page → should show "COURSE DETECTED" with capture buttons
5. Neither state should show "Loading extension state..." indefinitely
6. Neither state should show raw Chrome error messages

### 3.4 Extension acceptance test

- [ ] Popup on non-Canvas page: shows calm "Navigate to Canvas" message, no errors
- [ ] Popup on Canvas course page: shows "COURSE DETECTED" with course name
- [ ] Clicking "CAPTURE ENTIRE COURSE" on a Canvas page: starts the capture flow (or shows discovery progress)
- [ ] No raw Chrome error messages EVER appear in the popup
- [ ] "Loading extension state..." resolves within 2 seconds or is replaced by actual state
- [ ] OPTIONS button opens the options page
- [ ] Extension icon is visible in the Chrome toolbar

---

## 4. EXECUTION ORDER

Fix in this exact order:

1. **Bug 1: Dashboard void** — Fix the CSS layout gap. This is the first thing anyone sees.
2. **Bug 2: Shadow Reader overlap** — Fix the passage stacking. This rail is visible on every view.
3. **Bug 3: Timeline horizontal** — At minimum expand to full width.
4. **Bug 4: Timeline click navigation** — Wire click events to assignment detail.
5. **Extension fix** — Rewrite service worker messaging + popup states.
6. **Issue 5-9** — Module prefix, concept map zoom, content width, export/TTS verification.
7. **Issue 10** — Manual verification of Oracle, Collision Lab, Duel Arena, Gravity Field, Assignment Detail.

After all fixes, run the full test sequence again (the 13-phase audit from the self-test prompt) and verify every phase passes.

---

## 5. WHAT'S ACTUALLY IMPRESSIVE NOW

Despite the bugs, the test revealed that the core product IS working at a fundamental level:

- **The deterministic engine produces real ethical content.** The Genesis dilemma is a legitimate moral scenario with three genuinely different framework-specific choices. This is the hardest thing to get right and it's working.
- **The concept map has real mastery differentiation.** Gold Utilitarianism at 82%, teal Deontology at 74%, dim unpracticed concepts. Clicking nodes shows real, different definitions.
- **The demo data is rich.** 12 concepts, 6 assignments, proper course structure. The Concept Field shows all 12 with mastery percentages.
- **The aesthetic is correct.** Dark background, cyan glow, Orbitron headings, JetBrains Mono timers, themed phase cards.
- **Phase gating works.** Genesis is active, other phases are locked. Active Work shows assignments as LOCKED.

The foundation is solid. These fixes are polish, not reconstruction. Fix the layout void, fix the Shadow Reader, expand the timeline, fix the extension, and the app is in a shippable state.

---

## 6. FOR THE NEXT ROUND OF TESTING

After these fixes are applied, run the self-test again. This time, the tester should also check:

1. **Oracle Panel** — type a question, verify thinkers respond with differentiated attributed quotes
2. **Collision Lab** — collide two concepts, verify shared ground is sentences (not keyword dumps) and both sections are different
3. **Duel Arena** — start a duel, verify Round 1 left and right sides show DIFFERENT text
4. **Gravity Field** — verify assignments visibly orbit concept bodies (not just float statically)
5. **Assignment Detail** — click a locked assignment, verify three-column layout with PREPARE FIRST gating
6. **Practice Mode** — toggle it, verify all assignments unlock
7. **Reset** — click it, verify return to import screen
8. **Console** — open DevTools → Console, note any errors
9. **Extension** — test on a real Canvas page, verify capture starts

If ANY of these still fail, report the specific failure and we'll fix it in the next pass.

**Fix the bugs. Run the tests. Ship the product.**
