import {
  SCHEMA_VERSION,
  slugify,
  stableHash,
  type CaptureBundle,
  type CaptureItem,
  type ConceptRelation,
  type EngineProfile,
  type EvidenceFragment,
  type LearningBundle,
  type LearningConcept,
  type LearningSynthesis,
  type MegaPhase,
  type NeuralForgePhase
} from "@learning/schema";
import type { AppProgress } from "./workspace";

const DEMO_CAPTURED_AT = "2026-04-10T18:30:00.000Z";
const DEMO_PIPELINE_STAGES = [
  "normalize",
  "segment",
  "extract",
  "rank",
  "align",
  "fuse",
  "crystallize",
  "generate",
  "package-offline"
] as const;
const DEMO_INSTRUCTOR_VERBS = [
  "analyze",
  "compare",
  "explain",
  "apply",
  "defend",
  "discuss",
  "identify",
  "evaluate"
] as const;

type DemoConceptSeed = {
  label: string;
  category: string;
  definition: string;
  detail: string;
  mnemonic: string;
  keywords: string[];
  module: number;
  sourceTitle: string;
  commonConfusion: string;
  transferHook: string;
  related: string[];
};

export type DemoAttributionGroup = {
  thinker: string;
  tradition: string;
  passages: Array<{ text: string; page: number }>;
};

function createItem(input: {
  kind: CaptureItem["kind"];
  title: string;
  canonicalUrl: string;
  plainText: string;
  html?: string;
  headingTrail?: string[];
  tags?: string[];
}): CaptureItem {
  const text = input.plainText.trim().replace(/\s+/g, " ");
  return {
    id: stableHash(`${input.canonicalUrl}:${input.title}:${text}`),
    kind: input.kind,
    title: input.title,
    titleSource: "inferred",
    canonicalUrl: input.canonicalUrl,
    plainText: text,
    excerpt: text.slice(0, 240),
    html: input.html,
    headingTrail: input.headingTrail ?? [input.title],
    tags: ["demo", ...(input.tags ?? [])],
    submissionTypes: [],
    capturedAt: DEMO_CAPTURED_AT,
    contentHash: stableHash(text),
    captureStrategy: "demo-seed",
    provenanceKind: "DEMO_SEED",
    sourceEndpoint: input.canonicalUrl,
    sourceHost: "demo.local",
    adapterVersion: "demo-seed-v1"
  };
}

function pageHtml(title: string, sections: Array<{ heading: string; body: string }>): string {
  return `
    <main>
      <h1>${title}</h1>
      ${sections.map((section) => `<section><h2>${section.heading}</h2><p>${section.body}</p></section>`).join("")}
    </main>
  `;
}

