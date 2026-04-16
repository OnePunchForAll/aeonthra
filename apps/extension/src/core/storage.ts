import { createEmptyBundle, mergeCaptureBundle, type CaptureBundle } from "@learning/schema";
import type {
  CaptureHistorySummary,
  CourseContext,
  ExtensionSettings,
  RuntimeState,
  SessionCaptureState,
  SessionCaptureSummary,
  SessionObservation,
  StorageUsage,
  StoredCaptureRecord
} from "./types";

const SETTINGS_KEY = "aeonthra:settings";
const SETTINGS_FALLBACK_KEY = "aeonthra:settings:local";
const RUNTIME_KEY = "aeonthra:runtime";
const HISTORY_KEY = "aeonthra:history";
const PENDING_BUNDLE_KEY = "aeonthra:pending-bundle";
const SESSION_STATES_KEY = "aeonthra:sessions";
const QUOTA_BYTES = 100 * 1024 * 1024;

function storageGet(area: chrome.storage.StorageArea, keys: string | string[] | Record<string, unknown> | null): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    try {
      area.get(keys, (items) => {
        const error = chrome.runtime.lastError;
        if (error) {
          reject(new Error(error.message));
          return;
        }
        resolve((items ?? {}) as Record<string, unknown>);
      });
    } catch (error) {
      reject(error);
    }
  });
}

function storageSet(area: chrome.storage.StorageArea, items: Record<string, unknown>): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      area.set(items, () => {
        const error = chrome.runtime.lastError;
        if (error) {
          reject(new Error(error.message));
          return;
        }
        resolve();
      });
    } catch (error) {
      reject(error);
    }
  });
}

function storageRemove(area: chrome.storage.StorageArea, keys: string | string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      area.remove(keys, () => {
        const error = chrome.runtime.lastError;
        if (error) {
          reject(new Error(error.message));
          return;
        }
        resolve();
      });
    } catch (error) {
      reject(error);
    }
  });
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
  defaultMode: "learning",
  requestDelay: 650,
  autoHandoff: false,
  autoDeleteAfterImport: true,
  maxRetries: 3,
  retryBackoffMs: 1200,
  aeonthraUrl: "https://aeonthra.github.io/aeonthra/"
};

export const EMPTY_RUNTIME_STATE: RuntimeState = {
  status: "idle",
  jobId: null,
  mode: "learning",
  progressPct: 0,
  course: null,
  phaseLabel: "Ready",
  currentTitle: "",
  currentUrl: "",
  discovered: null,
  totalQueued: 0,
  completedCount: 0,
  skippedCount: 0,
  failedCount: 0,
  warningCount: 0,
  startedAt: null,
  finishedAt: null,
  captureTabId: null,
  sourceTabId: null,
  captureId: null,
  errorMessage: null
};

function captureRecordKey(id: string): string {
  return `aeonthra:capture:${id}`;
}

export function sessionKeyForCourse(course: Pick<CourseContext, "origin" | "courseId">): string {
  return `${course.origin}::${course.courseId}`;
}

function byteSize(value: unknown): number {
  return new Blob([JSON.stringify(value)]).size;
}

function normalizeSettings(value: unknown): ExtensionSettings {
  const next = value && typeof value === "object" ? value as Partial<ExtensionSettings> : {};
  return {
    defaultMode: next.defaultMode === "complete" ? "complete" : DEFAULT_SETTINGS.defaultMode,
    requestDelay: typeof next.requestDelay === "number" ? next.requestDelay : DEFAULT_SETTINGS.requestDelay,
    autoHandoff: typeof next.autoHandoff === "boolean" ? next.autoHandoff : DEFAULT_SETTINGS.autoHandoff,
    autoDeleteAfterImport:
      typeof next.autoDeleteAfterImport === "boolean"
        ? next.autoDeleteAfterImport
        : DEFAULT_SETTINGS.autoDeleteAfterImport,
    maxRetries: typeof next.maxRetries === "number" ? next.maxRetries : DEFAULT_SETTINGS.maxRetries,
    retryBackoffMs: typeof next.retryBackoffMs === "number" ? next.retryBackoffMs : DEFAULT_SETTINGS.retryBackoffMs,
    aeonthraUrl: typeof next.aeonthraUrl === "string" && next.aeonthraUrl.trim().length > 0
      ? next.aeonthraUrl
      : DEFAULT_SETTINGS.aeonthraUrl
  };
}

