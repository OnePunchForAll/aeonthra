# AEONTHRA LIVE SITE AUDIT — Self-Test Every Feature

**You are about to test a local web application running at `http://127.0.0.1:5180/#demo`. This is AEONTHRA — a deterministic learning platform. Your job is to navigate every view, interact with every feature, and produce a comprehensive report of what works, what's broken, and what needs to be fixed.**

**Use the browser tools (navigate, read_page, find, computer click/type) to actually visit the site and interact with it. Do not guess. Do not assume. Actually click things, read the screen, and report what you see.**

---

## PHASE 1: FIRST IMPRESSIONS (2 minutes)

1. Navigate to `http://127.0.0.1:5180`
2. Screenshot the landing/import screen
3. Note: Does the AEONTHRA wordmark glow cyan? Is the background near-black? Are fonts correct (Orbitron for headings, Sora for body)?
4. Find and click the demo button (should say "Experience the Demo" or similar)
5. Screenshot the dashboard after demo loads
6. Note: How many concepts loaded? How many tasks? What's the top concept? Does the layout feel spacious or cramped?

---

## PHASE 2: DASHBOARD DEEP INSPECTION

1. Read every element on the dashboard:
   - CAPTURE SUMMARY section: course name, source, tasks count, concepts count, top concept
   - MISSION CONTROL section: unlocked count, mastered count, forge ready time, practice mode
   - TIMELINE section: how many weeks visible? How many events? Is it horizontal or vertical?
   - ACTIVE WORK section: how many items? What types (assignment/discussion/quiz)? Are any LOCKED vs OPEN?
   - CONCEPT FIELD section: how many concept cards? Do they show mastery percentages? Are colors differentiated?
   - SOURCE TRAIL section: do links show STRONGLY-RELATED or RELATED badges?
   - INTERACTION cards: which of the 9 interactions are visible (Echo Chamber, Oracle, Gravity Field, Shadow Reader, Failure Atlas, Collision Lab, Duel Arena, Prompt Prism, Time Capsule)?
2. Note spacing: Are cards touching each other? Is there breathing room between sections? Is any text cut off or overlapping?
3. Note the Shadow Reader rail on the right edge: Is it showing passages? Are they readable? Does the "Seen / Familiar" counter work?

---

## PHASE 3: TIMELINE VIEW

1. Click the TIMELINE nav pill
2. Screenshot the timeline
3. Note: Is it horizontal (sideways scrolling) or vertical? Does it fill the viewport width?
4. How many events are visible? Can you read their titles?
5. Try scrolling left/right (or up/down if vertical). Does it respond smoothly?
6. Is there a TODAY indicator line?
7. Are events color-coded by type (assignment = cyan border, discussion = teal, quiz = purple)?
8. Click on any event card. Does anything happen (detail panel, navigation)?

---

## PHASE 4: CONCEPT MAP VIEW

1. Click the CONCEPT MAP nav pill
2. Screenshot the concept map
3. Note: How many nodes are visible? What colors are they? Are they all the same color or differentiated by mastery?
4. Are node labels readable and not overlapping?
5. Does the map fill the viewport or is it cramped in a small box?
6. Click on a concept node. Does a detail panel appear?
7. If detail panel appears, check:
   - Is the CORE definition a real sentence?
   - Is the DETAIL different from the core (not duplicated)?
   - Is there a MNEMONIC? Is it useful or garbage?
   - Is there a READ ALOUD button? Does it work?
   - Is there an EXPORT PNG button?
8. Try to pan/zoom the map (drag, scroll wheel). Does it respond?

---

## PHASE 5: NEURAL FORGE VIEW

1. Click the FORGE nav pill
2. Screenshot the forge view
3. Note: Which phase is active (Genesis, Forge, Crucible, Architect, Transcend)?
4. Are the phase cards themed with different colors (teal, cyan, orange, purple, gold)?
5. Are locked phases visually distinct from the active phase?

