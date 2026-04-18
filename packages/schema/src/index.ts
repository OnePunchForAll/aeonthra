import { z } from "zod";

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

export const CaptureResourceSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string().url(),
  kind: z.enum(resourceKinds),
  sourceItemId: z.string()
});

export const CaptureItemSchema = z.object({
  id: z.string(),
  kind: z.enum(captureItemKinds),
  title: z.string(),
  titleSource: z.enum(captureTitleSources).default("inferred"),
  canonicalUrl: z.string().url(),
  plainText: z.string(),
  excerpt: z.string(),
  html: z.string().optional(),
  headingTrail: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  dueAt: z.string().datetime().optional(),
  unlockAt: z.string().datetime().optional(),
  lockAt: z.string().datetime().optional(),
  pointsPossible: z.number().nonnegative().optional(),
  questionCount: z.number().int().nonnegative().optional(),
  submissionTypes: z.array(z.string()).default([]),
  moduleName: z.string().optional(),
  moduleKey: z.string().optional(),
  capturedAt: z.string(),
  contentHash: z.string()
});

export const CaptureBundleSchema = z.object({
  schemaVersion: z.string(),
  source: z.enum(["extension-capture", "manual-import", "demo"]),
  title: z.string(),
  capturedAt: z.string(),
  items: z.array(CaptureItemSchema),
  resources: z.array(CaptureResourceSchema),
  manifest: z.object({
    itemCount: z.number().int().nonnegative(),
    resourceCount: z.number().int().nonnegative(),
    captureKinds: z.array(z.enum(captureItemKinds)),
    sourceUrls: z.array(z.string().url())
  }),
  captureMeta: z.object({
    mode: z.enum(["complete", "learning"]).optional(),
    courseId: z.string().optional(),
    courseName: z.string().optional(),
    sourceHost: z.string().optional(),
    stats: z.object({
      totalItemsVisited: z.number().int().nonnegative(),
      totalItemsCaptured: z.number().int().nonnegative(),
      totalItemsSkipped: z.number().int().nonnegative(),
      totalItemsFailed: z.number().int().nonnegative(),
      durationMs: z.number().int().nonnegative(),
      sizeBytes: z.number().int().nonnegative()
    }).optional(),
    warnings: z.array(
      z.object({
        url: z.string(),
        message: z.string()
      })
    ).optional(),
    rawHtmlArchive: z.record(z.string()).optional()
  }).optional()
});

export const canvasCourseKnowledgePackIssueCodes = [
  "invalid-bundle",
  "wrong-source",
  "empty-bundle",
  "textbook-only",
  "missing-course-id",
  "missing-source-host",
  "missing-course-url",
  "ambiguous-course-identity",
  "host-mismatch",
  "course-identity-mismatch"
] as const;

type SchemaCaptureItem = z.infer<typeof CaptureItemSchema>;
type SchemaCaptureBundle = z.infer<typeof CaptureBundleSchema>;

export type CanvasCourseKnowledgePackIssueCode =
  (typeof canvasCourseKnowledgePackIssueCodes)[number];

export type CanvasCourseIdentityCandidate = {
  courseId: string;
  sourceHost: string;
  url: string;
};

export type CanvasCourseKnowledgePackTrace = {
  parsed: boolean;
  code: CanvasCourseKnowledgePackIssueCode | null;
  bundle: SchemaCaptureBundle | null;
  totalItemCount: number;
  canvasItemCount: number;
  textbookItemCount: number;
  expectedCourseId: string;
  expectedSourceHost: string;
  identityCandidates: CanvasCourseIdentityCandidate[];
  distinctIdentities: Array<{ courseId: string; sourceHost: string }>;
};

export type CanvasCourseKnowledgePackInspection =
  | {
      ok: true;
      bundle: SchemaCaptureBundle;
      canvasItemCount: number;
      courseId: string;
      sourceHost: string;
    }
  | {
      ok: false;
      code: CanvasCourseKnowledgePackIssueCode;
      bundle: SchemaCaptureBundle | null;
    };

export function isTextbookCaptureItem(item: SchemaCaptureItem): boolean {
  return (item.tags ?? []).includes("textbook");
}

