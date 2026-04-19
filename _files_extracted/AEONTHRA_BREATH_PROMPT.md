# AEONTHRA BREATH PROMPT — Making It Alive

**Codex: the foundation is correct. The wordmark glows cyan. The phase cards are themed. The background is dark. You followed the design system. Good.**

**What's missing is the layer that makes this feel like a learning instrument instead of a dashboard. The site needs to breathe, respond, gate, and guide. This document defines the nine engines that create that layer, plus the exact interactivity upgrades for every view.**

**Read this in full. Execute all nine engines. Fix the spacing. Make Neural Forge actually playable. Make the timeline real. Make the gating work. Do not ship until every section below passes.**

---

## 0. WHAT'S BROKEN RIGHT NOW

Looking at the current build:

- ❌ **Concept cards are static text blocks.** They should expand, animate, reveal detail, and link to related concepts across views.
- ❌ **No timeline view visible anywhere.** The timeline is the signature view and it doesn't exist.
- ❌ **Neural Forge phases show summaries instead of interactive quizzes.** Clicking a phase should start a real question-by-question session with state, scoring, and progression.
- ❌ **Source URLs are flat link pills.** They should show which concepts they teach, with a relevance badge and hover preview.
- ❌ **Nothing gates anything.** Students can skip Neural Forge and jump straight to assignments with no enforcement of prerequisite learning.
- ❌ **No goals. No motivation. No rhythm.** The timeline is flat. There's no "do this before Thursday."
- ❌ **Spacing is cramped.** Cards touch each other. Sections have no breathing room. The 16px rhythm is broken in multiple places.
- ❌ **Nothing reacts to anything.** Hover a concept, nothing else lights up. Open an assignment, nothing else dims. The interface has no awareness of user attention.
- ❌ **Layout is fixed regardless of content volume.** A tiny capture and a huge capture look identical — they should breathe differently.
- ❌ **No physics in motion.** Animations are linear CSS transitions. Nothing has weight, momentum, or bounce.

Every problem above is fixed by the nine engines in Section 2.

---

## 1. THE SPACING FIX (DO THIS FIRST)

Before any engine work, fix the broken spacing. The current layout violates the rhythm you're supposed to be following. Install these exact rules as CSS custom properties at the root.

### 1.1 The Spacing Scale

```css
:root {
  /* Base unit */
  --unit: 8px;
  
  /* Scale (0.5× to 8×) */
  --space-0: 0;
  --space-1: 4px;    /* tight - between icon and label */
  --space-2: 8px;    /* close - related siblings */
  --space-3: 12px;   /* comfortable - within a card */
  --space-4: 16px;   /* standard - grid gap, card siblings */
  --space-5: 20px;   /* generous - card padding */
  --space-6: 24px;   /* section internal */
  --space-8: 32px;   /* between primary sections */
  --space-10: 40px;  /* view padding top */
  --space-12: 48px;  /* between major zones */
  --space-16: 64px;  /* hero spacing */
  --space-20: 80px;  /* top-of-page breathing room */
}
```

### 1.2 Layout Rhythm Rules (Enforced)

```css
/* View-level padding */
.view {
  padding: var(--space-10) var(--space-8);
  max-width: 1400px;
  margin: 0 auto;
}

/* Grid gap for card clusters */
.grid-cards {
  display: grid;
  gap: var(--space-4);
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}

/* Between primary sections */
.section + .section {
  margin-top: var(--space-8);
}

/* Card internal padding */
.card {
  padding: var(--space-5);
}

/* Card internal rhythm */
.card > * + * {
  margin-top: var(--space-3);
}

/* Lists inside cards */
.card ul > li + li {
  margin-top: var(--space-2);
}

/* Top bar margin below */
.top-bar {
  margin-bottom: var(--space-8);
}

/* Form elements */
.form-group + .form-group {
  margin-top: var(--space-4);
}
```

### 1.3 The No-Touch Rule

**No two cards may ever share a border. No card may touch another card on any side.** Every card in a grid has `gap: var(--space-4)` minimum. Every section has `margin-top: var(--space-8)` from the previous section. Every top-level view has `padding: var(--space-10) var(--space-8)`.

If you see two cards touching in any screenshot, that's a bug. Fix it.

### 1.4 Responsive Scaling

```css
@media (max-width: 1024px) {
  .view { padding: var(--space-6) var(--space-5); }
  .section + .section { margin-top: var(--space-6); }
}

@media (max-width: 640px) {
  .view { padding: var(--space-5) var(--space-4); }
  .grid-cards { grid-template-columns: 1fr; gap: var(--space-3); }
  .card { padding: var(--space-4); }
}
```

---

## 2. THE NINE ENGINES THAT MAKE IT BREATHE

Each engine has: a name, a purpose, a technical implementation, and an acceptance test. Build all nine. Don't skip any.

### ENGINE 1: ADAPTIVE DENSITY ENGINE

**Purpose:** The layout automatically scales itself based on how much content the user has imported. A tiny capture with 3 assignments feels airy and spacious. A huge capture with 80 assignments feels dense and efficient. The interface literally "breathes out" or "breathes in" based on content volume.

**Implementation:**

On every data change (import, textbook upload, progress update), measure the total content volume:

```typescript
interface ContentMetrics {
  assignmentCount: number;
  discussionCount: number;
  quizCount: number;
  conceptCount: number;
  moduleCount: number;
  totalItems: number;
  textDensity: number; // 0-1, ratio of avg description length to max observed
}

function computeDensity(capture: CapturedCourse, textbook: ForgeBundle[]): number {
  const totalItems = capture.assignments.length + capture.discussions.length 
                   + capture.quizzes.length + textbook.reduce((a, b) => a + b.concepts.length, 0);
  
  // Density buckets
  if (totalItems <= 10) return 0.2;      // airy
  if (totalItems <= 25) return 0.4;      // comfortable  
  if (totalItems <= 50) return 0.6;      // balanced
  if (totalItems <= 100) return 0.8;     // dense
  return 1.0;                             // compact
}
```

Write the density to a CSS custom property that all layout elements respond to:

```typescript
function applyDensity(density: number) {
  document.documentElement.style.setProperty('--density', String(density));
  
  // Density-driven spacing overrides
  const spacingMultiplier = 1.5 - (density * 0.75); // 1.5x at low density, 0.75x at high
  document.documentElement.style.setProperty('--space-multiplier', String(spacingMultiplier));
  
  // Density-driven card sizing
  const cardMinWidth = 320 - (density * 80); // 320px at low, 240px at high
  document.documentElement.style.setProperty('--card-min-width', `${cardMinWidth}px`);
  
  // Density-driven font scale
  const fontScale = 1.05 - (density * 0.1); // slightly larger at low density
  document.documentElement.style.setProperty('--font-scale', String(fontScale));
}
```

```css
.grid-cards {
  gap: calc(var(--space-4) * var(--space-multiplier, 1));
  grid-template-columns: repeat(auto-fit, minmax(var(--card-min-width, 280px), 1fr));
}

.card {
  padding: calc(var(--space-5) * var(--space-multiplier, 1));
}

body {
  font-size: calc(16px * var(--font-scale, 1));
}
```