### 5a: Test Genesis Phase
6. If Genesis is the active phase, read the immersion question:
   - Is it an actual ETHICAL DILEMMA (a scenario with a moral choice)?
   - Or is it a meta-reading question ("What is this passage trying to help you notice?")?
   - Are the answer choices genuinely different ethical positions?
7. Click one of the answer choices
8. Does a REVEAL panel appear explaining which framework you chose?
9. Click NEXT. Does the next question/concept card appear?
10. Complete Genesis (or advance through 2-3 items). Does the phase status update?

### 5b: Test Forge Phase (if accessible)
11. If Forge is unlocked, click into it
12. Does a menu appear with Rapid Fire and Deep Drill options?
13. Start Rapid Fire: Does a TRUE/FALSE question appear? Is the question a real claim about a concept (not template garbage)?
14. Click TRUE or FALSE. Does green/red feedback appear? Does the score counter update?
15. Start Deep Drill: Does a multiple choice question appear with 4 options?
16. Are all 4 options DIFFERENT from each other (not duplicates)?
17. Is there a LEARN FIRST button? Does clicking it show the concept definition?
18. Answer a question. Does the explanation appear?

### 5c: Test remaining phases (if accessible)
19. Check Crucible, Architect, Transcend if any are unlocked. Note what works and what doesn't.
20. Does the timer display in mm:ss format (JetBrains Mono)?
21. Is there an EXPORT SUMMARY button? Does it generate a markdown file?

---

## PHASE 6: ORACLE PANEL

1. Click the ORACLE nav pill
2. Screenshot the Oracle Panel
3. Is it empty ("waiting for clearly attributed thinkers") or populated?
4. If populated: How many thinkers are shown? Do they have portrait icons or names?
5. Type a question in the input field (try: "Is lying ever justified?")
6. Click ASK or submit
7. Do multiple thinkers respond with DIFFERENT text?
8. Does each response cite a specific page or passage?
9. Is there a SHOW SOURCE PASSAGES button? Does it expand?

---

## PHASE 7: GRAVITY FIELD

1. Click the GRAVITY FIELD nav pill
2. Screenshot the Gravity Field
3. How many concept orbs are visible? Are they different sizes based on mastery?
4. Are assignment bodies visible? Are they orbiting the concept orbs or just floating statically?
5. Click on a concept orb. Does the inspector panel appear?
6. Does the inspector show: mastery %, mass, dependent assignments, PRACTICE NOW button?
7. Does clicking PRACTICE NOW do anything?

---

## PHASE 8: COLLISION LAB

1. Click the COLLISION LAB nav pill
2. Screenshot the Collision Lab
3. Are there two dropdown selectors for Concept A and Concept B?
4. Select two different concepts (e.g., Utilitarianism and Deontology)
5. Click COLLIDE CONCEPTS
6. Check each section of the collision report:
   - SHARED GROUND: Is it complete sentences or a keyword dump?
   - TENSIONS: Does it describe actual differences between the concepts?
   - SYNTHESIS: Does it name a bridging concept or idea?
   - HISTORICAL COLLISIONS: Is the text complete (not truncated mid-word)?
7. Is any section showing the exact same text as another section?

---

## PHASE 9: DUEL ARENA

1. Click the DUEL ARENA nav pill
2. Screenshot the Duel Arena
3. Select two different concepts and click START DUEL
4. For Round 1 (Opening):
   - Does the LEFT side show text specific to the LEFT concept?
   - Does the RIGHT side show text specific to the RIGHT concept?
   - Are the two sides DIFFERENT (not identical)?
5. Is there a judgment prompt asking you to evaluate the round?
6. Click through 2-3 rounds. Does each round show differentiated content?
7. At the final round, is there a ruling/judgment prompt?

---

## PHASE 10: ASSIGNMENT DETAIL

1. Go back to Dashboard
2. Click on any assignment (look for one with an OPEN button, or click a LOCKED one)
3. Screenshot the assignment detail view
4. Check the three-column layout:
   - LEFT (Breakdown): Does it show title, due date, points, description, requirements?
   - CENTER (Submission Workspace): Is there a text editor? Is it locked with "PREPARE FIRST" if gating is active?
   - RIGHT (Textbook Bridge): Does it show related concepts with mastery percentages?
