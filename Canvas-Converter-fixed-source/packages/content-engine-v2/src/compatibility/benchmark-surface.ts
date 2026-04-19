import legacyV1SurfacesJson from "../benchmarks/legacy-v1-surfaces.json" with { type: "json" };
import type { CaptureBundle } from "@learning/schema";
import type {
  BenchmarkAssignmentSurface,
  BenchmarkConceptSurface,
  BenchmarkRelationSurface,
  BenchmarkSurface,
  EngineV2Result
} from "../contracts/types.ts";
import { buildLearningBundleFromAnalysis } from "./learning-bundle.ts";
import { deriveWorkspace } from "../../../../apps/web/src/lib/workspace.ts";
import { mapToShellData } from "../../../../apps/web/src/lib/shell-mapper.ts";
import { createEmptyProgress } from "../../../../apps/web/src/lib/shell-runtime.ts";

const legacyV1Surfaces = legacyV1SurfacesJson as Record<string, BenchmarkSurface>;

function provenanceComplete(fields: BenchmarkConceptSurface["visibleFields"], evidenceCount: number): boolean {
  return evidenceCount > 0 && Object.values(fields).every((value) => typeof value === "string");
}

export function buildV1BenchmarkSurface(fixtureId: string): BenchmarkSurface {
  const surface = legacyV1Surfaces[fixtureId];
  if (!surface) {
    throw new Error(`Missing legacy v1 benchmark surface for fixture ${fixtureId}.`);
  }
  return surface;
}

export function buildV2BenchmarkSurface(bundle: CaptureBundle, result: EngineV2Result): BenchmarkSurface {
  const concepts: BenchmarkConceptSurface[] = result.concepts.map((concept) => {
    const visibleFields = Object.fromEntries(
      Object.entries(concept.fieldAdmissions)
        .filter((entry): entry is [keyof typeof concept.fieldAdmissions, NonNullable<typeof entry[1]>] => Boolean(entry[1]))
        .map(([fieldId, admission]) => [fieldId, admission.text])
    );
    return {
      label: concept.label,
      conceptId: concept.id,
      visibleFields,
      evidenceCount: concept.evidenceIds.length,
      provenanceComplete: provenanceComplete(visibleFields, concept.evidenceIds.length)
    };
  });

  const assignments: BenchmarkAssignmentSurface[] = result.assignments.map((assignment) => ({
    sourceItemId: assignment.sourceItemId,
    title: assignment.title,
    titleAccepted: assignment.titleTrust.state === "accepted",
    dueState: assignment.dueTrust.state === "accepted" ? "trusted" : "unknown",
    readinessEligible: assignment.readinessEligible,
    conceptIds: assignment.conceptIds
  }));

  const conceptNameById = new Map(result.concepts.map((concept) => [concept.id, concept.label]));
  const relations: BenchmarkRelationSurface[] = result.relations.map((relation) => ({
    fromLabel: conceptNameById.get(relation.fromId) ?? relation.fromId,
    toLabel: conceptNameById.get(relation.toId) ?? relation.toId,
    type: relation.type,
    evidenceCount: relation.evidenceIds.length
  }));
  const learning = buildLearningBundleFromAnalysis(bundle, result);
  const workspace = deriveWorkspace(bundle, learning, createEmptyProgress());
  const shell = mapToShellData(bundle, learning, workspace);

  return {
    engineId: "v2",
    deterministicHash: result.deterministicHash,
    concepts,
    assignments,
    relations,
    rejectionCodes: result.rejections.map((rejection) => rejection.code),
    moduleTitles: shell.modules.map((module) => module.title),
    skillLabels: shell.skillTree.nodes.map((node) => node.label),
    checklistLines: shell.assignments.flatMap((assignment) => assignment.requirementLines),
    shellAssignmentTitles: shell.assignments.map((assignment) => assignment.title)
  };
}
