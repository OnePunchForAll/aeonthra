import { z } from "zod";
import {
  captureItemKinds,
  captureStrategies,
  challengeLevels,
  engineIds,
  evidenceOrigins,
  evidenceTypes,
  neuralForgePhaseIds,
  phaseIds,
  provenanceKinds,
  relationTypes,
  retentionModuleKinds,
  sourceFamilies,
  trustLaneStates,
  type CanonicalChangeKind,
  type RetentionModuleKind
} from "./constants.ts";
import { CaptureBundleSchema } from "./capture.ts";

export const EvidenceFragmentSchema = z.object({
  label: z.string(),
  excerpt: z.string(),
  sourceItemId: z.string(),
  sourceKind: z.enum(captureItemKinds),
  sourceOrigin: z.enum(evidenceOrigins),
  sourceType: z.enum(evidenceTypes),
  sourceField: z.string().optional(),
  evidenceScore: z.number().nonnegative(),
  passReason: z.string()
});

export const TrustLaneStateSchema = z.object({
  state: z.enum(trustLaneStates),
  score: z.number(),
  reasons: z.array(z.string()).default([])
});

const ConceptFieldSupportSchema = z.object({
  quality: z.enum(["strong", "supported", "weak"]),
  supportScore: z.number().nonnegative(),
  passReason: z.string(),
  evidence: z.array(EvidenceFragmentSchema).default([])
});

export const LearningConceptSchema = z.object({
  id: z.string(),
  label: z.string(),
  score: z.number(),
  summary: z.string(),
  primer: z.string(),
  mnemonic: z.string(),
  excerpt: z.string(),
  definition: z.string(),
  stakes: z.string(),
  commonConfusion: z.string(),
  transferHook: z.string(),
  category: z.string().optional(),
  keywords: z.array(z.string()).default([]),
  sourceItemIds: z.array(z.string()),
  relatedConceptIds: z.array(z.string()),
  fieldSupport: z.object({
    definition: ConceptFieldSupportSchema.optional(),
    summary: ConceptFieldSupportSchema.optional(),
    primer: ConceptFieldSupportSchema.optional(),
    mnemonic: ConceptFieldSupportSchema.optional(),
    commonConfusion: ConceptFieldSupportSchema.optional(),
    transferHook: ConceptFieldSupportSchema.optional()
  }).optional()
});

export const ConceptRelationSchema = z.object({
  fromId: z.string(),
  toId: z.string(),
  type: z.enum(relationTypes),
  label: z.string(),
  strength: z.number(),
  evidence: z.array(EvidenceFragmentSchema).default([]).optional()
});

export const EngineProfileSchema = z.object({
  id: z.enum(engineIds),
  title: z.string(),
  thesis: z.string(),
  signature: z.string(),
  contribution: z.string(),
  moves: z.array(z.string())
});

export const PhaseSubmodeSchema = z.object({
  id: z.string(),
  title: z.string(),
  engineIds: z.array(z.enum(engineIds)).min(1),
  durationMinutes: z.number().int().nonnegative(),
  challengeLevel: z.enum(challengeLevels),
  objective: z.string(),
  setup: z.string(),
  prompt: z.string(),
  tasks: z.array(z.string()).min(2),
  reflection: z.string(),
  conceptIds: z.array(z.string()).default([]),
  evidence: z.array(EvidenceFragmentSchema).default([])
});

export const MegaPhaseSchema = z.object({
  id: z.enum(phaseIds),
  title: z.string(),
  tagline: z.string(),
  summary: z.string(),
  totalMinutes: z.number().int().nonnegative(),
  winCondition: z.string(),
  conceptIds: z.array(z.string()).default([]),
  submodes: z.array(PhaseSubmodeSchema).length(4)
});

export const LearningProtocolSchema = z.object({
  totalMinutes: z.number().int().nonnegative(),
  phases: z.array(MegaPhaseSchema).length(5)
});

export const NeuralForgeCardSchema = z.object({
  id: z.string(),
  title: z.string(),
  focus: z.string(),
  summary: z.string(),
  prompt: z.string(),
  supportLine: z.string(),
  actions: z.array(z.string()).min(1),
  conceptIds: z.array(z.string()).default([]),
  evidence: z.array(EvidenceFragmentSchema).default([])
});

