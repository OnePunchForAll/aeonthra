import { beforeEach, describe, expect, it } from "vitest";
import { buildLearningBundleWithProgress, createDemoSourceText } from "@learning/content-engine";
import { BRIDGE_SOURCE, captureBundleId, createManualCaptureBundle, type CaptureBundle } from "@learning/schema";
import {
  clearPersistedWorkspaceState,
  resolveBridgeMessageAction,
  resolveBridgePackImport,
  resolveImportedJsonPayload
} from "./App";
import { createDemoBundle } from "./lib/demo";
import { createOfflineSiteBundle } from "./lib/offline-site";
import { createEmptyProgress } from "./lib/shell-runtime";
import { mergeSourceBundles } from "./lib/source-workspace";
import {
  loadNotes,
  loadProgress,
  loadStoredBundle,
  loadStoredSourceWorkspace,
  setActiveNoteScope,
  storeBundle,
  storeNotes,
  storeScopedProgress,
  storeSourceWorkspace
} from "./lib/storage";
import { createTextbookCaptureBundle } from "./lib/textbook-import";

type MockWindow = Window & typeof globalThis;

function installMockWindow() {
  const store = new Map<string, string>();
  const localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    }
  } as Storage;

  (globalThis as typeof globalThis & { window: MockWindow }).window = {
    localStorage
  } as MockWindow;
}

function makeCanvasCaptureBundle(): CaptureBundle {
  const bundle = createManualCaptureBundle({
    title: "Canvas Ethics",
    text: "Compare duties and consequences using course-grounded evidence.",
    canonicalUrl: "https://canvas.example.test/courses/42/assignments/7",
    kind: "assignment"
  });

  return {
    ...bundle,
    source: "extension-capture",
    captureMeta: {
      courseId: "course-42",
      courseName: "Canvas Ethics",
      sourceHost: "canvas.example.test"
    }
  };
}

function makeTextbookBundle(): CaptureBundle {
  return createTextbookCaptureBundle({
    title: "Canvas Ethics Reader",
    text: createDemoSourceText(),
    format: "text"
  });
}

