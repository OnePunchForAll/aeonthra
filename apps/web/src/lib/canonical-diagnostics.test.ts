import { buildLearningBundle } from "@learning/content-engine";
import { createManualCaptureBundle } from "@learning/schema";
import { describe, expect, it } from "vitest";
import { buildWorkspaceDiagnostics } from "./canonical-diagnostics";

describe("workspace diagnostics", () => {
  it("summarizes canonical hashes, provenance lanes, and partial capture reasons", () => {
    const bundle = createManualCaptureBundle({
      title: "Behavioral Science Week 1",
      text: "Positive reinforcement increases behavior by adding a consequence.",
      canonicalUrl: "https://canvas.example.test/courses/42/pages/week-1",
      kind: "page"
    });

    bundle.items[0] = {
      ...bundle.items[0]!,
      captureStrategy: "api-only",
      provenanceKind: "FIRST_PARTY_API",
      sourceHost: "canvas.example.test"
    };
    bundle.resources = [
      {
        id: "resource-1",
        title: "Lecture PDF",
        url: "https://canvas.example.test/courses/42/files/7/download",
        kind: "file",
        sourceItemId: bundle.items[0]!.id,
        captureStrategy: "html-fetch",
        provenanceKind: "HTML_FETCH",
        sourceHost: "canvas.example.test"
      }
    ];
    bundle.captureMeta = {
      courseId: "42",
      courseName: "Behavioral Science 101",
      sourceHost: "canvas.example.test",
      stats: {
        totalItemsVisited: 2,
        totalItemsCaptured: 1,
        totalItemsSkipped: 0,
        totalItemsFailed: 1,
        durationMs: 320,
        sizeBytes: 2048
      },
      warnings: [
        {
          url: "https://canvas.example.test/courses/42/files/7/download",
          message: "HTML fetch fallback used for linked file."
        }
      ]
    };
    bundle.manifest = {
      itemCount: bundle.items.length,
      resourceCount: bundle.resources.length,
      captureKinds: bundle.items.map((item) => item.kind),
      sourceUrls: [bundle.items[0]!.canonicalUrl, bundle.resources[0]!.url]
    };

    const learning = buildLearningBundle(bundle);
    const diagnostics = buildWorkspaceDiagnostics(bundle, learning);

    expect(diagnostics.canonicalArtifact).not.toBeNull();
    expect(diagnostics.hashes.semantic).toBe(learning.synthesis.canonicalArtifact?.semanticHash ?? "");
    expect(diagnostics.status).toBe("partial");
    expect(diagnostics.partialReasons).toContain("1 item(s) failed during capture.");
    expect(diagnostics.provenanceLanes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "FIRST_PARTY_API", itemCount: 1 }),
        expect.objectContaining({ id: "HTML_FETCH", resourceCount: 1 })
      ])
    );
    expect(diagnostics.captureStrategyLanes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "api-only", itemCount: 1 }),
        expect.objectContaining({ id: "html-fetch", resourceCount: 1 })
      ])
    );
  });
});
