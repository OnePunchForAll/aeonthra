"use strict";

const $ = (selector) => document.querySelector(selector);
const statusLine = $("#status-line");
const contextLine = $("#context-line");
const queueList = $("#queue-list");
const queueCount = $("#queue-count");
const btnCapture = $("#btn-capture");
const btnSweep = $("#btn-sweep");
const btnExport = $("#btn-export");
const btnClear = $("#btn-clear");
const footer = $("#footer-line");

function setStatus(text, tone) {
  statusLine.textContent = text;
  statusLine.style.color = tone === "warn" ? "var(--warn)" : tone === "good" ? "var(--good)" : "var(--text)";
}

function flashFooter(text, tone) {
  footer.textContent = text;
  footer.style.color = tone === "warn" ? "var(--warn)" : tone === "good" ? "var(--good)" : "var(--muted)";
  setTimeout(() => {
    footer.textContent = "Load the resulting .json in Aeonthra Lite → Ingest → Extension JSON.";
    footer.style.color = "var(--muted)";
  }, 3400);
}

function renderQueue(queue) {
  queueCount.textContent = String(queue.length);
  queueList.innerHTML = "";
  if (queue.length === 0) {
    const empty = document.createElement("div");
    empty.className = "queue-empty";
    empty.textContent = "No items yet. Capture a Canvas page to get started.";
    queueList.appendChild(empty);
    btnExport.disabled = true;
    return;
  }
  btnExport.disabled = false;
  for (const entry of [...queue].reverse()) {
    const li = document.createElement("li");
    const meta = document.createElement("div");
    meta.className = "meta";
    const title = document.createElement("div");
    title.className = "title";
    title.textContent = entry.title || "Untitled";
    const sub = document.createElement("div");
    sub.className = "sub";
    const kindTag = (entry.tags || []).find((tag) => tag.startsWith("kind:")) ?? "";
    const kindLabel = kindTag.replace("kind:", "").replace(/-/g, " ") || entry.kind || "page";
    const charCount = (entry.plainText || "").length;
    sub.textContent = `${kindLabel} · ${charCount.toLocaleString()} chars`;
    meta.appendChild(title);
    meta.appendChild(sub);
    const removeBtn = document.createElement("button");
    removeBtn.textContent = "✕";
    removeBtn.title = "Remove from queue";
    removeBtn.addEventListener("click", async () => {
      const response = await chrome.runtime.sendMessage({ type: "aeonthra:sw-remove", canonicalUrl: entry.canonicalUrl });
      if (response?.ok) renderQueue(response.queue);
    });
    li.appendChild(meta);
    li.appendChild(removeBtn);
    queueList.appendChild(li);
  }
}

async function refreshQueue() {
  const response = await chrome.runtime.sendMessage({ type: "aeonthra:sw-queue" });
  renderQueue(response?.queue ?? []);
}

async function describeActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) {
    setStatus("No active tab.", "warn");
    return;
  }
  const url = tab.url;
  if (!/instructure\.com/.test(url)) {
    setStatus("Not a Canvas page.", "warn");
    contextLine.textContent = new URL(url).host;
    btnCapture.disabled = true;
    btnSweep.disabled = true;
    return;
  }
  let parsed;
  try { parsed = new URL(url); } catch { parsed = null; }
  const path = parsed?.pathname ?? "";
  const kind = detectKindFromPath(path);
  setStatus(`Ready to capture (${kind}).`, "good");
  contextLine.textContent = `${parsed?.host ?? ""}${path}`;
  btnCapture.disabled = false;
  btnSweep.disabled = !/\/courses\/\d+/.test(path);
  btnSweep.title = btnSweep.disabled
    ? "Navigate to any page inside a course first."
    : "Fetch and capture every assignment, page, discussion, and quiz in this course.";
  btnSweep.textContent = /\/courses\/\d+\/modules/.test(path)
    ? "🧹 Sweep course from Modules"
    : "🧹 Sweep entire course";
}

function detectKindFromPath(path) {
  if (/\/pages\//.test(path)) return "page";
  if (/\/assignments\/syllabus/.test(path)) return "syllabus";
  if (/\/assignments\/\d+\/submissions\//.test(path)) return "submission";
  if (/\/assignments\/\d+/.test(path)) return "assignment";
  if (/\/discussion_topics\//.test(path)) return "discussion";
  if (/\/quizzes\//.test(path)) return "quiz";
  if (/\/announcements/.test(path)) return "announcement";
  if (/\/modules/.test(path)) return "modules-index";
  if (/\/courses\/\d+\/?$/.test(path)) return "course-home";
  return "generic";
}

btnCapture.addEventListener("click", async () => {
  btnCapture.disabled = true;
  setStatus("Capturing…", "good");
  const response = await chrome.runtime.sendMessage({ type: "aeonthra:sw-capture" });
  if (!response?.ok) {
    setStatus(response?.message ?? "Capture failed.", "warn");
    btnCapture.disabled = false;
    return;
  }
  const chars = (response.item?.plainText || "").length;
  setStatus(`Captured: ${response.item.title} (${chars.toLocaleString()} chars)`, "good");
  flashFooter(`Queue now has ${response.queueSize} item(s).`, "good");
  btnCapture.disabled = false;
  refreshQueue();
});

btnSweep.addEventListener("click", async () => {
  btnSweep.disabled = true;
  setStatus("Sweeping course… (this can take a minute)", "good");
  const response = await chrome.runtime.sendMessage({ type: "aeonthra:sw-sweep" });
  if (!response?.ok) {
    setStatus(response?.message ?? "Sweep failed.", "warn");
    btnSweep.disabled = false;
    return;
  }
  const errorCount = response.errors?.length ?? 0;
  const viaNote = response.diagnostics?.via === "index-fallback"
    ? ` (via Assignments/Pages/Discussions index pages)`
    : ``;
  const msg = `Swept ${response.added} item(s)${viaNote}` + (errorCount ? ` · ${errorCount} errors` : "");
  setStatus(msg, errorCount > 0 ? "warn" : "good");
  flashFooter(`Queue now has ${response.queueSize} item(s).`, "good");
  btnSweep.disabled = false;
  refreshQueue();
});

btnExport.addEventListener("click", async () => {
  btnExport.disabled = true;
  const response = await chrome.runtime.sendMessage({ type: "aeonthra:sw-export", title: "Canvas Capture" });
  if (!response?.ok) {
    setStatus(response?.message ?? "Export failed.", "warn");
    btnExport.disabled = false;
    return;
  }
  if (response.dataUrl) {
    // Fallback path (downloads API unavailable): open data URL in a new tab.
    const a = document.createElement("a");
    a.href = response.dataUrl;
    a.download = response.filename;
    a.click();
  }
  setStatus(`Exported ${response.count} item(s).`, "good");
  btnExport.disabled = false;
});

btnClear.addEventListener("click", async () => {
  if (!confirm("Clear the entire capture queue?")) return;
  const response = await chrome.runtime.sendMessage({ type: "aeonthra:sw-clear" });
  if (response?.ok) {
    renderQueue([]);
    setStatus("Queue cleared.", "good");
  }
});

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "aeonthra:sweep-progress" && message.progress) {
    const { current, total, url } = message.progress;
    setStatus(`Sweeping ${current} / ${total}…`, "good");
    contextLine.textContent = url;
  }
});

document.addEventListener("DOMContentLoaded", () => {
  describeActiveTab();
  refreshQueue();
});
