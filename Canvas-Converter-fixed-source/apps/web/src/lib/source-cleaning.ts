const MOJIBAKE_REPLACEMENTS: Array<[RegExp, string]> = [
  [/â€™/g, "'"],
  [/â€˜/g, "'"],
  [/â€œ/g, "\""],
  [/â€\u009d/g, "\""],
  [/â€"/g, "\""],
  [/â€“/g, "-"],
  [/â€”/g, "-"],
  [/â€¦/g, "..."],
  [/Â/g, " "],
  [/ï¬/g, ""]
];

function suspiciousCharacterCount(text: string): number {
  const matches = text.match(/[�□�￿]/g);
  return matches ? matches.length : 0;
}

function alphaNumericCount(text: string): number {
  const matches = text.match(/[A-Za-z0-9]/g);
  return matches ? matches.length : 0;
}

function cleanSuspiciousLine(line: string): string {
  let next = line;
  for (const [pattern, replacement] of MOJIBAKE_REPLACEMENTS) {
    next = next.replace(pattern, replacement);
  }

  next = next
    .replace(/\u00ad/g, "")
    .replace(/\u200b/g, "")
    .replace(/�+/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();

  const suspicious = suspiciousCharacterCount(next);
  const alpha = alphaNumericCount(next);
  const density = next.length > 0 ? alpha / next.length : 0;

  if (suspicious >= 2 && density < 0.45) {
    return "";
  }

  return next;
}

export function sanitizeImportedText(text: string): string {
  const normalized = text
    .replace(/\r\n?/g, "\n")
    .replace(/-\n(?=[a-z])/g, "")
    .replace(/\n{4,}/g, "\n\n\n");

  const lines = normalized
    .split("\n")
    .map(cleanSuspiciousLine)
    .filter((line, index, entries) => {
      if (!line) {
        return index === 0 || entries[index - 1] !== "";
      }
      return true;
    });

  return lines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

export function sanitizeImportedTitle(title: string): string {
  return sanitizeImportedText(title)
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0) ?? "Untitled Textbook";
}
