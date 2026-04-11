import { BRIDGE_SOURCE, BridgeMessageSchema, type BridgeMessage } from "@learning/schema";

declare global {
  interface Window {
    __aeonthraBridgeInstalled?: boolean;
  }
}

function postToPage(message: BridgeMessage): void {
  window.postMessage(message, "*");
}

async function relayToExtension(message: BridgeMessage): Promise<void> {
  const response = await chrome.runtime.sendMessage({
    type: "bridge-message",
    payload: message
  }) as
    | { ok: true; relay?: BridgeMessage }
    | { ok: false; message?: string };

  if (response.ok && response.relay) {
    postToPage(response.relay);
  }

  if (!response.ok && message.type === "NF_IMPORT_REQUEST") {
    postToPage({
      source: BRIDGE_SOURCE,
      type: "NF_IMPORT_RESULT",
      success: false,
      error: response.message ?? "Extension bridge request failed."
    });
  }
}

if (!window.__aeonthraBridgeInstalled) {
  window.__aeonthraBridgeInstalled = true;

  window.addEventListener("message", (event) => {
    if (event.source !== window) {
      return;
    }

    const parsed = BridgeMessageSchema.safeParse(event.data);
    if (!parsed.success) {
      return;
    }

    const message = parsed.data;
    if (message.type === "NF_IMPORT_REQUEST" || message.type === "NF_PACK_ACK" || message.type === "NF_PONG") {
      void relayToExtension(message);
    }
  });

  chrome.runtime.onMessage.addListener((message: { type?: string }, _sender, sendResponse) => {
    if (message.type === "bridge-request-import") {
      postToPage({
        source: BRIDGE_SOURCE,
        type: "NF_IMPORT_REQUEST"
      });
      sendResponse({ ok: true });
      return true;
    }

    if (message.type === "bridge-ping") {
      postToPage({
        source: BRIDGE_SOURCE,
        type: "NF_PING"
      });
      sendResponse({ ok: true });
      return true;
    }

    return undefined;
  });
}
