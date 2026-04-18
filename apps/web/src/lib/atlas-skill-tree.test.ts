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
      con: ["virtue", "deontology"],
      requirementLines: [
        "Compare virtue ethics and deontology with a concrete case from the reading."
      ]
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
        checklist: ["Support the comparison with course evidence."],
        likelyPitfalls: ["Do not collapse duty into consequences."],
        evidence: [{
          label: "Assignment prompt",
          excerpt: "Compare virtue ethics and deontology with a concrete case.",
          sourceItemId: "assignment-1",
          sourceKind: "assignment",
          sourceOrigin: "source-block",
          sourceType: "prompt",
          evidenceScore: 4,
          passReason: "This assignment prompt stayed visible because it survived the truth gate."
        }],
        summary: "Stay ready to compare the frameworks without collapsing one into the other."
      }
    ],
    likelyAssessedSkills: ["compare virtue and duty"]
  }
});

describe("atlas skill tree", () => {
  it("derives foundational, applied, distinction, transfer, reward, readiness, and mastery nodes", () => {
    const kinds = new Set(baseTree.nodes.map((node) => node.kind));
    const assignmentRequirement = baseTree.assignmentRequirements.find(
      (requirement) => requirement.assignmentId === "assignment-1"
    );

    expect(kinds).toEqual(new Set([
      "foundational",
      "applied",
      "distinction",
      "transfer",
      "assignment-readiness",
      "chapter-reward",
      "mastery"
    ]));
    expect(assignmentRequirement?.skillIds).toEqual(expect.arrayContaining([
      "skill-foundation-virtue",
      "skill-foundation-deontology",
      "skill-transfer-assignment-1",
      "skill-ready-assignment-1"
    ]));
    expect(baseTree.nodes.find((node) => node.id === "skill-transfer-assignment-1")).toMatchObject({
      branchId: "module-1",
      tier: 3
    });
    expect(baseTree.nodes.find((node) => node.id === "skill-chapter-reward-module-1")).toMatchObject({
      kind: "chapter-reward",
      branchId: "module-1",
      tier: 5
    });
    expect(assignmentRequirement).toMatchObject({
      basis: "captured-requirements",
      conceptIds: ["virtue", "deontology"],
      focusThemeIds: ["theme-1"],
      checklist: [
        "Compare virtue ethics and deontology with a concrete case from the reading.",
        "Support the comparison with course evidence."
      ],
      pitfalls: ["Do not collapse duty into consequences."]
    });
    expect(assignmentRequirement?.evidence[0]?.sourceItemId).toBe("assignment-1");
  });

  it("keeps readiness locked until prerequisite skills are earned while leaving foundations available", () => {
    const materialized = materializeAtlasSkillTree(baseTree, {
      conceptMastery: {},
      chapterCompletion: {},
      skillHistory: {}
    });
    const foundation = materialized.nodes.find((node) => node.id === "skill-foundation-virtue");
    const nextFoundation = materialized.nodes.find((node) => node.id === "skill-foundation-deontology");
    const readiness = materialized.nodes.find((node) => node.id === "skill-ready-assignment-1");

    expect(foundation?.state).toBe("available");
    expect(nextFoundation?.state).toBe("available");
    expect(readiness?.state).toBe("locked");
    expect(readiness?.missingPrerequisiteIds.length).toBeGreaterThan(0);
    expect(materialized.summary.locked).toBeGreaterThan(0);
  });

  it("earns assignment-readiness only after concept and chapter progress clear the thresholds", () => {
    const materialized = materializeAtlasSkillTree(baseTree, {
      conceptMastery: {
        virtue: 0.82,
        deontology: 0.78
      },
      chapterCompletion: {
        "module-1": 0.84
      },
      skillHistory: {}
    });
    const readiness = materialized.nodes.find((node) => node.id === "skill-ready-assignment-1");
    const mastery = materialized.nodes.find((node) => node.id === "skill-mastery-module-1");

    expect(readiness?.state).toBe("earned");
    expect(readiness?.progress).toBeGreaterThan(0.7);
    expect(mastery?.state === "earned" || mastery?.state === "mastered").toBe(false);
  });

  it("requires skill history before re-opening a node as recovery", () => {
    const withoutHistory = materializeAtlasSkillTree(baseTree, {
      conceptMastery: {
        virtue: 0.45
      },
      chapterCompletion: {
        "module-1": 0.55
      },
      skillHistory: {}
    });
    const withHistory = materializeAtlasSkillTree(baseTree, {
      conceptMastery: {
        virtue: 0.45
      },
      chapterCompletion: {
        "module-1": 0.55
      },
      skillHistory: {
        "skill-foundation-virtue": true
      }
    });

    expect(withoutHistory.nodes.find((node) => node.id === "skill-foundation-virtue")?.state).toBe("in-progress");
    expect(withHistory.nodes.find((node) => node.id === "skill-foundation-virtue")?.state).toBe("recovery");
  });

  it("keeps valid nodes renderable through fallback groups when no modules are present", () => {
    const orphanTree = buildAtlasSkillTree({
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
          con: ["virtue", "deontology"],
          requirementLines: [
            "Compare virtue ethics and deontology with a concrete case from the reading."
          ]
        }
      ],
      modules: [],
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
            checklist: ["Support the comparison with course evidence."],
            likelyPitfalls: ["Do not collapse duty into consequences."],
            evidence: [
              {
                label: "Assignment prompt",
                excerpt: "Compare virtue ethics and deontology with a concrete case.",
                sourceItemId: "assignment-1",
                sourceKind: "assignment",
                sourceOrigin: "source-block",
                sourceType: "prompt",
                evidenceScore: 4,
                passReason: "This assignment prompt stayed visible because it survived the truth gate."
              }
            ],
            summary: "Stay ready to compare the frameworks without collapsing one into the other."
          }
        ],
        likelyAssessedSkills: ["compare virtue and duty"]
      }
    });

    const groupedNodeIds = new Set(orphanTree.groups.flatMap((group) => group.skillIds));

    expect(orphanTree.groups.length).toBeGreaterThan(0);
    expect(orphanTree.groups.every((group) => group.moduleId === null)).toBe(true);
    expect(groupedNodeIds.size).toBe(orphanTree.nodes.length);
    expect([...groupedNodeIds].sort()).toEqual(orphanTree.nodes.map((node) => node.id).sort());
    expect(groupedNodeIds.has("skill-ready-assignment-1")).toBe(true);
    expect(groupedNodeIds.has("skill-transfer-assignment-1")).toBe(true);
  });
});
