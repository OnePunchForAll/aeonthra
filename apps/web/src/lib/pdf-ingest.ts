import * as pdfjsLib from "pdfjs-dist";
// @ts-expect-error Vite resolves worker assets via ?url.
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

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

function detectChapters(pageTexts: string[]): ExtractedPdfChapter[] {
  const chapters: Array<{ title: string; startPage: number }> = [];

  pageTexts.forEach((pageText, index) => {
    const lines = pageText.split(/\n+/).map((entry) => entry.trim()).filter(Boolean).slice(0, 12);
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

    pageTexts.push(lines.join("\n"));
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
