import type { CanonicalArtifact, CanonicalChangeKind } from "@learning/schema";

export function classifyCanonicalChange(
  left: CanonicalArtifact,
  right: CanonicalArtifact
): CanonicalChangeKind {
  if (
    left.semanticHash === right.semanticHash
    && left.structuralHash === right.structuralHash
    && left.provenanceHash === right.provenanceHash
  ) {
    return "IDENTICAL";
  }
  if (
    left.semanticHash === right.semanticHash
    && left.structuralHash === right.structuralHash
    && left.provenanceHash !== right.provenanceHash
  ) {
    return "PROVENANCE_ONLY";
  }
  if (
    left.semanticHash === right.semanticHash
    && left.structuralHash !== right.structuralHash
  ) {
    return "COSMETIC_EDIT";
  }
  if (left.semanticHash !== right.semanticHash) {
    return "SEMANTIC_EDIT";
  }
  return "AMBIGUOUS";
}
