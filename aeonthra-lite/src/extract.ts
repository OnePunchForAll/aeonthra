import type { SourceDoc } from "./types";
import { stableHash } from "./storage";
import { normalizeWhitespace } from "./engine";
import { Readability } from "@mozilla/readability";
import mammoth from "mammoth";
import DOMPurify from "dompurify";

// Sanitize untrusted HTML before we ever parse it for structure or show it to
// the user. Mammoth explicitly says it does not sanitize; pasted web pages are
// by definition untrusted. Strip <script>, on*-handlers, <iframe>, and other
// script-execution vectors so the engine only ever sees inert content.
function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form", "input", "button", "select", "textarea"],
    FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus", "onblur", "onchange", "onsubmit", "onkeydown", "onkeyup", "onkeypress"],
    ALLOW_DATA_ATTR: false
  });
}

// Words that frequently follow a *legitimate* hyphen boundary and should NOT be merged.
// Example: "Career- and Professional-Development Resources" — here "and" is a real connector.
const HYPHEN_STOP_RIGHT = new Set([
  "and","but","not","the","but","are","was","for","its","his","her","our","you","she","him","can","may","now",
  "has","had","did","get","got","see","say","one","two","all","any","let","who","why","how","out","off","too","yes","yet",
  "as","by","via","per","nor","off","so","or"
]);
// Common prefixes that form real English compounds with hyphen: "self- help", "co- workers", etc.
const HYPHEN_STOP_LEFT = new Set([
  "self","co","pre","non","anti","post","inter","sub","over","under","multi","semi","mid","mis","re","un","dis",
  "in","out","up","down","on","off","pro","anti","ex","bi","tri","quad"
]);

export function rejoinHyphenation(text: string): string {
  // Rejoin words PDF extraction split across line/column breaks, e.g. "docu- ment" → "document".
  // Skip real hyphen compounds and legitimate function-word continuations.
  return text.replace(/\b([a-z]+)-\s+([a-z]{3,})\b/g, (match, left, right) => {
    if (HYPHEN_STOP_RIGHT.has(right.toLowerCase())) return match;
    if (HYPHEN_STOP_LEFT.has(left.toLowerCase())) return match;
    return left + right;
  });
}

// Flow-embedded patterns catch textbook headings even when PDF extraction drops newlines.
// The capture groups after the marker are the heading title we want to surface.
const FLOW_HEADING_PATTERNS: Array<RegExp> = [
  /(?:\s|^)chapter\s+(\d+)\s+([A-Z][\w][^.!?\n]{3,120}?)(?=\s+(?:Chapter|Section|Part|PART|\d+\.\d+|©|Introduction|Conclusion|Learning Outcomes)\b|[.!?\n])/g,
  /(?:\s|^)section\s+(\d+\.\d+)\s+([A-Z][\w][^.!?\n]{3,120}?)(?=\s+(?:Chapter|Section|Part|PART|\d+\.\d+|©|Introduction|Conclusion|Learning Outcomes)\b|[.!?\n])/gi,
  /(?:\s|^)part\s+(\d+)\s+([A-Z][\w][^.!?\n]{3,120}?)(?=\s+(?:Chapter|Section|Part|PART|\d+\.\d+|©|Introduction|Conclusion|Learning Outcomes)\b|[.!?\n])/gi,
  /(?:\s|^)(\d+\.\d+)\s+([A-Z][\w][^.!?\n]{3,120}?)(?=\s+(?:Chapter|Section|Part|PART|\d+\.\d+|©|Introduction|Conclusion|Learning Outcomes)\b|[.!?\n])/g
];

// English verbs / sentence-starter words that indicate the flow regex over-ran past the heading
// into prose. We truncate the heading at the first one.
const HEADING_STOP_VERBS = new Set([
  "have","has","had","having",
  "do","does","did","doing",
  "is","are","was","were","be","been","being",
  "can","could","will","would","should","may","might","must","shall","ought","let","lets",
  "go","goes","gone","went","going",
  "make","makes","made","making",
  "take","takes","took","taken","taking",
  "get","gets","got","gotten","getting",
  "see","sees","saw","seen","seeing",
  "know","knows","knew","known","knowing",
  "think","thinks","thought","thinking",
  "find","finds","found","finding",
  "give","gives","gave","given","giving",
  "tell","tells","told","telling",
  "ask","asks","asked","asking",
  "show","shows","showed","shown","showing",
  "start","starts","started","starting",
  "need","needs","needed","needing",
  "try","tries","tried","trying",
  "help","helps","helped","helping",
  "use","uses","used","using",
  "put","puts","putting",
  "keep","kept","keeping",
  "let's","lets","let",
  // Pronouns that almost always begin a prose sentence, not a heading word
  "you","your","we","our","ours","they","their","them","he","his","him","she","hers",
  "i","me","my","mine","it","its","this","that","these","those","there","here","what","how","why","when","where",
  "if","unless","because","although","though","while","whereas",
  "however","therefore","thus","moreover","furthermore","nevertheless","nonetheless","consequently",
  "research","according"
]);

