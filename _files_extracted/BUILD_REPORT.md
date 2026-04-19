# BUILD REPORT — First-Five-Minutes Redesign

## What Was Weak in the First-Load Experience

**The old welcome screen** was impressive but not helpful. It showed a big logo, stat counts (8 Concepts, 6 Engines, ∞ Mastery), and a generic "ENTER LEARNING SPACE" button. A tired student landing here would think: "Cool, but what do I actually do?" It created admiration but not momentum.

**The old home page** opened with a mastery ring and five stat numbers — mastered, learned, streak, accuracy, study time. For a first-time user, all of these are zero. Starting with a wall of zeros is demoralizing. The page said "look at your progress" when the student has none.

**The "Next Move" card** was functional but not supportive. It showed the next assignment with due date and a "Start Learning" button, but didn't explain WHY that assignment matters, what the student ALREADY knows, or how long preparation would take.

**No emotional framing.** The app never said "you're closer than you think" or "start with one small win." It treated the student as a data point, not a person who might be anxious.

**No path choice.** Every student arrives with different needs — some have 5 minutes, some are panicking, some want assignment help, some want deep understanding. The old experience offered one path for everyone.

## What Changed

### Welcome Screen
- **Removed** stat-heavy feature counts (8 Concepts, 6 Engines, etc.)
- **Added** a calming motivational quote: "You don't need to know everything at once. Start with one concept, one question, one small win."
- **Added** a 4-option path chooser:
  - ⚡ "I have 5 minutes" → goes directly to Forge
  - 📝 "Help me with an assignment" → goes to Home with assignment focus
  - 🧠 "I want to understand something" → goes to Explore
  - 😰 "I'm feeling overwhelmed" → goes to Home with supportive framing
- **Added** "Just take me in →" for students who don't want to choose
- **Kept** keyboard shortcut hint

### Home Page — First Screen After Entry
- **Added** adaptive greeting that changes with progress:
  - 0%: "Let's get started. Every expert started at zero."
  - <30%: "You've started building your foundation. Keep going."
  - <60%: "You're making real progress. The concepts are starting to connect."
  - <80%: "You're in strong shape. A few more sessions and you'll be fully prepared."
  - 80%+: "You've mastered the core material. Time to apply it with confidence."
- **Added** a quick paths strip: 5-min review, Assignment prep, Journey map, Explore, Stats — immediate action buttons
- **Redesigned** "Your Next Win" card with:
  - "WHY THIS MATTERS" explanation
  - Supportive readiness framing: "✓ You already know X, Y" and "→ Just 2 concepts to prepare. About 10 minutes."
  - Time estimate: "Prepare now (10 min)" instead of generic "Start Learning"
- **Added** Assignment Readiness strip showing every assignment with a readiness % progress bar
- **Moved** module progress to a full-width 5-card strip showing per-module %
- **Reorganized** mastery grid to 2-column with fire emojis on completed concepts

### Removed
- Duplicate assignment list (replaced by Readiness strip)
- Generic stat-dump hero (replaced by adaptive progress ring + greeting)
- Feature-count splash screen metrics

## Why the New Version Is Better

1. **Calms panic immediately.** The motivational quote and path chooser acknowledge different emotional states. A student who's overwhelmed sees "😰 I'm feeling overwhelmed" and knows the app understands them.

2. **Orients within 3 seconds.** The path chooser gives four clear options — the student doesn't have to think about navigation, they just answer "what do I need right now?"

3. **Shows the smallest next win.** "Your Next Win" card doesn't just show the assignment — it shows exactly which concepts are ready, which need work, and how many minutes of preparation that takes. "Just 2 concepts. About 10 minutes."

4. **Supportive, not judgmental.** "You already know Utilitarianism and Deontology" validates existing progress before showing gaps. The readiness strip shows % without labeling anything as "failed."

5. **Creates momentum through framing.** The adaptive greeting changes with progress — the student sees their journey acknowledged in plain language, not just numbers.

6. **Time-aware.** "I have 5 minutes" goes straight to the Forge. No navigation tax for busy students.

## What Still Needs Future Work
- Persist progress across sessions (localStorage or API)
- Real Canvas data integration (replace demo data)
- Panic mode could have an even calmer, more guided flow
- Spaced repetition scheduling based on mastery decay
- Mobile responsive layout
- Accessibility audit (screen reader support, ARIA labels)

---

## Welcome Screen Redesign (Latest Pass)

### What Changed
The welcome screen now uses a **full-screen quadrant layout** inspired by the Windows Start tile aesthetic. Four large tiles fill the entire viewport as background, each representing a different entry path:

- **⚡ Quick Session** (cyan) — 5-minute concept sharpening
- **📝 Assignment Prep** (teal) — get ready for what's due
- **🧠 Deep Understanding** (violet) — really learn the ideas
- **🌊 Calm Start** (blue) — no pressure entry

**Material design ripple effect**: clicking any tile triggers a CSS ripple animation (`rippleExpand`) that radiates from the click point in the tile's accent color before transitioning into the app.

**Hover behavior**: hovering a tile causes the other three to fade to 25% opacity while the hovered tile shows a radial gradient glow, the icon scales up 1.2x and lifts 8px, and the title switches to the tile's accent color. This creates a dramatic "selection" feel.

**Floating center panel**: the AEONTHRA title, course info, and motivational quote float in a glassmorphic panel with blur backdrop over the tile grid.

### Why It's Better
- The entry feels **spiritual and technological** — four glowing portals instead of a static page
- The ripple gives **tactile physical feedback** — the click feels like it matters
- The quadrant layout is **immediately intuitive** — no reading required, just hover and click
- The opacity crossfade on hover creates **focus without clutter**

