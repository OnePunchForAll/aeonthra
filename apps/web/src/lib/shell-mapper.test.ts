import { describe, expect, it } from "vitest";
import { createManualCaptureBundle } from "@learning/schema";
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
    mc: partial.mc ?? []
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
    const mappedConcept = shellData.concepts.find((concept) => concept.id === target?.id);

    expect(mappedConcept?.depth).toBe("It compares actions by their expected consequences for everyone affected.");
    expect(mappedConcept?.depth).not.toContain("Keep their main moves separate");
  });
});