export const NeuralForgePhaseSchema = z.object({
  id: z.enum(neuralForgePhaseIds),
  title: z.string(),
  tagline: z.string(),
  purpose: z.string(),
  durationMinutes: z.number().int().nonnegative(),
  ambientLines: z.array(z.string()).default([]),
  cards: z.array(NeuralForgeCardSchema).default([])
});

export const NeuralForgeSchema = z.object({
  totalMinutes: z.number().int().nonnegative(),
  atmosphere: z.string(),
  ambientPrimers: z.array(z.string()).default([]),
  phases: z.array(NeuralForgePhaseSchema).length(5)
});

export const SourceCoverageSchema = z.object({
  canvasItemCount: z.number().int().nonnegative(),
  textbookItemCount: z.number().int().nonnegative(),
  assignmentCount: z.number().int().nonnegative(),
  discussionCount: z.number().int().nonnegative(),
  quizCount: z.number().int().nonnegative(),
  pageCount: z.number().int().nonnegative(),
  moduleCount: z.number().int().nonnegative(),
  documentCount: z.number().int().nonnegative()
});

export const FocusThemeSchema = z.object({
  id: z.string(),
  label: z.string(),
  score: z.number(),
  summary: z.string(),
  verbs: z.array(z.string()).default([]),
  sourceFamily: z.enum(sourceFamilies),
  conceptIds: z.array(z.string()).default([]),
  sourceItemIds: z.array(z.string()).default([]),
  assignmentItemIds: z.array(z.string()).default([]),
  evidence: z.array(EvidenceFragmentSchema).min(1)
});

export const AssignmentIntelligenceSchema = z.object({
  id: z.string(),
  sourceItemId: z.string(),
  title: z.string(),
  kind: z.enum(captureItemKinds),
  url: z.string().url(),
  summary: z.string(),
  dueAt: z.string().datetime().nullable().default(null),
  dueTrust: TrustLaneStateSchema.default({
    state: "rejected",
    score: 0,
    reasons: []
  }),
  likelySkills: z.array(z.string()).default([]),
  conceptIds: z.array(z.string()).default([]),
  focusThemeIds: z.array(z.string()).default([]),
  readinessEligible: z.boolean().default(false),
  readinessAcceptanceReasons: z.array(z.string()).default([]),
  readinessRejectionReasons: z.array(z.string()).default([]),
  likelyPitfalls: z.array(z.string()).default([]),
  checklist: z.array(z.string()).default([]),
  evidence: z.array(EvidenceFragmentSchema).min(1)
});

export const AssignmentReadinessSchema = z.object({
  id: z.string(),
  sourceItemId: z.string(),
  title: z.string(),
  conceptIds: z.array(z.string()).default([]),
  checklist: z.array(z.string()).default([]),
  evidence: z.array(EvidenceFragmentSchema).default([]),
  ready: z.boolean(),
  acceptanceReasons: z.array(z.string()).default([]),
  rejectionReasons: z.array(z.string()).default([])
});

export const RetentionModuleSchema = z.object({
  id: z.string(),
  kind: z.enum(retentionModuleKinds),
  title: z.string(),
  summary: z.string(),
  conceptIds: z.array(z.string()).default([]),
  prompts: z.array(z.string()).min(1),
  evidence: z.array(EvidenceFragmentSchema).min(1)
});

export const CanonicalArtifactItemSchema = z.object({
  sourceItemId: z.string(),
  title: z.string(),
  canonicalUrl: z.string().url(),
  contentHash: z.string(),
  semanticHash: z.string(),
  structuralHash: z.string(),
  provenanceHash: z.string(),
  semanticUnitCount: z.number().int().nonnegative(),
  structuralUnitCount: z.number().int().nonnegative(),
  captureStrategy: z.enum(captureStrategies).optional(),
  provenanceKind: z.enum(provenanceKinds).optional(),
  sourceHost: z.string().optional()
});

export const CanonicalArtifactSchema = z.object({
  version: z.literal("osme-zero-hybrid-v1"),
  semanticHash: z.string(),
  structuralHash: z.string(),
  provenanceHash: z.string(),
  sourceItemCount: z.number().int().nonnegative(),
  semanticUnitCount: z.number().int().nonnegative(),
  structuralUnitCount: z.number().int().nonnegative(),
  provenanceCoverage: z.object({
    withExplicitProvenance: z.number().int().nonnegative(),
    missingExplicitProvenance: z.number().int().nonnegative()
  }),
  preview: z.array(z.string()).default([]),
  items: z.array(CanonicalArtifactItemSchema).default([])
});

