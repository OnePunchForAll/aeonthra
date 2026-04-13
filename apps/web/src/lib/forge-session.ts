import type { LearningBundle, LearningConcept } from "@learning/schema";
import { deriveWorkspace, type CourseTask, type ForgeChapter } from "./workspace";

export type ForgeQuestion = {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  conceptId: string;
};

export type ForgeDilemma = {
  id: string;
  scenario: string;
  options: Array<{
    label: string;
    reveal: string;
  }>;
  conceptId: string;
};

export type ForgeChallenge = {
  id: string;
  prompt: string;
  reveal: string;
  conceptId: string;
};

export type ForgeSessionData = {
  chapter: ForgeChapter;
  genesis: {
    dilemmas: ForgeDilemma[];
    scan: LearningConcept[];
  };
  forge: {
    rapid: ForgeQuestion[];
    drill: ForgeQuestion[];
  };
  crucible: {
    lies: ForgeChallenge[];
    crossExam: ForgeChallenge[];
    transfer: ForgeChallenge[];
  };
  architect: {
    teachBack: Array<{ id: string; prompt: string; keyPoints: string[]; conceptId: string }>;
  };
  transcend: {
    boss: ForgeQuestion[];
  };
};

export type ForgeConceptRuntime = {
  conceptId: string;
  chapterId: string;
  chapterTitle: string;
  moduleKey: string;
  dilemmas: ForgeDilemma[];
  rapid: ForgeQuestion[];
  drill: ForgeQuestion[];
  teachBack: ForgeSessionData["architect"]["teachBack"];
};

type PreparedConcept = LearningConcept & {
  label: string;
  definition: string;
  summary: string;
  primer: string;
  relatedLabel: string | null;
};

const DRILL_STEMS = [
  "Which statement best captures {concept}?",
  "Which statement best captures the core of {concept}?",
  "Which statement most clearly defines {concept} in this source?",
  "What description best explains the meaning of {concept}?"
];

const BOSS_STEMS = [
  "Which line would repair a classmate's confusion about {concept}?",
  "Which answer keeps {concept} precise under pressure?",
  "Which statement would you trust when applying {concept} in real course work?"
];

const GENESIS_SHELLS = [
  {
    id: "hospital-dose",
    scenario: "A hospital has one dose of a life-saving drug. Five patients will die without it, but one patient in another ward arrived first and was promised treatment. The drug can save the five or the one, not both.",
    utilitarian: "Give the drug to the five patients because saving more lives produces the greatest total good.",
    deontological: "Give the drug to the patient who was promised treatment because breaking that obligation treats the patient as disposable.",
    virtue: "Ask what a wise and compassionate doctor would do while honoring both fairness and humanity in the moment."
  },
  {
    id: "cheating-friend",
    scenario: "You discover your best friend has been cheating on final exams all semester. Reporting them would likely destroy their honors status and career plans. Staying silent means an honest student loses recognition they deserved.",
    utilitarian: "Report the cheating because protecting the integrity of the system prevents wider harm than protecting one friendship.",
    deontological: "Report the cheating because honesty and fairness are duties that do not disappear when the consequences feel painful.",
    virtue: "Talk to your friend first because a good person balances loyalty, truthfulness, courage, and practical wisdom before acting."
  },
  {
    id: "triage-shift",
    scenario: "During a disaster response, you can send your limited medical team to a crowded shelter where many people may survive or to a smaller clinic where one critically ill child will almost certainly die without immediate care.",
    utilitarian: "Send the team where the most lives or life-years are likely to be saved overall.",
    deontological: "Honor the strongest existing obligation and refuse to turn one person into a mere sacrifice for aggregate benefit.",
    virtue: "Choose the path a humane and practically wise responder could defend after considering mercy, fairness, and courage together."
  },
  {
    id: "harmful-platform",
    scenario: "A social media platform discovers that a new feature increases engagement but also amplifies self-harm content among vulnerable teens. Removing it will hurt profits and anger investors.",
    utilitarian: "Remove the feature because the reduction in serious harm outweighs the financial loss.",
    deontological: "Remove the feature because knowingly exploiting vulnerable users violates a duty to respect persons.",
    virtue: "Act like a leader with integrity and practical wisdom, even if that means taking a harder path than shareholders prefer."
  },
  {
    id: "hidden-lie",
    scenario: "A student could tell one small lie to cover for a teammate who forgot a crucial deadline. The lie would protect the team grade and probably never be discovered.",
    utilitarian: "Tell the lie if it really protects the whole group from a larger loss with minimal harm.",
    deontological: "Refuse to lie because truthfulness is a duty that should not bend whenever convenience tempts you.",
    virtue: "Find the response a trustworthy and courageous teammate would choose, even if it costs something in the short term."
  }
] as const;

