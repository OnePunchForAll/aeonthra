import { stableHash, type CaptureItem, type CaptureResource } from "@learning/schema";
import { CAPTURE_AUTO_START_NODE_ID } from "./capture-autostart";
import { isKnownCanvasHost, normalizeCourseUrlToDetectedOrigin, parseCourseContextFromUrl } from "./core/platform";
import type { CaptureMode, CaptureWarning, CourseContext, ExtensionSettings, QueueItem, RuntimeState } from "./core/types";

type CaptureJobPayload = {
  jobId: string;
  mode: CaptureMode;
  course: CourseContext;
  settings: ExtensionSettings;
};

type CourseDiscovery = {
  course: CourseContext;
  queue: QueueItem[];
  warnings: CaptureWarning[];
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

type CanvasBootstrapResponse =
  | { ok: true; course: CourseContext }
  | { ok: true; message?: string }
  | { ok: false; message: string };

type CanvasCaptureBootstrap = {
  getCourseContext: () => CanvasBootstrapResponse;
  startCapture: (payload: CaptureJobPayload) => CanvasBootstrapResponse;
  setCaptureControl: (control: "pause" | "resume" | "cancel") => CanvasBootstrapResponse;
  renderOverlay: (runtime: RuntimeState) => { ok: true };
};

declare global {
  interface Window {
    __aeonthraCaptureState?: {
      running: boolean;
      paused: boolean;
      cancelled: boolean;
    };
    __aeonthraCaptureBootstrap?: CanvasCaptureBootstrap;
    __aeonthraSessionObserverInstalled?: boolean;
  }
}

const CANVAS_CHROME_SELECTORS = [
  "script",
  "style",
  "noscript",
  "iframe",
  "form",
  "nav",
  "aside",
  "header",
  "footer",
  "[role='navigation']",
  "[hidden]",
  "[aria-hidden='true']",
  "#breadcrumbs",
  "#left-side",
  "#right-side",
  ".ic-app-nav-toggle-and-crumbs",
  ".ic-app-course-menu",
  ".ic-app-crumbs",
  ".header-bar",
  ".module-sequence-footer",
  ".ig-header-admin",
  ".student-assignment-overview",
  ".submission-details",
  ".submit_assignment_link",
  ".discussion-reply-box",
  ".discussion-reply-form",
  ".discussion-sidebar",
  ".discussion-toolbar",
  ".add_a_comment",
  ".context_module_sub_header",
  ".button-container",
  ".ic-Layout-watermark",
  ".screenreader-only",
  ".sr-only",
  ".visually-hidden",
  ".ui-helper-hidden-accessible"
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
  /\breload the page to access the tool again\b/i,
  /\b(?:you need to have )?javascript enabled(?: in order)? to (?:access|use|view) (?:this (?:site|page|content|tool)|the site)\b/i,
  /\b(?:please )?enable javascript(?: to (?:continue|view|access|use).*)?\b/i,
  /\bthis site requires javascript\b/i,
  /\bjavascript (?:is )?required\b/i,
  /\bcourse navigation\b/i,
  /\bbreadcrumbs?\b/i,
  /\b(?:expand|collapse) menu\b/i,
  /\bskip to content\b/i
] as const;

const GENERIC_CAPTURE_TITLE_PATTERN = /^(assignment|discussion|quiz|page|topic|module|unit)$/i;
const TRAILING_FRAGMENT_CONNECTOR_PATTERN = /\b(?:and|or|to|for|of|in|on|at|by|with|from|the|a|an)$/i;

const LEARNING_MIN_SCORE = 10;
const state = (window.__aeonthraCaptureState ??= {
  running: false,
  paused: false,
  cancelled: false
});

let overlayNode: HTMLDivElement | null = null;
let sessionObservationTimer: number | null = null;
let lastSessionObservationSignature = "";

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function removeCanvasChrome(doc: ParentNode): void {
  for (const selector of CANVAS_CHROME_SELECTORS) {
    doc.querySelectorAll(selector).forEach((node) => node.remove());
  }
}

function sanitizeHtmlNode(root: ParentNode): void {
  removeCanvasChrome(root);
  root.querySelectorAll("*").forEach((node) => {
    for (const attribute of Array.from(node.attributes)) {
      if (/^on/i.test(attribute.name)) {
        node.removeAttribute(attribute.name);
      }
    }
  });
}

function sanitizeHtmlText(html: string): string {
  const doc = parseHtml(html);
  sanitizeHtmlNode(doc);
  return normalizeWhitespace(doc.body.textContent ?? "");
}

function normalizeIsoDate(rawValue: unknown): string | undefined {
  if (typeof rawValue !== "string" || !rawValue.trim()) {
    return undefined;
  }
  const parsed = new Date(rawValue);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }
  return parsed.toISOString();
}

