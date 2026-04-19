/**
 * shell-mapper.ts
 *
 * Translates the real data pipeline (LearningBundle + workspace + CaptureBundle)
 * into the exact data shapes expected by AeonthraShell.
 *
 * Every field in every type here corresponds to a field used in the shell's JSX.
 * Do not remove fields — add optional ones if you extend the schema later.
 */

import type { CaptureBundle, LearningBundle, LearningConcept, ConceptRelation, EvidenceFragment } from "@learning/schema";
import type { CourseTask, ForgeChapter } from "./workspace";
import { buildAtlasSkillTree, type AtlasSkillTree } from "./atlas-skill-tree";

// ─── Shell data types ──────────────────────────────────────────────────────────

export type ShellCourse = {
  code: string;
  title: string;
  term: string;
};

export type ShellTFQuestion = {
  statement: string;
  answer: boolean;
  explanation: string;
};

export type ShellMCOption = string;

export type ShellMCQuestion = {
  question: string;
  options: ShellMCOption[];
  correctIndex: number;
  explanation: string;
};

export type ShellDilemmaOption = {
  text: string;
  framework: string;
  why: string;
};

export type ShellDilemma = {
  text: string;
  options: ShellDilemmaOption[];
};

export type ShellConcept = {
  id: string;
  name: string;
  cat: string;
  core: string;     // 1-sentence definition
  depth: string;    // deeper explanation
  dist: string;     // how it differs from similar concepts
  hook: string;     // memory hook / mnemonic
  trap: string;     // common student mistake
  kw: string[];     // keywords for question generation
  conn: string[];   // related concept IDs
  dil: ShellDilemma | null;
  tf: ShellTFQuestion[];
  mc: ShellMCQuestion[];
  practiceReady: boolean;
  practiceSupportLabel: string;
};

export type ShellAssignment = {
  id: string;
  title: string;
  sub: string;          // subtitle / topic
  type: string;         // emoji type icon
  due: number;          // days until due (0 = today, negative = overdue)
  dueLabel: string;
  dueState: "unknown" | "upcoming" | "today" | "overdue";
  pts: number;          // point value
  con: string[];        // required concept IDs
  tip: string;
  reallyAsking: string;
  demand: string;
  demandIcon: string;
  secretCare: string;
  failModes: string[];
  evidence: string;
  quickPrep: string;
  requirementLines: string[];
  skills: string[];
};

export type ShellTextbookChapter = {
  title: string;
  pages: string;
  summary: string;
};

export type ShellModule = {
  id: string;
  title: string;
  ch: string;      // "Chapters N-M"
  pages: string;   // "pp. X-Y"
  desc: string;
  concepts: string[];
  textbook: ShellTextbookChapter[];
};

export type ShellReadingSection = {
  heading: string;
  body: string;
};

export type ShellReading = {
  id: string;
  module: string;     // module ID this reading belongs to
  title: string;
  subtitle: string;   // "Chapter N · pp. X-Y"
  type: "chapter" | "discussion" | "document";
  concepts: string[];
  assignments: string[];
  sections: ShellReadingSection[];
};

export type ShellMarginAnnotation = {
  type: "hook" | "plain" | "confusion" | "assignment" | "border" | "thesis" | "oracle" | "memory";
  text: string;
  color: string;
};

export type ShellTranscriptLine = {
  t: number;     // timestamp in seconds
  text: string;
};

export type ShellTranscriptSegment = {
  id: string;
  label: string;
  ts: number;    // start timestamp
  lines: ShellTranscriptLine[];
};

export type ShellTranscript = {
  id: string;
  title: string;
  speaker: string;
  duration: number;  // total seconds
  type: "lecture" | "discussion";
  concepts: string[];
  assignments: string[];
  segments: ShellTranscriptSegment[];
};

export type ShellDistinction = {
  a: string;      // concept ID A
  b: string;      // concept ID B
  label: string;  // "X vs Y"
  border: string; // where one stops and other begins
  trap: string;   // why students confuse them
  twins: string;  // why they look similar
  enemy: string;  // where they directly conflict
};

export type ShellPhilosopherQuote = {
  x: string;    // quote text
  p: number;    // page number
  tg: string[]; // tags for oracle matching
};

export type ShellPhilosopher = {
  n: string;             // name
  t: string;             // tradition
  q: ShellPhilosopherQuote[];
};

export type ShellFocusTheme = {
  id: string;
  label: string;
  score: number;
  summary: string;
  verbs: string[];
  conceptIds?: string[];
  evidence: string[];
};

export type ShellAssignmentIntel = {
  id: string;
  sourceItemId: string;
  title: string;
  summary: string;
  likelySkills: string[];
  conceptIds: string[];
  focusThemeIds: string[];
  checklist: string[];
  likelyPitfalls: string[];
  evidence: EvidenceFragment[];
  projectionSuppressed?: boolean;
};

export type ShellRetentionModule = {
  id: string;
  kind: string;
  title: string;
  summary: string;
  prompts: string[];
};

export type ShellSynthesis = {
  sourceCoverage: {
    canvasItems: number;
    textbookItems: number;
    assignments: number;
    discussions: number;
    quizzes: number;
    pages: number;
    modules: number;
    documents: number;
  };
  stableConceptCount: number;
  likelyAssessedSkills: string[];
  focusThemes: ShellFocusTheme[];
  assignmentIntel: ShellAssignmentIntel[];
  retentionModules: ShellRetentionModule[];
  deterministicHash: string;
  /** Non-empty when source quality is degraded or weak; surface to the user */
  qualityBanner: string;
  /** All human-readable quality warnings; shown in Settings / diagnostics view */
  qualityWarnings: string[];
  /** Synthesis confidence posture for the current bundle */
  synthesisMode: "full" | "degraded" | "blocked-with-warning";
};

export type ShellData = {
  course: ShellCourse;
  concepts: ShellConcept[];
  assignments: ShellAssignment[];
  modules: ShellModule[];
  reading: ShellReading[];
  margins: Record<string, ShellMarginAnnotation[]>;
  transcripts: ShellTranscript[];
  dists: ShellDistinction[];
  philosophers: ShellPhilosopher[];
  synthesis: ShellSynthesis;
  skillTree: AtlasSkillTree;
};

// ─── Canvas metadata cleaner ──────────────────────────────────────────────────

