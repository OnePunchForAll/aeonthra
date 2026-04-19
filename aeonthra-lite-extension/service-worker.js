// Aeonthra Lite · service worker.
// Holds the capture queue (persisted in chrome.storage.local) and handles
// downloads when the user asks for a bundle export.

"use strict";

const QUEUE_KEY = "aeonthra:queue";
const MAX_QUEUE = 200;

async function readQueue() {
  const result = await chrome.storage.local.get(QUEUE_KEY);
  const queue = result[QUEUE_KEY];
  return Array.isArray(queue) ? queue : [];
}

async function writeQueue(queue) {
  const trimmed = queue.slice(-MAX_QUEUE);
  await chrome.storage.local.set({ [QUEUE_KEY]: trimmed });
  return trimmed;
}

async function pushItem(item) {
  const queue = await readQueue();
  const dedupKey = (entry) => `${entry.canonicalUrl}:${(entry.plainText || "").slice(0, 200)}`;
  const existingIndex = queue.findIndex((entry) => dedupKey(entry) === dedupKey(item));
  if (existingIndex >= 0) {
    queue[existingIndex] = { ...item, queuedAt: new Date().toISOString() };
  } else {
    queue.push({ ...item, queuedAt: new Date().toISOString() });
  }
  return writeQueue(queue);
}

async function clearQueue() {
  await chrome.storage.local.set({ [QUEUE_KEY]: [] });
  return [];
}

async function exportBundle(titleOverride) {
  const queue = await readQueue();
  const bundle = {
    schemaVersion: "0.3.0",
    source: "extension-capture",
    title: titleOverride || "Aeonthra Lite Canvas Capture",
    exportedAt: new Date().toISOString(),
    items: queue.map((entry) => ({
      id: entry.id ?? null,
      title: entry.title,
      canonicalUrl: entry.canonicalUrl,
      plainText: entry.plainText,
      headingTrail: entry.headingTrail ?? [],
      tags: entry.tags ?? [],
      kind: entry.kind ?? "canvas",
      capturedAt: entry.capturedAt ?? new Date().toISOString()
    }))
  };
  const json = JSON.stringify(bundle, null, 2);
  const dataUrl = "data:application/json;charset=utf-8," + encodeURIComponent(json);
  const filename = `aeonthra-canvas-${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}.json`;
  try {
    await chrome.downloads.download({ url: dataUrl, filename, saveAs: true });
  } catch (error) {
    // Fallback: return the data URL so the popup can create a temporary anchor.
    return { ok: true, dataUrl, filename, count: bundle.items.length };
  }
  return { ok: true, count: bundle.items.length };
}

async function sendToContentScript(tabId, message) {
  try {
    return await chrome.tabs.sendMessage(tabId, message);
  } catch (error) {
    // Content script may not be injected yet on older tabs — inject and retry.
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ["content.js"]
      });
      return await chrome.tabs.sendMessage(tabId, message);
    } catch (inner) {
      return { ok: false, message: inner instanceof Error ? inner.message : "Unable to inject content script — is the current tab a Canvas page?" };
    }
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "aeonthra:sw-capture") {
    (async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) {
        sendResponse({ ok: false, message: "No active tab." });
        return;
      }
      if (!/instructure\.com/.test(tab.url ?? "")) {
        sendResponse({ ok: false, message: "Current tab is not a Canvas page." });
        return;
      }
      const result = await sendToContentScript(tab.id, { type: "aeonthra:capture-current" });
      if (!result?.ok) { sendResponse(result); return; }
      const queue = await pushItem(result.item);
      sendResponse({ ok: true, item: result.item, queueSize: queue.length, context: result.context });
    })();
    return true;
  }

  if (message?.type === "aeonthra:sw-sweep") {
    (async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) { sendResponse({ ok: false, message: "No active tab." }); return; }
      const result = await sendToContentScript(tab.id, { type: "aeonthra:sweep-course" });
      if (!result?.ok) { sendResponse(result); return; }
      let queue = await readQueue();
      for (const item of result.items) {
        queue = await pushItem(item);
      }
      sendResponse({
        ok: true,
        added: result.items.length,
        errors: result.errors,
        queueSize: queue.length,
        diagnostics: result.diagnostics
      });
    })();
    return true;
  }

  if (message?.type === "aeonthra:sw-queue") {
    readQueue().then((queue) => sendResponse({ ok: true, queue }));
    return true;
  }

  if (message?.type === "aeonthra:sw-clear") {
    clearQueue().then(() => sendResponse({ ok: true }));
    return true;
  }

  if (message?.type === "aeonthra:sw-remove") {
    (async () => {
      const queue = await readQueue();
      const next = queue.filter((entry) => entry.canonicalUrl !== message.canonicalUrl);
      await writeQueue(next);
      sendResponse({ ok: true, queue: next });
    })();
    return true;
  }

  if (message?.type === "aeonthra:sw-export") {
    exportBundle(message.title).then(sendResponse);
    return true;
  }

  if (message?.type === "aeonthra:sweep-progress") {
    // Forward progress events to any listeners (popup is the usual one).
    chrome.runtime.sendMessage(message).catch(() => undefined);
    return false;
  }

  return false;
});
