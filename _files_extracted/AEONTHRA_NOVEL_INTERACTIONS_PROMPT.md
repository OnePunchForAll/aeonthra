# AEONTHRA NOVEL INTERACTIONS PROMPT

## Nine Never-Before-Done Deterministic Learning Modes + The Twelve Engines That Power Them

**Codex: this document is your next directive after completing the breath prompt. Do not start this work until the nine breath engines, spacing fixes, interactive Neural Forge, timeline, and gating are all passing their acceptance tests.**

**When you begin this pass, you will add nine entirely new interaction modes to the app. None of them exists anywhere else in any learning product. Each is deterministic — built from indexed textbook content, captured Canvas data, and template synthesis with zero runtime API calls. Together they transform the app from "a learning dashboard" into "a learning organism."**

**You will also build twelve new shared engines that power these interactions. These engines are reusable infrastructure — every interaction mode depends on several of them. Build the engines first, then layer the interactions on top.**

---

## 0. THE PHILOSOPHICAL FRAME

Most learning products treat content as inert. The textbook is a PDF. The assignment is a prompt. The student reads one, writes the other, and the system helps with grades at the end.

AEONTHRA treats content as alive. The textbook has voices that can speak. The concepts have gravity that pulls assignments. Failure has a shape you can see before you fail. A prompt isn't a single question — it's a prism that refracts into multiple valid interpretations. Your future self — the one getting graded — deserves a letter from the you of now.

Every interaction below is built on one premise: **deterministic systems can feel intelligent when the underlying patterns, templates, and retrieval are sophisticated enough.** You're not simulating AI. You're discovering that a well-built deterministic system can produce genuinely novel learning experiences that no AI chatbot has ever offered, because no one has ever bothered to engineer them.

---

## 1. THE NINE INTERACTIONS

Each interaction has:
- A codename and tagline
- Why it's never been done before
- How the student experiences it
- The deterministic mechanism that powers it
- The engines it depends on
- UI specifications
- Acceptance test

---

### 1.1 ECHO CHAMBER

**Tagline:** "The book whispers while you write."

**Why it's novel:** Writing tools autocomplete, suggest, or grade. This does none of those. While you write your assignment response, passages from your uploaded textbook fade in at the periphery of the editor — not as suggestions, not as interruptions, but as ambient resonance. The effect is that you feel surrounded by your textbook's voice while working, as though the book is reading along with you and occasionally remembering something relevant.

**Student experience:**

You open an assignment's submission workspace. You start typing: "Utilitarianism's strongest objection comes from..." As your cursor moves past the word "objection," a faint ghost-text passage fades in at the right edge of the editor (low opacity, italic, Orbitron subhead font):

> *"Chapter 3, p. 47: The most troubling objection is that utilitarianism can seem to justify harming minorities for majority benefit..."*

It stays for 4 seconds, then fades. You keep typing: "...the calculation problem, where consequences cannot be reliably predicted..." Another echo drifts in:

> *"Chapter 3, p. 45: How can we actually compute the total utility of different actions, especially when consequences ripple outward unpredictably?"*

You didn't ask for it. You didn't click anything. The book just remembered. It's not in your way — it's beside you. If you want to anchor an echo (prevent it from fading), you tap it. Anchored echoes stay in a stack on the right rail of the editor, accumulating as you write. At any point you can cite an anchored echo with one click, which inserts an APA citation at your cursor.

**Deterministic mechanism:**

1. **Sliding context window:** As the student types, the system maintains a rolling 40-word window of recently typed text.
2. **Tokenize and extract keywords:** Every 3 seconds (debounced), tokenize the window, remove stopwords, extract content words.
3. **Query the Passage Retrieval Engine:** Search the indexed textbook for passages matching the current content words. Use TF-IDF + content-word overlap.
4. **Score candidate passages:**
   - Content-word overlap: Jaccard similarity
   - Concept match: does the passage contain concepts that match concepts in the current window?
   - Section relevance: passages from sections matching the assignment's paired chapters get a boost
   - Freshness decay: passages that have already been shown to the user in this session get a penalty to avoid repetition
5. **Top passage selection:** Take the highest-scoring passage. If score exceeds threshold (≥ 0.3), surface it.
6. **Fade in animation:** The passage fades in at the editor's right edge with a spring motion. After 4 seconds, it fades out unless the student clicks it to anchor.
7. **Anchor persistence:** Anchored passages accumulate in a vertical rail. Each has a "CITE" button that inserts a properly formatted citation at the current cursor position.

**Engines used:**
- Passage Retrieval Engine (primary)
- Proximity Engine
- Ambient Surface Engine
- Interaction State Engine

**UI specification:**

```
┌───────────────────────────────────────────────┬──────────────────┐
│                                               │ ECHOES           │
│  [Editor area with student writing]          │                  │
│                                               │ ┌──────────────┐ │
│  The student types their response...         │ │ Ch 3 p 45    │ │
│  Utilitarianism's strongest objection comes   │ │ "How can we  │ │
│  from the calculation problem...              │ │ actually..." │ │
│                                               │ │   [CITE]     │ │
│                                               │ └──────────────┘ │
│                     ↓ ECHO fades in here ↓   │                  │
│                                               │ ┌──────────────┐ │
│     ~~Ch 3 p 47: The most troubling~~        │ │ Ch 3 p 47    │ │
│     ~~objection is that utilitarianism~~     │ │ "The most    │ │
│     ~~can seem to justify harming...~~       │ │ troubling..."│ │
│                                               │ │   [CITE]     │ │
│                                               │ └──────────────┘ │
└───────────────────────────────────────────────┴──────────────────┘
```

```css
.echo-drift {
  position: absolute;
  right: var(--space-4);
  max-width: 320px;
  font-family: 'Orbitron', sans-serif;
  font-size: 0.75rem;
  font-style: italic;
  color: rgba(0, 240, 255, 0.4);
  text-shadow: 0 0 8px rgba(0, 240, 255, 0.2);
  opacity: 0;
  transform: translateX(20px);
  transition: opacity 600ms, transform 600ms cubic-bezier(0.22, 1, 0.36, 1);
  pointer-events: none;
  padding: var(--space-3);
  border-left: 1px solid rgba(0, 240, 255, 0.2);
}

.echo-drift[data-state="visible"] {
  opacity: 0.7;
  transform: translateX(0);
  pointer-events: auto;
  cursor: pointer;
}

.echo-drift:hover {
  opacity: 1;
  color: var(--cyan);
  background: rgba(0, 240, 255, 0.04);
}

.echo-anchor-rail {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4);
  border-left: 1px solid var(--border);
  max-width: 360px;
}

.echo-anchor {
  padding: var(--space-3);
  background: var(--bg-card);
  border: 1px solid rgba(0, 240, 255, 0.2);
  border-radius: 10px;
  animation: anchorIn 500ms cubic-bezier(0.22, 1, 0.36, 1);
}

.echo-anchor__source {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.6rem;
  color: var(--text-muted);
  letter-spacing: 0.05em;
}

.echo-anchor__text {
  font-family: 'Sora', sans-serif;
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-top: var(--space-2);
  line-height: 1.5;
}

.echo-anchor__cite {
  display: block;
  margin-top: var(--space-3);
  font-family: 'Orbitron', sans-serif;
  font-size: 0.55rem;
  letter-spacing: 0.1em;
  color: var(--cyan);
  background: transparent;
  border: 1px solid rgba(0, 240, 255, 0.3);
  padding: var(--space-2) var(--space-3);
  border-radius: 6px;
  cursor: pointer;
  transition: all 300ms;
}

.echo-anchor__cite:hover {
  background: rgba(0, 240, 255, 0.08);
  border-color: var(--cyan);
}
```

**Acceptance test:** Open the submission workspace for an assignment. Start typing about a concept covered in the uploaded textbook. Within 5 seconds, a faint ghosted passage should fade in at the right edge. Click it. It should anchor in the rail. Click CITE. A properly formatted citation should insert at your cursor position.

---

### 1.2 ORACLE PANEL

**Tagline:** "Ask the thinkers directly."

**Why it's novel:** You can ask "What would Kant say about my thesis?" and get an answer constructed from Kant's actual quoted positions in your textbook. Not AI-generated — retrieved and synthesized from real attributed quotes. The Oracle Panel shows 2-4 thinkers on the screen, each with their textbook-attributed voice. You pose a question. Each responds with passages pulled from their attributed sections, reassembled into a direct response via template synthesis.

**Student experience:**

You're working on an ethics paper about capital punishment. You open the Oracle Panel. Four silhouetted portraits appear across the top of the screen: Bentham, Kant, Mill, Aristotle. Each has a cyan glow pulse around their card, and a small badge showing "14 passages indexed" or "22 positions attributed."

You type: "Is capital punishment ever justified?"

The panel lights up. Each thinker responds in sequence with a 600ms stagger. Their "response" is a 2-3 sentence synthesized answer built from template + their actual quoted positions on related topics:

**Bentham:** *"If the total pain prevented by execution exceeds the total pain caused — including the condemned's suffering, the executioner's burden, and public fear — it produces the greater good. (Assembled from Ch 3 pp 44-45: 'consider seven factors: intensity, duration, certainty, propinquity, fecundity, purity, and extent.')"*

**Kant:** *"Persons must never be treated merely as means. But Kant held that execution for murder honors the murderer's rational agency — they chose this outcome by their action. (Assembled from Ch 4 p 62: 'act only on that maxim which you can will to become universal law.')"*

**Mill:** *"Higher pleasures include justice itself. If capital punishment serves the higher good of social justice without diminishing overall well-being, it may be permissible — but only under strict constraints. (Assembled from Ch 3 p 51: 'it is better to be Socrates dissatisfied than a fool satisfied.')"*

**Aristotle:** *"The question is what a person of practical wisdom would do. Virtue lies between extremes — not bloodthirsty vengeance, nor permissive tolerance, but just punishment proportional to the character it reveals. (Assembled from Ch 5 p 78: 'virtue is a mean between two vices.')"*

Each response is tagged with `[SYNTHESIZED FROM TEXTBOOK QUOTES]` so the student knows this isn't AI. Each response has a button: `[SHOW SOURCE PASSAGES]`. Clicking reveals the actual textbook passages that were combined to build the response, with page numbers.

**Deterministic mechanism:**

1. **Thinker index:** During textbook ingestion, the Voice Attribution Engine scans for passages attributable to specific thinkers. Attribution signals: direct quotes, "according to X," "X argued," "X's view is," etc. Each attribution is stored as `{thinker, passage, topic, position}`.

2. **Question parsing:** The student's question is tokenized and keywords extracted. Key topic nouns are identified.

3. **Position retrieval:** For each thinker, the system queries the position index for passages whose topic matches the question's topic. If no exact match, fall back to concept-relatedness matching.

4. **Response template synthesis:** For each thinker, select a response template based on their intellectual style:
   - Bentham/utilitarian: "If [action], then [consequence calculation]. This [serves/fails] the greater good."
   - Kant/deontological: "Persons must never be treated as [means/ends]. [Principle application]."
   - Mill/nuanced utilitarian: "[Qualified utilitarian answer with distinction]."
   - Aristotle/virtue: "The virtuous person would [action], because [character reasoning]."

5. **Template filling:** Fill the template with retrieved passages and their key phrases. Use the Template Synthesis Engine to ensure grammatical coherence.

6. **Attribution stamp:** Every response includes exact page references for the source passages.

**Engines used:**
- Voice Attribution Engine (primary)
- Passage Retrieval Engine
- Dialogue Synthesis Engine
- Template Synthesis Engine
- Proximity Engine

**UI specification:**

