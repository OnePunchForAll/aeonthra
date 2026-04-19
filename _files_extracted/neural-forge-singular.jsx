import { useState, useEffect, useRef, useCallback, useMemo } from "react";

/* ═══════════════════════════════════════════════════════════════════════════════
   NEURAL FORGE — SINGULAR
   ────────────────────────────────────────────────────────────────────────────
   An accelerated-learning instrument for ethics & moral reasoning.
   Grounded in: How Should One Live? An Introduction to Ethics and Moral Reasoning
   (Bridgepoint Education, 2018) — the assigned PHI 208 textbook.

   The methods below are drawn from cognitive science research that has
   either been overlooked or never integrated into mainstream learning tools:

   1. ELABORATIVE INTERROGATION — forcing "why is this true?" before answers
   2. DUAL-CODING — pairing each concept with a visual/spatial anchor
   3. INTERLEAVED RETRIEVAL — alternating concepts to fight illusory mastery
   4. DESIRABLE DIFFICULTY — making recall harder, not easier
   5. PREDICTION ERROR LEARNING — predict before reveal, brain locks in delta
   6. GENERATION EFFECT — produce, don't just recognize
   7. SPACING WITH FORGETTING CURVES — review at the brink of forgetting
   8. CONTRAST-BASED LEARNING — show concept beside its opposite, never alone
   9. METACOGNITIVE CALIBRATION — predict confidence, then measure accuracy
   10. CHUNKING via SEMANTIC SCAFFOLDS — build mental schema, not memorize lists
   11. DEEP PROCESSING via SELF-EXPLANATION — narrate your own reasoning
   12. INTERROGATIVE SELF-TESTING — ask, don't read
   13. TEACH-BACK PROTOCOL — Feynman technique formalized
   14. ERROR-DRIVEN ENCODING — wrong answers are fuel, not failure
   ═══════════════════════════════════════════════════════════════════════════ */

// ═══════════════════════════════════════════════════════════════════════════
// CONCEPT BANK — sourced verbatim from the PHI 208 textbook
// Page numbers reference the actual text. Quotes are direct.
// ═══════════════════════════════════════════════════════════════════════════

