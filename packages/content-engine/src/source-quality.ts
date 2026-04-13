/**
 * source-quality.ts — Deterministic Source Quality Gate
 *
 * Classifies a CaptureBundle before full synthesis so that admin-heavy,
 * orientation-only, or structurally repetitive bundles do not silently
 * produce high-confidence learning artifacts.
 *
 * Outputs a SourceQualityReport with a synthesisMode:
 *   "full"                — proceed normally
 *   "degraded"            — proceed but suppress high-confidence claims, show banner
 *   "blocked-with-warning" — do not synthesize; surface explanation to user
 */

import type { CaptureBundle, CaptureItem } from "@learning/schema";

// ── Types ──────────────────────────────────────────────────────────────────────

export type SynthesisMode = "full" | "degraded" | "blocked-with-warning";

export type SourceQualityReport = {
  /** True when the bundle appears to contain academic/instructional content */
  isAcademicContent: boolean;
  /** 0–100: density of definitional/explanatory signals */
  academicSignalScore: number;
  /** 0–100: density of admin/platform/orientation noise */
  adminSignalScore: number;
  /** Average cleaned character count per item */
  avgCharsPerItem: number;
  /** Number of groups of near-identical items (structural clone families) */
  structurallyIdenticalGroups: number;
  /** Fraction of items dominated by Canvas UI chrome (0–1) */
  canvasChromeRatio: number;
  /** The single phrase that appears most often across item texts */
  dominantBoilerplatePhrase: string;
  /** Human-readable warnings surfaced to the UI */
  warnings: string[];
  /** Synthesis posture for downstream layers */
  synthesisMode: SynthesisMode;
};

// ── Signal vocabularies ────────────────────────────────────────────────────────

/**
 * Phrases that strongly suggest academic/instructional content.
 * Each hit increases academicSignalScore.
 */
const ACADEMIC_SIGNALS: RegExp[] = [
  /\b(is defined as|refers to|is described as|means that|involves|encompasses|consists of)\b/i,
  /\b(theory|framework|principle|concept|approach|model|paradigm|methodology)\b/i,
  /\b(research|evidence|study|findings|literature|scholar|academic|journal)\b/i,
  /\b(analyze|evaluate|compare|contrast|apply|demonstrate|explain|argue|support)\b/i,
  /\b(definition|explanation|example|illustration|case study|application)\b/i,
  /\b(chapter|textbook|reading|lecture|module content|course material)\b/i,
  /\b(according to|as stated|as argued|proposes|suggests|concludes|demonstrates)\b/i,
  /\b(critical thinking|academic writing|thesis|argument|evidence|reasoning)\b/i,
];

/**
 * Phrases that strongly suggest admin/orientation/platform noise.
 * Each hit increases adminSignalScore.
 */
const ADMIN_SIGNALS: RegExp[] = [
  /\b(welcome to|start here|orientation|navigate|navigation|getting started)\b/i,
  /\b(click here|log in|sign in|submit|upload|download|access|link to)\b/i,
  /\b(introduce yourself|about me|my name|my goal|i am excited|where are you from)\b/i,
  /\b(course syllabus|course policies|grading policy|late work|academic integrity)\b/i,
  /\b(support services|tutoring|writing center|library resources|student services)\b/i,
  /\b(technical support|help desk|canvas|lms|learning management|portal)\b/i,
  /\b(points possible|submission type|attempt|quiz access|allowed attempt)\b/i,
  /\b(module item|marked as done|must view|must score|unlock|prerequisite)\b/i,
  /\b(reflection activity|reflect on your|share your thoughts|personal experience)\b/i,
  /\b(discussion forum|initial post|respond to classmates|reply to at least)\b/i,
];

/**
 * Dominant boilerplate phrases to detect repetition across items.
 * If any appears in >40% of items, it flags structural repetition.
 */