function normalizeSessionStateMap(value: unknown): Record<string, SessionCaptureState> {
  if (!value || typeof value !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, SessionCaptureState>)
      .filter(([, state]) => state && typeof state === "object" && state.course && state.bundle)
  );
}

function baseSessionBundle(course: CourseContext, observedAt: string): CaptureBundle {
  return {
    ...createEmptyBundle(course.courseName || "AEONTHRA Session"),
    source: "extension-capture",
    title: course.courseName || "AEONTHRA Session",
    capturedAt: observedAt
  };
}

function summarizeSession(state: SessionCaptureState): SessionCaptureSummary {
  const latestItem = state.bundle.items[state.bundle.items.length - 1];
  return {
    sessionKey: state.sessionKey,
    origin: state.course.origin,
    courseId: state.course.courseId,
    courseName: state.course.courseName,
    sourceHost: state.course.host,
    firstSeenAt: state.firstSeenAt,
    lastSeenAt: state.lastSeenAt,
    itemCount: state.bundle.items.length,
    resourceCount: state.bundle.resources.length,
    warningCount: state.warnings.length,
    sourceTabIds: state.sourceTabIds,
    latestItemTitle: latestItem?.title ?? state.course.courseName
  };
}

export async function readSettings(): Promise<ExtensionSettings> {
  try {
    const stored = await storageGet(chrome.storage.sync, SETTINGS_KEY);
    if (stored[SETTINGS_KEY]) {
      return normalizeSettings(stored[SETTINGS_KEY]);
    }
  } catch {
    // Fall through to local storage.
  }

  const fallback = await storageGet(chrome.storage.local, SETTINGS_FALLBACK_KEY);
  return normalizeSettings(fallback[SETTINGS_FALLBACK_KEY]);
}

export async function writeSettings(settings: ExtensionSettings): Promise<void> {
  const normalized = normalizeSettings(settings);
  const writes: Promise<unknown>[] = [
    storageSet(chrome.storage.local, { [SETTINGS_FALLBACK_KEY]: normalized })
  ];

  try {
    writes.push(storageSet(chrome.storage.sync, { [SETTINGS_KEY]: normalized }));
  } catch {
    // sync storage may be unavailable; local storage remains the source of truth.
  }

  await Promise.allSettled(writes);
}

export async function readRuntimeState(): Promise<RuntimeState> {
  const stored = await storageGet(chrome.storage.local, RUNTIME_KEY);
  return { ...EMPTY_RUNTIME_STATE, ...(stored[RUNTIME_KEY] as Partial<RuntimeState> | undefined) };
}

export async function readSessionStates(): Promise<Record<string, SessionCaptureState>> {
  const stored = await storageGet(chrome.storage.local, SESSION_STATES_KEY);
  return normalizeSessionStateMap(stored[SESSION_STATES_KEY]);
}

export async function readSessionState(target: Pick<CourseContext, "origin" | "courseId"> | string): Promise<SessionCaptureState | null> {
  const states = await readSessionStates();
  const key = typeof target === "string" ? target : sessionKeyForCourse(target);
  return states[key] ?? null;
}

export async function readSessionSummary(target: Pick<CourseContext, "origin" | "courseId"> | string): Promise<SessionCaptureSummary | null> {
  const state = await readSessionState(target);
  return state ? summarizeSession(state) : null;
}

