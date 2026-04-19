# AEONTHRA GRAND SCALE — Full-Screen, Full-Touch, Full-Complete

## Stop Shrinking Everything. Make It Big, Bold, Immersive, and Finished.

**Codex: this document accompanies the Competition Edge and Performance Architecture. Read all three before writing code. This one addresses the most persistent design failure: the app keeps shrinking itself into cramped utility widgets when it should be an expansive, full-viewport, immersive learning environment.**

**The problem in one sentence: you're building a dashboard when you should be building a world.**

**A dashboard shows you data in little boxes. A world surrounds you with space you move through. AEONTHRA is a world. Every view should feel like stepping into a room, not looking at a control panel.**

---

## 0. THE SCALE PROBLEM — WHY IT FEELS SMALL

Looking at the current build, here's what keeps happening:

1. **The timeline is a tiny 3-column widget in the corner of the dashboard.** It should be a full-screen horizontal landscape the student physically scrolls through.

2. **The concept map is a cramped cluster of overlapping dots.** It should be an expansive star field that fills the entire viewport with room to breathe.

3. **Cards are packed together like spreadsheet cells.** They should float in dark space with generous margins and clear visual hierarchy.

4. **Everything tries to fit on one screen.** Wrong instinct. Each view should OWN the entire viewport. Scrolling is fine. Horizontal scrolling is great. The student should feel like they're navigating through rooms, not scanning a single page.

5. **Interactive elements feel like clicking a spreadsheet.** They should feel like pressing a real button — with depth, feedback, and physical response.

6. **Nothing animates with weight.** Transitions feel like CSS opacity toggles, not like objects moving through space with mass and momentum.

The fix is a complete scale recalibration of every view, plus a tactile interaction layer that makes every click feel physical.

---

## 1. THE GRAND SCALE RULES (APPLY EVERYWHERE)

### 1.1 Viewport Ownership

Every primary view (Dashboard, Timeline, Concept Map, Neural Forge, Assignment Detail) owns 100% of the viewport below the top navigation bar. No view shares its space with another view's summary widget.

```css
.view-container {
  min-height: calc(100vh - 64px); /* below top bar */
  width: 100%;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 0; /* views manage their own padding */
}
```

The top navigation bar is exactly 64px tall. Everything below it belongs to the active view.

### 1.2 Content Zones Are LARGE

```css
/* Primary content zone — the main area of any view */
.zone-primary {
  padding: var(--space-10) var(--space-8);
  max-width: 1600px; /* wider than before — was 1200-1400 */
  margin: 0 auto;
}

/* Full-bleed zone — for timeline, concept map, gravity field */
.zone-fullbleed {
  padding: var(--space-6) 0;
  width: 100%;
  max-width: none; /* truly full screen */
}

/* Hero zone — for the top section of any view */
.zone-hero {
  padding: var(--space-16) var(--space-8) var(--space-10);
  max-width: 1600px;
  margin: 0 auto;
}
```

### 1.3 Cards Are Generous

Stop making cards small. A card is a room the student enters, not a cell they glance at.

```css
.card {
  padding: var(--space-6); /* was --space-5, now bigger */
  border-radius: 16px;    /* was 14px, slightly rounder */
  min-height: 120px;      /* no tiny cards */
}

.card-lg {
  padding: var(--space-8);
  border-radius: 20px;
  min-height: 200px;
}

.card-hero {
  padding: var(--space-10) var(--space-8);
  border-radius: 24px;
  min-height: 280px;
}
```

### 1.4 Typography Is Confident

Headlines should be LARGE. Not screaming — confident. A student who's overwhelmed needs big, clear text that says "you're in the right place."

```css
.heading-hero {
  font-family: 'Orbitron', sans-serif;
  font-size: clamp(2rem, 5vw, 3.5rem); /* responsive, never small */
  font-weight: 900;
  letter-spacing: 0.04em;
  line-height: 1.1;
  color: var(--text-primary);
}

.heading-section {
  font-family: 'Orbitron', sans-serif;
  font-size: clamp(1.2rem, 3vw, 1.8rem);
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--text-primary);
}

.heading-card {
  font-family: 'Orbitron', sans-serif;
  font-size: clamp(0.9rem, 2vw, 1.2rem);
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--text-primary);
}

.body-lg {
  font-family: 'Sora', sans-serif;
  font-size: 1rem;
  line-height: 1.7;
  color: var(--text-secondary);
}

.body-sm {
  font-family: 'Sora', sans-serif;
  font-size: 0.85rem;
  line-height: 1.6;
  color: var(--text-secondary);
}

.label {
  font-family: 'Orbitron', sans-serif;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.mono-value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--text-primary);
}
```

### 1.5 The Spacing Scale (Final, Enforced, No More Arguments)

This is the LAST time spacing is defined. Codex, embed these values and use them without deviation.

```css
:root {
  --space-0: 0;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-7: 28px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-14: 56px;
  --space-16: 64px;
  --space-20: 80px;
  --space-24: 96px;
}

/* ENFORCEMENT RULES — violating any of these is a bug */

/* Rule 1: Cards in a grid have at least --space-5 (20px) gap */
.grid-cards {
  gap: var(--space-5);
}

/* Rule 2: Sections have at least --space-10 (40px) between them */
.section + .section {
  margin-top: var(--space-10);
}

/* Rule 3: Card internal padding is at least --space-6 (24px) */
.card {
  padding: var(--space-6);
}

/* Rule 4: View top padding is at least --space-10 (40px) */
.view-content {
  padding-top: var(--space-10);
}

/* Rule 5: No element may touch the edge of its container without padding */
/* This means EVERY container has padding. No exceptions. */

/* Rule 6: Between a heading and its content, at least --space-4 (16px) */
.heading-section + * {
  margin-top: var(--space-4);
}

/* Rule 7: Between a label and its value, at least --space-2 (8px) */
.label + .value {
  margin-top: var(--space-2);
}
```

**If you see two elements touching each other with no gap, that is a rendering bug. Fix it before shipping.**

---

## 2. THE FULL-SCREEN TIMELINE (REBUILD FROM SCRATCH)

The current "timeline" is a tiny widget in the dashboard corner. Delete it and build a real one.

### 2.1 What the Timeline Actually Is