```
┌─────────────────────────────────────────────────────────────────┐
│  ORACLE PANEL                                    [ new question ]│
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │ BENTHAM  │  │   KANT   │  │   MILL   │  │ARISTOTLE │         │
│  │  ⚫⚫⚫   │  │  ⚫⚫⚫   │  │  ⚫⚫⚫   │  │  ⚫⚫⚫   │         │
│  │14 quotes │  │22 quotes │  │19 quotes │  │11 quotes │         │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘         │
│                                                                 │
│  Your question:                                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Is capital punishment ever justified?                      │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                            [ ASK THE PANEL ]    │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  ● BENTHAM                      [SYNTHESIZED FROM TEXTBOOK]    │
│    "If the total pain prevented by execution exceeds the       │
│    total pain caused — including the condemned's suffering,    │
│    the executioner's burden, and public fear — it produces    │
│    the greater good."                                          │
│    [SHOW 3 SOURCE PASSAGES ▼]                                   │
│                                                                 │
│  ● KANT                         [SYNTHESIZED FROM TEXTBOOK]    │
│    "Persons must never be treated merely as means. But Kant    │
│    held that execution for murder honors the murderer's       │
│    rational agency — they chose this outcome by their action."│
│    [SHOW 4 SOURCE PASSAGES ▼]                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Acceptance test:** Upload a philosophy textbook with multiple attributed philosophers. Open the Oracle Panel. Type a question. Within 2 seconds, 2-4 thinkers respond in sequence with attributed responses. Click SHOW SOURCE PASSAGES on any response. The actual textbook passages used to construct the response appear with page numbers.

---

### 1.3 GRAVITY FIELD

**Tagline:** "Watch your workload orbit knowledge."

**Why it's novel:** A real-time physics simulation where concepts are gravitational bodies and assignments orbit around them. Concepts with more "mass" (importance in the course) pull more assignments. Assignments visibly cluster around the concepts they depend on. Students can literally SEE the gravitational architecture of their semester — which concepts are most central, which assignments are pulled in multiple directions, which concepts have been neglected (tiny mass because low mastery).

**Student experience:**

You open GRAVITY FIELD from the main nav. The screen transforms into a dark space scene with glowing orbs. Large teal/cyan/gold spheres represent concepts. Each has a label floating next to it and a subtle pulse. Smaller white squares orbit around them — those are your assignments.

"Utilitarianism" is a huge gold sphere in the center-left. Three assignments orbit it: Paper 1, Quiz 2, Discussion 4. "Kantian Ethics" is a purple sphere in the center-right with two assignments orbiting. "Virtue Ethics" is smaller (less content in the textbook) and has only one discussion orbiting.

In the lower-right corner, "Moral Relativism" is a dim gray sphere — you haven't practiced it yet, so it has low mass. One assignment tries to orbit it but keeps drifting off into space because the mass isn't strong enough. A warning indicator pulses around that assignment: "ORBIT DECAYING — practice this concept."

You drag your viewpoint around the 2D plane. You zoom in on Paper 1. Lines draw from Paper 1 to three concepts, showing its gravitational attachments, each with a percentage indicating dependency strength: Utilitarianism 65%, Consequentialism 20%, Mill's Higher Pleasures 15%.

You click Utilitarianism. The sphere expands. A panel appears showing: current mastery (73%), number of dependent assignments (3), total gravitational pull, and a [PRACTICE NOW] button that launches Neural Forge for that concept.

As you complete Neural Forge sessions, you come back and see concept spheres growing in mass, their gravitational pull strengthening, and orbiting assignments stabilizing their orbits.

**Deterministic mechanism:**

1. **Mass computation:** Each concept's mass = `(mastery × 0.4) + (textbookFrequency × 0.3) + (assignmentDependencyCount × 0.3)`. Normalized to 0-1 scale.

2. **Position initialization:** Concepts are placed using force-directed layout. Related concepts cluster via attractive forces. Unrelated concepts repel. Run 200 iterations of force simulation on load.

3. **Assignment orbital mechanics:** Each assignment has a "home concept" (highest dependency) and orbits that concept with velocity determined by its due-date urgency. Assignments due soon orbit faster (visibly spinning). Assignments with multiple concept dependencies have elliptical orbits passing near multiple spheres.

4. **Real-time physics loop:** RAF-driven physics at 60fps:
   - Concepts have static positions but subtle drift (1-2 px per second)
   - Assignments have velocity vectors that curve toward their home concept
   - Gravitational force: `F = G × (m1 × m2) / r²`
   - Each assignment's orbit radius = `60 + (urgency × 40) + (dependency_strength × 20)` pixels
   - Orbit period = `(dueDate_days / 7) × 4` seconds (one full orbit per "week until due")

5. **Orbit stability:** Assignments orbiting low-mass (unpracticed) concepts have unstable orbits that visibly wobble. If mass drops below threshold (0.2), the assignment starts drifting outward (orbital decay visualization).

6. **Selection and inspection:** Click a concept → expand and show dependency panel. Click an assignment → show its orbital lineage and dependency breakdown.

**Engines used:**
- Spring Physics Engine (primary)
- Collision Engine
- Proximity Engine
- Interaction State Engine

**UI specification:**

```
┌─────────────────────────────────────────────────────────────────┐
│  GRAVITY FIELD                [orbital | cluster | timeline view]│
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                          (HERE BE SPACE)                        │
│                                                                 │
│                    ●  (teal)        ●  (dim)                    │
│                    │                │                            │
│              ⬜ orbits           ⬜ wobbling                      │
│                                                                 │
│                                                                 │
│                    ⬤  (GOLD - large)                            │
│                    │                                             │
│               ⬜ ⬜ ⬜  three assignments orbit                   │
│                                                                 │
│                                                                 │
│            ●  (purple)                    ●  (teal, small)      │
│            │                              │                     │
│           ⬜ ⬜                           ⬜                      │
│                                                                 │
│                                                                 │
│  ┌─ Inspector ───────────────────────────────────────────────┐  │
│  │ UTILITARIANISM                                             │  │
│  │ Mastery: 73% (gold tier)                                   │  │
│  │ Mass: 0.84                                                 │  │
│  │ Orbiting assignments: 3                                    │  │
│  │ Textbook sections: Ch 3 pp 44-52                           │  │
│  │ [PRACTICE NOW] [SEE DEPENDENCIES]                          │  │
│  └────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

```typescript
// gravity-field.tsx
function GravityField() {
  const concepts = useConceptGraph();
  const assignments = useAssignments();
  const progress = useProgress();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simulationRef = useRef<GravitySimulation | null>(null);
  
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const sim = new GravitySimulation({
      concepts: concepts.map(c => ({
        id: c.id,
        name: c.name,
        mass: computeMass(c, progress),
        position: { x: Math.random() * 800, y: Math.random() * 600 },
        color: masteryColor(progress.conceptMastery[c.id] || 0),
      })),
      assignments: assignments.map(a => ({
        id: a.id,
        title: a.title,
        homeConceptId: findHomeConcept(a, concepts),
        dependencies: findDependencies(a, concepts),
        urgency: computeUrgency(a.dueDate),
        position: { x: 0, y: 0 }, // will be computed from orbit
      })),
    });
    
    sim.attach(canvasRef.current);
    sim.start();
    simulationRef.current = sim;
    
    return () => sim.stop();
  }, [concepts, assignments, progress]);
  
  return (
    <div className="gravity-field">
      <canvas ref={canvasRef} width={1200} height={800} />
      <GravityInspector selected={selected} />
    </div>
  );
}
```

**Acceptance test:** Import a course with 5+ assignments and a textbook with 8+ concepts. Open GRAVITY FIELD. See concept spheres positioned in space with assignments orbiting them. Concepts vary in size based on mastery. Unpracticed concepts are dim with wobbling orbits. Click a concept — the inspector panel shows its details and PRACTICE NOW button. Click an assignment — see its gravitational lineage lines drawn to dependent concepts.

---

### 1.4 SHADOW READER

**Tagline:** "The textbook drifts at the edges of your work."

**Why it's novel:** Ambient passive learning while you do anything else in the app. You're reviewing a rubric, writing a response, browsing the timeline — and at the edges of your vision, textbook passages fade in and out. Not interrupting. Not suggesting. Just present. Over time, you absorb the textbook's content through peripheral exposure, the way you absorb a song by having it playing in the background. It's the anti-flashcard: you don't study, you just exist near the book, and slowly the book becomes familiar.

**Student experience:**

You're working on the Assignment Detail view, reading the rubric. Along the right edge of the screen, a thin vertical strip appears with very low-opacity text drifting slowly upward. Every 15-20 seconds, a new passage appears at the bottom of the strip and slowly drifts to the top, then fades away at the edge. You can ignore it completely and it stays at 15% opacity, barely visible.

If you turn your head toward it (well, hover your mouse over it), the passage brightens to 80% opacity and stops drifting. You can read it. There's a small label: `CH 3 p 46 · SHADOW DRIFT`. Click it to anchor to the Echo Chamber rail (same rail as Echo Chamber). Or ignore it and it resumes drifting.

In the top corner of the shadow rail, a counter: `Passages seen today: 47 · Familiar: 12 (25%)`. The "familiar" count is how many distinct passages have cycled through your view at least 3 times. As you use the app daily, your familiarity grows passively.

You can configure SHADOW READER in settings:
- **Intensity:** OFF | GENTLE (every 30s) | STEADY (every 15s) | IMMERSIVE (every 8s)
- **Source bias:** random | weighted by current view (if you're on an ethics assignment, show more ethics passages) | weighted by concept gaps (show passages teaching concepts you haven't mastered)
- **Display:** right rail | bottom strip | corner fade

**Deterministic mechanism:**

1. **Passage indexing:** All uploaded textbook passages are indexed with: content, section, page, concept tags, difficulty estimate, word count, and a "shown count" that increments each time the passage is displayed.

2. **Context detection:** The Ambient Surface Engine detects the current "context" the student is in — which view, which assignment, which concept is focused. This drives the source bias.

3. **Passage selection:** Every N seconds (based on intensity setting), select a passage:
   - Filter: under 60 words, concept-relevant, not shown in last 10 minutes
   - Weight by: context relevance (current view), concept gap (un-mastered concepts), freshness (never-shown > rarely-shown)
   - Tiebreaker: stable seeded random based on session id (deterministic)

4. **Drift animation:** Each passage appears at the bottom of the rail with 0 opacity, fades up to 15% over 2 seconds, drifts upward at 20 pixels per second, then fades back to 0 at the top.

5. **Interaction upgrades to 80% opacity:** Hover detection triggers a spring-animated opacity jump to 0.8. Mouse-leave returns to drift state.

6. **Familiarity tracking:** Each passage exposure is logged. When a passage's `shownCount` hits 3, it's marked `familiar`. The familiarity metric updates the home dashboard's "ambient learning" readout.

**Engines used:**
- Ambient Surface Engine (primary)
- Passage Retrieval Engine
- Proximity Engine
- Interaction State Engine

**UI specification:**

```
┌───────────────────────────────────────────────────────┬────┐
│                                                       │    │
│   Your main content                                   │ ←  │
│                                                       │ S  │
│   Assignment, timeline, whatever                      │ H  │
│                                                       │ A  │
│                                                       │ D  │
│                                                       │ O  │
│                                                       │ W  │
│                                                       │    │
│                                                       │ ~~ │
│                                                       │"A  │
│                                                       │ pa │
│                                                       │ ss │
│                                                       │ ag │
│                                                       │ e" │
│                                                       │ ~~ │
│                                                       │    │
│                                                       │47  │
└───────────────────────────────────────────────────────┴────┘
```

```css
.shadow-rail {
  position: fixed;
  top: 80px;
  right: 0;
  width: 180px;
  height: calc(100vh - 120px);
  padding: var(--space-4);
  border-left: 1px solid rgba(0, 240, 255, 0.08);
  overflow: hidden;
  pointer-events: none;
}

.shadow-rail:hover {
  pointer-events: auto;
}

.shadow-rail__label {
  position: absolute;
  top: var(--space-3);
  right: var(--space-3);
  font-family: 'Orbitron', sans-serif;
  font-size: 0.5rem;
  letter-spacing: 0.2em;
  color: rgba(0, 240, 255, 0.3);
  writing-mode: vertical-rl;
}

.shadow-passage {
  position: absolute;
  left: var(--space-4);
  right: var(--space-4);
  font-family: 'Sora', sans-serif;
  font-size: 0.7rem;
  font-style: italic;
  color: rgba(255, 255, 255, 0.15);
  line-height: 1.6;
  transition: opacity 500ms, transform 500ms;
  pointer-events: none;
}

.shadow-passage[data-state="hover"] {
  color: rgba(0, 240, 255, 0.8);
  transform: scale(1.02);
  pointer-events: auto;
}

.shadow-passage__source {
  display: block;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.5rem;
  color: rgba(0, 240, 255, 0.3);
  margin-bottom: var(--space-2);
}

.shadow-counter {
  position: absolute;
  bottom: var(--space-3);
  right: var(--space-3);
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.6rem;
  color: var(--text-muted);
}
```

**Acceptance test:** Enable Shadow Reader at STEADY intensity. Work in any view for 2 minutes without interaction. At least 5 passages should have drifted through the right rail. Hover one — it brightens to readable opacity. The passage count in the corner increments. After 10 minutes of use, some passages should be marked "familiar" (shown 3+ times).

---

### 1.5 FAILURE ATLAS

**Tagline:** "Learn what failure looks like before you try."

**Why it's novel:** Every rubric describes what an A paper looks like. This does the opposite. The Failure Atlas shows you deliberately-wrong-but-plausible example paragraphs for each rubric criterion, so you can see the failure modes before you commit them. The examples aren't random gibberish — they're crafted from course concepts deployed incorrectly. Misattributed quotes. Reversed distinctions. Confused framework mixing. Each failure is annotated with exactly what went wrong and how to avoid it.

**Student experience:**

