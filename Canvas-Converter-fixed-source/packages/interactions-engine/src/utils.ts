import type { InteractionCorpus, IndexedPassage } from "./types";

export const STOPWORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "in", "on", "at", "to", "for", "of", "by", "with", "from", "and",
  "but", "or", "not", "this", "that", "these", "those", "it", "its", "they", "them", "their", "he", "she", "we",
  "you", "i", "my", "our", "your", "his", "her", "who", "which", "what", "when", "where", "how", "why", "if", "as",
  "so", "do", "be", "have", "has", "had", "will", "would", "could", "should", "may", "might", "can", "shall", "also",
  "very", "often", "just", "even", "still", "already", "rather", "quite", "however", "therefore", "thus", "hence",
  "moreover", "furthermore", "nevertheless", "although", "though", "while", "because", "since", "until", "unless",
  "whether", "both", "either", "neither", "each", "every", "some", "any", "no", "all", "most", "many", "few", "much",
  "more", "less", "such", "other", "another", "same", "own", "only"
]);

export const KNOWN_THINKERS = [
  "Aristotle", "Bentham", "Mill", "Kant", "Nozick", "Rawls", "Plato", "Socrates", "Hume", "Aquinas",
  "Epicurus", "Confucius", "Nussbaum", "Singer", "Thomson", "Foot", "Hobbes", "Locke", "Nietzsche", "Butler"
];

export function normalizeText(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/[“”]/g, "\"")
    .replace(/[’]/g, "'")
    .trim();
}

export function tokenize(text: string): string[] {
  return normalizeText(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOPWORDS.has(token));
}

export function extractKeywords(text: string, limit = 8): string[] {
  const counts = new Map<string, number>();
  tokenize(text).forEach((token) => {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  });
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([token]) => token);
}

export function sentenceSplit(text: string): string[] {
  return normalizeText(text)
    .split(/(?<=[.!?])\s+/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

export function createPassages(corpus: InteractionCorpus): IndexedPassage[] {
  const passages: IndexedPassage[] = [];
  let currentId = 0;
  corpus.bundle.items.forEach((item) => {
    const words = normalizeText(item.plainText).split(/\s+/).filter(Boolean);
    const conceptMatches = corpus.learning.concepts.filter((concept) => {
      const haystack = `${item.title} ${item.plainText}`.toLowerCase();
      return haystack.includes(concept.label.toLowerCase()) || concept.keywords.some((keyword) => haystack.includes(keyword.toLowerCase()));
    });
    for (let index = 0; index < words.length; index += 48) {
      const segment = words.slice(index, index + 56);
      if (segment.length < 18) {
        continue;
      }
      const text = segment.join(" ");
      const title = item.headingTrail[item.headingTrail.length - 1] || item.title;
      const pageMatch = text.match(/\bp(?:age)?\.?\s*(\d{1,4})\b/i);
      const pageNumber = pageMatch ? Number(pageMatch[1]) : Math.floor(index / 220) + 1;
      const attributions = KNOWN_THINKERS.filter((thinker) => new RegExp(`\\b${thinker}\\b`, "i").test(text));
      passages.push({
        id: currentId,
        text,
        sourceItemId: item.id,
        sectionId: `${item.id}:${Math.floor(index / 48)}`,
        chapterTitle: title,
        pageNumber,
        wordCount: segment.length,
        keywords: extractKeywords(text),
        concepts: conceptMatches.map((concept) => concept.id),
        attributions,
        position: currentId,
        title
      });
      currentId += 1;
    }
  });
  return passages;
}

export function stableId(seed: string): string {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `ix-${(hash >>> 0).toString(16)}`;
}

export function jaccard(left: string[], right: string[]): number {
  if (left.length === 0 || right.length === 0) return 0;
  const leftSet = new Set(left);
  const rightSet = new Set(right);
  const intersection = [...leftSet].filter((token) => rightSet.has(token)).length;
  const union = new Set([...leftSet, ...rightSet]).size;
  return union === 0 ? 0 : intersection / union;
}

export function trigrams(text: string): string[] {
  const tokens = tokenize(text);
  const values: string[] = [];
  for (let index = 0; index < tokens.length - 2; index += 1) {
    values.push(`${tokens[index]} ${tokens[index + 1]} ${tokens[index + 2]}`);
  }
  return values;
}

export function cosine(query: string[], candidate: string[], idf: Map<string, number>): number {
  const queryMap = new Map<string, number>();
  const candidateMap = new Map<string, number>();
  query.forEach((token) => queryMap.set(token, (queryMap.get(token) ?? 0) + 1));
  candidate.forEach((token) => candidateMap.set(token, (candidateMap.get(token) ?? 0) + 1));

  const allTerms = new Set([...queryMap.keys(), ...candidateMap.keys()]);
  let dot = 0;
  let queryNorm = 0;
  let candidateNorm = 0;
  allTerms.forEach((term) => {
    const weight = idf.get(term) ?? 1;
    const q = (queryMap.get(term) ?? 0) * weight;
    const c = (candidateMap.get(term) ?? 0) * weight;
    dot += q * c;
    queryNorm += q * q;
    candidateNorm += c * c;
  });
  if (queryNorm === 0 || candidateNorm === 0) return 0;
  return dot / (Math.sqrt(queryNorm) * Math.sqrt(candidateNorm));
}
