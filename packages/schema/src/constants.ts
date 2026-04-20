export const SCHEMA_VERSION = "0.3.0";
export const BRIDGE_SOURCE = "learning-freedom-bridge" as const;

export const captureItemKinds = [
  "selection",
  "page",
  "article",
  "assignment",
  "discussion",
  "quiz",
  "announcement",
  "file",
  "syllabus",
  "module",
  "document"
] as const;

export const resourceKinds = [
  "link",
  "video",
  "file",
  "page",
  "unknown"
] as const;

export const engineIds = [
  "neural-forge",
  "signal-garden",
  "thread-atlas",
  "mirror-harbor"
] as const;

export const phaseIds = [
  "genesis",
  "forge",
  "crucible",
  "architect",
  "transcend"
] as const;

export const relationTypes = [
  "supports",
  "contrasts",
  "extends",
  "applies"
] as const;

export const conceptFieldIds = [
  "definition",
  "summary",
  "primer",
  "mnemonic",
  "commonConfusion",
  "transferHook"
] as const;

export const neuralForgePhaseIds = [
  "immerse",
  "decode",
  "contrast",
  "transfer",
  "recover"
] as const;

export const sourceFamilies = [
  "canvas",
  "textbook",
  "mixed",
  "other"
] as const;

export const captureTitleSources = [
  "structured",
  "dom",
  "inferred"
] as const;

export const captureStrategies = [
  "api-only",
  "html-fetch",
  "session-dom",
  "manual-import",
  "demo-seed",
  "document-import"
] as const;

export const provenanceKinds = [
  "FIRST_PARTY_API",
  "HTML_FETCH",
  "DOM_CAPTURE",
  "DOCUMENT_INGEST",
  "USER_GENERATED",
  "DEMO_SEED"
] as const;

export const canonicalChangeKinds = [
  "IDENTICAL",
  "PROVENANCE_ONLY",
  "COSMETIC_EDIT",
  "SEMANTIC_EDIT",
  "AMBIGUOUS"
] as const;

export const evidenceOrigins = [
  "source-block",
  "item-excerpt",
  "structured-field"
] as const;

export const evidenceTypes = [
  "heading",
  "paragraph",
  "list-item",
  "definition",
  "summary",
  "prompt",
  "structured-title",
  "structured-due-date",
  "structured-module",
  "textbook-segment"
] as const;

export const trustLaneStates = [
  "accepted",
  "degraded",
  "rejected"
] as const;

export const retentionModuleKinds = [
  "concept-ladder",
  "distinction-drill",
  "corruption-detection",
  "teach-back",
  "transfer-scenario",
  "confidence-reflection",
  "review-queue"
] as const;

export const challengeLevels = [
  "orient",
  "build",
  "stress",
  "design",
  "transcend"
] as const;

export type PhaseId = (typeof phaseIds)[number];
export type EngineId = (typeof engineIds)[number];
export type RelationType = (typeof relationTypes)[number];
export type NeuralForgePhaseId = (typeof neuralForgePhaseIds)[number];
export type SourceFamily = (typeof sourceFamilies)[number];
export type CaptureStrategy = (typeof captureStrategies)[number];
export type ProvenanceKind = (typeof provenanceKinds)[number];
export type CanonicalChangeKind = (typeof canonicalChangeKinds)[number];
export type RetentionModuleKind = (typeof retentionModuleKinds)[number];