You open an assignment. Next to the rubric you see a new section: `FAILURE ATLAS — SEE WHAT AN F LOOKS LIKE`. You click it.

The screen shows the rubric's first criterion: "Clear thesis statement (15 points)". Under it, two example paragraphs appear side by side:

**Left (red border):** `FAILURE MODE A: Vague thesis`
> *"This paper will discuss utilitarianism and some of its problems. Utilitarianism is important because many philosophers have talked about it. There are good things and bad things about it."*

**Annotation:** `❌ This thesis identifies no position. It mentions utilitarianism but doesn't argue anything. "Good things and bad things" is the emptiest possible claim. A reader has no idea what this paper will prove.`

**Right (red border):** `FAILURE MODE B: Over-broad thesis`
> *"Utilitarianism explains all ethical behavior, has always been the most important moral theory, and solves every problem in ethics with its simple calculation of happiness."*

**Annotation:** `❌ This thesis overclaims. "All ethical behavior" is false. "Always been the most important" is unsupportable. "Solves every problem" ignores the entire Objections section of Chapter 3. A reader will spend the whole paper disagreeing before you even begin.`

Below both examples: a third, subtle paragraph in green:
`✅ WHAT A STRONG THESIS LOOKS LIKE:`
> *"While utilitarianism offers a compelling framework for evaluating policy decisions by their consequences, Mill's distinction between higher and lower pleasures fails to answer Nozick's experience machine objection — revealing a deeper tension in the theory's treatment of authentic well-being."*

**Annotation:** `✅ This thesis: (1) takes a position ("fails to answer"), (2) names specific concepts from the textbook (Mill's distinction, Nozick's objection), (3) forecasts the argument's direction, (4) shows command of the material by connecting two chapter concepts.`

You navigate to the next rubric criterion and see another pair of failure examples, each built from course content deployed wrong. By the time you've scrolled through the entire Failure Atlas, you've seen 10+ concrete examples of what NOT to do — and you haven't written a word yet.

**Deterministic mechanism:**

1. **Criterion extraction:** Parse the assignment's rubric into individual criteria.

2. **Failure template selection:** For each criterion, the Negative Example Engine has a template bank organized by failure type:
   - Thesis → vague, over-broad, off-topic, buried, contradictory
   - Evidence → missing, misattributed, irrelevant, cherry-picked, no citations
   - Analysis → summary-only, no argument, hand-waving, logical gaps
   - Structure → no intro, no conclusion, paragraph sprawl, topic drift
   - Citations → APA errors, missing references, fabricated sources

3. **Template filling with course content:** For each failure template, select concepts from the textbook and deploy them incorrectly:
   - Misattribution: take a real quote, reassign to wrong philosopher
   - Reversal: take a distinction (higher/lower pleasures) and reverse it
   - Oversimplification: take a nuanced position and strip the nuance
   - Category error: apply utilitarian reasoning labeled as Kantian

4. **Annotation generation:** Each failure example gets a specific annotation explaining exactly what went wrong, referring to actual course concepts:
   - Template: "This [failure type] because [specific error]. A reader would notice [consequence]. The correct version would [contrast]."

5. **Correct example generation:** A strong example is generated using correct deployment of the same concepts — same topic, opposite quality. Shows the contrast directly.

6. **Validation:** Each failure example must actually BE wrong (not just flagged as wrong). The engine cross-checks its generated failures against the true concept definitions to confirm the error exists.

**Engines used:**
- Negative Example Engine (primary)
- Template Synthesis Engine
- Voice Attribution Engine (for misattribution failures)
- Collision Engine (for category errors)

**UI specification:**

```
┌─────────────────────────────────────────────────────────────────┐
│  FAILURE ATLAS — Ethics Paper 1                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  RUBRIC CRITERION 1/5 · THESIS & ARGUMENT (25 pts)              │
│                                                                 │
│  ┌──────────────────────┐    ┌──────────────────────┐           │
│  │ ❌ VAGUE THESIS      │    │ ❌ OVER-BROAD THESIS │           │
│  │                      │    │                      │           │
│  │ "This paper will     │    │ "Utilitarianism      │           │
│  │  discuss utilit-     │    │  explains all        │           │
│  │  arianism and some   │    │  ethical behavior,   │           │
│  │  of its problems..."│    │  has always been..."│           │
│  │                      │    │                      │           │
│  │ [red annotation]     │    │ [red annotation]     │           │
│  └──────────────────────┘    └──────────────────────┘           │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ ✅ WHAT A STRONG THESIS LOOKS LIKE                         │  │
│  │                                                           │  │
│  │ "While utilitarianism offers a compelling framework for   │  │
│  │  evaluating policy decisions by their consequences,       │  │
│  │  Mill's distinction between higher and lower pleasures... │  │
│  │                                                           │  │
│  │ [green annotation explaining why it works]                │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│                          [ NEXT CRITERION → ]                   │
└─────────────────────────────────────────────────────────────────┘
```

**Acceptance test:** Open an assignment with a rubric. Click FAILURE ATLAS. For each rubric criterion, 2-3 failure examples appear with specific annotations explaining what went wrong. Each failure uses actual course concepts deployed incorrectly. A strong example appears below for contrast with its own annotation.

---

### 1.6 COLLISION LAB

**Tagline:** "Smash two ideas together and see what survives."

**Why it's novel:** Most learning tools teach concepts in isolation. The Collision Lab teaches by making the student physically drag two concepts together on a canvas and watch what happens. The system generates a "collision report" showing: the shared ground between them, the tensions that arise, possible synthesis positions, and historical examples of when these concepts have collided in real intellectual history. It's a generative interaction grounded entirely in textbook co-occurrence patterns — no AI needed.

**Student experience:**

You open COLLISION LAB. The screen is a dark canvas with concept orbs floating on the left (a palette of your course concepts). You drag "Utilitarianism" into the center of the canvas. Then you drag "Categorical Imperative" and release it onto the first. 

The two orbs collide with a subtle shockwave animation. A third panel expands from the collision point, displaying:

**SHARED GROUND**
> Both are *rule-based* ethical frameworks that aim to be universal — applying to all rational agents equally. Both reject purely personal preferences as sufficient moral justification. Both trace back to Enlightenment attempts to ground ethics without religion.

**TENSION POINTS**
> 1. **Consequences vs. intentions:** Utilitarianism judges actions by outcomes; Categorical Imperative judges them by the universalizability of the intention.
> 2. **The person as tool:** Utilitarianism allows treating people as means if outcomes maximize well-being; CI absolutely forbids it.
> 3. **Moral math vs. moral law:** Utilitarianism requires calculation; CI requires categorical adherence.

**SYNTHESIS POSSIBILITIES**
> **Rule utilitarianism** as bridge: following rules that, if universally adopted, would produce best outcomes. Partially Kantian in structure, utilitarian in justification. (See Ch 3 p 52 — "act vs rule utilitarianism.")

**HISTORICAL COLLISIONS IN YOUR TEXTBOOK**
> Chapter 4, p 68: Kant explicitly argues against utilitarian reasoning in his discussion of the inquiring murderer. Chapter 3, p 51: Mill addresses Kantian objections while defending higher pleasures.

**YOUR COLLISION HISTORY**
> This is collision #3 involving Utilitarianism. Previous: Utilitarianism × Virtue Ethics. Utilitarianism × Moral Relativism.

At the bottom, a button: `[EXPORT AS STUDY NOTE]` which adds this collision report to your notebook for later review.

**Deterministic mechanism:**

1. **Concept vector construction:** Each concept has a "vector" of attributes built during textbook ingestion:
   - Keywords
   - Attributed philosophers
   - Section locations
   - Framework type (consequentialist, deontological, virtue-based, etc.)
   - Claim structure (universal, particular, categorical, conditional)

2. **Collision computation:** When two concepts collide, the Collision Engine computes:
   - **Shared ground:** intersection of keywords, shared framework features, shared philosophers
   - **Tensions:** vector dimensions where they oppose (e.g., one is consequentialist, other is deontological)
   - **Synthesis:** look for a third concept in the graph that cites both or bridges their opposition; if found, it becomes the suggested synthesis
   - **Historical collisions:** search textbook for paragraphs containing both concept names; those paragraphs are the historical record

3. **Report template synthesis:** Fill the collision report template with actual extracted content:
   - Shared ground sentences built from overlapping keywords + "both X" template
   - Tension sentences built from opposing vector dimensions + "X vs Y" template
   - Synthesis sentences pulled from any bridging concept found
   - Historical collisions pulled verbatim from paragraphs with citations

4. **Collision history:** Each collision is logged. The system tracks which concepts the student has collided with which, building a personal collision map.

**Engines used:**
- Collision Engine (primary)
- Passage Retrieval Engine
- Template Synthesis Engine
- Proximity Engine

**UI specification:**

