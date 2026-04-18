import type { CaptureBundle, CaptureItem } from "@learning/schema";

export type SynthesisMode = "full" | "degraded" | "blocked-with-warning";

export type SourceQualityReport = {
  isAcademicContent: boolean;
  academicSignalScore: number;
  adminSignalScore: number;
  avgCharsPerItem: number;
  structurallyIdenticalGroups: number;
  canvasChromeRatio: number;
  dominantBoilerplatePhrase: string;
  warnings: string[];
  synthesisMode: SynthesisMode;
};

const ACADEMIC_SIGNALS: RegExp[] = [
  /\b(is defined as|refers to|is described as|means that|involves|encompasses|consists of)\b/i,
  /\b(explains how|describes how|is learning through|is learning shaped by|occurs when|results when)\b/i,
  /\b(theory|framework|principle|concept|approach|model|paradigm|methodology)\b/i,
  /\b(research|evidence|study|findings|literature|scholar|academic|journal)\b/i,
  /\b(analyze|evaluate|compare|contrast|apply|demonstrate|explain|argue|support)\b/i,
  /\b(definition|explanation|example|illustration|case study|application)\b/i,
  /\b(chapter|textbook|reading|lecture|module content|course material)\b/i,
  /\b(according to|as stated|as argued|proposes|suggests|concludes|demonstrates)\b/i,
  /\b(critical thinking|academic writing|thesis|argument|evidence|reasoning)\b/i
];

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
  /\b(discussion forum|initial post|respond to classmates|reply to at least)\b/i
];

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
  "be sure to"
] as const;

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

function structuralFingerprint(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 64);
}

function countCloneFamilies(items: CaptureItem[]): number {
  const fingerprints = new Map<string, number>();
  for (const item of items) {
    const fingerprint = structuralFingerprint(cleanText(item));
    if (fingerprint.length < 8) {
      continue;
    }
    fingerprints.set(fingerprint, (fingerprints.get(fingerprint) ?? 0) + 1);
  }
  return [...fingerprints.values()].filter((count) => count >= 2).length;
}

function findDominantBoilerphrase(items: CaptureItem[]): { phrase: string; ratio: number } {
  if (items.length === 0) {
    return { phrase: "", ratio: 0 };
  }
  let best = { phrase: "", ratio: 0 };
  for (const phrase of BOILERPLATE_PROBE_PHRASES) {
    const matches = items.filter((item) => `${item.title} ${cleanText(item)}`.toLowerCase().includes(phrase)).length;
    const ratio = matches / items.length;
    if (ratio > best.ratio) {
      best = { phrase, ratio };
    }
  }
  return best;
}

function chromeRatio(items: CaptureItem[]): number {
  if (items.length === 0) {
    return 0;
  }
  const chromeMarkers = [
    /\bpoints possible\b/i,
    /\bmodule item\b/i,
    /\bno due date\b/i,
    /\bsubmission type\b/i,
    /\ballowed attempt\b/i,
    /\bmarks done\b/i,
    /\byou need to have javascript\b/i,
    /\bload in a new browser window\b/i
  ];
  const chromeHeavyItems = items.filter((item) => {
    const text = cleanText(item);
    if (text.length < 20) {
      return true;
    }
    const hits = chromeMarkers.filter((marker) => marker.test(text)).length;
    return hits >= 2 || (hits >= 1 && text.length < 120);
  });
  return chromeHeavyItems.length / items.length;
}

export function assessSourceQuality(bundle: CaptureBundle): SourceQualityReport {
  const items = bundle.items;
  const isTextbookPresent = items.some((item) => (item.tags ?? []).includes("textbook") || item.kind === "document");

  let totalAcademicHits = 0;
  let totalAdminHits = 0;
  let totalChars = 0;

  for (const item of items) {
    const text = `${item.title} ${cleanText(item)}`;
    totalAcademicHits += countSignals(text, ACADEMIC_SIGNALS);
    totalAdminHits += countSignals(text, ADMIN_SIGNALS);
    totalChars += cleanText(item).length;
  }

  const itemCount = Math.max(items.length, 1);
  const avgCharsPerItem = Math.round(totalChars / itemCount);
  const academicSignalScore = Math.min(100, Math.round((totalAcademicHits / itemCount) * 12));
  const adminSignalScore = Math.min(100, Math.round((totalAdminHits / itemCount) * 12));
  const structurallyIdenticalGroups = countCloneFamilies(items);
  const canvasChromeRatio = chromeRatio(items);
  const { phrase: dominantBoilerplatePhrase, ratio: boilerRatio } = findDominantBoilerphrase(items);

  const isAcademicContent = academicSignalScore >= 20 || isTextbookPresent;
  const isAdminHeavy = adminSignalScore > academicSignalScore * 1.5 && adminSignalScore >= 30;
  const isStructurallyRepetitive = structurallyIdenticalGroups >= 3 || boilerRatio >= 0.4;
  const isChromedOut = canvasChromeRatio >= 0.5;
  const isThin = avgCharsPerItem < 60 && !isTextbookPresent;

  const warnings: string[] = [];
  if (isAdminHeavy) {
    warnings.push(
      "This bundle contains a high proportion of administrative or orientation content. Concepts extracted from orientation guides, syllabus pages, and platform instructions may not represent actual course learning objectives."
    );
  }
  if (isStructurallyRepetitive) {
    const label = dominantBoilerplatePhrase
      ? `"${dominantBoilerplatePhrase}"`
      : "repeated activity wrappers";
    warnings.push(
      `Multiple items share near-identical structure (${label} appears in ${Math.round(boilerRatio * 100)}% of items). Repeated discussion or reflection wrappers may crowd out academic concepts in ranking.`
    );
  }
  if (isChromedOut) {
    warnings.push(
      "Many items contain mostly Canvas platform metadata rather than academic content. The extracted concepts may be thin."
    );
  }
  if (isThin) {
    warnings.push(
      "Average item content is very short. Not enough grounded concept evidence may survive the truth gate."
    );
  }
  if (!isTextbookPresent && items.length <= 8) {
    warnings.push(
      "Only Canvas items were captured and the bundle is small. For best results, import a textbook PDF after capturing the course."
    );
  }

  const isTotallyBlocked = items.length === 0
    || ((canvasChromeRatio >= 0.75 || adminSignalScore >= 55) && avgCharsPerItem < 80 && !isTextbookPresent);
  const isDegraded = !isTotallyBlocked
    && (isAdminHeavy || isStructurallyRepetitive || isChromedOut || isThin)
    && !isTextbookPresent;
  const synthesisMode: SynthesisMode = isTotallyBlocked
    ? "blocked-with-warning"
    : isDegraded
      ? "degraded"
      : "full";

  return {
    isAcademicContent,
    academicSignalScore,
    adminSignalScore,
    avgCharsPerItem,
    structurallyIdenticalGroups,
    canvasChromeRatio,
    dominantBoilerplatePhrase,
    warnings,
    synthesisMode
  };
}

export function qualityBannerText(report: SourceQualityReport): string {
  if (report.synthesisMode === "blocked-with-warning") {
    return "Insufficient evidence for trustworthy synthesis. "
      + (report.warnings[0] ?? "Import a richer Canvas capture and a textbook source.");
  }
  if (report.synthesisMode === "degraded") {
    return "Synthesis is gated by weak source quality. "
      + (report.warnings[0] ?? "Source content appears thin or admin-heavy. Add grounded textbook evidence.");
  }
  return "";
}
