import type { Attribution, InteractionCorpus } from "../types";
import { KNOWN_THINKERS, tokenize } from "../utils";
import { PassageRetrievalEngine } from "./passage-retrieval";

const DIRECT_QUOTE = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:said|wrote|argued|claimed|noted|observed|stated|maintained|held)\s*[:,]?\s*"([^"]+)"/gi;
const NARRATIVE_PATTERNS = [
  /according to ([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?),?\s+([^.!?]+[.!?])/gi,
  /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)'s view is that\s+([^.!?]+[.!?])/gi,
  /in ([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)'s analysis,?\s+([^.!?]+[.!?])/gi
];
const PARAPHRASE_PATTERNS = [
  /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?) argues that\s+([^.!?]+[.!?])/gi,
  /for ([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?),?\s+([^.!?]+[.!?])/gi
];

export class VoiceAttributionEngine {
  private readonly attributions: Attribution[] = [];
  private readonly thinkers = new Set(KNOWN_THINKERS.map((entry) => entry.toLowerCase()));
  private readonly thinkerAliases = new Map<string, string>();

  constructor(
    private readonly corpus: InteractionCorpus,
    private readonly passageEngine: PassageRetrievalEngine,
    seedAttributions: Attribution[] = []
  ) {
    this.attributions.push(...seedAttributions);
    this.seedThinkerAliases(seedAttributions.map((entry) => entry.thinker));
    this.ingest();
  }

  private ingest(): void {
    const passages = this.passageEngine.getPassages();
    passages.forEach((passage) => {
      let matched = false;
      let match: RegExpExecArray | null;
      while ((match = DIRECT_QUOTE.exec(passage.text)) !== null) {
        const thinker = match[1]!.trim();
        if (!this.isKnownThinker(thinker)) continue;
        this.seedThinkerAliases([thinker]);
        this.attributions.push({
          thinker,
          passage,
          confidence: 1,
          attributionType: "direct-quote",
          topic: this.extractTopics(match[2] ?? passage.text),
          position: this.detectPosition(match[2] ?? passage.text)
        });
        matched = true;
      }
      NARRATIVE_PATTERNS.forEach((pattern) => {
        while ((match = pattern.exec(passage.text)) !== null) {
          const thinker = match[1]!.trim();
          if (!this.isKnownThinker(thinker)) continue;
          this.seedThinkerAliases([thinker]);
          this.attributions.push({
            thinker,
            passage,
            confidence: 0.8,
            attributionType: "narrative",
            topic: this.extractTopics(match[2] ?? passage.text),
            position: this.detectPosition(match[2] ?? passage.text)
          });
          matched = true;
        }
      });
      PARAPHRASE_PATTERNS.forEach((pattern) => {
        while ((match = pattern.exec(passage.text)) !== null) {
          const thinker = match[1]!.trim();
          if (!this.isKnownThinker(thinker)) continue;
          this.seedThinkerAliases([thinker]);
          this.attributions.push({
            thinker,
            passage,
            confidence: 0.6,
            attributionType: "paraphrase",
            topic: this.extractTopics(match[2] ?? passage.text),
            position: this.detectPosition(match[2] ?? passage.text)
          });
          matched = true;
        }
      });
      if (!matched) {
        const sectionThinker = KNOWN_THINKERS.find((thinker) => passage.chapterTitle.toLowerCase().includes(thinker.toLowerCase()));
        if (sectionThinker) {
          this.seedThinkerAliases([sectionThinker]);
          this.attributions.push({
            thinker: sectionThinker,
            passage,
            confidence: 0.4,
            attributionType: "section-authorship",
            topic: this.extractTopics(passage.text),
            position: this.detectPosition(passage.text)
          });
        }
      }
    });
  }

  getResponsesToQuestion(question: string, topic: string[]): Record<string, Attribution[]> {
    const questionTokens = tokenize(question);
    const responses: Record<string, Attribution[]> = {};
    const thinkers = [...new Set(this.attributions.map((entry) => entry.thinker))];
    thinkers.forEach((thinker) => {
      const thinkerEntries = this.attributions
        .filter((entry) => entry.thinker.toLowerCase() === thinker.toLowerCase())
        .sort((left, right) => right.confidence - left.confidence);

      const relevant = thinkerEntries
        .filter((entry) => entry.topic.some((token) => topic.includes(token) || questionTokens.includes(token)))
        .sort((left, right) => right.confidence - left.confidence)
        .slice(0, 3);
      if (relevant.length > 0) {
        responses[thinker] = relevant;
        return;
      }
      const fallback = thinkerEntries.slice(0, 2);
      if (fallback.length > 0) {
        responses[thinker] = fallback;
      }
    });
    return responses;
  }

  getStrongestObjection(thinker: string, targetConcept: string): Attribution | null {
    return this.attributions
      .filter((entry) => entry.thinker.toLowerCase() === thinker.toLowerCase())
      .filter((entry) => entry.position === "opposes")
      .filter((entry) => entry.topic.includes(targetConcept))
      .sort((left, right) => right.confidence - left.confidence)[0] ?? null;
  }

  getAttributions(): Attribution[] {
    return this.attributions;
  }

  private isKnownThinker(name: string): boolean {
    const normalized = name.toLowerCase().trim();
    if (this.thinkers.has(normalized) || this.thinkerAliases.has(normalized)) {
      return true;
    }
    const surname = normalized.split(/\s+/).at(-1) ?? normalized;
    return this.thinkers.has(surname) || this.thinkerAliases.has(surname);
  }

  private extractTopics(text: string): string[] {
    const tokens = tokenize(text);
    const conceptTopics = this.corpus.learning.concepts
      .filter((concept) => text.toLowerCase().includes(concept.label.toLowerCase()) || concept.keywords.some((keyword) => tokens.includes(keyword.toLowerCase())))
      .map((concept) => concept.id);
    return [...new Set([...tokens.slice(0, 5), ...conceptTopics])];
  }

  private detectPosition(text: string): Attribution["position"] {
    if (/\b(object|critic|oppose|problem|fails?|weakness|against)\b/i.test(text)) return "opposes";
    if (/\b(defend|supports?|strength|argues for|maintains)\b/i.test(text)) return "supports";
    return "neutral";
  }

  private seedThinkerAliases(names: string[]): void {
    names.forEach((name) => {
      const normalized = name.toLowerCase().trim();
      if (!normalized) {
        return;
      }
      this.thinkerAliases.set(normalized, name);
      const surname = normalized.split(/\s+/).at(-1);
      if (surname) {
        this.thinkerAliases.set(surname, name);
      }
    });
  }
}
