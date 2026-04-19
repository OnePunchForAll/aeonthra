import type { CaptureBundle, CaptureItem, EvidenceFragment, LearningBundle, LearningConcept } from "@learning/schema";
import type { AppProgress, CourseTask, ForgeChapter } from "./workspace";

export type StudySourceCard = {
  id: string;
  title: string;
  kind: CaptureItem["kind"];
  preview: string;
  url: string;
  tags: string[];
};

export type StudyTaskCard = {
  id: string;
  title: string;
  kind: CourseTask["kind"];
  dueLabel: string;
  summary: string;
  requirementLines: string[];
  conceptIds: string[];
  concepts: Array<{ id: string; label: string; summary: string }>;
  sourceSupport: StudySourceCard[];
  evidenceBullets: string[];
  likelySkills: string[];
  pitfalls: string[];
  readiness: "ready" | "partial" | "needs-evidence";
};

export type StudyConceptCard = {
  id: string;
  label: string;
  definition: string;
  summary: string;
  primer: string;
  distinction: string;
  transfer: string;
  trap: string;
  keywords: string[];
  evidence: string[];
};

export type StudyWorkbenchData = {
  title: string;
  deterministicHash: string;
  qualityBanner: string;
  qualityWarnings: string[];
  sourceSummary: {
    items: number;
    assignments: number;
    discussions: number;
    documents: number;
    pages: number;
    modules: number;
  };
  tasks: StudyTaskCard[];
  concepts: StudyConceptCard[];
  sources: StudySourceCard[];
  chapters: ForgeChapter[];
  likelySkills: string[];
  progress: {
    mastered: number;
    learning: number;
    totalConcepts: number;
  };
};

const NOISE_PATTERNS = [
  /\byou need to have javascript enabled\b/i,
  /\bskip to content\b/i,
  /\bcourse navigation\b/i,
  /\bsearch entries\b/i,
  /\bfilter by\b/i,
  /\bjavascript required\b/i
] as const;

const GENERIC_LABEL_PATTERNS = [
  /^week\s+\d+$/i,
  /^module\s+\d+$/i,
  /^discussion(?: forum| topic)?$/i,
  /^assignment$/i,
  /^quiz$/i,
  /^page$/i,
  /^start here$/i,
  /^orientation home$/i
] as const;

const PROFILE_OR_ONBOARDING_PATTERNS = [
  /fill out my profile/i,
  /introduce yourself/i,
  /my short[- ]term goal/i,
  /where are you from/i,
  /peers know who i am/i,
  /what are your goals/i,
  /ice ?breaker/i,
  /getting to know you/i
] as const;

const TRAILING_CONNECTOR = /\b(?:and|or|to|for|of|in|on|at|by|with|from|the|a|an)$/i;

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function tokens(text: string): string[] {
  return normalize(text).split(/\s+/).filter((token) => token.length > 2);
}

function preview(text: string, max = 180): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  return cleaned.length <= max ? cleaned : `${cleaned.slice(0, max - 3).trim()}...`;
}

function isWeakLabel(label: string): boolean {
  const cleaned = label.replace(/\s+/g, " ").trim();
  if (!cleaned) return true;
  if (NOISE_PATTERNS.some((pattern) => pattern.test(cleaned))) return true;
  if (GENERIC_LABEL_PATTERNS.some((pattern) => pattern.test(cleaned))) return true;
  if (TRAILING_CONNECTOR.test(cleaned)) return true;
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length >= 4 && cleaned.length <= 30 && !/[.!?]$/.test(cleaned)) return true;
  return false;
}

function dueLabel(task: CourseTask): string {
  if (!task.dueDate) return "No trustworthy due date";
  const delta = Math.round((task.dueDate - Date.now()) / (24 * 60 * 60 * 1000));
  if (!Number.isFinite(delta) || delta < -45 || delta > 365) return "No trustworthy due date";
  if (delta < 0) return `${Math.abs(delta)} day${Math.abs(delta) === 1 ? "" : "s"} overdue`;
  if (delta === 0) return "Due today";
  return `Due in ${delta} day${delta === 1 ? "" : "s"}`;
}

function conceptMap(learning: LearningBundle): Map<string, LearningConcept> {
  return new Map(learning.concepts.map((concept) => [concept.id, concept]));
}

function itemMap(bundle: CaptureBundle): Map<string, CaptureItem> {
  return new Map(bundle.items.map((item) => [item.id, item]));
}

