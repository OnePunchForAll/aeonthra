import { stableHash, type CaptureItem, type CaptureResource } from "@learning/schema";
import type { CaptureMode, CaptureWarning, CourseContext, ExtensionSettings, QueueItem } from "./core/types";

type CaptureJobPayload = {
  jobId: string;
  mode: CaptureMode;
  course: CourseContext;
  settings: ExtensionSettings;
};

type CourseDiscovery = {
  course: CourseContext;
  queue: QueueItem[];
  counts: {
    assignments: number;
    discussions: number;
    quizzes: number;
    pages: number;
    modules: number;
    files: number;
    announcements: number;
    syllabus: number;
    total: number;
  };
};

declare global {
  interface Window {
    __aeonthraCaptureState?: {
      running: boolean;
      paused: boolean;
      cancelled: boolean;
    };
  }
}

const CANVAS_CHROME_SELECTORS = [
  "script",
  "style",
  "noscript",
  "iframe",
  "form",
  "nav",
  "header",
  "footer",
  "#breadcrumbs",
  "#left-side",
  "#right-side",
  ".ic-app-nav-toggle-and-crumbs",
  ".header-bar",
  ".module-sequence-footer",
  ".ig-header-admin",
  ".student-assignment-overview",
  ".submission-details",
  ".submit_assignment_link",
  ".discussion-reply-box",
  ".discussion-reply-form",
  ".add_a_comment",
  ".context_module_sub_header",
  ".button-container",
  ".ic-Layout-watermark"
] as const;

const BLOCKLIST_PATTERNS = [
  /\bmark as done\b/i,
  /\bmodule item\b/i,
  /\bpoints possible\b/i,
  /\ballowed attempts\b/i,
  /\bsearch entries\b/i,
  /\bfilter by\b/i,
  /\bmultiple[_ ]choice[_ ]question\b/i,
  /\bscore at least\b/i,
  /\bview rubric\b/i,
  /\bsubmit assignment\b/i,
  /\bthis tool needs to be loaded in a new browser window\b/i,
  /\breload the page to access the tool again\b/i
] as const;

const LEARNING_MIN_SCORE = 10;
const state = (window.__aeonthraCaptureState ??= {
  running: false,
  paused: false,
  cancelled: false
});

let overlayNode: HTMLDivElement | null = null;

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function canonicalize(url: string): string {
  const parsed = new URL(url, window.location.origin);
  parsed.hash = "";
  return parsed.toString();
}

function parseCourseFromLocation(): CourseContext | null {
  const match = window.location.pathname.match(/\/courses\/(\d+)/);
  if (!match) {
    return null;
  }

  const courseId = match[1]!;
  const courseName =
    document.querySelector<HTMLElement>(".ellipsis")?.textContent?.trim() ||
    document.querySelector<HTMLElement>("[data-testid='course-name']")?.textContent?.trim() ||
    document.title.split("|")[0]!.trim() ||
    `Course ${courseId}`;

  return {
    courseId,
    courseName,
    origin: window.location.origin,
    courseUrl: `${window.location.origin}/courses/${courseId}`,
    modulesUrl: `${window.location.origin}/courses/${courseId}/modules`,
    host: window.location.host
  };
}

function overlayContainer(): HTMLDivElement {
  if (overlayNode) {
    return overlayNode;
  }

  overlayNode = document.createElement("div");
  overlayNode.setAttribute("data-aeonthra-overlay", "true");
  overlayNode.style.position = "fixed";
  overlayNode.style.right = "18px";
  overlayNode.style.bottom = "18px";
  overlayNode.style.zIndex = "2147483647";
  overlayNode.style.width = "320px";
  overlayNode.style.padding = "14px 16px";
  overlayNode.style.borderRadius = "14px";
  overlayNode.style.border = "1px solid rgba(0,240,255,0.24)";
  overlayNode.style.background = "linear-gradient(180deg, rgba(4,4,12,0.96), rgba(2,2,8,0.96))";
  overlayNode.style.boxShadow = "0 0 30px rgba(0,240,255,0.14)";
  overlayNode.style.color = "#e0e0ff";
  overlayNode.style.fontFamily = "Sora, Segoe UI, sans-serif";
  overlayNode.style.pointerEvents = "none";
  document.body.appendChild(overlayNode);
  return overlayNode;
}

