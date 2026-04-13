import type { CaptureBundle, CaptureItem, LearningBundle } from "@learning/schema";

export type TaskKind = "assignment" | "discussion" | "quiz" | "page";

export type CourseTask = {
  id: string;
  sourceItemId: string;
  title: string;
  kind: TaskKind;
  summary: string;
  rawText: string;
  dueDate: number | null;
  plannedDate: number;
  estimatedMinutes: number;
  conceptIds: string[];
  requirementLines: string[];
  pts: number;
  moduleKey: string;
  url: string;
};

export type ForgeChapter = {
  id: string;
  sourceItemId: string;
  title: string;
  summary: string;
  conceptIds: string[];
  moduleKey: string;
};

export type Goal = {
  id: string;
  type: "prepare-forge" | "review-concept" | "start-early";
  title: string;
  description: string;
  targetDate: number;
  linkedItemId: string;
  relevance: number;
};

export type SourceTeachMatch = {
  sourceItemId: string;
  url: string;
  title: string;
  level: "strongly-related" | "related" | "mentioned";
  concepts: Array<{
    id: string;
    label: string;
    score: number;
    matchType: "title" | "content" | "keyword";
  }>;
};

export type WeekGroup = {
  id: string;
  label: string;
  start: number;
  events: TimelineEvent[];
};

export type TimelineEvent = {
  id: string;
  kind: "assignment" | "discussion" | "quiz" | "goal";
  title: string;
  dueDate: number;
  linkedItemId: string;
  status: "overdue" | "due-soon" | "upcoming";
  detail: string;
};

export type AppProgress = {
  conceptMastery: Record<string, number>;
  chapterCompletion: Record<string, number>;
  goalCompletion: Record<string, boolean>;
  practiceMode: boolean;
};

const DAY = 24 * 60 * 60 * 1000;
const CHROME_PATTERNS = [
  /\byou need to have javascript enabled in order to access this site\b/i,
  /\bthis tool needs to be loaded in a new browser window\b/i,
  /\breload the page to access the tool again\b/i,
  /\bscore at least\b/i,
  /\bmodule item\b/i,
  /\bpoints possible\b/i,
  /\bno due date\b/i,
  /\ballowed attempts\b/i,
  /\bfilter by\b/i,
  /\bsearch entries\b/i,
  /\bdiscussion topic:\b/i,
  /\bcontext_module\b/i,
  /\bwiki_page\b/i,
  /\battempt history\b/i,
  /\btake the quiz again\b/i,
  /\bscore for this attempt\b/i,
  /\bsubmitted [A-Z][a-z]{2,9}\b/i,
  /\bmultiple_choice_question\b/i,
  /\bedit this question\b/i,
  /\bdelete this question\b/i,
  /\bsubmission types\b/i,
  /\bthis criterion is linked to a learning outcome\b/i,
  /\bedit criterion description\b/i,
  /\bdelete criterion row\b/i,
  /\bfull marks\b/i,
  /\bcriteria ratings pts\b/i,
  // Canvas discussion boilerplate
  /\binitial (discussion|post) (thread )?is due\b/i,
  /\brespond to your classmates\b/i,
  /\bdue on day\s+\d+\s*\(/i,
  /\bpost your (initial|first|introduction)\b/i,
  /\breply (within|to) the (post|thread|discussion)\b/i,
  /\bselect reply within the post\b/i,
  // Canvas quiz header text
  /\bstarter kit (quiz|goals|activities)\b/i,
  /\bgood work completing\b/i
] as const;
const WORKSPACE_SKIP_PATTERNS = [
  /\bcourse modules\b/i,
  /\borientation home\b/i,
  /\bstart here\b/i,
  /\bgrades for\b/i,
  /\bfinal grade\b/i,
  /\bsyllabus\b/i,
  /\/external_tools\//i,
  /\bwriting center & library\b/i,
  /global campus caf/i,
  /^\d{1,2}\/\d{1,2}\/\d{4}\s*[-–]/
] as const;
const REQUIREMENT_PATTERNS = [
  /^\s*\d+[.)]\s+(.+?)(?:\.|$)/gm,
  /^\s*[•·\-\*]\s+(.+?)(?:\.|$)/gm,
  /\b(?:you (?:must|should|will|need to|are required to)|make sure to|be sure to|remember to|ensure (?:that|you)) (.+?)(?:\.|,|;|$)/gi,
  /^(?:Write|Analyze|Discuss|Explain|Describe|Compare|Contrast|Identify|Evaluate|Assess|Cite|Include|Use|Submit|Complete|Answer|Respond to|Draft|Review|Read|Watch|Prepare) (.+?)(?:\.|$)/gim,
  /(?:at least|minimum of|no less than|a minimum)\s+(\d+\s+(?:words?|pages?|sources?|references?|paragraphs?|sentences?))/gi,
  /\byour\s+(?:paper|essay|response|discussion|post|submission)\s+(?:should|must|needs? to|will)\s+([^.]+\.)/gi
] as const;
const GENERIC_TASK_TITLE_PATTERNS = [
  /^reflection activity$/i,
  /^reflection question(?:s)?$/i,
  /^reflection journal$/i,
  /^reflection discussion forum$/i,
  /^discussion(?: topic| forum)?$/i,
  /^quiz$/i,
  /^assignment$/i,
  /^page$/i,
  /^topic$/i,
  /^final grade$/i
] as const;
const TASK_TEXT_SKIP_PATTERNS = [
  /^(due|points|submission types|question count|unlock)\b/i,
  /^\d+\s*(?:pts?|points?)\b/i,
  /^prepare\b/i,
  /^start\b/i
] as const;