The Timeline is a **full-viewport horizontal landscape** that the student physically scrolls through left and right. It represents their entire semester as a visual space. Each week is a column. Each event is a card floating in that week's column. The student drags left and right to move through time.

It should feel like looking through a train window at the semester rushing past.

### 2.2 Layout

```
┌─ TOP BAR (64px) ───────────────────────────────────────────────────────┐
│  AEONTHRA  ● ● ● ● ●  PHI 208  │  Timeline  │  00:00  │  RESET      │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌─ CONTROLS BAR ─────────────────────────────────────────────────┐    │
│  │  ← TODAY →    │  [Day] [Week] [Month]  │  Filter: All ▾       │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                                                                        │
│  ┌─ TIMELINE TRACK (full width, horizontal scroll) ──────────────────┐ │
│  │                                                                    │ │
│  │  │ MAR 31  │  APR 7    │  APR 14   │  APR 21   │  APR 28   │ ... │ │
│  │  │         │           │           │           │           │      │ │
│  │  │ ┌─────┐ │ ┌─────┐   │ ┌─────┐   │ ┌─────┐   │           │      │ │
│  │  │ │QUIZ │ │ │PAPER│   │ │DISC │   │ │QUIZ │   │           │      │ │
│  │  │ │ Mod1│ │ │ #1  │   │ │ Wk4 │   │ │ Mid │   │           │      │ │
│  │  │ │ 25pt│ │ │100pt│   │ │ 25pt│   │ │ 50pt│   │           │      │ │
│  │  │ └─────┘ │ └─────┘   │ └─────┘   │ └─────┘   │           │      │ │
│  │  │         │           │           │           │           │      │ │
│  │  │ ┌─────┐ │ ┌╌╌╌╌╌┐   │ ┌─────┐   │           │           │      │ │
│  │  │ │DISC │ │ ┊GOAL ┊   │ │PAGE │   │           │           │      │ │
│  │  │ │ Wk1 │ │ ┊Prep ┊   │ │ Mod3│   │           │           │      │ │
│  │  │ │ 25pt│ │ ┊Paper┊   │ │     │   │           │           │      │ │
│  │  │ └─────┘ │ └╌╌╌╌╌┘   │ └─────┘   │           │           │      │ │
│  │  │         │           │           │           │           │      │ │
│  │  │         │           │           │           │           │      │ │
│  │  │         │           │ ──TODAY── │           │           │      │ │
│  │  │         │           │    ↑      │           │           │      │ │
│  │  │         │           │  glowing  │           │           │      │ │
│  │  │         │           │  cyan     │           │           │      │ │
│  │  │         │           │  line     │           │           │      │ │
│  │                                                                    │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│  ┌─ DETAIL PANEL (shows when an event is selected) ──────────────────┐ │
│  │  📝 Ethics Paper 1: Utilitarianism in Practice                     │ │
│  │  Due: Apr 14  ·  100 points  ·  Status: LOCKED                    │ │
│  │                                                                    │ │
│  │  Required concepts: Utilitarianism (32%), Mill (0%), Objections (0%)│ │
│  │                                                                    │ │
│  │  [ OPEN ASSIGNMENT ]  [ PREPARE IN FORGE ]  [ START WRITING ]     │ │
│  └────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

### 2.3 Key Design Decisions

**Full viewport width.** The timeline track uses `width: 100vw` with no side padding on the track itself. The week columns extend from edge to edge.

**Each week column is at least 320px wide.** On a 1440px screen, ~4.5 weeks are visible at once. On a phone, ~1.2 weeks.

**The TODAY line is the anchor.** On first load, the timeline auto-scrolls to center TODAY. The Today line is a vertical cyan laser that spans the full height of the track, pulsing gently with the breath engine.

**Events are substantial cards, not dots.** Each event card is at least 140px × 100px. It shows: type badge (QUIZ / PAPER / DISC / PAGE), title (truncated at 2 lines), points, and a colored left border indicating status (cyan = upcoming, red = overdue, green = complete, dim = far future).

**Goals are woven between real events** as dashed-border cards with lower opacity, exactly as specified in the Breath prompt's Engine 5.

**The detail panel** slides up from the bottom when an event is clicked. It shows full details + action buttons. Clicking elsewhere dismisses it with a spring-down animation.

### 2.4 Timeline Interaction Model

**Horizontal drag scrolling.** The student can grab anywhere on the track and drag left/right. Momentum continues after release (like iOS scroll). Snap points on week boundaries.

```typescript
// components/timeline/useHorizontalDrag.ts
function useHorizontalDrag(ref: RefObject<HTMLElement>) {
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);
  const velocity = useRef(0);
  const lastX = useRef(0);
  const lastTime = useRef(0);
  
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    
    const onPointerDown = (e: PointerEvent) => {
      isDragging.current = true;
      startX.current = e.clientX;
      scrollLeft.current = el.scrollLeft;
      lastX.current = e.clientX;
      lastTime.current = e.timeStamp;
      velocity.current = 0;
      el.style.cursor = 'grabbing';
      el.style.scrollSnapType = 'none'; // disable snap during drag
      el.setPointerCapture(e.pointerId);
    };
    
    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging.current) return;
      e.preventDefault();
      
      const dx = e.clientX - startX.current;
      el.scrollLeft = scrollLeft.current - dx;
      
      // Track velocity for momentum
      const dt = e.timeStamp - lastTime.current;
      if (dt > 0) {
        velocity.current = (e.clientX - lastX.current) / dt;
      }
      lastX.current = e.clientX;
      lastTime.current = e.timeStamp;
    };
    
    const onPointerUp = (e: PointerEvent) => {
      isDragging.current = false;
      el.style.cursor = 'grab';
      el.releasePointerCapture(e.pointerId);
      
      // Apply momentum
      const momentumDistance = velocity.current * 300; // momentum factor
      el.scrollBy({
        left: -momentumDistance,
        behavior: 'smooth',
      });
      
      // Re-enable snap after momentum settles
      setTimeout(() => {
        el.style.scrollSnapType = 'x proximity';
      }, 400);
    };
    
    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
    
    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);
    };
  }, [ref]);
}
```

**Jump buttons.** Three pill buttons: `← TODAY →`, `NEXT DUE`, `SEMESTER END`. Each scrolls the track to that position with a smooth 600ms animation.

**Zoom levels.** Three toggle buttons change the column width:
- **Day view:** each column = 1 day, 80px wide. Dense but granular.
- **Week view (default):** each column = 1 week, 320px wide. Balanced.
- **Month view:** each column = 1 month, 600px wide. Overview.

**Filter pills.** Toggle visibility by type: Assignments / Discussions / Quizzes / Pages / Goals. Active pills glow their respective color.

### 2.5 Timeline CSS

```css
.timeline-view {
  height: calc(100vh - 64px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.timeline-controls {
  flex-shrink: 0;
  padding: var(--space-4) var(--space-8);
  display: flex;
  align-items: center;
  gap: var(--space-4);
  border-bottom: 1px solid var(--border);
}

.timeline-track {
  flex: 1;
  display: flex;
  overflow-x: auto;
  overflow-y: hidden;
  scroll-snap-type: x proximity;
  cursor: grab;
  padding: var(--space-8) 0;
  position: relative;
  /* Smooth scrollbar */
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 240, 255, 0.3) transparent;
}

.timeline-track::-webkit-scrollbar {
  height: 10px;
}

.timeline-track::-webkit-scrollbar-track {
  background: transparent;
}

.timeline-track::-webkit-scrollbar-thumb {
  background: rgba(0, 240, 255, 0.25);
  border-radius: 5px;
}

.timeline-track::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 240, 255, 0.5);
}