// Strips metadata that Canvas injects after assignment titles:
//   "Due 1/6/2026, 11:59:00 PM Points 10 Submission types discuss"
// This contaminates concept labels, definitions, and summaries extracted by the
// content engine from raw Canvas plainText.
function cleanCanvasText(text: string): string {
  return text
    .replace(/\s+Due\s+(?:\d{1,2}\/\d{1,2}\/\d{4}|[A-Z][a-z]+\s+\d{1,2},?\s+\d{4})[\s\S]*/gi, "")
    .replace(/\s+Points\s+\d+\b[\s\S]*/gi, "")
    .replace(/\s+Submission\s+types?[\s\S]*/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

const SCAFFOLD_LABELS = new Set([
  "common confusion",
  "common mistake",
  "core idea",
  "going deeper",
  "initial post",
  "key distinction",
  "memory hook",
  "real world application",
  // Canvas rubric section headings that appear as concept categories
  "why it matters",
  "key takeaway",
  "key takeaways",
  "think about it",
  "big picture",
  "background",
  "overview",
  "introduction",
  "summary",
  "discussion",
  "reply post",
  "context",
  "reflection",
  "application",
  "wrap up",
  "wrap-up"
]);

function normalizeShellText(text: string | null | undefined): string {
  return cleanCanvasText(text ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

const NOISY_ASSIGNMENT_TEXT_PATTERNS = [
  /you need to have javascript enabled/i,
  /javascript enabled/i,
  /enable javascript/i,
  /course capture/i,
  /week\s+\d+\s+discussion forum/i,
  /reply to classmates?/i,
  /reply to classmate/i,
  /create(?:ing)? produce new or/i,
  /access this site/i,
  /browser fallback/i,
  /submission types?/i,
  /points?\s+\d+\b/i
];

function sentenceCount(text: string): number {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .length;
}

function isNoisyAssignmentProjection(text: string | null | undefined): boolean {
  const normalized = normalizeShellText(text);
  if (!normalized) return false;
  if (NOISY_ASSIGNMENT_TEXT_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return true;
  }
  if (normalized.length > 180 && sentenceCount(normalized) >= 3) {
    return true;
  }
  return false;
}

function cleanProjectedText(text: string | null | undefined): string {
  const normalized = normalizeShellText(text);
  if (!normalized || isNoisyAssignmentProjection(normalized)) {
    return "";
  }
  return normalized;
}

function cleanProjectedLines(lines: string[] | null | undefined): string[] {
  if (!lines || lines.length === 0) {
    return [];
  }
  if (lines.some((line) => isNoisyAssignmentProjection(line))) {
    return [];
  }
  return lines
    .map((line) => cleanProjectedText(line))
    .filter((line) => line.length > 0)
    .slice(0, 4);
}

// Truncate at a word boundary so we never slice mid-word.
// Returns text with "…" appended when truncation occurs.
function wordTruncate(text: string, max: number): string {
  const clean = normalizeShellText(text);
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max).replace(/\s+\S*$/, "");
  return `${cut}…`;
}

function normalizeComparisonText(text: string | null | undefined): string {
  return normalizeShellText(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildByIdMap<T extends { id: string }>(items: T[]): Map<string, T> {
  return new Map(items.map((item) => [item.id, item] as const));
}

function buildRelatedConceptIdsByConceptId(relations: ConceptRelation[]): Map<string, string[]> {
  const relatedIdsByConceptId = new Map<string, Set<string>>();
  for (const relation of relations) {
    const fromIds = relatedIdsByConceptId.get(relation.fromId) ?? new Set<string>();
    fromIds.add(relation.toId);
    relatedIdsByConceptId.set(relation.fromId, fromIds);

    const toIds = relatedIdsByConceptId.get(relation.toId) ?? new Set<string>();
    toIds.add(relation.fromId);
    relatedIdsByConceptId.set(relation.toId, toIds);
  }

  return new Map(
    [...relatedIdsByConceptId.entries()].map(([conceptId, ids]) => [conceptId, [...ids]] as const)
  );
}

function buildContrastRelationByConceptId(relations: ConceptRelation[]): Map<string, ConceptRelation> {
  const contrastByConceptId = new Map<string, ConceptRelation>();
  for (const relation of relations) {
    if (relation.type !== "contrasts") {
      continue;
    }
    if (!contrastByConceptId.has(relation.fromId)) {
      contrastByConceptId.set(relation.fromId, relation);
    }
    if (!contrastByConceptId.has(relation.toId)) {
      contrastByConceptId.set(relation.toId, relation);
    }
  }
  return contrastByConceptId;
}

function buildAssignmentIdsByConceptId(tasks: CourseTask[]): Map<string, string[]> {
  const assignmentIdsByConceptId = new Map<string, Set<string>>();
  for (const task of tasks) {
    for (const conceptId of task.conceptIds) {
      const assignmentIds = assignmentIdsByConceptId.get(conceptId) ?? new Set<string>();
      assignmentIds.add(task.id);
      assignmentIdsByConceptId.set(conceptId, assignmentIds);
    }
  }

  return new Map(
    [...assignmentIdsByConceptId.entries()].map(([conceptId, ids]) => [conceptId, [...ids]] as const)
  );
}

function comparisonTokens(text: string | null | undefined): string[] {
  return Array.from(new Set(
    normalizeComparisonText(text)
      .split(" ")
      .filter((token) => token.length >= 4)
  ));
}

function isScaffoldConceptLabel(label: string): boolean {
  const normalized = normalizeComparisonText(label);
  return normalized.length < 4 || SCAFFOLD_LABELS.has(normalized);
}

function isRenderableConceptText(text: string | null | undefined): boolean {
  const normalized = normalizeShellText(text);
  if (normalized.length < 20) return false;
  if (isScaffoldConceptLabel(normalized)) return false;
  if (/^(note|remember|be sure|make sure|please)\b/i.test(normalized)) return false;
  return true;
}

function isCompleteThought(text: string | null | undefined): boolean {
  const normalized = normalizeShellText(text);
  return normalized.length >= 20 && /[.!?]$/.test(normalized) && !normalized.endsWith("...");
}

function isRenderableCueText(text: string | null | undefined): boolean {
  const normalized = normalizeShellText(text);
  return normalized.length >= 8 && !isScaffoldConceptLabel(normalized);
}

function isDistinctFrom(reference: string, candidate: string | null | undefined): boolean {
  const candidateNormalized = normalizeComparisonText(candidate);
  if (!candidateNormalized) return false;
  const referenceNormalized = normalizeComparisonText(reference);
  if (
    candidateNormalized === referenceNormalized
    || candidateNormalized.includes(referenceNormalized)
    || referenceNormalized.includes(candidateNormalized)
  ) {
    return false;
  }

  const referenceTokenSet = new Set(comparisonTokens(reference));
  const candidateTokens = comparisonTokens(candidate);
  if (referenceTokenSet.size === 0 || candidateTokens.length === 0) {
    return true;
  }

  const sharedCount = candidateTokens.filter((token) => referenceTokenSet.has(token)).length;
  const overlapRatio = sharedCount / Math.min(referenceTokenSet.size, candidateTokens.length);
  return overlapRatio < 0.7;
}

function conceptCoreText(concept: LearningConcept): string {
  const definitionSupport = concept.fieldSupport?.definition;
  const summarySupport = concept.fieldSupport?.summary;
  if ((definitionSupport?.evidence.length ?? 0) > 0) {
    return normalizeShellText(concept.definition);
  }
  if ((summarySupport?.evidence.length ?? 0) > 0) {
    return normalizeShellText(concept.summary);
  }
  return "";
}

function conceptDepthText(concept: LearningConcept): string {
  const core = conceptCoreText(concept);
  if (!core) {
    return "";
  }
  const candidates = [concept.primer, concept.summary, concept.excerpt, concept.transferHook];
  for (const candidate of candidates) {
    const fieldId =
      candidate === concept.primer ? "primer" :
      candidate === concept.summary ? "summary" :
      candidate === concept.transferHook ? "transferHook" :
      "summary";
    const support = concept.fieldSupport?.[fieldId];
    if ((support?.evidence.length ?? 0) === 0) continue;
    if (!isRenderableConceptText(candidate)) continue;
    if (isNegationOnlyText(candidate)) continue;
    if (!isCompleteThought(candidate)) continue;
    if (!isDistinctFrom(core, candidate)) continue;
    return normalizeShellText(candidate);
  }
  return "";
}

function isNegationOnlyText(text: string | null | undefined): boolean {
  if (!text) return false;
  // Reject scaffold "X is not Y. Keep their main moves separate." patterns
  return /\bis not\b[^.]+\.\s*Keep their main moves\b/i.test(text);
}

function conceptDistinctionText(
  concept: LearningConcept,
  allConceptsById: Map<string, LearningConcept>,
  contrastByConceptId: Map<string, ConceptRelation>
): string {
  const core = conceptCoreText(concept);
  if (!core) {
    return "";
  }
  const depth = conceptDepthText(concept);
  const contrast = contrastByConceptId.get(concept.id) ?? null;
  const otherConceptId = contrast
    ? (contrast.fromId === concept.id ? contrast.toId : contrast.fromId)
    : null;
  const otherConcept = otherConceptId
    ? allConceptsById.get(otherConceptId) ?? null
    : null;
  const relationDistinction = contrast && otherConcept
    ? `${concept.label} differs from ${otherConcept.label}: ${normalizeShellText(contrast.label)}.`
    : "";
  // Prefer relation-based distinction over commonConfusion (which can be negation-only scaffolding)
  const candidates = [relationDistinction, concept.commonConfusion, concept.summary, concept.excerpt, concept.transferHook];
  for (const candidate of candidates) {
    const support =
      candidate === concept.commonConfusion ? concept.fieldSupport?.commonConfusion :
      candidate === concept.transferHook ? concept.fieldSupport?.transferHook :
      concept.fieldSupport?.summary;
    if (candidate !== relationDistinction && (support?.evidence.length ?? 0) === 0) continue;
    if (!isRenderableConceptText(candidate)) continue;
    if (isNegationOnlyText(candidate)) continue;
    if (!isDistinctFrom(core, candidate)) continue;
    if (depth && !isDistinctFrom(depth, candidate)) continue;
    return normalizeShellText(candidate);
  }
  return "";
}

function conceptHookText(concept: LearningConcept): string {
  const core = conceptCoreText(concept);
  if (!core || (concept.fieldSupport?.mnemonic?.evidence.length ?? 0) === 0) {
    return "";
  }
  const depth = conceptDepthText(concept);
  const candidates = [concept.mnemonic];
  for (const candidate of candidates) {
    if (!isRenderableCueText(candidate)) continue;
    if (!isDistinctFrom(core, candidate)) continue;
    if (depth && !isDistinctFrom(depth, candidate)) continue;
    return normalizeShellText(candidate);
  }
  return "";
}

function dedupeMcOptions(options: string[]): string[] {
  const seen = new Set<string>();
  return options
    .map((option) => normalizeShellText(option))
    .filter((option) => option.length > 0)
    .filter((option) => {
      const key = normalizeComparisonText(option);
      if (!key || seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
}

function conceptTrapText(concept: LearningConcept): string {
  const core = conceptCoreText(concept);
  if (!core || (concept.fieldSupport?.commonConfusion?.evidence.length ?? 0) === 0) {
    return "";
  }
  const depth = conceptDepthText(concept);
  if (
    isRenderableConceptText(concept.commonConfusion)
    && !isNegationOnlyText(concept.commonConfusion)
    && isDistinctFrom(core, concept.commonConfusion)
    && (!depth || isDistinctFrom(depth, concept.commonConfusion))
  ) {
    return normalizeShellText(concept.commonConfusion);
  }
  return "";
}

type PracticeSupportContext = {
  allowCuratedPractice: boolean;
  assignmentEvidenceByConceptId: Map<string, number>;
};

function buildPracticeSupportContext(
  bundle: CaptureBundle,
  learning: LearningBundle
): PracticeSupportContext {
  const assignmentEvidenceByConceptId = new Map<string, number>();
  learning.synthesis.assignmentMappings.forEach((mapping) => {
    if (mapping.evidence.length === 0) {
      return;
    }
    mapping.conceptIds.forEach((conceptId) => {
      assignmentEvidenceByConceptId.set(
        conceptId,
        (assignmentEvidenceByConceptId.get(conceptId) ?? 0) + mapping.evidence.length
      );
    });
  });
  return {
    allowCuratedPractice: bundle.source === "demo",
    assignmentEvidenceByConceptId
  };
}

function getPracticeSupportState(
  concept: LearningConcept,
  context: PracticeSupportContext
): { ready: boolean; label: string } {
  if (context.allowCuratedPractice) {
    return {
      ready: true,
      label: "Demo mode keeps curated practice enabled."
    };
  }

  const transferEvidenceCount = concept.fieldSupport?.transferHook?.evidence?.length ?? 0;
  if (transferEvidenceCount > 0) {
    return {
      ready: true,
      label: "Source-backed transfer evidence is available."
    };
  }

  const assignmentEvidenceCount = context.assignmentEvidenceByConceptId.get(concept.id) ?? 0;
  if (assignmentEvidenceCount > 0) {
    return {
      ready: true,
      label: "Assignment evidence is available for this concept."
    };
  }

  return {
    ready: false,
    label: "Practice unlocks after transfer or assignment evidence is captured."
  };
}

const DOMINANT_CONCEPT_STOPWORDS = new Set([
  "about",
  "action",
  "actions",
  "analysis",
  "apply",
  "argument",
  "assignment",
  "chapter",
  "compare",
  "concept",
  "concepts",
  "course",
  "discussion",
  "evidence",
  "example",
  "examples",
  "explain",
  "framework",
  "frameworks",
  "guide",
  "idea",
  "ideas",
  "learning",
  "lesson",
  "module",
  "moral",
  "practice",
  "reading",
  "reasoning",
  "section",
  "source",
  "student",
  "students",
  "study",
  "topic",
  "topics",
  "week"
]);

function tokenizeConceptEvidence(text: string | null | undefined): string[] {
  return normalizeComparisonText(text)
    .split(" ")
    .filter((token) => token.length >= 4 && !DOMINANT_CONCEPT_STOPWORDS.has(token));
}

function containsNormalizedPhrase(haystack: string, phrase: string | null | undefined): boolean {
  const normalizedPhrase = normalizeComparisonText(phrase);
  if (!normalizedPhrase) {
    return false;
  }
  return ` ${haystack} `.includes(` ${normalizedPhrase} `);
}

function conceptEvidenceTokens(concept: ShellConcept): string[] {
  return [
    ...new Set([
      ...tokenizeConceptEvidence(concept.name),
      ...concept.kw.flatMap((keyword) => tokenizeConceptEvidence(keyword))
    ])
  ];
}

export function resolveDominantShellConceptId(
  reading: Pick<ShellReading, "title" | "concepts">,
  section: ShellReadingSection | null | undefined,
  concepts: ShellConcept[],
  conceptById?: Map<string, ShellConcept>
): string | null {
  if (!section || reading.concepts.length === 0 || concepts.length === 0) {
    return null;
  }

  const haystack = normalizeComparisonText([reading.title, section.heading, section.body].join(" "));
  if (!haystack) {
    return null;
  }

  const haystackTokens = new Set(tokenizeConceptEvidence(haystack));
  const scores = reading.concepts
    .map((conceptId) => conceptById?.get(conceptId) ?? concepts.find((concept) => concept.id === conceptId))
    .filter((concept): concept is ShellConcept => Boolean(concept))
    .map((concept) => {
      const labelPhraseHit = containsNormalizedPhrase(haystack, concept.name);
      const keywordPhraseHits = concept.kw.filter((keyword) => containsNormalizedPhrase(haystack, keyword)).length;
      const labelTokenHits = tokenizeConceptEvidence(concept.name).filter((token) => haystackTokens.has(token)).length;
      const evidenceTokenHits = conceptEvidenceTokens(concept).filter((token) => haystackTokens.has(token)).length;
      return {
        conceptId: concept.id,
        score:
          (labelPhraseHit ? 10 : 0)
          + Math.min(8, keywordPhraseHits * 4)
          + Math.min(6, labelTokenHits * 2)
          + Math.min(6, evidenceTokenHits),
        directSignal: labelPhraseHit || keywordPhraseHits > 0
      };
    })
    .sort((left, right) => right.score - left.score);

  const top = scores[0];
  const runnerUp = scores[1];

  if (!top) {
    return null;
  }
  if (top.score < 7) {
    return null;
  }
  if (!top.directSignal && top.score < 10) {
    return null;
  }
  if (runnerUp && top.score - runnerUp.score < 3) {
    return null;
  }

  return top.conceptId;
}

// ─── Question generators ───────────────────────────────────────────────────────

function generateTF(c: LearningConcept): ShellTFQuestion[] {
  const label = normalizeShellText(c.label);
  if (isScaffoldConceptLabel(label)) {
    return [];
  }

  const definition = normalizeShellText(c.definition);
  const shortDef = definition.length > 120
    ? definition.slice(0, 120).trimEnd() + "..."
    : definition;

  const items: ShellTFQuestion[] = [{
    statement: `${label} holds that: ${shortDef}`,
    answer: true,
    explanation: definition
  }];

  // commonConfusion "X is not Y" is actually TRUE — don't code it as FALSE.
  // Instead generate a genuinely false distortion from the definition.
  const defWords = definition.toLowerCase().split(/\s+/);
  const hasHelps = defWords.includes("helps");
  const hasFocuses = defWords.includes("focuses");
  if (hasHelps || hasFocuses) {
    items.push({
      statement: hasHelps
        ? normalizeShellText(c.definition.replace(/\bhelps\b/i, "ignores"))
        : normalizeShellText(c.definition.replace(/\bfocuses\b/i, "avoids")),
      answer: false,
      explanation: definition
    });
  }

  if (isRenderableConceptText(c.transferHook) && isCompleteThought(c.transferHook)) {
    items.push({
      statement: normalizeShellText(c.transferHook),
      answer: true,
      explanation: normalizeShellText(c.primer || c.definition)
    });
  }

  // Only include keyword swap if ≥ 2 distinct keywords exist — avoids "X rather than X" loops.
  if (c.keywords.length >= 2 && c.keywords[0] !== c.keywords[c.keywords.length - 1]) {
    items.push({
      statement: `${label} is primarily concerned with ${c.keywords[c.keywords.length - 1]} rather than ${c.keywords[0]}.`,
      answer: false,
      explanation: definition
    });
  }

  return items.slice(0, 4);
}

function generateMC(c: LearningConcept, allConcepts: LearningConcept[]): ShellMCQuestion[] {
  const label = normalizeShellText(c.label);
  if (isScaffoldConceptLabel(label)) {
    return [];
  }

  const others = allConcepts.filter((x) => x.id !== c.id).slice(0, 3);

  const q1: ShellMCQuestion = {
    question: `Which best describes ${label}?`,
    options: dedupeMcOptions([
      normalizeShellText(c.definition),
      normalizeShellText(others[0]?.definition) || `The general study of ${c.keywords[1] ?? "this topic"}.`,
      // Use a distorted definition rather than commonConfusion "X is not Y" — that reads as correct
      c.definition.replace(/\bhelps\b/i, "ignores").replace(/\bfocuses on\b/i, "avoids") !== c.definition
        ? normalizeShellText(c.definition.replace(/\bhelps\b/i, "ignores").replace(/\bfocuses on\b/i, "avoids"))
        : `A vague guideline rather than a concept with a specific claim.`,
      normalizeShellText(others[1]?.definition) || `A rule that applies without considering context.`
    ]),
    correctIndex: 0,
    explanation: normalizeShellText(c.definition)
  };

  const q2: ShellMCQuestion = {
    question: `When is ${label} most useful to apply?`,
    options: dedupeMcOptions([
      `Only in formal written assignments`,
      normalizeShellText(c.transferHook) || `When the task directly requires understanding ${label}.`,
      `Only when the outcome is already known`,
      `Whenever a source mentions a related topic`
    ]),
    correctIndex: 1,
    explanation: normalizeShellText(c.transferHook || c.primer || c.definition)
  };

  // q3: the correct answer must be a genuine misconception (what students incorrectly believe),
  // NOT the commonConfusion correction ("X is not Y") which is a true statement.
  const relatedLabel = others[0]?.label ? normalizeShellText(others[0].label) : null;
  const misconception = relatedLabel
    ? `That ${label} and ${relatedLabel} mean the same thing and can be swapped in an explanation.`
    : `That ${label} is a general heading rather than a concept with a precise claim.`;
  const q3: ShellMCQuestion = {
    question: `A common misunderstanding about ${label} is:`,
    options: dedupeMcOptions([
      misconception,
      normalizeShellText(c.definition),
      conceptHookText(c),
      `That ${label} can be fully mastered through a single exposure without practice`
    ]),
    correctIndex: 0,
    explanation: `The misconception is: ${misconception} The actual claim: ${normalizeShellText(c.definition)}`
  };

  return [q1, q2, q3];
}

function generateDilemma(c: LearningConcept): ShellDilemma {
  const label = normalizeShellText(c.label);
  const transferHook = normalizeShellText(c.transferHook) || `apply ${label} to navigate the situation effectively.`;
  const kws = c.keywords.map(k => k.toLowerCase());

  // Pick a scenario that best fits the concept's domain
  let scenario: string;
  if (kws.some(k => /memory|recall|retention|study|review|spacing/.test(k))) {
    scenario = `A student has an exam tomorrow but hasn't reviewed the material yet. They're deciding how to use the next two hours. Apply ${label} to help them decide.`;
  } else if (kws.some(k => /time|schedul|priorit|procrastin|plan|organiz/.test(k))) {
    scenario = `A student realizes they've been putting off a major project that's due in three days. They also have two smaller tasks due tomorrow. Apply ${label} to help them figure out what to do.`;
  } else if (kws.some(k => /stress|anxiet|overwhelm|emotion|wellbeing|mental/.test(k))) {
    scenario = `A student is feeling overwhelmed by coursework and hasn't slept well this week. They're unsure whether to push through or take a break. Apply ${label} to guide their decision.`;
  } else if (kws.some(k => /note|read|comprehension|textbook|lecture|listen/.test(k))) {
    scenario = `A student is struggling to keep up with the reading and isn't sure their notes are helping them retain anything. Apply ${label} to help them improve their approach.`;
  } else if (kws.some(k => /goal|motivat|mindset|growth|achievement|success/.test(k))) {
    scenario = `A student keeps starting new goals but losing motivation after a few days. They want to do better this semester. Apply ${label} to help them build a more sustainable approach.`;
  } else {
    scenario = `A student is unsure how to approach a challenging assignment and is tempted to just submit something without fully understanding it. Apply ${label} to help them make a better decision.`;
  }

  return {
    text: scenario,
    options: [
      {
        text: `Apply ${label}: ${transferHook.slice(0, 100)}`,
        framework: label,
        why: normalizeShellText(c.definition)
      },
      {
        text: `Focus on the immediate outcome — just get it done and move on.`,
        framework: "Short-term view",
        why: "What gets the most immediate relief?"
      },
      {
        text: `Think about what kind of student you want to become over time.`,
        framework: "Long-term growth view",
        why: "What habits does this decision build or reinforce?"
      }
    ]
  };
}

// ─── Core mappers ──────────────────────────────────────────────────────────────

function mapCourse(bundle: CaptureBundle): ShellCourse {
  const courseName = bundle.captureMeta?.courseName ?? bundle.title;
  // Try to extract a course code from the title (e.g. "PHIL 101", "ETHICS301", "ORIENT100")
  const codeMatch = courseName.match(/\b([A-Z]{2,8})\s*(\d{3,4})\b/);
  // Fallback: first uppercase word token, or generic "COURSE" — never show raw numeric IDs
  const code = codeMatch
    ? `${codeMatch[1]} ${codeMatch[2]}`
    : (courseName.match(/\b([A-Z]{3,})\b/)?.[1] ?? "COURSE");
  const capturedDate = new Date(bundle.capturedAt);
  const term = `${capturedDate.toLocaleString("default", { month: "long" })} ${capturedDate.getFullYear()}`;
  return { code, title: courseName, term };
}

function mapConcept(
  c: LearningConcept,
  allConcepts: LearningConcept[],
  conceptById: Map<string, LearningConcept>,
  relatedIdsByConceptId: Map<string, string[]>,
  contrastByConceptId: Map<string, ConceptRelation>,
  practiceSupportContext: PracticeSupportContext
): ShellConcept {
  const connectedIds = (relatedIdsByConceptId.get(c.id) ?? []).filter((id) => id !== c.id);

  const conceptName = normalizeShellText(c.label);
  const rawCat = c.category ?? "";
  // Reject scaffold labels AND cases where the category is identical to the concept name
  // (that happens when the concept was extracted from a section heading of its own name)
  const isUsefulCat =
    rawCat &&
    !isScaffoldConceptLabel(rawCat) &&
    normalizeComparisonText(rawCat) !== normalizeComparisonText(conceptName);
  const practiceSupport = getPracticeSupportState(c, practiceSupportContext);

  return {
    id: c.id,
    name: conceptName,
    cat: isUsefulCat ? rawCat : "Concept",
    core: conceptCoreText(c),
    depth: conceptDepthText(c),
    dist: conceptDistinctionText(c, conceptById, contrastByConceptId),
    hook: conceptHookText(c),
    trap: conceptTrapText(c),
    kw: c.keywords.filter((keyword) => !isScaffoldConceptLabel(keyword)),
    conn: [...new Set(connectedIds)],
    dil: practiceSupport.ready ? generateDilemma(c) : null,
    tf: practiceSupport.ready ? generateTF(c) : [],
    mc: practiceSupport.ready ? generateMC(c, allConcepts) : [],
    practiceReady: practiceSupport.ready,
    practiceSupportLabel: practiceSupport.label
  };
}

function taskTypeIcon(kind: CourseTask["kind"]): string {
  switch (kind) {
    case "discussion": return "💬";
    case "quiz": return "❓";
    case "page": return "📄";
    default: return "📝";
  }
}

function taskDemand(kind: CourseTask["kind"]): { demand: string; icon: string } {
  switch (kind) {
    case "discussion": return { demand: "Respond + Engage", icon: "💬" };
    case "quiz": return { demand: "Recall + Apply", icon: "🧠" };
    default: return { demand: "Analyze + Synthesize", icon: "🔬" };
  }
}

function daysUntil(timestamp: number | null): number {
  if (!timestamp) return Number.POSITIVE_INFINITY;
  const ms = timestamp - Date.now();
  return Math.round(ms / (24 * 60 * 60 * 1000));
}

function duePresentation(timestamp: number | null): {
  due: number;
  dueLabel: string;
  dueState: ShellAssignment["dueState"];
} {
  if (!timestamp) {
    return {
      due: Number.POSITIVE_INFINITY,
      dueLabel: "Date not captured",
      dueState: "unknown"
    };
  }
  const due = daysUntil(timestamp);
  if (due < 0) {
    return {
      due,
      dueLabel: `Overdue by ${Math.abs(due)} day${Math.abs(due) === 1 ? "" : "s"}`,
      dueState: "overdue"
    };
  }
  if (due === 0) {
    return {
      due,
      dueLabel: "Due today",
      dueState: "today"
    };
  }
  return {
    due,
    dueLabel: `Due in ${due} day${due === 1 ? "" : "s"}`,
    dueState: "upcoming"
  };
}

function toShellAssignmentIntel(
  mapping: LearningBundle["synthesis"]["assignmentMappings"][number],
  validConceptIds?: Set<string>
): ShellAssignmentIntel {
  const cleanedTitle = cleanProjectedText(mapping.title);
  const cleanedSummary = cleanProjectedText(mapping.summary);
  const cleanedChecklist = cleanProjectedLines(mapping.checklist);
  return {
    id: mapping.id,
    sourceItemId: mapping.sourceItemId,
    title: cleanedTitle,
    summary: cleanedSummary,
    likelySkills: mapping.likelySkills,
    conceptIds: validConceptIds
      ? mapping.conceptIds.filter((conceptId) => validConceptIds.has(conceptId))
      : mapping.conceptIds,
    focusThemeIds: mapping.focusThemeIds,
    checklist: cleanedChecklist,
    likelyPitfalls: mapping.likelyPitfalls,
    evidence: mapping.evidence,
    projectionSuppressed: Boolean(
      (mapping.title && !cleanedTitle)
      || (mapping.summary && !cleanedSummary)
      || ((mapping.checklist?.length ?? 0) > 0 && cleanedChecklist.length === 0)
    )
  };
}

function toShellFocusTheme(
  theme: LearningBundle["synthesis"]["focusThemes"][number],
  validConceptIds?: Set<string>
): ShellFocusTheme {
  return {
    id: theme.id,
    label: theme.label,
    score: theme.score,
    summary: theme.summary,
    verbs: theme.verbs,
    conceptIds: validConceptIds
      ? theme.conceptIds.filter((conceptId) => validConceptIds.has(conceptId))
      : theme.conceptIds,
    evidence: theme.evidence.map((fragment) => fragment.excerpt)
  };
}

function mapAssignment(
  task: CourseTask,
  conceptNameById: Map<string, string>,
  assignmentIntelBySourceItemId: Map<string, ShellAssignmentIntel>
): ShellAssignment {
  const { demand, icon } = taskDemand(task.kind);
  const intel = assignmentIntelBySourceItemId.get(task.sourceItemId) ?? assignmentIntelBySourceItemId.get(task.id);
  const conceptIds = (intel?.conceptIds.length ? intel.conceptIds : task.conceptIds).slice(0, 6);
  const intelProjectionIsNoisy = intel
    ? (
        isNoisyAssignmentProjection(intel.title)
        || isNoisyAssignmentProjection(intel.summary)
        || (intel.checklist ?? []).some((line) => isNoisyAssignmentProjection(line))
      )
    : false;
  const intelIsNoisy = Boolean(intel?.projectionSuppressed) || intelProjectionIsNoisy;
  const intelChecklist = intelIsNoisy ? [] : cleanProjectedLines(intel?.checklist ?? []);
  const taskChecklist = cleanProjectedLines(task.requirementLines);
  const reqLines = (intelChecklist.length > 0 ? intelChecklist : taskChecklist).slice(0, 4);
  const taskSummary = intelIsNoisy
    ? ""
    : cleanProjectedText(intel?.summary) || cleanProjectedText(task.summary);
  const focusConcepts = conceptIds
    .map((conceptId) => conceptNameById.get(conceptId))
    .filter((conceptName): conceptName is string => Boolean(conceptName))
    .slice(0, 2);
  const likelyPitfalls = intel?.likelyPitfalls ?? [];
  const hasGroundedPitfalls = likelyPitfalls.length > 0;
  const failModes = likelyPitfalls.length
    ? likelyPitfalls.slice(0, 3).map((pitfall) => wordTruncate(pitfall, 120))
    : [];

  const leadingEvidenceExcerpt = intel?.evidence[0]?.excerpt ?? "";
  const evidenceNeeded = hasGroundedPitfalls && leadingEvidenceExcerpt
    ? wordTruncate(leadingEvidenceExcerpt, 140)
    : "";
  const dueInfo = duePresentation(task.dueDate);
  const trustworthySummary = taskSummary && taskSummary !== task.title && taskSummary.length >= 24
    ? taskSummary
    : "";
  const title = cleanProjectedText(intel?.title) || task.title;
  const subtitle = intelIsNoisy
    ? ""
    : trustworthySummary.slice(0, 60)
      || (focusConcepts.length > 0 ? focusConcepts.join(" · ") : task.kind);

  return {
    id: task.id,
    title,
    sub: normalizeComparisonText(subtitle) === normalizeComparisonText(title) ? "" : subtitle,
    type: taskTypeIcon(task.kind),
    due: dueInfo.due,
    dueLabel: dueInfo.dueLabel,
    dueState: dueInfo.dueState,
    pts: task.pts,
    con: conceptIds,
    tip: intelIsNoisy ? "" : (trustworthySummary.slice(0, 100) || wordTruncate(cleanProjectedText(intel?.summary) || "", 100)),
    reallyAsking: intelIsNoisy
      ? ""
      : (trustworthySummary ? wordTruncate(trustworthySummary, 140) : (reqLines.length > 0 || focusConcepts.length > 0 ? trustworthySummary : "")),
    demand,
    demandIcon: icon,
    secretCare: reqLines[0] ? wordTruncate(reqLines[0], 140) : "",
    failModes,
    evidence: evidenceNeeded,
    quickPrep: focusConcepts.length > 0
      ? `Review ${focusConcepts.join(" and ")}.`
      : intel?.likelySkills.length
        ? `Prepare to ${intel.likelySkills.slice(0, 2).join(" and ")}.`
        : "",
    requirementLines: reqLines,
    skills: []
  };
}

function attachAssignmentSkillRequirements(
  assignments: ShellAssignment[],
  skillTree: AtlasSkillTree
): ShellAssignment[] {
  const requirementsByAssignmentId = new Map(
    skillTree.assignmentRequirements.map((requirement) => [requirement.assignmentId, requirement] as const)
  );

  return assignments.map((assignment) => ({
    ...assignment,
    skills: (() => {
      const requirement = requirementsByAssignmentId.get(assignment.id);
      if (!requirement) {
        return [];
      }
      if (requirement.basis === "concept-only" || requirement.skillIds.length === 0) {
        return [];
      }
      return requirement.skillIds;
    })()
  }));
}

function sanitizeModuleDesc(raw: string): string {
  return raw
    .replace(/[^.!?]*\b(?:is introduced in|is covered in)\s+Module\s+\d+[^.!?]*[.!?]\s*/gi, "")
    .replace(/[^.!?]*\bstudents must be able to\b[^.!?]*[.!?]\s*/gi, "")
    .replace(/[^.!?]*\ba major ethical framework\b[^.!?]*[.!?]\s*/gi, "")
    .trim();
}

function chapterAnchorScore(chapter: ForgeChapter): number {
  const title = normalizeShellText(chapter.title);
  const summary = normalizeShellText(chapter.summary);
  let score = 0;

  if (title && !isNoisyAssignmentProjection(title)) {
    score += 4;
    if (!isScaffoldConceptLabel(title) && title.length >= 10) {
      score += 3;
    }
  } else {
    score -= 6;
  }

  if (summary && !isNoisyAssignmentProjection(summary)) {
    score += Math.min(4, Math.floor(summary.length / 50));
  } else if (summary) {
    score -= 3;
  }

  score += Math.min(2, chapter.conceptIds.length);
  return score;
}

function pickBestChapterAnchor(chapters: ForgeChapter[]): ForgeChapter {
  return chapters
    .slice()
    .sort((left, right) => {
      const scoreDelta = chapterAnchorScore(right) - chapterAnchorScore(left);
      if (scoreDelta !== 0) {
        return scoreDelta;
      }
      const leftTitle = normalizeShellText(left.title);
      const rightTitle = normalizeShellText(right.title);
      const leftGeneric = isNoisyAssignmentProjection(leftTitle) || isScaffoldConceptLabel(leftTitle);
      const rightGeneric = isNoisyAssignmentProjection(rightTitle) || isScaffoldConceptLabel(rightTitle);
      if (leftGeneric !== rightGeneric) {
        return leftGeneric ? 1 : -1;
      }
      return (normalizeShellText(right.summary).length - normalizeShellText(left.summary).length);
    })[0] ?? chapters[0];
}

function mapModulesFromChapters(chapters: ForgeChapter[]): ShellModule[] {
  const groups = new Map<string, { chapters: ForgeChapter[]; idx: number }>();
  chapters.forEach((ch) => {
    const existing = groups.get(ch.moduleKey);
    if (existing) {
      existing.chapters.push(ch);
    } else {
      groups.set(ch.moduleKey, { chapters: [ch], idx: groups.size + 1 });
    }
  });

  return Array.from(groups.entries()).map(([moduleKey, { chapters: chs, idx }]) => {
    const bestChapter = pickBestChapterAnchor(chs);
    const allConceptIds = [...new Set(chs.flatMap((ch) => ch.conceptIds))];
    const textbook: ShellTextbookChapter[] = chs.map((ch, i) => ({
      title: ch.title,
      pages: `Ch. ${idx}.${i + 1}`,
      summary: ch.summary
    }));

    return {
      id: moduleKey,
      title: normalizeShellText(bestChapter.title) || `Module ${idx}`,
      ch: chs.length === 1 ? `Chapter ${idx}` : `Chapters ${idx}.1-${idx}.${chs.length}`,
      pages: `Module ${idx}`,
      desc: sanitizeModuleDesc(normalizeShellText(bestChapter.summary)),
      concepts: allConceptIds,
      textbook
    };
  });
}

function mapReadingFromChapters(
  chapters: ForgeChapter[],
  assignmentIdsByConceptId: Map<string, string[]>
): ShellReading[] {
  return chapters.map((ch, i) => {
    const seen = new Set<string>();
    const relatedAssignments: string[] = [];
    for (const conceptId of ch.conceptIds) {
      for (const assignmentId of assignmentIdsByConceptId.get(conceptId) ?? []) {
        if (seen.has(assignmentId)) {
          continue;
        }
        seen.add(assignmentId);
        relatedAssignments.push(assignmentId);
        if (relatedAssignments.length >= 3) {
          break;
        }
      }
      if (relatedAssignments.length >= 3) {
        break;
      }
    }

    // Split summary into sections (by sentence breaks)
    const sentences = ch.summary
      .split(/(?<=[.!?])\s+/)
      .filter((s) => s.trim().length > 20);

    const sections: ShellReadingSection[] =
      sentences.length >= 3
        ? [
            { heading: "Overview", body: sentences.slice(0, 2).join(" ") },
            { heading: "Key Ideas", body: sentences.slice(2, 4).join(" ") },
            { heading: "Application", body: sentences.slice(4).join(" ") || "Use these ideas to explain what the chapter argues and why it matters." }
          ]
        : [{ heading: ch.title, body: ch.summary }];

    return {
      id: ch.id,
      module: ch.moduleKey,
      title: ch.title,
      subtitle: `Chapter ${i + 1}`,
      type: "chapter" as const,
      concepts: ch.conceptIds,
      assignments: relatedAssignments,
      sections
    };
  });
}

function generateMargins(
  reading: ShellReading[],
  concepts: ShellConcept[],
  conceptById: Map<string, ShellConcept>
): Record<string, ShellMarginAnnotation[]> {
  const margins: Record<string, ShellMarginAnnotation[]> = {};

  reading.forEach((r) => {
    r.sections.forEach((section, sIdx) => {
      const key = `${r.id}:${sIdx}`;
      const annotations: ShellMarginAnnotation[] = [];

      const relatedConceptId = resolveDominantShellConceptId(r, section, concepts, conceptById);
      const relatedConcept = relatedConceptId
        ? conceptById.get(relatedConceptId) ?? null
        : null;
      if (relatedConcept && sIdx < 2) {
        const hookText = relatedConcept.hook;
        if (hookText) {
          annotations.push({
            type: "plain",
            text: hookText,
            color: "#06d6a0"
          });
        }
        if (relatedConcept.trap) {
          annotations.push({
            type: "confusion",
            text: `⚠ Common trap: ${relatedConcept.trap}`,
            color: "#ff4466"
          });
        }
      }

      if (r.assignments.length > 0 && sIdx === 1) {
        annotations.push({
          type: "assignment",
          text: `📋 This section connects directly to upcoming assignments. Take notes.`,
          color: "#fb923c"
        });
      }

      if (annotations.length > 0) {
        margins[key] = annotations;
      }
    });
  });

  return margins;
}

function mapTranscriptsFromBundle(_bundle: CaptureBundle): ShellTranscript[] {
  // Look for video/audio-linked items (currently not captured, but reserved for future)
  // Return empty for now — transcripts are generated from real media when available
  return [];
}

function mapDistinctions(
  relations: ConceptRelation[],
  conceptById: Map<string, LearningConcept>
): ShellDistinction[] {
  const contrasts = relations.filter((r) => r.type === "contrasts");
  const seen = new Set<string>();
  const result: ShellDistinction[] = [];

  for (const rel of contrasts) {
    const pairKey = [rel.fromId, rel.toId].sort().join("|");
    if (seen.has(pairKey)) continue;
    seen.add(pairKey);

    const a = conceptById.get(rel.fromId);
    const b = conceptById.get(rel.toId);
    if (!a || !b) continue;
    const relationLabel = normalizeShellText(rel.label);
    const borderText = normalizeShellText(
      `${a.label}: ${wordTruncate(a.definition, 80)} ${b.label}: ${wordTruncate(b.definition, 80)}`
    );
    const trapText = [a.commonConfusion, b.commonConfusion]
      .map((candidate) => normalizeShellText(candidate))
      .find((candidate) =>
        isRenderableConceptText(candidate)
        && isDistinctFrom(relationLabel || borderText, candidate)
      ) ?? "";
    const twinsText = [a.summary, b.summary]
      .map((candidate) => normalizeShellText(candidate))
      .find((candidate) =>
        isRenderableConceptText(candidate)
        && isDistinctFrom(borderText, candidate)
        && (!trapText || isDistinctFrom(trapText, candidate))
      ) ?? "";
    if (!relationLabel && !trapText) continue;

    result.push({
      a: rel.fromId,
      b: rel.toId,
      label: relationLabel || `${a.label} vs ${b.label}`,
      border: borderText,
      trap: trapText,
      twins: twinsText,
      enemy: relationLabel
    });

    if (result.length >= 6) break; // cap for shell layout
  }

  return result;
}

// ─── KEY FIGURES (DYNAMIC EXTRACTION) ────────────────────────────────────────
// Scans the actual course content (canvas items + concept text) to find
// named persons who appear ≥ 2 times and have associated passages.
// Returns empty array when no such figures are found — the Oracle view
// and whois forge phase degrade gracefully in that case.

const NON_PERSON_TOKENS = new Set([
  "Canvas","Week","Module","Chapter","Table","Figure","Part","Unit",
  "Section","Activity","Discussion","Learning","Assignment","Forum",
  "Journal","Introduction","Overview","Summary","Conclusion","Review",
  "Quiz","Project","Grade","Grades","Points","Reading","Textbook",
  "Book","Page","Appendix","Index","Title","Edition","Copyright",
  "Published","Press","College","University","Student","Students",
  "Course","Instructor","Professor","Doctor","Online","Campus","Global",
  "Final","First","Second","Third","Fourth","Fifth","Sixth","Seventh",
  "American","English","Spanish","French","German","Chinese","Japanese",
  "United","States","North","South","East","West","Central","Pacific",
  "January","February","March","April","June","July","August",
  "September","October","November","December",
  "Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday",
  "Before","After","During","While","Though","Although","Since",
  "Because","Therefore","However","Moreover","Furthermore","Additionally",
  "According","Based","Using","Through","Without","Within","Between",
  "Throughout","Following","Including","Regarding","Against","Toward",
  "National","International","Federal","Local","Regional","Annual",
  "Personal","Social","Physical","Mental","Academic","General","Special",
  "Note","Example","Figure","Result","Study","Research","Theory",
  "Important","Essential","Critical","Primary","Secondary","Key",
  // Philosophical/ethical terms that form two-word phrases but are not person names
  "Virtue","Trolley","Moral","Cultural","Experience","Doctrine","Categorical",
  "Felicific","Formula","Calculus","Imperative","Relativism","Natural","Divine",
  "Command","Justice","Rational","Normative","Descriptive","Applied","Teleological",
  "Hedonism","Intrinsic","Extrinsic","Deontological","Utilitarian","Contractarian",
  "Free","Rule","Act","Good","Evil","Wrong","Right","Ethical","Ethics","Problem",
  "Machine","Theory","Principle","Argument","Critique","Paradox","Dilemma",
]);

function isLikelyPersonName(candidate: string): boolean {
  const parts = candidate.split(/\s+/);
  if (parts.length < 2 || parts.length > 3) return false;
  for (const part of parts) {
    if (part.length < 2) return false;
    if (NON_PERSON_TOKENS.has(part)) return false;
    if (/^[A-Z]{2,}$/.test(part)) return false; // ALL_CAPS = abbreviation
    if (/^\d/.test(part)) return false;
  }
  return true;
}

const AREA_PATTERNS: Array<[RegExp, string]> = [
  [/\b(memory|recall|retention|encoding|retrieval|hippocampus|cognitive|cognition)\b/, "memory & cognition"],
  [/\b(motivat|self.?efficacy|mindset|growth|intrinsic|extrinsic|achievement|goal.?setting)\b/, "motivation research"],
  [/\b(time.?manag|planner|schedul|priorit|procrastinat|deadline|organiz|productiv)\b/, "time management"],
  [/\b(nutrition|diet|food|health|wellness|sleep|exercise|fitness|vitamin)\b/, "health & wellness"],
  [/\b(stress|anxiet|mental.?health|emotion|well.?being|coping|resilience|mindfulness)\b/, "wellbeing"],
  [/\b(read|comprehension|vocab|literacy|writing|essay|critical.?thinking|note.?taking)\b/, "academic skills"],
  [/\b(social|peer|collaborat|group|team|community|network|relation)\b/, "social learning"],
  [/\b(career|job|profession|work|employ|workplace|interview|resume)\b/, "career development"],
  [/\b(brain|neuroscience|neuron|synapse|neural|cognitive.?science)\b/, "neuroscience"],
  [/\b(learn|teach|instruct|educat|pedagog|curriculum|classroom|assessment)\b/, "learning science"],
];

function inferArea(namePassages: Set<string>): string {
  const text = [...namePassages].join(" ").toLowerCase();
  for (const [re, area] of AREA_PATTERNS) {
    if (re.test(text)) return area;
  }
  return "course research";
}

function mapKeyFigures(bundle: CaptureBundle, learning: LearningBundle): ShellPhilosopher[] {
  const PERSON_RE = /\b([A-Z][a-z]{1,15}(?:\s+[A-Z][a-z]{1,15}){1,2})\b/g;
  const counts = new Map<string, number>();
  const passages = new Map<string, Set<string>>();

  // Build a set of concept labels (lowercased) so we can filter out concept names
  // that the regex incorrectly classifies as person names (e.g. "Trolley Problem",
  // "Virtue Ethics", "Experience Machine").
  const conceptLabelSet = new Set(learning.concepts.map(c => c.label.toLowerCase()));
  // Also collect individual words in concept labels so we can detect two-word phrases
  // where BOTH words are concept-label components (e.g. "Trolley Problem").
  const conceptLabelWords = new Set(
    learning.concepts.flatMap(c => c.label.split(/\s+/).filter(w => w.length > 3))
  );

  // Scan only bundle items — NOT concept definitions, to avoid concept labels appearing
  // in their own definitions and being mistakenly counted as person names.
  const allText = bundle.items.map(item => `${item.title}. ${item.plainText}`);

  for (const source of allText) {
    const sentences = source
      .split(/(?<=[.!?])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 20 && s.length < 500);

    for (const sentence of sentences) {
      PERSON_RE.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = PERSON_RE.exec(sentence)) !== null) {
        const name = m[1]!;
        if (!isLikelyPersonName(name)) continue;
        // Reject if the full name is a known concept label
        if (conceptLabelSet.has(name.toLowerCase())) continue;
        // Reject if every word in the name is a component of some concept label
        const nameParts = name.split(/\s+/);
        if (nameParts.every(w => conceptLabelWords.has(w))) continue;
        counts.set(name, (counts.get(name) ?? 0) + 1);
        const set = passages.get(name) ?? new Set<string>();
        if (set.size < 5) set.add(sentence.slice(0, 220));
        passages.set(name, set);
      }
    }
  }

  return [...counts.entries()]
    .filter(([name, count]) => count >= 2 && (passages.get(name)?.size ?? 0) >= 1)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([name]) => {
      const namePassages = passages.get(name) ?? new Set<string>();
      return {
        n: name,
        t: inferArea(namePassages),
        q: [...namePassages].map((text) => ({
          x: text,
          p: Number(text.match(/\bon\s+p\.\s*(\d+)/i)?.[1] ?? "0"),  // extract page when embedded (e.g. "on p. 44"); 0 = UI hides it
          tg: text.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter(w => w.length > 3).slice(0, 8),
        })),
      };
    });
}

function mapSynthesis(_bundle: CaptureBundle, learning: LearningBundle): ShellSynthesis {
  return {
    sourceCoverage: {
      canvasItems: learning.synthesis.sourceCoverage.canvasItemCount,
      textbookItems: learning.synthesis.sourceCoverage.textbookItemCount,
      assignments: learning.synthesis.sourceCoverage.assignmentCount,
      discussions: learning.synthesis.sourceCoverage.discussionCount,
      quizzes: learning.synthesis.sourceCoverage.quizCount,
      pages: learning.synthesis.sourceCoverage.pageCount,
      modules: learning.synthesis.sourceCoverage.moduleCount,
      documents: learning.synthesis.sourceCoverage.documentCount
    },
    stableConceptCount: learning.synthesis.stableConceptIds.length,
    likelyAssessedSkills: learning.synthesis.likelyAssessedSkills,
    focusThemes: learning.synthesis.focusThemes.slice(0, 4).map((theme) => toShellFocusTheme(theme)),
    assignmentIntel: learning.synthesis.assignmentMappings.slice(0, 6).map((mapping) => toShellAssignmentIntel(mapping)),
    retentionModules: learning.synthesis.retentionModules.slice(0, 6).map((module) => ({
      id: module.id,
      kind: module.kind,
      title: module.title,
      summary: module.summary,
      prompts: module.prompts
    })),
    deterministicHash: learning.synthesis.deterministicHash,
    qualityBanner: learning.synthesis.qualityBanner,
    qualityWarnings: learning.synthesis.qualityWarnings,
    synthesisMode: learning.synthesis.synthesisMode
  };
}

// ─── Public entry point ────────────────────────────────────────────────────────

export function mapToShellData(
  bundle: CaptureBundle,
  learning: LearningBundle,
  workspace: { tasks: CourseTask[]; chapters: ForgeChapter[] }
): ShellData {
  const { tasks, chapters } = workspace;

  // Filter out very low-quality concepts (score < 15 = extracted from thin/admin text).
  // Also remove concepts whose labels are Canvas boilerplate (instructions, rubric text,
  // or assignment/task titles repeated across items).
  const MIN_SCORE = 15;
  const stableConceptIds = new Set(learning.synthesis.stableConceptIds);
  const taskTitleSet = new Set(tasks.map((t) => t.title.toLowerCase()));
  const INSTRUCTION_LABEL_RE = /^(?:always|remember|never|make sure|be sure|note that|please |ensure |don't forget|topic[:\s]|point rubric|week\s+\d+\s*[-–])/i;

  const scoredConcepts = learning.concepts
    .slice()
    .sort((a, b) => b.score - a.score);
  const isValidConcept = (c: (typeof scoredConcepts)[number]) =>
    c.score >= MIN_SCORE &&
    stableConceptIds.has(c.id) &&
    (c.fieldSupport?.definition?.evidence.length ?? 0) > 0 &&
    !INSTRUCTION_LABEL_RE.test(c.label) &&
    !taskTitleSet.has(c.label.toLowerCase()) &&
    !isScaffoldConceptLabel(c.label);
  const filteredConcepts = scoredConcepts.filter(isValidConcept);
  const practiceSupportContext = buildPracticeSupportContext(bundle, learning);
  const learningConceptById = buildByIdMap(learning.concepts);
  const relatedIdsByConceptId = buildRelatedConceptIdsByConceptId(learning.relations);
  const evidenceRelations = learning.relations.filter((relation) => (relation.evidence?.length ?? 0) > 0);
  const contrastByConceptId = buildContrastRelationByConceptId(evidenceRelations);
  const assignmentIdsByConceptId = buildAssignmentIdsByConceptId(tasks);
  const concepts = filteredConcepts.map((c) =>
    mapConcept(
      c,
      learning.concepts,
      learningConceptById,
      relatedIdsByConceptId,
      contrastByConceptId,
      practiceSupportContext
    )
  );

  // Only link task concept IDs that survived the quality filter.
  // This prevents low-score Canvas-chrome labels ("Point Rubric And", "Always Identify...")
  // from appearing in the Atlas concept practice list.
  const validConceptIds = new Set(filteredConcepts.map((c) => c.id));
  const cleanedTasks = tasks.map((t) => ({
    ...t,
    conceptIds: t.conceptIds.filter((id) => validConceptIds.has(id))
  }));
  const cleanedChapters = chapters.map((ch) => ({
    ...ch,
    conceptIds: ch.conceptIds.filter((id) => validConceptIds.has(id))
  }));

  const conceptNameById = new Map(concepts.map((concept) => [concept.id, concept.name]));
  const assignmentIntelBySourceItemId = new Map(
    learning.synthesis.assignmentMappings
      .map((mapping) => toShellAssignmentIntel(mapping, validConceptIds))
      .map((mapping) => [mapping.sourceItemId, mapping] as const)
  );
  const assignments = cleanedTasks.map((task) => mapAssignment(task, conceptNameById, assignmentIntelBySourceItemId));
  const modules = cleanedChapters.length > 0 ? mapModulesFromChapters(cleanedChapters) : [];
  const reading = cleanedChapters.length > 0 ? mapReadingFromChapters(cleanedChapters, assignmentIdsByConceptId) : [];
  const shellConceptById = buildByIdMap(concepts);
  const margins = generateMargins(reading, concepts, shellConceptById);
  const transcripts = mapTranscriptsFromBundle(bundle);
  const dists = mapDistinctions(evidenceRelations, learningConceptById);
  const philosophers = mapKeyFigures(bundle, learning);
  const course = mapCourse(bundle);
  const synthesis = mapSynthesis(bundle, learning);
  const skillTree = buildAtlasSkillTree({
    concepts,
    assignments,
    modules,
    distinctions: dists,
    synthesis: {
      focusThemes: learning.synthesis.focusThemes.map((theme) => toShellFocusTheme(theme, validConceptIds)),
      assignmentIntel: learning.synthesis.assignmentMappings.map((mapping) => toShellAssignmentIntel(mapping, validConceptIds)),
      likelyAssessedSkills: learning.synthesis.likelyAssessedSkills
    }
  });
  const enrichedAssignments = attachAssignmentSkillRequirements(assignments, skillTree);

  return {
    course,
    concepts,
    assignments: enrichedAssignments,
    modules,
    reading,
    margins,
    transcripts,
    dists,
    philosophers,
    synthesis,
    skillTree
  };
}

/**
 * Demo fallback — produces ShellData from the demo LearningBundle.
 * This ensures the demo mode experience goes through the same mapper path
 * as real data, so there's a single rendering code path.
 */
export function mapDemoToShellData(
  bundle: CaptureBundle,
  learning: LearningBundle,
  workspace: { tasks: CourseTask[]; chapters: ForgeChapter[] }
): ShellData {
  return mapToShellData(bundle, learning, workspace);
}
