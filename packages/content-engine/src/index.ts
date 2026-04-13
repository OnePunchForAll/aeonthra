import { LearningBundleSchema, type EngineProfile, type CaptureBundle, type LearningBundle } from "@learning/schema";
export { assessSourceQuality, qualityBannerText } from "./source-quality.ts";
export type { SourceQualityReport, SynthesisMode } from "./source-quality.ts";
import { SCHEMA_VERSION } from "@learning/schema";
import { buildBlocks, buildConcepts, buildRelations } from "./pipeline.ts";
import { buildProtocol } from "./protocol.ts";
import { buildNeuralForge } from "./neural-forge.ts";
import { buildSynthesisReport, crystallizeConceptIds } from "./synthesis.ts";

function buildEngineProfiles(topLabel: string): EngineProfile[] {
  return [
    { id: "neural-forge", title: "Neural Forge", thesis: "Turn the topic into something you can generate under pressure.", signature: "Compression, reconstruction, transfer, and recovery by design.", contribution: `Neural Forge turns ${topLabel} into active command instead of passive familiarity.`, moves: ["compress the idea", "teach it cleanly", "recover it fast"] },
    { id: "signal-garden", title: "Signal Garden", thesis: "Keep the learner surrounded by low-friction context while meaning forms.", signature: "Ambient primers, cue lines, memory warmth, and gentle repetition.", contribution: `Signal Garden keeps ${topLabel} present even before the learner feels fully ready.`, moves: ["lower blank-page friction", "keep ideas warm", "prime hard moments"] },
    { id: "thread-atlas", title: "Thread Atlas", thesis: "Show how ideas travel across evidence, tasks, and later use.", signature: "Relationships, transfer paths, structure cues, and concept-to-task links.", contribution: `Thread Atlas ties ${topLabel} back to source evidence and forward to real course work.`, moves: ["trace evidence", "map relations", "aim toward assignments"] },
    { id: "mirror-harbor", title: "Mirror Harbor", thesis: "Make confusion visible early so it can be repaired without shame.", signature: "Confidence checks, weak-reading detection, reflection, and recovery notes.", contribution: `Mirror Harbor shows whether ${topLabel} is truly held or only loosely recognized.`, moves: ["surface blindspots", "repair weak readings", "leave a recovery path"] }
  ];
}

export type LearningBuildStage =
  | "normalizing-sources"
  | "segmenting-evidence"
  | "extracting-candidates"
  | "ranking-instructor-focus"
  | "fusing-sources"
  | "crystallizing-knowledge"
  | "generating-learning-artifacts"
  | "finalizing-bundle";

export function buildLearningBundleWithProgress(
  bundle: CaptureBundle,
  onProgress?: (stage: LearningBuildStage, progress: number) => void
): LearningBundle {
  onProgress?.("normalizing-sources", 4);
  const blocks = buildBlocks(bundle);
  onProgress?.("segmenting-evidence", 16);
  const candidateConcepts = buildConcepts(bundle, blocks);
  onProgress?.("extracting-candidates", 34);
  const candidateRelations = buildRelations(candidateConcepts);
  onProgress?.("ranking-instructor-focus", 50);
  const stableConceptIds = crystallizeConceptIds(bundle, candidateConcepts, candidateRelations);
  onProgress?.("fusing-sources", 64);
  const concepts = candidateConcepts.filter((concept) => stableConceptIds.includes(concept.id));
  const relations = buildRelations(concepts);
  onProgress?.("crystallizing-knowledge", 78);
  const synthesis = buildSynthesisReport(bundle, blocks, concepts, relations, stableConceptIds);
  onProgress?.("generating-learning-artifacts", 88);
  const protocol = buildProtocol(blocks, concepts, relations);
  const neuralForge = buildNeuralForge(blocks, concepts, relations);
  onProgress?.("finalizing-bundle", 96);
  const topLabel = concepts[0]?.label ?? "the source thread";
  const learningBundle = LearningBundleSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    generatedAt: bundle.capturedAt,
    sourceBundleTitle: bundle.title,
    concepts,
    relations,
    engineProfiles: buildEngineProfiles(topLabel),
    protocol: {
      totalMinutes: protocol.reduce((sum, phase) => sum + phase.totalMinutes, 0),
      phases: protocol
    },
    neuralForge,
    synthesis
  });
  onProgress?.("finalizing-bundle", 100);
  return learningBundle;
}

export function buildLearningBundle(bundle: CaptureBundle): LearningBundle {
  return buildLearningBundleWithProgress(bundle);
}

export function summarizeBundle(bundle: CaptureBundle): {
  title: string;
  itemCount: number;
  resourceCount: number;
  topConcepts: string[];
  totalMinutes: number;
} {
  const learningBundle = buildLearningBundle(bundle);
  return {
    title: bundle.title,
    itemCount: bundle.items.length,
    resourceCount: bundle.resources.length,
    topConcepts: learningBundle.concepts.slice(0, 4).map((concept) => concept.label),
    totalMinutes: learningBundle.protocol.totalMinutes
  };
}

export function createDemoSourceText(): string {
  return [
    "Ethics asks how one should live, what counts as a good life, and how reasons should guide action.",
    "Moral reasoning often weighs duties, consequences, and character at the same time, even when one framework seems dominant.",
    "When students read philosophy quickly, they need a way to connect definitions, objections, examples, and live tensions without losing the thread of the argument.",
    "A useful study system highlights core concepts, turns them into teach-back prompts, traces how each concept supports assignments, and exposes the elegant mistakes that sound right at first.",
    "Learning becomes more durable when discovery, retrieval, conflict, redesign, and reflection happen together instead of in separate disconnected tools.",
    "A premium learning protocol should help the student feel the idea before naming it, rebuild it from multiple angles, interrupt wrong versions, perform structural surgery, and prepare future recovery."
  ].join(" ");
}