function normalizeModuleKey(value: string): string {
  const trimmed = normalizeWhitespace(value);
  const moduleMatch = trimmed.match(/\bmodule\s+(\d+)\b/i);
  if (moduleMatch?.[1]) {
    return `module-${moduleMatch[1]}`;
  }
  const weekMatch = trimmed.match(/\bweek\s+(\d+)\b/i);
  if (weekMatch?.[1]) {
    return `week-${weekMatch[1]}`;
  }
  return trimmed.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "module";
}

function isFragmentaryText(value: string): boolean {
  const trimmed = normalizeWhitespace(value);
  if (!trimmed) {
    return true;
  }
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (TRAILING_FRAGMENT_CONNECTOR_PATTERN.test(trimmed)) {
    return true;
  }
  if (words.length >= 3 && words.filter((word) => word.length <= 2).length >= 2) {
    return true;
  }
  return false;
}

function isTrustworthyCaptureTitle(value: string): boolean {
  const trimmed = normalizeWhitespace(value);
  return Boolean(trimmed)
    && !GENERIC_CAPTURE_TITLE_PATTERN.test(trimmed)
    && !BLOCKLIST_PATTERNS.some((pattern) => pattern.test(trimmed))
    && !isFragmentaryText(trimmed);
}

function chooseCaptureTitle(queueTitle: string, domTitle: string): { title: string; source: CaptureItem["titleSource"] } {
  const structuredTitle = normalizeWhitespace(queueTitle);
  const cleanedDomTitle = normalizeWhitespace(domTitle);
  if (isTrustworthyCaptureTitle(structuredTitle)) {
    return { title: structuredTitle, source: "structured" };
  }
  if (isTrustworthyCaptureTitle(cleanedDomTitle)) {
    return { title: cleanedDomTitle, source: "dom" };
  }
  if (structuredTitle) {
    return { title: structuredTitle, source: "structured" };
  }
  if (cleanedDomTitle) {
    return { title: cleanedDomTitle, source: "dom" };
  }
  return { title: "Untitled item", source: "inferred" };
}

function canonicalize(url: string): string {
  const parsed = new URL(url, window.location.origin);
  parsed.hash = "";
  return parsed.toString();
}

function normalizeDiscoveredCourseUrl(urlValue: string, course: CourseContext): string {
  return normalizeCourseUrlToDetectedOrigin(urlValue, {
    origin: course.origin,
    courseId: course.courseId
  });
}

function hasCanvasDomSignals(): boolean {
  if (
    document.querySelector("#application.ic-app, .ic-app-main-content, .ic-app-nav-toggle-and-crumbs, .ic-Layout-body")
  ) {
    return true;
  }

  const bodyClassName = document.body?.className ?? "";
  if (/\bic-/.test(bodyClassName)) {
    return true;
  }

  const env = (window as Window & { ENV?: Record<string, unknown> }).ENV;
  return Boolean(env && (env.COURSE_ID || env.current_user_id || env.current_user_roles));
}

function parseCourseFromLocation(): CourseContext | null {
  const courseName =
    document.querySelector<HTMLElement>(".ellipsis")?.textContent?.trim() ||
    document.querySelector<HTMLElement>("[data-testid='course-name']")?.textContent?.trim() ||
    document.title.split("|")[0]!.trim() ||
    "Canvas Course";

  const course = parseCourseContextFromUrl(window.location.href, courseName, {
    requireKnownCanvasHost: false
  });
  if (!course) {
    return null;
  }

  if (isKnownCanvasHost(window.location.hostname) || hasCanvasDomSignals()) {
    return course;
  }

  return null;
}

function inferCurrentQueueItemType(url: string): QueueItem["type"] {
  if (/\/assignments\/\d+/i.test(url)) {
    return "assignment";
  }
  if (/\/discussion_topics\/\d+/i.test(url)) {
    return "discussion";
  }
  if (/\/quizzes\/\d+/i.test(url)) {
    return "quiz";
  }
  return "page";
}

function currentDocumentTitle(fallback: string): string {
  return normalizeWhitespace(
    document.querySelector("h1.title, .assignment-title .title-content, h1.page-title, h1.discussion-title, h1.quiz-title, h1")?.textContent ||
    fallback
  );
}

function buildCurrentDocumentQueueItem(course: CourseContext): QueueItem {
  const type = inferCurrentQueueItemType(window.location.href);
  return {
    id: stableHash(`session:${type}:${canonicalize(window.location.href)}`),
    type,
    title: currentDocumentTitle(course.courseName),
    url: canonicalize(window.location.href),
    strategy: "html-fetch"
  };
}

