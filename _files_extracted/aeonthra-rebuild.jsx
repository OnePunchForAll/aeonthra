import { useState, useEffect, useCallback, useRef } from "react";

// ═══════════════════════════════════════════════════════════════
// DATA LAYER — Real content, hand-crafted, educationally sound
// ═══════════════════════════════════════════════════════════════

const COURSE = {
  code: "PHI 208",
  title: "Ethics and Moral Reasoning",
  term: "Spring 2026",
};

const CONCEPTS = [
  { id: "util", name: "Utilitarianism", mastery: 0.82, category: "Consequentialism",
    core: "The right action produces the greatest good for the greatest number.",
    detail: "Developed by Jeremy Bentham and refined by John Stuart Mill, utilitarianism evaluates actions solely by their consequences. It demands we set aside personal attachments and calculate: which choice produces the most total happiness?",
    mnemonic: "Picture a happiness meter — every action gets a score based on total well-being produced.",
    keywords: ["consequences", "greatest good", "Bentham", "Mill", "pleasure", "pain"] },
  { id: "deont", name: "Deontology", mastery: 0.74, category: "Non-consequentialism",
    core: "Actions are right or wrong based on rules and duties, regardless of consequences.",
    detail: "Immanuel Kant argued that moral law comes from reason alone. His categorical imperative demands we act only on principles we could will as universal laws, and treat people never merely as tools.",
    mnemonic: "'Deon' means duty in Greek. Rules first, results second — like a judge who follows the law even when the outcome seems unfair.",
    keywords: ["duty", "rules", "Kant", "categorical imperative", "universal law"] },
  { id: "virtue", name: "Virtue Ethics", mastery: 0.61, category: "Character-based",
    core: "Focuses on the character of the moral agent rather than on rules or consequences.",
    detail: "Aristotle argued that virtues are habits developed through practice. The doctrine of the mean holds that virtue lies between two extremes — courage between cowardice and recklessness.",
    mnemonic: "Ask 'What would a good person do?' — not 'What rule applies?' or 'What outcome is best?'",
    keywords: ["character", "Aristotle", "habit", "doctrine of the mean", "flourishing"] },
  { id: "catimperative", name: "Categorical Imperative", mastery: 0.45, category: "Deontological Principles",
    core: "Kant's supreme moral principle: act only on maxims you could will as universal law.",
    detail: "The Formula of Universal Law tests if your action's principle could apply to everyone. The Formula of Humanity requires treating people as ends in themselves, never merely as means.",
    mnemonic: "Categorical = always, no exceptions. 'Don't lie' period — not 'Don't lie if you want trust.'",
    keywords: ["Kant", "universal law", "maxim", "humanity", "ends", "means"] },
  { id: "felicific", name: "Felicific Calculus", mastery: 0.38, category: "Utilitarian Methods",
    core: "Bentham's method for calculating the total pleasure and pain an action produces.",
    detail: "Seven dimensions: intensity, duration, certainty, propinquity (nearness in time), fecundity (likelihood of more pleasure), purity (freedom from pain), and extent (number affected).",
    mnemonic: "Seven factors, one per day of the week — Intense Monday, Duration Tuesday, Certain Wednesday...",
    keywords: ["Bentham", "pleasure", "pain", "intensity", "duration", "extent"] },
  { id: "mean", name: "Doctrine of the Mean", mastery: 0.25, category: "Virtue Ethics Principles",
    core: "Moral virtue is the middle ground between excess and deficiency.",
    detail: "Courage lies between cowardice and recklessness. Generosity between stinginess and extravagance. The mean isn't mathematical — it's relative to the person and situation.",
    mnemonic: "A guitar string: too loose = no sound, too tight = it snaps, just right = music.",
    keywords: ["Aristotle", "mean", "excess", "deficiency", "courage", "moderation"] },
  { id: "expmachine", name: "Experience Machine", mastery: 0.15, category: "Objections to Utilitarianism",
    core: "Nozick's thought experiment: would you plug into a machine simulating perfect happiness?",
    detail: "If pleasure were all that mattered, everyone would choose the machine. But most refuse — we value authenticity, real relationships, and genuine accomplishment beyond mere feeling.",
    mnemonic: "Neo choosing the red pill in The Matrix. We want real life, not perfect fake life.",
    keywords: ["Nozick", "thought experiment", "pleasure", "reality", "authenticity"] },
  { id: "actrule", name: "Act vs Rule Utilitarianism", mastery: 0.10, category: "Utilitarian Variations",
    core: "Act evaluates each individual action; rule asks which general rules produce best outcomes.",
    detail: "Act utilitarianism is flexible but can justify injustice in individual cases. Rule utilitarianism provides stability and can defend rights by arguing that protective rules produce better long-term outcomes.",
    mnemonic: "Act = referee watching instant replay per play. Rule = police officer following the rulebook.",
    keywords: ["act", "rule", "individual", "general", "consequences", "rights"] },
  { id: "socialcontract", name: "Social Contract Theory", mastery: 0.05, category: "Political Philosophy",
    core: "Moral and political rules are justified because rational people would agree to them.",
    detail: "Hobbes: people accept government to escape the 'state of nature.' Rawls: design society behind a 'veil of ignorance' — not knowing your place ensures fairness for everyone.",
    mnemonic: "Writing rules for a game you must play — but you don't know which player you'll be.",
    keywords: ["Hobbes", "Rawls", "agreement", "veil of ignorance", "fairness"] },
  { id: "relativism", name: "Moral Relativism", mastery: 0, category: "Metaethics",
    core: "Moral judgments are relative to cultural, societal, or individual standards — not universal.",
    detail: "Cultural relativism claims right and wrong are set by cultural norms. Critics argue: if true, we could never condemn slavery or genocide in other cultures, yet we do.",
    mnemonic: "'When in Rome, do as Romans do' — but if Rome practices slavery, should you?",
    keywords: ["culture", "relative", "universal", "tolerance", "standards"] },
  { id: "trolley", name: "Trolley Problem", mastery: 0, category: "Applied Ethics",
    core: "Is it permissible to divert a trolley to kill one person in order to save five?",
    detail: "The lever case seems acceptable to most. But pushing someone off a bridge to stop the trolley feels wrong — even though the math is identical. This gap reveals the tension between consequentialist and deontological intuitions.",
    mnemonic: "The math says 5 > 1. But your gut says pushing someone is murder. That gap IS the trolley problem.",
    keywords: ["dilemma", "trolley", "five", "one", "consequences", "intentions"] },
  { id: "naturallaw", name: "Natural Law Theory", mastery: 0, category: "Moral Foundations",
    core: "Moral standards are derived from human nature and discoverable through reason.",
    detail: "Aquinas argued God implanted natural law in human reason. Modern versions ground it in human flourishing — what promotes well-being is naturally good, what harms it is naturally wrong.",
    mnemonic: "Murder feels wrong everywhere, in every culture, every century. Natural law says that's not coincidence.",
    keywords: ["nature", "reason", "Aquinas", "flourishing", "universal", "objective"] },
];

