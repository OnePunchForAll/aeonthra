import type { CaptureBundle, CaptureItem, ConceptRelation, LearningConcept } from "@learning/schema";
import {
  ANTONYMS,
  CANVAS_CHROME,
  DEFINITION_PATTERNS,
  HYPERNYMS,
  PHILOSOPHERS,
  STOPWORDS,
  SYNONYMS,
  frequencyRank
} from "./dictionaries.ts";

type ContentBlock = {
  id: string;
  sourceItemId: string;
  sourceKind: CaptureItem["kind"];
  sourceTitle: string;
  type: "heading" | "paragraph" | "list-item" | "definition";
  level?: number;
  text: string;
  parentHeading: string | null;
  position: number;
  wordCount: number;
  sentenceCount: number;
  emphasizedTerms: string[];
  score: number;
};

export type Block = {
  sourceItemId: string;
  sourceTitle: string;
  sourceKind: CaptureItem["kind"];
  cleanTitle: string;
  headingTopics: string[];
  lead: string;
  summary: string;
  sentences: string[];
  score: number;
  titleScore: number;
  keywords: string[];
};

type ConceptCandidate = {
  name: string;
  sourceItemId: string;
  sourceSentence: string;
  definition: string;
  detail: string;
  extractionMethod: "explicit-definition" | "bold-term" | "heading-topic" | "noun-phrase";
  confidence: number;
  evidence: string[];
  category: string;
  keywords: string[];
};

type Seed = {
  name: string;
  score: number;
  category: string;
  sourceItemIds: Set<string>;
  definition: string;
  detail: string;
  evidence: string[];
  keywords: Set<string>;
};

const BLOCK_THRESHOLD = 10;
const MAX_CONCEPTS = 12;
const SOURCE_SELECTORS = [
  /<div[^>]+(?:show-content|user_content|user_content_enhanced|wiki-page-content)[^>]*>([\s\S]*?)<\/div>/gi,
  /<main[^>]*>([\s\S]*?)<\/main>/gi
];
const CHROME_REGEX = [
  /<script[\s\S]*?<\/script>/gi,
  /<style[\s\S]*?<\/style>/gi,
  /<nav[\s\S]*?<\/nav>/gi,
  /<header[\s\S]*?<\/header>/gi,
  /<footer[\s\S]*?<\/footer>/gi,
  /<aside[\s\S]*?<\/aside>/gi,
  /<div[^>]+(?:left-side|ic-app-course-menu|ic-app-crumbs|module-sequence-footer|discussion-sidebar|discussion-toolbar)[^>]*>[\s\S]*?<\/div>/gi,
  /<[^>]+data-testid="[^"]*(?:module|item|assignment|discussion|quiz)[^"]*(?:row|header|footer)[^"]*"[^>]*>[\s\S]*?<\/[^>]+>/gi
];
const CHROME_FRAGMENT_PATTERNS = [
  "score at least", "must score at least", "module item", "must view", "must mark",
  "marked done", "in progress", "points possible", "no due date", "allowed attempts",
  "discussion topic", "manage item", "assign to", "share to commons", "filter by",
  "search entries", "context_module", "wiki_page", "screenreader-only", "collapse all",
  "links to an external site", "download transcript", "split screen", "unread", "subscribed",
  "you need to have javascript enabled in order to access this site",
  "submission types", "question count", "this criterion is linked to a learning outcome",
  "edit criterion description", "delete criterion row", "full marks", "criteria ratings pts"
] as const;
const GENERIC_TOPIC_WORDS = new Set([
  "support", "services", "resources", "personnel", "processes", "policies", "module", "student",
  "success", "skills", "navigation", "section", "items", "classroom", "opportunity", "complete",
  "review", "introduction", "transcript", "explore", "university", "information", "education", "activity", "submission",
  "association", "condition"
]);
const UPLOAD_UI_BLOCKLIST = new Set([
  "imported source",
  "import source",
  "uploaded source",
  "paste textbook",
  "textbook upload",
  "upload textbook",
  "local learning",
  "local.learning",
  "unknown source",
  "untitled",
  "source title",
  "document title"
]);
const MNEMONIC_META_PHRASES = [
  "becomes unstable",
  "remember the title",
  "source sentence",
  "stands for",
  "use each letter",
  "this mnemonic",
  "the definition"
] as const;
const REFLECTION_PATTERNS = [
  /\/external_tools\//i,
  /\bmy name\b/i,
  /\bmy goal\b/i,
  /\bi pursue\b/i,
  /\bi am excited\b/i,
  /\bintroduce yourself\b/i,
  /\btell us about yourself\b/i,
  /\bshare (?:a little )?about yourself\b/i,
  /\bwhere are you from\b/i,
  /\bwhat do you hope to\b/i,
  /\bthis tool needs to be loaded in a new browser window\b/i,
  /\breload the page to access the tool again\b/i,
  /\bgrades for\b/i,
  /\bcourse syllabus\b/i
] as const;
const GENERIC_ACTIVITY_PATTERNS = [
  /^(module\s+\d+\s+)?reflection activity$/i,
  /^(module\s+\d+\s+)?reflection question(?:s)?$/i,
  /^(module\s+\d+\s+)?reflection journal$/i,
  /^(module\s+\d+\s+)?reflection discussion forum$/i,
  /^(module\s+\d+\s+)?discussion(?: topic| forum)?$/i,
  /^(module\s+\d+\s+)?quiz$/i,
  /^(module\s+\d+\s+)?assignment$/i,
  /^(module\s+\d+\s+)?page$/i,
  /^(module\s+\d+\s+)?topic$/i,
  /^final grade$/i
] as const;
const SCAFFOLD_LABEL_PATTERNS = [
  /^common confusion$/i,
  /^common mistake$/i,
  /^core idea$/i,
  /^going deeper$/i,
  /^initial post$/i,
  /^key distinction$/i,
  /^memory hook$/i,
  /^real world application$/i
] as const;
const INSTRUCTIONAL_SIGNAL_PATTERNS = [
  /\b(student success|orientation|navigation|online environment|support services|resources|skills for success)\b/i,
  /\b(discussions?|quizzes?|journals?|reflection questions?|practice activities?)\b/i,
  /\b(learn|review|practice|understand|strengthen|support|help|guide|introduce|complete)\b/i,
  /\b(portal|classroom|tool|policy|process|personnel|resource|service|submission)\b/i
] as const;

const ENCODING_REPLACEMENTS: Array<[RegExp, string]> = [
  [/â€™/g, "'"],
  [/â€˜/g, "'"],
  [/â€œ/g, "\""],
  [/â€\u009d/g, "\""],
  [/â€"/g, "\""],
  [/â€“/g, "-"],
  [/â€”/g, "-"],
  [/â€¦/g, "..."],
  [/Â/g, " "]
] as const;

const stripEncodingArtifacts = (text: string): string => {
  let next = text;
  for (const [pattern, replacement] of ENCODING_REPLACEMENTS) {
    next = next.replace(pattern, replacement);
  }
  return next
    .replace(/\u00ad/g, "")
    .replace(/\u200b/g, "")
    .replace(/�+/g, " ");
};

const stripScaffoldLines = (text: string): string =>
  text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !SCAFFOLD_LABEL_PATTERNS.some((pattern) => pattern.test(line)))
    .join("\n");

