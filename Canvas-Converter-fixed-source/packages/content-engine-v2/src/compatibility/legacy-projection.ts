import type {
  AssignmentIntelligence,
  AssignmentReadiness,
  ConceptRelation,
  EvidenceFragment,
  FocusTheme,
  LearningConcept,
  LearningSynthesis,
  RetentionModule,
  SourceFamily
} from "@learning/schema";
import type {
  AssignmentSignalV2,
  ConceptV2,
  EngineV2Result,
  LegacyProjection,
  RelationV2
} from "../contracts/types.ts";
import type { SourceQualityReport } from "../source-quality.ts";
import { readableSnippet } from "../utils/text.ts";

const REQUIREMENT_VERB_PATTERN = /\b(analyze|apply|assess|cite|compare|complete|contrast|define|describe|discuss|evaluate|explain|identify|prepare|respond|submit|use|write)\b/gi;

function normalizeVerb(value: string): string {
  return value.toLowerCase();
}

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

type LegacyProjectionIndexes = {
  conceptById: Map<string, ConceptV2>;
  relatedConceptIdsByConceptId: Map<string, string[]>;
  evidenceById: Map<string, EngineV2Result["evidenceUnits"][number]>;
  assignmentEvidenceIdsBySourceItemId: Map<string, string[]>;
  documentById: Map<string, EngineV2Result["documents"][number]>;
  sourceFamilyBySourceItemId: Map<string, SourceFamily>;
  assignmentVerbsByConceptId: Map<string, string[]>;
  assignmentItemIdsByConceptId: Map<string, string[]>;
};

function assignmentVerbs(...values: string[]): string[] {
  const verbs: string[] = [];
  for (const value of values) {
    const matches = value.match(REQUIREMENT_VERB_PATTERN) ?? [];
    verbs.push(...matches.map(normalizeVerb));
  }
  return unique(verbs);
}

function buildLegacyProjectionIndexes(result: EngineV2Result): LegacyProjectionIndexes {
  const conceptById = new Map(result.concepts.map((entry) => [entry.id, entry] as const));
  const relatedConceptIdsByConceptId = new Map<string, string[]>();
  const evidenceById = new Map(result.evidenceUnits.map((unit) => [unit.id, unit] as const));
  const assignmentEvidenceIdsBySourceItemId = new Map<string, string[]>();
  const documentById = new Map(result.documents.map((document) => [document.item.id, document] as const));
  const sourceFamilyBySourceItemId = new Map<string, SourceFamily>();
  const assignmentVerbsByConceptId = new Map<string, Set<string>>();
  const assignmentItemIdsByConceptId = new Map<string, Set<string>>();

  for (const relation of result.relations) {
    const leftRelations = relatedConceptIdsByConceptId.get(relation.fromId) ?? [];
    leftRelations.push(relation.toId);
    relatedConceptIdsByConceptId.set(relation.fromId, leftRelations);

    const rightRelations = relatedConceptIdsByConceptId.get(relation.toId) ?? [];
    rightRelations.push(relation.fromId);
    relatedConceptIdsByConceptId.set(relation.toId, rightRelations);
  }

  for (const unit of result.evidenceUnits) {
    const sourceEvidenceIds = assignmentEvidenceIdsBySourceItemId.get(unit.sourceItemId) ?? [];
    if (unit.kind === "title" || unit.kind === "assignment-prompt") {
      sourceEvidenceIds.push(unit.id);
      assignmentEvidenceIdsBySourceItemId.set(unit.sourceItemId, sourceEvidenceIds);
    }
  }

  for (const document of result.documents) {
    if (
      document.classification.sourceFamily === "textbook-segment"
      || document.classification.sourceFamily === "manual-document"
      || document.item.kind === "document"
      || (document.item.tags ?? []).includes("textbook")
    ) {
      sourceFamilyBySourceItemId.set(document.item.id, "textbook");
      continue;
    }
    if (document.classification.originSystem === "canvas-extension") {
      sourceFamilyBySourceItemId.set(document.item.id, "canvas");
      continue;
    }
    if (document.classification.originSystem === "merged") {
      sourceFamilyBySourceItemId.set(document.item.id, "mixed");
      continue;
    }
    sourceFamilyBySourceItemId.set(document.item.id, "other");
  }

  for (const assignment of result.assignments) {
    const verbs = assignmentVerbs(assignment.title, ...assignment.requirementLines);
    for (const conceptId of assignment.conceptIds) {
      const existingVerbs = assignmentVerbsByConceptId.get(conceptId) ?? new Set<string>();
      for (const verb of verbs) {
        existingVerbs.add(verb);
      }
      assignmentVerbsByConceptId.set(conceptId, existingVerbs);

      const assignmentItemIds = assignmentItemIdsByConceptId.get(conceptId) ?? new Set<string>();
      assignmentItemIds.add(assignment.sourceItemId);
      assignmentItemIdsByConceptId.set(conceptId, assignmentItemIds);
    }
  }

  return {
    conceptById,
    relatedConceptIdsByConceptId,
    evidenceById,
    assignmentEvidenceIdsBySourceItemId,
    documentById,
    sourceFamilyBySourceItemId,
    assignmentVerbsByConceptId: new Map(
      [...assignmentVerbsByConceptId.entries()].map(([conceptId, verbs]) => [conceptId, [...verbs]] as const)
    ),
    assignmentItemIdsByConceptId: new Map(
      [...assignmentItemIdsByConceptId.entries()].map(([conceptId, assignmentItemIds]) => [conceptId, [...assignmentItemIds]] as const)
    )
  };
}

