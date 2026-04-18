import { createEmptyBundle, createManualCaptureBundle } from "@learning/schema";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  EMPTY_RUNTIME_STATE,
  readCaptureRecord,
  readCaptureForensics,
  readHistorySummaries,
  readRuntimeState,
  readSessionState,
  upsertSessionObservation,
  writeCaptureForensics,
  writeRuntimeState
} from "./storage";
import type { CaptureForensics, CourseContext, RuntimeState } from "./types";

type StorageMap = Map<string, unknown>;

type MessageHandler = (
  message: unknown,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: unknown) => void
) => boolean | void;

let messageHandler: MessageHandler | null = null;
let installedHandler: (() => void) | null = null;
let localStoreRef: StorageMap;

function createStorageArea(store: StorageMap): chrome.storage.StorageArea {
  return {
    get(keys: string | string[] | Record<string, unknown> | null, callback: (items: Record<string, unknown>) => void) {
      if (typeof keys === "string") {
        callback({ [keys]: store.get(keys) });
        return;
      }
      if (Array.isArray(keys)) {
        callback(Object.fromEntries(keys.map((key) => [key, store.get(key)])));
        return;
      }
      if (!keys) {
        callback(Object.fromEntries(store.entries()));
        return;
      }
      callback(
        Object.fromEntries(
          Object.entries(keys).map(([key, fallback]) => [key, store.has(key) ? store.get(key) : fallback])
        )
      );
    },
    set(items: Record<string, unknown>, callback?: () => void) {
      for (const [key, value] of Object.entries(items)) {
        store.set(key, value);
      }
      callback?.();
    },
    remove(keys: string | string[], callback?: () => void) {
      const values = Array.isArray(keys) ? keys : [keys];
      for (const key of values) {
        store.delete(key);
      }
      callback?.();
    }
  } as chrome.storage.StorageArea;
}

function makeCourse(courseId = "course-42"): CourseContext {
  return {
    courseId,
    courseName: "Canvas Course",
    origin: "https://canvas.example.test",
    courseUrl: `https://canvas.example.test/courses/${courseId}`,
    modulesUrl: `https://canvas.example.test/courses/${courseId}/modules`,
    host: "canvas.example.test"
  };
}

function makeQueuedCanvasBundle(input: {
  courseId?: string;
  title?: string;
} = {}) {
  const courseId = input.courseId ?? "42";
  const bundle = createManualCaptureBundle({
    title: input.title ?? "Queued Canvas Capture",
    text: "Deterministic bridge capture",
    canonicalUrl: `https://canvas.example.test/courses/${courseId}/assignments/7`,
    kind: "assignment"
  });

  return {
    ...bundle,
    source: "extension-capture" as const,
    captureMeta: {
      courseId,
      courseName: input.title ?? "Queued Canvas Capture",
      sourceHost: "canvas.example.test"
    }
  };
}

