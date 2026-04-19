import type {
  AssignmentSignalV2,
  ConceptV2,
  EngineV2Result,
  FocusThemeV2,
  ReadinessV2,
  RejectionRecord,
  RelationV2,
  SourceDocument
} from "../contracts/types.ts";
import type { CaptureBundle } from "@learning/schema";
import { buildConcepts } from "../candidates/concepts.ts";
import { buildEvidenceUnits } from "../evidence/build.ts";
import { classifyBundle } from "../ingestion/classify.ts";
import {
  hasChromeSignal,
  isHardNoiseText,
  looksFragmentary
} from "../noise/rules.ts";
import { buildRelations } from "../relations/build.ts";
import { extractStructuralNodes } from "../structure/extract.ts";
import { deterministicHash } from "../utils/stable.ts";
import { meaningfulTokens, normalizeText, splitSentences } from "../utils/text.ts";

export type AnalyzeBundleStage =
  | "classify"
  | "structure"
  | "evidence"
  | "concepts"
  | "relations"
  | "assignments"
  | "finalize";

const REQUIREMENT_VERB_PATTERN = /\b(analyze|apply|assess|cite|compare|complete|contrast|define|describe|discuss|evaluate|explain|identify|prepare|respond|submit|use|write)\b/i;
const REQUIREMENT_SENTENCE_START_PATTERN = /^(?:Analyze|Apply|Assess|Cite|Compare|Complete|Contrast|Define|Describe|Discuss|Evaluate|Explain|Identify|Prepare|Respond|Submit|Use|Write)\b/i;
const GENERIC_THEME_LABEL_PATTERN = /^(?:week|module|chapter)\s+\d+\b(?:\s*[-:]\s*.*)?$/i;
const MIXED_OVERLONG_REQUIREMENT_LENGTH = 180;

function conceptIdsForDocument(document: SourceDocument, concepts: ConceptV2[]): string[] {
  const direct = concepts
    .filter((concept) => concept.sourceItemIds.includes(document.item.id))
    .map((concept) => concept.id);
  if (direct.length > 0) {
    return direct;
  }
  if (document.classification.sourceFamily === "discussion" || document.classification.bodyTrust.state === "rejected") {
    return [];
  }
  const documentTokens = new Set(meaningfulTokens(document.cleanedText));
  if (document.classification.titleTrust.state === "accepted") {
    meaningfulTokens(document.cleanedTitle).forEach((token) => documentTokens.add(token));
  }
  return concepts
    .map((concept) => {
      const conceptTokens = meaningfulTokens(`${concept.label} ${concept.keywords.join(" ")}`);
      const overlap = conceptTokens.filter((token) => documentTokens.has(token)).length;
      return { conceptId: concept.id, overlap };
    })
    .filter((entry) => entry.overlap >= 2)
    .sort((left, right) => right.overlap - left.overlap || left.conceptId.localeCompare(right.conceptId))
    .map((entry) => entry.conceptId);
}