describe("App intake orchestration", () => {
  beforeEach(() => {
    installMockWindow();
  });

  it("rejects non-canvas JSON during Step 1 intake", () => {
    const manualBundle = createManualCaptureBundle({
      title: "Manual Notes",
      text: "This should not satisfy the Canvas-first import gate."
    });

    const resolution = resolveImportedJsonPayload(JSON.stringify(manualBundle));

    expect(resolution).toEqual({
      kind: "error",
      message: "That JSON file is valid, but it is not a Canvas extension capture. Import a SENTINEL Canvas bundle or restore a saved offline site bundle."
    });
  });

  it("accepts valid bridge packs from the extension path", () => {
    const bundle = makeCanvasCaptureBundle();
    const resolution = resolveBridgePackImport(bundle);

    expect(resolution).toEqual({
      ok: true,
      bundle,
      successMessage: "Canvas bundle imported: Canvas Ethics."
    });
  });

  it("accepts requested NF_PACK_READY bridge payloads and computes the ack pack id", () => {
    const bundle = makeCanvasCaptureBundle();
    const resolution = resolveBridgeMessageAction(
      {
        source: BRIDGE_SOURCE,
        type: "NF_PACK_READY",
        pack: bundle
      },
      "manual"
    );

    expect(resolution).toEqual({
      kind: "accept-pack",
      bundle,
      successMessage: "Canvas bundle imported: Canvas Ethics.",
      ackPackId: captureBundleId(bundle),
      nextRequestMode: null
    });
  });

  it("rejects non-canvas NF_PACK_READY bridge payloads and clears the request mode", () => {
    const bundle = createManualCaptureBundle({
      title: "Manual Notes",
      text: "This should never be accepted as an extension capture."
    });

    const resolution = resolveBridgeMessageAction(
      {
        source: BRIDGE_SOURCE,
        type: "NF_PACK_READY",
        pack: bundle
      },
      "auto"
    );

    expect(resolution).toEqual({
      kind: "reject-pack",
      message: "Queued bridge import was valid JSON, but it was not a Canvas extension capture.",
      nextRequestMode: null
    });
  });

  it("accepts extension-initiated NF_PACK_READY payloads even when no request is active", () => {
    const bundle = makeCanvasCaptureBundle();
    const resolution = resolveBridgeMessageAction(
      {
        source: BRIDGE_SOURCE,
        type: "NF_PACK_READY",
        pack: bundle
      },
      null
    );

    expect(resolution).toEqual({
      kind: "accept-pack",
      bundle,
      successMessage: "Canvas bundle imported: Canvas Ethics.",
      ackPackId: captureBundleId(bundle),
      nextRequestMode: null
    });
  });

  it("surfaces manual bridge import failures and clears the request mode", () => {
    const resolution = resolveBridgeMessageAction(
      {
        source: BRIDGE_SOURCE,
        type: "NF_IMPORT_RESULT",
        success: false,
        error: "No pending AEONTHRA bundle was queued for import."
      },
      "manual"
    );

    expect(resolution).toEqual({
      kind: "import-result",
      status: "No pending AEONTHRA bundle was queued for import.",
      nextRequestMode: null
    });
  });

  it("clears auto bridge requests without showing a failure status", () => {
    const resolution = resolveBridgeMessageAction(
      {
        source: BRIDGE_SOURCE,
        type: "NF_IMPORT_RESULT",
        success: false,
        error: "No pending AEONTHRA bundle was queued for import."
      },
      "auto"
    );

    expect(resolution).toEqual({
      kind: "import-result",
      status: null,
      nextRequestMode: null
    });
  });

  it("restores offline site bundles with progress and note scope metadata", () => {
    const canvasBundle = createDemoBundle();
    const textbookBundle = makeTextbookBundle();
    const mergedBundle = mergeSourceBundles(canvasBundle, textbookBundle);

    expect(mergedBundle).not.toBeNull();

    const learningBundle = buildLearningBundleWithProgress(mergedBundle!);
    const progress = createEmptyProgress();
    progress.conceptMastery[learningBundle.concepts[0]!.id] = 0.9;
    progress.practiceMode = true;

    const offlineBundle = createOfflineSiteBundle({
      canvasBundle,
      textbookBundle,
      mergedBundle: mergedBundle!,
      learningBundle,
      progress,
      notes: "Recovered note lane."
    });

    const resolution = resolveImportedJsonPayload(JSON.stringify(offlineBundle));

    expect(resolution.kind).toBe("offline-site");
    if (resolution.kind !== "offline-site") {
      throw new Error("Expected offline-site resolution");
    }
    expect(resolution.restored.learningBundle).toEqual(learningBundle);
    expect(resolution.restored.progress).toEqual({ ...progress, practiceMode: false });
    expect(resolution.restored.notes).toBe("Recovered note lane.");
    expect(resolution.noteScope).toBe(learningBundle.synthesis.deterministicHash);
    expect(resolution.status).toBe(`Offline site bundle restored: ${offlineBundle.title}`);
  });

  it("clears persisted workspace state on reset", () => {
    const canvasBundle = makeCanvasCaptureBundle();
    const textbookBundle = makeTextbookBundle();
    const progress = {
      conceptMastery: { c1: 1 },
      chapterCompletion: {},
      goalCompletion: {},
      practiceMode: true
    };

    storeBundle(canvasBundle);
    storeSourceWorkspace({ canvasBundle, textbookBundle });
    setActiveNoteScope("hash-reset");
    storeNotes("Scoped notes survive until reset.");
    storeScopedProgress(progress, "hash-reset");

    clearPersistedWorkspaceState();

    expect(loadStoredBundle()).toBeNull();
    expect(loadStoredSourceWorkspace()).toBeNull();
    expect(loadNotes()).toBe("");
    expect(loadProgress("hash-reset")).toEqual(createEmptyProgress());
  });

  it("clears only the requested scoped notes and progress when a scope is provided", () => {
    storeScopedProgress({
      conceptMastery: { left: 1 },
      chapterCompletion: {},
      goalCompletion: {},
      practiceMode: false
    }, "scope-a");
    storeScopedProgress({
      conceptMastery: { right: 0.5 },
      chapterCompletion: {},
      goalCompletion: {},
      practiceMode: false
    }, "scope-b");
    storeNotes("Scope A notes", "scope-a");
    storeNotes("Scope B notes", "scope-b");

    clearPersistedWorkspaceState("scope-a");

    expect(loadProgress("scope-a")).toEqual(createEmptyProgress());
    expect(loadNotes("scope-a")).toBe("");
    expect(loadProgress("scope-b")).toEqual({
      conceptMastery: { right: 0.5 },
      chapterCompletion: {},
      goalCompletion: {},
      practiceMode: false
    });
    expect(loadNotes("scope-b")).toBe("Scope B notes");
  });
});