function makeForensics(jobId: string, course: CourseContext): CaptureForensics {
  return {
    jobId,
    status: "capturing",
    mode: "learning",
    course,
    startedAt: "2026-04-17T00:00:00.000Z",
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

async function dispatchMessage(message: unknown, sender: Partial<chrome.runtime.MessageSender> = {}): Promise<any> {
  const handler = messageHandler;
  if (!handler) {
    throw new Error("No service-worker message handler captured");
  }

  return await new Promise((resolve) => {
    handler(message, sender as chrome.runtime.MessageSender, (response: unknown) => resolve(response));
  });
}

describe("extension service-worker session flow", () => {
  beforeEach(async () => {
    vi.resetModules();
    messageHandler = null;
    installedHandler = null;

    const localStore: StorageMap = new Map();
    const syncStore: StorageMap = new Map();
    localStoreRef = localStore;

    (globalThis as typeof globalThis & { chrome: typeof chrome; addEventListener: typeof globalThis.addEventListener }).chrome = {
      runtime: {
        lastError: undefined,
        getURL: vi.fn((path: string) => `chrome-extension://test/${path}`),
        onInstalled: {
          addListener(callback: () => void) {
            installedHandler = callback;
          }
        },
        onMessage: {
          addListener(callback: MessageHandler) {
            messageHandler = callback;
          }
        }
      },
      storage: {
        local: createStorageArea(localStore),
        sync: createStorageArea(syncStore)
      },
      tabs: {
        onRemoved: {
          addListener: vi.fn()
        },
        query: vi.fn((_queryInfo, callback: (tabs: chrome.tabs.Tab[]) => void) => callback([])),
        get: vi.fn((_tabId: number, callback: (tab?: chrome.tabs.Tab) => void) => callback(undefined)),
        create: vi.fn((createProperties: chrome.tabs.CreateProperties, callback: (tab?: chrome.tabs.Tab) => void) => {
          callback({ id: 1, url: createProperties.url } as chrome.tabs.Tab);
        }),
        update: vi.fn((tabId: number, updateProperties: chrome.tabs.UpdateProperties, callback: (tab?: chrome.tabs.Tab) => void) => {
          callback({ id: tabId, url: updateProperties.url } as chrome.tabs.Tab);
        }),
        sendMessage: vi.fn((_tabId: number, _message: unknown, callback: (response?: unknown) => void) => callback(undefined))
      },
      windows: {
        update: vi.fn((_windowId: number, _updateInfo: chrome.windows.UpdateInfo, callback?: () => void) => callback?.())
      },
      downloads: {
        download: vi.fn((_options: chrome.downloads.DownloadOptions, callback?: (downloadId?: number) => void) => callback?.(1))
      },
      scripting: {
        executeScript: vi.fn((
          injection: chrome.scripting.ScriptInjection<unknown[], unknown>,
          callback?: (results?: chrome.scripting.InjectionResult<unknown>[]) => void
        ) => {
          const typedInjection = injection as chrome.scripting.ScriptInjection<unknown[], unknown> & {
            files?: string[];
            func?: (...args: unknown[]) => unknown;
          };
          if (typeof typedInjection.func === "function") {
            callback?.([{ frameId: 0, result: undefined } as chrome.scripting.InjectionResult<unknown>]);
            return;
          }
          callback?.();
        })
      },
      sidePanel: {
        open: vi.fn((_target: chrome.sidePanel.OpenOptions, callback?: () => void) => callback?.())
      }
    } as unknown as typeof chrome;
    (globalThis as typeof globalThis & { addEventListener: typeof globalThis.addEventListener }).addEventListener = vi.fn();
    (globalThis as typeof globalThis & { fetch: typeof fetch }).fetch = vi.fn(async (input: string | URL | Request) => {
      const url = typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
      if (url.endsWith("/build-info.json")) {
        return {
          ok: true,
          async json() {
            return {
              version: "1.2.3",
              builtAt: "2026-04-17T00:00:00.000Z",
              sourceHash: "source-hash",
              unpackedPath: "apps/extension/dist",
              markerPath: "build-info.json"
            };
          }
        } as Response;
      }
      return {
        ok: false,
        async json() {
          return {};
        }
      } as Response;
    });

    const module = await import("../service-worker");
    void module;
    if (installedHandler) {
      (installedHandler as () => void)();
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  });

  it("ignores session observations while a full capture is active", async () => {
    const course = makeCourse();
    const baseline = createManualCaptureBundle({
      title: "Visited Page",
      text: "Original session text.",
      canonicalUrl: `${course.courseUrl}/pages/week-1`,
      kind: "page"
    });
    await upsertSessionObservation({
      course,
      item: baseline.items[0] ?? null,
      resources: [],
      observedAt: "2026-04-15T00:00:00.000Z",
      sourceTabId: 12
    });

    const busyRuntime: RuntimeState = {
      ...EMPTY_RUNTIME_STATE,
      status: "capturing",
      jobId: "job-1",
      course
    };
    await writeRuntimeState(busyRuntime);

    const updated = createManualCaptureBundle({
      title: "Visited Page",
      text: "Revisited session text should be ignored while busy.",
      canonicalUrl: `${course.courseUrl}/pages/week-1`,
      kind: "page"
    });

    const response = await dispatchMessage(
      {
        type: "aeon:session-observe-page",
        course,
        item: updated.items[0] ?? null,
        resources: [],
        observedAt: "2026-04-15T00:00:10.000Z"
      },
      { tab: { id: 99 } as chrome.tabs.Tab }
    );

    expect(response).toEqual({ ok: true, ignored: true });
    const session = await readSessionState(course);
    expect(session?.bundle.items).toHaveLength(1);
    expect(session?.bundle.items[0]?.plainText).toContain("Original session text.");
    expect(session?.lastSeenAt).toBe("2026-04-15T00:00:00.000Z");
  });

  it("saves the current visited session into history and clears the session state", async () => {
    const course = makeCourse();
    const bundle = createManualCaptureBundle({
      title: "Visited Discussion",
      text: "This page was actually visited by the learner.",
      canonicalUrl: `${course.courseUrl}/discussion_topics/9`,
      kind: "discussion"
    });

    await upsertSessionObservation({
      course,
      item: bundle.items[0] ?? null,
      resources: [],
      observedAt: "2026-04-15T00:01:00.000Z",
      sourceTabId: 21
    });
    await writeRuntimeState(EMPTY_RUNTIME_STATE);

    const response = await dispatchMessage({
      type: "aeon:save-session-capture",
      origin: course.origin,
      courseId: course.courseId
    });

    expect(response).toMatchObject({
      ok: true,
      itemCount: 1
    });

    const history = await readHistorySummaries();
    expect(history).toHaveLength(1);
    expect(await readCaptureRecord(history[0]!.id)).not.toBeNull();
    expect(await readSessionState(course)).toBeNull();
  });

  it("clears a visited session without touching saved capture history", async () => {
    const course = makeCourse("course-77");
    const bundle = createManualCaptureBundle({
      title: "Visited Assignment",
      text: "Session content to clear.",
      canonicalUrl: `${course.courseUrl}/assignments/7`,
      kind: "assignment"
    });

    await upsertSessionObservation({
      course,
      item: bundle.items[0] ?? null,
      resources: [],
      observedAt: "2026-04-15T00:02:00.000Z",
      sourceTabId: 31
    });

    const response = await dispatchMessage({
      type: "aeon:clear-session",
      origin: course.origin,
      courseId: course.courseId
    });

    expect(response).toEqual({ ok: true });
    expect(await readSessionState(course)).toBeNull();
    expect(await readHistorySummaries()).toHaveLength(0);
  });

  it("rejects malformed pending handoffs instead of relaying them as bridge packs", async () => {
    localStoreRef.set("aeonthra:pending-bundle", { not: "a-capture-bundle" });

    const response = await dispatchMessage({
      type: "bridge-message",
      payload: {
        source: "learning-freedom-bridge",
        type: "NF_IMPORT_REQUEST",
        requestId: "request-1"
      }
    });

    expect(response).toEqual({
      ok: true,
      relay: {
        source: "learning-freedom-bridge",
        type: "NF_IMPORT_RESULT",
        requestId: "request-1",
        success: false,
        error: "Queued AEONTHRA handoff was malformed and has been cleared."
      }
    });
    expect(localStoreRef.has("aeonthra:pending-bundle")).toBe(false);
  });

  it("clears schema-valid pending bundles whose source is not an extension capture", async () => {
    localStoreRef.set("aeonthra:pending-bundle", createManualCaptureBundle({
      title: "Manual Notes",
      text: "This should never be relayed as a queued extension handoff."
    }));

    const response = await dispatchMessage({
      type: "bridge-message",
      payload: {
        source: "learning-freedom-bridge",
        type: "NF_IMPORT_REQUEST",
        requestId: "request-2"
      }
    });

    expect(response).toEqual({
      ok: true,
      relay: {
        source: "learning-freedom-bridge",
        type: "NF_IMPORT_RESULT",
        requestId: "request-2",
        success: false,
        error: "Queued AEONTHRA handoff was cleared because its source was not an extension capture."
      }
    });
    expect(localStoreRef.has("aeonthra:pending-bundle")).toBe(false);
  });

  it("relays queued handoffs with request and handoff correlation fields", async () => {
    const bundle = makeQueuedCanvasBundle();
    localStoreRef.set("aeonthra:pending-bundle", bundle);

    const response = await dispatchMessage({
      type: "bridge-message",
      payload: {
        source: "learning-freedom-bridge",
        type: "NF_IMPORT_REQUEST",
        requestId: "request-3"
      }
    });

    expect(response.ok).toBe(true);
    expect(response.relay).toMatchObject({
      source: "learning-freedom-bridge",
      type: "NF_PACK_READY",
      requestId: "request-3",
      packId: expect.any(String),
      handoffId: expect.any(String),
      pack: bundle
    });
    expect(localStoreRef.has("aeonthra:pending-handoffs")).toBe(true);
    expect(localStoreRef.has("aeonthra:pending-bundle")).toBe(false);
  });

  it("persists aeon:item-captured messages into the partial bundle and forensic record", async () => {
    const course = makeCourse("42");
    const itemBundle = createManualCaptureBundle({
      title: "Assignment 7",
      text: "Assignment body with enough detail to prove the item persisted.",
      canonicalUrl: `${course.courseUrl}/assignments/7`,
      kind: "assignment"
    });
    await writeRuntimeState({
      ...EMPTY_RUNTIME_STATE,
      status: "capturing",
      jobId: "job-captured",
      mode: "learning",
      course,
      startedAt: "2026-04-16T00:10:00.000Z"
    });
    await writeCaptureForensics(makeForensics("job-captured", course));

    const response = await dispatchMessage({
      type: "aeon:item-captured",
      jobId: "job-captured",
      item: itemBundle.items[0]!,
      resources: [],
      rawHtml: "<article>Assignment body</article>"
    });

    expect(response).toMatchObject({
      ok: true,
      state: "ok",
      persistedItemCount: 1,
      sourceUrlCount: 1,
      canonicalUrl: `${course.courseUrl}/assignments/7`
    });

    expect(localStoreRef.get("aeonthra:partial-raw-html")).toEqual({
      [`${course.courseUrl}/assignments/7`]: "<article>Assignment body</article>"
    });
    expect(localStoreRef.get("aeonthra:partial-bundle")).toMatchObject({
      items: [
        expect.objectContaining({
          canonicalUrl: `${course.courseUrl}/assignments/7`,
          title: "Assignment 7"
        })
      ],
      manifest: expect.objectContaining({
        itemCount: 1
      })
    });
    expect(await readCaptureForensics()).toMatchObject({
      jobId: "job-captured",
      partialBundleItemCount: 1,
      partialBundleSourceUrlCount: 1,
      lastPersistedCanonicalUrl: `${course.courseUrl}/assignments/7`
    });
  });

  it("runs complete snapshot capture in the active Canvas tab without opening a duplicate page", async () => {
    const course = makeCourse("42");
    let captureStartAttempts = 0;

    chrome.tabs.query = vi.fn((_queryInfo, callback: (tabs: chrome.tabs.Tab[]) => void) => {
      callback([
        {
          id: 77,
          url: course.modulesUrl,
          title: `${course.courseName} - Canvas`,
          status: "complete"
        } as chrome.tabs.Tab
      ]);
    }) as unknown as typeof chrome.tabs.query;

    chrome.tabs.get = vi.fn((tabId: number, callback: (tab?: chrome.tabs.Tab) => void) => {
      callback({ id: tabId, status: "complete" } as chrome.tabs.Tab);
    }) as unknown as typeof chrome.tabs.get;

    chrome.tabs.sendMessage = vi.fn((tabId: number, message: unknown, callback: (response?: unknown) => void) => {
      const typed = message as { type?: string; payload?: { mode?: string } };
      chrome.runtime.lastError = undefined;

      if (typed.type === "aeon:get-course-context" && tabId === 77) {
        callback({ ok: true, course });
        return;
      }

      if (typed.type === "aeon:start-course-capture" && tabId === 77) {
        captureStartAttempts += 1;
        if (captureStartAttempts === 1) {
          chrome.runtime.lastError = { message: "Could not establish connection. Receiving end does not exist." } as chrome.runtime.LastError;
          callback(undefined);
          chrome.runtime.lastError = undefined;
          return;
        }
        callback({ ok: true });
        return;
      }

      callback({ ok: true });
    }) as unknown as typeof chrome.tabs.sendMessage;

    const response = await dispatchMessage({
      type: "START_CAPTURE",
      mode: "learning"
    });

    expect(response).toMatchObject({
      ok: true,
      state: "capturing"
    });
    expect(captureStartAttempts).toBe(2);
    expect(chrome.tabs.create).not.toHaveBeenCalled();
    expect(chrome.scripting.executeScript).toHaveBeenCalledWith(
      {
        target: { tabId: 77 },
        files: ["content-canvas.js"]
      },
      expect.any(Function)
    );

    const runtime = await readRuntimeState();
    expect(runtime).toMatchObject({
      status: "starting",
      mode: "complete",
      course,
      captureTabId: 77,
      sourceTabId: 77
    });

    expect(await readCaptureForensics()).toMatchObject({
      jobId: runtime.jobId,
      mode: "complete",
      course
    });

    const startCalls = vi.mocked(chrome.tabs.sendMessage).mock.calls
      .filter(([, message]) => (message as { type?: string }).type === "aeon:start-course-capture");
    expect(startCalls).toHaveLength(2);
    expect(startCalls.every(([tabId]) => tabId === 77)).toBe(true);
    expect((startCalls[0]?.[1] as { payload?: { mode?: string } }).payload?.mode).toBe("complete");
  });

  it("falls back to a fresh background capture tab when the active tab only has URL-based course detection", async () => {
    const course = makeCourse("42");
    let freshTabStartAttempts = 0;

    chrome.tabs.query = vi.fn((_queryInfo, callback: (tabs: chrome.tabs.Tab[]) => void) => {
      callback([
        {
          id: 55,
          url: course.modulesUrl,
          title: `${course.courseName} - Canvas`,
          status: "complete"
        } as chrome.tabs.Tab
      ]);
    }) as unknown as typeof chrome.tabs.query;

    chrome.tabs.create = vi.fn((createProperties: chrome.tabs.CreateProperties, callback: (tab?: chrome.tabs.Tab) => void) => {
      callback({ id: 88, url: createProperties.url, status: "complete" } as chrome.tabs.Tab);
    }) as unknown as typeof chrome.tabs.create;

    chrome.tabs.get = vi.fn((tabId: number, callback: (tab?: chrome.tabs.Tab) => void) => {
      callback({ id: tabId, status: "complete" } as chrome.tabs.Tab);
    }) as unknown as typeof chrome.tabs.get;

    chrome.tabs.sendMessage = vi.fn((tabId: number, message: unknown, callback: (response?: unknown) => void) => {
      const typed = message as { type?: string };
      chrome.runtime.lastError = undefined;

      if (typed.type === "aeon:get-course-context" && tabId === 55) {
        chrome.runtime.lastError = { message: "Could not establish connection. Receiving end does not exist." } as chrome.runtime.LastError;
        callback(undefined);
        chrome.runtime.lastError = undefined;
        return;
      }

      if (typed.type === "aeon:start-course-capture" && tabId === 88) {
        freshTabStartAttempts += 1;
        if (freshTabStartAttempts < 3) {
          chrome.runtime.lastError = { message: "Could not establish connection. Receiving end does not exist." } as chrome.runtime.LastError;
          callback(undefined);
          chrome.runtime.lastError = undefined;
          return;
        }
        callback({ ok: true });
        return;
      }

      callback({ ok: true });
    }) as unknown as typeof chrome.tabs.sendMessage;

    const response = await dispatchMessage({
      type: "START_CAPTURE",
      mode: "learning"
    });

    expect(response).toMatchObject({
      ok: true,
      state: "capturing"
    });
    expect(chrome.tabs.create).toHaveBeenCalledWith(
      { url: course.modulesUrl, active: false },
      expect.any(Function)
    );

    const startCalls = vi.mocked(chrome.tabs.sendMessage).mock.calls
      .filter(([, message]) => (message as { type?: string }).type === "aeon:start-course-capture");
    expect(startCalls).toHaveLength(3);
    expect(startCalls.every(([tabId]) => tabId === 88)).toBe(true);
    expect(
      vi.mocked(chrome.scripting.executeScript).mock.calls.some(([injection]) => {
        const typedInjection = injection as chrome.scripting.ScriptInjection<unknown[], unknown> & {
          files?: string[];
          target: { tabId?: number };
        };
        return typedInjection.target?.tabId === 88 && Array.isArray(typedInjection.files);
      })
    ).toBe(false);

    const runtime = await readRuntimeState();
    expect(runtime).toMatchObject({
      status: "starting",
      mode: "complete",
      captureTabId: 88,
      sourceTabId: 55
    });
    expect(runtime.course?.courseId).toBe(course.courseId);
    expect(runtime.course?.origin).toBe(course.origin);
  });

  it("starts capture through the injected bootstrap when the Canvas message receiver never appears", async () => {
    const course = makeCourse("42");
    let contentCanvasInjected = false;

    chrome.tabs.query = vi.fn((_queryInfo, callback: (tabs: chrome.tabs.Tab[]) => void) => {
      callback([
        {
          id: 77,
          url: course.modulesUrl,
          title: `${course.courseName} - Canvas`,
          status: "complete"
        } as chrome.tabs.Tab
      ]);
    }) as unknown as typeof chrome.tabs.query;

    chrome.tabs.get = vi.fn((tabId: number, callback: (tab?: chrome.tabs.Tab) => void) => {
      callback({ id: tabId, status: "complete" } as chrome.tabs.Tab);
    }) as unknown as typeof chrome.tabs.get;

    chrome.tabs.sendMessage = vi.fn((tabId: number, message: unknown, callback: (response?: unknown) => void) => {
      const typed = message as { type?: string };
      chrome.runtime.lastError = undefined;

      if (typed.type === "aeon:get-course-context" && tabId === 77) {
        callback({ ok: true, course });
        return;
      }

      if (typed.type === "aeon:start-course-capture" && tabId === 77) {
        chrome.runtime.lastError = { message: "Could not establish connection. Receiving end does not exist." } as chrome.runtime.LastError;
        callback(undefined);
        chrome.runtime.lastError = undefined;
        return;
      }

      callback({ ok: true });
    }) as unknown as typeof chrome.tabs.sendMessage;

    chrome.scripting.executeScript = vi.fn((
      injection: chrome.scripting.ScriptInjection<unknown[], unknown>,
      callback?: (results?: chrome.scripting.InjectionResult<unknown>[]) => void
    ) => {
      const typedInjection = injection as chrome.scripting.ScriptInjection<unknown[], unknown> & {
        files?: string[];
        func?: (...args: unknown[]) => unknown;
      };

      if (typedInjection.files?.includes("content-canvas.js")) {
        contentCanvasInjected = true;
        callback?.();
        return;
      }

      if (typeof typedInjection.func === "function") {
        callback?.([
          {
            frameId: 0,
            result: contentCanvasInjected && typedInjection.world === "ISOLATED" ? { ok: true } : null
          } as chrome.scripting.InjectionResult<unknown>
        ]);
        return;
      }

      callback?.();
    }) as unknown as typeof chrome.scripting.executeScript;

    const response = await dispatchMessage({
      type: "START_CAPTURE",
      mode: "learning"
    });

    expect(response).toMatchObject({
      ok: true,
      state: "capturing"
    });
    expect(chrome.tabs.create).not.toHaveBeenCalled();
    expect(chrome.scripting.executeScript).toHaveBeenCalledWith(
      {
        target: { tabId: 77 },
        files: ["content-canvas.js"]
      },
      expect.any(Function)
    );

    const startCalls = vi.mocked(chrome.tabs.sendMessage).mock.calls
      .filter(([, message]) => (message as { type?: string }).type === "aeon:start-course-capture");
    expect(startCalls).toHaveLength(1);

    const bootstrapCalls = vi.mocked(chrome.scripting.executeScript).mock.calls
      .filter(([injection]) => {
        const typedInjection = injection as chrome.scripting.ScriptInjection<unknown[], unknown> & {
          func?: (...args: unknown[]) => unknown;
        };
        return typeof typedInjection.func === "function"
          && (typedInjection.world === undefined || typedInjection.world === "ISOLATED");
      });
    expect(bootstrapCalls.length).toBeGreaterThanOrEqual(2);
    expect(
      bootstrapCalls.every(([injection]) =>
        (injection as chrome.scripting.ScriptInjection<unknown[], unknown>).world === "ISOLATED"
      )
    ).toBe(true);

    const runtime = await readRuntimeState();
    expect(runtime).toMatchObject({
      status: "starting",
      mode: "complete",
      course,
      captureTabId: 77,
      sourceTabId: 77
    });
  });

  it("records recovery-trace details when the receiver never recovers", async () => {
    const course = makeCourse("42");

    chrome.tabs.query = vi.fn((_queryInfo, callback: (tabs: chrome.tabs.Tab[]) => void) => {
      callback([
        {
          id: 77,
          url: course.modulesUrl,
          title: `${course.courseName} - Canvas`,
          status: "complete"
        } as chrome.tabs.Tab
      ]);
    }) as unknown as typeof chrome.tabs.query;

    chrome.tabs.get = vi.fn((tabId: number, callback: (tab?: chrome.tabs.Tab) => void) => {
      callback({ id: tabId, status: "complete" } as chrome.tabs.Tab);
    }) as unknown as typeof chrome.tabs.get;

    chrome.tabs.sendMessage = vi.fn((tabId: number, message: unknown, callback: (response?: unknown) => void) => {
      const typed = message as { type?: string };
      chrome.runtime.lastError = undefined;

      if (typed.type === "aeon:get-course-context" && tabId === 77) {
        callback({ ok: true, course });
        return;
      }

      if (typed.type === "aeon:start-course-capture" && tabId === 77) {
        chrome.runtime.lastError = { message: "Could not establish connection. Receiving end does not exist." } as chrome.runtime.LastError;
        callback(undefined);
        chrome.runtime.lastError = undefined;
        return;
      }

      callback({ ok: true });
    }) as unknown as typeof chrome.tabs.sendMessage;

    chrome.scripting.executeScript = vi.fn((
      injection: chrome.scripting.ScriptInjection<unknown[], unknown>,
      callback?: (results?: chrome.scripting.InjectionResult<unknown>[]) => void
    ) => {
      const typedInjection = injection as chrome.scripting.ScriptInjection<unknown[], unknown> & {
        files?: string[];
        func?: (...args: unknown[]) => unknown;
      };

      if (typedInjection.files?.includes("content-canvas.js")) {
        chrome.runtime.lastError = {
          message: "Cannot access contents of url \"https://canvas.example.test/courses/42/modules\"."
        } as chrome.runtime.LastError;
        callback?.();
        chrome.runtime.lastError = undefined;
        return;
      }

      if (typeof typedInjection.func === "function") {
        callback?.([
          {
            frameId: 0,
            result: null
          } as chrome.scripting.InjectionResult<unknown>
        ]);
        return;
      }

      callback?.();
    }) as unknown as typeof chrome.scripting.executeScript;

    const response = await dispatchMessage({
      type: "START_CAPTURE",
      mode: "learning"
    });

    expect(response).toMatchObject({
      ok: false,
      state: "idle"
    });
    expect((response as { message?: string }).message).toContain("Recovery trace:");
    expect((response as { message?: string }).message).toContain("bootstrap before injection: bootstrap API unavailable in isolated extension context");
    expect((response as { message?: string }).message).toContain("content-canvas.js injection: failed");
    expect((response as { message?: string }).message).toContain("bootstrap after injection: bootstrap API unavailable in isolated extension context");

    const runtime = await readRuntimeState();
    expect(runtime.status).toBe("error");
    expect(runtime.errorMessage).toContain("Recovery trace:");
  });

  it("returns build identity and capture forensics in extension state", async () => {
    const course = makeCourse("42");
    await writeRuntimeState({
      ...EMPTY_RUNTIME_STATE,
      status: "capturing",
      jobId: "job-state",
      mode: "learning",
      course,
      startedAt: "2026-04-16T00:15:00.000Z"
    });
    await writeCaptureForensics({
      ...makeForensics("job-state", course),
      queueTotal: 37,
      partialBundleItemCount: 12,
      partialBundleSourceUrlCount: 12
    });

    const response = await dispatchMessage({ type: "aeon:get-extension-state" });

    expect(response).toMatchObject({
      ok: true,
      activeCourseSource: "none",
      workerCodeSignature: "sw-recovery-trace-v5",
      build: {
        version: "1.2.3",
        sourceHash: "source-hash",
        unpackedPath: "apps/extension/dist",
        markerPath: "build-info.json"
      },
      forensics: {
        jobId: "job-state",
        queueTotal: 37,
        partialBundleItemCount: 12,
        partialBundleSourceUrlCount: 12
      }
    });
  });

  it("starts capture through DOM-seeded auto-start when the receiver and bootstrap both stay unavailable", async () => {
    const course = makeCourse("42");
    let seededPayload: { jobId: string } | null = null;

    chrome.tabs.query = vi.fn((_queryInfo, callback: (tabs: chrome.tabs.Tab[]) => void) => {
      callback([
        {
          id: 77,
          url: course.modulesUrl,
          title: `${course.courseName} - Canvas`,
          status: "complete"
        } as chrome.tabs.Tab
      ]);
    }) as unknown as typeof chrome.tabs.query;

    chrome.tabs.get = vi.fn((tabId: number, callback: (tab?: chrome.tabs.Tab) => void) => {
      callback({ id: tabId, status: "complete" } as chrome.tabs.Tab);
    }) as unknown as typeof chrome.tabs.get;

    chrome.tabs.sendMessage = vi.fn((tabId: number, message: unknown, callback: (response?: unknown) => void) => {
      const typed = message as { type?: string };
      chrome.runtime.lastError = undefined;

      if (typed.type === "aeon:get-course-context" && tabId === 77) {
        callback({ ok: true, course });
        return;
      }

      if (typed.type === "aeon:start-course-capture" && tabId === 77) {
        chrome.runtime.lastError = { message: "Could not establish connection. Receiving end does not exist." } as chrome.runtime.LastError;
        callback(undefined);
        chrome.runtime.lastError = undefined;
        return;
      }

      callback({ ok: true });
    }) as unknown as typeof chrome.tabs.sendMessage;

    chrome.scripting.executeScript = vi.fn((
      injection: chrome.scripting.ScriptInjection<unknown[], unknown>,
      callback?: (results?: chrome.scripting.InjectionResult<unknown>[]) => void
    ) => {
      const typedInjection = injection as chrome.scripting.ScriptInjection<unknown[], unknown> & {
        args?: unknown[];
        files?: string[];
        func?: (...args: unknown[]) => unknown;
      };

      if (typedInjection.world === "MAIN" && Array.isArray(typedInjection.args) && typeof typedInjection.args[1] === "string") {
        seededPayload = JSON.parse(typedInjection.args[1] as string) as { jobId: string };
        callback?.([{ frameId: 0, result: true } as chrome.scripting.InjectionResult<unknown>]);
        return;
      }

      if (typedInjection.files?.includes("content-canvas.js")) {
        const pendingJobId = seededPayload?.jobId;
        if (pendingJobId) {
          void Promise.resolve().then(async () => {
            await dispatchMessage({
              type: "aeon:job-progress",
              jobId: pendingJobId,
              phaseLabel: "Discovering Course",
              currentTitle: course.courseName,
              currentUrl: course.courseUrl,
              completedCount: 0,
              skippedCount: 0,
              failedCount: 0,
              totalQueued: 0,
              progressPct: 3
            });
          });
        }
        callback?.();
        return;
      }

      if (typeof typedInjection.func === "function") {
        callback?.([{ frameId: 0, result: null } as chrome.scripting.InjectionResult<unknown>]);
        return;
      }

      callback?.();
    }) as unknown as typeof chrome.scripting.executeScript;

    const response = await dispatchMessage({
      type: "START_CAPTURE",
      mode: "learning"
    });

    expect(response).toMatchObject({
      ok: true,
      state: "capturing"
    });
    expect(seededPayload).not.toBeNull();

    const executeCalls = vi.mocked(chrome.scripting.executeScript).mock.calls;
    expect(
      executeCalls.some(([injection]) =>
        (injection as chrome.scripting.ScriptInjection<unknown[], unknown>).world === "MAIN"
      )
    ).toBe(true);

    const runtime = await readRuntimeState();
    expect(runtime).toMatchObject({
      status: "capturing",
      phaseLabel: "Discovering Course",
      course,
      captureTabId: 77,
      sourceTabId: 77
    });
  });

  it("focuses the active capture tab on demand", async () => {
    const course = makeCourse("42");
    await writeRuntimeState({
      ...EMPTY_RUNTIME_STATE,
      status: "capturing",
      jobId: "job-focus",
      course,
      captureTabId: 55
    });

    chrome.tabs.get = vi.fn((tabId: number, callback: (tab?: chrome.tabs.Tab) => void) => {
      callback({ id: tabId, windowId: 9, status: "complete" } as chrome.tabs.Tab);
    }) as unknown as typeof chrome.tabs.get;

    chrome.tabs.update = vi.fn((tabId: number, updateProperties: chrome.tabs.UpdateProperties, callback: (tab?: chrome.tabs.Tab) => void) => {
      callback({ id: tabId, windowId: 9, ...updateProperties } as chrome.tabs.Tab);
    }) as unknown as typeof chrome.tabs.update;

    chrome.windows.update = vi.fn((_windowId: number, _updateInfo: chrome.windows.UpdateInfo, callback?: () => void) => callback?.()) as unknown as typeof chrome.windows.update;

    const response = await dispatchMessage({ type: "aeon:focus-capture-tab" });

    expect(response).toEqual({ ok: true });
    expect(chrome.windows.update).toHaveBeenCalledWith(9, { focused: true }, expect.any(Function));
    expect(chrome.tabs.update).toHaveBeenCalledWith(55, { active: true }, expect.any(Function));
  });

  it("records top rejection reasons when a capture still finalizes as empty", async () => {
    const course = makeCourse("course-empty-reasons");
    await writeRuntimeState({
      ...EMPTY_RUNTIME_STATE,
      status: "capturing",
      jobId: "job-empty-reasons",
      mode: "learning",
      course,
      startedAt: "2026-04-16T00:20:00.000Z"
    });
    await writeCaptureForensics({
      ...makeForensics("job-empty-reasons", course),
      itemVerdicts: [
        {
          queueItemId: "discussion-1",
          type: "discussion",
          title: "Week 1 Debate",
          url: `${course.courseUrl}/discussion_topics/1`,
          strategy: "html-fetch",
          status: "skipped",
          message: "Discussion \"Week 1 Debate\" did not preserve enough importable prompt text after filtering."
        },
        {
          queueItemId: "discussion-2",
          type: "discussion",
          title: "Week 2 Debate",
          url: `${course.courseUrl}/discussion_topics/2`,
          strategy: "html-fetch",
          status: "skipped",
          message: "Discussion \"Week 1 Debate\" did not preserve enough importable prompt text after filtering."
        },
        {
          queueItemId: "assignment-1",
          type: "assignment",
          title: "Essay 1",
          url: `${course.courseUrl}/assignments/9`,
          strategy: "html-fetch",
          status: "failed",
          message: "AEONTHRA could not persist \"Essay 1\" into the partial bundle."
        }
      ]
    });
    localStoreRef.set("aeonthra:partial-bundle", createEmptyBundle("AEONTHRA Capture"));

    await dispatchMessage({
      type: "aeon:job-complete",
      jobId: "job-empty-reasons",
      mode: "learning",
      course,
      stats: {
        totalItemsVisited: 3,
        totalItemsCaptured: 0,
        totalItemsSkipped: 2,
        totalItemsFailed: 1,
        durationMs: 400
      }
    });

    const runtime = await readRuntimeState();
    const forensics = await readCaptureForensics();

    expect(runtime.errorMessage).toContain("Top rejection reasons:");
    expect(runtime.errorMessage).toContain("2x Discussion \"Week 1 Debate\" did not preserve enough importable prompt text after filtering.");
    expect(forensics).toMatchObject({
      jobId: "job-empty-reasons",
      finalPhaseLabel: "No Importable Pages Captured",
      finalInspection: {
        code: "empty-bundle"
      }
    });
    expect(forensics?.finalErrorMessage).toContain("Top rejection reasons:");
  });

  it("does not save empty extension captures into history", async () => {
    const course = makeCourse("course-empty");
    await writeRuntimeState({
      ...EMPTY_RUNTIME_STATE,
      status: "capturing",
      jobId: "job-empty",
      mode: "learning",
      course,
      startedAt: "2026-04-16T00:00:00.000Z"
    });
    localStoreRef.set("aeonthra:partial-bundle", createEmptyBundle("AEONTHRA Capture"));

    await dispatchMessage({
      type: "aeon:job-complete",
      jobId: "job-empty",
      mode: "learning",
      course,
      stats: {
        totalItemsVisited: 1,
        totalItemsCaptured: 0,
        totalItemsSkipped: 1,
        totalItemsFailed: 0,
        durationMs: 250
      }
    });

    expect(await readHistorySummaries()).toHaveLength(0);
    expect(await readCaptureRecord("job-empty")).toBeNull();

    const runtime = await readRuntimeState();
    expect(runtime).toMatchObject({
      status: "error",
      phaseLabel: "No Importable Pages Captured",
      errorMessage: "Capture finished without any importable Canvas pages, so nothing was saved or queued."
    });
    expect(localStoreRef.has("aeonthra:partial-bundle")).toBe(false);
  });

  it("reports identity rejection when a captured bundle mixes equivalent same-course hosts", async () => {
    const course = makeCourse("42");
    const syllabusBundle = createManualCaptureBundle({
      title: "Canvas Course Syllabus",
      text: "Syllabus content with enough body text to save the capture.",
      canonicalUrl: `${course.courseUrl}/assignments/syllabus`,
      kind: "syllabus"
    });
    const mixedHostAssignment = createManualCaptureBundle({
      title: "Assignment 1",
      text: "Assignment body with enough content to preserve in the capture bundle.",
      canonicalUrl: "https://school.instructure.com/courses/42/assignments/7",
      kind: "assignment"
    });
    const partialBundle = {
      ...syllabusBundle,
      source: "extension-capture" as const,
      title: "Canvas Course"
    };
    partialBundle.items = [...partialBundle.items, mixedHostAssignment.items[0]!];
    partialBundle.manifest = {
      itemCount: partialBundle.items.length,
      resourceCount: 0,
      captureKinds: partialBundle.items.map((item) => item.kind),
      sourceUrls: partialBundle.items.map((item) => item.canonicalUrl)
    };

    await writeRuntimeState({
      ...EMPTY_RUNTIME_STATE,
      status: "capturing",
      jobId: "job-mixed-hosts",
      mode: "learning",
      course,
      startedAt: "2026-04-16T00:05:00.000Z"
    });
    localStoreRef.set("aeonthra:partial-bundle", partialBundle);

    await dispatchMessage({
      type: "aeon:job-complete",
      jobId: "job-mixed-hosts",
      mode: "learning",
      course,
      stats: {
        totalItemsVisited: 2,
        totalItemsCaptured: 2,
        totalItemsSkipped: 0,
        totalItemsFailed: 0,
        durationMs: 450
      }
    });

    expect(await readHistorySummaries()).toHaveLength(0);
    const runtime = await readRuntimeState();
    expect(runtime).toMatchObject({
      status: "error",
      phaseLabel: "Capture Identity Rejected",
      errorMessage: "Capture finished without one resolved Canvas course identity, so nothing was saved or queued."
    });
    expect(localStoreRef.has("aeonthra:partial-bundle")).toBe(false);
  });
});
