import { describe, expect, it } from "vitest";
import { CaptureBundleSchema, SCHEMA_VERSION, stableHash } from "@learning/schema";
import {
  analyzeBundle,
  canonicalSerialize,
  classifyCanonicalChange
} from "../index.ts";

function buildBundle(input: {
  plainText: string;
  html?: string;
  provenanceKind?: "FIRST_PARTY_API" | "HTML_FETCH" | "DOM_CAPTURE" | "DOCUMENT_INGEST";
  captureStrategy?: "api-only" | "html-fetch" | "session-dom";
  sourceHost?: string;
  title?: string;
}) {
  const title = input.title ?? "Week 1 Reading";
  return CaptureBundleSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    source: "extension-capture",
    title,
    capturedAt: "2026-04-19T00:00:00.000Z",
    items: [
      {
        id: "item-1",
        kind: "page",
        title,
        titleSource: "structured",
        canonicalUrl: "https://canvas.example.edu/courses/42/pages/week-1",
        plainText: input.plainText,
        excerpt: input.plainText.slice(0, 240),
        html: input.html,
        headingTrail: [title],
        tags: ["canvas", "page"],
        submissionTypes: [],
        capturedAt: "2026-04-19T00:00:00.000Z",
        contentHash: stableHash(input.plainText),
        captureStrategy: input.captureStrategy ?? "html-fetch",
        provenanceKind: input.provenanceKind ?? "HTML_FETCH",
        sourceEndpoint: "https://canvas.example.edu/courses/42/pages/week-1",
        sourceHost: input.sourceHost ?? "canvas.example.edu",
        adapterVersion: "canonical-test-v1"
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
      courseId: "42",
      courseName: "Behavioral Science 101",
      sourceHost: input.sourceHost ?? "canvas.example.edu"
    }
  });
}