function conceptById(indexes: LegacyProjectionIndexes, conceptId: string): ConceptV2 | undefined {
  return indexes.conceptById.get(conceptId);
}

function relationIdsForConcept(indexes: LegacyProjectionIndexes, conceptId: string): string[] {
  return indexes.relatedConceptIdsByConceptId.get(conceptId) ?? [];
}

function evidenceUnitsByIds(indexes: LegacyProjectionIndexes, evidenceIds: string[]) {
  return evidenceIds
    .map((evidenceId) => indexes.evidenceById.get(evidenceId))
    .filter((unit): unit is NonNullable<typeof unit> => Boolean(unit));
}

function documentText(indexes: LegacyProjectionIndexes, sourceItemId: string): string {
  return indexes.documentById.get(sourceItemId)?.cleanedText ?? "";
}

function sourceFamilyForDocument(indexes: LegacyProjectionIndexes, sourceItemId: string): SourceFamily {
  return indexes.sourceFamilyBySourceItemId.get(sourceItemId) ?? "other";
}

function coalesceSourceFamily(families: SourceFamily[]): SourceFamily {
  const uniqueFamilies = unique(families.filter(Boolean));
  if (uniqueFamilies.length === 0) {
    return "other";
  }
  if (uniqueFamilies.length === 1) {
    return uniqueFamilies[0]!;
  }
  if (uniqueFamilies.includes("canvas") && uniqueFamilies.includes("textbook")) {
    return "mixed";
  }
  if (uniqueFamilies.includes("mixed")) {
    return "mixed";
  }
  return uniqueFamilies[0] ?? "other";
}

function toLegacyEvidence(
  indexes: LegacyProjectionIndexes,
  evidenceIds: string[],
  fieldLabel: string,
  fieldId?: string
): EvidenceFragment[] {
  return evidenceUnitsByIds(indexes, evidenceIds)
    .slice(0, 3)
    .map((unit) => ({
      label: fieldLabel,
      excerpt: readableSnippet(unit.excerpt, 180),
      sourceItemId: unit.sourceItemId,
      sourceKind: unit.sourceKind,
      sourceOrigin: unit.sourceField ? "structured-field" : "source-block",
      sourceType:
        unit.kind === "title" ? "structured-title" :
        unit.kind === "structured-date" ? "structured-due-date" :
        unit.kind === "structured-module" ? "structured-module" :
        unit.kind === "heading" ? "heading" :
        unit.kind === "list-item" ? "list-item" :
        unit.kind === "definition" ? "definition" :
        unit.kind === "excerpt" ? "summary" :
        unit.kind === "assignment-prompt" ? "prompt" :
        "paragraph",
      sourceField: fieldId,
      evidenceScore: unit.supportScore,
      passReason: unit.acceptedReasons[0] ?? "Accepted by the v2 truth gate."
    }));
}

