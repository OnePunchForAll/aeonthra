import { describe, expect, it } from "vitest";
import { createManualCaptureBundle, type CaptureBundle, type EvidenceFragment } from "@learning/schema";
import { buildLearningBundle } from "@learning/content-engine";
import { createEmptyProgress } from "./shell-runtime";
import { deriveWorkspace } from "./workspace";

function combineBundles(title: string, bundles: CaptureBundle[]): CaptureBundle {
  const capturedAt = bundles[0]?.capturedAt ?? new Date().toISOString();
  return {
    schemaVersion: bundles[0]?.schemaVersion ?? "1.0.0",
    source: "manual-import",
    title,
    capturedAt,
    items: bundles.flatMap((bundle) => bundle.items),
    resources: [],
    manifest: {
      itemCount: bundles.reduce((sum, bundle) => sum + bundle.items.length, 0),
      resourceCount: 0,
      captureKinds: Array.from(new Set(bundles.flatMap((bundle) => bundle.manifest.captureKinds))),
      sourceUrls: bundles.flatMap((bundle) => bundle.manifest.sourceUrls)
    }
  };
}

function makeEvidenceFragment(sourceItemId: string, excerpt: string): EvidenceFragment {
  return {
    label: "Source anchor",
    excerpt,
    sourceItemId,
    sourceKind: "assignment",
    sourceOrigin: "source-block",
    sourceType: "summary",
    evidenceScore: 4,
    passReason: "This assignment evidence is grounded in the captured source text."
  };
}

