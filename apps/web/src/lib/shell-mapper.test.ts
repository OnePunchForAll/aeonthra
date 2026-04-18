import { describe, expect, it } from "vitest";
import { createEmptyBundle, createManualCaptureBundle, type CaptureBundle, type EvidenceFragment } from "@learning/schema";
import { buildLearningBundle } from "@learning/content-engine";
import { mapToShellData, resolveDominantShellConceptId, type ShellConcept, type ShellReading } from "./shell-mapper";
import { deriveWorkspace } from "./workspace";
import { createEmptyProgress } from "./shell-runtime";

function makeShellConcept(partial: Partial<ShellConcept>): ShellConcept {
  return {
    id: partial.id ?? "concept",
    name: partial.name ?? "Concept",
    cat: partial.cat ?? "Concept",
    core: partial.core ?? "Core concept definition.",
    depth: partial.depth ?? "Depth explanation with enough detail to be rendered.",
    dist: partial.dist ?? "Boundary text that distinguishes this concept from nearby ones.",
    hook: partial.hook ?? "Memory hook with enough detail to be rendered clearly.",
    trap: partial.trap ?? "Common trap text with enough detail to be rendered clearly.",
    kw: partial.kw ?? ["concept"],
    conn: partial.conn ?? [],
    dil: partial.dil ?? {
      text: "Test dilemma.",
      options: []
    },
    tf: partial.tf ?? [],
    mc: partial.mc ?? [],
    practiceReady: partial.practiceReady ?? true,
    practiceSupportLabel: partial.practiceSupportLabel ?? "Source-backed transfer evidence is available."
  };
}

function makeReading(sectionBody: string, conceptIds: string[]): ShellReading {
  return {
    id: "reading-1",
    module: "module-1",
    title: "Week 3 Ethics",
    subtitle: "Chapter 1",
    type: "chapter",
    concepts: conceptIds,
    assignments: [],
    sections: [
      {
        heading: "Focused section",
        body: sectionBody
      }
    ]
  };
}

function makeEvidenceFragment(sourceItemId: string, excerpt: string): EvidenceFragment {
  return {
    label: "Source anchor",
    excerpt,
    sourceItemId,
    sourceKind: "page",
    sourceOrigin: "source-block",
    sourceType: "summary",
    evidenceScore: 4,
    passReason: "This test evidence stays visible because it survives the truth gate."
  };
}

function createGroundedUtilitarianBundle(kind: "page" | "assignment" = "page") {
  return createManualCaptureBundle({
    title: kind === "assignment" ? "Utilitarian Reflection Essay" : "Ethics Primer",
    text: [
      "Utilitarianism is the view that actions should maximize overall well-being.",
      "Utilitarianism evaluates choices by comparing consequences for everyone affected.",
      "Utilitarianism asks which action produces the best total outcome for the group.",
      "Use utilitarianism when a task asks you to compare likely harms and benefits."
    ].join(" "),
    canonicalUrl: kind === "assignment"
      ? "https://canvas.example.test/courses/1/assignments/1"
      : "https://local.learning/ethics-primer",
    kind
  });
}

