import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildLearningBundleWithProgress, createDemoSourceText } from "@learning/content-engine";
import { BRIDGE_SOURCE, captureBundleId, createManualCaptureBundle, type CaptureBundle } from "@learning/schema";
import {
  buildAeonthraShellInstanceKey,
  clearPersistedWorkspaceState,
  describePdfIngestLoadFailure,
  discardLegacyProgressMigration,
  loadPdfIngestModule,
  mergeProgressUpdate,
  normalizeRestoredWorkspacePayload,
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
      courseId: "42",
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

  it("rejects empty extension captures with an exact import message", () => {
    const emptyExtensionBundle: CaptureBundle = {
      ...createManualCaptureBundle({
        title: "Empty Canvas Capture",
        text: "placeholder"
      }),
      source: "extension-capture",
      items: [],
      manifest: {
        itemCount: 0,
        resourceCount: 0,
        captureKinds: [],
        sourceUrls: []
      },
      captureMeta: {
        courseId: "42",
        courseName: "Canvas Ethics",
        sourceHost: "canvas.example.test"
      }
    };

    const resolution = resolveImportedJsonPayload(JSON.stringify(emptyExtensionBundle));

    expect(resolution).toEqual({
      kind: "error",
      message: "That extension bundle is valid, but it contains zero captured Canvas items. Re-run SENTINEL on at least one readable Canvas page before importing."
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

  it("tracks bridge import requests before a correlated pack arrives", () => {
    const resolution = resolveBridgeMessageAction(
      {
        source: BRIDGE_SOURCE,
        type: "NF_IMPORT_REQUEST",
        requestId: "request-1"
      },
      null
    );

    expect(resolution).toEqual({
      kind: "track-request",
      nextRequestState: {
        mode: "auto",
        requestId: "request-1"
      }
    });
  });

  it("accepts requested NF_PACK_READY bridge payloads and computes the ack envelope", () => {
    const bundle = makeCanvasCaptureBundle();
    const resolution = resolveBridgeMessageAction(
      {
        source: BRIDGE_SOURCE,
        type: "NF_PACK_READY",
        requestId: "request-1",
        handoffId: "handoff-1",
        packId: captureBundleId(bundle),
        pack: bundle
      },
      {
        mode: "manual",
        requestId: "request-1"
      }
    );

    expect(resolution).toEqual({
      kind: "accept-pack",
      bundle,
      successMessage: "Canvas bundle imported: Canvas Ethics.",
      ackRequestId: "request-1",
      ackHandoffId: "handoff-1",
      ackPackId: captureBundleId(bundle),
      nextRequestState: null
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
        requestId: "request-2",
        handoffId: "handoff-2",
        packId: captureBundleId(bundle),
        pack: bundle
      },
      {
        mode: "auto",
        requestId: "request-2"
      }
    );

    expect(resolution).toEqual({
      kind: "reject-pack",
      message: "Queued bridge import was valid JSON, but its source was not an extension capture.",
      nextRequestState: null
    });
  });

  it("rejects empty NF_PACK_READY bridge payloads with an exact reason", () => {
    const emptyBundle: CaptureBundle = {
      ...makeCanvasCaptureBundle(),
      items: [],
      manifest: {
        itemCount: 0,
        resourceCount: 0,
        captureKinds: [],
        sourceUrls: []
      }
    };

    const resolution = resolveBridgeMessageAction(
      {
        source: BRIDGE_SOURCE,
        type: "NF_PACK_READY",
        requestId: "request-3",
        handoffId: "handoff-3",
        packId: captureBundleId(emptyBundle),
        pack: emptyBundle
      },
      {
        mode: "auto",
        requestId: "request-3"
      }
    );

    expect(resolution).toEqual({
      kind: "reject-pack",
      message: "Queued bridge import came from the extension, but it contained zero captured Canvas items.",
      nextRequestState: null
    });
  });

  it("accepts extension-initiated NF_PACK_READY payloads even when no request is active", () => {
    const bundle = makeCanvasCaptureBundle();
    const resolution = resolveBridgeMessageAction(
      {
        source: BRIDGE_SOURCE,
        type: "NF_PACK_READY",
        requestId: "request-4",
        handoffId: "handoff-4",
        packId: captureBundleId(bundle),
        pack: bundle
      },
      null
    );

    expect(resolution).toEqual({
      kind: "accept-pack",
      bundle,
      successMessage: "Canvas bundle imported: Canvas Ethics.",
      ackRequestId: "request-4",
      ackHandoffId: "handoff-4",
      ackPackId: captureBundleId(bundle),
      nextRequestState: null
    });
  });

  it("ignores NF_PACK_READY payloads that belong to a different active request", () => {
    const bundle = makeCanvasCaptureBundle();
    const resolution = resolveBridgeMessageAction(
      {
        source: BRIDGE_SOURCE,
        type: "NF_PACK_READY",
        requestId: "request-5",
        handoffId: "handoff-5",
        packId: captureBundleId(bundle),
        pack: bundle
      },
      {
        mode: "manual",
        requestId: "request-active"
      }
    );

    expect(resolution).toEqual({
      kind: "ignore",
      nextRequestState: {
        mode: "manual",
        requestId: "request-active"
      }
    });
  });

  it("ignores stale bridge packs whose request id no longer matches the active request", () => {
    const bundle = makeCanvasCaptureBundle();
    const resolution = resolveBridgeMessageAction(
      {
        source: BRIDGE_SOURCE,
        type: "NF_PACK_READY",
        requestId: "request-old",
        handoffId: "handoff-old",
        packId: captureBundleId(bundle),
        pack: bundle
      },
      {
        mode: "manual",
        requestId: "request-new"
      }
    );

    expect(resolution).toEqual({
      kind: "ignore",
      nextRequestState: {
        mode: "manual",
        requestId: "request-new"
      }
    });
  });

  it("surfaces manual bridge import failures and clears the request mode", () => {
    const resolution = resolveBridgeMessageAction(
      {
        source: BRIDGE_SOURCE,
        type: "NF_IMPORT_RESULT",
        requestId: "request-5",
        success: false,
        error: "No pending AEONTHRA bundle was queued for import."
      },
      {
        mode: "manual",
        requestId: "request-5"
      }
    );

    expect(resolution).toEqual({
      kind: "import-result",
      status: "No pending AEONTHRA bundle was queued for import.",
      nextRequestState: null
    });
  });

  it("clears auto bridge requests without showing a failure status", () => {
    const resolution = resolveBridgeMessageAction(
      {
        source: BRIDGE_SOURCE,
        type: "NF_IMPORT_RESULT",
        requestId: "request-6",
        success: false,
        error: "No pending AEONTHRA bundle was queued for import."
      },
      {
        mode: "auto",
        requestId: "request-6"
      }
    );

    expect(resolution).toEqual({
      kind: "import-result",
      status: null,
      nextRequestState: null
    });
  });

  it("builds a new shell instance key when an explicit restore bumps the shell epoch", () => {
    expect(buildAeonthraShellInstanceKey("scope-a", 0)).toBe("scope-a:0");
    expect(buildAeonthraShellInstanceKey("scope-a", 1)).toBe("scope-a:1");
    expect(buildAeonthraShellInstanceKey(null, 2)).toBe("no-scope:2");
  });

  it("maps dynamic PDF loader fetch failures to a precise restart message", () => {
    expect(describePdfIngestLoadFailure(
      new TypeError("Failed to fetch dynamically imported module: http://localhost:5176/src/lib/pdf-ingest.ts")
    )).toBe(
      "PDF intake module failed to load. Restart the web dev server and retry the upload. Original loader error: Failed to fetch dynamically imported module: http://localhost:5176/src/lib/pdf-ingest.ts"
    );
  });

  it("rethrows pdf loader failures with the mapped textbook message", async () => {
    await expect(loadPdfIngestModule(async () => {
      throw new TypeError("Failed to fetch dynamically imported module: http://localhost:5176/src/lib/pdf-ingest.ts");
    })).rejects.toThrow(
      "PDF intake module failed to load. Restart the web dev server and retry the upload. Original loader error: Failed to fetch dynamically imported module: http://localhost:5176/src/lib/pdf-ingest.ts"
    );
  });

  it("returns the imported pdf module when lazy loading succeeds", async () => {
    const module = {
      extractTextFromPdf: vi.fn(),
      loadPdfJsRuntime: vi.fn()
    };

    await expect(loadPdfIngestModule(async () => module as never)).resolves.toBe(module);
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

  it("normalizes restored offline workspace progress against the restored shell graph", () => {
    const canvasBundle = createDemoBundle();
    const textbookBundle = makeTextbookBundle();
    const mergedBundle = mergeSourceBundles(canvasBundle, textbookBundle);

    expect(mergedBundle).not.toBeNull();

    const learningBundle = buildLearningBundleWithProgress(mergedBundle!);
    const normalized = normalizeRestoredWorkspacePayload({
      canvasBundle,
      textbookBundle,
      mergedBundle: mergedBundle!,
      learningBundle,
      progress: {
        conceptMastery: {
          [learningBundle.concepts[0]!.id]: 0.9,
          staleConcept: 0.4
        },
        chapterCompletion: {
          "module-1": 1,
          staleChapter: 0.6
        },
        goalCompletion: {
          "goal:demo:understand-core-ideas": true,
          staleGoal: true
        },
        skillHistory: {
          "skill-foundation-demo": true,
          staleSkill: true
        },
        practiceMode: true
      },
      notes: "Recovered note lane."
    });

    expect(normalized.progress).toEqual({
      conceptMastery: {
        [learningBundle.concepts[0]!.id]: 0.9
      },
      chapterCompletion: {
        "module-1": 1
      },
      goalCompletion: {},
      skillHistory: {},
      practiceMode: true
    });
  });

  it("merges progress updates without dropping sibling progress lanes", () => {
    expect(mergeProgressUpdate(
      {
        conceptMastery: { conceptA: 0.5 },
        chapterCompletion: { chapterA: 0.4 },
        goalCompletion: { goalA: true },
        skillHistory: { skillA: true },
        practiceMode: true
      },
      {
        conceptMastery: { conceptB: 0.9 },
        chapterCompletion: { chapterB: 1 },
        practiceMode: false
      }
    )).toEqual({
      conceptMastery: {
        conceptA: 0.5,
        conceptB: 0.9
      },
      chapterCompletion: {
        chapterA: 0.4,
        chapterB: 1
      },
      goalCompletion: { goalA: true },
      skillHistory: { skillA: true },
      practiceMode: false
    });
  });

  it("discards pending legacy progress migration when a new workspace replaces the old one", () => {
    storeScopedProgress({
      conceptMastery: { scoped: 0.8 },
      chapterCompletion: {},
      goalCompletion: {},
      skillHistory: {},
      practiceMode: false
    }, "scope-next");
    (window as MockWindow).localStorage.setItem("learning-freedom:progress", JSON.stringify({
      conceptMastery: { legacy: 0.25 },
      chapterCompletion: {},
      goalCompletion: {},
      skillHistory: { legacySkill: true },
      practiceMode: true
    }));
    const migration = { current: true };

    discardLegacyProgressMigration(migration);

    expect(migration.current).toBe(false);
    expect(loadProgress()).toEqual(createEmptyProgress());
    expect(loadProgress("scope-next")).toEqual({
      conceptMastery: { scoped: 0.8 },
      chapterCompletion: {},
      goalCompletion: {},
      skillHistory: {},
      practiceMode: false
    });
  });

  it("leaves legacy progress untouched when no migration is pending", () => {
    (window as MockWindow).localStorage.setItem("learning-freedom:progress", JSON.stringify({
      conceptMastery: { legacy: 0.4 },
      chapterCompletion: {},
      goalCompletion: {},
      skillHistory: {},
      practiceMode: false
    }));
    const migration = { current: false };

    discardLegacyProgressMigration(migration);

    expect(migration.current).toBe(false);
    expect(loadProgress()).toEqual({
      conceptMastery: { legacy: 0.4 },
      chapterCompletion: {},
      goalCompletion: {},
      skillHistory: {},
      practiceMode: false
    });
  });

  it("clears persisted workspace state on reset", () => {
    const canvasBundle = makeCanvasCaptureBundle();
    const textbookBundle = makeTextbookBundle();
    const progress = {
      conceptMastery: { c1: 1 },
      chapterCompletion: {},
      goalCompletion: {},
      skillHistory: {},
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
      skillHistory: {},
      practiceMode: false
    }, "scope-a");
    storeScopedProgress({
      conceptMastery: { right: 0.5 },
      chapterCompletion: {},
      goalCompletion: {},
      skillHistory: {},
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
      skillHistory: {},
      practiceMode: false
    });
    expect(loadNotes("scope-b")).toBe("Scope B notes");
  });
});
