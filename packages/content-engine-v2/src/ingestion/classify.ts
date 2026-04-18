import type { CaptureBundle, CaptureItem } from "@learning/schema";
import type {
  CaptureModality,
  ContentProfile,
  OriginSystem,
  SourceClassification,
  SourceDocument,
  SourceFamilyV2,
  TrustLaneState,
  TrustTier
} from "../contracts/types.ts";
import {
  contentProfileScore,
  isGenericWrapperLabel,
  isHardNoiseText,
  looksFragmentary,
  scoreHits
} from "../noise/rules.ts";
import { normalizeText } from "../utils/text.ts";
import { evaluateLabel } from "../truth-gates/labels.ts";

const DAY = 24 * 60 * 60 * 1000;

function originSystemFor(bundle: CaptureBundle, item: CaptureItem): OriginSystem {
  if ((item.tags ?? []).includes("textbook")) {
    return "textbook-import";
  }
  switch (bundle.source) {
    case "extension-capture":
      return "canvas-extension";
    case "demo":
      return "demo";
    default:
      return "manual-import";
  }
}

function sourceFamilyFor(item: CaptureItem): SourceFamilyV2 {
  if ((item.tags ?? []).includes("textbook") || item.kind === "document") {
    return "textbook-segment";
  }
  switch (item.kind) {
    case "assignment":
    case "discussion":
    case "quiz":
    case "page":
    case "module":
    case "syllabus":
    case "announcement":
    case "selection":
      return item.kind;
    default:
      return "unknown";
  }
}

function modalityFor(item: CaptureItem): CaptureModality {
  const joinedTags = (item.tags ?? []).join(" ").toLowerCase();
  if (joinedTags.includes("import:pdf")) {
    return "imported-pdf";
  }
  if (joinedTags.includes("import:docx")) {
    return "imported-docx";
  }
  if ((item.tags ?? []).includes("textbook")) {
    return "imported-text";
  }
  if (item.html && /<[^>]+>/.test(item.html)) {
    return "cleaned-html";
  }
  return "plain-text-fallback";
}

function classifyContentProfile(item: CaptureItem, cleanedText: string): ContentProfile {
  const scoring = contentProfileScore(`${item.title} ${cleanedText}`);
  if (scoring.hardNoise) {
    return "chrome";
  }
  if (scoring.admin >= 3 && scoring.academic === 0) {
    return "administrative";
  }
  if (item.kind === "assignment" || item.kind === "discussion" || item.kind === "quiz") {
    if (scoring.academic > 0) {
      return "assignment-prompt";
    }
    if (scoring.admin > 0) {
      return "reflection-social";
    }
  }
  if (scoring.academic > 0 && scoring.admin > 0) {
    return "mixed";
  }
  if (scoring.academic > 0) {
    return "academic";
  }
  if (scoring.admin > 0) {
    return "administrative";
  }
  return "unknown";
}

function buildLane(state: TrustLaneState["state"], score: number, reasons: string[]): TrustLaneState {
  return {
    state,
    score: Number(score.toFixed(2)),
    reasons
  };
}

function saneDateTrust(item: CaptureItem, bundle: CaptureBundle): TrustLaneState {
  if (!item.dueAt) {
    return buildLane("rejected", 0, ["date-missing"]);
  }
  const capturedAt = Date.parse(bundle.capturedAt) || Date.now();
  const parsed = Date.parse(item.dueAt);
  if (Number.isNaN(parsed)) {
    return buildLane("rejected", 0, ["date-invalid"]);
  }
  const deltaDays = (parsed - capturedAt) / DAY;
  if (deltaDays < -365 || deltaDays > 730) {
    return buildLane("rejected", 0, ["date-suspicious-range"]);
  }
  return buildLane("accepted", 1, ["date-structured-and-sane"]);
}

function titleTrust(item: CaptureItem): TrustLaneState {
  const cleanedTitle = normalizeText(item.title);
  const gate = evaluateLabel(cleanedTitle);
  const reasons = [...gate.rejectionReasons];
  if (cleanedTitle && isGenericWrapperLabel(cleanedTitle) && !reasons.includes("label-generic-wrapper")) {
    reasons.push("title-generic-wrapper");
  }
  if (cleanedTitle && looksFragmentary(cleanedTitle) && !reasons.includes("label-fragmentary")) {
    reasons.push("title-fragmentary");
  }
  if (cleanedTitle && isHardNoiseText(cleanedTitle) && !reasons.includes("label-hard-noise")) {
    reasons.push("title-hard-noise");
  }
  if (cleanedTitle && gate.accepted && /^(?:overview|introduction|principles|foundations|reading|lecture|example|summary|background|lesson|unit|page|section|topic|activity|discussion|reflection)\b/i.test(cleanedTitle)) {
    reasons.push("title-container-wrapper");
  }
  const accepted = gate.accepted && reasons.length === 0;
  return buildLane(
    accepted ? "accepted" : "rejected",
    accepted ? 1 : 0,
    accepted ? [item.titleSource === "structured" ? "title-structured" : "title-accepted"] : reasons.length > 0 ? reasons : ["title-rejected"]
  );
}

