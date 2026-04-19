import type { LearningBundle } from "@learning/schema";
import { cosine, extractKeywords, jaccard, tokenize, trigrams } from "../utils";

export class ProximityEngine {
  private readonly idf = new Map<string, number>();

  constructor(corpusTexts: string[] = []) {
    const documentFrequency = new Map<string, number>();
    corpusTexts.forEach((text) => {
      const unique = new Set(tokenize(text));
      unique.forEach((token) => {
        documentFrequency.set(token, (documentFrequency.get(token) ?? 0) + 1);
      });
    });
    documentFrequency.forEach((count, token) => {
      this.idf.set(token, Math.log((corpusTexts.length + 1) / (count + 1)) + 1);
    });
  }

  similarity(left: string, right: string): number {
    const leftTokens = tokenize(left);
    const rightTokens = tokenize(right);
    const tokenSim = jaccard(leftTokens, rightTokens);
    const trigramSim = jaccard(trigrams(left), trigrams(right));
    const keywordSim = jaccard(extractKeywords(left, 10), extractKeywords(right, 10));
    const tfIdfSim = cosine(leftTokens, rightTokens, this.idf);
    return tokenSim * 0.2 + trigramSim * 0.2 + keywordSim * 0.3 + tfIdfSim * 0.3;
  }

  conceptRelatedness(left: LearningBundle["concepts"][number], right: LearningBundle["concepts"][number]): number {
    const textSim = this.similarity(
      `${left.label} ${left.definition} ${left.summary} ${left.keywords.join(" ")}`,
      `${right.label} ${right.definition} ${right.summary} ${right.keywords.join(" ")}`
    );
    const relationBoost = left.relatedConceptIds.includes(right.id) || right.relatedConceptIds.includes(left.id) ? 0.2 : 0;
    return Math.min(1, textSim + relationBoost);
  }
}
