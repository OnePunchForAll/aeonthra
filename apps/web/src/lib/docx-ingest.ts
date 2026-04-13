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

export function inferDocxSegmentsFromHtml(html: string): TextbookSegment[] {
  const pattern = /<(h[1-6]|p|li)[^>]*>([\s\S]*?)<\/\1>/gi;
  const segments: TextbookSegment[] = [];
  let currentTitle = "Document Section";
  let currentLines: string[] = [];

  const flush = () => {
    const text = sanitizeImportedText(currentLines.join("\n\n"));
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
    const text = sanitizeImportedText(stripDocxHtml(match[2] ?? ""));
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
  const text = sanitizeImportedText(rawTextResult.value);
  const segments = inferDocxSegmentsFromHtml(htmlResult.value);

  return {
    title,
    text,
    segments
  };
}