function firstAdmission(concept: ConceptV2, ...fieldIds: Array<keyof ConceptV2["fieldAdmissions"]>) {
  for (const fieldId of fieldIds) {
    const admission = concept.fieldAdmissions[fieldId];
    if (admission) {
      return admission;
    }
  }
  return undefined;
}

function fieldQuality(score: number): "strong" | "supported" | "weak" {
  if (score >= 40) {
    return "strong";
  }
  if (score >= 20) {
    return "supported";
  }
  return "weak";
}

function toLegacyConcept(indexes: LegacyProjectionIndexes, conceptId: string): LearningConcept {
  const concept = conceptById(indexes, conceptId)!;
  const definition = firstAdmission(concept, "definition");
  const summary = firstAdmission(concept, "summary", "definition");
  const primer = firstAdmission(concept, "primer");
  const mnemonic = firstAdmission(concept, "mnemonic", "hook");
  const trap = firstAdmission(concept, "trap");
  const transfer = firstAdmission(concept, "transfer");

  return {
    id: concept.id,
    label: concept.label,
    score: concept.score,
    summary: summary?.text ?? "",
    primer: primer?.text ?? "",
    mnemonic: mnemonic?.text ?? "",
    excerpt: summary?.text ?? definition?.text ?? "",
    definition: definition?.text ?? "",
    stakes: "",
    commonConfusion: trap?.text ?? "",
    transferHook: transfer?.text ?? "",
    category: "Grounded concept",
    keywords: concept.keywords,
    sourceItemIds: concept.sourceItemIds,
    relatedConceptIds: relationIdsForConcept(indexes, concept.id),
    fieldSupport: {
      definition: definition ? {
        quality: fieldQuality(definition.supportScore),
        supportScore: definition.supportScore,
        passReason: definition.acceptanceReason,
        evidence: toLegacyEvidence(indexes, definition.evidenceIds, "Definition", "definition")
      } : undefined,
      summary: summary ? {
        quality: fieldQuality(summary.supportScore),
        supportScore: summary.supportScore,
        passReason: summary.acceptanceReason,
        evidence: toLegacyEvidence(indexes, summary.evidenceIds, "Summary", "summary")
      } : undefined,
      primer: primer ? {
        quality: fieldQuality(primer.supportScore),
        supportScore: primer.supportScore,
        passReason: primer.acceptanceReason,
        evidence: toLegacyEvidence(indexes, primer.evidenceIds, "Primer", "primer")
      } : undefined,
      mnemonic: mnemonic ? {
        quality: fieldQuality(mnemonic.supportScore),
        supportScore: mnemonic.supportScore,
        passReason: mnemonic.acceptanceReason,
        evidence: toLegacyEvidence(indexes, mnemonic.evidenceIds, "Mnemonic", "mnemonic")
      } : undefined,
      commonConfusion: trap ? {
        quality: fieldQuality(trap.supportScore),
        supportScore: trap.supportScore,
        passReason: trap.acceptanceReason,
        evidence: toLegacyEvidence(indexes, trap.evidenceIds, "Trap", "commonConfusion")
      } : undefined,
      transferHook: transfer ? {
        quality: fieldQuality(transfer.supportScore),
        supportScore: transfer.supportScore,
        passReason: transfer.acceptanceReason,
        evidence: toLegacyEvidence(indexes, transfer.evidenceIds, "Transfer", "transferHook")
      } : undefined
    }
  };
}