function bestEvidenceExcerpt(evidence: EvidenceFragment[] | undefined): string[] {
  return (evidence ?? [])
    .map((entry) => entry.excerpt.trim())
    .filter(Boolean)
    .slice(0, 3)
    .map((entry) => preview(entry, 160));
}

function conceptCard(concept: LearningConcept): StudyConceptCard {
  return {
    id: concept.id,
    label: concept.label,
    definition: concept.definition || concept.summary || concept.label,
    summary: concept.summary || concept.definition || "",
    primer: concept.primer || "",
    distinction: concept.fieldSupport?.commonConfusion?.evidence?.[0]?.excerpt ?? "",
    transfer: concept.transferHook || "",
    trap: concept.commonConfusion || "",
    keywords: concept.keywords,
    evidence: [
      ...bestEvidenceExcerpt(concept.fieldSupport?.definition?.evidence),
      ...bestEvidenceExcerpt(concept.fieldSupport?.summary?.evidence)
    ].slice(0, 4)
  };
}

function shouldShowConcept(card: StudyConceptCard): boolean {
  if (isWeakLabel(card.label)) return false;
  if (!card.definition || card.definition.length < 24) return false;
  if (NOISE_PATTERNS.some((pattern) => pattern.test(card.definition) || pattern.test(card.summary))) return false;
  if (card.evidence.length === 0 && card.summary.length < 40) return false;
  return true;
}

function shouldShowTask(task: Pick<StudyTaskCard, "title" | "summary">): boolean {
  if (isWeakLabel(task.title)) return false;
  if (NOISE_PATTERNS.some((pattern) => pattern.test(task.title) || pattern.test(task.summary))) return false;
  if (PROFILE_OR_ONBOARDING_PATTERNS.some((pattern) => pattern.test(task.title) || pattern.test(task.summary))) return false;
  return true;
}

function sourceCard(item: CaptureItem): StudySourceCard {
  return {
    id: item.id,
    title: item.title,
    kind: item.kind,
    preview: preview(item.plainText || item.excerpt || item.title, 180),
    url: item.canonicalUrl,
    tags: item.tags ?? []
  };
}

function shouldShowSource(source: StudySourceCard): boolean {
  if (isWeakLabel(source.title)) return false;
  if (NOISE_PATTERNS.some((pattern) => pattern.test(source.title) || pattern.test(source.preview))) return false;
  if (PROFILE_OR_ONBOARDING_PATTERNS.some((pattern) => pattern.test(source.title) || pattern.test(source.preview))) return false;
  return true;
}

function overlapScore(task: CourseTask, item: CaptureItem, conceptIds: string[], concepts: Map<string, LearningConcept>): number {
  if (task.sourceItemId === item.id) return 0;
  const taskTokens = new Set(tokens(`${task.title} ${task.summary} ${task.requirementLines.join(" ")}`));
  const itemTokens = new Set(tokens(`${item.title} ${item.headingTrail.join(" ")} ${item.plainText}`));
  const tokenOverlap = [...taskTokens].filter((token) => itemTokens.has(token)).length;
  const conceptOverlap = conceptIds.reduce((count, conceptId) => {
    const concept = concepts.get(conceptId);
    if (!concept) return count;
    const conceptTokens = new Set(tokens(`${concept.label} ${concept.summary} ${concept.definition}`));
    const intersects = [...conceptTokens].some((token) => itemTokens.has(token));
    return count + (intersects ? 1 : 0);
  }, 0);
  return tokenOverlap + conceptOverlap * 2 + (item.kind === "document" ? 2 : 0) + (item.kind === "page" ? 1 : 0);
}

function supportSourcesForTask(task: CourseTask, bundle: CaptureBundle, concepts: Map<string, LearningConcept>): StudySourceCard[] {
  return bundle.items
    .map((item) => ({ item, score: overlapScore(task, item, task.conceptIds, concepts) }))
    .filter((entry) => entry.score >= 3)
    .sort((left, right) => right.score - left.score)
    .slice(0, 4)
    .map((entry) => sourceCard(entry.item));
}