const DEMO_CONCEPTS: DemoConceptSeed[] = [
  {
    label: "Utilitarianism",
    category: "Consequentialism",
    definition: "Utilitarianism is the ethical theory that the right action is the one that produces the greatest good for the greatest number.",
    detail: "Developed by Jeremy Bentham and refined by John Stuart Mill, utilitarianism evaluates actions by consequences rather than by fixed duties. A strong utilitarian answer compares likely gains and harms across everyone affected instead of focusing on one person's feelings alone.",
    mnemonic: "Utilitarianism: picture a glowing utility meter over every choice, adding up total happiness for everyone in the room before the action counts as right.",
    keywords: ["consequences", "greatest good", "happiness", "Bentham", "Mill", "pleasure", "pain"],
    module: 1,
    sourceTitle: "Module 1 - Utilitarianism",
    commonConfusion: "Utilitarianism is not just 'do whatever feels helpful.' It asks for a disciplined comparison of total consequences across the whole group.",
    transferHook: "Use utilitarianism when an assignment asks you to compare likely outcomes, harms, benefits, and total well-being.",
    related: ["Felicific Calculus", "Act vs Rule Utilitarianism", "Experience Machine", "Trolley Problem", "Deontology"]
  },
  {
    label: "Deontology",
    category: "Non-consequentialism",
    definition: "Deontology holds that actions are morally right or wrong based on duties and rules, regardless of whether breaking them would produce a better outcome.",
    detail: "Immanuel Kant argues that moral law comes from reason and must apply universally. A deontological answer can reject a useful result when getting it requires lying, coercion, or using another person unfairly.",
    mnemonic: "Deontology: think of a judge holding a rulebook shut against pressure from the crowd. Duty first, results second.",
    keywords: ["duty", "rules", "Kant", "categorical imperative", "universal law", "means", "ends"],
    module: 2,
    sourceTitle: "Module 2 - Deontology",
    commonConfusion: "Deontology is not about being rigid for its own sake. It protects the idea that some actions stay wrong even when they would be convenient.",
    transferHook: "Use deontology when you need to show why a moral rule should constrain action even under pressure.",
    related: ["Categorical Imperative", "Utilitarianism", "Trolley Problem", "Natural Law Theory"]
  },
  {
    label: "Virtue Ethics",
    category: "Character-based",
    definition: "Virtue ethics focuses on the character of the moral agent rather than on rules or consequences alone.",
    detail: "Aristotle argues that virtues are stable habits developed through practice. Instead of asking only 'What rule applies?' or 'What outcome is best?', virtue ethics asks what courage, honesty, justice, and practical wisdom require here.",
    mnemonic: "Virtue ethics: ask, 'What would a deeply good person become by making this choice again and again?' Character over calculation.",
    keywords: ["character", "virtue", "Aristotle", "habit", "flourishing", "wisdom", "choice"],
    module: 3,
    sourceTitle: "Module 3 - Virtue Ethics",
    commonConfusion: "Virtue ethics is not vague niceness. It is a disciplined way of naming the trait that fits the situation and the habits the action is building.",
    transferHook: "Use virtue ethics when a prompt asks what kind of person a decision cultivates over time.",
    related: ["Doctrine of the Mean", "Deontology", "Utilitarianism", "Trolley Problem"]
  },
  {
    label: "Categorical Imperative",
    category: "Deontological Principles",
    definition: "Kant's categorical imperative is the supreme moral principle: act only on a maxim you could will to become a universal law.",
    detail: "Its Formula of Universal Law tests whether your principle could apply to everyone without contradiction. Its Formula of Humanity requires treating people as ends in themselves, never merely as tools for someone else's plan.",
    mnemonic: "Categorical imperative: Categorical means 'always,' not 'only if it helps.' If the rule cannot survive universal use, the act fails.",
    keywords: ["Kant", "universal law", "maxim", "humanity", "ends", "means", "duty"],
    module: 2,
    sourceTitle: "Module 2 - Categorical Imperative",
    commonConfusion: "The categorical imperative is not just 'follow rules.' It asks whether the rule itself could be universal and whether people are being reduced to tools.",
    transferHook: "Use the categorical imperative when you need to test a maxim or ask whether a choice treats people as ends rather than means.",
    related: ["Deontology", "Trolley Problem", "Natural Law Theory"]
  },
  {
    label: "Felicific Calculus",
    category: "Utilitarian Methods",
    definition: "Bentham's felicific calculus is a method for estimating how much pleasure and pain an action is likely to produce.",
    detail: "The calculus weighs intensity, duration, certainty, propinquity, fecundity, purity, and extent. It turns utilitarian reasoning into a structured comparison rather than a vague guess about what seems nice.",
    mnemonic: "Felicific calculus: remember seven dials on Bentham's control panel, each one measuring a different part of pleasure and pain before the final score appears.",
    keywords: ["Bentham", "pleasure", "pain", "calculation", "intensity", "duration", "extent"],
    module: 1,
    sourceTitle: "Module 1 - Felicific Calculus",
    commonConfusion: "The felicific calculus is not the whole of utilitarianism. It is Bentham's method for making consequence comparison systematic.",
    transferHook: "Use felicific calculus when you need to explain how Bentham would compare competing outcomes in detail.",
    related: ["Utilitarianism", "Act vs Rule Utilitarianism", "Experience Machine"]
  },
  {
    label: "Doctrine of the Mean",
    category: "Virtue Ethics Principles",
    definition: "Aristotle's doctrine of the mean states that virtue is a middle ground between excess and deficiency.",
    detail: "Courage lies between cowardice and recklessness. Generosity lies between stinginess and extravagance. The mean is not mathematical; it is the fitting balance relative to the person and the situation.",
    mnemonic: "Doctrine of the mean: picture a guitar string. Too loose gives no music, too tight snaps, but the right tension produces virtue.",
    keywords: ["Aristotle", "mean", "excess", "deficiency", "courage", "temperance", "moderation"],
    module: 3,
    sourceTitle: "Module 3 - Doctrine of the Mean",
    commonConfusion: "The mean is not mediocrity. It is the right response between two moral failures.",
    transferHook: "Use the doctrine of the mean when you need to name the balanced virtue between two bad extremes.",
    related: ["Virtue Ethics", "Trolley Problem"]
  },
  {
    label: "Experience Machine",
    category: "Objections to Utilitarianism",
    definition: "Robert Nozick's experience machine asks whether you would plug into a simulation that guarantees a perfectly pleasant life.",
    detail: "If pleasure were the only thing that mattered, plugging in should be an easy choice. Most people refuse, suggesting that reality, achievement, and authentic relationships matter in ways a simple pleasure score cannot capture.",
    mnemonic: "Experience machine: think of the red pill in The Matrix. Perfect feelings are not enough if the life producing them is fake.",
    keywords: ["Nozick", "thought experiment", "pleasure", "reality", "authenticity", "objection"],
    module: 4,
    sourceTitle: "Module 4 - Experience Machine",
    commonConfusion: "The experience machine is not a utilitarian method. It is an objection meant to test whether pleasure alone can define the good life.",
    transferHook: "Use the experience machine when you need to challenge a purely pleasure-based account of value.",
    related: ["Utilitarianism", "Felicific Calculus", "Act vs Rule Utilitarianism"]
  },
  {
    label: "Act vs Rule Utilitarianism",
    category: "Utilitarian Variations",
    definition: "Act utilitarianism judges each action directly by consequences, while rule utilitarianism asks which general rules would produce the best overall results if widely followed.",
    detail: "Act utilitarianism is flexible but can justify unfairness in individual cases. Rule utilitarianism trades some flexibility for stability, arguing that rules protecting trust and rights often produce better long-term outcomes.",
    mnemonic: "Act vs rule: Act is the referee replaying every single play; Rule is the league writing a rulebook for the whole season.",
    keywords: ["act", "rule", "individual", "general", "consequences", "rights", "stability"],
    module: 4,
    sourceTitle: "Module 4 - Act vs Rule Utilitarianism",
    commonConfusion: "These are not two different moral worlds. They are two ways of applying utilitarian reasoning with different tradeoffs between flexibility and stability.",
    transferHook: "Use act versus rule utilitarianism when a case asks whether you should judge a single act or the rule that would govern many acts.",
    related: ["Utilitarianism", "Felicific Calculus", "Experience Machine", "Social Contract Theory"]
  },
  {
    label: "Social Contract Theory",
    category: "Political Philosophy",
    definition: "Social contract theory holds that moral and political rules are justified because rational people would agree to them under fair conditions.",
    detail: "Hobbes stresses escape from the chaos of the state of nature, while Rawls asks what principles people would choose behind a veil of ignorance. The focus is fair cooperation, reciprocity, and rules no one could reasonably reject from the start.",
    mnemonic: "Social contract: imagine writing society's rulebook before you know which player you will be. You would build fairness in before the game begins.",
    keywords: ["Hobbes", "Rawls", "agreement", "fairness", "veil of ignorance", "state of nature"],
    module: 5,
    sourceTitle: "Module 5 - Social Contract Theory",
    commonConfusion: "Social contract theory is not just obedience to power. Its question is what rules free and equal people could fairly agree to.",
    transferHook: "Use social contract theory when a case turns on fair rules, consent, and designing institutions under uncertainty.",
    related: ["Moral Relativism", "Natural Law Theory", "Act vs Rule Utilitarianism"]
  },
  {
    label: "Moral Relativism",
    category: "Metaethics",
    definition: "Moral relativism holds that moral judgments are relative to cultural, societal, or individual standards rather than universally true for everyone.",
    detail: "Cultural relativism helps explain disagreement across societies, but critics argue that pure relativism makes it hard to condemn practices like slavery or genocide in any principled way. The challenge is separating tolerance from moral paralysis.",
    mnemonic: "Moral relativism: take 'When in Rome, do as the Romans do' to the limit, then ask what happens when Rome is unjust.",
    keywords: ["culture", "relative", "universal", "tolerance", "criticism", "standards"],
    module: 5,
    sourceTitle: "Module 5 - Moral Relativism",
    commonConfusion: "Relativism is not the same as being open-minded. It is the stronger claim that moral truth itself changes with the standpoint or culture.",
    transferHook: "Use moral relativism when a prompt asks how to understand moral disagreement and whether universal criticism is still possible.",
    related: ["Natural Law Theory", "Social Contract Theory"]
  },
  {
    label: "Trolley Problem",
    category: "Applied Ethics",
    definition: "The trolley problem asks whether it is permissible to sacrifice one person in order to save five others.",
    detail: "The lever version and the footbridge version produce the same arithmetic but very different moral intuitions. That gap exposes a live tension between consequentialist reasoning, duty-based constraints, and character-sensitive judgment.",
    mnemonic: "Trolley problem: the math says 5 is bigger than 1, but your gut changes when your hands become part of the cause.",
    keywords: ["dilemma", "trolley", "lever", "footbridge", "five", "one", "consequences", "intentions"],
    module: 6,
    sourceTitle: "Module 6 - Trolley Problem",
    commonConfusion: "The trolley problem is not just a puzzle about arithmetic. It is a pressure test for what different ethical frameworks actually prioritize.",
    transferHook: "Use the trolley problem when you need one case that makes utilitarian, deontological, and virtue-ethical intuitions visibly diverge.",
    related: ["Utilitarianism", "Deontology", "Virtue Ethics", "Categorical Imperative", "Doctrine of the Mean"]
  },
  {
    label: "Natural Law Theory",
    category: "Moral Foundations",
    definition: "Natural law theory holds that moral standards are grounded in human nature and can be discovered through reason.",
    detail: "Thomas Aquinas argues that moral order is not arbitrary; it fits the goods built into human flourishing. Modern versions often translate that idea into secular language about what supports or frustrates human well-being.",
    mnemonic: "Natural law: imagine a compass built into human nature, pointing toward flourishing even when people argue about the map.",
    keywords: ["nature", "reason", "Aquinas", "flourishing", "universal", "objective"],
    module: 6,
    sourceTitle: "Module 6 - Natural Law Theory",
    commonConfusion: "Natural law is not just 'what feels natural.' It is the claim that reason can discover real moral structure in human flourishing.",
    transferHook: "Use natural law theory when you need to explain how objective moral standards could be rooted in human nature itself.",
    related: ["Moral Relativism", "Deontology", "Social Contract Theory"]
  }
];

