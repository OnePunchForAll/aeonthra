import { mergeCaptureBundle, stableHash, type CaptureBundle, type CaptureItem } from "@learning/schema";

export type ReviewVerdict = "keep" | "review" | "reject";

export type SourceReviewEntry = {
  id: string;
  title: string;
  kind: CaptureItem["kind"];
  url: string;
  preview: string;
  verdict: ReviewVerdict;
  reasons: string[];
  tags: string[];
  dueAt: string | null;
};

const HARD_NOISE_PATTERNS = [
  /\byou need to have javascript enabled\b/i,
  /\bthis tool needs to be loaded in a new browser window\b/i,
  /\breload the page to access the tool again\b/i,
  /\bskip to content\b/i,
  /\bcourse navigation\b/i,
  /\bbreadcrumbs?\b/i,
  /\bsearch entries\b/i,
  /\bfilter by\b/i,
  /\bjavascript required\b/i
] as const;

const GENERIC_TITLE_PATTERNS = [
  /^week\s+\d+$/i,
  /^week\s+\d+\s*[-:]/i,
  /^module\s+\d+$/i,
  /^module\s+\d+\s*[-:]/i,
  /^chapter\s+\d+$/i,
  /^discussion(?: topic| forum)?$/i,
  /^reply to classmates$/i,
  /^respond to classmates$/i,
  /^assignment$/i,
  /^quiz$/i,
  /^page$/i,
  /^course capture$/i,
  /^reflection activity$/i,
  /^start here$/i,
  /^orientation home$/i
] as const;

const PROFILE_OR_ONBOARDING_PATTERNS = [
  /\bfill out my profile\b/i,
  /\bintroduce yourself\b/i,
  /\bmy short[- ]term goal\b/i,
  /\bwhere are you from\b/i,
  /\bpeers know who i am\b/i,
  /\bwhat are your goals\b/i
] as const;

const TRAILING_CONNECTOR_PATTERN = /\b(?:and|or|to|for|of|in|on|at|by|with|from|the|a|an)$/i;

function normalize(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function previewText(item: CaptureItem): string {
  const text = normalize(item.plainText || item.excerpt || "");
  return text.length <= 180 ? text : `${text.slice(0, 177).trim()}...`;
}

function isFragmentary(title: string): boolean {
  const cleaned = normalize(title);
  if (!cleaned) return true;
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (TRAILING_CONNECTOR_PATTERN.test(cleaned)) return true;
  if (words.length >= 3 && words.filter((word) => word.length <= 2).length >= 2) return true;
  if (!/[.!?]$/.test(cleaned) && cleaned.length <= 28 && words.length >= 4) return true;
  return false;
}

function saneDueAt(item: CaptureItem): boolean {
  if (!item.dueAt) return true;
  const parsed = Date.parse(item.dueAt);
  if (!Number.isFinite(parsed)) return false;
  const deltaDays = (parsed - Date.now()) / (24 * 60 * 60 * 1000);
  return deltaDays > -365 && deltaDays < 730;
}

export function reviewEntryForItem(item: CaptureItem): SourceReviewEntry {
  const reasons: string[] = [];
  const title = normalize(item.title);
  const text = normalize(item.plainText);
  const preview = previewText(item);

  if (!title) {
    reasons.push("Missing title.");
  }
  if (HARD_NOISE_PATTERNS.some((pattern) => pattern.test(title) || pattern.test(text))) {
    reasons.push("Looks like browser/LMS/system boilerplate.");
  }
  if (GENERIC_TITLE_PATTERNS.some((pattern) => pattern.test(title))) {
    reasons.push("Title looks like a generic wrapper rather than real learning content.");
  }
  if (PROFILE_OR_ONBOARDING_PATTERNS.some((pattern) => pattern.test(title) || pattern.test(text))) {
    reasons.push("Looks like onboarding or profile-completion content.");
  }
  if (isFragmentary(title)) {
    reasons.push("Title looks truncated or fragmentary.");
  }
  if (text.length < 60 && item.kind !== "assignment" && item.kind !== "discussion") {
    reasons.push("Very little readable source text survived capture.");
  }
  if (!saneDueAt(item)) {
    reasons.push("Due date looks suspicious and should be treated as unknown.");
  }

  const verdict: ReviewVerdict = reasons.length === 0
    ? "keep"
    : reasons.some((reason) => /boilerplate|fragmentary|generic wrapper/i.test(reason))
      ? "reject"
      : "review";

  return {
    id: item.id,
    title: item.title,
    kind: item.kind,
    url: item.canonicalUrl,
    preview,
    verdict,
    reasons,
    tags: item.tags ?? [],
    dueAt: saneDueAt(item) ? item.dueAt ?? null : null
  };
}

export function buildSourceReviewEntries(bundle: CaptureBundle | null): SourceReviewEntry[] {
  if (!bundle) return [];
  return bundle.items.map(reviewEntryForItem);
}

export function filterCaptureBundle(bundle: CaptureBundle | null, excludedIds: Set<string>): CaptureBundle | null {
  if (!bundle) return null;
  const keptItems = bundle.items.filter((item) => !excludedIds.has(item.id));
  if (keptItems.length === 0) {
    return null;
  }
  const keptResources = bundle.resources.filter((resource) => keptItems.some((item) => item.id === resource.sourceItemId));
  return {
    ...bundle,
    items: keptItems,
    resources: keptResources,
    manifest: {
      itemCount: keptItems.length,
      resourceCount: keptResources.length,
      captureKinds: Array.from(new Set(keptItems.map((item) => item.kind))),
      sourceUrls: Array.from(new Set(keptItems.map((item) => item.canonicalUrl)))
    }
  };
}

export function appendCaptureBundle(base: CaptureBundle | null, incoming: CaptureBundle): CaptureBundle {
  if (!base) {
    return incoming;
  }

  const merged = incoming.items.reduce((current, item) => {
    const resources = incoming.resources.filter((resource) => resource.sourceItemId === item.id);
    return mergeCaptureBundle(current, item, resources);
  }, base);

  return {
    ...merged,
    title: base.title || incoming.title,
    source: base.source,
    captureMeta: base.captureMeta ?? incoming.captureMeta
  };
}

function triggerDownload(filename: string, content: string, mime = "application/json;charset=utf-8"): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function safeSlug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "source";
}

export function downloadCaptureItemJson(item: CaptureItem): void {
  const payload = {
    schemaVersion: "0.1.0-item",
    exportedAt: new Date().toISOString(),
    item
  };
  triggerDownload(`${safeSlug(item.title)}-${item.id}.json`, JSON.stringify(payload, null, 2));
}

export function downloadCaptureBundleJson(bundle: CaptureBundle, label?: string): void {
  const title = label ?? bundle.title;
  triggerDownload(`${safeSlug(title)}-${stableHash(title)}.json`, JSON.stringify(bundle, null, 2));
}
