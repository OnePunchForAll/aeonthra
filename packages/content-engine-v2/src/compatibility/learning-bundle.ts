import {
  LearningBundleSchema,
  SCHEMA_VERSION,
  type CaptureBundle,
  type EngineId,
  type EngineProfile,
  type EvidenceFragment,
  type LearningBundle,
  type LearningConcept,
  type MegaPhase,
  type NeuralForgePhase
} from "@learning/schema";
import type { EngineV2Result } from "../contracts/types.ts";
import { analyzeBundleWithProgress } from "../outputs/result.ts";
import { assessSourceQuality, type SourceQualityReport } from "../source-quality.ts";
import { projectToLegacy } from "./legacy-projection.ts";

export type LearningBuildStage =
  | "normalizing-sources"
  | "segmenting-evidence"
  | "extracting-candidates"
  | "ranking-instructor-focus"
  | "fusing-sources"
  | "crystallizing-knowledge"
  | "generating-learning-artifacts"
  | "finalizing-bundle";

const PROTOCOL_PHASES: Array<{
  id: MegaPhase["id"];
  title: string;
  tagline: string;
  summary: string;
  winCondition: string;
}> = [
  {
    id: "genesis",
    title: "Genesis",
    tagline: "Meet the source before the label hardens.",
    summary: "Anchor the first grounded claims before anything drifts into summary theater.",
    winCondition: "You can name the central idea with one source-backed sentence."
  },
  {
    id: "forge",
    title: "Forge",
    tagline: "Turn grounded concepts into usable language.",
    summary: "Compress the concept, hold onto the evidence, and keep the explanation clean.",
    winCondition: "You can explain the concept without outrunning the source."
  },
  {
    id: "crucible",
    title: "Crucible",
    tagline: "Break elegant wrong versions early.",
    summary: "Use contrasts and traps to stop near-miss readings from sounding correct.",
    winCondition: "You can separate the right reading from a tempting wrong one."
  },
  {
    id: "architect",
    title: "Architect",
    tagline: "Aim the concept at real course pressure.",
    summary: "Bring the concept into assignment-shaped use without losing the original evidence lane.",
    winCondition: "You can connect the concept to a real task or question."
  },
  {
    id: "transcend",
    title: "Transcend",
    tagline: "Leave with a recovery path you trust.",
    summary: "End with short review moves that preserve the grounded version for later retrieval.",
    winCondition: "You know what to reread first when the concept goes cold."
  }
];

const FORGE_PHASES: Array<{
  id: NeuralForgePhase["id"];
  title: string;
  tagline: string;
  purpose: string;
}> = [
  {
    id: "immerse",
    title: "Immerse",
    tagline: "Feel the pressure before the vocabulary arrives.",
    purpose: "Start with source-backed tension instead of a loose slogan."
  },
  {
    id: "decode",
    title: "Decode",
    tagline: "Turn the concept into compact language.",
    purpose: "Lock the concept into plain English and one grounded cue."
  },
  {
    id: "contrast",
    title: "Contrast",
    tagline: "Separate nearby concepts before they blur together.",
    purpose: "Use relations and traps to mark the boundary that matters."
  },
  {
    id: "transfer",
    title: "Transfer",
    tagline: "Aim the concept at real work.",
    purpose: "Link the concept to assignments, prompts, or next-use scenarios."
  },
  {
    id: "recover",
    title: "Recover",
    tagline: "Leave with something future-you can actually use.",
    purpose: "Preserve a short recovery cue instead of fake mastery."
  }
];

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

function engineIds(...ids: EngineId[]): EngineId[] {
  return ids;
}

function stableConcepts(concepts: LearningConcept[]): LearningConcept[] {
  return concepts.filter((concept) => (concept.fieldSupport?.definition?.evidence.length ?? 0) > 0);
}

function phaseWindow(concepts: LearningConcept[], start: number): LearningConcept[] {
  if (concepts.length === 0) {
    return [];
  }
  return Array.from({ length: 4 }, (_, index) => concepts[(start + index) % concepts.length]!).filter(Boolean);
}

function conceptEvidence(concept: LearningConcept): EvidenceFragment[] {
  return concept.fieldSupport?.definition?.evidence.slice(0, 1)
    ?? concept.fieldSupport?.summary?.evidence.slice(0, 1)
    ?? [];
}

function conceptSummary(concept: LearningConcept): string {
  return concept.summary || concept.definition || concept.excerpt || concept.label;
}

function conceptPrimer(concept: LearningConcept): string {
  return concept.primer || concept.summary || concept.definition;
}