function normalizeCourseIdPart(value: string | undefined): string {
  const trimmed = (value ?? "").trim();
  if (!trimmed) {
    return "";
  }

  const urlMatch = trimmed.match(/\/courses\/([^/?#]+)/i);
  if (urlMatch?.[1]) {
    return urlMatch[1].trim().toLowerCase();
  }

  const numericTailMatch = trimmed.match(/(?:^course[-:_/]?)?(\d+)$/i);
  if (numericTailMatch?.[1]) {
    return numericTailMatch[1];
  }

  return trimmed.toLowerCase().replace(/^course[-:_]?/i, "");
}

function normalizeSourceHostPart(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function parseCanvasCourseIdentityFromUrl(
  value: string
): { courseId: string; sourceHost: string } | null {
  try {
    const url = new URL(value);
    const match = url.pathname.match(/\/courses\/([^/?#]+)/i);
    const courseId = normalizeCourseIdPart(match?.[1]);
    const sourceHost = normalizeSourceHostPart(url.host);
    if (!courseId || !sourceHost) {
      return null;
    }
    return {
      courseId,
      sourceHost
    };
  } catch {
    return null;
  }
}

function collectCanvasCourseIdentityCandidates(
  bundle: SchemaCaptureBundle
): CanvasCourseIdentityCandidate[] {
  const itemUrls = bundle.items
    .filter((item) => !isTextbookCaptureItem(item))
    .map((item) => item.canonicalUrl);
  const manifestUrls = bundle.manifest.sourceUrls;
  const candidates = [...itemUrls, ...manifestUrls]
    .map((value) => {
      const parsed = parseCanvasCourseIdentityFromUrl(value);
      return parsed
        ? {
            ...parsed,
            url: value
          }
        : null;
    })
    .filter((value): value is CanvasCourseIdentityCandidate => value !== null);

  return Array.from(
    new Map(
      candidates.map((candidate) => [
        `${candidate.sourceHost}::${candidate.courseId}::${candidate.url}`,
        candidate
      ])
    ).values()
  );
}

function distinctCanvasCourseIdentities(
  candidates: CanvasCourseIdentityCandidate[]
): Array<{ courseId: string; sourceHost: string }> {
  return Array.from(
    new Map(
      candidates.map((candidate) => [
        `${candidate.sourceHost}::${candidate.courseId}`,
        {
          courseId: candidate.courseId,
          sourceHost: candidate.sourceHost
        }
      ])
    ).values()
  );
}

function traceParsedCanvasCourseKnowledgePack(
  bundle: SchemaCaptureBundle
): CanvasCourseKnowledgePackTrace {
  const totalItemCount = bundle.items.length;
  const canvasItemCount = bundle.items.filter(
    (item) => !isTextbookCaptureItem(item)
  ).length;
  const textbookItemCount = totalItemCount - canvasItemCount;
  const expectedCourseId = normalizeCourseIdPart(bundle.captureMeta?.courseId);
  const expectedSourceHost = normalizeSourceHostPart(bundle.captureMeta?.sourceHost);
  const identityCandidates = collectCanvasCourseIdentityCandidates(bundle);
  const distinctIdentities = distinctCanvasCourseIdentities(identityCandidates);

  let code: CanvasCourseKnowledgePackIssueCode | null = null;
  if (bundle.source !== "extension-capture") {
    code = "wrong-source";
  } else if (totalItemCount === 0) {
    code = "empty-bundle";
  } else if (canvasItemCount === 0) {
    code = "textbook-only";
  } else if (!expectedCourseId) {
    code = "missing-course-id";
  } else if (!expectedSourceHost) {
    code = "missing-source-host";
  } else if (identityCandidates.length === 0) {
    code = "missing-course-url";
  } else if (distinctIdentities.length > 1) {
    code = "ambiguous-course-identity";
  } else {
    const [resolvedIdentity] = distinctIdentities;
    if (!resolvedIdentity || resolvedIdentity.sourceHost !== expectedSourceHost) {
      code = "host-mismatch";
    } else if (resolvedIdentity.courseId !== expectedCourseId) {
      code = "course-identity-mismatch";
    }
  }

  return {
    parsed: true,
    code,
    bundle,
    totalItemCount,
    canvasItemCount,
    textbookItemCount,
    expectedCourseId,
    expectedSourceHost,
    identityCandidates,
    distinctIdentities
  };
}

function inspectParsedCanvasCourseKnowledgePack(
  bundle: SchemaCaptureBundle
): CanvasCourseKnowledgePackInspection {
  const trace = traceParsedCanvasCourseKnowledgePack(bundle);
  if (trace.code) {
    return {
      ok: false,
      code: trace.code,
      bundle
    };
  }

  return {
    ok: true,
    bundle,
    canvasItemCount: trace.canvasItemCount,
    courseId: trace.expectedCourseId,
    sourceHost: trace.expectedSourceHost
  };
}

export function inspectCanvasCourseKnowledgePack(
  input: unknown
): CanvasCourseKnowledgePackInspection {
  const parsed = CaptureBundleSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "invalid-bundle",
      bundle: null
    };
  }

  return inspectParsedCanvasCourseKnowledgePack(parsed.data);
}

export function traceCanvasCourseKnowledgePack(
  input: unknown
): CanvasCourseKnowledgePackTrace {
  const parsed = CaptureBundleSchema.safeParse(input);
  if (!parsed.success) {
    return {
      parsed: false,
      code: "invalid-bundle",
      bundle: null,
      totalItemCount: 0,
      canvasItemCount: 0,
      textbookItemCount: 0,
      expectedCourseId: "",
      expectedSourceHost: "",
      identityCandidates: [],
      distinctIdentities: []
    };
  }

  return traceParsedCanvasCourseKnowledgePack(parsed.data);
}

export function isCanvasCourseKnowledgePack(
  input: unknown
): input is SchemaCaptureBundle {
  return inspectCanvasCourseKnowledgePack(input).ok;
}

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

export const CourseKnowledgePackSchema = CaptureBundleSchema.refine(
  (bundle) => inspectParsedCanvasCourseKnowledgePack(bundle).ok,
  {
    message: "Bridge packs must be importable Canvas extension captures."
  }
);

export const BridgeHandoffEnvelopeSchema = z.object({
  handoffId: z.string().min(1),
  packId: z.string().min(1),
  queuedAt: z.string().datetime(),
  courseId: z.string(),
  sourceHost: z.string(),
  pack: CaptureBundleSchema
}).superRefine((value, context) => {
  const packId = captureBundleId(value.pack);
  const packCourseId = normalizeCourseIdPart(value.pack.captureMeta?.courseId);
  const packSourceHost = normalizeSourceHostPart(value.pack.captureMeta?.sourceHost);
  const envelopeCourseId = normalizeCourseIdPart(value.courseId);
  const envelopeSourceHost = normalizeSourceHostPart(value.sourceHost);
  if (value.packId !== packId) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Bridge handoff envelope metadata must match the queued pack."
    });
    return;
  }

  if (
    (packCourseId && envelopeCourseId !== packCourseId) ||
    (packSourceHost && envelopeSourceHost !== packSourceHost)
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Bridge handoff envelope metadata must match the queued pack."
    });
  }
});

