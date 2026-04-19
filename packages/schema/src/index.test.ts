import { describe, expect, it } from "vitest";
import {
  BRIDGE_SOURCE,
  BridgeMessageSchema,
  CaptureBundleSchema,
  SCHEMA_VERSION,
  createBridgeHandoffEnvelope,
  inspectCanvasCourseKnowledgePack,
  stableHash
} from "./index.ts";

function buildCanvasBundle(overrides?: {
  tags?: string[];
  title?: string;
  source?: "extension-capture" | "manual-import" | "demo";
}): ReturnType<typeof CaptureBundleSchema.parse> {
  const title = overrides?.title ?? "Week 1 Overview";
  return CaptureBundleSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    source: overrides?.source ?? "extension-capture",
    title,
    capturedAt: "2026-04-19T00:00:00.000Z",
    items: [
      {
        id: "item-1",
        kind: "page",
        title,
        titleSource: "structured",
        canonicalUrl: "https://canvas.example.edu/courses/42/pages/week-1",
        plainText: "Positive reinforcement is adding a consequence that increases the future chance of a behavior.",
        excerpt: "Positive reinforcement is adding a consequence that increases the future chance of a behavior.",
        headingTrail: [title],
        tags: overrides?.tags ?? ["canvas", "page"],
        submissionTypes: [],
        capturedAt: "2026-04-19T00:00:00.000Z",
        contentHash: stableHash("positive-reinforcement"),
        captureStrategy: "html-fetch",
        provenanceKind: "HTML_FETCH",
        sourceEndpoint: "https://canvas.example.edu/courses/42/pages/week-1",
        sourceHost: "canvas.example.edu",
        adapterVersion: "canvas-html-v1"
      }
    ],
    resources: [],
    manifest: {
      itemCount: 1,
      resourceCount: 0,
      captureKinds: ["page"],
      sourceUrls: ["https://canvas.example.edu/courses/42/pages/week-1"]
    },
    captureMeta: {
      courseId: "https://canvas.example.edu/courses/42",
      courseName: "Behavioral Science 101",
      sourceHost: "Canvas.Example.edu"
    }
  });
}

describe("@learning/schema", () => {
  it("parses legacy capture bundles that do not include provenance metadata", () => {
    const parsed = CaptureBundleSchema.parse({
      schemaVersion: SCHEMA_VERSION,
      source: "manual-import",
      title: "Legacy import",
      capturedAt: "2026-04-19T00:00:00.000Z",
      items: [
        {
          id: "legacy-item",
          kind: "document",
          title: "Legacy import",
          titleSource: "inferred",
          canonicalUrl: "https://local.learning/legacy-import",
          plainText: "Legacy text",
          excerpt: "Legacy text",
          headingTrail: ["Legacy import"],
          tags: [],
          submissionTypes: [],
          capturedAt: "2026-04-19T00:00:00.000Z",
          contentHash: stableHash("Legacy text")
        }
      ],
      resources: [],
      manifest: {
        itemCount: 1,
        resourceCount: 0,
        captureKinds: ["document"],
        sourceUrls: ["https://local.learning/legacy-import"]
      }
    });

    expect(parsed.items[0]?.provenanceKind).toBeUndefined();
    expect(parsed.items[0]?.captureStrategy).toBeUndefined();
  });

  it("normalizes course identity when creating bridge handoff envelopes", () => {
    const envelope = createBridgeHandoffEnvelope(buildCanvasBundle());

    expect(envelope.courseId).toBe("42");
    expect(envelope.sourceHost).toBe("canvas.example.edu");
    expect(envelope.packId).toBeTruthy();
    expect(envelope.handoffId).toBeTruthy();
  });

  it("rejects textbook-only extension captures", () => {
    const inspection = inspectCanvasCourseKnowledgePack(
      buildCanvasBundle({ tags: ["textbook", "canvas"] })
    );

    expect(inspection.ok).toBe(false);
    if (!inspection.ok) {
      expect(inspection.code).toBe("textbook-only");
    }
  });

  it("parses typed bridge pack-ready messages with canonical pack metadata", () => {
    const pack = buildCanvasBundle();
    const envelope = createBridgeHandoffEnvelope(pack);
    const message = BridgeMessageSchema.parse({
      source: BRIDGE_SOURCE,
      type: "NF_PACK_READY",
      requestId: "request-1",
      handoffId: envelope.handoffId,
      packId: envelope.packId,
      pack
    });

    expect(message.type).toBe("NF_PACK_READY");
    if (message.type === "NF_PACK_READY") {
      expect(message.pack.captureMeta?.courseId).toBe("https://canvas.example.edu/courses/42");
    }
  });
});
