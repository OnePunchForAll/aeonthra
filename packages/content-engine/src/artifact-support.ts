import type { ConceptRelation, EvidenceFragment, LearningConcept } from "@learning/schema";
import type { Block } from "./pipeline.ts";
import { meaningfulWords, normalizePhrase, truncateReadable } from "./pipeline.ts";

function relationPriority(type: ConceptRelation["type"]): number {
  switch (type) {
    case "contrasts":
      return 4;
    case "applies":
      return 3;
    case "supports":
      return 2;
    case "extends":
      return 1;
    default:
      return 0;
  }
}

type RelatedConceptOptions = {
  preferredTypes?: ConceptRelation["type"][];
  fallbackToAny?: boolean;
};

function conceptTokens(concept: LearningConcept): string[] {
  return Array.from(new Set([
    ...meaningfulWords(concept.label),
    ...concept.keywords.flatMap((keyword) => meaningfulWords(keyword))
  ]));
}

function excerptForBlock(block: Block, concept: LearningConcept): string {
  const labelPhrase = normalizePhrase(concept.label);
  const tokens = conceptTokens(concept);
  const rankedSentence = block.sentences
    .map((sentence) => {
      const normalizedSentence = normalizePhrase(sentence);
      const tokenHits = tokens.filter((token) => normalizedSentence.includes(token)).length;
      const labelHit = labelPhrase && normalizedSentence.includes(labelPhrase) ? 4 : 0;
      return {
        sentence,
        score: labelHit + tokenHits
      };
    })
    .sort((left, right) => right.score - left.score || right.sentence.length - left.sentence.length)[0];

  return truncateReadable(
    rankedSentence?.score ? rankedSentence.sentence : block.lead || block.summary || concept.excerpt || concept.summary,
    180
  );
}

function blockScore(block: Block, concept: LearningConcept): number {
  const labelPhrase = normalizePhrase(concept.label);
  const tokens = conceptTokens(concept);
  const lead = normalizePhrase(block.lead);
  const summary = normalizePhrase(block.summary);
  const keywordHits = block.keywords.filter((keyword) => tokens.includes(normalizePhrase(keyword))).length;
  const sentenceHits = block.sentences.reduce((best, sentence) => {
    const normalizedSentence = normalizePhrase(sentence);
    const tokenHits = tokens.filter((token) => normalizedSentence.includes(token)).length;
    const labelHit = labelPhrase && normalizedSentence.includes(labelPhrase) ? 6 : 0;
    return Math.max(best, labelHit + tokenHits);
  }, 0);

  return sentenceHits
    + keywordHits * 2
    + (labelPhrase && lead.includes(labelPhrase) ? 4 : 0)
    + (labelPhrase && summary.includes(labelPhrase) ? 2 : 0)
    + block.score;
}

export function strongestRelatedConcept(
  concept: LearningConcept,
  concepts: LearningConcept[],
  relations: ConceptRelation[],
  options: RelatedConceptOptions = {}
): LearningConcept | null {
  const relatedRelations = relations
    .filter((relation) => relation.fromId === concept.id || relation.toId === concept.id);
  const preferredRelations = options.preferredTypes?.length
    ? relatedRelations.filter((relation) => options.preferredTypes!.includes(relation.type))
    : relatedRelations;
  const rankedRelations = (preferredRelations.length > 0 || options.fallbackToAny === false
    ? preferredRelations
    : relatedRelations)
    .sort((left, right) =>
      right.strength - left.strength
      || relationPriority(right.type) - relationPriority(left.type)
      || left.label.localeCompare(right.label)
    );
  const relatedConcept = rankedRelations
    .map((relation) => relation.fromId === concept.id ? relation.toId : relation.fromId)
    .map((conceptId) => concepts.find((candidate) => candidate.id === conceptId))
    .find((candidate): candidate is LearningConcept => Boolean(candidate));

  return relatedConcept ?? concepts.find((candidate) => candidate.id !== concept.id) ?? null;
}

export function selectEvidenceFragments(
  blocks: Block[],
  concept: LearningConcept,
  firstLabel = "Anchor fragment",
  supportLabel = "Support fragment",
  limit = 2
): EvidenceFragment[] {
  const candidateBlocks = (blocks.length ? blocks : []).slice().sort((left, right) =>
    blockScore(right, concept) - blockScore(left, concept)
    || right.score - left.score
  );
  const fragments: EvidenceFragment[] = [];
  const seenExcerptKeys = new Set<string>();

  for (const block of candidateBlocks) {
    const excerpt = excerptForBlock(block, concept);
    const excerptKey = normalizePhrase(excerpt);
    if (!excerptKey || seenExcerptKeys.has(excerptKey)) {
      continue;
    }
    seenExcerptKeys.add(excerptKey);
    fragments.push({
      label: fragments.length === 0 ? firstLabel : supportLabel,
      excerpt,
      sourceItemId: block.sourceItemId
    });
    if (fragments.length >= limit) {
      return fragments;
    }
  }

  const fallbackSourceItemId = concept.sourceItemIds[0];
  if (!fallbackSourceItemId) {
    return [];
  }

  return [{
    label: firstLabel,
    excerpt: truncateReadable(concept.excerpt || concept.summary, 180),
    sourceItemId: fallbackSourceItemId
  }];
}
