import { isGenericWrapperLabel, isHardNoiseText, looksFragmentary } from "../noise/rules.ts";
import {
  firstMeaningfulToken,
  hasRepeatedLabelPhrase,
  meaningfulTokens,
  startsWithClauseOpener,
  toDisplayLabel
} from "../utils/text.ts";

const STOPWORD_HEAVY_TOKENS = new Set([
  "activity",
  "assignment",
  "chapter",
  "discussion",
  "forum",
  "module",
  "overview",
  "page",
  "section",
  "topic",
  "week"
]);

const LABEL_HEAD_BLOCKLIST = new Set([
  "he",
  "if",
  "it",
  "she",
  "that",
  "the",
  "their",
  "them",
  "there",
  "these",
  "they",
  "this",
  "those",
  "we",
  "what",
  "when",
  "where",
  "whether",
  "while",
  "who",
  "whom",
  "whose",
  "you",
  "your"
]);

export type LabelGateResult = {
  accepted: boolean;
  cleanedLabel: string;
  normalizedLabel: string;
  keywords: string[];
  rejectionReasons: string[];
};

export function evaluateLabel(label: string): LabelGateResult {
  const cleanedLabel = toDisplayLabel(label);
  const normalizedLabel = cleanedLabel
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const keywords = meaningfulTokens(cleanedLabel);
  const rejectionReasons: string[] = [];

  if (!cleanedLabel) {
    rejectionReasons.push("label-empty");
  }
  if (cleanedLabel.length < 4 || cleanedLabel.length > 90) {
    rejectionReasons.push("label-length-out-of-range");
  }
  if (cleanedLabel.split(/\s+/).length > 8) {
    rejectionReasons.push("label-too-many-tokens");
  }
  if (isHardNoiseText(cleanedLabel)) {
    rejectionReasons.push("label-hard-noise");
  }
  if (isGenericWrapperLabel(cleanedLabel)) {
    rejectionReasons.push("label-generic-wrapper");
  }
  if (looksFragmentary(cleanedLabel)) {
    rejectionReasons.push("label-fragmentary");
  }
  if (startsWithClauseOpener(cleanedLabel)) {
    rejectionReasons.push("label-clause-opener");
  }
  if (LABEL_HEAD_BLOCKLIST.has(firstMeaningfulToken(cleanedLabel))) {
    rejectionReasons.push("label-bad-head-token");
  }
  if (hasRepeatedLabelPhrase(cleanedLabel)) {
    rejectionReasons.push("label-repeated-phrase");
  }
  if (/^(?:week|module|chapter)\s+\d+\b(?:\s+\w+)?$/i.test(cleanedLabel)) {
    rejectionReasons.push("label-week-module-wrapper");
  }
  if (keywords.length === 0) {
    rejectionReasons.push("label-no-meaningful-keywords");
  }
  if (keywords.length > 0 && keywords.every((token) => STOPWORD_HEAVY_TOKENS.has(token))) {
    rejectionReasons.push("label-stopword-heavy");
  }

  return {
    accepted: rejectionReasons.length === 0,
    cleanedLabel,
    normalizedLabel,
    keywords,
    rejectionReasons
  };
}
