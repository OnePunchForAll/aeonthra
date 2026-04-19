// Aeonthra Lite · Canvas content extractor.
// Runs on instructure.com. Captures the real authored content of a Canvas page
// using Canvas-specific selectors — NOT generic DOM walk, which is why other
// extensions only capture chrome / titles.

"use strict";

const CANVAS_CONTEXT_PATTERNS = [
  { pattern: /\/courses\/(\d+)\/pages\/([^/?#]+)/, kind: "page" },
  { pattern: /\/courses\/(\d+)\/assignments\/syllabus/, kind: "syllabus" },
  { pattern: /\/courses\/(\d+)\/assignments\/(\d+)\/submissions\/(\d+)/, kind: "submission" },
  { pattern: /\/courses\/(\d+)\/assignments\/(\d+)/, kind: "assignment" },
  { pattern: /\/courses\/(\d+)\/discussion_topics\/(\d+)/, kind: "discussion" },
  { pattern: /\/courses\/(\d+)\/quizzes\/(\d+)/, kind: "quiz" },
  { pattern: /\/courses\/(\d+)\/announcements\/(\d+)?/, kind: "announcement" },
  { pattern: /\/courses\/(\d+)\/modules/, kind: "modules-index" },
  { pattern: /\/courses\/(\d+)\/assignments/, kind: "assignments-index" },
  { pattern: /\/courses\/(\d+)/, kind: "course-home" }
];

function detectContext(url) {
  for (const entry of CANVAS_CONTEXT_PATTERNS) {
    const match = url.match(entry.pattern);
    if (match) {
      return { kind: entry.kind, courseId: match[1] ?? null, resourceId: match[2] ?? null, submissionId: match[3] ?? null };
    }
  }
  return { kind: "other", courseId: null, resourceId: null, submissionId: null };
}

// Selector stacks per Canvas content kind. Each list is tried in order;
// the first one yielding substantial text wins. `.user_content` is Canvas's
// universal wrapper for author-authored body content across all surfaces.
const SELECTOR_STACKS = {
  page: ["#wiki_page_show .user_content", "#wiki_page_show", ".show-content .user_content"],
  syllabus: ["#course_syllabus", ".syllabus_content .user_content"],
  assignment: [".description.user_content", "#assignment_show .description", "#assignment_show .user_content"],
  submission: [".description.user_content", ".a2-toggle-details-container", "#assignment_show .description", ".user_content"],
  discussion: [".discussion-section .message_wrapper .user_content", ".discussion_topic .message", ".entry-content .message .user_content", "#discussion_topic .message"],
  quiz: ["#quiz_description .user_content", ".quiz_description"],
  announcement: [".discussion-section .message_wrapper .user_content", ".announcement .message", ".user_content"],
  "modules-index": ["#context_modules", ".context_module"],
  "assignments-index": ["#assignment_groups", "#ag_list"],
  "course-home": ["#course_home_content .user_content", "#course_home_content", ".ic-Dashboard-header"]
};

function pickMainContainer(kind) {
  const selectors = SELECTOR_STACKS[kind] ?? [".user_content", "#content", "#main", "[role='main']"];
  for (const selector of selectors) {
    const node = document.querySelector(selector);
    if (node && (node.textContent ?? "").trim().length >= 40) return node;
  }
  // Fallback: broadest-area main content.
  return document.querySelector("[role='main']") ?? document.querySelector("#content") ?? document.body;
}

function extractPageTitle() {
  const candidates = [
    "h1.page-title",
    "h1.topic-title",
    "h1.discussion-title",
    "#wiki_page_show h1",
    "#assignment_show h1",
    ".discussion-title",
    "h1"
  ];
  for (const selector of candidates) {
    const node = document.querySelector(selector);
    const text = (node?.textContent ?? "").replace(/\s+/g, " ").trim();
    if (text && text.length >= 3 && text.length <= 240) return text;
  }
  const title = (document.title || "").replace(/\s*[-·|–]\s*.*$/, "").trim();
  return title || "Captured page";
}

function extractCourseName() {
  const selectors = [
    "#breadcrumbs a[href*='/courses/']",
    ".ic-app-nav-toggle-and-crumbs a",
    "#section-tabs-header"
  ];
  for (const selector of selectors) {
    const node = document.querySelector(selector);
    const text = (node?.textContent ?? "").replace(/\s+/g, " ").trim();
    if (text && text.length >= 2 && text.length <= 160) return text;
  }
  return null;
}

function extractAssignmentMeta() {
  const meta = {};
  const dueAtNode = document.querySelector(".assignment-date-due time, .date_field[name='due_at'], .due-date-display time");
  if (dueAtNode) {
    meta.dueAt = dueAtNode.getAttribute("datetime") || (dueAtNode.textContent ?? "").trim();
  }
  const points = document.querySelector(".points_possible, .assignment-points-possible");
  if (points) {
    meta.pointsPossible = (points.textContent ?? "").trim();
  }
  const rubricNode = document.querySelector(".rubric_container, #rubrics");
  if (rubricNode) {
    meta.rubricText = (rubricNode.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 2000);
  }
  return meta;
}

function collectHeadings(container) {
  const headings = [];
  container.querySelectorAll("h1, h2, h3, h4, h5").forEach((node) => {
    const text = (node.textContent ?? "").replace(/\s+/g, " ").trim();
    if (text && text.length >= 3 && text.length <= 180) {
      headings.push(text);
    }
  });
  return headings;
}

// Convert the captured DOM region to well-structured plain text. Preserves
// paragraph breaks, list structure, and table cell separation so the
// aeonthra-lite engine's sentence splitter and heading detector work well.
function containerToPlainText(container) {
  const clone = container.cloneNode(true);
  // Remove interactive / navigational noise that Canvas injects into content.
  clone.querySelectorAll(
    "script, style, nav, .screenreader-only, .screenreader_only, .ui-button, .accessibility-warning, .file_preview_link, .external_link_icon, .instructure_file_holder, #comment_attachments"
  ).forEach((node) => node.remove());

  const lines = [];
  const walk = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = (node.textContent ?? "").replace(/\s+/g, " ");
      if (text.trim()) lines.push(text);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const tag = node.tagName.toLowerCase();
    if (tag === "br") { lines.push("\n"); return; }
    const block = /^(p|div|section|article|header|footer|li|ul|ol|h[1-6]|blockquote|pre|table|tr|td|th|figure|figcaption|dd|dt|dl|details|summary)$/i.test(tag);
    if (block) lines.push("\n");
    if (tag === "li") lines.push("• ");
    for (const child of node.childNodes) walk(child);
    if (block) lines.push("\n");
  };
  walk(clone);

  return lines
    .join("")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function makeItem(kind, container, extra = {}) {
  const title = extra.title || extractPageTitle();
  const plainText = extra.plainText ?? containerToPlainText(container);
  const headingTrail = extra.headingTrail ?? [extractCourseName(), title].filter(Boolean);
  const pageHeadings = extra.headings ?? collectHeadings(container);
  const url = extra.canonicalUrl || window.location.href;
  const tags = ["canvas", `kind:${kind}`];
  if (extra.courseId) tags.push(`course:${extra.courseId}`);
  return {
    id: null, // aeonthra-lite generates deterministic hash on import
    title,
    canonicalUrl: url,
    plainText,
    headingTrail,
    tags,
    kind: "canvas",
    headings: pageHeadings,
    capturedAt: new Date().toISOString(),
    ...(extra.meta ? { meta: extra.meta } : {})
  };
}

function capturePage() {
  const context = detectContext(window.location.pathname);
  const container = pickMainContainer(context.kind);
  const item = makeItem(context.kind, container, {
    courseId: context.courseId,
    meta: context.kind === "assignment" || context.kind === "submission" ? extractAssignmentMeta() : undefined
  });
  return { context, item };
}

async function captureWithFetch(url, kind) {
  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  const html = await response.text();
  const doc = new DOMParser().parseFromString(html, "text/html");
  const selectors = SELECTOR_STACKS[kind] ?? [".user_content"];
  let container = null;
  for (const selector of selectors) {
    const node = doc.querySelector(selector);
    if (node && (node.textContent ?? "").trim().length >= 40) {
      container = node;
      break;
    }
  }
  if (!container) container = doc.querySelector("[role='main']") ?? doc.body;
  // Title extraction from fetched doc (without relying on DOM-level helpers that read `document`).
  const titleCandidates = ["h1.page-title", "h1.topic-title", "h1.discussion-title", "#wiki_page_show h1", "#assignment_show h1", ".discussion-title", "h1"];
  let title = "";
  for (const selector of titleCandidates) {
    const node = doc.querySelector(selector);
    const text = (node?.textContent ?? "").replace(/\s+/g, " ").trim();
    if (text && text.length >= 3 && text.length <= 240) { title = text; break; }
  }
  if (!title) title = (doc.title || "").replace(/\s*[-·|–]\s*.*$/, "").trim() || "Captured page";
  const plainText = containerToPlainText(container);
  const headings = [];
  container.querySelectorAll("h1, h2, h3, h4, h5").forEach((node) => {
    const text = (node.textContent ?? "").replace(/\s+/g, " ").trim();
    if (text && text.length >= 3 && text.length <= 180) headings.push(text);
  });
  return {
    id: null,
    title,
    canonicalUrl: url,
    plainText,
    headingTrail: [title].filter(Boolean),
    tags: ["canvas", `kind:${kind}`, "fetched"],
    kind: "canvas",
    headings,
    capturedAt: new Date().toISOString()
  };
}

// Discovers crawlable course-resource links anywhere on the current page.
// Works across modern Canvas themes (UAGC included) that don't use the
// classic `.context_module_item a.item_link` selector by instead matching
// URL patterns against every anchor in the page's main content region.
function discoverCourseItemLinks() {
  const courseMatch = window.location.pathname.match(/\/courses\/(\d+)/);
  if (!courseMatch) return { links: [], diagnostics: { courseId: null, reason: "Not a /courses/<id>/ URL" } };
  const courseId = courseMatch[1];
  // Accept any resource-kind link under this course. Matches trailing slashes,
  // query strings, and multi-segment paths like /assignments/N/edit.
  const resourcePatterns = [
    new RegExp(`/courses/${courseId}/pages/[^?#]+`),
    new RegExp(`/courses/${courseId}/assignments/\\d+(?:[/?#]|$)`),
    new RegExp(`/courses/${courseId}/assignments/syllabus(?:[/?#]|$)`),
    new RegExp(`/courses/${courseId}/discussion_topics/\\d+(?:[/?#]|$)`),
    new RegExp(`/courses/${courseId}/quizzes/\\d+(?:[/?#]|$)`),
    new RegExp(`/courses/${courseId}/announcements(?:/\\d+)?(?:[/?#]|$)`)
  ];
  const EXCLUDE = /\/(edit|new|submissions|rubric|peer_reviews|files|outcomes|commons|tools|external_tools)(?:\?|#|$|\/)/;
  // Search containers from most-specific to fall-back to entire body so we
  // catch links regardless of how a given institution's theme wraps content.
  const roots = [
    document.querySelector("#context_modules"),
    document.querySelector(".context_modules"),
    document.querySelector("[data-test-id='context-modules']"),
    document.querySelector("#content"),
    document.querySelector("[role='main']"),
    document.body
  ].filter(Boolean);
  const seen = new Set();
  const links = [];
  for (const root of roots) {
    root.querySelectorAll("a[href]").forEach((anchor) => {
      const rawHref = anchor.getAttribute("href");
      if (!rawHref || rawHref.startsWith("#") || rawHref.startsWith("javascript:")) return;
      let absolute;
      try { absolute = new URL(rawHref, window.location.origin).toString(); } catch { return; }
      const parsed = new URL(absolute);
      if (parsed.host !== window.location.host) return;
      if (EXCLUDE.test(parsed.pathname)) return;
      const matches = resourcePatterns.some((pattern) => pattern.test(parsed.pathname));
      if (!matches) return;
      // Normalize URL: strip trailing /edit, fragments, most query strings.
      const normalized = `${parsed.origin}${parsed.pathname.replace(/\/edit\/?$/, "")}`;
      if (seen.has(normalized)) return;
      seen.add(normalized);
      links.push(normalized);
    });
    if (links.length > 0) break; // first root that finds anything wins
  }
  const diagnostics = {
    courseId,
    currentPath: window.location.pathname,
    rootsFound: roots.length,
    totalAnchors: roots[0] ? roots[0].querySelectorAll("a[href]").length : 0,
    resourceLinksFound: links.length
  };
  return { links, diagnostics };
}

async function captureCourseSweep(onProgress) {
  const { links, diagnostics } = discoverCourseItemLinks();
  if (links.length === 0) {
    // If we're on /modules and still found nothing, Canvas probably renders items lazily.
    // Try the course-level Assignments, Pages, and Discussions index pages via fetch instead.
    const fallbackLinks = await discoverViaIndexPages(diagnostics.courseId);
    if (fallbackLinks.length === 0) {
      const detail = diagnostics.courseId
        ? ` (Course ${diagnostics.courseId}, ${diagnostics.totalAnchors} anchors scanned in main content.) Try loading the Assignments, Pages, and Discussions index pages once before sweeping so Canvas renders the link list.`
        : " Navigate to a /courses/<id>/... page first.";
      throw new Error(`No course item links found on this page.${detail}`);
    }
    const items = [];
    const errors = [];
    for (let i = 0; i < fallbackLinks.length; i += 1) {
      const url = fallbackLinks[i];
      const kindMatch = detectContext(new URL(url).pathname);
      try {
        onProgress?.({ current: i + 1, total: fallbackLinks.length, url });
        const item = await captureWithFetch(url, kindMatch.kind);
        items.push(item);
      } catch (error) {
        errors.push({ url, message: error instanceof Error ? error.message : String(error) });
      }
      await new Promise((resolve) => setTimeout(resolve, 180));
    }
    return { items, errors, diagnostics: { ...diagnostics, via: "index-fallback", fallbackCount: fallbackLinks.length } };
  }
  const items = [];
  const errors = [];
  for (let i = 0; i < links.length; i += 1) {
    const url = links[i];
    const kindMatch = detectContext(new URL(url).pathname);
    try {
      onProgress?.({ current: i + 1, total: links.length, url });
      const item = await captureWithFetch(url, kindMatch.kind);
      items.push(item);
    } catch (error) {
      errors.push({ url, message: error instanceof Error ? error.message : String(error) });
    }
    // Gentle pacing — don't hammer the Canvas server.
    await new Promise((resolve) => setTimeout(resolve, 180));
  }
  return { items, errors, diagnostics };
}

// Fallback: fetch the course's Assignments / Pages / Discussions / Quizzes
// index pages and extract resource links from each response's HTML.
async function discoverViaIndexPages(courseId) {
  if (!courseId) return [];
  const origin = window.location.origin;
  const indexPaths = [
    `/courses/${courseId}/assignments`,
    `/courses/${courseId}/pages`,
    `/courses/${courseId}/discussion_topics`,
    `/courses/${courseId}/quizzes`,
    `/courses/${courseId}/modules`,
    `/courses/${courseId}/announcements`
  ];
  const resourcePatterns = [
    new RegExp(`/courses/${courseId}/pages/[^?#]+`),
    new RegExp(`/courses/${courseId}/assignments/\\d+(?:[/?#]|$)`),
    new RegExp(`/courses/${courseId}/assignments/syllabus(?:[/?#]|$)`),
    new RegExp(`/courses/${courseId}/discussion_topics/\\d+(?:[/?#]|$)`),
    new RegExp(`/courses/${courseId}/quizzes/\\d+(?:[/?#]|$)`),
    new RegExp(`/courses/${courseId}/announcements/\\d+(?:[/?#]|$)`)
  ];
  const EXCLUDE = /\/(edit|new|submissions|rubric|peer_reviews|files|outcomes)(?:\?|#|$|\/)/;
  const seen = new Set();
  const links = [];
  for (const path of indexPaths) {
    try {
      const response = await fetch(origin + path, { credentials: "include" });
      if (!response.ok) continue;
      const html = await response.text();
      const doc = new DOMParser().parseFromString(html, "text/html");
      doc.querySelectorAll("a[href]").forEach((anchor) => {
        const rawHref = anchor.getAttribute("href");
        if (!rawHref || rawHref.startsWith("#") || rawHref.startsWith("javascript:")) return;
        let absolute;
        try { absolute = new URL(rawHref, origin).toString(); } catch { return; }
        const parsed = new URL(absolute);
        if (parsed.host !== window.location.host) return;
        if (EXCLUDE.test(parsed.pathname)) return;
        if (!resourcePatterns.some((pattern) => pattern.test(parsed.pathname))) return;
        const normalized = `${parsed.origin}${parsed.pathname.replace(/\/edit\/?$/, "")}`;
        if (seen.has(normalized)) return;
        seen.add(normalized);
        links.push(normalized);
      });
    } catch {
      // ignore individual index failures
    }
    await new Promise((resolve) => setTimeout(resolve, 120));
  }
  return links;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "aeonthra:capture-current") {
    try {
      const result = capturePage();
      sendResponse({ ok: true, ...result });
    } catch (error) {
      sendResponse({ ok: false, message: error instanceof Error ? error.message : String(error) });
    }
    return false;
  }
  if (message?.type === "aeonthra:sweep-course") {
    (async () => {
      try {
        const result = await captureCourseSweep((progress) => {
          chrome.runtime.sendMessage({ type: "aeonthra:sweep-progress", progress }).catch(() => undefined);
        });
        sendResponse({ ok: true, ...result });
      } catch (error) {
        sendResponse({ ok: false, message: error instanceof Error ? error.message : String(error) });
      }
    })();
    return true; // async response
  }
  if (message?.type === "aeonthra:ping") {
    sendResponse({ ok: true, host: window.location.host });
    return false;
  }
  return false;
});
