import type {
  CanvasCourseKnowledgePackTrace,
  CaptureBundle,
  CaptureItem,
  CaptureResource
} from "@learning/schema";

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
  autoHandoff: boolean;
  autoDeleteAfterImport: boolean;
  maxRetries: number;
  retryBackoffMs: number;
  aeonthraUrl: string;
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

export interface SessionCaptureState {
  sessionKey: string;
  course: CourseContext;
  bundle: CaptureBundle;
  warnings: CaptureWarning[];
  firstSeenAt: string;
  lastSeenAt: string;
  sourceTabIds: number[];
}

export interface SessionCaptureSummary {
  sessionKey: string;
  origin: string;
  courseId: string;
  courseName: string;
  sourceHost: string;
  firstSeenAt: string;
  lastSeenAt: string;
  itemCount: number;
  resourceCount: number;
  warningCount: number;
  sourceTabIds: number[];
  latestItemTitle: string;
}

export interface SessionObservation {
  course: CourseContext;
  item: CaptureItem | null;
  resources: CaptureResource[];
  warning?: CaptureWarning;
  observedAt: string;
  sourceTabId?: number | null;
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

export interface CaptureLaneSummary {
  id: string;
  label: string;
  itemCount: number;
  resourceCount: number;
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
  provenanceLanes: CaptureLaneSummary[];
  captureStrategyLanes: CaptureLaneSummary[];
}

export interface StorageUsage {
  usedBytes: number;
  quotaBytes: number;
}

export interface ExtensionBuildIdentity {
  version: string;
  builtAt: string;
  sourceHash: string;
  unpackedPath: string;
  markerPath: string;
}

export type CourseDetectionSource = "live-content-script" | "url-fallback" | "none";

export interface CaptureItemVerdict {
  queueItemId: string;
  type: QueueItemType;
  title: string;
  url: string;
  strategy: QueueItem["strategy"];
  status: "captured" | "skipped" | "failed";
  message?: string;
  canonicalUrl?: string;
  persistedItemCount?: number;
  sourceUrlCount?: number;
}

export interface CaptureForensics {
  jobId: string | null;
  status: JobStatus | null;
  mode: CaptureMode;
  course: CourseContext | null;
  startedAt: string | null;
  discovered: DiscoveryCounts | null;
  queueTotal: number;
  itemVerdicts: CaptureItemVerdict[];
  warnings: CaptureWarning[];
  partialBundleItemCount: number;
  partialBundleSourceUrlCount: number;
  lastPersistedCanonicalUrl: string | null;
  finalInspection: CanvasCourseKnowledgePackTrace | null;
  finalPhaseLabel: string | null;
  finalErrorMessage: string | null;
  finalCaptureId: string | null;
}

export type ExtensionStatusPayload = {
  ok: true;
  activeCourse: CourseContext | null;
  activeCourseSource: CourseDetectionSource;
  workerCodeSignature: string;
  runtime: RuntimeState;
  settings: ExtensionSettings;
  history: CaptureHistorySummary[];
  latestCaptureId: string | null;
  storage: StorageUsage;
  build: ExtensionBuildIdentity | null;
  forensics: CaptureForensics | null;
  session: SessionCaptureSummary | null;
};
