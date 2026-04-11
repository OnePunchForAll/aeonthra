# AEONTHRA DEFINITIVE FIX — Stop Building Skeletons, Start Building Substance

**Codex: I've reviewed every screenshot of the current build. You built the structure of every feature I asked for. Good. But you filled them all with the same recycled paragraph. That's not a product — that's a mockup with a runtime.**

**This document diagnoses every broken feature with screenshot evidence, explains what's actually wrong at the code level, and tells you exactly how to fix it. Execute every fix. Do not skip any. Do not declare done until the acceptance test at the bottom passes.**

---

## 0. THE PATTERN YOU KEEP REPEATING

You have one failure mode and it's the same in every feature: **when the engine doesn't have differentiated content for two slots, you fill both slots with the same blob of text.**

Evidence:
- **Duel Arena:** Round 1 Opening — virtue-ethics and deontology show THE EXACT SAME paragraph. Word for word identical on both sides. That's because your dialogue synthesis engine is grabbing the same passage for both concepts instead of retrieving concept-specific passages.
- **Collision Lab:** "Shared Ground" shows "Both engage with utilitarianism, framework, judges, actions, consequences" — that's a keyword intersection dump, not a sentence. "Historical Collisions" is a truncated blob ending in "cha..."
- **Neural Forge Genesis:** The "immersion" question is "Before the label arrives, what is this source passage trying to help you notice?" with options like "Follow the main move behind Virtue Ethics" and "Chase the loudest Canvas wording instead" — these are meta-instructions about how to read, not actual dilemma choices.
- **Concept Map detail:** The definition and detail fields show the SAME sentence twice: "Virtue ethics is the approach that asks what a person of good character would do and what habits a decision reinforces over time." Repeated verbatim in both core and detail.
- **Oracle Panel:** Completely empty — "waiting for clearly attributed thinkers" even though the demo data contains three philosophers (Bentham, Kant, Aristotle) by name.

**The root cause:** Your content generation functions have a fallback that returns the same generic text whenever concept-specific retrieval fails. Instead of failing honestly (showing nothing), they repeat the only text they have. This makes every feature look populated but actually broken.

**The fix principle:** When two slots need different content and only one piece of content exists, show the one piece in the primary slot and show "Insufficient source material for this section" in the secondary slot. NEVER duplicate.

---

## 1. FIX THE DEMO DATA (THIS IS THE HIGHEST PRIORITY)

The demo has 3 concepts and 2 tasks. That's not enough to demonstrate ANY feature properly. A judge clicks "Experience the Demo" and sees a nearly empty app. This is the #1 reason the app feels broken.

### 1.1 What the demo needs

The demo must ship with a pre-built ethics course that has REAL content — not 3 one-sentence concepts. Build this as a static JSON fixture in `apps/web/public/demo/` or hardcode it in `demo.ts`.

**Minimum demo content:**

