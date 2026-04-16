import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { parseCourseContextFromUrl } from "./core/platform";
import "./styles/global.css";

interface ExtState {
  ok?: boolean;
  state: string;
  isCanvas?: boolean;
  courseId?: string | null;
  courseName?: string;
  url?: string;
  tabId?: number | null;
  error?: string;
  history?: Array<{ id?: string; title?: string }>;
}

const RETRYABLE_RUNTIME_ERRORS = [
  "message channel closed",
  "Receiving end does not exist",
  "Extension context invalidated",
  "Could not establish connection"
];

function runtimeSendMessage<T>(message: Record<string, unknown>): Promise<T> {
  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage(message, (response) => {
        const error = chrome.runtime.lastError;
        if (error) {
          reject(new Error(error.message));
          return;
        }
        resolve(response as T);
      });
    } catch (error) {
      reject(error);
    }
  });
}

function queryActiveTab(): Promise<chrome.tabs.Tab | null> {
  return new Promise((resolve, reject) => {
    try {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const error = chrome.runtime.lastError;
        if (error) {
          reject(new Error(error.message));
          return;
        }
        resolve(tabs?.[0] ?? null);
      });
    } catch (error) {
      reject(error);
    }
  });
}

function openOptionsPageSafe(): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.openOptionsPage(() => {
        const error = chrome.runtime.lastError;
        if (error) {
          reject(new Error(error.message));
          return;
        }
        resolve();
      });
    } catch (error) {
      reject(error);
    }
  });
}

function createOptionsTab(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      chrome.tabs.create({ url }, () => {
        const error = chrome.runtime.lastError;
        if (error) {
          reject(new Error(error.message));
          return;
        }
        resolve();
      });
    } catch (error) {
      reject(error);
    }
  });
}

async function detectTabFallback(): Promise<ExtState> {
  const tab = await queryActiveTab();
  const url = tab?.url || "";
  const courseName = tab?.title?.replace(/\s*-\s*Canvas.*$/i, "").trim() || "";
  const fallbackCourse = parseCourseContextFromUrl(url, courseName || "Canvas Course", {
    requireKnownCanvasHost: true
  });

  return {
    ok: true,
    state: fallbackCourse ? "course-detected" : "idle",
    isCanvas: Boolean(fallbackCourse),
    courseId: fallbackCourse?.courseId ?? null,
    courseName: fallbackCourse?.courseName ?? courseName,
    url,
    tabId: tab?.id ?? null,
    history: []
  };
}

async function sendMessageWithRetry<T>(message: Record<string, unknown>, attempts = 4): Promise<T> {
  let lastError: unknown = null;
  for (let index = 0; index < attempts; index += 1) {
    try {
      return await runtimeSendMessage<T>(message);
    } catch (error) {
      lastError = error;
      const text = error instanceof Error ? error.message : String(error ?? "");
      const shouldRetry = RETRYABLE_RUNTIME_ERRORS.some((fragment) => text.includes(fragment));
      if (!shouldRetry || index === attempts - 1) {
        throw error;
      }
      await new Promise((resolve) => window.setTimeout(resolve, 300 * (index + 1)));
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError ?? "Extension message failed"));
}

