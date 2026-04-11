type StatusPayload = {
  ok: boolean;
  bundle?: {
    items: unknown[];
    resources: unknown[];
    manifest: {
      captureKinds: string[];
    };
  };
  workspaceUrl?: string;
  pendingPackId?: string;
  queuedPackId?: string;
  bridgeReady?: boolean;
  message?: string;
};

function query<T extends HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Missing element: ${selector}`);
  }
  return element;
}

const workspaceInput = query<HTMLInputElement>("#workspace-url");
const bundleStats = query<HTMLParagraphElement>("#bundle-stats");
const statusMessage = query<HTMLParagraphElement>("#status-message");

async function sendMessage<T>(message: Record<string, unknown>): Promise<T> {
  return chrome.runtime.sendMessage(message) as Promise<T>;
}

function setStatus(value: string): void {
  statusMessage.textContent = value;
}

async function refreshStatus(): Promise<void> {
  const response = await sendMessage<StatusPayload>({ type: "get-status" });
  if (!response.ok || !response.bundle || !response.workspaceUrl) {
    setStatus(response.message ?? "Unable to load extension status.");
    return;
  }

  workspaceInput.value = response.workspaceUrl;
  bundleStats.textContent = [
    `${response.bundle.items.length} item(s)`,
    `${response.bundle.resources.length} resource(s)`,
    `capture modes: ${response.bundle.manifest.captureKinds.join(", ") || "none yet"}`,
    `pending handoff: ${response.pendingPackId ? "queued" : "none"}`
  ].join(", ");
}

async function runCapture(type: "capture-selection" | "capture-page"): Promise<void> {
  setStatus(
    type === "capture-selection"
      ? "Capturing highlighted text..."
      : "Capturing visible page..."
  );
  const response = await sendMessage<StatusPayload>({ type });
  if (!response.ok || !response.bundle) {
    setStatus(response.message ?? "Capture failed.");
    return;
  }
  setStatus(
    "Capture saved locally. Use Done Learning for direct handoff, or export JSON as a fallback."
  );
  await refreshStatus();
}

query<HTMLButtonElement>("#save-url").addEventListener("click", async () => {
  await sendMessage({ type: "set-workspace-url", value: workspaceInput.value.trim() });
  setStatus("Saved workspace URL.");
});

query<HTMLButtonElement>("#capture-selection").addEventListener("click", () => {
  void runCapture("capture-selection");
});

query<HTMLButtonElement>("#capture-page").addEventListener("click", () => {
  void runCapture("capture-page");
});

query<HTMLButtonElement>("#done-learning").addEventListener("click", async () => {
  setStatus("Opening the workspace and queueing a direct handoff...");
  const response = await sendMessage<StatusPayload>({ type: "done-learning" });
  if (!response.ok) {
    setStatus(response.message ?? "Unable to queue the handoff.");
    return;
  }

  setStatus(
    response.bridgeReady
      ? "Workspace opened and the direct handoff was queued. The app should pull it automatically."
      : "Workspace opened and the bundle was queued. If the page bridge does not pick it up, use Export JSON."
  );
  await refreshStatus();
});

query<HTMLButtonElement>("#open-workspace").addEventListener("click", async () => {
  await sendMessage({ type: "open-workspace" });
  setStatus("Opened the learning workspace without changing the current bundle.");
});

query<HTMLButtonElement>("#export-bundle").addEventListener("click", async () => {
  const response = await sendMessage<StatusPayload>({ type: "export-bundle" });
  setStatus(
    response.ok
      ? "Export started. Import the JSON into the workspace if you need the manual fallback."
      : response.message ?? "Export failed."
  );
});

query<HTMLButtonElement>("#clear-bundle").addEventListener("click", async () => {
  await sendMessage({ type: "clear-bundle" });
  setStatus("Cleared the captured bundle and any pending handoff.");
  await refreshStatus();
});

void refreshStatus().catch((error) => {
  setStatus(error instanceof Error ? error.message : "Unable to initialize popup.");
});