```typescript
const DEMO_CONCEPTS = [
  {
    name: "Utilitarianism",
    core: "Utilitarianism is the ethical theory that the right action is the one that produces the greatest good for the greatest number.",
    detail: "Developed by Jeremy Bentham and refined by John Stuart Mill, utilitarianism evaluates actions solely by their consequences. The felicific calculus weighs factors like intensity, duration, and extent of pleasure against pain.",
    mnemonic: "Utilitarianism — think 'utility meter': every action gets scored by how much total happiness it produces for everyone affected.",
    keywords: ["consequences", "greatest good", "happiness", "Bentham", "Mill", "pleasure", "pain"],
    category: "Consequentialism",
  },
  {
    name: "Deontology",
    core: "Deontology holds that actions are morally right or wrong based on rules and duties, regardless of their consequences.",
    detail: "Immanuel Kant argued that moral law is derived from reason alone. His categorical imperative demands that we act only according to maxims we could will to be universal laws, and that we treat humanity never merely as a means but always as an end.",
    mnemonic: "Deontology — 'deon' means duty in Greek. Duty-based ethics. Rules first, results second. Think of a judge who follows the law even when the outcome seems unfair.",
    keywords: ["duty", "rules", "Kant", "categorical imperative", "universal law", "means", "ends"],
    category: "Non-consequentialism",
  },
  {
    name: "Virtue Ethics",
    core: "Virtue ethics focuses on the character of the moral agent rather than on rules or consequences of actions.",
    detail: "Aristotle argued that virtues are habits developed through practice. The doctrine of the mean holds that virtue lies between extremes — courage between cowardice and recklessness, generosity between stinginess and extravagance.",
    mnemonic: "Virtue Ethics — ask 'What would a good person do?' not 'What rule applies?' or 'What outcome is best?' Character over calculation.",
    keywords: ["character", "virtue", "Aristotle", "habit", "doctrine of the mean", "excellence", "flourishing"],
    category: "Character-based",
  },
  {
    name: "Categorical Imperative",
    core: "Kant's categorical imperative is the supreme principle of morality: act only according to that maxim which you can will to become a universal law.",
    detail: "The categorical imperative has multiple formulations. The Formula of Universal Law tests whether your action's principle could apply to everyone. The Formula of Humanity requires treating people as ends in themselves, never merely as tools.",
    mnemonic: "Categorical Imperative is NOT Hypothetical Imperative. Categorical = always, no exceptions. Hypothetical = only if you want something. 'Don't lie' vs 'Don't lie if you want people to trust you.'",
    keywords: ["Kant", "universal law", "maxim", "humanity", "ends", "means", "duty"],
    category: "Deontological Principles",
  },
  {
    name: "Felicific Calculus",
    core: "Bentham's felicific calculus is a method of calculating the total amount of pleasure and pain that an action would produce.",
    detail: "The calculus evaluates seven dimensions: intensity, duration, certainty, propinquity (nearness in time), fecundity (likelihood of producing more pleasure), purity (freedom from pain), and extent (number of people affected).",
    mnemonic: "Remember the number 7: Bentham's calculus has 7 factors. One per day of the week — Intense Monday, Duration Tuesday, Certain Wednesday...",
    keywords: ["Bentham", "pleasure", "pain", "calculation", "intensity", "duration", "extent"],
    category: "Utilitarian Methods",
  },
  {
    name: "Doctrine of the Mean",
    core: "Aristotle's doctrine of the mean states that moral virtue is a middle ground between two extremes of excess and deficiency.",
    detail: "Courage is the mean between cowardice (too little) and recklessness (too much). Generosity is the mean between stinginess and extravagance. The mean is not mathematical — it is relative to the individual and the situation.",
    mnemonic: "Doctrine of the Mean — think of a guitar string. Too loose = no sound (deficiency). Too tight = it snaps (excess). Just right = music (virtue).",
    keywords: ["Aristotle", "mean", "excess", "deficiency", "courage", "temperance", "moderation"],
    category: "Virtue Ethics Principles",
  },
  {
    name: "Experience Machine",
    core: "Robert Nozick's experience machine is a thought experiment asking whether you would plug into a machine that simulates a perfectly happy life.",
    detail: "If pleasure were the only thing that mattered (as utilitarianism suggests), everyone would choose the machine. But most people refuse — suggesting we value authenticity, real relationships, and genuine accomplishment beyond mere pleasure.",
    mnemonic: "Experience Machine — picture Neo choosing the red pill in The Matrix. We want REAL life, not perfect fake life. That's Nozick's point against pure utilitarianism.",
    keywords: ["Nozick", "thought experiment", "pleasure", "reality", "authenticity", "objection"],
    category: "Objections to Utilitarianism",
  },
  {
    name: "Act vs Rule Utilitarianism",
    core: "Act utilitarianism evaluates each individual action by its consequences; rule utilitarianism asks which general rules would produce the best outcomes if consistently followed.",
    detail: "Act utilitarianism is flexible but can justify injustice in individual cases. Rule utilitarianism provides stability and can defend individual rights by arguing that rules protecting rights produce the best long-term outcomes.",
    mnemonic: "Act vs Rule — Act = judge each play like a referee watching instant replay. Rule = follow the rulebook like a police officer. Same sport, different enforcement.",
    keywords: ["act", "rule", "individual", "general", "consequences", "rights", "stability"],
    category: "Utilitarian Variations",
  },
  {
    name: "Social Contract Theory",
    core: "Social contract theory holds that moral and political rules are justified because rational people would agree to them under fair conditions.",
    detail: "Thomas Hobbes argued people accept government to escape the 'state of nature.' John Rawls proposed the 'veil of ignorance' — designing society without knowing your place in it ensures fairness.",
    mnemonic: "Social Contract — imagine writing the rules for a game you have to play, but you don't know which player you'll be. You'd make it fair for everyone. That's Rawls.",
    keywords: ["Hobbes", "Rawls", "agreement", "fairness", "veil of ignorance", "state of nature"],
    category: "Political Philosophy",
  },
  {
    name: "Moral Relativism",
    core: "Moral relativism holds that moral judgments are not universally true but are relative to cultural, societal, or individual standards.",
    detail: "Cultural relativism claims that right and wrong are determined by cultural norms. Critics argue that if relativism were true, we could never condemn practices like slavery or genocide in other cultures, yet we do.",
    mnemonic: "Moral Relativism — 'When in Rome, do as the Romans do' taken to its logical extreme. But if Rome practices slavery, should you? That's the problem.",
    keywords: ["culture", "relative", "universal", "tolerance", "criticism", "standards"],
    category: "Metaethics",
  },
  {
    name: "Trolley Problem",
    core: "The trolley problem is a thought experiment asking whether it is permissible to divert a runaway trolley to kill one person in order to save five.",
    detail: "The original case (pulling a lever) seems acceptable to most people. But the footbridge variant (pushing a large person off a bridge to stop the trolley) feels wrong to most, even though the math is identical. This reveals a tension between consequentialist and deontological intuitions.",
    mnemonic: "Trolley Problem — the math says 5 > 1 every time. But your gut says pushing someone is murder. That gap between math and gut IS the trolley problem.",
    keywords: ["dilemma", "trolley", "lever", "footbridge", "five", "one", "consequences", "intentions"],
    category: "Applied Ethics",
  },
  {
    name: "Natural Law Theory",
    core: "Natural law theory holds that moral standards are derived from human nature and can be discovered through reason.",
    detail: "Thomas Aquinas argued that God implanted natural law in human reason. Modern secular versions ground natural law in human flourishing — actions that promote human well-being are naturally good, those that harm it are naturally wrong.",
    mnemonic: "Natural Law — some things feel wrong everywhere on Earth, in every culture, in every century. Murder, theft, betrayal. Natural law says that's not coincidence — it's built into what humans ARE.",
    keywords: ["nature", "reason", "Aquinas", "flourishing", "universal", "objective"],
    category: "Moral Foundations",
  },
];
```