function evidenceBulletsForTask(
  task: CourseTask,
  learning: LearningBundle,
  concepts: Map<string, LearningConcept>
): string[] {
  const mapping = learning.synthesis.assignmentMappings.find((entry) => entry.sourceItemId === task.sourceItemId);
  const bullets = new Set<string>();

  for (const line of mapping?.checklist ?? task.requirementLines) {
    const cleaned = line.trim();
    if (cleaned.length >= 12) bullets.add(cleaned.endsWith(".") ? cleaned : `${cleaned}.`);
  }

  for (const conceptId of task.conceptIds) {
    const concept = concepts.get(conceptId);
    if (!concept) continue;
    const candidate = concept.summary || concept.definition;
    if (candidate && candidate.length >= 18) bullets.add(preview(candidate, 160));
    bestEvidenceExcerpt(concept.fieldSupport?.definition?.evidence).forEach((entry) => bullets.add(entry));
  }

  return [...bullets].slice(0, 5);
}

function readinessForTask(task: CourseTask, progress: AppProgress): "ready" | "partial" | "needs-evidence" {
  if (task.conceptIds.length === 0) return "needs-evidence";
  const scores = task.conceptIds.map((id) => progress.conceptMastery[id] ?? 0);
  const avg = scores.reduce((sum, value) => sum + value, 0) / Math.max(scores.length, 1);
  if (avg >= 0.75) return "ready";
  if (avg >= 0.35) return "partial";
  return "needs-evidence";
}

export function buildStudyWorkbenchData(
  bundle: CaptureBundle,
  learning: LearningBundle,
  workspace: { tasks: CourseTask[]; chapters: ForgeChapter[] },
  progress: AppProgress
): StudyWorkbenchData {
  const concepts = conceptMap(learning);
  const sources = bundle.items.map(sourceCard).filter(shouldShowSource);
  const sourceItems = itemMap(bundle);

  const tasks = workspace.tasks.map((task) => {
    const mapping = learning.synthesis.assignmentMappings.find((entry) => entry.sourceItemId === task.sourceItemId);
    const linkedConcepts = task.conceptIds
      .map((conceptId) => concepts.get(conceptId))
      .filter((concept): concept is LearningConcept => Boolean(concept))
      .slice(0, 4)
      .map((concept) => ({
        id: concept.id,
        label: concept.label,
        summary: preview(concept.summary || concept.definition || concept.label, 140)
      }));

    const sourceSupport = supportSourcesForTask(task, bundle, concepts);
    const evidenceBullets = evidenceBulletsForTask(task, learning, concepts);

    return {
      id: task.id,
      title: task.title,
      kind: task.kind,
      dueLabel: dueLabel(task),
      summary: preview(mapping?.summary || task.summary || sourceItems.get(task.sourceItemId)?.excerpt || "", 200),
      requirementLines: (mapping?.checklist?.length ? mapping.checklist : task.requirementLines).slice(0, 6),
      conceptIds: task.conceptIds,
      concepts: linkedConcepts,
      sourceSupport,
      evidenceBullets,
      likelySkills: mapping?.likelySkills?.slice(0, 6) ?? [],
      pitfalls: mapping?.likelyPitfalls?.slice(0, 3) ?? [],
      readiness: readinessForTask(task, progress)
    } satisfies StudyTaskCard;
  }).filter((task) => shouldShowTask(task));

  const conceptCards = learning.concepts
    .map(conceptCard)
    .filter(shouldShowConcept)
    .slice(0, 24);

  const conceptScores = Object.values(progress.conceptMastery);
  const mastered = conceptScores.filter((value) => value >= 0.8).length;
  const learningCount = conceptScores.filter((value) => value >= 0.35 && value < 0.8).length;

  return {
    title: bundle.title,
    deterministicHash: learning.synthesis.deterministicHash,
    qualityBanner: learning.synthesis.qualityBanner,
    qualityWarnings: learning.synthesis.qualityWarnings,
    sourceSummary: {
      items: bundle.items.length,
      assignments: bundle.items.filter((item) => item.kind === "assignment").length,
      discussions: bundle.items.filter((item) => item.kind === "discussion").length,
      documents: bundle.items.filter((item) => item.kind === "document").length,
      pages: bundle.items.filter((item) => item.kind === "page").length,
      modules: bundle.items.filter((item) => item.kind === "module").length
    },
    tasks,
    concepts: conceptCards,
    sources,
    chapters: workspace.chapters,
    likelySkills: learning.synthesis.likelyAssessedSkills,
    progress: {
      mastered,
      learning: learningCount,
      totalConcepts: conceptCards.length
    }
  };
}
