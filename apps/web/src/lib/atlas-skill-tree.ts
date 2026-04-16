import type { AppProgress } from "./workspace";

export type AtlasSkillNodeKind =
  | "foundational"
  | "applied"
  | "distinction"
  | "assignment-readiness"
  | "mastery";

export type AtlasSkillNode = {
  id: string;
  label: string;
  kind: AtlasSkillNodeKind;
  summary: string;
  conceptIds: string[];
  prerequisiteIds: string[];
  moduleId: string | null;
  assignmentIds: string[];
  focusVerb: string | null;
  chapterIds: string[];
  rewardLabel: string | null;
};

export type AtlasSkillGroup = {
  id: string;
  title: string;
  summary: string;
  moduleId: string | null;
  skillIds: string[];
};

export type AtlasChapterReward = {
  id: string;
  moduleId: string;
  title: string;
  summary: string;
  skillIds: string[];
};

export type AtlasAssignmentRequirement = {
  assignmentId: string;
  title: string;
  summary: string;
  skillIds: string[];
};

export type AtlasSkillTree = {
  nodes: AtlasSkillNode[];
  groups: AtlasSkillGroup[];
  chapterRewards: AtlasChapterReward[];
  assignmentRequirements: AtlasAssignmentRequirement[];
};

export type MaterializedAtlasSkillNode = AtlasSkillNode & {
  state: "locked" | "available" | "in-progress" | "earned" | "mastered" | "recovery";
  progress: number;
  conceptProgress: number;
  chapterProgress: number;
  missingPrerequisiteIds: string[];
};

export type MaterializedAtlasSkillTree = {
  nodes: MaterializedAtlasSkillNode[];
  groups: AtlasSkillGroup[];
  chapterRewards: AtlasChapterReward[];
  assignmentRequirements: AtlasAssignmentRequirement[];
  summary: {
    available: number;
    inProgress: number;
    earned: number;
    mastered: number;
    recovery: number;
  };
};

type ConceptLike = {
  id: string;
  name: string;
  core: string;
  depth: string;
  dist: string;
  trap: string;
};

type AssignmentLike = {
  id: string;
  title: string;
  con: string[];
};

type ModuleLike = {
  id: string;
  title: string;
  desc: string;
  concepts: string[];
};

type DistinctionLike = {
  a: string;
  b: string;
  label: string;
  border: string;
  trap: string;
};

type FocusThemeLike = {
  id: string;
  label: string;
  summary: string;
  verbs: string[];
  conceptIds?: string[];
};

type AssignmentIntelLike = {
  sourceItemId: string;
  title: string;
  likelySkills: string[];
  conceptIds: string[];
  focusThemeIds: string[];
  summary?: string;
};

type SynthesisLike = {
  focusThemes: FocusThemeLike[];
  assignmentIntel: AssignmentIntelLike[];
  likelyAssessedSkills: string[];
};

type BuildAtlasSkillTreeInput = {
  concepts: ConceptLike[];
  assignments: AssignmentLike[];
  modules: ModuleLike[];
  distinctions: DistinctionLike[];
  synthesis: SynthesisLike;
};