That's 12 concepts with distinct definitions, unique details, real mnemonics, categorized, and keyword-tagged. Each concept is genuinely different from every other concept. No two share the same definition text.

**Demo assignments (minimum 6):**

```typescript
const DEMO_ASSIGNMENTS = [
  {
    title: "Ethics Position Paper 1: Utilitarianism in Practice",
    type: "assignment",
    dueDate: Date.now() + 7 * 24 * 60 * 60 * 1000, // 1 week from now
    pointsPossible: 100,
    descriptionText: "Write a 1500-word paper analyzing a real-world ethical dilemma through the lens of utilitarianism. You must include both Bentham and Mill's perspectives, address at least one major objection, and cite 4 scholarly sources in APA format.",
    concepts: ["Utilitarianism", "Felicific Calculus", "Act vs Rule Utilitarianism", "Experience Machine"],
  },
  {
    title: "Week 3 Discussion: The Trolley Problem",
    type: "discussion",
    dueDate: Date.now() + 3 * 24 * 60 * 60 * 1000,
    pointsPossible: 25,
    descriptionText: "In 300 words minimum, explain what you would do in the classic trolley problem and why. Compare the utilitarian and deontological perspectives. Respond to at least 2 classmates with substantive replies of 100+ words.",
    concepts: ["Trolley Problem", "Utilitarianism", "Deontology"],
  },
  {
    title: "Kantian Ethics Analysis",
    type: "assignment",
    dueDate: Date.now() + 14 * 24 * 60 * 60 * 1000,
    pointsPossible: 100,
    descriptionText: "Apply Kant's categorical imperative to a contemporary ethical issue. Explain both formulations and show how they lead to the same conclusion. Address the strongest objection to Kant's approach.",
    concepts: ["Deontology", "Categorical Imperative"],
  },
  {
    title: "Week 5 Discussion: Cultural Relativism",
    type: "discussion",
    dueDate: Date.now() + 10 * 24 * 60 * 60 * 1000,
    pointsPossible: 25,
    descriptionText: "Is moral relativism a defensible position? Argue for or against using at least two examples. Consider the strongest objection to your position.",
    concepts: ["Moral Relativism", "Natural Law Theory"],
  },
  {
    title: "Midterm Quiz",
    type: "quiz",
    dueDate: Date.now() + 21 * 24 * 60 * 60 * 1000,
    pointsPossible: 50,
    descriptionText: "25 multiple choice questions covering Chapters 1-5. 60 minutes. One attempt.",
    concepts: ["Utilitarianism", "Deontology", "Virtue Ethics", "Categorical Imperative", "Social Contract Theory"],
  },
  {
    title: "Final Paper: Applied Ethics Case Study",
    type: "assignment",
    dueDate: Date.now() + 42 * 24 * 60 * 60 * 1000,
    pointsPossible: 200,
    descriptionText: "Choose a real-world ethical controversy and analyze it using at least three different ethical frameworks from the course. Your analysis must show genuine engagement with the strengths and limitations of each framework.",
    concepts: ["Utilitarianism", "Deontology", "Virtue Ethics", "Social Contract Theory", "Natural Law Theory"],
  },
];
```