function relationToLegacy(indexes: LegacyProjectionIndexes, relation: RelationV2): ConceptRelation {
  return {
    fromId: relation.fromId,
    toId: relation.toId,
    type: relation.type,
    label: relation.label,
    strength: relation.supportScore,
    evidence: toLegacyEvidence(indexes, relation.evidenceIds, "Relation evidence")
  };
}

function assignmentEvidence(indexes: LegacyProjectionIndexes, assignment: AssignmentSignalV2): EvidenceFragment[] {
  const explicitEvidence = toLegacyEvidence(indexes, assignment.evidenceIds, "Assignment support");
  if (explicitEvidence.length > 0) {
    return explicitEvidence;
  }
  const titleEvidenceIds = indexes.assignmentEvidenceIdsBySourceItemId.get(assignment.sourceItemId) ?? [];
  return toLegacyEvidence(indexes, titleEvidenceIds, "Assignment title");
}

function assignmentSummary(indexes: LegacyProjectionIndexes, assignment: AssignmentSignalV2): string {
  if (assignment.requirementLines.length > 0) {
    return readableSnippet(assignment.requirementLines.join(" "), 180);
  }
  return readableSnippet(documentText(indexes, assignment.sourceItemId), 180);
}

function assignmentPitfalls(indexes: LegacyProjectionIndexes, assignment: AssignmentSignalV2): string[] {
  return unique(
    assignment.conceptIds
      .map((conceptId) => conceptById(indexes, conceptId)?.fieldAdmissions.trap?.text ?? "")
      .filter((value) => value.length >= 20)
      .map((value) => readableSnippet(value, 140))
  ).slice(0, 3);
}

function assignmentIntel(indexes: LegacyProjectionIndexes, assignment: AssignmentSignalV2, focusThemes: FocusTheme[]): AssignmentIntelligence | null {
  const evidence = assignmentEvidence(indexes, assignment);
  if (evidence.length === 0 || assignment.titleTrust.state !== "accepted") {
    return null;
  }
  const verbs = assignmentVerbs(assignment.title, ...assignment.requirementLines);
  return {
    id: assignment.id,
    sourceItemId: assignment.sourceItemId,
    title: assignment.title,
    kind: assignment.sourceKind,
    url: indexes.documentById.get(assignment.sourceItemId)?.item.canonicalUrl ?? "https://local.learning/unknown",
    summary: assignmentSummary(indexes, assignment),
    dueAt: assignment.dueAt,
    dueTrust: assignment.dueTrust,
    likelySkills: verbs,
    conceptIds: assignment.conceptIds,
    focusThemeIds: focusThemes
      .filter((theme) => theme.conceptIds.some((conceptId) => assignment.conceptIds.includes(conceptId)))
      .map((theme) => theme.id),
    readinessEligible: assignment.readinessEligible,
    readinessAcceptanceReasons: assignment.acceptanceReasons,
    readinessRejectionReasons: assignment.rejectionReasons,
    likelyPitfalls: assignmentPitfalls(indexes, assignment),
    checklist: assignment.requirementLines,
    evidence
  };
}

function readinessEvidence(indexes: LegacyProjectionIndexes, evidenceIds: string[]): EvidenceFragment[] {
  return toLegacyEvidence(indexes, evidenceIds, "Readiness support");
}

function readinessFromResult(
  indexes: LegacyProjectionIndexes,
  readiness: EngineV2Result["readiness"][number]
): AssignmentReadiness {
  return {
    id: readiness.id,
    sourceItemId: readiness.sourceItemId,
    title: readiness.title,
    conceptIds: readiness.conceptIds,
    checklist: readiness.checklist,
    evidence: readinessEvidence(indexes, readiness.evidenceIds),
    ready: readiness.ready,
    acceptanceReasons: readiness.acceptanceReasons,
    rejectionReasons: readiness.rejectionReasons
  };
}