const normalize = (text: string): string =>
  text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();

const truncate = (text: string, max = 180): string => {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= max) {
    return cleaned;
  }
  const slice = cleaned.slice(0, max);
  const boundary = Math.max(slice.lastIndexOf("."), slice.lastIndexOf(" "), 80);
  return `${slice.slice(0, boundary > 40 ? boundary : max).trim()}...`;
};

const firstSentence = (text: string): string => {
  const sentence = text.split(/(?<=[.!?])\s+/).find((entry) => entry.trim().length >= 20) ?? text;
  const cleaned = truncate(sentence, 170);
  return /[.!?]$/.test(cleaned) ? cleaned : `${cleaned}.`;
};

const dedupeAdjacentPhraseRepeats = (text: string): string => {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < 4) {
    return text.trim();
  }
  for (let length = Math.floor(words.length / 2); length >= 1; length -= 1) {
    const first = words.slice(0, length).join(" ");
    const second = words.slice(length, length * 2).join(" ");
    if (first.toLowerCase() === second.toLowerCase()) {
      return [first, ...words.slice(length * 2)].join(" ").trim();
    }
  }
  return text.trim();
};

const stripLeadingEcho = (text: string, label: string): string => {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const cleaned = text
    .replace(/^Module\s+\d+\s*-\s*/i, "")
    .replace(new RegExp(`^(?:${escaped})(?:\\s+${escaped})?\\s*`, "i"), "")
    .trim();
  return cleaned || text.trim();
};

function conceptWindow(learning: LearningBundle, chapter: ForgeChapter): LearningConcept[] {
  const direct = chapter.conceptIds
    .map((id) => learning.concepts.find((concept) => concept.id === id))
    .filter((concept): concept is LearningConcept => Boolean(concept));

  if (direct.length >= 4) {
    return direct;
  }

  return learning.concepts.slice(0, 6);
}

function prepareConcept(concept: LearningConcept, pool: LearningConcept[]): PreparedConcept {
  const label = dedupeAdjacentPhraseRepeats(concept.label.replace(/^Module\s+\d+\s*-\s*/i, "").trim());
  const definition = firstSentence(stripLeadingEcho(dedupeAdjacentPhraseRepeats(concept.definition || concept.summary || concept.excerpt || label), label));
  const summary = firstSentence(stripLeadingEcho(dedupeAdjacentPhraseRepeats(concept.summary || concept.definition || concept.excerpt || label), label));
  const primer = firstSentence(stripLeadingEcho(dedupeAdjacentPhraseRepeats(concept.primer || concept.definition || concept.summary || label), label));
  const relatedLabel = pool.find((entry) => concept.relatedConceptIds.includes(entry.id))?.label ?? null;
  return { ...concept, label, definition, summary, primer, relatedLabel };
}

function conceptKeywords(concept: PreparedConcept): string[] {
  return Array.from(
    new Set(
      [concept.label, ...concept.keywords]
        .flatMap((entry) => normalize(entry).split(/\s+/))
        .filter((token) => token.length > 3)
    )
  );
}

function hasOtherConceptLeak(text: string, target: PreparedConcept, pool: PreparedConcept[], allowed: string[] = []): boolean {
  const normalized = normalize(text);
  return pool.some((concept) => {
    if (concept.id === target.id) return false;
    if (allowed.includes(concept.label)) return false;
    return normalized.includes(normalize(concept.label));
  });
}