.week-column {
  flex: 0 0 320px;
  scroll-snap-align: start;
  padding: 0 var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  border-right: 1px solid var(--border-subtle);
  min-height: 100%;
}

.week-column__header {
  font-family: 'Orbitron', sans-serif;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: var(--text-muted);
  padding: var(--space-4) 0;
  position: sticky;
  top: 0;
  background: var(--bg-void);
  z-index: 2;
}

.week-column[data-has-today="true"] .week-column__header {
  color: var(--cyan);
}

.today-line {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--cyan);
  box-shadow:
    0 0 8px rgba(0, 240, 255, 0.8),
    0 0 20px rgba(0, 240, 255, 0.4),
    0 0 40px rgba(0, 240, 255, 0.2);
  z-index: 3;
  pointer-events: none;
}

.timeline-event {
  padding: var(--space-5);
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-left-width: 4px;
  border-radius: 14px;
  cursor: pointer;
  transition: all 400ms cubic-bezier(0.22, 1, 0.36, 1);
  min-height: 100px;
}

.timeline-event:hover {
  transform: translateY(-4px) scale(1.02);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5), 0 0 30px var(--event-glow);
  z-index: 5;
}

.timeline-event:active {
  transform: translateY(-2px) scale(0.99);
  transition-duration: 100ms;
}

.timeline-event[data-type="assignment"] { --event-glow: rgba(0, 240, 255, 0.2); border-left-color: var(--cyan); }
.timeline-event[data-type="discussion"] { --event-glow: rgba(6, 214, 160, 0.2); border-left-color: var(--teal); }
.timeline-event[data-type="quiz"] { --event-glow: rgba(168, 85, 247, 0.2); border-left-color: var(--purple); }
.timeline-event[data-type="page"] { --event-glow: rgba(176, 176, 208, 0.1); border-left-color: var(--text-muted); }
.timeline-event[data-type="goal"] {
  border: 1px dashed rgba(0, 240, 255, 0.3);
  background: rgba(0, 240, 255, 0.02);
  border-left-width: 1px;
}

.timeline-event[data-status="overdue"] {
  border-left-color: var(--red);
  box-shadow: 0 0 25px rgba(255, 68, 102, 0.15);
}

.timeline-event[data-status="complete"] {
  border-left-color: var(--green);
  opacity: 0.7;
}

.timeline-event__type-badge {
  display: inline-block;
  font-family: 'Orbitron', sans-serif;
  font-size: 0.55rem;
  font-weight: 700;
  letter-spacing: 0.15em;
  padding: var(--space-1) var(--space-2);
  border-radius: 4px;
  text-transform: uppercase;
  margin-bottom: var(--space-2);
}

.timeline-event__title {
  font-family: 'Sora', sans-serif;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.3;
  margin-bottom: var(--space-2);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.timeline-event__meta {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.7rem;
  color: var(--text-muted);
}

/* Detail panel — slides up from bottom */
.timeline-detail {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--bg-card-raised);
  border-top: 1px solid var(--border);
  border-radius: 24px 24px 0 0;
  padding: var(--space-8);
  max-height: 40vh;
  overflow-y: auto;
  z-index: 20;
  box-shadow: 0 -20px 60px rgba(0, 0, 0, 0.6);
  transform: translateY(100%);
  transition: transform 500ms cubic-bezier(0.22, 1, 0.36, 1);
}

.timeline-detail[data-open="true"] {
  transform: translateY(0);
}
```

### 2.6 Dashboard Timeline Preview

The dashboard does NOT contain a full timeline. It contains a PREVIEW STRIP — a thin horizontal bar showing the next 3 weeks with miniature event indicators. Clicking the strip navigates to the full Timeline view.

```css
.timeline-preview {
  width: 100%;
  height: 120px;
  padding: var(--space-4);
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 16px;
  cursor: pointer;
  overflow: hidden;
  position: relative;
  transition: all 400ms;
}

.timeline-preview:hover {
  border-color: var(--border-glow);
  box-shadow: 0 0 30px rgba(0, 240, 255, 0.1);
}

.timeline-preview__label {
  position: absolute;
  top: var(--space-3);
  left: var(--space-4);
  font-family: 'Orbitron', sans-serif;
  font-size: 0.6rem;
  letter-spacing: 0.15em;
  color: var(--text-muted);
}

