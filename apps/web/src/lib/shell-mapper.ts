/**
 * shell-mapper.ts
 *
 * Translates the real data pipeline (LearningBundle + workspace + CaptureBundle)
 * into the exact data shapes expected by AeonthraShell.
 *
 * Every field in every type here corresponds to a field used in the shell's JSX.
 * Do not remove fields — add optional ones if you extend the schema later.
 */

import type { CaptureBundle, LearningBundle, LearningConcept, ConceptRelation } from "@learning/schema";
import type { CourseTask, ForgeChapter } from "./workspace";
import { assessSourceQuality, qualityBannerText } from "@learning/content-engine";

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
  dil: ShellDilemma;
  tf: ShellTFQuestion[];
  mc: ShellMCQuestion[];
};

export type ShellAssignment = {
  id: string;
  title: string;
  sub: string;          // subtitle / topic
  type: string;         // emoji type icon
  due: number;          // days until due (0 = today, negative = overdue)
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
  evidence: string[];
};

export type ShellAssignmentIntel = {
  id: string;
  title: string;
  summary: string;
  likelySkills: string[];
  checklist: string[];
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

function isDistinctFrom(reference: string, candidate: string | null | undefined): boolean {
  const candidateNormalized = normalizeComparisonText(candidate);
  if (!candidateNormalized) return false;
  const referenceNormalized = normalizeComparisonText(reference);
  return candidateNormalized !== referenceNormalized
    && !candidateNormalized.includes(referenceNormalized)
    && !referenceNormalized.includes(candidateNormalized);
}

function conceptCoreText(concept: LearningConcept): string {
  return normalizeShellText(concept.definition || concept.summary || concept.excerpt || concept.label);
}

function conceptDepthText(concept: LearningConcept): string {
  const core = conceptCoreText(concept);
  const candidates = [concept.primer, concept.summary, concept.excerpt, concept.transferHook];
  for (const candidate of candidates) {
    if (!isRenderableConceptText(candidate)) continue;
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
  allConcepts: LearningConcept[],
  relations: ConceptRelation[]
): string {
  const core = conceptCoreText(concept);
  const depth = conceptDepthText(concept);
  const contrast = relations.find((relation) =>
    relation.type === "contrasts" && (relation.fromId === concept.id || relation.toId === concept.id)
  );
  const otherConceptId = contrast
    ? (contrast.fromId === concept.id ? contrast.toId : contrast.fromId)
    : null;
  const otherConcept = otherConceptId
    ? allConcepts.find((entry) => entry.id === otherConceptId)
    : null;
  const relationDistinction = contrast && otherConcept
    ? `${concept.label} differs from ${otherConcept.label}: ${normalizeShellText(contrast.label)}.`
    : "";
  // Prefer relation-based distinction over commonConfusion (which can be negation-only scaffolding)
  const candidates = [relationDistinction, concept.commonConfusion, concept.summary, concept.excerpt, concept.transferHook];
  for (const candidate of candidates) {
    if (!isRenderableConceptText(candidate)) continue;
    if (isNegationOnlyText(candidate)) continue;
    if (!isDistinctFrom(core, candidate)) continue;
    if (depth && !isDistinctFrom(depth, candidate)) continue;
    return normalizeShellText(candidate);
  }
  return "";
}

function conceptHookText(concept: LearningConcept): string {
  const candidates = [concept.mnemonic, concept.transferHook];
  for (const candidate of candidates) {
    if (!isRenderableConceptText(candidate)) continue;
    return normalizeShellText(candidate);
  }
  const keywords = concept.keywords.filter((keyword) => normalizeComparisonText(keyword).length >= 3).slice(0, 2);
  if (keywords.length >= 2) {
    return `Link ${concept.label} to ${keywords[0]} and ${keywords[1]} whenever the course asks you to explain it.`;
  }
  if (keywords.length === 1) {
    return `Use ${keywords[0]} as the cue that brings ${concept.label} back into view.`;
  }
  return `Use ${concept.label} as the lens for explaining what the source is trying to show.`;
}

function conceptTrapText(concept: LearningConcept): string {
  if (isRenderableConceptText(concept.commonConfusion)) {
    return normalizeShellText(concept.commonConfusion);
  }
  return `Do not flatten ${concept.label} into a generic course prompt. Explain the concept's main move before you apply it.`;
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
    options: [
      normalizeShellText(c.definition),
      normalizeShellText(others[0]?.definition) || `The general study of ${c.keywords[1] ?? "this topic"}.`,
      // Use a distorted definition rather than commonConfusion "X is not Y" — that reads as correct
      c.definition.replace(/\bhelps\b/i, "ignores").replace(/\bfocuses on\b/i, "avoids") !== c.definition
        ? normalizeShellText(c.definition.replace(/\bhelps\b/i, "ignores").replace(/\bfocuses on\b/i, "avoids"))
        : `A vague guideline rather than a concept with a specific claim.`,
      normalizeShellText(others[1]?.definition) || `A rule that applies without considering context.`
    ],
    correctIndex: 0,
    explanation: normalizeShellText(c.definition)
  };

  const q2: ShellMCQuestion = {
    question: `When is ${label} most useful to apply?`,
    options: [
      `Only in formal written assignments`,
      normalizeShellText(c.transferHook) || `When the task directly requires understanding ${label}.`,
      `Only when the outcome is already known`,
      `Whenever a source mentions a related topic`
    ],
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
    options: [
      misconception,
      normalizeShellText(c.definition),
      conceptHookText(c),
      `That ${label} can be fully mastered through a single exposure without practice`
    ],
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
  // Try to extract a course code from the title (e.g. "PHI 208", "ETHICS301", "ORIENT100")
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
  relations: ConceptRelation[]
): ShellConcept {
  const connectedIds = relations
    .filter((r) => r.fromId === c.id || r.toId === c.id)
    .map((r) => (r.fromId === c.id ? r.toId : r.fromId))
    .filter((id) => id !== c.id);

  const conceptName = normalizeShellText(c.label);
  const rawCat = c.category ?? "";
  // Reject scaffold labels AND cases where the category is identical to the concept name
  // (that happens when the concept was extracted from a section heading of its own name)
  const isUsefulCat =
    rawCat &&
    !isScaffoldConceptLabel(rawCat) &&
    normalizeComparisonText(rawCat) !== normalizeComparisonText(conceptName);

  return {
    id: c.id,
    name: conceptName,
    cat: isUsefulCat ? rawCat : "Concept",
    core: conceptCoreText(c),
    depth: conceptDepthText(c),
    dist: conceptDistinctionText(c, allConcepts, relations),
    hook: conceptHookText(c),
    trap: conceptTrapText(c),
    kw: c.keywords.filter((keyword) => !isScaffoldConceptLabel(keyword)),
    conn: [...new Set(connectedIds)],
    dil: generateDilemma(c),
    tf: generateTF(c),
    mc: generateMC(c, allConcepts)
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
  if (!timestamp) return 30;
  const ms = timestamp - Date.now();
  return Math.round(ms / (24 * 60 * 60 * 1000));
}

function mapAssignment(task: CourseTask): ShellAssignment {
  const { demand, icon } = taskDemand(task.kind);
  const reqLines = task.requirementLines.slice(0, 4);
  const failModes = reqLines.length > 0
    ? reqLines.map((r) => `Missing: ${r.slice(0, 80)}`)
    : [
        "Summarizing instead of analyzing",
        "Not applying the specific framework requested",
        "Missing citations or textbook evidence",
        "Neglecting to address counterarguments"
      ];

  const evidenceNeeded = reqLines.length > 0
    ? reqLines.slice(0, 2).join("; ")
    : "Textbook concepts applied to a concrete case with reasoning shown";

  return {
    id: task.id,
    title: task.title,
    sub: task.summary.slice(0, 60) || task.title,
    type: taskTypeIcon(task.kind),
    due: daysUntil(task.dueDate),
    pts: task.pts,
    con: task.conceptIds,
    tip: task.summary.slice(0, 100) || `Focus on ${task.conceptIds[0] ?? "the core concept"}.`,
    reallyAsking: task.summary || `This assignment asks you to demonstrate mastery of ${task.conceptIds.join(", ")}.`,
    demand,
    demandIcon: icon,
    secretCare: `Instructors look for specific concept application, not just general knowledge. Show that you understand ${task.conceptIds[0] ?? "the framework"} deeply.`,
    failModes,
    evidence: evidenceNeeded,
    quickPrep: `Review ${task.conceptIds.slice(0, 2).join(" and ")} then work through one practice question. ~${Math.round(task.estimatedMinutes * 0.4)} minutes.`
  };
}

function moduleLabel(moduleKey: string, idx: number): string {
  if (moduleKey.startsWith("week-")) return `Week ${moduleKey.slice(5)}`;
  if (moduleKey.startsWith("module-")) return `Module ${moduleKey.slice(7)}`;
  if (moduleKey.startsWith("sequence-")) return `Section ${moduleKey.slice(9)}`;
  return `Unit ${idx}`;
}

function mapModulesFromTasks(tasks: CourseTask[]): ShellModule[] {
  const groups = new Map<string, { tasks: CourseTask[]; idx: number }>();
  for (const task of tasks) {
    const existing = groups.get(task.moduleKey);
    if (existing) {
      existing.tasks.push(task);
    } else {
      groups.set(task.moduleKey, { tasks: [task], idx: groups.size + 1 });
    }
  }

  return Array.from(groups.entries()).map(([moduleKey, { tasks: mTasks, idx }]) => {
    const allConceptIds = [...new Set(mTasks.flatMap((t) => t.conceptIds))];
    const label = moduleLabel(moduleKey, idx);
    const textbook: ShellTextbookChapter[] = mTasks.slice(0, 5).map((t, i) => ({
      title: t.title,
      pages: `${idx}.${i + 1}`,
      summary: t.summary
    }));
    return {
      id: moduleKey,
      title: label,
      ch: `Unit ${idx}`,
      pages: `${mTasks.length} item${mTasks.length !== 1 ? "s" : ""}`,
      desc: "",
      concepts: allConceptIds,
      textbook
    };
  });
}

function mapReadingFromTasks(tasks: CourseTask[]): ShellReading[] {
  const groups = new Map<string, CourseTask[]>();
  for (const task of tasks) {
    const grp = groups.get(task.moduleKey) ?? [];
    grp.push(task);
    groups.set(task.moduleKey, grp);
  }

  return Array.from(groups.entries()).slice(0, 8).map(([moduleKey, mTasks], i) => {
    const allConceptIds = [...new Set(mTasks.flatMap((t) => t.conceptIds))];
    const label = moduleLabel(moduleKey, i + 1);
    const sections: ShellReadingSection[] = mTasks.slice(0, 4).map((t) => ({
      heading: t.title,
      body: t.summary || t.rawText.slice(0, 280)
    }));
    return {
      id: moduleKey,
      module: moduleKey,
      title: label,
      subtitle: `${mTasks.length} item${mTasks.length !== 1 ? "s" : ""}`,
      type: "discussion" as const,
      concepts: allConceptIds,
      assignments: mTasks.map((t) => t.id).slice(0, 3),
      sections: sections.length > 0 ? sections : [{ heading: label, body: mTasks[0]?.summary ?? "" }]
    };
  });
}

function sanitizeModuleDesc(raw: string): string {
  return raw
    .replace(/[^.!?]*\b(?:is introduced in|is covered in)\s+Module\s+\d+[^.!?]*[.!?]\s*/gi, "")
    .replace(/[^.!?]*\bstudents must be able to\b[^.!?]*[.!?]\s*/gi, "")
    .replace(/[^.!?]*\ba major ethical framework\b[^.!?]*[.!?]\s*/gi, "")
    .trim();
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
    const allConceptIds = [...new Set(chs.flatMap((ch) => ch.conceptIds))];
    const textbook: ShellTextbookChapter[] = chs.map((ch, i) => ({
      title: ch.title,
      pages: `Ch. ${idx}.${i + 1}`,
      summary: ch.summary
    }));

    return {
      id: moduleKey,
      title: chs[0]?.title ?? `Module ${idx}`,
      ch: chs.length === 1 ? `Chapter ${idx}` : `Chapters ${idx}.1-${idx}.${chs.length}`,
      pages: `Module ${idx}`,
      desc: sanitizeModuleDesc(chs[0]?.summary ?? ""),
      concepts: allConceptIds,
      textbook
    };
  });
}

function mapReadingFromChapters(chapters: ForgeChapter[], tasks: CourseTask[]): ShellReading[] {
  return chapters.map((ch, i) => {
    // Find assignments that mention this chapter's concepts
    const relatedAssignments = tasks
      .filter((t) => t.conceptIds.some((id) => ch.conceptIds.includes(id)))
      .map((t) => t.id)
      .slice(0, 3);

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

function generateMargins(reading: ShellReading[], learning: LearningBundle): Record<string, ShellMarginAnnotation[]> {
  const margins: Record<string, ShellMarginAnnotation[]> = {};

  reading.forEach((r) => {
    r.sections.forEach((_, sIdx) => {
      const key = `${r.id}:${sIdx}`;
      const annotations: ShellMarginAnnotation[] = [];

      if (sIdx === 0) {
        annotations.push({
          type: "hook",
          text: "This section introduces core ideas that recur throughout the course. Read it carefully.",
          color: "#ffd700"
        });
      }

      // Find related concepts for this reading
      const relatedConcept = learning.concepts.find((c) => r.concepts.includes(c.id));
      if (relatedConcept && sIdx < 2) {
        const hookText = relatedConcept.mnemonic || relatedConcept.transferHook;
        if (hookText) {
          annotations.push({
            type: "plain",
            text: `Plain English: ${hookText}`,
            color: "#06d6a0"
          });
        }
        if (relatedConcept.commonConfusion && !isNegationOnlyText(relatedConcept.commonConfusion)) {
          annotations.push({
            type: "confusion",
            text: `⚠ Common trap: ${relatedConcept.commonConfusion}`,
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

function mapDistinctions(relations: ConceptRelation[], concepts: LearningConcept[]): ShellDistinction[] {
  const contrasts = relations.filter((r) => r.type === "contrasts");
  const seen = new Set<string>();
  const result: ShellDistinction[] = [];

  for (const rel of contrasts) {
    const pairKey = [rel.fromId, rel.toId].sort().join("|");
    if (seen.has(pairKey)) continue;
    seen.add(pairKey);

    const a = concepts.find((c) => c.id === rel.fromId);
    const b = concepts.find((c) => c.id === rel.toId);
    if (!a || !b) continue;

    result.push({
      a: rel.fromId,
      b: rel.toId,
      label: rel.label || `${a.label} vs ${b.label}`,
      border: `${a.label}: ${wordTruncate(a.definition, 80)} ${b.label}: ${wordTruncate(b.definition, 80)}`,
      trap: `${a.label} and ${b.label} appear in the same discussions. Test yourself: state each one's core move without borrowing the other's language.`,
      twins: `Both ${a.label} and ${b.label} address related ethical territory, which makes them easy to swap in explanations.`,
      enemy: rel.label || `${a.label} and ${b.label} point in opposite ethical directions.`
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
          p: 0,  // no reliable page numbers from Canvas content; UI hides when 0
          tg: text.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter(w => w.length > 3).slice(0, 8),
        })),
      };
    });
}

function mapSynthesis(bundle: CaptureBundle, learning: LearningBundle): ShellSynthesis {
  const qualityReport = assessSourceQuality(bundle);
  const qualityBanner = qualityBannerText(qualityReport);
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
    focusThemes: learning.synthesis.focusThemes.slice(0, 4).map((theme) => ({
      id: theme.id,
      label: theme.label,
      score: theme.score,
      summary: theme.summary,
      verbs: theme.verbs,
      evidence: theme.evidence.map((fragment) => fragment.excerpt)
    })),
    assignmentIntel: learning.synthesis.assignmentMappings.slice(0, 6).map((mapping) => ({
      id: mapping.id,
      title: mapping.title,
      summary: mapping.summary,
      likelySkills: mapping.likelySkills,
      checklist: mapping.checklist
    })),
    retentionModules: learning.synthesis.retentionModules.slice(0, 6).map((module) => ({
      id: module.id,
      kind: module.kind,
      title: module.title,
      summary: module.summary,
      prompts: module.prompts
    })),
    deterministicHash: learning.synthesis.deterministicHash,
    qualityBanner,
    qualityWarnings: qualityReport.warnings,
    synthesisMode: qualityReport.synthesisMode
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
  const taskTitleSet = new Set(tasks.map((t) => t.title.toLowerCase()));
  const INSTRUCTION_LABEL_RE = /^(?:always|remember|never|make sure|be sure|note that|please |ensure |don't forget|topic[:\s]|point rubric|week\s+\d+\s*[-–])/i;

  const scoredConcepts = learning.concepts
    .slice()
    .sort((a, b) => b.score - a.score);
  const isValidConcept = (c: (typeof scoredConcepts)[number]) =>
    c.score >= MIN_SCORE &&
    !INSTRUCTION_LABEL_RE.test(c.label) &&
    !taskTitleSet.has(c.label.toLowerCase()) &&
    !isScaffoldConceptLabel(c.label);
  const filteredConcepts = scoredConcepts.filter(isValidConcept);
  const concepts = filteredConcepts.map((c) =>
    mapConcept(c, learning.concepts, learning.relations)
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

  const assignments = cleanedTasks.map(mapAssignment);
  // Fall back to task-based grouping when there aren't enough page-type chapters
  // (e.g. skills courses where most items are discussions/quizzes, not pages)
  const modules = cleanedChapters.length >= 2 ? mapModulesFromChapters(cleanedChapters) : mapModulesFromTasks(cleanedTasks);
  const reading = cleanedChapters.length >= 2 ? mapReadingFromChapters(cleanedChapters, cleanedTasks) : mapReadingFromTasks(cleanedTasks);
  const margins = generateMargins(reading, learning);
  const transcripts = mapTranscriptsFromBundle(bundle);
  const dists = mapDistinctions(learning.relations, learning.concepts);
  const philosophers = mapKeyFigures(bundle, learning);
  const course = mapCourse(bundle);
  const synthesis = mapSynthesis(bundle, learning);

  return {
    course,
    concepts,
    assignments,
    modules,
    reading,
    margins,
    transcripts,
    dists,
    philosophers,
    synthesis
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
