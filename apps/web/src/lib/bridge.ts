import {
  BRIDGE_SOURCE,
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

export function requestImportFromBridge(): void {
  postBridgeMessage({ type: "NF_IMPORT_REQUEST" });
}

export function acknowledgeImportedPack(bundle: CaptureBundle): void {
  postBridgeMessage({
    type: "NF_PACK_ACK",
    packId: captureBundleId(bundle)
  });
}

export function respondToBridgePing(): void {
  postBridgeMessage({ type: "NF_PONG" });
}