---

## Course Atlas (Replaces Journey)

### What Was Insufficient
The old Journey was a horizontal row of concept nodes — useful but shallow. It showed concepts in sequence but not their relationship to modules, chapters, textbook content, or assignments. It was a progress tracker, not a learning landscape.

### What Was Built
A **full-screen, horizontally scrollable course atlas** that shows the complete learning terrain:

Each **module** is a 400px-wide vertical column containing:
1. **Module header** — title, page range, mastery %, progress bar with glow
2. **Textbook chapters** — indented cards with page ranges and content summaries
3. **Concept nodes** — 52px circle nodes with fire/active/locked states, mastery bars
4. **Assignments** — readiness % bars, due dates, urgency coloring

**Sticky atlas header** shows overall mastery with gradient progress bar and completion count.

**Visual states**: completed modules glow gold with fire emojis, active modules pulse cyan, locked modules show dim nodes. Assignment readiness bars fill green/cyan/orange based on preparation level.

### Why It's More Useful
- Shows **the full terrain at once** — modules, chapters, concepts, and assignments in spatial relationship
- **Time-aware urgency** — red indicators for assignments due within 3 days
- **Readiness is visible everywhere** — every assignment shows exactly how prepared the student is
- **Click any element** to navigate — concepts go to Forge, assignments go to detail
- **Physical navigability** — drag to scroll through the full semester landscape

---

## Flow-State Conductor

### Behavioral Signals Tracked
1. **Answer speed** — time between question appearance and answer click (stored in rolling window of last 10)
2. **Streak length** — consecutive correct answers
3. **Consecutive misses** — wrong answers in a row without a correct one
4. **Recent accuracy** — correct/total over the current session
5. **Total volume** — how many questions answered this session
6. **Session time** — elapsed time since launch

### Learner States Modeled
| State | Triggers | Meaning |
|-------|----------|---------|
| `cold` | 0 answers | Just arrived, no data |
| `warming` | 1-3 answers | Getting started, mixed results |
| `flow` | 3+ streak, fast answers (<6s avg) | In the zone, confident |
| `struggling` | 3+ consecutive misses, or low accuracy + no streak | Overwhelmed or confused |
| `recovering` | After struggling, streak resets to 1+ | Starting to get it again |
| `cruising` | 70%+ accuracy, 5+ answers, steady | Comfortable, reliable |

### Adaptations Applied
| Flow State | Visual | Content | Emotional |
|-----------|--------|---------|-----------|
| `cold` | Normal | Shows memory hook hints before questions | — |
| `warming` | Subtle glow building | Standard explanations | "Warming up..." |
| `flow` | Card glow intensifies, vivid feedback | Shorter explanations | "You're in the zone 🔥" |
| `struggling` | Interface calms — softer blue tones | Full explanations + concept hint | "Let's slow down — no rush" |
| `struggling` (3+ misses) | Recovery prompt appears | Offers to review concept orientation | "Want to review the concept first?" |
| `recovering` | Gentle glow returns | Standard + encouraging tone | "Getting back on track" |
| `cruising` | Steady teal glow | Standard | "Steady and strong" |

### Visual Adaptations
- **Card glow**: The main learning card dynamically changes its `box-shadow` based on flow state. In flow, it grows from 40px to 80px with increasing intensity. When struggling, it shifts to a calming blue glow.
- **Border color**: Shifts to match flow state — cyan when flowing, blue when struggling, default otherwise.
- **Streak banner**: Only shows at 3+ streak (natural flow indicator).
- **Flow message**: A subtle centered label below the streak banner shows the current state ("Warming up...", "You're in the zone 🔥", "Take a breath — you've got this").

### Recovery Mechanism
When `consecutiveMisses >= 3`, a gentle recovery prompt appears:
- "Looks like this one's tricky. Want to review the concept first?"
- Two buttons: "🧠 Review concept" (returns to orientation) or "Keep going" (resets miss counter)
- This prevents discouragement spirals — support arrives BEFORE the learner gives up.

### Feedback Adaptation
- **In flow**: Feedback is vivid ("🔥 Yes!") and explanations are shortened — don't interrupt momentum
- **Struggling**: Feedback is gentle ("Not quite — that's okay") with full explanations + encouragement ("Getting it wrong is how you learn what sticks")
- **Normal**: Standard feedback ("✓ Correct" / "✗ Incorrect") with full explanations

### Why This Improves Learning
1. **Reduces frustration loops** — the app detects when you're stuck and intervenes before discouragement
2. **Preserves flow** — when you're flying, the app gets out of the way instead of slowing you down with unnecessary explanations
3. **Adaptive pacing** — the same app feels different for a struggling learner vs a confident one, without either needing to change settings
4. **Invisible intelligence** — the system never announces "Adapting difficulty!" — it just quietly becomes more helpful or more challenging
5. **Emotional awareness** — the visual warmth of the interface responds to your state, creating a subtle but real sense of the app "understanding" you

---

## Memory Fossilization System

### Memory States Added
Each concept tracks a layered memory stage beyond raw mastery percentage:

| Stage | Icon | Criteria | Meaning |
|-------|------|----------|---------|
| Unseen | ⚫ | No interaction yet | Concept untouched |
| Fragile | 🟠 | First contact, mastery >0 | Fresh impressions, easily lost |
| Forming | 🔵 | 30%+ mastery OR 1+ correct streak | Building recognition |
| Stable | 🟢 | 60%+ mastery AND 2+ correct streak | Strong understanding |
| Crystallized | 💎 | 80%+ mastery AND 3+ correct streak | Deeply embedded knowledge |

