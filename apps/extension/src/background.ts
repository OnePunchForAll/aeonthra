import {
  BRIDGE_SOURCE,
  BridgeMessageSchema,
  CaptureBundleSchema,
  captureBundleId,
  createEmptyBundle,
  mergeCaptureBundle,
  type BridgeMessage,
  type CaptureBundle
} from "@learning/schema";

const bundleKey = "learning-freedom:capture-bundle";
const pendingBundleKey = "learning-freedom:pending-bundle";
const workspaceUrlKey = "learning-freedom:workspace-url";

type StatusResponse = {
  bundle: CaptureBundle;
  workspaceUrl: string;
  pendingPackId?: string;
};

async function readBundleForKey(
  key: string,
  fallbackTitle: string
): Promise<CaptureBundle> {
  const stored = await chrome.storage.local.get(key);
  const parsed = CaptureBundleSchema.safeParse(stored[key]);
  return parsed.success ? parsed.data : createEmptyBundle(fallbackTitle);
}

async function readBundle(): Promise<CaptureBundle> {
  return readBundleForKey(bundleKey, "Learning Freedom capture");
}

async function readPendingBundle(): Promise<CaptureBundle | null> {
  const stored = await chrome.storage.local.get(pendingBundleKey);
  const parsed = CaptureBundleSchema.safeParse(stored[pendingBundleKey]);
  return parsed.success ? parsed.data : null;
}

async function writeBundle(bundle: CaptureBundle): Promise<void> {
  await chrome.storage.local.set({ [bundleKey]: bundle });
}

async function writePendingBundle(bundle: CaptureBundle): Promise<void> {
  await chrome.storage.local.set({ [pendingBundleKey]: bundle });
}

async function clearPendingBundle(): Promise<void> {
  await chrome.storage.local.remove(pendingBundleKey);
}

async function readWorkspaceUrl(): Promise<string> {
  const stored = await chrome.storage.local.get(workspaceUrlKey);
  return (
    (stored[workspaceUrlKey] as string | undefined) ??
    "http://localhost:5173"
  );
}

async function ensureContentScript(tabId: number): Promise<void> {
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["content.js"]
  });
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function sendTabMessageWithRecovery<T>(
  tabId: number,
  payload: Record<string, unknown>
): Promise<T> {
  try {
    return await chrome.tabs.sendMessage(tabId, payload) as T;
  } catch (initialError) {
    try {
      await ensureContentScript(tabId);
      return await chrome.tabs.sendMessage(tabId, payload) as T;
    } catch (retryError) {
      throw new Error(
        [
          "This tab is not ready for capture yet.",
          "Try the capture again once the page is fully loaded.",
          `Chrome details: ${toErrorMessage(retryError || initialError)}`
        ].join(" ")
      );
    }
  }
}

async function captureActiveTab(mode: "capture-selection" | "capture-page") {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    throw new Error("No active tab is available for capture.");
  }

  const response = await sendTabMessageWithRecovery<{
    ok?: boolean;
    message?: string;
    item: CaptureBundle["items"][number];
    resources: CaptureBundle["resources"];
  }>(tab.id, { type: mode });
  if (!response?.ok) {
    throw new Error(response?.message ?? "Capture failed.");
  }

  const currentBundle = await readBundle();
  const nextBundle = mergeCaptureBundle(
    currentBundle,
    response.item,
    response.resources
  );
  await writeBundle({
    ...nextBundle,
    source: "extension-capture",
    title:
      nextBundle.title === "Learning Freedom capture"
        ? "Learning Freedom capture"
        : nextBundle.title
  });
  return nextBundle;
}

async function downloadBundle(bundle: CaptureBundle): Promise<void> {
  const dataUrl = `data:application/json;charset=utf-8,${encodeURIComponent(
    JSON.stringify(bundle, null, 2)
  )}`;
  await chrome.downloads.download({
    url: dataUrl,
    filename: `${bundle.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "learning-freedom"}.json`,
    saveAs: true
  });
}

function isSameWorkspace(targetUrl: string, tabUrl?: string): boolean {
  if (!tabUrl) {
    return false;
  }

  try {
    const target = new URL(targetUrl);
    const current = new URL(tabUrl);
    return (
      target.origin === current.origin &&
      target.pathname === current.pathname
    );
  } catch {
    return false;
  }
}

async function openOrFocusWorkspace(workspaceUrl: string): Promise<chrome.tabs.Tab> {
  const tabs = await chrome.tabs.query({});
  const existing = tabs.find((tab) => isSameWorkspace(workspaceUrl, tab.url));

  if (existing?.id) {
    if (typeof existing.windowId === "number") {
      await chrome.windows.update(existing.windowId, { focused: true });
    }

    const updated = await chrome.tabs.update(existing.id, {
      active: true,
      url: workspaceUrl
    });
    if (updated) {
      return updated;
    }
  }

  return chrome.tabs.create({ url: workspaceUrl, active: true });
}

