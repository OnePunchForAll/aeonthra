import { z } from "zod";
import {
  SCHEMA_VERSION,
  captureItemKinds,
  captureStrategies,
  captureTitleSources,
  provenanceKinds,
  resourceKinds
} from "./constants.ts";
import { normalizeSourceHostPart } from "./identity.ts";
import { slugify, stableHash } from "./utils.ts";

export const CaptureResourceSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string().url(),
  kind: z.enum(resourceKinds),
  sourceItemId: z.string(),
  captureStrategy: z.enum(captureStrategies).optional(),
  provenanceKind: z.enum(provenanceKinds).optional(),
  sourceEndpoint: z.string().url().optional(),
  sourceHost: z.string().optional(),
  adapterVersion: z.string().optional()
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
  contentHash: z.string(),
  captureStrategy: z.enum(captureStrategies).optional(),
  provenanceKind: z.enum(provenanceKinds).optional(),
  sourceEndpoint: z.string().url().optional(),
  sourceHost: z.string().optional(),
  adapterVersion: z.string().optional()
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

export type CaptureBundle = z.infer<typeof CaptureBundleSchema>;
export type CaptureItem = z.infer<typeof CaptureItemSchema>;
export type CaptureResource = z.infer<typeof CaptureResourceSchema>;

export function isTextbookCaptureItem(item: CaptureItem): boolean {
  return (item.tags ?? []).includes("textbook");
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
    titleSource: "inferred",
    canonicalUrl,
    plainText: trimmedText,
    excerpt: trimmedText.slice(0, 240),
    headingTrail: [input.title],
    tags: [],
    submissionTypes: [],
    capturedAt,
    contentHash: stableHash(trimmedText),
    captureStrategy: "manual-import",
    provenanceKind: "USER_GENERATED",
    sourceEndpoint: canonicalUrl,
    sourceHost: normalizeSourceHostPart(canonicalUrl),
    adapterVersion: "manual-import-v1"
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
