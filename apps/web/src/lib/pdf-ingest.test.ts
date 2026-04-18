import { describe, expect, it, vi } from "vitest";
import {
  loadPdfJsRuntime,
  normalizePdfPageText,
  openPdfDocumentWithFallback,
  type PdfExtractStatus
} from "./pdf-ingest";

describe("pdf ingest", () => {
  it("loads the bundled pdf runtime entry before extraction starts", async () => {
    const runtime = await loadPdfJsRuntime();

    expect(typeof runtime.getDocument).toBe("function");
  });

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

  it("retries document open without a worker when the worker-backed open stalls", async () => {
    const statuses: PdfExtractStatus[] = [];
    const destroyWorkerTask = vi.fn();
    const document = {
      numPages: 1,
      getPage: vi.fn()
    };
    const runtime = {
      getDocument: vi.fn()
        .mockReturnValueOnce({
          promise: new Promise(() => undefined),
          destroy: destroyWorkerTask
        })
        .mockReturnValueOnce({
          promise: Promise.resolve(document)
        })
    };

    const opened = await openPdfDocumentWithFallback(
      runtime,
      new ArrayBuffer(8),
      (status) => statuses.push(status),
      {
        workerOpenTimeoutMs: 5,
        compatibilityOpenTimeoutMs: 20
      }
    );

    expect(opened).toBe(document);
    const primaryArgs = runtime.getDocument.mock.calls[0]?.[0];
    const fallbackArgs = runtime.getDocument.mock.calls[1]?.[0];

    expect(primaryArgs).toEqual({
      data: expect.any(ArrayBuffer)
    });
    expect(fallbackArgs).toEqual({
      data: expect.any(Uint8Array),
      disableWorker: true
    });
    expect(fallbackArgs?.data).not.toBe(primaryArgs?.data);
    expect(destroyWorkerTask).toHaveBeenCalledTimes(1);
    expect(statuses).toContainEqual({
      stage: "retrying-without-worker",
      progress: 18,
      label: "Retrying PDF in compatibility mode"
    });
  });

  it("surfaces a precise error when both worker and compatibility opens fail", async () => {
    const runtime = {
      getDocument: vi.fn()
        .mockReturnValueOnce({
          promise: Promise.reject(new Error("Worker transport never initialized."))
        })
        .mockReturnValueOnce({
          promise: Promise.reject(new Error("Main-thread compatibility open also failed."))
        })
    };

    await expect(
      openPdfDocumentWithFallback(runtime, new ArrayBuffer(8), undefined, {
        workerOpenTimeoutMs: 5,
        compatibilityOpenTimeoutMs: 5
      })
    ).rejects.toThrow(
      "PDF intake stalled before text extraction could begin. AEONTHRA retried in compatibility mode, but the document still would not open."
    );
  });
});