function validateQuestionCoherence(
  question: ForgeQuestion,
  target: PreparedConcept,
  pool: PreparedConcept[],
  allowedLabels: string[] = []
): boolean {
  if (!question.prompt || /\{[^}]+\}/.test(question.prompt)) return false;
  if (hasOtherConceptLeak(question.prompt, target, pool, allowedLabels)) return false;
  const normalizedPrompt = normalize(question.prompt);
  const keywordHits = conceptKeywords(target).filter((token) => normalizedPrompt.includes(token)).length;
  if (!normalizedPrompt.includes(normalize(target.label)) && keywordHits < 2) return false;
  if (question.options.length < 2) return false;
  const normalizedOptions = question.options.map((option) => normalize(option));
  if (new Set(normalizedOptions).size !== normalizedOptions.length) return false;
  return question.options.every((option) => option.length >= 20 && option.length <= 190 && !/\{[^}]+\}/.test(option));
}

function stem(stems: string[], concept: PreparedConcept, index: number): string {
  return stems[index % stems.length]!.replace("{concept}", concept.label);
}

function relatedPool(target: PreparedConcept, pool: PreparedConcept[]): PreparedConcept[] {
  return pool.filter((concept) => concept.id !== target.id && (target.relatedConceptIds.includes(concept.id) || concept.relatedConceptIds.includes(target.id)));
}

function directDistortions(concept: PreparedConcept): string[] {
  const base = concept.definition.replace(/\.$/, "");
  const keywords = concept.keywords.filter((entry) => entry.length > 3);
  return Array.from(
    new Set(
      [
        /\bhelps\b/i.test(base) ? base.replace(/\bhelps\b/i, "ignores") : "",
        /\buses\b/i.test(base) ? base.replace(/\buses\b/i, "avoids") : "",
        /\bfocuses on\b/i.test(base) ? base.replace(/\bfocuses on\b/i, "moves away from") : "",
        /\bincludes\b/i.test(base) ? base.replace(/\bincludes\b/i, "excludes") : "",
        /\bconnects\b/i.test(base) ? base.replace(/\bconnects\b/i, "separates") : "",
        keywords[0] ? `${concept.label} is mostly about ${keywords[0]} alone, rather than the full move the source develops` : "",
        `${concept.label} only matters after the work is finished, not while the learner is making decisions`
      ]
        .map((entry) => truncate(entry.replace(/\s+/g, " ").trim(), 160))
        .filter((entry) => entry.length >= 20 && normalize(entry) !== normalize(concept.definition))
    )
  );
}

function classificationOptions(concept: PreparedConcept, pool: PreparedConcept[]): string[] {
  const distortions = directDistortions(concept);
  const related = relatedPool(concept, pool)[0];
  const options = [
    concept.definition,
    ...distortions.slice(0, 2),
    related ? truncate(related.definition || related.summary, 140) : distortions[2] ?? ""
  ].filter(Boolean);
  return Array.from(new Set(options)).slice(0, 4);
}

function rapidStatement(concept: PreparedConcept, index: number, pool: PreparedConcept[]): ForgeQuestion | null {
  const truthy = index % 2 === 0;
  const claim = truthy ? concept.definition : directDistortions(concept)[0] ?? `${concept.label} only matters after the main learning move is complete.`;
  const question: ForgeQuestion = {
    id: `${concept.id}:rapid:${index}`,
    prompt: `According to the source, this statement fits ${concept.label}: ${claim}`,
    options: ["TRUE", "FALSE"],
    correctIndex: truthy ? 0 : 1,
    explanation: truthy
      ? concept.summary
      : `The source does not frame ${concept.label} that way. Keep this line instead: ${concept.definition}`,
    conceptId: concept.id
  };
  return validateQuestionCoherence(question, concept, pool) ? question : null;
}

function drillQuestion(concept: PreparedConcept, pool: PreparedConcept[], index: number): ForgeQuestion | null {
  const options = classificationOptions(concept, pool);
  const question: ForgeQuestion = {
    id: `${concept.id}:drill:${index}`,
    prompt: stem(DRILL_STEMS, concept, index),
    options,
    correctIndex: options.findIndex((option) => normalize(option) === normalize(concept.definition)),
    explanation: `Keep this sentence in view: ${concept.definition} ${concept.commonConfusion}`,
    conceptId: concept.id
  };
  return question.correctIndex >= 0 && validateQuestionCoherence(question, concept, pool, concept.relatedLabel ? [concept.relatedLabel] : []) ? question : null;
}

