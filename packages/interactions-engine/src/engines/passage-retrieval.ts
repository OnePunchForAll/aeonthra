import type { InteractionCorpus, IndexedPassage, PassageResult, SearchOptions } from "../types";
import { cosine, createPassages, jaccard, tokenize } from "../utils";

type PassageIndex = {
  passages: IndexedPassage[];
  byToken: Map<string, number[]>;
  byConcept: Map<string, number[]>;
  bySection: Map<string, number[]>;
  idf: Map<string, number>;
};

export class PassageRetrievalEngine {
  private readonly index: PassageIndex;

  constructor(corpus: InteractionCorpus) {
    this.index = this.buildIndex(corpus);
  }

  private buildIndex(corpus: InteractionCorpus): PassageIndex {
    const passages = createPassages(corpus);
    const byToken = new Map<string, number[]>();
    const byConcept = new Map<string, number[]>();
    const bySection = new Map<string, number[]>();
    const documentFrequency = new Map<string, number>();

    passages.forEach((passage) => {
      const seen = new Set<string>();
      tokenize(passage.text).forEach((token) => {
        byToken.set(token, [...(byToken.get(token) ?? []), passage.id]);
        if (!seen.has(token)) {
          documentFrequency.set(token, (documentFrequency.get(token) ?? 0) + 1);
          seen.add(token);
        }
      });
      passage.concepts.forEach((conceptId) => {
        byConcept.set(conceptId, [...(byConcept.get(conceptId) ?? []), passage.id]);
      });
      bySection.set(passage.sectionId, [...(bySection.get(passage.sectionId) ?? []), passage.id]);
    });

    const idf = new Map<string, number>();
    documentFrequency.forEach((count, token) => {
      idf.set(token, Math.log((passages.length + 1) / (count + 1)) + 1);
    });

    return { passages, byToken, byConcept, bySection, idf };
  }

  search(query: string, options: SearchOptions = {}): PassageResult[] {
    const queryTokens = tokenize(query);
    if (queryTokens.length === 0) {
      return [];
    }

    const candidates = new Set<number>();
    queryTokens.forEach((token) => {
      (this.index.byToken.get(token) ?? []).forEach((id) => candidates.add(id));
    });
    if (options.concepts) {
      options.concepts.forEach((conceptId) => {
        (this.index.byConcept.get(conceptId) ?? []).forEach((id) => candidates.add(id));
      });
    }

    return [...candidates]
      .map((id) => this.index.passages[id]!)
      .filter((passage) => (options.filter ? options.filter(passage) : true))
      .map((passage) => {
        const passageTokens = tokenize(passage.text);
        const tfIdfScore = cosine(queryTokens, passageTokens, this.index.idf);
        const overlap = jaccard(queryTokens, passageTokens);
        const conceptBoost = options.concepts ? jaccard(options.concepts, passage.concepts) * 0.28 : 0;
        const sectionBoost = options.sectionHint && passage.chapterTitle.toLowerCase().includes(options.sectionHint.toLowerCase()) ? 0.18 : 0;
        const freshnessPenalty = options.recentlyShown?.includes(passage.id) ? 0.2 : 0;
        return {
          passage,
          score: tfIdfScore * 0.45 + overlap * 0.35 + conceptBoost + sectionBoost - freshnessPenalty
        };
      })
      .filter((entry) => entry.score > 0.08)
      .sort((left, right) => right.score - left.score)
      .slice(0, options.limit ?? 10);
  }

  searchByConcept(conceptId: string): PassageResult[] {
    return (this.index.byConcept.get(conceptId) ?? [])
      .map((id) => ({ passage: this.index.passages[id]!, score: 1 }))
      .slice(0, 10);
  }

  searchByAttribution(thinker: string): PassageResult[] {
    const name = thinker.toLowerCase();
    return this.index.passages
      .filter((passage) => passage.attributions.some((entry) => entry.toLowerCase() === name))
      .map((passage) => ({ passage, score: 1 }));
  }

  getPassages(): IndexedPassage[] {
    return this.index.passages;
  }
}