### Per-Concept Memory Tracking
Each concept stores: `firstSeen` (timestamp), `lastPracticed` (timestamp), `missCount` (cumulative), `correctStreak` (resets on miss). This creates a richer picture than mastery % alone — a concept at 70% mastery with 5 past mistakes and a streak of 0 is "Forming," while 70% with a streak of 3 is "Stable."

### Ghost System — How Past Mistakes Are Reused
When a learner gets a question wrong, the concept's common mistake (trap text) is stored as a "ghost." When the learner returns to that concept in the Forge, the ghost surfaces on the first T/F question:

> 👻 *This concept tripped you up before.* Watch for: Students confuse it with selfishness.

Ghosts only appear once, then mark as resurfaced — preventing the system from feeling punitive or repetitive.

### Delayed Recall
After a correct answer with 5+ questions answered, there's a 10% chance of a "delayed recall" trigger — a different concept the learner has started but not mastered is flagged for cross-referencing. This creates surprise moments of reinforcement within the same session.

### Memory Imprint Cards
When completing a concept session (Session Complete screen), a "Memory Imprint" card appears showing:
- The memory stage icon and label
- The concept's core definition
- The memory hook

This creates a crystallization moment — the last thing the learner sees before moving on is the essential idea, framed by their memory stage.

### Where Memory Stages Appear
- **Home mastery grid** — stage icons replace colored dots
- **Explore sidebar** — icon + label per concept (e.g., "🟢 Stable")
- **Explore detail panel** — full memory stage card with description, miss count, and stage-appropriate messaging
- **Session Complete** — Memory Imprint card with core idea and hook
- **Forge T/F questions** — Ghost indicators when returning to previously-missed concepts

### Why This Improves Long-Term Learning Feel
1. **Knowledge feels layered** — "Forming" to "Stable" to "Crystallized" tells the learner their understanding is deepening, not just accumulating points
2. **Past mistakes become fuel** — ghosts resurface at the right moment, turning errors into reinforcement
3. **Memory is separate from score** — a concept can be "Stable" at 65% mastery or "Fragile" at 40%, giving richer feedback than percentage alone
4. **The app remembers** — returning to a concept shows its history, creating a sense of the product being aware of the learner's journey

---

## Reward & Delight System

### What Felt Flat Before
- Correct answers showed a static green box — no sense of impact
- Mastery bars jumped instantly — no visual momentum
- Phase completions felt identical to answering a question — no "moment"
- Streaks were tracked but visually inert
- The celebration overlay had broken particle rendering

### Reward Vocabulary Added

| Animation | Duration | Trigger | Effect |
|-----------|----------|---------|--------|
| `masterySurge` | 0.6s | Correct answer feedback | Bar scales wider + brightens, then settles |
| `completionBloom` | 0.8s | Phase/concept completion | Gentle scale 1→1.12→1, feels like blooming |
| `unlockGlow` | pulse | Concept unlock | Box-shadow pulses cyan |
| `streakFire` | 0.5s | Streak counter update | Number pulses with bounce |
| `countUp` | 0.3s | Stat counters | Fade-up from below |
| `phaseComplete` | gradient | Phase finish | Background gradient sweep |

### Mastery Bar Physics
All mastery/progress bars use `cubic-bezier(.22,1,.36,1)` — a spring-like ease that overshoots slightly and settles. This makes progress feel like it's surging forward rather than sliding linearly.

### Feedback Intensity Adaptation
- **In flow**: Correct answer shows "🔥 Yes!" with `masterySurge` animation — vivid, fast
- **Normal**: Shows "✓ Correct" with standard fade
- **Struggling**: Shows "Not quite — that's okay" with gentle fade — no harsh red flash

### Session Complete Upgrade
The completion screen now layers three effects:
1. `completionBloom` on the entire container (gentle expansion)
2. `celebrate` on the content (pulsing scale)
3. `float` on the trophy emoji (continuous gentle bob)
4. Four stat columns with large numbers: Correct, Wrong, Streak, Mastery

### What Makes It Stable
- All animations use CSS `@keyframes` — no JavaScript timers or requestAnimationFrame
- No particle systems that can break or accumulate
- Celebration overlay is dismissible with a button (not auto-timed)
- Fire emojis are static unicode characters, not animated sprites
- Spring easing creates the feeling of physics without actual physics code

---

## Distinction Gym

### What Was Weak Before
The existing Compare view showed two concepts side by side, but it was passive — just reading two definitions. No interaction, no challenge, no learning of BORDERS between concepts. Students could memorize individual definitions without learning how they differ.

### Distinction Modes Added

**1. Concept Borders (⚖️)**
Shows the exact line where one concept stops and another begins:
- The border statement in plain language
- Side-by-side core definitions for comparison
- "Why students confuse them" — the emotional/cognitive trap
- "Concept Twins" — what makes them SIMILAR (the source of confusion)
- "Concept Enemies" — where they directly conflict

**2. Corruption Cards (🔀)**
Two statements appear — one is the original definition, the other has one key element swapped to describe a different concept. The learner must identify which is real. This teaches precision: the difference between utilitarianism and deontology can be ONE WORD (consequences vs duties).

**3. Wrong Neighbors (👻)**
A claim is presented that borrows language from one concept but actually describes another. The learner guesses which concept it belongs to, then sees the reveal: "Looks like: Virtue Ethics. Actually: Utilitarianism. The key difference: virtue ethics says we become better by practicing virtues, not by optimizing outcomes."

