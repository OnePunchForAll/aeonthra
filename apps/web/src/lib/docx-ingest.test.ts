import { describe, expect, it } from "vitest";
import { inferDocxSegmentsFromHtml } from "./docx-ingest";

describe("docx ingest", () => {
  it("drops common front-matter noise while keeping the chapter body", () => {
    const segments = inferDocxSegmentsFromHtml(`
      <h1>Table of Contents</h1>
      <p>Page 1</p>
      <h1>Chapter 3: Stable Signals</h1>
      <p>Copyright 2025</p>
      <p>Deterministic extraction should keep this body paragraph.</p>
      <p>Repeated junk should not survive.</p>
    `);

    expect(segments).toHaveLength(1);
    expect(segments[0]?.title).toBe("Chapter 3: Stable Signals");
    expect(segments[0]?.text).toContain("Deterministic extraction should keep this body paragraph.");
    expect(segments[0]?.text).not.toMatch(/copyright/i);
    expect(segments[0]?.text).not.toMatch(/table of contents/i);
  });
});
