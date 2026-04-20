import { z } from "zod";
import { BRIDGE_SOURCE } from "./constants.ts";
import { inspectCanvasCourseKnowledgePack } from "./canvas-course.ts";
import { captureBundleId, CaptureBundleSchema, type CaptureBundle } from "./capture.ts";
import { normalizeCourseIdPart, normalizeSourceHostPart } from "./identity.ts";
import { stableHash } from "./utils.ts";

export const CourseKnowledgePackSchema = CaptureBundleSchema.refine(
  (bundle) => inspectCanvasCourseKnowledgePack(bundle).ok,
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

export type CourseKnowledgePack = z.infer<typeof CourseKnowledgePackSchema>;
export type BridgeHandoffEnvelope = z.infer<typeof BridgeHandoffEnvelopeSchema>;
export type PendingBridgeHandoffQueue = z.infer<typeof PendingBridgeHandoffQueueSchema>;
export type BridgeMessage = z.infer<typeof BridgeMessageSchema>;

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