**4. Which Is Less Wrong? (🎯)**
Two wrong-ish answers are presented. The learner picks the one that's closer to correct. After answering, they see "WHY THE WRONG ANSWER IS TEMPTING" — explaining the seduction pattern of the incorrect choice.

### Distinction Data (6 Concept Pairs)
| Pair | Label | Key Border |
|------|-------|------------|
| Util vs Deont | Outcomes vs Duties | Where rightness lives |
| Util vs Virtue | Calculating vs Becoming | Per-action vs character |
| Deont vs Virtue | Rules vs Character | External vs internal |
| Util vs Exp. Machine | Pleasure vs Authenticity | Hedonism stress test |
| Relativism vs Social Contract | No Truth vs Agreed Truth | Cultural vs rational |
| Trolley vs Cat. Imperative | Intuition vs Principle | Gut vs reason |

### Confusion Patterns Now Teachable
- "Both want good outcomes" trap (Util vs Virtue)
- "Not utilitarian = same thing" trap (Deont vs Virtue)
- "Disproves ALL utilitarianism" overreach (Exp. Machine)
- "Morality from groups = relativism" conflation (Relativism vs Social Contract)
- "Solving trolley = doing ethics" misconception (Trolley vs Categorical Imperative)

### How Wrong-Answer Feedback Became More Educational
Every "Less Wrong" question includes a "WHY THE WRONG ANSWER IS TEMPTING" explanation that teaches the seduction pattern — not just "this is wrong" but "here's why your brain was attracted to this answer and what cognitive move it made."

---

## Assignment Alchemy System

### What the Previous Assignment View Lacked
The old view showed: title, due date, points, a tip, a flat concept list with mastery %, and a generic "Prepare" button. It answered "what are the related concepts" but NOT:
- What is this actually asking me to DO?
- What does the instructor really care about?
- What mistakes will I probably make?
- What evidence do I need to show?
- What's the fastest path to ready if I'm short on time?

### New Assignment Data Model
Each assignment now carries:
| Field | Purpose |
|-------|---------|
| `reallyAsking` | Plain-language translation of the actual demand |
| `demand` + `demandIcon` | Hidden demand type (Apply, Compare, Defend, Synthesize, etc.) |
| `secretCare` | What instructors are secretly evaluating |
| `failModes` | Array of common student mistakes |
| `evidence` | What the response needs to contain |
| `quickPrep` | Fastest path to readiness with time estimate |
| `prepPath` | Ordered concept sequence for preparation |

### New Readiness Laboratory Sections

**1. Readiness Ring** — SVG progress ring showing readiness % at a glance, color-coded (green = ready, cyan = close, orange = needs work, red = urgent)

**2. "What It's Really Asking"** — Cyan-bordered card with plain-language translation: "Take a real-world dilemma, apply Bentham/Mill's framework to it, and argue whether the utilitarian answer is morally satisfying or not."

**3. "What Instructors Secretly Care About"** — Gold-bordered card: "The instructor wants to see you USE the framework on a specific case, not just explain what utilitarianism is."

**4. Concept Readiness** — Each concept shows memory stage icon, mastery bar, percentage, and a "Learn →" button for weak concepts. Shows "✓ You're prepared in: X, Y" and "→ Needs work: Z"

**5. Fastest Path to Ready** — Cyan card with time estimate and one-click prep launch: "Learn utilitarianism core + distinction, then practice one dilemma application. ~15 minutes."

**6. Common Mistakes to Avoid** — Red-bordered card with ✗ markers: "Summarizing utilitarianism instead of applying it", "Picking a dilemma that's too simple to analyze"

**7. What Your Response Needs** — Purple-bordered card: "A specific real-world case, applied felicific calculus, at least one objection addressed"

**8. Draft Workspace** — Textarea with word count

### How the Prep Path Became More Actionable
- Each weak concept has a direct "Learn →" button that launches the Forge for that specific concept
- The "Fastest Path" card shows time estimates and launches prep with one click
- Demand classification (Apply, Compare, Defend, Synthesize) tells the student WHAT SKILL the assignment requires, not just what content
- Failure modes pre-empt common mistakes before the student starts writing

---

## Argument Forge (Writing Workbench)

### What Writing Support Was Added
A three-stage deterministic drafting workbench replaces the simple textarea:

**Stage 1: Thesis Formation**
- Concept chips showing available frameworks for this assignment
- Thesis starter templates matched to the assignment's demand type:
  - **Apply**: "When applied to [case], [framework] reveals..."
  - **Compare**: "[A] and [B] diverge on [issue] because..."
  - **Defend**: "[Position] is defensible because [reason], despite..."
  - **Synthesize**: "Examining [case] through [A], [B], and [C] reveals..."
- Click any template to pre-fill, then customize
- Custom thesis textarea for freeform writing
- Proceeds to outline only when thesis exists

**Stage 2: Paragraph Skeleton Builder**
- 7 paragraph types with distinct colors and purposes:
  - 🎯 Framing (cyan) — set up the issue
  - 💡 Central Claim (teal) — state the argument
  - 📌 Evidence/Application (violet) — apply framework
  - ⚔️ Counterargument (orange) — address objections
  - 🛡️ Rebuttal (gold) — respond to counter
  - 🔗 Synthesis (pink) — connect frameworks
  - 🏁 Conclusion (teal) — tie together
- Click to add blocks, type notes for each
- Remove blocks with ✕
- Each block shows its PURPOSE so the student understands structural role
- Proceeds to draft when 2+ blocks exist