```
┌──────────────────────────────────────────────────────────────────┐
│  COLLISION LAB                                                   │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─ PALETTE ─┐   ┌─ COLLISION CANVAS ─────────────────────────┐  │
│  │           │   │                                            │  │
│  │  ●util    │   │              ●────────●                   │  │
│  │  ●kant    │   │           util      cat. imperative       │  │
│  │  ●mill    │   │                ◌◌◌                        │  │
│  │  ●virtue  │   │            (shockwave)                    │  │
│  │  ●relat   │   │                                            │  │
│  │  ●...     │   │                                            │  │
│  │           │   │                                            │  │
│  └───────────┘   └────────────────────────────────────────────┘  │
│                                                                  │
│  ┌─ COLLISION REPORT ─────────────────────────────────────────┐  │
│  │                                                            │  │
│  │ SHARED GROUND                                              │  │
│  │ Both are rule-based ethical frameworks that aim to be      │  │
│  │ universal, applying to all rational agents equally...      │  │
│  │                                                            │  │
│  │ TENSION POINTS                                             │  │
│  │ 1. Consequences vs intentions                              │  │
│  │ 2. The person as tool                                      │  │
│  │ 3. Moral math vs moral law                                 │  │
│  │                                                            │  │
│  │ SYNTHESIS POSSIBILITIES                                    │  │
│  │ Rule utilitarianism as bridge...                           │  │
│  │                                                            │  │
│  │ HISTORICAL COLLISIONS IN YOUR TEXTBOOK                     │  │
│  │ Ch 4 p 68, Ch 3 p 51                                       │  │
│  │                                                            │  │
│  │ [ EXPORT AS STUDY NOTE ]  [ COLLIDE ANOTHER ]              │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

**Acceptance test:** Upload a textbook with several related concepts. Open COLLISION LAB. Drag two concepts together. Within 2 seconds, a collision report appears with all four sections (shared ground, tensions, synthesis, historical collisions). Each section contains content grounded in the textbook with citations. Export to study notes works.

---

### 1.7 DUEL ARENA

**Tagline:** "Make two concepts fight. You judge."

**Why it's novel:** A structured debate format where two concepts argue against each other in multiple rounds, each pulling their positions from the textbook. The student is the moderator who issues rulings between rounds. It's like watching a boxing match between ideas — except the student has to understand both sides well enough to declare a winner, and the system grades their ruling based on textbook evidence.

**Student experience:**

You open DUEL ARENA. The screen is a split-screen with two concept cards facing each other across a central "mat." You select "Moral Relativism" for the left corner and "Moral Realism" for the right corner. You click `START DUEL`.

**ROUND 1: OPENING STATEMENTS**

**Left corner — Moral Relativism:**
> *"Moral values differ from culture to culture and across historical periods. What is right in one society may be wrong in another. No culture has the standing to judge another's moral framework as objectively incorrect. (From Ch 2 p 28.)"*

**Right corner — Moral Realism:**
> *"Moral facts exist independently of what any individual or culture believes. Just as physical facts are true regardless of our opinions, moral facts like 'torturing innocents for fun is wrong' hold universally. (From Ch 2 p 31.)"*

A judge gavel icon appears. You're prompted: `After Round 1, which opening was stronger? [LEFT] [RIGHT] [TIE]`. You choose LEFT. The system notes your ruling.

**ROUND 2: FIRST OBJECTION**

**Right attacks Left:**
> *"If moral relativism were true, we could not condemn genocide, slavery, or the historical subjugation of women — all practices endorsed by entire cultures. Yet we do condemn them, suggesting we already believe in trans-cultural moral facts. (Textbook Ch 2 p 29.)"*

**Left responds:**
> *"That objection assumes we have the standing to judge past cultures by present standards. Relativism does not require approval of every cultural practice — it requires epistemic humility about whose frame is correct. (Inferred from Ch 2 p 30 contrast structure.)"*

Another ruling prompt. You choose RIGHT this time.

**ROUND 3: DEEPER CHALLENGE**

And so on for 4-5 rounds. After the final round, the system shows your cumulative ruling pattern:
`Left: 2 wins | Right: 3 wins | Ties: 0`

Then: `FINAL JUDGMENT - DECLARE A WINNER`. You must write a 2-3 sentence ruling explaining why you chose the winner. The system then compares your ruling against the textbook's own treatment of this debate (if the textbook takes a side or remains neutral) and gives you feedback:

> **Your ruling:** "Moral realism wins because without universal moral facts we can't explain why we all condemn torture and genocide."
>
> **Textbook alignment:** Your ruling aligns with the textbook's discussion on p 31, which takes a pragmatic realist position. The textbook notes that "even thoroughgoing relativists condemn genocide" (p 32) — you caught this.
>
> **Strengthening your argument:** You could have also cited Ch 2 p 33, which addresses the "moral progress" argument (if relativism were true, there would be no such thing as moral progress).

Your ruling history and the duel replay are saved.

**Deterministic mechanism:**

1. **Duel preparation:** Select two concepts with an existing `contrasts-with` relationship in the concept graph.

2. **Round structure:** 4-5 rounds with predefined archetypes:
   - Round 1: Opening statements (each concept's core position, from its textbook definition)
   - Round 2: First objection (Right attacks Left using objection patterns extracted from textbook near Left's discussion)
   - Round 3: Response + counter-objection
   - Round 4: Strongest challenge (uses the highest-confidence objection found for either side)
   - Round 5: Closing (each concept's strongest positive claim)

3. **Position extraction:** For each round, retrieve the relevant passage from the textbook:
   - Opening: concept's core definition
   - Objection: sentences near concept containing objection markers (`"critics argue"`, `"however"`, `"one problem"`)
   - Response: sentences following the objection that defend the position
   - Challenge: the single highest-confidence objection in the textbook

4. **Template wrapping:** Each passage is wrapped in a combat-oratory template: `"[Side] argues: '[passage]'"` or `"[Side] responds: '[passage]'"`.

5. **Ruling evaluation:** After the student writes their final ruling, parse it for key content words and compare against the textbook's treatment of the debate:
   - Does the textbook take a side? If so, does the student's ruling align?
   - What key arguments does the textbook use for each side? Did the student cite them?
   - Are there stronger arguments the student missed?

6. **Feedback generation:** Build feedback using a template:
   - Alignment: "Your ruling aligns with / diverges from the textbook's position on p X."
   - Coverage: "You cited A, B. You missed C, D, E."
   - Strength: "Your strongest point was [extracted from ruling]. Your weakest was [inferred gap]."

**Engines used:**
- Dialogue Synthesis Engine (primary)
- Voice Attribution Engine
- Passage Retrieval Engine
- Commitment Engine (for evaluating student rulings)
- Template Synthesis Engine

**UI specification:**

```
┌─────────────────────────────────────────────────────────────────┐
│  DUEL ARENA                                    ROUND 2 of 5     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────┐         ┌──────────────────────┐     │
│  │   MORAL RELATIVISM   │   VS    │   MORAL REALISM      │     │
│  │   ● ● ● ● ●          │  ←→←→   │   ● ● ● ● ●          │     │
│  │   [LEFT CORNER]      │         │   [RIGHT CORNER]     │     │
│  └──────────────────────┘         └──────────────────────┘     │
│                                                                 │
│  ┌─ RIGHT ATTACKS LEFT ───────────────────────────────────────┐ │
│  │ "If moral relativism were true, we could not condemn       │ │
│  │  genocide, slavery, or the historical subjugation of       │ │
│  │  women — all practices endorsed by entire cultures."       │ │
│  │                               — Textbook Ch 2 p 29         │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌─ LEFT RESPONDS ────────────────────────────────────────────┐ │
│  │ "That objection assumes we have the standing to judge      │ │
│  │  past cultures by present standards. Relativism requires   │ │
│  │  epistemic humility about whose frame is correct."         │ │
│  │                               — Inferred from Ch 2 p 30    │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  YOUR RULING FOR ROUND 2:                                       │
│  [  STRONGER LEFT  ]  [  STRONGER RIGHT  ]  [  TIE  ]           │
│                                                                 │
│                                                  [ NEXT → ]     │
└─────────────────────────────────────────────────────────────────┘
```

**Acceptance test:** Select two contrasting concepts from your textbook. Open DUEL ARENA. Start the duel. Each round presents opening statements, objections, and responses pulled from actual textbook passages with citations. You rule after each round. After the final round, write a judgment. The system gives feedback on alignment with the textbook's treatment and identifies arguments you missed.

---

### 1.8 PROMPT PRISM

**Tagline:** "Every question has five answers before it has one."

**Why it's novel:** Assignment prompts look like one question. They're actually prisms that refract into multiple valid interpretations. Most students pick one interpretation (usually the most literal) and write toward it. The Prompt Prism refracts any assignment prompt into 5+ distinct valid interpretations — each with its own concept lineage, difficulty level, angle of approach, and suggested thesis direction. Lets the student SEE the possibility space before committing to one angle.

**Student experience:**

You open an assignment: "Discuss the strengths and weaknesses of utilitarianism using examples from your own life."

You click PROMPT PRISM. The screen displays the original prompt at the top, then a visual "prism" refraction animation where the prompt splits into five beams, each landing on a different "angle card":

**ANGLE 1: BIOGRAPHICAL** · Difficulty: LOW · Concepts: 2-3
> Use personal anecdotes as the primary evidence, introducing utilitarian concepts only when they apply directly to your situations. This reads like a reflective essay.
> **Concepts you'd engage:** Utilitarianism core, one objection
> **Thesis shape:** "In my own life, [experience] showed me that utilitarian reasoning [strength], but [other experience] revealed [weakness]."
> **Risk:** May feel shallow if not grounded in theory.

**ANGLE 2: THEORETICAL WITH ILLUSTRATION** · Difficulty: MEDIUM · Concepts: 4-5
> Lead with the theoretical analysis (strengths and weaknesses from the textbook), using personal examples as illustrations of each point. More rigorous than Angle 1.
> **Concepts you'd engage:** Utilitarianism, Bentham's calculus, Mill's higher pleasures, at least one objection
> **Thesis shape:** "Utilitarianism's strength lies in its impartiality — a point I experienced when [example]. Its weakness shows in [objection] — demonstrated by [example]."
> **Risk:** Balancing theory and example is hard without feeling stitched together.

**ANGLE 3: DIALECTICAL CHALLENGE** · Difficulty: HIGH · Concepts: 6-8
> Treat the prompt as an invitation to take a position — either utilitarianism works for your life or it doesn't — and argue it with examples as evidence and theory as framework. Most academically ambitious.
> **Concepts you'd engage:** Full utilitarian framework + 2 objections + at least one alternative theory
> **Thesis shape:** "While utilitarianism appears attractive as a moral framework, my own life experiences reveal a deeper tension that Mill's refinements cannot resolve, suggesting [your position]."
> **Risk:** Requires deep engagement with the textbook. Highest grade ceiling.

**ANGLE 4: COUNTERFACTUAL** · Difficulty: MEDIUM-HIGH · Concepts: 4-6
> Consider moments in your life where you DID NOT use utilitarian reasoning, then ask what would have happened if you had. Reveals both strengths and weaknesses through imagined alternatives.
> **Concepts you'd engage:** Utilitarianism, decision theory, at least one objection
> **Thesis shape:** "In [decision], I chose based on [non-utilitarian reason]. A utilitarian would have [counterfactual]. This reveals both the power and the limits of the framework."
> **Risk:** Counterfactuals can feel speculative if not carefully grounded.

**ANGLE 5: COMPARATIVE** · Difficulty: MEDIUM · Concepts: 5-7
> Compare utilitarianism to another ethical framework you know (from Chapter 4 or 5) using personal examples to show where each frames the situation better.
> **Concepts you'd engage:** Utilitarianism + one other framework (Kantian or Virtue) + examples
> **Thesis shape:** "Where utilitarianism measures [X] in my experience, Kantian ethics illuminates [Y] — suggesting neither framework alone captures the moral reality of [your situation]."
> **Risk:** Requires solid grasp of a second framework.

You read all five. Each has a `[CHOOSE THIS ANGLE]` button. Clicking it locks in that angle and passes the suggested thesis shape into the submission workspace as a starting scaffold.

**Deterministic mechanism:**

1. **Prompt parsing:** Extract from the prompt:
   - Action verbs (discuss, analyze, compare, evaluate, defend, critique)
   - Topic nouns (utilitarianism, consequences, ethics)
   - Modifier phrases ("using examples from your own life", "in 1500 words")
   - Question structure (open, bounded, comparative, evaluative)

2. **Angle template selection:** The Refraction Engine has 12 angle templates. For each prompt, filter to those applicable:
   - Biographical (requires "your life/experience" modifier)
   - Theoretical with illustration (requires concept-heavy topic)
   - Dialectical (requires "strengths and weaknesses" or "evaluate" verb)
   - Counterfactual (works with open-ended prompts)
   - Comparative (requires multi-concept topic or "compare" verb)
   - Historical (requires topic with historical development in textbook)
   - Empirical (requires topic with case studies available)
   - Phenomenological (requires "experience" or "perception" modifier)
   - Structural (requires topic with clear internal parts)
   - Critical (requires "objection" or "critique" territory)
   - Synthetic (requires concepts with strong relationships)
   - Applied (requires modern-domain applicability)

3. **For each applicable angle:** Generate:
   - **Difficulty estimate:** Based on number of concepts required and depth of engagement
   - **Concept lineage:** Walk the concept graph from the prompt's main topic outward; list concepts at depth 1-2
   - **Thesis shape template:** Fill a thesis template specific to the angle
   - **Risk statement:** Pull from a risk template bank matched to the angle type

4. **Select top 5 angles:** Rank by a combination of applicability score and diversity (prefer angles that differ from each other in approach).

5. **Visual refraction animation:** Use the Spring Physics Engine to animate the prompt splitting into 5 beams, each landing on a card.

6. **Angle selection:** When the student picks an angle, inject the thesis shape as the initial scaffold in the submission workspace, with placeholder brackets the student fills in.

**Engines used:**
- Refraction Engine (primary)
- Proximity Engine
- Template Synthesis Engine
- Spring Physics Engine (for animation)

**UI specification:**

```
┌─────────────────────────────────────────────────────────────────┐
│  PROMPT PRISM                                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─ ORIGINAL PROMPT ──────────────────────────────────────────┐ │
│  │ "Discuss the strengths and weaknesses of utilitarianism   │ │
│  │  using examples from your own life."                       │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│                          ╱ ╲ ╲ ╲                                │
│                         ╱   ╲ ╲ ╲                               │
│                        ╱     ╲ ╲ ╲                              │
│                       ▼       ▼▼▼                               │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───┐ │
│  │ANGLE 1   │  │ANGLE 2   │  │ANGLE 3   │  │ANGLE 4   │  │ 5 │ │
│  │Biographic│  │Theoretic │  │Dialectic │  │Counterfac│  │Comp│ │
│  │          │  │          │  │          │  │          │  │    │ │
│  │LOW diff  │  │MED diff  │  │HIGH diff │  │MED-H diff│  │MED │ │
│  │2-3 concep│  │4-5 concep│  │6-8 concep│  │4-6 concep│  │5-7 │ │
│  │          │  │          │  │          │  │          │  │    │ │
│  │[CHOOSE]  │  │[CHOOSE]  │  │[CHOOSE]  │  │[CHOOSE]  │  │[CH]│ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └───┘ │
└─────────────────────────────────────────────────────────────────┘
```

**Acceptance test:** Open an assignment with an open-ended prompt. Click PROMPT PRISM. A refraction animation plays. Five distinct angle cards appear, each with difficulty, concept count, thesis shape, and risk statement. Each angle is genuinely different from the others (not just reworded). Click CHOOSE on an angle — it injects a thesis scaffold into the submission workspace.

---

### 1.9 TIME CAPSULE

**Tagline:** "A promise to the you who gets graded."

**Why it's novel:** Before starting work on an assignment, the student writes a short letter to their future self — the one who's about to submit. They commit to specific things: "I will cite the Mill objection," "I will write 1500+ words," "I will avoid passive voice," "I will not start writing the night before." The system parses this letter, extracts the promises, and turns it into a living contract. While the student works, the contract is visible. When they finish, they see how well they kept the promises to their past self. It's not a todo list — it's a letter of intent that gets audited.

**Student experience:**

You open an assignment for the first time. Before you can access the submission workspace, a soft overlay appears: `TIME CAPSULE — LEAVE A LETTER FOR FUTURE YOU`. A textarea invites you:

> *"Write a short letter to the version of you who will submit this assignment. What do you want that person to have done? What do you want them to avoid? What promises are you making now that you need them to keep?"*

You type:

> Dear future me, I'm starting this paper 8 days before it's due, not the night before. I promise to cite at least 4 textbook sources, including the Nozick experience machine objection. I will write in third person and avoid "I think". I will do Neural Forge on Chapter 3 before writing a single paragraph of the paper. I will finish a complete draft 48 hours before the deadline so I have time to revise. Don't let me down. — Me, right now.

You click `SEAL THE CAPSULE`. The system parses your letter and extracts promises:

- ✓ Started 8 days before due (deadline commitment)
- ✓ Will cite ≥ 4 textbook sources (citation count commitment)
- ✓ Will cite Nozick experience machine (specific content commitment)
- ✓ Will write in third person (style commitment)
- ✓ Will avoid "I think" (style commitment)
- ✓ Will complete Neural Forge Ch 3 before writing (prerequisite commitment)
- ✓ Draft complete 48 hours before deadline (timeline commitment)

These are now your **Active Commitments**. They appear as a subtle strip at the top of the submission workspace while you work. Each one turns green as it gets fulfilled (Neural Forge completed, word count hit, citation added, etc.). Each turns yellow if partially met, red if violated.

When you click GRADE & EXPORT at the end:

> **TIME CAPSULE REPORT**
>
> Your past self wrote this letter on April 2, 2026 at 10:14 AM. Here's how you kept your promises:
>
> ✅ Started 8 days before due — **KEPT**
> ✅ Cite ≥ 4 textbook sources — **KEPT** (you cited 6)
> ❌ Cite Nozick experience machine — **BROKEN** (not found in your paper)
> ✅ Write in third person — **KEPT**
> ⚠️ Avoid "I think" — **PARTIALLY** (found 1 instance in paragraph 3)
> ✅ Neural Forge Ch 3 before writing — **KEPT**
> ❌ Draft complete 48 hours before deadline — **BROKEN** (draft completed 6 hours before)
>
> **Kept: 4/7 · Partial: 1/7 · Broken: 2/7**
>
> Your past self trusted you. Do better next time, or write a more honest letter.

The report is saved in your capsule history. You can look back at previous capsules and see your promise-keeping track record over the semester.

**Deterministic mechanism:**

1. **Letter parsing:** The Commitment Engine parses the letter using 30+ promise-detection patterns:
   - Citation promises: `/(cite|reference|use) (at least |a minimum of )?(\d+) (textbook |scholarly )?sources?/i`
   - Content promises: `/(?:cite|include|mention|discuss|address) (?:the )?(.+?)(?:\.|,|;|$)/i` (captures specific content requirements)
   - Style promises: `/(?:write|stay|keep it) (?:in )?(first|second|third) person/i`
   - Avoidance promises: `/(?:avoid|don'?t use|no) ([^.]+)/i`
   - Timeline promises: `/(?:finish|complete|submit|draft) (?:by|before) (\d+) (hours?|days?)/i`
   - Prerequisite promises: `/(?:do|complete|finish) (?:neural forge|forge|practice|review) (?:on )?(.+?) (?:before|first)/i`
   - Word count promises: `/(?:write|hit|reach|at least) (\d+)[\s-]*(?:words?|pages?)/i`

2. **Commitment extraction:** Each pattern match becomes a `Commitment` object:
   ```typescript
   interface Commitment {
     id: string;
     type: 'citation-count' | 'specific-content' | 'style' | 'avoidance' | 'timeline' | 'prerequisite' | 'word-count';
     text: string; // original promise text
     target: any; // structured target (e.g., 4 for citation count)
     status: 'pending' | 'kept' | 'partial' | 'broken';
     verifier: (submission: Submission, progress: Progress) => VerifyResult;
   }
   ```

3. **Verifier functions:** Each commitment type has a verification function that runs against the final submission:
   - Citation count: parse submission for APA citations, compare
   - Specific content: check if named concept appears in submission text
   - Style (third person): scan for first-person pronouns
   - Avoidance: grep for forbidden phrases
   - Timeline: compare draft completion timestamp to due date
   - Prerequisite: check Neural Forge session history
   - Word count: count words in submission

4. **Live status updates:** While the student works, the verifier functions run on every save event and update commitment status. Visible strip shows live counts.

5. **Final report:** When the student clicks GRADE & EXPORT, all commitments are finalized and the Time Capsule Report is generated with pass/partial/broken counts, letter preview, and suggestions.

6. **Historical tracking:** All capsules are saved. A "capsule history" view shows the student's promise-keeping rate over time — did they get better at honesty? At discipline? Real behavioral data.

**Engines used:**
- Commitment Engine (primary)
- Passage Retrieval Engine (for specific content verification)
- Template Synthesis Engine (for report generation)
- Interaction State Engine

**UI specification:**

```
┌─────────────────────────────────────────────────────────────────┐
│  TIME CAPSULE · Ethics Paper 1                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Dear future me, I'm starting this paper 8 days before it's     │
│  due, not the night before. I promise to cite at least 4        │
│  textbook sources, including the Nozick experience machine      │
│  objection. I will write in third person and avoid "I think".   │
│  I will do Neural Forge on Chapter 3 before writing a single    │
│  paragraph of the paper. I will finish a complete draft 48      │
│  hours before the deadline so I have time to revise. Don't      │
│  let me down. — Me, right now.                                  │
│                                                                 │
│  ┌─ EXTRACTED COMMITMENTS ────────────────────────────────────┐ │
│  │ ✓ Started 8 days before due                                │ │
│  │ ✓ Will cite ≥ 4 textbook sources                           │ │
│  │ ✓ Will cite Nozick experience machine                      │ │
│  │ ✓ Will write in third person                               │ │
│  │ ✓ Will avoid "I think"                                     │ │
│  │ ✓ Will complete Neural Forge Ch 3 before writing           │ │
│  │ ✓ Draft complete 48 hours before deadline                  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│                           [ SEAL THE CAPSULE ]                  │
└─────────────────────────────────────────────────────────────────┘
```

And the live strip while working:
```
┌─ ACTIVE COMMITMENTS ────────────────────────────────────────────┐
│ ✅ 8 days early | 🟡 3/4 citations | ❌ Nozick missing | ✅ 3rd │
│ 🟢 no "I think" | ✅ Forge done | 🟡 36h before due              │
└─────────────────────────────────────────────────────────────────┘
```

**Acceptance test:** Open a new assignment. The Time Capsule overlay appears. Write a letter with 5+ promises in different categories. Seal the capsule. Commitments are extracted and displayed. Start writing the submission. The commitment strip updates live as you hit targets. Click GRADE & EXPORT. The Time Capsule Report shows exactly which promises were kept, partial, or broken.

---

## 2. THE TWELVE ENGINES THAT POWER ALL NINE INTERACTIONS

Each engine is a reusable module in `packages/interactions-engine/src/engines/`. Every interaction depends on 3-6 engines. Build the engines first, then compose the interactions on top.

---

### ENGINE A: PASSAGE RETRIEVAL ENGINE

**Purpose:** Efficient indexed search across all uploaded textbook content. The backbone of Echo Chamber, Oracle Panel, Shadow Reader, Collision Lab, and Duel Arena.

**Implementation:**

```typescript
interface PassageIndex {
  passages: IndexedPassage[];
  byToken: Map<string, number[]>; // token → passage IDs
  byConcept: Map<string, number[]>; // concept ID → passage IDs
  bySection: Map<string, number[]>; // section ID → passage IDs
  tfidf: TFIDFMatrix;
}

interface IndexedPassage {
  id: number;
  text: string;
  sectionId: string;
  chapterTitle: string;
  pageNumber: number;
  wordCount: number;
  keywords: string[];
  concepts: string[];
  attributions: string[]; // named thinkers
  position: number; // order in document
}

class PassageRetrievalEngine {
  private index: PassageIndex;
  
  constructor(textbook: ForgeBundle) {
    this.index = this.buildIndex(textbook);
  }
  
  buildIndex(textbook: ForgeBundle): PassageIndex {
    // Split textbook into overlapping passages (30-60 words each, 10-word overlap)
    // For each passage, extract: keywords, concepts, attributions
    // Build inverted indexes: byToken, byConcept, bySection
    // Compute TF-IDF matrix for cosine similarity search
  }
  
  search(query: string, options: SearchOptions = {}): PassageResult[] {
    const queryTokens = this.tokenize(query).filter(t => !STOPWORDS.has(t));
    
    // Retrieve candidate passages via token index
    const candidates = new Set<number>();
    for (const token of queryTokens) {
      const matches = this.index.byToken.get(token) || [];
      matches.forEach(id => candidates.add(id));
    }
    
    // Score candidates
    const scored = Array.from(candidates).map(id => {
      const passage = this.index.passages[id];
      const tfIdfScore = this.cosineSimilarity(queryTokens, passage);
      const conceptBoost = options.concepts ? this.conceptOverlap(options.concepts, passage) * 0.3 : 0;
      const sectionBoost = options.sectionHint ? this.sectionMatch(options.sectionHint, passage) * 0.2 : 0;
      const freshnessPenalty = this.freshnessPenalty(passage, options.recentlyShown);
      
      return {
        passage,
        score: tfIdfScore + conceptBoost + sectionBoost - freshnessPenalty,
      };
    });
    
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, options.limit || 10);
  }
  
  searchByConcept(conceptId: string): PassageResult[] {
    const ids = this.index.byConcept.get(conceptId) || [];
    return ids.map(id => ({ passage: this.index.passages[id], score: 1 }));
  }
  
  searchByAttribution(thinker: string): PassageResult[] {
    return this.index.passages
      .filter(p => p.attributions.includes(thinker))
      .map(p => ({ passage: p, score: 1 }));
  }
}
```

**Quality gate:** Every search returns results in < 100ms for textbooks up to 500 pages. Index is persisted to IndexedDB for instant load on subsequent sessions.

---

### ENGINE B: VOICE ATTRIBUTION ENGINE

**Purpose:** Maps textbook passages to specific thinkers/authors. Powers Oracle Panel and Duel Arena attribution.

**Implementation:**

```typescript
interface Attribution {
  thinker: string;
  passage: IndexedPassage;
  confidence: number;
  attributionType: 'direct-quote' | 'narrative' | 'paraphrase' | 'section-authorship';
  topic: string[];
  position: 'supports' | 'opposes' | 'neutral';
}

class VoiceAttributionEngine {
  private philosopherList: Philosopher[]; // from philosophers.json
  private attributions: Attribution[] = [];
  
  ingest(textbook: ForgeBundle) {
    for (const passage of textbook.passages) {
      // Method 1: Direct quote detection
      // Pattern: "[Thinker] (said|wrote|argued|claimed|noted|observed) [quote]"
      const directQuoteRegex = /(\w+(?:\s+\w+)?)\s+(?:said|wrote|argued|claimed|noted|observed|stated|maintained|held)\s*[:,]?\s*["""]([^"""]+)["""]/gi;
      let match;
      while ((match = directQuoteRegex.exec(passage.text)) !== null) {
        const thinkerName = match[1];
        if (this.isKnownThinker(thinkerName)) {
          this.attributions.push({
            thinker: thinkerName,
            passage,
            confidence: 1.0,
            attributionType: 'direct-quote',
            topic: this.extractTopics(match[2]),
            position: this.detectPosition(match[2]),
          });
        }
      }
      
      // Method 2: Narrative attribution
      // Pattern: "According to [Thinker], ..."
      // Pattern: "[Thinker]'s view is that ..."
      // Pattern: "In [Thinker]'s analysis, ..."
      
      // Method 3: Paraphrase detection  
      // Pattern: "[Thinker] argues that ..."
      // Pattern: "For [Thinker], ..."
      
      // Method 4: Section authorship
      // If a section header contains a thinker's name, all passages in that section
      // are weakly attributed to them
    }
  }
  
  getResponsesToQuestion(question: string, topic: string[]): Record<string, Attribution[]> {
    const responses: Record<string, Attribution[]> = {};
    
    for (const philosopher of this.philosopherList) {
      const relevant = this.attributions
        .filter(a => a.thinker === philosopher.name)
        .filter(a => this.topicOverlap(a.topic, topic) > 0)
        .sort((a, b) => this.relevanceScore(b, topic) - this.relevanceScore(a, topic))
        .slice(0, 3);
      
      if (relevant.length > 0) {
        responses[philosopher.name] = relevant;
      }
    }
    
    return responses;
  }
  
  getStrongestObjection(thinker: string, targetConcept: string): Attribution | null {
    return this.attributions
      .filter(a => a.thinker === thinker)
      .filter(a => a.position === 'opposes')
      .filter(a => a.topic.includes(targetConcept))
      .sort((a, b) => b.confidence - a.confidence)[0] || null;
  }
}
```

**Quality gate:** Must identify at least 3 attributions per major thinker in a standard philosophy textbook chapter. Attribution confidence must be calibrated — direct quotes score 1.0, narrative 0.8, paraphrase 0.6, section authorship 0.4.

---

### ENGINE C: SPRING PHYSICS ENGINE

**Purpose:** Reusable physics simulation for Gravity Field, Collision Lab animations, and spring-based motion across the app.

**Implementation:**

```typescript
interface Body {
  id: string;
  position: Vec2;
  velocity: Vec2;
  mass: number;
  radius: number;
  fixed?: boolean;
}

class SpringPhysicsEngine {
  private bodies: Map<string, Body> = new Map();
  private springs: Spring[] = [];
  private gravity: number = 0;
  private damping: number = 0.95;
  private rafId: number | null = null;
  
  addBody(body: Body) { this.bodies.set(body.id, body); }
  removeBody(id: string) { this.bodies.delete(id); }
  
  addSpring(aId: string, bId: string, restLength: number, stiffness: number) {
    this.springs.push({ aId, bId, restLength, stiffness });
  }
  
  setGravityField(center: Vec2, strength: number) {
    // Bodies feel gravitational pull toward center
    // F = G * m / r²
  }
  
  orbit(orbiterId: string, centerId: string, radius: number, period: number) {
    // Constrained orbital motion
    const orbiter = this.bodies.get(orbiterId)!;
    const center = this.bodies.get(centerId)!;
    // Compute orbital velocity for circular orbit
    const angularVelocity = (2 * Math.PI) / period;
    // Set initial position and velocity
  }
  
  step(dt: number) {
    // Apply gravity between bodies
    for (const [id1, a] of this.bodies) {
      if (a.fixed) continue;
      for (const [id2, b] of this.bodies) {
        if (id1 === id2) continue;
        const dx = b.position.x - a.position.x;
        const dy = b.position.y - a.position.y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq);
        if (dist < 1) continue;
        const force = (this.gravity * a.mass * b.mass) / distSq;
        const fx = (force * dx) / dist;
        const fy = (force * dy) / dist;
        a.velocity.x += (fx / a.mass) * dt;
        a.velocity.y += (fy / a.mass) * dt;
      }
    }
    
    // Apply spring forces
    for (const spring of this.springs) {
      const a = this.bodies.get(spring.aId)!;
      const b = this.bodies.get(spring.bId)!;
      const dx = b.position.x - a.position.x;
      const dy = b.position.y - a.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const displacement = dist - spring.restLength;
      const force = spring.stiffness * displacement;
      const fx = (force * dx) / dist;
      const fy = (force * dy) / dist;
      if (!a.fixed) { a.velocity.x += fx / a.mass; a.velocity.y += fy / a.mass; }
      if (!b.fixed) { b.velocity.x -= fx / b.mass; b.velocity.y -= fy / b.mass; }
    }
    
    // Update positions, apply damping
    for (const body of this.bodies.values()) {
      if (body.fixed) continue;
      body.velocity.x *= this.damping;
      body.velocity.y *= this.damping;
      body.position.x += body.velocity.x * dt;
      body.position.y += body.velocity.y * dt;
    }
  }
  
  start(onFrame: (bodies: Map<string, Body>) => void) {
    let lastTime = performance.now();
    const loop = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;
      this.step(dt * 60); // normalize to 60fps units
      onFrame(this.bodies);
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }
  
  stop() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = null;
  }
}
```

---

### ENGINE D: AMBIENT SURFACE ENGINE

**Purpose:** Peripheral content display with rotation, freshness tracking, and context sensitivity. Powers Shadow Reader and the Echo Chamber's ambient layer.

**Implementation:**

```typescript
interface SurfaceConfig {
  intensity: 'off' | 'gentle' | 'steady' | 'immersive';
  contextBias: 'random' | 'view' | 'gaps';
  display: 'right-rail' | 'bottom-strip' | 'corner-fade';
}

interface AmbientItem {
  id: string;
  content: string;
  source: string;
  shownCount: number;
  lastShownAt: number;
  contextTags: string[];
  concepts: string[];
}

class AmbientSurfaceEngine {
  private items: AmbientItem[] = [];
  private config: SurfaceConfig;
  private activeItem: AmbientItem | null = null;
  private currentView: string = '';
  
  setContext(view: string) { this.currentView = view; }
  
  tick() {
    // Select next item to surface
    const candidates = this.items
      .filter(item => Date.now() - item.lastShownAt > 10 * 60 * 1000) // not shown in 10min
      .filter(item => {
        if (this.config.contextBias === 'view') {
          return item.contextTags.includes(this.currentView) || item.contextTags.length === 0;
        }
        if (this.config.contextBias === 'gaps') {
          return item.concepts.some(c => this.isGapConcept(c));
        }
        return true;
      });
    
    if (candidates.length === 0) return;
    
    // Weight by freshness (rarely-shown > never-shown > recently-shown)
    const weighted = candidates.map(item => ({
      item,
      weight: 1 + (1 / (item.shownCount + 1)),
    }));
    
    const selected = this.weightedRandom(weighted);
    
    selected.shownCount++;
    selected.lastShownAt = Date.now();
    this.activeItem = selected;
    
    this.emit('surface', selected);
  }
  
  start() {
    const intervalMs = this.getIntervalForIntensity();
    setInterval(() => this.tick(), intervalMs);
  }
  
  private getIntervalForIntensity(): number {
    switch (this.config.intensity) {
      case 'gentle': return 30000;
      case 'steady': return 15000;
      case 'immersive': return 8000;
      default: return 0;
    }
  }
  
  getFamiliarityStats() {
    const total = this.items.length;
    const familiar = this.items.filter(i => i.shownCount >= 3).length;
    const seen = this.items.filter(i => i.shownCount >= 1).length;
    return { total, seen, familiar, percentFamiliar: familiar / total };
  }
}
```

---

### ENGINE E: DIALOGUE SYNTHESIS ENGINE

**Purpose:** Builds structured multi-turn dialogues (debates, panels, duels) from positional data. Powers Oracle Panel and Duel Arena.

**Implementation:**

```typescript
interface Position {
  speaker: string;
  content: string;
  type: 'claim' | 'objection' | 'defense' | 'synthesis';
  topic: string[];
  source: string;
}

class DialogueSynthesisEngine {
  private attributionEngine: VoiceAttributionEngine;
  private passageEngine: PassageRetrievalEngine;
  
  buildPanelResponse(question: string, thinkers: string[]): PanelResponse {
    const topics = this.extractTopics(question);
    const responses: Record<string, SynthesizedResponse> = {};
    
    for (const thinker of thinkers) {
      const attributions = this.attributionEngine.getResponsesToQuestion(question, topics);
      const thinkerAttrs = attributions[thinker] || [];
      
      if (thinkerAttrs.length === 0) {
        responses[thinker] = {
          text: `${thinker}'s textbook attributions do not directly address this question.`,
          sources: [],
          confidence: 0,
        };
        continue;
      }
      
      // Template-based synthesis
      const template = this.selectTemplateForThinker(thinker);
      const filledTemplate = this.fillTemplate(template, thinkerAttrs, topics);
      
      responses[thinker] = {
        text: filledTemplate,
        sources: thinkerAttrs.map(a => ({
          passage: a.passage.text,
          page: a.passage.pageNumber,
          confidence: a.confidence,
        })),
        confidence: thinkerAttrs.reduce((sum, a) => sum + a.confidence, 0) / thinkerAttrs.length,
      };
    }
    
    return { question, responses };
  }
  
  buildDuelRound(left: string, right: string, roundNumber: number, previousRounds: DuelRound[]): DuelRound {
    switch (roundNumber) {
      case 1: return this.buildOpeningStatements(left, right);
      case 2: return this.buildObjection('right-attacks-left', left, right);
      case 3: return this.buildObjection('left-attacks-right', left, right);
      case 4: return this.buildStrongestChallenge(left, right, previousRounds);
      case 5: return this.buildClosingStatements(left, right);
    }
  }
  
  private buildOpeningStatements(left: string, right: string): DuelRound {
    // Retrieve core definition passages for each concept
    const leftOpening = this.passageEngine.searchByConcept(left)[0];
    const rightOpening = this.passageEngine.searchByConcept(right)[0];
    
    return {
      round: 1,
      type: 'opening',
      leftPosition: {
        speaker: left,
        content: leftOpening.passage.text,
        type: 'claim',
        topic: leftOpening.passage.concepts,
        source: `Ch ${leftOpening.passage.chapterTitle} p ${leftOpening.passage.pageNumber}`,
      },
      rightPosition: { /* similar */ },
    };
  }
}
```

---

### ENGINE F: NEGATIVE EXAMPLE ENGINE

**Purpose:** Generates deliberately-wrong-but-plausible examples for the Failure Atlas. Takes course concepts and deploys them incorrectly in structured ways.

**Implementation:**

```typescript
interface FailureTemplate {
  id: string;
  rubricCategory: 'thesis' | 'evidence' | 'analysis' | 'structure' | 'citations';
  failureMode: string;
  template: string; // with slots
  requiredInputs: string[];
  errorAnnotationTemplate: string;
}