export const PendingBridgeHandoffQueueSchema = z.array(BridgeHandoffEnvelopeSchema);

const BridgeEnvelopeSchema = z.object({
  source: z.literal(BRIDGE_SOURCE)
});

export const NFPackReadyMessageSchema = BridgeEnvelopeSchema.extend({
  type: z.literal("NF_PACK_READY"),
  requestId: z.string().min(1),
  handoffId: z.string().min(1),
  packId: z.string().min(1),
  pack: CourseKnowledgePackSchema
});

export const NFPackAckMessageSchema = BridgeEnvelopeSchema.extend({
  type: z.literal("NF_PACK_ACK"),
  requestId: z.string().min(1),
  handoffId: z.string().min(1),
  packId: z.string()
});

export const NFImportRequestMessageSchema = BridgeEnvelopeSchema.extend({
  type: z.literal("NF_IMPORT_REQUEST"),
  requestId: z.string().min(1)
});

export const NFImportResultMessageSchema = BridgeEnvelopeSchema.extend({
  type: z.literal("NF_IMPORT_RESULT"),
  requestId: z.string().min(1),
  success: z.boolean(),
  handoffId: z.string().optional(),
  packId: z.string().optional(),
  error: z.string().optional()
});

export const NFPingMessageSchema = BridgeEnvelopeSchema.extend({
  type: z.literal("NF_PING")
});

export const NFPongMessageSchema = BridgeEnvelopeSchema.extend({
  type: z.literal("NF_PONG")
});

export const BridgeMessageSchema = z.discriminatedUnion("type", [
  NFPackReadyMessageSchema,
  NFPackAckMessageSchema,
  NFImportRequestMessageSchema,
  NFImportResultMessageSchema,
  NFPingMessageSchema,
  NFPongMessageSchema
]);

