import type { ConceptV2, EvidenceUnit, RelationV2, RejectionRecord } from "../contracts/types.ts";
import { sentenceHasApplicationSignal, sentenceHasContrastSignal } from "../noise/rules.ts";
import { meaningfulTokens, normalizeForCompare, readableSnippet } from "../utils/text.ts";

function pairKey(leftId: string, rightId: string): string {
  return leftId < rightId ? `${leftId}::${rightId}` : `${rightId}::${leftId}`;
}

function parsePairKey(key: string): [string, string] {
  const [leftId, rightId] = key.split("::");
  return [leftId!, rightId!];
}

function tokenizedLabel(label: string): string[] {
  const normalized = normalizeForCompare(label);
  const meaningful = meaningfulTokens(normalized);
  return meaningful.length > 0 ? meaningful : normalized.split(" ").filter((token) => token.length > 0);
}

function tokenizedExcerpt(excerpt: string): string[] {
  const meaningful = meaningfulTokens(excerpt);
  if (meaningful.length > 0) {
    return meaningful;
  }
  return normalizeForCompare(excerpt)
    .split(" ")
    .filter((token) => token.length > 0);
}

function addIndexedConcept(
  index: Map<string, Set<string>>,
  token: string,
  conceptId: string
): void {
  const conceptIds = index.get(token) ?? new Set<string>();
  conceptIds.add(conceptId);
  index.set(token, conceptIds);
}

function relationDirection(
  left: ConceptV2,
  right: ConceptV2,
  evidence: EvidenceUnit | null,
  type: RelationV2["type"]
): [ConceptV2, ConceptV2] {
  if (!evidence || type !== "contrasts") {
    return [left, right];
  }
  const excerpt = normalizeForCompare(evidence.excerpt);
  const leftIndex = excerpt.indexOf(normalizeForCompare(left.label));
  const rightIndex = excerpt.indexOf(normalizeForCompare(right.label));
  if (leftIndex === -1 || rightIndex === -1 || leftIndex <= rightIndex) {
    return [left, right];
  }
  return [right, left];
}