**Stage 3: Guided Draft**
- Thesis reminder pinned at top
- Outline sidebar showing structure with color-coded paragraph labels
- Full draft textarea (1.9 line height, 320px min-height)
- Word count
- Back-navigation to edit thesis or outline at any time

### How It Improves Real Assignment Work
1. **Eliminates blank-page panic** — the student never faces an empty page. They start with a thesis template, build structure, then write
2. **Forces argument BEFORE writing** — students must form a claim before they can outline, and outline before they draft
3. **Makes structure visible** — paragraph types teach essay architecture. The student sees "I need a framing paragraph, then a claim, then evidence"
4. **Demand-aware templates** — thesis starters match what the assignment actually requires (apply vs compare vs defend)
5. **Concept-to-claim bridge** — concept chips show available frameworks, making the connection between "I know this" and "I can argue with this"

### What Blank-Page Pain It Removes
- "I don't know where to start" → thesis templates
- "I don't know what structure to use" → paragraph type blocks
- "I keep losing my argument" → thesis pinned at top during drafting
- "I forget what each paragraph is supposed to do" → labeled outline sidebar
- "I wrote too much about one thing" → visible structure shows balance

---

## Oracle Tribunal

### What Oracle Modes Were Added
| Mode | Icon | Purpose |
|------|------|---------|
| Full Tribunal | 🏛 | All 6 philosophers respond, sorted by relevance |
| Ask One Mind | 🎓 | Click a philosopher card to consult them directly |
| Challenge My Thesis | ⚔️ | Submit a thesis — each philosopher attacks/supports it |
| Tribunal Verdict | 📜 | Summary of agreement/disagreement + individual responses |

### How Responses Feel More Distinct
- Each philosopher has a **unique accent color** (cyan, gold, violet, teal, orange, pink) applied to their card border, name, relevance dots, and non-negotiable badge
- **Relevance dots** (filled/empty circles) show how relevant each philosopher is to the question
- **Non-negotiables** — each philosopher shows their core principle that cannot be compromised:
  - Bentham: "All pleasure counts equally"
  - Kant: "Never use a person merely as a means"
  - Aristotle: "Virtue is developed through practice"
  - Mill: "Some pleasures are qualitatively higher"
  - Aquinas: "Moral law grounded in rational participation in eternal law"
  - Rawls: "Justice requires fairness. Rules chosen behind a veil"
- **Thesis Challenge mode** shows HOW each philosopher would specifically attack the student's thesis, with framework-specific questions

### How the Oracle Now Helps Learning
- **Tribunal Summary** shows agreement clusters and tension points before individual responses
- **"Learn X →" buttons** on each philosopher card link directly to the Forge for related concepts
- **Staggered animation** makes the tribunal feel like minds arriving one by one
- **Quote sourcing** with textbook page numbers
- **Hand-off to drafting** — the Oracle now connects to assignment preparation

---

## Final Visionary Pass

### What Still Felt Ordinary
- **Navigation** — 10 tabs with emoji prefixes felt like a feature zoo, not a product. Tabs like "📚 Courseware" and "🗺 Atlas" competed visually instead of guiding.
- **Tab naming** — "Courseware" is institutional jargon. Students don't think in "courseware." Renamed to "Library."
- **Compare tab** — now redundant since the Distinction Gym handles comparisons better. Compare view still exists for direct access but removed from primary nav to reduce clutter.
- **Nav density** — padding was too generous for 10 items, causing horizontal overflow on smaller screens.

### What Changed
1. **Nav consolidated to 9 clean labels**: Home | Atlas | Concepts | Learn | Gym | Oracle | Library | Stats | ⚙
   - Removed emoji prefixes from most tabs (cleaner, more professional)
   - Renamed "Courseware" → "Library" (human language)
   - Reduced padding from 22px to 18px per tab
   - Reduced font from .88rem to .85rem
   
2. **EXPERIENCE_NOTES.md created** — full documentation of the intended user journey from arrival through every major surface, covering what the student feels at each moment and why each system exists.

### What Was Cut
- Emoji prefixes from nav labels (🗺, 📚, ⚔, 📊) — they added clutter without aiding navigation
- "Compare" removed from primary nav (still accessible, but the Gym supersedes it for learning)
- Redundant "Courseware" naming replaced with "Library"

### What Now Makes the Product Feel Truly Special
Not any single feature. The integration. Every system refers to the same concept data. The memory system feeds the flow conductor feeds the reward animations. The distinction gym teaches what the forge tests. The oracle challenges what the argument forge helps you write. The assignment lab translates what the atlas maps.

It's not a collection of features. It's a learning environment where everything knows about everything else. That coherence — that feeling of being in a place that was designed as a whole, not assembled from parts — is what makes it feel authored rather than built.

The product now contains:
- A welcoming ritual (quadrant entry with ripple)
- Adaptive emotional intelligence (flow conductor)
- Memory that persists and deepens (fossilization system)
- Concept borders, not just concept content (distinction gym)
- Writing as guided thinking (argument forge)
- Philosophical consultation as learning (oracle tribunal)
- Assignment translation into readiness (assignment alchemy)
- Progress that feels earned (reward animations)
- A full course terrain (atlas)
- A library of everything (courseware/library)
- Analytics that illuminate (stats + achievements)
- Student agency (settings + customization)

2,000+ lines. One file. Zero API calls. Everything deterministic. Ready for Codex to wire real Canvas data into these exact surfaces.

---

## Reader OS

