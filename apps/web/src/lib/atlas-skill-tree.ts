import type { EvidenceFragment } from "@learning/schema";
import type { AppProgress } from "./workspace";

export type AtlasSkillNodeKind =
  | "foundational"
  | "applied"
  | "distinction"
  | "transfer"
  | "assignment-readiness"
  | "chapter-reward"
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
  branchId: string | null;
  tier: number;
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
  basis: "captured-requirements" | "derived-checklist" | "concept-only";
  conceptIds: string[];
  focusThemeIds: string[];
  checklist: string[];
  pitfalls: string[];
  evidence: EvidenceFragment[];
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
    locked: number;
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
  requirementLines?: string[];
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
  checklist: string[];
  likelyPitfalls: string[];
  evidence: EvidenceFragment[];
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

function moduleIdsForConcept(conceptId: string, modules: ModuleLike[]): string[] {
  return modules
    .filter((module) => module.concepts.includes(conceptId))
    .map((module) => module.id);
}

function chapterIdsForConcepts(conceptIds: string[], modules: ModuleLike[]): string[] {
  return unique(conceptIds.flatMap((conceptId) => moduleIdsForConcept(conceptId, modules)));
}

function primaryModuleId(conceptIds: string[], modules: ModuleLike[]): string | null {
  let best: { moduleId: string; score: number; index: number } | null = null;
  for (const [index, module] of modules.entries()) {
    const score = conceptIds.filter((conceptId) => module.concepts.includes(conceptId)).length;
    if (score <= 0) {
      continue;
    }
    if (!best || score > best.score || (score === best.score && index < best.index)) {
      best = { moduleId: module.id, score, index };
    }
  }
  return best?.moduleId ?? null;
}

function foundationSkillId(conceptId: string): string {
  return `skill-foundation-${conceptId}`;
}

function masterySkillId(moduleId: string): string {
  return `skill-mastery-${moduleId}`;
}

function collectSkillChain(
  rootSkillIds: string[],
  nodesById: Map<string, AtlasSkillNode>
): string[] {
  const ordered: string[] = [];
  const visited = new Set<string>();

  function visit(skillId: string): void {
    if (visited.has(skillId)) {
      return;
    }
    visited.add(skillId);
    const node = nodesById.get(skillId);
    if (!node) {
      return;
    }
    node.prerequisiteIds.forEach(visit);
    ordered.push(skillId);
  }

  rootSkillIds.forEach(visit);
  return ordered;
}

function isEarnedState(
  node: Pick<MaterializedAtlasSkillNode, "state">
): boolean {
  return node.state === "earned" || node.state === "mastered";
}

