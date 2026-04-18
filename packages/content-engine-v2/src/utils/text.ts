const ENTITY_MAP: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: "\""
};

const SENTENCE_ABBREVIATIONS = [
  "e.g.",
  "i.e.",
  "mr.",
  "mrs.",
  "ms.",
  "dr.",
  "prof.",
  "vs.",
  "etc."
] as const;

const STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "how", "if", "in", "into",
  "is", "it", "of", "on", "or", "that", "the", "their", "this", "to", "was", "when", "with",
  "you", "your", "yours", "they", "them", "these", "those", "there", "then", "than", "we",
  "our", "ours", "he", "she", "his", "hers", "its", "who", "whom", "whose", "which", "what",
  "where", "while", "whenever", "whether", "because", "only", "just", "also", "such"
]);

const CLAUSE_OPENER_TOKENS = new Set([
  "if",
  "when",
  "while",
  "whenever",
  "whether",
  "because",
  "although",
  "though",
  "since",
  "after",
  "before",
  "unless",
  "until"
]);

export function decodeHtmlEntities(value: string): string {
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (_match, entity: string) => {
    if (entity.startsWith("#x")) {
      const code = Number.parseInt(entity.slice(2), 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : " ";
    }
    if (entity.startsWith("#")) {
      const code = Number.parseInt(entity.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : " ";
    }
    return ENTITY_MAP[entity.toLowerCase()] ?? " ";
  });
}

export function normalizeWhitespace(value: string): string {
  return value
    .replace(/\r/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/\u00ad/g, "")
    .replace(/\u200b/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function stripTags(value: string): string {
  return decodeHtmlEntities(
    value
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(?:p|div|section|article|blockquote|figcaption|li|dt|dd|tr|td|th|h[1-6])>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  );
}

export function normalizeText(value: string): string {
  return normalizeWhitespace(stripTags(value));
}

export function normalizeForCompare(value: string): string {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function slugifyStable(value: string): string {
  return normalizeForCompare(value)
    .replace(/\s+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

function protectAbbreviations(value: string): string {
  let next = value;
  for (const abbreviation of SENTENCE_ABBREVIATIONS) {
    const escaped = abbreviation.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    next = next.replace(new RegExp(escaped, "gi"), (match) => match.replace(/\./g, "∯"));
  }
  return next;
}

export function splitSentences(value: string): string[] {
  return protectAbbreviations(normalizeText(value))
    .split(/(?<=[.!?]["')\]])\s+|(?<=[.!?])\s+|(?<=:)\s+(?=[A-Z])/)
    .map((entry) => entry.replace(/∯/g, ".").trim())
    .filter((entry) => entry.length >= 20);
}

export function readableSnippet(value: string, maxLength = 180): string {
  const cleaned = normalizeText(value);
  if (cleaned.length <= maxLength) {
    return cleaned;
  }
  const slice = cleaned.slice(0, maxLength);
  const boundary = Math.max(slice.lastIndexOf("."), slice.lastIndexOf(" "), 60);
  return `${slice.slice(0, boundary).trim()}...`;
}

export function toDisplayLabel(value: string): string {
  const cleaned = collapseRepeatedLabelPhrase(normalizeText(value));
  const simpleWordsOnly = /^[A-Za-z][A-Za-z'/-]*(?:\s+[A-Za-z][A-Za-z'/-]*)*$/.test(cleaned);
  const shouldTitleCase = cleaned === cleaned.toLowerCase()
    || (simpleWordsOnly && cleaned.split(/\s+/).some((token) => token === token.toLowerCase()));
  if (!cleaned || !shouldTitleCase) {
    return cleaned;
  }
  return cleaned
    .split(/\s+/)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
}

export function meaningfulTokens(value: string): string[] {
  return normalizeForCompare(value)
    .split(" ")
    .filter((token) => token.length >= 3 && !STOPWORDS.has(token));
}

export function firstMeaningfulToken(value: string): string {
  return normalizeForCompare(value)
    .split(" ")
    .find((token) => token.length >= 2) ?? "";
}

export function startsWithClauseOpener(value: string): boolean {
  return CLAUSE_OPENER_TOKENS.has(firstMeaningfulToken(value));
}

export function collapseRepeatedLabelPhrase(value: string): string {
  const tokens = normalizeText(value).split(/\s+/).filter(Boolean);
  if (tokens.length < 2 || tokens.length % 2 !== 0) {
    return normalizeText(value);
  }
  const midpoint = tokens.length / 2;
  const left = tokens.slice(0, midpoint).join(" ");
  const right = tokens.slice(midpoint).join(" ");
  if (normalizeForCompare(left) === normalizeForCompare(right)) {
    return left;
  }
  return normalizeText(value);
}

export function hasRepeatedLabelPhrase(value: string): boolean {
  const normalized = normalizeForCompare(value);
  if (!normalized) {
    return false;
  }
  const collapsed = normalizeForCompare(collapseRepeatedLabelPhrase(value));
  return collapsed.length > 0 && collapsed !== normalized;
}

export function overlapRatio(left: string, right: string): number {
  const leftSet = new Set(meaningfulTokens(left));
  const rightTokens = meaningfulTokens(right);
  if (leftSet.size === 0 || rightTokens.length === 0) {
    return 0;
  }
  const shared = rightTokens.filter((token) => leftSet.has(token)).length;
  return shared / Math.min(leftSet.size, rightTokens.length);
}

export function uniqueNormalized(values: string[]): string[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = normalizeForCompare(value);
    if (!key || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