### Reading Problems Before
The app had content about textbook chapters (summaries in modules, page ranges) but no actual reading surface. Students could see "Chapter 2: Utilitarianism, pp. 19-55" but had to go to their physical textbook or Canvas to actually read the content. The app described material but didn't present it.

### What the Reader OS Changes
A dedicated reading surface with three-column layout:

**Left Rail (260px)** — Outline navigation
- Back to Library button
- Resource type indicator (📖 Chapter / 📋 Resource)
- Title and subtitle
- Section-by-section navigation with active highlighting
- Related concepts with memory stage icons and mastery %
- Related assignments with direct links

**Center Column (680px max)** — Reading surface
- Chapter header with title, subtitle, concept chips
- Section headings with active-section left border indicator (cyan)
- Body text at 1.08rem, 2.05 line height, generous paragraph spacing
- Per-section quick actions: "⚡ Learn this" and "💾 Save key idea"
- End-of-chapter actions: "Practice concepts" and "Back to Library"

**Right Rail (48px collapsed, 280px expanded)** — Utility drawer
- Toggle open/close
- Reading progress % with progress bar
- Quick action buttons: Practice concepts, Related assignment, Ask the Oracle
- Concept memory status with stage icons and mastery

### Typography & Feel
- Body: 1.08rem Inter, 2.05 line height, #b8b8d8 color
- Headings: 1.4rem Space Grotesk, #e0e0ff
- Chapter title: 2.2rem Space Grotesk
- Background: #050510 (darker than main app for reading focus)
- Generous padding: 56px top, 48px sides, 120px bottom
- Section dividers via 48px bottom margin

### Rich Content (4 Chapters)
1. "What Is Ethics?" — Why study ethics, descriptive vs normative, major frameworks, how to read philosophy
2. "Utilitarianism: Bentham & Mill" — The utilitarian revolution, felicific calculus, Mill's refinement, act vs rule
3. "Kant's Moral Theory" — The good will, duty vs inclination, the categorical imperative
4. "Aristotle & Character" — The good life, virtue as habit, the doctrine of the mean

### Surfaces That Open Into Reader
- **Atlas** — "Read →" button on every textbook chapter card
- **Library/Courseware** — chapters listed with "Read" button (existing)
- **Reader tab** — direct access showing all available chapters + saved key ideas

### Saved Key Ideas
Students can save important passages from any section. Saved ideas appear on the Reader library page with heading, excerpt, and source attribution.

---

## Reader Intelligence Pass

### Section Intelligence Added

**Section Memory** — each section tracks three states:
- **Read**: automatically marked when the section is clicked/navigated to
- **Marked**: student can tag any section as understood (✓), important (★), revisit (↻), or confusing (?)
- **Position**: last-read section is persisted per chapter, enabling "resume from where you left off"

**Progress Tracking** — `getReadingProgress(readingId, totalSections)` calculates % of sections marked as read. This powers:
- Progress bar in the left rail outline
- Progress ring on the Reader library cards
- "X% of sections reviewed" at chapter end
- Completion detection for chapter-end messaging

**Section Marks** — four student-controlled tags per section:
| Mark | Icon | Color | Meaning |
|------|------|-------|---------|
| Understood | ✓ | Teal | "I get this" |
| Important | ★ | Gold | "Remember this" |
| Revisit | ↻ | Orange | "Come back later" |
| Confusing | ? | Red | "Need help here" |

Marks appear in the left rail outline (colored dots + icons), on the section heading (badge), and in the right-rail stats summary.

### Active Section Behavior
- Clicking a section in the left rail smooth-scrolls to it via `scrollIntoView({behavior:"smooth"})`
- The active section gets a cyan left border indicator (4px × 32px)
- The left rail highlights the active section with cyan background + border
- Section dots in the outline are: cyan (active), teal (read), marked color (if tagged), dim (unvisited)

### Resume Logic
- `readingPositions[readingId]` stores the last section index per chapter
- On re-opening a chapter, Reader restores to last position
- A "↻ Resumed from [section name]" indicator appears at the top of the reading column
- The library view shows "↻ Resume from [section name]" on incomplete chapters

### Momentum & Orientation
- **Chapter end summary**: shows reading progress %, counts confusing sections, suggests next unfinished chapter
- **Next chapter button**: "Next: [title] →" appears at chapter end if more reading exists
- **Assignment relevance hint**: first section shows "📋 This section matters for: [assignment]" when a related assignment exists
- **Right rail section stats**: counts of understood/important/revisit/confusing sections

