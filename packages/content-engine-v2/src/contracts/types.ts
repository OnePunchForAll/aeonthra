import type {
  AssignmentIntelligence,
  CanonicalArtifact,
  CaptureBundle,
  CaptureItem,
  ConceptRelation,
  FocusTheme,
  LearningConcept,
  LearningSynthesis,
  RetentionModule
} from "@learning/schema";

export type OriginSystem =
  | "canvas-extension"
  | "manual-import"
  | "demo"
  | "textbook-import"
  | "merged";

export type SourceFamilyV2 =
  | "assignment"
  | "discussion"
  | "quiz"
  | "page"
  | "module"
  | "syllabus"
  | "announcement"
  | "textbook-segment"
  | "manual-document"
  | "selection"
  | "unknown";

export type CaptureModality =
  | "structured-field"
  | "html-selector"
  | "cleaned-html"
  | "plain-text-fallback"
  | "imported-pdf"
  | "imported-docx"
  | "imported-text";

export type ContentProfile =
  | "academic"
  | "assignment-prompt"
  | "administrative"
  | "chrome"
  | "reflection-social"
  | "mixed"
  | "unknown";

export type TrustTier = "high" | "medium" | "low" | "rejected";

export type TrustLaneState = {
  state: "accepted" | "degraded" | "rejected";
  score: number;
  reasons: string[];
};

export type SourceClassification = {
  sourceItemId: string;
  sourceKind: CaptureItem["kind"];
  originSystem: OriginSystem;
  sourceFamily: SourceFamilyV2;
  captureModality: CaptureModality;
  contentProfile: ContentProfile;
  trustTier: TrustTier;
  trustScore: number;
  acceptedReasons: string[];
  rejectedReasons: string[];
  titleTrust: TrustLaneState;
  dateTrust: TrustLaneState;
  bodyTrust: TrustLaneState;
  moduleTrust: TrustLaneState;
  assignmentPromptTrust: TrustLaneState;
};

export type SourceDocument = {
  item: CaptureItem;
  classification: SourceClassification;
  cleanedTitle: string;
  cleanedText: string;
  extractedHtmlText: string;
};

export type StructuralNodeKind =
  | "root"
  | "heading"
  | "paragraph"
  | "list-item"
  | "definition-term"
  | "definition-detail"
  | "table-cell"
  | "quote"
  | "caption"
  | "structured-title"
  | "structured-due-date"
  | "structured-module"
  | "excerpt";

export type StructuralNode = {
  id: string;
  sourceItemId: string;
  sourceKind: CaptureItem["kind"];
  kind: StructuralNodeKind;
  tagName: string | null;
  text: string;
  ordinalPath: number[];
  headingPath: string[];
  parentId: string | null;
  listDepth: number;
  tableCoords?: { row: number; column: number };
  sourceField?: string;
  trustTier: TrustTier;
};

export type EvidenceUnitKind =
  | "definition"
  | "explanation"
  | "heading"
  | "title"
  | "list-item"
  | "quote"
  | "caption"
  | "assignment-prompt"
  | "assignment-requirement"
  | "structured-date"
  | "structured-module"
  | "excerpt";

export type EvidenceUnit = {
  id: string;
  sourceItemId: string;
  sourceKind: CaptureItem["kind"];
  kind: EvidenceUnitKind;
  excerpt: string;
  normalizedExcerpt: string;
  headingPath: string[];
  nodeId: string | null;
  sourceField?: string;
  originSystem: OriginSystem;
  captureModality: CaptureModality;
  contentProfile: ContentProfile;
  trustTier: TrustTier;
  supportScore: number;
  acceptedReasons: string[];
  rejectedReasons: string[];
};

export type CandidateRecord = {
  id: string;
  label: string;
  normalizedLabel: string;
  signature: string;
  score: number;
  sourceItemIds: string[];
  evidenceIds: string[];
  acceptanceReasons: string[];
  rejectionReasons: string[];
};

export type VisibleFieldId =
  | "definition"
  | "summary"
  | "primer"
  | "distinction"
  | "hook"
  | "trap"
  | "transfer"
  | "mnemonic";

export type FieldAdmission = {
  fieldId: VisibleFieldId;
  text: string;
  evidenceIds: string[];
  supportScore: number;
  acceptanceReason: string;
  rejectionReason?: string;
};

export type ConceptV2 = {
  id: string;
  label: string;
  score: number;
  keywords: string[];
  sourceItemIds: string[];
  evidenceIds: string[];
  fieldAdmissions: Partial<Record<VisibleFieldId, FieldAdmission>>;
  relationIds: string[];
  admissionReasons: string[];
  rejectionReasons: string[];
};

export type RelationTypeV2 = "supports" | "contrasts" | "extends" | "applies";

export type RelationV2 = {
  id: string;
  fromId: string;
  toId: string;
  type: RelationTypeV2;
  label: string;
  supportScore: number;
  evidenceIds: string[];
  acceptanceReason: string;
};