describe("workspace truth gate", () => {
  it("rejects javascript shell text and fragment titles from assignment tasks", () => {
    const jsBundle = createManualCaptureBundle({
      title: "You need to have JavaScript enabled in order to access this site.",
      text: "You need to have JavaScript enabled in order to access this site.",
      canonicalUrl: "https://canvas.example.test/courses/1/assignments/1",
      kind: "assignment"
    });
    const fragmentBundle = createManualCaptureBundle({
      title: "Creating Produce New Or",
      text: "Creating Produce New Or",
      canonicalUrl: "https://canvas.example.test/courses/1/assignments/2",
      kind: "assignment"
    });
    const realBundle = createManualCaptureBundle({
      title: "Compare virtue and duty",
      text: [
        "Compare virtue ethics and deontology with a concrete case from the reading.",
        "Use one source-backed explanation in your response."
      ].join(" "),
      canonicalUrl: "https://canvas.example.test/courses/1/assignments/3",
      kind: "assignment"
    });
    const bundle = combineBundles("Ethics Capture", [jsBundle, fragmentBundle, realBundle]);
    const learning = buildLearningBundle(bundle);
    const workspace = deriveWorkspace(bundle, learning, createEmptyProgress());
    const taskTitles = workspace.tasks.map((task) => task.title);

    expect(taskTitles).toEqual(["Compare virtue and duty"]);
    expect(taskTitles.some((title) => /javascript enabled/i.test(title))).toBe(false);
    expect(taskTitles).not.toContain("Creating Produce New Or");
  });

  it("suppresses wrapper tasks that only inherit concept overlap from real content", () => {
    const wrapperBundle = createManualCaptureBundle({
      title: "Week 4 Discussion Forum",
      text: [
        "Cognitive load theory explains how working memory limits shape instructional design.",
        "Reply to classmates with one example from the reading."
      ].join(" "),
      canonicalUrl: "https://canvas.example.test/courses/1/discussion_topics/4",
      kind: "discussion"
    });
    const conceptBundle = createManualCaptureBundle({
      title: "Cognitive Load Theory",
      text: "Cognitive load theory explains how working memory limits shape instructional design.",
      canonicalUrl: "https://canvas.example.test/courses/1/pages/cognitive-load-theory",
      kind: "page"
    });
    const bundle = combineBundles("Learning Design Capture", [wrapperBundle, conceptBundle]);

    const learning = buildLearningBundle(bundle);
    const workspace = deriveWorkspace(bundle, learning, createEmptyProgress());

    expect(workspace.tasks).toHaveLength(0);
    expect(workspace.tasks.map((task) => task.title)).not.toContain("Week 4 Discussion Forum");
  });

  it("suppresses suspicious due dates instead of surfacing nonsense countdowns", () => {
    const bundle = createManualCaptureBundle({
      title: "Essay 1",
      text: "Compare virtue ethics and deontology with one concrete case from the reading.",
      canonicalUrl: "https://canvas.example.test/courses/1/assignments/9",
      kind: "assignment"
    });
    const capturedAt = "2026-04-17T12:00:00.000Z";
    bundle.capturedAt = capturedAt;
    bundle.items = bundle.items.map((item) => ({
      ...item,
      capturedAt,
      dueAt: "2024-01-06T23:59:00.000Z"
    }));

    const learning = buildLearningBundle(bundle);
    const workspace = deriveWorkspace(bundle, learning, createEmptyProgress());

    expect(workspace.tasks[0]?.dueDate).toBeNull();
  });

  it("prefers projected due dates from assignment mappings over raw-text parsing", () => {
    const bundle = createManualCaptureBundle({
      title: "Essay 1",
      text: [
        "Compare virtue ethics and deontology with one concrete case from the reading.",
        "Due January 6, 2026, 11:59 PM",
        "Use one source-backed explanation in your response."
      ].join(" "),
      canonicalUrl: "https://canvas.example.test/courses/1/assignments/10",
      kind: "assignment"
    });
    const capturedAt = "2026-04-17T12:00:00.000Z";
    bundle.capturedAt = capturedAt;
    bundle.items = bundle.items.map((item) => ({
      ...item,
      capturedAt
    }));

    const learning = buildLearningBundle(bundle);
    const projectedMapping = {
      ...learning.synthesis.assignmentMappings[0]!,
      dueAt: "2026-05-01T23:59:00.000Z",
      dueTrust: 0.96
    } as typeof learning.synthesis.assignmentMappings[number] & {
      dueAt: string;
      dueTrust: number;
    };
    const projectedLearning = {
      ...learning,
      synthesis: {
        ...learning.synthesis,
        assignmentMappings: [projectedMapping]
      }
    };

    const workspace = deriveWorkspace(bundle, projectedLearning, createEmptyProgress());

    expect(workspace.tasks[0]?.dueDate).toBe(Date.parse("2026-05-01T23:59:00.000Z"));
  });

  it("prefers projected assignment mapping titles and checklist lines over generic workspace fallbacks", () => {
    const bundle = createManualCaptureBundle({
      title: "Week 1",
      text: [
        "Goal setting is the process of defining measurable targets and aligning daily work to those targets.",
        "Write a reflection about how goal setting changes your weekly planning."
      ].join(" "),
      canonicalUrl: "https://canvas.example.test/courses/1/assignments/11",
      kind: "assignment"
    });

    const learning = buildLearningBundle(bundle);
    const sourceItemId = bundle.items[0]!.id;
    const conceptId = learning.concepts[0]?.id ?? "goal-setting";
    const mappedLearning = {
      ...learning,
      synthesis: {
        ...learning.synthesis,
        assignmentMappings: [{
          id: sourceItemId,
          sourceItemId,
          title: "Goal Setting Reflection",
          kind: "assignment" as const,
          url: bundle.items[0]!.canonicalUrl,
          dueAt: null,
          dueTrust: {
            state: "rejected" as const,
            score: 0,
            reasons: []
          },
          summary: "Use grounded goal-setting evidence to explain how your weekly plan changes.",
          likelySkills: ["explain"],
          conceptIds: [conceptId],
          focusThemeIds: [],
          readinessEligible: true,
          readinessAcceptanceReasons: ["Goal-setting evidence survived the truth gate."],
          readinessRejectionReasons: [],
          likelyPitfalls: [],
          checklist: ["Explain how goal setting changes your weekly planning."],
          evidence: [makeEvidenceFragment(sourceItemId, "Goal setting is the process of defining measurable targets and aligning daily work to those targets.")]
        }]
      }
    };

    const workspace = deriveWorkspace(bundle, mappedLearning, createEmptyProgress());

    expect(workspace.tasks[0]?.title).toBe("Goal Setting Reflection");
    expect(workspace.tasks[0]?.requirementLines).toEqual(["Explain how goal setting changes your weekly planning."]);
  });

  it("rejects noisy checklist overrides and keeps source-grounded requirements", () => {
    const bundle = createManualCaptureBundle({
      title: "Cognitive Load Theory Reflection",
      text: [
        "Cognitive load theory explains how working memory limits shape instructional design.",
        "Write a response that compares intrinsic and extraneous load."
      ].join(" "),
      canonicalUrl: "https://canvas.example.test/courses/1/assignments/12",
      kind: "assignment"
    });

    const learning = buildLearningBundle(bundle);
    const sourceItemId = bundle.items[0]!.id;
    const conceptId = learning.concepts[0]?.id ?? "cognitive-load-theory";
    const mappedLearning = {
      ...learning,
      synthesis: {
        ...learning.synthesis,
        assignmentMappings: [{
          id: sourceItemId,
          sourceItemId,
          title: "Cognitive Load Theory Reflection",
          kind: "assignment" as const,
          url: bundle.items[0]!.canonicalUrl,
          dueAt: null,
          dueTrust: {
            state: "accepted" as const,
            score: 0.9,
            reasons: []
          },
          summary: "Use grounded cognitive load evidence to explain the design tradeoff.",
          likelySkills: ["explain"],
          conceptIds: [conceptId],
          focusThemeIds: [],
          readinessEligible: true,
          readinessAcceptanceReasons: ["Cognitive load evidence survived the truth gate."],
          readinessRejectionReasons: [],
          likelyPitfalls: [],
          checklist: [
            "You need to have JavaScript enabled in order to access this site.",
            "Select reply within the post.",
            "This checklist item intentionally expands beyond the content of the captured assignment so it should be ignored by the workspace sanitizer because it is noisy, overlong, and not source-grounded."
          ],
          evidence: [makeEvidenceFragment(sourceItemId, "Cognitive load theory explains how working memory limits shape instructional design.")]
        }]
      }
    };

    const workspace = deriveWorkspace(bundle, mappedLearning, createEmptyProgress());

    expect(workspace.tasks[0]?.requirementLines).toEqual([
      "Write a response that compares intrinsic and extraneous load."
    ]);
    expect(workspace.tasks[0]?.requirementLines.some((line) => /javascript enabled/i.test(line))).toBe(false);
  });

  it("ranks chapter and module anchors instead of keeping the first wrapper item", () => {
    const wrapperBundle = createManualCaptureBundle({
      title: "Course Capture",
      text: "Cognitive load theory explains how working memory limits shape instructional design.",
      canonicalUrl: "https://canvas.example.test/courses/1/pages/course-capture",
      kind: "page"
    });
    const anchorBundle = createManualCaptureBundle({
      title: "Cognitive Load Theory",
      text: "Cognitive load theory explains how working memory limits shape instructional design in the classroom.",
      canonicalUrl: "https://canvas.example.test/courses/1/pages/cognitive-load-theory",
      kind: "page"
    });
    wrapperBundle.items[0]!.moduleKey = "module-4";
    anchorBundle.items[0]!.moduleKey = "module-4";
    const bundle = combineBundles("Learning Design Capture", [wrapperBundle, anchorBundle]);

    const learning = buildLearningBundle(bundle);
    const workspace = deriveWorkspace(bundle, learning, createEmptyProgress());

    expect(workspace.chapters[0]?.title).toBe("Cognitive Load Theory");
    expect(workspace.chapters[0]?.sourceItemId).toBe(anchorBundle.items[0]!.id);
    expect(workspace.chapters[0]?.title).not.toBe("Course Capture");
  });

  it("does not promote page content into assignment tasks", () => {
    const pageBundle = createManualCaptureBundle({
      title: "Week 1",
      text: [
        "Goal setting is the process of defining measurable targets and aligning daily work to those targets.",
        "Use this chapter page to frame the concept, not as a submission target."
      ].join(" "),
      canonicalUrl: "https://canvas.example.test/courses/1/pages/1",
      kind: "page"
    });
    const assignmentBundle = createManualCaptureBundle({
      title: "Compare virtue and duty",
      text: [
        "Compare virtue ethics and deontology with a concrete case from the reading.",
        "Use one source-backed explanation in your response."
      ].join(" "),
      canonicalUrl: "https://canvas.example.test/courses/1/assignments/99",
      kind: "assignment"
    });
    const bundle = combineBundles("Ethics Course", [pageBundle, assignmentBundle]);

    const learning = buildLearningBundle(bundle);
    const workspace = deriveWorkspace(bundle, learning, createEmptyProgress());
    const taskTitles = workspace.tasks.map((task) => task.title);

    expect(taskTitles).not.toContain("Week 1");
    expect(taskTitles).toContain("Compare virtue and duty");
  });
});
