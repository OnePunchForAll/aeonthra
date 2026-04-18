import { describe, expect, it } from "vitest";
import {
  EXPECTED_WORKER_CODE_SIGNATURE,
  buildSignalLine,
  deriveDiagnostics,
  shouldOfferRuntimeReload,
  type ExtState
} from "./popup-diagnostics";

describe("popup diagnostics", () => {
  it("flags the stale-worker contradiction and recommends a runtime reload", () => {
    const state: ExtState = {
      state: "course-detected",
      workerReachable: true,
      detectionSource: "none",
      tabId: 1930924022,
      url: "https://uagc.instructure.com/courses/123/modules",
      build: {
        version: "1.0.0",
        builtAt: "2026-04-18T07:44:30.144Z",
        sourceHash: "88532c88abcdef",
        unpackedPath: "apps/extension/dist"
      }
    };

    expect(shouldOfferRuntimeReload(state)).toBe(true);

    const diagnostics = deriveDiagnostics(state, "Could not establish connection. Receiving end does not exist.");
    expect(diagnostics.some((diagnostic) => diagnostic.label === "Build contradiction")).toBe(true);
    expect(diagnostics.some((diagnostic) => diagnostic.label === "Worker code signature")).toBe(true);

    const signalLine = buildSignalLine(state, "uagc.instructure.com");
    expect(signalLine).toContain("worker-sig missing");
    expect(signalLine).toContain("detect none");
  });

  it("does not recommend a runtime reload when the live worker matches the expected signature", () => {
    const state: ExtState = {
      state: "course-detected",
      workerReachable: true,
      detectionSource: "live-content-script",
      workerCodeSignature: EXPECTED_WORKER_CODE_SIGNATURE,
      tabId: 77,
      url: "https://canvas.example.test/courses/42/modules",
      build: {
        version: "1.0.0",
        builtAt: "2026-04-18T07:44:30.144Z",
        sourceHash: "abcdef1234567890",
        unpackedPath: "apps/extension/dist"
      }
    };

    expect(shouldOfferRuntimeReload(state)).toBe(false);

    const diagnostics = deriveDiagnostics(state, null);
    expect(
      diagnostics.some(
        (diagnostic) => diagnostic.label === "Worker code signature"
          && diagnostic.detail.includes(EXPECTED_WORKER_CODE_SIGNATURE)
      )
    ).toBe(true);
  });
});