function buildEngineProfiles(topLabel: string, blocked: boolean): EngineProfile[] {
  const label = blocked ? "the captured source" : topLabel;
  return [
    {
      id: "neural-forge",
      title: "Neural Forge",
      thesis: "Turn the topic into something you can generate under pressure.",
      signature: "Compression, reconstruction, transfer, and recovery by design.",
      contribution: blocked
        ? "Neural Forge stays blank when the source is too weak to support a grounded run."
        : `Neural Forge turns ${label} into active command instead of passive familiarity.`,
      moves: ["compress the idea", "teach it cleanly", "recover it fast"]
    },
    {
      id: "signal-garden",
      title: "Signal Garden",
      thesis: "Keep the learner surrounded by low-friction context while meaning forms.",
      signature: "Ambient primers, cue lines, memory warmth, and gentle repetition.",
      contribution: blocked
        ? "Signal Garden waits for cleaner evidence before it tries to keep concepts warm."
        : `Signal Garden keeps ${label} present even before the learner feels fully ready.`,
      moves: ["lower blank-page friction", "keep ideas warm", "prime hard moments"]
    },
    {
      id: "thread-atlas",
      title: "Thread Atlas",
      thesis: "Show how ideas travel across evidence, tasks, and later use.",
      signature: "Relationships, transfer paths, structure cues, and concept-to-task links.",
      contribution: blocked
        ? "Thread Atlas refuses to invent a map when the evidence graph is still thin."
        : `Thread Atlas ties ${label} back to source evidence and forward to real course work.`,
      moves: ["trace evidence", "map relations", "aim toward assignments"]
    },
    {
      id: "mirror-harbor",
      title: "Mirror Harbor",
      thesis: "Make confusion visible early so it can be repaired without shame.",
      signature: "Confidence checks, weak-reading detection, reflection, and recovery notes.",
      contribution: blocked
        ? "Mirror Harbor stays honest about missing evidence instead of performing certainty."
        : `Mirror Harbor shows whether ${label} is truly held or only loosely recognized.`,
      moves: ["surface blindspots", "repair weak readings", "leave a recovery path"]
    }
  ];
}

function buildBlockedProtocol(): { totalMinutes: number; phases: MegaPhase[] } {
  return {
    totalMinutes: 0,
    phases: PROTOCOL_PHASES.map((phase, phaseIndex) => ({
      id: phase.id,
      title: phase.title,
      tagline: phase.tagline,
      summary: "Insufficient grounded concept evidence is available for a trustworthy protocol in this phase.",
      totalMinutes: 0,
      winCondition: "Import stronger evidence before relying on this phase.",
      conceptIds: [],
      submodes: Array.from({ length: 4 }, (_, modeIndex) => ({
        id: `${phase.id}-${modeIndex + 1}`,
        title: `Hold ${phase.title} ${modeIndex + 1}`,
        engineIds: phaseIndex % 2 === 0 ? engineIds("thread-atlas") : engineIds("mirror-harbor"),
        durationMinutes: 0,
        challengeLevel: ["orient", "build", "stress", "design", "transcend"][phaseIndex] as "orient",
        objective: "Wait for grounded evidence before synthesizing a study move here.",
        setup: "No supported concept survived strongly enough for this phase.",
        prompt: "Capture a stronger source before generating a study prompt.",
        tasks: [
          "Review the quality warnings before trusting this lane.",
          "Bring in a cleaner or richer source bundle."
        ],
        reflection: "What evidence is still missing for a trustworthy phase?",
        conceptIds: [],
        evidence: []
      }))
    }))
  };
}

function buildProtocol(concepts: LearningConcept[]): { totalMinutes: number; phases: MegaPhase[] } {
  if (concepts.length === 0) {
    return buildBlockedProtocol();
  }
  const phases = PROTOCOL_PHASES.map((phase, phaseIndex) => {
    const window = phaseWindow(concepts, phaseIndex * 2);
    return {
      id: phase.id,
      title: phase.title,
      tagline: phase.tagline,
      summary: phase.summary,
      totalMinutes: 20,
      winCondition: phase.winCondition,
      conceptIds: window.map((concept) => concept.id),
      submodes: window.map((concept, modeIndex) => ({
        id: `${phase.id}-${modeIndex + 1}`,
        title: `${phase.title} ${modeIndex + 1}`,
        engineIds: modeIndex % 2 === 0
          ? engineIds("signal-garden", "thread-atlas")
          : engineIds("neural-forge", "mirror-harbor"),
        durationMinutes: 5,
        challengeLevel: ["orient", "build", "stress", "design", "transcend"][phaseIndex] as "orient",
        objective: `Keep ${concept.label} tied to the supported reading.`,
        setup: concept.commonConfusion || concept.definition,
        prompt: phase.id === "crucible"
          ? `What tempting wrong version of ${concept.label} would drift away from the captured evidence?`
          : phase.id === "architect"
            ? `How would you use ${concept.label} inside a real assignment or prompt from this source?`
            : `Explain ${concept.label} with one clean, source-backed sentence.`,
        tasks: [
          `Name the clearest supported claim behind ${concept.label}.`,
          "Keep one exact evidence fragment in view."
        ],
        reflection: phase.id === "transcend"
          ? `What would future-you reread first to recover ${concept.label}?`
          : `What part of ${concept.label} still feels least stable?`,
        conceptIds: [concept.id],
        evidence: conceptEvidence(concept)
      }))
    };
  });
  return {
    totalMinutes: phases.reduce((sum, phase) => sum + phase.totalMinutes, 0),
    phases
  };
}

