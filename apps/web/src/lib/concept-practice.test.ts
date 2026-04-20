import { describe, expect, it } from "vitest";
import type { ShellConcept } from "./shell-mapper";
import { buildConceptQuestionPool } from "./concept-practice";

function makeConcept(partial: Partial<ShellConcept>): ShellConcept {
  return {
    id: partial.id ?? "concept",
    name: partial.name ?? "Concept",
    cat: partial.cat ?? "Concept",
    mastery: partial.mastery ?? 0.5,
    core: partial.core ?? "Core concept definition with enough detail to render cleanly.",
    depth: partial.depth ?? "Depth explanation with enough detail to render cleanly.",
    dist: partial.dist ?? "Distinctive contrast sentence that marks where this concept differs.",
    hook: partial.hook ?? "Memorable cue that stays distinct from the definition.",
    trap: partial.trap ?? "Common trap sentence that reflects a real misunderstanding.",
    kw: partial.kw ?? ["concept"],
    conn: partial.conn ?? [],
    dil: partial.dil ?? { text: "Test dilemma.", options: [] },
    tf: partial.tf ?? [],
    mc: partial.mc ?? [],
    practiceReady: partial.practiceReady ?? true,
    practiceSupportLabel: partial.practiceSupportLabel ?? "Source-backed transfer evidence is available."
  };
}

describe("concept practice", () => {
  it("does not fabricate trap or hook questions when those fields are blank", () => {
    const concept = makeConcept({
      id: "primary",
      name: "Primary Concept",
      hook: "",
      trap: "",
      dist: "",
      mc: [],
      tf: []
    });
    const other = makeConcept({
      id: "other",
      name: "Other Concept",
      hook: "",
      dist: "Other concept differs because it centers a different obligation."
    });

    const tfQuestions = buildConceptQuestionPool(concept, [concept, other], "tf");
    const mcQuestions = buildConceptQuestionPool(concept, [concept, other], "mc");

    expect(tfQuestions.some((question) => question.statement.includes("key pitfall"))).toBe(false);
    expect(mcQuestions.some((question) => question.question.includes("memory hook"))).toBe(false);
    expect(mcQuestions.every((question) => question.options.every((option) => !/lens for explaining/i.test(option)))).toBe(true);
  });

  it("dedupes duplicate multiple-choice options while preserving the correct answer", () => {
    const concept = makeConcept({
      mc: [{
        question: "Which line fits this concept?",
        options: [
          "Use consequences to evaluate the action.",
          "Use consequences to evaluate the action.",
          "Ignore the decision context entirely.",
          "Treat every concept as interchangeable."
        ],
        correctIndex: 0,
        explanation: "The consequence-focused line is the right fit."
      }]
    });

    const questions = buildConceptQuestionPool(concept, [concept], "mc");

    expect(questions).toHaveLength(1);
    expect(questions[0]?.options).toEqual([
      "Use consequences to evaluate the action.",
      "Ignore the decision context entirely.",
      "Treat every concept as interchangeable."
    ]);
    expect(questions[0]?.correctIndex).toBe(0);
  });

  it("fails closed when the shell marks practice as unsupported", () => {
    const concept = makeConcept({
      id: "blocked",
      name: "Blocked Concept",
      practiceReady: false,
      practiceSupportLabel: "Practice unlocks after transfer or assignment evidence is captured."
    });

    expect(buildConceptQuestionPool(concept, [concept], "tf")).toEqual([]);
    expect(buildConceptQuestionPool(concept, [concept], "mc")).toEqual([]);
  });
});