export function buildRelations(
  concepts: ConceptV2[],
  evidenceUnits: EvidenceUnit[]
): {
  relations: RelationV2[];
  rejections: RejectionRecord[];
} {
  const relations: RelationV2[] = [];
  const rejections: RejectionRecord[] = [];
  const conceptsById = new Map(concepts.map((concept) => [concept.id, concept]));
  const normalizedLabelByConceptId = new Map(
    concepts.map((concept) => [concept.id, normalizeForCompare(concept.label)])
  );
  const conceptIdsByToken = new Map<string, Set<string>>();
  const evidenceById = new Map(evidenceUnits.map((unit) => [unit.id, unit]));
  const evidenceBySourceItemId = new Map<string, EvidenceUnit[]>();
  const sharedUnitIdsByPair = new Map<string, string[]>();
  const contrastUnitIdByPair = new Map<string, string>();
  const applicationUnitIdByPair = new Map<string, string>();
  const sharedSourcesByPair = new Map<string, Set<string>>();
  const conceptIdsBySourceItemId = new Map<string, Set<string>>();

  for (const unit of evidenceUnits) {
    const sourceUnits = evidenceBySourceItemId.get(unit.sourceItemId) ?? [];
    sourceUnits.push(unit);
    evidenceBySourceItemId.set(unit.sourceItemId, sourceUnits);
  }

  for (const concept of concepts) {
    for (const token of tokenizedLabel(concept.label)) {
      addIndexedConcept(conceptIdsByToken, token, concept.id);
    }
    for (const sourceItemId of concept.sourceItemIds) {
      const conceptIds = conceptIdsBySourceItemId.get(sourceItemId) ?? new Set<string>();
      conceptIds.add(concept.id);
      conceptIdsBySourceItemId.set(sourceItemId, conceptIds);
    }
  }

  for (const unit of evidenceUnits) {
    const candidateConceptIds = new Set<string>();
    for (const token of tokenizedExcerpt(unit.normalizedExcerpt)) {
      const conceptIds = conceptIdsByToken.get(token);
      if (!conceptIds) {
        continue;
      }
      for (const conceptId of conceptIds) {
        candidateConceptIds.add(conceptId);
      }
    }

    const mentionedConceptIds = [...candidateConceptIds].filter((conceptId) => {
      const normalizedLabel = normalizedLabelByConceptId.get(conceptId) ?? "";
      return normalizedLabel.length > 0 && unit.normalizedExcerpt.includes(normalizedLabel);
    });

    if (mentionedConceptIds.length < 2) {
      continue;
    }
    for (let index = 0; index < mentionedConceptIds.length; index += 1) {
      for (let otherIndex = index + 1; otherIndex < mentionedConceptIds.length; otherIndex += 1) {
        const leftId = mentionedConceptIds[index]!;
        const rightId = mentionedConceptIds[otherIndex]!;
        const key = pairKey(leftId, rightId);
        const sharedUnitIds = sharedUnitIdsByPair.get(key) ?? [];
        sharedUnitIds.push(unit.id);
        sharedUnitIdsByPair.set(key, sharedUnitIds);
        if (sentenceHasContrastSignal(unit.excerpt) && !contrastUnitIdByPair.has(key)) {
          contrastUnitIdByPair.set(key, unit.id);
        }
        if (sentenceHasApplicationSignal(unit.excerpt) && !applicationUnitIdByPair.has(key)) {
          applicationUnitIdByPair.set(key, unit.id);
        }
      }
    }
  }

  for (const [sourceItemId, conceptIds] of conceptIdsBySourceItemId.entries()) {
    const conceptIdList = [...conceptIds].sort();
    for (let index = 0; index < conceptIdList.length; index += 1) {
      for (let otherIndex = index + 1; otherIndex < conceptIdList.length; otherIndex += 1) {
        const key = pairKey(conceptIdList[index]!, conceptIdList[otherIndex]!);
        const sharedSources = sharedSourcesByPair.get(key) ?? new Set<string>();
        sharedSources.add(sourceItemId);
        sharedSourcesByPair.set(key, sharedSources);
      }
    }
  }

  const candidateKeys = new Set<string>([
    ...sharedUnitIdsByPair.keys(),
    ...sharedSourcesByPair.keys()
  ]);

  for (const key of candidateKeys) {
    const [leftId, rightId] = parsePairKey(key);
    const left = conceptsById.get(leftId);
    const right = conceptsById.get(rightId);
    if (!left || !right) {
      continue;
    }

    const sharedUnitIds = sharedUnitIdsByPair.get(key) ?? [];
    const sharedUnits = sharedUnitIds
      .map((unitId) => evidenceById.get(unitId))
      .filter((unit): unit is EvidenceUnit => Boolean(unit));
    const sharedSources = [...(sharedSourcesByPair.get(key) ?? new Set<string>())];
    const contrastUnit = evidenceById.get(contrastUnitIdByPair.get(key) ?? "");
    const applicationUnit = evidenceById.get(applicationUnitIdByPair.get(key) ?? "");
    const fallbackEvidence = sharedSources
      .flatMap((sourceItemId) => evidenceBySourceItemId.get(sourceItemId) ?? [])
      .find(Boolean) ?? null;

    let type: RelationV2["type"] | null = null;
    let evidence: EvidenceUnit | null = contrastUnit ?? applicationUnit ?? null;
    if (contrastUnit) {
      type = "contrasts";
    } else if (applicationUnit) {
      type = "applies";
    } else if (sharedUnits.length > 0 || sharedSources.length > 0) {
      type = "supports";
      evidence = sharedUnits[0] ?? fallbackEvidence;
    }

    if (!type || !evidence) {
      rejections.push({
        id: `${left.id}:${right.id}:relation`,
        stage: "relations",
        code: "relation-unsupported",
        message: `Rejected relation between ${left.label} and ${right.label} because no shared evidence lane survived.`,
        candidateId: `${left.id}:${right.id}`,
        evidenceId: sharedUnits[0]?.id
      });
      continue;
    }

    const [fromConcept, toConcept] = relationDirection(left, right, evidence, type);
    relations.push({
      id: `${fromConcept.id}:${toConcept.id}:${type}`,
      fromId: fromConcept.id,
      toId: toConcept.id,
      type,
      label: readableSnippet(evidence.excerpt, 160),
      supportScore: Math.min(100, 40 + sharedUnits.length * 12 + sharedSources.length * 8),
      evidenceIds: [evidence.id],
      acceptanceReason: `Accepted because a shared evidence lane explicitly supports a ${type} relation.`
    });
  }

  relations.sort((left, right) => right.supportScore - left.supportScore || left.id.localeCompare(right.id));
  return {
    relations,
    rejections
  };
}