**Demo progress (pre-set to show mastery differentiation):**

```typescript
const DEMO_PROGRESS = {
  "Utilitarianism": 0.82,
  "Deontology": 0.74,
  "Virtue Ethics": 0.61,
  "Categorical Imperative": 0.45,
  "Felicific Calculus": 0.38,
  "Doctrine of the Mean": 0.25,
  "Experience Machine": 0.15,
  "Act vs Rule Utilitarianism": 0.10,
  "Social Contract Theory": 0.05,
  "Moral Relativism": 0.0,
  "Trolley Problem": 0.0,
  "Natural Law Theory": 0.0,
};
```

This gives the concept map 4 distinct mastery tiers visible at a glance: gold, teal, cyan, and dim gray.

**Demo philosopher attributions (required for Oracle Panel):**

```typescript
const DEMO_ATTRIBUTIONS = [
  { thinker: "Jeremy Bentham", tradition: "utilitarianism", passages: [
    { text: "The greatest happiness of the greatest number is the foundation of morals and legislation.", page: 44 },
    { text: "Nature has placed mankind under the governance of two sovereign masters: pain and pleasure.", page: 43 },
    { text: "The quantity of pleasure being equal, pushpin is as good as poetry.", page: 46 },
  ]},
  { thinker: "John Stuart Mill", tradition: "utilitarianism", passages: [
    { text: "It is better to be a human being dissatisfied than a pig satisfied; better to be Socrates dissatisfied than a fool satisfied.", page: 51 },
    { text: "Actions are right in proportion as they tend to promote happiness, wrong as they tend to produce the reverse.", page: 49 },
    { text: "The sole evidence it is possible to produce that anything is desirable is that people actually desire it.", page: 53 },
  ]},
  { thinker: "Immanuel Kant", tradition: "deontology", passages: [
    { text: "Act only according to that maxim whereby you can at the same time will that it should become a universal law.", page: 62 },
    { text: "Treat humanity, whether in your own person or in the person of any other, never merely as a means to an end, but always at the same time as an end.", page: 64 },
    { text: "Two things fill the mind with ever new and increasing admiration: the starry heavens above me and the moral law within me.", page: 60 },
  ]},
  { thinker: "Aristotle", tradition: "virtue ethics", passages: [
    { text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", page: 78 },
    { text: "Virtue is a state of character concerned with choice, lying in a mean relative to us.", page: 80 },
    { text: "The function of man is to live a certain kind of life, and this activity implies a rational principle.", page: 76 },
  ]},
  { thinker: "Robert Nozick", tradition: "libertarianism", passages: [
    { text: "The experience machine shows that something matters to us in addition to experience — we want to actually do things, not just have the experience of doing them.", page: 92 },
  ]},
  { thinker: "John Rawls", tradition: "social contract", passages: [
    { text: "Justice is the first virtue of social institutions, as truth is of systems of thought.", page: 102 },
    { text: "No one knows his place in society, his class position or social status. This ensures that the principles of justice are chosen behind a veil of ignorance.", page: 104 },
  ]},
];
```

**This demo data is the difference between a judge saying "interesting concept" and "this actually works."**

### 1.2 Acceptance test for demo

Click "Experience the Demo." The dashboard shows 12 concepts with 4 visible mastery tiers. The concept map has 12 nodes with differentiated colors and sizes. The timeline shows 6 events spread across 6 weeks. The Oracle Panel shows 6 thinkers with real quotes. The Duel Arena produces differentiated arguments for each side. The Collision Lab produces real shared ground and tensions. No two features show identical text.

---

## 2. FIX THE DUEL ARENA — BOTH SIDES ARE IDENTICAL

### 2.1 What's wrong

Screenshot shows Round 1 Opening: virtue-ethics and deontology display the EXACT SAME paragraph. The dialogue synthesis engine is retrieving text by dumping ALL available content rather than retrieving PER-CONCEPT.

### 2.2 The fix

In `dialogue-synthesis.ts` (or wherever `buildDuelRound` lives), the round builder must retrieve SEPARATE passages for each side:

