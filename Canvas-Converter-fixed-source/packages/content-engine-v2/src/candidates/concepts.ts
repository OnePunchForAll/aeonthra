import type { ConceptV2, EvidenceUnit, RejectionRecord } from "../contracts/types.ts";
import { compileConceptFields, type ConceptCluster } from "../fields/compile.ts";
import {
  isGenericTitleContainerText,
  sentenceHasDefinitionSignal,
  sentenceHasApplicationSignal,
  sentenceHasConfusionSignal,
  sentenceHasContrastSignal
} from "../noise/rules.ts";
import { evaluateLabel } from "../truth-gates/labels.ts";
import { meaningfulTokens, normalizeForCompare, overlapRatio, slugifyStable } from "../utils/text.ts";

const EXPLICIT_DEFINITION_PATTERNS = [
  /^([A-Za-z][A-Za-z0-9'/-]*(?:\s+[A-Za-z][A-Za-z0-9'/-]*){0,6})\s+(?:is|are)\b/i,
  /^([A-Za-z][A-Za-z0-9'/-]*(?:\s+[A-Za-z][A-Za-z0-9'/-]*){0,6})\s+(?:refers to|means|describes|explains)\b/i,
  /^([A-Za-z][A-Za-z0-9'/-]*(?:\s+[A-Za-z][A-Za-z0-9'/-]*){0,6})\s+(?:occurs when|happens when)\b/i,
  /^([A-Za-z][A-Za-z0-9'/-]*(?:\s+[A-Za-z][A-Za-z0-9'/-]*){0,6})\s+(?:increases?|decreases?|strengthens?|weakens?)\b/i
] as const;

function explicitLabels(unit: EvidenceUnit): string[] {
  const clauses = unit.excerpt.split(/\bwhile\b|;/i).map((entry) => entry.trim()).filter(Boolean);
  const labels: string[] = [];
  for (const clause of clauses) {
    for (const pattern of EXPLICIT_DEFINITION_PATTERNS) {
      const match = clause.match(pattern);
      const rawLabel = match?.[1]?.trim();
      if (rawLabel) {
        const tokens = rawLabel.split(/\s+/).filter(Boolean).slice(0, 8);
        const candidates = tokens
          .map((_, index) => tokens.slice(index).join(" "))
          .filter((candidate) => candidate.split(/\s+/).length >= 1);
        const recovered = candidates.find((candidate) => evaluateLabel(candidate).accepted);
        if (recovered) {
          labels.push(recovered);
        }
        break;
      }
    }
  }
  return labels;
}

function headingBackedLabel(unit: EvidenceUnit): string | null {
  if (unit.kind !== "heading" && unit.kind !== "title") {
    return null;
  }
  const candidate = unit.excerpt.split(/[:|]/)[0]?.trim() ?? null;
  if (!candidate || isGenericTitleContainerText(candidate)) {
    return null;
  }
  return candidate;
}

function clusterKey(label: string): string {
  return normalizeForCompare(label)
    .replace(/^(overview|introduction|principles|foundations)\s+(?:of|to|for)\s+/i, "")
    .replace(/\s+(overview|introduction|principles|foundations)$/i, "")
    .trim();
}

function upsertCluster(map: Map<string, ConceptCluster>, label: string): ConceptCluster {
  const gate = evaluateLabel(label);
  const key = clusterKey(gate.cleanedLabel);
  const existing = map.get(key);
  if (existing) {
    return existing;
  }
  const cluster: ConceptCluster = {
    label: gate.cleanedLabel,
    normalizedLabel: key,
    keywords: gate.keywords,
    sourceItemIds: new Set<string>(),
    evidenceIds: new Set<string>(),
    definitionUnits: [],
    supportUnits: [],
    applicationUnits: [],
    contrastUnits: [],
    confusionUnits: []
  };
  map.set(key, cluster);
  return cluster;
}

function mentionScore(label: string, unit: EvidenceUnit): number {
  const labelNorm = normalizeForCompare(label);
  const excerptNorm = unit.normalizedExcerpt;
  if (excerptNorm.includes(labelNorm)) {
    return 1;
  }
  return overlapRatio(label, unit.excerpt);
}