function bossQuestion(concept: PreparedConcept, pool: PreparedConcept[], index: number): ForgeQuestion | null {
  const related = relatedPool(concept, pool)[0];
  const options = Array.from(new Set([
    `Use ${concept.label} when ${concept.summary.replace(/\.$/, "").toLowerCase()}.`,
    related ? `Use ${concept.label} and ${related.label} as if they make the same move.` : "",
    `Treat ${concept.label} as a loose page label instead of the claim the source makes.`,
    related ? `Switch to ${related.label} whenever ${concept.label} starts to require evidence.` : `Only remember the title of ${concept.label} and ignore the supporting sentence.`
  ].filter(Boolean))).slice(0, 4);
  const question: ForgeQuestion = {
    id: `${concept.id}:boss:${index}`,
    prompt: stem(BOSS_STEMS, concept, index),
    options,
    correctIndex: 0,
    explanation: related
      ? `${concept.label} and ${related.label} are neighbors, but the clean repair is to keep ${concept.summary.toLowerCase()} in the ${concept.label.toLowerCase()} lane.`
      : `The repair line is the one that keeps ${concept.label} tied to its actual source claim instead of a vague label.`,
    conceptId: concept.id
  };
  return validateQuestionCoherence(question, concept, pool, related ? [related.label] : []) ? question : null;
}

function frameworkMatch(pool: PreparedConcept[], label: string): PreparedConcept | null {
  return pool.find((concept) => normalize(concept.label).includes(label)) ?? null;
}

function buildGenesisDilemmas(pool: PreparedConcept[]): ForgeDilemma[] {
  const utilitarian = frameworkMatch(pool, "utilitarian");
  const deontology = frameworkMatch(pool, "deontolog") ?? frameworkMatch(pool, "categorical imperative");
  const virtue = frameworkMatch(pool, "virtue") ?? frameworkMatch(pool, "doctrine of the mean");
  const trioReady = Boolean(utilitarian && deontology && virtue);

  if (trioReady && utilitarian && deontology && virtue) {
    return GENESIS_SHELLS.slice(0, 3).map((shell, index) => ({
      id: `${shell.id}:${index}`,
      scenario: shell.scenario,
      options: [
        {
          label: shell.utilitarian,
          reveal: `That choice leans utilitarian because ${utilitarian.summary.toLowerCase()}`
        },
        {
          label: shell.deontological,
          reveal: `That choice leans deontological because ${deontology.summary.toLowerCase()}`
        },
        {
          label: shell.virtue,
          reveal: `That choice leans virtue ethics because ${virtue.summary.toLowerCase()}`
        }
      ],
      conceptId: [utilitarian.id, deontology.id, virtue.id][index % 3]!
    }));
  }

  // Generic ethical scenarios for when the framework trio isn't available.
  // These are real dilemmas so students have something concrete to apply the concept to.
  const FALLBACK_SCENARIOS = [
    "A student discovers their best friend has been submitting someone else's work. Reporting them could end the friendship; staying silent means the dishonesty continues.",
    "A researcher finds a small but significant error in a published study. Retracting it would damage reputations; staying silent lets a false result stand in the literature.",
    "You can stay late to help a struggling colleague meet an important deadline, but doing so means missing a family event you promised to attend.",
    "A manager learns a cost-cutting measure will save the company money but will make conditions harder for lower-paid workers who have no voice in the decision.",
    "A student is offered access to a leaked exam. Declining puts them at a disadvantage; accepting means benefiting from unfairness toward peers who didn't get the same access."
  ];

  return pool.slice(0, 3).map((concept, index) => {
    const scenario = FALLBACK_SCENARIOS[index % FALLBACK_SCENARIOS.length]!;
    return {
      id: `${concept.id}:dilemma:${index}`,
      scenario,
      options: [
        {
          label: `Apply ${concept.label}: ${truncate(concept.summary, 80)}`,
          reveal: `${concept.label} frames this situation as: ${concept.definition}`
        },
        {
          label: "Do what produces the best outcome for the most people, regardless of rules.",
          reveal: "That's a consequentialist move — useful, but it may not capture what the source is emphasizing."
        },
        {
          label: "Avoid making a hard call and wait to see how things resolve on their own.",
          reveal: `Avoidance sidesteps the question the source raises about ${concept.label}.`
        }
      ],
      conceptId: concept.id
    };
  });
}

