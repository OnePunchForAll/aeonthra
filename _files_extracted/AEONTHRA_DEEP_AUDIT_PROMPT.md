# AEONTHRA DEEP AUDIT — Pixel-Level Quality Analysis

**You are a senior product designer and QA engineer reviewing a local web app at `http://127.0.0.1:5180`. Your job is to produce a single document that can be handed directly to the developer (Codex) to fix every remaining issue. Be surgical. Be specific. Be ruthless.**

**Use browser tools to navigate, click, type, scroll, and screenshot EVERYTHING. For each screenshot, zoom into specific regions to catch details. Do not skim. Do not assume anything works until you've verified it with your own clicks.**

---

## HOW TO TEST

For every view and feature:
1. Navigate to it
2. Take a full screenshot
3. Zoom into each section (top-left, top-right, center, bottom) to read small text
4. Click every button and interactive element
5. Read the actual text content word-by-word for quality
6. Note every issue with its exact location

---

## TEST 1: LOAD THE DEMO

1. Navigate to `http://127.0.0.1:5180`
2. If you see an import screen, find and click the demo button
3. If demo is already loaded, proceed
4. Take a full-page screenshot

**Check these specific things:**
- Does "PHI 208: Ethics and Moral Reasoning" appear as the course title?
- How many CONCEPTS does it say? (should be 12)
- How many TASKS? (should be 6)
- What is the TOP CONCEPT listed?

---

## TEST 2: DASHBOARD — SECTION BY SECTION

Navigate to the DASHBOARD view. For each section below, zoom in and read every word.

### 2A: Capture Summary card
- Read the course name, source, tasks count, concepts count, top concept
- Is any text cramped or cut off?

### 2B: Mission Control card
- Read: Unlocked count, Mastered count, Forge Ready time, Practice Mode status
- Are the numbers in JetBrains Mono font?

### 2C: Timeline preview
- How many weeks are shown?
- How many event cards are visible?
- Are the event titles fully readable or truncated?
- Is the timeline HORIZONTAL (side-scrolling) or VERTICAL (top-to-bottom)?
- Are event cards large enough (at least 100px tall)?
- Do events have colored left borders (cyan for assignment, teal for discussion, purple for quiz)?

### 2D: Active Work section
- How many work items are listed?
- For each item, read: type badge, title, description, and LOCKED/OPEN status
- Does every locked item show "LOCKED" in red?
- Does every open item show "OPEN" in green/teal?
- Are the descriptions real sentences or garbage text?

### 2E: Concept Field
- How many concept chips/cards are shown?
- Does each show a name and mastery percentage?
- Are the mastery percentages DIFFERENT from each other (not all 0% or all the same)?
- Are the cards visually differentiated by color based on mastery level?
- Is there an "OPEN NEURAL FORGE" button?

### 2F: Source Trail
- Are there link entries with STRONGLY-RELATED or RELATED badges?
- Does each link show matched concept tags?
- Are the badges colored (cyan for strongly-related, teal for related)?

### 2G: Interaction Cards
- Scroll down to find them
- List every interaction card title you can see
- Expected: Echo Chamber, Oracle Panel, Gravity Field, Shadow Reader, Failure Atlas, Collision Lab, Duel Arena, Prompt Prism, Time Capsule
- Which ones are MISSING?
- For each card: read the description text. Is it a real sentence or placeholder?
- Click each card's button. Does it navigate to the correct view?

### 2H: Shadow Reader Rail (right edge)
- Is it visible on the right side of the screen?
- Is it showing ONE passage at a time, or are multiple passages overlapping?
- Can you actually READ the text, or is it a jumbled mess?
- Does the "Seen / Familiar" counter show numbers?
- Does the dropdown (Steady/Gentle/Immersive/Off) work?
- Does the passage text contain "Module N -" prefixes? (it should NOT)

