import {
  BRIDGE_SOURCE,
  BridgeMessageSchema,
  CaptureBundleSchema,
  captureBundleId,
  createEmptyBundle,
  inspectCanvasCourseKnowledgePack,
  mergeCaptureBundle,
  traceCanvasCourseKnowledgePack,
  type CanvasCourseKnowledgePackIssueCode,
  type BridgeMessage,
  type CaptureBundle,
  type CaptureItem,
  type CaptureResource
} from "@learning/schema";
import {
  DEFAULT_SETTINGS,
  clearAllCaptures,
  writeCaptureForensics,
  clearPendingHandoff,
  clearPendingHandoffs,
  clearSessionState,
  deleteCaptureRecord,
  estimateStorageUsage,
  inspectPendingHandoff,
  latestCaptureId,
  patchRuntimeState,
  readCaptureRecord,
  readCaptureForensics,
  readHistorySummaries,
  readRuntimeState,
  readSessionState,
  readSessionSummary,
  readSettings,
  queuePendingHandoff,
  resetRuntimeState,
  upsertSessionObservation,
  upsertHistory,
  writeRuntimeState,
  writeSettings
} from "./core/storage";
import { CAPTURE_AUTO_START_NODE_ID } from "./capture-autostart";
import {
  parseCourseContextFromUrl,
  validateAeonthraUrl
} from "./core/platform";
import type {
  CaptureMode,
  CaptureForensics,
  CaptureItemVerdict,
  CaptureStats,
  CaptureWarning,
  CourseDetectionSource,
  CourseContext,
  ExtensionBuildIdentity,
  ExtensionStatusPayload,
  QueueItem,
  RuntimeState,
  SessionCaptureState,
  SessionObservation,
  StoredCaptureRecord
} from "./core/types";

type CanvasTabContextResponse = {
  ok: boolean;
  course?: CourseContext;
  message?: string;
};

type DetectedCourseContext = {
  course: CourseContext | null;
  source: CourseDetectionSource;
};

type CanvasBootstrapInvocation<T> = {
  response: T | null;
  reason: string | null;
};

type MissingReceiverRecoveryTrace = {
  bootstrapBeforeInjection: string[];
  bootstrapAfterInjection: string[];
  injectionAttempted: boolean;
  injectionRecovered: boolean;
  injectionError: string | null;
  autoStartSeeded: boolean;
  autoStartSeedError: string | null;
  autoStartSignal: string | null;
};

type MissingReceiverStrategy = "recover" | "wait-for-receiver";

type CaptureStartSignal =
  | { kind: "started"; detail: string }
  | { kind: "error"; detail: string };

type CaptureStartPayload = {
  jobId: string;
  mode: CaptureMode;
  course: CourseContext;
  settings: ReturnType<typeof readSettings> extends Promise<infer T> ? T : never;
};

type CanvasBootstrapRequest =
  | { type: "aeon:get-course-context" }
  | { type: "aeon:start-course-capture"; payload: CaptureStartPayload }
  | { type: "aeon:set-capture-control"; control: "pause" | "resume" | "cancel" }
  | { type: "aeon:overlay-state"; runtime: RuntimeState };

type ContentProgressMessage =
  | { type: "aeon:job-discovered"; jobId: string; counts: RuntimeState["discovered"]; queue: QueueItem[]; course: CourseContext }
  | { type: "aeon:item-captured"; jobId: string; item: CaptureItem; resources: CaptureResource[]; rawHtml?: string }
  | { type: "aeon:job-item-verdict"; jobId: string; verdict: CaptureItemVerdict }
  | { type: "aeon:job-progress"; jobId: string; phaseLabel: string; currentTitle: string; currentUrl: string; completedCount: number; skippedCount: number; failedCount: number; totalQueued: number; progressPct: number }
  | { type: "aeon:job-warning"; jobId: string; warning: CaptureWarning }
  | { type: "aeon:job-complete"; jobId: string; stats: Omit<CaptureStats, "sizeBytes">; mode: CaptureMode; course: CourseContext; cancelled?: boolean }
  | { type: "aeon:job-error"; jobId: string; errorMessage: string };

const PARTIAL_BUNDLE_KEY = "aeonthra:partial-bundle";
const PARTIAL_WARNINGS_KEY = "aeonthra:partial-warnings";
const PARTIAL_RAW_HTML_KEY = "aeonthra:partial-raw-html";
const COMPLETE_CAPTURE_MODE: CaptureMode = "complete";
const WORKER_CODE_SIGNATURE = "sw-recovery-trace-v5";
const CAPTURE_START_SIGNAL_TIMEOUT_MS = 3000;
const RETRYABLE_CANVAS_MESSAGE_ERRORS = [
  "Receiving end does not exist",
  "Could not establish connection",
  "message port closed before a response was received",
  "The message port closed before a response was received"
] as const;
const MISSING_CANVAS_RECEIVER_ERRORS = [
  "Receiving end does not exist",
  "Could not establish connection"
] as const;

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

