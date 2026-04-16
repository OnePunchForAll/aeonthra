import { describe, expect, it } from "vitest";
import { normalizePdfPageText } from "./pdf-ingest";

describe("pdf ingest", () => {
  it("removes page markers and front-matter lines from extracted page text", () => {
    const cleaned = normalizePdfPageText([
      "Table of Contents",
      "Page 12",
      "Chapter 4: Clean Signals",
      "Deterministic extraction should keep the body paragraph.",
      "Deterministic extraction should keep the body paragraph."
    ].join("\n"));

    expect(cleaned).toContain("Chapter 4: Clean Signals");
    expect(cleaned).toContain("Deterministic extraction should keep the body paragraph.");
    expect(cleaned).not.toMatch(/table of contents/i);
    expect(cleaned).not.toMatch(/page 12/i);
  });
});