const BOILERPLATE_PROBE_PHRASES = [
  "reflection activity",
  "discussion forum",
  "submit your response",
  "initial post",
  "respond to classmates",
  "points possible",
  "module item",
  "marked as done",
  "introduce yourself",
  "start here",
  "welcome to",
  "please note",
  "make sure to",
  "be sure to",
] as const;

// ── Helpers ────────────────────────────────────────────────────────────────────

function cleanText(item: CaptureItem): string {
  return (item.plainText ?? "")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function countSignals(text: string, patterns: RegExp[]): number {
  return patterns.reduce((sum, re) => sum + (re.test(text) ? 1 : 0), 0);
}

/**
 * Returns a normalized 64-char "fingerprint" of an item's body text.
 * Used for structural clone detection.
 */
function structuralFingerprint(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 64);
}

/**
 * Groups items into clone families where fingerprints are identical.
 * Returns the number of families with 2+ members (i.e. actual duplicates).
 */
function countCloneFamilies(items: CaptureItem[]): number {
  const fingerprints = new Map<string, number>();
  for (const item of items) {
    const fp = structuralFingerprint(cleanText(item));
    if (fp.length < 8) continue; // skip near-empty items
    fingerprints.set(fp, (fingerprints.get(fp) ?? 0) + 1);
  }
  return [...fingerprints.values()].filter((count) => count >= 2).length;
}

/**
 * Finds the boilerplate phrase that appears in the highest fraction of items.
 */
function findDominantBoilerphrase(items: CaptureItem[]): { phrase: string; ratio: number } {
  if (items.length === 0) return { phrase: "", ratio: 0 };
  let best = { phrase: "", ratio: 0 };
  for (const phrase of BOILERPLATE_PROBE_PHRASES) {
    const matchCount = items.filter((item) => {
      const text = `${item.title} ${cleanText(item)}`.toLowerCase();
      return text.includes(phrase);
    }).length;
    const ratio = matchCount / items.length;
    if (ratio > best.ratio) {
      best = { phrase, ratio };
    }
  }
  return best;
}

/**
 * Determines the fraction of items whose text is dominated by Canvas chrome.
 * An item is "chrome-heavy" when its plainText is mostly platform metadata.
 */