function scriptingExecuteScript(
  target: chrome.scripting.InjectionTarget,
  files: string[]
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      chrome.scripting.executeScript({ target, files }, () => {
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

function scriptingExecuteFunction<TArgs extends unknown[], TResult>(
  target: chrome.scripting.InjectionTarget,
  func: (...args: TArgs) => TResult,
  args: TArgs,
  world: chrome.scripting.ExecutionWorld = "ISOLATED"
): Promise<TResult | undefined> {
  return new Promise((resolve, reject) => {
    try {
      chrome.scripting.executeScript(
        { target, func, args, world } as chrome.scripting.ScriptInjection<TArgs, TResult>,
        (results) => {
          const error = chrome.runtime.lastError;
          if (error) {
            reject(new Error(error.message));
            return;
          }
          resolve(results?.[0]?.result as TResult | undefined);
        }
      );
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

let buildIdentityPromise: Promise<ExtensionBuildIdentity | null> | null = null;
const captureStartSignalWaiters = new Map<string, {
  resolve: (signal: CaptureStartSignal) => void;
  timeoutId: ReturnType<typeof setTimeout>;
}>();
const bufferedCaptureStartSignals = new Map<string, CaptureStartSignal>();

async function readBuildIdentity(): Promise<ExtensionBuildIdentity | null> {
  if (!buildIdentityPromise) {
    buildIdentityPromise = (async () => {
      try {
        const response = await fetch(chrome.runtime.getURL("build-info.json"));
        if (!response.ok) {
          return null;
        }
        const parsed = await response.json() as Partial<ExtensionBuildIdentity>;
        if (
          typeof parsed.version !== "string" ||
          typeof parsed.builtAt !== "string" ||
          typeof parsed.sourceHash !== "string" ||
          typeof parsed.unpackedPath !== "string" ||
          typeof parsed.markerPath !== "string"
        ) {
          return null;
        }
        return {
          version: parsed.version,
          builtAt: parsed.builtAt,
          sourceHash: parsed.sourceHash,
          unpackedPath: parsed.unpackedPath,
          markerPath: parsed.markerPath
        };
      } catch {
        return null;
      }
    })();
  }

  return buildIdentityPromise;
}

function createInitialForensics(jobId: string, mode: CaptureMode, course: CourseContext): CaptureForensics {
  return {
    jobId,
    status: "starting",
    mode,
    course,
    startedAt: new Date().toISOString(),
    discovered: null,
    queueTotal: 0,
    itemVerdicts: [],
    warnings: [],
    partialBundleItemCount: 0,
    partialBundleSourceUrlCount: 0,
    lastPersistedCanonicalUrl: null,
    finalInspection: null,
    finalPhaseLabel: null,
    finalErrorMessage: null,
    finalCaptureId: null
  };
}

async function updateCaptureForensicsRecord(
  updater: (current: CaptureForensics | null) => CaptureForensics | null
): Promise<void> {
  const current = await readCaptureForensics();
  await writeCaptureForensics(updater(current));
}

function summarizeTopVerdictReasons(verdicts: CaptureItemVerdict[], limit = 3): string[] {
  const counts = new Map<string, number>();
  for (const verdict of verdicts) {
    if (verdict.status === "captured") {
      continue;
    }
    const key = verdict.message?.trim() || "No importable content survived extraction.";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, limit)
    .map(([message, count]) => `${count}x ${message}`);
}

let jobCounter = 0;

function randomJobId(): string {
  return `job-${Date.now().toString(36)}-${(++jobCounter).toString(36)}`;
}

function waitMs(durationMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, durationMs));
}

function isRetryableCanvasMessageError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return RETRYABLE_CANVAS_MESSAGE_ERRORS.some((fragment) => message.includes(fragment));
}

function isMissingCanvasReceiverError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return MISSING_CANVAS_RECEIVER_ERRORS.some((fragment) => message.includes(fragment));
}

function describeQueueableCanvasBundleIssue(
  code: CanvasCourseKnowledgePackIssueCode,
  context: "queue" | "bridge" | "capture"
): string {
  if (context === "queue") {
    switch (code) {
      case "invalid-bundle":
        return "The selected capture was malformed and cannot be handed off to AEONTHRA.";
      case "wrong-source":
        return "Only SENTINEL extension captures can be handed off to AEONTHRA.";
      case "empty-bundle":
        return "This capture finished without any importable Canvas pages. Re-run SENTINEL on a readable Canvas page before opening AEONTHRA.";
      case "textbook-only":
        return "This capture only contains textbook-tagged items, so AEONTHRA will not treat it as a Canvas course capture.";
      case "missing-course-id":
        return "This capture is missing the Canvas course id required for an AEONTHRA handoff.";
      case "missing-source-host":
        return "This capture is missing the Canvas source host required for an AEONTHRA handoff.";
      case "missing-course-url":
        return "This capture did not preserve any Canvas page URL that resolves back to one course identity, so AEONTHRA cannot queue it.";
      case "ambiguous-course-identity":
        return "This capture does not resolve to one Canvas host and course identity, so AEONTHRA cannot queue it as a course handoff.";
      case "host-mismatch":
        return "This capture's recorded Canvas host does not match the captured Canvas URLs, so AEONTHRA refused to queue it.";
      case "course-identity-mismatch":
        return "This capture's recorded Canvas course id does not match the captured Canvas URLs, so AEONTHRA refused to queue it.";
    }
  }

  if (context === "bridge") {
    switch (code) {
      case "invalid-bundle":
        return "Queued AEONTHRA handoff was malformed and has been cleared.";
      case "wrong-source":
        return "Queued AEONTHRA handoff was cleared because its source was not an extension capture.";
      case "empty-bundle":
        return "Queued AEONTHRA handoff was cleared because it contained zero captured Canvas items.";
      case "textbook-only":
        return "Queued AEONTHRA handoff was cleared because it only contained textbook-tagged items.";
      case "missing-course-id":
        return "Queued AEONTHRA handoff was cleared because it did not record the Canvas course id.";
      case "missing-source-host":
        return "Queued AEONTHRA handoff was cleared because it did not record the Canvas source host.";
      case "missing-course-url":
        return "Queued AEONTHRA handoff was cleared because none of its preserved Canvas URLs resolved back to one course identity.";
      case "ambiguous-course-identity":
        return "Queued AEONTHRA handoff was cleared because its captured URLs did not resolve to one Canvas course identity.";
      case "host-mismatch":
        return "Queued AEONTHRA handoff was cleared because its recorded Canvas host did not match the captured Canvas URLs.";
      case "course-identity-mismatch":
        return "Queued AEONTHRA handoff was cleared because its recorded Canvas course id did not match the captured Canvas URLs.";
    }
  }

  switch (code) {
    case "invalid-bundle":
      return "Capture output was malformed, so nothing was saved or queued.";
    case "wrong-source":
      return "Capture output did not resolve to an extension capture, so nothing was saved or queued.";
    case "empty-bundle":
      return "Capture finished without any importable Canvas pages, so nothing was saved or queued.";
    case "textbook-only":
      return "Capture finished with only textbook-tagged items, so nothing was saved or queued.";
    case "missing-course-id":
      return "Capture finished without the Canvas course id required for AEONTHRA import, so nothing was saved or queued.";
    case "missing-source-host":
      return "Capture finished without the Canvas source host required for AEONTHRA import, so nothing was saved or queued.";
    case "missing-course-url":
      return "Capture finished without any preserved Canvas URL that resolved back to one course identity, so nothing was saved or queued.";
    case "ambiguous-course-identity":
      return "Capture finished without one resolved Canvas course identity, so nothing was saved or queued.";
    case "host-mismatch":
      return "Capture metadata recorded a Canvas host that did not match the captured Canvas URLs, so nothing was saved or queued.";
    case "course-identity-mismatch":
      return "Capture metadata recorded a Canvas course id that did not match the captured Canvas URLs, so nothing was saved or queued.";
  }
}

function describeCaptureFailurePhase(code: CanvasCourseKnowledgePackIssueCode): string {
  switch (code) {
    case "empty-bundle":
      return "No Importable Pages Captured";
    case "missing-course-id":
    case "missing-source-host":
    case "missing-course-url":
    case "ambiguous-course-identity":
    case "host-mismatch":
    case "course-identity-mismatch":
      return "Capture Identity Rejected";
    default:
      return "Capture Rejected";
  }
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

function toCanvasBootstrapRequest(payload: Record<string, unknown>): CanvasBootstrapRequest | null {
  if (payload.type === "aeon:get-course-context") {
    return { type: "aeon:get-course-context" };
  }

  if (payload.type === "aeon:start-course-capture" && payload.payload) {
    return {
      type: "aeon:start-course-capture",
      payload: payload.payload as CaptureStartPayload
    };
  }

  if (
    payload.type === "aeon:set-capture-control"
    && (payload.control === "pause" || payload.control === "resume" || payload.control === "cancel")
  ) {
    return {
      type: "aeon:set-capture-control",
      control: payload.control
    };
  }

  if (payload.type === "aeon:overlay-state" && payload.runtime) {
    return {
      type: "aeon:overlay-state",
      runtime: payload.runtime as RuntimeState
    };
  }

  return null;
}

function pushUniqueDiagnostic(list: string[], detail: string | null | undefined): void {
  const normalized = typeof detail === "string" ? detail.trim() : "";
  if (!normalized || list.includes(normalized)) {
    return;
  }
  list.push(normalized);
}

function formatMissingReceiverRecoveryError(error: unknown, trace: MissingReceiverRecoveryTrace): Error {
  const baseMessage = error instanceof Error
    ? error.message
    : "Could not establish connection. Receiving end does not exist.";
  const details: string[] = [];

  if (trace.bootstrapBeforeInjection.length > 0) {
    details.push(`bootstrap before injection: ${trace.bootstrapBeforeInjection.join(" | ")}`);
  }

  if (trace.injectionAttempted) {
    details.push(
      trace.injectionRecovered
        ? "content-canvas.js injection: succeeded"
        : `content-canvas.js injection: failed${trace.injectionError ? ` (${trace.injectionError})` : ""}`
    );
  } else {
    details.push("content-canvas.js injection: not attempted");
  }

  if (trace.bootstrapAfterInjection.length > 0) {
    details.push(`bootstrap after injection: ${trace.bootstrapAfterInjection.join(" | ")}`);
  }

  if (trace.autoStartSeeded || trace.autoStartSeedError) {
    details.push(
      trace.autoStartSeeded
        ? "content-canvas auto-start seed: prepared"
        : `content-canvas auto-start seed: failed${trace.autoStartSeedError ? ` (${trace.autoStartSeedError})` : ""}`
    );
  }

  if (trace.autoStartSignal) {
    details.push(`content-canvas auto-start signal: ${trace.autoStartSignal}`);
  }

  return new Error(`${baseMessage} Recovery trace: ${details.join("; ")}.`);
}

function isCaptureStartBootstrapRequest(
  request: CanvasBootstrapRequest | null
): request is Extract<CanvasBootstrapRequest, { type: "aeon:start-course-capture" }> {
  return request?.type === "aeon:start-course-capture";
}

function isStartCaptureAlreadyRunningResponse(response: unknown): boolean {
  if (!response || typeof response !== "object") {
    return false;
  }
  const typed = response as { ok?: boolean; message?: unknown };
  return typed.ok === false
    && typeof typed.message === "string"
    && /already running/i.test(typed.message);
}

function resolveCaptureStartSignal(jobId: string, signal: CaptureStartSignal): void {
  const waiter = captureStartSignalWaiters.get(jobId);
  if (!waiter) {
    bufferedCaptureStartSignals.set(jobId, signal);
    return;
  }
  captureStartSignalWaiters.delete(jobId);
  clearTimeout(waiter.timeoutId);
  waiter.resolve(signal);
}

function waitForCaptureStartSignal(jobId: string, timeoutMs = CAPTURE_START_SIGNAL_TIMEOUT_MS): Promise<CaptureStartSignal> {
  const bufferedSignal = bufferedCaptureStartSignals.get(jobId);
  if (bufferedSignal) {
    bufferedCaptureStartSignals.delete(jobId);
    return Promise.resolve(bufferedSignal);
  }

  const existing = captureStartSignalWaiters.get(jobId);
  if (existing) {
    clearTimeout(existing.timeoutId);
    captureStartSignalWaiters.delete(jobId);
  }

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      captureStartSignalWaiters.delete(jobId);
      reject(new Error(`capture start handshake timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    captureStartSignalWaiters.set(jobId, { resolve, timeoutId });
  });
}

async function seedCaptureAutoStart(tabId: number, payload: CaptureStartPayload): Promise<void> {
  await scriptingExecuteFunction(
    { tabId },
    (nodeId: string, serializedPayload: string) => {
      document.getElementById(nodeId)?.remove();
      const node = document.createElement("script");
      node.id = nodeId;
      node.type = "application/json";
      node.textContent = serializedPayload;
      (document.documentElement ?? document.body ?? document.head)?.appendChild(node);
      return true;
    },
    [CAPTURE_AUTO_START_NODE_ID, JSON.stringify(payload)],
    "MAIN"
  );
}

async function invokeCanvasBootstrap<T>(tabId: number, request: CanvasBootstrapRequest): Promise<CanvasBootstrapInvocation<T>> {
  try {
    const result = await scriptingExecuteFunction(
      { tabId },
      (bootstrapRequest: CanvasBootstrapRequest) => {
        const bootstrap = (
          window as Window & {
            __aeonthraCaptureBootstrap?: {
              getCourseContext: () => unknown;
              startCapture: (payload: unknown) => unknown;
              setCaptureControl: (control: unknown) => unknown;
              renderOverlay: (runtime: unknown) => unknown;
            };
          }
        ).__aeonthraCaptureBootstrap;

        if (!bootstrap) {
          return null;
        }

        if (bootstrapRequest.type === "aeon:get-course-context") {
          return bootstrap.getCourseContext();
        }
        if (bootstrapRequest.type === "aeon:start-course-capture") {
          return bootstrap.startCapture(bootstrapRequest.payload);
        }
        if (bootstrapRequest.type === "aeon:set-capture-control") {
          return bootstrap.setCaptureControl(bootstrapRequest.control);
        }
        if (bootstrapRequest.type === "aeon:overlay-state") {
          return bootstrap.renderOverlay(bootstrapRequest.runtime);
        }

        return null;
      },
      [request],
      "ISOLATED"
    );

    if (result === null) {
      return {
        response: null,
        reason: "bootstrap API unavailable in isolated extension context"
      };
    }

    if (typeof result === "undefined") {
      return {
        response: null,
        reason: "bootstrap executeScript returned no result"
      };
    }

    return {
      response: result as T,
      reason: null
    };
  } catch (error) {
    return {
      response: null,
      reason: error instanceof Error ? `bootstrap executeScript failed: ${error.message}` : "bootstrap executeScript failed"
    };
  }
}

async function sendCanvasMessageWithRetry<T>(
  tabId: number,
  payload: Record<string, unknown>,
  options: { attempts?: number; retryDelayMs?: number; missingReceiverStrategy?: MissingReceiverStrategy } = {}
): Promise<T> {
  const attempts = Math.max(1, options.attempts ?? 4);
  const retryDelayMs = Math.max(50, options.retryDelayMs ?? 250);
  const missingReceiverStrategy = options.missingReceiverStrategy ?? "recover";
  let lastError: unknown = null;
  let injectedCanvasScript = false;
  const bootstrapRequest = toCanvasBootstrapRequest(payload);
  const recoveryTrace: MissingReceiverRecoveryTrace = {
    bootstrapBeforeInjection: [],
    bootstrapAfterInjection: [],
    injectionAttempted: false,
    injectionRecovered: false,
    injectionError: null,
    autoStartSeeded: false,
    autoStartSeedError: null,
    autoStartSignal: null
  };
  const startCaptureRequest = isCaptureStartBootstrapRequest(bootstrapRequest) ? bootstrapRequest : null;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await sendCanvasMessage<T>(tabId, payload);
    } catch (error) {
      lastError = error;
      if (isMissingCanvasReceiverError(error)) {
        if (missingReceiverStrategy === "wait-for-receiver") {
          if (attempt === attempts - 1) {
            throw new Error("Fresh background capture tab never exposed a live Canvas receiver after page load.");
          }
          await ensureTabLoaded(tabId, 8000);
          await waitMs(retryDelayMs * (attempt + 1));
          continue;
        }
        if (bootstrapRequest) {
          const directResponse = await invokeCanvasBootstrap<T>(tabId, bootstrapRequest);
          if (directResponse.response !== null) {
            return directResponse.response;
          }
          pushUniqueDiagnostic(recoveryTrace.bootstrapBeforeInjection, directResponse.reason);
        }
        if (!injectedCanvasScript) {
          injectedCanvasScript = true;
          recoveryTrace.injectionAttempted = true;
          await ensureTabLoaded(tabId, 8000);
          if (startCaptureRequest) {
            try {
              await seedCaptureAutoStart(tabId, startCaptureRequest.payload);
              recoveryTrace.autoStartSeeded = true;
            } catch (autoStartSeedError) {
              recoveryTrace.autoStartSeeded = false;
              recoveryTrace.autoStartSeedError = autoStartSeedError instanceof Error
                ? autoStartSeedError.message
                : String(autoStartSeedError ?? "unknown auto-start seed error");
            }
          }
          try {
            await scriptingExecuteScript({ tabId }, ["content-canvas.js"]);
            recoveryTrace.injectionRecovered = true;
          } catch (injectionError) {
            recoveryTrace.injectionRecovered = false;
            recoveryTrace.injectionError = injectionError instanceof Error
              ? injectionError.message
              : String(injectionError ?? "unknown injection error");
          }
        }
        let bootstrapReportedRunning = false;
        if (bootstrapRequest) {
          const directResponse = await invokeCanvasBootstrap<T>(tabId, bootstrapRequest);
          if (directResponse.response !== null) {
            if (startCaptureRequest && isStartCaptureAlreadyRunningResponse(directResponse.response)) {
              bootstrapReportedRunning = true;
            } else {
              return directResponse.response;
            }
          }
          pushUniqueDiagnostic(
            recoveryTrace.bootstrapAfterInjection,
            bootstrapReportedRunning ? "bootstrap reported capture already running" : directResponse.reason
          );
        }
        if (startCaptureRequest && recoveryTrace.autoStartSeeded && recoveryTrace.injectionRecovered) {
          try {
            const signal = await waitForCaptureStartSignal(startCaptureRequest.payload.jobId);
            recoveryTrace.autoStartSignal = signal.detail;
            if (signal.kind === "error") {
              throw new Error(signal.detail);
            }
            return { ok: true } as T;
          } catch (autoStartError) {
            recoveryTrace.autoStartSignal = autoStartError instanceof Error
              ? autoStartError.message
              : String(autoStartError ?? "unknown auto-start handshake failure");
          }
        }
        if (attempt === attempts - 1) {
          throw formatMissingReceiverRecoveryError(error, recoveryTrace);
        }
      }
      if (!isRetryableCanvasMessageError(error) || attempt === attempts - 1) {
        throw error;
      }
      await ensureTabLoaded(tabId, 8000);
      await waitMs(retryDelayMs * (attempt + 1));
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Canvas capture tab did not respond to the extension message.");
}

async function detectCourseContext(tab: chrome.tabs.Tab | null): Promise<DetectedCourseContext> {
  if (!tab?.id) {
    return { course: null, source: "none" };
  }

  const candidate = parseCourseContextFromUrl(tab.url, tab.title ?? "Canvas Course", {
    requireKnownCanvasHost: false
  });
  if (!candidate) {
    return { course: null, source: "none" };
  }

  const fallback = parseCourseContextFromUrl(tab.url, tab.title ?? "Canvas Course", {
    requireKnownCanvasHost: true
  });
  try {
    const response = await sendCanvasMessageWithRetry<CanvasTabContextResponse>(
      tab.id,
      { type: "aeon:get-course-context" },
      { attempts: 2, retryDelayMs: 150 }
    );
    if (response?.ok && response.course) {
      return {
        course: {
          ...response.course,
          sourceTabId: tab.id
        },
        source: "live-content-script"
      };
    }
  } catch {
    return fallback
      ? {
          course: { ...fallback, sourceTabId: tab.id },
          source: "url-fallback"
        }
      : { course: null, source: "none" };
  }

  return fallback
    ? {
        course: { ...fallback, sourceTabId: tab.id },
        source: "url-fallback"
      }
    : { course: null, source: "none" };
}

async function broadcastOverlay(state: RuntimeState): Promise<void> {
  const targets = [...new Set(
    [state.sourceTabId, state.captureTabId].filter((value): value is number => typeof value === "number")
  )];
  await Promise.all(
    targets.map(async (tabId) => {
      try {
        await sendCanvasMessageWithRetry<{ ok: boolean }>(
          tabId,
          { type: "aeon:overlay-state", runtime: state },
          { attempts: 2, retryDelayMs: 100 }
        );
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

function runtimeIsBusy(runtime: RuntimeState): boolean {
  return ["starting", "discovering", "capturing", "paused"].includes(runtime.status);
}

async function buildStatusPayload(): Promise<ExtensionStatusPayload> {
  const tab = await activeTab();
  const [courseDetection, runtime, settings, history, latestId, storage, build, forensics] = await Promise.all([
    detectCourseContext(tab),
    readRuntimeState(),
    readSettings(),
    readHistorySummaries(),
    latestCaptureId(),
    estimateStorageUsage(),
    readBuildIdentity(),
    readCaptureForensics()
  ]);
  const course = courseDetection.course;
  const session = await readSessionSummary(course ?? runtime.course ?? "").catch(() => null);

  return {
    ok: true,
    activeCourse: course,
    activeCourseSource: courseDetection.source,
    workerCodeSignature: WORKER_CODE_SIGNATURE,
    runtime,
    settings,
    history,
    latestCaptureId: latestId,
    storage,
    build,
    forensics,
    session
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

async function queueBundleForWorkspace(bundle: CaptureBundle): Promise<{ bridgeReady: boolean; queuedPackId: string; handoffId: string }> {
  const inspection = inspectCanvasCourseKnowledgePack(bundle);
  if (!inspection.ok) {
    throw new Error(describeQueueableCanvasBundleIssue(inspection.code, "queue"));
  }

  const settings = await readSettings();
  const validatedUrl = validateAeonthraUrl(settings.aeonthraUrl);
  if (!validatedUrl.ok) {
    throw new Error(validatedUrl.message);
  }
  const handoff = await queuePendingHandoff(inspection.bundle);
  const tab = await openOrFocusWorkspace(validatedUrl.normalizedUrl);
  const bridgeReady = tab.id ? await requestWorkspaceImport(tab.id) : false;
  return {
    bridgeReady,
    queuedPackId: handoff.packId,
    handoffId: handoff.handoffId
  };
}

async function openWorkspaceOnly(): Promise<{ ok: true } | { ok: false; message: string }> {
  const settings = await readSettings();
  const validatedUrl = validateAeonthraUrl(settings.aeonthraUrl);
  if (!validatedUrl.ok) {
    return { ok: false, message: validatedUrl.message };
  }

  await openOrFocusWorkspace(validatedUrl.normalizedUrl);
  return { ok: true };
}

async function focusCaptureTab(): Promise<{ ok: true } | { ok: false; message: string }> {
  const runtime = await readRuntimeState();
  if (!runtime.captureTabId) {
    return { ok: false, message: "No active capture tab is available." };
  }

  const tab = await tabsGet(runtime.captureTabId);
  if (!tab?.id) {
    return { ok: false, message: "The capture tab is no longer available." };
  }

  if (typeof tab.windowId === "number") {
    await windowsUpdate(tab.windowId, { focused: true });
  }
  await tabsUpdate(tab.id, { active: true });
  return { ok: true };
}

function buildStoredRecordFromSession(session: SessionCaptureState): StoredCaptureRecord {
  const durationMs = Math.max(0, Date.parse(session.lastSeenAt) - Date.parse(session.firstSeenAt));
  const title = `${session.course.courseName} Visited Session`;
  const provisional: CaptureBundle = {
    ...session.bundle,
    source: "extension-capture",
    title,
    capturedAt: session.lastSeenAt,
    captureMeta: {
      mode: "learning",
      courseId: session.course.courseId,
      courseName: session.course.courseName,
      sourceHost: session.course.host,
      stats: {
        totalItemsVisited: session.bundle.items.length,
        totalItemsCaptured: session.bundle.items.length,
        totalItemsSkipped: 0,
        totalItemsFailed: 0,
        durationMs,
        sizeBytes: 0
      },
      warnings: session.warnings
    }
  };
  const sizeBytes = new Blob([JSON.stringify(provisional)]).size;
  const finalized: CaptureBundle = {
    ...provisional,
    captureMeta: {
      ...provisional.captureMeta,
      stats: {
        ...provisional.captureMeta!.stats!,
        sizeBytes
      }
    }
  };

  return {
    id: captureBundleId(finalized),
    title,
    capturedAt: finalized.capturedAt,
    courseId: session.course.courseId,
    courseName: session.course.courseName,
    mode: "learning",
    sizeBytes,
    stats: finalized.captureMeta!.stats!,
    warnings: session.warnings,
    bundle: finalized
  };
}

function explicitSessionTarget(message: unknown): Pick<CourseContext, "origin" | "courseId"> | null {
  if (!message || typeof message !== "object") {
    return null;
  }
  const candidate = message as { origin?: unknown; courseId?: unknown };
  return typeof candidate.origin === "string" && typeof candidate.courseId === "string"
    ? { origin: candidate.origin, courseId: candidate.courseId }
    : null;
}

async function resolveSessionTarget(message: unknown): Promise<Pick<CourseContext, "origin" | "courseId"> | null> {
  const explicit = explicitSessionTarget(message);
  if (explicit) {
    return explicit;
  }

  const runtime = await readRuntimeState();
  if (runtime.course) {
    return {
      origin: runtime.course.origin,
      courseId: runtime.course.courseId
    };
  }

  const tab = await activeTab();
  const course = (await detectCourseContext(tab)).course;
  if (!course) {
    return null;
  }

  return {
    origin: course.origin,
    courseId: course.courseId
  };
}

async function saveSessionCapture(target: Pick<CourseContext, "origin" | "courseId"> | null): Promise<{ ok: true; captureId: string; title: string; itemCount: number } | { ok: false; message: string }> {
  if (!target) {
    return { ok: false, message: "Open a Canvas course with a visited session before saving it." };
  }

  const session = await readSessionState(target);
  if (!session || session.bundle.items.length === 0) {
    return { ok: false, message: "No visited session pages are available to save yet." };
  }

  const record = buildStoredRecordFromSession(session);
  await upsertHistory(record);
  await clearSessionState(session.sessionKey);
  return {
    ok: true,
    captureId: record.id,
    title: record.title,
    itemCount: record.bundle.items.length
  };
}

async function clearSessionCapture(target: Pick<CourseContext, "origin" | "courseId"> | null): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!target) {
    return { ok: false, message: "No active course session is available to clear." };
  }

  await clearSessionState(target);
  return { ok: true };
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

  const trace = traceCanvasCourseKnowledgePack(finalized);
  const inspection = inspectCanvasCourseKnowledgePack(finalized);
  if (!inspection.ok) {
    const existingForensics = await readCaptureForensics();
    const rejectionSummary = inspection.code === "empty-bundle"
      ? summarizeTopVerdictReasons(existingForensics?.itemVerdicts ?? [])
      : [];
    const errorMessage = rejectionSummary.length > 0
      ? `${describeQueueableCanvasBundleIssue(inspection.code, "capture")} Top rejection reasons: ${rejectionSummary.join("; ")}`
      : describeQueueableCanvasBundleIssue(inspection.code, "capture");
    await clearPartialState();
    await writeCaptureForensics({
      ...(existingForensics ?? createInitialForensics(jobId, mode, course)),
      jobId,
      status: cancelled ? "cancelled" : "error",
      mode,
      course,
      discovered: existingForensics?.discovered ?? runtime.discovered,
      queueTotal: runtime.totalQueued,
      warnings,
      partialBundleItemCount: finalized.items.length,
      partialBundleSourceUrlCount: finalized.manifest.sourceUrls.length,
      lastPersistedCanonicalUrl: existingForensics?.lastPersistedCanonicalUrl ?? null,
      finalInspection: trace,
      finalPhaseLabel: cancelled ? "Partial Capture Discarded" : describeCaptureFailurePhase(inspection.code),
      finalErrorMessage: errorMessage,
      finalCaptureId: null
    });
    await updateRuntime({
      status: cancelled ? "cancelled" : "error",
      progressPct: 100,
      phaseLabel: cancelled ? "Partial Capture Discarded" : describeCaptureFailurePhase(inspection.code),
      finishedAt: new Date().toISOString(),
      captureId: null,
      warningCount: warnings.length,
      errorMessage
    });
    return;
  }

  const importableBundle = inspection.bundle;
  const sizeBytes = new Blob([JSON.stringify(importableBundle)]).size;
  const sizedImportableBundle: CaptureBundle = {
    ...importableBundle,
    captureMeta: importableBundle.captureMeta
      ? {
          ...importableBundle.captureMeta,
          stats: importableBundle.captureMeta.stats
            ? {
                ...importableBundle.captureMeta.stats,
                sizeBytes
              }
            : importableBundle.captureMeta.stats
        }
      : importableBundle.captureMeta
  };
  const captureId = captureBundleId(sizedImportableBundle);
  const record: StoredCaptureRecord = {
    id: captureId,
    title: sizedImportableBundle.title,
    capturedAt: sizedImportableBundle.capturedAt,
    courseId: course.courseId,
    courseName: course.courseName,
    mode,
    sizeBytes,
    stats: {
      ...stats,
      sizeBytes
    },
    warnings,
    bundle: sizedImportableBundle
  };

  await upsertHistory(record);
  await clearPartialState();
  await writeCaptureForensics({
    ...((await readCaptureForensics()) ?? createInitialForensics(jobId, mode, course)),
    jobId,
    status: cancelled ? "cancelled" : "completed",
    mode,
    course,
    warnings,
    partialBundleItemCount: sizedImportableBundle.items.length,
    partialBundleSourceUrlCount: sizedImportableBundle.manifest.sourceUrls.length,
    finalInspection: traceCanvasCourseKnowledgePack(sizedImportableBundle),
    finalPhaseLabel: cancelled ? "Partial Capture Saved" : "Capture Complete",
    finalErrorMessage: null,
    finalCaptureId: captureId
  });
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
    try {
      await queueBundleForWorkspace(sizedImportableBundle);
    } catch (error) {
      await updateRuntime({
        status: "completed",
        phaseLabel: "Capture Saved",
        errorMessage: error instanceof Error ? error.message : "Auto handoff could not start."
      });
    }
  }
}

async function startCapture(): Promise<{ ok: true } | { ok: false; message: string }> {
  const runtime = await readRuntimeState();
  if (runtime.status === "discovering" || runtime.status === "capturing" || runtime.status === "paused" || runtime.status === "starting") {
    return { ok: false, message: "A capture is already running." };
  }

  const tab = await activeTab();
  const courseDetection = await detectCourseContext(tab);
  const course = courseDetection.course;
  if (!course) {
    return { ok: false, message: "Open a Canvas course page first so AEONTHRA knows what to capture." };
  }
  if (!tab?.id || course.sourceTabId !== tab.id) {
    return { ok: false, message: "Capture must start from an active Canvas course tab." };
  }

  const settings = await readSettings();
  const jobId = randomJobId();
  const mode = COMPLETE_CAPTURE_MODE;
  let captureTabId = tab.id;
  const freshBackgroundTab = courseDetection.source !== "live-content-script";
  if (freshBackgroundTab) {
    const captureTab = await tabsCreate({ url: course.modulesUrl, active: false });
    if (!captureTab.id) {
      return { ok: false, message: "Chrome could not create the background capture tab." };
    }
    captureTabId = captureTab.id;
  }
  await ensureTabLoaded(captureTabId);
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
      captureTabId,
      sourceTabId: course.sourceTabId ?? null,
      captureId: null,
      errorMessage: null
    }),
    writeCaptureForensics(createInitialForensics(jobId, mode, course))
  ]);

  await broadcastOverlay(await readRuntimeState());

  const payload: CaptureStartPayload = {
    jobId,
    mode,
    course,
    settings
  };

  try {
    const response = await sendCanvasMessageWithRetry<{ ok: boolean; message?: string }>(
      captureTabId,
      {
        type: "aeon:start-course-capture",
        payload
      },
      {
        attempts: freshBackgroundTab ? 8 : 4,
        retryDelayMs: freshBackgroundTab ? 350 : 250,
        missingReceiverStrategy: freshBackgroundTab ? "wait-for-receiver" : "recover"
      }
    );
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
    const response = await sendCanvasMessageWithRetry<{ ok: boolean; message?: string }>(
      runtime.captureTabId,
      {
        type: "aeon:set-capture-control",
        control: action
      },
      { attempts: 3, retryDelayMs: 200 }
    );
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

  try {
    const result = await queueBundleForWorkspace(record.bundle);
    return { ok: true, bridgeReady: result.bridgeReady };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Unable to open AEONTHRA Classroom."
    };
  }
}

async function handleContentProgress(message: ContentProgressMessage): Promise<Record<string, unknown> | void> {
  const runtime = await readRuntimeState();
  if (runtime.jobId !== message.jobId) {
    return;
  }

  if (message.type === "aeon:job-discovered") {
    resolveCaptureStartSignal(message.jobId, { kind: "started", detail: "received aeon:job-discovered" });
    await updateRuntime({
      status: "discovering",
      phaseLabel: "Discovery Complete",
      discovered: message.counts,
      totalQueued: message.queue.length,
      course: message.course
    });
    await updateCaptureForensicsRecord((current) => current && current.jobId === message.jobId
      ? {
          ...current,
          status: "discovering",
          discovered: message.counts,
          queueTotal: message.queue.length,
          course: message.course
        }
      : current);
    return;
  }

  if (message.type === "aeon:item-captured") {
    resolveCaptureStartSignal(message.jobId, { kind: "started", detail: "received aeon:item-captured" });
    const partial = await getPartialBundle();
    const merged = mergeCaptureBundle(partial, message.item, message.resources);
    await writePartialBundle(merged);
    if (message.rawHtml) {
      await appendPartialRawHtml(message.item.canonicalUrl, message.rawHtml);
    }
    await updateCaptureForensicsRecord((current) => current && current.jobId === message.jobId
      ? {
          ...current,
          partialBundleItemCount: merged.items.length,
          partialBundleSourceUrlCount: merged.manifest.sourceUrls.length,
          lastPersistedCanonicalUrl: message.item.canonicalUrl
        }
      : current);
    return {
      persistedItemCount: merged.items.length,
      sourceUrlCount: merged.manifest.sourceUrls.length,
      canonicalUrl: message.item.canonicalUrl
    };
  }

  if (message.type === "aeon:job-item-verdict") {
    await updateCaptureForensicsRecord((current) => current && current.jobId === message.jobId
      ? {
          ...current,
          itemVerdicts: [...current.itemVerdicts, message.verdict].slice(-200)
        }
      : current);
    return;
  }

  if (message.type === "aeon:job-progress") {
    resolveCaptureStartSignal(message.jobId, { kind: "started", detail: "received aeon:job-progress" });
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
    await updateCaptureForensicsRecord((current) => current && current.jobId === message.jobId
      ? {
          ...current,
          status: runtime.status === "paused" ? "paused" : "capturing",
          queueTotal: message.totalQueued
        }
      : current);
    return;
  }

  if (message.type === "aeon:job-warning") {
    await appendPartialWarning(message.warning);
    await updateRuntime({ warningCount: runtime.warningCount + 1 });
    await updateCaptureForensicsRecord((current) => current && current.jobId === message.jobId
      ? {
          ...current,
          warnings: [...current.warnings, message.warning].slice(-200)
        }
      : current);
    return;
  }

  if (message.type === "aeon:job-complete") {
    resolveCaptureStartSignal(message.jobId, { kind: "started", detail: "received aeon:job-complete" });
    await finalizeCapture(message.jobId, message.mode, message.course, message.stats, Boolean(message.cancelled));
    return;
  }

  if (message.type === "aeon:job-error") {
    resolveCaptureStartSignal(message.jobId, { kind: "error", detail: message.errorMessage });
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
          errorMessage: "The background capture tab was closed before AEONTHRA finalized the bundle. Temporary partial state remains local, but it is not yet a saved capture."
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
    const build = await readBuildIdentity().catch(() => null);
    const forensics = await readCaptureForensics().catch(() => null);
    const session = runtime.course ? await readSessionSummary(runtime.course).catch(() => null) : null;
    return {
      ok: true as const,
      activeCourse: null,
      activeCourseSource: "none" as const,
      workerCodeSignature: WORKER_CODE_SIGNATURE,
      runtime,
      settings,
      history,
      latestCaptureId: fallbackLatestCaptureId,
      storage,
      build,
      forensics,
      session
    };
  });

  const fallbackCourse = parseCourseContextFromUrl(url, courseName || "Canvas Course", {
    requireKnownCanvasHost: true
  });
  const activeCourse = status.activeCourse ?? fallbackCourse;
  const detectionSource: CourseDetectionSource = status.activeCourseSource === "live-content-script"
    ? "live-content-script"
    : activeCourse
      ? "url-fallback"
      : "none";

  return {
    ...status,
    activeCourse,
    activeCourseSource: detectionSource,
    state: activeCourse ? "course-detected" : "idle",
    isCanvas: Boolean(activeCourse),
    courseId: activeCourse?.courseId ?? null,
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

  if (type === "aeon:item-captured" || type.startsWith("aeon:job-")) {
    const result = await handleContentProgress(message as ContentProgressMessage);
    return { state: "ok", ...(result ?? {}) };
  }

  if (type === "aeon:session-observe-page") {
    const runtime = await readRuntimeState();
    if (runtimeIsBusy(runtime)) {
      return { ok: true, ignored: true };
    }

    const observation = message as Partial<SessionObservation>;
    if (!observation.course || typeof observation.course.courseId !== "string" || typeof observation.course.origin !== "string") {
      return { ok: false, message: "Session observation was missing a valid course." };
    }
    if (!observation.item && !observation.warning) {
      return { ok: true, ignored: true };
    }

    await upsertSessionObservation({
      course: observation.course,
      item: observation.item ?? null,
      resources: Array.isArray(observation.resources) ? observation.resources : [],
      warning: observation.warning,
      observedAt: typeof observation.observedAt === "string" ? observation.observedAt : new Date().toISOString(),
      sourceTabId: sender.tab?.id ?? null
    });
    return { ok: true };
  }

  if (type === "GET_STATE" || type === "aeon:get-extension-state" || type === "getState") {
    return await getExtensionState();
  }

  if (type === "START_CAPTURE" || type === "aeon:start-capture") {
    const response = await startCapture();
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

  if (type === "aeon:save-session-capture") {
    return saveSessionCapture(await resolveSessionTarget(message));
  }

  if (type === "aeon:clear-session") {
    return clearSessionCapture(await resolveSessionTarget(message));
  }

  if (type === "aeon:focus-capture-tab") {
    return focusCaptureTab();
  }

  if (type === "HANDOFF" || type === "aeon:open-classroom") {
    return openClassroom(((message as { captureId?: string | null }).captureId) ?? null);
  }

  if (type === "aeon:open-workspace") {
    return openWorkspaceOnly();
  }

  if (type === "aeon:update-settings") {
    const nextPartial = ((message as { settings?: Record<string, unknown> }).settings) ?? {};
    const currentSettings = await readSettings();
    const rawAeonthraUrl = typeof nextPartial.aeonthraUrl === "string"
      ? nextPartial.aeonthraUrl
      : currentSettings.aeonthraUrl;
    const validatedUrl = validateAeonthraUrl(rawAeonthraUrl);
    if (!validatedUrl.ok) {
      return { ok: false, message: validatedUrl.message };
    }
    const settings = {
      ...currentSettings,
      ...nextPartial,
      aeonthraUrl: validatedUrl.normalizedUrl
    };
    await writeSettings(settings);
    return { ok: true };
  }

  if (type === "aeon:delete-capture") {
    await deleteCaptureRecord((message as { captureId: string }).captureId);
    return { ok: true };
  }

  if (type === "aeon:clear-captures") {
    await clearAllCaptures();
    await clearPendingHandoffs();
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
      const pending = await inspectPendingHandoff();
      if (pending.state === "invalid") {
        return {
          ok: true,
          relay: {
            source: BRIDGE_SOURCE,
            type: "NF_IMPORT_RESULT",
            requestId: bridgeMessage.requestId,
            success: false,
            error: describeQueueableCanvasBundleIssue(pending.code, "bridge")
          } satisfies BridgeMessage
        };
      }

      const relay: BridgeMessage = pending.state === "ok"
        ? {
            source: BRIDGE_SOURCE,
            type: "NF_PACK_READY",
            requestId: bridgeMessage.requestId,
            handoffId: pending.handoff.handoffId,
            packId: pending.handoff.packId,
            pack: pending.handoff.pack
          }
        : {
            source: BRIDGE_SOURCE,
            type: "NF_IMPORT_RESULT",
            requestId: bridgeMessage.requestId,
            success: false,
            error: "No pending AEONTHRA bundle was queued for import."
          };
      return { ok: true, relay };
    }

    if (bridgeMessage.type === "NF_PACK_ACK") {
      await clearPendingHandoff(bridgeMessage.handoffId, bridgeMessage.packId);
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