const ASSIGNMENTS = [
  { id: "a1", title: "Ethics Position Paper 1", subtitle: "Utilitarianism in Practice", type: "paper", dueIn: 7, points: 100,
    description: "Write a 1500-word paper analyzing a real-world ethical dilemma through the lens of utilitarianism. Include both Bentham and Mill's perspectives, address at least one major objection, and cite 4 scholarly sources in APA format.",
    concepts: ["util", "felicific", "actrule", "expmachine"] },
  { id: "a2", title: "Week 3 Discussion", subtitle: "The Trolley Problem", type: "discussion", dueIn: 3, points: 25,
    description: "In 300+ words, explain what you would do in the classic trolley problem and why. Compare utilitarian and deontological perspectives. Respond to at least 2 classmates with 100+ word replies.",
    concepts: ["trolley", "util", "deont"] },
  { id: "a3", title: "Kantian Ethics Analysis", subtitle: "Categorical Imperative Applied", type: "paper", dueIn: 14, points: 100,
    description: "Apply Kant's categorical imperative to a contemporary ethical issue. Explain both formulations and show how they lead to the same conclusion.",
    concepts: ["deont", "catimperative"] },
  { id: "a4", title: "Week 5 Discussion", subtitle: "Cultural Relativism", type: "discussion", dueIn: 10, points: 25,
    description: "Is moral relativism a defensible position? Argue for or against using at least two examples. Consider the strongest objection to your position.",
    concepts: ["relativism", "naturallaw"] },
  { id: "a5", title: "Midterm Quiz", subtitle: "Chapters 1-5", type: "quiz", dueIn: 21, points: 50,
    description: "25 multiple choice questions. 60 minutes. One attempt.",
    concepts: ["util", "deont", "virtue", "catimperative", "socialcontract"] },
  { id: "a6", title: "Final Paper", subtitle: "Applied Ethics Case Study", type: "paper", dueIn: 42, points: 200,
    description: "Choose a real-world ethical controversy and analyze it using at least three different ethical frameworks from the course.",
    concepts: ["util", "deont", "virtue", "socialcontract", "naturallaw"] },
];

