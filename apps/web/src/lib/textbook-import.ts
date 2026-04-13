import {
  SCHEMA_VERSION,
  createManualCaptureBundle,
  mergeCaptureBundle,
  slugify,
  stableHash,
  type CaptureBundle,
  type CaptureItem
} from "@learning/schema";
import { sanitizeImportedText, sanitizeImportedTitle } from "./source-cleaning";

export type TextbookSegment = {
  title: string;
  text: string;
  tags?: string[];
};

export type TextbookImportInput = {
  title: string;
  text: string;
  segments?: TextbookSegment[];
  format: "pdf" | "docx" | "text" | "paste";
};

function createManifest(items: CaptureItem[]) {
  return {
    itemCount: items.length,
    resourceCount: 0,
    captureKinds: Array.from(new Set(items.map((item) => item.kind))),
    sourceUrls: Array.from(new Set(items.map((item) => item.canonicalUrl)))
  };
}

function buildTextbookItem(input: {
  sourceTitle: string;
  itemTitle: string;
  text: string;
  canonicalUrl: string;
  capturedAt: string;
  format: TextbookImportInput["format"];
  tags?: string[];
}): CaptureItem {
  const plainText = input.text.trim();
  const title = input.itemTitle.trim() || input.sourceTitle.trim() || "Textbook Source";
  const headingTrail = title === input.sourceTitle ? [input.sourceTitle] : [input.sourceTitle, title];

  return {
    id: stableHash(`${input.canonicalUrl}:${plainText}`),
    kind: "document",
    title,
    canonicalUrl: input.canonicalUrl,
    plainText,
    excerpt: plainText.slice(0, 240),
    headingTrail,
    tags: ["textbook", `import:${input.format}`, ...(input.tags ?? [])],
    capturedAt: input.capturedAt,
    contentHash: stableHash(plainText)
  };
}

export function createTextbookCaptureBundle(input: TextbookImportInput): CaptureBundle {
  const title = sanitizeImportedTitle(input.title);
  const trimmedText = sanitizeImportedText(input.text);
  const sourceSlug = slugify(title) || "textbook";
  const capturedAt = new Date().toISOString();
  const validSegments = (input.segments ?? [])
    .map((segment) => ({
      ...segment,
      title: sanitizeImportedTitle(segment.title),
      text: sanitizeImportedText(segment.text)
    }))
    .filter((segment) => segment.text.length > 0);

  if (validSegments.length <= 1) {
    const bundle = createManualCaptureBundle({
      title,
      text: trimmedText || validSegments[0]?.text || "",
      canonicalUrl: `https://local.learning/textbook/${sourceSlug}`,
      kind: "document"
    });

    return {
      ...bundle,
      items: bundle.items.map((item) => ({
        ...item,
        headingTrail: [title],
        tags: ["textbook", `import:${input.format}`]
      }))
    };
  }

  const items = validSegments.map((segment, index) => {
    const segmentTitle = segment.title.trim() || `Section ${index + 1}`;
    const fragment = slugify(`${index + 1}-${segmentTitle}`) || `section-${index + 1}`;

    return buildTextbookItem({
      sourceTitle: title,
      itemTitle: segmentTitle,
      text: segment.text,
      canonicalUrl: `https://local.learning/textbook/${sourceSlug}#${fragment}`,
      capturedAt,
      format: input.format,
      tags: [
        `segment-index:${index + 1}`,
        `segment-title:${segmentTitle}`,
        ...(segment.tags ?? [])
      ]
    });
  });

  return {
    schemaVersion: SCHEMA_VERSION,
    source: "manual-import",
    title,
    capturedAt,
    items,
    resources: [],
    manifest: createManifest(items)
  };
}

export function mergeTextbookIntoBundle(
  currentBundle: CaptureBundle | null,
  input: TextbookImportInput
): CaptureBundle {
  const textbookBundle = createTextbookCaptureBundle(input);
  if (!currentBundle) {
    return textbookBundle;
  }

  const merged = textbookBundle.items.reduce(
    (bundle, item) => mergeCaptureBundle(bundle, item, []),
    currentBundle
  );

  return {
    ...merged,
    title: currentBundle.title,
    source: currentBundle.source,
    captureMeta: currentBundle.captureMeta
  };
}