export type CaptureBundle = z.infer<typeof CaptureBundleSchema>;
export type CaptureItem = z.infer<typeof CaptureItemSchema>;
export type CaptureResource = z.infer<typeof CaptureResourceSchema>;
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
export type PhaseId = (typeof phaseIds)[number];
export type EngineId = (typeof engineIds)[number];
export type RelationType = (typeof relationTypes)[number];
export type NeuralForgePhaseId = (typeof neuralForgePhaseIds)[number];
export type SourceFamily = (typeof sourceFamilies)[number];
export type RetentionModuleKind = (typeof retentionModuleKinds)[number];
export type CourseKnowledgePack = z.infer<typeof CourseKnowledgePackSchema>;
export type BridgeHandoffEnvelope = z.infer<typeof BridgeHandoffEnvelopeSchema>;
export type PendingBridgeHandoffQueue = z.infer<typeof PendingBridgeHandoffQueueSchema>;
export type BridgeMessage = z.infer<typeof BridgeMessageSchema>;

export function stableHash(input: string): string {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `h${(hash >>> 0).toString(16)}`;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function captureBundleId(bundle: CaptureBundle): string {
  return stableHash(
    JSON.stringify({
      title: bundle.title,
      capturedAt: bundle.capturedAt,
      items: bundle.items.map((item) => item.id),
      resources: bundle.resources.map((resource) => resource.id)
    })
  );
}

export function createBridgeHandoffEnvelope(
  pack: CaptureBundle,
  queuedAt = new Date().toISOString()
): BridgeHandoffEnvelope {
  const packId = captureBundleId(pack);
  return {
    handoffId: stableHash(`handoff:${packId}:${queuedAt}`),
    packId,
    queuedAt,
    courseId: normalizeCourseIdPart(pack.captureMeta?.courseId),
    sourceHost: normalizeSourceHostPart(pack.captureMeta?.sourceHost),
    pack
  };
}

export function createEmptyBundle(title = "Untitled capture"): CaptureBundle {
  return {
    schemaVersion: SCHEMA_VERSION,
    source: "manual-import",
    title,
    capturedAt: new Date().toISOString(),
    items: [],
    resources: [],
    manifest: {
      itemCount: 0,
      resourceCount: 0,
      captureKinds: [],
      sourceUrls: []
    }
  };
}

export function createManualCaptureBundle(input: {
  title: string;
  text: string;
  canonicalUrl?: string;
  kind?: (typeof captureItemKinds)[number];
  source?: "manual-import" | "demo";
}): CaptureBundle {
  const trimmedText = input.text.trim();
  const canonicalUrl =
    input.canonicalUrl ??
    `https://local.learning/${slugify(input.title) || "source"}`;
  const capturedAt = new Date().toISOString();
  const itemId = stableHash(`${canonicalUrl}:${trimmedText}`);
  const item: CaptureItem = {
    id: itemId,
    kind: input.kind ?? "document",
    title: input.title,
    titleSource: "inferred",
    canonicalUrl,
    plainText: trimmedText,
    excerpt: trimmedText.slice(0, 240),
    headingTrail: [input.title],
    tags: [],
    submissionTypes: [],
    capturedAt,
    contentHash: stableHash(trimmedText)
  };

  return {
    schemaVersion: SCHEMA_VERSION,
    source: input.source ?? "manual-import",
    title: input.title,
    capturedAt,
    items: [item],
    resources: [],
    manifest: {
      itemCount: 1,
      resourceCount: 0,
      captureKinds: [item.kind],
      sourceUrls: [canonicalUrl]
    }
  };
}

export function mergeCaptureBundle(
  bundle: CaptureBundle,
  item: CaptureItem,
  resources: CaptureResource[]
): CaptureBundle {
  const existingIndex = bundle.items.findIndex((existing) =>
    existing.id === item.id || existing.canonicalUrl === item.canonicalUrl
  );

  const nextItems = existingIndex >= 0
    ? bundle.items.map((existing, index) => (index === existingIndex ? item : existing))
    : [...bundle.items, item];

  const nextResources = [...bundle.resources];
  for (const resource of resources) {
    if (!nextResources.some((existing) => existing.id === resource.id)) {
      nextResources.push(resource);
    }
  }

  return {
    ...bundle,
    capturedAt: new Date().toISOString(),
    items: nextItems,
    resources: nextResources,
    manifest: {
      itemCount: nextItems.length,
      resourceCount: nextResources.length,
      captureKinds: Array.from(new Set(nextItems.map((entry) => entry.kind))),
      sourceUrls: Array.from(new Set(nextItems.map((entry) => entry.canonicalUrl)))
    }
  };
}