async function waitForTabLoad(tabId: number): Promise<void> {
  const tab = await chrome.tabs.get(tabId).catch(() => null);
  if (tab?.status === "complete") {
    return;
  }

  await new Promise<void>((resolve) => {
    const timeout = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      resolve();
    }, 4000);

    const listener = (
      updatedTabId: number,
      changeInfo: chrome.tabs.TabChangeInfo
    ) => {
      if (updatedTabId === tabId && changeInfo.status === "complete") {
        clearTimeout(timeout);
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    };

    chrome.tabs.onUpdated.addListener(listener);
  });
}

async function requestWorkspaceImport(tabId: number): Promise<boolean> {
  await waitForTabLoad(tabId);

  try {
    const response = await sendTabMessageWithRecovery<{ ok?: boolean }>(tabId, {
      type: "bridge-request-import"
    });
    return Boolean(response?.ok);
  } catch {
    return false;
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    if (message.type === "get-status") {
      const pendingBundle = await readPendingBundle();
      const payload: StatusResponse = {
        bundle: await readBundle(),
        workspaceUrl: await readWorkspaceUrl(),
        pendingPackId: pendingBundle ? captureBundleId(pendingBundle) : undefined
      };
      sendResponse({ ok: true, ...payload });
      return;
    }

    if (message.type === "set-workspace-url") {
      await chrome.storage.local.set({ [workspaceUrlKey]: message.value });
      sendResponse({ ok: true });
      return;
    }

    if (message.type === "capture-selection" || message.type === "capture-page") {
      try {
        const bundle = await captureActiveTab(message.type);
        sendResponse({ ok: true, bundle });
      } catch (error) {
        sendResponse({
          ok: false,
          message: error instanceof Error ? error.message : "Capture failed."
        });
      }
      return;
    }

    if (message.type === "export-bundle") {
      try {
        const bundle = await readBundle();
        await downloadBundle(bundle);
        sendResponse({ ok: true });
      } catch (error) {
        sendResponse({
          ok: false,
          message: error instanceof Error ? error.message : "Export failed."
        });
      }
      return;
    }

    if (message.type === "clear-bundle") {
      const bundle = createEmptyBundle("Learning Freedom capture");
      await writeBundle(bundle);
      await clearPendingBundle();
      sendResponse({ ok: true, bundle });
      return;
    }

    if (message.type === "open-workspace") {
      const workspaceUrl = await readWorkspaceUrl();
      await openOrFocusWorkspace(workspaceUrl);
      sendResponse({ ok: true });
      return;
    }

    if (message.type === "done-learning") {
      const bundle = await readBundle();
      if (bundle.items.length === 0) {
        sendResponse({
          ok: false,
          message: "Capture something first so Done Learning has a real bundle to send."
        });
        return;
      }

      await writePendingBundle(bundle);
      const workspaceUrl = await readWorkspaceUrl();
      const tab = await openOrFocusWorkspace(workspaceUrl);
      const bridgeReady = tab.id ? await requestWorkspaceImport(tab.id) : false;

      sendResponse({
        ok: true,
        bridgeReady,
        queuedPackId: captureBundleId(bundle)
      });
      return;
    }

    if (message.type === "bridge-message") {
      const parsed = BridgeMessageSchema.safeParse(message.payload);
      if (!parsed.success) {
        sendResponse({ ok: false, message: "Bridge payload was invalid." });
        return;
      }

      const bridgeMessage = parsed.data;
      if (bridgeMessage.type === "NF_IMPORT_REQUEST") {
        const pendingBundle = await readPendingBundle();
        if (!pendingBundle) {
          const relay: BridgeMessage = {
            source: BRIDGE_SOURCE,
            type: "NF_IMPORT_RESULT",
            success: false,
            error: "No pending extension bundle was queued for import."
          };
          sendResponse({ ok: true, relay });
          return;
        }

        const relay: BridgeMessage = {
          source: BRIDGE_SOURCE,
          type: "NF_PACK_READY",
          pack: pendingBundle
        };
        sendResponse({ ok: true, relay });
        return;
      }

      if (bridgeMessage.type === "NF_PACK_ACK") {
        const pendingBundle = await readPendingBundle();
        if (
          pendingBundle &&
          captureBundleId(pendingBundle) === bridgeMessage.packId
        ) {
          await clearPendingBundle();
        }

        sendResponse({ ok: true });
        return;
      }

      if (bridgeMessage.type === "NF_PONG") {
        sendResponse({ ok: true });
        return;
      }

      sendResponse({ ok: true });
    }
  })();

  return true;
});
