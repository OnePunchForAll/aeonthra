import { describe, expect, it } from "vitest";
import { createManualCaptureBundle } from "@learning/schema";
import { benchmarkCorpus } from "../fixtures/corpus.ts";
import { analyzeBundle } from "../index.ts";
import { buildRelations } from "../relations/build.ts";
import { evaluateLabel } from "../truth-gates/labels.ts";
import type { ConceptV2, EvidenceUnit } from "../contracts/types.ts";

function makeConcept(id: string, label: string, sourceItemId: string): ConceptV2 {
  return {
    id,
    label,
    score: 50,
    keywords: [label],
    sourceItemIds: [sourceItemId],
    evidenceIds: [],
    fieldAdmissions: {},
    relationIds: [],
    admissionReasons: [],
    rejectionReasons: []
  };
}

function makeEvidenceUnit(id: string, sourceItemId: string, excerpt: string): EvidenceUnit {
  return {
    id,
    sourceItemId,
    sourceKind: "page",
    kind: "explanation",
    excerpt,
    normalizedExcerpt: excerpt.toLowerCase(),
    headingPath: [],
    nodeId: null,
    originSystem: "manual-import",
    captureModality: "plain-text-fallback",
    contentProfile: "academic",
    trustTier: "high",
    supportScore: 60,
    acceptedReasons: [],
    rejectedReasons: []
  };
}

describe("content-engine-v2", () => {
  it("fails closed on hard noise bundles", () => {
    const fixture = benchmarkCorpus.find((entry) => entry.expectation.fixtureId === "hard-noise-js-disabled")!;
    const result = analyzeBundle(fixture.bundle);

    expect(result.concepts).toEqual([]);
    expect(result.rejections.length).toBeGreaterThan(0);
  });

  it("recovers grounded concepts from mixed bundles without rescuing the junk", () => {
    const fixture = benchmarkCorpus.find((entry) => entry.expectation.fixtureId === "mixed-noise-and-real-concept")!;
    const result = analyzeBundle(fixture.bundle);

    expect(result.concepts.map((concept) => concept.label)).toContain("Positive Reinforcement");
    expect(result.concepts.map((concept) => concept.label)).not.toContain("Week 1");
    expect(result.concepts[0]?.fieldAdmissions.definition?.evidenceIds.length ?? 0).toBeGreaterThan(0);
  });

  it("rejects suspicious due dates instead of treating them as trusted", () => {
    const fixture = benchmarkCorpus.find((entry) => entry.expectation.fixtureId === "suspicious-date")!;
    const result = analyzeBundle(fixture.bundle);
    const assignment = result.assignments.find((entry) => entry.title === "Essay 2");

    expect(assignment?.dueTrust.state).toBe("rejected");
    expect(assignment?.dueAt).toBeNull();
  });

  it("rejects clause-opener and pronoun labels instead of surfacing them as concepts", () => {
    expect(evaluateLabel("If You").accepted).toBe(false);
    expect(evaluateLabel("They").accepted).toBe(false);
    expect(evaluateLabel("These").accepted).toBe(false);
    expect(evaluateLabel("Week 1 Overview").accepted).toBe(false);
  });

  it("collapses repeated adjacent label phrases before concept admission", () => {
    const gate = evaluateLabel("Operant Conditioning Operant Conditioning");

    expect(gate.accepted).toBe(true);
    expect(gate.cleanedLabel).toBe("Operant Conditioning");
  });

  it("rejects wrapper titles and weak textbook container prose before they can surface as concepts or themes", () => {
    const bundle = createManualCaptureBundle({
      title: "Overview of Classical Conditioning",
      text: [
        "Chapter 1",
        "Textbook reading example",
        "This chapter gives background and overview notes without a real definition."
      ].join(" "),
      canonicalUrl: "https://local.learning/wrapper-title",
      kind: "page"
    });

    const result = analyzeBundle(bundle);

    expect(result.classifications[0]?.titleTrust.state).toBe("rejected");
    expect(result.concepts).toEqual([]);
    expect(result.focusThemes).toEqual([]);
    expect(result.assignments).toEqual([]);
  });

  it("keeps wrapper titles out of concept labels when the body carries the real concept", () => {
    const bundle = createManualCaptureBundle({
      title: "Overview of Classical Conditioning",
      text: [
        "Classical conditioning is learning through association between stimuli.",
        "A neutral stimulus becomes a conditioned stimulus after repeated pairing with an unconditioned stimulus."
      ].join(" "),
      canonicalUrl: "https://local.learning/classical-conditioning-wrapper",
      kind: "page"
    });

    const result = analyzeBundle(bundle);
    const labels = result.concepts.map((concept) => concept.label);

    expect(labels).toContain("Classical Conditioning");
    expect(labels).not.toContain("Overview of Classical Conditioning");
    expect(result.focusThemes.some((theme) => /overview/i.test(theme.label))).toBe(false);
  });

  it("does not promote a mixed single page into an assignment surface", () => {
    const fixture = benchmarkCorpus.find((entry) => entry.expectation.fixtureId === "single-page-mixed-live-junk")!;
    const result = analyzeBundle(fixture.bundle);

    expect(result.concepts.map((concept) => concept.label)).toContain("Positive Reinforcement");
    expect(result.assignments).toHaveLength(0);
    expect(result.rejections.some((rejection) => rejection.code === "page-assignment-surface-suppressed")).toBe(true);
  });

  it("keeps discussion wrappers out of the assignment surface while salvaging the grounded chapter", () => {
    const fixture = benchmarkCorpus.find((entry) => entry.expectation.fixtureId === "thin-discussion-salvage")!;
    const result = analyzeBundle(fixture.bundle);
    const assignmentTitles = result.assignments.map((assignment) => assignment.title);

    expect(result.concepts.map((concept) => concept.label)).toContain("Cognitive Load Theory");
    expect(assignmentTitles).toContain("Cognitive Load Theory");
    expect(assignmentTitles).not.toContain("Week 4 Discussion Forum");
    expect(assignmentTitles).not.toContain("Reply to Classmates");
  });

  it("builds relations from indexed candidate concepts without changing shared evidence output", () => {
    const concepts: ConceptV2[] = [
      makeConcept("utilitarianism", "Utilitarianism", "source-a"),
      makeConcept("duty-ethics", "Duty Ethics", "source-b"),
      ...Array.from({ length: 40 }, (_, index) =>
        makeConcept(`noise-${index}`, `Distractor Concept ${index + 1}`, `noise-${index}`)
      )
    ];
    const evidenceUnits: EvidenceUnit[] = [
      makeEvidenceUnit(
        "evidence-1",
        "source-a",
        "Utilitarianism contrasts with Duty Ethics because one weighs outcomes while the other weighs obligations."
      ),
      makeEvidenceUnit(
        "evidence-2",
        "source-a",
        "A separate study note about goals and planning should not create any relation."
      )
    ];

    const result = buildRelations(concepts, evidenceUnits);

    expect(result.relations).toHaveLength(1);
    expect(result.relations[0]?.type).toBe("contrasts");
    expect(result.relations[0]?.evidenceIds).toEqual(["evidence-1"]);
    expect([result.relations[0]?.fromId, result.relations[0]?.toId]).toEqual([
      "utilitarianism",
      "duty-ethics"
    ]);
  });
});