const FAILURE_TEMPLATES: FailureTemplate[] = [
  {
    id: 'vague-thesis',
    rubricCategory: 'thesis',
    failureMode: 'VAGUE THESIS',
    template: 'This paper will discuss {topic} and some of its problems. {topic} is important because many {authorities} have talked about it. There are good things and bad things about it.',
    requiredInputs: ['topic', 'authorities'],
    errorAnnotationTemplate: 'This thesis identifies no position. It mentions {topic} but doesn\'t argue anything. "Good things and bad things" is the emptiest possible claim. A reader has no idea what this paper will prove.',
  },
  {
    id: 'over-broad-thesis',
    rubricCategory: 'thesis',
    failureMode: 'OVER-BROAD THESIS',
    template: '{topic} explains all {domain} behavior, has always been the most important {field} theory, and solves every problem in {field} with its simple {mechanism}.',
    requiredInputs: ['topic', 'domain', 'field', 'mechanism'],
    errorAnnotationTemplate: 'This thesis overclaims. "All {domain} behavior" is false. "Always been the most important" is unsupportable. "Solves every problem" ignores the entire Objections section of the textbook chapter. A reader will spend the whole paper disagreeing before you even begin.',
  },
  {
    id: 'misattributed-evidence',
    rubricCategory: 'evidence',
    failureMode: 'MISATTRIBUTED QUOTE',
    template: 'As {wrong_philosopher} famously wrote, "{correct_quote_from_different_philosopher}" This captures the essence of {topic}.',
    requiredInputs: ['wrong_philosopher', 'correct_quote_from_different_philosopher', 'topic'],
    errorAnnotationTemplate: 'This quote is actually from {correct_philosopher}, not {wrong_philosopher}. A reader who knows the textbook will immediately notice. Always verify attributions against the source.',
  },
  {
    id: 'reversed-distinction',
    rubricCategory: 'analysis',
    failureMode: 'REVERSED DISTINCTION',
    template: '{philosopher} argued that {lower_term} are actually superior to {higher_term} because {reversed_reasoning}.',
    requiredInputs: ['philosopher', 'lower_term', 'higher_term', 'reversed_reasoning'],
    errorAnnotationTemplate: 'This reverses the actual distinction. {philosopher} argued the opposite — that {higher_term} are superior to {lower_term}. Reversing a central distinction signals you didn\'t actually read the chapter.',
  },
  // ... 25 more templates
];

