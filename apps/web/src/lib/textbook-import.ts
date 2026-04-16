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

export const EMPTY_TEXTBOOK_IMPORT_MESSAGE =
  "Textbook import was empty after extraction. Use a text-based PDF or DOCX, or paste readable textbook text.";

const BOILERPLATE_LINE_PATTERNS = [
  /^table of contents$/i,
  /^contents$/i,
  /^copyright(?:\s+\d{4})?$/i,
  /^all rights reserved$/i,
  /^isbn(?:[:\s-].*)?$/i,
  /^published by .+/i,
  /^preface$/i,
  /^acknowledg(?:e)?ments?$/i,
  /^dedication$/i,
  /^about the author$/i,
  /^references$/i,
  /^bibliography$/i,
  /^index$/i
];

const PAGE_MARKER_PATTERN = /^(?:page\s*)?\d+(?:\s*of\s*\d+)?$/i;

function alphaNumericCount(text: string): number {
  const matches = text.match(/[A-Za-z0-9]/g);
  return matches ? matches.length : 0;
}

function isBoilerplateLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) {
    return true;
  }

  if (PAGE_MARKER_PATTERN.test(trimmed)) {
    return true;
  }

  if (BOILERPLATE_LINE_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return true;
  }

  if (/^[\W_]+$/.test(trimmed)) {
    return true;
  }

  return false;
}

function stripTextbookNoise(text: string): string {
  const lines = sanitizeImportedText(text)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !isBoilerplateLine(line));

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function hasSentenceLikeLine(text: string): boolean {
  return text
    .split("\n")
    .map((line) => line.trim())
    .some((line) => line.length >= 32 && /[.!?]/.test(line));
}

function hasMeaningfulText(text: string): boolean {
  const words = text.match(/\b[A-Za-z][A-Za-z'-]{2,}\b/g) ?? [];
  return hasSentenceLikeLine(text) || (alphaNumericCount(text) >= 45 && words.length >= 5);
}

function normalizeTextbookImport(input: TextbookImportInput): {
  title: string;
  text: string;
  segments: TextbookSegment[];
} {
  const title = sanitizeImportedTitle(input.title);
  const text = stripTextbookNoise(input.text);
  const segments = (input.segments ?? [])
    .map((segment) => ({
      ...segment,
      title: sanitizeImportedTitle(segment.title),
      text: stripTextbookNoise(segment.text)
    }))
    .filter((segment) => segment.text.length > 0);

  const combinedText = [text, ...segments.map((segment) => segment.text)].join("\n\n");
  if (!hasMeaningfulText(combinedText)) {
    throw new Error(EMPTY_TEXTBOOK_IMPORT_MESSAGE);
  }

  return { title, text, segments };
}

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
  const normalized = normalizeTextbookImport(input);
  const title = normalized.title;
  const trimmedText = normalized.text;
  const sourceSlug = slugify(title) || "textbook";
  const capturedAt = new Date().toISOString();
  const validSegments = normalized.segments;

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
