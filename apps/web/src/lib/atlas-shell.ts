import type { AppProgress } from "./workspace";
import {
  materializeAtlasSkillTree,
  type AtlasAssignmentRequirement,
  type AtlasSkillTree,
  type MaterializedAtlasSkillNode,
  type MaterializedAtlasSkillTree
} from "./atlas-skill-tree";
import type { ShellAssignment } from "./shell-mapper";

export type AssignmentReadinessStatus =
  | "unmapped"
  | "concept-prep"
  | "building"
  | "ready";

export type AssignmentReadinessState = {
  assignmentId: string;
  requirement: AtlasAssignmentRequirement | null;
  requiredSkills: MaterializedAtlasSkillNode[];
  missingSkills: MaterializedAtlasSkillNode[];
  readiness: number | null;
  status: AssignmentReadinessStatus;
  label: string;
  progressPercent: number;
};

export type AtlasShellProjection = {
  atlasSkillModel: MaterializedAtlasSkillTree | null;
  atlasSkillById: Map<string, MaterializedAtlasSkillNode>;
  atlasRequirementByAssignment: Map<string, AtlasAssignmentRequirement>;
  assignmentReadinessById: Map<string, AssignmentReadinessState>;
};

export type AtlasNodeDependency = Pick<
  MaterializedAtlasSkillNode,
  "id" | "label" | "kind" | "state" | "moduleId" | "branchId" | "tier"
> & {
  crossLane: boolean;
  missing: boolean;
};

export type AtlasNodeInspector = {
  node: MaterializedAtlasSkillNode;
  prerequisites: AtlasNodeDependency[];
  missingPrerequisites: AtlasNodeDependency[];
  unlocks: AtlasNodeDependency[];
  crossLaneDependencies: AtlasNodeDependency[];
  statusSummary: string;
};

type BuildAtlasShellProjectionInput = {
  skillTree: AtlasSkillTree | null | undefined;
  assignments: ShellAssignment[];
  progress: Pick<AppProgress, "conceptMastery" | "chapterCompletion" | "skillHistory">;
};

function buildAssignmentReadinessState(
  assignment: ShellAssignment,
  atlasRequirementByAssignment: Map<string, AtlasAssignmentRequirement>,
  atlasSkillById: Map<string, MaterializedAtlasSkillNode>
): AssignmentReadinessState {
  const requirement = atlasRequirementByAssignment.get(assignment.id) ?? null;
  const requiredSkills = (requirement?.skillIds ?? [])
    .map((id) => atlasSkillById.get(id))
    .filter((node): node is MaterializedAtlasSkillNode => Boolean(node));
  const missingSkills = requiredSkills.filter((node) => !["earned", "mastered"].includes(node.state));

  if (!requirement || requiredSkills.length === 0) {
    const status: AssignmentReadinessStatus =
      requirement?.basis === "concept-only" ? "concept-prep" : "unmapped";
    return {
      assignmentId: assignment.id,
      requirement,
      requiredSkills,
      missingSkills: [],
      readiness: null,
      status,
      label: status === "concept-prep" ? "Concept Prep" : "Unmapped",
      progressPercent: 0
    };
  }

  const progressPercent = Math.round(
    Math.min(...requiredSkills.map((node) => (node.state === "locked" ? 0 : node.progress))) * 100
  );
  const status: AssignmentReadinessStatus = missingSkills.length > 0 ? "building" : "ready";

  return {
    assignmentId: assignment.id,
    requirement,
    requiredSkills,
    missingSkills,
    readiness: progressPercent,
    status,
    label: `${progressPercent}%`,
    progressPercent
  };
}