function captureCurrentDocumentForSession(course: CourseContext): {
  item: CaptureItem | null;
  resources: CaptureResource[];
  warning?: CaptureWarning;
} {
  const queueItem = buildCurrentDocumentQueueItem(course);
  const html = document.documentElement.outerHTML;

  switch (queueItem.type) {
    case "assignment":
      return buildAssignmentPayload(queueItem, html, "learning");
    case "discussion":
      return buildDiscussionPayload(queueItem, html, "learning");
    case "quiz":
      return buildQuizPayload(queueItem, html, "learning");
    default:
      return buildPagePayload(queueItem, html, "learning");
  }
}

async function observeCurrentPageForSession(): Promise<void> {
  if (state.running) {
    return;
  }

  const course = parseCourseFromLocation();
  if (!course) {
    return;
  }

  const observation = captureCurrentDocumentForSession(course);
  if (!observation.item && !observation.warning) {
    return;
  }

  const signature = [
    course.origin,
    course.courseId,
    observation.item?.canonicalUrl ?? canonicalize(window.location.href),
    observation.item?.contentHash ?? "",
    observation.warning?.message ?? ""
  ].join("|");

  if (signature === lastSessionObservationSignature) {
    return;
  }

  try {
    const response = await chrome.runtime.sendMessage({
      type: "aeon:session-observe-page",
      course,
      item: observation.item,
      resources: observation.resources,
      warning: observation.warning,
      observedAt: new Date().toISOString()
    });
    if (!response?.ignored) {
      lastSessionObservationSignature = signature;
    }
  } catch {
    // Ignore passive observation failures; they should never block the page.
  }
}

function scheduleSessionObservation(delayMs = 900): void {
  if (sessionObservationTimer !== null) {
    window.clearTimeout(sessionObservationTimer);
  }
  sessionObservationTimer = window.setTimeout(() => {
    sessionObservationTimer = null;
    void observeCurrentPageForSession();
  }, delayMs);
}

function installSessionObserver(): void {
  if (window.__aeonthraSessionObserverInstalled) {
    return;
  }
  window.__aeonthraSessionObserverInstalled = true;

  const scheduleAfterRouteChange = () => {
    scheduleSessionObservation(700);
    window.setTimeout(() => {
      void observeCurrentPageForSession();
    }, 2200);
  };

  const wrapHistoryMethod = <T extends "pushState" | "replaceState">(method: T) => {
    const original = history[method];
    history[method] = function wrappedHistoryMethod(this: History, ...args: Parameters<History[T]>) {
      const result = original.apply(this, args);
      scheduleAfterRouteChange();
      return result;
    } as History[T];
  };

  wrapHistoryMethod("pushState");
  wrapHistoryMethod("replaceState");
  window.addEventListener("popstate", () => scheduleAfterRouteChange());
  window.addEventListener("load", () => scheduleAfterRouteChange());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      scheduleSessionObservation(500);
    }
  });

  scheduleAfterRouteChange();
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

function readPendingAutoStartPayload(): CaptureJobPayload | null {
  const node = document.getElementById(CAPTURE_AUTO_START_NODE_ID);
  if (!(node instanceof HTMLScriptElement)) {
    return null;
  }
  const rawPayload = node.textContent?.trim();
  if (!rawPayload) {
    return null;
  }
  try {
    const parsed = JSON.parse(rawPayload) as Partial<CaptureJobPayload>;
    if (
      typeof parsed.jobId !== "string"
      || (parsed.mode !== "complete" && parsed.mode !== "learning")
      || !parsed.course
      || typeof parsed.course.courseId !== "string"
      || typeof parsed.course.courseName !== "string"
      || typeof parsed.course.courseUrl !== "string"
      || typeof parsed.course.modulesUrl !== "string"
      || typeof parsed.course.origin !== "string"
      || typeof parsed.course.host !== "string"
      || !parsed.settings
      || typeof parsed.settings.requestDelay !== "number"
      || typeof parsed.settings.maxRetries !== "number"
      || typeof parsed.settings.retryBackoffMs !== "number"
    ) {
      return null;
    }
    return {
      jobId: parsed.jobId,
      mode: parsed.mode,
      course: parsed.course,
      settings: parsed.settings
    };
  } catch {
    return null;
  }
}