export async function writeSessionStates(states: Record<string, SessionCaptureState>): Promise<void> {
  await storageSet(chrome.storage.local, { [SESSION_STATES_KEY]: states });
}

export async function clearSessionState(target: Pick<CourseContext, "origin" | "courseId"> | string): Promise<void> {
  const states = await readSessionStates();
  const key = typeof target === "string" ? target : sessionKeyForCourse(target);
  if (!(key in states)) {
    return;
  }
  delete states[key];
  if (Object.keys(states).length === 0) {
    await storageRemove(chrome.storage.local, SESSION_STATES_KEY);
    return;
  }
  await writeSessionStates(states);
}

export async function upsertSessionObservation(observation: SessionObservation): Promise<SessionCaptureState> {
  const key = sessionKeyForCourse(observation.course);
  const states = await readSessionStates();
  const current = states[key];
  const warningKey = (warning: { url: string; message: string }) => `${warning.url}::${warning.message}`;
  const nextWarnings = [
    ...(current?.warnings ?? []),
    ...(observation.warning ? [observation.warning] : [])
  ]
    .filter((warning, index, warnings) => warnings.findIndex((entry) => warningKey(entry) === warningKey(warning)) === index)
    .slice(-30);

  const nextSourceTabs = Array.from(
    new Set(
      [
        ...(current?.sourceTabIds ?? []),
        ...(typeof observation.sourceTabId === "number" ? [observation.sourceTabId] : [])
      ]
    )
  ).slice(-8);

  const nextBundle = observation.item
    ? mergeCaptureBundle(current?.bundle ?? baseSessionBundle(observation.course, observation.observedAt), observation.item, observation.resources)
    : {
        ...(current?.bundle ?? baseSessionBundle(observation.course, observation.observedAt)),
        title: observation.course.courseName
      };

  const nextState: SessionCaptureState = {
    sessionKey: key,
    course: observation.course,
    bundle: {
      ...nextBundle,
      title: observation.course.courseName,
      source: "extension-capture",
      capturedAt: observation.observedAt
    },
    warnings: nextWarnings,
    firstSeenAt: current?.firstSeenAt ?? observation.observedAt,
    lastSeenAt: observation.observedAt,
    sourceTabIds: nextSourceTabs
  };

  states[key] = nextState;
  await writeSessionStates(states);
  return nextState;
}

export async function writeRuntimeState(state: RuntimeState): Promise<void> {
  await storageSet(chrome.storage.local, { [RUNTIME_KEY]: state });
}

export async function patchRuntimeState(patch: Partial<RuntimeState>): Promise<RuntimeState> {
  const current = await readRuntimeState();
  const next = { ...current, ...patch };
  await writeRuntimeState(next);
  return next;
}

export async function resetRuntimeState(course: CourseContext | null = null): Promise<void> {
  await writeRuntimeState({
    ...EMPTY_RUNTIME_STATE,
    course
  });
}

export async function readHistorySummaries(): Promise<CaptureHistorySummary[]> {
  const stored = await storageGet(chrome.storage.local, HISTORY_KEY);
  const history = stored[HISTORY_KEY];
  return Array.isArray(history) ? history as CaptureHistorySummary[] : [];
}

export async function writeHistorySummaries(history: CaptureHistorySummary[]): Promise<void> {
  await storageSet(chrome.storage.local, { [HISTORY_KEY]: history.slice(0, 20) });
}

export async function readCaptureRecord(id: string): Promise<StoredCaptureRecord | null> {
  const stored = await storageGet(chrome.storage.local, captureRecordKey(id));
  return (stored[captureRecordKey(id)] as StoredCaptureRecord | undefined) ?? null;
}

export async function writeCaptureRecord(record: StoredCaptureRecord): Promise<void> {
  await storageSet(chrome.storage.local, { [captureRecordKey(record.id)]: record });
}

