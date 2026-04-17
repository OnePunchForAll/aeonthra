import { describe, expect, it } from "vitest";
import type { AtlasSkillTree } from "./atlas-skill-tree";
import { buildAtlasSkillTree, materializeAtlasSkillTree } from "./atlas-skill-tree";
import {
  buildAtlasNodeInspector,
  buildAtlasShellProjection,
  formatAtlasSkillKindLabel,
  getChapterRewardStateLabel
} from "./atlas-shell";
import type { ShellAssignment } from "./shell-mapper";

const shellAssignment = (id: string, title: string, conceptIds: string[]): ShellAssignment => ({
  id,
  title,
  sub: title,
  type: "📝",
  due: 3,
  pts: 10,
  con: conceptIds,
  tip: "",
  reallyAsking: "",
  demand: "Compare",
  demandIcon: "⚖",
  secretCare: "",
  failModes: [],
  evidence: "",
  quickPrep: "",
  requirementLines: [],
  skills: []
});

const courseAssignments = [
  shellAssignment("assignment-1", "Compare virtue and duty", ["virtue", "deontology"])
];

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
        evidence: [
          {
            label: "Assignment prompt",
            excerpt: "Compare virtue ethics and deontology with a concrete case.",
            sourceItemId: "assignment-1"
          }
        ],
        summary: "Stay ready to compare the frameworks without collapsing one into the other."
      }
    ],
    likelyAssessedSkills: ["compare virtue and duty"]
  }
});

