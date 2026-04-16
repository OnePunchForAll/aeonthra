import * as mammoth from "mammoth/mammoth.browser";
import { sanitizeImportedText, sanitizeImportedTitle } from "./source-cleaning";
import type { TextbookSegment } from "./textbook-import";

export type ExtractedDocx = {
  title: string;
  text: string;
  segments: TextbookSegment[];
};

function stripDocxHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, "\"");
}

const BOILERPLATE_LINE_PATTERNS = [
  /^table of contents$/i,
  /^contents$/i,
  /^copyright(?:\s+\d{4})?$/i,
  /^all rights reserved$/i,
  /^isbn(?:[:\s-].*)?$/i,
  /^preface$/i,
  /^acknowledg(?:e)?ments?$/i,
  /^dedication$/i,
  /^references$/i,
  /^bibliography$/i,
  /^index$/i,
  /^about the author$/i
];

const PAGE_MARKER_PATTERN = /^(?:page\s*)?\d+(?:\s*of\s*\d+)?$/i;

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

function normalizeDocxText(text: string): string {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !isBoilerplateLine(line));

  const deduped: string[] = [];
  for (const line of lines) {
    if (deduped[deduped.length - 1] === line) {
      continue;
    }
    deduped.push(line);
  }

  return deduped.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function inferDocxSegmentsFromHtml(html: string): TextbookSegment[] {
  const pattern = /<(h[1-6]|p|li)[^>]*>([\s\S]*?)<\/\1>/gi;
  const segments: TextbookSegment[] = [];
  let currentTitle = "Document Section";
  let currentLines: string[] = [];

  const flush = () => {
    const text = normalizeDocxText(sanitizeImportedText(currentLines.join("\n\n")));
    if (!text) {
      currentLines = [];
      return;
    }
    segments.push({
      title: currentTitle,
      text,
      tags: ["docx"]
    });
    currentLines = [];
  };

  for (const match of html.matchAll(pattern)) {
    const tag = (match[1] ?? "").toLowerCase();
    const text = normalizeDocxText(sanitizeImportedText(stripDocxHtml(match[2] ?? "")));
    if (!text) {
      continue;
    }

    if (tag.startsWith("h")) {
      if (currentLines.length > 0) {
        flush();
      }
      currentTitle = sanitizeImportedTitle(text);
      continue;
    }

    currentLines.push(text);
  }

  if (currentLines.length > 0) {
    flush();
  }

  return segments;
}

function inferTitleFromName(fileName: string): string {
  return sanitizeImportedTitle(fileName.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim() || "Untitled DOCX");
}

export async function extractTextFromDocx(file: File): Promise<ExtractedDocx> {
  const arrayBuffer = await file.arrayBuffer();
  const [htmlResult, rawTextResult] = await Promise.all([
    mammoth.convertToHtml({ arrayBuffer }),
    mammoth.extractRawText({ arrayBuffer })
  ]);

  const title = inferTitleFromName(file.name);
  const text = normalizeDocxText(sanitizeImportedText(rawTextResult.value));
  const segments = inferDocxSegmentsFromHtml(htmlResult.value);

  return {
    title,
    text,
    segments
  };
}
