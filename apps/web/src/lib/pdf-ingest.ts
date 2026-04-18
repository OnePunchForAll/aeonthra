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

export type PdfExtractStatus = {
  stage: "loading-runtime" | "opening-document" | "retrying-without-worker" | "extracting-pages";
  progress: number;
  label: string;
};

function inferTitleFromName(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim() || "Untitled PDF";
}

type PdfJsModule = typeof import("pdfjs-dist/legacy/webpack.mjs");

type PdfTextItem = {
  str?: string;
  transform?: number[];
};

type PdfPageTextContent = {
  items: unknown[];
};

type PdfPageLike = {
  getTextContent(): Promise<PdfPageTextContent>;
};

type PdfDocumentLike = {
  numPages: number;
  getPage(pageNumber: number): Promise<PdfPageLike>;
};

type PdfLoadingTaskLike = {
  promise: Promise<PdfDocumentLike>;
  destroy?: () => Promise<void> | void;
};

type PdfRuntimeLike = {
  getDocument(options: Record<string, unknown>): PdfLoadingTaskLike;
};

let pdfJsLoader: Promise<PdfJsModule> | null = null;

const PDF_DOCUMENT_OPEN_TIMEOUT_MS = 12000;
const PDF_DOCUMENT_FALLBACK_TIMEOUT_MS = 20000;

export async function loadPdfJsRuntime(): Promise<PdfJsModule> {
  if (!pdfJsLoader) {
    pdfJsLoader = import("pdfjs-dist/legacy/webpack.mjs").catch((error) => {
      pdfJsLoader = null;
      throw error;
    });
  }

  return pdfJsLoader;
}

function pdfStatus(stage: PdfExtractStatus["stage"], progress: number, label: string): PdfExtractStatus {
  return { stage, progress, label };
}

function clonePdfBinaryPayload(arrayBuffer: ArrayBuffer): Uint8Array {
  return new Uint8Array(arrayBuffer.slice(0));
}

async function destroyPdfLoadingTask(task: PdfLoadingTaskLike): Promise<void> {
  try {
    await task.destroy?.();
  } catch {
    // Ignore cleanup failures; the primary error explains the actual ingest fault.
  }
}

async function awaitPdfLoadingTask(
  task: PdfLoadingTaskLike,
  timeoutMs: number
): Promise<PdfDocumentLike> {
  let timeoutHandle: ReturnType<typeof globalThis.setTimeout> | null = null;
  const timeoutPromise = new Promise<PdfDocumentLike>((_, reject) => {
    timeoutHandle = globalThis.setTimeout(() => {
      reject(new Error(`PDF document open timed out after ${timeoutMs}ms.`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([task.promise, timeoutPromise]);
  } catch (error) {
    await destroyPdfLoadingTask(task);
    throw error;
  } finally {
    if (timeoutHandle !== null) {
      globalThis.clearTimeout(timeoutHandle);
    }
  }
}

function describePdfDocumentOpenFailure(primaryError: unknown, fallbackError: unknown): string {
  const primaryDetail = primaryError instanceof Error ? primaryError.message : String(primaryError);
  const fallbackDetail = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);

  return [
    "PDF intake stalled before text extraction could begin.",
    "AEONTHRA retried in compatibility mode, but the document still would not open.",
    `Primary open error: ${primaryDetail}`,
    `Compatibility open error: ${fallbackDetail}`,
    "Try a text-based PDF, DOCX, or pasted textbook text."
  ].join(" ");
}

export async function openPdfDocumentWithFallback(
  pdfjsLib: PdfRuntimeLike,
  arrayBuffer: ArrayBuffer,
  onStatus?: (status: PdfExtractStatus) => void,
  timeouts: {
    workerOpenTimeoutMs?: number;
    compatibilityOpenTimeoutMs?: number;
  } = {}
): Promise<PdfDocumentLike> {
  const compatibilityData = clonePdfBinaryPayload(arrayBuffer);

  try {
    const workerTask = pdfjsLib.getDocument({
      data: arrayBuffer
    });
    return await awaitPdfLoadingTask(
      workerTask,
      timeouts.workerOpenTimeoutMs ?? PDF_DOCUMENT_OPEN_TIMEOUT_MS
    );
  } catch (primaryError) {
    onStatus?.(pdfStatus("retrying-without-worker", 18, "Retrying PDF in compatibility mode"));

    try {
      const compatibilityTask = pdfjsLib.getDocument({
        data: compatibilityData,
        disableWorker: true
      });
      return await awaitPdfLoadingTask(
        compatibilityTask,
        timeouts.compatibilityOpenTimeoutMs ?? PDF_DOCUMENT_FALLBACK_TIMEOUT_MS
      );
    } catch (fallbackError) {
      throw new Error(describePdfDocumentOpenFailure(primaryError, fallbackError));
    }
  }
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
  onProgress?: (page: number, total: number) => void,
  onStatus?: (status: PdfExtractStatus) => void
): Promise<ExtractedPdf> {
  onStatus?.(pdfStatus("loading-runtime", 8, "Loading PDF runtime"));
  const pdfjsLib = await loadPdfJsRuntime();
  const arrayBuffer = await file.arrayBuffer();
  onStatus?.(pdfStatus("opening-document", 12, "Opening PDF document"));
  const document = await openPdfDocumentWithFallback(pdfjsLib, arrayBuffer, onStatus);
  const pageTexts: string[] = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const text = await page.getTextContent();
    const items = text.items as PdfTextItem[];
    const lines: string[] = [];
    let currentLine = "";
    let lastY: number | null = null;

    onStatus?.(
      pdfStatus(
        "extracting-pages",
        document.numPages > 0 ? 24 + (pageNumber / document.numPages) * 76 : 24,
        `Extracting page ${pageNumber} of ${document.numPages}`
      )
    );

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
      await new Promise((resolve) => globalThis.setTimeout(resolve, 0));
    }
  }

  return {
    title: inferTitleFromName(file.name),
    totalPages: document.numPages,
    text: pageTexts.join("\n\n"),
    chapters: detectChapters(pageTexts)
  };
}
