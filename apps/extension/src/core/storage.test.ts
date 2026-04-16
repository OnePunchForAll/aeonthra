import { beforeEach, describe, expect, it } from "vitest";
import { createManualCaptureBundle } from "@learning/schema";
import {
  DEFAULT_SETTINGS,
  clearSessionState,
  readCaptureRecord,
  readHistorySummaries,
  readSettings,
  readSessionState,
  upsertHistory,
  upsertSessionObservation,
  writeSettings
} from "./storage";
import type { CourseContext, ExtensionSettings, StoredCaptureRecord } from "./types";

type StorageMap = Map<string, unknown>;

function createStorageArea(store: StorageMap): chrome.storage.StorageArea {
  return {
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
  } as chrome.storage.StorageArea;
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
});