```typescript
function buildOpeningStatements(leftConcept: Concept, rightConcept: Concept): DuelRound {
  // CRITICAL: Each side gets its OWN concept's definition, NOT the same blob
  return {
    round: 1,
    type: 'opening',
    leftPosition: {
      speaker: leftConcept.name,
      content: leftConcept.core, // LEFT concept's definition
      source: `${leftConcept.category}`,
    },
    rightPosition: {
      speaker: rightConcept.name,
      content: rightConcept.core, // RIGHT concept's definition — DIFFERENT
      source: `${rightConcept.category}`,
    },
    judgmentPrompt: "Which opening statement presents a clearer ethical foundation?",
  };
}

function buildObjectionRound(attacker: Concept, defender: Concept, roundNum: number): DuelRound {
  // The ATTACKER challenges the DEFENDER using the defender's weaknesses
  const objection = findObjectionAgainst(defender);
  const defense = findDefenseOf(defender);
  
  return {
    round: roundNum,
    type: 'objection',
    leftPosition: {
      speaker: attacker.name,
      content: objection || `${attacker.name} challenges: if ${defender.name} is correct, how do you explain ${attacker.core.split('.')[0].toLowerCase()}?`,
      source: attacker.category,
    },
    rightPosition: {
      speaker: defender.name,
      content: defense || defender.detail,
      source: defender.category,
    },
    judgmentPrompt: `Which side made the stronger case in this exchange?`,
  };
}
```

**The validation rule:** Before rendering a DuelRound, check that `leftPosition.content !== rightPosition.content`. If they're identical, replace the right side with `rightConcept.detail` (the elaboration, which should differ from `core`). If THAT is also identical, show an honest empty state: "Insufficient differentiated content for this duel round."

### 2.3 Acceptance test

Start a duel between any two concepts. In every round, the left and right sides must show DIFFERENT text. The text must be attributable to the specific concept named in the header. No round may have identical text on both sides.

---

## 3. FIX THE ORACLE PANEL — IT'S EMPTY

### 3.1 What's wrong

The Oracle Panel says "waiting for clearly attributed thinkers in the imported source." But the demo data SHOULD include attributed thinkers. The attribution detection is failing because the demo content doesn't include the attribution patterns the Voice Attribution Engine is looking for.

### 3.2 The fix

The demo data must include the `DEMO_ATTRIBUTIONS` array from Section 1.2 above. The Oracle Panel must check BOTH the indexed textbook attributions AND the demo attribution data.

Additionally, hardcode a fallback for demo mode: if no attributions are found via the engine but demo mode is active, use `DEMO_ATTRIBUTIONS` directly.

```typescript
function getOracleResponses(question: string, concepts: Concept[], attributions: Attribution[]): OracleResponse[] {
  if (attributions.length === 0 && isDemoMode()) {
    attributions = DEMO_ATTRIBUTIONS.flatMap(a => 
      a.passages.map(p => ({
        thinker: a.thinker,
        tradition: a.tradition,
        text: p.text,
        page: p.page,
        confidence: 1.0,
      }))
    );
  }
  
  // Now proceed with normal retrieval...
}
```

### 3.3 Acceptance test

In demo mode, open Oracle Panel. Type any ethics question. At least 3 thinkers respond with real, differentiated quotes. Each response shows the thinker's name, tradition, and a real passage with page number.

---

## 4. FIX THE COLLISION LAB — KEYWORD DUMP INSTEAD OF SENTENCES

### 4.1 What's wrong

"Shared Ground" shows "Both engage with utilitarianism, framework, judges, actions, consequences" — that's a raw keyword intersection, not a sentence. "Historical Collisions" is truncated: "for everyone. A deontological answer can reject useful outcomes when those outcomes require violating a principle. Virtue ethics is the approach that asks what a person of good cha..." ending in "cha..."

### 4.2 The fix

**Shared Ground** must be full sentences:

```typescript
function buildSharedGround(a: Concept, b: Concept): string[] {
  const grounds: string[] = [];
  
  // Find shared keywords and build a SENTENCE from them
  const shared = a.keywords.filter(k => b.keywords.includes(k));
  if (shared.length > 0) {
    grounds.push(`Both ${a.name} and ${b.name} address questions of ${shared.slice(0, 3).join(', ')}.`);
  }
  
  // Check if they share a category or tradition
  if (a.category === b.category) {
    grounds.push(`Both belong to the ${a.category} tradition in ethics.`);
  }
  
  // Check for textual co-occurrence (do they appear in the same source sections?)
  // Build a real sentence, not a keyword list
  
  return grounds;
}
```

