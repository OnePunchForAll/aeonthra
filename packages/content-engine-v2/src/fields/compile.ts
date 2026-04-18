import type { EvidenceUnit, FieldAdmission, VisibleFieldId } from "../contracts/types.ts";
import { sentenceHasApplicationSignal, sentenceHasConfusionSignal, sentenceHasContrastSignal } from "../noise/rules.ts";
import { normalizeForCompare, overlapRatio, readableSnippet } from "../utils/text.ts";

export type ConceptCluster = {
  label: string;
  normalizedLabel: string;
  keywords: string[];
  sourceItemIds: Set<string>;
  evidenceIds: Set<string>;
  definitionUnits: EvidenceUnit[];
  supportUnits: EvidenceUnit[];
  applicationUnits: EvidenceUnit[];
  contrastUnits: EvidenceUnit[];
  confusionUnits: EvidenceUnit[];
};

function admission(
  fieldId: VisibleFieldId,
  unit: EvidenceUnit | null,
  reason: string
): FieldAdmission | undefined {
  if (!unit) {
    return undefined;
  }
  return {
    fieldId,
    text: readableSnippet(unit.excerpt, 220),
    evidenceIds: [unit.id],
    supportScore: unit.supportScore,
    acceptanceReason: reason
  };
}

function distinctCandidate(
  candidates: EvidenceUnit[],
  blockedText: string[]
): EvidenceUnit | null {
  for (const candidate of candidates) {
    const normalized = normalizeForCompare(candidate.excerpt);
    if (!normalized) {
      continue;
    }
    if (blockedText.some((entry) => overlapRatio(entry, candidate.excerpt) >= 0.82 || normalizeForCompare(entry) === normalized)) {
      continue;
    }
    return candidate;
  }
  return null;
}

function explicitMnemonic(cluster: ConceptCluster): EvidenceUnit | null {
  return cluster.supportUnits.find((unit) =>
    /\bremember\b/i.test(unit.excerpt)
    || /\bacronym\b/i.test(unit.excerpt)
    || /\bstands for\b/i.test(unit.excerpt)
  ) ?? null;
}

export function compileConceptFields(cluster: ConceptCluster): Partial<Record<VisibleFieldId, FieldAdmission>> {
  const fields: Partial<Record<VisibleFieldId, FieldAdmission>> = {};
  const usedText: string[] = [];

  const definition = distinctCandidate(cluster.definitionUnits, usedText);
  if (definition) {
    fields.definition = admission("definition", definition, "Accepted because the evidence unit matches an explicit definitional lane.");
    usedText.push(definition.excerpt);
  }

  const summary = distinctCandidate(cluster.supportUnits.filter((unit) => !sentenceHasApplicationSignal(unit.excerpt)), usedText);
  if (summary) {
    fields.summary = admission("summary", summary, "Accepted because the evidence unit adds explanatory support beyond the definition.");
    usedText.push(summary.excerpt);
  }

  const primer = distinctCandidate(cluster.supportUnits.filter((unit) => unit.kind === "heading" || unit.kind === "explanation"), usedText);
  if (primer) {
    fields.primer = admission("primer", primer, "Accepted because the evidence unit provides an additional grounded framing lane.");
    usedText.push(primer.excerpt);
  }

  const distinction = distinctCandidate(cluster.contrastUnits.filter((unit) => sentenceHasContrastSignal(unit.excerpt)), usedText);
  if (distinction) {
    fields.distinction = admission("distinction", distinction, "Accepted because the evidence unit explicitly contrasts this concept with another idea.");
    usedText.push(distinction.excerpt);
  }

  const trap = distinctCandidate(cluster.confusionUnits.filter((unit) => sentenceHasConfusionSignal(unit.excerpt)), usedText);
  if (trap) {
    fields.trap = admission("trap", trap, "Accepted because the evidence unit explicitly names a confusion or mistake lane.");
    usedText.push(trap.excerpt);
  }

  const transfer = distinctCandidate(cluster.applicationUnits.filter((unit) => sentenceHasApplicationSignal(unit.excerpt)), usedText);
  if (transfer) {
    fields.transfer = admission("transfer", transfer, "Accepted because the evidence unit explicitly applies the concept to a task or context.");
    usedText.push(transfer.excerpt);
  }

  const mnemonic = explicitMnemonic(cluster);
  if (mnemonic && !usedText.some((entry) => overlapRatio(entry, mnemonic.excerpt) >= 0.82)) {
    fields.mnemonic = admission("mnemonic", mnemonic, "Accepted because the source explicitly supplies a memory cue.");
  }

  return fields;
}
