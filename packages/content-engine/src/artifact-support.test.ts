import { describe, expect, it } from "vitest";
import type { ConceptRelation, LearningConcept } from "@learning/schema";
import { buildProtocol } from "./protocol";
import { selectEvidenceFragments, strongestRelatedConcept } from "./artifact-support";
import { buildRelations, type Block } from "./pipeline";

function makeConcept(partial: Partial<LearningConcept>): LearningConcept {
  return {
    id: partial.id ?? "concept-a",
    label: partial.label ?? "Concept A",
    score: partial.score ?? 60,
    summary: partial.summary ?? "Concept A summary.",
    primer: partial.primer ?? "Concept A primer with a different framing.",
    mnemonic: partial.mnemonic ?? "Concept A mnemonic cue.",
    excerpt: partial.excerpt ?? "Concept A excerpt.",
    definition: partial.definition ?? "Concept A definition.",
    stakes: partial.stakes ?? "Concept A stakes.",
    commonConfusion: partial.commonConfusion ?? "Concept A confusion.",
    transferHook: partial.transferHook ?? "Use Concept A in a real scenario.",
    category: partial.category ?? "Theory",
    keywords: partial.keywords ?? ["concept", "theory"],
    sourceItemIds: partial.sourceItemIds ?? ["item-1"],
    relatedConceptIds: partial.relatedConceptIds ?? []
  };
}

function makeBlock(partial: Partial<Block>): Block {
  return {
    sourceItemId: partial.sourceItemId ?? "item-1",
    sourceTitle: partial.sourceTitle ?? "Item 1",
    sourceKind: partial.sourceKind ?? "page",
    cleanTitle: partial.cleanTitle ?? "Item 1",
    headingTopics: partial.headingTopics ?? [],
    lead: partial.lead ?? "Lead sentence.",
    summary: partial.summary ?? "Summary sentence.",
    sentences: partial.sentences ?? ["Lead sentence."],
    score: partial.score ?? 5,
    titleScore: partial.titleScore ?? 2,
    keywords: partial.keywords ?? []
  };
}

describe("artifact support", () => {
  it("chooses the strongest related concept instead of the first relation", () => {
    const concepts = [
      makeConcept({ id: "concept-a", label: "Concept A", sourceItemIds: ["item-1"] }),
      makeConcept({ id: "concept-b", label: "Concept B", sourceItemIds: ["item-2"] }),
      makeConcept({ id: "concept-c", label: "Concept C", sourceItemIds: ["item-3"] })
    ];
    const relations: ConceptRelation[] = [
      { fromId: "concept-a", toId: "concept-b", type: "supports", label: "Loose support", strength: 0.2 },
      { fromId: "concept-a", toId: "concept-c", type: "contrasts", label: "Sharp contrast", strength: 0.95 }
    ];
    const blocks = [
      makeBlock({ sourceItemId: "item-1", lead: "Concept A defines the first lane.", sentences: ["Concept A defines the first lane."] }),
      makeBlock({ sourceItemId: "item-2", lead: "Concept B supports the first lane.", sentences: ["Concept B supports the first lane."] }),
      makeBlock({ sourceItemId: "item-3", lead: "Concept C opposes the first lane.", sentences: ["Concept C opposes the first lane."] })
    ];

    const protocol = buildProtocol(blocks, concepts, relations);

    expect(protocol[0]?.submodes[0]?.conceptIds).toEqual(["concept-a", "concept-c"]);
  });

  it("uses different anchor evidence for different concepts from the same source item when the sentences diverge", () => {
    const concepts = [
      makeConcept({
        id: "positive-reinforcement",
        label: "Positive Reinforcement",
        keywords: ["positive reinforcement", "behavior"],
        sourceItemIds: ["item-1"],
        summary: "Positive reinforcement adds a desired stimulus after a behavior.",
        definition: "Positive reinforcement adds a desired stimulus after a behavior.",
        excerpt: "Positive reinforcement adds a desired stimulus after a behavior."
      }),
      makeConcept({
        id: "negative-reinforcement",
        label: "Negative Reinforcement",
        keywords: ["negative reinforcement", "behavior"],
        sourceItemIds: ["item-1"],
        summary: "Negative reinforcement removes an aversive condition after a behavior.",
        definition: "Negative reinforcement removes an aversive condition after a behavior.",
        excerpt: "Negative reinforcement removes an aversive condition after a behavior."
      })
    ];
    const blocks = [
      makeBlock({
        sourceItemId: "item-1",
        lead: "Reinforcement increases behavior through consequences.",
        summary: "Reinforcement increases behavior through consequences.",
        sentences: [
          "Positive reinforcement increases behavior by adding a desired stimulus after the action.",
          "Negative reinforcement increases behavior by removing an aversive condition after the action.",
          "Students often confuse the two because both increase behavior."
        ],
        keywords: ["positive reinforcement", "negative reinforcement", "behavior"]
      })
    ];

    const positiveEvidence = selectEvidenceFragments(blocks, concepts[0]!);
    const negativeEvidence = selectEvidenceFragments(blocks, concepts[1]!);

    expect(positiveEvidence[0]?.excerpt).toContain("Positive reinforcement");
    expect(negativeEvidence[0]?.excerpt).toContain("Negative reinforcement");
    expect(positiveEvidence[0]?.excerpt).not.toBe(negativeEvidence[0]?.excerpt);
  });

  it("keeps multi-word concept mentions strong enough to form a relation", () => {
    const relations = buildRelations([
      makeConcept({
        id: "conditioning",
        label: "Conditioning",
        definition: "Conditioning relies on negative reinforcement when an aversive condition is removed after a behavior.",
        summary: "Conditioning often explains reinforcement schedules.",
        keywords: ["behavior"],
        sourceItemIds: ["item-a"]
      }),
      makeConcept({
        id: "negative-reinforcement",
        label: "Negative Reinforcement",
        definition: "Negative reinforcement removes an aversive condition after a behavior.",
        summary: "Negative reinforcement increases behavior through removal.",
        keywords: ["behavior"],
        sourceItemIds: ["item-b"]
      })
    ]);

    expect(relations).toEqual([
      expect.objectContaining({
        fromId: "conditioning",
        toId: "negative-reinforcement",
        type: "supports"
      })
    ]);
  });

  it("can require a true contrast relation when selecting a paired concept", () => {
    const concepts = [
      makeConcept({ id: "concept-a", label: "Concept A", sourceItemIds: ["item-1"] }),
      makeConcept({ id: "concept-b", label: "Concept B", sourceItemIds: ["item-2"] }),
      makeConcept({ id: "concept-c", label: "Concept C", sourceItemIds: ["item-3"] })
    ];
    const relations: ConceptRelation[] = [
      { fromId: "concept-a", toId: "concept-b", type: "supports", label: "Strong support", strength: 0.95 },
      { fromId: "concept-a", toId: "concept-c", type: "contrasts", label: "Useful contrast", strength: 0.75 }
    ];

    expect(strongestRelatedConcept(concepts[0]!, concepts, relations)?.id).toBe("concept-b");
    expect(strongestRelatedConcept(concepts[0]!, concepts, relations, {
      preferredTypes: ["contrasts"],
      fallbackToAny: false
    })?.id).toBe("concept-c");
  });
});