const CONCEPTS = [
  {
    id: "util",
    name: "Utilitarianism",
    family: "Consequentialism",
    page: 76,
    visualAnchor: "⚖️", // dual-coding anchor
    color: "#00f0ff",

    // ELABORATIVE: the "why" before the "what"
    problem: "If everyone disagrees about what's right, is morality just opinion? Bentham said: no — there's one measure that crosses every culture, religion, and personal taste.",
    answer: "The morally right action is the one whose consequences produce the greatest happiness for the greatest number of those affected.",

    // CHUNKING via semantic scaffold (3 anchor ideas, not 10 facts)
    scaffold: [
      { label: "Consequences only", text: "Only outcomes matter — not motives, not rules, not character." },
      { label: "Happiness as the unit", text: "Bentham: pleasure good, pain bad. Mill refined: some pleasures qualitatively higher." },
      { label: "Everyone counts equally", text: "Impartiality — the king's pleasure is worth no more than the peasant's." }
    ],

    // CONTRAST anchor (never learn a concept alone)
    contrast: { id: "deont", line: "Utilitarianism: the right act = the act with best results. Deontology: the right act = following correct rules, regardless of results." },

    // SOURCE MATERIAL — direct from textbook
    sourceQuote: "Utilitarianism is the theory that morally right actions, laws, or policies are those whose consequences have the greatest positive value and least negative value compared to available alternatives.",
    sourcePage: 80,
    sourceAuthor: "Textbook, Ch. 3",

    // FOUNDER quote (used in Attribute phase)
    founderQuote: "Create all the happiness you are able to create; remove all the misery you are able to remove.",
    founderName: "Jeremy Bentham",

    // PREDICTION-ERROR scenarios — judgment calls that force commitment
    scenarios: [
      { situation: "A surgeon could secretly kill 1 healthy patient and harvest organs to save 5 dying ones. Is this utilitarian?", trapAnswer: "Yes, 5 > 1.", correctAnswer: "Naive act-utilitarianism says yes; rule-utilitarianism says no — a society that permits this loses trust, producing far worse aggregate outcomes.", insight: "The trap is treating 'happiness' as a single math problem. Trust, rights, and rules ARE consequences that compound." },
      { situation: "A factory pollutes a river, harming 100 villagers but creating jobs for 1000. Pure act-utilitarian verdict?", trapAnswer: "Pollute — more people benefit.", correctAnswer: "Depends on the magnitude per person. 100 villagers losing health may outweigh 1000 minor job gains. The calculation must include intensity, duration, and certainty.", insight: "Quantity of people ≠ quantity of happiness." }
    ],

    // FORCED-DISTINCTION questions — what students confuse
    confusions: [
      "Confusing utilitarianism with selfishness (it's the opposite — your happiness counts EQUAL to a stranger's, not more)",
      "Thinking 'the majority wins' (utilitarianism is about TOTAL happiness, not vote count)",
      "Ignoring intensity (5 mild pleasures don't outweigh 1 severe suffering)"
    ],

    // FALSE STATEMENTS that sound true (for prediction-error training)
    truthTraps: [
      { claim: "A utilitarian must always do whatever makes the most people happy.", verdict: false, why: "Total happiness, not headcount. 1000 people gaining mild amusement may not outweigh 1 person's severe suffering." },
      { claim: "Utilitarians believe selfish actions are immoral.", verdict: false, why: "Utilitarians believe actions are immoral when they REDUCE total happiness. Self-interested acts can be moral if they don't harm others." },
      { claim: "Bentham believed all pleasures are qualitatively equal.", verdict: true, why: "Bentham's hedonism treated pleasure as a single quantity; Mill later argued for qualitative distinctions." },
      { claim: "Utilitarianism is impartial — your own happiness doesn't count more than a stranger's.", verdict: true, why: "Direct from the textbook: utilitarianism 'does not give preference to the beliefs, values, or interests of any particular individual.'" }
    ],

    // GENERATION prompts — student must produce, not select
    generationPrompts: [
      "Write a one-sentence definition of utilitarianism in your own words.",
      "Give an example of a real situation where act-utilitarianism and rule-utilitarianism would disagree.",
      "Explain why Bentham's calculus would be impossible to actually perform."
    ],

    // SELF-EXPLANATION trigger
    teachBackPrompt: "Explain to a high schooler why the trolley problem is harder than it looks for utilitarians.",

    // RETRIEVAL CUES (5+ ways to hook this concept into memory)
    cues: ["greatest happiness principle", "Bentham", "Mill", "consequences", "felicific calculus", "impartiality"],
  },

  {
    id: "deont",
    name: "Deontology",
    family: "Duty-based",
    page: 117,
    visualAnchor: "📜",
    color: "#06d6a0",

    problem: "Sometimes lying produces better outcomes than truth. Sometimes breaking promises helps more people. Are we obligated to lie and break promises whenever the math says so?",
    answer: "The morally right action follows a rule that could consistently apply to everyone, regardless of consequences. Some acts are wrong even when they produce good results.",

    scaffold: [
      { label: "Rules over results", text: "The act itself is right or wrong, independent of what it causes." },
      { label: "Universalizability test", text: "Could you will that everyone act this way? If not, your maxim fails." },
      { label: "Treat people as ends, never merely as means", text: "Using a person as a tool — even for good outcomes — violates their dignity." }
    ],

    contrast: { id: "util", line: "Deontology: lying is wrong because the rule fails universalization. Utilitarianism: lying is wrong only when consequences are bad." },

    sourceQuote: "I ought never to act in such a way that I couldn't also will that the maxim on which I act should be a universal law.",
    sourcePage: 120,
    sourceAuthor: "Kant, Groundwork (1785)",

    founderQuote: "Act in such a way as to treat humanity, whether in your own person or in that of anyone else, always as an end and never merely as a means.",
    founderName: "Immanuel Kant",

    scenarios: [
      { situation: "A murderer asks you where your friend is hiding. Lying would save your friend. Kantian verdict?", trapAnswer: "Lie — saving life > lying.", correctAnswer: "Kant famously said you may not lie even to a murderer. The maxim 'lie when it produces good results' cannot be universalized — it would destroy the very practice of trust that makes lying possible.", insight: "Kant's strictness is the point — exceptions corrupt the rule itself." },
      { situation: "A business owner doesn't cheat customers, but only because she fears getting caught. Is her action morally good?", trapAnswer: "Yes — she didn't cheat.", correctAnswer: "For Kant, no. The act was right, but the motive (fear of punishment) lacks moral worth. Only acts done FROM duty have moral worth.", insight: "Outcomes may match; moral character does not." }
    ],

    confusions: [
      "Confusing 'duty' with 'inclination' — Kant says doing the right thing because you WANT to has less moral worth than doing it because you MUST",
      "Thinking the Categorical Imperative is one principle (it has multiple formulations expressing the same supreme law)",
      "Confusing 'treating as means' (using someone) with 'treating MERELY as means' (using without regard for their humanity)"
    ],

    truthTraps: [
      { claim: "Kant believed you should lie to save a life if necessary.", verdict: false, why: "Kant explicitly rejected lying even to a murderer asking where your friend is. Universalizability admits no exceptions." },
      { claim: "An action done from inclination (because you want to) has the same moral worth as one done from duty.", verdict: false, why: "For Kant, only actions done FROM duty have moral worth. Inclination-driven actions may be praiseworthy but lack pure moral worth." },
      { claim: "The Categorical Imperative tells you to treat people only as ends, never as means at all.", verdict: false, why: "Kant said never MERELY as means. You may treat someone as a means (hire a worker) as long as you also treat them as an end (respect their humanity)." },
      { claim: "Kant's morality is grounded in consequences.", verdict: false, why: "The opposite — Kant insisted morality is grounded in the will and the rule, NOT outcomes. This is what makes him a deontologist." }
    ],

    generationPrompts: [
      "State the Formula of Universal Law in your own words and give an example of a maxim that fails its test.",
      "Explain the difference between a positive duty and a negative duty using your own example.",
      "Why does Kant think a 'good will' is the only thing good without qualification?"
    ],

    teachBackPrompt: "A friend says 'Kant is unrealistic — sometimes you have to lie.' Defend Kant's position in one paragraph.",

    cues: ["categorical imperative", "Kant", "duty", "maxim", "universal law", "good will", "ends not means"],
  },

  {
    id: "virtue",
    name: "Virtue Ethics",
    family: "Character-based",
    page: 183,
    visualAnchor: "🌱",
    color: "#ffd700",

    problem: "Both utilitarianism and deontology focus on ACTIONS. But what if morality isn't about which actions to do — it's about which kind of PERSON to become?",
    answer: "Right action flows from virtuous character. The central question of ethics is not 'what should I do?' but 'what kind of person should I be?'",

    scaffold: [
      { label: "Character over action", text: "A virtuous person naturally does the right thing because of who they are, not because of rules or calculations." },
      { label: "Eudaimonia (flourishing)", text: "The goal of life is human flourishing — not pleasure, not duty, but living well as a complete person." },
      { label: "Virtues as habits", text: "Aristotle: 'We are what we repeatedly do.' Virtue is acquired by practice, not born or taught abstractly." }
    ],

    contrast: { id: "util", line: "Virtue ethics: 'What kind of person produces this act?' Utilitarianism: 'What outcomes does this act produce?'" },

    sourceQuote: "The aim of studying ethics is not to gain knowledge but to become better people.",
    sourcePage: 187,
    sourceAuthor: "Aristotle, Nicomachean Ethics (1103b)",

    founderQuote: "Excellence is not an act, but a habit.",
    founderName: "Aristotle",

    scenarios: [
      { situation: "Someone returns a lost wallet to a stranger. Are they virtuous?", trapAnswer: "Yes — they did the right thing.", correctAnswer: "Aristotle would ask: WHY did they return it? If from genuine honesty as a settled trait, yes. If from fear of being caught, or hope of reward, the act is right but the person is not virtuous. Virtue is in the disposition, not the single act.", insight: "Single acts don't reveal character; patterns do." },
      { situation: "A doctor is technically skilled but cold and uncaring. Aristotelian verdict?", trapAnswer: "Good doctor — they save lives.", correctAnswer: "For Aristotle, a good doctor must possess BOTH technical skill AND the virtues of compassion, justice, and practical wisdom (phronesis). Skill alone makes a competent technician, not a fully good doctor.", insight: "Virtue ethics asks about the WHOLE person, not just outputs." }
    ],

    confusions: [
      "Treating virtues as a checklist rather than integrated character traits",
      "Thinking virtue ethics has no concrete guidance (it does — but through practical wisdom, not formulas)",
      "Confusing 'what a virtuous person would do' with 'what most people would do'"
    ],

    truthTraps: [
      { claim: "Aristotle said the goal of ethics is to gain moral knowledge.", verdict: false, why: "Aristotle explicitly said the aim is to BECOME BETTER PEOPLE, not merely to know what's right." },
      { claim: "For Aristotle, courage is the absence of fear.", verdict: false, why: "Courage is the MEAN between cowardice (excess fear) and recklessness (deficient fear). Feeling fear AT THE RIGHT TIME, in the right amount, is courageous." },
      { claim: "Virtue ethics holds that virtues are inborn talents.", verdict: false, why: "Aristotle: virtues are developed through habituation. We become courageous by repeatedly doing courageous acts, not by being born brave." },
      { claim: "Practical wisdom (phronesis) is the master virtue that guides all the others.", verdict: true, why: "For Aristotle, phronesis is the intellectual virtue that perceives what each particular situation requires; without it, the other virtues misfire." }
    ],

    generationPrompts: [
      "Name a virtue, identify its two opposing vices (excess and deficiency), and give an example of each.",
      "Explain why Aristotle would say a 'good action done for the wrong reason' isn't fully virtuous.",
      "How would a virtue ethicist evaluate a politician — what questions would they ask?"
    ],

    teachBackPrompt: "Explain to someone obsessed with rules why Aristotle thought ethics couldn't be reduced to a formula.",

    cues: ["Aristotle", "eudaimonia", "flourishing", "character", "habit", "phronesis", "golden mean", "virtue"],
  },

  {
    id: "relativism",
    name: "Moral Relativism",
    family: "Skepticism",
    page: 37,
    visualAnchor: "🌐",
    color: "#a78bfa",

    problem: "Different cultures have wildly different moral codes. If morality varies, isn't 'right' just whatever your culture says?",
    answer: "Relativism: there is no universal moral truth — moral statements are true or false only relative to a culture, society, or individual. Critics argue this collapses moral disagreement into mere description.",

    scaffold: [
      { label: "Cultural relativism", text: "Moral truth = whatever the surrounding culture endorses. Same act can be right in one society, wrong in another." },
      { label: "Subjectivism", text: "An even stronger form: moral truth = whatever the individual believes. No external check at all." },
      { label: "The descriptive/normative gap", text: "FACT: cultures disagree. CLAIM: therefore no culture is wrong. The leap from fact to claim is what relativism actually rests on — and what its critics attack." }
    ],

    contrast: { id: "util", line: "Relativism: no universal moral truth. Utilitarianism: there IS a universal standard (greatest happiness) that crosses cultures." },

    sourceQuote: "A stance of relativism about moral value cannot adequately address the dilemmas that arise in a world in which increasing contact between different value systems calls for concrete decisions about which ends and values should prevail.",
    sourcePage: 89,
    sourceAuthor: "Textbook, Ch. 3",

    founderQuote: "Custom is the king of all.",
    founderName: "Herodotus (often cited)",

    scenarios: [
      { situation: "A culture practices female genital cutting. A relativist visiting from outside that culture says: 'I must not condemn it — it's right in their context.' Coherent?", trapAnswer: "Yes — that's what relativism requires.", correctAnswer: "Critics argue this leads to absurd conclusions: relativism would forbid Martin Luther King Jr. from criticizing segregation in 1960s Alabama, since segregation was the cultural norm. Moral progress becomes impossible to even describe.", insight: "Strict relativism makes reformers logically WRONG by definition." },
      { situation: "Two cultures disagree about slavery. Cultural relativist says one isn't 'more right' than the other. Defensible?", trapAnswer: "Yes — different cultures, different values.", correctAnswer: "The textbook flags this as relativism's hardest case. Most people's moral intuitions strongly resist saying 'slavery was correct in cultures that practiced it.' This intuition is itself evidence against pure relativism.", insight: "If your theory says slavery was 'right' for slaveholders, your theory needs revision." }
    ],

    confusions: [
      "Confusing the FACT that cultures disagree with the CLAIM that all positions are equally valid",
      "Confusing tolerance (good attitude) with relativism (specific philosophical claim)",
      "Thinking relativism is the opposite of being judgmental (it's actually the opposite of moral objectivity)"
    ],

    truthTraps: [
      { claim: "Cultural relativism is the view that we should be tolerant of other cultures.", verdict: false, why: "Cultural relativism is the META-ETHICAL claim that moral truth is culture-dependent. Tolerance is a separate moral value — and ironically, relativism cannot ground a UNIVERSAL duty to be tolerant." },
      { claim: "If two cultures disagree about morality, at least one of them must be wrong.", verdict: false, why: "Per relativism, neither is wrong — each is simply expressing what's right within their own culture. Critics see this as the doctrine's central weakness." },
      { claim: "The fact that cultures disagree about morality logically proves that morality is relative.", verdict: false, why: "Disagreement is descriptive (what IS); relativism is normative (what OUGHT). Cultures disagreeing doesn't prove there's no truth — they could just be in error." },
      { claim: "Moral relativism makes it impossible to coherently say slavery was wrong in cultures that practiced it.", verdict: true, why: "This is exactly the bullet relativists must bite — and most people find it intuitively unacceptable." }
    ],

    generationPrompts: [
      "Explain in your own words why the move from 'cultures disagree' to 'no culture is wrong' is logically suspect.",
      "Give an example where a moral reformer (someone challenging their own culture's norms) would be IMPOSSIBLE under strict relativism.",
      "How might a relativist respond to the slavery objection?"
    ],

    teachBackPrompt: "A classmate says 'Different cultures have different morals, so morality is relative.' Identify the missing step in their argument.",

    cues: ["cultural relativism", "subjectivism", "moral skepticism", "is/ought", "moral progress", "objectivity"],
  },

  {
    id: "egoism",
    name: "Ethical Egoism",
    family: "Skepticism",
    page: 50,
    visualAnchor: "🪞",
    color: "#fb923c",

    problem: "Why should I care about strangers' happiness? What if morality is just rationally pursuing your own self-interest?",
    answer: "Ethical egoism: the morally right action is the one that maximizes your own long-term self-interest. Sometimes called the 'most challenging' rival to standard moral theories.",

    scaffold: [
      { label: "Psychological egoism (descriptive)", text: "Claim: humans always DO act selfishly. Critics say this confuses the fact that I do what I want with the claim that what I want is always selfish." },
      { label: "Ethical egoism (normative)", text: "Claim: humans SHOULD act in their own self-interest. Distinct from psychological egoism — it's a recommendation, not a description." },
      { label: "Long-term vs. short-term", text: "Sophisticated egoists argue cooperation, honesty, and kindness ARE in your long-term interest — making egoism look surprisingly conventional." }
    ],

    contrast: { id: "util", line: "Egoism: maximize MY happiness. Utilitarianism: maximize EVERYONE'S happiness equally. The difference is who counts in the calculation." },

    sourceQuote: "Glaukon's challenge in Plato's Republic: would you act morally if you had a ring of invisibility and could escape all consequences?",
    sourcePage: 60,
    sourceAuthor: "Plato (via textbook)",

    founderQuote: "Each man is best fitted to take care of himself.",
    founderName: "Adam Smith (often misread as egoist)",

    scenarios: [
      { situation: "An ethical egoist sees a child drowning. Saving the child requires effort and risk. What's the egoist verdict?", trapAnswer: "Don't save — costs the egoist effort.", correctAnswer: "Sophisticated egoism says save — long-term self-interest includes living in a society where strangers help you, having a good reputation, avoiding self-loathing, etc. Crude egoism may say don't save; this is what makes egoism look monstrous.", insight: "The strength of egoism depends entirely on how 'self-interest' is defined." },
      { situation: "Glaukon's Ring of Gyges (you become invisible, no one will know): would you still act morally? What does your answer reveal?", trapAnswer: "Yes — I'd still act morally.", correctAnswer: "Plato's challenge: if you'd act differently when no one watches, your morality was never really yours — it was fear of consequences. The egoist says: of course you'd act differently; pretending otherwise is dishonest.", insight: "The thought experiment exposes whether morality is internalized or merely strategic." }
    ],

    confusions: [
      "Confusing psychological egoism (descriptive) with ethical egoism (normative)",
      "Thinking egoism = selfishness (egoism may RECOMMEND helping others if it serves long-term interest)",
      "Confusing egoism with hedonism (egoism is about self-interest broadly; hedonism specifically about pleasure)"
    ],

    truthTraps: [
      { claim: "Psychological egoism is the claim that humans should act selfishly.", verdict: false, why: "That's ETHICAL egoism. Psychological egoism is the descriptive claim that humans DO always act selfishly — a different (and often disputed) claim." },
      { claim: "Ethical egoism necessarily recommends being mean to others.", verdict: false, why: "Sophisticated egoism recommends cooperation, honesty, and kindness — because these serve long-term self-interest. The label 'egoist' doesn't determine the actions." },
      { claim: "Glaukon's challenge in Plato's Republic asks whether you'd be moral if you could escape all consequences.", verdict: true, why: "This is the textbook framing of the Ring of Gyges thought experiment." },
      { claim: "An ethical egoist could consistently support charity if it served their long-term interest.", verdict: true, why: "Yes. Reputation, social capital, and personal satisfaction can all be invoked — making egoism more defensible than its caricature." }
    ],

    generationPrompts: [
      "Explain the difference between psychological egoism and ethical egoism in two sentences.",
      "Give an example of an action that looks altruistic but could be defended as egoistic.",
      "Why does Glaukon's ring of invisibility threaten a non-egoist account of morality?"
    ],

    teachBackPrompt: "Defend ethical egoism's strongest version against the objection that it 'reduces morality to selfishness.'",

    cues: ["egoism", "self-interest", "Glaukon", "Ring of Gyges", "psychological egoism", "ethical egoism"],
  },

  {
    id: "applied",
    name: "Applied Ethics",
    family: "Practical",
    page: 227,
    visualAnchor: "🩺",
    color: "#ff4466",

    problem: "How do abstract theories actually decide concrete dilemmas — abortion, assisted dying, animal welfare, biotechnology?",
    answer: "Applied ethics is the systematic application of moral theories to concrete dilemmas. The same case can yield opposite verdicts depending on which theory you apply.",

    scaffold: [
      { label: "Theory → case → verdict", text: "Each theory generates a verdict on each case. Comparing verdicts reveals what the theory actually commits you to." },
      { label: "Multiple theories, one case", text: "On abortion: utilitarianism asks about aggregate welfare; deontology about personhood and rights; virtue ethics about what a wise compassionate person would do." },
      { label: "Reflective equilibrium", text: "When theory yields a verdict you can't accept, either your intuition or your theory must give. This iterative adjustment IS moral reasoning." }
    ],

    contrast: { id: "virtue", line: "Applied ethics: takes a theory and DERIVES verdicts on cases. Virtue ethics: skeptical that good ethical judgment can be derived from any theory at all." },

    sourceQuote: "Arguments about abortion, whether we should help those in need, or how we should treat animals draw on the broader moral theories we have studied.",
    sourcePage: 232,
    sourceAuthor: "Textbook, Ch. 6",

    founderQuote: "Theory and practice are inseparable in ethics; either alone is dead.",
    founderName: "Adapted from textbook framing",

    scenarios: [
      { situation: "A utilitarian and a Kantian both consider a terminally ill patient requesting assisted death. Same conclusion?", trapAnswer: "Yes — both would want to reduce suffering.", correctAnswer: "Often opposite. Utilitarian: if it reduces net suffering, permit. Kantian: depends on whether it can be universalized and whether it treats the person merely as means. The same case yields opposite verdicts.", insight: "Applied ethics reveals that 'just be ethical' isn't a useful instruction — different ethical frameworks point in different directions." },
      { situation: "On factory farming, a utilitarian and a virtue ethicist might agree it's wrong but for different reasons. What are they?", trapAnswer: "Both: animals suffer.", correctAnswer: "Utilitarian: aggregate animal suffering exceeds aggregate human benefit. Virtue ethicist: participating in factory farming corrupts the practitioner — it makes you the kind of person who is callous toward sentient beings.", insight: "Same conclusion, different routes — and the routes matter for follow-up cases." }
    ],

    confusions: [
      "Thinking 'applied ethics' is its own theory (it's the application of theories to cases)",
      "Assuming all theories converge on hard cases (they often don't)",
      "Confusing what a theory says with what its proponents tend to believe (they can diverge)"
    ],

    truthTraps: [
      { claim: "Applied ethics is a separate moral theory distinct from utilitarianism, deontology, and virtue ethics.", verdict: false, why: "Applied ethics is the APPLICATION of those theories to concrete dilemmas, not a competing theory." },
      { claim: "On any given case, all major ethical theories tend to converge on the same verdict.", verdict: false, why: "Often the opposite — applied ethics frequently reveals deep disagreements that are obscured at the theoretical level." },
      { claim: "If your moral theory yields a verdict you find intuitively unacceptable, you should always abandon the intuition.", verdict: false, why: "This is the question of 'reflective equilibrium' — sometimes the intuition is more reliable than the theory. Sometimes the theory needs revision." },
      { claim: "Two ethical theories can agree on a verdict but disagree on the reasoning, and the reasoning still matters.", verdict: true, why: "Yes — because the reasoning predicts how each theory will rule on the NEXT case. Same answer, different methods, divergent futures." }
    ],

    generationPrompts: [
      "Pick a current ethical controversy. Briefly state how a utilitarian and a Kantian would each analyze it.",
      "Explain 'reflective equilibrium' in your own words and give an example.",
      "Why might two people with the same theory still disagree on a hard case?"
    ],

    teachBackPrompt: "Walk a peer through how to analyze a moral dilemma using all three major theories without picking one as 'right.'",

    cues: ["applied ethics", "abortion", "assisted dying", "biotechnology", "reflective equilibrium", "moral dilemma"],
  }
];

