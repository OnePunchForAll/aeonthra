import { describe, expect, it } from "vitest";
import {
  BRIDGE_SOURCE,
  BridgeMessageSchema,
  captureBundleId,
  createManualCaptureBundle
} from "@learning/schema";

describe("bridge schema", () => {
  it("accepts pack-ready payloads for extension handoff", () => {
    const manualPack = createManualCaptureBundle({
      title: "Bridge test",
      text: "A deterministic handoff should validate before the workspace imports it.",
      canonicalUrl: "https://canvas.example.test/courses/42/pages/bridge-test",
      kind: "page"
    });
    const pack = {
      ...manualPack,
      source: "extension-capture" as const,
      captureMeta: {
        courseId: "42",
        courseName: "Bridge test",
        sourceHost: "canvas.example.test"
      }
    };
    const packId = captureBundleId(pack);

    const parsed = BridgeMessageSchema.parse({
      source: BRIDGE_SOURCE,
      type: "NF_PACK_READY",
      requestId: "request-1",
      handoffId: "handoff-1",
      packId,
      pack
    });

    expect(parsed.type).toBe("NF_PACK_READY");
    expect(packId).toMatch(/^h[0-9a-f]+$/);
  });

  it("rejects malformed acknowledgement payloads", () => {
    const result = BridgeMessageSchema.safeParse({
      source: BRIDGE_SOURCE,
      type: "NF_PACK_ACK",
      requestId: "request-1",
      packId: "pack-1"
    });

    expect(result.success).toBe(false);
  });
});