describe("canonical artifact", () => {
  it("keeps object-field undefined omission stable in canonical serialization", () => {
    expect(
      canonicalSerialize({ alpha: 1, beta: undefined })
    ).toBe(
      canonicalSerialize({ alpha: 1 })
    );
  });

  it("normalizes Unicode and zero-width variants into the same semantic hash", () => {
    const decomposed = buildBundle({
      plainText: "Cafe\u0301\u200B learning is anchored in evidence. Positive reinforcement is adding a consequence that increases behavior."
    });
    const composed = buildBundle({
      plainText: "Café learning is anchored in evidence. Positive reinforcement is adding a consequence that increases behavior."
    });

    const left = analyzeBundle(decomposed);
    const right = analyzeBundle(composed);

    expect(left.canonicalArtifact.semanticHash).toBe(right.canonicalArtifact.semanticHash);
  });

  it("classifies provenance-only changes without treating them as semantic edits", () => {
    const left = analyzeBundle(buildBundle({
      plainText: "Positive reinforcement is adding a consequence that increases behavior."
    }));
    const right = analyzeBundle(buildBundle({
      plainText: "Positive reinforcement is adding a consequence that increases behavior.",
      provenanceKind: "DOM_CAPTURE",
      captureStrategy: "session-dom",
      sourceHost: "canvas.mirror.example.edu"
    }));

    expect(classifyCanonicalChange(left.canonicalArtifact, right.canonicalArtifact)).toBe("PROVENANCE_ONLY");
  });

  it("classifies cosmetic structural edits when semantic text is preserved", () => {
    const paragraph = analyzeBundle(buildBundle({
      plainText: "Positive reinforcement is adding a consequence that increases behavior.",
      html: "<main><h1>Week 1 Reading</h1><p>Positive reinforcement is adding a consequence that increases behavior.</p></main>"
    }));
    const list = analyzeBundle(buildBundle({
      plainText: "Positive reinforcement is adding a consequence that increases behavior.",
      html: "<main><h1>Week 1 Reading</h1><ul><li>Positive reinforcement is adding a consequence that increases behavior.</li></ul></main>"
    }));

    expect(classifyCanonicalChange(paragraph.canonicalArtifact, list.canonicalArtifact)).toBe("COSMETIC_EDIT");
  });

  it("treats ordered and unordered lists with the same items as cosmetic edits", () => {
    const unordered = analyzeBundle(buildBundle({
      plainText: "Define the outcome. Compare the tradeoffs.",
      html: "<main><h1>Week 1 Reading</h1><ul><li>Define the outcome.</li><li>Compare the tradeoffs.</li></ul></main>"
    }));
    const ordered = analyzeBundle(buildBundle({
      plainText: "Define the outcome. Compare the tradeoffs.",
      html: "<main><h1>Week 1 Reading</h1><ol><li>Define the outcome.</li><li>Compare the tradeoffs.</li></ol></main>"
    }));

    expect(classifyCanonicalChange(unordered.canonicalArtifact, ordered.canonicalArtifact)).toBe("COSMETIC_EDIT");
  });

  it("keeps table wrapper irregularities out of the semantic channel", () => {
    const flatTable = analyzeBundle(buildBundle({
      plainText: "Principle: Maximize well-being.",
      html: "<main><table><tr><th>Principle</th><td>Maximize well-being.</td></tr></table></main>"
    }));
    const wrappedTable = analyzeBundle(buildBundle({
      plainText: "Principle: Maximize well-being.",
      html: "<main><table><tbody><tr><th>Principle</th><td>Maximize well-being.</td></tr></tbody></table></main>"
    }));

    expect(["IDENTICAL", "COSMETIC_EDIT"]).toContain(
      classifyCanonicalChange(flatTable.canonicalArtifact, wrappedTable.canonicalArtifact)
    );
    expect(flatTable.canonicalArtifact.semanticHash).toBe(wrappedTable.canonicalArtifact.semanticHash);
  });

  it("preserves semantically meaningful whitespace inside code blocks", () => {
    const left = analyzeBundle(buildBundle({
      plainText: "const total = count + 1;",
      html: "<main><pre>const total = count + 1;</pre></main>"
    }));
    const right = analyzeBundle(buildBundle({
      plainText: "const  total = count + 1;",
      html: "<main><pre>const  total = count + 1;</pre></main>"
    }));

    expect(classifyCanonicalChange(left.canonicalArtifact, right.canonicalArtifact)).toBe("SEMANTIC_EDIT");
  });

  it("collapses whitespace-only math variants without faking deeper equivalence", () => {
    const spaced = analyzeBundle(buildBundle({
      plainText: "x + y = z",
      html: "<main><math>x   +   y = z</math></main>"
    }));
    const normalized = analyzeBundle(buildBundle({
      plainText: "x + y = z",
      html: "<main><math>x + y = z</math></main>"
    }));

    expect(spaced.canonicalArtifact.semanticHash).toBe(normalized.canonicalArtifact.semanticHash);
  });

  it("keeps api-first and dom fallback variants semantically equivalent when the text matches", () => {
    const api = analyzeBundle(buildBundle({
      plainText: "Use utilitarianism when a task asks you to compare likely harms and benefits.",
      provenanceKind: "FIRST_PARTY_API",
      captureStrategy: "api-only"
    }));
    const dom = analyzeBundle(buildBundle({
      plainText: "Use utilitarianism when a task asks you to compare likely harms and benefits.",
      html: "<main><div><p>Use utilitarianism when a task asks you to compare likely harms and benefits.</p></div></main>",
      provenanceKind: "DOM_CAPTURE",
      captureStrategy: "session-dom"
    }));

    expect(classifyCanonicalChange(api.canonicalArtifact, dom.canonicalArtifact)).not.toBe("SEMANTIC_EDIT");
    expect(api.canonicalArtifact.semanticHash).toBe(dom.canonicalArtifact.semanticHash);
  });

  it("classifies semantic edits when the supported meaning changes", () => {
    const positive = analyzeBundle(buildBundle({
      plainText: "Positive reinforcement is adding a consequence that increases behavior."
    }));
    const negative = analyzeBundle(buildBundle({
      plainText: "Negative reinforcement is removing a condition to increase behavior."
    }));

    expect(classifyCanonicalChange(positive.canonicalArtifact, negative.canonicalArtifact)).toBe("SEMANTIC_EDIT");
  });
});
