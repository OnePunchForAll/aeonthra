import { firstMeaningfulToken, normalizeForCompare, normalizeText, splitSentences } from "../utils/text.ts";

export const HARD_NOISE_PATTERNS = [
  /\byou need to have javascript enabled in order to access this site\b/i,
  /\bthis tool needs to be loaded in a new browser window\b/i,
  /\breload the page to access the tool again\b/i,
  /\bskip to content\b/i,
  /\bcourse navigation\b/i,
  /\bbreadcrumbs?\b/i
] as const;

export const CHROME_PATTERNS = [
  /\bpoints possible\b/i,
  /\bsubmission types?\b/i,
  /\ballowed attempts?\b/i,
  /\bquestion count\b/i,
  /\bmodule item\b/i,
  /\bmarked done\b/i,
  /\bmust view\b/i,
  /\bscore at least\b/i,
  /\bsearch entries\b/i,
  /\bfilter by\b/i,
  /\bdiscussion topic\b/i,
  /\bcontext_module\b/i,
  /\bwiki_page\b/i
] as const;

export const GENERIC_WRAPPER_PATTERNS = [
  /^week\s+\d+$/i,
  /^week\s+\d+\s*[-:]/i,
  /^module\s+\d+$/i,
  /^module\s+\d+\s*[-:]/i,
  /^reflection activity$/i,
  /^reflection activity(?: copy)?$/i,
  /^reflection discussion forum$/i,
  /^reply to classmates$/i,
  /^respond to classmates$/i,
  /^discussion(?: topic| forum)?$/i,
  /^quiz$/i,
  /^assignment$/i,
  /^page$/i,
  /^topic$/i,
  /^start here$/i,
  /^course modules?$/i
] as const;

export const GENERIC_SCAFFOLD_PATTERNS = [
  /^common confusion$/i,
  /^common mistake$/i,
  /^core idea$/i,
  /^going deeper$/i,
  /^initial post$/i,
  /^key distinction$/i,
  /^memory hook$/i,
  /^real world application$/i
] as const;

const GENERIC_TITLE_HEADS = new Set([
  "activity",
  "background",
  "chapter",
  "discussion",
  "example",
  "foundations",
  "introduction",
  "lecture",
  "lesson",
  "module",
  "overview",
  "page",
  "principles",
  "reading",
  "reflection",
  "section",
  "summary",
  "topic",
  "unit",
  "week"
]);

export const FRAGMENT_TAIL_PATTERN = /\b(?:and|or|to|for|of|in|on|at|by|with|from|the|a|an)$/i;

export const ACADEMIC_SIGNAL_PATTERNS = [
  /\bis defined as\b/i,
  /\brefers to\b/i,
  /\bmeans that\b/i,
  /\boccurs when\b/i,
  /\bis the (?:view|theory|approach|practice|process)\b/i,
  /\btheory\b/i,
  /\bframework\b/i,
  /\bprinciple\b/i,
  /\bconcept\b/i,
  /\bcase study\b/i,
  /\bcompare\b/i,
  /\bcontrast\b/i,
  /\banalyze\b/i,
  /\bevaluate\b/i,
  /\bexplain\b/i,
  /\bapply\b/i
] as const;

export const EXPLICIT_DEFINITION_SIGNAL_PATTERNS = [
  /\b[A-Za-z][A-Za-z0-9'/-]*(?:\s+[A-Za-z][A-Za-z0-9'/-]*){0,6}\s+(?:is|are)\b/i,
  /\b[A-Za-z][A-Za-z0-9'/-]*(?:\s+[A-Za-z][A-Za-z0-9'/-]*){0,6}\s+(?:refers to|means|describes|explains)\b/i,
  /\b[A-Za-z][A-Za-z0-9'/-]*(?:\s+[A-Za-z][A-Za-z0-9'/-]*){0,6}\s+(?:occurs when|happens when)\b/i,
  /\b[A-Za-z][A-Za-z0-9'/-]*(?:\s+[A-Za-z][A-Za-z0-9'/-]*){0,6}\s+(?:increases?|decreases?|strengthens?|weakens?)\b/i
] as const;

export const ADMIN_SIGNAL_PATTERNS = [
  /\borientation\b/i,
  /\bnavigation\b/i,
  /\bportal\b/i,
  /\bstudent services\b/i,
  /\bwriting center\b/i,
  /\blibrary resources\b/i,
  /\btechnical support\b/i,
  /\bintroduce yourself\b/i,
  /\brespond to classmates\b/i,
  /\binitial post\b/i,
  /\breflection activity\b/i
] as const;

export const APPLICATION_SIGNAL_PATTERNS = [
  /\buse\b/i,
  /\bapply\b/i,
  /\bwhen you\b/i,
  /\bin practice\b/i,
  /\bin the case\b/i,
  /\bin classroom\b/i,
  /\bin discussion\b/i
] as const;