function renderOverlay(runtime: {
  status: string;
  phaseLabel: string;
  progressPct: number;
  currentTitle: string;
  completedCount: number;
  totalQueued: number;
}): void {
  const node = overlayContainer();
  if (runtime.status === "idle") {
    node.remove();
    overlayNode = null;
    return;
  }

  node.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:10px;">
      <div>
        <div style="font-family:Orbitron, sans-serif;font-size:11px;letter-spacing:0.18em;color:#00f0ff;">AEONTHRA CAPTURE</div>
        <div style="font-size:14px;font-weight:700;margin-top:4px;">${runtime.phaseLabel}</div>
      </div>
      <div style="font-family:JetBrains Mono, monospace;font-size:12px;color:#b0b0d0;">${Math.round(runtime.progressPct)}%</div>
    </div>
    <div style="height:8px;border-radius:999px;background:rgba(255,255,255,0.08);overflow:hidden;margin-bottom:10px;">
      <div style="height:100%;width:${Math.max(0, Math.min(100, runtime.progressPct))}%;background:linear-gradient(90deg,#00f0ff,#06d6a0);box-shadow:0 0 18px rgba(0,240,255,0.28);"></div>
    </div>
    <div style="font-size:12px;line-height:1.5;color:#b0b0d0;">${runtime.currentTitle || "Preparing course capture..."}</div>
    <div style="margin-top:8px;font-size:11px;color:#6a6a9a;">${runtime.completedCount}/${runtime.totalQueued || "?"} items processed</div>
  `;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitWhilePaused(): Promise<void> {
  while (state.paused && !state.cancelled) {
    await sleep(250);
  }
}

async function fetchText(url: string, settings: ExtensionSettings): Promise<string> {
  let delay = settings.retryBackoffMs;

  for (let attempt = 0; attempt <= settings.maxRetries; attempt += 1) {
    try {
      const response = await fetch(url, {
        credentials: "include",
        headers: {
          Accept: "text/html,application/xhtml+xml"
        }
      });

      if (response.status === 429) {
        if (attempt === settings.maxRetries) {
          throw new Error(`Canvas rate limited the request for ${url}.`);
        }
        await sleep(delay);
        delay *= 2;
        continue;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} for ${url}`);
      }

      return await response.text();
    } catch (error) {
      if (attempt === settings.maxRetries) {
        throw error;
      }
      await sleep(delay);
      delay *= 2;
    }
  }

  throw new Error(`Unable to fetch ${url}`);
}

async function fetchJson<T>(url: string, settings: ExtensionSettings): Promise<T> {
  let delay = settings.retryBackoffMs;

  for (let attempt = 0; attempt <= settings.maxRetries; attempt += 1) {
    try {
      const response = await fetch(url, {
        credentials: "include",
        headers: {
          Accept: "application/json"
        }
      });

      if (response.status === 429) {
        if (attempt === settings.maxRetries) {
          throw new Error(`Canvas rate limited the request for ${url}.`);
        }
        await sleep(delay);
        delay *= 2;
        continue;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} for ${url}`);
      }

      return await response.json() as T;
    } catch (error) {
      if (attempt === settings.maxRetries) {
        throw error;
      }
      await sleep(delay);
      delay *= 2;
    }
  }

  throw new Error(`Unable to fetch ${url}`);
}

function parseLinkHeader(linkHeader: string | null): string | null {
  if (!linkHeader) {
    return null;
  }

  const nextPart = linkHeader
    .split(",")
    .map((part) => part.trim())
    .find((part) => /rel=\"?next\"?/.test(part));

  const match = nextPart?.match(/<([^>]+)>/);
  return match?.[1] ?? null;
}

async function fetchAllJson<T>(url: string, settings: ExtensionSettings): Promise<T[]> {
  const results: T[] = [];
  let next: string | null = url;

  while (next) {
    let delay = settings.retryBackoffMs;
    let response: Response | null = null;

    for (let attempt = 0; attempt <= settings.maxRetries; attempt += 1) {
      response = await fetch(next, {
        credentials: "include",
        headers: {
          Accept: "application/json"
        }
      });

      if (response.status === 429) {
        if (attempt === settings.maxRetries) {
          throw new Error(`Canvas rate limited the request for ${next}.`);
        }
        await sleep(delay);
        delay *= 2;
        continue;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} for ${next}`);
      }

      break;
    }

    const batch = await response!.json() as T[];
    results.push(...batch);
    next = parseLinkHeader(response!.headers.get("Link"));
  }

  return results;
}