// Title-Case words that strongly indicate the heading has ended and prose / captioned
// figures / tables have begun. Truncate the heading before these.
const HEADING_SOFT_STOP = new Set([
  "Figure","Table","Chart","Image","Photo","Photograph","Quiz","Exercise","Activity","Box",
  "Example","Several","Few","Almost","Questions","Responses","Power","Online","Introduction",
  "Personal","Remember","Research","Lack","Power","Freewriter"
]);

function trimHeadingWords(value: string): string {
  const words = value.split(/\s+/);
  const kept: string[] = [];
  for (const word of words) {
    const stripped = word.replace(/[•*,;:!?]/g, "").replace(/[.]+$/, "");
    if (!stripped) break;
    if (HEADING_STOP_VERBS.has(stripped.toLowerCase())) break;
    if (HEADING_SOFT_STOP.has(stripped)) break;
    const isConnector = /^(of|and|or|in|on|for|to|the|a|an|as|with|by|from|at|vs\.?|via|per)$/i.test(stripped);
    const startsLower = /^[a-z]/.test(stripped);
    if (startsLower && !isConnector) break;
    kept.push(stripped);
    if (kept.length >= 5) break;
  }
  while (kept.length > 0 && /^(of|and|or|in|on|for|to|the|a|an|as|with|by|from|at|vs\.?)$/i.test(kept[kept.length - 1]!)) {
    kept.pop();
  }
  return kept.join(" ").trim();
}

function trimTitleTail(value: string): string {
  const cleaned = value
    .replace(/\s+©.*$/i, "")
    .replace(/\s+(?:Learning Outcomes|Introduction|Conclusion|Research|Review Questions)\b.*$/i, "")
    .replace(/\s{2,}/g, " ")
    .replace(/[.,;:!?]+$/, "")
    .trim();
  return trimHeadingWords(cleaned);
}

