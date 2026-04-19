import { beforeEach, describe, expect, it } from "vitest";
import { createManualCaptureBundle } from "@learning/schema";
import {
  clearLegacyProgress,
  clearStoredNotes,
  clearStoredProgress,
  clearStoredBundle,
  clearStoredSourceWorkspace,
  loadNotes,
  loadProgress,
  loadStoredBundle,
  loadStoredSourceWorkspace,
  setActiveNoteScope,
  storeBundle,
  storeNotes,
  storeScopedProgress,
  storeSourceWorkspace
} from "./storage";

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

describe("web storage", () => {
  beforeEach(() => {
    installMockWindow();
    clearStoredBundle();
    clearStoredSourceWorkspace();
    clearStoredNotes();
    storeNotes("");
  });

  it("round-trips stored bundles through schema validation", () => {
    const bundle = createManualCaptureBundle({
      title: "Storage Test Bundle",
      text: "Deterministic storage should restore the same bundle that was persisted."
    });

    storeBundle(bundle);

    expect(loadStoredBundle()).toEqual(bundle);
  });

  it("round-trips the split source workspace state", () => {
    const canvasBundle = createManualCaptureBundle({
      title: "Canvas Course",
      text: "Assignment prompt text from Canvas.",
      canonicalUrl: "https://canvas.example.test/courses/1/assignments/2",
      kind: "assignment"
    });
    const textbookBundle = createManualCaptureBundle({
      title: "Imported Textbook",
      text: "Chapter 1 introduces deterministic study scaffolding.",
      canonicalUrl: "https://local.learning/textbook/chapter-1",
      kind: "document"
    });

    storeSourceWorkspace({ canvasBundle, textbookBundle });

    expect(loadStoredSourceWorkspace()).toEqual({ canvasBundle, textbookBundle });
  });

  it("keeps scoped progress isolated from the default progress bucket", () => {
    const scopedProgress = {
      conceptMastery: { c1: 0.75 },
      chapterCompletion: { chapter1: 1 },
      goalCompletion: { goal1: true },
      skillHistory: { "skill-foundation-c1": true },
      practiceMode: true
    };

    storeScopedProgress(scopedProgress, "hash-123");

    expect(loadProgress("hash-123")).toEqual(scopedProgress);
    expect(loadProgress()).toEqual({
      conceptMastery: {},
      chapterCompletion: {},
      goalCompletion: {},
      skillHistory: {},
      practiceMode: false
    });
  });

  it("clears only the unscoped legacy progress bucket when requested", () => {
    storeScopedProgress({
      conceptMastery: { scoped: 0.8 },
      chapterCompletion: {},
      goalCompletion: {},
      skillHistory: { "skill-foundation-scoped": true },
      practiceMode: false
    }, "hash-legacy");
    (window as MockWindow).localStorage.setItem("learning-freedom:progress", JSON.stringify({
      conceptMastery: { legacy: 0.25 },
      chapterCompletion: {},
      goalCompletion: {},
      skillHistory: { legacySkill: true },
      practiceMode: true
    }));

    clearLegacyProgress();

    expect(loadProgress()).toEqual({
      conceptMastery: {},
      chapterCompletion: {},
      goalCompletion: {},
      skillHistory: {},
      practiceMode: false
    });
    expect(loadProgress("hash-legacy")).toEqual({
      conceptMastery: { scoped: 0.8 },
      chapterCompletion: {},
      goalCompletion: {},
      skillHistory: { "skill-foundation-scoped": true },
      practiceMode: false
    });
  });

  it("round-trips notes text", () => {
    storeNotes("Memory hook: compare duties against consequences.");

    expect(loadNotes()).toBe("Memory hook: compare duties against consequences.");
  });

  it("isolates notes by active workspace scope", () => {
    setActiveNoteScope("workspace-a");
    storeNotes("Course A note.");

    setActiveNoteScope("workspace-b");
    expect(loadNotes()).toBe("");

    storeNotes("Course B note.");
    expect(loadNotes()).toBe("Course B note.");

    setActiveNoteScope("workspace-a");
    expect(loadNotes()).toBe("Course A note.");
  });

  it("clears notes and all scoped progress keys when requested", () => {
    storeNotes("Reset should wipe this note.");
    storeScopedProgress(
      {
        conceptMastery: { c1: 1 },
        chapterCompletion: {},
        goalCompletion: {},
        skillHistory: { "skill-foundation-c1": true },
        practiceMode: false
      },
      "scope-a"
    );
    storeScopedProgress(
      {
        conceptMastery: { c2: 0.5 },
        chapterCompletion: { chapter2: 0.5 },
        goalCompletion: {},
        skillHistory: {},
        practiceMode: true
      },
      "scope-b"
    );
    (window as MockWindow).localStorage.setItem("learning-freedom:progress", JSON.stringify({
      conceptMastery: { legacy: 0.25 },
      chapterCompletion: {},
      goalCompletion: {},
      skillHistory: { legacySkill: true },
      practiceMode: false
    }));
    (window as MockWindow).localStorage.setItem("learning-freedom:unrelated", "keep");

    clearStoredNotes();
    clearStoredProgress();

    expect(loadNotes()).toBe("");
    expect(loadProgress()).toEqual({
      conceptMastery: {},
      chapterCompletion: {},
      goalCompletion: {},
      skillHistory: {},
      practiceMode: false
    });
    expect(loadProgress("scope-a")).toEqual({
      conceptMastery: {},
      chapterCompletion: {},
      goalCompletion: {},
      skillHistory: {},
      practiceMode: false
    });
    expect(loadProgress("scope-b")).toEqual({
      conceptMastery: {},
      chapterCompletion: {},
      goalCompletion: {},
      skillHistory: {},
      practiceMode: false
    });
    expect((window as MockWindow).localStorage.getItem("learning-freedom:unrelated")).toBe("keep");
  });
});