**Acceptance test:** Import a small fixture (5 assignments) and a large fixture (50 assignments). The small one should visibly have more spacing and larger cards. The large one should have tighter cards in a denser grid. Both should feel intentional, not broken.

---

### ENGINE 2: SPRING PHYSICS MOTION ENGINE

**Purpose:** Every interactive motion uses real spring physics (stiffness, damping, mass) instead of linear CSS transitions. Cards feel weighted. Modals bounce into place. Drag interactions have momentum.

**Implementation:**

Install Framer Motion (bundled, ~100KB) OR implement a minimal spring solver:

```typescript
// packages/motion/src/spring.ts
interface SpringConfig {
  stiffness: number;  // 100-400 typical
  damping: number;    // 15-30 typical
  mass: number;       // 0.5-2 typical
}

const SPRING_PRESETS = {
  snappy:   { stiffness: 400, damping: 30, mass: 1 },
  smooth:   { stiffness: 260, damping: 26, mass: 1 },
  bouncy:   { stiffness: 300, damping: 15, mass: 1 },
  weighted: { stiffness: 180, damping: 22, mass: 1.5 },
  gentle:   { stiffness: 120, damping: 20, mass: 1 },
};

class Spring {
  private value: number;
  private velocity: number = 0;
  private target: number;
  private config: SpringConfig;
  private rafId: number | null = null;
  private onUpdate: (v: number) => void;
  
  constructor(initial: number, config: SpringConfig, onUpdate: (v: number) => void) {
    this.value = initial;
    this.target = initial;
    this.config = config;
    this.onUpdate = onUpdate;
  }
  
  setTarget(target: number) {
    this.target = target;
    if (!this.rafId) this.tick();
  }
  
  private tick = () => {
    const delta = this.target - this.value;
    const springForce = delta * this.config.stiffness;
    const dampingForce = this.velocity * this.config.damping;
    const acceleration = (springForce - dampingForce) / this.config.mass;
    
    this.velocity += acceleration * (1/60);
    this.value += this.velocity * (1/60);
    
    this.onUpdate(this.value);
    
    const atRest = Math.abs(delta) < 0.01 && Math.abs(this.velocity) < 0.01;
    if (atRest) {
      this.value = this.target;
      this.velocity = 0;
      this.onUpdate(this.value);
      this.rafId = null;
    } else {
      this.rafId = requestAnimationFrame(this.tick);
    }
  };
}
```

**Usage everywhere:**
- Card hover: spring scale from 1.0 to 1.02 using `smooth`
- Modal open: spring translate from 20px to 0 using `bouncy`
- Timer tick: spring scale pulse using `snappy`
- Drag release: spring return to origin using `weighted`
- Phase transition: spring crossfade using `gentle`

**Acceptance test:** Hover a card. It should feel like it has weight — a slight lift with subtle overshoot, then settle. Not a linear 200ms slide.

---

### ENGINE 3: FOCUS CHOREOGRAPHY ENGINE

**Purpose:** When the user focuses on any element (hover, click, keyboard), related elements across the entire UI brighten while unrelated elements dim. Creates a spotlight effect that teaches relationships.

**Implementation:**

Central Zustand store for focus state:

```typescript
// state/focus-store.ts
interface FocusState {
  focusedType: 'concept' | 'assignment' | 'discussion' | 'chapter' | null;
  focusedId: string | null;
  relatedIds: Set<string>;
  
  focus: (type: string, id: string, related: string[]) => void;
  clear: () => void;
}

const useFocus = create<FocusState>((set) => ({
  focusedType: null,
  focusedId: null,
  relatedIds: new Set(),
  
  focus: (type, id, related) => set({ 
    focusedType: type as any, 
    focusedId: id, 
    relatedIds: new Set(related) 
  }),
  clear: () => set({ focusedType: null, focusedId: null, relatedIds: new Set() }),
}));
```

Every component subscribes and applies a focus class:

```typescript
function ConceptCard({ concept }: { concept: Concept }) {
  const { focusedId, relatedIds, focus, clear } = useFocus();
  
  const isFocused = focusedId === concept.id;
  const isRelated = relatedIds.has(concept.id);
  const isOut = focusedId !== null && !isFocused && !isRelated;
  
  return (
    <div
      className={cls('card', {
        'card--focused': isFocused,
        'card--related': isRelated,
        'card--out-of-focus': isOut,
      })}
      onMouseEnter={() => focus('concept', concept.id, concept.relatedConcepts.map(String))}
      onMouseLeave={clear}
    >
      {/* ... */}
    </div>
  );
}
```

```css
.card {
  transition: opacity 300ms ease, filter 300ms ease, transform 300ms ease;
}

.card--focused {
  opacity: 1;
  filter: brightness(1.15) saturate(1.2);
  transform: scale(1.02);
  box-shadow: 0 0 40px rgba(0, 240, 255, 0.2);
  z-index: 10;
}

.card--related {
  opacity: 1;
  filter: brightness(1.05);
  box-shadow: 0 0 20px rgba(6, 214, 160, 0.15);
}

.card--out-of-focus {
  opacity: 0.35;
  filter: saturate(0.5) brightness(0.7);
}
```

**Acceptance test:** Hover a concept in the concept list. Its related concepts (anywhere else on screen) should subtly glow teal. Unrelated concepts should dim to 35% opacity. Move away — everything returns to normal.

---

### ENGINE 4: PROGRESS GATING ENGINE

**Purpose:** Enforces learning prerequisites. A student cannot open the submission workspace for an assignment until they've completed Neural Forge sessions covering the paired textbook chapters to at least 60% mastery on relevant concepts. Gating creates intrinsic motivation to learn first.

**Implementation:**

```typescript
// engines/gating.ts
interface Gate {
  itemId: string;
  itemType: 'assignment' | 'discussion' | 'quiz';
  requirements: GateRequirement[];
  status: 'locked' | 'unlocked';
}

interface GateRequirement {
  type: 'concept-mastery' | 'phase-completion' | 'prerequisite-item';
  conceptIds?: string[];
  minMastery?: number; // 0-1
  phaseId?: 'genesis' | 'forge' | 'crucible' | 'architect' | 'transcend';
  chapterId?: string;
  prereqItemId?: string;
}

function computeGate(
  item: CapturedAssignment | CapturedDiscussion, 
  graph: ConceptGraph,
  progress: ProgressState
): Gate {
  // Find concepts this item touches via the Fusion Engine pairing
  const relatedConcepts = findRelatedConcepts(item, graph);
  
  // Require 60% mastery on top 3 concepts
  const topConcepts = relatedConcepts
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, 3);
  
  const requirements: GateRequirement[] = [{
    type: 'concept-mastery',
    conceptIds: topConcepts.map(c => c.id),
    minMastery: 0.6,
  }];
  
  // Check if met
  const allMet = requirements.every(req => {
    if (req.type === 'concept-mastery') {
      return req.conceptIds!.every(id => 
        (progress.conceptMastery[id] || 0) >= req.minMastery!
      );
    }
    return true;
  });
  
  return {
    itemId: item.id,
    itemType: item.type,
    requirements,
    status: allMet ? 'unlocked' : 'locked',
  };
}
```

