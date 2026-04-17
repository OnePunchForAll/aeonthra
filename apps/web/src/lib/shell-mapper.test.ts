import { describe, expect, it } from "vitest";
import { createEmptyBundle, createManualCaptureBundle, type CaptureBundle } from "@learning/schema";
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

  it("does not use negation-only scaffold text as the concept depth panel", () => {
    const bundle = createManualCaptureBundle({
      title: "Ethics Primer",
      text: [
        "Utilitarianism is the view that actions should maximize overall well-being.",
        "It evaluates choices by looking at consequences for everyone affected.",
        "Students should compare outcome-based reasoning with duty-based reasoning without collapsing them together."
      ].join(" ")
    });

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
            transferHook: `Use ${concept.label} to explain why an outcome-based argument chooses one action over another.`
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
    const bundle = createManualCaptureBundle({
      title: "Ethics Primer",
      text: [
        "Utilitarianism is the view that actions should maximize overall well-being.",
        "It evaluates choices by looking at consequences for everyone affected.",
        "Students should compare outcome-based reasoning with duty-based reasoning without collapsing them together."
      ].join(" ")
    });

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
      "Utilitarian reflection essay.",
      "Explain how consequences shape the moral evaluation in the assigned case study.",
      "Discuss why outcome-based reasoning changes the conclusion."
    ].join(" ");
    bundle.items = [{
      id: "assignment-1",
      kind: "assignment",
      title: "Utilitarian Reflection Essay",
      canonicalUrl: "https://canvas.example.test/courses/1/assignments/1",
      plainText: assignmentText,
      excerpt: assignmentText.slice(0, 180),
      headingTrail: ["Module 1"],
      tags: [],
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
    const bundle = createManualCaptureBundle({
      title: "Ethics Primer",
      text: [
        "Utilitarianism evaluates actions by their consequences for everyone affected.",
        "It compares likely harms and benefits across the full group."
      ].join(" ")
    });
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
    const bundle = createManualCaptureBundle({
      title: "Ethics Primer",
      text: [
        "Utilitarianism evaluates actions by their consequences for everyone affected.",
        "It compares likely harms and benefits across the full group."
      ].join(" ")
    });
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
                evidence: [{
                  label: "Primary page",
                  excerpt: "Use outcome-based reasoning to compare the likely harms and benefits.",
                  sourceItemId: sourceItemId!
                }]
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
});