class NegativeExampleEngine {
  generateFailureExamples(rubricCriterion: RubricCriterion, concepts: Concept[]): FailureExample[] {
    const category = this.mapCriterionToCategory(rubricCriterion);
    const applicableTemplates = FAILURE_TEMPLATES.filter(t => t.rubricCategory === category);
    
    const examples: FailureExample[] = [];
    
    for (const template of applicableTemplates.slice(0, 2)) { // 2 examples per criterion
      const inputs = this.gatherInputs(template, concepts);
      if (!inputs) continue; // can't fill this template
      
      const filledExample = this.fillTemplate(template.template, inputs);
      const annotation = this.fillTemplate(template.errorAnnotationTemplate, inputs);
      
      // Validate: the example must actually be wrong
      if (this.validateIsActuallyWrong(filledExample, inputs, template)) {
        examples.push({
          failureMode: template.failureMode,
          text: filledExample,
          annotation,
          contrastExample: this.generateContrastExample(template, inputs),
        });
      }
    }
    
    return examples;
  }
  
  private generateContrastExample(template: FailureTemplate, inputs: Record<string, string>): string {
    // Use the correct version template for the same inputs
    // Every failure template has a matching "correct" template
  }
}
```

---

### ENGINE G: REFRACTION ENGINE

**Purpose:** Refracts assignment prompts into multiple valid interpretations. Powers Prompt Prism.

**Implementation:**

```typescript
interface PromptAnalysis {
  originalPrompt: string;
  actionVerbs: string[];
  topicNouns: string[];
  modifiers: string[];
  questionStructure: 'open' | 'bounded' | 'comparative' | 'evaluative';
}