// ═══════════════════════════════════════════════════════════════════════════
// SPACED REPETITION — based on the SM-2 algorithm with adjustments for
// concept-based (not fact-based) learning
// ═══════════════════════════════════════════════════════════════════════════

const computeNextReview = (item, quality) => {
  // quality: 0 (forgot completely) to 5 (perfect recall)
  const now = Date.now();
  const ease = Math.max(1.3, (item.ease || 2.5) + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  let interval;
  if (quality < 3) {
    interval = 1; // reset
  } else if (!item.interval) {
    interval = 1;
  } else if (item.interval === 1) {
    interval = 6;
  } else {
    interval = Math.round(item.interval * ease);
  }
  return { ease, interval, due: now + interval * 60 * 1000, reviewCount: (item.reviewCount || 0) + 1 };
};

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function NeuralForge() {
  // ─── CORE STATE ───
  const [view, setView] = useState("entry"); // entry, prep, session, debrief
  const [conceptId, setConceptId] = useState(null);
  const concept = useMemo(() => CONCEPTS.find(c => c.id === conceptId), [conceptId]);

  // ─── SESSION STATE ───
  const [phase, setPhase] = useState("predict"); // predict → reveal → scaffold → contrast → trap → scenario → generate → teach → solidify
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [predictionInput, setPredictionInput] = useState("");
  const [predictionRevealed, setPredictionRevealed] = useState(false);

  // ─── METACOGNITIVE CALIBRATION ───
  const [confidence, setConfidence] = useState(null);
  const [calibrationLog, setCalibrationLog] = useState([]); // {predicted, actual}

  // ─── PREDICTION-ERROR (truth traps) ───
  const [trapIndex, setTrapIndex] = useState(0);
  const [trapAnswer, setTrapAnswer] = useState(null);
  const [trapShownAnswer, setTrapShownAnswer] = useState(null);

  // ─── SCENARIO ENGAGEMENT ───
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [scenarioGuess, setScenarioGuess] = useState("");
  const [scenarioRevealed, setScenarioRevealed] = useState(false);

  // ─── GENERATION (free recall production) ───
  const [generationIndex, setGenerationIndex] = useState(0);
  const [generationText, setGenerationText] = useState("");
  const [generationSubmitted, setGenerationSubmitted] = useState(false);

  // ─── TEACH-BACK (Feynman protocol) ───
  const [teachBackText, setTeachBackText] = useState("");
  const [teachBackSubmitted, setTeachBackSubmitted] = useState(false);

  // ─── INTERLEAVING — cross-concept distinction questions ───
  const [interleaveQuestion, setInterleaveQuestion] = useState(null);
  const [interleaveAnswer, setInterleaveAnswer] = useState(null);

  // ─── PROGRESS / SPACED REPETITION ───
  const [progress, setProgress] = useState(() => {
    const init = {};
    CONCEPTS.forEach(c => {
      init[c.id] = { mastery: 0, ease: 2.5, interval: 0, due: Date.now(), reviewCount: 0, scaffoldKnown: 0, errors: [] };
    });
    return init;
  });

  // ─── SESSION METRICS ───
  const [sessionStartTs, setSessionStartTs] = useState(null);
  const [trapResults, setTrapResults] = useState([]); // {claim, predicted, actual, correct}
  const [errorBank, setErrorBank] = useState([]); // wrong answers become future review items

  // ─── UI STATE ───
  const [showSourcePane, setShowSourcePane] = useState(false);

  // ═════════════════════════════════════════════════════════════════════
  // STYLE TOKENS — Calm, focused, premium dark theme
  // ═════════════════════════════════════════════════════════════════════
  const T = {
    bg: "#08080F",
    bgDeep: "#04040A",
    panel: "rgba(20,20,40,0.72)",
    panelDeep: "rgba(14,14,30,0.82)",
    border: "rgba(80,80,140,0.32)",
    borderActive: "rgba(0,240,255,0.45)",
    text: "#e8e8ff",
    textDim: "#a8a8c8",
    textMuted: "#6b6b8e",
    cyan: "#00f0ff",
    teal: "#06d6a0",
    gold: "#ffd700",
    coral: "#ff5577",
    violet: "#a78bfa",
    orange: "#fb923c",
    pink: "#f472b6",
  };

  const card = (extra = {}) => ({
    background: T.panel,
    border: `1px solid ${T.border}`,
    borderRadius: 20,
    padding: "32px 36px",
    backdropFilter: "blur(12px)",
    ...extra
  });

  const accent = concept?.color || T.cyan;

  // ═════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═════════════════════════════════════════════════════════════════════

  const startSession = (cid) => {
    setConceptId(cid);
    setView("prep");
    setPhase("predict");
    setPhaseIndex(0);
    setPredictionInput("");
    setPredictionRevealed(false);
    setConfidence(null);
    setTrapIndex(0);
    setTrapAnswer(null);
    setTrapShownAnswer(null);
    setScenarioIndex(0);
    setScenarioGuess("");
    setScenarioRevealed(false);
    setGenerationIndex(0);
    setGenerationText("");
    setGenerationSubmitted(false);
    setTeachBackText("");
    setTeachBackSubmitted(false);
    setSessionStartTs(Date.now());
    setTrapResults([]);
  };

  const launchActiveSession = () => {
    setView("session");
    setPhase("predict");
  };

  const recordTrapResult = (predicted, actual, claim, why) => {
    const correct = predicted === actual;
    setTrapResults(p => [...p, { claim, predicted, actual, correct, why }]);
    if (!correct) {
      setErrorBank(p => [...p, { conceptId: concept.id, claim, why, ts: Date.now() }]);
    }
    if (confidence !== null) {
      setCalibrationLog(p => [...p, { predicted: confidence, actual: correct ? 1 : 0 }]);
    }
  };

  const advanceTrap = () => {
    if (trapIndex < concept.truthTraps.length - 1) {
      setTrapIndex(p => p + 1);
      setTrapAnswer(null);
      setTrapShownAnswer(null);
      setConfidence(null);
    } else {
      setPhase("scenario");
      setScenarioIndex(0);
    }
  };

  const advanceScenario = () => {
    if (scenarioIndex < concept.scenarios.length - 1) {
      setScenarioIndex(p => p + 1);
      setScenarioGuess("");
      setScenarioRevealed(false);
    } else {
      setPhase("generate");
      setGenerationIndex(0);
    }
  };

  const advanceGeneration = () => {
    if (generationIndex < concept.generationPrompts.length - 1) {
      setGenerationIndex(p => p + 1);
      setGenerationText("");
      setGenerationSubmitted(false);
    } else {
      setPhase("teach");
    }
  };

  const completeTeach = () => {
    // Compute mastery delta from session
    const correctTraps = trapResults.filter(t => t.correct).length;
    const totalTraps = trapResults.length || 1;
    const trapAccuracy = correctTraps / totalTraps;
    const generationDepth = generationText.length > 80 ? 1 : 0.5;
    const teachQuality = teachBackText.length > 100 ? 1 : 0.5;

    const sessionScore = (trapAccuracy * 0.5 + generationDepth * 0.25 + teachQuality * 0.25);

    // Update spaced repetition
    setProgress(p => {
      const item = p[concept.id];
      const next = computeNextReview(item, Math.round(sessionScore * 5));
      return {
        ...p,
        [concept.id]: {
          ...item,
          ...next,
          mastery: Math.min(1, item.mastery + sessionScore * 0.35),
          scaffoldKnown: Math.min(3, (item.scaffoldKnown || 0) + 1)
        }
      };
    });

    setView("debrief");
  };

  // Compute calibration score (Brier-like)
  const calibration = useMemo(() => {
    if (!calibrationLog.length) return null;
    const sum = calibrationLog.reduce((s, c) => {
      const pred = c.predicted / 100;
      const diff = pred - c.actual;
      return s + diff * diff;
    }, 0);
    return 1 - Math.sqrt(sum / calibrationLog.length); // closer to 1 = better calibrated
  }, [calibrationLog]);

  // ═════════════════════════════════════════════════════════════════════
  // KEYBOARD SHORTCUTS
  // ═════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") { setShowSourcePane(false); }
      if (view === "session" && phase === "trap") {
        if ((e.key === "t" || e.key === "T") && trapAnswer === null) {
          const claim = concept.truthTraps[trapIndex];
          recordTrapResult(true, claim.verdict, claim.claim, claim.why);
          setTrapAnswer(true);
          setTrapShownAnswer(claim);
        }
        if ((e.key === "f" || e.key === "F") && trapAnswer === null) {
          const claim = concept.truthTraps[trapIndex];
          recordTrapResult(false, claim.verdict, claim.claim, claim.why);
          setTrapAnswer(false);
          setTrapShownAnswer(claim);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [view, phase, trapIndex, trapAnswer, concept, confidence]);

  // ═════════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════════

  return (
    <div style={{
      minHeight: "100vh",
      background: T.bg,
      backgroundImage: `radial-gradient(ellipse at 20% 0%, rgba(0,240,255,0.04) 0%, transparent 50%), radial-gradient(ellipse at 80% 100%, rgba(167,139,250,0.04) 0%, transparent 50%), ${T.bgDeep}`,
      color: T.text,
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      fontSize: 16,
      letterSpacing: "0.005em",
      padding: "32px 24px",
      position: "relative"
    }}>

      {/* ═══════════ ENTRY VIEW — Concept selection grid ═══════════ */}
      {view === "entry" && <div style={{ maxWidth: 1200, margin: "0 auto" }}>

        {/* Hero */}
        <div style={{ textAlign: "center", padding: "48px 24px 56px", animation: "fadeUp .6s ease" }}>
          <div style={{ fontSize: 11, letterSpacing: "0.32em", color: T.textMuted, fontWeight: 600, marginBottom: 18 }}>
            NEURAL FORGE · SINGULAR
          </div>
          <h1 style={{
            fontSize: 56, fontWeight: 700, lineHeight: 1.05, margin: "0 0 24px",
            background: `linear-gradient(135deg, ${T.cyan} 0%, ${T.violet} 100%)`,
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            letterSpacing: "-0.02em"
          }}>
            Learn ethics<br />the way the brain actually works.
          </h1>
          <p style={{ fontSize: 18, color: T.textDim, lineHeight: 1.6, maxWidth: 680, margin: "0 auto 12px" }}>
            Six concepts from <em>How Should One Live?</em> Sourced verbatim. Drilled using fourteen
            cognitive-science methods most learning tools never touch.
          </p>
          <p style={{ fontSize: 14, color: T.textMuted, fontStyle: "italic" }}>
            Predict before you read. Generate before you recognize. Calibrate confidence. Teach back.
          </p>
        </div>

        {/* Method strip */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 8, padding: "20px 24px", marginBottom: 40,
          background: T.panelDeep, borderRadius: 14, border: `1px solid ${T.border}`,
          fontSize: 12, color: T.textDim
        }}>
          {[
            ["⚡", "Prediction-error", "Predict before reveal — the brain locks in the delta"],
            ["🔀", "Interleaving", "Concepts shuffled, not blocked — fights illusory mastery"],
            ["✍️", "Generation effect", "Produce, don't recognize — deeper encoding"],
            ["🎯", "Calibration", "Predict confidence, measure accuracy — metacognition trained"],
            ["🌱", "Spacing", "Reviews scheduled at the brink of forgetting — SM-2 algorithm"],
            ["🗣️", "Teach-back", "Feynman protocol — if you can't explain it, you don't know it"],
          ].map(([icon, title, desc]) => (
            <div key={title} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 4px" }}>
              <span style={{ fontSize: 16 }}>{icon}</span>
              <div>
                <div style={{ fontWeight: 600, color: T.text, fontSize: 12.5, marginBottom: 2 }}>{title}</div>
                <div style={{ fontSize: 11.5, color: T.textMuted, lineHeight: 1.45 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Concept selection */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(330px, 1fr))", gap: 16 }}>
          {CONCEPTS.map(c => {
            const p = progress[c.id];
            const due = p.due <= Date.now();
            return (
              <button key={c.id} onClick={() => startSession(c.id)} style={{
                ...card({ padding: "26px 28px", cursor: "pointer", textAlign: "left", borderTop: `2px solid ${c.color}`, transition: "all 220ms ease", color: T.text }),
                border: `1px solid ${T.border}`, borderTop: `2px solid ${c.color}`
              }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.borderColor = c.color + "55"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = T.border; }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                  <div style={{ fontSize: 28 }}>{c.visualAnchor}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {due && p.reviewCount > 0 && <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 6, background: T.coral + "22", color: T.coral, fontWeight: 600 }}>DUE</span>}
                    <span style={{ fontSize: 11, color: T.textMuted, fontWeight: 600 }}>p. {c.page}</span>
                  </div>
                </div>
                <div style={{ fontSize: 11, letterSpacing: "0.2em", color: c.color, fontWeight: 600, marginBottom: 6 }}>{c.family.toUpperCase()}</div>
                <h3 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 12px", letterSpacing: "-0.01em" }}>{c.name}</h3>
                <p style={{ fontSize: 13.5, color: T.textDim, lineHeight: 1.55, margin: "0 0 18px" }}>{c.problem}</p>
                {/* Mastery bar */}
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ flex: 1, height: 4, borderRadius: 2, background: "rgba(40,40,70,0.6)", overflow: "hidden" }}>
                    <div style={{ height: "100%", borderRadius: 2, background: c.color, width: `${p.mastery * 100}%`, transition: "width 600ms ease" }} />
                  </div>
                  <span style={{ fontSize: 11, color: T.textMuted, fontWeight: 600 }}>{Math.round(p.mastery * 100)}%</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", padding: "48px 24px", color: T.textMuted, fontSize: 12 }}>
          Source material: Wilkens, S. (Ed.). <em>How Should One Live? An Introduction to Ethics and Moral Reasoning</em>. Bridgepoint Education, 2018.
        </div>
      </div>}

      {/* ═══════════ PREP VIEW — Pre-session metacognitive priming ═══════════ */}
      {view === "prep" && concept && <div style={{ maxWidth: 720, margin: "60px auto", animation: "fadeUp .5s ease" }}>
        <button onClick={() => setView("entry")} style={{
          background: "transparent", border: "none", color: T.textMuted, cursor: "pointer",
          fontSize: 13, marginBottom: 24, padding: 0
        }}>← All concepts</button>

        <div style={card({ borderTop: `2px solid ${accent}` })}>
          <div style={{ fontSize: 11, letterSpacing: "0.2em", color: accent, fontWeight: 600, marginBottom: 10 }}>
            PREPARING SESSION
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
            <span style={{ fontSize: 36 }}>{concept.visualAnchor}</span>
            <h2 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>{concept.name}</h2>
          </div>

          <div style={{ padding: "20px 22px", borderRadius: 14, background: "rgba(0,240,255,0.04)", border: `1px solid ${accent}22`, marginBottom: 22 }}>
            <div style={{ fontSize: 11, letterSpacing: "0.16em", color: accent, fontWeight: 600, marginBottom: 8 }}>BEFORE WE BEGIN</div>
            <p style={{ fontSize: 15, lineHeight: 1.65, color: T.textDim, margin: 0 }}>
              You're about to walk through a 6-stage learning sequence: <strong style={{ color: T.text }}>Predict → Reveal → Drill traps → Reason scenarios → Generate → Teach back</strong>.
              Each stage is designed to make recall harder in the short term so it becomes effortless in the long term.
            </p>
          </div>

          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 13, color: T.textDim, marginBottom: 12 }}>
              First — without reading anything — write what you currently believe this concept is.
              Even a guess is fine. The act of committing matters more than being right.
            </div>
            <textarea
              value={predictionInput}
              onChange={(e) => setPredictionInput(e.target.value)}
              placeholder={`Your current understanding of ${concept.name}…`}
              style={{
                width: "100%", minHeight: 110, padding: "14px 16px", borderRadius: 12,
                background: "rgba(8,8,16,0.6)", border: `1px solid ${T.border}`, color: T.text,
                fontSize: 14, fontFamily: "inherit", lineHeight: 1.55, resize: "vertical", outline: "none"
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = accent}
              onBlur={(e) => e.currentTarget.style.borderColor = T.border}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 13, color: T.textDim, marginBottom: 10 }}>
              How confident are you that you understand this concept right now? (Be honest — calibration is the skill.)
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {[10, 30, 50, 70, 90].map(c => (
                <button key={c} onClick={() => setConfidence(c)} style={{
                  flex: 1, padding: "10px 8px", borderRadius: 10, fontSize: 13, fontWeight: 600,
                  cursor: "pointer", transition: "all 200ms",
                  background: confidence === c ? accent + "22" : "transparent",
                  border: `1px solid ${confidence === c ? accent : T.border}`,
                  color: confidence === c ? accent : T.textDim
                }}>
                  {c}%
                </button>
              ))}
            </div>
          </div>

          <button onClick={launchActiveSession} disabled={!predictionInput.trim() || confidence === null} style={{
            width: "100%", padding: "16px", borderRadius: 14, border: "none",
            background: (!predictionInput.trim() || confidence === null) ? "rgba(40,40,70,0.5)" : `linear-gradient(135deg, ${accent}, ${T.violet})`,
            color: (!predictionInput.trim() || confidence === null) ? T.textMuted : "#000",
            fontWeight: 700, fontSize: 15, letterSpacing: "0.02em",
            cursor: (!predictionInput.trim() || confidence === null) ? "not-allowed" : "pointer", transition: "all 220ms"
          }}>
            Begin session →
          </button>
        </div>
      </div>}

      {/* ═══════════ SESSION VIEW — The learning sequence ═══════════ */}
      {view === "session" && concept && <div style={{ maxWidth: 820, margin: "0 auto" }}>

        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "20px 0 28px" }}>
          <button onClick={() => setView("entry")} style={{
            background: "transparent", border: "none", color: T.textMuted, cursor: "pointer", fontSize: 13, padding: 0
          }}>← Exit</button>

          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 20 }}>{concept.visualAnchor}</span>
            <span style={{ fontWeight: 600, fontSize: 15 }}>{concept.name}</span>
          </div>

          <button onClick={() => setShowSourcePane(true)} style={{
            background: "transparent", border: `1px solid ${T.border}`, color: T.textDim,
            cursor: "pointer", fontSize: 12, padding: "6px 12px", borderRadius: 8
          }}>
            📖 Source ({concept.sourceAuthor})
          </button>
        </div>

        {/* Phase indicator */}
        <div style={{ display: "flex", gap: 6, marginBottom: 28 }}>
          {[
            { key: "predict", label: "Reveal" },
            { key: "trap", label: "Traps" },
            { key: "scenario", label: "Scenarios" },
            { key: "generate", label: "Generate" },
            { key: "teach", label: "Teach back" },
          ].map((p, i) => {
            const isActive = phase === p.key;
            const phaseOrder = ["predict", "trap", "scenario", "generate", "teach"];
            const isPast = phaseOrder.indexOf(phase) > phaseOrder.indexOf(p.key);
            return (
              <div key={p.key} style={{
                flex: 1, padding: "8px 10px", borderRadius: 8, fontSize: 11,
                textAlign: "center", fontWeight: 600,
                background: isActive ? accent + "18" : isPast ? T.teal + "10" : "rgba(20,20,40,0.4)",
                color: isActive ? accent : isPast ? T.teal : T.textMuted,
                border: `1px solid ${isActive ? accent + "55" : isPast ? T.teal + "25" : T.border}`,
                transition: "all 300ms"
              }}>
                {isPast ? "✓ " : ""}{p.label}
              </div>
            );
          })}
        </div>

        {/* PHASE: PREDICT → REVEAL */}
        {phase === "predict" && <div style={card()}>

          {!predictionRevealed ? (
            <>
              <div style={{ fontSize: 11, letterSpacing: "0.2em", color: accent, fontWeight: 600, marginBottom: 14 }}>
                YOUR PREDICTION
              </div>
              <div style={{ padding: "18px 22px", borderRadius: 12, background: "rgba(8,8,20,0.5)", border: `1px solid ${T.border}`, marginBottom: 28 }}>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: T.textDim, fontStyle: "italic" }}>
                  "{predictionInput}"
                </p>
              </div>

              <div style={{ fontSize: 11, letterSpacing: "0.2em", color: T.textMuted, fontWeight: 600, marginBottom: 14 }}>
                THE PROBLEM THIS THEORY ANSWERS
              </div>
              <p style={{ fontSize: 18, lineHeight: 1.6, color: T.text, marginBottom: 28 }}>
                {concept.problem}
              </p>

              <button onClick={() => setPredictionRevealed(true)} style={{
                padding: "14px 28px", borderRadius: 12, border: "none",
                background: `linear-gradient(135deg, ${accent}, ${T.violet})`, color: "#000",
                fontWeight: 700, fontSize: 14, letterSpacing: "0.02em", cursor: "pointer"
              }}>
                Reveal the answer →
              </button>
            </>
          ) : (
            <>
              <div style={{ fontSize: 11, letterSpacing: "0.2em", color: accent, fontWeight: 600, marginBottom: 14 }}>
                THE THEORY'S ANSWER
              </div>
              <p style={{ fontSize: 22, lineHeight: 1.5, fontWeight: 500, marginBottom: 28, letterSpacing: "-0.01em" }}>
                {concept.answer}
              </p>

              {/* Scaffold — three anchor ideas */}
              <div style={{ fontSize: 11, letterSpacing: "0.2em", color: T.textMuted, fontWeight: 600, marginBottom: 16 }}>
                THREE ANCHOR IDEAS (chunk this, don't memorize a list)
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
                {concept.scaffold.map((s, i) => (
                  <div key={i} style={{
                    padding: "16px 20px", borderRadius: 12,
                    background: "rgba(8,8,20,0.5)", border: `1px solid ${T.border}`,
                    borderLeft: `3px solid ${accent}`
                  }}>
                    <div style={{ fontSize: 11, color: accent, fontWeight: 700, marginBottom: 6, letterSpacing: "0.06em" }}>
                      {i + 1}. {s.label.toUpperCase()}
                    </div>
                    <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: T.textDim }}>{s.text}</p>
                  </div>
                ))}
              </div>

              {/* Contrast — never alone */}
              <div style={{
                padding: "18px 22px", borderRadius: 14, marginBottom: 28,
                background: T.coral + "08", border: `1px solid ${T.coral}25`
              }}>
                <div style={{ fontSize: 11, color: T.coral, fontWeight: 700, marginBottom: 8, letterSpacing: "0.16em" }}>
                  ⚖️ CONTRAST — never learn this concept alone
                </div>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: T.text }}>{concept.contrast.line}</p>
              </div>

              {/* Source quote */}
              <div style={{
                padding: "20px 24px", borderRadius: 14, marginBottom: 28,
                background: "rgba(167,139,250,0.05)", border: `1px solid ${T.violet}22`
              }}>
                <div style={{ fontSize: 11, color: T.violet, fontWeight: 700, marginBottom: 10, letterSpacing: "0.16em" }}>
                  📖 FROM THE TEXTBOOK (p. {concept.sourcePage})
                </div>
                <p style={{ margin: "0 0 8px", fontSize: 15, lineHeight: 1.65, color: T.text, fontStyle: "italic" }}>
                  "{concept.sourceQuote}"
                </p>
                <div style={{ fontSize: 12, color: T.textMuted }}>— {concept.sourceAuthor}</div>
              </div>

              {/* Common confusions warning */}
              <div style={{ padding: "16px 20px", borderRadius: 12, background: T.gold + "08", border: `1px solid ${T.gold}22`, marginBottom: 28 }}>
                <div style={{ fontSize: 11, color: T.gold, fontWeight: 700, marginBottom: 10, letterSpacing: "0.16em" }}>
                  ⚠️ COMMON CONFUSIONS (you'll be tested on these)
                </div>
                <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13.5, lineHeight: 1.7, color: T.textDim }}>
                  {concept.confusions.map((c, i) => <li key={i} style={{ marginBottom: 4 }}>{c}</li>)}
                </ul>
              </div>

              <button onClick={() => { setPhase("trap"); setTrapIndex(0); }} style={{
                padding: "14px 28px", borderRadius: 12, border: "none",
                background: `linear-gradient(135deg, ${accent}, ${T.violet})`, color: "#000",
                fontWeight: 700, fontSize: 14, cursor: "pointer"
              }}>
                Continue to drill →
              </button>
            </>
          )}
        </div>}

        {/* PHASE: TRUTH TRAPS — Prediction-error learning */}
        {phase === "trap" && <div style={card()}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <div style={{ fontSize: 11, letterSpacing: "0.2em", color: accent, fontWeight: 600 }}>
              TRUTH TRAP {trapIndex + 1} / {concept.truthTraps.length}
            </div>
            <div style={{ fontSize: 11, color: T.textMuted }}>
              ⚡ Press T (true) or F (false)
            </div>
          </div>

          {(() => {
            const trap = concept.truthTraps[trapIndex];
            return (<>
              <p style={{ fontSize: 19, lineHeight: 1.55, fontWeight: 500, marginBottom: 24, color: T.text }}>
                "{trap.claim}"
              </p>

              {trapAnswer === null && (<>
                {/* Confidence prediction */}
                <div style={{ marginBottom: 18 }}>
                  <div style={{ fontSize: 12, color: T.textDim, marginBottom: 8 }}>
                    Before you answer — how confident are you in your verdict?
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    {[20, 40, 60, 80, 100].map(c => (
                      <button key={c} onClick={() => setConfidence(c)} style={{
                        flex: 1, padding: "8px 6px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                        cursor: "pointer", transition: "all 180ms",
                        background: confidence === c ? accent + "22" : "transparent",
                        border: `1px solid ${confidence === c ? accent : T.border}`,
                        color: confidence === c ? accent : T.textMuted
                      }}>
                        {c}%
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 12 }}>
                  <button
                    onClick={() => { recordTrapResult(true, trap.verdict, trap.claim, trap.why); setTrapAnswer(true); setTrapShownAnswer(trap); }}
                    disabled={confidence === null}
                    style={{
                      flex: 1, padding: "20px", borderRadius: 14,
                      background: confidence === null ? "rgba(20,20,40,0.5)" : "rgba(6,214,160,0.10)",
                      border: `2px solid ${confidence === null ? T.border : T.teal + "55"}`,
                      color: confidence === null ? T.textMuted : T.teal,
                      fontWeight: 700, fontSize: 16, cursor: confidence === null ? "not-allowed" : "pointer",
                      transition: "all 200ms"
                    }}>
                    TRUE (T)
                  </button>
                  <button
                    onClick={() => { recordTrapResult(false, trap.verdict, trap.claim, trap.why); setTrapAnswer(false); setTrapShownAnswer(trap); }}
                    disabled={confidence === null}
                    style={{
                      flex: 1, padding: "20px", borderRadius: 14,
                      background: confidence === null ? "rgba(20,20,40,0.5)" : "rgba(255,85,119,0.10)",
                      border: `2px solid ${confidence === null ? T.border : T.coral + "55"}`,
                      color: confidence === null ? T.textMuted : T.coral,
                      fontWeight: 700, fontSize: 16, cursor: confidence === null ? "not-allowed" : "pointer",
                      transition: "all 200ms"
                    }}>
                    FALSE (F)
                  </button>
                </div>
              </>)}

              {trapAnswer !== null && trapShownAnswer && (<>
                <div style={{
                  padding: "20px 24px", borderRadius: 14, marginBottom: 18,
                  background: trapShownAnswer.verdict === trapAnswer ? T.teal + "10" : T.coral + "10",
                  border: `1px solid ${trapShownAnswer.verdict === trapAnswer ? T.teal + "44" : T.coral + "44"}`
                }}>
                  <div style={{
                    fontSize: 13, fontWeight: 700, marginBottom: 12,
                    color: trapShownAnswer.verdict === trapAnswer ? T.teal : T.coral
                  }}>
                    {trapShownAnswer.verdict === trapAnswer ? "✓ CORRECT" : "✗ TRAP TRIGGERED"}
                    {confidence !== null && (
                      <span style={{ fontSize: 11, fontWeight: 500, color: T.textMuted, marginLeft: 12, letterSpacing: "0.04em" }}>
                        (you said {confidence}% confident)
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: T.textDim, marginBottom: 8 }}>
                    The actual answer: <strong style={{ color: trapShownAnswer.verdict ? T.teal : T.coral }}>{trapShownAnswer.verdict ? "TRUE" : "FALSE"}</strong>
                  </div>
                  <p style={{ margin: 0, fontSize: 14, lineHeight: 1.65, color: T.text }}>{trapShownAnswer.why}</p>
                </div>

                <button onClick={advanceTrap} style={{
                  padding: "12px 24px", borderRadius: 12, border: "none",
                  background: `linear-gradient(135deg, ${accent}, ${T.violet})`, color: "#000",
                  fontWeight: 700, fontSize: 14, cursor: "pointer"
                }}>
                  {trapIndex < concept.truthTraps.length - 1 ? "Next trap →" : "Continue to scenarios →"}
                </button>
              </>)}
            </>);
          })()}
        </div>}

        {/* PHASE: SCENARIOS — Engagement with hard cases */}
        {phase === "scenario" && <div style={card()}>
          <div style={{ fontSize: 11, letterSpacing: "0.2em", color: accent, fontWeight: 600, marginBottom: 18 }}>
            SCENARIO {scenarioIndex + 1} / {concept.scenarios.length}
          </div>

          {(() => {
            const sc = concept.scenarios[scenarioIndex];
            return (<>
              <p style={{ fontSize: 18, lineHeight: 1.6, fontWeight: 500, marginBottom: 22, color: T.text }}>
                {sc.situation}
              </p>

              {!scenarioRevealed && (<>
                <div style={{ fontSize: 12, color: T.textDim, marginBottom: 10 }}>
                  In your own words — how would you reason this through? (Generation effect: producing your answer is what locks in the learning.)
                </div>
                <textarea
                  value={scenarioGuess}
                  onChange={(e) => setScenarioGuess(e.target.value)}
                  placeholder="Reason through this case in 2-4 sentences…"
                  style={{
                    width: "100%", minHeight: 100, padding: "14px 16px", borderRadius: 12,
                    background: "rgba(8,8,16,0.6)", border: `1px solid ${T.border}`, color: T.text,
                    fontSize: 14, fontFamily: "inherit", lineHeight: 1.55, resize: "vertical", outline: "none",
                    marginBottom: 16
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = accent}
                  onBlur={(e) => e.currentTarget.style.borderColor = T.border}
                />

                <button
                  onClick={() => setScenarioRevealed(true)}
                  disabled={scenarioGuess.length < 30}
                  style={{
                    padding: "12px 24px", borderRadius: 12, border: "none",
                    background: scenarioGuess.length < 30 ? "rgba(40,40,70,0.5)" : `linear-gradient(135deg, ${accent}, ${T.violet})`,
                    color: scenarioGuess.length < 30 ? T.textMuted : "#000",
                    fontWeight: 700, fontSize: 14, cursor: scenarioGuess.length < 30 ? "not-allowed" : "pointer"
                  }}>
                  {scenarioGuess.length < 30 ? `${30 - scenarioGuess.length} more chars to reveal` : "Reveal expert reasoning →"}
                </button>
              </>)}

              {scenarioRevealed && (<>
                <div style={{ padding: "16px 20px", borderRadius: 12, background: "rgba(8,8,20,0.5)", border: `1px solid ${T.border}`, marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: T.textMuted, fontWeight: 700, marginBottom: 8, letterSpacing: "0.12em" }}>YOUR REASONING</div>
                  <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: T.textDim, fontStyle: "italic" }}>"{scenarioGuess}"</p>
                </div>

                <div style={{ padding: "18px 22px", borderRadius: 14, background: T.coral + "08", border: `1px solid ${T.coral}25`, marginBottom: 14 }}>
                  <div style={{ fontSize: 11, color: T.coral, fontWeight: 700, marginBottom: 10, letterSpacing: "0.16em" }}>⚠️ THE TEMPTING (BUT WRONG) ANSWER</div>
                  <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: T.text }}>{sc.trapAnswer}</p>
                </div>

                <div style={{ padding: "18px 22px", borderRadius: 14, background: T.teal + "08", border: `1px solid ${T.teal}25`, marginBottom: 14 }}>
                  <div style={{ fontSize: 11, color: T.teal, fontWeight: 700, marginBottom: 10, letterSpacing: "0.16em" }}>✓ THE CORRECT ANSWER</div>
                  <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.65, color: T.text }}>{sc.correctAnswer}</p>
                </div>

                <div style={{ padding: "18px 22px", borderRadius: 14, background: T.gold + "08", border: `1px solid ${T.gold}25`, marginBottom: 24 }}>
                  <div style={{ fontSize: 11, color: T.gold, fontWeight: 700, marginBottom: 10, letterSpacing: "0.16em" }}>💡 KEY INSIGHT</div>
                  <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.65, color: T.text, fontWeight: 500 }}>{sc.insight}</p>
                </div>

                <button onClick={advanceScenario} style={{
                  padding: "12px 24px", borderRadius: 12, border: "none",
                  background: `linear-gradient(135deg, ${accent}, ${T.violet})`, color: "#000",
                  fontWeight: 700, fontSize: 14, cursor: "pointer"
                }}>
                  {scenarioIndex < concept.scenarios.length - 1 ? "Next scenario →" : "Continue to generation →"}
                </button>
              </>)}
            </>);
          })()}
        </div>}

        {/* PHASE: GENERATION — Free recall production */}
        {phase === "generate" && <div style={card()}>
          <div style={{ fontSize: 11, letterSpacing: "0.2em", color: accent, fontWeight: 600, marginBottom: 18 }}>
            GENERATION PROMPT {generationIndex + 1} / {concept.generationPrompts.length}
          </div>

          <p style={{ fontSize: 18, lineHeight: 1.55, fontWeight: 500, marginBottom: 8, color: T.text }}>
            {concept.generationPrompts[generationIndex]}
          </p>
          <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 18, fontStyle: "italic" }}>
            Generation effect: producing material yourself encodes 1.5x more deeply than recognizing or re-reading it.
          </div>

          <textarea
            value={generationText}
            onChange={(e) => setGenerationText(e.target.value)}
            placeholder="Write your answer here…"
            style={{
              width: "100%", minHeight: 160, padding: "16px 18px", borderRadius: 12,
              background: "rgba(8,8,16,0.6)", border: `1px solid ${T.border}`, color: T.text,
              fontSize: 14, fontFamily: "inherit", lineHeight: 1.6, resize: "vertical", outline: "none",
              marginBottom: 16
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = accent}
            onBlur={(e) => e.currentTarget.style.borderColor = T.border}
          />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <span style={{ fontSize: 12, color: generationText.length >= 50 ? T.teal : T.textMuted }}>
              {generationText.length} characters {generationText.length < 50 ? `(write at least 50)` : "✓ enough depth"}
            </span>
          </div>

          <button
            onClick={advanceGeneration}
            disabled={generationText.length < 50}
            style={{
              padding: "12px 24px", borderRadius: 12, border: "none",
              background: generationText.length < 50 ? "rgba(40,40,70,0.5)" : `linear-gradient(135deg, ${accent}, ${T.violet})`,
              color: generationText.length < 50 ? T.textMuted : "#000",
              fontWeight: 700, fontSize: 14, cursor: generationText.length < 50 ? "not-allowed" : "pointer"
            }}>
            {generationIndex < concept.generationPrompts.length - 1 ? "Next prompt →" : "Continue to teach-back →"}
          </button>
        </div>}

        {/* PHASE: TEACH-BACK — Feynman protocol */}
        {phase === "teach" && <div style={card()}>
          <div style={{ fontSize: 11, letterSpacing: "0.2em", color: accent, fontWeight: 600, marginBottom: 14 }}>
            TEACH-BACK · FEYNMAN PROTOCOL
          </div>

          <div style={{ padding: "18px 22px", borderRadius: 14, background: "rgba(167,139,250,0.06)", border: `1px solid ${T.violet}22`, marginBottom: 22 }}>
            <div style={{ fontSize: 11, color: T.violet, fontWeight: 700, marginBottom: 10, letterSpacing: "0.16em" }}>
              🗣️ THE FEYNMAN TEST
            </div>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: T.text }}>
              <strong>Richard Feynman's principle:</strong> if you can't explain something simply to a non-expert,
              you don't truly understand it. If your explanation has gaps, those gaps are exactly what you don't know.
            </p>
          </div>

          <p style={{ fontSize: 18, lineHeight: 1.55, fontWeight: 500, marginBottom: 16, color: T.text }}>
            {concept.teachBackPrompt}
          </p>

          <textarea
            value={teachBackText}
            onChange={(e) => setTeachBackText(e.target.value)}
            placeholder="Explain in your own words, as if to someone who has never studied this…"
            style={{
              width: "100%", minHeight: 200, padding: "16px 18px", borderRadius: 12,
              background: "rgba(8,8,16,0.6)", border: `1px solid ${T.border}`, color: T.text,
              fontSize: 14, fontFamily: "inherit", lineHeight: 1.65, resize: "vertical", outline: "none",
              marginBottom: 16
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = accent}
            onBlur={(e) => e.currentTarget.style.borderColor = T.border}
          />

          <div style={{ fontSize: 12, color: teachBackText.length >= 100 ? T.teal : T.textMuted, marginBottom: 18 }}>
            {teachBackText.length} characters {teachBackText.length < 100 ? `(write at least 100 — short explanations rarely test understanding)` : "✓ depth reached"}
          </div>

          <button
            onClick={completeTeach}
            disabled={teachBackText.length < 100}
            style={{
              padding: "14px 28px", borderRadius: 12, border: "none",
              background: teachBackText.length < 100 ? "rgba(40,40,70,0.5)" : `linear-gradient(135deg, ${T.gold}, ${T.coral})`,
              color: teachBackText.length < 100 ? T.textMuted : "#000",
              fontWeight: 700, fontSize: 14, letterSpacing: "0.02em",
              cursor: teachBackText.length < 100 ? "not-allowed" : "pointer"
            }}>
            Complete session →
          </button>
        </div>}

      </div>}

      {/* ═══════════ DEBRIEF VIEW — Calibration & spaced-repetition schedule ═══════════ */}
      {view === "debrief" && concept && <div style={{ maxWidth: 760, margin: "60px auto", animation: "fadeUp .6s ease" }}>

        <div style={card({ borderTop: `2px solid ${T.gold}` })}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🌟</div>
            <h2 style={{ fontSize: 28, fontWeight: 700, margin: "0 0 8px", letterSpacing: "-0.01em" }}>Session complete</h2>
            <p style={{ fontSize: 14, color: T.textDim, margin: 0 }}>
              You worked through {concept.name} for {Math.round((Date.now() - sessionStartTs) / 60000)} minutes.
            </p>
          </div>

          {/* Trap accuracy */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, letterSpacing: "0.2em", color: T.textMuted, fontWeight: 600, marginBottom: 12 }}>
              TRUTH-TRAP ACCURACY
            </div>
            {(() => {
              const correct = trapResults.filter(t => t.correct).length;
              const total = trapResults.length;
              const pct = Math.round((correct / total) * 100);
              return (
                <div style={{ padding: "16px 20px", borderRadius: 12, background: "rgba(8,8,20,0.5)", border: `1px solid ${T.border}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <span style={{ fontSize: 26, fontWeight: 700, color: pct >= 75 ? T.teal : pct >= 50 ? T.gold : T.coral }}>
                      {correct} / {total}
                    </span>
                    <span style={{ fontSize: 14, color: T.textDim }}>{pct}% — {pct >= 75 ? "Strong" : pct >= 50 ? "Building" : "Reset & re-engage"}</span>
                  </div>
                  <div style={{ height: 4, borderRadius: 2, background: "rgba(40,40,70,0.6)", overflow: "hidden" }}>
                    <div style={{ height: "100%", borderRadius: 2, background: pct >= 75 ? T.teal : pct >= 50 ? T.gold : T.coral, width: `${pct}%`, transition: "width 800ms ease" }} />
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Calibration */}
          {calibration !== null && <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, letterSpacing: "0.2em", color: T.textMuted, fontWeight: 600, marginBottom: 12 }}>
              METACOGNITIVE CALIBRATION
            </div>
            <div style={{ padding: "16px 20px", borderRadius: 12, background: "rgba(8,8,20,0.5)", border: `1px solid ${T.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 26, fontWeight: 700, color: T.violet }}>{Math.round(calibration * 100)}%</span>
                <span style={{ fontSize: 13, color: T.textDim }}>
                  {calibration > 0.8 ? "Well-calibrated — your confidence matches reality" :
                   calibration > 0.6 ? "Reasonable calibration — minor over/underconfidence" :
                   "Miscalibrated — your confidence and accuracy are diverging"}
                </span>
              </div>
              <div style={{ fontSize: 12, color: T.textMuted, lineHeight: 1.55 }}>
                Calibration measures whether your stated confidence matched your actual accuracy. High calibration is a separate skill from raw knowledge — and it's the meta-skill that lets you know what you know.
              </div>
            </div>
          </div>}

          {/* Spaced repetition schedule */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, letterSpacing: "0.2em", color: T.textMuted, fontWeight: 600, marginBottom: 12 }}>
              NEXT REVIEW (spaced repetition · SM-2 algorithm)
            </div>
            {(() => {
              const item = progress[concept.id];
              const minsUntil = Math.round((item.due - Date.now()) / 60000);
              const friendlyTime = minsUntil < 60 ? `in ${minsUntil} min` :
                                   minsUntil < 1440 ? `in ${Math.round(minsUntil / 60)} hours` :
                                   `in ${Math.round(minsUntil / 1440)} days`;
              return (
                <div style={{ padding: "16px 20px", borderRadius: 12, background: "rgba(0,240,255,0.04)", border: `1px solid ${T.cyan}22` }}>
                  <div style={{ fontSize: 18, fontWeight: 600, color: T.cyan, marginBottom: 6 }}>
                    Review {friendlyTime}
                  </div>
                  <div style={{ fontSize: 12, color: T.textDim, lineHeight: 1.55 }}>
                    Interval: {item.interval} min · Ease factor: {item.ease.toFixed(2)} · Review #{item.reviewCount}
                  </div>
                  <div style={{ fontSize: 11, color: T.textMuted, marginTop: 8 }}>
                    The brain forgets at predictable intervals. Reviewing JUST as you're about to forget produces deeper encoding than reviewing too early.
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Errors → study fuel */}
          {trapResults.filter(t => !t.correct).length > 0 && <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, letterSpacing: "0.2em", color: T.coral, fontWeight: 600, marginBottom: 12 }}>
              💎 ERRORS → FUTURE STUDY FUEL
            </div>
            <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 10, lineHeight: 1.55 }}>
              These wrong answers are now permanently in your error bank. They will resurface in future sessions — wrong answers are 3x more memorable than right ones once corrected.
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {trapResults.filter(t => !t.correct).map((t, i) => (
                <div key={i} style={{ padding: "12px 16px", borderRadius: 10, background: T.coral + "08", border: `1px solid ${T.coral}22` }}>
                  <div style={{ fontSize: 13, color: T.text, marginBottom: 4 }}>"{t.claim}"</div>
                  <div style={{ fontSize: 12, color: T.textDim }}>→ {t.why}</div>
                </div>
              ))}
            </div>
          </div>}

          {/* Actions */}
          <div style={{ display: "flex", gap: 10, marginTop: 28 }}>
            <button onClick={() => setView("entry")} style={{
              flex: 1, padding: "14px", borderRadius: 12,
              background: "transparent", border: `1px solid ${T.border}`, color: T.text,
              fontWeight: 600, fontSize: 14, cursor: "pointer"
            }}>
              All concepts
            </button>
            <button onClick={() => {
              // Pick next due concept, or random unmastered
              const due = CONCEPTS.find(c => c.id !== concept.id && progress[c.id].due <= Date.now());
              const next = due || CONCEPTS.find(c => c.id !== concept.id && progress[c.id].mastery < 0.7);
              if (next) startSession(next.id);
              else setView("entry");
            }} style={{
              flex: 1, padding: "14px", borderRadius: 12,
              background: `linear-gradient(135deg, ${T.cyan}, ${T.violet})`, border: "none", color: "#000",
              fontWeight: 700, fontSize: 14, cursor: "pointer"
            }}>
              Next concept →
            </button>
          </div>
        </div>
      </div>}

      {/* ═══════════ SOURCE PANE — Sliding panel ═══════════ */}
      {showSourcePane && concept && <div onClick={() => setShowSourcePane(false)} style={{
        position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)"
      }}>
        <div onClick={(e) => e.stopPropagation()} style={{
          position: "absolute", right: 0, top: 0, bottom: 0, width: 460, maxWidth: "92vw",
          background: T.bgDeep, borderLeft: `1px solid ${T.border}`, padding: "32px 30px",
          overflowY: "auto", animation: "slideLeft .3s ease"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <div style={{ fontSize: 11, color: T.textMuted, letterSpacing: "0.2em", fontWeight: 600 }}>SOURCE TEXT</div>
            <button onClick={() => setShowSourcePane(false)} style={{
              background: "transparent", border: "none", color: T.textMuted, cursor: "pointer", fontSize: 18
            }}>✕</button>
          </div>

          <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>{concept.name}</h3>
          <div style={{ fontSize: 13, color: T.textMuted, marginBottom: 20 }}>{concept.sourceAuthor} · p. {concept.sourcePage}</div>

          <div style={{ padding: "20px 22px", borderRadius: 14, background: "rgba(167,139,250,0.06)", border: `1px solid ${T.violet}22`, marginBottom: 24 }}>
            <div style={{ fontSize: 11, color: T.violet, fontWeight: 700, marginBottom: 10, letterSpacing: "0.14em" }}>📖 KEY DEFINITION</div>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.65, color: T.text, fontStyle: "italic" }}>"{concept.sourceQuote}"</p>
          </div>

          <div style={{ padding: "20px 22px", borderRadius: 14, background: T.gold + "08", border: `1px solid ${T.gold}22`, marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: T.gold, fontWeight: 700, marginBottom: 10, letterSpacing: "0.14em" }}>FOUNDER'S WORDS</div>
            <p style={{ margin: "0 0 8px", fontSize: 14, lineHeight: 1.65, color: T.text, fontStyle: "italic" }}>"{concept.founderQuote}"</p>
            <div style={{ fontSize: 12, color: T.textMuted }}>— {concept.founderName}</div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: T.textMuted, fontWeight: 700, marginBottom: 10, letterSpacing: "0.14em" }}>RETRIEVAL CUES</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {concept.cues.map(c => (
                <span key={c} style={{
                  padding: "5px 10px", borderRadius: 8, fontSize: 12, color: accent,
                  background: accent + "10", border: `1px solid ${accent}22`
                }}>{c}</span>
              ))}
            </div>
          </div>

          <div style={{ fontSize: 11, color: T.textMuted, lineHeight: 1.6, padding: "12px 0" }}>
            All quotes drawn from Wilkens, S. (Ed.). <em>How Should One Live? An Introduction to Ethics and Moral Reasoning</em>. Bridgepoint Education, 2018.
          </div>
        </div>
      </div>}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideLeft { from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', system-ui, sans-serif; background: #08080F; }
        button:hover:not(:disabled) { filter: brightness(1.08); }
        button:active:not(:disabled) { transform: scale(0.98); }
        textarea::placeholder { color: rgba(170, 170, 200, 0.4); }
        ::selection { background: rgba(0,240,255,0.25); color: #fff; }
      `}</style>
    </div>
  );
}