**Historical Collisions** must not truncate:

```typescript
function getHistoricalCollisions(a: Concept, b: Concept, passages: IndexedPassage[]): string[] {
  const collisions = passages
    .filter(p => 
      p.text.toLowerCase().includes(a.name.toLowerCase()) && 
      p.text.toLowerCase().includes(b.name.toLowerCase())
    )
    .map(p => {
      // Truncate cleanly at a sentence boundary, not mid-word
      const sentences = p.text.split(/(?<=[.!?])\s+/);
      const relevant = sentences.slice(0, 3).join(' '); // Max 3 sentences
      return { text: relevant, source: `Ethics Primer p. ${p.pageNumber || '?'}` };
    });
  
  return collisions;
}
```

**Never truncate mid-word.** If text must be shortened, cut at the nearest sentence boundary and add no ellipsis. If there's not enough text for even one complete sentence, show nothing for that section.

### 4.3 Acceptance test

Collide two concepts. "Shared Ground" shows complete English sentences (not keyword lists). "Tensions" shows actual conceptual differences (not repeated definitions). "Historical Collisions" shows complete sentences with source citations (no truncation mid-word). "Synthesis" names a bridging concept with explanation.

---

## 5. FIX NEURAL FORGE GENESIS — QUESTIONS ARE META-INSTRUCTIONS

### 5.1 What's wrong

The Genesis phase shows: "Before the label arrives, what is this source passage trying to help you notice?" with options "Follow the main move behind Virtue Ethics" / "Chase the loudest Canvas wording instead" / "Treat it as a vague reminder and move on."

These aren't dilemma choices. They're meta-instructions about how to read. A student would have no idea what to select because the options don't relate to any actual ethical content.

### 5.2 The fix

Genesis dilemmas must be ETHICAL SCENARIOS with framework-specific choices, not reading comprehension meta-questions.

```typescript
function generateGenesisDilemma(concepts: Concept[]): Dilemma {
  // Pick a scenario shell that relates to the available concepts
  const shells = [
    {
      scenario: "A hospital has one dose of a life-saving drug. Five patients will die without it, but so will one patient in another ward who arrived first. The drug can save all five OR the one, not both.",
      choices: [
        { text: "Give the drug to the five patients — saving more lives produces the greatest good", framework: "Utilitarianism", reasoning: "A utilitarian calculates: 5 lives > 1 life. The math is clear." },
        { text: "Give the drug to the patient who arrived first — they have a right to treatment they were promised", framework: "Deontology", reasoning: "A deontologist follows the rule: first come, first served. Breaking promises to patients violates their dignity." },
        { text: "Ask what a compassionate doctor with wisdom and integrity would do in this moment", framework: "Virtue Ethics", reasoning: "A virtue ethicist asks about character: what decision can the doctor live with? What would the best version of a doctor do?" },
      ],
    },
    {
      scenario: "You discover your best friend has been cheating on their final exams for the entire semester. They're about to graduate with honors. Reporting them would destroy their career. Staying silent means an honest student misses out on the honors they deserved.",
      choices: [
        { text: "Report them — the overall harm of tolerating cheating outweighs the harm to one friendship", framework: "Utilitarianism", reasoning: "The utilitarian weighs: systemic damage of unpunished cheating vs one person's career." },
        { text: "Report them — honesty is a duty regardless of consequences, and protecting cheaters violates fairness", framework: "Deontology", reasoning: "The deontologist follows the rule: cheating is wrong, and enabling it makes you complicit." },
        { text: "Talk to your friend first — a person of good character seeks to understand before acting and values both honesty and loyalty", framework: "Virtue Ethics", reasoning: "The virtue ethicist balances competing virtues: loyalty to a friend, commitment to truth, and practical wisdom about the best path." },
      ],
    },
    // ... at least 5 more shells
  ];
  
  // Select based on which concepts are available
  const shell = selectBestShell(shells, concepts);
  
  return {
    scenario: shell.scenario,
    question: "What would you do?",
    choices: shell.choices,
    insight: `Your choice reveals your ethical intuition. Each option maps to a major ethical framework from the course.`,
  };
}
```

**The key:** Each choice is a REAL ETHICAL POSITION a real person might genuinely hold. Not a meta-instruction about reading. Not a study strategy tip. An actual moral stance.

### 5.3 Acceptance test

