import { createManualCaptureBundle } from "@learning/schema";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  EMPTY_RUNTIME_STATE,
  readCaptureRecord,
  readHistorySummaries,
  readSessionState,
  upsertSessionObservation,
  writeRuntimeState
} from "./storage";
import type { CourseContext, RuntimeState } from "./types";

type StorageMap = Map<string, unknown>;

type MessageHandler = (
  message: unknown,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: unknown) => void
) => boolean | void;

let messageHandler: MessageHandler | null = null;
let installedHandler: (() => void) | null = null;

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

    (globalThis as typeof globalThis & { chrome: typeof chrome; addEventListener: typeof globalThis.addEventListener }).chrome = {
      runtime: {
        lastError: undefined,
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
        query: vi.fn(),
        get: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        sendMessage: vi.fn()
      },
      windows: {
        update: vi.fn()
      },
      downloads: {
        download: vi.fn()
      },
      sidePanel: {
        open: vi.fn()
      }
    } as unknown as typeof chrome;
    (globalThis as typeof globalThis & { addEventListener: typeof globalThis.addEventListener }).addEventListener = vi.fn();

    const module = await import("../service-worker");
    void module;
    if (installedHandler) {
      (installedHandler as () => void)();
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
});
