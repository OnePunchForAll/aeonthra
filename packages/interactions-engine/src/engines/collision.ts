import type { InteractionCorpus, CollisionReport, Tension, Synthesis } from "../types";
import { PassageRetrievalEngine } from "./passage-retrieval";
import { ProximityEngine } from "./proximity";
import { sentenceSplit } from "../utils";

export class CollisionEngine {
  constructor(
    private readonly corpus: InteractionCorpus,
    private readonly retrieval: PassageRetrievalEngine,
    private readonly proximity: ProximityEngine
  ) {}

  collide(conceptAId: string, conceptBId: string): CollisionReport | null {
    const conceptA = this.corpus.learning.concepts.find((concept) => concept.id === conceptAId);
    const conceptB = this.corpus.learning.concepts.find((concept) => concept.id === conceptBId);
    if (!conceptA || !conceptB) return null;
    return {
      conceptA,
      conceptB,
      sharedGround: this.findSharedGround(conceptA, conceptB),
      tensions: this.findTensions(conceptA, conceptB),
      synthesis: this.findSynthesis(conceptAId, conceptBId),
      historicalCollisions: this.rankHistoricalCollisions(conceptAId, conceptBId, conceptA.label, conceptB.label)
        .map((entry) => {
          const sentences = sentenceSplit(entry.passage.text).slice(0, 3);
          const passage = sentences.join(" ").trim();
          if (!passage || !/[.!?]$/.test(passage)) {
            return null;
          }
          return {
            passage,
            source: `${entry.passage.chapterTitle} p. ${entry.passage.pageNumber}`
          };
        })
        .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
    };
  }

  private findSharedGround(
    conceptA: InteractionCorpus["learning"]["concepts"][number],
    conceptB: InteractionCorpus["learning"]["concepts"][number]
  ): string[] {
    const sharedKeywords = conceptA.keywords.filter((keyword) => conceptB.keywords.includes(keyword));
    const lines: string[] = [];
    if (sharedKeywords.length > 0) {
      lines.push(`Both ${conceptA.label} and ${conceptB.label} address questions of ${sharedKeywords.slice(0, 3).join(", ")}.`);
    }
    if (conceptA.category && conceptB.category && conceptA.category === conceptB.category) {
      lines.push(`Both belong to the ${conceptA.category.toLowerCase()} tradition in this course.`);
    }
    const similarity = this.proximity.conceptRelatedness(conceptA, conceptB);
    if (similarity >= 0.45) {
      lines.push(`Their definitions point toward overlapping moral territory even though they resolve it differently.`);
    }
    if (conceptA.sourceItemIds.some((itemId) => conceptB.sourceItemIds.includes(itemId))) {
      lines.push(`The source teaches them in at least one shared reading corridor, which is why they collide so often in assignments.`);
    }
    return lines.length > 0 ? lines : [`${conceptA.label} and ${conceptB.label} become comparable because the course places them in the same ethical field.`];
  }

  private findTensions(
    conceptA: InteractionCorpus["learning"]["concepts"][number],
    conceptB: InteractionCorpus["learning"]["concepts"][number]
  ): Tension[] {
    const tensions: Tension[] = [];
    this.corpus.learning.relations.forEach((relation) => {
      if ((relation.fromId === conceptA.id && relation.toId === conceptB.id) || (relation.fromId === conceptB.id && relation.toId === conceptA.id)) {
        tensions.push({
          dimension: relation.type === "contrasts" ? "Direct contrast" : "Interpretive tension",
          aPosition: conceptA.summary,
          bPosition: conceptB.summary,
          evidence: relation.label
        });
      }
    });
    if (tensions.length === 0) {
      tensions.push({
        dimension: "Definition pressure",
        aPosition: conceptA.summary || conceptA.definition,
        bPosition: conceptB.summary || conceptB.definition,
        evidence: `${conceptA.label} and ${conceptB.label} pull in different directions when the same case asks what should matter most.`
      });
    }
    return tensions.slice(0, 4);
  }

  private findSynthesis(conceptAId: string, conceptBId: string): Synthesis | null {
    const concept = this.corpus.learning.concepts.find((candidate) => candidate.id !== conceptAId && candidate.id !== conceptBId && candidate.relatedConceptIds.includes(conceptAId) && candidate.relatedConceptIds.includes(conceptBId))
      ?? this.corpus.learning.concepts
        .filter((candidate) => candidate.id !== conceptAId && candidate.id !== conceptBId)
        .map((candidate) => ({
          candidate,
          score: Number(candidate.relatedConceptIds.includes(conceptAId)) + Number(candidate.relatedConceptIds.includes(conceptBId))
        }))
        .filter((entry) => entry.score > 0)
        .sort((left, right) => right.score - left.score)[0]?.candidate;
    if (!concept) return null;
    return {
      conceptId: concept.id,
      explanation: `${concept.label} bridges the collision because ${concept.summary}`
    };
  }

  private rankHistoricalCollisions(conceptAId: string, conceptBId: string, conceptALabel: string, conceptBLabel: string) {
    const directConceptPassages = [
      ...this.retrieval.searchByConcept(conceptAId),
      ...this.retrieval.searchByConcept(conceptBId)
    ];
    const searchedPassages = this.retrieval.search(`${conceptALabel} ${conceptBLabel}`, { limit: 8 });
    const unique = new Map<number, (typeof searchedPassages)[number]>();
    [...directConceptPassages, ...searchedPassages].forEach((entry) => {
      if (!unique.has(entry.passage.id)) {
        unique.set(entry.passage.id, entry);
      }
    });

    const scored = [...unique.values()]
      .map((entry) => {
        const lowerTitle = entry.passage.chapterTitle.toLowerCase();
        const utilityPenalty = /quiz|discussion|assignment|paper/.test(lowerTitle) ? -5 : 0;
        const coMentionBonus = Number(entry.passage.text.toLowerCase().includes(conceptALabel.toLowerCase()))
          + Number(entry.passage.text.toLowerCase().includes(conceptBLabel.toLowerCase()));
        const conceptBonus = (Number(entry.passage.concepts.includes(conceptAId))
          + Number(entry.passage.concepts.includes(conceptBId))) * 5;
        return {
          ...entry,
          rank: entry.score + utilityPenalty + coMentionBonus + conceptBonus
        };
      })
      .sort((left, right) => right.rank - left.rank);
    return scored.slice(0, 3);
  }
}
