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

export const neuralForgePhaseIds = [
  "immerse",
  "decode",
  "contrast",
  "transfer",
  "recover"
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
  canonicalUrl: z.string().url(),
  plainText: z.string(),
  excerpt: z.string(),
  html: z.string().optional(),
  headingTrail: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
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
  relatedConceptIds: z.array(z.string())
});

export const ConceptRelationSchema = z.object({
  fromId: z.string(),
  toId: z.string(),
  type: z.enum(relationTypes),
  label: z.string(),
  strength: z.number()
});

export const EngineProfileSchema = z.object({
  id: z.enum(engineIds),
  title: z.string(),
  thesis: z.string(),
  signature: z.string(),
  contribution: z.string(),
  moves: z.array(z.string())
});

export const EvidenceFragmentSchema = z.object({
  label: z.string(),
  excerpt: z.string(),
  sourceItemId: z.string()
});

export const PhaseSubmodeSchema = z.object({
  id: z.string(),
  title: z.string(),
  engineIds: z.array(z.enum(engineIds)).min(1),
  durationMinutes: z.number().int().positive(),
  challengeLevel: z.enum(challengeLevels),
  objective: z.string(),
  setup: z.string(),
  prompt: z.string(),
  tasks: z.array(z.string()).min(2),
  reflection: z.string(),
  conceptIds: z.array(z.string()).min(1),
  evidence: z.array(EvidenceFragmentSchema).min(1)
});

export const MegaPhaseSchema = z.object({
  id: z.enum(phaseIds),
  title: z.string(),
  tagline: z.string(),
  summary: z.string(),
  totalMinutes: z.number().int().positive(),
  winCondition: z.string(),
  conceptIds: z.array(z.string()).min(1),
  submodes: z.array(PhaseSubmodeSchema).length(4)
});

export const LearningProtocolSchema = z.object({
  totalMinutes: z.number().int().positive(),
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
  conceptIds: z.array(z.string()).min(1),
  evidence: z.array(EvidenceFragmentSchema).min(1)
});

export const NeuralForgePhaseSchema = z.object({
  id: z.enum(neuralForgePhaseIds),
  title: z.string(),
  tagline: z.string(),
  purpose: z.string(),
  durationMinutes: z.number().int().positive(),
  ambientLines: z.array(z.string()).min(1),
  cards: z.array(NeuralForgeCardSchema).min(1)
});

export const NeuralForgeSchema = z.object({
  totalMinutes: z.number().int().positive(),
  atmosphere: z.string(),
  ambientPrimers: z.array(z.string()).min(1),
  phases: z.array(NeuralForgePhaseSchema).length(5)
});

export const LearningBundleSchema = z.object({
  schemaVersion: z.string(),
  generatedAt: z.string(),
  sourceBundleTitle: z.string(),
  concepts: z.array(LearningConceptSchema),
  relations: z.array(ConceptRelationSchema).default([]),
  engineProfiles: z.array(EngineProfileSchema).length(4),
  protocol: LearningProtocolSchema,
  neuralForge: NeuralForgeSchema
});

export const CourseKnowledgePackSchema = CaptureBundleSchema;

const BridgeEnvelopeSchema = z.object({
  source: z.literal(BRIDGE_SOURCE)
});

export const NFPackReadyMessageSchema = BridgeEnvelopeSchema.extend({
  type: z.literal("NF_PACK_READY"),
  pack: CourseKnowledgePackSchema
});

export const NFPackAckMessageSchema = BridgeEnvelopeSchema.extend({
  type: z.literal("NF_PACK_ACK"),
  packId: z.string()
});

export const NFImportRequestMessageSchema = BridgeEnvelopeSchema.extend({
  type: z.literal("NF_IMPORT_REQUEST")
});

export const NFImportResultMessageSchema = BridgeEnvelopeSchema.extend({
  type: z.literal("NF_IMPORT_RESULT"),
  success: z.boolean(),
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
export type MegaPhase = z.infer<typeof MegaPhaseSchema>;
export type PhaseSubmode = z.infer<typeof PhaseSubmodeSchema>;
export type NeuralForge = z.infer<typeof NeuralForgeSchema>;
export type NeuralForgePhase = z.infer<typeof NeuralForgePhaseSchema>;
export type NeuralForgeCard = z.infer<typeof NeuralForgeCardSchema>;
export type PhaseId = (typeof phaseIds)[number];
export type EngineId = (typeof engineIds)[number];
export type RelationType = (typeof relationTypes)[number];
export type NeuralForgePhaseId = (typeof neuralForgePhaseIds)[number];
export type CourseKnowledgePack = z.infer<typeof CourseKnowledgePackSchema>;
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
    canonicalUrl,
    plainText: trimmedText,
    excerpt: trimmedText.slice(0, 240),
    headingTrail: [input.title],
    tags: [],
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
  const nextItems = bundle.items.some((existing) => existing.contentHash === item.contentHash)
    ? bundle.items.map((existing) =>
        existing.canonicalUrl === item.canonicalUrl ? item : existing
      )
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