function lieFor(concept: PreparedConcept, index: number): ForgeChallenge {
  const distortion = directDistortions(concept)[0] ?? `${concept.label} only matters after the learning move is already complete.`;
  return {
    id: `${concept.id}:lie:${index}`,
    prompt: distortion,
    reveal: `That sentence quietly corrupts ${concept.label}. The source gives this cleaner version: ${concept.definition}`,
    conceptId: concept.id
  };
}

function crossExamFor(concept: PreparedConcept, index: number): ForgeChallenge {
  const related = concept.relatedLabel;
  return {
    id: `${concept.id}:cross:${index}`,
    prompt: related
      ? `Someone argues that ${concept.label} is just ${related} with different wording. What would you say back?`
      : `Someone says ${concept.label} is only a heading, not a real idea. How would you push back?`,
    reveal: concept.commonConfusion,
    conceptId: concept.id
  };
}

function transferFor(concept: PreparedConcept, index: number): ForgeChallenge {
  return {
    id: `${concept.id}:transfer:${index}`,
    prompt: `Where would ${concept.label} matter in a real assignment, discussion post, or explanation task?`,
    reveal: concept.transferHook,
    conceptId: concept.id
  };
}

function keyPoints(concept: PreparedConcept): string[] {
  return Array.from(
    new Set(
      [
        concept.label,
        ...concept.keywords.slice(0, 3),
        ...normalize(`${concept.definition} ${concept.summary}`)
          .split(/\s+/)
          .filter((token) => token.length > 4)
          .slice(0, 3)
      ].map((entry) => entry.replace(/-/g, " "))
    )
  ).slice(0, 5);
}

function summarizeChapter(tasks: CourseTask[]): string {
  const lines = tasks
    .map((task) => task.summary || task.rawText)
    .filter((entry) => entry.trim().length >= 24)
    .slice(0, 2);
  return truncate(lines.join(" "), 220) || "Synthetic chapter assembled from the current module tasks.";
}

function buildFallbackChapters(tasks: CourseTask[]): ForgeChapter[] {
  const groups = new Map<string, CourseTask[]>();
  for (const task of tasks) {
    const current = groups.get(task.moduleKey) ?? [];
    current.push(task);
    groups.set(task.moduleKey, current);
  }

  return Array.from(groups.entries())
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([moduleKey, moduleTasks], index) => {
      const firstTask = [...moduleTasks].sort((left, right) => left.plannedDate - right.plannedDate)[0] ?? moduleTasks[0]!;
      const conceptIds = Array.from(new Set(moduleTasks.flatMap((task) => task.conceptIds))).sort();
      return {
        id: `synthetic:${moduleKey}`,
        sourceItemId: firstTask.sourceItemId,
        title: firstTask.title || `Module ${index + 1}`,
        summary: summarizeChapter(moduleTasks),
        conceptIds,
        moduleKey
      };
    })
    .filter((chapter) => chapter.conceptIds.length > 0);
}

function runtimeForConcept(
  session: ForgeSessionData,
  chapter: ForgeChapter,
  conceptId: string
): ForgeConceptRuntime | null {
  const nextRuntime: ForgeConceptRuntime = {
    conceptId,
    chapterId: chapter.id,
    chapterTitle: chapter.title,
    moduleKey: chapter.moduleKey,
    dilemmas: session.genesis.dilemmas.filter((entry) => entry.conceptId === conceptId),
    rapid: session.forge.rapid.filter((entry) => entry.conceptId === conceptId),
    drill: [...session.forge.drill, ...session.transcend.boss].filter((entry) => entry.conceptId === conceptId),
    teachBack: session.architect.teachBack.filter((entry) => entry.conceptId === conceptId)
  };

  return (
    nextRuntime.dilemmas.length > 0
    || nextRuntime.rapid.length > 0
    || nextRuntime.drill.length > 0
    || nextRuntime.teachBack.length > 0
  )
    ? nextRuntime
    : null;
}