describe("shell mapper", () => {
  it("prefers the dominant section concept instead of the first candidate id", () => {
    const duty = makeShellConcept({
      id: "duty",
      name: "Duty Ethics",
      core: "Duty ethics judges actions by rules and obligations.",
      hook: "Look for duties, obligations, and rules before judging the action.",
      trap: "Do not collapse duty ethics into outcome-chasing.",
      kw: ["duty", "obligation", "rule"]
    });
    const utility = makeShellConcept({
      id: "utility",
      name: "Utilitarianism",
      core: "Utilitarianism judges actions by overall well-being and consequences.",
      hook: "Look for consequences and the greatest overall well-being.",
      trap: "Do not confuse utilitarianism with rule-based duty ethics.",
      kw: ["consequences", "well-being", "outcomes"]
    });
    const reading = makeReading(
      "Utilitarianism asks which action produces the best outcomes and the greatest overall well-being for everyone affected.",
      ["duty", "utility"]
    );

    expect(resolveDominantShellConceptId(reading, reading.sections[0], [duty, utility])).toBe("utility");
  });

  it("fails closed when a section is too ambiguous to pick one concept truthfully", () => {
    const duty = makeShellConcept({
      id: "duty",
      name: "Duty Ethics",
      core: "Duty ethics judges actions by rules and obligations.",
      hook: "Look for duties, obligations, and rules before judging the action.",
      trap: "Do not collapse duty ethics into outcome-chasing.",
      kw: ["duty", "obligation", "rule"]
    });
    const utility = makeShellConcept({
      id: "utility",
      name: "Utilitarianism",
      core: "Utilitarianism judges actions by overall well-being and consequences.",
      hook: "Look for consequences and the greatest overall well-being.",
      trap: "Do not confuse utilitarianism with rule-based duty ethics.",
      kw: ["consequences", "well-being", "outcomes"]
    });
    const reading = makeReading(
      "Compare the two ethical frameworks and explain how each guides the discussion.",
      ["duty", "utility"]
    );

    expect(resolveDominantShellConceptId(reading, reading.sections[0], [duty, utility])).toBeNull();
  });

  it("does not infer a dominant concept from shell-authored core or depth text alone", () => {
    const duty = makeShellConcept({
      id: "duty",
      name: "Duty Ethics",
      core: "Duty ethics judges actions by rules and obligations.",
      depth: "It focuses on rule-bound duties rather than outcome maximization.",
      kw: ["deontology"]
    });
    const utility = makeShellConcept({
      id: "utility",
      name: "Utilitarianism",
      core: "Utilitarianism judges actions by overall well-being and consequences.",
      depth: "It weighs outcomes for everyone affected.",
      kw: ["utilitarianism"]
    });
    const reading = makeReading(
      "This section says actions should be judged by rules and obligations, but it never names a framework directly.",
      ["duty", "utility"]
    );

    expect(resolveDominantShellConceptId(reading, reading.sections[0], [duty, utility])).toBeNull();
  });

  it("keeps relation-backed concept links and distinctions intact through indexed lookups", () => {
    const bundle = createGroundedUtilitarianBundle();
    const learning = buildLearningBundle(bundle);
    const primary = learning.concepts[0];
    const sourceItemId = bundle.items[0]?.id;

    expect(primary).toBeDefined();
    expect(sourceItemId).toBeDefined();

    const secondary = {
      ...primary,
      id: "consequentialism",
      label: "Consequentialism",
      summary: "Consequentialism weighs outcomes to judge actions.",
      definition: "Consequentialism weighs actions by their consequences.",
      excerpt: "Consequentialism weighs actions by their consequences.",
      relatedConceptIds: [primary!.id],
      sourceItemIds: [sourceItemId!],
      keywords: ["consequences", "outcomes"],
      fieldSupport: {
        ...primary!.fieldSupport,
        definition: {
          quality: "supported" as const,
          supportScore: 2,
          passReason: "Definition evidence stays grounded.",
          evidence: [makeEvidenceFragment(sourceItemId!, "Consequentialism weighs actions by their consequences.")]
        }
      }
    };

    const mappedLearning = {
      ...learning,
      concepts: [primary!, secondary],
      relations: [{
        fromId: primary!.id,
        toId: secondary.id,
        type: "contrasts" as const,
        label: "Consequentialism weighs consequences differently.",
        strength: 0.8,
        evidence: [makeEvidenceFragment(sourceItemId!, "Consequentialism weighs actions by their consequences.")]
      }],
      synthesis: {
        ...learning.synthesis,
        stableConceptIds: [primary!.id, secondary.id]
      }
    };

    const workspace = deriveWorkspace(bundle, mappedLearning, createEmptyProgress());
    const shellData = mapToShellData(bundle, mappedLearning, workspace);

    expect(shellData.concepts.find((concept) => concept.id === primary!.id)?.conn).toContain(secondary.id);
    expect(shellData.dists.some((distinction) => distinction.label.includes("Consequentialism"))).toBe(true);
  });

  it("does not use negation-only scaffold text as the concept depth panel", () => {
    const bundle = createGroundedUtilitarianBundle();

    const learning = buildLearningBundle(bundle);
    const target = learning.concepts[0];

    expect(target).toBeDefined();

    const mappedLearning = {
      ...learning,
      concepts: learning.concepts.map((concept, index) => (index === 0
        ? {
            ...concept,
            primer: `${concept.label} is not Duty Ethics. Keep their main moves separate.`,
            summary: "It compares actions by their expected consequences for everyone affected.",
            excerpt: "It compares actions by their expected consequences for everyone affected.",
            transferHook: `Use ${concept.label} to explain why an outcome-based argument chooses one action over another.`,
            fieldSupport: {
              ...concept.fieldSupport,
              summary: {
                quality: "supported" as const,
                supportScore: 2,
                passReason: "Supported summary evidence should outrank scaffold primer text.",
                evidence: [makeEvidenceFragment(
                  bundle.items[0]!.id,
                  "Utilitarianism evaluates choices by comparing consequences for everyone affected."
                )]
              }
            }
          }
        : concept))
    };

    const workspace = deriveWorkspace(bundle, mappedLearning, createEmptyProgress());
    const shellData = mapToShellData(bundle, mappedLearning, workspace);
    expect(shellData.concepts.length).toBeGreaterThan(0);
    const mappedConcept = shellData.concepts[0];

    expect(mappedConcept?.depth).toBe("It compares actions by their expected consequences for everyone affected.");
    expect(mappedConcept?.depth).not.toContain("Keep their main moves separate");
  });

  it("keeps the shell hook blank when only the transfer hook exists", () => {
    const bundle = createGroundedUtilitarianBundle();

    const learning = buildLearningBundle(bundle);
    const target = learning.concepts[0];

    expect(target).toBeDefined();

    const mappedLearning = {
      ...learning,
      concepts: learning.concepts.map((concept, index) => (index === 0
        ? {
            ...concept,
            mnemonic: "",
            transferHook: `Use ${concept.label} to explain why an outcome-based argument chooses one action over another.`,
            commonConfusion: "Do not flatten utilitarian reasoning into duty-based reasoning."
          }
        : concept))
    };

    const workspace = deriveWorkspace(bundle, mappedLearning, createEmptyProgress());
    const shellData = mapToShellData(bundle, mappedLearning, workspace);
    expect(shellData.concepts.length).toBeGreaterThan(0);
    const mappedConcept = shellData.concepts[0];

    expect(mappedConcept?.hook).toBe("");
  });

  it("keeps thin assignment surfaces blank and uses concept names in quick prep", () => {
    const bundle: CaptureBundle = createEmptyBundle("Ethics Course");
    const assignmentText = [
      "Utilitarianism is the view that actions should maximize overall well-being.",
      "Explain how utilitarianism compares consequences in the assigned case study.",
      "Discuss why utilitarian reasoning changes the conclusion for everyone affected."
    ].join(" ");
    bundle.items = [{
      id: "assignment-1",
      kind: "assignment",
      title: "Utilitarian Reflection Essay",
      titleSource: "structured",
      canonicalUrl: "https://canvas.example.test/courses/1/assignments/1",
      plainText: assignmentText,
      excerpt: assignmentText.slice(0, 180),
      headingTrail: ["Module 1"],
      tags: [],
      submissionTypes: [],
      capturedAt: bundle.capturedAt,
      contentHash: "assignment-hash"
    }];
    bundle.manifest = {
      itemCount: 1,
      resourceCount: 0,
      captureKinds: ["assignment"],
      sourceUrls: ["https://canvas.example.test/courses/1/assignments/1"]
    };

    const learning = buildLearningBundle(bundle);
    const primaryConcept = learning.concepts[0];

    expect(primaryConcept).toBeDefined();

    const mappedLearning = {
      ...learning,
      concepts: learning.concepts.map((concept, index) => (index === 0
        ? {
            ...concept,
            score: 80,
            id: "utilitarianism",
            label: "Utilitarianism",
            summary: "Utilitarianism evaluates actions by their consequences for everyone affected.",
            definition: "Utilitarianism evaluates actions by their consequences for everyone affected.",
            excerpt: "Utilitarianism evaluates actions by their consequences for everyone affected.",
            keywords: ["utilitarianism", "consequences"],
            sourceItemIds: ["assignment-1"]
          }
        : concept))
    };

    const workspace = deriveWorkspace(bundle, mappedLearning, createEmptyProgress());
    const shellData = mapToShellData(bundle, mappedLearning, workspace);
    const assignment = shellData.assignments[0];

    expect(assignment).toBeDefined();
    expect(assignment?.failModes).toEqual([]);
    expect(assignment?.evidence).toBe("");
    expect(assignment?.quickPrep).toBe("Review Utilitarianism.");
  });

  it("keeps practice blank in real workspaces when there is no transfer or assignment evidence", () => {
    const bundle = createGroundedUtilitarianBundle();
    const learning = buildLearningBundle(bundle);
    const target = learning.concepts[0];

    expect(target).toBeDefined();

    const mappedLearning = {
      ...learning,
      concepts: learning.concepts.map((concept, index) => (index === 0
        ? {
            ...concept,
            score: 80,
            id: "utilitarianism",
            label: "Utilitarianism",
            summary: "Utilitarianism evaluates actions by their consequences for everyone affected.",
            definition: "Utilitarianism evaluates actions by their consequences for everyone affected.",
            excerpt: "Utilitarianism evaluates actions by their consequences for everyone affected.",
            keywords: ["utilitarianism", "consequences"],
            sourceItemIds: [bundle.items[0]!.id],
            transferHook: `Use ${concept.label} to explain why consequences decide the case.`,
            fieldSupport: {
              ...concept.fieldSupport,
              transferHook: {
                quality: "weak" as const,
                supportScore: 0,
                passReason: "Weak transfer evidence should keep practice gated.",
                evidence: []
              }
            }
          }
        : concept)),
      synthesis: {
        ...learning.synthesis,
        assignmentMappings: []
      }
    };

    const workspace = deriveWorkspace(bundle, mappedLearning, createEmptyProgress());
    const shellData = mapToShellData(bundle, mappedLearning, workspace);
    expect(shellData.concepts.length).toBeGreaterThan(0);
    const mappedConcept = shellData.concepts[0];

    expect(mappedConcept?.practiceReady).toBe(false);
    expect(mappedConcept?.practiceSupportLabel).toMatch(/Practice unlocks/);
    expect(mappedConcept?.dil).toBeNull();
    expect(mappedConcept?.tf).toEqual([]);
    expect(mappedConcept?.mc).toEqual([]);
  });

  it("unlocks practice when transfer evidence or assignment evidence is source-backed", () => {
    const bundle = createGroundedUtilitarianBundle();
    const learning = buildLearningBundle(bundle);
    const target = learning.concepts[0];
    const sourceItemId = bundle.items[0]?.id;

    expect(target).toBeDefined();
    expect(sourceItemId).toBeDefined();

    const mappedLearning = {
      ...learning,
      concepts: learning.concepts.map((concept, index) => (index === 0
        ? {
            ...concept,
            score: 80,
            id: "utilitarianism",
            label: "Utilitarianism",
            summary: "Utilitarianism evaluates actions by their consequences for everyone affected.",
            definition: "Utilitarianism evaluates actions by their consequences for everyone affected.",
            excerpt: "Utilitarianism evaluates actions by their consequences for everyone affected.",
            keywords: ["utilitarianism", "consequences"],
            sourceItemIds: [sourceItemId!],
            transferHook: `Use ${concept.label} to explain why consequences decide the case.`,
            fieldSupport: {
              ...concept.fieldSupport,
              transferHook: {
                quality: "supported" as const,
                supportScore: 2,
                passReason: "Supported transfer evidence should unlock practice.",
                evidence: [makeEvidenceFragment(
                  sourceItemId!,
                  "Use outcome-based reasoning to compare the likely harms and benefits."
                )]
              }
            }
          }
        : concept))
    };

    const workspace = deriveWorkspace(bundle, mappedLearning, createEmptyProgress());
    const shellData = mapToShellData(bundle, mappedLearning, workspace);
    expect(shellData.concepts.length).toBeGreaterThan(0);
    const mappedConcept = shellData.concepts[0];

    expect(mappedConcept?.practiceReady).toBe(true);
    expect(mappedConcept?.dil).not.toBeNull();
    expect(mappedConcept?.tf.length).toBeGreaterThan(0);
    expect(mappedConcept?.mc.length).toBeGreaterThan(0);
  });

  it("surfaces unknown due labels when a structured due date is suspicious", () => {
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
    const shellData = mapToShellData(bundle, learning, workspace);

    expect(workspace.tasks[0]?.dueDate).toBeNull();
    expect(shellData.assignments[0]).toMatchObject({
      dueState: "unknown",
      dueLabel: "Date not captured"
    });
  });

  it("prefers grounded assignment mapping over generic workspace titles and checklists", () => {
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
    const conceptId = learning.concepts[0]?.id ?? "goal-setting";
    const sourceItemId = bundle.items[0]!.id;
    const mappedLearning = {
      ...learning,
      synthesis: {
        ...learning.synthesis,
        stableConceptIds: [conceptId],
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
          likelySkills: ["explain", "apply"],
          conceptIds: [conceptId],
          focusThemeIds: [],
          readinessEligible: true,
          readinessAcceptanceReasons: ["Goal-setting evidence survived the truth gate."],
          readinessRejectionReasons: [],
          likelyPitfalls: ["Do not drift into generic motivation advice without tying it to goal setting evidence."],
          checklist: ["Explain how goal setting changes your weekly planning."],
          evidence: [makeEvidenceFragment(sourceItemId, "Goal setting is the process of defining measurable targets and aligning daily work to those targets.")]
        }]
      }
    };

    const workspace = deriveWorkspace(bundle, mappedLearning, createEmptyProgress());
    const shellData = mapToShellData(bundle, mappedLearning, workspace);
    const assignment = shellData.assignments[0];

    expect(workspace.tasks[0]?.title).toBe("Goal Setting Reflection");
    expect(assignment?.title).toBe("Goal Setting Reflection");
    expect(assignment?.requirementLines).toEqual(["Explain how goal setting changes your weekly planning."]);
    expect(assignment?.evidence).toContain("Goal setting is the process");
    expect(assignment?.sub).not.toBe("Goal Setting Reflection");
  });

  it("suppresses concept cards and Atlas nodes when definition provenance is missing", () => {
    const bundle = createGroundedUtilitarianBundle();
    const learning = buildLearningBundle(bundle);
    const target = learning.concepts[0];

    expect(target).toBeDefined();

    const mappedLearning = {
      ...learning,
      concepts: learning.concepts.map((concept, index) => (index === 0
        ? {
            ...concept,
            fieldSupport: {
              ...concept.fieldSupport,
              definition: {
                quality: "weak" as const,
                supportScore: 0,
                passReason: "Definition evidence was removed to verify fail-closed concept rendering.",
                evidence: []
              }
            }
          }
        : concept)),
      synthesis: {
        ...learning.synthesis,
        stableConceptIds: learning.concepts.map((concept) => concept.id)
      }
    };

    const workspace = deriveWorkspace(bundle, mappedLearning, createEmptyProgress());
    const shellData = mapToShellData(bundle, mappedLearning, workspace);

    expect(shellData.concepts.find((concept) => concept.id === target?.id)).toBeUndefined();
    expect(shellData.skillTree.nodes.some((node) => node.conceptIds.includes(target?.id ?? ""))).toBe(false);
  });
});