function detectHeadingsFromPlainText(text: string): string[] {
  const seen = new Set<string>();
  const headings: string[] = [];
  const push = (value: string) => {
    const cleaned = value.replace(/\s{2,}/g, " ").trim();
    if (cleaned.length < 4 || cleaned.length > 120) return;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    headings.push(cleaned);
  };

  // Flow-embedded textbook markers (Chapter N, Section N.N, PART N, N.N).
  for (const pattern of FLOW_HEADING_PATTERNS) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const title = match[2] ? trimTitleTail(match[2]) : "";
      if (title) push(title);
    }
    pattern.lastIndex = 0;
  }

  // Line-based heuristics for plain or markdown text.
  const rawLines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  for (let i = 0; i < rawLines.length; i += 1) {
    const line = rawLines[i]!;
    if (line.length < 3 || line.length > 120) continue;
    if (/^page\s*\d+$/i.test(line)) continue;
    if (/^\d+$/.test(line)) continue;
    if (/^(chapter|section|part|unit|module|lesson)\s+\d+/i.test(line)) { push(line); continue; }
    if (/^\d+(?:\.\d+)*\s+[A-Z][A-Za-z].*/.test(line) && line.split(/\s+/).length <= 14) { push(line); continue; }
    const words = line.split(/\s+/);
    if (words.length >= 1 && words.length <= 12 && /^[A-Z]/.test(line) && !/[.!?;,]$/.test(line)) {
      const capWords = words.filter((word) => /^[A-Z][A-Za-z'/-]*/.test(word)).length;
      if (capWords >= Math.ceil(words.length * 0.55)) {
        const next = rawLines[i + 1] ?? "";
        if (!next || next.length > line.length * 1.3 || /^[A-Z]/.test(next) === false) {
          push(line);
          continue;
        }
      }
    }
    if (/^[A-Z][A-Z\s\-:&0-9]{3,80}$/.test(line) && !/^[A-Z]{2,5}$/.test(line) && /[A-Z]{3,}/.test(line)) {
      push(line);
    }
  }
  return headings.slice(0, 800);
}

const NOISE_TAGS = ["script","style","noscript","iframe","svg","nav","header","footer","aside","form"];
const NOISE_SELECTORS = "[aria-hidden='true'],[hidden],.sr-only,.screenreader-only,.visually-hidden,#sidebar,.sidebar,.navigation,.nav,.menu,.breadcrumbs";

export function stripHtml(html: string, options: { url?: string } = {}): { title: string; headings: string[]; text: string; readerText: string; siteName: string } {
  const clean = sanitizeHtml(html);
  // Parse once for Readability (it mutates its input), then parse again for structure harvesting.
  const readerDoc = new DOMParser().parseFromString(clean, "text/html");
  // Readability needs a valid base URL; use the caller-provided URL if available, else a local sentinel.
  if (options.url) {
    try {
      const base = readerDoc.createElement("base");
      base.setAttribute("href", options.url);
      readerDoc.head?.appendChild(base);
    } catch { /* ignore */ }
  }

  let readerTitle = "";
  let readerText = "";
  let readerHtml = "";
  let siteName = "";
  try {
    const article = new Readability(readerDoc).parse();
    if (article) {
      readerTitle = (article.title || "").trim();
      readerText = (article.textContent || "").trim();
      readerHtml = article.content || "";
      siteName = article.siteName || "";
    }
  } catch {
    // Readability can throw on malformed input; fall through to manual strip.
  }

  // Independent pass: strip noise and harvest headings + a per-element text stream for semantic analysis.
  const doc = new DOMParser().parseFromString(clean, "text/html");
  NOISE_TAGS.forEach((tag) => doc.querySelectorAll(tag).forEach((el) => el.remove()));
  doc.querySelectorAll(NOISE_SELECTORS).forEach((el) => el.remove());

  const fallbackTitle = (doc.querySelector("h1")?.textContent || doc.title || "").trim();
  const title = (readerTitle || fallbackTitle || "Untitled").trim();

  const headings: string[] = [];
  const seenHeadings = new Set<string>();
  const addHeading = (value: string) => {
    const key = value.toLowerCase();
    if (seenHeadings.has(key)) return;
    seenHeadings.add(key);
    headings.push(value);
  };
  doc.querySelectorAll("h1, h2, h3, h4").forEach((node) => {
    const text = (node.textContent ?? "").replace(/\s+/g, " ").trim();
    if (text && text.length >= 3 && text.length <= 120) addHeading(text);
  });

  // Prefer Readability's cleaned HTML for structure harvesting; fall back to <main>/<article>.
  const structureSource = readerHtml
    ? new DOMParser().parseFromString(sanitizeHtml(`<!doctype html><body>${readerHtml}</body>`), "text/html")
    : doc;
  const main = structureSource.querySelector("main, article, [role='main'], #content, #main, .content, .main, .article, .post")
    ?? structureSource.body
    ?? structureSource.documentElement;
  const parts: string[] = [];
  main.querySelectorAll("h1, h2, h3, h4, p, li, blockquote, pre, figcaption, td, th").forEach((node) => {
    const text = (node.textContent ?? "").replace(/\s+/g, " ").trim();
    if (text && text.length >= 3) parts.push(text);
  });
  // Also pull headings from the reader-cleaned content, since that pass removed nav/ads first.
  structureSource.querySelectorAll("h1, h2, h3, h4").forEach((node) => {
    const text = (node.textContent ?? "").replace(/\s+/g, " ").trim();
    if (text && text.length >= 3 && text.length <= 120) addHeading(text);
  });

  const text = normalizeWhitespace(parts.join("\n"));
  const pristineReaderText = readerText || text;
  return { title, headings, text, readerText: pristineReaderText, siteName };
}

export function sourceFromText(title: string, text: string, kind: SourceDoc["kind"] = "paste"): SourceDoc {
  const firstLine = text.split(/\n/).map((line) => line.trim()).find((line) => line.length > 0) ?? "";
  const inferredTitle = title.trim() || (firstLine.length > 0 && firstLine.length <= 120 ? firstLine : "Pasted source");
  const markdownHeadings = (text.match(/^#{1,4}\s+.+$/gm) ?? []).map((entry) => entry.replace(/^#{1,4}\s+/, "").trim()).filter(Boolean);
  const plainDetected = detectHeadingsFromPlainText(text);
  const seen = new Set<string>();
  const headings: string[] = [];
  for (const heading of [...markdownHeadings, ...plainDetected]) {
    const key = heading.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    headings.push(heading);
  }
  const id = stableHash(`${inferredTitle}:${text}`);
  const normalized = normalizeWhitespace(text);
  return {
    id,
    title: inferredTitle,
    kind,
    text: normalized,
    readerText: normalized,
    headings: headings.slice(0, 500),
    capturedAt: new Date().toISOString()
  };
}

export function sourceFromHtml(title: string, html: string, url?: string): SourceDoc {
  const stripped = stripHtml(html, { url });
  const finalTitle = title.trim() || stripped.title;
  const id = stableHash(`${finalTitle}:${url ?? stripped.text.slice(0, 120)}`);
  return {
    id,
    title: finalTitle,
    url,
    kind: "html",
    text: stripped.text,
    readerText: stripped.readerText,
    siteName: stripped.siteName || undefined,
    headings: stripped.headings,
    capturedAt: new Date().toISOString()
  };
}

export async function sourceFromDocx(file: File): Promise<SourceDoc> {
  const arrayBuffer = await file.arrayBuffer();
  let rawText = "";
  try {
    const result = await mammoth.extractRawText({ arrayBuffer });
    rawText = result.value ?? "";
  } catch (error) {
    throw new Error(`DOCX extraction failed: ${error instanceof Error ? error.message : String(error)}`);
  }
  const title = (file.name.replace(/\.docx$/i, "") || "Uploaded DOCX").slice(0, 120);
  const normalized = normalizeWhitespace(rawText);
  const headings = detectHeadingsFromPlainText(normalized);
  const id = stableHash(`${title}:${file.size}:${file.lastModified}`);
  return {
    id,
    title,
    kind: "docx",
    text: normalized,
    readerText: normalized,
    headings: headings.slice(0, 500),
    capturedAt: new Date().toISOString()
  };
}

export async function sourceFromPdf(file: File, onProgress?: (page: number, total: number) => void): Promise<SourceDoc> {
  const pdfjs = await import("pdfjs-dist");
  const workerUrl = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url);
  (pdfjs as unknown as { GlobalWorkerOptions: { workerSrc: string } }).GlobalWorkerOptions.workerSrc = workerUrl.toString();
  const buffer = await file.arrayBuffer();
  const loadingTask = (pdfjs as unknown as { getDocument: (data: { data: ArrayBuffer }) => { promise: Promise<unknown> } }).getDocument({ data: buffer });
  const pdf = await loadingTask.promise as {
    numPages: number;
    getPage: (n: number) => Promise<{ getTextContent: () => Promise<{ items: Array<{ str?: string }> }> }>;
  };
  const chunks: string[] = [];
  const headings: string[] = [];
  const total = pdf.numPages;
  for (let pageNum = 1; pageNum <= total; pageNum += 1) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const lines = content.items.map((item) => item.str ?? "").filter(Boolean).join(" ").trim();
    if (lines) chunks.push(lines);
    if (onProgress) onProgress(pageNum, total);
  }
  const joined = rejoinHyphenation(normalizeWhitespace(chunks.join("\n\n")));
  const guessedTitle = (file.name.replace(/\.pdf$/i, "") || "Uploaded PDF").slice(0, 120);
  const id = stableHash(`${guessedTitle}:${file.size}:${file.lastModified}`);
  const detectedHeadings = detectHeadingsFromPlainText(joined);
  return {
    id,
    title: guessedTitle,
    kind: "pdf",
    text: joined,
    readerText: joined,
    headings: [...headings, ...detectedHeadings].slice(0, 500),
    capturedAt: new Date().toISOString()
  };
}

// Import the JSON produced by any AEONTHRA-compatible extension capture. Recognizes:
// (1) Readability-style page export: { url, title, cleanText, cleanHtml, siteName, timestamp }
// (2) Old ExtractedPage:            { url, title, blocks, plainText, headings, capturedAt }
// (3) CaptureBundle with items:     { source, title, items: [{ plainText, headingTrail, tags }] }
export function sourceFromJson(raw: string): SourceDoc[] {
  const parsed = JSON.parse(raw);

  // (1) Readability-style clean capture (preferred for universal web pages).
  if (parsed && typeof parsed === "object" && "cleanText" in parsed && typeof (parsed as { cleanText: unknown }).cleanText === "string") {
    const page = parsed as {
      url?: string;
      title?: string;
      timestamp?: string;
      cleanText: string;
      cleanHtml?: string;
      siteName?: string;
    };
    const title = (page.title || "").trim() || "Captured page";
    const normalizedText = normalizeWhitespace(page.cleanText);
    const headingsFromHtml: string[] = [];
    if (page.cleanHtml) {
      try {
        const doc = new DOMParser().parseFromString(sanitizeHtml(page.cleanHtml), "text/html");
        doc.querySelectorAll("h1, h2, h3, h4").forEach((node) => {
          const text = (node.textContent ?? "").replace(/\s+/g, " ").trim();
          if (text && text.length >= 3 && text.length <= 120) headingsFromHtml.push(text);
        });
      } catch {
        // ignore
      }
    }
    const detectedHeadings = detectHeadingsFromPlainText(normalizedText);
    const headings = Array.from(new Set([...headingsFromHtml, ...detectedHeadings])).slice(0, 500);
    const id = stableHash(`${title}:${page.url ?? ""}:${normalizedText.slice(0, 200)}`);
    return [{
      id,
      title,
      url: page.url,
      kind: "generic-page",
      text: normalizedText,
      readerText: normalizedText,
      siteName: page.siteName || undefined,
      headings,
      capturedAt: page.timestamp || new Date().toISOString()
    }];
  }

  // (2) Old ExtractedPage shape.
  if (parsed && typeof parsed === "object" && "blocks" in parsed && "plainText" in parsed) {
    const page = parsed as {
      url?: string;
      title?: string;
      headings?: Array<{ level: number; text: string }>;
      plainText: string;
      capturedAt?: string;
    };
    const headings = (page.headings ?? []).map((heading) => heading.text).filter(Boolean);
    const title = page.title?.trim() || "Captured page";
    const normalized = normalizeWhitespace(page.plainText);
    const id = stableHash(`${title}:${page.url ?? ""}:${normalized.slice(0, 200)}`);
    return [{
      id,
      title,
      url: page.url,
      kind: "generic-page",
      text: normalized,
      readerText: normalized,
      headings,
      capturedAt: page.capturedAt ?? new Date().toISOString()
    }];
  }

  // (3) CaptureBundle with items.
  if (parsed && typeof parsed === "object" && Array.isArray((parsed as { items?: unknown[] }).items)) {
    const bundle = parsed as {
      title?: string;
      source?: string;
      items: Array<{ id: string; title: string; canonicalUrl?: string; plainText: string; headingTrail?: string[]; tags?: string[]; kind?: string; capturedAt?: string }>;
    };
    return bundle.items.map((item) => {
      const normalized = normalizeWhitespace(item.plainText ?? "");
      // Dedupe doubled titles from the Canvas extension's page-title + h1 merge:
      // "Week 4 - Discussion Forum 1Week 4 - Discussion Forum 1" → "Week 4 - Discussion Forum 1"
      // "Course HomeCourse Home" → "Course Home"
      // "Discussion Topic: Global Campus CaféGlobal Campus Café" → "Discussion Topic: Global Campus Café"
      const dedupeDoubledTitle = (raw: string): string => {
        const trimmed = raw.trim();
        if (trimmed.length < 8) return trimmed;
        const half = Math.floor(trimmed.length / 2);
        // Exact-middle doubled: "FooFoo" or "Foo Foo Foo Foo" where both halves equal.
        const firstHalf = trimmed.slice(0, half);
        const secondHalf = trimmed.slice(half);
        if (firstHalf === secondHalf) return firstHalf;
        // Prefix + repeat: "Discussion Topic: XX" — find the last occurrence of a
        // substring that matches an earlier substring, and if it's at the tail, trim it.
        const words = trimmed.split(/\s+/);
        for (let split = Math.floor(words.length / 2); split >= 2; split -= 1) {
          const tail = words.slice(words.length - split).join(" ");
          const before = words.slice(0, words.length - split).join(" ");
          if (before.endsWith(tail) && tail.length >= 6) {
            return before;
          }
        }
        return trimmed;
      };
      return {
        id: item.id || stableHash(`${item.title}:${normalized.slice(0, 200)}`),
        title: dedupeDoubledTitle(item.title || "Captured item"),
        url: item.canonicalUrl,
        kind: (bundle.source === "extension-capture" ? (item.tags?.includes("generic-page") ? "generic-page" : "canvas") : "other") as SourceDoc["kind"],
        text: normalized,
        readerText: normalized,
        headings: item.headingTrail ?? [],
        capturedAt: item.capturedAt ?? new Date().toISOString()
      };
    });
  }

  throw new Error("Unrecognized JSON shape. Expected a Readability capture, an ExtractedPage, or a CaptureBundle.");
}

export async function fetchUrlToHtml(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
  return await response.text();
}