export function createForgeSession(learning: LearningBundle, chapter: ForgeChapter): ForgeSessionData {
  const concepts = conceptWindow(learning, chapter).map((concept) => prepareConcept(concept, learning.concepts));
  const genesisPool = Array.from(
    new Map(
      [...concepts, ...learning.concepts.slice(0, 6).map((concept) => prepareConcept(concept, learning.concepts))]
        .map((concept) => [concept.id, concept])
    ).values()
  );

  return {
    chapter,
    genesis: {
      dilemmas: buildGenesisDilemmas(genesisPool),
      scan: concepts
    },
    forge: {
      rapid: concepts.flatMap((concept, index) => [rapidStatement(concept, index * 2, concepts), rapidStatement(concept, index * 2 + 1, concepts)]).filter((entry): entry is ForgeQuestion => Boolean(entry)).slice(0, 10),
      drill: concepts.map((concept, index) => drillQuestion(concept, concepts, index)).filter((entry): entry is ForgeQuestion => Boolean(entry)).slice(0, 8)
    },
    crucible: {
      lies: concepts.slice(0, 4).map(lieFor),
      crossExam: concepts.slice(0, 3).map(crossExamFor),
      transfer: concepts.slice(0, 3).map(transferFor)
    },
    architect: {
      teachBack: concepts.slice(0, 3).map((concept, index) => ({
        id: `${concept.id}:teach:${index}`,
        prompt: `Explain ${concept.label} to a stressed classmate in plain language.`,
        keyPoints: keyPoints(concept),
        conceptId: concept.id
      }))
    },
    transcend: {
      boss: concepts.map((concept, index) => bossQuestion(concept, concepts, index)).filter((entry): entry is ForgeQuestion => Boolean(entry)).slice(0, 8)
    }
  };
}

export function buildForgeRuntime(
  learning: LearningBundle,
  workspace: { tasks: CourseTask[]; chapters: ForgeChapter[] }
): Record<string, ForgeConceptRuntime> {
  const chapters = workspace.chapters.length > 0 ? workspace.chapters : buildFallbackChapters(workspace.tasks);
  const runtimeByConcept = new Map<string, ForgeConceptRuntime>();
  const scoreRuntime = (runtime: ForgeConceptRuntime): number =>
    runtime.rapid.length * 3 + runtime.drill.length * 2 + runtime.dilemmas.length * 2 + runtime.teachBack.length;

  chapters.forEach((chapter) => {
    const session = createForgeSession(learning, chapter);
    const conceptIds = Array.from(
      new Set([...chapter.conceptIds, ...session.genesis.scan.map((concept) => concept.id)])
    ).sort();

    conceptIds.forEach((conceptId) => {
      const nextRuntime = runtimeForConcept(session, chapter, conceptId);
      if (!nextRuntime) {
        return;
      }

      const current = runtimeByConcept.get(conceptId);
      if (!current) {
        runtimeByConcept.set(conceptId, nextRuntime);
        return;
      }

      const currentScore = scoreRuntime(current);
      const nextScore = scoreRuntime(nextRuntime);
      if (nextScore > currentScore || (nextScore === currentScore && nextRuntime.chapterTitle.localeCompare(current.chapterTitle) < 0)) {
        runtimeByConcept.set(conceptId, nextRuntime);
      }
    });
  });

  learning.concepts.forEach((concept, index) => {
    if (runtimeByConcept.has(concept.id)) {
      return;
    }

    const chapter: ForgeChapter = {
      id: `concept:${concept.id}`,
      sourceItemId: concept.sourceItemIds[0] ?? concept.id,
      title: concept.label,
      summary: concept.primer || concept.definition || concept.summary || concept.excerpt || concept.label,
      conceptIds: Array.from(new Set([concept.id, ...concept.relatedConceptIds.slice(0, 3)])).sort(),
      moduleKey: `concept-${String(index + 1).padStart(2, "0")}`
    };
    const session = createForgeSession(learning, chapter);
    const nextRuntime = runtimeForConcept(session, chapter, concept.id);
    if (nextRuntime) {
      runtimeByConcept.set(concept.id, nextRuntime);
    }
  });

  return Object.fromEntries(
    Array.from(runtimeByConcept.entries()).sort(([left], [right]) => left.localeCompare(right))
  );
}

export function chapterForTask(
  learning: LearningBundle,
  bundle: Parameters<typeof deriveWorkspace>[0],
  taskId: string,
  progress: Parameters<typeof deriveWorkspace>[2]
) {
  const workspace = deriveWorkspace(bundle, learning, progress);
  const task = workspace.tasks.find((entry) => entry.id === taskId);
  if (!task) {
    return null;
  }
  return workspace.chapters.find((chapter) => chapter.moduleKey === task.moduleKey) ?? workspace.chapters[0] ?? null;
}