### 2I: Overall Spacing
- Scroll slowly through the entire dashboard from top to bottom
- Is there any massive empty void (hundreds of pixels of black space between sections)?
- Do any cards touch each other with zero gap?
- Is there consistent spacing between sections?
- Does any text overlap other text?

---

## TEST 3: TIMELINE VIEW

1. Click the TIMELINE nav pill
2. Take a full screenshot
3. Zoom into the event cards

**Check:**
- Does the timeline fill the full viewport width? Or is it crammed into a narrow column?
- Is it HORIZONTAL (scrolling left/right) or VERTICAL (scrolling up/down)?
- How many events are visible at once?
- Can you read each event's title completely?
- Are events grouped by week with week headers?
- Is there a TODAY marker (glowing line or indicator)?
- Click on an event card. What happens? Does it navigate to assignment detail? Open a panel? Or do nothing?
- Try scrolling/dragging the timeline. Does it have momentum? Snap points?

---

## TEST 4: CONCEPT MAP VIEW

1. Click the CONCEPT MAP nav pill
2. Take a full screenshot
3. Zoom into the graph area

**Check:**
- How many nodes are visible? Count them.
- Are nodes DIFFERENT SIZES based on mastery? Or all the same size?
- Are nodes DIFFERENT COLORS? Describe the colors you see (gold, teal, cyan, dim gray, etc.)
- Do any node labels overlap each other?
- Does the map fill most of the viewport? Or is it tiny in a corner?
- Is there an EXPORT PNG button?
- Click on a node. Does a detail panel appear?

**If detail panel appears, zoom in and read EVERY WORD:**
- What is the concept name?
- Read the CORE definition. Is it a complete sentence?
- Read the DETAIL text. Is it DIFFERENT from the core? (If it's the same sentence repeated, that's a critical bug)
- Read the MNEMONIC. Does it contain a real memory hook (picture, imagine, think of, like, remember)? Or is it meta-commentary ("The easy mistake is...", "becomes unstable when...")?
- Is there a READ ALOUD button? Click it. Does the browser speak?
- Click a DIFFERENT node. Does the detail panel update with different text?

---

## TEST 5: NEURAL FORGE VIEW

1. Click the FORGE nav pill
2. Take a full screenshot

**Check the phase cards:**
- Are 5 phases visible (Genesis, Forge, Crucible, Architect, Transcend)?
- Does each phase have a DIFFERENT color (teal, cyan, orange, purple, gold)?
- Which phase is ACTIVE? Which are LOCKED?
- Is the active phase visually distinct (glowing, highlighted)?

**Test the active phase (probably Genesis):**
3. Read the question/prompt text word-by-word
4. Is it a REAL ETHICAL DILEMMA? (A scenario about a moral choice, like "A hospital has one dose...")
5. Or is it a META-READING QUESTION? ("What is this passage trying to help you notice?" — this is WRONG)
6. Read each answer choice. Are they GENUINELY DIFFERENT ethical positions? Or reworded versions of the same thing?
7. Click one answer choice
8. Does a REVEAL/EXPLANATION panel appear? What does it say?
9. Click NEXT
10. Does the next question appear? Is it different from the first?

**If Forge phase is accessible:**
11. Look for Rapid Fire or Deep Drill options
12. If Rapid Fire exists, read the True/False statement. Is it a real claim about a concept?
13. Answer it. Does feedback appear (green for correct, red for wrong)?
14. If Deep Drill exists, read the multiple choice question. Are all 4 options DIFFERENT?

**Check the timer:**
- Is it displayed in mm:ss format?
- Is it in JetBrains Mono font?
- Does START TIMER button work?

**Check EXPORT SUMMARY button — does it exist? Don't need to click it.**

---

## TEST 6: ORACLE PANEL

1. Click the ORACLE nav pill
2. Take a full screenshot

**Check:**
- Is it EMPTY with a message like "waiting for thinkers"? (BUG if empty in demo mode)
- Or does it show thinker names/portraits?
- If it has an input field, type: "Is lying ever justified?"
- Submit the question
- Do MULTIPLE thinkers respond? How many?
- Read each thinker's response. Are the responses DIFFERENT from each other?
- Does each response cite a specific page or source?
- Are responses attributed to specific philosophers (Bentham, Kant, Mill, Aristotle, etc.)?