interface Angle {
  id: string;
  name: string;
  tagline: string;
  difficulty: 'low' | 'medium' | 'medium-high' | 'high';
  conceptCountRange: [number, number];
  thesisTemplate: string;
  riskStatement: string;
  applicabilityCheck: (analysis: PromptAnalysis) => boolean;
}

const ANGLE_LIBRARY: Angle[] = [
  {
    id: 'biographical',
    name: 'Biographical',
    tagline: 'Personal anecdotes as primary evidence',
    difficulty: 'low',
    conceptCountRange: [2, 3],
    thesisTemplate: 'In my own life, {personal_experience} showed me that {topic} reasoning {strength}, but {other_experience} revealed {weakness}.',
    riskStatement: 'May feel shallow if not grounded in theory.',
    applicabilityCheck: (a) => a.modifiers.some(m => /your (own )?(life|experience|perspective)/i.test(m)),
  },
  {
    id: 'theoretical-illustration',
    name: 'Theoretical with Illustration',
    tagline: 'Lead with theory, illustrate with personal examples',
    difficulty: 'medium',
    conceptCountRange: [4, 5],
    thesisTemplate: '{topic}\'s strength lies in its {theoretical_strength} — a point I experienced when {personal_example}. Its weakness shows in {objection} — demonstrated by {other_example}.',
    riskStatement: 'Balancing theory and example is hard without feeling stitched together.',
    applicabilityCheck: (a) => true,
  },
  {
    id: 'dialectical',
    name: 'Dialectical Challenge',
    tagline: 'Take a strong position and defend it',
    difficulty: 'high',
    conceptCountRange: [6, 8],
    thesisTemplate: 'While {topic} appears attractive as a {category}, my own life experiences reveal a deeper tension that {refinement} cannot resolve, suggesting {your_position}.',
    riskStatement: 'Requires deep engagement with the textbook. Highest grade ceiling.',
    applicabilityCheck: (a) => a.questionStructure === 'evaluative' || a.actionVerbs.includes('evaluate') || a.actionVerbs.includes('discuss'),
  },
  {
    id: 'counterfactual',
    name: 'Counterfactual',
    tagline: 'What if you had used this framework?',
    difficulty: 'medium-high',
    conceptCountRange: [4, 6],
    thesisTemplate: 'In {decision}, I chose based on {non_framework_reason}. A {framework}-reasoner would have {counterfactual}. This reveals both the power and the limits of the framework.',
    riskStatement: 'Counterfactuals can feel speculative if not carefully grounded.',
    applicabilityCheck: (a) => a.questionStructure === 'open',
  },
  {
    id: 'comparative',
    name: 'Comparative',
    tagline: 'Compare two frameworks',
    difficulty: 'medium',
    conceptCountRange: [5, 7],
    thesisTemplate: 'Where {framework_a} measures {metric_a} in my experience, {framework_b} illuminates {metric_b} — suggesting neither framework alone captures the moral reality of {situation}.',
    riskStatement: 'Requires solid grasp of a second framework.',
    applicabilityCheck: (a) => a.actionVerbs.some(v => /compare|contrast/i.test(v)) || a.topicNouns.length >= 2,
  },
  // ... 7 more angle templates
];

class RefractionEngine {
  refract(prompt: string, availableConcepts: Concept[]): Angle[] {
    const analysis = this.analyzePrompt(prompt);
    
    // Filter angles by applicability
    const applicable = ANGLE_LIBRARY.filter(angle => angle.applicabilityCheck(analysis));
    
    // Score by diversity (prefer angles that differ from each other)
    const selected = this.selectDiverseSubset(applicable, 5);
    
    // Fill templates with specific concepts
    return selected.map(angle => this.instantiateAngle(angle, analysis, availableConcepts));
  }
  
  private analyzePrompt(prompt: string): PromptAnalysis {
    return {
      originalPrompt: prompt,
      actionVerbs: this.extractActionVerbs(prompt),
      topicNouns: this.extractTopicNouns(prompt),
      modifiers: this.extractModifiers(prompt),
      questionStructure: this.detectStructure(prompt),
    };
  }
}
```

---

### ENGINE H: COMMITMENT ENGINE

**Purpose:** Parses written commitments from Time Capsule letters, extracts structured promises, and runs verification. Powers Time Capsule.

**Implementation:** (Already partially specified in Interaction 1.9. Full spec includes 30+ commitment parsers, verifier function library, and historical tracking.)

```typescript
interface CommitmentPattern {
  type: CommitmentType;
  regex: RegExp;
  extractTarget: (match: RegExpMatchArray) => any;
  buildVerifier: (target: any) => Verifier;
}

const COMMITMENT_PATTERNS: CommitmentPattern[] = [
  {
    type: 'citation-count',
    regex: /(?:cite|reference|use) (?:at least |a minimum of |≥\s*)?(\d+) (?:scholarly |textbook |academic )?(?:sources?|references?|citations?)/i,
    extractTarget: (m) => ({ minCount: parseInt(m[1]) }),
    buildVerifier: (target) => (submission) => {
      const citations = extractAPACitations(submission.text);
      return {
        status: citations.length >= target.minCount ? 'kept' : 'broken',
        detail: `${citations.length}/${target.minCount} citations`,
      };
    },
  },
  {
    type: 'specific-content',
    regex: /(?:cite|include|mention|discuss|address)(?:\s+the)?\s+(.+?)(?:\.|,|;|$)/i,
    extractTarget: (m) => ({ content: m[1].trim() }),
    buildVerifier: (target) => (submission) => {
      const found = submission.text.toLowerCase().includes(target.content.toLowerCase());
      return { status: found ? 'kept' : 'broken', detail: found ? 'found' : 'not found' };
    },
  },
  {
    type: 'style-person',
    regex: /(?:write|stay|keep it) (?:in )?(first|second|third) person/i,
    extractTarget: (m) => ({ person: m[1] }),
    buildVerifier: (target) => (submission) => {
      const firstPersonCount = (submission.text.match(/\b(I|me|my|mine|we|us|our)\b/gi) || []).length;
      if (target.person === 'third' && firstPersonCount > 2) {
        return { status: 'partial', detail: `Found ${firstPersonCount} first-person words` };
      }
      return { status: 'kept', detail: 'Style maintained' };
    },
  },
  {
    type: 'avoidance',
    regex: /(?:avoid|don'?t use|no)(?:\s+using)?\s+"([^"]+)"|(?:avoid|don'?t use|no)(?:\s+using)?\s+([^.]+)/i,
    extractTarget: (m) => ({ phrase: (m[1] || m[2]).trim() }),
    buildVerifier: (target) => (submission) => {
      const regex = new RegExp(`\\b${escapeRegex(target.phrase)}\\b`, 'gi');
      const matches = submission.text.match(regex) || [];
      if (matches.length === 0) return { status: 'kept', detail: 'Phrase avoided' };
      if (matches.length <= 2) return { status: 'partial', detail: `Found ${matches.length} uses` };
      return { status: 'broken', detail: `Found ${matches.length} uses` };
    },
  },
  // ... 26 more patterns covering timelines, prerequisites, word counts, 
  // tone commitments, structure commitments, revision promises, etc.
];

class CommitmentEngine {
  parseLetter(letter: string): Commitment[] {
    const commitments: Commitment[] = [];
    for (const pattern of COMMITMENT_PATTERNS) {
      const matches = [...letter.matchAll(new RegExp(pattern.regex, 'gi'))];
      for (const match of matches) {
        const target = pattern.extractTarget(match);
        commitments.push({
          id: generateId(),
          type: pattern.type,
          text: match[0],
          target,
          status: 'pending',
          verifier: pattern.buildVerifier(target),
        });
      }
    }
    return commitments;
  }
  
  verify(commitments: Commitment[], submission: Submission, progress: Progress): Commitment[] {
    return commitments.map(c => {
      const result = c.verifier(submission, progress);
      return { ...c, status: result.status, detail: result.detail };
    });
  }
}
```

---

### ENGINE I: PROXIMITY ENGINE

**Purpose:** Computes semantic relatedness between any two text fragments. Used by Echo Chamber, Shadow Reader, Gravity Field, and Collision Lab for deciding what's related to what.

**Implementation:**

```typescript
class ProximityEngine {
  similarity(a: string, b: string): number {
    // Combined similarity metric
    const tokenSim = this.tokenJaccard(a, b);
    const trigramSim = this.trigramJaccard(a, b);
    const keywordSim = this.keywordOverlap(a, b);
    const tfIdfSim = this.tfIdfCosine(a, b);
    
    return (tokenSim * 0.2) + (trigramSim * 0.2) + (keywordSim * 0.3) + (tfIdfSim * 0.3);
  }
  
  tokenJaccard(a: string, b: string): number {
    const tokensA = new Set(this.tokenize(a).filter(t => !STOPWORDS.has(t)));
    const tokensB = new Set(this.tokenize(b).filter(t => !STOPWORDS.has(t)));
    const intersection = new Set([...tokensA].filter(t => tokensB.has(t)));
    const union = new Set([...tokensA, ...tokensB]);
    return intersection.size / union.size;
  }
  
  trigramJaccard(a: string, b: string): number {
    const trigramsA = this.extractTrigrams(a);
    const trigramsB = this.extractTrigrams(b);
    const intersection = [...trigramsA].filter(t => trigramsB.has(t));
    const union = new Set([...trigramsA, ...trigramsB]);
    return intersection.length / union.size;
  }
  
  keywordOverlap(a: string, b: string): number {
    // Weighted by term importance (using frequency dictionary)
  }
  
  tfIdfCosine(a: string, b: string): number {
    // Standard cosine similarity on TF-IDF vectors
  }
  
  conceptRelatedness(conceptA: Concept, conceptB: Concept): number {
    // Uses concept metadata + similarity of definitions + relationship graph distance
  }
}
```

---

### ENGINE J: COLLISION ENGINE

**Purpose:** Computes what happens when two concepts interact. Powers Collision Lab and parts of Duel Arena.

**Implementation:**

```typescript
interface CollisionReport {
  conceptA: Concept;
  conceptB: Concept;
  sharedGround: string[];
  tensions: Tension[];
  synthesis: Synthesis | null;
  historicalCollisions: HistoricalReference[];
}

interface Tension {
  dimension: string;
  aPosition: string;
  bPosition: string;
  evidence: string;
}

class CollisionEngine {
  collide(a: Concept, b: Concept, textbook: PassageRetrievalEngine, graph: ConceptGraph): CollisionReport {
    return {
      conceptA: a,
      conceptB: b,
      sharedGround: this.findSharedGround(a, b),
      tensions: this.findTensions(a, b, textbook),
      synthesis: this.findSynthesis(a, b, graph),
      historicalCollisions: this.findHistoricalCollisions(a, b, textbook),
    };
  }
  
  private findSharedGround(a: Concept, b: Concept): string[] {
    const sharedKeywords = a.keywords.filter(k => b.keywords.includes(k));
    const sharedPhilosophers = (a.philosophers || []).filter(p => (b.philosophers || []).includes(p));
    const sharedFrameworks = (a.frameworks || []).filter(f => (b.frameworks || []).includes(f));
    
    const grounds: string[] = [];
    if (sharedKeywords.length > 0) {
      grounds.push(`Both engage with: ${sharedKeywords.slice(0, 5).join(', ')}`);
    }
    if (sharedFrameworks.length > 0) {
      grounds.push(`Both fall within: ${sharedFrameworks.join(', ')} traditions`);
    }
    if (sharedPhilosophers.length > 0) {
      grounds.push(`Both associated with: ${sharedPhilosophers.join(', ')}`);
    }
    return grounds;
  }
  
  private findTensions(a: Concept, b: Concept, textbook: PassageRetrievalEngine): Tension[] {
    const tensions: Tension[] = [];
    
    // Look for explicit contrasts in source text
    const contrastPassages = textbook.search(`${a.name} ${b.name}`, { 
      filter: (p) => /unlike|contrast|whereas|differs|versus|opposed/i.test(p.text) 
    });
    
    for (const result of contrastPassages.slice(0, 3)) {
      const tension = this.parseTensionFromPassage(result.passage, a, b);
      if (tension) tensions.push(tension);
    }
    
    // Check for opposite framework labels
    if (a.frameworks?.includes('consequentialist') && b.frameworks?.includes('deontological')) {
      tensions.push({
        dimension: 'Consequences vs Intentions',
        aPosition: `${a.name} judges by outcomes`,
        bPosition: `${b.name} judges by the rule being followed`,
        evidence: 'Framework classification',
      });
    }
    
    return tensions;
  }
  
