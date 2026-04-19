import type { CaptureBundle, LearningBundle } from "@learning/schema";

export type InteractionTask = {
  id: string;
  title: string;
  summary: string;
  kind: "assignment" | "discussion" | "quiz" | "page";
  moduleKey?: string;
  dueDate?: number | null;
  conceptIds: string[];
  requirementLines: string[];
};

export type InteractionCorpus = {
  bundle: CaptureBundle;
  learning: LearningBundle;
  tasks: InteractionTask[];
};

export type IndexedPassage = {
  id: number;
  text: string;
  sourceItemId: string;
  sectionId: string;
  chapterTitle: string;
  pageNumber: number;
  wordCount: number;
  keywords: string[];
  concepts: string[];
  attributions: string[];
  position: number;
  title: string;
};

export type PassageResult = {
  passage: IndexedPassage;
  score: number;
};

export type SearchOptions = {
  limit?: number;
  concepts?: string[];
  sectionHint?: string;
  recentlyShown?: number[];
  filter?: (passage: IndexedPassage) => boolean;
};

export type AttributionType = "direct-quote" | "narrative" | "paraphrase" | "section-authorship";
export type AttributionPosition = "supports" | "opposes" | "neutral";

export type Attribution = {
  thinker: string;
  passage: IndexedPassage;
  confidence: number;
  attributionType: AttributionType;
  topic: string[];
  position: AttributionPosition;
};

export type SynthesizedSource = {
  passage: string;
  page: number;
  confidence: number;
};

export type SynthesizedResponse = {
  text: string;
  sources: SynthesizedSource[];
  confidence: number;
};

export type PanelResponse = {
  question: string;
  responses: Record<string, SynthesizedResponse>;
};

export type Position = {
  speaker: string;
  content: string;
  type: "claim" | "objection" | "defense" | "synthesis";
  topic: string[];
  source: string;
};

export type DuelRound = {
  round: number;
  type: "opening" | "objection" | "synthesis" | "closing";
  leftPosition: Position;
  rightPosition: Position;
  verdictHint: string;
};

export type SurfaceConfig = {
  intensity: "off" | "gentle" | "steady" | "immersive";
  contextBias: "random" | "view" | "gaps";
  display: "right-rail" | "bottom-strip" | "corner-fade";
};

export type AmbientItem = {
  id: string;
  content: string;
  source: string;
  shownCount: number;
  lastShownAt: number;
  contextTags: string[];
  concepts: string[];
  passageId?: number;
};

export type Vec2 = { x: number; y: number };

export type Body = {
  id: string;
  position: Vec2;
  velocity: Vec2;
  mass: number;
  radius: number;
  fixed?: boolean;
  meta?: Record<string, string | number | boolean>;
};

export type RubricCriterion = {
  id: string;
  label: string;
  description: string;
};

export type FailureExample = {
  failureMode: string;
  text: string;
  annotation: string;
  contrastExample: string;
  rubricCategory: "thesis" | "evidence" | "analysis" | "structure" | "citations";
};

export type Angle = {
  id: string;
  name: string;
  tagline: string;
  difficulty: "low" | "medium" | "medium-high" | "high";
  conceptCountRange: [number, number];
  thesisTemplate: string;
  thesisScaffold: string;
  riskStatement: string;
  conceptLineage: string[];
};

export type VerifierResult = {
  status: "pending" | "kept" | "partial" | "broken";
  detail: string;
};

export type SubmissionSnapshot = {
  text: string;
  citations?: string[];
  wordCount?: number;
  dueDate?: number | null;
  draftCompletedAt?: number | null;
};

export type ProgressSnapshot = {
  conceptMastery: Record<string, number>;
  chapterCompletion: Record<string, number>;
  forgeHistory?: Array<{ chapterId: string; completedAt: number }>;
};

export type CommitmentType =
  | "citation-count"
  | "specific-content"
  | "style-person"
  | "avoidance"
  | "timeline"
  | "prerequisite"
  | "word-count"
  | "revision"
  | "structure"
  | "comparison"
  | "counterargument"
  | "thesis"
  | "source-type"
  | "tone"
  | "reading";

export type Verifier = (submission: SubmissionSnapshot, progress: ProgressSnapshot) => VerifierResult;

export type Commitment = {
  id: string;
  type: CommitmentType;
  text: string;
  target: Record<string, string | number | boolean>;
  status: "pending" | "kept" | "partial" | "broken";
  detail?: string;
  verifier: Verifier;
};

export type HistoryEntry = {
  timestamp: number;
  snapshot: Record<string, unknown>;
};

export type InteractionState<T = Record<string, unknown>> = {
  modeId: string;
  sessionId: string;
  startedAt: number;
  lastUpdated: number;
  data: T;
  history: HistoryEntry[];
};

export type Tension = {
  dimension: string;
  aPosition: string;
  bPosition: string;
  evidence: string;
};

export type Synthesis = {
  conceptId: string;
  explanation: string;
};

export type HistoricalReference = {
  passage: string;
  source: string;
};

export type CollisionReport = {
  conceptA: LearningBundle["concepts"][number];
  conceptB: LearningBundle["concepts"][number];
  sharedGround: string[];
  tensions: Tension[];
  synthesis: Synthesis | null;
  historicalCollisions: HistoricalReference[];
};
