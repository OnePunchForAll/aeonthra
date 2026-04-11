import type { CaptureBundle } from "@learning/schema";

export type CaptureMode = "complete" | "learning";
export type JobStatus =
  | "idle"
  | "starting"
  | "discovering"
  | "capturing"
  | "paused"
  | "completed"
  | "cancelled"
  | "error";

export type QueueItemType =
  | "assignment"
  | "discussion"
  | "quiz"
  | "page"
  | "module"
  | "file"
  | "announcement"
  | "syllabus";

export interface ExtensionSettings {
  defaultMode: CaptureMode;
  requestDelay: number;
  autoExpand: boolean;
  includeFileMetadata: boolean;
  autoHandoff: boolean;
  autoDeleteAfterImport: boolean;
  maxRetries: number;
  retryBackoffMs: number;
  aeonthraUrl: string;
  concurrentTabs: number;
  excludeModuleItemTypes: string[];
  theme: "default" | "high-contrast";
  reduceMotion: boolean;
}

export interface CourseContext {
  courseId: string;
  courseName: string;
  origin: string;
  courseUrl: string;
  modulesUrl: string;
  host: string;
  sourceTabId?: number;
}

export interface CaptureWarning {
  url: string;
  message: string;
}

export interface DiscoveryCounts {
  assignments: number;
  discussions: number;
  quizzes: number;
  pages: number;
  modules: number;
  files: number;
  announcements: number;
  syllabus: number;
  total: number;
}

export interface QueueItem {
  id: string;
  type: QueueItemType;
  title: string;
  url: string;
  strategy: "api-only" | "html-fetch";
  moduleName?: string;
  apiId?: string;
  raw?: Record<string, unknown>;
}

export interface CaptureStats {
  totalItemsVisited: number;
  totalItemsCaptured: number;
  totalItemsSkipped: number;
  totalItemsFailed: number;
  durationMs: number;
  sizeBytes: number;
}

export interface RuntimeState {
  status: JobStatus;
  jobId: string | null;
  mode: CaptureMode;
  progressPct: number;
  course: CourseContext | null;
  phaseLabel: string;
  currentTitle: string;
  currentUrl: string;
  discovered: DiscoveryCounts | null;
  totalQueued: number;
  completedCount: number;
  skippedCount: number;
  failedCount: number;
  warningCount: number;
  startedAt: string | null;
  finishedAt: string | null;
  captureTabId: number | null;
  sourceTabId: number | null;
  captureId: string | null;
  errorMessage: string | null;
}

export interface StoredCaptureRecord {
  id: string;
  title: string;
  capturedAt: string;
  courseId?: string;
  courseName?: string;
  mode: CaptureMode;
  sizeBytes: number;
  stats: CaptureStats;
  warnings: CaptureWarning[];
  bundle: CaptureBundle;
}

export interface CaptureHistorySummary {
  id: string;
  title: string;
  capturedAt: string;
  courseId?: string;
  courseName?: string;
  mode: CaptureMode;
  sizeBytes: number;
  counts: DiscoveryCounts;
  capturedItems: number;
  failedItems: number;
}

export interface StorageUsage {
  usedBytes: number;
  quotaBytes: number;
}

export type ExtensionStatusPayload = {
  ok: true;
  activeCourse: CourseContext | null;
  runtime: RuntimeState;
  settings: ExtensionSettings;
  history: CaptureHistorySummary[];
  latestCaptureId: string | null;
  storage: StorageUsage;
};
