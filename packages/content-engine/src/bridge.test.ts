import { describe, expect, it } from "vitest";
import {
  BRIDGE_SOURCE,
  BridgeMessageSchema,
  captureBundleId,
  createManualCaptureBundle
} from "@learning/schema";

describe("bridge schema", () => {
  it("accepts pack-ready payloads for extension handoff", () => {
    const pack = createManualCaptureBundle({
      title: "Bridge test",
      text: "A deterministic handoff should validate before the workspace imports it."
    });

    const parsed = BridgeMessageSchema.parse({
      source: BRIDGE_SOURCE,
      type: "NF_PACK_READY",
      pack
    });

    expect(parsed.type).toBe("NF_PACK_READY");
    expect(captureBundleId(pack)).toMatch(/^h[0-9a-f]+$/);
  });

  it("rejects malformed acknowledgement payloads", () => {
    const result = BridgeMessageSchema.safeParse({
      source: BRIDGE_SOURCE,
      type: "NF_PACK_ACK"
    });

    expect(result.success).toBe(false);
  });
});