describe("atlas shell projection", () => {
  it("materializes building and ready assignment states from the skill graph", () => {
    const building = buildAtlasShellProjection({
      skillTree: baseTree,
      assignments: courseAssignments,
      progress: {
        conceptMastery: {
          virtue: 0.82,
          deontology: 0.45
        },
        chapterCompletion: {
          "module-1": 0.84
        },
        skillHistory: {}
      }
    });
    const ready = buildAtlasShellProjection({
      skillTree: baseTree,
      assignments: courseAssignments,
      progress: {
        conceptMastery: {
          virtue: 0.82,
          deontology: 0.78
        },
        chapterCompletion: {
          "module-1": 0.84
        },
        skillHistory: {}
      }
    });

    expect(building.assignmentReadinessById.get("assignment-1")).toMatchObject({
      status: "building",
      label: expect.stringMatching(/^\d+%$/)
    });
    expect(building.assignmentReadinessById.get("assignment-1")?.missingSkills.length).toBeGreaterThan(0);
    expect(ready.assignmentReadinessById.get("assignment-1")).toMatchObject({
      status: "ready",
      label: expect.stringMatching(/^\d+%$/),
      readiness: expect.any(Number)
    });
    expect(ready.assignmentReadinessById.get("assignment-1")?.missingSkills).toEqual([]);
  });

  it("falls back to concept-prep or unmapped when no skill chain is available", () => {
    const conceptOnlyTree: AtlasSkillTree = {
      nodes: [],
      groups: [],
      chapterRewards: [],
      assignmentRequirements: [
        {
          assignmentId: "concept-only",
          title: "Concept prep only",
          summary: "Concept evidence exists, but no skill chain has been derived.",
          skillIds: [],
          basis: "concept-only",
          conceptIds: ["virtue"],
          focusThemeIds: [],
          checklist: [],
          pitfalls: [],
          evidence: []
        }
      ]
    };
    const projection = buildAtlasShellProjection({
      skillTree: conceptOnlyTree,
      assignments: [
        shellAssignment("concept-only", "Concept prep only", ["virtue"]),
        shellAssignment("no-map", "Still unmapped", ["virtue"])
      ],
      progress: {
        conceptMastery: {},
        chapterCompletion: {},
        skillHistory: {}
      }
    });

    expect(projection.assignmentReadinessById.get("concept-only")).toMatchObject({
      status: "concept-prep",
      label: "Concept Prep",
      progressPercent: 0
    });
    expect(projection.assignmentReadinessById.get("no-map")).toMatchObject({
      status: "unmapped",
      label: "Unmapped",
      progressPercent: 0
    });
  });

  it("keeps chapter reward labels aligned with mastery node state", () => {
    expect(getChapterRewardStateLabel(null)).toBe("Locked");
    expect(getChapterRewardStateLabel({ state: "locked" })).toBe("Locked");
    expect(getChapterRewardStateLabel({ state: "earned" })).toBe("Earned");
    expect(getChapterRewardStateLabel({ state: "mastered" })).toBe("Mastered");
    expect(getChapterRewardStateLabel({ state: "in-progress" })).toBe("In progress");
  });

  it("builds an inspector with explicit prerequisite labels for locked skills", () => {
    const projection = buildAtlasShellProjection({
      skillTree: baseTree,
      assignments: courseAssignments,
      progress: {
        conceptMastery: {},
        chapterCompletion: {},
        skillHistory: {}
      }
    });

    const inspector = buildAtlasNodeInspector(
      "skill-ready-assignment-1",
      projection.atlasSkillModel,
      projection.atlasSkillById
    );

    expect(inspector?.statusSummary).toMatch(/^Locked until /);
    expect(inspector?.missingPrerequisites.map((dependency) => dependency.label)).toEqual(
      expect.arrayContaining([
        "Compare Virtue Ethics",
        "Compare Deontology",
        "Transfer Compare virtue and duty"
      ])
    );
  });

  it("surfaces cross-lane dependencies when a skill depends on another lane", () => {
    const crossLaneTree: AtlasSkillTree = {
      nodes: [
        {
          id: "skill-foundation-alpha",
          label: "Explain Alpha",
          kind: "foundational",
          summary: "Alpha foundation",
          conceptIds: ["alpha"],
          prerequisiteIds: [],
          moduleId: "module-1",
          assignmentIds: [],
          focusVerb: "explain",
          chapterIds: ["module-1"],
          rewardLabel: null,
          branchId: "module-1",
          tier: 1
        },
        {
          id: "skill-transfer-beta",
          label: "Transfer Beta",
          kind: "transfer",
          summary: "Beta transfer",
          conceptIds: ["beta"],
          prerequisiteIds: ["skill-foundation-alpha"],
          moduleId: "module-2",
          assignmentIds: ["assignment-2"],
          focusVerb: "apply",
          chapterIds: ["module-2"],
          rewardLabel: null,
          branchId: "module-2",
          tier: 3
        },
        {
          id: "skill-ready-beta",
          label: "Ready Beta",
          kind: "assignment-readiness",
          summary: "Beta readiness",
          conceptIds: ["beta"],
          prerequisiteIds: ["skill-transfer-beta"],
          moduleId: "module-2",
          assignmentIds: ["assignment-2"],
          focusVerb: "submit",
          chapterIds: ["module-2"],
          rewardLabel: null,
          branchId: "module-2",
          tier: 4
        }
      ],
      groups: [],
      chapterRewards: [],
      assignmentRequirements: []
    };
    const materialized = materializeAtlasSkillTree(crossLaneTree, {
      conceptMastery: {},
      chapterCompletion: {},
      skillHistory: {}
    });
    const byId = new Map(materialized.nodes.map((node) => [node.id, node]));

    const inspector = buildAtlasNodeInspector(
      "skill-transfer-beta",
      materialized,
      byId
    );

    expect(formatAtlasSkillKindLabel(inspector?.node.kind ?? "foundational")).toBe("Transfer");
    expect(inspector?.prerequisites.map((dependency) => dependency.label)).toEqual(["Explain Alpha"]);
    expect(inspector?.crossLaneDependencies).toEqual([
      expect.objectContaining({
        id: "skill-foundation-alpha",
        crossLane: true
      })
    ]);
    expect(inspector?.unlocks).toEqual([
      expect.objectContaining({
        id: "skill-ready-beta",
        crossLane: false
      })
    ]);
  });
});
