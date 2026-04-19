import {
  BRIDGE_SOURCE,
  stableHash,
  BridgeMessageSchema,
  captureBundleId,
  type BridgeMessage,
  type CaptureBundle
} from "@learning/schema";

type OutboundBridgeMessage = BridgeMessage | Omit<BridgeMessage, "source">;

function withSource(message: OutboundBridgeMessage): BridgeMessage {
  return ("source" in message
    ? message
    : { ...message, source: BRIDGE_SOURCE }) as BridgeMessage;
}

function createBridgeRequestId(): string {
  const seed = `${Date.now()}:${Math.random().toString(36).slice(2, 10)}`;
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : stableHash(seed);
}

export function postBridgeMessage(message: OutboundBridgeMessage): void {
  window.postMessage(withSource(message), window.location.origin);
}

export function subscribeToBridgeMessages(
  handler: (message: BridgeMessage) => void
): () => void {
  const listener = (event: MessageEvent) => {
    if (event.source !== window) {
      return;
    }

    const parsed = BridgeMessageSchema.safeParse(event.data);
    if (!parsed.success) {
      return;
    }

    handler(parsed.data);
  };

  window.addEventListener("message", listener);
  return () => window.removeEventListener("message", listener);
}

export function requestImportFromBridge(requestId = createBridgeRequestId()): string {
  postBridgeMessage({ type: "NF_IMPORT_REQUEST", requestId });
  return requestId;
}

export function acknowledgeImportedPack(input: {
  bundle: CaptureBundle;
  requestId: string;
  handoffId: string;
  packId?: string;
}): void {
  postBridgeMessage({
    type: "NF_PACK_ACK",
    requestId: input.requestId,
    handoffId: input.handoffId,
    packId: input.packId ?? captureBundleId(input.bundle)
  });
}

export function respondToBridgePing(): void {
  postBridgeMessage({ type: "NF_PONG" });
}