export function classifySourceItem(bundle: CaptureBundle, item: CaptureItem): SourceDocument {
  const cleanedTitle = normalizeText(item.title);
  const extractedHtmlText = item.html ? normalizeText(item.html) : "";
  const cleanedText = normalizeText(extractedHtmlText || item.plainText || item.excerpt);
  const contentProfile = classifyContentProfile(item, cleanedText);
  const family = sourceFamilyFor(item);
  const modality = modalityFor(item);
  const originSystem = originSystemFor(bundle, item);
  const acceptedReasons: string[] = [];
  const rejectedReasons: string[] = [];

  const bodyScoreSeed = scoreHits(`${cleanedTitle} ${cleanedText}`, [
    /\btheory\b/i,
    /\bframework\b/i,
    /\bconcept\b/i,
    /\bdefinition\b/i,
    /\bexplain\b/i,
    /\bcompare\b/i
  ]);

  let trustTier: TrustTier = "medium";
  let trustScore = 0.65 + bodyScoreSeed * 0.05;
  if (contentProfile === "chrome") {
    trustTier = "rejected";
    trustScore = 0;
    rejectedReasons.push("body-hard-noise");
  } else if (contentProfile === "academic") {
    trustTier = "high";
    trustScore = 0.9;
    acceptedReasons.push("body-academic");
  } else if (contentProfile === "assignment-prompt" || contentProfile === "mixed") {
    trustTier = "medium";
    trustScore = 0.72;
    acceptedReasons.push(`body-${contentProfile}`);
  } else if (contentProfile === "administrative" || contentProfile === "reflection-social") {
    trustTier = "low";
    trustScore = 0.35;
    rejectedReasons.push(`body-${contentProfile}`);
  } else {
    trustTier = "low";
    trustScore = 0.25;
    rejectedReasons.push("body-unknown");
  }

  const titleLane = titleTrust(item);
  const dateLane = saneDateTrust(item, bundle);
  const bodyLane = buildLane(
    trustTier === "rejected" ? "rejected" : trustTier === "high" ? "accepted" : trustTier === "medium" ? "degraded" : "rejected",
    trustScore,
    trustTier === "high" ? ["body-strong"] : trustTier === "medium" ? ["body-mixed-or-prompt"] : rejectedReasons.length > 0 ? rejectedReasons : ["body-low-trust"]
  );
  const moduleLane = buildLane(
    item.moduleKey || item.moduleName ? "accepted" : "rejected",
    item.moduleKey || item.moduleName ? 1 : 0,
    item.moduleKey || item.moduleName ? ["module-structured"] : ["module-missing"]
  );
  const assignmentPromptLane = buildLane(
    family === "assignment" || family === "discussion" || family === "quiz"
      ? bodyLane.state === "accepted" || bodyLane.state === "degraded" ? "accepted" : "rejected"
      : "rejected",
    family === "assignment" || family === "discussion" || family === "quiz" ? trustScore : 0,
    family === "assignment" || family === "discussion" || family === "quiz"
      ? ["assignment-prompt-lane"]
      : ["assignment-prompt-not-applicable"]
  );

  const classification: SourceClassification = {
    sourceItemId: item.id,
    sourceKind: item.kind,
    originSystem,
    sourceFamily: family,
    captureModality: modality,
    contentProfile,
    trustTier,
    trustScore: Number(Math.max(0, Math.min(1, trustScore)).toFixed(2)),
    acceptedReasons,
    rejectedReasons,
    titleTrust: titleLane,
    dateTrust: dateLane,
    bodyTrust: bodyLane,
    moduleTrust: moduleLane,
    assignmentPromptTrust: assignmentPromptLane
  };

  return {
    item,
    classification,
    cleanedTitle,
    cleanedText,
    extractedHtmlText
  };
}

export function classifyBundle(bundle: CaptureBundle): SourceDocument[] {
  return bundle.items.map((item) => classifySourceItem(bundle, item));
}