function buildAssignments(
  documents: SourceDocument[],
  concepts: ConceptV2[]
): {
  assignments: AssignmentSignalV2[];
  readiness: ReadinessV2[];
  focusThemes: FocusThemeV2[];
  rejections: RejectionRecord[];
} {
  const assignments: AssignmentSignalV2[] = [];
  const readiness: ReadinessV2[] = [];
  const focusThemes: FocusThemeV2[] = [];
  const rejections: RejectionRecord[] = [];

  function pushFocusTheme(
    document: SourceDocument,
    conceptIds: string[],
    conceptLead: ConceptV2 | undefined
  ): void {
    if (conceptIds.length === 0) {
      return;
    }

    const preferredLabel = document.classification.titleTrust.state === "accepted"
      && document.cleanedTitle
      && !GENERIC_THEME_LABEL_PATTERN.test(document.cleanedTitle)
      ? document.cleanedTitle
      : conceptLead?.label ?? "Focus theme";
    focusThemes.push({
      id: `${document.item.id}:theme`,
      label: preferredLabel,
      summary: conceptLead?.fieldAdmissions.summary?.text
        ?? conceptLead?.fieldAdmissions.definition?.text
        ?? document.cleanedText.slice(0, 180),
      conceptIds,
      evidenceIds: conceptLead?.evidenceIds.slice(0, 2) ?? [],
      score: conceptIds.length * 20 + (document.classification.bodyTrust.state === "accepted" ? 20 : 0)
    });
  }

  function extractRequirementLines(document: SourceDocument): string[] {
    const lines: string[] = [];

    for (const sentence of splitSentences(document.cleanedText)) {
      const normalizedSentence = normalizeText(sentence);
      if (!normalizedSentence || !REQUIREMENT_VERB_PATTERN.test(normalizedSentence)) {
        continue;
      }
      const startsWithRequirementVerb = REQUIREMENT_SENTENCE_START_PATTERN.test(normalizedSentence);
      if (
        isHardNoiseText(normalizedSentence)
        || hasChromeSignal(normalizedSentence)
        || (!startsWithRequirementVerb && looksFragmentary(normalizedSentence))
      ) {
        rejections.push({
          id: `${document.item.id}:requirement:${lines.length + rejections.length}`,
          stage: "assignments",
          code: "requirement-sentence-noisy",
          message: `Rejected a noisy requirement sentence for ${document.item.id}.`,
          sourceItemId: document.item.id
        });
        continue;
      }
      if (
        normalizedSentence.length > MIXED_OVERLONG_REQUIREMENT_LENGTH
        && (document.classification.contentProfile === "mixed" || document.classification.sourceFamily === "page")
      ) {
        rejections.push({
          id: `${document.item.id}:requirement:${lines.length + rejections.length}`,
          stage: "assignments",
          code: "requirement-sentence-mixed-overlong",
          message: `Rejected an overlong mixed requirement sentence for ${document.item.id}.`,
          sourceItemId: document.item.id
        });
        continue;
      }
      lines.push(normalizedSentence);
      if (lines.length >= 5) {
        break;
      }
    }

    return lines;
  }

  for (const document of documents) {
    const family = document.classification.sourceFamily;
    const conceptIds = conceptIdsForDocument(document, concepts);
    const conceptLead = conceptIds.length > 0
      ? concepts.find((concept) => conceptIds.includes(concept.id))
      : undefined;
    const requirementLines = extractRequirementLines(document);
    const groundedRequirements = requirementLines.length > 0
      && (
        document.classification.assignmentPromptTrust.state === "accepted"
        || (
          family === "page"
          && document.classification.titleTrust.state === "accepted"
          && conceptIds.length > 0
          && document.classification.bodyTrust.state !== "rejected"
        )
      )
      && document.classification.bodyTrust.state !== "rejected";
    const dueGrounded = !document.item.dueAt || document.classification.dateTrust.state === "accepted";
    const strictPageSurface = family === "page"
      && document.classification.titleTrust.state === "accepted"
      && conceptIds.length > 0
      && (
        document.classification.bodyTrust.state === "accepted"
        || groundedRequirements
      );

    const isAssignmentLike = family === "assignment" || family === "discussion" || family === "quiz" || strictPageSurface;
    if (!isAssignmentLike) {
      if (
        family === "page"
        && (conceptIds.length > 0 || requirementLines.length > 0 || document.classification.titleTrust.state === "accepted")
      ) {
        rejections.push({
          id: `${document.item.id}:page-assignment-suppressed`,
          stage: "assignments",
          code: "page-assignment-surface-suppressed",
          message: `Suppressed page-derived assignment surface for ${document.item.id} because the page is not a grounded task surface.`,
          sourceItemId: document.item.id
        });
      }
      pushFocusTheme(document, conceptIds, conceptLead);
      continue;
    }

    const keepSurfaceWithoutConcepts = document.classification.titleTrust.state === "accepted"
      && (family === "assignment" || family === "quiz");
    const suppressWeakDiscussionSurface = family === "discussion"
      && document.classification.titleTrust.state !== "accepted";
    const suppressSurface = suppressWeakDiscussionSurface
      || (
        conceptIds.length === 0
        && !groundedRequirements
        && !keepSurfaceWithoutConcepts
      );
    if (suppressSurface) {
      rejections.push({
        id: `${document.item.id}:assignment-suppressed`,
        stage: "assignments",
        code: "assignment-surface-suppressed",
        message: `Suppressed assignment-like surface for ${document.item.id} because the title is untrusted and no grounded evidence survived.`,
        sourceItemId: document.item.id
      });
      continue;
    }

    const readinessEligible = document.classification.titleTrust.state === "accepted"
      && groundedRequirements
      && dueGrounded
      && (conceptIds.length > 0 || family === "assignment" || family === "quiz");

    const assignment: AssignmentSignalV2 = {
      id: document.item.id,
      sourceItemId: document.item.id,
      sourceKind: document.item.kind,
      title: document.classification.titleTrust.state === "accepted"
        ? document.cleanedTitle
        : conceptLead?.label ?? document.cleanedTitle,
      titleTrust: document.classification.titleTrust,
      dueAt: document.classification.dateTrust.state === "accepted" ? document.item.dueAt ?? null : null,
      dueTrust: document.classification.dateTrust,
      conceptIds,
      requirementLines,
      evidenceIds: concepts.filter((concept) => conceptIds.includes(concept.id)).flatMap((concept) => concept.evidenceIds).slice(0, 4),
      readinessEligible,
      acceptanceReasons: readinessEligible ? ["assignment-readiness-supported"] : [],
      rejectionReasons: readinessEligible ? [] : [
        document.classification.titleTrust.state !== "accepted" ? "assignment-title-untrusted" : "",
        conceptIds.length === 0 && family !== "assignment" && family !== "quiz" ? "assignment-no-grounded-concepts" : "",
        requirementLines.length === 0 ? "assignment-no-requirement-evidence" : "",
        document.classification.assignmentPromptTrust.state !== "accepted" ? "assignment-prompt-untrusted" : "",
        document.classification.bodyTrust.state === "rejected" ? "assignment-body-untrusted" : "",
        !dueGrounded ? "assignment-due-date-untrusted" : ""
      ].filter(Boolean)
    };
    assignments.push(assignment);

    if (readinessEligible) {
      readiness.push({
        id: `${document.item.id}:readiness`,
        sourceItemId: document.item.id,
        title: document.classification.titleTrust.state === "accepted"
          ? document.cleanedTitle
          : conceptLead?.label ?? document.cleanedTitle,
        conceptIds,
        evidenceIds: assignment.evidenceIds,
        checklist: requirementLines,
        ready: true,
        acceptanceReasons: ["readiness-grounded-by-title-requirements-and-concepts"],
        rejectionReasons: []
      });
    } else {
      rejections.push({
        id: `${document.item.id}:readiness-rejected`,
        stage: "readiness",
        code: "readiness-not-grounded",
        message: `Readiness for ${document.cleanedTitle || document.item.id} was suppressed because the assignment lane is not fully grounded.`,
        sourceItemId: document.item.id
      });
    }
  }

  focusThemes.sort((left, right) => right.score - left.score || left.label.localeCompare(right.label));
  return {
    assignments,
    readiness,
    focusThemes: focusThemes.slice(0, 6),
    rejections
  };
}

