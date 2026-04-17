import { describe, expect, it } from "vitest";
import { createManualCaptureBundle, type CaptureBundle } from "@learning/schema";
import { assessSourceQuality } from "./index";
import { buildLearningBundle } from "./index";

function combineManualBundles(title: string, docs: ReturnType<typeof createManualCaptureBundle>[]): CaptureBundle {
  const first = docs[0]!;
  return {
    schemaVersion: first.schemaVersion,
    source: "manual-import",
    title,
    capturedAt: first.capturedAt,
    items: docs.flatMap((doc) => doc.items),
    resources: [],
    manifest: {
      itemCount: docs.reduce((sum, doc) => sum + doc.items.length, 0),
      resourceCount: 0,
      captureKinds: Array.from(new Set(docs.flatMap((doc) => doc.manifest.captureKinds))),
      sourceUrls: docs.flatMap((doc) => doc.manifest.sourceUrls)
    }
  };
}

const thinDiscussionBundle = combineManualBundles("Cognitive Load Week 4", [
  createManualCaptureBundle({
    title: "Week 4 Discussion Forum",
    text: [
      "Initial post: compare intrinsic load and germane load using one example from the lesson.",
      "Reply to two classmates and keep the discussion moving."
    ].join(" "),
    canonicalUrl: "https://local.learning/week-4-discussion",
    kind: "discussion"
  }),
  createManualCaptureBundle({
    title: "Reply to Classmates",
    text: "Respond to at least two classmates and support the conversation with one practical example.",
    canonicalUrl: "https://local.learning/week-4-replies",
    kind: "discussion"
  }),
  createManualCaptureBundle({
    title: "Cognitive Load Theory",
    text: [
      "Cognitive load theory explains how working memory handles new material during learning.",
      "Intrinsic load comes from the complexity of the task itself, extraneous load comes from poor presentation choices, and germane load supports schema construction."
    ].join(" "),
    canonicalUrl: "https://local.learning/cognitive-load-theory",
    kind: "page"
  })
]);

const cloneHeavyOrientationBundle = combineManualBundles("Psychology Orientation Capture", [
  createManualCaptureBundle({
    title: "Reflection Activity",
    text: [
      "Reflection activity. Initial post. Respond to at least two classmates.",
      "Submit your response before Sunday. Points possible 10. Module item."
    ].join(" "),
    canonicalUrl: "https://local.learning/orientation/reflection-1",
    kind: "discussion"
  }),
  createManualCaptureBundle({
    title: "Reflection Activity Copy",
    text: [
      "Reflection activity. Initial post. Respond to at least two classmates.",
      "Submit your response before Sunday. Points possible 10. Module item."
    ].join(" "),
    canonicalUrl: "https://local.learning/orientation/reflection-2",
    kind: "discussion"
  }),
  createManualCaptureBundle({
    title: "Start Here",
    text: "Welcome to orientation. Learn the portal, support services, and navigation workflow needed to get started.",
    canonicalUrl: "https://local.learning/orientation/start-here",
    kind: "page"
  }),
  createManualCaptureBundle({
    title: "Operant Conditioning",
    text: [
      "Operant conditioning is learning shaped by consequences.",
      "Positive reinforcement increases a behavior by adding a desired stimulus, while negative reinforcement increases a behavior by removing an aversive condition."
    ].join(" "),
    canonicalUrl: "https://local.learning/operant-conditioning",
    kind: "page"
  })
]);

const fullAcademicCloneBundle = combineManualBundles("Learning Science Reader", [
  createManualCaptureBundle({
    title: "Classical Conditioning",
    text: [
      "Classical conditioning is learning through association between stimuli.",
      "A neutral stimulus becomes a conditioned stimulus after repeated pairing with an unconditioned stimulus."
    ].join(" "),
    canonicalUrl: "https://local.learning/classical-conditioning",
    kind: "page"
  }),
  createManualCaptureBundle({
    title: "Overview of Classical Conditioning",
    text: [
      "Classical conditioning is learning through association between stimuli.",
      "Extinction weakens the conditioned response when the conditioned stimulus appears without the unconditioned stimulus."
    ].join(" "),
    canonicalUrl: "https://local.learning/overview-classical-conditioning",
    kind: "page"
  }),
  createManualCaptureBundle({
    title: "Principles of Classical Conditioning",
    text: [
      "Classical conditioning is learning through association between stimuli.",
      "Generalization occurs when a response transfers to similar stimuli, while discrimination keeps responses tied to the original cue."
    ].join(" "),
    canonicalUrl: "https://local.learning/principles-classical-conditioning",
    kind: "page"
  }),
  createManualCaptureBundle({
    title: "Operant Conditioning",
    text: [
      "Operant conditioning is learning shaped by consequences.",
      "Schedules of reinforcement influence how quickly a behavior is acquired and how resistant it remains to extinction."
    ].join(" "),
    canonicalUrl: "https://local.learning/operant-conditioning-reader",
    kind: "page"
  })
]);

describe("content engine golden fixtures", () => {
  it("keeps thin discussion bundles warning-marked without drifting into forum scaffolds", () => {
    const report = assessSourceQuality(thinDiscussionBundle);
    const learningBundle = buildLearningBundle(thinDiscussionBundle);
    const labels = learningBundle.concepts.map((concept) => concept.label.toLowerCase());

    expect(report.warnings.join(" ").toLowerCase()).toContain("only canvas items were captured");
    expect(report.warnings.join(" ").toLowerCase()).toContain("canvas");
    expect(labels.some((label) => label.includes("cognitive load theory") || label.includes("intrinsic load"))).toBe(true);
    expect(labels).not.toContain("week 4 discussion forum");
    expect(labels).not.toContain("reply to classmates");
    expect(labels).not.toContain("initial post");
  });

  it("flags clone-heavy orientation captures while preserving the academic concept lane", () => {
    const report = assessSourceQuality(cloneHeavyOrientationBundle);
    const learningBundle = buildLearningBundle(cloneHeavyOrientationBundle);
    const labels = learningBundle.concepts.map((concept) => concept.label.toLowerCase());

    expect(report.synthesisMode).toBe("degraded");
    expect(report.structurallyIdenticalGroups).toBeGreaterThanOrEqual(1);
    expect(report.adminSignalScore).toBeGreaterThan(report.academicSignalScore);
    expect(report.dominantBoilerplatePhrase).toBe("reflection activity");
    expect(learningBundle.synthesis.synthesisMode).toBe("degraded");
    expect(learningBundle.synthesis.qualityWarnings).toEqual(report.warnings);
    expect(learningBundle.synthesis.qualityBanner.length).toBeGreaterThan(0);
    expect(labels.some((label) => label.includes("operant conditioning"))).toBe(true);
    expect(labels).toHaveLength(1);
    expect(labels).not.toContain("reflection activity");
    expect(labels).not.toContain("reflection activity copy");
    expect(labels).not.toContain("start here");
  });

  it("deduplicates academic wrapper variants so repeated topic wrappers do not crowd out distinct concepts", () => {
    const report = assessSourceQuality(fullAcademicCloneBundle);
    const learningBundle = buildLearningBundle(fullAcademicCloneBundle);
    const labels = learningBundle.concepts.map((concept) => concept.label.toLowerCase());
    const classicalLabels = labels.filter((label) => label.includes("classical conditioning"));

    expect(report.synthesisMode).toBe("full");
    expect(report.adminSignalScore).toBeLessThan(report.academicSignalScore);
    expect(classicalLabels).toHaveLength(1);
    expect(labels.some((label) => label.includes("operant conditioning"))).toBe(true);
  });
});