function consumePendingAutoStartPayload(): CaptureJobPayload | null {
  const payload = readPendingAutoStartPayload();
  document.getElementById(CAPTURE_AUTO_START_NODE_ID)?.remove();
  return payload;
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

  // Use innerHTML only for static markup; set user-controlled title via textContent to prevent XSS
  const pct = Math.round(runtime.progressPct);
  const barWidth = Math.max(0, Math.min(100, runtime.progressPct));
  node.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:10px;">
      <div>
        <div style="font-family:Orbitron, sans-serif;font-size:11px;letter-spacing:0.18em;color:#00f0ff;">AEONTHRA CAPTURE</div>
        <div style="font-size:14px;font-weight:700;margin-top:4px;" data-phase></div>
      </div>
      <div style="font-family:JetBrains Mono, monospace;font-size:12px;color:#b0b0d0;">${pct}%</div>
    </div>
    <div style="height:8px;border-radius:999px;background:rgba(255,255,255,0.08);overflow:hidden;margin-bottom:10px;">
      <div style="height:100%;width:${barWidth}%;background:linear-gradient(90deg,#00f0ff,#06d6a0);box-shadow:0 0 18px rgba(0,240,255,0.28);"></div>
    </div>
    <div style="font-size:12px;line-height:1.5;color:#b0b0d0;" data-title></div>
    <div style="margin-top:8px;font-size:11px;color:#6a6a9a;" data-count></div>
  `;
  const phaseEl = node.querySelector<HTMLElement>("[data-phase]");
  const titleEl = node.querySelector<HTMLElement>("[data-title]");
  const countEl = node.querySelector<HTMLElement>("[data-count]");
  if (phaseEl) phaseEl.textContent = runtime.phaseLabel;
  if (titleEl) titleEl.textContent = runtime.currentTitle || "Preparing course capture...";
  if (countEl) countEl.textContent = `${runtime.completedCount}/${runtime.totalQueued || "?"} items captured`;
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
      try {
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
      } catch (error) {
        if (attempt === settings.maxRetries) {
          throw error;
        }
        await sleep(delay);
        delay *= 2;
      }
    }

    const batch = await response!.json() as T[];
    results.push(...batch);
    next = parseLinkHeader(response!.headers.get("Link"));
  }

  return results;
}

async function loadDiscoveryCollection<T>(
  url: string,
  settings: ExtensionSettings,
  label: string
): Promise<{ items: T[]; warning: CaptureWarning | null }> {
  try {
    return {
      items: await fetchAllJson<T>(url, settings),
      warning: null
    };
  } catch (error) {
    const reason = error instanceof Error ? normalizeWhitespace(error.message) : "request failed";
    return {
      items: [],
      warning: {
        url,
        message: `${label} could not be loaded after retries, so AEONTHRA continued without that category. ${reason}`
      }
    };
  }
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
  const doc = parseHtml(html);
  sanitizeHtmlNode(doc);
  return doc.body.innerHTML.trim();
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
  removeCanvasChrome(doc);

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
    if (blockScore(candidate) >= LEARNING_MIN_SCORE && !isFragmentaryText(candidate)) {
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
  titleSource: CaptureItem["titleSource"];
  plainText: string;
  html?: string;
  tags?: string[];
  dueAt?: string;
  unlockAt?: string;
  lockAt?: string;
  pointsPossible?: number;
  questionCount?: number;
  submissionTypes?: string[];
  moduleName?: string;
  moduleKey?: string;
}): CaptureItem {
  const capturedAt = new Date().toISOString();
  return {
    id: stableHash(`${input.queueItem.type}:${input.queueItem.url}:${input.plainText}`),
    kind: input.queueItem.type === "page" ? "page" : input.queueItem.type,
    title: input.title,
    titleSource: input.titleSource,
    canonicalUrl: canonicalize(input.queueItem.url),
    plainText: normalizeWhitespace(input.plainText),
    excerpt: normalizeWhitespace(input.plainText).slice(0, 240),
    html: input.html,
    headingTrail: titleTrail(input.title, input.queueItem),
    tags: Array.from(new Set([input.queueItem.type, ...(input.tags ?? [])])),
    dueAt: input.dueAt,
    unlockAt: input.unlockAt,
    lockAt: input.lockAt,
    pointsPossible: input.pointsPossible,
    questionCount: input.questionCount,
    submissionTypes: input.submissionTypes ?? [],
    moduleName: input.moduleName ?? input.queueItem.moduleName,
    moduleKey: input.moduleKey ?? (input.queueItem.moduleName ? normalizeModuleKey(input.queueItem.moduleName) : undefined),
    capturedAt,
    contentHash: stableHash(normalizeWhitespace(input.plainText))
  };
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
  const titleChoice = chooseCaptureTitle(
    queueItem.title,
    doc.querySelector("h1.title, .assignment-title .title-content, h1")?.textContent ?? ""
  );
  const contentRoot = bestContentRoot(doc);
  const learning = learningBlocks(doc);
  const rubric = extractRubricText(doc);
  const metadata = queueItem.raw ?? {};
  const lines = composeLearningText([
    titleChoice.title,
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
    title: titleChoice.title,
    titleSource: titleChoice.source,
    plainText: lines,
    html: mode === "complete" ? cleanHtmlFragment(contentRoot.innerHTML) : undefined,
    tags: ["canvas", "assignment"],
    dueAt: normalizeIsoDate(metadata.due_at),
    lockAt: normalizeIsoDate(metadata.lock_at),
    unlockAt: normalizeIsoDate(metadata.unlock_at),
    pointsPossible: typeof metadata.points_possible === "number" ? metadata.points_possible : undefined,
    submissionTypes: Array.isArray(metadata.submission_types)
      ? metadata.submission_types.map((entry) => normalizeWhitespace(String(entry))).filter(Boolean)
      : undefined
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
  const titleChoice = chooseCaptureTitle(
    queueItem.title,
    doc.querySelector("h1.discussion-title, h1")?.textContent ?? ""
  );
  const promptRoot = bestContentRoot(doc);
  const promptBlocks = learningBlocks(doc);
  const metadata = queueItem.raw ?? {};
  const prompt = composeLearningText([
    titleChoice.title,
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
    title: titleChoice.title,
    titleSource: titleChoice.source,
    plainText: prompt,
    html: mode === "complete" ? cleanHtmlFragment(promptRoot.innerHTML) : undefined,
    tags: ["canvas", "discussion"],
    dueAt: normalizeIsoDate(metadata.due_at),
    lockAt: normalizeIsoDate(metadata.lock_at),
    unlockAt: normalizeIsoDate(metadata.unlock_at),
    pointsPossible: typeof metadata.points_possible === "number" ? metadata.points_possible : undefined
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
  const titleChoice = chooseCaptureTitle(
    queueItem.title,
    doc.querySelector("h1.page-title, .page-title, h1")?.textContent ?? ""
  );
  const root = bestContentRoot(doc);
  const learning = learningBlocks(doc);
  const text = composeLearningText([titleChoice.title, ...learning]);

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
    title: titleChoice.title,
    titleSource: titleChoice.source,
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
  const titleChoice = chooseCaptureTitle(
    queueItem.title,
    doc.querySelector("h1.quiz-title, h1")?.textContent ?? ""
  );
  const root = bestContentRoot(doc);
  const blocks = learningBlocks(doc);
  const metadata = queueItem.raw ?? {};
  const text = composeLearningText([
    titleChoice.title,
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
    title: titleChoice.title,
    titleSource: titleChoice.source,
    plainText: text,
    html: mode === "complete" ? cleanHtmlFragment(root.innerHTML) : undefined,
    tags: ["canvas", "quiz"],
    dueAt: normalizeIsoDate(metadata.due_at),
    lockAt: normalizeIsoDate(metadata.lock_at),
    unlockAt: normalizeIsoDate(metadata.unlock_at),
    pointsPossible: typeof metadata.points_possible === "number" ? metadata.points_possible : undefined,
    questionCount: typeof metadata.question_count === "number" ? metadata.question_count : undefined
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
    const body = sanitizeHtmlText(String(metadata.message ?? ""));
    lines = [queueItem.title, body];
  } else if (queueItem.type === "syllabus") {
    const body = sanitizeHtmlText(String(metadata.syllabus_body ?? ""));
    lines = [queueItem.title, body];
  }

  const plain = lines.filter(Boolean).join("\n");
  if (!plain || plain.length < 30) {
    return { item: null, resources: [] };
  }

  const item = buildCaptureItem({
    queueItem,
    title: queueItem.title,
    titleSource: "structured",
    plainText: plain,
    html: mode === "complete" && typeof metadata["html"] === "string" ? cleanHtmlFragment(String(metadata["html"])) : undefined,
    tags: ["canvas", queueItem.type],
    dueAt: normalizeIsoDate(metadata.due_at),
    lockAt: normalizeIsoDate(metadata.lock_at),
    unlockAt: normalizeIsoDate(metadata.unlock_at),
    pointsPossible: typeof metadata.points_possible === "number" ? metadata.points_possible : undefined,
    questionCount: typeof metadata.question_count === "number" ? metadata.question_count : undefined,
    moduleName: queueItem.type === "module" ? queueItem.title : queueItem.moduleName,
    moduleKey: queueItem.type === "module" ? normalizeModuleKey(queueItem.title) : undefined
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

function candidateModuleUrls(
  moduleItem: Record<string, unknown>,
  course: CourseContext
): string[] {
  const urls = new Set<string>();
  const directUrl = typeof moduleItem.html_url === "string"
    ? moduleItem.html_url
    : typeof moduleItem.url === "string"
      ? moduleItem.url
      : null;
  if (directUrl) {
    urls.add(normalizeDiscoveredCourseUrl(directUrl, course));
  }
  if (typeof moduleItem.page_url === "string" && moduleItem.page_url) {
    urls.add(normalizeDiscoveredCourseUrl(`${course.courseUrl}/pages/${moduleItem.page_url}`, course));
  }
  const contentId = moduleItem.content_id ?? moduleItem.id;
  const rawType = normalizeWhitespace(String(moduleItem.type ?? moduleItem.content_type ?? "")).toLowerCase();
  if (contentId !== undefined && contentId !== null) {
    const id = String(contentId);
    if (rawType.includes("assignment")) {
      urls.add(normalizeDiscoveredCourseUrl(`${course.courseUrl}/assignments/${id}`, course));
    }
    if (rawType.includes("discussion")) {
      urls.add(normalizeDiscoveredCourseUrl(`${course.courseUrl}/discussion_topics/${id}`, course));
    }
    if (rawType.includes("quiz")) {
      urls.add(normalizeDiscoveredCourseUrl(`${course.courseUrl}/quizzes/${id}`, course));
    }
    if (rawType.includes("file")) {
      urls.add(normalizeDiscoveredCourseUrl(`${course.courseUrl}/files/${id}`, course));
    }
  }
  return [...urls];
}

function buildModuleMembershipLookup(
  modules: Array<Record<string, unknown>>,
  course: CourseContext
): Map<string, string> {
  const lookup = new Map<string, string>();
  for (const moduleEntry of modules) {
    const moduleName = normalizeWhitespace(String(moduleEntry.name ?? "Module"));
    const items = Array.isArray(moduleEntry.items)
      ? moduleEntry.items as Array<Record<string, unknown>>
      : [];
    for (const moduleItem of items) {
      for (const url of candidateModuleUrls(moduleItem, course)) {
        if (!lookup.has(url)) {
          lookup.set(url, moduleName);
        }
      }
    }
  }
  return lookup;
}

async function discoverCourse(payload: CaptureJobPayload): Promise<CourseDiscovery> {
  const base = `${payload.course.origin}/api/v1/courses/${payload.course.courseId}`;
  const [
    courseInfo,
    modulesResult,
    assignmentsResult,
    discussionsResult,
    pagesResult,
    quizzesResult,
    filesResult,
    announcementsResult
  ] = await Promise.all([
    fetchJson<Record<string, unknown>>(`${base}?include[]=syllabus_body`, payload.settings),
    loadDiscoveryCollection<Record<string, unknown>>(`${base}/modules?include[]=items&per_page=100`, payload.settings, "Modules"),
    loadDiscoveryCollection<Record<string, unknown>>(`${base}/assignments?per_page=100`, payload.settings, "Assignments"),
    loadDiscoveryCollection<Record<string, unknown>>(`${base}/discussion_topics?per_page=100`, payload.settings, "Discussions"),
    loadDiscoveryCollection<Record<string, unknown>>(`${base}/pages?per_page=100`, payload.settings, "Pages"),
    loadDiscoveryCollection<Record<string, unknown>>(`${base}/quizzes?per_page=100`, payload.settings, "Quizzes"),
    loadDiscoveryCollection<Record<string, unknown>>(`${base}/files?per_page=100`, payload.settings, "Files"),
    loadDiscoveryCollection<Record<string, unknown>>(
      `${payload.course.origin}/api/v1/announcements?context_codes[]=course_${payload.course.courseId}&per_page=100`,
      payload.settings,
      "Announcements"
    )
  ]);

  const modules = modulesResult.items;
  const assignments = assignmentsResult.items;
  const discussions = discussionsResult.items;
  const pages = pagesResult.items;
  const quizzes = quizzesResult.items;
  const files = filesResult.items;
  const announcements = announcementsResult.items;
  const moduleMembershipByUrl = buildModuleMembershipLookup(modules, payload.course);
  const queue: QueueItem[] = [];
  const warnings = [
    modulesResult.warning,
    assignmentsResult.warning,
    discussionsResult.warning,
    pagesResult.warning,
    quizzesResult.warning,
    filesResult.warning,
    announcementsResult.warning
  ].filter((warning): warning is CaptureWarning => Boolean(warning));

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
      url: `${payload.course.modulesUrl}?module_id=${moduleEntry.id ?? stableHash(JSON.stringify(moduleEntry))}`,
      strategy: "api-only",
      raw: moduleEntry
    });
  }

  for (const assignment of assignments) {
    const url = normalizeDiscoveredCourseUrl(
      String(assignment.html_url ?? `${payload.course.courseUrl}/assignments/${assignment.id}`),
      payload.course
    );
    queue.push({
      id: stableHash(`assignment:${assignment.id ?? url}`),
      type: "assignment",
      title: normalizeWhitespace(String(assignment.name ?? "Assignment")),
      url,
      strategy: "html-fetch",
      moduleName: moduleMembershipByUrl.get(url),
      raw: assignment
    });
  }

  for (const discussion of discussions) {
    const url = normalizeDiscoveredCourseUrl(
      String(discussion.html_url ?? `${payload.course.courseUrl}/discussion_topics/${discussion.id}`),
      payload.course
    );
    queue.push({
      id: stableHash(`discussion:${discussion.id ?? url}`),
      type: "discussion",
      title: normalizeWhitespace(String(discussion.title ?? "Discussion")),
      url,
      strategy: "html-fetch",
      moduleName: moduleMembershipByUrl.get(url),
      raw: discussion
    });
  }

  for (const page of pages) {
    const url = normalizeDiscoveredCourseUrl(
      String(page.html_url ?? `${payload.course.courseUrl}/pages/${page.url}`),
      payload.course
    );
    queue.push({
      id: stableHash(`page:${page.page_id ?? page.url ?? url}`),
      type: "page",
      title: normalizeWhitespace(String(page.title ?? "Page")),
      url,
      strategy: "html-fetch",
      moduleName: moduleMembershipByUrl.get(url),
      raw: page
    });
  }

  for (const quiz of quizzes) {
    const url = normalizeDiscoveredCourseUrl(
      String(quiz.html_url ?? `${payload.course.courseUrl}/quizzes/${quiz.id}`),
      payload.course
    );
    queue.push({
      id: stableHash(`quiz:${quiz.id ?? url}`),
      type: "quiz",
      title: normalizeWhitespace(String(quiz.title ?? "Quiz")),
      url,
      strategy: "html-fetch",
      moduleName: moduleMembershipByUrl.get(url),
      raw: quiz
    });
  }

  for (const file of files) {
    queue.push({
      id: stableHash(`file:${file.id ?? file.display_name}`),
      type: "file",
      title: normalizeWhitespace(String(file.display_name ?? file.filename ?? "File")),
      url: normalizeDiscoveredCourseUrl(
        String(file.html_url ?? `${payload.course.courseUrl}/files/${file.id ?? stableHash(JSON.stringify(file))}`),
        payload.course
      ),
      strategy: "api-only",
      moduleName: moduleMembershipByUrl.get(
        normalizeDiscoveredCourseUrl(
          String(file.html_url ?? `${payload.course.courseUrl}/files/${file.id ?? stableHash(JSON.stringify(file))}`),
          payload.course
        )
      ),
      raw: file
    });
  }

  for (const announcement of announcements) {
    queue.push({
      id: stableHash(`announcement:${announcement.id ?? announcement.title}`),
      type: "announcement",
      title: normalizeWhitespace(String(announcement.title ?? "Announcement")),
      url: normalizeDiscoveredCourseUrl(
        String(announcement.html_url ?? `${payload.course.courseUrl}/announcements/${announcement.id ?? stableHash(JSON.stringify(announcement))}`),
        payload.course
      ),
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
    warnings,
    counts
  };
}

async function emitWarning(jobId: string, warning: CaptureWarning): Promise<void> {
  await chrome.runtime.sendMessage({ type: "aeon:job-warning", jobId, warning });
}

function defaultSkipMessage(queueItem: QueueItem): string {
  switch (queueItem.type) {
    case "discussion":
      return `Discussion "${queueItem.title}" did not preserve enough importable prompt text after filtering.`;
    case "quiz":
      return `Quiz "${queueItem.title}" did not preserve enough importable text after filtering.`;
    case "assignment":
      return `Assignment "${queueItem.title}" did not preserve enough importable text after filtering.`;
    case "page":
      return `Page "${queueItem.title}" did not preserve enough importable text after filtering.`;
    default:
      return `${queueItem.type} "${queueItem.title}" did not preserve enough importable content to retain.`;
  }
}

async function emitItemVerdict(input: {
  jobId: string;
  queueItem: QueueItem;
  status: "captured" | "skipped" | "failed";
  message?: string;
  canonicalUrl?: string;
  persistedItemCount?: number;
  sourceUrlCount?: number;
}): Promise<void> {
  await chrome.runtime.sendMessage({
    type: "aeon:job-item-verdict",
    jobId: input.jobId,
    verdict: {
      queueItemId: input.queueItem.id,
      type: input.queueItem.type,
      title: input.queueItem.title,
      url: input.queueItem.url,
      strategy: input.queueItem.strategy,
      status: input.status,
      message: input.message,
      canonicalUrl: input.canonicalUrl,
      persistedItemCount: input.persistedItemCount,
      sourceUrlCount: input.sourceUrlCount
    }
  });
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
  renderOverlay({
    status: state.paused ? "paused" : "capturing",
    phaseLabel: input.phaseLabel,
    progressPct: input.progressPct,
    currentTitle: input.currentTitle,
    completedCount: input.completedCount,
    totalQueued: input.totalQueued
  });
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
    for (const warning of discovery.warnings) {
      await emitWarning(payload.jobId, warning);
    }

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
          await emitItemVerdict({
            jobId: payload.jobId,
            queueItem,
            status: "skipped",
            message: result.warning?.message ?? defaultSkipMessage(queueItem)
          });
        } else {
          const persistResponse = await chrome.runtime.sendMessage({
            type: "aeon:item-captured",
            jobId: payload.jobId,
            item: result.item,
            resources: result.resources,
            rawHtml: result.rawHtml
          });
          if (!persistResponse?.ok) {
            throw new Error(
              typeof persistResponse?.error === "string"
                ? persistResponse.error
                : `AEONTHRA could not persist "${queueItem.title}" into the partial bundle.`
            );
          }
          completedCount += 1;
          await emitItemVerdict({
            jobId: payload.jobId,
            queueItem,
            status: "captured",
            canonicalUrl: result.item.canonicalUrl,
            persistedItemCount: typeof persistResponse.persistedItemCount === "number"
              ? persistResponse.persistedItemCount
              : undefined,
            sourceUrlCount: typeof persistResponse.sourceUrlCount === "number"
              ? persistResponse.sourceUrlCount
              : undefined
          });
        }
      } catch (error) {
        failedCount += 1;
        const message = error instanceof Error ? error.message : `Unable to capture ${queueItem.title}.`;
        await emitWarning(payload.jobId, {
          url: queueItem.url,
          message
        });
        await emitItemVerdict({
          jobId: payload.jobId,
          queueItem,
          status: "failed",
          message
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
    renderOverlay({
      status: state.cancelled ? "cancelled" : "completed",
      phaseLabel: state.cancelled ? "Capture Cancelled" : "Capture Complete",
      progressPct: 100,
      currentTitle: discovery.course.courseName,
      completedCount,
      totalQueued
    });
  } catch (error) {
    renderOverlay({
      status: "error",
      phaseLabel: "Capture Failed",
      progressPct: 100,
      currentTitle: error instanceof Error ? error.message : "Capture failed unexpectedly.",
      completedCount,
      totalQueued: completedCount + skippedCount + failedCount
    });
    await chrome.runtime.sendMessage({
      type: "aeon:job-error",
      jobId: payload.jobId,
      errorMessage: error instanceof Error ? error.message : "Capture failed unexpectedly."
    });
  } finally {
    state.running = false;
    state.paused = false;
    state.cancelled = false;
    window.setTimeout(() => {
      renderOverlay({
        status: "idle",
        phaseLabel: "",
        progressPct: 0,
        currentTitle: "",
        completedCount: 0,
        totalQueued: 0
      });
    }, 3200);
  }
}

function respondWithCourseContext(): CanvasBootstrapResponse {
  const course = parseCourseFromLocation();
  return course ? { ok: true, course } : { ok: false, message: "This page is not inside a Canvas course." };
}

function startCaptureFromBootstrap(payload: CaptureJobPayload): CanvasBootstrapResponse {
  if (state.running) {
    return { ok: false, message: "A capture job is already running in this tab." };
  }

  void runCaptureJob(payload);
  return { ok: true };
}

function setCaptureControlFromBootstrap(control: "pause" | "resume" | "cancel"): CanvasBootstrapResponse {
  if (control === "pause") state.paused = true;
  if (control === "resume") state.paused = false;
  if (control === "cancel") state.cancelled = true;
  return { ok: true };
}

function renderOverlayFromBootstrap(runtime: RuntimeState): { ok: true } {
  renderOverlay(runtime);
  return { ok: true };
}

window.__aeonthraCaptureBootstrap = {
  getCourseContext: respondWithCourseContext,
  startCapture: startCaptureFromBootstrap,
  setCaptureControl: setCaptureControlFromBootstrap,
  renderOverlay: renderOverlayFromBootstrap
};

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "aeon:get-course-context") {
    sendResponse(respondWithCourseContext());
    return true;
  }

  if (message.type === "aeon:start-course-capture") {
    const payload = message.payload as CaptureJobPayload;
    sendResponse(startCaptureFromBootstrap(payload));
    return true;
  }

  if (message.type === "aeon:set-capture-control") {
    const control = message.control as "pause" | "resume" | "cancel";
    sendResponse(setCaptureControlFromBootstrap(control));
    return true;
  }

  if (message.type === "aeon:overlay-state") {
    sendResponse(renderOverlayFromBootstrap(message.runtime as RuntimeState));
    return true;
  }

  if (message.type === "bridge-request-import") {
    window.postMessage({
      source: "learning-freedom-bridge",
      type: "NF_IMPORT_REQUEST",
      requestId:
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : stableHash(`${Date.now()}:${Math.random().toString(36).slice(2, 10)}`)
    }, "*");
    sendResponse({ ok: true });
    return true;
  }

  return undefined;
});

const pendingAutoStartPayload = consumePendingAutoStartPayload();
if (pendingAutoStartPayload && !state.running) {
  void runCaptureJob(pendingAutoStartPayload);
}

installSessionObserver();
