import { beforeEach, describe, expect, it } from "vitest";
import {
  createBridgeHandoffEnvelope,
  createManualCaptureBundle,
  type CaptureBundle
} from "@learning/schema";
import {
  DEFAULT_SETTINGS,
  clearPendingHandoff,
  clearPendingHandoffs,
  inspectPendingHandoff,
  queuePendingHandoff,
  clearSessionState,
  readCaptureRecord,
  readHistorySummaries,
  readPendingHandoffQueue,
  readSettings,
  readSessionState,
  upsertHistory,
  upsertSessionObservation,
  writeSettings
} from "./storage";
import type { CourseContext, ExtensionSettings, StoredCaptureRecord } from "./types";

type StorageMap = Map<string, unknown>;

function createStorageArea(store: StorageMap): chrome.storage.LocalStorageArea {
  return {
    QUOTA_BYTES: 0,
    get(keys: string | string[] | Record<string, unknown> | null, callback: (items: Record<string, unknown>) => void) {
      if (typeof keys === "string") {
        callback({ [keys]: store.get(keys) });
        return;
      }
      if (Array.isArray(keys)) {
        callback(
          Object.fromEntries(keys.map((key) => [key, store.get(key)]))
        );
        return;
      }
      if (!keys) {
        callback(Object.fromEntries(store.entries()));
        return;
      }
      const seeded = Object.entries(keys).map(([key, fallback]) => [key, store.has(key) ? store.get(key) : fallback]);
      callback(Object.fromEntries(seeded));
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
  } as chrome.storage.LocalStorageArea;
}

function makeRecord(id: string): StoredCaptureRecord {
  const bundle = createManualCaptureBundle({
    title: `Capture ${id}`,
    text: `Deterministic capture ${id}`,
    canonicalUrl: `https://canvas.example.test/courses/42/pages/${id}`,
    kind: "page"
  });

  return {
    id,
    title: `Capture ${id}`,
    capturedAt: `2026-04-15T00:00:${id.padStart(2, "0")}.000Z`,
    courseId: "course-42",
    courseName: "Canvas Course",
    mode: "learning",
    sizeBytes: 1024,
    stats: {
      totalItemsVisited: 1,
      totalItemsCaptured: 1,
      totalItemsSkipped: 0,
      totalItemsFailed: 0,
      durationMs: 10,
      sizeBytes: 1024
    },
    warnings: [],
    bundle
  };
}

function makeCourse(courseId = "course-42"): CourseContext {
  return {
    courseId,
    courseName: courseId === "course-42" ? "Canvas Course" : "Another Course",
    origin: "https://canvas.example.test",
    courseUrl: `https://canvas.example.test/courses/${courseId}`,
    modulesUrl: `https://canvas.example.test/courses/${courseId}/modules`,
    host: "canvas.example.test"
  };
}

function makeQueuedCanvasBundle(input: {
  title?: string;
  courseId?: string;
  sourceHost?: string;
  capturedAt?: string;
} = {}): CaptureBundle {
  const courseId = input.courseId ?? "42";
  const sourceHost = input.sourceHost ?? "canvas.example.test";
  const capturedAt = input.capturedAt ?? new Date().toISOString();
  const bundle = createManualCaptureBundle({
    title: input.title ?? "Queued Canvas Capture",
    text: "Deterministic bridge capture",
    canonicalUrl: `https://${sourceHost}/courses/${courseId}/assignments/7`,
    kind: "assignment"
  });

  return {
    ...bundle,
    capturedAt,
    source: "extension-capture",
    captureMeta: {
      courseId,
      courseName: input.title ?? "Queued Canvas Capture",
      sourceHost
    }
  };
}

describe("extension storage", () => {
  beforeEach(() => {
    const localStore: StorageMap = new Map();
    const syncStore: StorageMap = new Map();
    (globalThis as typeof globalThis & { chrome: typeof chrome }).chrome = {
      runtime: {
        lastError: undefined
      },
      storage: {
        local: createStorageArea(localStore),
        sync: createStorageArea(syncStore)
      }
    } as typeof chrome;
  });

  it("normalizes settings and strips obsolete keys from persisted storage", async () => {
    const legacy = {
      ...DEFAULT_SETTINGS,
      defaultMode: "learning",
      autoExpand: true,
      includeFileMetadata: true,
      concurrentTabs: 4,
      excludeModuleItemTypes: ["external-tool"],
      theme: "high-contrast",
      reduceMotion: true
    };

    await writeSettings(legacy as ExtensionSettings);

    expect(await readSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it("keeps an updated oldest record when history is already at capacity", async () => {
    for (let index = 1; index <= 20; index += 1) {
      await upsertHistory(makeRecord(String(index)));
    }

    await upsertHistory({
      ...makeRecord("20"),
      title: "Capture 20 Updated"
    });

    const history = await readHistorySummaries();
    expect(history).toHaveLength(20);
    expect(history[0]?.id).toBe("20");
    expect(history.some((entry) => entry.id === "20")).toBe(true);
    expect((await readCaptureRecord("20"))?.title).toBe("Capture 20 Updated");
    expect(await readCaptureRecord("19")).not.toBeNull();
  });

  it("removes only the truly evicted record when inserting a new capture at capacity", async () => {
    for (let index = 1; index <= 20; index += 1) {
      await upsertHistory(makeRecord(String(index)));
    }

    await upsertHistory(makeRecord("21"));

    const history = await readHistorySummaries();
    expect(history).toHaveLength(20);
    expect(history[0]?.id).toBe("21");
    expect(history.some((entry) => entry.id === "1")).toBe(false);
    expect(await readCaptureRecord("1")).toBeNull();
    expect(await readCaptureRecord("2")).not.toBeNull();
  });

  it("keeps passive session captures isolated by course key", async () => {
    const firstBundle = createManualCaptureBundle({
      title: "Visited Assignment",
      text: "Consequences should be weighed across everyone affected.",
      canonicalUrl: "https://canvas.example.test/courses/42/assignments/7",
      kind: "assignment"
    });
    const secondBundle = createManualCaptureBundle({
      title: "Visited Discussion",
      text: "Duties still constrain action even when outcomes tempt us.",
      canonicalUrl: "https://canvas.example.test/courses/77/discussion_topics/9",
      kind: "discussion"
    });

    await upsertSessionObservation({
      course: makeCourse("course-42"),
      item: firstBundle.items[0] ?? null,
      resources: [],
      observedAt: "2026-04-15T00:00:00.000Z",
      sourceTabId: 10
    });
    await upsertSessionObservation({
      course: makeCourse("course-77"),
      item: secondBundle.items[0] ?? null,
      resources: [],
      observedAt: "2026-04-15T00:00:05.000Z",
      sourceTabId: 11
    });

    const firstSession = await readSessionState(makeCourse("course-42"));
    const secondSession = await readSessionState(makeCourse("course-77"));

    expect(firstSession?.bundle.items).toHaveLength(1);
    expect(secondSession?.bundle.items).toHaveLength(1);
    expect(firstSession?.course.courseId).toBe("course-42");
    expect(secondSession?.course.courseId).toBe("course-77");
  });

  it("replaces the previously visited item for the same canonical URL inside a passive session", async () => {
    const initialBundle = createManualCaptureBundle({
      title: "Visited Page",
      text: "Early draft text.",
      canonicalUrl: "https://canvas.example.test/courses/42/pages/week-1",
      kind: "page"
    });
    const updatedBundle = createManualCaptureBundle({
      title: "Visited Page",
      text: "Updated page text after the learner revisited the page.",
      canonicalUrl: "https://canvas.example.test/courses/42/pages/week-1",
      kind: "page"
    });

    await upsertSessionObservation({
      course: makeCourse(),
      item: initialBundle.items[0] ?? null,
      resources: [],
      observedAt: "2026-04-15T00:00:00.000Z",
      sourceTabId: 10
    });
    await upsertSessionObservation({
      course: makeCourse(),
      item: updatedBundle.items[0] ?? null,
      resources: [],
      observedAt: "2026-04-15T00:00:10.000Z",
      sourceTabId: 10
    });

    const session = await readSessionState(makeCourse());

    expect(session?.bundle.items).toHaveLength(1);
    expect(session?.bundle.items[0]?.plainText).toContain("Updated page text");
    expect(session?.lastSeenAt).toBe("2026-04-15T00:00:10.000Z");

    await clearSessionState(makeCourse());
    expect(await readSessionState(makeCourse())).toBeNull();
  });

  it("migrates a legacy pending bundle into the correlated handoff queue on read", async () => {
    const store = new Map<string, unknown>();
    (globalThis as typeof globalThis & { chrome: typeof chrome }).chrome.storage.local = createStorageArea(store);
    const bundle = makeQueuedCanvasBundle();
    store.set("aeonthra:pending-bundle", bundle);

    const inspection = await inspectPendingHandoff();

    expect(inspection.state).toBe("ok");
    if (inspection.state !== "ok") {
      throw new Error("Expected migrated handoff.");
    }
    expect(inspection.handoff.pack).toEqual(bundle);
    expect(store.has("aeonthra:pending-bundle")).toBe(false);
    expect(Array.isArray(store.get("aeonthra:pending-handoffs"))).toBe(true);
  });

  it("dedupes queued handoffs by pack id", async () => {
    const bundle = makeQueuedCanvasBundle();

    await queuePendingHandoff(bundle);
    await queuePendingHandoff(bundle);

    const queue = await readPendingHandoffQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0]?.pack).toEqual(bundle);
  });

  it("stamps queued handoffs with queue time instead of the bundle capture timestamp", async () => {
    const bundle = makeQueuedCanvasBundle({
      capturedAt: "2000-01-01T00:00:00.000Z"
    });

    const handoff = await queuePendingHandoff(bundle);

    expect(handoff.queuedAt).not.toBe(bundle.capturedAt);
    expect(Date.parse(handoff.queuedAt)).toBeGreaterThan(Date.parse(bundle.capturedAt));
  });

  it("expires stale handoffs older than twenty four hours", async () => {
    const store = new Map<string, unknown>();
    (globalThis as typeof globalThis & { chrome: typeof chrome }).chrome.storage.local = createStorageArea(store);
    const bundle = makeQueuedCanvasBundle({
      capturedAt: "2026-04-10T00:00:00.000Z"
    });
    store.set("aeonthra:pending-handoffs", [
      createBridgeHandoffEnvelope(bundle, "2026-04-10T00:00:00.000Z")
    ]);

    expect(await inspectPendingHandoff()).toEqual({ state: "missing" });
    expect(store.has("aeonthra:pending-handoffs")).toBe(false);
  });

  it("clears only the exact acknowledged handoff", async () => {
    const first = await queuePendingHandoff(makeQueuedCanvasBundle({
      title: "First Queue",
      capturedAt: new Date().toISOString()
    }));
    const second = await queuePendingHandoff(makeQueuedCanvasBundle({
      title: "Second Queue",
      capturedAt: new Date(Date.now() + 1_000).toISOString()
    }));

    expect(await clearPendingHandoff(first.handoffId, second.packId)).toBe(false);
    expect(await readPendingHandoffQueue()).toHaveLength(2);
    expect(await clearPendingHandoff(first.handoffId, first.packId)).toBe(true);
    expect((await readPendingHandoffQueue()).map((handoff) => handoff.packId)).toEqual([second.packId]);
    await clearPendingHandoffs();
    expect(await inspectPendingHandoff()).toEqual({ state: "missing" });
  });

  it("drops schema-valid but import-invalid queued handoffs before they poison a fresh import", async () => {
    const store = new Map<string, unknown>();
    (globalThis as typeof globalThis & { chrome: typeof chrome }).chrome.storage.local = createStorageArea(store);
    const validQueuedAt = new Date().toISOString();
    const invalidQueuedAt = new Date(Date.now() + 1_000).toISOString();
    const validBundle = makeQueuedCanvasBundle({
      title: "Valid Queue",
      capturedAt: validQueuedAt
    });
    const invalidBundle: CaptureBundle = {
      ...makeQueuedCanvasBundle({
        title: "Empty Queue",
        capturedAt: invalidQueuedAt
      }),
      items: [],
      manifest: {
        itemCount: 0,
        resourceCount: 0,
        captureKinds: [],
        sourceUrls: []
      }
    };
    store.set("aeonthra:pending-handoffs", [
      createBridgeHandoffEnvelope(invalidBundle, invalidQueuedAt),
      createBridgeHandoffEnvelope(validBundle, validQueuedAt)
    ]);

    const queue = await readPendingHandoffQueue();
    const inspection = await inspectPendingHandoff();

    expect(queue).toHaveLength(1);
    expect(queue[0]?.pack.title).toBe("Valid Queue");
    expect(store.get("aeonthra:pending-handoffs")).toEqual(queue);
    expect(inspection.state).toBe("ok");
    if (inspection.state !== "ok") {
      throw new Error("Expected valid handoff after sanitizing the poisoned queue.");
    }
    expect(inspection.handoff.pack.title).toBe("Valid Queue");
  });

  it("flags malformed queue entries as invalid when no valid handoff remains", async () => {
    const store = new Map<string, unknown>();
    (globalThis as typeof globalThis & { chrome: typeof chrome }).chrome.storage.local = createStorageArea(store);
    store.set("aeonthra:pending-handoffs", [{ nope: true }]);

    expect(await inspectPendingHandoff()).toEqual({
      state: "invalid",
      code: "invalid-bundle"
    });
  });
});
