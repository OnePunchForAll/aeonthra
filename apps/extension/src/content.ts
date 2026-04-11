import {
  BRIDGE_SOURCE,
  BridgeMessageSchema,
  stableHash,
  type BridgeMessage,
  type CaptureItem,
  type CaptureResource
} from "@learning/schema";

type CaptureMode = "selection" | "page";

type CaptureResponse =
  | {
      ok: true;
      item: CaptureItem;
      resources: CaptureResource[];
    }
  | {
      ok: false;
      message: string;
  };

declare global {
  interface Window {
    __learningFreedomCaptureInstalled?: boolean;
  }
}

function canonicalUrl(): string {
  const url = new URL(window.location.href);
  url.hash = "";
  return url.toString();
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function toHeadingTrail(node: Element | null): string[] {
  if (!node) {
    return [document.title];
  }

  const trail = [document.title];
  const heading = node.closest("article, section, main")?.querySelector("h1, h2, h3");
  if (heading?.textContent?.trim()) {
    trail.push(heading.textContent.trim());
  }
  return Array.from(new Set(trail));
}

function getSelectionContainer(): Element | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return null;
  }
  const range = selection.getRangeAt(0);
  return range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
    ? (range.commonAncestorContainer as Element)
    : range.commonAncestorContainer.parentElement;
}

function chooseMainContent(): Element | null {
  const preferred = document.querySelector("article, main, [role='main']");
  if (preferred) {
    return preferred;
  }

  const blocks = Array.from(document.querySelectorAll("section, div"))
    .map((node) => ({
      node,
      score: normalizeWhitespace(node.textContent ?? "").length
    }))
    .filter((entry) => entry.score > 280)
    .sort((left, right) => right.score - left.score);

  return blocks[0]?.node ?? document.body;
}

function captureFromNode(node: Element, mode: CaptureMode): CaptureResponse {
  const plainText = normalizeWhitespace(node.textContent ?? "");
  if (!plainText) {
    return {
      ok: false,
      message: `No readable text was found for ${mode} capture.`
    };
  }

  const url = canonicalUrl();
  const title = normalizeWhitespace(document.title) || "Untitled page";
  const capturedAt = new Date().toISOString();
  const contentHash = stableHash(`${url}:${plainText}`);
  const itemId = stableHash(`${mode}:${url}:${contentHash}`);
  const tags = Array.from(
    new Set(
      url.includes("/assignments/")
        ? ["assignment"]
        : url.includes("/discussion")
          ? ["discussion"]
          : []
    )
  );

  const item: CaptureItem = {
    id: itemId,
    kind: mode === "selection" ? "selection" : "page",
    title,
    canonicalUrl: url,
    plainText,
    excerpt: plainText.slice(0, 240),
    html: node instanceof HTMLElement ? node.innerHTML : undefined,
    headingTrail: toHeadingTrail(node),
    tags,
    capturedAt,
    contentHash
  };

  const resources: CaptureResource[] = Array.from(node.querySelectorAll("a[href]"))
    .slice(0, 24)
    .flatMap((anchor, index) => {
      const href = anchor.getAttribute("href");
      if (!href) {
        return [];
      }
      const resolvedUrl = new URL(href, window.location.href).toString();
      return [
        {
          id: stableHash(`${item.id}:${resolvedUrl}:${index}`),
          title: normalizeWhitespace(anchor.textContent ?? "") || resolvedUrl,
          url: resolvedUrl,
          kind: "link" as const,
          sourceItemId: item.id
        }
      ];
    });

  return {
    ok: true,
    item,
    resources
  };
}

function postBridgeMessage(message: BridgeMessage): void {
  window.postMessage(message, "*");
}

async function relayBridgeMessage(message: BridgeMessage): Promise<void> {
  const response = await chrome.runtime.sendMessage({
    type: "bridge-message",
    payload: message
  }) as
    | {
        ok: true;
        relay?: BridgeMessage;
      }
    | {
        ok: false;
        message?: string;
      };

  if (!response.ok) {
    if (message.type === "NF_IMPORT_REQUEST") {
      postBridgeMessage({
        source: BRIDGE_SOURCE,
        type: "NF_IMPORT_RESULT",
        success: false,
        error: response.message ?? "Bridge request failed."
      });
    }
    return;
  }

  if (response.relay) {
    postBridgeMessage(response.relay);
  }
}

if (!window.__learningFreedomCaptureInstalled) {
  window.__learningFreedomCaptureInstalled = true;

  window.addEventListener("message", (event) => {
    if (event.source !== window) {
      return;
    }

    const parsed = BridgeMessageSchema.safeParse(event.data);
    if (!parsed.success) {
      return;
    }

    const message = parsed.data;
    if (
      message.type === "NF_IMPORT_REQUEST" ||
      message.type === "NF_PACK_ACK" ||
      message.type === "NF_PONG"
    ) {
      void relayBridgeMessage(message);
    }
  });

  chrome.runtime.onMessage.addListener((message: { type: string }, _sender, sendResponse) => {
    if (message.type === "capture-selection") {
      const selection = window.getSelection();
      const container = getSelectionContainer();
      if (!selection || selection.isCollapsed || !container) {
        sendResponse({
          ok: false,
          message: "Highlight some text first, then run selection capture."
        } satisfies CaptureResponse);
        return true;
      }

      const wrapper = document.createElement("div");
      wrapper.textContent = selection.toString();
      sendResponse(captureFromNode(wrapper, "selection"));
      return true;
    }

    if (message.type === "capture-page") {
      const node = chooseMainContent();
      if (!node) {
        sendResponse({
          ok: false,
          message: "This page did not expose a readable main content area."
        } satisfies CaptureResponse);
        return true;
      }

      sendResponse(captureFromNode(node, "page"));
      return true;
    }

    if (message.type === "bridge-request-import") {
      postBridgeMessage({
        source: BRIDGE_SOURCE,
        type: "NF_IMPORT_REQUEST"
      });
      sendResponse({ ok: true });
      return true;
    }

    if (message.type === "bridge-ping") {
      postBridgeMessage({
        source: BRIDGE_SOURCE,
        type: "NF_PING"
      });
      sendResponse({ ok: true });
      return true;
    }

    return undefined;
  });
}