.timeline-preview__cta {
  position: absolute;
  top: var(--space-3);
  right: var(--space-4);
  font-family: 'Sora', sans-serif;
  font-size: 0.7rem;
  color: var(--cyan);
}
```

---

## 3. THE FULL-SCREEN CONCEPT MAP (REBUILD FROM SCRATCH)

The current concept map is a small cluster of gray dots. It should be a vast star field.

### 3.1 What the Concept Map Actually Is

An expansive force-directed graph that fills the ENTIRE viewport. Nodes are glowing orbs of different sizes and colors floating in deep space. Edges are thin connecting lines that pulse with energy when related concepts are both practiced. The student pans and zooms through the map like a star chart.

### 3.2 Layout

The concept map gets `100vw × calc(100vh - 64px)`. No sidebar. No panels. When a node is clicked, a detail flyout appears on the right edge and pushes the canvas slightly left.

```css
.concept-map-view {
  width: 100vw;
  height: calc(100vh - 64px);
  position: relative;
  overflow: hidden;
  background: #020208;
}

.concept-map-canvas {
  position: absolute;
  inset: 0;
  cursor: grab;
}

.concept-map-canvas:active {
  cursor: grabbing;
}

.concept-map-controls {
  position: absolute;
  top: var(--space-6);
  left: var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  z-index: 10;
}

.concept-map-legend {
  position: absolute;
  bottom: var(--space-6);
  left: var(--space-6);
  z-index: 10;
  padding: var(--space-4);
  background: rgba(4, 4, 12, 0.8);
  backdrop-filter: blur(12px);
  border: 1px solid var(--border);
  border-radius: 12px;
}

.concept-map-detail {
  position: absolute;
  top: 0;
  right: 0;
  width: 400px;
  height: 100%;
  background: var(--bg-card);
  border-left: 1px solid var(--border);
  padding: var(--space-8) var(--space-6);
  overflow-y: auto;
  transform: translateX(100%);
  transition: transform 500ms cubic-bezier(0.22, 1, 0.36, 1);
  z-index: 15;
}

.concept-map-detail[data-open="true"] {
  transform: translateX(0);
}
```

### 3.3 Node Scale

Nodes should be VISIBLE. Minimum node radius is 24px (was 20). Maximum is 80px. Labels are always visible (not hidden until hover). Use the canvas renderer from the Performance Architecture for 60fps.

### 3.4 Pan and Zoom

Implement a proper camera system:

```typescript
interface Camera {
  x: number;      // pan offset X
  y: number;      // pan offset Y
  zoom: number;   // 0.3 to 3.0
}

function applyCamera(ctx: CanvasRenderingContext2D, camera: Camera) {
  ctx.setTransform(camera.zoom, 0, 0, camera.zoom, camera.x, camera.y);
}