const PHILOSOPHERS = [
  { name: "Jeremy Bentham", tradition: "utilitarianism", quotes: [
    { text: "The greatest happiness of the greatest number is the foundation of morals and legislation.", page: 44 },
    { text: "Nature has placed mankind under the governance of two sovereign masters: pain and pleasure.", page: 43 },
    { text: "The quantity of pleasure being equal, pushpin is as good as poetry.", page: 46 },
  ]},
  { name: "Aristotle", tradition: "virtue ethics", quotes: [
    { text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", page: 78 },
    { text: "Virtue is a state of character concerned with choice, lying in a mean relative to us.", page: 80 },
    { text: "The function of man is to live a certain kind of life, and this activity implies a rational principle.", page: 76 },
  ]},
  { name: "Immanuel Kant", tradition: "deontology", quotes: [
    { text: "Act only according to that maxim whereby you can will that it should become a universal law.", page: 62 },
    { text: "Treat humanity never merely as a means to an end, but always at the same time as an end.", page: 64 },
    { text: "Two things fill the mind with admiration: the starry heavens above me and the moral law within me.", page: 60 },
  ]},
  { name: "Thomas Aquinas", tradition: "natural law", quotes: [
    { text: "The natural law is nothing else than the rational creature's participation in the eternal law.", page: 118 },
    { text: "Good is to be done and pursued, and evil is to be avoided.", page: 120 },
  ]},
  { name: "John Stuart Mill", tradition: "utilitarianism", quotes: [
    { text: "It is better to be a human being dissatisfied than a pig satisfied; better to be Socrates dissatisfied than a fool satisfied.", page: 51 },
    { text: "Actions are right in proportion as they tend to promote happiness, wrong as they tend to produce the reverse.", page: 49 },
  ]},
  { name: "John Rawls", tradition: "social contract", quotes: [
    { text: "Justice is the first virtue of social institutions, as truth is of systems of thought.", page: 102 },
    { text: "No one knows his place in society, his class position or social status — this ensures principles of justice are chosen behind a veil of ignorance.", page: 104 },
  ]},
];

const GENESIS_DILEMMAS = [
  { scenario: "A hospital has one dose of a life-saving drug. Five patients will die without it, but one patient in another ward arrived first and was promised treatment. The drug can save all five OR the one — not both.",
    choices: [
      { text: "Give it to the five — saving more lives produces the greatest total good.", framework: "Utilitarianism", why: "A utilitarian calculates: 5 lives outweigh 1. The math is clear, even if the promise is broken." },
      { text: "Give it to the first patient — they have a right to what they were promised.", framework: "Deontology", why: "Breaking a promise violates the patient's dignity. Rules exist to protect individuals from being sacrificed for the group." },
      { text: "Ask what a wise, compassionate doctor would do in this moment.", framework: "Virtue Ethics", why: "A virtue ethicist focuses on character: what decision reflects courage, justice, and practical wisdom?" },
    ]},
  { scenario: "You discover your best friend has been cheating on their final exams all semester. They're about to graduate with honors. Reporting them would destroy their career. Staying silent means an honest student misses the honors they deserved.",
    choices: [
      { text: "Report them — systemic damage from unpunished cheating outweighs one friendship.", framework: "Utilitarianism", why: "The utilitarian weighs total harm: tolerating cheating degrades the degree's value for everyone." },
      { text: "Report them — honesty is a duty regardless of consequences.", framework: "Deontology", why: "Kant would say enabling dishonesty makes you complicit. Duty to truth doesn't bend for friendship." },
      { text: "Talk to your friend privately first — seek understanding before action.", framework: "Virtue Ethics", why: "Balancing loyalty and honesty requires practical wisdom. A good person doesn't rush to judgment." },
    ]},
  { scenario: "A self-driving car's brakes fail. It can stay on course and hit three pedestrians, or swerve and hit one pedestrian on the sidewalk. The car must decide instantly.",
    choices: [
      { text: "Swerve — three lives outweigh one.", framework: "Utilitarianism", why: "Minimizing total harm is the clear utilitarian answer, even though it means actively choosing to endanger someone." },
      { text: "Stay on course — actively redirecting harm toward an innocent bystander is murder.", framework: "Deontology", why: "There's a moral difference between allowing harm and causing it. The car shouldn't be programmed to kill." },
      { text: "This reveals why we can't reduce ethics to algorithms.", framework: "Virtue Ethics", why: "No formula captures moral reality. We need human judgment, not just math." },
    ]},
];

const FORGE_QUESTIONS = {
  rapidFire: [
    { claim: "Utilitarianism judges actions by their outcomes, not their intentions.", answer: true, concept: "util", explanation: "Correct — utilitarianism is purely consequentialist. Only results matter, not motives." },
    { claim: "Kant believed consequences are the primary measure of moral worth.", answer: false, concept: "deont", explanation: "False — Kant held that duty and rational principle determine morality, not outcomes." },
    { claim: "Virtue ethics asks 'What should I do?' rather than 'What kind of person should I be?'", answer: false, concept: "virtue", explanation: "False — virtue ethics is fundamentally about character and who you become through your choices." },
    { claim: "The categorical imperative requires that moral rules apply universally without exception.", answer: true, concept: "catimperative", explanation: "Correct — 'categorical' means unconditional. If lying is wrong, it's always wrong, for everyone." },
    { claim: "Bentham's felicific calculus measures seven dimensions of pleasure and pain.", answer: true, concept: "felicific", explanation: "Correct — intensity, duration, certainty, propinquity, fecundity, purity, and extent." },
    { claim: "The doctrine of the mean states that virtue is always the exact mathematical midpoint between extremes.", answer: false, concept: "mean", explanation: "False — Aristotle said the mean is relative to the person and situation, not a fixed mathematical center." },
    { claim: "Nozick's experience machine proves that pleasure is all humans care about.", answer: false, concept: "expmachine", explanation: "False — the thought experiment shows most people reject pure pleasure, valuing authenticity and real experience." },
    { claim: "Rule utilitarianism evaluates each individual act separately.", answer: false, concept: "actrule", explanation: "False — that's ACT utilitarianism. Rule utilitarianism asks which general rules produce the best outcomes." },
    { claim: "Social contract theory holds that moral rules are justified because rational people would agree to them.", answer: true, concept: "socialcontract", explanation: "Correct — the legitimacy of rules comes from hypothetical rational consent, not divine command or natural law." },
    { claim: "Moral relativism claims that some ethical truths are universal across all cultures.", answer: false, concept: "relativism", explanation: "False — moral relativism denies universal moral truths, holding that right and wrong vary by culture." },
  ],
  deepDrill: [
    { question: "A utilitarian CEO discovers that a factory causes minor pollution affecting a small town, but shutting it down would eliminate 500 jobs. What does utilitarianism recommend?",
      options: ["Shut down immediately — pollution is always wrong", "Keep operating — 500 jobs outweigh minor pollution", "Calculate total pleasure/pain for all affected parties and choose the option with the greatest net good", "Follow whatever the law says"],
      correct: 2, concept: "util", explanation: "Utilitarianism requires calculating total consequences — not reflexive rules or legal compliance. The answer depends on the actual severity of harm versus benefit." },
    { question: "Which of these is a formulation of Kant's categorical imperative?",
      options: ["The greatest good for the greatest number", "Act only on maxims you could will as universal law", "Virtue lies in the mean between extremes", "Justice requires a veil of ignorance"],
      correct: 1, concept: "catimperative", explanation: "The Formula of Universal Law — could everyone follow your principle without contradiction?" },
    { question: "What distinguishes virtue ethics from both utilitarianism and deontology?",
      options: ["It focuses on consequences above all else", "It focuses on character and habits rather than rules or outcomes", "It requires mathematical calculation of pleasure", "It was developed in the 18th century"],
      correct: 1, concept: "virtue", explanation: "Virtue ethics asks 'What kind of person should I be?' — not 'What should I do?' or 'What outcome is best?'" },
    { question: "The trolley problem reveals a tension between which two ethical intuitions?",
      options: ["Virtue and vice", "Consequentialist logic and deontological respect for persons", "Natural law and divine command", "Act and rule utilitarianism"],
      correct: 1, concept: "trolley", explanation: "The math (5 > 1) pulls toward consequentialism, but the gut feeling against pushing someone pulls toward deontological respect for persons." },
  ],
};

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

const getMasteryTier = (m) => m >= 0.8 ? "mastered" : m >= 0.5 ? "strong" : m >= 0.2 ? "learning" : m > 0 ? "early" : "unseen";
const getMasteryColor = (m) => m >= 0.8 ? "#ffd700" : m >= 0.5 ? "#06d6a0" : m >= 0.2 ? "#00f0ff" : m > 0 ? "#4a4a8a" : "#1a1a3a";
const pct = (v) => `${Math.round(v * 100)}%`;
const typeIcon = (t) => t === "paper" ? "📝" : t === "discussion" ? "💬" : "❓";
const dueLabel = (d) => d <= 3 ? "Due soon" : d <= 7 ? "This week" : d <= 14 ? "In 2 weeks" : `In ${d} days`;

// ═══════════════════════════════════════════════════════════════
// MAIN APPLICATION
// ═══════════════════════════════════════════════════════════════

export default function AeonthrApp() {
  const [view, setView] = useState("home");
  const [concepts, setConcepts] = useState(CONCEPTS);
  const [selectedConcept, setSelectedConcept] = useState(null);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [forgePhase, setForgePhase] = useState("genesis");
  const [forgeState, setForgeState] = useState({ dilemmaIdx: 0, selected: null, revealed: false, rfIdx: 0, rfAnswer: null, rfRevealed: false, ddIdx: 0, ddAnswer: null, ddRevealed: false, score: { correct: 0, wrong: 0 } });
  const [oracleQuestion, setOracleQuestion] = useState("");
  const [oracleResponses, setOracleResponses] = useState(null);
  const [fadeIn, setFadeIn] = useState(true);
  
  const navigate = useCallback((v, data) => {
    setFadeIn(false);
    setTimeout(() => {
      setView(v);
      if (data?.concept) setSelectedConcept(data.concept);
      if (data?.assignment) setSelectedAssignment(data.assignment);
      if (v === "forge") setForgeState({ dilemmaIdx: Math.floor(Math.random() * GENESIS_DILEMMAS.length), selected: null, revealed: false, rfIdx: 0, rfAnswer: null, rfRevealed: false, ddIdx: 0, ddAnswer: null, ddRevealed: false, score: { correct: 0, wrong: 0 } });
      setFadeIn(true);
    }, 200);
  }, []);

  const updateMastery = (conceptId, delta) => {
    setConcepts(prev => prev.map(c => c.id === conceptId ? { ...c, mastery: Math.min(1, Math.max(0, c.mastery + delta)) } : c));
  };

  const askOracle = () => {
    if (!oracleQuestion.trim()) return;
    const responses = PHILOSOPHERS.map(p => {
      const q = oracleQuestion.toLowerCase();
      const relevantQuotes = p.quotes.filter(quote => {
        const words = q.split(/\s+/);
        return words.some(w => quote.text.toLowerCase().includes(w)) || Math.random() > 0.3;
      });
      const quote = relevantQuotes[0] || p.quotes[Math.floor(Math.random() * p.quotes.length)];
      return { ...p, selectedQuote: quote };
    });
    setOracleResponses(responses);
  };

  // ─── Mastery stats ───
  const masteredCount = concepts.filter(c => c.mastery >= 0.8).length;
  const avgMastery = concepts.reduce((s, c) => s + c.mastery, 0) / concepts.length;
  const nextAssignment = ASSIGNMENTS.sort((a, b) => a.dueIn - b.dueIn)[0];
  const unreadyConcepts = nextAssignment ? nextAssignment.concepts.filter(id => (concepts.find(c => c.id === id)?.mastery ?? 0) < 0.6) : [];

  return (
    <div style={S.app}>
      {/* ─── TOP NAV ─── */}
      <nav style={S.nav}>
        <div style={S.navLeft}>
          <span style={S.logo}>AEONTHRA</span>
          <span style={S.courseTag}>{COURSE.code}</span>
        </div>
        <div style={S.navLinks}>
          {[["home","Home"],["explore","Explore"],["forge","Learn"],["oracle","Oracle"]].map(([id, label]) => (
            <button key={id} onClick={() => navigate(id)} style={{...S.navLink, ...(view === id ? S.navLinkActive : {})}}>
              {label}
            </button>
          ))}
        </div>
      </nav>

      {/* ─── CONTENT ─── */}
      <main style={{...S.main, opacity: fadeIn ? 1 : 0, transition: "opacity 200ms ease"}}>

        {/* ═══ HOME ═══ */}
        {view === "home" && (
          <div style={S.homeGrid}>
            {/* Welcome */}
            <div style={{...S.card, gridColumn: "1 / -1"}}>
              <div style={S.welcomeRow}>
                <div>
                  <h1 style={S.h1}>{COURSE.title}</h1>
                  <p style={S.subtitle}>{COURSE.code} · {COURSE.term}</p>
                </div>
                <div style={S.statRow}>
                  <div style={S.stat}>
                    <div style={S.statValue}>{masteredCount}</div>
                    <div style={S.statLabel}>Mastered</div>
                  </div>
                  <div style={S.stat}>
                    <div style={S.statValue}>{pct(avgMastery)}</div>
                    <div style={S.statLabel}>Overall</div>
                  </div>
                  <div style={S.stat}>
                    <div style={S.statValue}>{concepts.length}</div>
                    <div style={S.statLabel}>Concepts</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Next Up */}
            {nextAssignment && (
              <div style={{...S.card, ...S.nextUpCard}}>
                <div style={S.eyebrow}>NEXT UP</div>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                  <span style={{fontSize:"1.4rem"}}>{typeIcon(nextAssignment.type)}</span>
                  <div>
                    <h3 style={S.h3}>{nextAssignment.title}</h3>
                    <p style={S.mutedSm}>{nextAssignment.subtitle} · {nextAssignment.points} pts · {dueLabel(nextAssignment.dueIn)}</p>
                  </div>
                </div>
                <p style={S.body}>{nextAssignment.description}</p>
                {unreadyConcepts.length > 0 && (
                  <div style={S.readinessBar}>
                    <span style={S.readinessLabel}>⚡ {unreadyConcepts.length} concept{unreadyConcepts.length > 1 ? "s" : ""} to prepare</span>
                    <button style={S.btnPrimary} onClick={() => navigate("forge")}>Start Learning</button>
                  </div>
                )}
              </div>
            )}

            {/* Mastery Overview */}
            <div style={S.card}>
              <div style={S.eyebrow}>CONCEPT MASTERY</div>
              <div style={S.masteryGrid}>
                {concepts.map(c => (
                  <button key={c.id} onClick={() => navigate("explore", { concept: c })} style={S.masteryChip}>
                    <div style={{...S.masteryDot, background: getMasteryColor(c.mastery)}} />
                    <div style={S.masteryChipText}>
                      <span style={S.masteryName}>{c.name}</span>
                      <span style={{...S.masteryPct, color: getMasteryColor(c.mastery)}}>{c.mastery > 0 ? pct(c.mastery) : "—"}</span>
                    </div>
                  </button>
                ))}
              </div>
              <button style={{...S.btnGhost, marginTop: 16}} onClick={() => navigate("explore")}>View all concepts →</button>
            </div>

            {/* Upcoming Work */}
            <div style={{...S.card, gridColumn: "1 / -1"}}>
              <div style={S.eyebrow}>ALL ASSIGNMENTS</div>
              <div style={S.assignmentList}>
                {ASSIGNMENTS.map(a => {
                  const ready = a.concepts.every(id => (concepts.find(c => c.id === id)?.mastery ?? 0) >= 0.6);
                  return (
                    <button key={a.id} onClick={() => navigate("assignment", { assignment: a })} style={S.assignmentRow}>
                      <span style={{fontSize:"1.2rem",width:32,textAlign:"center"}}>{typeIcon(a.type)}</span>
                      <div style={{flex:1,textAlign:"left"}}>
                        <div style={S.assignmentTitle}>{a.title}: {a.subtitle}</div>
                        <div style={S.mutedSm}>{a.points} pts · {dueLabel(a.dueIn)}</div>
                      </div>
                      <span style={{...S.statusBadge, ...(ready ? S.statusReady : S.statusLocked)}}>{ready ? "Ready" : "Prepare"}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ═══ EXPLORE ═══ */}
        {view === "explore" && (
          <div style={S.exploreLayout}>
            <div style={S.conceptList}>
              <h2 style={S.h2}>Concepts</h2>
              <p style={S.mutedSm}>{concepts.length} concepts · {masteredCount} mastered</p>
              <div style={{marginTop: 20, display:"flex", flexDirection:"column", gap: 8}}>
                {concepts.map(c => (
                  <button key={c.id} onClick={() => setSelectedConcept(c)} style={{...S.conceptBtn, ...(selectedConcept?.id === c.id ? S.conceptBtnActive : {})}}>
                    <div style={{...S.masteryDot, background: getMasteryColor(c.mastery), width:10, height:10}} />
                    <span style={{flex:1,textAlign:"left"}}>{c.name}</span>
                    <span style={{...S.masteryPct, color: getMasteryColor(c.mastery), fontSize:"0.75rem"}}>{c.mastery > 0 ? pct(c.mastery) : "—"}</span>
                  </button>
                ))}
              </div>
            </div>
            <div style={S.conceptDetail}>
              {selectedConcept ? (
                <>
                  <div style={{...S.eyebrow, color: getMasteryColor(selectedConcept.mastery)}}>{selectedConcept.category}</div>
                  <h2 style={S.h2}>{selectedConcept.name}</h2>
                  <div style={S.masteryBarOuter}>
                    <div style={{...S.masteryBarInner, width: pct(selectedConcept.mastery), background: getMasteryColor(selectedConcept.mastery)}} />
                  </div>
                  <p style={{...S.mutedSm, marginBottom: 24}}>{pct(selectedConcept.mastery)} mastery</p>

                  <div style={S.detailSection}>
                    <div style={S.detailLabel}>Core Idea</div>
                    <p style={S.detailBody}>{selectedConcept.core}</p>
                  </div>
                  <div style={S.detailSection}>
                    <div style={S.detailLabel}>In Depth</div>
                    <p style={S.detailBody}>{selectedConcept.detail}</p>
                  </div>
                  <div style={S.detailSection}>
                    <div style={S.detailLabel}>Memory Hook</div>
                    <p style={{...S.detailBody, fontStyle:"italic", color:"#06d6a0"}}>{selectedConcept.mnemonic}</p>
                  </div>
                  <div style={S.detailSection}>
                    <div style={S.detailLabel}>Key Terms</div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                      {selectedConcept.keywords.map(k => <span key={k} style={S.keywordTag}>{k}</span>)}
                    </div>
                  </div>
                  <button style={{...S.btnPrimary, marginTop: 24}} onClick={() => navigate("forge")}>Practice This Concept</button>
                </>
              ) : (
                <div style={{textAlign:"center",padding:60,color:"#6a6a9a"}}>
                  <div style={{fontSize:"2rem",marginBottom:12}}>←</div>
                  <p>Select a concept to explore its definition, depth, and memory hooks.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══ ASSIGNMENT DETAIL ═══ */}
        {view === "assignment" && selectedAssignment && (
          <div style={S.assignDetail}>
            <button style={S.backBtn} onClick={() => navigate("home")}>← Back</button>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:8}}>
              <span style={{fontSize:"1.8rem"}}>{typeIcon(selectedAssignment.type)}</span>
              <div>
                <h2 style={S.h2}>{selectedAssignment.title}</h2>
                <p style={S.mutedSm}>{selectedAssignment.subtitle} · {selectedAssignment.points} pts · {dueLabel(selectedAssignment.dueIn)}</p>
              </div>
            </div>
            <div style={S.card}>
              <div style={S.detailLabel}>What's being asked</div>
              <p style={S.detailBody}>{selectedAssignment.description}</p>
            </div>
            <div style={S.card}>
              <div style={S.detailLabel}>Concepts you need</div>
              <div style={{display:"flex",flexDirection:"column",gap:10,marginTop:8}}>
                {selectedAssignment.concepts.map(id => {
                  const c = concepts.find(x => x.id === id);
                  if (!c) return null;
                  const ready = c.mastery >= 0.6;
                  return (
                    <div key={id} style={S.conceptReqRow}>
                      <div style={{...S.masteryDot, background: getMasteryColor(c.mastery)}} />
                      <span style={{flex:1}}>{c.name}</span>
                      <span style={{...S.masteryPct, color: getMasteryColor(c.mastery)}}>{pct(c.mastery)}</span>
                      <span style={{...S.statusBadge,...(ready ? S.statusReady : S.statusLocked), fontSize:"0.65rem",padding:"3px 8px"}}>{ready ? "✓" : "Needs work"}</span>
                    </div>
                  );
                })}
              </div>
              {selectedAssignment.concepts.some(id => (concepts.find(c => c.id === id)?.mastery ?? 0) < 0.6) && (
                <button style={{...S.btnPrimary, marginTop:20}} onClick={() => navigate("forge")}>⚡ Prepare in Neural Forge</button>
              )}
            </div>
          </div>
        )}

        {/* ═══ FORGE ═══ */}
        {view === "forge" && (
          <div style={S.forgeLayout}>
            <div style={S.forgeNav}>
              {[["genesis","Genesis"],["rapidfire","Rapid Fire"],["deepdrill","Deep Drill"]].map(([id,label]) => (
                <button key={id} onClick={() => setForgePhase(id)} style={{...S.forgeTab,...(forgePhase === id ? S.forgeTabActive : {})}}>
                  {label}
                </button>
              ))}
              <div style={S.scoreDisplay}>
                <span style={{color:"#06d6a0"}}>✓ {forgeState.score.correct}</span>
                <span style={{color:"#ff4466"}}>✗ {forgeState.score.wrong}</span>
              </div>
            </div>

            {/* Genesis */}
            {forgePhase === "genesis" && (() => {
              const d = GENESIS_DILEMMAS[forgeState.dilemmaIdx];
              return (
                <div style={S.forgeCard}>
                  <div style={S.eyebrow}>ETHICAL DILEMMA</div>
                  <p style={S.scenarioText}>{d.scenario}</p>
                  <div style={S.choicesStack}>
                    {d.choices.map((choice, i) => (
                      <button key={i} onClick={() => { if (!forgeState.revealed) setForgeState(s => ({...s, selected: i, revealed: true})); }}
                        style={{...S.choiceBtn,
                          ...(forgeState.selected === i ? S.choiceSelected : {}),
                          ...(forgeState.revealed && forgeState.selected !== i ? {opacity: 0.4} : {}),
                          pointerEvents: forgeState.revealed ? "none" : "auto"
                        }}>
                        <div style={S.choiceText}>{choice.text}</div>
                        {forgeState.revealed && forgeState.selected === i && (
                          <div style={S.revealBox}>
                            <div style={S.revealFramework}>{choice.framework}</div>
                            <p style={S.revealWhy}>{choice.why}</p>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                  {forgeState.revealed && (
                    <button style={S.btnPrimary} onClick={() => setForgeState(s => ({...s, dilemmaIdx: (s.dilemmaIdx + 1) % GENESIS_DILEMMAS.length, selected: null, revealed: false}))}>
                      Next Dilemma →
                    </button>
                  )}
                </div>
              );
            })()}

            {/* Rapid Fire */}
            {forgePhase === "rapidfire" && (() => {
              const q = FORGE_QUESTIONS.rapidFire[forgeState.rfIdx];
              if (!q) return <div style={S.forgeCard}><p style={S.body}>You've completed all rapid fire questions!</p><button style={S.btnPrimary} onClick={() => setForgePhase("deepdrill")}>Continue to Deep Drill →</button></div>;
              return (
                <div style={S.forgeCard}>
                  <div style={S.eyebrow}>TRUE OR FALSE</div>
                  <p style={S.scenarioText}>{q.claim}</p>
                  {!forgeState.rfRevealed ? (
                    <div style={{display:"flex",gap:16,marginTop:20}}>
                      <button style={{...S.tfBtn,...S.tfTrue}} onClick={() => {
                        const correct = q.answer === true;
                        setForgeState(s => ({...s, rfAnswer: true, rfRevealed: true, score: {...s.score, correct: s.score.correct + (correct ? 1 : 0), wrong: s.score.wrong + (correct ? 0 : 1)}}));
                        if (correct) updateMastery(q.concept, 0.05);
                      }}>TRUE</button>
                      <button style={{...S.tfBtn,...S.tfFalse}} onClick={() => {
                        const correct = q.answer === false;
                        setForgeState(s => ({...s, rfAnswer: false, rfRevealed: true, score: {...s.score, correct: s.score.correct + (correct ? 1 : 0), wrong: s.score.wrong + (correct ? 0 : 1)}}));
                        if (correct) updateMastery(q.concept, 0.05);
                      }}>FALSE</button>
                    </div>
                  ) : (
                    <div style={{marginTop:20}}>
                      <div style={{...S.feedbackBar, background: forgeState.rfAnswer === q.answer ? "rgba(6,214,160,0.12)" : "rgba(255,68,102,0.12)", borderColor: forgeState.rfAnswer === q.answer ? "#06d6a0" : "#ff4466"}}>
                        <strong>{forgeState.rfAnswer === q.answer ? "✓ Correct!" : "✗ Not quite."}</strong>
                        <span style={{marginLeft: 8}}>Answer: {q.answer ? "True" : "False"}</span>
                      </div>
                      <p style={{...S.body, marginTop: 12}}>{q.explanation}</p>
                      <button style={{...S.btnPrimary, marginTop: 16}} onClick={() => setForgeState(s => ({...s, rfIdx: s.rfIdx + 1, rfAnswer: null, rfRevealed: false}))}>Next →</button>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Deep Drill */}
            {forgePhase === "deepdrill" && (() => {
              const q = FORGE_QUESTIONS.deepDrill[forgeState.ddIdx];
              if (!q) return <div style={S.forgeCard}><p style={S.body}>Deep drill complete! Your score: {forgeState.score.correct} correct, {forgeState.score.wrong} wrong.</p><button style={S.btnPrimary} onClick={() => navigate("home")}>Return Home</button></div>;
              return (
                <div style={S.forgeCard}>
                  <div style={S.eyebrow}>DEEP DRILL</div>
                  <p style={S.scenarioText}>{q.question}</p>
                  <div style={S.choicesStack}>
                    {q.options.map((opt, i) => (
                      <button key={i} onClick={() => {
                        if (forgeState.ddRevealed) return;
                        const correct = i === q.correct;
                        setForgeState(s => ({...s, ddAnswer: i, ddRevealed: true, score: {...s.score, correct: s.score.correct + (correct ? 1 : 0), wrong: s.score.wrong + (correct ? 0 : 1)}}));
                        if (correct) updateMastery(q.concept, 0.08);
                      }} style={{...S.choiceBtn,
                        ...(forgeState.ddRevealed && i === q.correct ? {borderColor:"#06d6a0",background:"rgba(6,214,160,0.06)"} : {}),
                        ...(forgeState.ddRevealed && forgeState.ddAnswer === i && i !== q.correct ? {borderColor:"#ff4466",background:"rgba(255,68,102,0.06)"} : {}),
                        ...(forgeState.ddRevealed && forgeState.ddAnswer !== i && i !== q.correct ? {opacity:0.35} : {}),
                        pointerEvents: forgeState.ddRevealed ? "none" : "auto"
                      }}>
                        <div style={S.choiceText}>{opt}</div>
                      </button>
                    ))}
                  </div>
                  {forgeState.ddRevealed && (
                    <div style={{marginTop: 16}}>
                      <p style={S.body}>{q.explanation}</p>
                      <button style={{...S.btnPrimary, marginTop: 16}} onClick={() => setForgeState(s => ({...s, ddIdx: s.ddIdx + 1, ddAnswer: null, ddRevealed: false}))}>Next →</button>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* ═══ ORACLE ═══ */}
        {view === "oracle" && (
          <div style={S.oracleLayout}>
            <h2 style={S.h2}>Oracle Panel</h2>
            <p style={S.body}>Ask an ethical question. Six philosophers will respond from their own frameworks.</p>
            <div style={{display:"flex",gap:12,marginTop:20,marginBottom:32}}>
              <input value={oracleQuestion} onChange={e => setOracleQuestion(e.target.value)}
                onKeyDown={e => e.key === "Enter" && askOracle()}
                placeholder="e.g. Is lying ever justified?" style={S.oracleInput} />
              <button style={S.btnPrimary} onClick={askOracle}>Ask</button>
            </div>
            {!oracleResponses && (
              <div style={S.philosopherGrid}>
                {PHILOSOPHERS.map(p => (
                  <div key={p.name} style={S.philosopherCard}>
                    <div style={S.philosopherName}>{p.name}</div>
                    <div style={S.philosopherTradition}>{p.tradition}</div>
                    <div style={S.mutedSm}>{p.quotes.length} positions indexed</div>
                  </div>
                ))}
              </div>
            )}
            {oracleResponses && (
              <div style={{display:"flex",flexDirection:"column",gap:16}}>
                {oracleResponses.map(r => (
                  <div key={r.name} style={S.oracleResponseCard}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                      <div>
                        <div style={S.philosopherName}>{r.name}</div>
                        <div style={S.philosopherTradition}>{r.tradition}</div>
                      </div>
                      <span style={S.pageCite}>p. {r.selectedQuote.page}</span>
                    </div>
                    <p style={S.quoteText}>"{r.selectedQuote.text}"</p>
                  </div>
                ))}
                <button style={S.btnGhost} onClick={() => { setOracleResponses(null); setOracleQuestion(""); }}>Ask another question</button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// STYLES — Dark, atmospheric, spacious, tactile
// ═══════════════════════════════════════════════════════════════

const S = {
  app: { minHeight:"100vh", background:"#020208", backgroundImage:"radial-gradient(ellipse at 50% 0%, #0a0a1a 0%, #020208 60%)", color:"#e0e0ff", fontFamily:"'Segoe UI', system-ui, -apple-system, sans-serif", },
  nav: { display:"flex", justifyContent:"space-between", alignItems:"center", padding:"16px 32px", borderBottom:"1px solid rgba(0,240,255,0.08)", position:"sticky", top:0, zIndex:100, background:"rgba(2,2,8,0.92)", backdropFilter:"blur(12px)" },
  navLeft: { display:"flex", alignItems:"center", gap: 16 },
  logo: { fontWeight:900, fontSize:"1.1rem", letterSpacing:"0.12em", color:"#00f0ff", textShadow:"0 0 20px rgba(0,240,255,0.3)" },
  courseTag: { fontSize:"0.7rem", letterSpacing:"0.15em", color:"#6a6a9a", border:"1px solid #1a1a3a", padding:"4px 10px", borderRadius:20 },
  navLinks: { display:"flex", gap:4 },
  navLink: { background:"transparent", border:"none", color:"#6a6a9a", padding:"8px 16px", borderRadius:8, cursor:"pointer", fontSize:"0.82rem", fontWeight:600, transition:"all 250ms" },
  navLinkActive: { color:"#00f0ff", background:"rgba(0,240,255,0.06)" },
  main: { maxWidth: 1100, margin:"0 auto", padding:"32px 24px 80px" },
  
  // Cards
  card: { background:"rgba(6,6,15,0.7)", border:"1px solid rgba(26,26,58,0.5)", borderRadius:16, padding:"24px 28px", },
  
  // Home
  homeGrid: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, alignItems:"start" },
  welcomeRow: { display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:20 },
  statRow: { display:"flex", gap:32 },
  stat: { textAlign:"center" },
  statValue: { fontSize:"1.6rem", fontWeight:700, color:"#e0e0ff", fontVariantNumeric:"tabular-nums" },
  statLabel: { fontSize:"0.7rem", color:"#6a6a9a", letterSpacing:"0.1em", textTransform:"uppercase", marginTop:2 },
  nextUpCard: { gridColumn: "1 / -1" },
  readinessBar: { display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:16, padding:"12px 16px", background:"rgba(0,240,255,0.04)", borderRadius:12, border:"1px solid rgba(0,240,255,0.1)" },
  readinessLabel: { color:"#00f0ff", fontSize:"0.82rem", fontWeight:600 },
  
  // Typography
  h1: { fontSize:"1.5rem", fontWeight:700, margin:0, lineHeight:1.3, color:"#e0e0ff" },
  h2: { fontSize:"1.2rem", fontWeight:700, margin:"0 0 4px", color:"#e0e0ff" },
  h3: { fontSize:"0.95rem", fontWeight:600, margin:0, color:"#e0e0ff" },
  subtitle: { fontSize:"0.82rem", color:"#6a6a9a", margin:"4px 0 0" },
  eyebrow: { fontSize:"0.65rem", fontWeight:700, letterSpacing:"0.15em", textTransform:"uppercase", color:"#6a6a9a", marginBottom:12 },
  body: { fontSize:"0.88rem", lineHeight:1.65, color:"#b0b0d0", margin:0 },
  mutedSm: { fontSize:"0.75rem", color:"#6a6a9a", margin:0 },
  
  // Mastery
  masteryGrid: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 },
  masteryChip: { display:"flex", alignItems:"center", gap:10, background:"transparent", border:"1px solid transparent", borderRadius:10, padding:"8px 12px", cursor:"pointer", textAlign:"left", transition:"all 200ms", color:"#e0e0ff", width:"100%" },
  masteryDot: { width:8, height:8, borderRadius:"50%", flexShrink:0 },
  masteryChipText: { display:"flex", justifyContent:"space-between", flex:1 },
  masteryName: { fontSize:"0.78rem" },
  masteryPct: { fontSize:"0.72rem", fontWeight:700, fontVariantNumeric:"tabular-nums" },
  masteryBarOuter: { height:4, background:"rgba(26,26,58,0.6)", borderRadius:2, margin:"12px 0 6px", overflow:"hidden" },
  masteryBarInner: { height:"100%", borderRadius:2, transition:"width 600ms cubic-bezier(0.22,1,0.36,1)" },
  
  // Buttons
  btnPrimary: { background:"linear-gradient(135deg, #00f0ff, #0080ff)", color:"#000", border:"none", padding:"10px 22px", borderRadius:10, fontWeight:700, fontSize:"0.78rem", cursor:"pointer", letterSpacing:"0.05em", transition:"all 200ms" },
  btnGhost: { background:"transparent", border:"1px solid rgba(0,240,255,0.2)", color:"#00f0ff", padding:"8px 18px", borderRadius:10, fontSize:"0.75rem", fontWeight:600, cursor:"pointer", transition:"all 200ms" },
  backBtn: { background:"transparent", border:"none", color:"#6a6a9a", cursor:"pointer", fontSize:"0.82rem", padding:"4px 0", marginBottom:16 },
  
  // Assignments
  assignmentList: { display:"flex", flexDirection:"column", gap:8, marginTop:12 },
  assignmentRow: { display:"flex", alignItems:"center", gap:12, padding:"14px 16px", background:"rgba(10,10,26,0.5)", border:"1px solid rgba(26,26,58,0.4)", borderRadius:12, cursor:"pointer", transition:"all 250ms", width:"100%", color:"#e0e0ff" },
  assignmentTitle: { fontSize:"0.85rem", fontWeight:600 },
  statusBadge: { fontSize:"0.68rem", fontWeight:700, letterSpacing:"0.08em", padding:"4px 10px", borderRadius:20 },
  statusReady: { color:"#06d6a0", border:"1px solid rgba(6,214,160,0.3)", background:"rgba(6,214,160,0.06)" },
  statusLocked: { color:"#ff8800", border:"1px solid rgba(255,136,0,0.3)", background:"rgba(255,136,0,0.06)" },
  
  // Explore
  exploreLayout: { display:"grid", gridTemplateColumns:"300px 1fr", gap:24, alignItems:"start" },
  conceptList: { background:"rgba(6,6,15,0.7)", border:"1px solid rgba(26,26,58,0.5)", borderRadius:16, padding:"24px 20px", position:"sticky", top:80 },
  conceptBtn: { display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:10, background:"transparent", border:"1px solid transparent", cursor:"pointer", width:"100%", color:"#e0e0ff", fontSize:"0.82rem", transition:"all 200ms" },
  conceptBtnActive: { background:"rgba(0,240,255,0.06)", borderColor:"rgba(0,240,255,0.2)" },
  conceptDetail: { background:"rgba(6,6,15,0.7)", border:"1px solid rgba(26,26,58,0.5)", borderRadius:16, padding:"32px 36px", minHeight:500 },
  detailSection: { marginBottom:24 },
  detailLabel: { fontSize:"0.68rem", fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:"#00f0ff", marginBottom:8 },
  detailBody: { fontSize:"0.9rem", lineHeight:1.7, color:"#c8c8e8", margin:0 },
  keywordTag: { padding:"3px 10px", borderRadius:20, border:"1px solid rgba(26,26,58,0.5)", fontSize:"0.7rem", color:"#6a6a9a", background:"rgba(10,10,26,0.6)" },
  conceptReqRow: { display:"flex", alignItems:"center", gap:10, padding:"8px 0" },

  // Assignment detail
  assignDetail: { maxWidth: 700 },
  
  // Forge
  forgeLayout: { maxWidth:700, margin:"0 auto" },
  forgeNav: { display:"flex", gap:4, marginBottom:24, alignItems:"center" },
  forgeTab: { background:"transparent", border:"1px solid rgba(26,26,58,0.4)", color:"#6a6a9a", padding:"8px 18px", borderRadius:20, cursor:"pointer", fontSize:"0.75rem", fontWeight:700, letterSpacing:"0.08em", transition:"all 200ms" },
  forgeTabActive: { color:"#00f0ff", borderColor:"rgba(0,240,255,0.3)", background:"rgba(0,240,255,0.06)" },
  scoreDisplay: { marginLeft:"auto", display:"flex", gap:12, fontSize:"0.82rem", fontWeight:700 },
  forgeCard: { background:"rgba(6,6,15,0.7)", border:"1px solid rgba(26,26,58,0.5)", borderRadius:16, padding:"32px" },
  scenarioText: { fontSize:"1.05rem", lineHeight:1.7, color:"#d0d0f0", margin:"12px 0 24px" },
  choicesStack: { display:"flex", flexDirection:"column", gap:10 },
  choiceBtn: { textAlign:"left", padding:"16px 20px", borderRadius:12, border:"1px solid rgba(26,26,58,0.4)", background:"rgba(10,10,26,0.5)", cursor:"pointer", color:"#e0e0ff", transition:"all 300ms", width:"100%" },
  choiceSelected: { borderColor:"#00f0ff", background:"rgba(0,240,255,0.04)" },
  choiceText: { fontSize:"0.88rem", lineHeight:1.5 },
  revealBox: { marginTop:12, padding:"12px 16px", borderRadius:10, background:"rgba(0,240,255,0.04)", border:"1px solid rgba(0,240,255,0.12)" },
  revealFramework: { fontSize:"0.7rem", fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:"#00f0ff", marginBottom:6 },
  revealWhy: { fontSize:"0.82rem", lineHeight:1.5, color:"#b0b0d0", margin:0 },
  
  // True/False
  tfBtn: { padding:"14px 32px", borderRadius:12, fontWeight:700, fontSize:"0.85rem", letterSpacing:"0.08em", cursor:"pointer", border:"none", transition:"all 200ms", flex:1 },
  tfTrue: { background:"rgba(6,214,160,0.12)", color:"#06d6a0", border:"1px solid rgba(6,214,160,0.3)" },
  tfFalse: { background:"rgba(255,68,102,0.12)", color:"#ff4466", border:"1px solid rgba(255,68,102,0.3)" },
  feedbackBar: { padding:"12px 16px", borderRadius:10, border:"1px solid", fontSize:"0.85rem" },
  
  // Oracle
  oracleLayout: { maxWidth:800, margin:"0 auto" },
  oracleInput: { flex:1, padding:"12px 16px", borderRadius:12, border:"1px solid rgba(26,26,58,0.5)", background:"rgba(10,10,26,0.8)", color:"#e0e0ff", fontSize:"0.88rem", outline:"none" },
  philosopherGrid: { display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:12 },
  philosopherCard: { padding:"20px", borderRadius:12, border:"1px solid rgba(26,26,58,0.4)", background:"rgba(10,10,26,0.5)" },
  philosopherName: { fontSize:"0.92rem", fontWeight:700, color:"#e0e0ff" },
  philosopherTradition: { fontSize:"0.72rem", color:"#00f0ff", marginTop:2, marginBottom:6 },
  oracleResponseCard: { padding:"24px", borderRadius:14, border:"1px solid rgba(0,240,255,0.12)", background:"rgba(6,6,15,0.7)" },
  pageCite: { fontSize:"0.7rem", color:"#6a6a9a", fontStyle:"italic" },
  quoteText: { fontSize:"0.92rem", lineHeight:1.7, color:"#c8c8e8", fontStyle:"italic", margin:0 },
};
