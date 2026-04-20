export function normalizeCourseIdPart(value: string | undefined): string {
  const trimmed = (value ?? "").trim();
  if (!trimmed) {
    return "";
  }

  const urlMatch = trimmed.match(/\/courses\/([^/?#]+)/i);
  if (urlMatch?.[1]) {
    return urlMatch[1].trim().toLowerCase();
  }

  const numericTailMatch = trimmed.match(/(?:^course[-:_/]?)?(\d+)$/i);
  if (numericTailMatch?.[1]) {
    return numericTailMatch[1];
  }

  return trimmed.toLowerCase().replace(/^course[-:_]?/i, "");
}

export function normalizeSourceHostPart(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase();
}
