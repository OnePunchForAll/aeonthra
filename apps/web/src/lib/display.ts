export function sanitizeDisplayText(value: string): string {
  return value
    .replace(/^Module\s+\d+\s*[-–—]\s*/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

