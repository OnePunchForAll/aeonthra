import { describe, expect, it } from "vitest";
import {
  BRIDGE_SOURCE,
  captureBundleId,
  createManualCaptureBundle,
  type BridgeMessage
} from "@learning/schema";
import {
  acknowledgeImportedPack,
  requestImportFromBridge,
  respondToBridgePing,
  subscribeToBridgeMessages
} from "./bridge";

type MockWindow = Window & typeof globalThis;
type MessageListener = (event: MessageEvent<BridgeMessage>) => void;

function installMockWindow() {
  let listener: MessageListener | null = null;
  const posts: Array<{ message: unknown; targetOrigin: string }> = [];

  const mockWindow = {
    location: { origin: "https://aeonthra.example.test" },
    postMessage: (message: unknown, targetOrigin: string) => {
      posts.push({ message, targetOrigin });
    },
    addEventListener: (type: string, nextListener: EventListenerOrEventListenerObject) => {
      if (type === "message" && typeof nextListener === "function") {
        listener = nextListener as MessageListener;
      }
    },
    removeEventListener: (type: string, nextListener: EventListenerOrEventListenerObject) => {
      if (type === "message" && typeof nextListener === "function" && listener === nextListener) {
        listener = null;
      }
    }
  } as unknown as MockWindow;

  (globalThis as typeof globalThis & { window: MockWindow }).window = mockWindow;

  return {
    posts,
    dispatch(event: MessageEvent<BridgeMessage>) {
      listener?.(event);
    }
  };
}

describe("web bridge helpers", () => {
  it("posts source-tagged bridge messages to the current origin", () => {
    const { posts } = installMockWindow();
    const bundle = createManualCaptureBundle({
      title: "Bridge Bundle",
      text: "The extension handoff should always carry the bridge source envelope."
    });

    requestImportFromBridge();
    acknowledgeImportedPack(bundle);
    respondToBridgePing();

    expect(posts).toEqual([
      {
        message: {
          source: BRIDGE_SOURCE,
          type: "NF_IMPORT_REQUEST"
        },
        targetOrigin: "https://aeonthra.example.test"
      },
      {
        message: {
          source: BRIDGE_SOURCE,
          type: "NF_PACK_ACK",
          packId: captureBundleId(bundle)
        },
        targetOrigin: "https://aeonthra.example.test"
      },
      {
        message: {
          source: BRIDGE_SOURCE,
          type: "NF_PONG"
        },
        targetOrigin: "https://aeonthra.example.test"
      }
    ]);
  });

  it("delivers only schema-valid same-window bridge messages to subscribers", () => {
    const { dispatch } = installMockWindow();
    const received: BridgeMessage[] = [];
    const bundle = createManualCaptureBundle({
      title: "Queued Capture",
      text: "Bridge subscribers should receive valid pack payloads intact."
    });
    const unsubscribe = subscribeToBridgeMessages((message) => {
      received.push(message);
    });

    dispatch({
      source: {} as Window,
      data: {
        source: BRIDGE_SOURCE,
        type: "NF_PING"
      }
    } as unknown as MessageEvent<BridgeMessage>);
    dispatch({
      source: window,
      data: {
        type: "NF_PING"
      }
    } as unknown as MessageEvent<BridgeMessage>);
    dispatch({
      source: window,
      data: {
        source: "other-bridge",
        type: "NF_PING"
      }
    } as unknown as MessageEvent<BridgeMessage>);
    dispatch({
      source: window,
      data: {
        source: BRIDGE_SOURCE,
        type: "NF_PACK_READY",
        pack: bundle
      }
    } as unknown as MessageEvent<BridgeMessage>);

    unsubscribe();

    dispatch({
      source: window,
      data: {
        source: BRIDGE_SOURCE,
        type: "NF_PONG"
      }
    } as unknown as MessageEvent<BridgeMessage>);

    expect(received).toEqual([
      {
        source: BRIDGE_SOURCE,
        type: "NF_PACK_READY",
        pack: bundle
      }
    ]);
  });
});