function eventStatus(timestamp: number): TimelineEvent["status"] {
  if (timestamp < Date.now()) {
    return "overdue";
  }
  if (timestamp - Date.now() < 3 * DAY) {
    return "due-soon";
  }
  return "upcoming";
}

const normalize = (text: string): string =>
  text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();

const meaningful = (text: string): string[] =>
  normalize(text)
    .split(/\s+/)
    .filter((token) => token.length > 2)
    .slice(0, 32);

const readable = (text: string, max = 220): string => {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= max) return cleaned;
  const slice = cleaned.slice(0, max);
  const boundary = Math.max(slice.lastIndexOf("."), slice.lastIndexOf(" "), 80);
  return `${slice.slice(0, boundary).trim()}...`;
};

function tagValues(item: CaptureItem, prefix: string): string[] {
  return (item.tags ?? [])
    .filter((entry) => entry.toLowerCase().startsWith(prefix.toLowerCase()))
    .map((entry) => entry.slice(prefix.length).trim())
    .filter(Boolean);
}

function firstTagValue(item: CaptureItem, prefix: string): string | null {
  return tagValues(item, prefix)[0] ?? null;
}

function cleanTaskTitle(title: string): string {
  const cleaned = title
    .replace(/^Topic:\s*/i, "")
    .replace(/^Course Modules:\s*/i, "")
    .replace(/\s*:\s*ORIENT100:.*$/i, "")
    .replace(/\s*:\s*[^:]+:\s*[^:]+$/i, "")
    // Strip Canvas metadata appended to assignment titles: "Due M/D/YYYY ...", "Points N ...", "Submission types ..."
    .replace(/\s+Due\s+(?:\d{1,2}\/\d{1,2}\/\d{4}|[A-Z][a-z]+\s+\d{1,2},?\s+\d{4})[\s\S]*/i, "")
    .replace(/\s+Points\s+\d+\b[\s\S]*/i, "")
    .replace(/\s+Submission\s+types?[\s\S]*/i, "")
    .replace(/\s+/g, " ")
    .trim();

  const moduleMatch = cleaned.match(/^(Module\s+\d+)\s*-\s*(.+)$/i);
  if (!moduleMatch) {
    return cleaned;
  }

  const moduleLabel = moduleMatch[1]!.trim();
  const remainder = moduleMatch[2]!.trim();
  return GENERIC_TASK_TITLE_PATTERNS.some((pattern) => pattern.test(normalize(remainder)))
    ? `${moduleLabel} ${remainder}`
    : remainder;
}

