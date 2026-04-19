import { describe, expect, it } from "vitest";
import { createManualCaptureBundle, type CaptureBundle } from "@learning/schema";
import {
  describeCanvasLoadState,
  describeTextbookLoadState,
  determineAppStage,
  isCanvasCaptureBundle,
  isSameCourse,
  mergeSourceBundles,
  splitLegacyBundle
} from "./source-workspace";
import { createTextbookCaptureBundle } from "./textbook-import";

function makeCanvasBundle(): CaptureBundle {
  const bundle = createManualCaptureBundle({
    title: "Deterministic Ethics",
    text: "Analyze how duties and consequences shape the assignment response.",
    canonicalUrl: "https://canvas.example.test/courses/42/assignments/7",
    kind: "assignment"
  });

  return {
    ...bundle,
    source: "extension-capture",
    captureMeta: {
      courseId: "42",
      courseName: "Deterministic Ethics",
      sourceHost: "canvas.example.test"
    }
  };
}

function makeTextbookBundle() {
  return createTextbookCaptureBundle({
    title: "Deterministic Ethics Reader",
    text: [
      "Chapter 1: Duties",
      "Duties explain what a learner owes regardless of immediate convenience.",
      "",
      "Chapter 2: Consequences",
      "Consequences show how outcomes still shape evaluation and repair."
    ].join("\n"),
    segments: [
      {
        title: "Chapter 1: Duties",
        text: "Duties explain what a learner owes regardless of immediate convenience."
      },
      {
        title: "Chapter 2: Consequences",
        text: "Consequences show how outcomes still shape evaluation and repair."
      }
    ],
    format: "text"
  });
}

describe("source workspace helpers", () => {
  it("merges textbook items into the canvas bundle without losing canvas identity", () => {
    const canvasBundle = makeCanvasBundle();
    const textbookBundle = makeTextbookBundle();

    const merged = mergeSourceBundles(canvasBundle, textbookBundle);

    expect(merged).not.toBeNull();
    expect(merged?.title).toBe(canvasBundle.title);
    expect(merged?.source).toBe("extension-capture");
    expect(merged?.captureMeta).toEqual(canvasBundle.captureMeta);
    expect(merged?.items).toHaveLength(canvasBundle.items.length + textbookBundle.items.length);
    expect(merged?.items.filter((item) => (item.tags ?? []).includes("textbook"))).toHaveLength(textbookBundle.items.length);
  });

  it("splits legacy merged bundles without leaking canvas capture metadata into textbook state", () => {
    const canvasBundle = makeCanvasBundle();
    const textbookBundle = makeTextbookBundle();
    const legacyMerged = mergeSourceBundles(canvasBundle, textbookBundle);

    expect(legacyMerged).not.toBeNull();

    const split = splitLegacyBundle(legacyMerged);

    expect(split.canvasBundle).not.toBeNull();
    expect(split.textbookBundle).not.toBeNull();
    expect(split.canvasBundle?.captureMeta).toEqual(canvasBundle.captureMeta);
    expect(split.textbookBundle?.captureMeta).toBeUndefined();
    expect(split.textbookBundle?.source).toBe("manual-import");
    expect(split.textbookBundle?.items.every((item) => (item.tags ?? []).includes("textbook"))).toBe(true);
  });

  it("uses host plus course id when deciding whether a textbook can be preserved across imports", () => {
    const left = makeCanvasBundle();
    const right = {
      ...makeCanvasBundle(),
      title: "Deterministic Ethics - Updated Capture"
    };
    const other = {
      ...makeCanvasBundle(),
      captureMeta: {
        ...makeCanvasBundle().captureMeta,
        courseId: "course-77"
      }
    };
    const differentHost = {
      ...makeCanvasBundle(),
      captureMeta: {
        ...makeCanvasBundle().captureMeta,
        sourceHost: "other.canvas.example.test"
      }
    };

    expect(isSameCourse(left, right)).toBe(true);
    expect(isSameCourse(left, other)).toBe(false);
    expect(isSameCourse(left, differentHost)).toBe(false);
  });

  it("preserves same-course state across mixed legacy and host-aware capture metadata", () => {
    const hostAware = makeCanvasBundle();
    const legacy = {
      ...makeCanvasBundle(),
      captureMeta: {
        courseId: "42",
        courseName: "Deterministic Ethics"
      }
    };

    expect(isSameCourse(hostAware, legacy)).toBe(true);
  });

  it("does not preserve textbooks when course ids are missing, even if titles match", () => {
    const left = {
      ...makeCanvasBundle(),
      captureMeta: undefined
    };
    const right = {
      ...makeCanvasBundle(),
      captureMeta: undefined
    };

    expect(isSameCourse(left, right)).toBe(false);
  });

  it("only treats extension captures as valid Canvas intake bundles", () => {
    const canvasBundle = makeCanvasBundle();
    const textbookBundle = makeTextbookBundle();

    expect(isCanvasCaptureBundle(canvasBundle)).toBe(true);
    expect(isCanvasCaptureBundle(textbookBundle)).toBe(false);
  });

  it("derives the correct intake stage from source and synthesis state", () => {
    const canvasBundle = makeCanvasBundle();
    const textbookBundle = makeTextbookBundle();

    expect(determineAppStage({
      canvasBundle: null,
      textbookBundle: null,
      learningReady: false,
      synthesisRequested: false
    })).toBe("canvas-required");
    expect(determineAppStage({
      canvasBundle,
      textbookBundle: null,
      learningReady: false,
      synthesisRequested: false
    })).toBe("textbook-required");
    expect(determineAppStage({
      canvasBundle,
      textbookBundle,
      learningReady: false,
      synthesisRequested: true
    })).toBe("synthesizing");
    expect(determineAppStage({
      canvasBundle,
      textbookBundle,
      learningReady: true,
      synthesisRequested: false
    })).toBe("complete");
  });

  it("describes canvas-loaded state explicitly", () => {
    expect(describeCanvasLoadState(makeCanvasBundle())).toEqual({
      headline: "Loaded",
      detail: "Canvas course data is loaded from Deterministic Ethics with 1 captured item."
    });
  });

  it("distinguishes textbook required, failed, loading, and ready states after Canvas loads", () => {
    const canvasBundle = makeCanvasBundle();
    const textbookBundle = makeTextbookBundle();

    expect(describeTextbookLoadState({
      canvasBundle,
      textbookBundle: null,
      importError: null,
      uploadLabel: null
    })).toEqual({
      state: "required",
      headline: "Required",
      detail: "Canvas course data is already loaded. Add a PDF, DOCX, or text source to continue."
    });

    expect(describeTextbookLoadState({
      canvasBundle,
      textbookBundle: null,
      importError: "PDF intake module failed to load. Restart the web dev server and retry the upload.",
      uploadLabel: null
    })).toEqual({
      state: "failed",
      headline: "Import Failed",
      detail: "Canvas course data is already loaded. PDF intake module failed to load. Restart the web dev server and retry the upload."
    });

    expect(describeTextbookLoadState({
      canvasBundle,
      textbookBundle: null,
      importError: null,
      uploadLabel: "Extracting page 2 of 5"
    })).toEqual({
      state: "loading",
      headline: "Loading",
      detail: "Canvas course data is already loaded. Extracting page 2 of 5."
    });

    expect(describeTextbookLoadState({
      canvasBundle,
      textbookBundle,
      importError: null,
      uploadLabel: null
    })).toEqual({
      state: "ready",
      headline: "Ready",
      detail: "Deterministic Ethics Reader is loaded. Canvas course data remains loaded, and synthesis can begin."
    });
  });
});