export function buildAtlasSkillTree(input: BuildAtlasSkillTreeInput): AtlasSkillTree {
  const { concepts, assignments, modules, distinctions, synthesis } = input;
  const conceptById = new Map(concepts.map((concept) => [concept.id, concept]));
  const assignmentIntelById = new Map(
    synthesis.assignmentIntel.map((item) => [item.sourceItemId, item])
  );

  const foundationConceptIds = unique(
    modules
      .flatMap((module) => module.concepts)
      .filter((conceptId) => conceptById.has(conceptId))
      .concat(concepts.map((concept) => concept.id))
  );

  const foundationNodes: AtlasSkillNode[] = foundationConceptIds.flatMap((conceptId) => {
    const concept = conceptById.get(conceptId);
    if (!concept) {
      return [];
    }
    const chapterIds = chapterIdsForConcepts([concept.id], modules);
    const moduleId = chapterIds[0] ?? null;
    const supportingIntel = synthesis.assignmentIntel.find((item) =>
      item.conceptIds.includes(concept.id)
    );
    const supportingVerb = bestVerb(supportingIntel?.likelySkills ?? [], 1, "explain");

    return [{
      id: foundationSkillId(concept.id),
      label: `${capitalize(supportingVerb)} ${concept.name}`,
      kind: "foundational" as const,
      summary: concept.depth || concept.core,
      conceptIds: [concept.id],
      prerequisiteIds: [],
      moduleId,
      assignmentIds: assignments
        .filter((assignment) => assignment.con.includes(concept.id))
        .map((assignment) => assignment.id),
      focusVerb: supportingVerb,
      chapterIds,
      rewardLabel: moduleId
        ? `Earned by finishing ${modules.find((module) => module.id === moduleId)?.title ?? "this chapter"}`
        : null,
      branchId: moduleId ?? concept.id,
      tier: 1
    }];
  });

  const foundationNodeIds = new Set(foundationNodes.map((node) => node.id));

  const themeEntries = synthesis.focusThemes.flatMap((theme) => {
    const conceptIds = unique(
      (theme.conceptIds && theme.conceptIds.length > 0
        ? theme.conceptIds
        : concepts
            .filter((concept) =>
              theme.label.toLowerCase().includes(concept.name.toLowerCase())
              || concept.name.toLowerCase().includes(theme.label.toLowerCase())
            )
            .map((concept) => concept.id))
        .filter((conceptId) => conceptById.has(conceptId))
    );

    if (conceptIds.length === 0) {
      return [];
    }

    const focusVerb = bestVerb(theme.verbs, conceptIds.length, "apply");
    const moduleId = primaryModuleId(conceptIds, modules);
    const chapterIds = chapterIdsForConcepts(conceptIds, modules);
    const node: AtlasSkillNode = {
      id: `skill-applied-${slug(`${focusVerb}-${theme.id}`)}`,
      label: `${capitalize(focusVerb)} ${theme.label}`,
      kind: "applied",
      summary: theme.summary,
      conceptIds,
      prerequisiteIds: conceptIds
        .map((conceptId) => foundationSkillId(conceptId))
        .filter((skillId) => foundationNodeIds.has(skillId)),
      moduleId,
      assignmentIds: assignments
        .filter((assignment) => assignment.con.some((conceptId) => conceptIds.includes(conceptId)))
        .map((assignment) => assignment.id),
      focusVerb,
      chapterIds,
      rewardLabel: moduleId
        ? `Chapter reward from ${modules.find((module) => module.id === moduleId)?.title ?? "this chapter"}`
        : null,
      branchId: moduleId ?? theme.id,
      tier: 2
    };

    return [{ themeId: theme.id, node }];
  });

  const themeNodes = themeEntries.map((entry) => entry.node);
  const themeSkillIdByThemeId = new Map(
    themeEntries.map((entry) => [entry.themeId, entry.node.id])
  );

  const distinctionNodes: AtlasSkillNode[] = distinctions.flatMap((distinction) => {
    const leftConcept = conceptById.get(distinction.a);
    const rightConcept = conceptById.get(distinction.b);
    if (!leftConcept || !rightConcept) {
      return [];
    }

    const conceptIds = [leftConcept.id, rightConcept.id];
    const moduleId = primaryModuleId(conceptIds, modules);
    const chapterIds = chapterIdsForConcepts(conceptIds, modules);

    return [{
      id: `skill-distinction-${leftConcept.id}-${rightConcept.id}`,
      label: `Separate ${leftConcept.name} from ${rightConcept.name}`,
      kind: "distinction" as const,
      summary: distinction.border || distinction.trap || distinction.label,
      conceptIds,
      prerequisiteIds: conceptIds
        .map((conceptId) => foundationSkillId(conceptId))
        .filter((skillId) => foundationNodeIds.has(skillId)),
      moduleId,
      assignmentIds: assignments
        .filter((assignment) => conceptIds.every((conceptId) => assignment.con.includes(conceptId)))
        .map((assignment) => assignment.id),
      focusVerb: "distinguish",
      chapterIds,
      rewardLabel: moduleId
        ? `Unlocked by proving the contrast in ${modules.find((module) => module.id === moduleId)?.title ?? "this chapter"}`
        : null,
      branchId: moduleId ?? `${leftConcept.id}-${rightConcept.id}`,
      tier: 2
    }];
  });

  const transferNodes: AtlasSkillNode[] = assignments.flatMap((assignment) => {
    const intel = assignmentIntelById.get(assignment.id);
    const conceptIds = unique(
      [...assignment.con, ...(intel?.conceptIds ?? [])].filter((conceptId) => conceptById.has(conceptId))
    );
    if (conceptIds.length === 0) {
      return [];
    }

    const focusVerb = bestVerb(intel?.likelySkills ?? [], conceptIds.length, "apply");
    const moduleId = primaryModuleId(conceptIds, modules);
    const chapterIds = chapterIdsForConcepts(conceptIds, modules);
    const explicitThemePrerequisites = (intel?.focusThemeIds ?? [])
      .map((themeId) => themeSkillIdByThemeId.get(themeId))
      .filter((skillId): skillId is string => Boolean(skillId));
    const derivedThemePrerequisites = themeNodes
      .filter((node) => node.conceptIds.some((conceptId) => conceptIds.includes(conceptId)))
      .map((node) => node.id);
    const distinctionPrerequisites = distinctionNodes
      .filter((node) => node.conceptIds.every((conceptId) => conceptIds.includes(conceptId)))
      .map((node) => node.id);

    return [{
      id: `skill-transfer-${assignment.id}`,
      label: `Transfer ${shortTitle(intel?.title ?? assignment.title)}`,
      kind: "transfer" as const,
      summary:
        intel?.summary
        ?? `Move ${focusVerb} from chapter understanding into assignment-shaped use without drifting off the source.`,
      conceptIds,
      prerequisiteIds: unique(
        conceptIds
          .map((conceptId) => foundationSkillId(conceptId))
          .filter((skillId) => foundationNodeIds.has(skillId))
          .concat(explicitThemePrerequisites.length > 0 ? explicitThemePrerequisites : derivedThemePrerequisites)
          .concat(distinctionPrerequisites)
      ),
      moduleId,
      assignmentIds: [assignment.id],
      focusVerb,
      chapterIds,
      rewardLabel: moduleId
        ? `Feeds the ${modules.find((module) => module.id === moduleId)?.title ?? "chapter"} assignment lane`
        : null,
      branchId: moduleId ?? assignment.id,
      tier: 3
    }];
  });
  const transferSkillIdByAssignmentId = new Map(
    transferNodes.flatMap((node) => node.assignmentIds.map((assignmentId) => [assignmentId, node.id] as const))
  );

  const readinessNodes: AtlasSkillNode[] = assignments.flatMap((assignment) => {
    const intel = assignmentIntelById.get(assignment.id);
    const conceptIds = unique(
      [...assignment.con, ...(intel?.conceptIds ?? [])].filter((conceptId) => conceptById.has(conceptId))
    );
    if (conceptIds.length === 0) {
      return [];
    }

    const focusVerb = bestVerb(intel?.likelySkills ?? [], conceptIds.length, "prepare");
    const moduleId = primaryModuleId(conceptIds, modules);
    const chapterIds = chapterIdsForConcepts(conceptIds, modules);
    const distinctionPrerequisites = distinctionNodes
      .filter((node) => node.conceptIds.every((conceptId) => conceptIds.includes(conceptId)))
      .map((node) => node.id);
    const explicitThemePrerequisites = (intel?.focusThemeIds ?? [])
      .map((themeId) => themeSkillIdByThemeId.get(themeId))
      .filter((skillId): skillId is string => Boolean(skillId));
    const derivedThemePrerequisites = themeNodes
      .filter((node) => {
        const overlap = node.conceptIds.filter((conceptId) => conceptIds.includes(conceptId)).length;
        return conceptIds.length === 1 ? overlap >= 1 : overlap >= Math.min(2, conceptIds.length);
      })
      .map((node) => node.id);

    return [{
      id: `skill-ready-${assignment.id}`,
      label: `Ready ${shortTitle(intel?.title ?? assignment.title)}`,
      kind: "assignment-readiness" as const,
      summary:
        intel?.summary
        ?? `Use ${focusVerb} moves under assignment pressure without losing the source thread.`,
      conceptIds,
      prerequisiteIds: unique(
        [
          transferSkillIdByAssignmentId.get(assignment.id)
        ]
          .filter((skillId): skillId is string => Boolean(skillId))
          .concat(
            conceptIds
          .map((conceptId) => foundationSkillId(conceptId))
          .filter((skillId) => foundationNodeIds.has(skillId))
          .concat(explicitThemePrerequisites.length > 0 ? explicitThemePrerequisites : derivedThemePrerequisites)
          .concat(distinctionPrerequisites)
          )
      ),
      moduleId,
      assignmentIds: [assignment.id],
      focusVerb,
      chapterIds,
      rewardLabel: null,
      branchId: moduleId ?? assignment.id,
      tier: 4
    }];
  });

  const chapterRewardNodes: AtlasSkillNode[] = modules.flatMap((module) => {
    const moduleSkillIds = unique(
      foundationNodes
        .filter((node) => node.moduleId === module.id)
        .map((node) => node.id)
        .concat(themeNodes.filter((node) => node.moduleId === module.id).map((node) => node.id))
        .concat(distinctionNodes.filter((node) => node.moduleId === module.id).map((node) => node.id))
        .concat(transferNodes.filter((node) => node.moduleId === module.id).map((node) => node.id))
    );
    if (moduleSkillIds.length < 2) {
      return [];
    }
    return [{
      id: `skill-chapter-reward-${module.id}`,
      label: `Earn ${module.title}`,
      kind: "chapter-reward" as const,
      summary: `Complete ${module.title} cleanly enough to cash out the chapter skill reward.`,
      conceptIds: module.concepts.filter((conceptId) => conceptById.has(conceptId)).slice(0, 4),
      prerequisiteIds: moduleSkillIds,
      moduleId: module.id,
      assignmentIds: assignments
        .filter((assignment) => assignment.con.some((conceptId) => module.concepts.includes(conceptId)))
        .map((assignment) => assignment.id),
      focusVerb: "earn",
      chapterIds: [module.id],
      rewardLabel: `Chapter reward for ${module.title}`,
      branchId: module.id,
      tier: 5
    }];
  });

  const masteryNodes: AtlasSkillNode[] = modules.flatMap((module) => {
    const rewardNode = chapterRewardNodes.find((node) => node.moduleId === module.id);
    const moduleSkillIds = rewardNode ? [rewardNode.id] : [];
    if (moduleSkillIds.length === 0) {
      return [];
    }
    return [{
      id: masterySkillId(module.id),
      label: `Master ${module.title}`,
      kind: "mastery" as const,
      summary: module.desc,
      conceptIds: module.concepts.filter((conceptId) => conceptById.has(conceptId)).slice(0, 4),
      prerequisiteIds: moduleSkillIds,
      moduleId: module.id,
      assignmentIds: assignments
        .filter((assignment) => assignment.con.some((conceptId) => module.concepts.includes(conceptId)))
        .map((assignment) => assignment.id),
      focusVerb: "master",
      chapterIds: [module.id],
      rewardLabel: `Culmination reward for ${module.title}`,
      branchId: module.id,
      tier: 6
    }];
  });

  const nodes = [
    ...foundationNodes,
    ...themeNodes,
    ...distinctionNodes,
    ...transferNodes,
    ...readinessNodes,
    ...chapterRewardNodes,
    ...masteryNodes
  ];
  const nodesById = new Map(nodes.map((node) => [node.id, node]));

  const groups = modules
    .map((module) => ({
      id: `group-${module.id}`,
      title: module.title,
      summary: module.desc,
      moduleId: module.id,
      skillIds: nodes.filter((node) => node.moduleId === module.id).map((node) => node.id)
    }))
    .filter((group) => group.skillIds.length > 0);

  const chapterRewards = modules
    .map((module) => ({
      id: `reward-${module.id}`,
      moduleId: module.id,
      title: `${module.title} rewards`,
      summary: `Finish the chapter cluster and earn the skills that carry ${module.title} into assignments.`,
      skillIds: nodes
        .filter((node) => node.moduleId === module.id && !["assignment-readiness", "mastery"].includes(node.kind))
        .map((node) => node.id)
    }))
    .filter((reward) => reward.skillIds.length > 0);

  const assignmentRequirements = assignments.flatMap((assignment) => {
    const intel = assignmentIntelById.get(assignment.id);
    const rootSkillIds = readinessNodes
      .filter((node) => node.assignmentIds.includes(assignment.id))
      .map((node) => node.id);
    const conceptIds = unique(
      [...assignment.con, ...(intel?.conceptIds ?? [])].filter((conceptId) => conceptById.has(conceptId))
    );
    const checklist = unique([
      ...(assignment.requirementLines ?? []),
      ...(intel?.checklist ?? [])
    ]).slice(0, 6);
    const basis: AtlasAssignmentRequirement["basis"] = (assignment.requirementLines?.length ?? 0) > 0
      ? "captured-requirements"
      : checklist.length > 0
        ? "derived-checklist"
        : "concept-only";

    if (rootSkillIds.length === 0 && conceptIds.length === 0 && checklist.length === 0) {
      return [];
    }

    return [{
      assignmentId: assignment.id,
      title: assignment.title,
      summary: "This assignment becomes ready when its prerequisite skill chain is earned.",
      skillIds: rootSkillIds.length > 0 ? collectSkillChain(rootSkillIds, nodesById) : [],
      basis,
      conceptIds,
      focusThemeIds: intel?.focusThemeIds ?? [],
      checklist,
      pitfalls: intel?.likelyPitfalls ?? [],
      evidence: intel?.evidence ?? []
    }];
  });

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
    case "transfer":
      return { earned: 0.7, mastered: 0.88, chapter: 0.68 };
    case "chapter-reward":
      return { earned: 0.78, mastered: 0.9, chapter: 0.82 };
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
  progress: Pick<AppProgress, "conceptMastery" | "chapterCompletion" | "skillHistory">
): MaterializedAtlasSkillTree {
  const byId = new Map<string, MaterializedAtlasSkillNode>();
  const nodes = tree.nodes.map((node) => {
    const conceptProgress = average(
      node.conceptIds.map((conceptId) => progress.conceptMastery[conceptId] ?? 0)
    );
    const chapterProgress = average(
      node.chapterIds.map((chapterId) => progress.chapterCompletion[chapterId] ?? 0)
    );
    const missingPrerequisiteIds = node.prerequisiteIds.filter((id) => {
      const prereq = byId.get(id);
      return !prereq || !isEarnedState(prereq);
    });
    const { earned, mastered, chapter } = nodeThresholds(node.kind);
    const progressValue = node.kind === "assignment-readiness"
      ? average([conceptProgress, chapterProgress || conceptProgress])
      : average([conceptProgress, conceptProgress, chapterProgress]);
    const prereqsMet = missingPrerequisiteIds.length === 0;
    const chapterReady = node.chapterIds.length === 0 || chapterProgress >= chapter;
    const chapterMastered = node.chapterIds.length === 0 || chapterProgress >= chapter;
    const hasSkillHistory = progress.skillHistory[node.id] === true;
    let state: MaterializedAtlasSkillNode["state"] = "locked";

    if (!prereqsMet) {
      state = "locked";
    } else if (conceptProgress >= mastered && chapterMastered) {
      state = "mastered";
    } else if (conceptProgress >= earned && chapterReady) {
      state = "earned";
    } else if (
      hasSkillHistory
      && (progressValue >= 0.2 || chapterProgress >= 0.2 || conceptProgress >= 0.2)
    ) {
      state = "recovery";
    } else if (progressValue >= 0.2 || chapterProgress >= 0.2 || conceptProgress >= 0.2) {
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
      locked: nodes.filter((node) => node.state === "locked").length,
      available: nodes.filter((node) => node.state === "available").length,
      inProgress: nodes.filter((node) => node.state === "in-progress").length,
      earned: nodes.filter((node) => node.state === "earned").length,
      mastered: nodes.filter((node) => node.state === "mastered").length,
      recovery: nodes.filter((node) => node.state === "recovery").length
    }
  };
}