function hostnameFromUrl(url?: string): string {
  if (!url) {
    return "";
  }

  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

function Popup() {
  const [ext, setExt] = useState<ExtState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchState = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await sendMessageWithRetry<ExtState>({ type: "GET_STATE" });

      if (response?.ok !== false) {
        setExt(response ?? { state: "idle" });
      } else {
        setExt(null);
        setError(response?.error || "Extension returned an error");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err ?? "");
      try {
        const fallback = await detectTabFallback();
        setExt(fallback);
        if (fallback.state === "course-detected") {
          setError("Background worker is still waking up. Course detection is live; try Capture again in a moment.");
        } else if (RETRYABLE_RUNTIME_ERRORS.some((fragment) => message.includes(fragment))) {
          setError("Background worker is still waking up. Navigate to a Canvas course page or retry in a moment.");
        } else {
          setError(`Connection error: ${message}`);
        }
      } catch {
        if (RETRYABLE_RUNTIME_ERRORS.some((fragment) => message.includes(fragment))) {
          setError("Extension is reloading. Close this popup and reopen it.");
        } else {
          setError(`Connection error: ${message}`);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchState();
  }, []);

  const handleStart = async () => {
    setError(null);
    try {
      const response = await sendMessageWithRetry<{ ok?: boolean; error?: string; message?: string }>({ type: "START_CAPTURE", mode: "learning" }, 3);
      if (response?.ok === false) {
        setError(response.error || response.message || "Failed to start capture");
        return;
      }
      await fetchState();
    } catch {
      setError("Background worker is not ready yet. Reload the extension from chrome://extensions and try Capture again.");
    }
  };

  const handleOpenPanel = async () => {
    setError(null);
    try {
      const response = await sendMessageWithRetry<{ ok?: boolean; error?: string; message?: string }>({ type: "OPEN_PANEL" }, 2);
      if (response?.ok === false) {
        throw new Error(response.error || response.message || "Side panel not available");
      }
    } catch {
      try {
        const tab = await queryActiveTab();
        if (tab?.windowId) {
          await chrome.sidePanel?.open?.({ windowId: tab.windowId });
          return;
        }
      } catch {
        // fall through to friendly message below
      }
      setError("Side panel not available");
    }
  };

  const handleOptions = () => {
    void openOptionsPageSafe().catch(async () => {
      await createOptionsTab(chrome.runtime.getURL("options.html"));
    });
  };

  const host = hostnameFromUrl(ext?.url);

  return (
    <div
      className="popup"
      style={{
        width: "360px",
        minHeight: "300px",
        background: "#020208",
        color: "#e0e0ff",
        fontFamily: "'Sora', sans-serif",
        padding: "20px",
        boxSizing: "border-box"
      }}
    >
      <div style={{ marginBottom: "16px" }}>
        <div
          style={{
            fontFamily: "'Orbitron', sans-serif",
            fontSize: "1.2rem",
            fontWeight: 900,
            color: "#00f0ff",
            textShadow: "0 0 15px rgba(0, 240, 255, 0.4)",
            letterSpacing: "0.12em"
          }}
        >
          AEONTHRA
        </div>
        <div
          style={{
            fontFamily: "'Orbitron', sans-serif",
            fontSize: "0.55rem",
            color: "#6a6a9a",
            letterSpacing: "0.2em"
          }}
        >
          CAPTURE INTELLIGENCE
        </div>
      </div>

      {loading && (
        <div
          style={{
            padding: "16px",
            background: "rgba(0, 240, 255, 0.05)",
            borderRadius: "12px",
            border: "1px solid rgba(0, 240, 255, 0.15)",
            textAlign: "center"
          }}
        >
          Detecting Canvas course...
        </div>
      )}

      {error && !loading && (
        <div
          style={{
            padding: "16px",
            background: "rgba(255, 68, 102, 0.05)",
            borderRadius: "12px",
            border: "1px solid rgba(255, 68, 102, 0.2)",
            marginBottom: "16px"
          }}
        >
          <p style={{ fontSize: "0.8rem", color: "#b0b0d0", margin: "0 0 12px 0", lineHeight: 1.6 }}>{error}</p>
          <button
            type="button"
            onClick={() => void fetchState()}
            style={{
              background: "transparent",
              border: "1px solid rgba(0, 240, 255, 0.3)",
              color: "#00f0ff",
              padding: "8px 16px",
              borderRadius: "8px",
              cursor: "pointer",
              fontFamily: "'Orbitron', sans-serif",
              fontSize: "0.7rem",
              letterSpacing: "0.1em"
            }}
          >
            RETRY
          </button>
        </div>
      )}

      {!loading && ext?.state === "course-detected" && (
        <div>
          <div
            style={{
              padding: "16px",
              background: "rgba(0, 240, 255, 0.05)",
              borderRadius: "12px",
              border: "1px solid rgba(0, 240, 255, 0.2)",
              marginBottom: "16px"
            }}
          >
            <div
              style={{
                fontFamily: "'Orbitron', sans-serif",
                fontSize: "0.65rem",
                color: "#00f0ff",
                letterSpacing: "0.15em",
                marginBottom: "8px"
              }}
            >
              COURSE DETECTED
            </div>
            <div style={{ fontSize: "0.9rem", fontWeight: 600 }}>
              {ext.courseName || `Course ${ext.courseId ?? ""}`.trim()}
            </div>
            <div style={{ fontSize: "0.7rem", color: "#6a6a9a", marginTop: "4px" }}>
              {host}
            </div>
          </div>

          <button
            type="button"
            onClick={() => void handleStart()}
            style={{
              width: "100%",
              padding: "14px",
              background: "linear-gradient(135deg, #00f0ff, #0080ff)",
              border: "none",
              borderRadius: "10px",
              color: "#000",
              fontFamily: "'Orbitron', sans-serif",
              fontSize: "0.75rem",
              fontWeight: 700,
              letterSpacing: "0.1em",
              cursor: "pointer",
              marginBottom: "10px"
            }}
          >
            CAPTURE ENTIRE COURSE
          </button>

          <button
            type="button"
            onClick={() => void handleOpenPanel()}
            style={{
              width: "100%",
              padding: "10px",
              background: "transparent",
              border: "1px solid rgba(0, 240, 255, 0.2)",
              borderRadius: "10px",
              color: "#00f0ff",
              fontFamily: "'Orbitron', sans-serif",
              fontSize: "0.65rem",
              letterSpacing: "0.1em",
              cursor: "pointer"
            }}
          >
            OPEN SIDE PANEL
          </button>
        </div>
      )}

      {!loading && ext?.state !== "course-detected" && (
        <div
          style={{
            padding: "20px",
            textAlign: "center"
          }}
        >
          <div style={{ fontSize: "1.5rem", marginBottom: "12px" }}>AE</div>
          <p style={{ fontSize: "0.85rem", color: "#b0b0d0", lineHeight: 1.6 }}>
            Navigate to any page of a Canvas course and I&apos;ll detect it automatically.
          </p>
        </div>
      )}

      <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: "1px solid rgba(26, 26, 58, 0.3)" }}>
        <button
          type="button"
          onClick={handleOptions}
          style={{
            background: "transparent",
            border: "1px solid rgba(26, 26, 58, 0.4)",
            color: "#6a6a9a",
            padding: "8px 16px",
            borderRadius: "8px",
            cursor: "pointer",
            fontFamily: "'Orbitron', sans-serif",
            fontSize: "0.6rem",
            letterSpacing: "0.12em"
          }}
        >
          OPTIONS
        </button>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>
);
