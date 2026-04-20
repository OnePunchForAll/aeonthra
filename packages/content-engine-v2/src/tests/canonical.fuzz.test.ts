import { describe, expect, it } from "vitest";
import { CaptureBundleSchema, SCHEMA_VERSION, stableHash } from "@learning/schema";
import { analyzeBundle, classifyCanonicalChange } from "../index.ts";

function buildBundle(input: {
  plainText: string;
  html?: string;
  provenanceKind?: "FIRST_PARTY_API" | "HTML_FETCH" | "DOM_CAPTURE" | "DOCUMENT_INGEST";
  captureStrategy?: "api-only" | "html-fetch" | "session-dom";
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
        sourceHost: "canvas.example.edu",
        adapterVersion: "canonical-fuzz-v1"
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
      sourceHost: "canvas.example.edu"
    }
  });
}

function nextSeed(seed: number): number {
  return (seed * 1664525 + 1013904223) >>> 0;
}

function shuffle<T>(values: T[], seed: number): T[] {
  const items = [...values];
  let state = seed >>> 0;
  for (let index = items.length - 1; index > 0; index -= 1) {
    state = nextSeed(state);
    const swapIndex = state % (index + 1);
    [items[index], items[swapIndex]] = [items[swapIndex]!, items[index]!];
  }
  return items;
}

function addZeroWidthStorms(text: string, seed: number): string {
  let state = seed >>> 0;
  let output = "";
  for (const char of text) {
    output += char;
    state = nextSeed(state);
    if (char !== " " && state % 5 === 0) {
      output += state % 2 === 0 ? "\u200B" : "\uFEFF";
    }
  }
  return output;
}

function cosmeticHtmlVariant(text: string, seed: number): string {
  const wrappers = shuffle(["div", "section", "article", "span", "strong", "em"], seed).slice(0, 3);
  const attrs = shuffle(
    [
      `class="hydration-${seed}"`,
      `data-hydration-id="seed-${seed}"`,
      `data-capture-order="${seed + 1}"`
    ],
    seed + 1
  );

  let inner = `<p>${addZeroWidthStorms(text, seed)}</p>`;
  for (const tag of wrappers) {
    inner = `<${tag} ${attrs.join(" ")}>${inner}</${tag}>`;
  }
  return `<main>${inner}</main>`;
}

const domApiParityFixtures: Array<{ id: string; plainText: string; html: string }> = [
  {
    id: "paragraph",
    plainText: "Use utilitarianism when a task asks you to compare likely harms and benefits.",
    html: "<main><article><p>Use utilitarianism when a task asks you to compare likely harms and benefits.</p></article></main>"
  },
  {
    id: "code",
    plainText: "const total = count + 1;",
    html: "<main><section><pre>const total = count + 1;</pre></section></main>"
  },
  {
    id: "table",
    plainText: "Maximize well-being.",
    html: "<main><table><tbody><tr><td>Maximize well-being.</td></tr></tbody></table></main>"
  },
  {
    id: "math",
    plainText: "x + y = z",
    html: "<main><section><math>x + y = z</math></section></main>"
  }
];

describe("canonical artifact fuzz coverage", () => {
  it("keeps semantic hashes stable across seeded cosmetic DOM wrapper variants", () => {
    const text = "Positive reinforcement increases behavior by adding a consequence.";
    const baseline = analyzeBundle(buildBundle({
      plainText: text,
      provenanceKind: "FIRST_PARTY_API",
      captureStrategy: "api-only"
    }));

    for (let seed = 1; seed <= 20; seed += 1) {
      const domVariant = analyzeBundle(buildBundle({
        plainText: text,
        html: cosmeticHtmlVariant(text, seed),
        provenanceKind: "DOM_CAPTURE",
        captureStrategy: "session-dom"
      }));

      expect(domVariant.canonicalArtifact.semanticHash).toBe(baseline.canonicalArtifact.semanticHash);
      expect(classifyCanonicalChange(baseline.canonicalArtifact, domVariant.canonicalArtifact)).not.toBe("SEMANTIC_EDIT");
    }
  });

  it("keeps an expanded DOM-vs-API parity corpus semantically aligned", () => {
    for (const fixture of domApiParityFixtures) {
      const api = analyzeBundle(buildBundle({
        title: fixture.id,
        plainText: fixture.plainText,
        provenanceKind: "FIRST_PARTY_API",
        captureStrategy: "api-only"
      }));
      const dom = analyzeBundle(buildBundle({
        title: fixture.id,
        plainText: fixture.plainText,
        html: fixture.html,
        provenanceKind: "DOM_CAPTURE",
        captureStrategy: "session-dom"
      }));

      expect(api.canonicalArtifact.semanticHash).toBe(dom.canonicalArtifact.semanticHash);
      expect(classifyCanonicalChange(api.canonicalArtifact, dom.canonicalArtifact)).not.toBe("SEMANTIC_EDIT");
    }
  });
});
