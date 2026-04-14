import { slugify, type CaptureBundle, type LearningBundle } from "@learning/schema";
import {
  AmbientSurfaceEngine,
  CollisionEngine,
  CommitmentEngine,
  DialogueSynthesisEngine,
  InteractionStateEngine,
  NegativeExampleEngine,
  PassageRetrievalEngine,
  ProximityEngine,
  RefractionEngine,
  VoiceAttributionEngine,
  type AmbientItem,
  type Angle,
  type InteractionCorpus,
  type RubricCriterion
} from "@learning/interactions-engine";
import type { AppProgress, CourseTask } from "./workspace";
import { DEMO_ATTRIBUTIONS } from "./demo";

export type ShadowSettings = {
  intensity: "off" | "gentle" | "steady" | "immersive";
  contextBias: "random" | "view" | "gaps";
  display: "right-rail" | "bottom-strip" | "corner-fade";
};

export type EchoCandidate = {
  passageId: number;
  text: string;
  source: string;
  citation: string;
  conceptIds: string[];
  score: number;
};

export type GravityConceptNode = {
  id: string;
  label: string;
  mass: number;
  mastery: number;
  dependencyCount: number;
  color: string;
  conceptIds: string[];
};

export type GravityAssignmentNode = {
  id: string;
  title: string;
  homeConceptId: string | null;
  dependencyStrengths: Array<{ conceptId: string; strength: number }>;
  urgency: number;
  wobble: boolean;
};

export type FailureCriterionGroup = {
  criterion: RubricCriterion;
  examples: ReturnType<NegativeExampleEngine["generateFailureExamples"]>;
};

export type OracleThinkerSummary = {
  thinker: string;
  quoteCount: number;
  tradition?: string;
};

export type InteractionRuntime = ReturnType<typeof createInteractionRuntime>;

function demoSeedAttributions(corpus: InteractionCorpus) {
  return DEMO_ATTRIBUTIONS.flatMap((entry, groupIndex) =>
    entry.passages.map((passage, passageIndex) => ({
      thinker: entry.thinker,
      confidence: 1,
      attributionType: "direct-quote" as const,
      topic: [
        ...entry.tradition.toLowerCase().split(/\s+/),
        ...corpus.learning.concepts
          .filter((concept) =>
            concept.label.toLowerCase().includes(entry.tradition.toLowerCase())
            || concept.keywords.some((keyword) => entry.tradition.toLowerCase().includes(keyword.toLowerCase()))
          )
          .map((concept) => concept.id)
      ],
      position: "supports" as const,
      passage: {
        id: 10_000 + groupIndex * 10 + passageIndex,
        text: passage.text,
        sourceItemId: `demo-attribution-${slugify(entry.thinker)}`,
        sectionId: `demo-attribution-${slugify(entry.thinker)}-${passageIndex}`,
        chapterTitle: `${entry.thinker} Reader`,
        pageNumber: passage.page,
        wordCount: passage.text.split(/\s+/).length,
        keywords: passage.text.toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length > 3).slice(0, 8),
        concepts: corpus.learning.concepts
          .filter((concept) => concept.label.toLowerCase().includes(entry.tradition.toLowerCase()) || passage.text.toLowerCase().includes(concept.label.toLowerCase()))
          .map((concept) => concept.id),
        attributions: [entry.thinker],
        position: passageIndex,
        title: `${entry.thinker} Reader`
      }
    }))
  );
}

function masteryColor(value: number): string {
  if (value < 0.2) return "#334155";
  if (value < 0.4) return "#0ea5e9";
  if (value < 0.6) return "#00f0ff";
  if (value < 0.8) return "#06d6a0";
  return "#ffd700";
}