### What Changed From Previous Reader
- Left rail outline now shows read/active/marked states per section (was flat text)
- Reading position persists and restores (was always section 0)
- Section marks give student agency over their reading (didn't exist)
- Chapter progress ring on library cards (was static)
- Resume indicator on re-entry (didn't exist)
- Chapter-end intelligence with confusing section count and next-chapter suggestion (was minimal)
- Section intelligence bar with mark buttons + quick actions below every section (was single "Save" button)

---

## Reader Scrollspy Pass (Deepening)

### What Was Added Beyond Click-Based Tracking

**True IntersectionObserver Scrollspy**
- An `IntersectionObserver` watches all section elements (via `data-section-idx` attribute)
- Threshold: 30% visibility, rootMargin: `-80px 0px -40% 0px` (biased toward upper viewport)
- When a section scrolls into view, it automatically: updates active section, saves reading position, marks section as read
- No click required — the Reader tracks your position by watching where your eyes are

**Left Rail Auto-Scroll**
- When scrollspy updates the active section, the corresponding left rail button auto-scrolls into view via `scrollIntoView({behavior:"smooth",block:"nearest"})`
- Each rail button has a unique `id` for targeting
- This keeps the outline in sync even during fast scrolling through long chapters

**Section-Level Visual States**
Each section container now responds to its mark state:
- **Understood sections** get a subtle teal background tint (`rgba(6,214,160,.03)`) and teal border, creating a "this is resolved" visual warmth
- **Confusing sections** get a subtle red tint (`rgba(255,68,102,.02)`) and red border, keeping them visually unresolved
- **Active sections** get a soft box shadow that deepens the understood/confusing glow
- Unmarked sections are transparent — no visual noise

**Concept Neighborhood Indicator**
When a section becomes active (via scroll or click), a concept chip appears above the heading showing:
- Memory stage icon (💎🟢🔵🟠⚫)
- Concept name and memory stage label
- "👻 Previously tricky" warning if the concept has unresurfaced ghosts

This indicator only appears on the active section — it doesn't clutter every section. The student always knows what concept neighborhood they're reading in.

### How Scrollspy Supports Momentum
1. **Passive progress** — reading position updates without clicking, so progress bars and section-read counts grow naturally as the student reads
2. **Outline stays in sync** — the left rail always highlights where you are, even during fast scrolling
3. **Visual resolution** — understood sections subtly glow teal, creating a growing field of "resolved knowledge" as you mark sections
4. **Ghost awareness** — if a related concept previously tripped the student, the section quietly notes it

---

## Transcript Mode

### Transcript Capabilities Added
A full time-synchronized transcript surface for lecture, video, and audio content.

**Three-column layout** (matches Reader OS structure):
- **Left Rail (280px)**: Lecture title, speaker, duration, playback controls, segment markers, concept links
- **Center (700px)**: Time-stamped transcript lines with active-line highlighting
- **Right Rail (48px)**: Saved segment counter

**Playback Controls**:
- Play/Pause button with violet accent
- Scrub bar (click anywhere to jump)
- -15s / +15s skip buttons
- Auto-scroll toggle (keeps active line in view)
- Simulated playback timer that advances at 1x speed

**Active-Line Tracking**:
- Current line highlighted with violet background tint
- Timestamp turns violet for active line
- Text brightens from T2 to TX color
- Clicking ANY line jumps playback to that timestamp and starts playing

**Segment Markers**:
- Lecture segments shown as chapters in the left rail
- Active segment highlighted with violet dot and background
- Each segment shows timestamp
- Segment marks: understood (✓), important (★), confusing (?)

### Learning Actions at Segment Level
| Action | What it does |
|--------|-------------|
| ✓ Understood | Marks segment as comprehended |
| ★ Important | Flags segment for review |
| ? Confusing | Marks for revisit/help |
| 💾 Capture | Saves segment text as evidence/example |
| ⚡ Learn this | Launches Forge for the related concept |

### Transcript Data (2 Lectures)
1. **"Lecture 1: Why Ethics Matters"** — 39 min, 4 segments, 21 timestamped lines covering opening, what is ethics, three frameworks, utilitarianism introduction
2. **"Lecture 3: Kant and Moral Duty"** — 33 min, 3 segments, 15 timestamped lines covering problems with consequences, categorical imperative, Kant vs utilitarianism

### How Transcript Mode Serves Understanding
- Click a line → jump to that moment and hear/read in context
- Segment marks create a "comprehension map" of the lecture
- Concept chips link transcript content to the learning system
- Captured segments can be used as evidence in assignments
- Confusing segments can be flagged for targeted review
- The left rail's segment markers work like chapter markers — the student always knows where they are in the lecture's intellectual arc

### Accessible From
- **Reader library** — transcripts appear below chapters with 🎧 icon, violet accent, segment count
- **Any surface** via `openTranscript(txId)` function

---

## Margin Intelligence System

### What Margin Systems Were Added
A contextual annotation layer that appears between body text and section controls in the Reader. Eight annotation types, each with a distinct color, icon, and purpose:

| Type | Icon | Color | Purpose |
|------|------|-------|---------|
| Key Insight | ★ | Gold | Passages essential for understanding or assignments |
| Plain English | 💬 | Teal | Simplified translations of dense philosophical text |
| Common Confusion | ⚠ | Red | Warnings about historically difficult passages |
| Assignment Link | 📋 | Orange | Connections to specific upcoming assignments |
| Concept Border | ⚖️ | Violet | Where one concept stops and another begins |
| Thesis Material | ✦ | Gold | Lines worth building a paper around |
| Philosopher's View | 🏛 | Violet | How another thinker would respond to this passage |
| Memory Hook | 🔗 | Cyan | Mnemonic devices for retention |

### Annotation Coverage
28 margin notes across 4 chapters and 14 sections. Each note is hand-authored to match the actual content — not generated from templates.

Example annotations:
- **r1:1 (Descriptive vs Normative)**: ⚠ Confusion warning + 📋 Assignment link to Week 5 Discussion + ⚖️ Border marker
- **r2:2 (Mill's Refinement)**: ⚖️ "This is where Bentham STOPS and Mill BEGINS" + ✦ Thesis material
- **r3:2 (Categorical Imperative)**: ★ Key insight for Assignment 3 + 📋 Direct assignment link + 🔗 Memory hook

### How They Avoid Clutter
1. **Active-section priority** — full annotation set only appears on the currently active section. Inactive sections show only confusion warnings (⚠) and assignment links (📋) — the two types that are always urgent.
2. **Dismissible** — every note has a ✕ button. Dismissed notes stay hidden for the session via a Set of dismissed keys.
3. **Subtle presentation** — left border in the note's accent color (3px, 44% opacity), text background at 6% opacity of accent color. Notes blend with the reading surface rather than competing with body text.
4. **Fade animation** — notes on the active section use `fadeUp .4s ease`, creating a gentle reveal as you scroll to each section.
5. **Opacity reduction** — notes on non-active sections render at 60% opacity.
6. **No margin spam** — maximum 3 notes per section. Most sections have 1-2.

### How They Improve Comprehension and Assignment Relevance
- **Plain English translations** make dense philosophical prose accessible without dumbing down the main text
- **Confusion warnings** preempt the exact mistakes that lose students points
- **Assignment links** create visible bridges between reading and upcoming work
- **Concept borders** teach where one idea ends and another begins — directly supporting the Distinction Gym
- **Thesis material** flags lines worth building papers around, connecting reading to the Argument Forge
- **Philosopher's Views** bring the Oracle into the margins — showing how other thinkers would respond
- **Memory hooks** connect to the Memory Fossilization System's mnemonic approach

---

## Highlight-to-Mastery Pipeline

### How Highlights Now Feed Learning
When a learner selects text in the Reader, a floating popover appears with 7 tag options. Each tag feeds a different part of the learning engine:

| Tag | Icon | Color | What It Becomes |
|-----|------|-------|-----------------|
| Key Idea | ★ | Gold | Saved for review, strengthens concept memory (+2% mastery) |
| Evidence | 📌 | Teal | Usable in Argument Forge paragraphs, strengthens mastery |
| Quote | "" | Violet | Saved with attribution for assignment citations |
| Thesis Fuel | ✦ | Gold | Flagged for Argument Forge thesis formation |
| Example | ◆ | Cyan | Saved as concept application example |
| Confusing | ? | Red | Flagged for revisit, surfaces in review queue |
| Revisit | ↻ | Orange | Added to spaced review queue |

### What Actions a Highlight Supports
1. **Text selection** → mouseup event detects selection of 5-500 characters
2. **Popover appears** at selection position with 7 tag buttons + dismiss
3. **One-click tagging** — click a tag to save the highlight instantly
4. **Toast confirmation** — "✓ Saved as key idea"
5. **Mastery boost** — "key idea" and "evidence" tags bump related concept mastery by 2%
6. **Study tray** — highlights appear in the Reader's right rail, filtered by chapter
7. **Library view** — all highlights appear in the Reader library with tag chips and concept links

### Highlight Study Tray (Right Rail)
When the right rail is open, highlights for the current chapter appear at the bottom:
- Color-coded left border matching the tag
- Tag label with icon
- Truncated text preview (80 chars)
- Scrollable if many highlights

### Reader Library Highlights Section
The Reader library shows all highlights across chapters:
- Tag filter chips showing counts per tag type
- Each highlight shows: tag, source chapter, text preview, related concept with memory stage
- Capped at 12 visible with "X more highlights" counter

### How the System Avoids Clutter
1. **Single-click save** — no forms, no dialogs, no extra steps
2. **Popover auto-dismisses** on tag selection or ✕ click
3. **Selection validation** — ignores selections under 5 chars or over 500 chars
4. **Capped at 100 highlights** — oldest are dropped, preventing infinite accumulation
5. **Study tray is in the collapsible right rail** — hidden by default
6. **Library view caps at 12 visible** — rest collapsed behind a count
7. **No highlight rendering in the main text** — the text itself stays clean; highlights live in the tray and library

---

## Threaded Discussion Reader

### Discussion-Reading Problems Solved
Canvas discussions are flat chronological dumps. Every reply looks the same. There's no way to tell which posts are worth reading, which are agree-only filler, which use real framework analysis, and which the instructor praised. Students waste time reading shallow posts and miss the substantive ones.

### Thread Intelligence Added

**Quality Classification** — every post is tagged with a quality signal:
| Quality | Icon | Color | Meaning |
|---------|------|-------|---------|
| Excellent | ★ | Gold | Multi-framework analysis with genuine insight |
| Substantive | ◆ | Teal | Adds real argument or important distinction |
| Growth | ↗ | Cyan | Shows genuine learning or perspective shift |
| Surface | ~ | Orange | Correct but lacks depth |
| Shallow | — | Dim | Agree-only or too brief to learn from |
| Instructor | 🎓 | Violet | Faculty guidance or framing |

**Thread Heatmap** — at the top of each discussion, a quality map shows counts of each post type + concept chips showing which frameworks appear in the conversation.

**"What This Is Really About"** — plain-language translation of the discussion's real pedagogical purpose: "This discussion tests whether you can DISTINGUISH frameworks, not just describe the scenario."

**Threaded Layout** — visible parent/child relationships with depth-based indentation (28px per level), color-coded left borders matching quality, collapsible branches.

**Concept Chips** — each post shows which concepts the author actually used, making it visible when someone is doing real framework analysis vs surface-level response.

**Save as Evidence** — any reply can be saved for use in assignments.

### How the Surface Improves Assignment Preparation
- Quality signals immediately surface which posts are worth reading
- "What this is really about" clarifies what the instructor actually wants
- Concept chips show which frameworks are being used (and which are missing)
- Saved replies become evidence for your own response
- Instructor posts are visually distinct and carry framing guidance
- The discussion is accessible directly from the assignment view via "💬 Discussion Thread" card

### Discussion Data
One fully threaded discussion: "Week 3: The Trolley Problem" with 3 root posts, 5 replies, 2 instructor responses, quality-classified and concept-tagged throughout.