  private findSynthesis(a: Concept, b: Concept, graph: ConceptGraph): Synthesis | null {
    // Find a concept that references both
    for (const [id, concept] of Object.entries(graph.concepts)) {
      if (concept.id === a.id || concept.id === b.id) continue;
      const cites = (concept.definition + ' ' + concept.detail).toLowerCase();
      if (cites.includes(a.name.toLowerCase()) && cites.includes(b.name.toLowerCase())) {
        return {
          concept,
          explanation: `${concept.name} bridges these by ${concept.core}`,
        };
      }
    }
    return null;
  }
  
  private findHistoricalCollisions(a: Concept, b: Concept, textbook: PassageRetrievalEngine): HistoricalReference[] {
    const passages = textbook.search(`${a.name} ${b.name}`, { limit: 5 });
    return passages.map(r => ({
      passage: r.passage.text.substring(0, 200) + '...',
      source: `Ch ${r.passage.chapterTitle} p ${r.passage.pageNumber}`,
    }));
  }
}
```

---

### ENGINE K: TEMPLATE SYNTHESIS ENGINE

**Purpose:** Sophisticated template filling with grammatical validation and fallback. Used by every interaction that generates prose.

**Implementation:**

```typescript
interface SynthesisTemplate {
  id: string;
  template: string;
  slots: SlotDef[];
  postProcess?: (filled: string) => string;
  validate?: (filled: string) => boolean;
}

interface SlotDef {
  name: string;
  required: boolean;
  type: 'noun' | 'verb' | 'phrase' | 'sentence' | 'clause';
  constraints?: {
    minLength?: number;
    maxLength?: number;
    mustEndWith?: string;
    mustNotContain?: string[];
    grammaticalRole?: 'subject' | 'object' | 'modifier';
  };
  fallbacks?: string[];
}

class TemplateSynthesisEngine {
  fill(template: SynthesisTemplate, data: Record<string, any>): string | null {
    let filled = template.template;
    
    for (const slot of template.slots) {
      const value = data[slot.name];
      if (!value && slot.required && !slot.fallbacks?.length) {
        return null; // can't fill required slot
      }
      
      const finalValue = value || (slot.fallbacks?.[0] ?? '');
      const processed = this.processSlotValue(finalValue, slot);
      
      if (!this.validateSlot(processed, slot)) {
        // Try fallbacks
        let found = false;
        for (const fallback of slot.fallbacks || []) {
          if (this.validateSlot(fallback, slot)) {
            filled = filled.replace(`{${slot.name}}`, fallback);
            found = true;
            break;
          }
        }
        if (!found) return null;
      } else {
        filled = filled.replace(`{${slot.name}}`, processed);
      }
    }
    
    if (template.postProcess) {
      filled = template.postProcess(filled);
    }
    
    // Final grammatical validation
    if (!this.validateGrammar(filled)) return null;
    if (template.validate && !template.validate(filled)) return null;
    
    return filled;
  }
  
  private validateGrammar(text: string): boolean {
    // Basic grammar check:
    // - Starts with capital
    // - Ends with sentence punctuation  
    // - No dangling articles (the, a, an at end)
    // - No double spaces
    // - No unfilled slots (no raw { or })
    if (!/^[A-Z"]/.test(text)) return false;
    if (!/[.!?"']$/.test(text.trim())) return false;
    if (/\b(the|a|an)\s*$/i.test(text.trim())) return false;
    if (text.includes('{') || text.includes('}')) return false;
    if (/  /.test(text)) return false;
    return true;
  }
  
  private processSlotValue(value: any, slot: SlotDef): string {
    if (typeof value !== 'string') value = String(value);
    
    // Article agreement (a/an)
    if (slot.type === 'noun') {
      // If template expects "a {noun}" or "an {noun}", ensure article matches
    }
    
    // Case normalization
    // Pluralization
    // Etc.
    
    return value.trim();
  }
}
```

---

### ENGINE L: INTERACTION STATE ENGINE

**Purpose:** Unified state management and persistence for all 9 interaction modes. Ensures state consistency, history, and cross-session continuity.

**Implementation:**

```typescript
interface InteractionState {
  modeId: string;
  sessionId: string;
  startedAt: number;
  lastUpdated: number;
  data: any; // mode-specific
  history: HistoryEntry[];
}

class InteractionStateEngine {
  private active: Map<string, InteractionState> = new Map();
  
  startSession(modeId: string, initialData?: any): string {
    const sessionId = generateId();
    const state: InteractionState = {
      modeId,
      sessionId,
      startedAt: Date.now(),
      lastUpdated: Date.now(),
      data: initialData || {},
      history: [],
    };
    this.active.set(sessionId, state);
    this.persist(state);
    return sessionId;
  }
  
  updateSession(sessionId: string, updater: (data: any) => any) {
    const state = this.active.get(sessionId);
    if (!state) return;
    
    const prevData = { ...state.data };
    state.data = updater(state.data);
    state.lastUpdated = Date.now();
    state.history.push({
      timestamp: Date.now(),
      snapshot: prevData,
    });
    
    this.persist(state);
  }
  
  getSession(sessionId: string): InteractionState | null {
    return this.active.get(sessionId) || null;
  }
  
  getHistoryFor(modeId: string, limit: number = 10): InteractionState[] {
    return this.loadHistory(modeId, limit);
  }
  
  // Cross-mode resonance: when the user engages with a concept in one mode,
  // other modes can react to it
  broadcastFocus(modeId: string, entityType: string, entityId: string) {
    this.emit('focus-broadcast', { modeId, entityType, entityId });
  }
  
  private persist(state: InteractionState) {
    // Write to IndexedDB with key `interaction:${state.modeId}:${state.sessionId}`
  }
  
  private loadHistory(modeId: string, limit: number): InteractionState[] {
    // Query IndexedDB for all sessions of this mode, ordered by startedAt desc
  }
}
```

---

## 3. INTEGRATION AND CROSS-MODE AWARENESS

The nine interactions don't live in isolation. Build cross-mode awareness so they enhance each other:

### 3.1 Time Capsule ↔ Progress Gating
If the student's Time Capsule promised "Complete Neural Forge Ch 3 before writing," the gating engine uses that promise to show the unlock path in the submission workspace.

### 3.2 Echo Chamber ↔ Shadow Reader
Shadow Reader biases its passage selection based on what Echo Chamber has been surfacing recently. If the student keeps seeing passages about Mill, Shadow Reader prioritizes drifting Mill-related passages into peripheral view.

### 3.3 Oracle Panel ↔ Duel Arena
A thinker's positions retrieved by Oracle Panel are reused by Duel Arena. If the student has already consulted Kant in Oracle Panel on a topic, Duel Arena can reference "Kant's earlier position" when building his duel statements.

### 3.4 Collision Lab ↔ Concept Map
When the student collides two concepts, the concept map shows a temporary highlighted edge between them with the collision result as a hover tooltip.

### 3.5 Prompt Prism ↔ Time Capsule
When the student selects an angle from Prompt Prism, the Time Capsule pre-fills suggested commitments based on the angle's requirements ("I will engage X concepts," "I will write in Y style").

### 3.6 Failure Atlas ↔ Submission Engine
Failure examples seen in the Atlas are cross-referenced when the Submission Engine grades the final response. If the student's submission matches a failure pattern they already saw, the grading report says: "You saw this failure mode in the Atlas on [date]. Here it is in your own writing."

---

## 4. EXECUTION ORDER FOR CODEX

**PREREQUISITE:** All nine breath engines, interactive Neural Forge, timeline, gating, and spacing fixes must be complete and passing acceptance tests before starting this pass.

### Phase 1: Core Engines (build in this order)
1. Passage Retrieval Engine (Engine A) — everything else depends on this
2. Proximity Engine (Engine I)
3. Template Synthesis Engine (Engine K)
4. Voice Attribution Engine (Engine B)
5. Interaction State Engine (Engine L)

### Phase 2: Specialized Engines
6. Spring Physics Engine (Engine C)
7. Ambient Surface Engine (Engine D)
8. Dialogue Synthesis Engine (Engine E)
9. Collision Engine (Engine J)
10. Negative Example Engine (Engine F)
11. Refraction Engine (Engine G)
12. Commitment Engine (Engine H)

### Phase 3: Simple Interactions First
13. ECHO CHAMBER (uses A, I, D, L)
14. SHADOW READER (uses A, D, I, L)
15. PROMPT PRISM (uses G, I, K, C for animation)

### Phase 4: Medium Interactions
16. TIME CAPSULE (uses H, A, K, L)
17. FAILURE ATLAS (uses F, K, B)
18. COLLISION LAB (uses J, A, K, C)

### Phase 5: Complex Interactions
19. ORACLE PANEL (uses B, A, E, K)
20. DUEL ARENA (uses E, B, A, H, K)
21. GRAVITY FIELD (uses C, J, I, L)

### Phase 6: Cross-Mode Integration
22. Wire the six cross-mode connections from Section 3
23. Add entry points to all nine modes from the home screen and relevant contextual locations
24. Test every acceptance criterion across all interactions

---

## 5. ACCEPTANCE CHECKLIST

Before declaring this pass complete, verify every item:

### Engines
- [ ] Passage Retrieval Engine returns results in <100ms for a 500-page textbook
- [ ] Voice Attribution Engine identifies ≥3 attributions per major thinker in a philosophy textbook
- [ ] Spring Physics Engine maintains 60fps with 30+ bodies
- [ ] Ambient Surface Engine respects intensity settings and tracks familiarity
- [ ] Dialogue Synthesis Engine produces attributed multi-turn responses
- [ ] Negative Example Engine generates examples that actually fail rubric criteria
- [ ] Refraction Engine produces 5+ meaningfully different angles per prompt
- [ ] Commitment Engine parses 30+ promise patterns with high accuracy
- [ ] Proximity Engine agrees with human intuition on concept relatedness
- [ ] Collision Engine produces non-trivial shared ground and tensions
- [ ] Template Synthesis Engine validates grammar and rejects broken fills
- [ ] Interaction State Engine persists across sessions and supports history

### Interactions
- [ ] ECHO CHAMBER: surfaces relevant passages within 5s of typing, anchor + cite works
- [ ] ORACLE PANEL: 2-4 thinkers respond with attributed synthesized answers
- [ ] GRAVITY FIELD: real-time physics simulation with concepts pulling assignments
- [ ] SHADOW READER: ambient passages drift through rail with familiarity tracking
- [ ] FAILURE ATLAS: 2 failure examples per rubric criterion, each grounded in course content
- [ ] COLLISION LAB: drag two concepts, get full collision report in <2s
- [ ] DUEL ARENA: 5-round duel with attributed positions, final judgment with feedback
- [ ] PROMPT PRISM: refracts prompt into 5 distinct angles with thesis scaffolds
- [ ] TIME CAPSULE: parses letter, extracts promises, verifies at submission time

### Cross-mode
- [ ] All 6 cross-mode connections work bidirectionally
- [ ] Shared state persists across session reloads
- [ ] Focus broadcasts propagate between modes

### Quality
- [ ] No interaction produces nonsense or raw template slot output
- [ ] Every generated claim is grounded in textbook content with citations
- [ ] Every interaction has an honest failure state when source content is insufficient
- [ ] All nine modes respect the spacing, typography, color, and motion rules from previous prompts
- [ ] All nine modes respond to the ambient breath rhythm and focus choreography

---

## 6. THE VISION

Codex, when this pass is done, AEONTHRA will be unlike anything else in education technology. Not because it has more features, but because it treats the student's relationship with course content as a living relationship.

- Their textbook whispers while they write (ECHO CHAMBER).
- They can ask the book's authors questions and get real answers (ORACLE PANEL).
- They can see the gravitational architecture of their semester (GRAVITY FIELD).
- The textbook drifts at the edges of their work, teaching them passively (SHADOW READER).
- They see failure before they commit it (FAILURE ATLAS).
- They can smash ideas together and see what survives (COLLISION LAB).
- Concepts fight for them to judge (DUEL ARENA).
- Every prompt refracts into five valid paths (PROMPT PRISM).
- They make promises to their future selves and get held to them (TIME CAPSULE).

No AI chatbot can offer any of this. Not because AI isn't powerful enough — because no one has ever bothered to engineer learning interactions that treat textbooks as living, concepts as combatants, failure as a teacher, and the student's own commitment as the most honest form of accountability.

This is deterministic magic. It's sophisticated pattern recognition, indexed retrieval, structured templates, and validated synthesis — composed with so much care that it feels alive. Not simulated intelligence. Engineered intelligence.

When a student opens AEONTHRA and uses all twelve engines and nine interactions plus the original Neural Forge, they're not using a learning app. They're inhabiting a learning environment that has been purpose-built for them at every layer.

**This is what the future of learning looks like. Build it exactly this way. Then ship it.**
