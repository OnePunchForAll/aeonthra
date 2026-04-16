import { describe, expect, it } from "vitest";
import { createManualCaptureBundle } from "@learning/schema";
import { buildLearningBundle, summarizeBundle } from "./index";

const syntheticNoisyCapture = (() => {
  const docs = [
    createManualCaptureBundle({
      title: "Course Modules",
      text: [
        "Collapse all.",
        "Module item submitted and is complete.",
        "Score at least.",
        "Must view in order to complete this module item.",
        "Marked done. Contributed. Submitted.",
        "Previous module item. Next module item. Locked."
      ].join(" "),
      canonicalUrl: "https://local.learning/course-modules",
      kind: "module"
    }),
    createManualCaptureBundle({
      title: "Module 2 - Navigating Online Environment",
      text: "Students learn the online classroom, portal workflow, and navigation habits needed to move through course tools without confusion.",
      canonicalUrl: "https://local.learning/module-2",
      kind: "page"
    }),
    createManualCaptureBundle({
      title: "Module 4 - Access & Wellness Support",
      text: "Access services, wellness support, and student support resources help students keep learning when coursework becomes difficult.",
      canonicalUrl: "https://local.learning/module-4-access",
      kind: "page"
    }),
    createManualCaptureBundle({
      title: "Module 5 - Time Management",
      text: "Time management helps students schedule work, create routines, and stay ahead of deadlines.",
      canonicalUrl: "https://local.learning/module-5-time-management",
      kind: "page"
    }),
    createManualCaptureBundle({
      title: "Module 5 - Study Techniques",
      text: "Study techniques improve retrieval practice, note-making, and sustainable success on future assignments.",
      canonicalUrl: "https://local.learning/module-5-study-techniques",
      kind: "page"
    }),
    createManualCaptureBundle({
      title: "Module 5 - Time Blocking and Prioritization",
      text: "Time blocking and prioritization techniques help students focus on the right task at the right time.",
      canonicalUrl: "https://local.learning/module-5-time-blocking",
      kind: "page"
    })
  ];

  return {
    schemaVersion: docs[0].schemaVersion,
    source: "manual-import" as const,
    title: "Student Success Orientation",
    capturedAt: docs[0].capturedAt,
    items: docs.flatMap((doc) => doc.items),
    resources: [],
    manifest: {
      itemCount: docs.reduce((sum, doc) => sum + doc.items.length, 0),
      resourceCount: 0,
      captureKinds: Array.from(new Set(docs.flatMap((doc) => doc.manifest.captureKinds))),
      sourceUrls: docs.flatMap((doc) => doc.manifest.sourceUrls)
    }
  };
})();