---

## TEST 7: GRAVITY FIELD

1. Click the GRAVITY FIELD nav pill
2. Take a full screenshot
3. Zoom into the orbs

**Check:**
- How many concept orbs are visible?
- Are they DIFFERENT SIZES? (bigger = more mastery/mass)
- Are they DIFFERENT COLORS? (gold, teal, cyan based on mastery?)
- Are there smaller bodies (squares or dots) representing assignments?
- Are the assignment bodies ORBITING the concept orbs? Or just floating statically nearby?
- Watch for 5 seconds — do anything MOVE?
- Click a concept orb. Does an inspector panel appear?
- If inspector appears, read: mastery %, mass value, dependent assignments, PRACTICE NOW button

---

## TEST 8: COLLISION LAB

1. Click the COLLISION LAB nav pill
2. Take a full screenshot

**Check:**
- Are there two dropdown selectors?
- Select "Utilitarianism" and "Deontology" (or any two different concepts)
- Click COLLIDE CONCEPTS
- Take a screenshot of the collision report

**Read each section of the report word-by-word:**

**SHARED GROUND:**
- Is it COMPLETE SENTENCES? ("Both Utilitarianism and Deontology address questions of moral obligation.")
- Or is it a KEYWORD DUMP? ("Both engage with utilitarianism, framework, judges, actions" — this is WRONG)

**TENSIONS:**
- Does it describe ACTUAL DIFFERENCES between the two concepts?
- Or is it repeating the same definition for both?

**SYNTHESIS:**
- Does it name a bridging concept or idea?
- Or is it empty/generic?

**HISTORICAL COLLISIONS:**
- Is the text COMPLETE (ending at a sentence boundary)?
- Or is it TRUNCATED mid-word (ending in "cha..." or similar)?

**Cross-check:** Is ANY section showing the EXACT SAME text as another section? That's a bug.

---

## TEST 9: DUEL ARENA

1. Click the DUEL ARENA nav pill
2. Take a full screenshot
3. Select two DIFFERENT concepts (e.g., Utilitarianism vs Virtue Ethics)
4. Click START DUEL
5. Take a screenshot of Round 1

**For EACH round, check:**
- Does the LEFT side show text about the LEFT concept?
- Does the RIGHT side show text about the RIGHT concept?
- Are the two sides DIFFERENT? (Read the first 10 words of each — if they're the same words, that's a CRITICAL bug)
- Is there a judgment prompt between rounds?
- Does the source citation show "Module N -" prefix? (it should NOT)

6. Click through all rounds (should be 3-5 rounds)
7. Does each round show NEW content? Or the same text repeated?
8. At the end, is there a final judgment prompt?

---

## TEST 10: ASSIGNMENT DETAIL

1. Go back to DASHBOARD
2. Find any assignment in the Active Work section
3. Click on it (OPEN or LOCKED — either one)
4. Take a full screenshot of the assignment detail view

**Check the three-column layout:**

**LEFT column (Breakdown):**
- Title visible?
- Due date visible?
- Points visible?
- Description text — is it a real sentence or garbage?
- Requirements section — does it show real requirements or Canvas chrome ("Links to an external site")?

**CENTER column (Submission Workspace):**
- If LOCKED: does it show "PREPARE FIRST" with concept requirements and mastery bars?
- Is there a "PREPARE IN NEURAL FORGE" button?
- If UNLOCKED: is there a text editor? Can you type in it?
- Is there a GRADE & EXPORT button?

**RIGHT column (Textbook Bridge):**
- Does it show related concepts with mastery percentages?
- Are the concepts relevant to this assignment?
- Is there a START FORGE button?

---

## TEST 11: PRACTICE MODE & RESET

