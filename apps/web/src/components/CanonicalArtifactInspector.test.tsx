import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { buildLearningBundle } from "@learning/content-engine";
import { createManualCaptureBundle } from "@learning/schema";
import { CanonicalArtifactInspector } from "./CanonicalArtifactInspector";
import { buildWorkspaceDiagnostics } from "../lib/canonical-diagnostics";

function createDiagnosticsFixture() {
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
  return buildWorkspaceDiagnostics(bundle, learning);
}

describe("CanonicalArtifactInspector", () => {
  it("renders hashes, lane summaries, and export actions for the inspect view", () => {
    const diagnostics = createDiagnosticsFixture();
    const markup = renderToStaticMarkup(
      <CanonicalArtifactInspector
        diagnostics={diagnostics}
        onDownloadCanonicalArtifact={() => {}}
        onDownloadDiagnostics={() => {}}
        onDownloadOfflineSite={() => {}}
        onSaveReplayBundle={() => {}}
      />
    );

    expect(markup).toContain("Inspect The Truth Boundary");
    expect(markup).toContain("Export Canonical JSON");
    expect(markup).toContain("Semantic Hash");
    expect(markup).toContain("First-party API");
    expect(markup).toContain("HTML fetch");
    expect(markup).toContain("API only");
    expect(markup).toContain("Capture Strategy Lanes");
  });
});