export const normalizeText = (text: string): string =>
  stripScaffoldLines(
    stripEncodingArtifacts(text)
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\u00a0/g, " ")
    .replace(/\n{3,}/g, "\n\n")
  )
    .trim();

const stripHtml = (value: string): string =>
  value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, "\"");

export const cleanPassage = (text: string): string =>
  normalizeText(stripHtml(text))
    .replace(/\s+\|\s+/g, " ")
    .replace(/\bLinks to an external site\.?\b/gi, " ")
    .replace(/\bDownload Transcript\b/gi, " ")
    .replace(/\bWhat students have to say\b/gi, " ")
    .replace(/\bLearn more\b/gi, " ")
    .replace(/\bYou need to have JavaScript enabled in order to access this site\.?\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

const dedupeAdjacentPhraseRepeats = (text: string): string => {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < 4) {
    return text.trim();
  }
  for (let length = Math.floor(words.length / 2); length >= 1; length -= 1) {
    const first = words.slice(0, length).join(" ");
    const second = words.slice(length, length * 2).join(" ");
    if (first.toLowerCase() === second.toLowerCase()) {
      return [first, ...words.slice(length * 2)].join(" ").trim();
    }
  }
  return text.trim();
};

const stripLeadingTitleEcho = (text: string, candidates: string[]): string => {
  let next = text.trim();
  for (const candidate of candidates.map((entry) => cleanPassage(entry)).filter(Boolean)) {
    const escaped = candidate.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    next = next.replace(new RegExp(`^(?:${escaped})(?:\\s+${escaped})?\\s*`, "i"), "").trim();
  }
  return next || text.trim();
};

const decodeTitle = (text: string): string =>
  cleanPassage(text)
    .replace(/^course modules:\s*/i, "")
    .replace(/^discussion topic:\s*/i, "")
    .replace(/^topic:\s*/i, "")
    .replace(/^module\s+\d+\s*-\s*/i, "")
    .replace(/^\d+\s*-\s*/i, "")
    .replace(/^quiz:\s*/i, "")
    .replace(/^page:\s*/i, "")
    .replace(/^assignment:\s*/i, "")
    .replace(/\s+-\s+discussion$/i, "")
    .replace(/\s*:\s*[A-Z]{2,}\d+[A-Z0-9-]*\s*:\s*.+$/i, "")
    .replace(/[:\-–|, ]+$/g, "")
    .trim();

export const cleanTitle = decodeTitle;

