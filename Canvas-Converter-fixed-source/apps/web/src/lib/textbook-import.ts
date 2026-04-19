import {
  SCHEMA_VERSION,
  createManualCaptureBundle,
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
  canonicalUrl?: string;
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

function createManifest(items: CaptureItem[], resourceCount = 0) {
  return {
    itemCount: items.length,
    resourceCount,
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
    titleSource: "structured",
    canonicalUrl: input.canonicalUrl,
    plainText,
    excerpt: plainText.slice(0, 240),
    headingTrail,
    tags: ["textbook", `import:${input.format}`, ...(input.tags ?? [])],
    submissionTypes: [],
    capturedAt: input.capturedAt,
    contentHash: stableHash(plainText)
  };
}

function buildWindowedSegments(
  blocks: string[],
  sourceTitle: string,
  tag: string,
  blockLimit = 4,
  charLimit = 3800
): TextbookSegment[] {
  const chunks: TextbookSegment[] = [];
  let currentBlocks: string[] = [];
  let currentLength = 0;

  for (const block of blocks) {
    const nextLength = currentLength + block.length + (currentBlocks.length > 0 ? 2 : 0);
    if (currentBlocks.length >= blockLimit || nextLength > charLimit) {
      chunks.push({
        title: `${sourceTitle} Part ${chunks.length + 1}`,
        text: currentBlocks.join("\n\n"),
        tags: [tag]
      });
      currentBlocks = [];
      currentLength = 0;
    }

    currentBlocks.push(block);
    currentLength += block.length + (currentBlocks.length > 1 ? 2 : 0);
  }

  if (currentBlocks.length > 0) {
    chunks.push({
      title: `${sourceTitle} Part ${chunks.length + 1}`,
      text: currentBlocks.join("\n\n"),
      tags: [tag]
    });
  }

  return chunks;
}

function cleanedParagraphBlocks(text: string): string[] {
  return sanitizeImportedText(text)
    .replace(/\r/g, "")
    .split(/\n{2,}/)
    .map((block) =>
      block
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !isBoilerplateLine(line))
        .join("\n")
        .trim()
    )
    .filter((block) => block.length >= 80);
}

function isLikelySectionHeading(line: string): boolean {
  if (!line || line.length > 90 || /[.!?]$/.test(line)) {
    return false;
  }

  if (/^(chapter|section|part|module|week|lesson|unit)\b/i.test(line)) {
    return true;
  }

  if (/^\d+(?:\.\d+)*[:.)-]?\s+\S+/.test(line)) {
    return true;
  }

  return false;
}

function headingBlocks(text: string): string[] {
  const lines = sanitizeImportedText(text)
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !isBoilerplateLine(line));

  const blocks: string[] = [];
  let currentLines: string[] = [];

  const pushCurrent = () => {
    const block = currentLines.join("\n").trim();
    if (block.length >= 80) {
      blocks.push(block);
    }
    currentLines = [];
  };

  for (const line of lines) {
    if (isLikelySectionHeading(line) && currentLines.length > 0) {
      pushCurrent();
    }
    currentLines.push(line);
  }

  if (currentLines.length > 0) {
    pushCurrent();
  }

  return blocks;
}

function sentenceWindowChunks(text: string, sourceTitle: string): TextbookSegment[] {
  const normalized = stripTextbookNoise(text);
  const sentences = normalized
    .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  if (sentences.length === 0) {
    return [];
  }

  if (sentences.length === 1) {
    return [{ title: sourceTitle, text: sentences[0], tags: ["fallback-single-chunk"] }];
  }

  return buildWindowedSegments(sentences, sourceTitle, "fallback-sentence-window", 6, 2200);
}

function paragraphChunks(text: string, sourceTitle: string): TextbookSegment[] {
  const paragraphs = cleanedParagraphBlocks(text);

  if (paragraphs.length > 1) {
    return buildWindowedSegments(paragraphs, sourceTitle, "fallback-paragraph-window");
  }

  const sections = headingBlocks(text);
  if (sections.length > 1) {
    return buildWindowedSegments(sections, sourceTitle, "fallback-heading-window", 2, 3200);
  }

  return sentenceWindowChunks(text, sourceTitle);
}

export function createTextbookCaptureBundle(input: TextbookImportInput): CaptureBundle {
  const normalized = normalizeTextbookImport(input);
  const title = normalized.title;
  const trimmedText = normalized.text;
  const sourceSlug = slugify(title) || "textbook";
  const baseCanonicalUrl = (input.canonicalUrl ?? "").trim() || `https://local.learning/textbook/${sourceSlug}`;
  const capturedAt = new Date().toISOString();
  const validSegments = normalized.segments;
  const rawSingleSegmentText =
    validSegments.length === 1
      ? (input.segments ?? []).find(
        (segment) => sanitizeImportedTitle(segment.title) === validSegments[0]?.title
      )?.text ?? validSegments[0]?.text ?? ""
      : "";
  const fallbackSourceText =
    validSegments.length === 1
      ? rawSingleSegmentText
      : input.text || trimmedText || validSegments[0]?.text || "";

  const fallbackSegments = validSegments.length <= 1
    ? paragraphChunks(fallbackSourceText, validSegments[0]?.title || title)
    : [];
  const segmentsToRender = validSegments.length > 1 ? validSegments : fallbackSegments;

  if (segmentsToRender.length === 0) {
    const bundle = createManualCaptureBundle({
      title,
      text: trimmedText || validSegments[0]?.text || "",
      canonicalUrl: baseCanonicalUrl,
      kind: "document"
    });

    return {
      ...bundle,
      items: bundle.items.map((item) => ({
        ...item,
        headingTrail: [title],
        tags: ["textbook", `import:${input.format}`, "fallback-single-document"]
      }))
    };
  }

  const items = segmentsToRender.map((segment, index) => {
    const segmentTitle =
      segmentsToRender.length === 1
        ? title
        : segment.title.trim() || `Section ${index + 1}`;
    const fragment = slugify(`${index + 1}-${segmentTitle}`) || `section-${index + 1}`;

    return buildTextbookItem({
      sourceTitle: title,
      itemTitle: segmentTitle,
      text: segment.text,
      canonicalUrl: `${baseCanonicalUrl}${baseCanonicalUrl.includes("#") ? "-" : "#"}${fragment}`,
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

  const itemByKey = new Map<string, CaptureItem>();
  for (const item of currentBundle.items) {
    itemByKey.set(item.id, item);
  }
  for (const item of textbookBundle.items) {
    itemByKey.set(item.id, item);
  }

  const resourceById = new Map(currentBundle.resources.map((resource) => [resource.id, resource]));
  for (const resource of textbookBundle.resources) {
    resourceById.set(resource.id, resource);
  }

  const mergedItems = [...itemByKey.values()];
  const mergedResources = [...resourceById.values()];

  return {
    ...currentBundle,
    capturedAt: new Date().toISOString(),
    items: mergedItems,
    resources: mergedResources,
    title: currentBundle.title,
    source: currentBundle.source,
    captureMeta: currentBundle.captureMeta,
    manifest: createManifest(mergedItems, mergedResources.length)
  };
}
