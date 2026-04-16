import type {
  AssignmentIntelligence,
  CaptureBundle,
  CaptureItem,
  ConceptRelation,
  EvidenceFragment,
  FocusTheme,
  LearningConcept,
  LearningSynthesis,
  RetentionModule,
  SourceCoverage,
  SourceFamily
} from "@learning/schema";
import { stableHash } from "@learning/schema";
import type { Block } from "./pipeline.ts";
import { meaningfulWords, normalizePhrase, truncateReadable } from "./pipeline.ts";

const INSTRUCTOR_VERBS = [
  "analyze",
  "compare",
  "explain",
  "evaluate",
  "define",
  "apply",
  "defend",
  "discuss",
  "distinguish",
  "identify",
  "describe",
  "assess",
  "cite",
  "support",
  "justify",
  "respond"
] as const;

const PIPELINE_STAGES = [
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

type ConceptSupport = {
  conceptId: string;
  supportScore: number;
  relationCount: number;
  sourceCount: number;
  canvasSupport: number;
  textbookSupport: number;
  assignmentSupport: number;
  verbHits: string[];
};

function sourceFamilyFor(item: CaptureItem): SourceFamily {
  const tagSet = new Set(item.tags ?? []);
  if (tagSet.has("textbook")) {
    return "textbook";
  }
  if (
    tagSet.has("canvas")
    || item.kind === "assignment"
    || item.kind === "discussion"
    || item.kind === "quiz"
    || item.kind === "announcement"
    || item.kind === "syllabus"
    || item.kind === "module"
  ) {
    return "canvas";
  }
  return item.kind === "document" ? "textbook" : "other";
}

function itemById(bundle: CaptureBundle): Map<string, CaptureItem> {
  return new Map(bundle.items.map((item) => [item.id, item]));
}

function evidenceForConcept(
  concept: LearningConcept,
  blocks: Block[],
  itemLookup: Map<string, CaptureItem>,
  preferredFamily?: SourceFamily
): EvidenceFragment[] {
  const preferredSourceIds = concept.sourceItemIds.filter((sourceId) => {
    const item = itemLookup.get(sourceId);
    return preferredFamily ? item && sourceFamilyFor(item) === preferredFamily : Boolean(item);
  });

  const chosenSourceIds = preferredSourceIds.length > 0 ? preferredSourceIds : concept.sourceItemIds;
  const matchedBlocks = blocks.filter((block) => chosenSourceIds.includes(block.sourceItemId));

  if (matchedBlocks.length === 0) {
    return [{
      label: "Source anchor",
      excerpt: truncateReadable(concept.excerpt || concept.summary, 180),
      sourceItemId: concept.sourceItemIds[0] ?? concept.id
    }];
  }

  return matchedBlocks.slice(0, 3).map((block, index) => ({
    label: index === 0 ? "Anchor" : "Support",
    excerpt: truncateReadable(block.lead || block.summary, 180),
    sourceItemId: block.sourceItemId
  }));
}

function collectVerbHits(item: CaptureItem): string[] {
  const normalized = normalizePhrase(`${item.title} ${item.plainText}`);
  return INSTRUCTOR_VERBS.filter((verb) => normalized.includes(verb));
}

function sourceCoverage(bundle: CaptureBundle): SourceCoverage {
  const families = bundle.items.map(sourceFamilyFor);
  return {
    canvasItemCount: families.filter((family) => family === "canvas").length,
    textbookItemCount: families.filter((family) => family === "textbook").length,
    assignmentCount: bundle.items.filter((item) => item.kind === "assignment").length,
    discussionCount: bundle.items.filter((item) => item.kind === "discussion").length,
    quizCount: bundle.items.filter((item) => item.kind === "quiz").length,
    pageCount: bundle.items.filter((item) => item.kind === "page").length,
    moduleCount: bundle.items.filter((item) => item.kind === "module").length,
    documentCount: bundle.items.filter((item) => item.kind === "document").length
  };
}

// ── Clone-bucket distinct-evidence helpers ─────────────────────────────────────
//
// A "clone family" is a group of items whose trimmed plain-text (first 80 chars,
// lowercased) is identical or near-identical. When 3+ items share the same
// structural fingerprint (e.g. every "Reflection Activity" prompt), treating them
// as N independent evidence signals inverts the ranking — repetition beats content.
//
// The diversityWeight() function returns how much a given item contributes to a
// concept's support score after clone-bucketing:
//   - first member of a clone family:   1.0   (full weight)
//   - second member:                    0.3   (secondary signal, slight discount)
//   - third+ member:                    0.05  (structural noise, minimal weight)
// Textbook items bypass clone discounting — they are structurally distinct by design.

function itemFingerprint(item: CaptureItem): string {
  return `${item.title} ${item.plainText}`
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function buildCloneFamilies(items: CaptureItem[]): Map<string, string[]> {
  const families = new Map<string, string[]>();
  for (const item of items) {
    const fp = itemFingerprint(item);
    if (fp.length < 8) continue;
    const existing = families.get(fp) ?? [];
    existing.push(item.id);
    families.set(fp, existing);
  }
  return families;
}

function buildDiversityWeights(bundle: CaptureBundle): Map<string, number> {
  const families = buildCloneFamilies(bundle.items);
  const weights = new Map<string, number>();
  for (const [, memberIds] of families) {
    memberIds.forEach((id, rank) => {
      const item = bundle.items.find((entry) => entry.id === id);
      // Textbook items get full weight regardless of family membership
      if (item && sourceFamilyFor(item) === "textbook") {
        weights.set(id, 1.0);
      } else {
        const weight = rank === 0 ? 1.0 : rank === 1 ? 0.3 : 0.05;
        weights.set(id, weight);
      }
    });
  }
  // Any item not in a multi-member family gets full weight
  for (const item of bundle.items) {
    if (!weights.has(item.id)) {
      weights.set(item.id, 1.0);
    }
  }
  return weights;
}

function buildConceptSupport(
  bundle: CaptureBundle,
  concepts: LearningConcept[],
  relations: ConceptRelation[]
): ConceptSupport[] {
  const itemLookup = itemById(bundle);
  // Compute per-item diversity weights once for the whole bundle
  const diversityWeights = buildDiversityWeights(bundle);

  return concepts.map((concept) => {
    const sourceItems = concept.sourceItemIds
      .map((sourceId) => itemLookup.get(sourceId))
      .filter((item): item is CaptureItem => Boolean(item));

    const canvasItems = sourceItems.filter((item) => sourceFamilyFor(item) === "canvas");
    const textbookItems = sourceItems.filter((item) => sourceFamilyFor(item) === "textbook");
    const assignmentItems = canvasItems.filter((item) => ["assignment", "discussion", "quiz"].includes(item.kind));
    const relationCount = relations.filter((relation) => relation.fromId === concept.id || relation.toId === concept.id).length;
    const verbHits = Array.from(new Set(canvasItems.flatMap(collectVerbHits))).sort();
    const sourceCount = new Set(sourceItems.map((item) => item.id)).size;
    const familyCount = new Set(sourceItems.map(sourceFamilyFor)).size;

    // Diversity-weighted counts: clone-family members beyond the first contribute
    // fractional weight so repeated boilerplate items cannot dominate scoring.
    const weightedCanvas = canvasItems.reduce(
      (sum, item) => sum + (diversityWeights.get(item.id) ?? 1.0), 0
    );
    const weightedTextbook = textbookItems.reduce(
      (sum, item) => sum + (diversityWeights.get(item.id) ?? 1.0), 0
    );
    const weightedAssignment = assignmentItems.reduce(
      (sum, item) => sum + (diversityWeights.get(item.id) ?? 1.0), 0
    );

    const semanticEvidence = concept.score;
    const sourceDiversity = Math.min(3, sourceCount) * 8;
    const crossFamilyCoverage = familyCount * 10 + (canvasItems.length > 0 && textbookItems.length > 0 ? 8 : 0);
    const assignmentRelevance = assignmentItems.length > 0 ? 10 + Math.min(2, weightedAssignment) * 6 : 0;
    const relationCentrality = Math.min(4, relationCount) * 6;
    const repeatedCanvasPressure = canvasItems.length > 0 ? Math.min(2.5, weightedCanvas) * 4 : 0;
    const textbookAnchoring = textbookItems.length > 0 ? Math.min(2.5, weightedTextbook) * 5 : 0;
    const verbPressure = verbHits.length * 4;

    const supportScore = Number((
      semanticEvidence
      + sourceDiversity
      + crossFamilyCoverage
      + assignmentRelevance
      + relationCentrality
      + repeatedCanvasPressure
      + textbookAnchoring
      + verbPressure
      + Math.min(concept.keywords.length, 6) * 2
    ).toFixed(2));

    return {
      conceptId: concept.id,
      supportScore,
      relationCount,
      sourceCount,
      canvasSupport: canvasItems.length,
      textbookSupport: textbookItems.length,
      assignmentSupport: assignmentItems.length,
      verbHits
    };
  }).sort((left, right) => right.supportScore - left.supportScore || left.conceptId.localeCompare(right.conceptId));
}

export function rankConceptIdsBySupport(
  bundle: CaptureBundle,
  concepts: LearningConcept[],
  relations: ConceptRelation[]
): string[] {
  return buildConceptSupport(bundle, concepts, relations).map((entry) => entry.conceptId);
}

export function crystallizeConceptIds(
  bundle: CaptureBundle,
  concepts: LearningConcept[],
  relations: ConceptRelation[]
): string[] {
  const support = buildConceptSupport(bundle, concepts, relations);
  const ranked = support.filter((entry) =>
    entry.supportScore >= 90
    || (entry.canvasSupport > 0 && entry.textbookSupport > 0 && entry.supportScore >= 72)
    || (entry.assignmentSupport > 0 && entry.textbookSupport > 0 && entry.supportScore >= 68)
  );
  const fallbackCount = support.length >= 5 ? 5 : Math.min(support.length, 4);
  const chosen = (ranked.length >= fallbackCount
    ? ranked.slice(0, 10)
    : support.slice(0, Math.min(Math.max(fallbackCount, ranked.length), 10)))
    .map((entry) => entry.conceptId);

  return Array.from(new Set(chosen));
}

function buildFocusThemes(
  bundle: CaptureBundle,
  concepts: LearningConcept[],
  blocks: Block[],
  supportByConceptId: Map<string, ConceptSupport>
): FocusTheme[] {
  const itemLookup = itemById(bundle);
  return concepts.flatMap((concept) => {
    const support = supportByConceptId.get(concept.id);
    if (!support) return [];
    const sourceItems = concept.sourceItemIds
      .map((sourceId) => itemLookup.get(sourceId))
      .filter((item): item is CaptureItem => Boolean(item));
    const families = Array.from(new Set(sourceItems.map(sourceFamilyFor)));
    const family: SourceFamily = families.length >= 2 ? "mixed" : (families[0] ?? "other");
    const assignmentIds = sourceItems
      .filter((item) => ["assignment", "discussion", "quiz"].includes(item.kind))
      .map((item) => item.id);

    return {
      id: concept.id,
      label: concept.label,
      score: support.supportScore,
      summary: truncateReadable(`${concept.summary} ${concept.transferHook}`, 180),
      verbs: support.verbHits,
      sourceFamily: family,
      conceptIds: [concept.id, ...concept.relatedConceptIds].slice(0, 4),
      sourceItemIds: concept.sourceItemIds,
      assignmentItemIds: Array.from(new Set(assignmentIds)),
      evidence: evidenceForConcept(concept, blocks, itemLookup, family === "mixed" ? undefined : family)
    };
  }).sort((left, right) => right.score - left.score || left.label.localeCompare(right.label)).slice(0, 8);
}

function assignmentConceptIds(item: CaptureItem, concepts: LearningConcept[]): string[] {
  const itemTokens = meaningfulWords(`${item.title} ${item.plainText}`).slice(0, 60);
  return concepts
    .map((concept) => {
      const conceptTokens = meaningfulWords(`${concept.label} ${concept.definition} ${concept.summary} ${concept.keywords.join(" ")}`);
      const overlap = conceptTokens.reduce((sum, token) => sum + (itemTokens.includes(token) ? 1 : 0), 0);
      const sourceBonus = concept.sourceItemIds.includes(item.id) ? 3 : 0;
      return { conceptId: concept.id, score: overlap + sourceBonus };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.conceptId.localeCompare(right.conceptId))
    .slice(0, 4)
    .map((entry) => entry.conceptId);
}

function buildAssignmentMappings(
  bundle: CaptureBundle,
  concepts: LearningConcept[],
  focusThemes: FocusTheme[],
  blocks: Block[]
): AssignmentIntelligence[] {
  const assignmentLikeItems = bundle.items
    .filter((item) => sourceFamilyFor(item) === "canvas")
    .filter((item) => ["assignment", "discussion", "quiz", "page"].includes(item.kind));

  return assignmentLikeItems.map((item) => {
    const conceptIds = assignmentConceptIds(item, concepts);
    const focusThemeIds = focusThemes
      .filter((theme) => theme.conceptIds.some((conceptId) => conceptIds.includes(conceptId)))
      .map((theme) => theme.id)
      .slice(0, 3);
    const likelySkills = Array.from(new Set(collectVerbHits(item)));
    const mappedConcepts = conceptIds
      .map((conceptId) => concepts.find((concept) => concept.id === conceptId))
      .filter((concept): concept is LearningConcept => Boolean(concept));
    const checklist = [
      ...likelySkills.map((skill) => `${skill.charAt(0).toUpperCase()}${skill.slice(1)} the relevant concept instead of summarizing it.`),
      ...mappedConcepts.slice(0, 2).map((concept) => `Use ${concept.label} with one textbook-backed explanation.`)
    ].slice(0, 4);
    const likelyPitfalls = mappedConcepts
      .map((concept) => concept.commonConfusion)
      .filter((entry) => entry.length > 0)
      .slice(0, 3);
    const matchingBlocks = blocks.filter((block) => block.sourceItemId === item.id);
    const evidence = matchingBlocks.length > 0
      ? matchingBlocks.slice(0, 2).map((block, index) => ({
          label: index === 0 ? "Prompt signal" : "Supporting line",
          excerpt: truncateReadable(block.lead || block.summary, 180),
          sourceItemId: item.id
        }))
      : [{
          label: "Prompt signal",
          excerpt: truncateReadable(item.excerpt || item.plainText, 180),
          sourceItemId: item.id
        }];

    return {
      id: stableHash(`assignment-map:${item.id}`),
      sourceItemId: item.id,
      title: item.title,
      kind: item.kind,
      url: item.canonicalUrl,
      summary: truncateReadable(item.excerpt || item.plainText, 180),
      likelySkills,
      conceptIds,
      focusThemeIds,
      likelyPitfalls,
      checklist: checklist.length > 0 ? checklist : ["Review the core textbook concept before responding."],
      evidence
    };
  }).sort((left, right) => left.title.localeCompare(right.title));
}

function buildRetentionModules(
  concepts: LearningConcept[],
  relations: ConceptRelation[],
  focusThemes: FocusTheme[],
  assignmentMappings: AssignmentIntelligence[]
): RetentionModule[] {
  const ladderConcepts = concepts.slice(0, 5);
  const distinctionPairs = relations.filter((relation) => relation.type === "contrasts").slice(0, 3);
  const reviewConcepts = concepts.slice(-4);

  const modules: RetentionModule[] = [
    {
      id: "concept-ladder",
      kind: "concept-ladder",
      title: "Concept Ladder",
      summary: "Climb the core ideas in order of support so the course foundation hardens first.",
      conceptIds: ladderConcepts.map((concept) => concept.id),
      prompts: ladderConcepts.map((concept) => `Explain ${concept.label} in one sentence, then connect it to the next concept.`),
      evidence: ladderConcepts.slice(0, 2).map((concept) => ({
        label: "Stable concept",
        excerpt: truncateReadable(concept.definition, 160),
        sourceItemId: concept.sourceItemIds[0] ?? concept.id
      }))
    },
    {
      id: "distinction-drill",
      kind: "distinction-drill",
      title: "Distinction Drill",
      summary: "Separate the near-neighbors most likely to collapse under quiz or discussion pressure.",
      conceptIds: distinctionPairs.flatMap((pair) => [pair.fromId, pair.toId]),
      prompts: distinctionPairs.map((pair) => {
        const fromLabel = concepts.find((c) => c.id === pair.fromId)?.label ?? pair.fromId.replace(/-/g, " ");
        const toLabel = concepts.find((c) => c.id === pair.toId)?.label ?? pair.toId.replace(/-/g, " ");
        return `State how ${fromLabel} differs from ${toLabel} without using filler words.`;
      }),
      evidence: distinctionPairs.length > 0 ? distinctionPairs.map((pair) => ({
        label: "Contrast edge",
        excerpt: truncateReadable(pair.label, 160),
        sourceItemId: pair.fromId
      })) : [{
        label: "Contrast edge",
        excerpt: "No explicit contrast pair was strong enough; use the top two concepts for a manual distinction check.",
        sourceItemId: concepts[0]?.sourceItemIds[0] ?? "retention"
      }]
    },
    {
      id: "corruption-detection",
      kind: "corruption-detection",
      title: "Corruption Detection",
      summary: "Catch the elegant wrong version before it hardens into a study habit.",
      conceptIds: concepts.slice(0, 4).map((concept) => concept.id),
      prompts: concepts.slice(0, 4).map((concept) => `What bad shortcut would distort ${concept.label}, and what repairs it?`),
      evidence: concepts.slice(0, 2).map((concept) => ({
        label: "Confusion risk",
        excerpt: truncateReadable(concept.commonConfusion || concept.summary, 160),
        sourceItemId: concept.sourceItemIds[0] ?? concept.id
      }))
    },
    {
      id: "teach-back",
      kind: "teach-back",
      title: "Teach-Back Prompts",
      summary: "Practice explaining the highest-priority instructor themes in plain language.",
      conceptIds: focusThemes.flatMap((theme) => theme.conceptIds).slice(0, 6),
      prompts: focusThemes.slice(0, 4).map((theme) => `Teach why ${theme.label} matters in this course using one source-backed example.`),
      evidence: focusThemes.slice(0, 2).flatMap((theme) => theme.evidence.slice(0, 1))
    },
    {
      id: "transfer-scenario",
      kind: "transfer-scenario",
      title: "Transfer Scenarios",
      summary: "Map textbook ideas into the concrete work the instructor is actually assigning.",
      conceptIds: assignmentMappings.flatMap((mapping) => mapping.conceptIds).slice(0, 6),
      prompts: assignmentMappings.slice(0, 4).map((mapping) => `Before ${mapping.title}, which concept would you apply first and why?`),
      evidence: assignmentMappings.slice(0, 2).flatMap((mapping) => mapping.evidence.slice(0, 1))
    },
    {
      id: "confidence-reflection",
      kind: "confidence-reflection",
      title: "Confidence Reflection",
      summary: "Separate recognition from usable command so the review queue stays honest.",
      conceptIds: ladderConcepts.map((concept) => concept.id),
      prompts: ladderConcepts.map((concept) => `Could you define ${concept.label}, contrast it, and apply it without looking?`),
      evidence: ladderConcepts.slice(0, 2).map((concept) => ({
        label: "Confidence cue",
        excerpt: truncateReadable(concept.transferHook || concept.summary, 160),
        sourceItemId: concept.sourceItemIds[0] ?? concept.id
      }))
    },
    {
      id: "review-queue",
      kind: "review-queue",
      title: "Review Queue",
      summary: "Keep the weaker but still stable ideas warm so they do not drift away between sessions.",
      conceptIds: reviewConcepts.map((concept) => concept.id),
      prompts: reviewConcepts.map((concept) => `Recover ${concept.label} from memory, then verify with one supporting sentence.`),
      evidence: reviewConcepts.slice(0, 2).map((concept) => ({
        label: "Review target",
        excerpt: truncateReadable(concept.summary, 160),
        sourceItemId: concept.sourceItemIds[0] ?? concept.id
      }))
    }
  ];

  return modules.map((module) => ({
    ...module,
    prompts: module.prompts.length > 0 ? module.prompts : ["Review the strongest remaining concept with one source-backed explanation."],
    evidence: module.evidence.length > 0 ? module.evidence : [{
      label: "Fallback evidence",
      excerpt: "The retention module needs manual review because the evidence set was too thin.",
      sourceItemId: concepts[0]?.sourceItemIds[0] ?? "retention"
    }]
  }));
}

export function buildSynthesisReport(
  bundle: CaptureBundle,
  blocks: Block[],
  concepts: LearningConcept[],
  relations: ConceptRelation[],
  stableConceptIds: string[]
): LearningSynthesis {
  const stableConceptSet = new Set(stableConceptIds);
  const stableConcepts = concepts.filter((concept) => stableConceptSet.has(concept.id));
  const supportByConceptId = new Map(
    buildConceptSupport(bundle, stableConcepts, relations).map((entry) => [entry.conceptId, entry])
  );
  const focusThemes = buildFocusThemes(bundle, stableConcepts, blocks, supportByConceptId);
  const assignmentMappings = buildAssignmentMappings(bundle, stableConcepts, focusThemes, blocks);
  const retentionModules = buildRetentionModules(stableConcepts, relations, focusThemes, assignmentMappings);
  const likelyAssessedSkills = Array.from(new Set(
    assignmentMappings.flatMap((mapping) => mapping.likelySkills)
  )).sort();

  const deterministicHash = stableHash(JSON.stringify({
    stableConceptIds,
    focusThemes: focusThemes.map((theme) => [theme.id, theme.score]),
    assignmentMappings: assignmentMappings.map((mapping) => [mapping.sourceItemId, mapping.conceptIds]),
    likelyAssessedSkills
  }));

  return {
    pipelineStages: [...PIPELINE_STAGES],
    sourceCoverage: sourceCoverage(bundle),
    stableConceptIds,
    likelyAssessedSkills,
    focusThemes,
    assignmentMappings,
    retentionModules,
    deterministicHash
  };
}