const FOUNDATION_LIMIT = 8;
const APPLIED_LIMIT = 6;
const DISTINCTION_LIMIT = 4;

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function capitalize(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function shortTitle(title: string): string {
  return title.length <= 34 ? title : `${title.slice(0, 31).trimEnd()}...`;
}

function bestVerb(
  verbs: string[],
  conceptCount: number,
  fallback = "explain"
): string {
  if (verbs.length > 0) {
    return verbs[0]!;
  }
  return conceptCount > 1 ? "synthesize" : fallback;
}

function moduleIdForConcept(conceptId: string, modules: ModuleLike[]): string | null {
  return modules.find((module) => module.concepts.includes(conceptId))?.id ?? null;
}

function foundationSkillId(conceptId: string): string {
  return `skill-foundation-${conceptId}`;
}

function masterySkillId(moduleId: string): string {
  return `skill-mastery-${moduleId}`;
}

export function buildAtlasSkillTree(input: BuildAtlasSkillTreeInput): AtlasSkillTree {
  const { concepts, assignments, modules, distinctions, synthesis } = input;
  const conceptById = new Map(concepts.map((concept) => [concept.id, concept]));
  const foundationNodes = concepts.slice(0, FOUNDATION_LIMIT).map((concept, index) => {
    const moduleId = moduleIdForConcept(concept.id, modules);
    const supportingIntel = synthesis.assignmentIntel.find((item) => item.conceptIds.includes(concept.id));
    const supportingVerb = bestVerb(supportingIntel?.likelySkills ?? [], 1, "explain");

    return {
      id: foundationSkillId(concept.id),
      label: `${capitalize(supportingVerb)} ${concept.name}`,
      kind: "foundational" as const,
      summary: concept.depth || concept.core,
      conceptIds: [concept.id],
      prerequisiteIds: index > 0 ? [foundationSkillId(concepts[index - 1]!.id)] : [],
      moduleId,
      assignmentIds: assignments.filter((assignment) => assignment.con.includes(concept.id)).map((assignment) => assignment.id),
      focusVerb: supportingVerb,
      chapterIds: moduleId ? [moduleId] : [],
      rewardLabel: moduleId ? `Earned by finishing ${modules.find((module) => module.id === moduleId)?.title ?? "this chapter"}` : null
    };
  });

  const themeNodes: AtlasSkillNode[] = synthesis.focusThemes
    .slice(0, APPLIED_LIMIT)
    .flatMap((theme) => {
      const conceptIds = unique(
        (theme.conceptIds && theme.conceptIds.length > 0
          ? theme.conceptIds
          : concepts
              .filter((concept) => theme.label.toLowerCase().includes(concept.name.toLowerCase()) || concept.name.toLowerCase().includes(theme.label.toLowerCase()))
              .map((concept) => concept.id))
          .slice(0, 3)
      );
      if (conceptIds.length === 0) {
        return [];
      }
      const primaryConcept = conceptById.get(conceptIds[0]!);
      const moduleId = primaryConcept ? moduleIdForConcept(primaryConcept.id, modules) : null;
      const focusVerb = bestVerb(theme.verbs, conceptIds.length, "apply");
      return [{
        id: `skill-applied-${slug(`${focusVerb}-${theme.id}`)}`,
        label: `${capitalize(focusVerb)} ${theme.label}`,
        kind: "applied" as const,
        summary: theme.summary,
        conceptIds,
        prerequisiteIds: conceptIds.map((conceptId) => foundationSkillId(conceptId)).slice(0, 2),
        moduleId,
        assignmentIds: assignments
          .filter((assignment) => assignment.con.some((conceptId) => conceptIds.includes(conceptId)))
          .map((assignment) => assignment.id)
          .slice(0, 2),
        focusVerb: focusVerb || null,
        chapterIds: moduleId ? [moduleId] : [],
        rewardLabel: moduleId ? `Chapter reward from ${modules.find((module) => module.id === moduleId)?.title ?? "this chapter"}` : null
      }];
    });

  const distinctionNodes: AtlasSkillNode[] = distinctions
    .slice(0, DISTINCTION_LIMIT)
    .flatMap((distinction) => {
      const leftConcept = conceptById.get(distinction.a);
      const rightConcept = conceptById.get(distinction.b);
      if (!leftConcept || !rightConcept) {
        return [];
      }
      const moduleId = moduleIdForConcept(leftConcept.id, modules) ?? moduleIdForConcept(rightConcept.id, modules);
      return [{
        id: `skill-distinction-${leftConcept.id}-${rightConcept.id}`,
        label: `Separate ${leftConcept.name} from ${rightConcept.name}`,
        kind: "distinction" as const,
        summary: distinction.border || distinction.trap || distinction.label,
        conceptIds: [leftConcept.id, rightConcept.id],
        prerequisiteIds: [foundationSkillId(leftConcept.id), foundationSkillId(rightConcept.id)],
        moduleId,
        assignmentIds: assignments
          .filter((assignment) => assignment.con.includes(leftConcept.id) || assignment.con.includes(rightConcept.id))
          .map((assignment) => assignment.id)
          .slice(0, 2),
        focusVerb: "distinguish",
        chapterIds: moduleId ? [moduleId] : [],
        rewardLabel: moduleId ? `Unlocked by proving the contrast in ${modules.find((module) => module.id === moduleId)?.title ?? "this chapter"}` : null
      }];
    });

  const readinessNodes: AtlasSkillNode[] = synthesis.assignmentIntel
    .slice(0, APPLIED_LIMIT)
    .flatMap((item) => {
      const focusVerb = bestVerb(item.likelySkills, item.conceptIds.length, "prepare");
      const primaryConcept = conceptById.get(item.conceptIds[0] ?? "");
      const moduleId = primaryConcept ? moduleIdForConcept(primaryConcept.id, modules) : null;
      const assignmentId = assignments.find((assignment) => assignment.id === item.sourceItemId)?.id;
      if (!assignmentId || item.conceptIds.length === 0) {
        return [];
      }
      return [{
        id: `skill-ready-${assignmentId}`,
        label: `Ready ${shortTitle(item.title)}`,
        kind: "assignment-readiness" as const,
        summary: item.summary ?? `Use ${focusVerb} moves under assignment pressure without losing the source thread.`,
        conceptIds: item.conceptIds,
        prerequisiteIds: unique(
          item.conceptIds.map((conceptId) => foundationSkillId(conceptId)).concat(
            synthesis.focusThemes
              .filter((theme) => item.focusThemeIds.includes(theme.id))
              .map((theme) => `skill-applied-${slug(`${bestVerb(theme.verbs, 1, "apply")}-${theme.id}`)}`)
          )
        ),
        moduleId,
        assignmentIds: [assignmentId],
        focusVerb: focusVerb || null,
        chapterIds: moduleId ? [moduleId] : [],
        rewardLabel: null
      }];
    });

  const masteryNodes: AtlasSkillNode[] = modules
    .flatMap((module) => {
      const moduleSkillIds = unique(
        foundationNodes
          .filter((node) => node.moduleId === module.id)
          .map((node) => node.id)
          .concat(themeNodes.filter((node) => node.moduleId === module.id).map((node) => node.id))
          .concat(distinctionNodes.filter((node) => node.moduleId === module.id).map((node) => node.id))
      );
      if (moduleSkillIds.length < 2) {
        return [];
      }
      return [{
        id: masterySkillId(module.id),
        label: `Master ${module.title}`,
        kind: "mastery" as const,
        summary: module.desc,
        conceptIds: module.concepts.slice(0, 4),
        prerequisiteIds: moduleSkillIds,
        moduleId: module.id,
        assignmentIds: assignments.filter((assignment) => assignment.con.some((conceptId) => module.concepts.includes(conceptId))).map((assignment) => assignment.id),
        focusVerb: "master",
        chapterIds: [module.id],
        rewardLabel: `Culmination reward for ${module.title}`
      }];
    });

  const nodes = [...foundationNodes, ...themeNodes, ...distinctionNodes, ...readinessNodes, ...masteryNodes];
  const groups = modules.map((module) => ({
    id: `group-${module.id}`,
    title: module.title,
    summary: module.desc,
    moduleId: module.id,
    skillIds: nodes.filter((node) => node.moduleId === module.id).map((node) => node.id)
  })).filter((group) => group.skillIds.length > 0);

  const chapterRewards = modules.map((module) => ({
    id: `reward-${module.id}`,
    moduleId: module.id,
    title: `${module.title} rewards`,
    summary: `Finish the chapter cluster and earn the skills that carry ${module.title} into assignments.`,
    skillIds: nodes
      .filter((node) => node.moduleId === module.id && node.kind !== "assignment-readiness")
      .map((node) => node.id)
  })).filter((reward) => reward.skillIds.length > 0);

  const assignmentRequirements = assignments.map((assignment) => {
    const skillIds = nodes
      .filter((node) => node.assignmentIds.includes(assignment.id))
      .map((node) => node.id);
    return {
      assignmentId: assignment.id,
      title: assignment.title,
      summary: skillIds.length > 0
        ? "This assignment becomes ready when its linked skill chain is earned."
        : "This assignment still depends on direct concept command because no richer skill chain was derived.",
      skillIds
    };
  }).filter((entry) => entry.skillIds.length > 0);

  return {
    nodes,
    groups,
    chapterRewards,
    assignmentRequirements
  };
}

function nodeThresholds(kind: AtlasSkillNodeKind): { earned: number; mastered: number; chapter: number } {
  switch (kind) {
    case "assignment-readiness":
      return { earned: 0.72, mastered: 0.88, chapter: 0.7 };
    case "mastery":
      return { earned: 0.82, mastered: 0.92, chapter: 0.85 };
    case "distinction":
      return { earned: 0.65, mastered: 0.85, chapter: 0.55 };
    case "applied":
      return { earned: 0.68, mastered: 0.86, chapter: 0.6 };
    default:
      return { earned: 0.6, mastered: 0.82, chapter: 0.45 };
  }
}

export function materializeAtlasSkillTree(
  tree: AtlasSkillTree,
  progress: Pick<AppProgress, "conceptMastery" | "chapterCompletion">
): MaterializedAtlasSkillTree {
  const byId = new Map<string, MaterializedAtlasSkillNode>();
  const nodes = tree.nodes.map((node) => {
    const conceptProgress = average(
      node.conceptIds
        .map((conceptId) => progress.conceptMastery[conceptId] ?? 0)
    );
    const chapterProgress = average(
      node.chapterIds
        .map((chapterId) => progress.chapterCompletion[chapterId] ?? 0)
    );
    const missingPrerequisiteIds = node.prerequisiteIds.filter((id) => {
      const prereq = byId.get(id);
      return !prereq || (prereq.state !== "earned" && prereq.state !== "mastered");
    });
    const { earned, mastered, chapter } = nodeThresholds(node.kind);
    const progressValue = node.kind === "assignment-readiness"
      ? average([conceptProgress, chapterProgress || conceptProgress])
      : average([conceptProgress, conceptProgress, chapterProgress]);
    const prereqsMet = missingPrerequisiteIds.length === 0;
    const chapterReady = node.chapterIds.length === 0 || chapterProgress >= chapter;
    let state: MaterializedAtlasSkillNode["state"] = "locked";

    if (!prereqsMet) {
      state = "locked";
    } else if (conceptProgress >= mastered && chapterProgress >= chapter) {
      state = "mastered";
    } else if (conceptProgress >= earned && chapterReady) {
      state = "earned";
    } else if (chapterProgress >= 0.8 && conceptProgress >= 0.35) {
      state = "recovery";
    } else if (progressValue >= 0.2 || chapterProgress >= 0.2) {
      state = "in-progress";
    } else {
      state = "available";
    }

    const materialized = {
      ...node,
      state,
      progress: Math.max(progressValue, conceptProgress),
      conceptProgress,
      chapterProgress,
      missingPrerequisiteIds
    };
    byId.set(node.id, materialized);
    return materialized;
  });

  return {
    nodes,
    groups: tree.groups,
    chapterRewards: tree.chapterRewards,
    assignmentRequirements: tree.assignmentRequirements,
    summary: {
      available: nodes.filter((node) => node.state === "available").length,
      inProgress: nodes.filter((node) => node.state === "in-progress").length,
      earned: nodes.filter((node) => node.state === "earned").length,
      mastered: nodes.filter((node) => node.state === "mastered").length,
      recovery: nodes.filter((node) => node.state === "recovery").length
    }
  };
}
