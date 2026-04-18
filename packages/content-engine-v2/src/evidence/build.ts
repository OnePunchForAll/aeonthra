import type {
  EvidenceUnit,
  EvidenceUnitKind,
  RejectionRecord,
  SourceDocument,
  StructuralNode
} from "../contracts/types.ts";
import {
  cleanSentenceCandidates,
  contentProfileScore,
  hasChromeSignal,
  isGenericWrapperLabel,
  isHardNoiseText,
  looksFragmentary,
  sentenceHasAcademicSignal,
  sentenceHasApplicationSignal,
  sentenceHasConfusionSignal,
  sentenceHasContrastSignal,
  sentenceHasDefinitionSignal
} from "../noise/rules.ts";
import { deterministicHash } from "../utils/stable.ts";
import { normalizeForCompare, readableSnippet } from "../utils/text.ts";

function evidenceKindFor(node: StructuralNode): EvidenceUnitKind {
  switch (node.kind) {
    case "structured-title":
      return "title";
    case "structured-due-date":
      return "structured-date";
    case "structured-module":
      return "structured-module";
    case "heading":
      return "heading";
    case "list-item":
      return "list-item";
    case "quote":
      return "quote";
    case "caption":
      return "caption";
    case "excerpt":
      return "excerpt";
    case "definition-term":
    case "definition-detail":
    case "table-cell":
    case "paragraph":
    default:
      return "explanation";
  }
}

function supportScore(text: string, kind: EvidenceUnitKind): number {
  const signals = contentProfileScore(text);
  let score = 10 + signals.academic * 8 - signals.admin * 3;
  if (sentenceHasDefinitionSignal(text)) {
    score += 10;
  }
  if (sentenceHasApplicationSignal(text)) {
    score += 8;
  }
  if (sentenceHasContrastSignal(text) || sentenceHasConfusionSignal(text)) {
    score += 6;
  }
  if (kind === "title" || kind === "heading") {
    score += 3;
  }
  if (kind === "structured-date") {
    score += 12;
  }
  return Math.max(0, score);
}

function rejectNode(node: StructuralNode, code: string, message: string): RejectionRecord {
  return {
    id: `${node.sourceItemId}:${code}:${node.id}`,
    stage: "evidence",
    code,
    message,
    sourceItemId: node.sourceItemId
  };
}

function buildUnit(
  document: SourceDocument,
  node: StructuralNode,
  excerpt: string,
  kindOverride?: EvidenceUnitKind
): EvidenceUnit {
  const kind = kindOverride ?? evidenceKindFor(node);
  const normalizedExcerpt = normalizeForCompare(excerpt);
  return {
    id: `${node.sourceItemId}:${kind}:${deterministicHash({ nodeId: node.id, excerpt: normalizedExcerpt })}`,
    sourceItemId: node.sourceItemId,
    sourceKind: node.sourceKind,
    kind,
    excerpt: readableSnippet(excerpt, 220),
    normalizedExcerpt,
    headingPath: node.headingPath,
    nodeId: node.id,
    sourceField: node.sourceField,
    originSystem: document.classification.originSystem,
    captureModality: document.classification.captureModality,
    contentProfile: document.classification.contentProfile,
    trustTier: node.trustTier,
    supportScore: supportScore(excerpt, kind),
    acceptedReasons: [],
    rejectedReasons: []
  };
}

function isWeakStructuralExcerpt(excerpt: string): boolean {
  return excerpt.length < 120 && (isGenericWrapperLabel(excerpt) || looksFragmentary(excerpt));
}

export function buildEvidenceUnits(
  documents: SourceDocument[],
  nodes: StructuralNode[]
): {
  evidenceUnits: EvidenceUnit[];
  rejections: RejectionRecord[];
} {
  const documentsById = new Map(documents.map((document) => [document.item.id, document]));
  const evidenceUnits: EvidenceUnit[] = [];
  const rejections: RejectionRecord[] = [];

  for (const node of nodes) {
    const document = documentsById.get(node.sourceItemId);
    if (!document) {
      continue;
    }
    const titleRejected = node.kind === "structured-title" && document.classification.titleTrust.state === "rejected";
    const dateRejected = node.kind === "structured-due-date" && document.classification.dateTrust.state === "rejected";
    if (node.trustTier === "rejected" || titleRejected || dateRejected) {
      rejections.push(rejectNode(node, `node-${node.kind}-rejected`, `Rejected ${node.kind} node before evidence admission.`));
      continue;
    }

    if (node.kind === "structured-due-date" || node.kind === "structured-module" || node.kind === "structured-title") {
      const unit = buildUnit(document, node, node.text);
      unit.acceptedReasons.push(`accepted-${unit.kind}`);
      evidenceUnits.push(unit);
      continue;
    }

    const sentences = cleanSentenceCandidates(node.text);
    const excerpts = sentences.length > 0 ? sentences : [node.text];
    for (const excerpt of excerpts) {
      if (isHardNoiseText(excerpt) || hasChromeSignal(excerpt)) {
        rejections.push(rejectNode(node, "sentence-hard-noise", "Rejected sentence because it matches hard-noise or chrome patterns."));
        continue;
      }
      if ((node.kind === "heading" || node.kind === "list-item" || node.kind === "excerpt") && isWeakStructuralExcerpt(excerpt)) {
        rejections.push(rejectNode(node, `${node.kind}-generic-wrapper`, `Rejected ${node.kind} evidence because it is a generic wrapper or fragment.`));
        continue;
      }
      const kindOverride = sentenceHasDefinitionSignal(excerpt) ? "definition" : undefined;
      const unit = buildUnit(document, node, excerpt, kindOverride);
      const hasSentenceSignal =
        sentenceHasDefinitionSignal(excerpt)
        || sentenceHasAcademicSignal(excerpt)
        || sentenceHasApplicationSignal(excerpt)
        || sentenceHasContrastSignal(excerpt)
        || sentenceHasConfusionSignal(excerpt);
      if (
        hasSentenceSignal
      ) {
        unit.acceptedReasons.push("sentence-signal-supported");
      } else if (node.kind === "heading" && unit.trustTier !== "low" && !looksFragmentary(excerpt)) {
        unit.acceptedReasons.push("structural-support");
      } else {
        unit.rejectedReasons.push("sentence-low-signal");
      }
      if (unit.rejectedReasons.length > 0) {
        rejections.push(rejectNode(node, "sentence-low-signal", "Rejected sentence because it lacks trustworthy semantic signal."));
        continue;
      }
      evidenceUnits.push(unit);
    }
  }

  return {
    evidenceUnits,
    rejections
  };
}
