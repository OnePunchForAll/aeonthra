import type { StructuralNode } from "../contracts/types.ts";

const ZERO_WIDTH_PATTERN = /[\u200B-\u200D\uFEFF]/g;

export type CanonicalTextContext = "prose" | "date" | "identifier";

function normalizeBaseText(text: string): string {
  return text
    .normalize("NFC")
    .replace(/\r\n?/g, "\n")
    .replace(ZERO_WIDTH_PATTERN, "");
}

export function normalizeCanonicalText(
  text: string,
  context: CanonicalTextContext
): string {
  const normalized = normalizeBaseText(text);
  switch (context) {
    case "date":
    case "identifier":
      return normalized.replace(/\s+/g, " ").trim();
    case "prose":
    default:
      return normalized
        .replace(/[ \t\f\v]+/g, " ")
        .replace(/\s*\n\s*/g, "\n")
        .trim();
  }
}

export function normalizeHeadingPath(entries: string[]): string[] {
  return entries
    .map((entry) => normalizeCanonicalText(entry, "prose"))
    .filter(Boolean);
}

export function canonicalTextContextForNodeKind(
  kind: StructuralNode["kind"]
): CanonicalTextContext {
  switch (kind) {
    case "structured-due-date":
      return "date";
    case "structured-module":
      return "identifier";
    default:
      return "prose";
  }
}

export function semanticChannelKind(
  kind: StructuralNode["kind"]
): "text" | "date" | "module" {
  switch (kind) {
    case "structured-due-date":
      return "date";
    case "structured-module":
      return "module";
    default:
      return "text";
  }
}