function collectLinks(root: ParentNode, sourceItemId: string): CaptureResource[] {
  return Array.from(root.querySelectorAll("a[href]"))
    .slice(0, 80)
    .flatMap((anchor, index) => {
      const href = anchor.getAttribute("href");
      if (!href) {
        return [];
      }

      try {
        const url = canonicalize(href);
        const title = normalizeWhitespace(anchor.textContent ?? "") || url;
        return [{
          id: stableHash(`${sourceItemId}:${url}:${index}`),
          title,
          url,
          kind: url.match(/\.(pdf|docx|pptx|xlsx)(\?|$)/i) ? "file" : "link",
          sourceItemId
        } satisfies CaptureResource];
      } catch {
        return [];
      }
    });
}

function parseHtml(html: string): Document {
  return new DOMParser().parseFromString(html, "text/html");
}

function cleanHtmlFragment(html: string): string {
  return html
    .replace(/\sdata-[^=]+=\"[^\"]*\"/g, "")
    .replace(/\sclass=\"[^\"]*\"/g, "")
    .replace(/\sid=\"[^\"]*\"/g, "")
    .trim();
}

function blockScore(text: string): number {
  const value = normalizeWhitespace(text);
  if (!value) {
    return -10;
  }

  let score = 0;
  if (value.length >= 48) score += 4;
  if (/[.!?]/.test(value)) score += 3;
  if (/\b(is|are|means|refers to|explains|requires|asks|describes|compare|discuss|analyze|submit|include)\b/i.test(value)) score += 4;
  if (/\b(student|course|ethical|chapter|reading|assignment|discussion|module|theory|framework|concept|source|citation|evidence)\b/i.test(value)) score += 2;
  if (value.length > 320) score += 1;
  if (value.length < 24) score -= 4;
  if (BLOCKLIST_PATTERNS.some((pattern) => pattern.test(value))) score -= 8;
  return score;
}

function learningBlocks(doc: Document): string[] {
  for (const selector of CANVAS_CHROME_SELECTORS) {
    doc.querySelectorAll(selector).forEach((node) => node.remove());
  }

  const candidates = Array.from(doc.querySelectorAll("main h1, main h2, main h3, main p, main li, article h1, article h2, article h3, article p, article li, .user_content p, .user_content li, .show-content p, .show-content li"))
    .map((node) => normalizeWhitespace(node.textContent ?? ""))
    .filter(Boolean);

  const deduped: string[] = [];
  const seen = new Set<string>();
  for (const candidate of candidates) {
    const normalized = candidate.toLowerCase();
    if (seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    if (blockScore(candidate) >= LEARNING_MIN_SCORE) {
      deduped.push(candidate);
    }
  }

  return deduped;
}

function bestContentRoot(doc: Document): Element {
  return (
    doc.querySelector("main .user_content.enhanced") ||
    doc.querySelector("main .show-content") ||
    doc.querySelector(".user_content.enhanced") ||
    doc.querySelector("main") ||
    doc.body
  );
}

function titleTrail(title: string, queueItem: QueueItem): string[] {
  return [title, queueItem.moduleName ?? "", queueItem.type]
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function buildCaptureItem(input: {
  queueItem: QueueItem;
  title: string;
  plainText: string;
  html?: string;
  tags?: string[];
}): CaptureItem {
  const capturedAt = new Date().toISOString();
  return {
    id: stableHash(`${input.queueItem.type}:${input.queueItem.url}:${input.plainText}`),
    kind: input.queueItem.type === "page" ? "page" : input.queueItem.type,
    title: input.title,
    canonicalUrl: canonicalize(input.queueItem.url),
    plainText: normalizeWhitespace(input.plainText),
    excerpt: normalizeWhitespace(input.plainText).slice(0, 240),
    html: input.html,
    headingTrail: titleTrail(input.title, input.queueItem),
    tags: Array.from(new Set([input.queueItem.type, ...(input.tags ?? [])])),
    capturedAt,
    contentHash: stableHash(normalizeWhitespace(input.plainText))
  };
}

function dateLine(label: string, rawValue: unknown): string | null {
  if (typeof rawValue !== "string" || !rawValue) {
    return null;
  }
  const parsed = new Date(rawValue);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return `${label} ${parsed.toLocaleString()}`;
}

function extractRubricText(doc: Document): string[] {
  const rubricRoot = doc.querySelector(".rubric, .rubric_table, [data-testid='rubric-assessment-table']");
  if (!rubricRoot) {
    return [];
  }

  return Array.from(rubricRoot.querySelectorAll("tr"))
    .map((row) => normalizeWhitespace(row.textContent ?? ""))
    .filter((line) => line.length >= 18)
    .slice(0, 24);
}

function composeLearningText(lines: Array<string | null | undefined>): string {
  return lines.filter((line): line is string => Boolean(line && normalizeWhitespace(line))).join("\n");
}

function buildAssignmentPayload(queueItem: QueueItem, html: string, mode: CaptureMode): {
  item: CaptureItem | null;
  resources: CaptureResource[];
  rawHtml?: string;
  warning?: CaptureWarning;
} {
  const doc = parseHtml(html);
  const title = normalizeWhitespace(
    doc.querySelector("h1.title, .assignment-title .title-content, h1")?.textContent ||
    queueItem.title
  );
  const contentRoot = bestContentRoot(doc);
  const learning = learningBlocks(doc);
  const rubric = extractRubricText(doc);
  const metadata = queueItem.raw ?? {};
  const lines = composeLearningText([
    title,
    dateLine("Due", metadata.due_at),
    typeof metadata.points_possible === "number" ? `Points ${metadata.points_possible}` : null,
    Array.isArray(metadata.submission_types) && metadata.submission_types.length > 0
      ? `Submission types ${metadata.submission_types.join(", ")}`
      : null,
    ...learning,
    ...rubric
  ]);

  if (!lines || lines.length < 80) {
    return {
      item: null,
      resources: [],
      warning: {
        url: queueItem.url,
        message: `Assignment "${queueItem.title}" did not expose enough clean instructional text to guarantee a quality capture.`
      }
    };
  }

  const item = buildCaptureItem({
    queueItem,
    title,
    plainText: lines,
    html: mode === "complete" ? cleanHtmlFragment(contentRoot.innerHTML) : undefined,
    tags: ["canvas", "assignment"]
  });
  return {
    item,
    resources: collectLinks(contentRoot, item.id),
    rawHtml: mode === "complete" ? html : undefined
  };
}

function buildDiscussionPayload(queueItem: QueueItem, html: string, mode: CaptureMode): {
  item: CaptureItem | null;
  resources: CaptureResource[];
  rawHtml?: string;
  warning?: CaptureWarning;
} {
  const doc = parseHtml(html);
  const title = normalizeWhitespace(doc.querySelector("h1.discussion-title, h1")?.textContent || queueItem.title);
  const promptRoot = bestContentRoot(doc);
  const promptBlocks = learningBlocks(doc);
  const metadata = queueItem.raw ?? {};
  const prompt = composeLearningText([
    title,
    dateLine("Due", metadata.due_at),
    typeof metadata.points_possible === "number" ? `Points ${metadata.points_possible}` : null,
    ...promptBlocks
  ]);

  if (!prompt || prompt.length < 60) {
    return {
      item: null,
      resources: [],
      warning: {
        url: queueItem.url,
        message: `Discussion "${queueItem.title}" did not expose a clean prompt body.`
      }
    };
  }

  const item = buildCaptureItem({
    queueItem,
    title,
    plainText: prompt,
    html: mode === "complete" ? cleanHtmlFragment(promptRoot.innerHTML) : undefined,
    tags: ["canvas", "discussion"]
  });
  return {
    item,
    resources: collectLinks(promptRoot, item.id),
    rawHtml: mode === "complete" ? html : undefined
  };
}

function buildPagePayload(queueItem: QueueItem, html: string, mode: CaptureMode): {
  item: CaptureItem | null;
  resources: CaptureResource[];
  rawHtml?: string;
  warning?: CaptureWarning;
} {
  const doc = parseHtml(html);
  const title = normalizeWhitespace(doc.querySelector("h1.page-title, .page-title, h1")?.textContent || queueItem.title);
  const root = bestContentRoot(doc);
  const learning = learningBlocks(doc);
  const text = composeLearningText([title, ...learning]);

  if (!text || text.length < 80) {
    return {
      item: null,
      resources: [],
      warning: {
        url: queueItem.url,
        message: `Page "${queueItem.title}" did not have enough source-grounded learning text after filtering.`
      }
    };
  }

  const item = buildCaptureItem({
    queueItem,
    title,
    plainText: text,
    html: mode === "complete" ? cleanHtmlFragment(root.innerHTML) : undefined,
    tags: ["canvas", "page"]
  });
  return {
    item,
    resources: collectLinks(root, item.id),
    rawHtml: mode === "complete" ? html : undefined
  };
}

function buildQuizPayload(queueItem: QueueItem, html: string, mode: CaptureMode): {
  item: CaptureItem | null;
  resources: CaptureResource[];
  rawHtml?: string;
  warning?: CaptureWarning;
} {
  const doc = parseHtml(html);
  const title = normalizeWhitespace(doc.querySelector("h1.quiz-title, h1")?.textContent || queueItem.title);
  const root = bestContentRoot(doc);
  const blocks = learningBlocks(doc);
  const metadata = queueItem.raw ?? {};
  const text = composeLearningText([
    title,
    dateLine("Due", metadata.due_at),
    typeof metadata.points_possible === "number" ? `Points ${metadata.points_possible}` : null,
    typeof metadata.question_count === "number" ? `Question count ${metadata.question_count}` : null,
    ...blocks
  ]);

  if (!text || text.length < 60) {
    return {
      item: null,
      resources: [],
      warning: {
        url: queueItem.url,
        message: `Quiz "${queueItem.title}" only exposed thin or UI-heavy content, so AEONTHRA left it empty.`
      }
    };
  }

  const item = buildCaptureItem({
    queueItem,
    title,
    plainText: text,
    html: mode === "complete" ? cleanHtmlFragment(root.innerHTML) : undefined,
    tags: ["canvas", "quiz"]
  });
  return {
    item,
    resources: collectLinks(root, item.id),
    rawHtml: mode === "complete" ? html : undefined
  };
}

function buildApiOnlyPayload(queueItem: QueueItem, mode: CaptureMode): {
  item: CaptureItem | null;
  resources: CaptureResource[];
} {
  const metadata = queueItem.raw ?? {};
  let lines: string[] = [queueItem.title];

  if (queueItem.type === "module") {
    const rawItems = Array.isArray(metadata.items) ? metadata.items as Array<Record<string, unknown>> : [];
    const itemLines = rawItems
      .map((entry) => normalizeWhitespace(`${entry.title ?? entry.page_url ?? entry.type ?? "Module item"}`))
      .filter(Boolean)
      .slice(0, 40);
    lines = [
      queueItem.title,
      normalizeWhitespace(String(metadata.unlock_at ?? "")).length > 0 ? `Unlock ${metadata.unlock_at}` : "",
      ...itemLines
    ].filter(Boolean);
  } else if (queueItem.type === "file") {
    lines = [
      queueItem.title,
      typeof metadata["display_name"] === "string" ? `File ${metadata["display_name"]}` : "",
      typeof metadata["content-type"] === "string" ? `Type ${metadata["content-type"]}` : "",
      typeof metadata["size"] === "number" ? `Size ${metadata["size"]} bytes` : ""
    ].filter(Boolean);
  } else if (queueItem.type === "announcement") {
    const body = normalizeWhitespace(String(metadata.message ?? ""));
    lines = [queueItem.title, body];
  } else if (queueItem.type === "syllabus") {
    const body = normalizeWhitespace(String(metadata.syllabus_body ?? ""));
    lines = [queueItem.title, body];
  }

  const plain = lines.filter(Boolean).join("\n");
  if (!plain || plain.length < 30) {
    return { item: null, resources: [] };
  }

  const item = buildCaptureItem({
    queueItem,
    title: queueItem.title,
    plainText: plain,
    html: mode === "complete" && typeof metadata["html"] === "string" ? cleanHtmlFragment(String(metadata["html"])) : undefined,
    tags: ["canvas", queueItem.type]
  });

  const resources: CaptureResource[] = typeof metadata["url"] === "string"
    ? [{
        id: stableHash(`${item.id}:${metadata["url"]}`),
        title: queueItem.title,
        url: canonicalize(String(metadata["url"])),
        kind: queueItem.type === "file" ? "file" : "link",
        sourceItemId: item.id
      }]
    : [];

  return { item, resources };
}

async function discoverCourse(payload: CaptureJobPayload): Promise<CourseDiscovery> {
  const base = `${payload.course.origin}/api/v1/courses/${payload.course.courseId}`;
  const [
    courseInfo,
    modules,
    assignments,
    discussions,
    pages,
    quizzes,
    files,
    announcements
  ] = await Promise.all([
    fetchJson<Record<string, unknown>>(`${base}?include[]=syllabus_body`, payload.settings),
    fetchAllJson<Record<string, unknown>>(`${base}/modules?include[]=items&per_page=100`, payload.settings).catch(() => []),
    fetchAllJson<Record<string, unknown>>(`${base}/assignments?per_page=100`, payload.settings).catch(() => []),
    fetchAllJson<Record<string, unknown>>(`${base}/discussion_topics?per_page=100`, payload.settings).catch(() => []),
    fetchAllJson<Record<string, unknown>>(`${base}/pages?per_page=100`, payload.settings).catch(() => []),
    fetchAllJson<Record<string, unknown>>(`${base}/quizzes?per_page=100`, payload.settings).catch(() => []),
    fetchAllJson<Record<string, unknown>>(`${base}/files?per_page=100`, payload.settings).catch(() => []),
    fetchAllJson<Record<string, unknown>>(`${payload.course.origin}/api/v1/announcements?context_codes[]=course_${payload.course.courseId}&per_page=100`, payload.settings).catch(() => [])
  ]);

  const queue: QueueItem[] = [];

  queue.push({
    id: stableHash(`${payload.course.courseId}:syllabus`),
    type: "syllabus",
    title: `${payload.course.courseName} Syllabus`,
    url: `${payload.course.courseUrl}/assignments/syllabus`,
    strategy: "api-only",
    raw: courseInfo
  });

  for (const moduleEntry of modules) {
    queue.push({
      id: stableHash(`module:${moduleEntry.id ?? moduleEntry.name}`),
      type: "module",
      title: normalizeWhitespace(String(moduleEntry.name ?? "Module")),
      url: `${payload.course.modulesUrl}#module_${moduleEntry.id ?? stableHash(JSON.stringify(moduleEntry))}`,
      strategy: "api-only",
      raw: moduleEntry
    });
  }

  for (const assignment of assignments) {
    const url = String(assignment.html_url ?? `${payload.course.courseUrl}/assignments/${assignment.id}`);
    queue.push({
      id: stableHash(`assignment:${assignment.id ?? url}`),
      type: "assignment",
      title: normalizeWhitespace(String(assignment.name ?? "Assignment")),
      url,
      strategy: "html-fetch",
      raw: assignment
    });
  }

  for (const discussion of discussions) {
    const url = String(discussion.html_url ?? `${payload.course.courseUrl}/discussion_topics/${discussion.id}`);
    queue.push({
      id: stableHash(`discussion:${discussion.id ?? url}`),
      type: "discussion",
      title: normalizeWhitespace(String(discussion.title ?? "Discussion")),
      url,
      strategy: "html-fetch",
      raw: discussion
    });
  }

  for (const page of pages) {
    const url = String(page.html_url ?? `${payload.course.courseUrl}/pages/${page.url}`);
    queue.push({
      id: stableHash(`page:${page.page_id ?? page.url ?? url}`),
      type: "page",
      title: normalizeWhitespace(String(page.title ?? "Page")),
      url,
      strategy: "html-fetch",
      raw: page
    });
  }

  for (const quiz of quizzes) {
    const url = String(quiz.html_url ?? `${payload.course.courseUrl}/quizzes/${quiz.id}`);
    queue.push({
      id: stableHash(`quiz:${quiz.id ?? url}`),
      type: "quiz",
      title: normalizeWhitespace(String(quiz.title ?? "Quiz")),
      url,
      strategy: "html-fetch",
      raw: quiz
    });
  }

  for (const file of files) {
    queue.push({
      id: stableHash(`file:${file.id ?? file.display_name}`),
      type: "file",
      title: normalizeWhitespace(String(file.display_name ?? file.filename ?? "File")),
      url: String(file.url ?? file.html_url ?? payload.course.courseUrl),
      strategy: "api-only",
      raw: file
    });
  }

  for (const announcement of announcements) {
    queue.push({
      id: stableHash(`announcement:${announcement.id ?? announcement.title}`),
      type: "announcement",
      title: normalizeWhitespace(String(announcement.title ?? "Announcement")),
      url: String(announcement.html_url ?? `${payload.course.courseUrl}/announcements`),
      strategy: "api-only",
      raw: announcement
    });
  }

  const counts = {
    assignments: assignments.length,
    discussions: discussions.length,
    quizzes: quizzes.length,
    pages: pages.length,
    modules: modules.length,
    files: files.length,
    announcements: announcements.length,
    syllabus: 1,
    total: queue.length
  };

  return {
    course: {
      ...payload.course,
      courseName: normalizeWhitespace(String(courseInfo.name ?? payload.course.courseName))
    },
    queue,
    counts
  };
}

async function emitWarning(jobId: string, warning: CaptureWarning): Promise<void> {
  await chrome.runtime.sendMessage({ type: "aeon:job-warning", jobId, warning });
}

async function emitProgress(input: {
  jobId: string;
  phaseLabel: string;
  currentTitle: string;
  currentUrl: string;
  completedCount: number;
  skippedCount: number;
  failedCount: number;
  totalQueued: number;
  progressPct: number;
}): Promise<void> {
  await chrome.runtime.sendMessage({ type: "aeon:job-progress", ...input });
}

async function captureQueueItem(job: CaptureJobPayload, queueItem: QueueItem): Promise<{
  item: CaptureItem | null;
  resources: CaptureResource[];
  rawHtml?: string;
  warning?: CaptureWarning;
}> {
  if (queueItem.strategy === "api-only") {
    return buildApiOnlyPayload(queueItem, job.mode);
  }

  const html = await fetchText(queueItem.url, job.settings);
  switch (queueItem.type) {
    case "assignment":
      return buildAssignmentPayload(queueItem, html, job.mode);
    case "discussion":
      return buildDiscussionPayload(queueItem, html, job.mode);
    case "quiz":
      return buildQuizPayload(queueItem, html, job.mode);
    case "page":
      return buildPagePayload(queueItem, html, job.mode);
    default:
      return buildPagePayload(queueItem, html, job.mode);
  }
}

async function runCaptureJob(payload: CaptureJobPayload): Promise<void> {
  state.running = true;
  state.paused = false;
  state.cancelled = false;

  const startedAt = Date.now();
  let completedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  try {
    await emitProgress({
      jobId: payload.jobId,
      phaseLabel: "Discovering Course",
      currentTitle: payload.course.courseName,
      currentUrl: payload.course.courseUrl,
      completedCount: 0,
      skippedCount: 0,
      failedCount: 0,
      totalQueued: 0,
      progressPct: 3
    });

    const discovery = await discoverCourse(payload);
    await chrome.runtime.sendMessage({
      type: "aeon:job-discovered",
      jobId: payload.jobId,
      counts: discovery.counts,
      queue: discovery.queue,
      course: discovery.course
    });

    const totalQueued = discovery.queue.length;
    let index = 0;

    for (const queueItem of discovery.queue) {
      if (state.cancelled) {
        break;
      }

      await waitWhilePaused();
      if (state.cancelled) {
        break;
      }

      const progressPct = Math.round((index / Math.max(totalQueued, 1)) * 96);
      await emitProgress({
        jobId: payload.jobId,
        phaseLabel: "Capturing Course",
        currentTitle: queueItem.title,
        currentUrl: queueItem.url,
        completedCount,
        skippedCount,
        failedCount,
        totalQueued,
        progressPct
      });

      try {
        const result = await captureQueueItem(payload, queueItem);
        if (result.warning) {
          await emitWarning(payload.jobId, result.warning);
        }
        if (!result.item) {
          skippedCount += 1;
        } else {
          completedCount += 1;
          await chrome.runtime.sendMessage({
            type: "aeon:item-captured",
            jobId: payload.jobId,
            item: result.item,
            resources: result.resources,
            rawHtml: result.rawHtml
          });
        }
      } catch (error) {
        failedCount += 1;
        await emitWarning(payload.jobId, {
          url: queueItem.url,
          message: error instanceof Error ? error.message : `Unable to capture ${queueItem.title}.`
        });
      }

      index += 1;
      await sleep(payload.settings.requestDelay);
    }

    const durationMs = Date.now() - startedAt;
    await chrome.runtime.sendMessage({
      type: "aeon:job-complete",
      jobId: payload.jobId,
      stats: {
        totalItemsVisited: discovery.counts.total,
        totalItemsCaptured: completedCount,
        totalItemsSkipped: skippedCount,
        totalItemsFailed: failedCount,
        durationMs
      },
      mode: payload.mode,
      course: discovery.course,
      cancelled: state.cancelled
    });
  } catch (error) {
    await chrome.runtime.sendMessage({
      type: "aeon:job-error",
      jobId: payload.jobId,
      errorMessage: error instanceof Error ? error.message : "Capture failed unexpectedly."
    });
  } finally {
    state.running = false;
    state.paused = false;
    state.cancelled = false;
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "aeon:get-course-context") {
    const course = parseCourseFromLocation();
    sendResponse(course ? { ok: true, course } : { ok: false, message: "This page is not inside a Canvas course." });
    return true;
  }

  if (message.type === "aeon:start-course-capture") {
    const payload = message.payload as CaptureJobPayload;
    if (state.running) {
      sendResponse({ ok: false, message: "A capture job is already running in this tab." });
      return true;
    }
    void runCaptureJob(payload);
    sendResponse({ ok: true });
    return true;
  }

  if (message.type === "aeon:set-capture-control") {
    const control = message.control as "pause" | "resume" | "cancel";
    if (control === "pause") state.paused = true;
    if (control === "resume") state.paused = false;
    if (control === "cancel") state.cancelled = true;
    sendResponse({ ok: true });
    return true;
  }

  if (message.type === "aeon:overlay-state") {
    renderOverlay(message.runtime);
    sendResponse({ ok: true });
    return true;
  }

  if (message.type === "bridge-request-import") {
    window.postMessage({
      source: "learning-freedom-bridge",
      type: "NF_IMPORT_REQUEST"
    }, "*");
    sendResponse({ ok: true });
    return true;
  }

  return undefined;
});