// Zoom toward mouse position (not center)
function handleWheel(e: WheelEvent, camera: Camera): Camera {
  const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
  const newZoom = Math.max(0.3, Math.min(3.0, camera.zoom * zoomFactor));
  
  // Zoom toward mouse
  const mouseX = e.offsetX;
  const mouseY = e.offsetY;
  const worldX = (mouseX - camera.x) / camera.zoom;
  const worldY = (mouseY - camera.y) / camera.zoom;
  
  return {
    zoom: newZoom,
    x: mouseX - worldX * newZoom,
    y: mouseY - worldY * newZoom,
  };
}
```

**Pinch-to-zoom on touch devices.** Track two-finger distance changes and map to camera zoom.

### 3.5 Background Star Field

The concept map background isn't flat black. It has a subtle procedural star field — tiny randomly-placed dots at very low opacity that parallax as the camera pans. This makes the map feel like navigating through space.

```typescript
function renderStarField(ctx: CanvasRenderingContext2D, camera: Camera, width: number, height: number) {
  // Generate 200 stars deterministically (seeded from course ID)
  const seed = hashCode(courseId);
  const rng = seededRandom(seed);
  
  for (let i = 0; i < 200; i++) {
    const x = rng() * 4000 - 2000;
    const y = rng() * 4000 - 2000;
    const size = rng() * 1.5 + 0.5;
    const brightness = rng() * 0.15 + 0.05;
    
    // Parallax: stars move at 30% of camera speed
    const screenX = (x * 0.3 + camera.x) * camera.zoom + width / 2;
    const screenY = (y * 0.3 + camera.y) * camera.zoom + height / 2;
    
    if (screenX >= 0 && screenX <= width && screenY >= 0 && screenY <= height) {
      ctx.beginPath();
      ctx.arc(screenX, screenY, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(224, 224, 255, ${brightness})`;
      ctx.fill();
    }
  }
}
```

---

## 4. MATERIAL DESIGN TACTILE LAYER

Every click, tap, hover, and drag should feel like touching a real physical surface. This is the "soft to the touch" quality.

### 4.1 The Ripple Effect

Every clickable element gets a Material Design-style ripple on click:

```typescript
// components/primitives/Ripple.tsx
function Ripple() {
  const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([]);
  
  const addRipple = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();
    setRipples(prev => [...prev, { x, y, id }]);
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== id));
    }, 600);
  };
  
  return { ripples, addRipple };
}

// Wrap any clickable element
function RippleContainer({ children, className, onClick, ...props }: any) {
  const { ripples, addRipple } = Ripple();
  
  return (
    <div
      className={`ripple-container ${className || ''}`}
      onClick={(e) => { addRipple(e); onClick?.(e); }}
      {...props}
    >
      {children}
      {ripples.map(ripple => (
        <span
          key={ripple.id}
          className="ripple-circle"
          style={{ left: ripple.x, top: ripple.y }}
        />
      ))}
    </div>
  );
}
```

```css
.ripple-container {
  position: relative;
  overflow: hidden;
}

.ripple-circle {
  position: absolute;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: rgba(0, 240, 255, 0.15);
  transform: translate(-50%, -50%);
  animation: rippleExpand 600ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
  pointer-events: none;
}

@keyframes rippleExpand {
  0% {
    width: 0;
    height: 0;
    opacity: 0.4;
  }
  100% {
    width: 400px;
    height: 400px;
    opacity: 0;
  }
}
```

**Apply to:** Every card, every button, every nav pill, every timeline event, every concept node's click handler, every phase card.

### 4.2 Press-Down Feedback

When a button or card is clicked (`:active` state), it should visually press down — not just change color:

```css
.btn-primary:active,
.card:active,
.timeline-event:active,
.nav-pill:active {
  transform: translateY(0px) scale(0.97);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  transition-duration: 80ms; /* quick press */
}
```

The key: `scale(0.97)` on press, `scale(1.02)` on hover, `scale(1.0)` at rest. Three states that give the element physical depth.

### 4.3 Hover Elevation

Every interactive card lifts on hover with a shadow that grows underneath, simulating the card rising off the surface:

```css
.card {
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.2),
    0 0 0 1px var(--border);
  transition: all 400ms cubic-bezier(0.22, 1, 0.36, 1);
}

.card:hover {
  transform: translateY(-4px);
  box-shadow:
    0 8px 24px rgba(0, 0, 0, 0.4),
    0 0 0 1px var(--border-glow),
    0 0 30px var(--card-glow, rgba(0, 240, 255, 0.08));
}

.card:active {
  transform: translateY(-1px) scale(0.98);
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.3),
    0 0 0 1px var(--border);
  transition-duration: 100ms;
}
```

**Three elevation states: rest (flat), hover (lifted), active (pressed). Like a real physical button.**

### 4.4 Scroll Physics

All scrollable containers use momentum scrolling with overscroll bounce:

```css
.scrollable {
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
}
```

On desktop, add a subtle elastic overscroll effect at the top and bottom of long content:

```typescript
function useElasticScroll(ref: RefObject<HTMLElement>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    
    let rubber = 0;
    
    const onScroll = () => {
      if (el.scrollTop < 0) {
        rubber = Math.abs(el.scrollTop) * 0.3;
        el.style.transform = `translateY(${rubber}px)`;
      } else if (el.scrollTop + el.clientHeight > el.scrollHeight) {
        rubber = -(el.scrollTop + el.clientHeight - el.scrollHeight) * 0.3;
        el.style.transform = `translateY(${rubber}px)`;
      } else if (rubber !== 0) {
        el.style.transform = '';
        rubber = 0;
      }
    };
    
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, [ref]);
}
```

### 4.5 Haptic Feedback (Mobile)

On devices that support it, trigger subtle vibrations on key moments:

```typescript
function haptic(style: 'light' | 'medium' | 'heavy' = 'light') {
  if (!navigator.vibrate) return;
  
  switch (style) {
    case 'light': navigator.vibrate(10); break;
    case 'medium': navigator.vibrate(25); break;
    case 'heavy': navigator.vibrate([15, 50, 15]); break;
  }
}

// Use on: button clicks (light), correct answers (medium), phase completion (heavy)
```

### 4.6 Smooth Focus Transitions

When navigating by keyboard, the focus ring doesn't just appear — it transitions in:

```css
*:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 2px var(--bg-void),
    0 0 0 4px var(--cyan);
  transition: box-shadow 200ms cubic-bezier(0.22, 1, 0.36, 1);
  border-radius: inherit;
}
```

---

## 5. EVERY MISSING FEATURE FOR PERFECTION

This section lists every feature that doesn't exist yet but should for a complete, polished product.

### 5.1 Course Switcher

Students take multiple courses. The app should support switching between captured courses without losing data.

```
┌─ COURSE SWITCHER (top bar dropdown) ──────────────────┐
│                                                        │
│  PHI 208 · Ethics and Moral Reasoning  ← ACTIVE       │
│  PSY 101 · Intro Psychology                            │
│  ENG 201 · English Composition                         │
│                                                        │
│  ─────────────────                                     │
│  [ + IMPORT NEW COURSE ]                               │
│                                                        │
└────────────────────────────────────────────────────────┘
```

Each course has its own IndexedDB namespace. Switching courses swaps the active dataset. All views refresh.

### 5.2 Search Everything

A global search bar in the top navigation that searches across ALL content: concepts, assignments, discussions, textbook passages, quiz questions, notes.

```
┌─ SEARCH ────────────────────────────────────────────┐
│  🔍 utilitarianism                                   │
├──────────────────────────────────────────────────────┤
│                                                      │
│  CONCEPTS (3)                                        │
│  ● Utilitarianism — The ethical theory that...       │
│  ● Act vs Rule Utilitarianism — Act evaluates...     │
│  ● Felicific Calculus — Bentham's method to...       │
│                                                      │
│  ASSIGNMENTS (2)                                     │
│  📝 Ethics Paper 1: Utilitarianism in Practice       │
│  💬 Week 4 Discussion: The Trolley Problem           │
│                                                      │
│  TEXTBOOK (4 passages)                               │
│  📖 Ch 3 p 44: "Utilitarianism is the ethical..."    │
│  📖 Ch 3 p 51: "Mill argued that pleasures..."       │
│  📖 Ch 3 p 47: "The most troubling objection..."     │
│  📖 Ch 3 p 52: "Act utilitarianism evaluates..."     │
│                                                      │
└──────────────────────────────────────────────────────┘
```

Opens as a command-palette-style overlay (`Cmd+K` / `Ctrl+K` to open). Results grouped by type. Click a result to navigate to it.

Implementation: uses the same Passage Retrieval Engine and concept index from the novel interactions. Search across all indexed content.

### 5.3 Note-Taking System

Students need to jot things down while learning. A lightweight note system that lives inside the app:

- **Quick notes** — a small floating notepad accessible from any view via a corner button
- **Concept notes** — attached to specific concepts (shown in the concept detail panel)
- **Session notes** — automatically created at the end of each Neural Forge session with the session's results
- **Time Capsule letters** — stored as notes after sealing
- **Collision reports** — saved as notes from the Collision Lab

Notes are stored in IndexedDB and searchable via the global search.

### 5.4 Progress Dashboard (Visual)

The current "Mission Control" shows stats as raw numbers. Replace with visual progress indicators:

**Semester Progress Ring** — a large circular progress indicator showing overall course completion (assignments submitted / total assignments × points weighting).

**Mastery Heatmap** — a grid of colored squares (one per concept) showing mastery levels at a glance. Like a GitHub contribution graph but for learning.

**Weekly Activity Chart** — a small bar chart showing how much time was spent in the app each day over the past 2 weeks. Computed from session timestamps.

**Grade Projection** — based on completed work and mastery levels, estimate the student's likely course grade. Template: "If you maintain current performance: projected grade B+ (82%). To reach A-: complete Neural Forge on 3 more chapters."

### 5.5 Notification System

Internal notifications (not push notifications) that appear as a toast stack in the bottom-right:

- "Neural Forge session complete — mastery updated for 5 concepts"
- "New goal created: Prepare for Paper 2 by Thursday"
- "Concept mastery decaying: Utilitarianism (was 80%, now 72%) — review recommended"
- "Assignment unlocked: Ethics Paper 1 — all prerequisites met"
- "Time Capsule audit: 5/7 promises kept on Paper 1"

```css
.toast-stack {
  position: fixed;
  bottom: var(--space-6);
  right: var(--space-6);
  display: flex;
  flex-direction: column-reverse;
  gap: var(--space-3);
  z-index: 100;
  pointer-events: none;
}

.toast {
  padding: var(--space-4) var(--space-5);
  background: var(--bg-card-raised);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  max-width: 360px;
  pointer-events: auto;
  animation: toastIn 500ms cubic-bezier(0.22, 1, 0.36, 1);
}

.toast[data-type="success"] { border-left: 4px solid var(--green); }
.toast[data-type="info"] { border-left: 4px solid var(--cyan); }
.toast[data-type="warning"] { border-left: 4px solid var(--orange); }
.toast[data-type="achievement"] { border-left: 4px solid var(--gold); }

@keyframes toastIn {
  from { opacity: 0; transform: translateX(100px); }
  to { opacity: 1; transform: translateX(0); }
}
```

### 5.6 Onboarding Flow (For Non-Demo Users)

When a real student imports their first course (not the demo), a 3-step onboarding guides them:

1. **"Welcome to AEONTHRA"** — explain the 3 things they'll see (timeline, concept map, Neural Forge)
2. **"How to use Neural Forge"** — explain the 5 phases in 30 seconds
3. **"Your first goal"** — the system auto-selects their most urgent assignment and suggests: "Start with Neural Forge for Chapter 3 to prepare for Paper 1 (due in 5 days)"

### 5.7 Keyboard Shortcuts

Power users should be able to navigate entirely by keyboard:

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + K` | Open global search |
| `Cmd/Ctrl + 1` | Go to Dashboard |
| `Cmd/Ctrl + 2` | Go to Timeline |
| `Cmd/Ctrl + 3` | Go to Concept Map |
| `Cmd/Ctrl + 4` | Go to Neural Forge |
| `Cmd/Ctrl + 5` | Go to Assignment |
| `Cmd/Ctrl + N` | Quick note |
| `Cmd/Ctrl + E` | Export current view |
| `Space` | Advance to next (in Forge) |
| `1-4` | Select quiz option (in Forge) |
| `T / F` | True / False (in Rapid Fire) |
| `Esc` | Close panel / modal / overlay |
| `?` | Show keyboard shortcut help |

### 5.8 Dark/Light Mode (Just Kidding — Dark Only)

AEONTHRA is dark only. But add a **High Contrast** mode for accessibility that boosts text brightness and border visibility:

```css
[data-theme="high-contrast"] {
  --text-primary: #ffffff;
  --text-secondary: #d0d0ff;
  --text-muted: #9090cc;
  --border: #2a2a5a;
  --border-glow: rgba(0, 240, 255, 0.4);
}
```

### 5.9 Print-Friendly Study Summary

If a student needs to print their concept overview (for offline study, or for an exam cheat sheet if allowed), a "Print Study Sheet" button generates a printer-friendly view:

- White background with dark text (optimized for printing)
- All concepts listed with definitions and mnemonics
- Concept relationships shown as a simple list
- Mastery levels indicated with filled/empty circles
- Formatted as a clean 2-column layout that fits on 1-3 pages

### 5.10 Assignment Calendar View

In addition to the horizontal timeline, offer a traditional month-grid calendar view:

```
┌─── APRIL 2026 ──────────────────────────────────────────────┐
│  SUN    MON    TUE    WED    THU    FRI    SAT              │
│                1      2      3      4      5                │
│                              ●quiz                          │
│                                                             │
│  6      7      8      9      10     11     12               │
│                       ●disc         ●paper                  │
│                                                             │
│  13     14     15     16     17     18     19               │
│  ●disc                              ●quiz                   │
│                                                             │
│  20     21     22     23     24     25     26               │
│                                     ●paper                  │
│                                                             │
│  27     28     29     30                                    │
│                ●disc                                        │
└─────────────────────────────────────────────────────────────┘
```

Each dot is a small colored indicator matching the event type. Clicking a day shows that day's events in a side panel.

---

## 6. REMOVING ALL BUGGINESS — THE FINAL CLEANUP

### 6.1 Content that still leaks through

Audit every text surface in the app against these rules:

- **No "Module N -" prefixes.** Strip them from all concept names, all titles, all displayed text.
- **No duplicate phrases.** "Time Blocking and Prioritization Time Blocking and Prioritization" should never appear anywhere.
- **No "Links to an external site."** Canvas chrome — strip from all displayed content.
- **No "| Transcript Download Transcript"** — strip pipe-separated nav artifacts.
- **No raw HTML entities.** `&amp;` should be `&`, `&ldquo;` should be `"`.
- **No lone "Mark Done" or "Submit Assignment"** — Canvas UI chrome that leaked through.

Run a global text sanitizer on all displayed content:

```typescript
function sanitizeDisplayText(text: string): string {
  return text
    // Strip module prefix
    .replace(/^Module\s+\d+\s*[-–—]\s*/gi, '')
    // Strip Canvas chrome
    .replace(/\blinks?\s+to\s+an?\s+external\s+site\.?/gi, '')
    .replace(/\|\s*Transcript\s*Download\s*Transcript/gi, '')
    .replace(/\bMark\s+(as\s+)?Done\b/gi, '')
    .replace(/\bSubmit\s+Assignment\b/gi, '')
    .replace(/\bView\s+Rubric\b/gi, '')
    // Deduplicate adjacent phrase repeats
    .replace(/\b(\w[\w\s]{3,40}?)\s+\1\b/gi, '$1')
    // Fix HTML entities
    .replace(/&amp;/g, '&')
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&lsquo;|&rsquo;/g, "'")
    .replace(/&nbsp;/g, ' ')
    // Collapse multiple spaces
    .replace(/\s{2,}/g, ' ')
    .trim();
}
```

Apply `sanitizeDisplayText()` in every component that renders captured text. No exceptions.

### 6.2 Loading States for Everything

Every async operation has a loading state. No blank screens, no hanging, no "nothing happened when I clicked."

| Operation | Loading State |
|-----------|--------------|
| Route navigation | Skeleton screen |
| Textbook processing | Progress modal with stage + percentage |
| Neural Forge question load | Orbital spinner centered in question area |
| Concept Map data load | Star field visible, nodes fade in as data loads |
| Assignment detail load | Skeleton cards in all 3 columns |
| Search | Inline "Searching..." text below input |
| Export/Download | Button shows spinner, then checkmark |
| Handoff to/from extension | Toast notification with progress |
| IndexedDB reads | Data from LRU cache shows immediately; DB data replaces seamlessly |

### 6.3 Error States for Everything

Every operation that can fail has a designed error state:

| Error | Display |
|-------|---------|
| Textbook too short | "Not enough content to extract concepts. Try a longer text or a different chapter." |
| PDF parsing failed | "Could not read this PDF. It may be scanned (image-only). Try pasting the text instead." |
| No concepts extracted | "No learnable concepts detected. The captured content may be mostly navigation. Try capturing a different page." |
| Storage full | "Browser storage is full. Export or delete old captures to make room." |
| Extension handoff failed | "Could not connect to AEONTHRA Classroom. Is the tab open? Try downloading the JSON and importing manually." |

Every error is shown in a styled card with an icon, clear explanation, and suggested action. No raw error messages. No blank screens. No console-only errors.

### 6.4 Acceptance test

Navigate every view in the app. Click every button. Open every panel. No text should show "Module N -" prefixes. No text should show "Links to an external site." No view should ever be blank (always skeleton or empty state). No button should ever do nothing when clicked (always loading state or feedback).

---

## 7. THE DASHBOARD REBUILD

The dashboard is the first thing the student sees after import. It needs to feel like mission control, not a spreadsheet.

### 7.1 Layout

```
┌─ TOP BAR ──────────────────────────────────────────────────────────┐
│  AEONTHRA ● ● ● ●  PHI 208  │  [course switcher ▾]  │  🔍  │ ⚙  │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌─ HERO ZONE ────────────────────────────────────────────────┐    │
│  │                                                            │    │
│  │  Welcome back, Shadow.                                     │    │
│  │                                                            │    │
│  │  ┌── PROGRESS ──┐  ┌── MASTERY ──┐  ┌── STREAK ──┐        │    │
│  │  │              │  │             │  │            │        │    │
│  │  │    67%       │  │    42%      │  │  3 days    │        │    │
│  │  │  (ring)      │  │  (ring)     │  │  (flame)   │        │    │
│  │  │              │  │             │  │            │        │    │
│  │  │ 14/22 tasks  │  │ 5/12 concepts│  │ keep going │        │    │
│  │  └──────────────┘  └─────────────┘  └────────────┘        │    │
│  │                                                            │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                    │
│  ┌─ DAILY REVIEW ─────────────────────────────────────────────┐    │
│  │  🔁 5 concepts due for review · 5 min estimated            │    │
│  │  [ START REVIEW ]                                          │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                    │
│  ┌─ TIMELINE PREVIEW (click to expand) ───────────────────────┐    │
│  │  ◀ Mar 31 ── Apr 7 ── Apr 14 ── Apr 21 ►                 │    │
│  │  ● ●● ●     ● ●       ● ●●      ●                        │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                    │
│  ┌─ ACTIVE WORK ──────────────────────────────────────────────┐    │
│  │                                                            │    │
│  │  ┌─ UPCOMING (due this week) ───────────────────────────┐  │    │
│  │  │                                                      │  │    │
│  │  │  📝 Ethics Paper 1         Apr 14  100pt  LOCKED    │  │    │
│  │  │  💬 Week 4 Discussion     Apr 12   25pt  OPEN      │  │    │
│  │  │  ❓ Midterm Quiz           Apr 16   50pt  LOCKED    │  │    │
│  │  │                                                      │  │    │
│  │  └──────────────────────────────────────────────────────┘  │    │
│  │                                                            │    │
│  │  ┌─ COMING UP (next 2 weeks) ───────────────────────────┐  │    │
│  │  │                                                      │  │    │
│  │  │  📝 Ethics Paper 2         Apr 28  100pt  LOCKED    │  │    │
│  │  │  💬 Week 5 Discussion     Apr 19   25pt  LOCKED    │  │    │
│  │  │                                                      │  │    │
│  │  └──────────────────────────────────────────────────────┘  │    │
│  │                                                            │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                    │
│  ┌─ CONCEPT FIELD (mini mastery heatmap) ─────────────────────┐    │
│  │  ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■     5 mastered · 4 learning     │    │
│  │  [ OPEN CONCEPT MAP ]                                      │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

### 7.2 Key Differences From Current Dashboard

- **Personalized greeting** with the student's name (from settings)
- **Three visual progress rings** instead of raw numbers
- **Daily Review widget** prominently placed (from Competition Edge's spaced repetition)
- **Timeline is a preview strip**, not a full timeline — clicking it navigates to the full Timeline view
- **Active Work is grouped by urgency** (this week vs coming up), not by content type
- **Concept Field is a heatmap**, not a list of cards — one colored square per concept, colored by mastery

### 7.3 Progress Rings

```tsx
function ProgressRing({ value, max, label, sublabel, color }: {
  value: number;
  max: number;
  label: string;
  sublabel: string;
  color: string;
}) {
  const pct = (value / max) * 100;
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;
  
  return (
    <div className="progress-ring">
      <svg width="120" height="120" viewBox="0 0 120 120">
        {/* Background ring */}
        <circle
          cx="60" cy="60" r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth="6"
        />
        {/* Progress ring */}
        <circle
          cx="60" cy="60" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 60 60)"
          style={{ transition: 'stroke-dashoffset 800ms cubic-bezier(0.22, 1, 0.36, 1)' }}
          filter={`drop-shadow(0 0 8px ${color})`}
        />
        {/* Center text */}
        <text x="60" y="55" textAnchor="middle" fill="#e0e0ff" fontSize="22" fontFamily="JetBrains Mono" fontWeight="700">
          {Math.round(pct)}%
        </text>
        <text x="60" y="75" textAnchor="middle" fill="#6a6a9a" fontSize="9" fontFamily="Sora">
          {sublabel}
        </text>
      </svg>
      <div className="progress-ring__label">{label}</div>
    </div>
  );
}
```

---

## 8. NEURAL FORGE — MAKE IT FEEL LIKE A GAME

Neural Forge shouldn't feel like a quiz tool. It should feel like a game. Specifically, it should have the pacing and feedback loops of a well-designed mobile game.

### 8.1 Score Animations

When the student answers correctly:
- The score counter does a spring-bounce (+1 animates up from the button)
- A brief green flash at the edges of the screen (100ms)
- The streak counter updates with a scale-up bounce
- At 3-streak: flame emoji appears with a glow pulse
- At 5-streak: "🔥🔥🔥 ON FIRE" text flashes in Orbitron across the top
- At 10-streak: the screen briefly fills with gold particle confetti (200ms)

When the student answers incorrectly:
- Brief red flash at edges (50ms, subtle)
- Streak resets (flame emoji fades out)
- No shame, no penalty sound, no negative animation beyond the brief flash
- The explanation appears in a calm, supportive box

### 8.2 Phase Completion Celebrations

When a phase is completed:
- Screen dims slightly
- A large checkmark draws itself in the center (SVG path animation, 800ms)
- Phase name and score appear below in Orbitron
- Gold border sweeps around the edge of the screen
- "ADVANCE TO [NEXT PHASE]" button pulses with the next phase's color
- All of this takes 2 seconds, then the student clicks to advance

### 8.3 Final Results — The Victory Screen

When all 5 phases are complete, the results screen is a full-viewport celebration:

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│                                                                  │
│                                                                  │
│                    SESSION COMPLETE                              │
│                                                                  │
│                         ⭐                                       │
│                       ⭐   ⭐                                    │
│                     ⭐       ⭐                                  │
│                       ⭐   ⭐                                    │
│                         ⭐                                       │
│                                                                  │
│                    GRADE: A (87%)                                │
│                                                                  │
│              Time: 52 min  ·  Calibration: 78%                  │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │ GENESIS  │  │  FORGE   │  │ CRUCIBLE │  │TRANSCEND │         │
│  │   95%    │  │   82%    │  │   78%    │  │   91%    │         │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘         │
│                                                                  │
│  CONCEPTS STRENGTHENED: 5                                        │
│  ● Utilitarianism       +22%  ████████████████░░░░  80%         │
│  ● Felicific Calculus    +18%  ███████████████░░░░░  75%         │
│  ● Higher/Lower          +15%  ████████████░░░░░░░░  60%         │
│  ● Experience Machine    +25%  ██████████████████░░  90%         │
│  ● Act vs Rule           +12%  ██████████░░░░░░░░░░  50%         │
│                                                                  │
│  [ 📋 EXPORT SUMMARY ]  [ 🔁 REVIEW IN 24h ]  [ 🏠 DASHBOARD ] │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

The star constellation animation plays on load. Grade glows in gold. Each concept's mastery bar animates from its previous value to the new value over 1 second.

---

## 9. ACCEPTANCE CHECKLIST

Before declaring this pass complete:

### Scale
- [ ] Timeline is a full-screen horizontal scrolling landscape, not a dashboard widget
- [ ] Concept Map fills the entire viewport with pan/zoom camera
- [ ] Cards have minimum 24px padding
- [ ] Grid gaps are at least 20px
- [ ] Sections have at least 40px between them
- [ ] Max content width is 1600px (wider than before)
- [ ] No element touches another element without a gap
- [ ] Typography uses `clamp()` for responsive sizing — never too small

### Tactile
- [ ] Every clickable element has ripple effect on click
- [ ] Every card has 3 elevation states: rest → hover (lift) → active (press)
- [ ] Timeline supports drag-scrolling with momentum and snap points
- [ ] Concept map supports pan and zoom with pinch on touch
- [ ] Keyboard focus has smooth transition-in ring
- [ ] Mobile interactions trigger haptic feedback on key moments

### Completeness
- [ ] Course switcher in top bar supports multiple captured courses
- [ ] Global search via Cmd/Ctrl+K searches concepts, assignments, passages
- [ ] Note-taking system with quick notes and concept-attached notes
- [ ] Dashboard shows progress rings (not raw numbers)
- [ ] Daily Review widget appears when SRS concepts are due
- [ ] Timeline preview strip on dashboard (not full timeline)
- [ ] Notification toast system for all state changes
- [ ] Onboarding flow for first-time users (non-demo)
- [ ] Keyboard shortcuts for all primary navigation
- [ ] High Contrast accessibility mode
- [ ] Print-friendly study summary
- [ ] Calendar month-view as timeline alternative
- [ ] All loading states render skeletons or spinners
- [ ] All error states render styled cards with explanations and actions
- [ ] `sanitizeDisplayText()` applied to all rendered captured content

### Neural Forge
- [ ] Correct answer: green flash + score bounce + streak animation
- [ ] 3-streak: fire emoji
- [ ] 5-streak: "ON FIRE" flash
- [ ] 10-streak: gold confetti (brief)
- [ ] Incorrect: subtle red flash, no shame, explanation appears calmly
- [ ] Phase completion: full-screen checkmark draw animation
- [ ] Final results: victory screen with star constellation, grade, mastery bars

### Bug-free
- [ ] No "Module N -" prefixes anywhere in displayed text
- [ ] No duplicate phrase repetitions anywhere
- [ ] No "Links to an external site" anywhere
- [ ] No "| Transcript Download Transcript" anywhere
- [ ] No blank screens — every async operation has a loading state
- [ ] No dead buttons — every click produces visible feedback

---

## 10. THE PROMISE

When this pass is complete, AEONTHRA will not feel like a web app. It will feel like a place. A dark, calm, expansive space that the student navigates through. A space where the timeline stretches out before them like a road. Where the concept map floats around them like a constellation. Where every touch has weight and every interaction has feedback.

The student will open it and think: *"This was built for me."*

Not "this is a tool I use." Not "this is a dashboard I check." But: **"This is my learning space. I live here while I learn."**

That's the scale. That's the feel. That's the vision.

Build it exactly this way. Then ship the most complete, most polished, most immersive deterministic learning system anyone has ever seen.

**This is the last document. After this, there is nothing left to specify. Only to build, verify, and win.**