export const CONTRAST_SIGNAL_PATTERNS = [
  /\bwhile\b/i,
  /\bwhereas\b/i,
  /\bbut\b/i,
  /\bdiffer(?:s|ent)?\b/i,
  /\bunlike\b/i,
  /\bdifferent from\b/i,
  /\bcontrasts? with\b/i
] as const;

export const CONFUSION_SIGNAL_PATTERNS = [
  /\bconfuse\b/i,
  /\bmistake\b/i,
  /\bmisread\b/i,
  /\bblur\b/i,
  /\boften think\b/i
] as const;

export function scoreHits(text: string, patterns: readonly RegExp[]): number {
  return patterns.reduce((sum, pattern) => sum + (pattern.test(text) ? 1 : 0), 0);
}

export function isHardNoiseText(text: string): boolean {
  return HARD_NOISE_PATTERNS.some((pattern) => pattern.test(text));
}

export function hasChromeSignal(text: string): boolean {
  return CHROME_PATTERNS.some((pattern) => pattern.test(text));
}

export function isGenericWrapperLabel(label: string): boolean {
  const normalized = normalizeText(label);
  return GENERIC_WRAPPER_PATTERNS.some((pattern) => pattern.test(normalized))
    || GENERIC_SCAFFOLD_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function isGenericTitleContainerText(text: string): boolean {
  const normalized = normalizeText(text);
  const head = firstMeaningfulToken(normalized);
  if (!head) {
    return true;
  }
  if (GENERIC_TITLE_HEADS.has(head)) {
    return true;
  }
  if (/^(?:chapter|module|week)\s+\d+\b(?:\s*[-:]\s*.*)?$/i.test(normalized)) {
    return true;
  }
  if (/^(?:overview|introduction|principles|foundations|reading|lecture|example|summary|background|lesson|unit|page|section|topic|activity|discussion|reflection)\b(?:\s+of|\s+to|\s+for)?\b/i.test(normalized)) {
    return true;
  }
  return false;
}

export function looksFragmentary(text: string): boolean {
  const normalized = normalizeText(text);
  if (!normalized) {
    return true;
  }
  const words = normalized.split(/\s+/).filter(Boolean);
  const connectorIndex = words.findIndex((word, index) =>
    index < words.length - 2
    && /^(and|or|to|for|of|in|on|at|by|with|from|the|a|an)$/i.test(word)
  );
  if (/^(and|or|to|for|of|in|on|at|by|with|from|the|a|an)$/i.test(words[0] ?? "")) {
    return true;
  }
  if (FRAGMENT_TAIL_PATTERN.test(normalized)) {
    return true;
  }
  if (words.length >= 3 && words.filter((word) => word.length <= 2).length >= 2) {
    return true;
  }
  if (words.length >= 5 && connectorIndex >= 2) {
    return true;
  }
  if (!/[.!?]$/.test(normalized) && words.length >= 4 && normalized.length <= 32) {
    return true;
  }
  return false;
}

export function contentProfileScore(text: string): {
  academic: number;
  admin: number;
  hardNoise: boolean;
} {
  const normalized = normalizeText(text);
  return {
    academic: scoreHits(normalized, ACADEMIC_SIGNAL_PATTERNS) + scoreHits(normalized, EXPLICIT_DEFINITION_SIGNAL_PATTERNS),
    admin: scoreHits(normalized, ADMIN_SIGNAL_PATTERNS) + scoreHits(normalized, CHROME_PATTERNS),
    hardNoise: isHardNoiseText(normalized)
  };
}

export function sentenceHasAcademicSignal(text: string): boolean {
  return scoreHits(text, ACADEMIC_SIGNAL_PATTERNS) > 0 || sentenceHasDefinitionSignal(text);
}

export function sentenceHasDefinitionSignal(text: string): boolean {
  return scoreHits(text, EXPLICIT_DEFINITION_SIGNAL_PATTERNS) > 0;
}

export function sentenceHasApplicationSignal(text: string): boolean {
  return scoreHits(text, APPLICATION_SIGNAL_PATTERNS) > 0;
}

export function sentenceHasContrastSignal(text: string): boolean {
  return scoreHits(text, CONTRAST_SIGNAL_PATTERNS) > 0;
}

export function sentenceHasConfusionSignal(text: string): boolean {
  return scoreHits(text, CONFUSION_SIGNAL_PATTERNS) > 0;
}

export function cleanSentenceCandidates(text: string): string[] {
  return splitSentences(text).filter((sentence) => {
    const normalized = normalizeForCompare(sentence);
    return Boolean(normalized)
      && !isHardNoiseText(sentence)
      && !hasChromeSignal(sentence);
  });
}
