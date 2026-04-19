import { describe, expect, it } from "vitest";
import { benchmarkCorpus } from "../fixtures/corpus.ts";
import { analyzeBundle } from "../index.ts";
import { projectToLegacy } from "../compatibility/legacy-projection.ts";

describe("content-engine-v2 legacy projection", () => {
  it("projects visible concepts with definition provenance into the legacy shape", () => {
    const fixture = benchmarkCorpus.find((entry) => entry.expectation.fixtureId === "clean-textbook-ethics")!;
    const result = analyzeBundle(fixture.bundle);
    const projection = projectToLegacy(result);

    expect(projection.concepts.map((concept) => concept.label)).toContain("Utilitarianism");
    expect((projection.concepts[0]?.fieldSupport?.definition?.evidence.length ?? 0) > 0).toBe(true);
    expect(projection.synthesis.stableConceptIds.length).toBeGreaterThan(0);
  });
});
