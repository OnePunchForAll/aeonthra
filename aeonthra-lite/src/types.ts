export type SourceDoc = {
  id: string;
  title: string;
  url?: string;
  kind: "paste" | "pdf" | "txt" | "html" | "docx" | "url" | "canvas" | "generic-page" | "other";
  text: string;
  headings: string[];
  capturedAt: string;
  // Pristine reading text preserved for fail-closed display (no summarization / no analysis).
  // When present, the split-screen Reader prefers this over `text`.
  readerText?: string;
  siteName?: string;
  extra?: Record<string, unknown>;
};

export type EvidenceSpan = {
  sourceId: string;
  sentence: string;
  headingTrail: string[];
  role: "definition" | "explanation" | "example" | "contrast" | "heading" | "quote";
};

export type Concept = {
  id: string;
  label: string;
  normalizedLabel: string;
  keywords: string[];
  definition: string;
  summary: string;
  evidence: EvidenceSpan[];
  sourceIds: string[];
  score: number;
  admissionReasons: string[];
};

export type CrossLink = {
  fromSourceId: string;
  toSourceId: string;
  sharedTokens: string[];
  overlap: number;
};

export type AnalyzeResult = {
  concepts: Concept[];
  crossLinks: CrossLink[];
  rejections: Array<{ code: string; detail: string; candidate?: string }>;
  deterministicHash: string;
};

export type PracticeQuestion = {
  id: string;
  conceptId: string;
  kind: "define" | "pick-trap" | "recall";
  prompt: string;
  correct: string;
  distractors: string[];
};

// Review-scheduling interval ladder (days). Start with 1d → 3d → 7d → 14d → 30d
// and step up on a correct answer, reset to step 0 on a missed one. This matches
// the spaced-repetition baseline from the research report; adaptive tuning can
// come later without changing the state shape.
export type MasteryRecord = {
  correct: number;
  missed: number;
  lastSeen: number;
  nextDueAt?: number;
  intervalStep?: number;
};

export type MasteryState = Record<string, MasteryRecord>;

export type QuestionStats = Record<string, { shown: number; correct: number; missed: number }>;

export type MemoryStage = "unseen" | "fragile" | "forming" | "stable" | "crystallized";

export type Citation = {
  id: string;
  sourceId: string;
  conceptId?: string;
  sentence: string;
  headingTrail: string[];
  kind: "direct" | "paraphrase";
  pickedAt: number;
  scope: string;
};

export type AssignmentRequirement = {
  id: string;
  text: string;
  checked: boolean;
};

export type AssignmentMeta = {
  prompt: string;
  requirements: AssignmentRequirement[];
};

export type Workspace = {
  version: 1;
  sources: SourceDoc[];
  analysis: AnalyzeResult | null;
  notesByScope: Record<string, string>;
  mastery: MasteryState;
  excludedSourceIds?: string[];
  citations?: Citation[];
  assignment?: AssignmentMeta;
  questionStats?: QuestionStats;
};