export const LearningSynthesisSchema = z.object({
  pipelineStages: z.array(z.string()).min(1),
  sourceCoverage: SourceCoverageSchema,
  stableConceptIds: z.array(z.string()).default([]),
  likelyAssessedSkills: z.array(z.string()).default([]),
  focusThemes: z.array(FocusThemeSchema).default([]),
  assignmentMappings: z.array(AssignmentIntelligenceSchema).default([]),
  assignmentReadiness: z.array(AssignmentReadinessSchema).default([]),
  retentionModules: z.array(RetentionModuleSchema).default([]),
  deterministicHash: z.string(),
  synthesisHash: z.string().optional(),
  canonicalArtifact: CanonicalArtifactSchema.optional(),
  qualityBanner: z.string().default(""),
  qualityWarnings: z.array(z.string()).default([]),
  synthesisMode: z.enum(["full", "degraded", "blocked-with-warning"]).default("full")
});

export const LearningBundleSchema = z.object({
  schemaVersion: z.string(),
  generatedAt: z.string(),
  sourceBundleTitle: z.string(),
  concepts: z.array(LearningConceptSchema),
  relations: z.array(ConceptRelationSchema).default([]),
  engineProfiles: z.array(EngineProfileSchema).length(4),
  protocol: LearningProtocolSchema,
  neuralForge: NeuralForgeSchema,
  synthesis: LearningSynthesisSchema
});

export const AppProgressSchema = z.object({
  conceptMastery: z.record(z.number()).default({}),
  chapterCompletion: z.record(z.number()).default({}),
  goalCompletion: z.record(z.boolean()).default({}),
  skillHistory: z.record(z.boolean()).default({}),
  practiceMode: z.boolean().default(false)
});

export const OfflineSiteBundleSchema = z.object({
  schemaVersion: z.string(),
  exportedAt: z.string(),
  title: z.string(),
  canvasBundle: CaptureBundleSchema,
  textbookBundle: CaptureBundleSchema,
  mergedBundle: CaptureBundleSchema,
  learningBundle: LearningBundleSchema,
  progress: AppProgressSchema,
  notes: z.string().default(""),
  deterministicHash: z.string()
});

export type LearningBundle = z.infer<typeof LearningBundleSchema>;
export type LearningConcept = z.infer<typeof LearningConceptSchema>;
export type ConceptRelation = z.infer<typeof ConceptRelationSchema>;
export type EngineProfile = z.infer<typeof EngineProfileSchema>;
export type EvidenceFragment = z.infer<typeof EvidenceFragmentSchema>;
export type TrustLaneState = z.infer<typeof TrustLaneStateSchema>;
export type MegaPhase = z.infer<typeof MegaPhaseSchema>;
export type PhaseSubmode = z.infer<typeof PhaseSubmodeSchema>;
export type NeuralForge = z.infer<typeof NeuralForgeSchema>;
export type NeuralForgePhase = z.infer<typeof NeuralForgePhaseSchema>;
export type NeuralForgeCard = z.infer<typeof NeuralForgeCardSchema>;
export type SourceCoverage = z.infer<typeof SourceCoverageSchema>;
export type FocusTheme = z.infer<typeof FocusThemeSchema>;
export type AssignmentIntelligence = z.infer<typeof AssignmentIntelligenceSchema>;
export type AssignmentReadiness = z.infer<typeof AssignmentReadinessSchema>;
export type RetentionModule = z.infer<typeof RetentionModuleSchema>;
export type LearningSynthesis = z.infer<typeof LearningSynthesisSchema>;
export type AppProgress = z.infer<typeof AppProgressSchema>;
export type OfflineSiteBundle = z.infer<typeof OfflineSiteBundleSchema>;
export type CanonicalArtifact = z.infer<typeof CanonicalArtifactSchema>;
export type CanonicalArtifactItem = z.infer<typeof CanonicalArtifactItemSchema>;
export type { CanonicalChangeKind, RetentionModuleKind };