describe("content engine", () => {
  it("derives a five-phase twenty-submode protocol from captured text", () => {
    const bundle = createManualCaptureBundle({
      title: "Ethics Primer",
      text: [
        "Ethics asks how one should live and what counts as a good life.",
        "Moral reasoning weighs duties, consequences, and character.",
        "A strong study system helps students explain concepts, apply them to assignments, confront misconceptions, and reflect on what they still do not fully command."
      ].join(" ")
    });

    const learningBundle = buildLearningBundle(bundle);
    const labels = learningBundle.concepts.map((concept) => concept.label);

    expect(learningBundle.concepts.length).toBeGreaterThanOrEqual(3);
    expect(labels.some((label) => label === "Moral Reasoning" || label === "Ethics Primer" || label === "Ethics")).toBe(
      true
    );
    expect(learningBundle.engineProfiles).toHaveLength(4);
    expect(learningBundle.protocol.phases).toHaveLength(5);
    expect(learningBundle.neuralForge.phases).toHaveLength(5);
    expect(
      learningBundle.protocol.phases.reduce((sum, phase) => sum + phase.submodes.length, 0)
    ).toBe(20);
    expect(learningBundle.protocol.totalMinutes).toBe(100);
    expect(learningBundle.neuralForge.totalMinutes).toBe(60);
  });

  it("returns a compact summary with protocol timing", () => {
    const bundle = createManualCaptureBundle({
      title: "Course Page",
      text: "Compare and evaluate the ethical theories discussed in this module."
    });

    const summary = summarizeBundle(bundle);

    expect(summary.itemCount).toBe(1);
    expect(summary.topConcepts.length).toBeGreaterThan(0);
    expect(summary.totalMinutes).toBe(100);
  });

  it("prioritizes real content titles over canvas chrome in noisy course captures", () => {
    const learningBundle = buildLearningBundle(syntheticNoisyCapture);
    const labels = learningBundle.concepts.map((concept) => concept.label.toLowerCase());
    const firstPrompt = learningBundle.protocol.phases[0].submodes[0].prompt.toLowerCase();
    const forgePrompt = learningBundle.neuralForge.phases[0].cards[0].prompt.toLowerCase();

    expect(labels.some((label) => label.includes("navigating") && label.includes("online environment"))).toBe(true);
    expect(labels.some((label) => label.includes("time management"))).toBe(true);
    expect(labels.some((label) => label.includes("study techniques"))).toBe(true);
    expect(labels.some((label) => label.includes("access & wellness support"))).toBe(true);
    expect(labels.some((label) => label.includes("personnel") && label.includes("policies"))).toBe(false);
    expect(labels).not.toContain("module");
    expect(labels).not.toContain("score");
    expect(labels).not.toContain("complete");
    expect(labels).not.toContain("least");
    expect(firstPrompt).not.toContain("score at least");
    expect(firstPrompt).not.toContain("module item");
    expect(forgePrompt).not.toContain("score at least");
    expect(learningBundle.neuralForge.ambientPrimers[0]?.toLowerCase()).not.toContain("module item");
    expect(learningBundle.neuralForge.ambientPrimers[0]?.toLowerCase()).not.toContain("core working ideas");
    expect(learningBundle.concepts.every((concept) => !concept.mnemonic.toLowerCase().includes("becomes unstable"))).toBe(true);
    expect(learningBundle.concepts.every((concept) => !concept.mnemonic.toLowerCase().includes("stands for"))).toBe(true);
    expect(learningBundle.concepts.every((concept) => concept.mnemonic === "" || (concept.mnemonic.length >= 20 && concept.mnemonic.length <= 200))).toBe(true);
    expect(learningBundle.concepts.every((concept) => !/\{[^}]+\}/.test(concept.mnemonic))).toBe(true);
  });

  it("blocks upload UI labels from surfacing as concepts", () => {
    const bundle = createManualCaptureBundle({
      title: "Imported source",
      text: [
        "Utilitarianism judges actions by their consequences for everyone affected.",
        "Virtue ethics focuses on the character traits a person is developing through action.",
        "Moral relativism argues that moral truth depends on cultural or individual standpoints."
      ].join(" ")
    });

    const learningBundle = buildLearningBundle(bundle);
    const labels = learningBundle.concepts.map((concept) => concept.label.toLowerCase());

    expect(labels).not.toContain("imported source");
    expect(labels).not.toContain("local.learning");
  });

  it("does not promote a single-document bundle title over explicit study concepts", () => {
    const bundle = createManualCaptureBundle({
      title: "AEONTHRA Ethics Demo",
      text: [
        "Utilitarianism is the view that actions should maximize overall well-being.",
        "Deontology is the view that duties should constrain action even when outcomes tempt us otherwise.",
        "Virtue ethics is the approach that asks what kind of person a choice helps someone become."
      ].join(" ")
    });

    const learningBundle = buildLearningBundle(bundle);
    const labels = learningBundle.concepts.map((concept) => concept.label.toLowerCase());

    expect(labels).not.toContain("aeonthra ethics demo");
    expect(labels.some((label) => label.includes("utilitarianism"))).toBe(true);
    expect(labels.some((label) => label.includes("deontology"))).toBe(true);
  });

  it("keeps confusion and transfer fields grounded in distinct evidence lanes", () => {
    const bundle = createManualCaptureBundle({
      title: "Reinforcement Learning",
      text: [
        "Positive reinforcement is the practice of increasing a behavior by adding a desired stimulus after the behavior occurs.",
        "In classroom management, use positive reinforcement when you want a student to repeat a productive habit after immediate feedback.",
        "Students often confuse positive reinforcement with negative reinforcement because both increase behavior, but one adds a stimulus and the other removes an aversive condition.",
        "Negative reinforcement is the practice of increasing a behavior by removing an aversive condition after the behavior occurs."
      ].join(" ")
    });

    const learningBundle = buildLearningBundle(bundle);
    const concept = learningBundle.concepts.find((entry) => entry.label.toLowerCase().includes("positive reinforcement"));

    expect(concept).toBeDefined();
    expect(concept?.transferHook).toContain("when");
    expect(concept?.transferHook).not.toMatch(/^Use .+ to explain/i);
    expect(concept?.commonConfusion.toLowerCase()).toMatch(/confus|blur|failure mode/);
    expect(concept?.commonConfusion).not.toContain(" is not ");

    const normalizedFields = [
      concept?.definition,
      concept?.summary,
      concept?.primer,
      concept?.transferHook,
      concept?.commonConfusion
    ]
      .filter((entry): entry is string => Boolean(entry))
      .map((entry) => entry.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim());

    expect(new Set(normalizedFields).size).toBe(normalizedFields.length);
  });
});
