import { createManualCaptureBundle } from "@learning/schema";
import type { BenchmarkFixture } from "../contracts/types.ts";

function combineBundles(title: string, bundles: BenchmarkFixture["bundle"][]): BenchmarkFixture["bundle"] {
  const first = bundles[0]!;
  return {
    schemaVersion: first.schemaVersion,
    source: first.source,
    title,
    capturedAt: first.capturedAt,
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

function htmlBundle(): BenchmarkFixture["bundle"] {
  const bundle = createManualCaptureBundle({
    title: "Article Root",
    text: "Classical conditioning is learning through association between stimuli.",
    canonicalUrl: "https://local.learning/article-root",
    kind: "page"
  });
  bundle.items = bundle.items.map((item) => ({
    ...item,
    html: [
      "<main>",
      "<nav>Course Navigation</nav>",
      "<article>",
      "<header><h1>Classical Conditioning</h1><p>Classical conditioning is learning through association between stimuli.</p></header>",
      "<section><p>Extinction weakens the conditioned response when the conditioned stimulus appears without the unconditioned stimulus.</p></section>",
      "</article>",
      "<footer>Points possible</footer>",
      "</main>"
    ].join("")
  }));
  return bundle;
}

function thinDiscussionBundle(): BenchmarkFixture["bundle"] {
  return combineBundles("Cognitive Load Week 4", [
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
}

function academicWrapperBundle(): BenchmarkFixture["bundle"] {
  return combineBundles("Learning Science Reader", [
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
}

function adminHeavyOrientationBundle(): BenchmarkFixture["bundle"] {
  return combineBundles("Psychology Orientation Capture", [
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
}

export const benchmarkCorpus: BenchmarkFixture[] = [
  {
    bundle: createManualCaptureBundle({
      title: "Week 1",
      text: "You need to have JavaScript enabled in order to access this site.",
      canonicalUrl: "https://local.learning/week-1",
      kind: "page"
    }),
    expectation: {
      fixtureId: "hard-noise-js-disabled",
      summary: "Hard browser/LMS fallback should fail closed.",
      expectedConceptLabels: [],
      suppressedLabels: ["Week 1", "You need to have JavaScript enabled in order to access this site."],
      expectedRelationPairs: [],
      expectedAssignmentTitles: [],
      suppressedAssignmentTitles: ["Week 1"],
      expectedUnknownDueTitles: [],
      readinessTitles: [],
      hardNoiseOnly: true,
      maxVisibleConcepts: 0
    }
  },
  {
    bundle: createManualCaptureBundle({
      title: "Creating Produce New Or",
      text: "Creating Produce New Or",
      canonicalUrl: "https://local.learning/fragment",
      kind: "assignment"
    }),
    expectation: {
      fixtureId: "fragmentary-title",
      summary: "Broken fragments must die.",
      expectedConceptLabels: [],
      suppressedLabels: ["Creating Produce New Or"],
      expectedRelationPairs: [],
      expectedAssignmentTitles: [],
      suppressedAssignmentTitles: ["Creating Produce New Or"],
      expectedUnknownDueTitles: [],
      readinessTitles: [],
      hardNoiseOnly: true,
      maxVisibleConcepts: 0
    }
  },
  {
    bundle: combineBundles("Mixed Positive Reinforcement", [
      createManualCaptureBundle({
        title: "Week 1",
        text: "You need to have JavaScript enabled in order to access this site.",
        canonicalUrl: "https://local.learning/mixed-1",
        kind: "page"
      }),
      createManualCaptureBundle({
        title: "Positive Reinforcement",
        text: [
          "Positive reinforcement is the practice of increasing a behavior by adding a desired stimulus after the behavior occurs.",
          "Use positive reinforcement when you want a student to repeat a productive habit after immediate feedback.",
          "Students often confuse positive reinforcement with negative reinforcement because both increase behavior."
        ].join(" "),
        canonicalUrl: "https://local.learning/mixed-2",
        kind: "page"
      })
    ]),
    expectation: {
      fixtureId: "mixed-noise-and-real-concept",
      summary: "Mixed bundles should preserve the real concept and suppress the junk.",
      expectedConceptLabels: ["Positive Reinforcement"],
      suppressedLabels: ["Week 1", "JavaScript"],
      expectedRelationPairs: [],
      expectedAssignmentTitles: ["Positive Reinforcement"],
      suppressedAssignmentTitles: ["Week 1"],
      expectedUnknownDueTitles: [],
      readinessTitles: [],
      maxVisibleConcepts: 1
    }
  },
  {
    bundle: createManualCaptureBundle({
      title: "Course Capture",
      text: [
        "You need to have JavaScript enabled in order to access this site.",
        "Creating Produce New Or",
        "Positive reinforcement is the practice of increasing a behavior by adding a desired stimulus after the behavior occurs.",
        "Positive reinforcement increases behavior by adding a desired stimulus after the desired action.",
        "Use positive reinforcement when you want a student to repeat a productive habit after immediate feedback."
      ].join(" "),
      canonicalUrl: "https://local.learning/mixed-capture",
      kind: "page"
    }),
    expectation: {
      fixtureId: "single-page-mixed-live-junk",
      summary: "A single mixed page should salvage the grounded concept while suppressing browser junk and fragments.",
      expectedConceptLabels: ["Positive Reinforcement"],
      suppressedLabels: ["JavaScript", "Creating Produce New Or"],
      expectedModuleTitles: ["Positive Reinforcement"],
      suppressedModuleTitles: ["Course Capture"],
      suppressedSkillLabelPrefixes: ["Explain "],
      suppressedChecklistFragments: [
        "You need to have JavaScript enabled in order to access this site",
        "Creating Produce New Or"
      ],
      expectedRelationPairs: [],
      expectedAssignmentTitles: [],
      suppressedAssignmentTitles: [],
      expectedUnknownDueTitles: [],
      readinessTitles: [],
      maxVisibleConcepts: 1
    }
  },
  {
    bundle: combineBundles("Orientation With One Academic Lane", [
      createManualCaptureBundle({
        title: "Reflection Activity",
        text: "Initial post. Respond to classmates. Points possible 10. Module item.",
        canonicalUrl: "https://local.learning/orientation-1",
        kind: "discussion"
      }),
      createManualCaptureBundle({
        title: "Reflection Activity Copy",
        text: "Initial post. Respond to classmates. Points possible 10. Module item.",
        canonicalUrl: "https://local.learning/orientation-2",
        kind: "discussion"
      }),
      createManualCaptureBundle({
        title: "Operant Conditioning",
        text: [
          "Operant conditioning is learning shaped by consequences.",
          "Positive reinforcement increases a behavior by adding a desired stimulus, while negative reinforcement increases a behavior by removing an aversive condition."
        ].join(" "),
        canonicalUrl: "https://local.learning/orientation-3",
        kind: "page"
      })
    ]),
    expectation: {
      fixtureId: "orientation-salvage",
      summary: "Orientation clones should not crowd out the one real academic lane.",
      expectedConceptLabels: ["Operant Conditioning", "Positive Reinforcement", "Negative Reinforcement"],
      suppressedLabels: ["Reflection Activity", "Reflection Activity Copy"],
      expectedModuleTitles: ["Cognitive Load Theory"],
      suppressedModuleTitles: ["Week 4 Discussion Forum", "Reply to Classmates"],
      suppressedSkillLabelPrefixes: ["Explain "],
      expectedRelationPairs: [
        { from: "Positive Reinforcement", to: "Negative Reinforcement", type: "contrasts" }
      ],
      expectedAssignmentTitles: ["Operant Conditioning"],
      suppressedAssignmentTitles: ["Reflection Activity", "Reflection Activity Copy"],
      expectedUnknownDueTitles: [],
      readinessTitles: [],
      maxVisibleConcepts: 3
    }
  },
  {
    bundle: adminHeavyOrientationBundle(),
    expectation: {
      fixtureId: "admin-heavy-orientation-clones",
      summary: "Admin-heavy orientation clones should still preserve the one real academic lane and suppress the rest.",
      expectedConceptLabels: ["Operant Conditioning", "Positive Reinforcement", "Negative Reinforcement"],
      suppressedLabels: ["Reflection Activity", "Reflection Activity Copy", "Start Here"],
      expectedModuleTitles: ["Operant Conditioning"],
      suppressedModuleTitles: ["Reflection Activity", "Reflection Activity Copy", "Start Here"],
      suppressedSkillLabelPrefixes: ["Explain "],
      expectedRelationPairs: [
        { from: "Positive Reinforcement", to: "Negative Reinforcement", type: "contrasts" }
      ],
      expectedAssignmentTitles: ["Operant Conditioning"],
      suppressedAssignmentTitles: ["Reflection Activity", "Reflection Activity Copy", "Start Here"],
      expectedUnknownDueTitles: [],
      readinessTitles: [],
      maxVisibleConcepts: 3
    }
  },
  {
    bundle: createManualCaptureBundle({
      title: "Ethics Primer",
      text: [
        "Utilitarianism is the view that actions should maximize overall well-being.",
        "Deontology is the view that duties constrain action even when outcomes tempt us otherwise.",
        "Utilitarianism and deontology differ because one centers consequences while the other centers duties."
      ].join(" "),
      canonicalUrl: "https://local.learning/ethics-primer",
      kind: "document"
    }),
    expectation: {
      fixtureId: "clean-textbook-ethics",
      summary: "Clean textbook content should produce grounded concepts and contrast relation.",
      expectedConceptLabels: ["Utilitarianism", "Deontology"],
      suppressedLabels: [],
      expectedRelationPairs: [
        { from: "Utilitarianism", to: "Deontology", type: "contrasts" }
      ],
      expectedAssignmentTitles: [],
      suppressedAssignmentTitles: [],
      expectedUnknownDueTitles: [],
      readinessTitles: [],
      maxVisibleConcepts: 2
    }
  },
  {
    bundle: (() => {
      const bundle = createManualCaptureBundle({
        title: "Essay 1",
        text: [
          "Compare utilitarianism and deontology in one case study.",
          "Explain which framework better handles the conflict.",
          "Use one concrete example from the reading."
        ].join(" "),
        canonicalUrl: "https://canvas.example.test/courses/1/assignments/1",
        kind: "assignment"
      });
      bundle.items = bundle.items.map((item) => ({
        ...item,
        dueAt: "2026-04-20T23:59:00.000Z",
        titleSource: "structured"
      }));
      return bundle;
    })(),
    expectation: {
      fixtureId: "trusted-assignment",
      summary: "Structured assignment titles and sane due dates should remain trustworthy.",
      expectedConceptLabels: [],
      suppressedLabels: [],
      expectedRelationPairs: [],
      expectedAssignmentTitles: ["Essay 1"],
      suppressedAssignmentTitles: [],
      expectedUnknownDueTitles: [],
      readinessTitles: ["Essay 1"]
    }
  },
  {
    bundle: (() => {
      const bundle = createManualCaptureBundle({
        title: "Essay 2",
        text: "Explain the difference between positive reinforcement and negative reinforcement.",
        canonicalUrl: "https://canvas.example.test/courses/1/assignments/2",
        kind: "assignment"
      });
      bundle.capturedAt = "2026-04-17T12:00:00.000Z";
      bundle.items = bundle.items.map((item) => ({
        ...item,
        capturedAt: bundle.capturedAt,
        dueAt: "2024-01-06T23:59:00.000Z",
        titleSource: "structured"
      }));
      return bundle;
    })(),
    expectation: {
      fixtureId: "suspicious-date",
      summary: "Suspicious due dates must become unknown, not trusted.",
      expectedConceptLabels: [],
      suppressedLabels: [],
      suppressedChecklistFragments: ["Due in", "Overdue by"],
      expectedRelationPairs: [],
      expectedAssignmentTitles: ["Essay 2"],
      suppressedAssignmentTitles: [],
      expectedUnknownDueTitles: ["Essay 2"],
      readinessTitles: []
    }
  },
  {
    bundle: thinDiscussionBundle(),
    expectation: {
      fixtureId: "thin-discussion-salvage",
      summary: "Thin discussion bundles should salvage the single academic lane and suppress forum wrappers.",
      expectedConceptLabels: ["Cognitive Load Theory"],
      suppressedLabels: ["Week 4 Discussion Forum", "Reply to Classmates"],
      expectedModuleTitles: ["Cognitive Load Theory"],
      suppressedModuleTitles: ["Week 4 Discussion Forum", "Reply to Classmates"],
      suppressedSkillLabelPrefixes: ["Explain "],
      expectedRelationPairs: [],
      expectedAssignmentTitles: ["Cognitive Load Theory"],
      suppressedAssignmentTitles: ["Week 4 Discussion Forum", "Reply to Classmates"],
      expectedUnknownDueTitles: [],
      readinessTitles: [],
      maxVisibleConcepts: 1
    }
  },
  {
    bundle: academicWrapperBundle(),
    expectation: {
      fixtureId: "academic-wrapper-dedupe",
      summary: "Academic wrapper variants should preserve the real concept lane instead of blanking the bundle.",
      expectedConceptLabels: ["Classical Conditioning", "Operant Conditioning"],
      suppressedLabels: ["Overview of Classical Conditioning", "Principles of Classical Conditioning"],
      expectedRelationPairs: [],
      expectedAssignmentTitles: ["Classical Conditioning", "Operant Conditioning"],
      suppressedAssignmentTitles: [],
      expectedUnknownDueTitles: [],
      readinessTitles: []
    }
  },
  {
    bundle: htmlBundle(),
    expectation: {
      fixtureId: "html-article-header",
      summary: "Semantic article/header content should survive wrapper stripping.",
      expectedConceptLabels: ["Classical Conditioning"],
      suppressedLabels: ["Course Navigation"],
      expectedRelationPairs: [],
      expectedAssignmentTitles: ["Article Root"],
      suppressedAssignmentTitles: ["Course Navigation"],
      expectedUnknownDueTitles: [],
      readinessTitles: [],
      maxVisibleConcepts: 1
    }
  }
];