**UI for locked items:**

```tsx
function LockedItemCard({ item, gate }: { item: CapturedAssignment, gate: Gate }) {
  const unmetReqs = gate.requirements.filter(r => !isRequirementMet(r));
  
  return (
    <div className="card card--locked">
      <div className="lock-overlay">
        <div className="lock-icon">🔒</div>
        <div className="lock-title">PREPARE FIRST</div>
        <div className="lock-hint">
          Complete Neural Forge for these concepts first:
        </div>
        <ul className="lock-reqs">
          {unmetReqs.map(req => (
            <li>
              {req.conceptIds!.map(id => {
                const mastery = progress.conceptMastery[id] || 0;
                return (
                  <div className="lock-req-row">
                    <span>{graph.concepts[id].name}</span>
                    <ProgressBar pct={mastery * 100} target={60} />
                  </div>
                );
              })}
            </li>
          ))}
        </ul>
        <button className="btn btn-teal" onClick={() => navigateToForge(item)}>
          ⚡ PREPARE IN NEURAL FORGE
        </button>
      </div>
      <div className="card-content-dimmed">
        {/* Assignment content, but dimmed and non-interactive */}
      </div>
    </div>
  );
}
```

```css
.card--locked {
  position: relative;
  filter: saturate(0.4) brightness(0.6);
  pointer-events: none;
}

.card--locked .lock-overlay {
  position: absolute;
  inset: 0;
  background: rgba(2, 2, 8, 0.85);
  backdrop-filter: blur(8px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-4);
  pointer-events: auto;
  border-radius: 14px;
  border: 1px solid rgba(6, 214, 160, 0.3);
}

.lock-icon {
  font-size: 2rem;
  filter: drop-shadow(0 0 20px rgba(6, 214, 160, 0.4));
}

.lock-title {
  font-family: 'Orbitron', sans-serif;
  font-size: 0.75rem;
  letter-spacing: 0.15em;
  color: var(--teal);
}
```

**Gating can be softened** — add a global "Practice Mode" toggle in settings that bypasses gates for emergency access. But gates are ON by default.

**Acceptance test:** Open a freshly imported course. Every assignment with a paired textbook chapter should show as LOCKED with specific concept requirements. Completing Neural Forge for those concepts should progressively unlock the assignment with a visible unlock animation.

---

### ENGINE 5: GOAL WEAVING ENGINE

**Purpose:** Automatically weaves micro-goals into the timeline based on due dates, mastery gaps, and recommended pacing. Goals aren't manually set — they emerge from the data.

**Implementation:**

```typescript
// engines/goal-weaver.ts
interface Goal {
  id: string;
  type: 'prepare-forge' | 'review-concept' | 'start-early' | 'reach-mastery';
  title: string;
  description: string;
  targetDate: number;
  linkedItemId: string;
  relevance: number;
  completed: boolean;
}

function weaveGoals(
  course: CapturedCourse,
  graph: ConceptGraph,
  progress: ProgressState,
  now: number = Date.now()
): Goal[] {
  const goals: Goal[] = [];
  
  for (const assignment of course.assignments) {
    if (!assignment.dueDate) continue;
    const daysUntilDue = (assignment.dueDate - now) / (1000 * 60 * 60 * 24);
    
    // Goal 1: Prepare in Neural Forge before due date
    const relatedConcepts = findRelatedConcepts(assignment, graph);
    const unmasteredConcepts = relatedConcepts.filter(c => 
      (progress.conceptMastery[c.id] || 0) < 0.6
    );
    
    if (unmasteredConcepts.length > 0 && daysUntilDue > 0 && daysUntilDue <= 14) {
      const prepareBy = assignment.dueDate - (2 * 24 * 60 * 60 * 1000); // 2 days before
      goals.push({
        id: `prep-${assignment.id}`,
        type: 'prepare-forge',
        title: `Prepare for ${truncate(assignment.title, 40)}`,
        description: `Complete Neural Forge on ${unmasteredConcepts.slice(0,3).map(c => c.name).join(', ')}`,
        targetDate: prepareBy,
        linkedItemId: assignment.id,
        relevance: 1.0 - (daysUntilDue / 14), // more urgent = higher relevance
        completed: false,
      });
    }
    
    // Goal 2: Start writing 3 days before due
    if (daysUntilDue > 0 && daysUntilDue <= 7) {
      const startBy = assignment.dueDate - (3 * 24 * 60 * 60 * 1000);
      if (startBy > now) {
        goals.push({
          id: `start-${assignment.id}`,
          type: 'start-early',
          title: `Begin drafting ${truncate(assignment.title, 40)}`,
          description: `Open the submission workspace and write at least 200 words`,
          targetDate: startBy,
          linkedItemId: assignment.id,
          relevance: 0.8,
          completed: false,
        });
      }
    }
  }
  
  // Goal 3: Review concepts with declining mastery
  for (const conceptId in progress.conceptMastery) {
    const concept = graph.concepts[conceptId];
    const mastery = progress.conceptMastery[conceptId];
    const lastPracticed = concept.lastPracticed || 0;
    const daysSince = (now - lastPracticed) / (1000 * 60 * 60 * 24);
    
    if (mastery > 0.6 && daysSince > 7) {
      goals.push({
        id: `review-${conceptId}`,
        type: 'review-concept',
        title: `Review ${concept.name}`,
        description: `Mastery decaying — quick refresh in 5 minutes`,
        targetDate: now + (24 * 60 * 60 * 1000),
        linkedItemId: conceptId,
        relevance: 0.5,
        completed: false,
      });
    }
  }
  
  return goals.sort((a, b) => b.relevance - a.relevance);
}
```

**UI:** Goals appear as translucent cyan-bordered cards woven into the timeline between real events. They're visually distinct (dashed border, semi-transparent) but clickable and can be marked done.

**Acceptance test:** Import a course with several assignments. The timeline should automatically generate 5-10 goal cards interleaved between real events, each with clear actions.

---

### ENGINE 6: LINK RESOLUTION ENGINE

**Purpose:** Every source URL captured from Canvas gets analyzed and shown with a badge indicating which concepts it teaches. No more flat link pills.

**Implementation:**