export const DEMO_ATTRIBUTIONS: DemoAttributionGroup[] = [
  {
    thinker: "Jeremy Bentham",
    tradition: "utilitarianism",
    passages: [
      { text: "The greatest happiness of the greatest number is the foundation of morals and legislation.", page: 44 },
      { text: "Nature has placed mankind under the governance of two sovereign masters: pain and pleasure.", page: 43 },
      { text: "The quantity of pleasure being equal, pushpin is as good as poetry.", page: 46 }
    ]
  },
  {
    thinker: "John Stuart Mill",
    tradition: "utilitarianism",
    passages: [
      { text: "Actions are right in proportion as they tend to promote happiness, wrong as they tend to produce the reverse.", page: 49 },
      { text: "It is better to be a human being dissatisfied than a pig satisfied; better to be Socrates dissatisfied than a fool satisfied.", page: 51 },
      { text: "The sole evidence it is possible to produce that anything is desirable is that people actually desire it.", page: 53 }
    ]
  },
  {
    thinker: "Immanuel Kant",
    tradition: "deontology",
    passages: [
      { text: "Act only according to that maxim whereby you can at the same time will that it should become a universal law.", page: 62 },
      { text: "Treat humanity, whether in your own person or in the person of any other, never merely as a means to an end, but always at the same time as an end.", page: 64 },
      { text: "Two things fill the mind with ever new and increasing admiration: the starry heavens above me and the moral law within me.", page: 60 }
    ]
  },
  {
    thinker: "Aristotle",
    tradition: "virtue ethics",
    passages: [
      { text: "Virtue is a state of character concerned with choice, lying in a mean relative to us.", page: 80 },
      { text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", page: 78 },
      { text: "The function of man is to live a certain kind of life, and this activity implies a rational principle.", page: 76 }
    ]
  },
  {
    thinker: "Robert Nozick",
    tradition: "libertarian critique",
    passages: [{ text: "The experience machine shows that something matters to us in addition to experience: we want to actually do things, not just have the experience of doing them.", page: 92 }]
  },
  {
    thinker: "John Rawls",
    tradition: "social contract",
    passages: [
      { text: "Justice is the first virtue of social institutions, as truth is of systems of thought.", page: 102 },
      { text: "No one knows his place in society, his class position or social status. This ensures that the principles of justice are chosen behind a veil of ignorance.", page: 104 }
    ]
  },
  {
    thinker: "Thomas Aquinas",
    tradition: "natural law",
    passages: [
      { text: "The natural law is nothing else than the rational creature's participation in the eternal law.", page: 118 },
      { text: "Good is to be done and pursued, and evil is to be avoided.", page: 120 }
    ]
  }
];

function conceptPageText(seed: DemoConceptSeed): string {
  const attributionLines = DEMO_ATTRIBUTIONS
    .filter((entry) => {
      const lower = `${seed.label} ${seed.category} ${seed.keywords.join(" ")}`.toLowerCase();
      return lower.includes(entry.tradition.toLowerCase()) || lower.includes(entry.thinker.toLowerCase().split(" ").slice(-1)[0] ?? "");
    })
    .flatMap((entry) => entry.passages.slice(0, 2).map((passage) => `${entry.thinker} wrote, "${passage.text}" on p. ${passage.page}.`));

  return [
    seed.definition,
    seed.detail,
    seed.commonConfusion,
    seed.transferHook,
    ...attributionLines
  ].join(" ");
}

function conceptPageHtml(seed: DemoConceptSeed): string {
  return pageHtml(seed.sourceTitle, [
    { heading: "Core idea", body: seed.definition },
    { heading: "Why it matters", body: seed.detail },
    { heading: "Common confusion", body: seed.commonConfusion },
    { heading: "Assignment move", body: seed.transferHook }
  ]);
}

function assignmentConceptList(concepts: string[]): string {
  return concepts.join(", ");
}

function buildDemoItems(): CaptureItem[] {
  const conceptPages = DEMO_CONCEPTS.map((seed) => createItem({
    kind: "page",
    title: seed.sourceTitle,
    canonicalUrl: `https://demo.learning.local/courses/phil-101/modules/${seed.module}/pages/${slugify(seed.label)}`,
    headingTrail: ["PHIL 101", `Module ${seed.module}`, seed.sourceTitle],
    plainText: conceptPageText(seed),
    html: conceptPageHtml(seed),
    tags: [slugify(seed.label), "concept-page"]
  }));

  const tasks: CaptureItem[] = [
    createItem({
      kind: "assignment",
      title: "Module 1 - Ethics Position Paper 1: Utilitarianism in Practice",
      canonicalUrl: "https://demo.learning.local/courses/phil-101/assignments/paper-1",
      headingTrail: ["PHIL 101", "Assignments", "Module 1 - Ethics Position Paper 1: Utilitarianism in Practice"],
      plainText: [
        "Due April 17, 2026. Write a 1500-word paper analyzing a real-world ethical dilemma through the lens of utilitarianism.",
        "You must include both Bentham and Mill's perspectives, address at least one major objection, and cite 4 scholarly sources in APA format.",
        `Relevant course concepts: ${assignmentConceptList(["Utilitarianism", "Felicific Calculus", "Act vs Rule Utilitarianism", "Experience Machine"])}.`
      ].join(" "),
      html: pageHtml("Ethics Position Paper 1: Utilitarianism in Practice", [
        { heading: "Prompt", body: "Write a 1500-word paper analyzing a real-world ethical dilemma through the lens of utilitarianism." },
        { heading: "Requirements", body: "Include Bentham and Mill, address one major objection, and cite 4 scholarly sources in APA format." }
      ]),
      tags: ["assignment", "module-1"]
    }),
    createItem({
      kind: "discussion",
      title: "Module 2 - Week 3 Discussion: The Trolley Problem",
      canonicalUrl: "https://demo.learning.local/courses/phil-101/discussion_topics/trolley-problem",
      headingTrail: ["PHIL 101", "Discussions", "Module 2 - Week 3 Discussion: The Trolley Problem"],
      plainText: [
        "Due April 24, 2026. In 300 words minimum, explain what you would do in the classic trolley problem and why.",
        "Compare the utilitarian and deontological perspectives.",
        "Respond to at least 2 classmates with substantive replies of 100+ words.",
        `Relevant course concepts: ${assignmentConceptList(["Trolley Problem", "Utilitarianism", "Deontology", "Categorical Imperative"])}.`
      ].join(" "),
      html: pageHtml("Week 3 Discussion: The Trolley Problem", [
        { heading: "Initial post", body: "Explain what you would do in the classic trolley problem and compare utilitarian and deontological reasoning." },
        { heading: "Replies", body: "Respond to two classmates with substantive replies of at least 100 words each." }
      ]),
      tags: ["discussion", "module-2"]
    }),
    createItem({
      kind: "assignment",
      title: "Module 3 - Kantian Ethics Analysis",
      canonicalUrl: "https://demo.learning.local/courses/phil-101/assignments/kantian-analysis",
      headingTrail: ["PHIL 101", "Assignments", "Module 3 - Kantian Ethics Analysis"],
      plainText: [
        "Due May 1, 2026. Apply Kant's categorical imperative to a contemporary ethical issue.",
        "Explain both formulations and show how they lead to the same conclusion.",
        "Address the strongest objection to Kant's approach.",
        `Relevant course concepts: ${assignmentConceptList(["Deontology", "Categorical Imperative", "Natural Law Theory"])}.`
      ].join(" "),
      html: pageHtml("Kantian Ethics Analysis", [
        { heading: "Prompt", body: "Apply Kant's categorical imperative to a contemporary ethical issue." },
        { heading: "Requirements", body: "Explain both formulations, show how they converge, and address the strongest objection." }
      ]),
      tags: ["assignment", "module-3"]
    }),
    createItem({
      kind: "discussion",
      title: "Module 4 - Week 5 Discussion: Cultural Relativism",
      canonicalUrl: "https://demo.learning.local/courses/phil-101/discussion_topics/relativism",
      headingTrail: ["PHIL 101", "Discussions", "Module 4 - Week 5 Discussion: Cultural Relativism"],
      plainText: [
        "Due May 8, 2026. Is moral relativism a defensible position? Argue for or against using at least two examples.",
        "Consider the strongest objection to your position.",
        `Relevant course concepts: ${assignmentConceptList(["Moral Relativism", "Natural Law Theory", "Social Contract Theory"])}.`
      ].join(" "),
      html: pageHtml("Week 5 Discussion: Cultural Relativism", [
        { heading: "Prompt", body: "Argue for or against moral relativism using at least two examples and address the strongest objection." }
      ]),
      tags: ["discussion", "module-4"]
    }),
    createItem({
      kind: "quiz",
      title: "Module 5 - Midterm Quiz",
      canonicalUrl: "https://demo.learning.local/courses/phil-101/quizzes/midterm",
      headingTrail: ["PHIL 101", "Quizzes", "Module 5 - Midterm Quiz"],
      plainText: [
        "Due May 15, 2026. 25 multiple choice questions covering Chapters 1-5. 60 minutes. One attempt.",
        `Relevant course concepts: ${assignmentConceptList(["Utilitarianism", "Deontology", "Virtue Ethics", "Categorical Imperative", "Social Contract Theory", "Moral Relativism"])}.`
      ].join(" "),
      html: pageHtml("Midterm Quiz", [
        { heading: "Quiz focus", body: "Framework recognition, objections, comparison, and application across the first half of the course." }
      ]),
      tags: ["quiz", "module-5"]
    }),
    createItem({
      kind: "assignment",
      title: "Module 6 - Final Paper: Applied Ethics Case Study",
      canonicalUrl: "https://demo.learning.local/courses/phil-101/assignments/final-paper",
      headingTrail: ["PHIL 101", "Assignments", "Module 6 - Final Paper: Applied Ethics Case Study"],
      plainText: [
        "Due May 22, 2026. Choose a real-world ethical controversy and analyze it using at least three different ethical frameworks from the course.",
        "Your analysis must show genuine engagement with the strengths and limitations of each framework.",
        "Use at least 5 scholarly sources in APA format.",
        `Relevant course concepts: ${assignmentConceptList(["Utilitarianism", "Deontology", "Virtue Ethics", "Social Contract Theory", "Natural Law Theory", "Trolley Problem"])}.`
      ].join(" "),
      html: pageHtml("Final Paper: Applied Ethics Case Study", [
        { heading: "Prompt", body: "Analyze one real-world ethical controversy through at least three course frameworks." },
        { heading: "Requirements", body: "Show genuine engagement with strengths and limitations, and use at least five scholarly sources in APA format." }
      ]),
      tags: ["assignment", "module-6"]
    })
  ];
  return [...conceptPages, ...tasks];
}

const DEMO_MASTERY_SEED: Record<string, number> = {
  Utilitarianism: 0.82,
  Deontology: 0.74,
  "Virtue Ethics": 0.61,
  "Categorical Imperative": 0.45,
  "Felicific Calculus": 0.38,
  "Doctrine of the Mean": 0.25,
  "Experience Machine": 0.15,
  "Act vs Rule Utilitarianism": 0.1,
  "Social Contract Theory": 0.05,
  "Moral Relativism": 0,
  "Trolley Problem": 0,
  "Natural Law Theory": 0
};

function sourceItemId(bundle: CaptureBundle, title: string): string {
  return bundle.items.find((item) => item.title === title)?.id ?? stableHash(title);
}

function evidenceFragment(
  bundle: CaptureBundle,
  sourceId: string,
  label: string,
  excerpt: string,
  sourceType: EvidenceFragment["sourceType"],
  sourceField?: string
): EvidenceFragment {
  const sourceItem = bundle.items.find((item) => item.id === sourceId);
  return {
    label,
    excerpt,
    sourceItemId: sourceId,
    sourceKind: sourceItem?.kind ?? "document",
    sourceOrigin: "source-block",
    sourceType,
    sourceField,
    evidenceScore: 5,
    passReason: "This demo evidence is anchored to a captured source item and passes the deterministic truth gate."
  };
}

function makeConcept(seed: DemoConceptSeed, bundle: CaptureBundle): LearningConcept {
  const anchorSourceItemId = sourceItemId(bundle, seed.sourceTitle);
  return {
    id: slugify(seed.label),
    label: seed.label,
    score: 8 + seed.keywords.length / 2,
    summary: seed.detail,
    primer: seed.definition.split(/(?<=[.!?])\s+/)[0]?.trim() ?? seed.definition,
    mnemonic: seed.mnemonic,
    excerpt: seed.detail,
    definition: seed.definition,
    stakes: `${seed.label} matters because it changes how a student would justify a choice under pressure.`,
    commonConfusion: seed.commonConfusion,
    transferHook: seed.transferHook,
    category: seed.category,
    keywords: seed.keywords,
    sourceItemIds: [anchorSourceItemId],
    relatedConceptIds: seed.related.map((entry) => slugify(entry)),
    fieldSupport: {
      definition: {
        quality: "strong",
        supportScore: 9,
        passReason: "The concept definition is anchored to a captured module source.",
        evidence: [evidenceFragment(bundle, anchorSourceItemId, "Definition anchor", seed.definition, "definition", "definition")]
      },
      summary: {
        quality: "supported",
        supportScore: 8,
        passReason: "The concept summary stays tied to the captured source detail.",
        evidence: [evidenceFragment(bundle, anchorSourceItemId, "Summary anchor", seed.detail, "summary", "summary")]
      },
      primer: {
        quality: "supported",
        supportScore: 7,
        passReason: "The primer condenses the same grounded definition into a short line.",
        evidence: [evidenceFragment(bundle, anchorSourceItemId, "Primer anchor", seed.definition, "summary", "primer")]
      },
      mnemonic: {
        quality: "supported",
        supportScore: 6,
        passReason: "The mnemonic is preserved only because it stays attached to a grounded concept source.",
        evidence: [evidenceFragment(bundle, anchorSourceItemId, "Mnemonic anchor", seed.mnemonic, "summary", "mnemonic")]
      },
      commonConfusion: {
        quality: "supported",
        supportScore: 7,
        passReason: "The confusion note is grounded in the same captured concept source.",
        evidence: [evidenceFragment(bundle, anchorSourceItemId, "Confusion anchor", seed.commonConfusion, "summary", "commonConfusion")]
      },
      transferHook: {
        quality: "supported",
        supportScore: 7,
        passReason: "The transfer hook is shown only because it remains tied to the captured concept source.",
        evidence: [evidenceFragment(bundle, anchorSourceItemId, "Transfer anchor", seed.transferHook, "summary", "transferHook")]
      }
    }
  };
}

function buildDemoRelations(bundle: CaptureBundle): ConceptRelation[] {
  const relations: Array<{ from: string; to: string; type: ConceptRelation["type"]; label: string; strength: number }> = [
    { from: "Utilitarianism", to: "Deontology", type: "contrasts", label: "Utilitarianism judges acts by outcomes, while deontology asks whether the act respects duty regardless of outcome.", strength: 0.96 },
    { from: "Utilitarianism", to: "Virtue Ethics", type: "contrasts", label: "Utilitarianism scores outcomes, while virtue ethics asks what kind of person the action is forming.", strength: 0.88 },
    { from: "Deontology", to: "Categorical Imperative", type: "supports", label: "The categorical imperative gives deontology its clearest universal-law test.", strength: 0.94 },
    { from: "Virtue Ethics", to: "Doctrine of the Mean", type: "supports", label: "The doctrine of the mean shows how virtue ethics identifies the fitting trait between excess and deficiency.", strength: 0.92 },
    { from: "Utilitarianism", to: "Felicific Calculus", type: "supports", label: "Bentham's felicific calculus operationalizes utilitarian consequence comparison.", strength: 0.9 },
    { from: "Utilitarianism", to: "Act vs Rule Utilitarianism", type: "extends", label: "Act and rule utilitarianism are two competing ways of applying utilitarian reasoning.", strength: 0.88 },
    { from: "Utilitarianism", to: "Experience Machine", type: "contrasts", label: "The experience machine pressures utilitarianism by asking whether pleasure alone can define the good life.", strength: 0.86 },
    { from: "Social Contract Theory", to: "Moral Relativism", type: "contrasts", label: "Social contract theory looks for fair rules anyone could accept, while moral relativism ties standards to local standpoints.", strength: 0.82 },
    { from: "Natural Law Theory", to: "Moral Relativism", type: "contrasts", label: "Natural law defends objective moral structure, while moral relativism denies a universal standard.", strength: 0.9 },
    { from: "Trolley Problem", to: "Utilitarianism", type: "applies", label: "The trolley problem makes utilitarian commitment to saving the greater number vivid.", strength: 0.84 },
    { from: "Trolley Problem", to: "Deontology", type: "applies", label: "The trolley problem exposes deontological resistance to using one person merely as a means.", strength: 0.84 },
    { from: "Trolley Problem", to: "Virtue Ethics", type: "applies", label: "The trolley problem lets virtue ethics ask what a wise and humane person would do under strain.", strength: 0.76 },
    { from: "Social Contract Theory", to: "Act vs Rule Utilitarianism", type: "extends", label: "Rule utilitarianism and social contract theory both care about stable rules that protect trust over time.", strength: 0.72 },
    { from: "Natural Law Theory", to: "Deontology", type: "supports", label: "Natural law and deontology both defend moral constraint against purely outcome-based reasoning.", strength: 0.7 }
  ];

  return relations.map((relation) => ({
    fromId: slugify(relation.from),
    toId: slugify(relation.to),
    type: relation.type,
    label: relation.label,
    strength: relation.strength,
    evidence: [
      evidenceFragment(
        bundle,
        sourceItemId(bundle, DEMO_CONCEPTS.find((seed) => seed.label === relation.from)?.sourceTitle ?? relation.from),
        "Relation anchor",
        relation.label,
        "summary"
      )
    ]
  }));
}

function buildEngineProfiles(topLabel: string): EngineProfile[] {
  return [
    { id: "neural-forge", title: "Neural Forge", thesis: "Turn the topic into something you can generate under pressure.", signature: "Compression, reconstruction, transfer, and recovery by design.", contribution: `Neural Forge turns ${topLabel} into active command instead of passive familiarity.`, moves: ["compress the idea", "teach it cleanly", "recover it fast"] },
    { id: "signal-garden", title: "Signal Garden", thesis: "Keep the learner surrounded by low-friction context while meaning forms.", signature: "Ambient primers, cue lines, memory warmth, and gentle repetition.", contribution: `Signal Garden keeps ${topLabel} present even before the learner feels fully ready.`, moves: ["lower blank-page friction", "keep ideas warm", "prime hard moments"] },
    { id: "thread-atlas", title: "Thread Atlas", thesis: "Show how ideas travel across evidence, tasks, and later use.", signature: "Relationships, transfer paths, structure cues, and concept-to-task links.", contribution: `Thread Atlas ties ${topLabel} back to source evidence and forward to real course work.`, moves: ["trace evidence", "map relations", "aim toward assignments"] },
    { id: "mirror-harbor", title: "Mirror Harbor", thesis: "Make confusion visible early so it can be repaired without shame.", signature: "Confidence checks, weak-reading detection, reflection, and recovery notes.", contribution: `Mirror Harbor shows whether ${topLabel} is truly held or only loosely recognized.`, moves: ["surface blindspots", "repair weak readings", "leave a recovery path"] }
  ];
}

function phaseConcepts(concepts: LearningConcept[], start: number): LearningConcept[] {
  return Array.from({ length: 4 }, (_, index) => concepts[(start + index) % concepts.length]!).filter(Boolean);
}

function phaseEvidence(concept: LearningConcept) {
  return concept.fieldSupport?.definition?.evidence.slice(0, 1) ?? [];
}

function buildDemoProtocol(concepts: LearningConcept[]): { totalMinutes: number; phases: MegaPhase[] } {
  const phaseSeeds: Array<{ id: MegaPhase["id"]; title: string; tagline: string; summary: string; winCondition: string }> = [
    { id: "genesis", title: "Genesis", tagline: "Meet the ethical pressure before the label hardens.", summary: "Start with live situations and anchor lines before turning the framework into study language.", winCondition: "You can feel the framework in a case before naming it." },
    { id: "forge", title: "Forge", tagline: "Translate the framework into language you can actually use.", summary: "Compress the concept, pin it to evidence, and rebuild it without bluffing.", winCondition: "You can explain the framework without copying the textbook." },
    { id: "crucible", title: "Crucible", tagline: "Separate the right version from the elegant wrong one.", summary: "Use misconceptions, collisions, and contrast lines to stop false certainty early.", winCondition: "You can hear the wrong version and repair it fast." },
    { id: "architect", title: "Architect", tagline: "Aim the framework at real assignments.", summary: "Link concepts to discussions, papers, and explain-why moments inside the course.", winCondition: "You can use the framework inside real course work." },
    { id: "transcend", title: "Transcend", tagline: "Leave with a recovery path you will actually trust.", summary: "Turn the session into fast review cues, confidence notes, and future retrieval anchors.", winCondition: "You know what is sturdy, what is shaky, and how to recover it." }
  ];
  const modeTitles = [
    ["Signal Scan", "Concept Sense", "Evidence Pin", "Name Lock"],
    ["Plain Language", "Evidence Pin", "Contrast Check", "Teach Forward"],
    ["Weak Reading", "Collision", "Lie Break", "Counterexample"],
    ["Assignment Link", "Question Forge", "Failure Map", "Transfer Bridge"],
    ["Blindspot Scan", "Confidence Mark", "Future Use", "Recovery Note"]
  ] as const;

  const phases: MegaPhase[] = phaseSeeds.map((phase, phaseIndex) => {
    const window = phaseConcepts(concepts, phaseIndex * 2);
    return {
      id: phase.id,
      title: phase.title,
      tagline: phase.tagline,
      summary: phase.summary,
      totalMinutes: 20,
      winCondition: phase.winCondition,
      conceptIds: window.map((concept) => concept.id),
      submodes: window.map((concept, modeIndex) => ({
        id: `${phase.id}-${modeIndex + 1}`,
        title: modeTitles[phaseIndex]![modeIndex]!,
        engineIds: modeIndex % 2 === 0 ? ["signal-garden", "thread-atlas"] : ["neural-forge", "mirror-harbor"],
        durationMinutes: 5,
        challengeLevel: ["orient", "build", "stress", "design", "transcend"][phaseIndex] as "orient",
        objective: `Get ${concept.label} into usable language.`,
        setup: concept.commonConfusion,
        prompt: phase.id === "genesis"
          ? `Where does ${concept.label} first become visible in the case or evidence line?`
          : phase.id === "crucible"
            ? `What tempting wrong version of ${concept.label} would sound smart but break the reading?`
            : `How would you use ${concept.label} in a real response, not just a definition list?`,
        tasks: [
          `Write one clean sentence about ${concept.label}.`,
          `Keep one evidence line from ${concept.label} in view.`,
          "Name the confusion you want to avoid."
        ],
        reflection: phase.id === "transcend"
          ? `What would future-you need to reread first to recover ${concept.label}?`
          : `What part of ${concept.label} still feels least stable?`,
        conceptIds: [concept.id],
        evidence: phaseEvidence(concept)
      }))
    };
  });
  return { totalMinutes: 100, phases };
}

function buildDemoNeuralForge(concepts: LearningConcept[]): { totalMinutes: number; atmosphere: string; ambientPrimers: string[]; phases: NeuralForgePhase[] } {
  const phaseSeeds: Array<{ id: NeuralForgePhase["id"]; title: string; tagline: string; purpose: string }> = [
    { id: "immerse", title: "Immerse", tagline: "Feel the dilemma before the vocabulary arrives.", purpose: "Start with ethical pressure instead of cold terminology." },
    { id: "decode", title: "Decode", tagline: "Turn the framework into compact language.", purpose: "Lock the concept into plain English and one memory anchor." },
    { id: "contrast", title: "Contrast", tagline: "Separate neighboring frameworks before they blur together.", purpose: "Show the split that matters under pressure." },
    { id: "transfer", title: "Transfer", tagline: "Aim the framework at real work.", purpose: "Bridge the concept into discussions, essays, and case analysis." },
    { id: "recover", title: "Recover", tagline: "Leave with something future-you can actually use.", purpose: "End with confidence cues and recovery lines instead of vague review advice." }
  ];

  return {
    totalMinutes: 60,
    atmosphere: "Neural Forge is a compact, game-like ethics study run that teaches while it tests and never hides behind recycled filler.",
    ambientPrimers: concepts.slice(0, 8).map((concept) => concept.primer),
    phases: phaseSeeds.map((phase, phaseIndex) => {
      const window = phaseConcepts(concepts, phaseIndex * 2);
      return {
        id: phase.id,
        title: phase.title,
        tagline: phase.tagline,
        purpose: phase.purpose,
        durationMinutes: 12,
        ambientLines: window.slice(0, 2).map((concept) => concept.primer),
        cards: window.map((concept, cardIndex) => ({
          id: `${phase.id}-${concept.id}`,
          title: concept.label,
          focus: concept.label,
          summary: phase.id === "immerse"
            ? `${concept.label} enters through a live ethical pressure point, not a vocabulary quiz.`
            : `${concept.label} stays tied to its real claim instead of drifting into slogan form.`,
          prompt: phase.id === "immerse"
            ? `What choice would make ${concept.label} feel natural before you say its name?`
            : phase.id === "contrast"
              ? `What keeps ${concept.label} from collapsing into a nearby framework?`
              : `How would you use ${concept.label} in a real course response under time pressure?`,
          supportLine: cardIndex % 2 === 0 ? concept.commonConfusion : concept.transferHook,
          actions: [
            `Name the cleanest move inside ${concept.label}.`,
            "Keep one exact evidence line in view.",
            "Write the shortest trustworthy explanation."
          ],
          conceptIds: [concept.id],
          evidence: phaseEvidence(concept)
        }))
      };
    })
  };
}

function normalizeDemoText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function excerptForSource(bundle: CaptureBundle, sourceItemId: string, fallback: string): string {
  return bundle.items.find((item) => item.id === sourceItemId)?.excerpt ?? fallback;
}

function buildDemoSynthesis(
  bundle: CaptureBundle,
  concepts: LearningConcept[],
  relations: ConceptRelation[]
): LearningSynthesis {
  const countKind = (kind: CaptureItem["kind"]) => bundle.items.filter((item) => item.kind === kind).length;
  const stableConceptIds = concepts.map((concept) => concept.id);
  const focusThemes = concepts.slice(0, 8).map((concept, index) => {
    const verbs = DEMO_INSTRUCTOR_VERBS.filter((verb) =>
      normalizeDemoText(`${concept.transferHook} ${concept.summary}`).includes(verb)
    );

    return {
      id: concept.id,
      label: concept.label,
      score: 160 - index * 9,
      summary: concept.transferHook || concept.summary,
      verbs,
      sourceFamily: "mixed" as const,
      conceptIds: [concept.id, ...concept.relatedConceptIds].slice(0, 4),
      sourceItemIds: concept.sourceItemIds,
      assignmentItemIds: bundle.items
        .filter((item) =>
          ["assignment", "discussion", "quiz"].includes(item.kind)
          && normalizeDemoText(item.plainText).includes(normalizeDemoText(concept.label))
        )
        .map((item) => item.id)
        .slice(0, 3),
      evidence: [
        evidenceFragment(
          bundle,
          concept.sourceItemIds[0] ?? concept.id,
          "Source anchor",
          excerptForSource(bundle, concept.sourceItemIds[0] ?? concept.id, concept.definition),
          "summary"
        )
      ]
    };
  });

  const assignmentMappings = bundle.items
    .filter((item) => ["assignment", "discussion", "quiz", "page"].includes(item.kind))
    .map((item) => {
      const normalized = normalizeDemoText(`${item.title} ${item.plainText}`);
      const conceptIds = concepts
        .filter((concept) =>
          normalized.includes(normalizeDemoText(concept.label))
          || concept.keywords.some((keyword) => normalized.includes(normalizeDemoText(keyword)))
        )
        .slice(0, 4)
        .map((concept) => concept.id);
      const likelySkills = DEMO_INSTRUCTOR_VERBS.filter((verb) => normalized.includes(verb));
      const mappedConcepts = concepts.filter((concept) => conceptIds.includes(concept.id));

      return {
        id: stableHash(`demo-assignment:${item.id}`),
        sourceItemId: item.id,
        title: item.title,
        kind: item.kind,
        url: item.canonicalUrl,
        dueAt: null,
        dueTrust: {
          state: "rejected" as const,
          score: 0,
          reasons: ["Demo synthesis does not project a trustworthy due date."]
        },
        summary: item.excerpt,
        likelySkills,
        conceptIds,
        focusThemeIds: focusThemes
          .filter((theme) => theme.conceptIds.some((conceptId) => conceptIds.includes(conceptId)))
          .map((theme) => theme.id)
          .slice(0, 3),
        readinessEligible: conceptIds.length > 0 && likelySkills.length > 0,
        readinessAcceptanceReasons: conceptIds.length > 0
          ? ["Demo assignment mapping has grounded concept coverage."]
          : [],
        readinessRejectionReasons: conceptIds.length > 0
          ? []
          : ["No grounded concept coverage survived for this demo assignment."],
        likelyPitfalls: mappedConcepts
          .map((concept) => concept.commonConfusion)
          .filter(Boolean)
          .slice(0, 3),
        checklist: [
          ...likelySkills.map((skill) => `${skill.charAt(0).toUpperCase()}${skill.slice(1)} the framework instead of summarizing it.`),
          ...mappedConcepts.slice(0, 2).map((concept) => `Use ${concept.label} with one source-backed explanation.`)
        ].slice(0, 4),
        evidence: [evidenceFragment(bundle, item.id, "Assignment signal", item.excerpt, "prompt")]
      };
    });
  const assignmentReadiness = assignmentMappings.map((mapping) => ({
    id: `${mapping.id}:readiness`,
    sourceItemId: mapping.sourceItemId,
    title: mapping.title,
    conceptIds: mapping.conceptIds,
    checklist: mapping.checklist,
    evidence: mapping.evidence,
    ready: mapping.readinessEligible && mapping.checklist.length > 0,
    acceptanceReasons: mapping.readinessAcceptanceReasons,
    rejectionReasons: mapping.readinessRejectionReasons
  }));

  const retentionModules = [
    {
      id: "concept-ladder",
      kind: "concept-ladder" as const,
      title: "Concept Ladder",
      summary: "Climb the strongest demo concepts in a stable sequence.",
      conceptIds: concepts.slice(0, 5).map((concept) => concept.id),
      prompts: concepts.slice(0, 5).map((concept) => `Teach ${concept.label} in one clean sentence, then connect it to another framework.`),
      evidence: concepts.slice(0, 2).map((concept) =>
        evidenceFragment(bundle, concept.sourceItemIds[0] ?? concept.id, "Stable concept", concept.definition, "definition")
      )
    },
    {
      id: "distinction-drill",
      kind: "distinction-drill" as const,
      title: "Distinction Drill",
      summary: "Separate the frameworks that most easily blur together.",
      conceptIds: relations.slice(0, 4).flatMap((relation) => [relation.fromId, relation.toId]),
      prompts: relations.slice(0, 3).map((relation) => relation.label),
      evidence: relations.slice(0, 2).map((relation) =>
        relation.evidence?.[0]
        ?? evidenceFragment(
          bundle,
          sourceItemId(bundle, DEMO_CONCEPTS.find((seed) => slugify(seed.label) === relation.fromId)?.sourceTitle ?? relation.fromId),
          "Contrast edge",
          relation.label,
          "summary"
        )
      )
    },
    {
      id: "corruption-detection",
      kind: "corruption-detection" as const,
      title: "Corruption Detection",
      summary: "Catch the polished wrong version before it hardens.",
      conceptIds: concepts.slice(0, 4).map((concept) => concept.id),
      prompts: concepts.slice(0, 4).map((concept) => `What mistake would distort ${concept.label}, and what repairs it?`),
      evidence: concepts.slice(0, 2).map((concept) =>
        evidenceFragment(
          bundle,
          concept.sourceItemIds[0] ?? concept.id,
          "Confusion risk",
          concept.commonConfusion || concept.summary,
          "summary"
        )
      )
    },
    {
      id: "teach-back",
      kind: "teach-back" as const,
      title: "Teach-Back Prompts",
      summary: "Practice explaining the strongest course themes in plain language.",
      conceptIds: focusThemes.slice(0, 4).flatMap((theme) => theme.conceptIds),
      prompts: focusThemes.slice(0, 4).map((theme) => `Teach why ${theme.label} matters in this ethics course.`),
      evidence: focusThemes.slice(0, 2).map((theme) => theme.evidence[0]!)
    },
    {
      id: "transfer-scenario",
      kind: "transfer-scenario" as const,
      title: "Transfer Scenarios",
      summary: "Aim the textbook frameworks directly at the course assignments and discussions.",
      conceptIds: assignmentMappings.slice(0, 4).flatMap((mapping) => mapping.conceptIds),
      prompts: assignmentMappings.slice(0, 4).map((mapping) => `Before ${mapping.title}, which concept would you reach for first and why?`),
      evidence: assignmentMappings.slice(0, 2).map((mapping) => mapping.evidence[0]!)
    },
    {
      id: "confidence-reflection",
      kind: "confidence-reflection" as const,
      title: "Confidence Reflection",
      summary: "Separate recognition from real command before the next quiz or paper.",
      conceptIds: concepts.slice(0, 5).map((concept) => concept.id),
      prompts: concepts.slice(0, 5).map((concept) => `Could you define, contrast, and apply ${concept.label} without looking?`),
      evidence: concepts.slice(0, 2).map((concept) =>
        evidenceFragment(bundle, concept.sourceItemIds[0] ?? concept.id, "Confidence cue", concept.transferHook, "summary")
      )
    },
    {
      id: "review-queue",
      kind: "review-queue" as const,
      title: "Review Queue",
      summary: "Keep the later-course ideas warm between sessions.",
      conceptIds: concepts.slice(-4).map((concept) => concept.id),
      prompts: concepts.slice(-4).map((concept) => `Recover ${concept.label} from memory, then verify with one supporting sentence.`),
      evidence: concepts.slice(-2).map((concept) =>
        evidenceFragment(bundle, concept.sourceItemIds[0] ?? concept.id, "Review target", concept.summary, "summary")
      )
    }
  ];

  const deterministicHash = stableHash(JSON.stringify({
    stableConceptIds,
    focusThemes: focusThemes.map((theme) => [theme.id, theme.score]),
    assignmentMappings: assignmentMappings.map((mapping) => [mapping.sourceItemId, mapping.conceptIds]),
    retentionModules: retentionModules.map((module) => [module.id, module.conceptIds])
  }));

  return {
    pipelineStages: [...DEMO_PIPELINE_STAGES],
    sourceCoverage: {
      canvasItemCount: bundle.items.filter((item) => item.kind !== "document").length,
      textbookItemCount: bundle.items.filter((item) => item.kind === "document").length,
      assignmentCount: countKind("assignment"),
      discussionCount: countKind("discussion"),
      quizCount: countKind("quiz"),
      pageCount: countKind("page"),
      moduleCount: countKind("module"),
      documentCount: countKind("document")
    },
    stableConceptIds,
    likelyAssessedSkills: Array.from(new Set(assignmentMappings.flatMap((mapping) => mapping.likelySkills))).sort(),
    focusThemes,
    assignmentMappings,
    assignmentReadiness,
    retentionModules,
    deterministicHash,
    qualityBanner: "",
    qualityWarnings: [],
    synthesisMode: "full"
  };
}

export function createDemoBundle(): CaptureBundle {
  const items = buildDemoItems();
  return {
    schemaVersion: SCHEMA_VERSION,
    source: "demo",
    title: "PHIL 101: Introduction to Ethics",
    capturedAt: DEMO_CAPTURED_AT,
    items,
    resources: [],
    manifest: {
      itemCount: items.length,
      resourceCount: 0,
      captureKinds: Array.from(new Set(items.map((item) => item.kind))),
      sourceUrls: items.map((item) => item.canonicalUrl)
    }
  };
}

export function createDemoLearningBundle(bundle: CaptureBundle): LearningBundle {
  const concepts = DEMO_CONCEPTS.map((seed) => makeConcept(seed, bundle));
  const relations = buildDemoRelations(bundle);
  const protocol = buildDemoProtocol(concepts);
  const neuralForge = buildDemoNeuralForge(concepts);
  const topLabel = concepts[0]?.label ?? "Ethics";
  const synthesis = buildDemoSynthesis(bundle, concepts, relations);

  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: DEMO_CAPTURED_AT,
    sourceBundleTitle: bundle.title,
    concepts,
    relations,
    engineProfiles: buildEngineProfiles(topLabel),
    protocol,
    neuralForge,
    synthesis
  };
}

const normalizeLabel = (value: string): string => value.replace(/[^a-z0-9]+/gi, " ").trim();

export function createDemoProgress(learning: LearningBundle, current: AppProgress): AppProgress {
  if (Object.keys(current.conceptMastery).length > 0 || Object.keys(current.chapterCompletion).length > 0) {
    return current;
  }

  const conceptMastery = { ...current.conceptMastery };
  learning.concepts.forEach((concept) => {
    const seeded = Object.entries(DEMO_MASTERY_SEED).find(([label]) => normalizeLabel(label) === normalizeLabel(concept.label))?.[1];
    conceptMastery[concept.id] = seeded ?? 0;
  });

  return {
    ...current,
    conceptMastery,
    chapterCompletion: current.chapterCompletion
  };
}
