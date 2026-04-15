import {
  BRIDGE_SOURCE,
  BridgeMessageSchema,
  CaptureBundleSchema,
  captureBundleId,
  createEmptyBundle,
  mergeCaptureBundle,
  type BridgeMessage,
  type CaptureBundle,
  type CaptureItem,
  type CaptureResource
} from "@learning/schema";
import {
  DEFAULT_SETTINGS,
  clearAllCaptures,
  clearPendingBundle,
  deleteCaptureRecord,
  estimateStorageUsage,
  latestCaptureId,
  patchRuntimeState,
  readCaptureRecord,
  readHistorySummaries,
  readPendingBundle,
  readRuntimeState,
  readSettings,
  resetRuntimeState,
  upsertHistory,
  writePendingBundle,
  writeRuntimeState,
  writeSettings
} from "./core/storage";
import type {
  CaptureMode,
  CaptureStats,
  CaptureWarning,
  CourseContext,
  ExtensionStatusPayload,
  QueueItem,
  RuntimeState,
  StoredCaptureRecord
} from "./core/types";

type CanvasTabContextResponse = {
  ok: boolean;
  course?: CourseContext;
  message?: string;
};

type CaptureStartPayload = {
  jobId: string;
  mode: CaptureMode;
  course: CourseContext;
  settings: ReturnType<typeof readSettings> extends Promise<infer T> ? T : never;
};

type ContentProgressMessage =
  | { type: "aeon:job-discovered"; jobId: string; counts: RuntimeState["discovered"]; queue: QueueItem[]; course: CourseContext }
  | { type: "aeon:item-captured"; jobId: string; item: CaptureItem; resources: CaptureResource[]; rawHtml?: string }
  | { type: "aeon:job-progress"; jobId: string; phaseLabel: string; currentTitle: string; currentUrl: string; completedCount: number; skippedCount: number; failedCount: number; totalQueued: number; progressPct: number }
  | { type: "aeon:job-warning"; jobId: string; warning: CaptureWarning }
  | { type: "aeon:job-complete"; jobId: string; stats: Omit<CaptureStats, "sizeBytes">; mode: CaptureMode; course: CourseContext; cancelled?: boolean }
  | { type: "aeon:job-error"; jobId: string; errorMessage: string };

const PARTIAL_BUNDLE_KEY = "aeonthra:partial-bundle";
const PARTIAL_WARNINGS_KEY = "aeonthra:partial-warnings";
const PARTIAL_RAW_HTML_KEY = "aeonthra:partial-raw-html";