function themeVerbs(indexes: LegacyProjectionIndexes, conceptIds: string[]): string[] {
  return unique(
    conceptIds.flatMap((conceptId) => indexes.assignmentVerbsByConceptId.get(conceptId) ?? [])
  ).slice(0, 4);
}

function themeSourceItemIds(indexes: LegacyProjectionIndexes, evidenceIds: string[], conceptIds: string[]): string[] {
  const fromEvidence = evidenceUnitsByIds(indexes, evidenceIds).map((unit) => unit.sourceItemId);
  const fromConcepts = conceptIds.flatMap((conceptId) => conceptById(indexes, conceptId)?.sourceItemIds ?? []);
  return unique([...fromEvidence, ...fromConcepts]).slice(0, 6);
}

function focusThemeFromResult(indexes: LegacyProjectionIndexes, theme: EngineV2Result["focusThemes"][number]): FocusTheme | null {
  if (theme.conceptIds.length === 0 || theme.evidenceIds.length === 0) {
    return null;
  }
  const sourceItemIds = themeSourceItemIds(indexes, theme.evidenceIds, theme.conceptIds);
  const assignmentItemIds = unique(
    theme.conceptIds.flatMap((conceptId) => indexes.assignmentItemIdsByConceptId.get(conceptId) ?? [])
  ).slice(0, 6);
  const sourceFamily = coalesceSourceFamily(sourceItemIds.map((sourceItemId) => sourceFamilyForDocument(indexes, sourceItemId)));
  return {
    id: theme.id,
    label: theme.label,
    score: theme.score,
    summary: readableSnippet(theme.summary, 180),
    verbs: themeVerbs(indexes, theme.conceptIds),
    sourceFamily,
    conceptIds: theme.conceptIds,
    sourceItemIds,
    assignmentItemIds,
    evidence: toLegacyEvidence(indexes, theme.evidenceIds, "Focus theme")
  };
}

function retentionModules(
  concepts: LearningConcept[],
  relations: ConceptRelation[],
  assignmentMappings: AssignmentIntelligence[]
): RetentionModule[] {
  const stableConcepts = concepts.filter((concept) => (concept.fieldSupport?.definition?.evidence.length ?? 0) > 0);
  const modules: RetentionModule[] = [];

  if (stableConcepts.length > 0) {
    modules.push({
      id: "review-queue",
      kind: "review-queue",
      title: "Review Queue",
      summary: "Keep the strongest grounded concepts warm between study sessions.",
      conceptIds: stableConcepts.slice(-4).map((concept) => concept.id),
      prompts: stableConcepts.slice(-4).map((concept) => `Recover ${concept.label} from memory, then verify it with one grounded sentence.`),
      evidence: stableConcepts.slice(-2).flatMap((concept) => concept.fieldSupport?.definition?.evidence.slice(0, 1) ?? []).slice(0, 2)
    });
  }

  const contrastRelations = relations.filter((relation) => relation.type === "contrasts" && (relation.evidence?.length ?? 0) > 0);
  if (contrastRelations.length > 0) {
    modules.push({
      id: "distinction-drill",
      kind: "distinction-drill",
      title: "Distinction Drill",
      summary: "Separate the concepts that most easily blur together in the current evidence lane.",
      conceptIds: unique(contrastRelations.flatMap((relation) => [relation.fromId, relation.toId])).slice(0, 4),
      prompts: contrastRelations.slice(0, 4).map((relation) => relation.label),
      evidence: contrastRelations.slice(0, 2).flatMap((relation) => relation.evidence ?? []).slice(0, 2)
    });
  }

  if (assignmentMappings.length > 0) {
    modules.push({
      id: "transfer-scenario",
      kind: "transfer-scenario",
      title: "Transfer Scenarios",
      summary: "Aim grounded concepts directly at captured assignments and discussion prompts.",
      conceptIds: unique(assignmentMappings.flatMap((mapping) => mapping.conceptIds)).slice(0, 5),
      prompts: assignmentMappings.slice(0, 4).map((mapping) => `Before ${mapping.title}, which grounded concept should lead and why?`),
      evidence: assignmentMappings.slice(0, 2).flatMap((mapping) => mapping.evidence.slice(0, 1)).slice(0, 2)
    });
  }

  return modules.filter((module) => module.evidence.length > 0 && module.prompts.length > 0);
}