export async function upsertHistory(record: StoredCaptureRecord): Promise<void> {
  const history = await readHistorySummaries();
  const summary: CaptureHistorySummary = {
    id: record.id,
    title: record.title,
    capturedAt: record.capturedAt,
    courseId: record.courseId,
    courseName: record.courseName,
    mode: record.mode,
    sizeBytes: record.sizeBytes,
    counts: record.bundle.captureMeta?.stats
      ? {
          assignments: record.bundle.items.filter((item) => item.kind === "assignment").length,
          discussions: record.bundle.items.filter((item) => item.kind === "discussion").length,
          quizzes: record.bundle.items.filter((item) => item.kind === "quiz").length,
          pages: record.bundle.items.filter((item) => item.kind === "page").length,
          modules: record.bundle.items.filter((item) => item.kind === "module").length,
          files: record.bundle.items.filter((item) => item.kind === "file").length,
          announcements: record.bundle.items.filter((item) => item.kind === "announcement").length,
          syllabus: record.bundle.items.filter((item) => item.kind === "syllabus").length,
          total: record.bundle.items.length
        }
      : {
          assignments: 0,
          discussions: 0,
          quizzes: 0,
          pages: 0,
          modules: 0,
          files: 0,
          announcements: 0,
          syllabus: 0,
          total: record.bundle.items.length
        },
    capturedItems: record.stats.totalItemsCaptured,
    failedItems: record.stats.totalItemsFailed
  };

  const nextHistory = [summary, ...history.filter((entry) => entry.id !== record.id)].slice(0, 20);
  await Promise.all([writeCaptureRecord(record), writeHistorySummaries(nextHistory)]);

  const retainedIds = new Set(nextHistory.map((entry) => entry.id));
  const removedKeys = history
    .filter((entry) => !retainedIds.has(entry.id))
    .map((entry) => captureRecordKey(entry.id));

  if (removedKeys.length > 0) {
    await storageRemove(chrome.storage.local, removedKeys);
  }
}

export async function deleteCaptureRecord(id: string): Promise<void> {
  const history = await readHistorySummaries();
  await Promise.all([
    storageRemove(chrome.storage.local, captureRecordKey(id)),
    writeHistorySummaries(history.filter((entry) => entry.id !== id))
  ]);
}

export async function clearAllCaptures(): Promise<void> {
  const history = await readHistorySummaries();
  const keys = history.map((entry) => captureRecordKey(entry.id));
  await storageRemove(chrome.storage.local, [
    ...keys,
    HISTORY_KEY,
    PENDING_BUNDLE_KEY,
    SESSION_STATES_KEY,
    "aeonthra:partial-bundle",
    "aeonthra:partial-warnings",
    "aeonthra:partial-raw-html"
  ]);
}

export async function writePendingBundle(bundle: CaptureBundle): Promise<void> {
  await storageSet(chrome.storage.local, { [PENDING_BUNDLE_KEY]: bundle });
}

export async function readPendingBundle(): Promise<CaptureBundle | null> {
  const stored = await storageGet(chrome.storage.local, PENDING_BUNDLE_KEY);
  return (stored[PENDING_BUNDLE_KEY] as CaptureBundle | undefined) ?? null;
}

export async function clearPendingBundle(): Promise<void> {
  await storageRemove(chrome.storage.local, PENDING_BUNDLE_KEY);
}

export async function latestCaptureId(): Promise<string | null> {
  const history = await readHistorySummaries();
  return history[0]?.id ?? null;
}

export async function estimateStorageUsage(): Promise<StorageUsage> {
  const history = await readHistorySummaries();
  const sessions = await readSessionStates();
  let usedBytes = byteSize(history);
  for (const entry of history) {
    const record = await readCaptureRecord(entry.id);
    if (record) {
      usedBytes += byteSize(record);
    }
  }
  usedBytes += byteSize(sessions);
  return {
    usedBytes,
    quotaBytes: QUOTA_BYTES
  };
}
