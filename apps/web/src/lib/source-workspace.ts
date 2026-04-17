import {
  CaptureBundleSchema,
  inspectCanvasCourseKnowledgePack,
  isTextbookCaptureItem,
  mergeCaptureBundle,
  type CaptureBundle,
  type CaptureItem
} from "@learning/schema";
import { z } from "zod";

export type AppStage =
  | "canvas-required"
  | "textbook-required"
  | "synthesis-ready"
  | "synthesizing"
  | "complete";

export type SourceWorkspaceState = {
  canvasBundle: CaptureBundle | null;
  textbookBundle: CaptureBundle | null;
};

export type BundleSummary = {
  title: string;
  itemCount: number;
  assignmentCount: number;
  discussionCount: number;
  quizCount: number;
  pageCount: number;
  moduleCount: number;
  documentCount: number;
};

const SourceWorkspaceStateSchema = z.object({
  canvasBundle: CaptureBundleSchema.nullable(),
  textbookBundle: CaptureBundleSchema.nullable()
});

function isTextbookItem(item: CaptureItem): boolean {
  return isTextbookCaptureItem(item);
}

function canonicalizeBundle(bundle: CaptureBundle, items: CaptureItem[]): CaptureBundle | null {
  if (items.length === 0) {
    return null;
  }

  const sourceUrls = Array.from(new Set(items.map((item) => item.canonicalUrl)));
  const captureKinds = Array.from(new Set(items.map((item) => item.kind)));

  return {
    ...bundle,
    items,
    resources: bundle.resources.filter((resource) => items.some((item) => item.id === resource.sourceItemId)),
    manifest: {
      itemCount: items.length,
      resourceCount: bundle.resources.filter((resource) => items.some((item) => item.id === resource.sourceItemId)).length,
      captureKinds,
      sourceUrls
    }
  };
}

export function parseStoredSourceState(raw: string | null): SourceWorkspaceState | null {
  if (!raw) {
    return null;
  }
  try {
    const parsed = SourceWorkspaceStateSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function splitLegacyBundle(bundle: CaptureBundle | null): SourceWorkspaceState {
  if (!bundle) {
    return { canvasBundle: null, textbookBundle: null };
  }

  const textbookItems = bundle.items.filter(isTextbookItem);
  const canvasItems = bundle.items.filter((item) => !isTextbookItem(item));

  return {
    canvasBundle: canonicalizeBundle(bundle, canvasItems),
    textbookBundle: canonicalizeBundle(
      {
        ...bundle,
        source: "manual-import",
        title: textbookItems[0]?.headingTrail[0] ?? textbookItems[0]?.title ?? "Imported Textbook",
        captureMeta: undefined
      },
      textbookItems
    )
  };
}

export function mergeSourceBundles(canvasBundle: CaptureBundle | null, textbookBundle: CaptureBundle | null): CaptureBundle | null {
  if (!canvasBundle) {
    return textbookBundle;
  }
  if (!textbookBundle) {
    return canvasBundle;
  }

  const merged = textbookBundle.items.reduce(
    (bundle, item) => mergeCaptureBundle(bundle, item, textbookBundle.resources.filter((resource) => resource.sourceItemId === item.id)),
    canvasBundle
  );

  return {
    ...merged,
    title: canvasBundle.title,
    source: canvasBundle.source,
    captureMeta: canvasBundle.captureMeta
  };
}

export function summarizeBundle(bundle: CaptureBundle | null): BundleSummary | null {
  if (!bundle) {
    return null;
  }

  const count = (kind: CaptureItem["kind"]) => bundle.items.filter((item) => item.kind === kind).length;

  return {
    title: bundle.title,
    itemCount: bundle.items.length,
    assignmentCount: count("assignment"),
    discussionCount: count("discussion"),
    quizCount: count("quiz"),
    pageCount: count("page"),
    moduleCount: count("module"),
    documentCount: count("document")
  };
}

function normalizedCourseId(bundle: CaptureBundle | null): string {
  return bundle?.captureMeta?.courseId?.trim().toLowerCase() || "";
}

function normalizedBundleHost(bundle: CaptureBundle | null): string {
  const host = bundle?.captureMeta?.sourceHost?.trim().toLowerCase();
  if (host) {
    return host;
  }

  const candidateUrl = bundle?.manifest.sourceUrls[0] || bundle?.items[0]?.canonicalUrl;
  if (!candidateUrl) {
    return "";
  }

  try {
    return new URL(candidateUrl).host.trim().toLowerCase();
  } catch {
    return "";
  }
}

export function isCanvasCaptureBundle(bundle: CaptureBundle | null): boolean {
  return inspectCanvasCourseKnowledgePack(bundle).ok;
}

export function isSameCourse(left: CaptureBundle | null, right: CaptureBundle | null): boolean {
  if (!left || !right) {
    return false;
  }
  const leftCourseId = normalizedCourseId(left);
  const rightCourseId = normalizedCourseId(right);
  if (!leftCourseId || !rightCourseId || leftCourseId !== rightCourseId) {
    return false;
  }

  const leftHost = normalizedBundleHost(left);
  const rightHost = normalizedBundleHost(right);
  if (leftHost && rightHost) {
    return leftHost === rightHost;
  }

  return true;
}

export function determineAppStage(input: {
  canvasBundle: CaptureBundle | null;
  textbookBundle: CaptureBundle | null;
  learningReady: boolean;
  synthesisRequested: boolean;
}): AppStage {
  if (!input.canvasBundle) {
    return "canvas-required";
  }
  if (!input.textbookBundle) {
    return "textbook-required";
  }
  if (input.learningReady) {
    return "complete";
  }
  if (input.synthesisRequested) {
    return "synthesizing";
  }
  return "synthesis-ready";
}
