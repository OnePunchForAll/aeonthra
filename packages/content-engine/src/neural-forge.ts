import type { ConceptRelation, LearningBundle, LearningConcept } from "@learning/schema";
import type { Block } from "./pipeline.ts";
import { truncateReadable } from "./pipeline.ts";
import { strongestRelatedConcept, selectEvidenceFragments } from "./artifact-support.ts";

const phases = [
  { id: "immerse", title: "Immerse", tagline: "Feel the shape of the material before you sort it.", purpose: "Use human-readable primers and stakes so the material stops feeling alien." },
  { id: "decode", title: "Decode", tagline: "Lock the concepts into plain language.", purpose: "Turn the strongest topics into compact explanations, memory hooks, and anchor lines." },
  { id: "contrast", title: "Contrast", tagline: "Separate neighbors that blur together.", purpose: "Use relation pairs so the wrong version loses its grip." },
  { id: "transfer", title: "Transfer", tagline: "Aim the idea at real course work.", purpose: "Connect concepts to assignments, discussions, and likely response moves." },
  { id: "recover", title: "Recover", tagline: "Leave with cues future-you can actually use.", purpose: "Turn the session into review cues, confidence notes, and a next-pass study map." }
] as const;

const conceptWindow = (
  concepts: LearningConcept[],
  startIndex: number,
  size: number
): LearningConcept[] => {
  if (!concepts.length) {
    return [];
  }

  return Array.from({ length: Math.min(size, Math.max(1, concepts.length)) }, (_, index) => {
    return concepts[(startIndex + index) % concepts.length]!;
  });
};

export function buildNeuralForge(
  blocks: Block[],
  concepts: LearningConcept[],
  relations: ConceptRelation[]
): LearningBundle["neuralForge"] {
  const ambientPrimers = Array.from(
    new Set(
      concepts
        .flatMap((concept) => [concept.primer, concept.definition, concept.summary])
        .map((entry) => truncateReadable(entry, 120))
        .filter((entry) => entry.length >= 20)
        .filter((entry) => !/core working ideas?/i.test(entry))
    )
  ).slice(0, 8);

  const phaseData = phases.map((phase, phaseIndex) => ({
    id: phase.id,
    title: phase.title,
    tagline: phase.tagline,
    purpose: phase.purpose,
    durationMinutes: 12,
    ambientLines: ambientPrimers.slice(phaseIndex, phaseIndex + 3).length ? ambientPrimers.slice(phaseIndex, phaseIndex + 3) : ambientPrimers.slice(0, 2),
    cards: (
      phase.id === "contrast"
        ? conceptWindow(concepts, 0, 4).map((concept) => {
            const secondary = strongestRelatedConcept(concept, concepts, relations, {
              preferredTypes: ["contrasts"],
              fallbackToAny: false
            });
            const conceptBlocks = blocks.filter((block) => concept.sourceItemIds.includes(block.sourceItemId));
            return {
              id: `${phase.id}-${concept.id}`,
              title: secondary ? `${concept.label} vs ${secondary.label}` : concept.label,
              focus: concept.label,
              summary: secondary ? `${concept.label} and ${secondary.label} look adjacent, but they solve different parts of the learning problem.` : `${concept.label} needs a strong boundary so it does not flatten into generic recall.`,
              prompt: secondary ? `What would make you accidentally swap ${concept.label} and ${secondary.label}, and how would you stop that?` : `What weak shortcut would flatten ${concept.label}, and what wording repairs it?`,
              supportLine: concept.commonConfusion,
              actions: ["Name the tempting mix-up.", "Write the clean separation line.", "Keep one source phrase that proves the difference."],
              conceptIds: secondary ? [concept.id, secondary.id] : [concept.id],
              evidence: selectEvidenceFragments(conceptBlocks.length ? conceptBlocks : blocks, concept, "Contrast anchor", "Support line")
            };
          })
        : conceptWindow(concepts, phaseIndex, 4).map((concept) => ({
            id: `${phase.id}-${concept.id}`,
            title: concept.label,
            focus: concept.label,
            summary: phase.id === "immerse" ? `${concept.label} is introduced as a live source signal, not a cold test term.` : phase.id === "decode" ? `${concept.label} gets compressed into plain language, evidence, and a memory hook.` : phase.id === "transfer" ? `${concept.label} is pushed toward course use, not left as isolated study language.` : `${concept.label} leaves the session with a review path and a confidence cue.`,
            prompt: phase.id === "immerse" ? `What is the source trying to help the learner notice about ${concept.label}?` : phase.id === "decode" ? `How would you explain ${concept.label} without sounding like the source copied itself into your mouth?` : phase.id === "transfer" ? `Where would ${concept.label} show up in an assignment, discussion, or explanation task from this bundle?` : `What exact note would help you recover ${concept.label} fast if you forgot it next week?`,
            supportLine: phase.id === "recover" ? concept.transferHook : concept.primer,
            actions: [phase.id === "immerse" ? "Read the support line, then say what the topic feels like before you define it." : phase.id === "decode" ? "Translate the concept into one sentence you would trust under pressure." : phase.id === "transfer" ? `Aim ${concept.label} at one real source item from the bundle.` : "Write the recovery cue you want future-you to see first.", "Keep the strongest evidence line in view.", "Write one sentence that future-you would still understand."],
            conceptIds: [concept.id],
            evidence: selectEvidenceFragments(
              blocks.filter((block) => concept.sourceItemIds.includes(block.sourceItemId)).length
                ? blocks.filter((block) => concept.sourceItemIds.includes(block.sourceItemId))
                : blocks,
              concept,
              "Anchor line",
              "Support line"
            )
          }))
    ).slice(0, 4)
  }));

  return {
    totalMinutes: phaseData.reduce((sum, phase) => sum + phase.durationMinutes, 0),
    atmosphere: "Neural Forge is the deterministic deep-study run: compact, source-grounded, and designed to teach while it tests.",
    ambientPrimers: ambientPrimers.length ? ambientPrimers : concepts.slice(0, 2).map((concept) => truncateReadable(concept.definition, 120)),
    phases: phaseData
  };
}