function isGenericTaskTitle(title: string): boolean {
  const normalized = normalize(title);
  return GENERIC_TASK_TITLE_PATTERNS.some((pattern) => pattern.test(normalized));
}

function titleCandidateFromText(item: CaptureItem): string | null {
  const baseTitle = cleanTaskTitle(item.title);
  const lines = item.plainText
    .split(/\n+/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .filter((entry) => !hasChrome(entry))
    .map((entry) => entry.split(/\s+\|\s+/)[0]!.trim())
    .map((entry) => entry.split(/(?<=[.!?])\s+/)[0]!.trim())
    .map((entry) => cleanTaskTitle(entry))
    .filter((entry) => entry.length >= 6 && entry.length <= 90)
    .filter((entry) => !TASK_TEXT_SKIP_PATTERNS.some((pattern) => pattern.test(entry)))
    .filter((entry) => normalize(entry) !== normalize(baseTitle));

  return lines[0] ?? null;
}

function deriveTaskTitle(item: CaptureItem): string {
  const baseTitle = cleanTaskTitle(item.title);
  if (!isGenericTaskTitle(baseTitle)) {
    return baseTitle;
  }

  const textCandidate = titleCandidateFromText(item);
  if (textCandidate) {
    return textCandidate;
  }

  const trailCandidate = item.headingTrail
    .map((entry) => cleanTaskTitle(entry))
    .find((entry) => entry && !isGenericTaskTitle(entry) && !hasChrome(entry));

  if (trailCandidate) {
    return trailCandidate;
  }

  const moduleCandidate = firstTagValue(item, "module:");
  if (moduleCandidate && !isGenericTaskTitle(moduleCandidate) && !hasChrome(moduleCandidate)) {
    return cleanTaskTitle(moduleCandidate);
  }

  return baseTitle;
}

// Remove Canvas assignment-header metadata that appears in item.plainText:
//   "Due 1/6/2026, 11:59:00 PM Points 9 Submission types online_quiz [WLOs: 1, 2] [CLO: 3]"
// This block sits before the real content and contaminates summaries and rawText.
function stripCanvasMetadata(text: string): string {
  return text
    .replace(/\bDue\s+\d{1,2}\/\d{1,2}\/\d{4}(?:,\s*\d{1,2}:\d{2}(?::\d{2})?\s*[AP]M)?(?:\s+Points\s+\d+)?(?:\s+Submission\s+types?\s+\S+)?/gi, "")
    .replace(/\bPoints\s+\d+\s+Submission\s+types?\s+\S+/gi, "")
    .replace(/\[(?:WLO|CLO)s?\s*:\s*[\d,\s]+\]/gi, "")
    .split(/\n+/)
    .map((entry) => entry.trim().replace(/[ \t]+/g, " "))
    .filter(Boolean)
    .join("\n")
    .trim();
}

function hasChrome(text: string): boolean {
  return CHROME_PATTERNS.some((pattern) => pattern.test(text));
}

function shouldSkipWorkspaceItem(item: CaptureItem): boolean {
  return WORKSPACE_SKIP_PATTERNS.some((pattern) => pattern.test(item.title) || pattern.test(item.canonicalUrl) || pattern.test(item.plainText.slice(0, 500)));
}

function isAuthoredConceptPage(item: CaptureItem): boolean {
  return item.kind === "page" && (item.tags ?? []).includes("concept-page");
}

function cleanSummary(item: CaptureItem): string {
  const title = deriveTaskTitle(item);
  const cleanText = stripCanvasMetadata(item.plainText);
  const sentences = cleanText
    .split(/(?<=[.!?])\s+/)
    .map((entry) => entry.trim())
    .map((entry) => entry.replace(new RegExp(`^(?:${title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})(?:\\s+${title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})?\\s*`, "i"), "").trim())
    .filter((entry) => entry.length >= 30)
    .filter((entry) => !hasChrome(entry));

  const excerpt = item.excerpt.trim();
  const fallback = excerpt && !hasChrome(excerpt) ? excerpt : title;
  return readable(sentences[0] ?? fallback);
}

function cleanRawText(item: CaptureItem): string {
  const title = deriveTaskTitle(item);
  const cleanText = stripCanvasMetadata(item.plainText);
  return readable(
    cleanText
      .split(/\n+/)
      .map((entry) => entry.trim())
      .map((entry) => entry.replace(new RegExp(`^(?:${title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})(?:\\s+${title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})?\\s*`, "i"), "").trim())
      .filter((entry) => entry.length >= 20)
      .filter((entry) => !hasChrome(entry))
      .slice(0, 16)
      .join("\n"),
    1200
  );
}

const scoreOverlap = (left: string[], right: string[]): number =>
  left.reduce((sum, token) => sum + (right.includes(token) ? 1 : 0), 0);

function taskKindFor(item: CaptureItem): TaskKind {
  const normalized = `${item.title} ${item.canonicalUrl}`.toLowerCase();
  if (item.kind === "discussion" || normalized.includes("discussion_topics") || normalized.startsWith("topic:")) {
    return "discussion";
  }
  if (item.kind === "quiz" || normalized.includes("/quizzes/") || (item.kind === "page" && /\bquestions?\b/i.test(item.plainText))) {
    return "quiz";
  }
  if (item.kind === "assignment" || normalized.includes("/assignments/")) {
    return "assignment";
  }
  return "page";
}

function dueDateFromText(item: CaptureItem, offsetIndex: number, capturedAt: number): number | null {
  for (const tagDate of [
    firstTagValue(item, "due:"),
    firstTagValue(item, "unlock:"),
    firstTagValue(item, "lock:")
  ]) {
    if (!tagDate) {
      continue;
    }
    const parsed = Date.parse(tagDate);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  const text = `${item.title} ${item.plainText}`;
  const match = text.match(/\b(?:due|available|lock)\s+(?:on\s+)?([A-Z][a-z]{2,8}\s+\d{1,2},?\s+\d{4}(?:,\s*\d{1,2}:\d{2}\s*[AP]M)?)\b/);
  if (match?.[1]) {
    const parsed = Date.parse(match[1]);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  // Handle numeric date format: "Due 1/6/2026" or "Due 1/6/2026, 11:59:00 PM"
  const numericDueMatch = text.match(/\b(?:due|available|lock)\s+(?:on\s+)?(\d{1,2}\/\d{1,2}\/\d{4})\b/i);
  if (numericDueMatch?.[1]) {
    const parsed = Date.parse(numericDueMatch[1]);
    if (!Number.isNaN(parsed)) return parsed;
  }
  // Fallback: any standalone numeric date in the text
  const standaloneMatch = text.match(/\b(\d{1,2}\/\d{1,2}\/\d{4})\b/);
  if (standaloneMatch?.[1]) {
    const parsed = Date.parse(standaloneMatch[1]);
    if (!Number.isNaN(parsed)) return parsed;
  }
  const weekdayMatch = text.match(/\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/i);
  if (weekdayMatch) {
    const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const target = weekdays.findIndex((day) => day.toLowerCase() === weekdayMatch[1]!.toLowerCase());
    const current = new Date(capturedAt).getDay();
    const delta = ((target - current + 7) % 7) || 7;
    return capturedAt + delta * DAY + offsetIndex * 2 * 60 * 60 * 1000;
  }
  return null;
}

function extractPointsFromItem(item: CaptureItem): number {
  const pointsTag = firstTagValue(item, "points:");
  if (pointsTag) {
    const taggedPoints = parseInt(pointsTag, 10);
    if (!Number.isNaN(taggedPoints) && taggedPoints > 0 && taggedPoints <= 1000) {
      return taggedPoints;
    }
  }

  const text = `${item.title} ${item.plainText.slice(0, 1000)}`;
  const m = text.match(/\bPoints\s+(\d+)\b/i) ?? text.match(/\b(\d+)\s+points?\s+possible\b/i);
  if (m?.[1]) {
    const pts = parseInt(m[1], 10);
    if (pts > 0 && pts <= 1000) return pts;
  }
  return 100;
}

function extractModuleKey(item: CaptureItem, index: number): string {
  const moduleKeyTag = firstTagValue(item, "module-key:");
  if (moduleKeyTag) {
    return moduleKeyTag;
  }

  const moduleTag = firstTagValue(item, "module:");
  if (moduleTag) {
    const moduleInTag = moduleTag.match(/\bmodule\s+(\d+)\b/i);
    if (moduleInTag) return `module-${moduleInTag[1]}`;
    const weekInTag = moduleTag.match(/\bweek\s+(\d+)\b/i);
    if (weekInTag) return `week-${weekInTag[1]}`;
  }

  // Check title first (most reliable), then headingTrail, then beginning of plainText
  const title = item.title;
  const moduleInTitle = title.match(/\bmodule\s+(\d+)\b/i);
  if (moduleInTitle) return `module-${moduleInTitle[1]}`;
  const weekInTitle = title.match(/\bweek\s+(\d+)\b/i);
  if (weekInTitle) return `week-${weekInTitle[1]}`;

  const trailText = item.headingTrail.join(" ");
  const moduleInTrail = trailText.match(/\bmodule\s+(\d+)\b/i);
  if (moduleInTrail) return `module-${moduleInTrail[1]}`;
  const weekInTrail = trailText.match(/\bweek\s+(\d+)\b/i);
  if (weekInTrail) return `week-${weekInTrail[1]}`;

  const body = item.plainText.slice(0, 300);
  const moduleInBody = body.match(/\bmodule\s+(\d+)\b/i);
  if (moduleInBody) return `module-${moduleInBody[1]}`;
  const weekInBody = body.match(/\bweek\s+(\d+)\b/i);
  if (weekInBody) return `week-${weekInBody[1]}`;

  return `item-${index + 1}`;
}

function estimateMinutes(item: CaptureItem, kind: TaskKind): number {
  const wordCount = item.plainText.split(/\s+/).filter(Boolean).length;
  if (kind === "discussion") {
    return 35;
  }
  if (kind === "quiz") {
    return Math.max(18, Math.min(50, Math.round(wordCount / 45)));
  }
  return Math.max(20, Math.min(90, Math.round(wordCount / 38)));
}

function requirementLines(item: CaptureItem): string[] {
  const requirements: string[] = [];
  const seen = new Set<string>();
  for (const pattern of REQUIREMENT_PATTERNS) {
    const matches = item.plainText.matchAll(pattern);
    for (const match of matches) {
      const raw = (match[1] ?? match[0] ?? "").trim().replace(/\s+/g, " ");
      if (!raw || raw.length < 10 || raw.length > 260) continue;
      if (hasChrome(raw)) continue;
      if (/^(transcript|download|view|link|click|tap|select|introduction|overview|learn more|read more)\b/i.test(raw)) continue;
      if (/^\|/.test(raw)) continue;
      const normalizedRaw = /^\d+\s+(?:words?|pages?|sources?|references?|paragraphs?|sentences?)$/i.test(raw)
        ? `Include at least ${raw}`
        : raw;
      const line = normalizedRaw.endsWith(".") ? normalizedRaw : `${normalizedRaw}.`;
      if (/\bhere\.$/i.test(line)) continue;
      if (normalize(line).split(/\s+/).filter((token) => token.length > 3).length < 3) continue;
      const key = normalize(line);
      if (seen.has(key)) continue;
      seen.add(key);
      requirements.push(line);
    }
  }
  return requirements.slice(0, 6);
}

function relatedConceptIds(item: CaptureItem, learning: LearningBundle): string[] {
  const displayTitle = deriveTaskTitle(item);
  const titleTokens = meaningful(`${displayTitle} ${item.headingTrail.join(" ")}`);
  const textTokens = meaningful(item.plainText).slice(0, 48);
  const itemText = normalize(`${displayTitle} ${item.headingTrail.join(" ")} ${item.plainText}`);
  const ranked = learning.concepts
    .map((concept) => {
      const conceptTokens = meaningful(`${concept.label} ${concept.definition} ${concept.summary} ${concept.keywords.join(" ")}`);
      const titleHits = scoreOverlap(titleTokens, conceptTokens);
      const textHits = scoreOverlap(textTokens, conceptTokens);
      const sourceHits = concept.sourceItemIds.includes(item.id) ? 4 : 0;
      const exactLabelBonus = itemText.includes(normalize(concept.label)) ? 6 : 0;
      const score = titleHits * 1.7 + textHits * 0.7 + sourceHits + exactLabelBonus;
      return { id: concept.id, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score);

  return ranked.slice(0, 4).map((entry) => entry.id);
}

export function deriveWorkspace(bundle: CaptureBundle, learning: LearningBundle, progress: AppProgress): {
  tasks: CourseTask[];
  chapters: ForgeChapter[];
  goals: Goal[];
  sourceMatches: SourceTeachMatch[];
  weeks: WeekGroup[];
} {
  const capturedAt = Date.parse(bundle.capturedAt) || Date.now();
  const entries = bundle.items
    .map((item, index) => {
      const kind = taskKindFor(item);
      const dueDate = dueDateFromText(item, index, capturedAt);
      const conceptIds = relatedConceptIds(item, learning);
      const plannedDate = dueDate ?? capturedAt + index * DAY;
      return {
        id: item.id,
        sourceItemId: item.id,
        title: deriveTaskTitle(item),
        kind,
        summary: cleanSummary(item),
        rawText: cleanRawText(item),
        dueDate,
        plannedDate,
        estimatedMinutes: estimateMinutes(item, kind),
        conceptIds,
        requirementLines: requirementLines(item),
        pts: extractPointsFromItem(item),
        moduleKey: extractModuleKey(item, index),
        url: item.canonicalUrl
      };
    });

  const _seenTitles = new Set<string>();
  const tasks = entries
    .filter((task) => {
      const item = bundle.items.find((entry) => entry.id === task.id);
      if (!item || shouldSkipWorkspaceItem(item)) return false;
      if (isAuthoredConceptPage(item)) return false;
      if (task.kind === "page") return task.conceptIds.length > 0;
      return true;
    })
    .sort((left, right) => (left.dueDate ?? left.plannedDate) - (right.dueDate ?? right.plannedDate))
    .filter((task) => {
      const key = task.title.toLowerCase().replace(/\s+/g, " ").trim();
      if (_seenTitles.has(key)) return false;
      _seenTitles.add(key);
      return true;
    });

  // Build chapters from any item kind that has concept IDs — not just pages.
  // Courses that use discussions/quizzes/assignments as primary content (e.g. skills
  // courses, orientation courses) would otherwise produce zero chapters, leaving
  // Reader and Library completely empty. We prefer pages first (richer content),
  // then fall back to the richest item of any kind in each module group.
  const allChapterCandidates = entries
    .filter((task) => task.conceptIds.length > 0)
    .filter((task) => {
      const item = bundle.items.find((entry) => entry.id === task.id);
      return Boolean(item) && !shouldSkipWorkspaceItem(item!);
    });

  // Prefer page items as chapter anchors; fall back to highest-concept-count item
  // per module key when no pages are present.
  const pageChapters = allChapterCandidates.filter((task) => task.kind === "page");
  const rawChapterSource = pageChapters.length >= 2 ? pageChapters : allChapterCandidates;

  const chapters = rawChapterSource
    .map((task) => ({
      id: task.moduleKey,
      sourceItemId: task.sourceItemId,
      title: task.title,
      summary: task.summary,
      conceptIds: task.conceptIds,
      moduleKey: task.moduleKey
    }))
    .filter((chapter, index, array) => array.findIndex((entry) => entry.moduleKey === chapter.moduleKey) === index);

  const goals: Goal[] = tasks.flatMap((task) => {
    const dueDate = task.dueDate ?? task.plannedDate;
    const conceptGap = task.conceptIds.filter((id) => (progress.conceptMastery[id] ?? 0) < 0.6);
    const nextGoals: Goal[] = [];
    if (conceptGap.length > 0) {
      nextGoals.push({
        id: `prepare-${task.id}`,
        type: "prepare-forge",
        title: `Prepare for ${task.title}`,
        description: `Complete Neural Forge on ${conceptGap.slice(0, 3).map((id) => learning.concepts.find((concept) => concept.id === id)?.label ?? id).join(", ")}`,
        targetDate: dueDate - 2 * DAY,
        linkedItemId: task.id,
        relevance: 1
      });
    }
    nextGoals.push({
      id: `start-${task.id}`,
      type: "start-early",
      title: `Start ${task.title}`,
      description: `Open the submission workspace and build the first response pass.`,
      targetDate: dueDate - DAY,
      linkedItemId: task.id,
      relevance: 0.75
    });
    return nextGoals;
  }).filter((goal) => goal.targetDate > capturedAt - DAY);

  const sourceMatches = bundle.items
    .filter((item) => !shouldSkipWorkspaceItem(item))
    .map((item) => {
    const displayTitle = deriveTaskTitle(item);
    const titleTokens = meaningful(`${displayTitle} ${item.headingTrail.join(" ")}`);
    const textTokens = meaningful(item.plainText).slice(0, 64);
    const concepts = learning.concepts
      .map((concept) => {
        const conceptTokens = meaningful(`${concept.label} ${concept.definition} ${concept.summary}`);
        const titleHits = scoreOverlap(titleTokens, conceptTokens);
        const textHits = scoreOverlap(textTokens, conceptTokens);
        const sourceHits = concept.sourceItemIds.includes(item.id) ? 1 : 0;
        const total = titleHits * 2 + textHits + sourceHits * 3;
        if (total <= 1) {
          return null;
        }
        return {
          id: concept.id,
          label: concept.label,
          score: total,
          matchType: sourceHits ? "content" as const : titleHits > textHits ? "title" as const : "keyword" as const
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
      .sort((left, right) => right.score - left.score)
      .slice(0, 4);

    const level: SourceTeachMatch["level"] = concepts[0]?.score && concepts[0].score >= 6
      ? "strongly-related"
      : concepts[0]?.score && concepts[0].score >= 3
        ? "related"
        : "mentioned";

    return {
      sourceItemId: item.id,
      url: item.canonicalUrl,
      title: displayTitle,
      level,
      concepts
    };
  })
    .filter((entry) => entry.concepts.length > 0)
    .filter((entry) => entry.level !== "mentioned" || entry.concepts[0]?.score >= 3)
    .sort((left, right) => right.concepts[0]!.score - left.concepts[0]!.score);

  const events: TimelineEvent[] = [
    ...tasks.map((task) => ({
      id: task.id,
      kind: task.kind === "page" ? "assignment" : task.kind,
      title: task.title,
      dueDate: task.dueDate ?? task.plannedDate,
      linkedItemId: task.id,
      status: eventStatus(task.dueDate ?? task.plannedDate),
      detail: task.summary
    })),
    ...(bundle.source === "demo" ? [] : goals.map((goal) => ({
      id: goal.id,
      kind: "goal" as const,
      title: goal.title,
      dueDate: goal.targetDate,
      linkedItemId: goal.linkedItemId,
      status: eventStatus(goal.targetDate),
      detail: goal.description
    })))
  ].sort((left, right) => left.dueDate - right.dueDate);

  const weeksMap = new Map<string, TimelineEvent[]>();
  for (const event of events) {
    const start = startOfWeek(event.dueDate);
    const key = String(start);
    const current = weeksMap.get(key) ?? [];
    current.push(event);
    weeksMap.set(key, current);
  }

  const weeks = [...weeksMap.entries()].map(([start, items]) => ({
    id: start,
    start: Number(start),
    label: new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(Number(start)),
    events: items
  }));

  return { tasks, chapters, goals, sourceMatches, weeks };
}

function startOfWeek(timestamp: number): number {
  const date = new Date(timestamp);
  const day = date.getDay();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - day);
  return date.getTime();
}

export function taskGate(task: CourseTask, progress: AppProgress): {
  locked: boolean;
  conceptIds: string[];
} {
  const conceptIds = task.conceptIds.slice(0, 3);
  const locked = !progress.practiceMode && conceptIds.some((id) => (progress.conceptMastery[id] ?? 0) < 0.6);
  return { locked, conceptIds };
}