export const normalizePhrase = (text: string): string =>
  cleanPassage(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s&'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const titleCase = (value: string): string =>
  value
    .split(/\s+/)
    .filter(Boolean)
    .map((chunk) => chunk === chunk.toUpperCase() && chunk.length > 1
      ? chunk
      : chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");

export const meaningfulWords = (text: string): string[] =>
  normalizePhrase(text)
    .split(/\s+/)
    .filter((token) => token.length > 2 && token !== "&" && !STOPWORDS.has(token) && !CANVAS_CHROME.has(token));

export const truncateReadable = (text: string, maxLength = 220): string => {
  const normalized = cleanPassage(text);
  if (normalized.length <= maxLength) return normalized;
  const candidate = normalized.slice(0, maxLength);
  const boundary = Math.max(candidate.lastIndexOf("."), candidate.lastIndexOf("!"), candidate.lastIndexOf("?"));
  if (boundary > 70) return candidate.slice(0, boundary + 1).trim();
  const wordBoundary = candidate.lastIndexOf(" ");
  return `${candidate.slice(0, wordBoundary > 40 ? wordBoundary : maxLength).trim()}...`;
};

const normalizeCandidateName = (text: string): string =>
  cleanPassage(text)
    .replace(/^(the|a|an)\s+/i, "")
    .replace(/^module\s+\d+\s*-\s*/i, "")
    .replace(/^module\s+\d+\s+/i, "")
    .trim();

const normalizeConceptAlias = (text: string): string =>
  normalizePhrase(text)
    .replace(/^(overview|introduction|foundations?|basics|principles?)\s+(?:of|to|for)\s+/i, "")
    .replace(/\s+(overview|introduction|foundations?|basics)$/i, "")
    .replace(/\b(doctrine|theory|principle|concept)\s+of\s+the\b/gi, "")
    .replace(/\b(kant'?s|john|jeremy|student|online)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

const ensureSentence = (text: string): string => {
  const cleaned = truncateReadable(text);
  return /[.!?]$/.test(cleaned) ? cleaned : `${cleaned}.`;
};

const splitIntoSentences = (text: string): string[] =>
  cleanPassage(text)
    .split(/(?<=[.!?])\s+|(?<=:)\s+(?=[A-Z])/)
    .map((entry) => cleanPassage(entry))
    .filter((entry) => entry.length >= 24);

const contentWordCount = (text: string): number => meaningfulWords(text).length;
const lexicalDiversity = (text: string): number => { const tokens = normalizePhrase(text).split(/\s+/).filter(Boolean); return tokens.length ? new Set(tokens).size / tokens.length : 0; };
const chromeHits = (text: string): number => { const normalized = normalizePhrase(text); return CHROME_FRAGMENT_PATTERNS.reduce((sum, fragment) => sum + (normalized.includes(fragment) ? 1 : 0), 0); };
const stem = (word: string): string => word.toLowerCase().replace(/(?:ing|edly|ed|ies|s|tion|ment|ity|ism|ist|ally|ly)$/g, "").replace(/[^a-z0-9]/g, "");
const startsWithArticle = (text: string): boolean => /^(the|a|an|this|that|these|those)\s/i.test(text.trim());
const trigramSet = (text: string): Set<string> => { const tokens = normalizePhrase(text).split(/\s+/).filter(Boolean); const grams = new Set<string>(); for (let i = 0; i < tokens.length - 2; i += 1) grams.add(tokens.slice(i, i + 3).join(" ")); return grams; };
const trigramJaccard = (left: string, right: string): number => { const a = trigramSet(left); const b = trigramSet(right); if (!a.size || !b.size) return 0; let intersection = 0; for (const gram of a) if (b.has(gram)) intersection += 1; return intersection / (a.size + b.size - intersection); };

const blockedLabel = (label: string): boolean => {
  const normalized = normalizePhrase(label);
  if (!normalized || startsWithArticle(label) || /^[\d\s\W]+$/.test(label)) return true;
  if (label.includes("|")) return true;
  if (UPLOAD_UI_BLOCKLIST.has(normalized)) return true;
  if (SCAFFOLD_LABEL_PATTERNS.some((pattern) => pattern.test(normalized))) return true;
  if (/\bsyllabus\b/i.test(normalized)) return true;
  if (CANVAS_CHROME.has(normalized) || normalized.startsWith("reflection activity")) return true;
  if (GENERIC_ACTIVITY_PATTERNS.some((pattern) => pattern.test(normalized))) return true;
  if (/^week\s+\d+\s*[-–]/i.test(label)) return true;
  if (/^(while|if|why|how|and|because)\b/i.test(normalized)) return true;
  if (/\b(response|assignment|discussion|demo|bundle|primer)\b/i.test(normalized)) return true;
  if (/^(reply to classmates|respond to classmates|initial post|classmate response)$/i.test(normalized)) return true;
  if (/\bis the (framework|approach|view|theory) that\b/i.test(normalized)) return true;
  if (/^(welcome to|why this|orientation design|student success)/i.test(normalized)) return true;
  if (/^(course syllabus|description this|orientation expectations|course experience objectives|today orientation syllabus|expectations this|objectives this)/i.test(normalized)) return true;
  if (/^(discussion|topic|module|orientation|course modules?|announcement|grades?|calendar)$/i.test(normalized)) return true;
  if (chromeHits(label) > 0) return true;
  const words = meaningfulWords(label);
  if (!words.length) return true;
  const genericCount = words.filter((word) => GENERIC_TOPIC_WORDS.has(word)).length;
  return words.length <= 2 && genericCount === words.length;
};

const labelTokenSet = (label: string): Set<string> =>
  new Set(
    meaningfulWords(label)
      .map(stem)
      .filter(Boolean)
  );

const sharesPrimarySource = (
  left: Pick<LearningConcept, "sourceItemIds">,
  right: Pick<LearningConcept, "sourceItemIds">
): boolean =>
  left.sourceItemIds.some((sourceId) => right.sourceItemIds.includes(sourceId));

const redundantSpecificityShadow = (
  candidate: Pick<LearningConcept, "label" | "definition" | "sourceItemIds" | "keywords">,
  other: Pick<LearningConcept, "label" | "definition" | "sourceItemIds" | "keywords">
): boolean => {
  const candidateTokens = [...labelTokenSet(candidate.label)];
  const otherTokens = labelTokenSet(other.label);
  if (
    candidate.label === other.label
    || candidateTokens.length === 0
    || candidateTokens.length >= otherTokens.size
  ) {
    return false;
  }
  if (!candidateTokens.every((token) => otherTokens.has(token))) {
    return false;
  }
  if (!sharesPrimarySource(candidate, other)) {
    return false;
  }
  const definitionSimilarity = trigramJaccard(candidate.definition, other.definition);
  const normalizedDefinitionMatch = normalizeLoose(candidate.definition) === normalizeLoose(other.definition);
  if (!normalizedDefinitionMatch && definitionSimilarity < 0.45) {
    return false;
  }
  const keywordOverlap = candidate.keywords.filter((keyword) => other.keywords.includes(keyword)).length;
  return keywordOverlap >= Math.max(1, Math.min(candidate.keywords.length, 2));
};

const pruneRedundantConcepts = (concepts: LearningConcept[]): LearningConcept[] =>
  concepts.filter((concept, index) => !concepts.some((other, otherIndex) =>
    otherIndex !== index
    && redundantSpecificityShadow(concept, other)
  ));

const dedupeConceptAliases = (concepts: LearningConcept[]): LearningConcept[] => {
  const aliases = new Map<string, LearningConcept>();
  for (const concept of concepts) {
    const aliasKey = normalizeConceptAlias(concept.label) || normalizePhrase(concept.label);
    const existing = aliases.get(aliasKey);
    if (!existing) {
      aliases.set(aliasKey, concept);
      continue;
    }
    const conceptHasWrapper = normalizeConceptAlias(concept.label) !== normalizePhrase(concept.label);
    const existingHasWrapper = normalizeConceptAlias(existing.label) !== normalizePhrase(existing.label);
    const keepCandidate =
      (!conceptHasWrapper && existingHasWrapper)
      || (conceptHasWrapper === existingHasWrapper && (concept.score > existing.score || (concept.score === existing.score && concept.label.length < existing.label.length)));
    const preferred = keepCandidate ? concept : existing;
    const secondary = keepCandidate ? existing : concept;
    aliases.set(aliasKey, {
      ...preferred,
      score: Math.max(preferred.score, secondary.score),
      sourceItemIds: Array.from(new Set([...preferred.sourceItemIds, ...secondary.sourceItemIds])),
      relatedConceptIds: Array.from(new Set([...preferred.relatedConceptIds, ...secondary.relatedConceptIds])),
      keywords: Array.from(new Set([...preferred.keywords, ...secondary.keywords])).slice(0, 8)
    });
  }
  return [...aliases.values()];
};

const isBundleEchoLabel = (label: string, bundle: CaptureBundle): boolean => {
  if (bundle.items.length !== 1) return false;
  if (bundle.source === "extension-capture") return false;
  const normalizedLabel = normalizePhrase(label);
  const normalizedBundle = normalizePhrase(bundle.title);
  if (!normalizedLabel || !normalizedBundle) return false;
  return normalizedLabel === normalizedBundle;
};

const skipForConceptMining = (item: CaptureItem): boolean => {
  const title = normalizePhrase(item.title);
  const url = item.canonicalUrl.toLowerCase();
  const text = cleanPassage(item.plainText).slice(0, 1600);
  const genericActivity = GENERIC_ACTIVITY_PATTERNS.some((pattern) => pattern.test(title));
  const hasInstructionalSignals = INSTRUCTIONAL_SIGNAL_PATTERNS.some((pattern) => pattern.test(text));
  const meaningfulCount = meaningfulWords(text).length;
  return REFLECTION_PATTERNS.some((pattern) => pattern.test(item.title) || pattern.test(url) || pattern.test(text))
    || /^week\s+\d+\s*[-–]/i.test(item.title)
    || (genericActivity && (!hasInstructionalSignals || meaningfulCount < 8))
    || title.includes("welcome to orientation")
    || title.includes("why this orientation")
    || title.includes("syllabus")
    || title.includes("grades for")
    || title.includes("start here")
    || title.includes("orientation home")
    || title.includes("course modules")
    || title.includes("writing center & library");
};

const isValidSentence = (text: string): boolean => {
  const normalized = cleanPassage(text);
  if (!normalized || normalized.length < 10 || normalized.length > 500) return false;
  if (!/^[A-Z"']/.test(normalized.trim())) return false;
  if (!/[.!?"]$/.test(normalized.trim())) return false;
  if (!/\b(is|are|was|were|be|being|been|have|has|had|do|does|did|can|could|should|would|may|might|asks|weighs|compares|contrasts|improves|develops|focuses|supports|helps|reveals|shows|provides|allows|guides)\b/i.test(normalized)) return false;
  if (lexicalDiversity(normalized) < 0.4) return false;
  if (contentWordCount(normalized) < 3) return false;
  return !/\{[^}]+\}/.test(normalized);
};

const isValidPrimer = (primer: string): boolean => {
  const normalized = cleanPassage(primer);
  if (!normalized || normalized.length < 20 || normalized.length > 160) return false;
  if (/\{[^}]+\}/.test(normalized)) return false;
  if (/core working ideas?/i.test(normalized)) return false;
  return !UPLOAD_UI_BLOCKLIST.has(normalizePhrase(normalized));
};

const isValidMnemonic = (mnemonic: string, concept: Pick<LearningConcept, "label">): boolean => {
  const normalized = cleanPassage(mnemonic);
  if (!normalized || normalized.length < 20 || normalized.length > 200) return false;
  if (/\{[^}]+\}/.test(normalized)) return false;
  const lower = normalized.toLowerCase();
  if (MNEMONIC_META_PHRASES.some((phrase) => lower.includes(phrase))) return false;
  const conceptName = concept.label.toLowerCase();
  const contentWords = lower
    .replace(conceptName, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3 && !STOPWORDS.has(word));
  if (contentWords.length < 4) return false;
  return /\b(picture|imagine|think of|like|not|contrast|lane|scene|desk|room)\b/i.test(normalized);
};

const isValidConcept = (concept: Pick<LearningConcept, "label" | "definition" | "summary">): boolean => {
  if (concept.label.length < 3 || concept.label.length > 60) return false;
  if (blockedLabel(concept.label)) return false;
  if (!isValidSentence(concept.definition)) return false;
  return true;
};

const cleanHtmlContent = (html: string): string => { let next = html; for (const pattern of CHROME_REGEX) next = next.replace(pattern, " "); return next; };
const extractEmphasizedTerms = (html: string): string[] => [...html.matchAll(/<(?:strong|b|em|i)[^>]*>([\s\S]*?)<\/(?:strong|b|em|i)>/gi)].map((match) => cleanPassage(match[1] ?? "")).filter((term) => term.length >= 3 && term.length <= 60 && !blockedLabel(term));
const sourceHtml = (item: CaptureItem): string => { if (!item.html) return item.plainText; const cleaned = cleanHtmlContent(item.html); for (const selector of SOURCE_SELECTORS) { const matches = [...cleaned.matchAll(selector)].map((entry) => entry[1] ?? ""); if (matches.length > 0) return matches.join("\n"); } return cleaned; };

const scoreContentBlock = (block: Omit<ContentBlock, "score">): number => {
  let score = 0;
  const normalized = normalizePhrase(block.text);
  if (block.wordCount < 12) return 0;
  if (normalized.includes("you need to have javascript enabled in order to access this site")) return 0;
  if (normalized.includes("this tool needs to be loaded in a new browser window")) return 0;
  if (normalized.includes("reload the page to access the tool again")) return 0;
  if (normalized.includes("load ") && normalized.includes(" in a new window")) return 0;
  if (block.wordCount > 400) score -= 10;
  if (block.wordCount >= 25 && block.wordCount <= 180) score += 15; else if (block.wordCount >= 15 && block.wordCount <= 250) score += 8;
  if (block.type === "heading") score += 5;
  if (block.parentHeading) score += 3;
  if (block.sentenceCount >= 2) score += 5;
  if (block.sentenceCount >= 1) { const averageLength = block.wordCount / block.sentenceCount; if (averageLength >= 8 && averageLength <= 25) score += 5; }
  if (DEFINITION_PATTERNS.some((pattern) => { pattern.regex.lastIndex = 0; return pattern.regex.test(block.text); })) score += 18;
  if (/\b(for example|for instance|such as|including|specifically)\b/i.test(block.text)) score += 4;
  if (block.emphasizedTerms.length > 0) score += 8;
  if (block.parentHeading && !blockedLabel(block.parentHeading)) score += Math.max(0, 10 - Math.floor(frequencyRank(block.parentHeading.split(/\s+/)[0] ?? "") / 3000));
  score += meaningfulWords(block.text).slice(0, 10).reduce((sum, token) => sum + (frequencyRank(token) > 4000 ? 0.6 : 0.2), 0);
  if (/^(module|item|quiz|assignment|due|points?|submission types?|question count|unlock)\s/i.test(block.text)) return 0;
  if (/^(click|tap|select|choose|go to|return to)\s/i.test(block.text)) return 0;
  if (/^(my\s+\w+|i\s+\w+)/i.test(block.text)) return 0;
  if (/\b(my name|my goal|i am excited|i pursue)\b/i.test(block.text)) return 0;
  if (chromeHits(block.text) > 0) return Math.max(0, score - chromeHits(block.text) * 18);
  if (lexicalDiversity(block.text) < 0.35) score -= 10;
  return score;
};

const extractStructuredBlocks = (item: CaptureItem): ContentBlock[] => {
  const html = sourceHtml(item);
  const emphasizedTerms = extractEmphasizedTerms(html);
  const blocks: Array<Omit<ContentBlock, "score">> = [];
  let currentHeading: string | null = null;
  let position = 0;
  const pattern = /<(h([1-6])|p|li|dt|dd)[^>]*>([\s\S]*?)<\/\1>/gi;
  for (const match of html.matchAll(pattern)) {
    const tag = (match[1] ?? "").toLowerCase();
    const level = Number(match[2] ?? "0") || undefined;
    const rawText = cleanPassage(match[3] ?? "");
    const text = stripLeadingTitleEcho(rawText, [cleanTitle(item.title)]);
    if (!text) continue;
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    const sentenceCount = splitIntoSentences(text).length || (/[.!?]/.test(text) ? 1 : 0);
    if (tag.startsWith("h")) {
      currentHeading = cleanTitle(text);
      blocks.push({ id: `${item.id}:heading:${position}`, sourceItemId: item.id, sourceKind: item.kind, sourceTitle: item.title, type: "heading", level, text: currentHeading, parentHeading: null, position: position += 1, wordCount, sentenceCount, emphasizedTerms: [] });
      continue;
    }
    if ((tag === "p" && text.length >= 40) || (tag === "li" && text.length >= 20) || tag === "dd" || tag === "dt") {
      blocks.push({ id: `${item.id}:${tag}:${position}`, sourceItemId: item.id, sourceKind: item.kind, sourceTitle: item.title, type: tag === "li" ? "list-item" : tag === "dt" || tag === "dd" ? "definition" : "paragraph", text, parentHeading: currentHeading, position: position += 1, wordCount, sentenceCount, emphasizedTerms: emphasizedTerms.filter((term) => text.includes(term)).slice(0, 4) });
    }
  }
  const scored = blocks.map((block) => ({ ...block, score: scoreContentBlock(block) }));
  if (scored.some((block) => block.type !== "heading")) return scored;
  const fallbackLines = normalizeText(item.plainText)
    .split(/\n+/)
    .map((entry) => cleanPassage(entry))
    .filter((entry) => entry.length >= 12);

  let fallbackHeading = cleanTitle(item.title);
  const fallbackBlocks: Array<Omit<ContentBlock, "score">> = [];

  fallbackLines.forEach((text, index) => {
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    const sentenceCount = splitIntoSentences(text).length || (/[.!?]/.test(text) ? 1 : 0);
    const looksLikeHeading = (
      /^module\s+\d+\s*[-:]/i.test(text) ||
      (/^[A-Z][^.!?]{8,84}$/.test(text) && wordCount <= 10 && sentenceCount === 0)
    );

    if (looksLikeHeading) {
      fallbackHeading = cleanTitle(text);
      fallbackBlocks.push({
        id: `${item.id}:fallback-heading:${index}`,
        sourceItemId: item.id,
        sourceKind: item.kind,
        sourceTitle: item.title,
        type: "heading",
        text: fallbackHeading,
        parentHeading: null,
        position: index + 1,
        wordCount,
        sentenceCount,
        emphasizedTerms: []
      });
      return;
    }

    if (text.length < 28) {
      return;
    }

    fallbackBlocks.push({
      id: `${item.id}:fallback:${index}`,
      sourceItemId: item.id,
      sourceKind: item.kind,
      sourceTitle: item.title,
      type: "paragraph",
      text,
      parentHeading: fallbackHeading,
      position: index + 1,
      wordCount,
      sentenceCount,
      emphasizedTerms: []
    });
  });

  return fallbackBlocks.map((block) => ({ ...block, score: scoreContentBlock(block) }));
};

const extractHeadingTopics = (item: CaptureItem): string[] => {
  const html = sourceHtml(item);
  return Array.from(
    new Set(
      [...html.matchAll(/<h([2-4])[^>]*>([\s\S]*?)<\/h\1>/gi)]
        .map((match) => cleanTitle(match[2] ?? ""))
        .filter((entry) => entry.length >= 4 && entry.length <= 64)
        .filter((entry) => !blockedLabel(entry))
        .filter((entry) => meaningfulWords(entry).length >= 1)
    )
  ).slice(0, 6);
};

const blockKeywords = (block: ContentBlock): string[] => Array.from(new Set(meaningfulWords(`${block.parentHeading ?? ""} ${block.text}`))).slice(0, 12);
const leadSentence = (text: string): string => ensureSentence(splitIntoSentences(text)[0] ?? truncateReadable(text, 180));
const scoreTitle = (title: string): number => { if (blockedLabel(title)) return -20; const words = meaningfulWords(title); const genericCount = words.filter((word) => GENERIC_TOPIC_WORDS.has(word)).length; return (words.length >= 2 && words.length <= 6 ? 16 : 6) + (title.length >= 10 && title.length <= 48 ? 8 : 2) - genericCount * 3; };
const categoryFor = (block: ContentBlock): string => titleCase(block.parentHeading || cleanTitle(block.sourceTitle) || titleCase(block.sourceKind.replace(/-/g, " ")));

const titleCandidatesFromText = (item: CaptureItem): string[] =>
  normalizeText(item.plainText)
    .split(/\n+/)
    .map((entry) => cleanTitle(entry))
    .filter((entry) => entry.length >= 6 && entry.length <= 90)
    .filter((entry) => !blockedLabel(entry));

const preferredItemTitle = (item: CaptureItem, structured: ContentBlock[]): string => {
  const candidatePool = [
    cleanTitle(item.title),
    ...item.headingTrail.map((entry) => cleanTitle(entry)),
    ...structured
      .filter((block) => block.type === "heading")
      .map((block) => cleanTitle(block.text)),
    ...titleCandidatesFromText(item)
  ]
    .map((entry) => titleCase(entry))
    .filter(Boolean)
    .filter((entry, index, array) => array.findIndex((candidate) => normalizePhrase(candidate) === normalizePhrase(entry)) === index);

  const preferred = candidatePool
    .map((candidate) => ({ candidate, score: scoreTitle(candidate) }))
    .filter((entry) => entry.score > 8)
    .sort((left, right) => right.score - left.score)[0]?.candidate;

  return preferred ?? titleCase(cleanTitle(item.title));
};

const findTopicSentences = (block: ContentBlock): string[] => {
  const sentences = splitIntoSentences(block.text);
  return sentences.filter((sentence) => DEFINITION_PATTERNS.some((pattern) => { pattern.regex.lastIndex = 0; return pattern.regex.test(sentence); }) || /\b(involves|includes|requires|consists of|focuses on|emphasizes)\b/i.test(sentence) || /\b(unlike|in contrast to|whereas|while)\b/i.test(sentence) || /\b(for example|for instance|such as|e\.g\.)\b/i.test(sentence));
};

const nearestSentenceForTerm = (term: string, block: ContentBlock): string | null => splitIntoSentences(block.text).find((sentence) => normalizePhrase(sentence).includes(normalizePhrase(term))) ?? null;
const nounPhrases = (text: string): string[] => [...text.matchAll(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})\b/g), ...text.matchAll(/\b([A-Z][a-z]+\s+[a-z]{4,})\b/g), ...text.matchAll(/\b([a-z]+(?:ism|ity|tion|ics|ology))\b/gi), ...text.matchAll(/\b([a-z]+(?:\s+[a-z]+){0,2}\s+(?:framework|principle|theory|approach|report|services|support|management|portal|tutoring|analysis|reasoning))\b/gi)].map((match) => titleCase(normalizeCandidateName(match[1] ?? ""))).filter((phrase) => phrase.length >= 3 && phrase.length <= 60 && !blockedLabel(phrase));

const topicCandidatesFromBlock = (block: ContentBlock): ConceptCandidate[] => {
  const candidates: ConceptCandidate[] = [];
  const topicSentences = findTopicSentences(block);
  const subjectMatch = splitIntoSentences(block.text)
    .map((sentence) => ({ sentence, match: sentence.match(/^([A-Z][a-z]+(?:\s+[a-z]+){0,2})\s+(asks|weighs|helps|guides|shows|reveals|supports|offers|provides|increases|decreases|reduces|weakens|strengthens)\b/) }))
    .find((entry) => entry.match);
  for (const sentence of topicSentences) {
    for (const pattern of DEFINITION_PATTERNS) {
      pattern.regex.lastIndex = 0;
      const match = pattern.regex.exec(sentence);
      if (!match) continue;
      const name = titleCase(normalizeCandidateName(match[1] ?? ""));
      if (blockedLabel(name)) continue;
      candidates.push({ name, sourceItemId: block.sourceItemId, sourceSentence: sentence, definition: ensureSentence(sentence), detail: truncateReadable(block.text, 240), extractionMethod: "explicit-definition", confidence: 1, evidence: splitIntoSentences(block.text).filter((entry) => entry !== sentence).slice(0, 2), category: categoryFor(block), keywords: blockKeywords(block) });
    }
  }
  for (const term of block.emphasizedTerms) {
    const sentence = nearestSentenceForTerm(term, block);
    if (!sentence || blockedLabel(term)) continue;
    candidates.push({ name: titleCase(term), sourceItemId: block.sourceItemId, sourceSentence: sentence, definition: ensureSentence(sentence), detail: truncateReadable(block.text, 240), extractionMethod: "bold-term", confidence: 0.9, evidence: splitIntoSentences(block.text).filter((entry) => entry !== sentence).slice(0, 2), category: categoryFor(block), keywords: blockKeywords(block) });
  }
  if (block.parentHeading && !blockedLabel(block.parentHeading) && topicSentences.length > 0) {
    candidates.push({ name: titleCase(block.parentHeading), sourceItemId: block.sourceItemId, sourceSentence: topicSentences[0]!, definition: ensureSentence(topicSentences[0]!), detail: truncateReadable(block.text, 240), extractionMethod: "heading-topic", confidence: 0.72, evidence: splitIntoSentences(block.text).slice(1, 3), category: titleCase(block.parentHeading), keywords: blockKeywords(block) });
  }
  if (subjectMatch?.match?.[1] && !blockedLabel(subjectMatch.match[1])) {
    candidates.push({
      name: titleCase(subjectMatch.match[1]),
      sourceItemId: block.sourceItemId,
      sourceSentence: subjectMatch.sentence,
      definition: ensureSentence(subjectMatch.sentence),
      detail: truncateReadable(block.text, 240),
      extractionMethod: "noun-phrase",
      confidence: 0.68,
      evidence: splitIntoSentences(block.text).slice(1, 3),
      category: categoryFor(block),
      keywords: blockKeywords(block)
    });
  }
  return candidates;
};

const deriveNounPhraseCandidates = (blocks: ContentBlock[]): ConceptCandidate[] => {
  const counts = new Map<string, { phrase: string; blocks: Set<string>; examples: string[]; keywords: Set<string>; category: string; sourceItemId: string }>();
  for (const block of blocks) {
    for (const phrase of nounPhrases(block.text)) {
      const key = normalizePhrase(phrase);
      if (blockedLabel(phrase)) continue;
      const existing = counts.get(key) ?? { phrase, blocks: new Set<string>(), examples: [], keywords: new Set<string>(), category: categoryFor(block), sourceItemId: block.sourceItemId };
      existing.blocks.add(block.id);
      existing.examples.push(...splitIntoSentences(block.text).filter((sentence) => normalizePhrase(sentence).includes(key)).slice(0, 1));
      blockKeywords(block).forEach((keyword) => existing.keywords.add(keyword));
      counts.set(key, existing);
    }
  }
  const minimumBlocks = blocks.length <= 2 ? 1 : 2;
  return [...counts.values()].filter((entry) => entry.blocks.size >= minimumBlocks && entry.examples.length > 0).sort((a, b) => b.blocks.size - a.blocks.size).slice(0, 20).map((entry) => ({ name: titleCase(entry.phrase), sourceItemId: entry.sourceItemId, sourceSentence: entry.examples[0] ?? "", definition: ensureSentence(entry.examples[0] ?? ""), detail: truncateReadable(entry.examples.join(" "), 220), extractionMethod: "noun-phrase", confidence: 0.55, evidence: entry.examples.slice(1, 3), category: entry.category, keywords: [...entry.keywords].slice(0, 8) }));
};

const mergeCandidates = (candidates: ConceptCandidate[]): Seed[] => {
  const seeds = new Map<string, Seed>();
  for (const candidate of candidates) {
    const normalized = normalizePhrase(candidate.name);
    if (!normalized || blockedLabel(candidate.name)) continue;
    const aliasKey = normalizeConceptAlias(candidate.name) || normalized;
    const existing = seeds.get(aliasKey);
    const score = candidate.confidence * 100 + candidate.evidence.length * 10 + candidate.keywords.length * 2 + (candidate.extractionMethod === "explicit-definition" ? 30 : 0) + (candidate.extractionMethod === "bold-term" ? 20 : 0);
    if (!existing) { seeds.set(aliasKey, { name: candidate.name, score, category: candidate.category, sourceItemIds: new Set([candidate.sourceItemId]), definition: candidate.definition, detail: candidate.detail, evidence: candidate.evidence.filter(isValidSentence), keywords: new Set(candidate.keywords) }); continue; }
    existing.score += score;
    existing.sourceItemIds.add(candidate.sourceItemId);
    const candidateHasWrapper = normalizeConceptAlias(candidate.name) !== normalized;
    const existingHasWrapper = normalizeConceptAlias(existing.name) !== normalizePhrase(existing.name);
    if ((!candidateHasWrapper && existingHasWrapper && candidate.confidence >= 0.7) || (candidate.name.length > existing.name.length && candidate.confidence >= 0.7 && candidateHasWrapper === existingHasWrapper)) existing.name = candidate.name;
    if (candidate.confidence >= 0.9 || existing.definition.length < candidate.definition.length) { existing.definition = candidate.definition; existing.detail = candidate.detail; existing.category = candidate.category; }
    candidate.evidence.forEach((entry) => { if (isValidSentence(entry)) existing.evidence.push(entry); });
    candidate.keywords.forEach((keyword) => existing.keywords.add(keyword));
  }
  return [...seeds.values()].sort((left, right) => right.score - left.score);
};

const conceptPrimer = (label: string, definition: string): string => {
  void label;
  const cleaned = cleanPassage(definition);
  const completeSentence = splitIntoSentences(cleaned)[0];
  if (completeSentence && isValidPrimer(completeSentence)) {
    return ensureSentence(completeSentence);
  }
  const afterCopula = cleaned.replace(
    /^[A-Z][\w\s&'-]+?\s+(?:is|are|refers to|means|describes|focuses on|explains|shows)\s+(?:the\s+|an?\s+)?/i,
    ""
  ).trim();
  const source = afterCopula && afterCopula !== cleaned ? afterCopula : cleaned;
  if (source && source.length <= 160) {
    const primer = source.replace(/^[a-z]/, (value) => value.toUpperCase());
    return isValidPrimer(primer) ? ensureSentence(primer) : "";
  }
  return "";
};

// Words that should never appear in a mnemonic — internal tokens, generic scaffolds,
// and single-character noise that make hooks meaningless or leak implementation details.
const MNEMONIC_BLOCKED_TOKENS = new Set([
  "aeonthra", "demo", "module", "chapter", "course", "source", "content",
  "canvas", "textbook", "student", "students", "context", "framework",
  "activity", "discussion", "assignment", "quiz", "page", "item", "section",
  "overview", "introduction", "lecture", "matters", "shows", "explain",
  "learning", "canvas", "bundle", "import", "export", "local", "system"
]);

const conceptMnemonic = (label: string, keywords: string[], confusion: string | null, category: string): string => {
  void category;
  // Strip internal tokens, possessives, label words, and short/weak keywords.
  // Require ≥ 8 chars so single-syllable generic words (moral, rule, good, evil,
  // states, virtue, excess, middle) and 2–6 letter noise never appear in templates.
  const labelTokens = new Set(label.toLowerCase().split(/\s+/));
  const clean = keywords.filter(
    (k) => k.length >= 8
      && !MNEMONIC_BLOCKED_TOKENS.has(k.toLowerCase())
      && !labelTokens.has(k.toLowerCase())
      && !k.endsWith("'s")   // no possessives (e.g. "aristotle's")
      && !k.endsWith("'")
      && !/^\d/.test(k)      // no numeric tokens
  );
  // Need at least 2 substantive keywords for any template — otherwise return ""
  // so conceptHookText falls back to transferHook ("Use X to explain...")
  if (clean.length < 2) return "";
  const [first, second, third] = clean;
  const candidates = [
    // Only use the two-lanes template when we have at least two substantive keywords
    // and a real contrast concept — avoids "handles aristotle's" type failures
    confusion && first && second
      ? `Picture two lanes: ${label} is where ${first} and ${second} belong. Anything pulling toward ${confusion} is the wrong lane.`
      : "",
    first && second && third
      ? `Picture ${first}, ${second}, and ${third} on the same desk. That cluster is ${label}.`
      : "",
    first && second
      ? `Think of ${label} like a scene built from ${first} and ${second}. If those cues return, the concept returns too.`
      : "",
    first
      ? `Imagine a glowing note that says ${first}. That visual cue should pull ${label} back into view.`
      : ""
  ].filter(Boolean);
  return candidates.find((entry) => isValidMnemonic(entry, { label })) ?? "";
};

const normalizeLoose = (text: string): string => cleanPassage(text).toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();

const distinctConceptDetail = (definition: string, detail: string, evidence: string[]): string => {
  const normalizedDefinition = normalizeLoose(definition);
  const candidates = [detail, ...evidence]
    .map((entry) => truncateReadable(cleanPassage(entry), 240))
    .filter((entry) => entry.length >= 35)
    .filter((entry) => normalizeLoose(entry) !== normalizedDefinition)
    .filter((entry) => !normalizeLoose(entry).includes(normalizedDefinition) && !normalizedDefinition.includes(normalizeLoose(entry)));
  return candidates[0] ?? "";
};

const sanitizeConceptMnemonic = (mnemonic: string): string => {
  if (!mnemonic) return "";
  if (/easy mistake|becomes unstable|page label|title and lose|actual claim/i.test(mnemonic)) {
    return "";
  }
  if (!/picture|imagine|think of|remember|like|not|rhymes|glowing|meter|guitar|string|matrix|compass/i.test(mnemonic)) {
    return "";
  }
  // Reject mnemonics that still contain internal/generic implementation tokens
  if (/\b(aeonthra|demo|module|chapter|course|source|textbook|student|canvas|bundle|import|export)\b/i.test(mnemonic)) {
    return "";
  }
  return mnemonic;
};

const evidenceSnippets = (label: string, definition: string, detail: string, evidence: string[]): string[] => {
  const snippets = [definition, ...evidence, detail].map((entry) => cleanPassage(entry)).filter(isValidSentence).filter((entry) => entry.length >= 30 && entry.length <= 220).filter((entry) => normalizePhrase(entry).includes(stem(label))).filter((entry, index, array) => array.findIndex((candidate) => normalizePhrase(candidate) === normalizePhrase(entry)) === index).filter((entry) => !/^(this|it|they|that)\b/i.test(entry)).slice(0, 3);
  return snippets.length > 0 ? snippets : [definition];
};

export function buildBlocks(bundle: CaptureBundle): Block[] {
  return bundle.items
    .filter((item) => !skipForConceptMining(item))
    .map((item) => {
    const structured = extractStructuredBlocks(item);
    const strongBlocks = structured.filter((block) => block.score >= BLOCK_THRESHOLD);
    const leadBlock = strongBlocks[0] ?? structured[0];
    const clean = preferredItemTitle(item, structured);
    const headingTopics = Array.from(new Set(extractHeadingTopics(item).concat(strongBlocks.filter((block) => block.type === "heading" && !blockedLabel(block.text)).map((block) => titleCase(block.text))).concat(strongBlocks.flatMap((block) => topicCandidatesFromBlock(block).slice(0, 2).map((candidate) => titleCase(candidate.name)))))).slice(0, 6);
    const lead = leadBlock ? leadSentence(leadBlock.text) : truncateReadable(item.excerpt);
    const strongSentences = strongBlocks.flatMap((block) => splitIntoSentences(block.text)).filter(isValidSentence).slice(0, 8);
    const keywords = Array.from(new Set(strongBlocks.flatMap(blockKeywords))).slice(0, 10);
    return { sourceItemId: item.id, sourceTitle: item.title, sourceKind: item.kind, cleanTitle: clean, headingTopics, lead, summary: truncateReadable([clean, lead].filter(Boolean).join(". ")), sentences: strongSentences.length > 0 ? strongSentences : splitIntoSentences(item.plainText).slice(0, 4), score: strongBlocks.reduce((sum, block) => sum + block.score, 0) + scoreTitle(clean), titleScore: scoreTitle(clean), keywords };
  })
    .filter((block) => block.score > 8 || block.titleScore > 8)
    .sort((left, right) => right.score - left.score);
}

export function buildConcepts(bundle: CaptureBundle, blocks: Block[]): LearningConcept[] {
  const contentItems = bundle.items.filter((item) => !skipForConceptMining(item));
  const contentBlocks = contentItems.flatMap((item) => extractStructuredBlocks(item)).filter((block) => block.score >= BLOCK_THRESHOLD);
  const headingSeeds: ConceptCandidate[] = contentItems.flatMap((item) => {
    const blocks = extractStructuredBlocks(item).filter((block) => block.score >= BLOCK_THRESHOLD);
    const lead = blocks[0];
    return extractHeadingTopics(item)
      .map((topic) => ({
        name: topic,
        sourceItemId: item.id,
        sourceSentence: leadSentence(lead?.text ?? item.excerpt),
        definition: leadSentence(lead?.text ?? item.excerpt),
        detail: truncateReadable(blocks.slice(0, 2).map((block) => block.text).join(" "), 220),
        extractionMethod: "heading-topic" as const,
        confidence: 0.9,
        evidence: blocks.slice(1, 3).map((block) => leadSentence(block.text)),
        category: topic,
        keywords: meaningfulWords(`${topic} ${lead?.text ?? item.excerpt}`).slice(0, 8)
      }))
      .filter((candidate) => !blockedLabel(candidate.name));
  });
  const titleSeeds: ConceptCandidate[] = contentItems
    .map((item) => {
      const structured = extractStructuredBlocks(item);
      const title = preferredItemTitle(item, structured);
      const lead = structured.find((block) => block.score >= BLOCK_THRESHOLD);
      return {
        name: title,
        sourceItemId: item.id,
        sourceSentence: leadSentence(lead?.text ?? item.excerpt),
        definition: leadSentence(lead?.text ?? item.excerpt),
        detail: truncateReadable(splitIntoSentences(item.plainText).slice(0, 2).join(" "), 220),
        extractionMethod: "heading-topic" as const,
        confidence: 0.85,
        evidence: [],
        category: title,
        keywords: meaningfulWords(`${title} ${item.excerpt}`).slice(0, 8)
      };
    })
    .filter((candidate) => scoreTitle(candidate.name) > 10 && !blockedLabel(candidate.name));
  const blockSeeds: ConceptCandidate[] = blocks
    .filter((block) => !skipForConceptMining(bundle.items.find((item) => item.id === block.sourceItemId) ?? bundle.items[0]!))
    .filter((block) => block.titleScore > 12)
    .filter((block) => !blockedLabel(block.cleanTitle))
    .map((block) => ({
      name: block.cleanTitle,
      sourceItemId: block.sourceItemId,
      sourceSentence: block.lead,
      definition: ensureSentence(block.lead),
      detail: block.summary,
      extractionMethod: "heading-topic" as const,
      confidence: 0.92,
      evidence: block.sentences.slice(1, 3),
      category: block.cleanTitle,
      keywords: block.keywords
    }));
  const candidates = [...blockSeeds, ...headingSeeds, ...titleSeeds, ...contentBlocks.flatMap(topicCandidatesFromBlock), ...deriveNounPhraseCandidates(contentBlocks)];
  const merged = mergeCandidates(candidates).filter((seed) => isValidConcept({ label: seed.name, definition: seed.definition, summary: truncateReadable(seed.detail, 220) }));
  const chosenPool = merged.filter((seed) => !isBundleEchoLabel(seed.name, bundle));
  const chosen = (chosenPool.length >= 2 ? chosenPool : merged).slice(0, MAX_CONCEPTS);
  if (chosen.length === 0) {
    const rawLabel = titleCase(cleanTitle(bundle.items[0]?.title || bundle.title || "Source Focus"));
    const label = blockedLabel(rawLabel) ? "Source Focus" : rawLabel;
    const definition = truncateReadable(bundle.items[0]?.excerpt || bundle.title);
    return [{ id: label.toLowerCase().replace(/[^a-z0-9]+/g, "-"), label, score: 1, summary: definition, primer: "", mnemonic: "", excerpt: definition, definition: `${definition}.`, stakes: "This is the clearest source-grounded anchor left after the cleanup pass.", commonConfusion: "Do not let navigation labels substitute for the actual topic.", transferHook: "Restate this source section in your own words before moving on.", category: "Source Focus", keywords: meaningfulWords(definition).slice(0, 6), sourceItemIds: bundle.items[0] ? [bundle.items[0].id] : [], relatedConceptIds: [] }];
  }
  const concepts = chosen.map((seed, _index, source) => {
    const related = source.filter((candidate) => candidate.name !== seed.name);
    const confusion = related.find((candidate) => candidate.category === seed.category || trigramJaccard(candidate.definition, seed.definition) > 0.2)?.name ?? null;
    const label = dedupeAdjacentPhraseRepeats(seed.name);
    const definition = truncateReadable(dedupeAdjacentPhraseRepeats(seed.definition), 220);
    const detail = truncateReadable(dedupeAdjacentPhraseRepeats(seed.detail), 240);
    const summary = distinctConceptDetail(definition, detail, seed.evidence);
    const evidence = evidenceSnippets(label, definition, detail, seed.evidence);
    const keywords = [...seed.keywords].slice(0, 8);
    const category = seed.category || titleCase(cleanTitle(bundle.title));
    // Must use the same ID derivation as concept.id (dedupeAdjacentPhraseRepeats → slug)
    // to avoid relatedConceptId mismatches that silently break relatedPool() lookups.
    const relatedConceptIds = related.filter((candidate) => [...candidate.keywords].some((keyword) => seed.keywords.has(keyword))).slice(0, 3).map((candidate) => dedupeAdjacentPhraseRepeats(candidate.name).toLowerCase().replace(/[^a-z0-9]+/g, "-"));
    const primer = conceptPrimer(label, definition);
    const mnemonic = sanitizeConceptMnemonic(conceptMnemonic(label, keywords, confusion, category));
    return {
      id: label.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      label,
      score: Math.max(1, Math.round(seed.score)),
      summary,
      primer,
      mnemonic,
      excerpt: evidence[0] ?? definition,
      definition,
      stakes: `${label} matters because the source spends real explanatory space showing what it does.`,
      commonConfusion: confusion ? `${label} is not ${confusion}. Keep their main moves separate when you explain the source.` : "",
      transferHook: `Use ${label} to explain what this part of the source is doing in plain language.`,
      category,
      keywords,
      sourceItemIds: [...seed.sourceItemIds].filter(Boolean),
      relatedConceptIds
    };
  });
  const validConceptsPool = concepts.filter((concept) => isValidConcept({ label: concept.label, definition: concept.definition, summary: concept.summary }));
  const validConcepts = (validConceptsPool.filter((concept) => !isBundleEchoLabel(concept.label, bundle)).length >= 2
    ? validConceptsPool.filter((concept) => !isBundleEchoLabel(concept.label, bundle))
    : validConceptsPool);
  const existingIds = new Set(validConcepts.map((concept) => concept.id));
  const supplements = blocks
    .filter((block) => !skipForConceptMining(bundle.items.find((item) => item.id === block.sourceItemId) ?? bundle.items[0]!))
    .filter((block) => block.titleScore > 10 && !blockedLabel(block.cleanTitle))
    .filter((block) => !isBundleEchoLabel(block.cleanTitle, bundle))
    .filter((block) => !existingIds.has(block.cleanTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-")))
    .sort((left, right) => right.score - left.score)
    .slice(0, MAX_CONCEPTS)
    .map((block) => ({
      id: block.cleanTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      label: block.cleanTitle,
      score: Math.max(1, Math.round(block.score)),
      summary: distinctConceptDetail(ensureSentence(block.lead), truncateReadable(block.summary), block.sentences),
      primer: conceptPrimer(block.cleanTitle, ensureSentence(block.lead)),
      mnemonic: sanitizeConceptMnemonic(conceptMnemonic(block.cleanTitle, block.keywords, null, block.cleanTitle)),
      excerpt: ensureSentence(block.lead),
      definition: ensureSentence(block.lead),
      stakes: `${block.cleanTitle} matters because it anchors a real section of the source.`,
      commonConfusion: "",
      transferHook: `Use ${block.cleanTitle} to explain what this source section is trying to teach.`,
      category: block.cleanTitle,
      keywords: block.keywords.slice(0, 8),
      sourceItemIds: [block.sourceItemId],
      relatedConceptIds: []
    }));
  const mergedConcepts = [...validConcepts, ...supplements];
  const filteredConcepts = mergedConcepts.filter((concept) => !isBundleEchoLabel(concept.label, bundle));
  const aliasDedupedConcepts = dedupeConceptAliases(filteredConcepts.length > 0 ? filteredConcepts : mergedConcepts);
  const deDuplicatedConcepts = pruneRedundantConcepts(aliasDedupedConcepts);
  return deDuplicatedConcepts.slice(0, MAX_CONCEPTS);
}

function antonymMatch(leftKeywords: string[], rightKeywords: string[]): boolean {
  return leftKeywords.some((keyword) => (ANTONYMS[keyword] ?? []).some((candidate) => rightKeywords.includes(candidate)));
}

function hypernymOverlap(leftLabel: string, rightLabel: string): boolean {
  const left = HYPERNYMS[normalizePhrase(leftLabel)] ?? [];
  const right = HYPERNYMS[normalizePhrase(rightLabel)] ?? [];
  return left.some((candidate) => right.includes(candidate));
}

export function buildRelations(concepts: LearningConcept[]): ConceptRelation[] {
  const relations: ConceptRelation[] = [];
  for (let i = 0; i < concepts.length; i += 1) {
    for (let j = i + 1; j < concepts.length; j += 1) {
      const left = concepts[i]!;
      const right = concepts[j]!;
      const sharedKeywords = left.keywords.filter((keyword) => right.keywords.includes(keyword));
      const sharedSources = left.sourceItemIds.filter((sourceId) => right.sourceItemIds.includes(sourceId));
      const directMention = normalizePhrase(left.definition).includes(stem(right.label)) || normalizePhrase(right.definition).includes(stem(left.label));
      const contrast = left.commonConfusion.includes(right.label) || right.commonConfusion.includes(left.label) || antonymMatch(left.keywords, right.keywords);
      const hierarchy = hypernymOverlap(left.label, right.label);
      const strength = sharedKeywords.length * 0.4 + sharedSources.length * 0.6 + (directMention ? 0.6 : 0) + (contrast ? 0.35 : 0) + (hierarchy ? 0.3 : 0);
      if (strength < 0.7) continue;
      const type: ConceptRelation["type"] = contrast ? "contrasts" : hierarchy ? "extends" : directMention || sharedSources.length > 0 ? "supports" : "applies";
      const label = contrast ? `${left.label} stands in contrast to ${right.label}.` : hierarchy ? `${left.label} builds on the same family of ideas as ${right.label}.` : sharedKeywords.length ? `${left.label} and ${right.label} both address ${sharedKeywords.slice(0, 2).join(" and ")}.` : `${left.label} and ${right.label} are taught in the same source corridor.`;
      relations.push({ fromId: left.id, toId: right.id, type, label, strength: Number(strength.toFixed(2)) });
    }
  }
  return relations.sort((left, right) => right.strength - left.strength).slice(0, 24);
}

export function relatedPhilosopher(text: string): string | null {
  const normalized = cleanPassage(text);
  return PHILOSOPHERS.find((entry) => normalized.includes(entry.name))?.name ?? null;
}

export function paraphraseWithSynonyms(sentence: string): string {
  const tokens = sentence.split(/\b/);
  let swaps = 0;
  const next = tokens.map((token) => {
    const key = token.toLowerCase();
    const alternatives = SYNONYMS[key] ?? [];
    if (alternatives.length === 0 || swaps >= 2 || key.length < 4) return token;
    swaps += 1;
    return alternatives[0] ?? token;
  }).join("");
  return cleanPassage(next);
}