function defaultSynthesisMode(result: EngineV2Result): LearningSynthesis["synthesisMode"] {
  if (result.concepts.length === 0 && result.assignments.length === 0) {
    return "blocked-with-warning";
  }
  if (result.rejections.length > 0) {
    return "degraded";
  }
  return "full";
}

export function projectToLegacy(
  result: EngineV2Result,
  options?: { qualityReport?: SourceQualityReport }
): LegacyProjection {
  const indexes = buildLegacyProjectionIndexes(result);
  const concepts = result.concepts.map((concept) => toLegacyConcept(indexes, concept.id));
  const relations = result.relations.map((relation) => relationToLegacy(indexes, relation));
  const focusThemes = result.focusThemes
    .map((theme) => focusThemeFromResult(indexes, theme))
    .filter((theme): theme is FocusTheme => Boolean(theme));
  const assignmentMappings = result.assignments
    .map((assignment) => assignmentIntel(indexes, assignment, focusThemes))
    .filter((assignment): assignment is AssignmentIntelligence => Boolean(assignment));
  const assignmentReadiness = result.readiness.map((readiness) => readinessFromResult(indexes, readiness));
  const synthesisMode = options?.qualityReport?.synthesisMode ?? defaultSynthesisMode(result);
  const retention = retentionModules(concepts, relations, assignmentMappings);

  const synthesis: LearningSynthesis = {
    pipelineStages: [
      "normalize",
      "classify",
      "structure",
      "evidence",
      "admit",
      "project"
    ],
    sourceCoverage: {
      canvasItemCount: result.documents.filter((document) => document.classification.originSystem === "canvas-extension").length,
      textbookItemCount: result.documents.filter((document) => document.classification.originSystem === "textbook-import").length,
      assignmentCount: result.documents.filter((document) => document.classification.sourceFamily === "assignment").length,
      discussionCount: result.documents.filter((document) => document.classification.sourceFamily === "discussion").length,
      quizCount: result.documents.filter((document) => document.classification.sourceFamily === "quiz").length,
      pageCount: result.documents.filter((document) => document.classification.sourceFamily === "page").length,
      moduleCount: result.documents.filter((document) => document.classification.sourceFamily === "module").length,
      documentCount: result.documents.filter((document) => document.classification.sourceFamily === "textbook-segment" || document.classification.sourceFamily === "manual-document").length
    },
    stableConceptIds: concepts
      .filter((concept) => (concept.fieldSupport?.definition?.evidence.length ?? 0) > 0)
      .map((concept) => concept.id),
    likelyAssessedSkills: unique(assignmentMappings.flatMap((assignment) => assignment.likelySkills)).sort(),
    focusThemes,
    assignmentMappings,
    assignmentReadiness,
    retentionModules: retention,
    deterministicHash: result.deterministicHash,
    qualityBanner: options?.qualityReport?.warnings.length
      ? options.qualityReport.warnings[0] ?? ""
      : result.rejections.length > 0
        ? "V2 projection includes explicit rejection-ledger output."
        : "",
    qualityWarnings: options?.qualityReport?.warnings ?? result.rejections.slice(0, 6).map((rejection) => rejection.message),
    synthesisMode
  };

  return {
    concepts,
    relations,
    synthesis,
    focusThemes,
    assignmentIntel: assignmentMappings,
    retentionModules: retention,
    debug: {
      conceptCount: concepts.length,
      rejectionCount: result.rejections.length,
      deterministicHash: result.deterministicHash
    }
  };
}