function buildBlockedNeuralForge(): { totalMinutes: number; atmosphere: string; ambientPrimers: string[]; phases: NeuralForgePhase[] } {
  return {
    totalMinutes: 0,
    atmosphere: "Neural Forge is intentionally blank because the current source does not support a grounded run yet.",
    ambientPrimers: [],
    phases: FORGE_PHASES.map((phase) => ({
      id: phase.id,
      title: phase.title,
      tagline: phase.tagline,
      purpose: "No trustworthy concept lane survived strongly enough for this phase.",
      durationMinutes: 0,
      ambientLines: [],
      cards: []
    }))
  };
}

function buildNeuralForge(concepts: LearningConcept[]): { totalMinutes: number; atmosphere: string; ambientPrimers: string[]; phases: NeuralForgePhase[] } {
  if (concepts.length === 0) {
    return buildBlockedNeuralForge();
  }
  return {
    totalMinutes: 60,
    atmosphere: "Neural Forge keeps every visible move tied to explicit evidence and blanks weak lanes instead of polishing them.",
    ambientPrimers: unique(concepts.map((concept) => conceptPrimer(concept)).filter((entry) => entry.length >= 20)).slice(0, 8),
    phases: FORGE_PHASES.map((phase, phaseIndex) => {
      const window = phaseWindow(concepts, phaseIndex * 2);
      return {
        id: phase.id,
        title: phase.title,
        tagline: phase.tagline,
        purpose: phase.purpose,
        durationMinutes: 12,
        ambientLines: unique(window.map((concept) => conceptPrimer(concept)).filter((entry) => entry.length >= 20)).slice(0, 2),
        cards: window.map((concept) => ({
          id: `${phase.id}-${concept.id}`,
          title: concept.label,
          focus: concept.label,
          summary: phase.id === "contrast"
            ? concept.commonConfusion || conceptSummary(concept)
            : conceptSummary(concept),
          prompt: phase.id === "contrast"
            ? `What keeps ${concept.label} from collapsing into a nearby but wrong reading?`
            : phase.id === "transfer"
              ? `How would you apply ${concept.label} in a real assignment or discussion prompt?`
              : `Give the shortest trustworthy explanation of ${concept.label}.`,
          supportLine: concept.transferHook || concept.commonConfusion || concept.definition,
          actions: [
            `Name the cleanest move inside ${concept.label}.`,
            "Keep one evidence fragment visible.",
            "Stop when the explanation outruns the source."
          ],
          conceptIds: [concept.id],
          evidence: conceptEvidence(concept)
        }))
      };
    })
  };
}

export function buildLearningBundleFromAnalysis(
  bundle: CaptureBundle,
  result: EngineV2Result,
  qualityReport?: SourceQualityReport
): LearningBundle {
  const quality = qualityReport ?? assessSourceQuality(bundle);
  const projection = projectToLegacy(result, { qualityReport: quality });
  const groundedConcepts = stableConcepts(projection.concepts);
  const topLabel = groundedConcepts[0]?.label ?? projection.concepts[0]?.label ?? "the source thread";

  return LearningBundleSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    generatedAt: result.generatedAt,
    sourceBundleTitle: bundle.title,
    concepts: projection.concepts,
    relations: projection.relations,
    engineProfiles: buildEngineProfiles(topLabel, groundedConcepts.length === 0),
    protocol: buildProtocol(groundedConcepts),
    neuralForge: buildNeuralForge(groundedConcepts),
    synthesis: projection.synthesis
  });
}

export function buildLearningBundleWithProgress(
  bundle: CaptureBundle,
  onProgress?: (stage: LearningBuildStage, progress: number) => void
): LearningBundle {
  const qualityReport = assessSourceQuality(bundle);
  onProgress?.("normalizing-sources", 4);
  const result = analyzeBundleWithProgress(bundle, (stage, progress) => {
    if (stage === "classify") {
      onProgress?.("segmenting-evidence", Math.max(8, progress));
      return;
    }
    if (stage === "structure" || stage === "evidence") {
      onProgress?.("extracting-candidates", Math.max(24, progress));
      return;
    }
    if (stage === "concepts") {
      onProgress?.("ranking-instructor-focus", Math.max(48, progress));
      return;
    }
    if (stage === "relations" || stage === "assignments") {
      onProgress?.("fusing-sources", Math.max(68, progress));
    }
  });
  onProgress?.("crystallizing-knowledge", 88);
  const learningBundle = buildLearningBundleFromAnalysis(bundle, result, qualityReport);
  onProgress?.("generating-learning-artifacts", 96);
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