function storageLocalGet(keys: string | string[] | Record<string, unknown> | null): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.local.get(keys, (items) => {
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

function storageLocalSet(items: Record<string, unknown>): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.local.set(items, () => {
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

function storageLocalRemove(keys: string | string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.local.remove(keys, () => {
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

function tabsQuery(queryInfo: chrome.tabs.QueryInfo): Promise<chrome.tabs.Tab[]> {
  return new Promise((resolve, reject) => {
    try {
      chrome.tabs.query(queryInfo, (tabs) => {
        const error = chrome.runtime.lastError;
        if (error) {
          reject(new Error(error.message));
          return;
        }
        resolve(tabs ?? []);
      });
    } catch (error) {
      reject(error);
    }
  });
}

function tabsGet(tabId: number): Promise<chrome.tabs.Tab | null> {
  return new Promise((resolve, reject) => {
    try {
      chrome.tabs.get(tabId, (tab) => {
        const error = chrome.runtime.lastError;
        if (error) {
          resolve(null);
          return;
        }
        resolve(tab ?? null);
      });
    } catch (error) {
      reject(error);
    }
  });
}

function tabsCreate(createProperties: chrome.tabs.CreateProperties): Promise<chrome.tabs.Tab> {
  return new Promise((resolve, reject) => {
    try {
      chrome.tabs.create(createProperties, (tab) => {
        const error = chrome.runtime.lastError;
        if (error || !tab) {
          reject(new Error(error?.message || "Chrome did not return a created tab."));
          return;
        }
        resolve(tab);
      });
    } catch (error) {
      reject(error);
    }
  });
}

function tabsUpdate(tabId: number, updateProperties: chrome.tabs.UpdateProperties): Promise<chrome.tabs.Tab> {
  return new Promise((resolve, reject) => {
    try {
      chrome.tabs.update(tabId, updateProperties, (tab) => {
        const error = chrome.runtime.lastError;
        if (error || !tab) {
          reject(new Error(error?.message || "Chrome did not return an updated tab."));
          return;
        }
        resolve(tab);
      });
    } catch (error) {
      reject(error);
    }
  });
}

function tabsSendMessage<T>(tabId: number, payload: Record<string, unknown>): Promise<T> {
  return new Promise((resolve, reject) => {
    try {
      chrome.tabs.sendMessage(tabId, payload, (response) => {
        const error = chrome.runtime.lastError;
        if (error) {
          reject(new Error(error.message));
          return;
        }
        resolve(response as T);
      });
    } catch (error) {
      reject(error);
    }
  });
}

function windowsUpdate(windowId: number, updateInfo: chrome.windows.UpdateInfo): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      chrome.windows.update(windowId, updateInfo, () => {
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

function downloadsDownload(options: chrome.downloads.DownloadOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      chrome.downloads.download(options, () => {
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

function sidePanelOpen(target: chrome.sidePanel.OpenOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      if (!chrome.sidePanel?.open) {
        resolve();
        return;
      }
      const maybe = chrome.sidePanel.open(target);
      if (maybe && typeof (maybe as Promise<void>).then === "function") {
        (maybe as Promise<void>).then(resolve).catch(reject);
        return;
      }
      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

async function getPartialBundle(): Promise<CaptureBundle> {
  const stored = await storageLocalGet(PARTIAL_BUNDLE_KEY);
  const parsed = CaptureBundleSchema.safeParse(stored[PARTIAL_BUNDLE_KEY]);
  return parsed.success ? parsed.data : createEmptyBundle("AEONTHRA Capture");
}

async function writePartialBundle(bundle: CaptureBundle): Promise<void> {
  await storageLocalSet({ [PARTIAL_BUNDLE_KEY]: bundle });
}

async function readPartialWarnings(): Promise<CaptureWarning[]> {
  const stored = await storageLocalGet(PARTIAL_WARNINGS_KEY);
  return Array.isArray(stored[PARTIAL_WARNINGS_KEY]) ? stored[PARTIAL_WARNINGS_KEY] as CaptureWarning[] : [];
}

async function appendPartialWarning(warning: CaptureWarning): Promise<void> {
  const warnings = await readPartialWarnings();
  await storageLocalSet({ [PARTIAL_WARNINGS_KEY]: [...warnings, warning] });
}

async function readPartialRawHtml(): Promise<Record<string, string>> {
  const stored = await storageLocalGet(PARTIAL_RAW_HTML_KEY);
  const value = stored[PARTIAL_RAW_HTML_KEY];
  return value && typeof value === "object" ? value as Record<string, string> : {};
}

async function appendPartialRawHtml(url: string, html: string): Promise<void> {
  const archive = await readPartialRawHtml();
  archive[url] = html;
  await storageLocalSet({ [PARTIAL_RAW_HTML_KEY]: archive });
}

async function clearPartialState(): Promise<void> {
  await storageLocalRemove([PARTIAL_BUNDLE_KEY, PARTIAL_WARNINGS_KEY, PARTIAL_RAW_HTML_KEY]);
}

let jobCounter = 0;

function randomJobId(): string {
  return `job-${Date.now().toString(36)}-${(++jobCounter).toString(36)}`;
}

function parseCourseContextFromUrl(urlValue?: string, title = "Canvas Course"): CourseContext | null {
  if (!urlValue) {
    return null;
  }

  try {
    const url = new URL(urlValue);
    const match = url.pathname.match(/\/courses\/(\d+)/);
    if (!match) {
      return null;
    }

    const courseId = match[1]!;
    const courseName = title.split("|")[0]!.trim() || `Course ${courseId}`;
    return {
      courseId,
      courseName,
      origin: url.origin,
      courseUrl: `${url.origin}/courses/${courseId}`,
      modulesUrl: `${url.origin}/courses/${courseId}/modules`,
      host: url.host
    };
  } catch {
    return null;
  }
}

function isCanvasUrl(urlValue?: string): boolean {
  return Boolean(parseCourseContextFromUrl(urlValue));
}

async function activeTab(): Promise<chrome.tabs.Tab | null> {
  const [tab] = await tabsQuery({ active: true, currentWindow: true });
  return tab ?? null;
}

async function ensureTabLoaded(tabId: number, timeoutMs = 15000): Promise<void> {
  const tab = await tabsGet(tabId).catch(() => null);
  if (tab?.status === "complete") {
    return;
  }

  await new Promise<void>((resolve) => {
    const timeout = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      resolve();
    }, timeoutMs);

    const listener = (updatedTabId: number, info: chrome.tabs.TabChangeInfo) => {
      if (updatedTabId === tabId && info.status === "complete") {
        clearTimeout(timeout);
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    };

    chrome.tabs.onUpdated.addListener(listener);
  });
}

async function sendCanvasMessage<T>(tabId: number, payload: Record<string, unknown>): Promise<T> {
  return tabsSendMessage<T>(tabId, payload);
}

async function detectCourseContext(tab: chrome.tabs.Tab | null): Promise<CourseContext | null> {
  if (!tab?.id || !isCanvasUrl(tab.url)) {
    return null;
  }

  const fallback = parseCourseContextFromUrl(tab.url, tab.title ?? "Canvas Course");
  try {
    const response = await sendCanvasMessage<CanvasTabContextResponse>(tab.id, { type: "aeon:get-course-context" });
    if (response?.ok && response.course) {
      return {
        ...response.course,
        sourceTabId: tab.id
      };
    }
  } catch {
    return fallback ? { ...fallback, sourceTabId: tab.id } : null;
  }

  return fallback ? { ...fallback, sourceTabId: tab.id } : null;
}

async function broadcastOverlay(state: RuntimeState): Promise<void> {
  const targets = [state.sourceTabId, state.captureTabId].filter((value): value is number => typeof value === "number");
  await Promise.all(
    targets.map(async (tabId) => {
      try {
        await tabsSendMessage(tabId, { type: "aeon:overlay-state", runtime: state });
      } catch {
        return undefined;
      }
      return undefined;
    })
  );
}

async function updateRuntime(patch: Partial<RuntimeState>): Promise<RuntimeState> {
  const next = await patchRuntimeState(patch);
  await broadcastOverlay(next);
  return next;
}

async function buildStatusPayload(): Promise<ExtensionStatusPayload> {
  const tab = await activeTab();
  const [course, runtime, settings, history, latestId, storage] = await Promise.all([
    detectCourseContext(tab),
    readRuntimeState(),
    readSettings(),
    readHistorySummaries(),
    latestCaptureId(),
    estimateStorageUsage()
  ]);

  return {
    ok: true,
    activeCourse: course,
    runtime,
    settings,
    history,
    latestCaptureId: latestId,
    storage
  };
}

async function openOrFocusWorkspace(workspaceUrl: string): Promise<chrome.tabs.Tab> {
  const tabs = await tabsQuery({});
  const existing = tabs.find((tab) => {
    if (!tab.url) {
      return false;
    }

    try {
      const target = new URL(workspaceUrl);
      const current = new URL(tab.url);
      return target.origin === current.origin && target.pathname === current.pathname;
    } catch {
      return false;
    }
  });

  if (existing?.id) {
    if (typeof existing.windowId === "number") {
      await windowsUpdate(existing.windowId, { focused: true });
    }
    const updated = await tabsUpdate(existing.id, { active: true, url: workspaceUrl });
    return updated ?? existing;
  }

  return tabsCreate({ url: workspaceUrl, active: true });
}

async function requestWorkspaceImport(tabId: number): Promise<boolean> {
  await ensureTabLoaded(tabId, 8000);
  try {
    const response = await tabsSendMessage<{ ok?: boolean }>(tabId, { type: "bridge-request-import" });
    return Boolean(response?.ok);
  } catch {
    return false;
  }
}

async function queueBundleForWorkspace(bundle: CaptureBundle): Promise<{ bridgeReady: boolean; queuedPackId: string }> {
  const settings = await readSettings();
  await writePendingBundle(bundle);
  const tab = await openOrFocusWorkspace(settings.aeonthraUrl);
  const bridgeReady = tab.id ? await requestWorkspaceImport(tab.id) : false;
  return {
    bridgeReady,
    queuedPackId: captureBundleId(bundle)
  };
}

async function finalizeCapture(jobId: string, mode: CaptureMode, course: CourseContext, stats: Omit<CaptureStats, "sizeBytes">, cancelled = false): Promise<void> {
  const runtime = await readRuntimeState();
  if (runtime.jobId !== jobId) {
    return;
  }

  const [partialBundle, warnings, rawHtmlArchive] = await Promise.all([
    getPartialBundle(),
    readPartialWarnings(),
    readPartialRawHtml()
  ]);

  const finalized: CaptureBundle = {
    ...partialBundle,
    source: "extension-capture",
    title: course.courseName || partialBundle.title,
    captureMeta: {
      mode,
      courseId: course.courseId,
      courseName: course.courseName,
      sourceHost: course.host,
      stats: {
        ...stats,
        sizeBytes: new Blob([JSON.stringify(partialBundle)]).size
      },
      warnings,
      rawHtmlArchive: mode === "complete" ? rawHtmlArchive : undefined
    }
  };

  const captureId = captureBundleId(finalized);
  const sizeBytes = new Blob([JSON.stringify(finalized)]).size;
  const record: StoredCaptureRecord = {
    id: captureId,
    title: finalized.title,
    capturedAt: finalized.capturedAt,
    courseId: course.courseId,
    courseName: course.courseName,
    mode,
    sizeBytes,
    stats: {
      ...stats,
      sizeBytes
    },
    warnings,
    bundle: finalized
  };

  await upsertHistory(record);
  await clearPartialState();
  await updateRuntime({
    status: cancelled ? "cancelled" : "completed",
    progressPct: 100,
    phaseLabel: cancelled ? "Partial Capture Saved" : "Capture Complete",
    finishedAt: new Date().toISOString(),
    captureId,
    warningCount: warnings.length,
    errorMessage: null
  });

  const settings = await readSettings();
  if (!cancelled && settings.autoHandoff) {
    await queueBundleForWorkspace(finalized);
  }
}

async function startCapture(mode: CaptureMode): Promise<{ ok: true } | { ok: false; message: string }> {
  const runtime = await readRuntimeState();
  if (runtime.status === "discovering" || runtime.status === "capturing" || runtime.status === "paused" || runtime.status === "starting") {
    return { ok: false, message: "A capture is already running." };
  }

  const tab = await activeTab();
  const course = await detectCourseContext(tab);
  if (!course) {
    return { ok: false, message: "Open a Canvas course page first so AEONTHRA knows what to capture." };
  }

  const settings = await readSettings();
  const jobId = randomJobId();
  const captureTab = await tabsCreate({ url: course.modulesUrl, active: false });
  if (!captureTab.id) {
    return { ok: false, message: "Chrome could not create the background capture tab." };
  }

  await ensureTabLoaded(captureTab.id);
  const bundle = {
    ...createEmptyBundle(course.courseName || "AEONTHRA Capture"),
    source: "extension-capture" as const,
    title: course.courseName || "AEONTHRA Capture",
    capturedAt: new Date().toISOString()
  };
  await Promise.all([
    writePartialBundle(bundle),
    storageLocalSet({
      [PARTIAL_WARNINGS_KEY]: [],
      [PARTIAL_RAW_HTML_KEY]: {}
    }),
    writeRuntimeState({
      status: "starting",
      jobId,
      mode,
      progressPct: 0,
      course,
      phaseLabel: "Starting Capture",
      currentTitle: course.courseName,
      currentUrl: course.courseUrl,
      discovered: null,
      totalQueued: 0,
      completedCount: 0,
      skippedCount: 0,
      failedCount: 0,
      warningCount: 0,
      startedAt: new Date().toISOString(),
      finishedAt: null,
      captureTabId: captureTab.id,
      sourceTabId: course.sourceTabId ?? null,
      captureId: null,
      errorMessage: null
    })
  ]);

  await broadcastOverlay(await readRuntimeState());

  const payload: CaptureStartPayload = {
    jobId,
    mode,
    course,
    settings
  };

  try {
    const response = await sendCanvasMessage<{ ok: boolean; message?: string }>(captureTab.id, {
      type: "aeon:start-course-capture",
      payload
    });
    if (!response?.ok) {
      throw new Error(response?.message ?? "Capture tab did not accept the job.");
    }
  } catch (error) {
    await updateRuntime({
      status: "error",
      phaseLabel: "Capture Failed",
      errorMessage: error instanceof Error ? error.message : "Capture could not start."
    });
    return { ok: false, message: error instanceof Error ? error.message : "Capture could not start." };
  }

  return { ok: true };
}

async function setCaptureControl(action: "pause" | "resume" | "cancel"): Promise<{ ok: true } | { ok: false; message: string }> {
  const runtime = await readRuntimeState();
  if (!runtime.captureTabId || !runtime.jobId) {
    return { ok: false, message: "No active capture is available." };
  }

  try {
    const response = await sendCanvasMessage<{ ok: boolean; message?: string }>(runtime.captureTabId, {
      type: "aeon:set-capture-control",
      control: action
    });
    if (!response?.ok) {
      return { ok: false, message: response?.message ?? "Unable to update capture control." };
    }
  } catch {
    return { ok: false, message: "The capture tab is no longer responding." };
  }

  if (action === "pause") {
    await updateRuntime({ status: "paused", phaseLabel: "Capture Paused" });
  } else if (action === "resume") {
    await updateRuntime({ status: "capturing", phaseLabel: "Capture Running" });
  } else {
    await updateRuntime({ status: "cancelled", phaseLabel: "Capture Cancelled", finishedAt: new Date().toISOString() });
  }

  return { ok: true };
}

async function downloadCapture(captureId: string | null): Promise<{ ok: true } | { ok: false; message: string }> {
  const targetId = captureId ?? await latestCaptureId();
  if (!targetId) {
    return { ok: false, message: "No capture is available to export yet." };
  }

  const record = await readCaptureRecord(targetId);
  if (!record) {
    return { ok: false, message: "AEONTHRA could not find that capture in local history." };
  }

  const slug = record.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "course";
  const filename = `aeonthra-${slug}-${record.mode}-${record.capturedAt.replace(/[:.]/g, "-")}.json`;
  const url = `data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(record.bundle, null, 2))}`;
  await downloadsDownload({
    url,
    filename,
    saveAs: false
  });

  return { ok: true };
}

async function openClassroom(captureId: string | null): Promise<{ ok: true; bridgeReady: boolean } | { ok: false; message: string }> {
  const targetId = captureId ?? await latestCaptureId();
  if (!targetId) {
    return { ok: false, message: "Run or reopen a capture first so AEONTHRA has something to open." };
  }

  const record = await readCaptureRecord(targetId);
  if (!record) {
    return { ok: false, message: "That capture no longer exists in history." };
  }

  const result = await queueBundleForWorkspace(record.bundle);
  return { ok: true, bridgeReady: result.bridgeReady };
}

async function handleContentProgress(message: ContentProgressMessage): Promise<void> {
  const runtime = await readRuntimeState();
  if (runtime.jobId !== message.jobId) {
    return;
  }

  if (message.type === "aeon:job-discovered") {
    await updateRuntime({
      status: "discovering",
      phaseLabel: "Discovery Complete",
      discovered: message.counts,
      totalQueued: message.queue.length,
      course: message.course
    });
    return;
  }

  if (message.type === "aeon:item-captured") {
    const partial = await getPartialBundle();
    const merged = mergeCaptureBundle(partial, message.item, message.resources);
    await writePartialBundle(merged);
    if (message.rawHtml) {
      await appendPartialRawHtml(message.item.canonicalUrl, message.rawHtml);
    }
    return;
  }

  if (message.type === "aeon:job-progress") {
    await updateRuntime({
      status: runtime.status === "paused" ? "paused" : "capturing",
      phaseLabel: message.phaseLabel,
      currentTitle: message.currentTitle,
      currentUrl: message.currentUrl,
      completedCount: message.completedCount,
      skippedCount: message.skippedCount,
      failedCount: message.failedCount,
      totalQueued: message.totalQueued,
      progressPct: message.progressPct
    });
    return;
  }

  if (message.type === "aeon:job-warning") {
    await appendPartialWarning(message.warning);
    await updateRuntime({ warningCount: runtime.warningCount + 1 });
    return;
  }

  if (message.type === "aeon:job-complete") {
    await finalizeCapture(message.jobId, message.mode, message.course, message.stats, Boolean(message.cancelled));
    return;
  }

  if (message.type === "aeon:job-error") {
    const partial = await getPartialBundle();
    if (runtime.course && partial.items.length > 0) {
      await finalizeCapture(
        message.jobId,
        runtime.mode,
        runtime.course,
        {
          totalItemsVisited: runtime.totalQueued,
          totalItemsCaptured: partial.items.length,
          totalItemsSkipped: runtime.skippedCount,
          totalItemsFailed: runtime.failedCount + 1,
          durationMs: runtime.startedAt ? Date.now() - Date.parse(runtime.startedAt) : 0
        },
        true
      );
      await updateRuntime({ errorMessage: message.errorMessage });
    } else {
      await updateRuntime({
        status: "error",
        phaseLabel: "Capture Failed",
        errorMessage: message.errorMessage,
        finishedAt: new Date().toISOString()
      });
    }
  }
}

chrome.runtime.onInstalled.addListener(() => {
  void (async () => {
    try {
      console.log("[AEONTHRA] Extension installed/updated");
      const existing = await readSettings();
      await writeSettings({ ...DEFAULT_SETTINGS, ...existing });
      await resetRuntimeState(null);
    } catch (error) {
      console.error("[AEONTHRA SW] onInstalled bootstrap failed", error);
    }
  })();
});

chrome.tabs.onRemoved.addListener((tabId) => {
  void (async () => {
    try {
      const runtime = await readRuntimeState();
      if (runtime.captureTabId === tabId && (runtime.status === "capturing" || runtime.status === "discovering" || runtime.status === "paused" || runtime.status === "starting")) {
        await updateRuntime({
          status: "error",
          phaseLabel: "Capture Interrupted",
          errorMessage: "The background capture tab was closed. Partial progress is still saved."
        });
      }
    } catch (error) {
      console.error("[AEONTHRA SW] tab removal handling failed", error);
    }
  })();
});

globalThis.addEventListener("error", (event) => {
  console.error("[AEONTHRA SW] Uncaught error", event.error ?? event.message);
});

globalThis.addEventListener("unhandledrejection", (event) => {
  console.error("[AEONTHRA SW] Unhandled rejection", event.reason);
});

async function getExtensionState(): Promise<ExtensionStatusPayload & {
  state: string;
  isCanvas: boolean;
  courseId: string | null;
  courseName: string;
  url: string;
  tabId: number | null;
}> {
  const [tab] = await tabsQuery({ active: true, currentWindow: true });
  const url = tab?.url || "";
  const isCanvas = /instructure\.com|canvas\./i.test(url);
  const courseMatch = url.match(/\/courses\/(\d+)/);
  const courseName = tab?.title?.replace(/\s*-\s*Canvas.*$/i, "").trim() || "";

  let fallbackHistory = [] as Awaited<ReturnType<typeof readHistorySummaries>>;
  try {
    const stored = await storageLocalGet("captureHistory");
    fallbackHistory = Array.isArray(stored.captureHistory) ? stored.captureHistory : [];
  } catch {
    fallbackHistory = [];
  }

  const status = await buildStatusPayload().catch(async () => {
    const runtime = await readRuntimeState();
    const settings = await readSettings();
    const history = await readHistorySummaries().catch(() => fallbackHistory);
    const fallbackLatestCaptureId = await latestCaptureId().catch(() => null);
    const storage = await estimateStorageUsage().catch(() => ({ usedBytes: 0, quotaBytes: 0 }));
    return {
      ok: true as const,
      activeCourse: null,
      runtime,
      settings,
      history,
      latestCaptureId: fallbackLatestCaptureId,
      storage
    };
  });

  const activeCourse = courseMatch
    ? status.activeCourse ?? parseCourseContextFromUrl(url, courseName || `Course ${courseMatch[1]}`) ?? null
    : null;

  return {
    ...status,
    activeCourse,
    state: isCanvas && courseMatch ? "course-detected" : "idle",
    isCanvas,
    courseId: courseMatch?.[1] || null,
    courseName: activeCourse?.courseName || courseName,
    url,
    tabId: tab?.id || null,
    history: status.history ?? fallbackHistory
  };
}

async function handleMessage(message: unknown, sender: chrome.runtime.MessageSender): Promise<unknown> {
  const type = typeof message === "object" && message !== null && "type" in message
    ? (message as { type?: unknown }).type
    : null;

  if (typeof type !== "string") {
    return { state: "idle", message: "Extension message was missing a valid type." };
  }

  if (type.startsWith("aeon:job-")) {
    await handleContentProgress(message as ContentProgressMessage);
    return { state: "ok" };
  }

  if (type === "GET_STATE" || type === "aeon:get-extension-state" || type === "getState") {
    return await getExtensionState();
  }

  if (type === "START_CAPTURE" || type === "aeon:start-capture") {
    const response = await startCapture((message as { mode?: CaptureMode }).mode ?? "learning");
    return {
      ...response,
      state: response.ok ? "capturing" : "idle"
    };
  }

  if (type === "PAUSE_CAPTURE" || type === "aeon:pause-capture") {
    const response = await setCaptureControl("pause");
    return {
      ...response,
      state: response.ok ? "paused" : "idle"
    };
  }

  if (type === "aeon:resume-capture") {
    const response = await setCaptureControl("resume");
    return {
      ...response,
      state: response.ok ? "capturing" : "idle"
    };
  }

  if (type === "CANCEL_CAPTURE" || type === "aeon:cancel-capture") {
    const response = await setCaptureControl("cancel");
    return {
      ...response,
      state: response.ok ? "idle" : "idle"
    };
  }

  if (type === "OPEN_PANEL" || type === "aeon:open-side-panel") {
    try {
      const targetWindowId = sender.tab?.windowId ?? (await activeTab())?.windowId;
      if (typeof targetWindowId === "number") {
        await sidePanelOpen({ windowId: targetWindowId });
      }
    } catch {
      // sidePanel might not be available
    }
    return { state: "panel-opened" };
  }

  if (type === "aeon:download-capture") {
    return downloadCapture(((message as { captureId?: string | null }).captureId) ?? null);
  }

  if (type === "HANDOFF" || type === "aeon:open-classroom") {
    return openClassroom(((message as { captureId?: string | null }).captureId) ?? null);
  }

  if (type === "aeon:update-settings") {
    const settings = { ...(await readSettings()), ...(((message as { settings?: Record<string, unknown> }).settings) ?? {}) };
    await writeSettings(settings);
    return { ok: true };
  }

  if (type === "aeon:delete-capture") {
    await deleteCaptureRecord((message as { captureId: string }).captureId);
    return { ok: true };
  }

  if (type === "aeon:clear-captures") {
    await clearAllCaptures();
    await clearPendingBundle();
    await resetRuntimeState(null);
    return { ok: true };
  }

  if (type === "bridge-message") {
    const parsed = BridgeMessageSchema.safeParse((message as { payload?: unknown }).payload);
    if (!parsed.success) {
      return { ok: false, message: "Bridge payload was invalid." };
    }

    const bridgeMessage = parsed.data;
    if (bridgeMessage.type === "NF_IMPORT_REQUEST") {
      const pendingBundle = await readPendingBundle();
      const relay: BridgeMessage = pendingBundle
        ? {
            source: BRIDGE_SOURCE,
            type: "NF_PACK_READY",
            pack: pendingBundle
          }
        : {
            source: BRIDGE_SOURCE,
            type: "NF_IMPORT_RESULT",
            success: false,
            error: "No pending AEONTHRA bundle was queued for import."
          };
      return { ok: true, relay };
    }

    if (bridgeMessage.type === "NF_PACK_ACK") {
      const pendingBundle = await readPendingBundle();
      if (pendingBundle && captureBundleId(pendingBundle) === bridgeMessage.packId) {
        await clearPendingBundle();
      }
      const settings = await readSettings();
      if (settings.autoDeleteAfterImport) {
        await deleteCaptureRecord(bridgeMessage.packId);
        const runtime = await readRuntimeState();
        if (runtime.captureId === bridgeMessage.packId) {
          await updateRuntime({
            captureId: null,
            phaseLabel: "Imported And Cleared",
            status: "completed"
          });
        }
      }
      return { ok: true };
    }

    if (bridgeMessage.type === "NF_PONG") {
      return { ok: true };
    }

    return { ok: true };
  }

  console.warn("[AEONTHRA SW] Unknown message type:", type);
  return { state: "idle", message: `Unknown message type: ${type}` };
}

chrome.runtime.onMessage.addListener((message: unknown, sender: chrome.runtime.MessageSender, sendResponse: (response: unknown) => void) => {
  (async () => {
    try {
      const result = await handleMessage(message, sender);
      sendResponse({ ok: true, ...((result && typeof result === "object") ? result as Record<string, unknown> : { result }) });
    } catch (err) {
      console.error("[AEONTHRA SW] Error handling message:", err);
      sendResponse({
        ok: false,
        error: err instanceof Error ? err.message : "Service worker error"
      });
    }
  })();

  return true;
});