5. If the assignment is locked, is there a clear "PREPARE IN NEURAL FORGE" button?
6. If the assignment is unlocked, can you type in the editor?
7. Is there a GRADE & EXPORT button? (Don't need to test full grading, just check it exists)

---

## PHASE 11: INTERACTION CARDS

1. Go back to Dashboard, scroll down to the INTERACTION section
2. Count how many interaction cards are visible. List them.
3. For each interaction card, note:
   - Does it have a clear title and description?
   - Does its button work (opens the correct view)?
4. Which interactions are NOT present that should be? (Expected: Echo Chamber, Oracle Panel, Gravity Field, Shadow Reader, Failure Atlas, Collision Lab, Duel Arena, Prompt Prism, Time Capsule)

---

## PHASE 12: SPACING AND VISUAL QUALITY AUDIT

1. Scroll through the entire dashboard slowly
2. Note every instance of:
   - Cards touching other cards (no gap between them)
   - Text overlapping other text
   - Text cut off at the edge of a container
   - Sections with no breathing room between them
   - Elements that are too small to read comfortably
   - Any "Module N -" prefixes in displayed text
   - Any "Links to an external site" text
   - Any raw HTML entities (&amp;, &ldquo;, etc.)
   - Any "undefined" or "null" displayed as text
   - Any empty sections that should have content
   - Any duplicate text (same sentence appearing twice)
3. Check on the concept map: do any labels overlap?
4. Check the timeline: are event cards large enough to read?

---

## PHASE 13: FUNCTIONALITY SWEEP

1. Click PRACTICE MODE button in the top bar. Does it toggle? Do locked assignments become OPEN?
2. Click RESET. Does it clear the workspace and return to the import screen?
3. Re-load the demo. Does it load cleanly again?
4. Check the timer in the top bar. Is it in JetBrains Mono? Does it show 00:00 or a meaningful time?
5. Check the Shadow Reader dropdown (Steady/Gentle/etc). Can you change the setting?
6. Check if any console errors appear (open DevTools → Console). Note any errors.

---

## OUTPUT FORMAT

After completing all 13 phases, produce a report with exactly this structure:

### EXECUTIVE SUMMARY
- Overall quality score (1-10)
- One-sentence verdict
- Top 3 most impressive things
- Top 3 most broken things

### WHAT WORKS WELL
List every feature that functions correctly with brief notes.

### CRITICAL BUGS (Must Fix Before Shipping)
List every bug that makes a feature unusable or misleading. For each:
- Feature name
- What you expected
- What you saw
- Suggested fix (brief)

### QUALITY ISSUES (Should Fix)
List every cosmetic, spacing, or content quality problem. For each:
- Location in the app
- What's wrong
- How to fix it

### MISSING FEATURES
List every feature from the spec that doesn't exist yet or is completely non-functional.

### CONTENT QUALITY ASSESSMENT
- Are the 12 demo concepts genuinely different from each other?
- Do any concepts share identical definitions?
- Are mnemonics useful memory hooks or garbage?
- Are quiz questions real educational content or template spam?
- Does the Duel Arena show differentiated content per side?
- Does the Collision Lab produce real sentences or keyword dumps?
- Does the Oracle Panel work at all?

### SUGGESTED PRIORITY ORDER
Number the fixes 1-N in the order they should be addressed, with the highest-impact fixes first.

---

## IMPORTANT NOTES

- Take screenshots at every phase. Reference them in your report.
- Be brutally honest. If something looks bad, say it looks bad.
- If a feature exists structurally but is filled with duplicate/garbage content, call that out specifically — it's worse than the feature not existing at all.
- Test on the demo data, not on imported real data.
- If the demo has fewer than 10 concepts, note that as a critical issue.
- If any interaction mode produces identical text on both sides of a comparison, that is a CRITICAL bug.
- The target aesthetic is "dark cyberpunk learning terminal" — if anything feels like a generic dashboard, note it.

**Start testing now. Navigate to `http://127.0.0.1:5180` and begin Phase 1.**