1. Go back to Dashboard
2. Find the PRACTICE MODE button in the top bar
3. Click it
4. Do all LOCKED assignments become OPEN?
5. Click PRACTICE MODE again to toggle it off
6. Do assignments return to LOCKED?
7. Click RESET
8. Does the app return to the import screen?
9. Click the demo button again
10. Does the demo reload cleanly?

---

## TEST 12: CONTENT QUALITY DEEP-DIVE

This is the most important test. Zoom into text throughout the app and evaluate the QUALITY of the generated content.

**For each concept in the Concept Field (all 12):**
- Read the name. Is it a real study topic?
- Check mastery percentage. Are they differentiated?

**For each Active Work item:**
- Read the description. Does it describe a real assignment?
- Check for garbage text: "Module N -" prefixes, "Links to an external site", "| Transcript Download", raw HTML entities

**In the Duel Arena:**
- Read Round 1 left side first 20 words
- Read Round 1 right side first 20 words
- Are they DIFFERENT WORDS? Or the same text?

**In Neural Forge:**
- Read the dilemma scenario. Is it a real moral situation?
- Read each answer choice. Do they represent different ethical frameworks?

**Everywhere:**
- Any instance of "undefined" or "null" as visible text?
- Any instance of "[object Object]" as visible text?
- Any instance of raw JSON or code visible in the UI?
- Any instance of the same sentence appearing twice in the same view?

---

## OUTPUT FORMAT

Produce your report in this EXACT structure. This report will be handed directly to the developer as a fix directive.

```markdown
# AEONTHRA AUDIT REPORT — [DATE]

## EXECUTIVE SUMMARY
- Quality Score: X/10
- One-sentence verdict: "..."
- Top 3 things that work well
- Top 3 things that are broken

## CRITICAL BUGS (Must fix — these make features unusable)

### BUG 1: [Name]
- **Where:** [exact view and section]
- **Expected:** [what should happen]
- **Actual:** [what actually happens]  
- **Evidence:** [quote the exact text or describe what the screenshot shows]
- **Fix:** [specific code-level suggestion]

### BUG 2: [Name]
... (continue for all critical bugs)

## QUALITY ISSUES (Should fix — these look bad but features still work)

### ISSUE 1: [Name]
- **Where:** [exact location]
- **Problem:** [what's wrong]
- **Fix:** [how to fix it]

... (continue for all quality issues)

## CONTENT QUALITY ISSUES (The generated text is wrong or low quality)

For each instance of bad content:
- **Where:** [which view, which section, which concept]
- **Bad text:** "[quote the exact bad text]"
- **Why it's bad:** [explanation]
- **What it should say instead:** [suggested replacement or fix approach]

## MISSING FEATURES (Specified but not implemented)

List every feature that doesn't exist or is completely non-functional.

## WHAT WORKS WELL (Don't break these)

List every feature that works correctly. Be specific.

## PRIORITY FIX ORDER

Number every bug and issue in the order the developer should fix them.
1. [highest impact fix]
2. [second highest]
... etc.
```

---

## CRITICAL REMINDERS

- **ZOOM IN on text.** Small text at normal zoom is unreadable in screenshots. Zoom to 150-200% when reading content.
- **Read word-by-word.** Don't skim. If a sentence doesn't make sense, that's a bug.
- **Click EVERYTHING.** Every button, every card, every node, every dropdown. If clicking does nothing, that's a bug.
- **Compare left vs right in Duel Arena.** Read the first sentence of each side. If they're the same, that's critical.
- **Check for "Module N -" prefixes everywhere.** They should never appear in user-facing text.
- **The Shadow Reader rail on the right edge is the most visually buggy element.** Check if passages overlap.
- **The target experience is "something no one has ever seen before."** If any view feels like a generic dashboard, note it.
- **Be honest.** If the overall quality is a 4/10, say so. If it's an 8/10, say so. Don't inflate or deflate.

**Start testing now. Navigate to `http://127.0.0.1:5180` and begin Test 1.**
