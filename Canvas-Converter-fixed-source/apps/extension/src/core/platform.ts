import type { CourseContext } from "./types";

const COURSE_PATH_RE = /\/courses\/(\d+)(?:[/?#]|$)/i;
const BRIDGE_HOST_PATTERNS = [
  /(^|\.)github\.io$/i
];

export const BRIDGE_URL_REQUIREMENT =
  "Direct handoff requires a GitHub Pages URL or a local URL on http://localhost/* or http://127.0.0.1/*.";

export function extractCourseId(pathname: string): string | null {
  return pathname.match(COURSE_PATH_RE)?.[1] ?? null;
}

export function isKnownCanvasHost(hostname: string): boolean {
  return (
    /(^|\.)instructure\.com$/i.test(hostname) ||
    /^canvas\./i.test(hostname) ||
    /\.canvas\./i.test(hostname)
  );
}

export function parseCourseContextFromUrl(
  urlValue?: string,
  title = "Canvas Course",
  options: { requireKnownCanvasHost?: boolean } = {}
): CourseContext | null {
  if (!urlValue) {
    return null;
  }

  try {
    const url = new URL(urlValue);
    if (options.requireKnownCanvasHost && !isKnownCanvasHost(url.hostname)) {
      return null;
    }

    const courseId = extractCourseId(url.pathname);
    if (!courseId) {
      return null;
    }

    const courseName = title.split("|")[0]!.trim() || `Course ${courseId}`;
    return {
      courseId,
      courseName,
      origin: url.origin,
      courseUrl: `${url.origin}/courses/${courseId}`,
      modulesUrl: `${url.origin}/courses/${courseId}/modules`,
      host: url.host
    };
  } catch {
    return null;
  }
}

export function normalizeCourseUrlToDetectedOrigin(
  urlValue: string,
  course: Pick<CourseContext, "origin" | "courseId">
): string {
  try {
    const resolved = new URL(urlValue, course.origin);
    const resolvedCourseId = extractCourseId(resolved.pathname);
    if (resolvedCourseId && resolvedCourseId === course.courseId) {
      return new URL(`${resolved.pathname}${resolved.search}${resolved.hash}`, course.origin).toString();
    }
    return resolved.toString();
  } catch {
    return urlValue;
  }
}

export function validateAeonthraUrl(value: string): { ok: true; normalizedUrl: string } | { ok: false; message: string } {
  try {
    const url = new URL(value.trim());
    const isLocalHost = url.protocol === "http:" && (url.hostname === "localhost" || url.hostname === "127.0.0.1");
    const isGitHubPages = url.protocol === "https:" && BRIDGE_HOST_PATTERNS.some((pattern) => pattern.test(url.hostname));
    if (!isLocalHost && !isGitHubPages) {
      return {
        ok: false,
        message: BRIDGE_URL_REQUIREMENT
      };
    }

    return {
      ok: true,
      normalizedUrl: url.toString()
    };
  } catch {
    return {
      ok: false,
      message: "AEONTHRA Classroom URL must be a valid absolute URL."
    };
  }
}