For every captured URL, the Canvas extension should capture not just the URL but also the surrounding page context (title, breadcrumbs, and a snippet of the linked page's content if the student visited it).

```typescript
interface EnhancedLink {
  url: string;
  title: string;
  type: 'assignment' | 'discussion' | 'page' | 'quiz' | 'file' | 'external';
  capturedContent?: string; // if the student visited this link, its content
  matchedConcepts: ConceptMatch[];
  primaryConcept: string | null;
  relevanceLabel: 'strongly-related' | 'related' | 'mentioned' | 'unclear';
}

interface ConceptMatch {
  conceptId: string;
  conceptName: string;
  score: number;
  matchType: 'title' | 'content' | 'keyword';
}

function resolveLink(link: CapturedLink, graph: ConceptGraph): EnhancedLink {
  const matches: ConceptMatch[] = [];
  const searchText = [link.title, link.capturedContent || ''].join(' ').toLowerCase();
  
  for (const conceptId in graph.concepts) {
    const concept = graph.concepts[conceptId];
    let score = 0;
    let matchType: 'title' | 'content' | 'keyword' = 'keyword';
    
    // Title match (strongest signal)
    if (link.title.toLowerCase().includes(concept.name.toLowerCase())) {
      score += 100;
      matchType = 'title';
    }
    
    // Content match (if we have captured content)
    if (link.capturedContent) {
      const conceptRegex = new RegExp(`\\b${escapeRegex(concept.name)}\\b`, 'gi');
      const hits = (link.capturedContent.match(conceptRegex) || []).length;
      if (hits > 0) {
        score += hits * 10;
        if (matchType === 'keyword') matchType = 'content';
      }
    }
    
    // Keyword match (weaker)
    for (const keyword of concept.keywords || []) {
      if (searchText.includes(keyword.toLowerCase())) {
        score += 3;
      }
    }
    
    if (score > 10) {
      matches.push({
        conceptId,
        conceptName: concept.name,
        score,
        matchType,
      });
    }
  }
  
  matches.sort((a, b) => b.score - a.score);
  const top = matches.slice(0, 3);
  
  const topScore = top[0]?.score || 0;
  const label: EnhancedLink['relevanceLabel'] = 
    topScore >= 100 ? 'strongly-related' :
    topScore >= 30  ? 'related' :
    topScore >= 10  ? 'mentioned' : 'unclear';
  
  return {
    ...link,
    matchedConcepts: top,
    primaryConcept: top[0]?.conceptName || null,
    relevanceLabel: label,
  };
}
```

**UI for resolved links:**

```tsx
function ResolvedLinkRow({ link }: { link: EnhancedLink }) {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div className="link-row" onClick={() => setExpanded(!expanded)}>
      <div className="link-row__main">
        <span className="link-row__arrow">→</span>
        <div className="link-row__content">
          <div className="link-row__title">{link.title}</div>
          <div className="link-row__url">{link.url}</div>
        </div>
        {link.primaryConcept && (
          <div className={`concept-badge concept-badge--${link.relevanceLabel}`}>
            <span className="concept-badge__label">TEACHES</span>
            <span className="concept-badge__name">{link.primaryConcept}</span>
          </div>
        )}
      </div>
      {expanded && link.matchedConcepts.length > 0 && (
        <div className="link-row__expanded">
          <div className="link-row__heading">Matched concepts:</div>
          {link.matchedConcepts.map(m => (
            <div key={m.conceptId} className="link-row__match">
              <span className="match-type">{m.matchType}</span>
              <span className="match-name">{m.conceptName}</span>
              <span className="match-score">{m.score}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

```css
.concept-badge {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border-radius: 20px;
  font-size: 0.7rem;
  font-family: 'JetBrains Mono', monospace;
}

.concept-badge--strongly-related {
  background: rgba(0, 240, 255, 0.1);
  border: 1px solid rgba(0, 240, 255, 0.4);
  color: var(--cyan);
  box-shadow: 0 0 15px rgba(0, 240, 255, 0.2);
}

.concept-badge--related {
  background: rgba(6, 214, 160, 0.08);
  border: 1px solid rgba(6, 214, 160, 0.3);
  color: var(--teal);
}

.concept-badge--mentioned {
  background: rgba(168, 85, 247, 0.06);
  border: 1px solid rgba(168, 85, 247, 0.25);
  color: var(--purple);
}

.concept-badge__label {
  font-size: 0.55rem;
  opacity: 0.6;
  letter-spacing: 0.1em;
}
```

**Acceptance test:** Every URL in the Source Trail should display a TEACHES badge when it resolves to a concept. Clicking expands to show all matched concepts with their match type and score.

---

### ENGINE 7: AMBIENT BREATH ENGINE

**Purpose:** The entire UI has a subtle global rhythm — a slow ambient pulse that makes the interface feel alive. The rhythm speeds up when deadlines approach and slows down during calm learning states.

**Implementation:**

```typescript
// engines/breath.ts
class BreathRhythm {
  private cycleDuration: number = 4000; // ms per breath cycle
  private phase: 'inhale' | 'exhale' = 'inhale';
  private startTime: number = Date.now();
  
  setIntensity(deadlinePressure: number) {
    // 0 = calm (6s cycle), 1 = urgent (2s cycle)
    this.cycleDuration = 6000 - (deadlinePressure * 4000);
  }
  
  getCurrent(): number {
    const elapsed = (Date.now() - this.startTime) % this.cycleDuration;
    const progress = elapsed / this.cycleDuration;
    // Sine wave: 0 → 1 → 0
    return (Math.sin(progress * Math.PI * 2 - Math.PI / 2) + 1) / 2;
  }
  
  start() {
    const tick = () => {
      const value = this.getCurrent();
      document.documentElement.style.setProperty('--breath', String(value));
      document.documentElement.style.setProperty('--breath-glow', 
        `${0.1 + value * 0.15}`); // 0.1 to 0.25
      requestAnimationFrame(tick);
    };
    tick();
  }
}
```

Computing deadline pressure:

```typescript
function computeDeadlinePressure(course: CapturedCourse, now: number): number {
  const upcoming = course.assignments
    .filter(a => a.dueDate && a.dueDate > now && a.dueDate < now + 7 * 24 * 60 * 60 * 1000)
    .length;
  return Math.min(upcoming / 5, 1); // 5+ items due this week = max pressure
}
```

Elements that subscribe to breath via CSS:

```css
.wordmark {
  text-shadow: 
    0 0 20px rgba(0, 240, 255, calc(0.4 + var(--breath, 0) * 0.3)),
    0 0 40px rgba(0, 240, 255, calc(0.1 + var(--breath, 0) * 0.2));
}

.phase-card[data-state="active"] {
  box-shadow: 
    0 0 25px var(--phase-color-glow),
    0 0 calc(40px + var(--breath, 0) * 20px) var(--phase-color-glow);
}

.card--focused {
  box-shadow: 0 0 calc(30px + var(--breath, 0) * 20px) rgba(0, 240, 255, 0.2);
}

/* Background radial gradient also breathes */
body {
  background-image: radial-gradient(
    ellipse at top, 
    rgba(10, 10, 26, calc(0.8 + var(--breath, 0) * 0.2)) 0%, 
    #020208 60%
  );
}
```

**Acceptance test:** Stand still on the home screen for 10 seconds. The cyan glow around the wordmark and active elements should pulse gently, like a slow breath. When you import a course with many imminent deadlines, the rhythm should visibly speed up.

---

### ENGINE 8: INTERACTIVE DEPTH ENGINE

**Purpose:** Every card is deeply explorable. No dead summaries. Every concept card, every timeline event, every Neural Forge phase is actually clickable and actually does something substantial. This is the engine that fixes "Neural Forge phases show summaries instead of quizzes."

**Implementation — Neural Forge must be REAL:**

Each phase is a mini-application with its own state, progression, scoring, and completion. Not a summary card.

```tsx
// routes/NeuralForge.tsx
function NeuralForgeView() {
  const { currentChapterId, currentPhase, phaseState, advancePhase } = useForgeStore();
  const bundle = useForgeBundle(currentChapterId);
  
  if (!bundle) return <ChapterSelector />;
  
  return (
    <div className="forge-view">
      <ForgeTopBar bundle={bundle} />
      <PhaseNavigator current={currentPhase} />
      
      {currentPhase === 'genesis' && <GenesisPhase bundle={bundle} onComplete={advancePhase} />}
      {currentPhase === 'forge' && <ForgePhase bundle={bundle} onComplete={advancePhase} />}
      {currentPhase === 'crucible' && <CruciblePhase bundle={bundle} onComplete={advancePhase} />}
      {currentPhase === 'architect' && <ArchitectPhase bundle={bundle} onComplete={advancePhase} />}
      {currentPhase === 'transcend' && <TranscendPhase bundle={bundle} onComplete={advancePhase} />}
    </div>
  );
}

function ForgePhase({ bundle, onComplete }: { bundle: ForgeBundle; onComplete: () => void }) {
  const [mode, setMode] = useState<'rapid' | 'drill' | 'menu'>('menu');
  const [qi, setQi] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState({ correct: 0, wrong: 0 });
  const [streak, setStreak] = useState(0);
  const [learning, setLearning] = useState(false);
  
  if (mode === 'menu') {
    return (
      <div className="phase-menu">
        <h2 className="phase-title">⚡ FORGE</h2>
        <p className="phase-description">Test under fire. Learn First is always available.</p>
        <div className="mode-grid">
          <ModeCard
            title="Rapid Fire"
            description={`${bundle.rapidFire.length} true/false questions`}
            icon="⚡"
            onClick={() => { setMode('rapid'); setQi(0); }}
          />
          <ModeCard
            title="Deep Drill"
            description={`${bundle.deepDrill.length} multiple choice with Learn First`}
            icon="🎯"
            onClick={() => { setMode('drill'); setQi(0); }}
          />
        </div>
      </div>
    );
  }
  
  if (mode === 'drill') {
    const q = bundle.deepDrill[qi];
    const concept = bundle.concepts.find(c => c.id === q.conceptIds?.[0]);
    
    if (!q) {
      return <PhaseComplete score={score} onNext={onComplete} />;
    }
    
    if (learning && concept) {
      return (
        <LearnFirstPanel concept={concept} onDone={() => setLearning(false)} />
      );
    }
    
    return (
      <div className="drill-question">
        <div className="question-header">
          <div className="score-bar">
            <span className="correct">{score.correct}</span>
            <span className="divider">/</span>
            <span className="wrong">{score.wrong}</span>
            {streak >= 3 && <span className="streak">🔥 {streak}x</span>}
          </div>
          <div className="q-counter">{qi + 1}/{bundle.deepDrill.length}</div>
        </div>
        
        {concept?.primer && (
          <div className="primer">💡 {concept.primer}</div>
        )}
        
        <div className="question-card">
          <p className="question-text">{q.q}</p>
        </div>
        
        {!showResult && (
          <button className="btn btn-learn" onClick={() => setLearning(true)}>
            💡 LEARN FIRST
          </button>
        )}
        
        <div className="options">
          {q.opts.map((opt, i) => (
            <OptionButton
              key={i}
              index={i}
              text={opt}
              letter={String.fromCharCode(65 + i)}
              state={
                !showResult ? 'idle' :
                i === q.c ? 'correct' :
                i === selected ? 'wrong' : 'idle'
              }
              disabled={showResult}
              onClick={() => {
                setSelected(i);
                setShowResult(true);
                if (i === q.c) {
                  setScore(s => ({ ...s, correct: s.correct + 1 }));
                  setStreak(s => s + 1);
                  updateConceptMastery(q.conceptIds?.[0], +0.1);
                } else {
                  setScore(s => ({ ...s, wrong: s.wrong + 1 }));
                  setStreak(0);
                }
              }}
            />
          ))}
        </div>
        
        {showResult && (
          <ResultPanel
            correct={selected === q.c}
            explanation={q.why}
            onNext={() => {
              setQi(qi + 1);
              setSelected(null);
              setShowResult(false);
              setLearning(false);
            }}
          />
        )}
      </div>
    );
  }
  
  // ... rapid fire mode similar
}
```

**Every phase follows this pattern:** has state, accepts input, scores, advances. No summary cards.

**The same applies to concept cards everywhere:**

```tsx
function ConceptCard({ concept }: { concept: Concept }) {
  const [expanded, setExpanded] = useState(false);
  const mastery = useConceptMastery(concept.id);
  
  return (
    <motion.div
      className="concept-card"
      layout
      onClick={() => setExpanded(!expanded)}
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', ...SPRING_PRESETS.smooth }}
    >
      <div className="concept-card__header">
        <h3 className="concept-card__name">{concept.name}</h3>
        <MasteryRing value={mastery} size={32} />
      </div>
      
      <p className="concept-card__core">{concept.core}</p>
      
      <AnimatePresence>
        {expanded && (
          <motion.div
            className="concept-card__expanded"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', ...SPRING_PRESETS.gentle }}
          >
            <div className="concept-card__detail">{concept.detail}</div>
            {concept.mnemonic && (
              <div className="concept-card__mnemonic">
                <span className="label">💡 REMEMBER</span>
                <p>{concept.mnemonic}</p>
              </div>
            )}
            <div className="concept-card__actions">
              <button className="btn btn-teal" onClick={() => practiceConcept(concept.id)}>
                ⚡ PRACTICE THIS
              </button>
              <button className="btn btn-ghost" onClick={() => showRelated(concept.id)}>
                🔗 SHOW RELATED
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
```

**Acceptance test:** Click a concept card. It expands inline with spring motion showing full detail, mnemonic, and action buttons. Click a Neural Forge phase. It starts a real interactive quiz with questions, scoring, and progression. Nothing is a static summary.

---

### ENGINE 9: CONTEXTUAL RESONANCE ENGINE

**Purpose:** Cross-view awareness. When the user focuses on any entity, all other views that reference it react simultaneously. Focusing on a concept in the concept map highlights it in the timeline, in the source trail, in the assignment list, and in Neural Forge.

**Implementation:**

Extend the Focus Store from Engine 3 to be global and shared across routes:

```typescript
// state/resonance-store.ts
interface ResonanceState {
  activeEntity: { type: string; id: string } | null;
  highlightedAcrossViews: {
    concepts: Set<string>;
    assignments: Set<string>;
    chapters: Set<string>;
    links: Set<string>;
  };
  
  setActive: (type: string, id: string) => void;
  clear: () => void;
}

function computeResonance(type: string, id: string, graph: ConceptGraph, course: CapturedCourse) {
  const highlighted = {
    concepts: new Set<string>(),
    assignments: new Set<string>(),
    chapters: new Set<string>(),
    links: new Set<string>(),
  };
  
  if (type === 'concept') {
    const concept = graph.concepts[id];
    highlighted.concepts.add(id);
    concept.relatedIds.forEach(rid => highlighted.concepts.add(rid));
    
    // Assignments touching this concept
    concept.canvasOccurrences.forEach(o => highlighted.assignments.add(o.assignmentId));
    
    // Textbook chapters containing this concept
    concept.textbookOccurrences.forEach(o => highlighted.chapters.add(o.chapterId));
    
    // Links that teach this concept
    course.assignments.forEach(a => {
      a.linkedResources.forEach(link => {
        if (link.matchedConcepts?.some(m => m.conceptId === id)) {
          highlighted.links.add(link.url);
        }
      });
    });
  }
  
  if (type === 'assignment') {
    highlighted.assignments.add(id);
    const assignment = course.assignments.find(a => a.id === id);
    if (assignment) {
      const related = findRelatedConcepts(assignment, graph);
      related.forEach(c => highlighted.concepts.add(c.id));
    }
  }
  
  // ... similar for chapters, links
  
  return highlighted;
}
```

Every view subscribes:

```tsx
function Timeline() {
  const { highlightedAcrossViews } = useResonance();
  
  return (
    <div className="timeline">
      {events.map(event => (
        <TimelineEvent
          key={event.id}
          event={event}
          resonance={
            highlightedAcrossViews.assignments.has(event.id) ? 'active' : 'dim'
          }
        />
      ))}
    </div>
  );
}

function ConceptMap() {
  const { highlightedAcrossViews } = useResonance();
  
  return (
    <div className="concept-map">
      {concepts.map(concept => (
        <ConceptNode
          key={concept.id}
          concept={concept}
          resonance={
            highlightedAcrossViews.concepts.has(concept.id) ? 'active' : 'dim'
          }
        />
      ))}
    </div>
  );
}
```

**Acceptance test:** Open a split view with the concept map on one side and the timeline on the other. Click a concept in the map. Timeline events related to that concept should brighten. Unrelated events should dim. Click an assignment in the timeline. Related concepts in the map should brighten. The whole app reacts as one organism.

---

## 3. THE TIMELINE — BUILD IT PROPERLY

The timeline doesn't exist in the current build. Build it now. Here's the exact specification.

### 3.1 Layout

Full-width horizontal scroll container with momentum and snap points.

```tsx
function Timeline() {
  const course = useCourse();
  const goals = useGoals();
  const { highlightedAcrossViews } = useResonance();
  
  const events = useMemo(() => {
    const all = [
      ...course.assignments.map(a => ({ ...a, kind: 'assignment' as const })),
      ...course.discussions.map(d => ({ ...d, kind: 'discussion' as const })),
      ...course.quizzes.map(q => ({ ...q, kind: 'quiz' as const })),
      ...goals.map(g => ({ ...g, kind: 'goal' as const, dueDate: g.targetDate })),
    ].filter(e => e.dueDate).sort((a, b) => a.dueDate! - b.dueDate!);
    return all;
  }, [course, goals]);
  
  const weekGroups = useMemo(() => groupByWeek(events), [events]);
  
  return (
    <div className="timeline-view">
      <TimelineControls />
      <div className="timeline-track">
        <div className="timeline-track__today-line" style={{ left: computeTodayPosition() }} />
        {weekGroups.map(week => (
          <WeekColumn key={week.id} week={week} />
        ))}
      </div>
    </div>
  );
}
```

### 3.2 Styling

```css
.timeline-view {
  padding: var(--space-8);
  max-width: 100%;
  overflow: hidden;
}

.timeline-track {
  display: flex;
  gap: var(--space-6);
  overflow-x: auto;
  overflow-y: hidden;
  padding: var(--space-6) 0;
  scroll-snap-type: x proximity;
  scroll-behavior: smooth;
  position: relative;
  min-height: 480px;
}

.timeline-track::-webkit-scrollbar {
  height: 8px;
}

.timeline-track::-webkit-scrollbar-thumb {
  background: rgba(0, 240, 255, 0.3);
  border-radius: 4px;
}

.week-column {
  flex: 0 0 320px;
  scroll-snap-align: start;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.week-column__header {
  padding: var(--space-3) 0;
  border-bottom: 1px solid var(--border);
  font-family: 'Orbitron', sans-serif;
  font-size: 0.65rem;
  letter-spacing: 0.1em;
  color: var(--text-muted);
}

.timeline-track__today-line {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: linear-gradient(to bottom, transparent, var(--cyan), transparent);
  box-shadow: 
    0 0 10px rgba(0, 240, 255, 0.6),
    0 0 calc(20px + var(--breath, 0) * 15px) rgba(0, 240, 255, 0.3);
  pointer-events: none;
  z-index: 5;
}

.timeline-event {
  padding: var(--space-4);
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  cursor: pointer;
  transition: all 300ms cubic-bezier(0.22, 1, 0.36, 1);
}

.timeline-event[data-kind="assignment"] {
  border-left: 3px solid var(--cyan);
}

.timeline-event[data-kind="discussion"] {
  border-left: 3px solid var(--teal);
}

.timeline-event[data-kind="quiz"] {
  border-left: 3px solid var(--purple);
}

.timeline-event[data-kind="goal"] {
  border: 1px dashed rgba(0, 240, 255, 0.3);
  background: rgba(0, 240, 255, 0.03);
}

.timeline-event[data-status="overdue"] {
  border-left-color: var(--red);
  box-shadow: 0 0 20px rgba(255, 68, 102, 0.15);
}

.timeline-event[data-status="due-soon"] {
  box-shadow: 0 0 20px rgba(0, 240, 255, 0.1);
}

.timeline-event:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 30px rgba(0, 240, 255, 0.15);
}

.timeline-event[data-resonance="dim"] {
  opacity: 0.3;
  filter: saturate(0.5);
}
```

### 3.3 Drag Interaction (optional but awesome)

Events can be dragged vertically to mark as "planned for earlier." This doesn't change the actual due date — it creates a personal plan overlay.

```tsx
<motion.div
  className="timeline-event"
  drag="y"
  dragConstraints={{ top: -100, bottom: 100 }}
  dragElastic={0.2}
  onDragEnd={(_, info) => {
    if (Math.abs(info.offset.y) > 30) {
      const daysOffset = Math.floor(info.offset.y / 40);
      setPlannedOffset(event.id, daysOffset);
    }
  }}
>
  {/* content */}
</motion.div>
```

### 3.4 Acceptance test

- Timeline fills the full viewport width with horizontal scroll
- Weeks are visible as columns
- Today is marked with a glowing cyan vertical line
- Events are color-coded by type
- Goals appear as dashed cyan cards woven in
- Hover lifts an event with spring motion
- Resonance engine dims unrelated events when something is focused elsewhere

---

## 4. MAKE NEURAL FORGE ACTUALLY INTERACTIVE

The current Neural Forge shows phase summaries. That's wrong. Each phase must be a real interactive experience.

### 4.1 What each phase MUST do interactively

**GENESIS phase:**
- Sub-mode A: Show dilemma scenarios one at a time. Student reads the scenario, picks a choice from 3 options, then sees the "here's what just happened" reveal with framework explanation.
- Sub-mode B: Concept Scan — flip cards one by one. Student taps to flip, sees detail and mnemonic, taps NEXT to advance.
- State persists. Progress bar updates. Timer counts.

**FORGE phase:**
- Sub-mode A: Rapid Fire T/F questions one at a time. Student taps TRUE or FALSE. Sees result with explanation. NEXT button.
- Sub-mode B: Deep Drill MC with Learn First. Primer context shown above question. Student can tap LEARN FIRST to see concept details first. Then 4 options. Click option. See result. NEXT.
- Score tracked. Streak tracked.

**CRUCIBLE phase:**
- Menu with 3 sub-modes: Spot the Lie, Cross-Exam, Domain Transfer.
- Each sub-mode presents items one at a time with think → reveal → self-rate flow.

**ARCHITECT phase:**
- Teach Back prompts. Student types response in textarea. Clicks CHECK. Sees key points to cover with ✓/✗ self-check based on keyword presence in their response.

**TRANSCEND phase:**
- Final assessment with confidence calibration. Student rates confidence 1-5 BEFORE seeing options. Then answers. Wrong answers trigger meta-reflection (why did I miss this?). Results dashboard at end.

### 4.2 State Management

```typescript
// state/forge-session-store.ts
interface ForgeSessionState {
  activeChapterId: string | null;
  activePhase: PhaseId;
  phaseStates: Record<PhaseId, PhaseState>;
  globalScore: { correct: number; wrong: number };
  startedAt: number;
  totalElapsed: number;
  
  startSession: (chapterId: string) => void;
  advancePhase: () => void;
  recordAnswer: (phaseId: PhaseId, questionId: string, correct: boolean) => void;
  saveProgress: () => void;
  resume: () => void;
}
```

State persists to IndexedDB on every change. On page reload, the student sees "Resume session? 12 min in, on Crucible phase" prompt.

### 4.3 Acceptance test

Open a chapter. Genesis starts. See a dilemma. Pick a choice. See the reveal. Click NEXT. See next dilemma. Complete dilemmas. Enter concept scan. Flip 12 cards. Click ADVANCE. Enter Forge. Answer rapid fire. Answer deep drill. Enter Crucible. Go through all three sub-modes. Enter Architect. Type responses. Enter Transcend. Rate confidence, answer hard questions, see final dashboard with grade, calibration, and concept mastery map. Every step actually works.

---

## 5. ASSIGNMENT DETAIL — MAKE IT COMPLETE

The Assignment Detail view is the centerpiece of the learning loop. Build it with all three columns.

### 5.1 Layout (desktop)

```
┌──────────────────────┬─────────────────────────┬──────────────────────┐
│  LEFT — BREAKDOWN    │  CENTER — SUBMISSION    │  RIGHT — TEXTBOOK    │
│                      │                         │                      │
│  Title + Due         │  Rich text editor       │  Suggested chapters  │
│  Mission             │  Toolbar                │  Concept bridge      │
│  Requirements        │  Live counters          │  Practice links      │
│  Rubric Guide        │  [GRADE & EXPORT]       │                      │
│  Resources           │                         │  Prerequisite gate   │
│  Estimated time      │  Results dashboard      │  Mastery progress    │
│  Links w/ concepts   │  Download .docx         │  [Start Forge] btn   │
└──────────────────────┴─────────────────────────┴──────────────────────┘
```

### 5.2 Spacing

```css
.assignment-detail {
  display: grid;
  grid-template-columns: 320px 1fr 320px;
  gap: var(--space-6);
  padding: var(--space-8);
  max-width: 1400px;
  margin: 0 auto;
}

@media (max-width: 1100px) {
  .assignment-detail {
    grid-template-columns: 1fr;
    gap: var(--space-6);
  }
}

.assignment-detail > * {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
```

### 5.3 Gating Integration

If the assignment is locked (Engine 4), the center and right columns show locked state with clear path to unlock. The left column is still readable but dimmed.

### 5.4 Acceptance test

Open an assignment. See all three columns with proper spacing. Left shows breakdown with requirements checklist. Center shows writing workspace. Right shows suggested textbook chapters with concept bridges. If locked, center shows unlock requirements with a button that takes you to Neural Forge for the required concepts.

---

## 6. CONCEPT MAP — MAKE IT LIVE

The concept map exists as text cards. It needs to be a real visual graph that responds to progress.

### 6.1 Implementation

Use Cytoscape.js or a simple custom force-directed layout. Either works.

```tsx
function ConceptMapView() {
  const graph = useConceptGraph();
  const progress = useProgress();
  const { setActive } = useResonance();
  const { highlightedAcrossViews } = useResonance();
  
  return (
    <div className="concept-map-view">
      <ConceptMapControls />
      <div className="concept-map-canvas">
        {/* SVG or Canvas rendering */}
        <svg width="100%" height="100%">
          {graph.edges.map(edge => (
            <ConceptEdge 
              key={`${edge.from}-${edge.to}`}
              edge={edge}
              active={
                highlightedAcrossViews.concepts.has(edge.from) ||
                highlightedAcrossViews.concepts.has(edge.to)
              }
            />
          ))}
          {Object.values(graph.concepts).map(concept => (
            <ConceptNode
              key={concept.id}
              concept={concept}
              mastery={progress.conceptMastery[concept.id] || 0}
              resonance={
                highlightedAcrossViews.concepts.has(concept.id) ? 'active' : 
                highlightedAcrossViews.concepts.size > 0 ? 'dim' : 'idle'
              }
              onClick={() => setActive('concept', concept.id)}
            />
          ))}
        </svg>
      </div>
      <ConceptDetailSidebar />
    </div>
  );
}
```

### 6.2 Node styling

```css
.concept-node {
  cursor: pointer;
  transition: all 400ms cubic-bezier(0.22, 1, 0.36, 1);
}

.concept-node circle {
  fill: var(--mastery-color);
  filter: drop-shadow(0 0 calc(8px + var(--mastery) * 12px) var(--mastery-color));
}

.concept-node[data-resonance="active"] circle {
  r: calc(var(--base-size) * 1.3);
  filter: drop-shadow(0 0 30px var(--cyan));
}

.concept-node[data-resonance="dim"] {
  opacity: 0.2;
}

.concept-node text {
  font-family: 'Sora', sans-serif;
  font-size: calc(10px + var(--mastery) * 4px);
  fill: var(--text-primary);
  text-shadow: 0 0 8px rgba(0, 0, 0, 0.8);
  pointer-events: none;
}
```

### 6.3 Mastery color scale

```typescript
function masteryColor(mastery: number): string {
  if (mastery < 0.2) return '#3a3a5a';           // dim - unexplored
  if (mastery < 0.4) return 'rgba(0, 240, 255, 0.4)'; // introduced
  if (mastery < 0.6) return '#00f0ff';            // cyan - learning
  if (mastery < 0.8) return '#06d6a0';            // teal - practicing
  return '#ffd700';                                // gold - mastered
}
```

### 6.4 Acceptance test

Open the concept map. See nodes for every concept. Node color reflects mastery (dim gray → cyan → teal → gold). Nodes are connected by edges. Click a node — it activates, the sidebar shows details, related nodes brighten, unrelated nodes dim. Every other view in the app also reacts (resonance).

---

## 7. WHAT TO TELL CODEX — THE EXECUTION ORDER

1. **Fix the spacing system first.** Install the full scale from Section 1. Audit every view and apply proper gaps/padding. No card should touch another card.

2. **Build the nine engines.** Start with Engine 1 (density), then Engine 7 (breath), then Engine 3 (focus). Those three give the interface a soul. Then Engine 2 (spring physics) on top of everything. Then Engine 4 (gating), Engine 5 (goals), Engine 6 (link resolution), Engine 8 (interactive depth), Engine 9 (resonance).

3. **Build the Timeline view** with horizontal scroll, weeks, events, goals, today line, and resonance.

4. **Rebuild Neural Forge phases** as fully interactive experiences — real questions, real state, real scoring, real completion. Delete any "phase summary" placeholder content.

5. **Complete the Assignment Detail view** with all three columns, gating integration, and submission engine.

6. **Complete the Concept Map view** with SVG nodes, mastery coloring, and resonance.

7. **Wire everything to the resonance engine** so cross-view highlighting works.

8. **Test every acceptance criterion** in Sections 2-6. Don't skip any.

---

## 8. THE FINAL CHECKLIST

Before you declare this done, verify every item:

**Spacing:**
- [ ] No two cards touch anywhere in any view
- [ ] Primary sections have 32px+ margin between them
- [ ] Card internal padding is 20px+
- [ ] Grid gaps are 16px+
- [ ] Responsive scaling reduces gaps proportionally on mobile

**Engine 1 — Adaptive Density:**
- [ ] Small imports have visibly more spacing than large imports
- [ ] Card sizes scale with content volume
- [ ] Density is computed on every data change

**Engine 2 — Spring Physics:**
- [ ] Card hovers have weight, not linear sliding
- [ ] Modals spring open with subtle bounce
- [ ] Drag interactions have momentum and settle naturally

**Engine 3 — Focus Choreography:**
- [ ] Hovering a concept dims unrelated elements
- [ ] Related elements brighten simultaneously
- [ ] Focus clears cleanly on mouse leave

**Engine 4 — Progress Gating:**
- [ ] Unpracticed assignments show LOCKED state
- [ ] Lock overlay shows specific concept requirements with mastery bars
- [ ] Completing Neural Forge unlocks assignments progressively
- [ ] Practice Mode toggle in settings bypasses gates

**Engine 5 — Goal Weaving:**
- [ ] Goals auto-generate from due dates and mastery gaps
- [ ] Goals appear in the timeline as dashed cyan cards
- [ ] Goals can be marked complete
- [ ] Goals regenerate as conditions change

**Engine 6 — Link Resolution:**
- [ ] Every source URL shows a TEACHES badge
- [ ] Badge color reflects relevance (strongly-related / related / mentioned)
- [ ] Clicking a link row expands to show matched concepts with scores
- [ ] Match type (title / content / keyword) is visible

**Engine 7 — Ambient Breath:**
- [ ] Wordmark glow pulses gently on calm states
- [ ] Pulse speeds up when deadlines approach
- [ ] Active phase cards pulse with their color
- [ ] Background gradient subtly breathes

**Engine 8 — Interactive Depth:**
- [ ] Concept cards expand inline with spring motion
- [ ] Neural Forge phases are REAL interactive quizzes, not summaries
- [ ] Every phase has state, scoring, and completion
- [ ] Learn First button works in Deep Drill
- [ ] Results dashboard shows grade, calibration, and concept mastery

**Engine 9 — Contextual Resonance:**
- [ ] Focusing a concept highlights related items across ALL views
- [ ] Timeline, concept map, source trail, and assignment list all react
- [ ] Resonance clears cleanly

**Timeline:**
- [ ] Full horizontal scroll with momentum
- [ ] Week columns with snap points
- [ ] Today line visible and glowing
- [ ] Events color-coded by type
- [ ] Goals interleaved as dashed cards
- [ ] Events respond to resonance

**Neural Forge:**
- [ ] All 5 phases are interactive, not summaries
- [ ] Real questions appear and accept answers
- [ ] Scoring updates live
- [ ] Timer counts down per phase
- [ ] Session state persists to IndexedDB
- [ ] Resume prompt on reload mid-session

**Assignment Detail:**
- [ ] Three columns render with proper spacing
- [ ] Left shows breakdown with rubric
- [ ] Center shows submission workspace with grading
- [ ] Right shows textbook pairing with gating
- [ ] Gating state is visible when locked

**Concept Map:**
- [ ] Nodes render as SVG circles with labels
- [ ] Node color reflects mastery level
- [ ] Edges connect related concepts
- [ ] Clicking a node activates resonance
- [ ] Sidebar shows concept detail on selection

---

## 9. THE VISION ONE MORE TIME

Codex, when a student imports their course, this is what should happen:

1. The AEONTHRA wordmark pulses cyan. The background breathes slowly.
2. The import screen scales its layout based on how much content came in.
3. The home screen shows a timeline of their whole semester, with goals woven between real events.
4. Clicking an assignment shows its full breakdown with textbook pairings and a gated submission workspace. If they haven't learned the material, the workspace is locked with a clear path to unlock via Neural Forge.
5. Clicking a concept in the map makes the whole app ripple with highlights — the timeline shows which assignments touch it, the source trail highlights which links teach it, the assignment list brightens items that need it.
6. Entering Neural Forge for a chapter starts a real 5-phase 60-minute ritual with actual interactive quizzes, not summaries.
7. Completing Neural Forge updates concept mastery, which colors in the concept map (dim → cyan → teal → gold), unlocks gated assignments, and dismisses related goals.
8. Writing an assignment, clicking GRADE & EXPORT, getting back a Bahnschrift 12pt Word doc with color-coded margin annotations like a professor graded it.
9. Every click, every hover, every state change has physics. The interface has weight, rhythm, and breath.

**This is what "a student's learning come true" looks like. Build it.**

When a student opens this app, they should feel: *"This is made for me. It knows where I am. It knows what I need to learn next. It won't let me fail because I didn't prepare. It celebrates what I've mastered. It breathes with me."*

That's the product. No less.

Now go make it real.
