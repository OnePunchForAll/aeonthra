import { describe, expect, it } from "vitest";
import {
  createTextbookCaptureBundle,
  EMPTY_TEXTBOOK_IMPORT_MESSAGE
} from "./textbook-import";

describe("textbook import", () => {
  it("rejects empty extracted content instead of creating a fake textbook bundle", () => {
    expect(() => createTextbookCaptureBundle({
      title: "Scanned PDF",
      text: "",
      segments: [],
      format: "pdf"
    })).toThrow(EMPTY_TEXTBOOK_IMPORT_MESSAGE);
  });

  it("rejects OCR noise and front-matter fragments that do not contain meaningful textbook text", () => {
    expect(() => createTextbookCaptureBundle({
      title: "OCR Dump",
      text: [
        "TABLE OF CONTENTS",
        "Copyright 2025",
        "Page 1",
        "1 2 3 4",
        "----"
      ].join("\n"),
      segments: [],
      format: "pdf"
    })).toThrow(EMPTY_TEXTBOOK_IMPORT_MESSAGE);
  });

  it("strips front-matter noise while preserving real textbook body text", () => {
    const bundle = createTextbookCaptureBundle({
      title: "Messy Textbook",
      text: [
        "Copyright 2025",
        "Table of Contents",
        "Page 1",
        "",
        "Chapter 1: Deterministic Systems",
        "Deterministic systems preserve the same result when the same evidence is supplied.",
        "This paragraph should survive the cleanup pass."
      ].join("\n"),
      segments: [],
      format: "text"
    });

    expect(bundle.items).toHaveLength(1);
    expect(bundle.items[0]?.plainText).toContain("Deterministic systems preserve the same result");
    expect(bundle.items[0]?.plainText).not.toMatch(/table of contents/i);
    expect(bundle.items[0]?.plainText).not.toMatch(/copyright/i);
  });

  it("accepts segmented textbook content even when the top-level text field is sparse", () => {
    const bundle = createTextbookCaptureBundle({
      title: "Deterministic Reader",
      text: "",
      segments: [
        {
          title: "Chapter 1",
          text: "Deterministic systems preserve the same output when the same evidence is supplied."
        }
      ],
      format: "docx"
    });

    expect(bundle.source).toBe("manual-import");
    expect(bundle.items).toHaveLength(1);
    expect(bundle.items[0]?.plainText).toContain("Deterministic systems preserve");
  });

  it("preserves valid chapter segments after noisy extraction cleanup", () => {
    const bundle = createTextbookCaptureBundle({
      title: "Chaptered Textbook",
      text: "",
      segments: [
        {
          title: "Table of Contents",
          text: "Page 1"
        },
        {
          title: "Chapter 2: Clean Signals",
          text: [
            "Copyright 2025",
            "Chapter 2: Clean Signals",
            "Pages, headers, and repeated junk should be stripped.",
            "The actual section text should remain intact."
          ].join("\n")
        }
      ],
      format: "docx"
    });

    expect(bundle.items).toHaveLength(1);
    expect(bundle.items[0]?.title).toBe("Chaptered Textbook");
    expect(bundle.items[0]?.plainText).toContain("The actual section text should remain intact.");
    expect(bundle.items[0]?.plainText).not.toMatch(/copyright/i);
    expect(bundle.items[0]?.plainText).not.toMatch(/table of contents/i);
  });
});