export type AssignmentSignalV2 = {
  id: string;
  sourceItemId: string;
  sourceKind: CaptureItem["kind"];
  title: string;
  titleTrust: TrustLaneState;
  dueAt: string | null;
  dueTrust: TrustLaneState;
  conceptIds: string[];
  requirementLines: string[];
  evidenceIds: string[];
  readinessEligible: boolean;
  acceptanceReasons: string[];
  rejectionReasons: string[];
};

export type FocusThemeV2 = {
  id: string;
  label: string;
  summary: string;
  conceptIds: string[];
  evidenceIds: string[];
  score: number;
};

export type ReadinessV2 = {
  id: string;
  sourceItemId: string;
  title: string;
  conceptIds: string[];
  evidenceIds: string[];
  checklist: string[];
  ready: boolean;
  acceptanceReasons: string[];
  rejectionReasons: string[];
};

export type RejectionRecord = {
  id: string;
  stage: string;
  code: string;
  message: string;
  sourceItemId?: string;
  evidenceId?: string;
  candidateId?: string;
  fieldId?: VisibleFieldId;
};

export type EngineV2Result = {
  bundleTitle: string;
  generatedAt: string;
  classifications: SourceClassification[];
  documents: SourceDocument[];
  nodes: StructuralNode[];
  evidenceUnits: EvidenceUnit[];
  concepts: ConceptV2[];
  relations: RelationV2[];
  assignments: AssignmentSignalV2[];
  focusThemes: FocusThemeV2[];
  readiness: ReadinessV2[];
  rejections: RejectionRecord[];
  canonicalArtifact: CanonicalArtifact;
  synthesisHash: string;
  deterministicHash: string;
};

export type LegacyProjection = {
  concepts: LearningConcept[];
  relations: ConceptRelation[];
  synthesis: LearningSynthesis;
  focusThemes: FocusTheme[];
  assignmentIntel: AssignmentIntelligence[];
  retentionModules: RetentionModule[];
  debug: {
    conceptCount: number;
    rejectionCount: number;
    synthesisHash: string;
    deterministicHash: string;
  };
};

export type BenchmarkConceptSurface = {
  label: string;
  conceptId: string;
  visibleFields: Partial<Record<VisibleFieldId, string>>;
  evidenceCount: number;
  provenanceComplete: boolean;
};

export type BenchmarkAssignmentSurface = {
  sourceItemId: string;
  title: string;
  titleAccepted: boolean;
  dueState: "trusted" | "unknown";
  readinessEligible: boolean;
  conceptIds: string[];
};

export type BenchmarkRelationSurface = {
  fromLabel: string;
  toLabel: string;
  type: RelationTypeV2;
  evidenceCount: number;
};

export type BenchmarkSurface = {
  engineId: "v1" | "v2";
  deterministicHash: string;
  concepts: BenchmarkConceptSurface[];
  assignments: BenchmarkAssignmentSurface[];
  relations: BenchmarkRelationSurface[];
  rejectionCodes: string[];
  moduleTitles?: string[];
  skillLabels?: string[];
  checklistLines?: string[];
  shellAssignmentTitles?: string[];
};

export type BenchmarkFixtureExpectation = {
  fixtureId: string;
  summary: string;
  expectedConceptLabels: string[];
  suppressedLabels: string[];
  expectedModuleTitles?: string[];
  suppressedModuleTitles?: string[];
  expectedSkillLabelPrefixes?: string[];
  suppressedSkillLabelPrefixes?: string[];
  suppressedChecklistFragments?: string[];
  expectedRelationPairs: Array<{ from: string; to: string; type: RelationTypeV2 }>;
  expectedAssignmentTitles: string[];
  suppressedAssignmentTitles: string[];
  expectedUnknownDueTitles: string[];
  readinessTitles: string[];
  maxVisibleConcepts?: number;
  hardNoiseOnly?: boolean;
};

export type BenchmarkFixture = {
  bundle: CaptureBundle;
  expectation: BenchmarkFixtureExpectation;
};

export type BenchmarkMetricScore = {
  id: string;
  score: number;
  maxScore: number;
  notes: string[];
};

export type BenchmarkFixtureScore = {
  fixtureId: string;
  metrics: BenchmarkMetricScore[];
  totalScore: number;
  maxScore: number;
};

export type BenchmarkEngineReport = {
  engineId: "v1" | "v2";
  overallScore: number;
  maxScore: number;
  metrics: Record<string, { score: number; maxScore: number }>;
  fixtures: BenchmarkFixtureScore[];
  deterministicHashes: string[];
};

export type BenchmarkComparisonReport = {
  fixtures: BenchmarkFixtureExpectation[];
  v1: BenchmarkEngineReport;
  v2: BenchmarkEngineReport;
  delta: number;
  repeatedRunStable: boolean;
};