export function buildAtlasShellProjection(
  input: BuildAtlasShellProjectionInput
): AtlasShellProjection {
  const atlasSkillModel = input.skillTree
    ? materializeAtlasSkillTree(input.skillTree, input.progress)
    : null;
  const atlasSkillById = atlasSkillModel
    ? new Map(atlasSkillModel.nodes.map((node) => [node.id, node]))
    : new Map<string, MaterializedAtlasSkillNode>();
  const atlasRequirementByAssignment = atlasSkillModel
    ? new Map(
        atlasSkillModel.assignmentRequirements.map((requirement) => [requirement.assignmentId, requirement])
      )
    : new Map<string, AtlasAssignmentRequirement>();
  const assignmentReadinessById = new Map(
    input.assignments.map((assignment) => [
      assignment.id,
      buildAssignmentReadinessState(assignment, atlasRequirementByAssignment, atlasSkillById)
    ])
  );

  return {
    atlasSkillModel,
    atlasSkillById,
    atlasRequirementByAssignment,
    assignmentReadinessById
  };
}

export function getChapterRewardStateLabel(
  masteryNode: Pick<MaterializedAtlasSkillNode, "state"> | null | undefined
): "Locked" | "Earned" | "Mastered" | "In progress" {
  if (!masteryNode || masteryNode.state === "locked") {
    return "Locked";
  }
  if (masteryNode.state === "earned") {
    return "Earned";
  }
  if (masteryNode.state === "mastered") {
    return "Mastered";
  }
  return "In progress";
}

export function formatAtlasSkillKindLabel(
  kind: MaterializedAtlasSkillNode["kind"]
): string {
  switch (kind) {
    case "assignment-readiness":
      return "Assignment readiness";
    case "chapter-reward":
      return "Chapter reward";
    default:
      return kind.charAt(0).toUpperCase() + kind.slice(1);
  }
}

function atlasDependencyKey(
  node: Pick<MaterializedAtlasSkillNode, "moduleId" | "branchId">
): string {
  return node.moduleId ?? node.branchId ?? "global";
}

export function buildAtlasNodeInspector(
  nodeId: string,
  atlasSkillModel: MaterializedAtlasSkillTree | null | undefined,
  atlasSkillById: Map<string, MaterializedAtlasSkillNode>
): AtlasNodeInspector | null {
  const node = atlasSkillById.get(nodeId);
  if (!node || !atlasSkillModel) {
    return null;
  }

  const nodeKey = atlasDependencyKey(node);
  const missingSet = new Set(node.missingPrerequisiteIds);
  const toDependency = (dependencyNode: MaterializedAtlasSkillNode): AtlasNodeDependency => ({
    id: dependencyNode.id,
    label: dependencyNode.label,
    kind: dependencyNode.kind,
    state: dependencyNode.state,
    moduleId: dependencyNode.moduleId,
    branchId: dependencyNode.branchId,
    tier: dependencyNode.tier,
    crossLane: atlasDependencyKey(dependencyNode) !== nodeKey,
    missing: missingSet.has(dependencyNode.id)
  });

  const prerequisites = node.prerequisiteIds
    .map((id) => atlasSkillById.get(id))
    .filter((dependencyNode): dependencyNode is MaterializedAtlasSkillNode => Boolean(dependencyNode))
    .map(toDependency);
  const missingPrerequisites = prerequisites.filter((dependency) => dependency.missing);
  const unlocks = atlasSkillModel.nodes
    .filter((candidate) => candidate.prerequisiteIds.includes(node.id))
    .map(toDependency);
  const crossLaneDependencies = [...prerequisites, ...unlocks].filter((dependency) => dependency.crossLane);

  const statusSummary = missingPrerequisites.length > 0
    ? `Locked until ${missingPrerequisites.map((dependency) => dependency.label).join(" · ")}`
    : node.state === "recovery"
      ? "Recovery loop reopened because this skill slipped after being earned once."
      : node.state === "mastered"
        ? "Mastered and still supporting the next layer of work."
        : node.state === "earned"
          ? "Earned and ready to support later skills."
          : node.state === "in-progress"
            ? "In progress. Keep building evidence before the next unlock."
            : "Available to earn now.";

  return {
    node,
    prerequisites,
    missingPrerequisites,
    unlocks,
    crossLaneDependencies,
    statusSummary
  };
}
