// @ts-expect-error Vite resolves worker assets via ?url.
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

export type ExtractedPdfChapter = {
  title: string;
  startPage: number;
  endPage: number;
  text: string;
};

export type ExtractedPdf = {
  title: string;
  totalPages: number;
  text: string;
  chapters: ExtractedPdfChapter[];
};

function inferTitleFromName(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim() || "Untitled PDF";
}

let pdfJsLoader: Promise<typeof import("pdfjs-dist")> | null = null;

async function loadPdfJs(): Promise<typeof import("pdfjs-dist")> {
  if (!pdfJsLoader) {
    pdfJsLoader = import("pdfjs-dist").then((pdfjsLib) => {
      pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
      return pdfjsLib;
    });
  }

  return pdfJsLoader;
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

export function normalizePdfPageText(pageText: string): string {
  const lines = pageText
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

function detectChapters(pageTexts: string[]): ExtractedPdfChapter[] {
  const chapters: Array<{ title: string; startPage: number }> = [];

  pageTexts.forEach((pageText, index) => {
    const lines = normalizePdfPageText(pageText)
      .split(/\n+/)
      .map((entry) => entry.trim())
      .filter(Boolean)
      .slice(0, 12);
    lines.forEach((line) => {
      const match = line.match(/^(?:chapter|unit|module)\s+(\d+)(?:[:.\-\s]+(.+))?$/i);
      if (match) {
        const number = match[1];
        const rest = match[2]?.trim();
        chapters.push({
          title: rest ? `Chapter ${number}: ${rest}` : `Chapter ${number}`,
          startPage: index + 1
        });
      }
    });
  });

  if (chapters.length === 0) {
    return [{
      title: "Full Document",
      startPage: 1,
      endPage: pageTexts.length,
      text: pageTexts.join("\n\n")
    }];
  }

  return chapters.map((chapter, index) => {
    const next = chapters[index + 1];
    const startIndex = chapter.startPage - 1;
    const endIndex = next ? next.startPage - 1 : pageTexts.length;
    return {
      title: chapter.title,
      startPage: chapter.startPage,
      endPage: next ? next.startPage - 1 : pageTexts.length,
      text: pageTexts.slice(startIndex, endIndex).join("\n\n")
    };
  });
}

export async function extractTextFromPdf(
  file: File,
  onProgress?: (page: number, total: number) => void
): Promise<ExtractedPdf> {
  const pdfjsLib = await loadPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const document = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pageTexts: string[] = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const text = await page.getTextContent();
    const items = text.items as Array<{ str?: string; transform?: number[] }>;
    const lines: string[] = [];
    let currentLine = "";
    let lastY: number | null = null;

    items.forEach((item) => {
      const token = (item.str ?? "").trim();
      if (!token) {
        return;
      }
      const y = item.transform?.[5] ?? null;
      if (lastY !== null && y !== null && Math.abs(y - lastY) > 3) {
        if (currentLine.trim()) {
          lines.push(currentLine.trim());
        }
        currentLine = token;
      } else {
        currentLine = `${currentLine} ${token}`.trim();
      }
      lastY = y;
    });

    if (currentLine.trim()) {
      lines.push(currentLine.trim());
    }

    pageTexts.push(normalizePdfPageText(lines.join("\n")));
    onProgress?.(pageNumber, document.numPages);

    if (pageNumber % 4 === 0) {
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    }
  }

  return {
    title: inferTitleFromName(file.name),
    totalPages: document.numPages,
    text: pageTexts.join("\n\n"),
    chapters: detectChapters(pageTexts)
  };
}
