import { describe, expect, it } from "vitest";
import { buildAtlasSkillTree, materializeAtlasSkillTree } from "./atlas-skill-tree";

const baseTree = buildAtlasSkillTree({
  concepts: [
    {
      id: "virtue",
      name: "Virtue Ethics",
      core: "Virtue ethics asks what kind of character a choice cultivates.",
      depth: "It evaluates action through habits, exemplars, and stable traits.",
      dist: "It is not reducible to rule compliance or outcome maximization.",
      trap: "Students often flatten virtue ethics into personality preference."
    },
    {
      id: "deontology",
      name: "Deontology",
      core: "Deontology judges action by duties and constraints.",
      depth: "It holds that some actions stay wrong even when outcomes tempt us otherwise.",
      dist: "It separates rule-bound duties from consequence-led tradeoffs.",
      trap: "Students often treat duty as a forecast about good outcomes."
    }
  ],
  assignments: [
    {
      id: "assignment-1",
      title: "Compare virtue and duty",
      con: ["virtue", "deontology"]
    }
  ],
  modules: [
    {
      id: "module-1",
      title: "Chapter 1",
      desc: "Read the chapter, earn the foundation skills, and prove the distinction.",
      concepts: ["virtue", "deontology"]
    }
  ],
  distinctions: [
    {
      a: "virtue",
      b: "deontology",
      label: "Virtue versus duty",
      border: "One asks who you are becoming; the other asks what duty forbids or requires.",
      trap: "They overlap on moral seriousness, which makes them easy to swap."
    }
  ],
  synthesis: {
    focusThemes: [
      {
        id: "theme-1",
        label: "moral reasoning under pressure",
        summary: "Apply the chapter frameworks when cases force a tradeoff.",
        verbs: ["apply"],
        conceptIds: ["virtue", "deontology"]
      }
    ],
    assignmentIntel: [
      {
        sourceItemId: "assignment-1",
        title: "Compare virtue and duty",
        likelySkills: ["compare", "justify"],
        conceptIds: ["virtue", "deontology"],
        focusThemeIds: ["theme-1"],
        summary: "Stay ready to compare the frameworks without collapsing one into the other."
      }
    ],
    likelyAssessedSkills: ["compare virtue and duty"]
  }
});

describe("atlas skill tree", () => {
  it("derives foundational, applied, distinction, readiness, and mastery nodes", () => {
    const kinds = new Set(baseTree.nodes.map((node) => node.kind));

    expect(kinds).toEqual(new Set([
      "foundational",
      "applied",
      "distinction",
      "assignment-readiness",
      "mastery"
    ]));
    expect(baseTree.assignmentRequirements).toEqual([
      expect.objectContaining({
        assignmentId: "assignment-1",
        skillIds: expect.arrayContaining(["skill-ready-assignment-1"])
      })
    ]);
  });

  it("keeps downstream nodes locked until prerequisite skills are earned", () => {
    const materialized = materializeAtlasSkillTree(baseTree, {
      conceptMastery: {},
      chapterCompletion: {}
    });
    const foundation = materialized.nodes.find((node) => node.id === "skill-foundation-virtue");
    const nextFoundation = materialized.nodes.find((node) => node.id === "skill-foundation-deontology");
    const readiness = materialized.nodes.find((node) => node.id === "skill-ready-assignment-1");

    expect(foundation?.state).toBe("available");
    expect(nextFoundation?.state).toBe("locked");
    expect(readiness?.state).toBe("locked");
    expect(readiness?.missingPrerequisiteIds.length).toBeGreaterThan(0);
  });

  it("earns assignment-readiness only after concept and chapter progress clear the thresholds", () => {
    const materialized = materializeAtlasSkillTree(baseTree, {
      conceptMastery: {
        virtue: 0.82,
        deontology: 0.78
      },
      chapterCompletion: {
        "module-1": 0.84
      }
    });
    const readiness = materialized.nodes.find((node) => node.id === "skill-ready-assignment-1");
    const mastery = materialized.nodes.find((node) => node.id === "skill-mastery-module-1");

    expect(readiness?.state).toBe("earned");
    expect(readiness?.progress).toBeGreaterThan(0.7);
    expect(mastery?.state === "earned" || mastery?.state === "mastered").toBe(false);
  });
});