function chromeRatio(items: CaptureItem[]): number {
  if (items.length === 0) return 0;
  const CHROME_MARKERS = [
    /\bpoints possible\b/i,
    /\bmodule item\b/i,
    /\bno due date\b/i,
    /\bsubmission type\b/i,
    /\ballowed attempt\b/i,
    /\bmarks done\b/i,
    /\byou need to have javascript\b/i,
    /\bload in a new browser window\b/i,
  ];
  const chromeHeavy = items.filter((item) => {
    const text = cleanText(item);
    if (text.length < 20) return true; // near-empty = chrome wrapper
    const hits = CHROME_MARKERS.filter((re) => re.test(text)).length;
    return hits >= 2 || (hits >= 1 && text.length < 120);
  });
  return chromeHeavy.length / items.length;
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Runs the source quality gate on a CaptureBundle.
 *
 * Call this before synthesis. Use the returned `synthesisMode` to decide
 * whether to proceed with full synthesis, degraded mode, or surface a warning.
 */
export function assessSourceQuality(bundle: CaptureBundle): SourceQualityReport {
  const items = bundle.items;
  const isTextbookPresent = items.some((item) =>
    (item.tags ?? []).includes("textbook") || item.kind === "document"
  );

  // ── Per-item signal collection ─────────────────────────────────────────────

  let totalAcademicHits = 0;
  let totalAdminHits = 0;
  let totalChars = 0;

  for (const item of items) {
    const text = `${item.title} ${cleanText(item)}`;
    totalAcademicHits += countSignals(text, ACADEMIC_SIGNALS);
    totalAdminHits += countSignals(text, ADMIN_SIGNALS);
    totalChars += cleanText(item).length;
  }

  const n = Math.max(items.length, 1);
  const avgCharsPerItem = Math.round(totalChars / n);
  const avgAcademic = totalAcademicHits / n;
  const avgAdmin = totalAdminHits / n;

  // Normalise to 0–100
  const academicSignalScore = Math.min(100, Math.round(avgAcademic * 12));
  const adminSignalScore = Math.min(100, Math.round(avgAdmin * 12));

  // ── Structural analysis ────────────────────────────────────────────────────

  const structurallyIdenticalGroups = countCloneFamilies(items);
  const canvasChromeRatio = chromeRatio(items);
  const { phrase: dominantBoilerplatePhrase, ratio: boilerRatio } = findDominantBoilerphrase(items);

  // ── Classification ─────────────────────────────────────────────────────────

  const isAcademicContent = academicSignalScore >= 20 || isTextbookPresent;
  const isAdminHeavy = adminSignalScore > academicSignalScore * 1.5 && adminSignalScore >= 30;
  const isStructurallyRepetitive = structurallyIdenticalGroups >= 3 || boilerRatio >= 0.4;
  const isChromedOut = canvasChromeRatio >= 0.5;
  const isThin = avgCharsPerItem < 60 && !isTextbookPresent;

  // ── Warnings ───────────────────────────────────────────────────────────────

  const warnings: string[] = [];

  if (isAdminHeavy) {
    warnings.push(
      "This bundle contains a high proportion of administrative or orientation content. " +
      "Concepts extracted from orientation guides, syllabus pages, and platform instructions " +
      "may not represent actual course learning objectives."
    );
  }
  if (isStructurallyRepetitive) {
    const label = dominantBoilerplatePhrase
      ? `"${dominantBoilerplatePhrase}"`
      : "repeated activity wrappers";
    warnings.push(
      `Multiple items share near-identical structure (${label} appears in ${Math.round(boilerRatio * 100)}% of items). ` +
      "Repeated discussion/reflection prompts may crowd out academic concepts in ranking."
    );
  }
  if (isChromedOut) {
    warnings.push(
      "Many items contain mostly Canvas platform metadata (points, submission type, attempt limits) " +
      "rather than academic content. The extracted concepts may be thin."
    );
  }
  if (isThin) {
    warnings.push(
      "Average item content is very short. The synthesis may produce generic placeholder concepts " +
      "unless a textbook PDF is also provided."
    );
  }
  if (!isTextbookPresent && items.length <= 8) {
    warnings.push(
      "Only Canvas items were captured and the bundle is small. " +
      "For best results, import a textbook PDF after capturing the course."
    );
  }

  // ── Synthesis mode decision ────────────────────────────────────────────────

  let synthesisMode: SynthesisMode;

  const isTotallyBlocked =
    items.length === 0 ||
    (canvasChromeRatio >= 0.9 && avgCharsPerItem < 40 && !isTextbookPresent);

  const isDegraded =
    !isTotallyBlocked &&
    (isAdminHeavy || isStructurallyRepetitive || isChromedOut || isThin) &&
    !isTextbookPresent;

  if (isTotallyBlocked) {
    synthesisMode = "blocked-with-warning";
  } else if (isDegraded) {
    synthesisMode = "degraded";
  } else {
    synthesisMode = "full";
  }

  return {
    isAcademicContent,
    academicSignalScore,
    adminSignalScore,
    avgCharsPerItem,
    structurallyIdenticalGroups,
    canvasChromeRatio,
    dominantBoilerplatePhrase,
    warnings,
    synthesisMode,
  };
}

/**
 * Returns a short UI-facing banner string for the given quality report.
 * Empty string when no banner is needed.
 */
export function qualityBannerText(report: SourceQualityReport): string {
  if (report.synthesisMode === "blocked-with-warning") {
    return "⚠️ Source quality too low for synthesis. " +
      (report.warnings[0] ?? "Import a richer Canvas export and a textbook PDF.");
  }
  if (report.synthesisMode === "degraded") {
    return "📊 Degraded synthesis mode — " +
      (report.warnings[0] ?? "source content appears thin or admin-heavy. Add a textbook for stronger results.");
  }
  return "";
}