function normalizedLabel(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function renderableConcepts(learning: LearningBundle, conceptIds?: string[]): LearningBundle["concepts"] {
  const blocked = new Set([
    "source focus",
    "imported source",
    "uploaded source",
    "local learning",
    "local learning source",
    "untitled textbook",
    normalizedLabel(learning.sourceBundleTitle)
  ]);

  return learning.concepts
    .filter((concept) => !conceptIds || conceptIds.includes(concept.id))
    .filter((concept) => {
      const label = normalizedLabel(concept.label);
      if (!label || blocked.has(label)) return false;
      if (/demo\b|bundle\b/.test(label)) return false;
      if (concept.definition.trim().length < 30) return false;
      return true;
    });
}

function buildCorpus(bundle: CaptureBundle, learning: LearningBundle, tasks: CourseTask[]): InteractionCorpus {
  return {
    bundle,
    learning,
    tasks: tasks.map((task) => ({
      id: task.id,
      title: task.title,
      summary: task.summary,
      kind: task.kind,
      dueDate: task.dueDate,
      moduleKey: task.moduleKey,
      conceptIds: task.conceptIds,
      requirementLines: task.requirementLines
    }))
  };
}

function rubricForTask(task: CourseTask): RubricCriterion[] {
  const criteria: RubricCriterion[] = [
    { id: `${task.id}:thesis`, label: "Thesis", description: "Takes a clear position and stays answerable." },
    { id: `${task.id}:evidence`, label: "Evidence", description: "Supports claims with course-grounded evidence." },
    { id: `${task.id}:analysis`, label: "Analysis", description: "Explains why the evidence matters." },
    { id: `${task.id}:structure`, label: "Structure", description: "Organizes the response in a readable order." },
    { id: `${task.id}:citations`, label: "Citations", description: "Uses APA-style source support when needed." }
  ];
  if (task.requirementLines.some((line) => /compare|contrast/i.test(line))) {
    criteria.splice(3, 0, { id: `${task.id}:comparison`, label: "Comparison", description: "Keeps both sides of the comparison explicit." });
  }
  return criteria;
}

export function createInteractionRuntime(bundle: CaptureBundle, learning: LearningBundle, tasks: CourseTask[], progress: AppProgress, shadowSettings: ShadowSettings) {
  const corpus = buildCorpus(bundle, learning, tasks);
  const retrieval = new PassageRetrievalEngine(corpus);
  const proximity = new ProximityEngine(bundle.items.map((item) => item.plainText));
  const attribution = new VoiceAttributionEngine(corpus, retrieval, bundle.source === "demo" ? demoSeedAttributions(corpus) : []);
  const state = new InteractionStateEngine();
  const dialogue = new DialogueSynthesisEngine(corpus, attribution, retrieval);
  const collision = new CollisionEngine(corpus, retrieval, proximity);
  const refraction = new RefractionEngine();
  const failures = new NegativeExampleEngine();
  const commitment = new CommitmentEngine();

  const ambientItems: AmbientItem[] = retrieval.getPassages().slice(0, 220).map((passage) => ({
    id: `ambient-${passage.id}`,
    content: passage.text,
    source: `${passage.chapterTitle} p. ${passage.pageNumber}`,
    shownCount: 0,
    lastShownAt: 0,
    contextTags: [passage.chapterTitle.toLowerCase()],
    concepts: passage.concepts,
    passageId: passage.id
  }));

  const ambient = new AmbientSurfaceEngine(
    shadowSettings,
    ambientItems,
    (conceptId) => (progress.conceptMastery[conceptId] ?? 0) < 0.6
  );

  const thinkerRoster: OracleThinkerSummary[] = attribution.getAttributions().reduce<OracleThinkerSummary[]>((acc, entry) => {
    const existing = acc.find((item) => item.thinker === entry.thinker);
    if (existing) {
      existing.quoteCount += 1;
      return acc;
    }
    acc.push({
      thinker: entry.thinker,
      quoteCount: 1,
      tradition: DEMO_ATTRIBUTIONS.find((group) => group.thinker === entry.thinker)?.tradition
    });
    return acc;
  }, []).sort((left, right) => right.quoteCount - left.quoteCount);

  return {
    corpus,
    retrieval,
    proximity,
    attribution,
    dialogue,
    collision,
    refraction,
    failures,
    commitment,
    ambient,
    state,
    thinkerRoster,
    echoForDraft(task: CourseTask, draft: string, recentPassageIds: number[]): EchoCandidate | null {
      const query = draft.trim().split(/\s+/).slice(-40).join(" ");
      if (query.trim().length < 30) return null;
      const results = retrieval.search(query, {
        concepts: task.conceptIds,
        sectionHint: task.title,
        recentlyShown: recentPassageIds,
        limit: 1
      });
      const top = results[0];
      if (!top || top.score < 0.3) return null;
      const thinker = top.passage.attributions[0];
      const citation = thinker
        ? `(${thinker}, p. ${top.passage.pageNumber})`
        : `(Course Text, p. ${top.passage.pageNumber})`;
      return {
        passageId: top.passage.id,
        text: top.passage.text,
        source: `${top.passage.chapterTitle} p. ${top.passage.pageNumber}`,
        citation,
        conceptIds: top.passage.concepts,
        score: top.score
      };
    },
    shadowPool(currentView: string, recentEchoPassageIds: number[]): AmbientItem[] {
      const echoConcepts = recentEchoPassageIds
        .map((id) => retrieval.getPassages().find((passage) => passage.id === id))
        .flatMap((passage) => passage?.concepts ?? []);
      return ambientItems
        .map((item) => ({
          ...item,
          shownCount: item.shownCount,
          lastShownAt: item.lastShownAt,
          contextTags: [...item.contextTags, currentView.toLowerCase()]
        }))
        .sort((left, right) => {
          const leftBoost = left.concepts.some((concept) => echoConcepts.includes(concept)) ? 1 : 0;
          const rightBoost = right.concepts.some((concept) => echoConcepts.includes(concept)) ? 1 : 0;
          return rightBoost - leftBoost;
        });
    },
    promptAngles(task: CourseTask): Angle[] {
      const concepts = renderableConcepts(learning, task.conceptIds);
      const fallback = renderableConcepts(learning).slice(0, 6);
      return refraction.refract(task.summary, concepts.length > 0 ? concepts : fallback);
    },
    capsuleSuggestionsFromAngle(angle: Angle): string[] {
      return [
        `I will keep the ${angle.name.toLowerCase()} structure visible from start to finish.`,
        `I will engage ${angle.conceptCountRange[0]}-${angle.conceptCountRange[1]} linked concepts instead of staying flat.`,
        `I will protect against this risk: ${angle.riskStatement}`
      ];
    },
    failureAtlas(task: CourseTask): FailureCriterionGroup[] {
      const concepts = renderableConcepts(learning, task.conceptIds);
      if (concepts.length === 0) {
        return [];
      }
      return rubricForTask(task).map((criterion) => ({
        criterion,
        examples: failures.generateFailureExamples(criterion, concepts)
      })).filter((group) => group.examples.length > 0);
    },
    oracle(question: string) {
      const thinkers = thinkerRoster.slice(0, 4).map((entry) => entry.thinker);
      return dialogue.buildPanelResponse(question, thinkers);
    },
    duel(leftConceptId: string, rightConceptId: string) {
      const rounds: ReturnType<DialogueSynthesisEngine["buildDuelRound"]>[] = [];
      for (let round = 1; round <= 5; round += 1) {
        rounds.push(dialogue.buildDuelRound(leftConceptId, rightConceptId, round, rounds));
      }
      return rounds;
    },
    gravityModel() {
      const conceptNodes: GravityConceptNode[] = renderableConcepts(learning).slice(0, 12).map((concept) => {
        const dependencyCount = tasks.filter((task) => task.conceptIds.includes(concept.id)).length;
        const mastery = progress.conceptMastery[concept.id] ?? 0;
        const frequency = Math.min(1, concept.score / 8);
        const normalizedDependency = Math.min(1, dependencyCount / Math.max(1, tasks.length));
        const mass = mastery * 0.4 + frequency * 0.3 + normalizedDependency * 0.3;
        return {
          id: concept.id,
          label: concept.label,
          mass,
          mastery,
          dependencyCount,
          color: masteryColor(mastery),
          conceptIds: [concept.id]
        };
      });

      const assignmentNodes: GravityAssignmentNode[] = tasks.slice(0, 16).map((task) => {
        const dependencyStrengths = task.conceptIds.map((conceptId, index) => ({
          conceptId,
          strength: Math.max(0.2, 1 - index * 0.2)
        }));
        const dueDate = task.dueDate ?? Date.now() + 7 * 24 * 60 * 60 * 1000;
        const daysUntilDue = Math.max(1, (dueDate - Date.now()) / (24 * 60 * 60 * 1000));
        const urgency = Math.max(0.2, Math.min(1, 1 / daysUntilDue));
        const primaryMastery = task.conceptIds.length > 0 ? (progress.conceptMastery[task.conceptIds[0]!] ?? 0) : 0;
        return {
          id: task.id,
          title: task.title,
          homeConceptId: task.conceptIds[0] ?? null,
          dependencyStrengths,
          urgency,
          wobble: primaryMastery < 0.2
        };
      });
      return { conceptNodes, assignmentNodes };
    },
    collisionReport(leftConceptId: string, rightConceptId: string) {
      return collision.collide(leftConceptId, rightConceptId);
    }
  };
}