export function analyzeBundleWithProgress(
  bundle: CaptureBundle,
  onProgress?: (stage: AnalyzeBundleStage, progress: number) => void
): EngineV2Result {
  const documents = classifyBundle(bundle);
  onProgress?.("classify", 8);
  const nodes = documents.flatMap((document) => extractStructuralNodes(document));
  onProgress?.("structure", 24);
  const evidence = buildEvidenceUnits(documents, nodes);
  onProgress?.("evidence", 42);
  const conceptBuild = buildConcepts(evidence.evidenceUnits);
  onProgress?.("concepts", 60);
  const relationBuild = buildRelations(conceptBuild.concepts, evidence.evidenceUnits);
  onProgress?.("relations", 74);
  const conceptRelationMap = new Map<string, string[]>();
  relationBuild.relations.forEach((relation) => {
    conceptRelationMap.set(relation.fromId, [...(conceptRelationMap.get(relation.fromId) ?? []), relation.id]);
    conceptRelationMap.set(relation.toId, [...(conceptRelationMap.get(relation.toId) ?? []), relation.id]);
  });
  const concepts: ConceptV2[] = conceptBuild.concepts.map((concept) => ({
    ...concept,
    relationIds: conceptRelationMap.get(concept.id) ?? []
  }));
  const assignmentBuild = buildAssignments(documents, concepts);
  onProgress?.("assignments", 88);
  const rejections: RejectionRecord[] = [
    ...evidence.rejections,
    ...conceptBuild.rejections,
    ...relationBuild.rejections,
    ...assignmentBuild.rejections
  ];
  const relations: RelationV2[] = relationBuild.relations;

  const deterministicHashValue = deterministicHash({
    bundleTitle: bundle.title,
    concepts: concepts.map((concept) => ({
      id: concept.id,
      label: concept.label,
      score: concept.score,
      evidenceIds: concept.evidenceIds,
      fields: concept.fieldAdmissions
    })),
    relations: relations.map((relation) => ({
      fromId: relation.fromId,
      toId: relation.toId,
      type: relation.type,
      evidenceIds: relation.evidenceIds
    })),
    assignments: assignmentBuild.assignments.map((assignment) => ({
      id: assignment.id,
      title: assignment.title,
      titleState: assignment.titleTrust.state,
      dueState: assignment.dueTrust.state,
      conceptIds: assignment.conceptIds,
      readinessEligible: assignment.readinessEligible
    })),
    rejections: rejections.map((rejection) => ({
      stage: rejection.stage,
      code: rejection.code,
      sourceItemId: rejection.sourceItemId
    }))
  });
  onProgress?.("finalize", 100);

  return {
    bundleTitle: bundle.title,
    generatedAt: bundle.capturedAt,
    classifications: documents.map((document) => document.classification),
    documents,
    nodes,
    evidenceUnits: evidence.evidenceUnits,
    concepts,
    relations,
    assignments: assignmentBuild.assignments,
    focusThemes: assignmentBuild.focusThemes,
    readiness: assignmentBuild.readiness,
    rejections,
    deterministicHash: deterministicHashValue
  };
}

export function analyzeBundle(bundle: CaptureBundle): EngineV2Result {
  return analyzeBundleWithProgress(bundle);
}