Enter Neural Forge Genesis. See an ethical scenario (not a meta-reading question). Three choices appear, each representing a different ethical framework. Selecting any choice shows a reveal explaining which framework you used. The options are genuinely different positions, not reworded versions of the same advice.

---

## 6. FIX THE CONCEPT MAP — DUPLICATE DEFINITIONS

### 6.1 What's wrong

Clicking "Virtue Ethics" on the concept map shows:
- Core: "Virtue ethics is the approach that asks what a person of good character would do..."
- Detail: "Virtue ethics is the approach that asks what a person of good character would do..." (SAME TEXT)
- Mnemonic: "Picture virtue, ethics, and utilitarianism on the same desk. That cluster is Virtue Ethics." (meaningless)
- Warning: "The easy mistake is to keep Virtue Ethics as a title and lose the actual claim it makes." (meta-text, not a learning aid)

### 6.2 The fix

**Detail MUST differ from core.** Add validation:

```typescript
function validateConceptFields(concept: Concept): Concept {
  // If detail is identical to core, replace with empty string
  if (concept.detail === concept.core) {
    concept.detail = '';
  }
  
  // If detail is a substring of core, replace with empty string
  if (concept.core.includes(concept.detail) || concept.detail.includes(concept.core)) {
    concept.detail = '';
  }
  
  // If mnemonic doesn't contain a memory hook, replace with empty string
  const hasMemoryAnchor = /picture|imagine|think of|like|remember|is NOT|rhymes|acronym/i.test(concept.mnemonic);
  if (!hasMemoryAnchor) {
    concept.mnemonic = '';
  }
  
  // Strip meta-commentary ("The easy mistake is to...", "becomes unstable when...")
  if (/easy mistake|becomes unstable|keep .+ as a title/i.test(concept.mnemonic)) {
    concept.mnemonic = '';
  }
  
  return concept;
}
```

**For demo mode:** Use the hand-crafted concepts from Section 1.1 which have distinct core, detail, and mnemonic fields.

### 6.3 Acceptance test

Click any concept on the concept map. The core and detail fields show DIFFERENT text. The mnemonic contains a real memory anchor (picture, imagine, think of, etc.) or is hidden entirely. No meta-commentary appears ("The easy mistake is...").

---

## 7. FIX THE TIMELINE — STILL VERTICAL AND TINY

### 7.1 What's wrong

The timeline is vertical, left-aligned, showing 3 events in a single column. It should be a full-screen horizontal scroll landscape.

### 7.2 The fix

Refer to Section 2 of `AEONTHRA_GRAND_SCALE.md` — the timeline was fully specified there with CSS, interaction model, and layout. The current implementation ignored those specs. Rebuild the TimelineBoard component as a horizontal scrolling track.

**Minimum changes needed:**
1. Change the container to `display: flex; flex-direction: row; overflow-x: auto;`
2. Each week is a `flex: 0 0 320px` column
3. Events stack vertically WITHIN their week column
4. The entire track scrolls horizontally
5. A glowing cyan TODAY line spans the full height at the appropriate position
6. Event cards are at least 140px wide × 100px tall

If this can't be done quickly, at MINIMUM expand the vertical timeline to use the full viewport width instead of being crammed into a left-column widget.

### 7.3 Acceptance test

Navigate to Timeline. Events are arranged horizontally by week (or at minimum fill the full viewport). Each event card is large enough to read the title and date without squinting. A visual indicator marks the current date.

---

## 8. FIX THE GRAVITY FIELD — ASSIGNMENTS DON'T ORBIT

### 8.1 What's wrong

Gravity Field shows 3 concept orbs and 2 tiny squares, but the squares don't orbit. They just float near the concepts. The inspector works (shows mastery 82%, mass 0.93, dependent assignments) but the physics simulation isn't producing orbital motion.

### 8.2 The fix

The physics loop needs actual orbital velocity applied to each assignment:

```typescript
function initializeOrbits(conceptBodies: Body[], assignmentBodies: Body[]) {
  for (const assignment of assignmentBodies) {
    const homeConcept = findHomeConcept(assignment, conceptBodies);
    if (!homeConcept) continue;
    
    const dx = assignment.position.x - homeConcept.position.x;
    const dy = assignment.position.y - homeConcept.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Set tangential velocity for circular orbit
    const orbitalSpeed = Math.sqrt(GRAVITY_CONSTANT * homeConcept.mass / distance);
    
    // Perpendicular to the radius vector
    assignment.velocity.x = -(dy / distance) * orbitalSpeed;
    assignment.velocity.y = (dx / distance) * orbitalSpeed;
  }
}
```