export function buildConcepts(
  evidenceUnits: EvidenceUnit[]
): {
  concepts: ConceptV2[];
  rejections: RejectionRecord[];
} {
  const clusters = new Map<string, ConceptCluster>();
  const rejections: RejectionRecord[] = [];

  for (const unit of evidenceUnits) {
    const labels = explicitLabels(unit);
    const candidateLabels = labels.length > 0 ? labels : [headingBackedLabel(unit)].filter((entry): entry is string => Boolean(entry));
    if (candidateLabels.length === 0) {
      continue;
    }
    for (const label of candidateLabels) {
      const gate = evaluateLabel(label);
      if (!gate.accepted) {
        rejections.push({
          id: `${unit.id}:label:${gate.cleanedLabel}`,
          stage: "candidates",
          code: "candidate-label-rejected",
          message: `Rejected candidate label ${gate.cleanedLabel} because ${gate.rejectionReasons.join(", ")}.`,
          sourceItemId: unit.sourceItemId,
          evidenceId: unit.id
        });
        continue;
      }
      const cluster = upsertCluster(clusters, gate.cleanedLabel);
      cluster.sourceItemIds.add(unit.sourceItemId);
      cluster.evidenceIds.add(unit.id);
      if (labels.length > 0) {
        cluster.definitionUnits.push(unit);
        if (cluster.supportUnits.length === 0) {
          cluster.supportUnits.push(unit);
        }
        let addedSupport = false;
        if (sentenceHasApplicationSignal(unit.excerpt)) {
          if (!addedSupport) {
            cluster.supportUnits.push(unit);
            addedSupport = true;
          }
          cluster.applicationUnits.push(unit);
        }
        if (sentenceHasContrastSignal(unit.excerpt)) {
          if (!addedSupport) {
            cluster.supportUnits.push(unit);
            addedSupport = true;
          }
          cluster.contrastUnits.push(unit);
        }
        if (sentenceHasConfusionSignal(unit.excerpt)) {
          if (!addedSupport) {
            cluster.supportUnits.push(unit);
            addedSupport = true;
          }
          cluster.confusionUnits.push(unit);
        }
      } else {
        cluster.supportUnits.push(unit);
        if (sentenceHasDefinitionSignal(unit.excerpt)) {
          cluster.definitionUnits.push(unit);
        }
      }
    }
  }

  for (const cluster of clusters.values()) {
    for (const unit of evidenceUnits) {
      if (cluster.evidenceIds.has(unit.id)) {
        continue;
      }
      const score = mentionScore(cluster.label, unit);
      if (score < 0.6) {
        continue;
      }
      cluster.sourceItemIds.add(unit.sourceItemId);
      cluster.evidenceIds.add(unit.id);
      if (sentenceHasApplicationSignal(unit.excerpt)) {
        cluster.applicationUnits.push(unit);
      }
      if (sentenceHasContrastSignal(unit.excerpt)) {
        cluster.contrastUnits.push(unit);
      }
      if (sentenceHasConfusionSignal(unit.excerpt)) {
        cluster.confusionUnits.push(unit);
      }
      cluster.supportUnits.push(unit);
    }
  }

  const concepts: ConceptV2[] = [];
  for (const cluster of clusters.values()) {
    if (cluster.definitionUnits.length === 0) {
      rejections.push({
        id: `${cluster.normalizedLabel}:definition-missing`,
        stage: "truth-gates",
        code: "concept-missing-definition-lane",
        message: `Rejected ${cluster.label} because no explicit definition lane survived.`,
        candidateId: cluster.normalizedLabel
      });
      continue;
    }
    const supportCount = cluster.supportUnits.length;
    if (supportCount === 0) {
      rejections.push({
        id: `${cluster.normalizedLabel}:support-missing`,
        stage: "truth-gates",
        code: "concept-missing-support-lane",
        message: `Rejected ${cluster.label} because no supporting evidence lane survived.`,
        candidateId: cluster.normalizedLabel
      });
      continue;
    }
    const fields = compileConceptFields(cluster);
    const definition = fields.definition;
    if (!definition) {
      rejections.push({
        id: `${cluster.normalizedLabel}:field-definition-missing`,
        stage: "fields",
        code: "concept-definition-not-visible",
        message: `Rejected ${cluster.label} because the definition field could not be admitted.`,
        candidateId: cluster.normalizedLabel
      });
      continue;
    }

    const conceptId = slugifyStable(cluster.label);
    const score = Math.min(100, 50 + cluster.definitionUnits.length * 15 + supportCount * 4 + cluster.sourceItemIds.size * 6);
    concepts.push({
      id: conceptId,
      label: cluster.label,
      score,
      keywords: meaningfulTokens(`${cluster.label} ${cluster.keywords.join(" ")}`).slice(0, 8),
      sourceItemIds: [...cluster.sourceItemIds].sort(),
      evidenceIds: [...cluster.evidenceIds].sort(),
      fieldAdmissions: fields,
      relationIds: [],
      admissionReasons: [
        "concept-explicit-definition",
        supportCount > 1 ? "concept-has-multiple-support-lanes" : "concept-has-single-support-lane"
      ],
      rejectionReasons: []
    });
  }

  concepts.sort((left, right) => right.score - left.score || left.label.localeCompare(right.label));
  return {
    concepts,
    rejections
  };
}