Also: assignment bodies should be rendered as small labeled circles (not invisible squares), with a trail showing their orbital path.

### 8.3 Acceptance test

Open Gravity Field. Assignment bodies visibly orbit around their home concept bodies. The orbit is circular or elliptical, not static. Concepts with lower mastery have weaker gravity (assignments orbit further out or wobble).

---

## 9. FIX THE EXTENSION — STILL SHOWS MV3 ERROR

### 9.1 What's wrong

Screenshot 11 shows: "A listener indicated an asynchronous response by returning true, but the message channel closed before a response was received." The fix Codex applied still isn't catching all error paths.

### 9.2 The fix

Wrap the ENTIRE popup state fetch in a try/catch that converts ANY Chrome runtime error into a clean status:

```typescript
async function getExtensionState(): Promise<ExtensionState> {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_STATE' });
    if (response?.ok) return response.state;
    return { status: 'error', message: response?.message || 'Unknown error' };
  } catch (error: any) {
    // This catches ALL Chrome MV3 messaging failures
    const msg = error?.message || String(error);
    
    if (msg.includes('message channel closed') || msg.includes('Receiving end does not exist')) {
      return { status: 'idle', message: 'Extension is loading. Refresh and try again.' };
    }
    
    return { status: 'error', message: 'Extension communication failed. Try reloading the extension.' };
  }
}
```

And in the popup, the error display should be styled as a gentle info card, not a raw error dump:

```tsx
{state.status === 'error' && (
  <div className="info-card">
    <p className="info-card__text">{state.message}</p>
    <button className="btn btn-ghost" onClick={() => window.location.reload()}>
      RETRY
    </button>
  </div>
)}
```

### 9.3 Acceptance test

Open the extension popup. It should NEVER show raw Chrome error messages. If the service worker is loading, show "Loading..." with a spinner. If communication fails, show "Extension is loading. Refresh and try again." with a RETRY button.

---

## 10. THE DEFINITIVE ACCEPTANCE TEST

Before declaring any of these fixes complete, run through this exact sequence:

1. **Open the app.** Click "Experience the Demo." Dashboard loads with 12 concepts and 6 assignments. Mastery levels show 4 distinct colors on the concept field.

2. **Open Concept Map.** 12 nodes visible with differentiated sizes and colors. Click any node — core and detail show DIFFERENT text. Mnemonic is a real memory hook or hidden.

3. **Open Timeline.** 6 events visible, spread across multiple weeks. Events are large enough to read. Time flows left to right (horizontal) or at minimum fills the full viewport width.

4. **Open Neural Forge.** Genesis shows an ethical SCENARIO (not a meta-reading question). Three choices represent three different frameworks. Selecting one shows a reveal.

5. **Open Oracle Panel.** Type "Is lying ever justified?" At least 3 thinkers respond with DIFFERENT quotes. Each response has a page number.

6. **Open Collision Lab.** Collide Utilitarianism with Deontology. Shared Ground shows complete sentences. Tensions shows real differences. Neither section is a keyword dump. Historical Collisions is not truncated mid-word.

7. **Open Duel Arena.** Start a duel between any two concepts. Round 1: left and right sides show DIFFERENT text specific to each concept. Round 2+: objections and responses are differentiated.

8. **Open Gravity Field.** 12 concept orbs visible with mastery-based colors and sizes. Assignment bodies orbit (not float statically).

9. **Open Extension popup.** No raw Chrome error messages. Shows "Loading..." or course detection status or "Open a Canvas course."

**If ANY step fails, you are not done. Fix the failing step before moving on.**

---

## 11. THE REAL PROBLEM, ONE LAST TIME

Codex, you are a builder. You built every feature I asked for. The nav pills exist. The views render. The components mount. That's real work and I acknowledge it.

But you are filling features with recycled text instead of differentiated content. A Duel Arena where both sides say the same thing is worse than no Duel Arena at all, because it makes the student think the app is broken. A Collision Lab that dumps keywords instead of sentences makes the student think the engine is stupid. An Oracle Panel that's empty makes the student think nothing works.

**The difference between a demo and a product is: a demo shows that features exist. A product shows that features WORK.** Right now every feature exists. None of them work.

Making them work means: every slot that needs unique content gets unique content. Every slot that can't get unique content honestly shows nothing instead of duplicating. Every generated sentence is complete (no truncation mid-word). Every comparison shows two genuinely different things (not the same thing twice).

That's the bar. Hit it. Then we win.
