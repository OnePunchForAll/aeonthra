import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { parseCourseContextFromUrl } from "./core/platform";
import {
  EXPECTED_WORKER_CODE_SIGNATURE,
  POPUP_CODE_SIGNATURE,
  shouldOfferRuntimeReload,
  type ExtState,
  type PopupDiagnostic
} from "./popup-diagnostics";
import "./styles/global.css";

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
    workerReachable: false,
    detectionSource: fallbackCourse ? "url-fallback" : "none",
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

function isCaptureActive(state: ExtState | null): boolean {
  const runtimeState = state?.runtime?.status;
  return runtimeState === "starting"
    || runtimeState === "discovering"
    || runtimeState === "capturing"
    || runtimeState === "paused";
}

function colorForDiagnostic(level: PopupDiagnostic["level"]): { border: string; label: string; detail: string } {
  if (level === "error") {
    return {
      border: "rgba(255, 92, 120, 0.28)",
      label: "#ff7a96",
      detail: "#ffd6de"
    };
  }
  if (level === "warning") {
    return {
      border: "rgba(255, 182, 72, 0.28)",
      label: "#ffbf66",
      detail: "#ffe7bf"
    };
  }
  return {
    border: "rgba(0, 240, 255, 0.2)",
    label: "#7fdfff",
    detail: "#c9f7ff"
  };
}

function buildSignalLine(state: ExtState | null, host: string): string {
  const builtAt = typeof state?.build?.builtAt === "string" ? state.build.builtAt : "";
  const shortHash = typeof state?.build?.sourceHash === "string" ? state.build.sourceHash.slice(0, 8) : "";
  const parts = [
    POPUP_CODE_SIGNATURE,
    state?.workerReachable === false ? "worker fallback" : "worker live",
    state?.workerCodeSignature ? `worker-sig ${state.workerCodeSignature}` : "worker-sig missing",
    `detect ${state?.detectionSource ?? "unknown"}`,
    host ? `host ${host}` : "",
    typeof state?.tabId === "number" ? `tab ${state.tabId}` : "tab unavailable",
    state?.build?.version ? `build ${state.build.version}` : "build unavailable",
    builtAt ? `built ${builtAt}` : "",
    shortHash ? `hash ${shortHash}` : ""
  ].filter(Boolean);

  return parts.join(" • ");
}

function deriveDiagnostics(state: ExtState | null, error: string | null): PopupDiagnostic[] {
  const diagnostics: PopupDiagnostic[] = [];
  const seen = new Set<string>();
  const runtimeStatus = state?.runtime?.status;

  const push = (level: PopupDiagnostic["level"], label: string, detail: string | null | undefined) => {
    const text = typeof detail === "string" ? detail.trim() : "";
    if (!text) {
      return;
    }
    const key = `${level}:${label}:${text}`;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    diagnostics.push({ level, label, detail: text });
  };

  if (error) {
    push("error", "Last popup error", error);
  }

  if (state?.workerReachable === false) {
    push(
      "warning",
      "Worker connection",
      "The popup had to fall back to tab-only detection because the background worker response was unavailable."
    );
  }

  if (state?.detectionSource === "url-fallback") {
    push(
      "warning",
      "Course signal",
      "Course detection came from the active tab URL, not a live Canvas receiver. This tab may still be missing the receiver AEONTHRA uses to start capture."
    );
  } else if (state?.detectionSource === "none") {
    push(
      "warning",
      "Course signal",
      "No supported Canvas course signal is proven for the active tab."
    );
  } else if (state?.detectionSource === "live-content-script") {
    push(
      "info",
      "Course signal",
      "A live Canvas receiver responded on this tab."
    );
  }

  if (state?.state === "course-detected" && state?.detectionSource === "none") {
    push(
      "error",
      "Build contradiction",
      "The popup is showing a detected course card, but the worker did not report any detection source. The loaded extension worker is likely stale or not running the current apps/extension/dist build."
    );
  }

  if (!state?.workerCodeSignature) {
    push(
      "error",
      "Worker code signature",
      `The worker did not report a code signature. Expected ${EXPECTED_WORKER_CODE_SIGNATURE}. This strongly suggests Chrome is running an older service-worker bundle.`
    );
  } else if (state.workerCodeSignature !== EXPECTED_WORKER_CODE_SIGNATURE) {
    push(
      "error",
      "Worker code signature",
      `Expected ${EXPECTED_WORKER_CODE_SIGNATURE}, but the live worker reported ${state.workerCodeSignature}. Chrome is not running the latest worker code.`
    );
  } else {
    push(
      "info",
      "Worker code signature",
      `Live worker matches expected code signature ${EXPECTED_WORKER_CODE_SIGNATURE}.`
    );
  }

  if (state?.runtime?.errorMessage) {
    push("error", "Runtime error", state.runtime.errorMessage);
  }

  if (state?.forensics?.finalErrorMessage) {
    push("warning", "Last finalized capture error", state.forensics.finalErrorMessage);
  }

  if (runtimeStatus === "starting" || runtimeStatus === "discovering" || runtimeStatus === "capturing" || runtimeStatus === "paused") {
    push(
      "info",
      "Current runtime",
      `Capture is already ${runtimeStatus}. Another start request will be rejected until it finishes or is cancelled.`
    );
  }

  if (!state?.build?.version) {
    push(
      "warning",
      "Build identity",
      "Build marker is unavailable. The loaded unpacked extension may be stale or only partially rebuilt."
    );
  } else if (state?.build?.unpackedPath) {
    push(
      "info",
      "Canonical load path",
      `Expected unpacked extension path: ${state.build.unpackedPath}`
    );
  }

  if (diagnostics.length === 0) {
    push(
      "info",
      "No proven blocker",
      "The popup can reach the worker, the active tab looks like a supported Canvas course, and no stored capture error is currently recorded."
    );
  }

  return diagnostics.slice(0, 6);
}

function Popup() {
  const [ext, setExt] = useState<ExtState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchState = async (options: { background?: boolean } = {}) => {
    const background = options.background === true;
    if (!background) {
      setLoading(true);
      setError(null);
    }

      try {
        const response = await sendMessageWithRetry<ExtState>({ type: "GET_STATE" });

        if (response?.ok !== false) {
          setExt({
            ...(response ?? { state: "idle" }),
            detectionSource: response?.detectionSource ?? response?.activeCourseSource ?? "none",
            workerReachable: true
          });
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
      if (!background) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    void fetchState();
    const timer = window.setInterval(() => {
      void fetchState({ background: true });
    }, 1200);
    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const staleWorkerDetected = shouldOfferRuntimeReload(ext);

  const handleStart = async () => {
    setError(null);
    if (shouldOfferRuntimeReload(ext)) {
      setError("The loaded worker bundle looks stale. Use RESTART EXTENSION RUNTIME below, then reopen this popup and try Capture again.");
      return;
    }
    try {
      const response = await sendMessageWithRetry<{ ok?: boolean; error?: string; message?: string }>({ type: "START_CAPTURE" }, 3);
      if (response?.ok === false) {
        setError(response.error || response.message || "Failed to start capture");
        return;
      }
      await fetchState({ background: true });
      window.close();
    } catch {
      setError("Background worker is not ready yet. Use RESTART EXTENSION RUNTIME below, then reopen this popup and try Capture again.");
    }
  };

  const handleReloadRuntime = () => {
    setError(null);
    try {
      chrome.runtime.reload();
      window.close();
    } catch (reloadError) {
      const message = reloadError instanceof Error ? reloadError.message : String(reloadError ?? "unknown error");
      setError(`Runtime reload failed: ${message}`);
    }
  };

  const handleFocusCapture = async () => {
    setError(null);
    try {
      const response = await sendMessageWithRetry<{ ok?: boolean; error?: string; message?: string }>({ type: "aeon:focus-capture-tab" }, 2);
      if (response?.ok === false) {
        setError(response.error || response.message || "Capture tab not available");
      }
    } catch {
      setError("Capture tab not available");
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
  const activeModeLabel = "COMPLETE SNAPSHOT";
  const captureActive = isCaptureActive(ext);
  const startBlocked = captureActive || staleWorkerDetected;
  const runtime = ext?.runtime;
  const safeProgress = runtime ? Math.max(0, Math.min(100, Math.round(runtime.progressPct ?? 0))) : 0;
  const diagnostics = deriveDiagnostics(ext, error);
  const signalLine = buildSignalLine(ext, host);

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
            <div style={{ fontSize: "0.64rem", color: "#8aa0d5", marginTop: "10px", letterSpacing: "0.08em" }}>
              MODE: {activeModeLabel}
            </div>
            <div style={{ fontSize: "0.6rem", color: "#6a6a9a", marginTop: "6px", lineHeight: 1.5 }}>
              Review handoff settings in Options before relying on automatic import.
            </div>
          </div>

          {captureActive && runtime ? (
            <div
              style={{
                padding: "16px",
                background: "rgba(17, 217, 181, 0.08)",
                borderRadius: "12px",
                border: "1px solid rgba(17, 217, 181, 0.22)",
                marginBottom: "16px"
              }}
            >
              <div
                style={{
                  fontFamily: "'Orbitron', sans-serif",
                  fontSize: "0.65rem",
                  color: "#11d9b5",
                  letterSpacing: "0.15em",
                  marginBottom: "8px"
                }}
              >
                LIVE CAPTURE
              </div>
              <div style={{ fontSize: "0.88rem", fontWeight: 700 }}>
                {runtime.phaseLabel || "Capture Running"}
              </div>
              <div style={{ fontSize: "0.72rem", color: "#b0b0d0", marginTop: "6px", lineHeight: 1.55 }}>
                {runtime.currentTitle || "Walking the course in the background."}
              </div>
              <div
                style={{
                  height: "8px",
                  borderRadius: "999px",
                  background: "rgba(8, 18, 34, 0.9)",
                  overflow: "hidden",
                  marginTop: "12px"
                }}
              >
                <div
                  style={{
                    width: `${safeProgress}%`,
                    height: "100%",
                    borderRadius: "999px",
                    background: "linear-gradient(90deg, #11d9b5, #00f0ff)"
                  }}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", marginTop: "10px", fontSize: "0.66rem", color: "#8aa0d5" }}>
                <span>{safeProgress}%</span>
                <span>{runtime.completedCount}/{runtime.totalQueued || "?"} captured</span>
                <span>{runtime.failedCount} failed</span>
              </div>
              <button
                type="button"
                onClick={() => void handleFocusCapture()}
                style={{
                  width: "100%",
                  marginTop: "12px",
                  padding: "10px",
                  background: "transparent",
                  border: "1px solid rgba(17, 217, 181, 0.25)",
                  borderRadius: "10px",
                  color: "#11d9b5",
                  fontFamily: "'Orbitron', sans-serif",
                  fontSize: "0.64rem",
                  letterSpacing: "0.1em",
                  cursor: "pointer"
                }}
              >
                OPEN CAPTURE TAB
              </button>
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => void handleStart()}
            disabled={startBlocked}
            style={{
              width: "100%",
              padding: "14px",
              background: startBlocked ? "rgba(26, 26, 58, 0.8)" : "linear-gradient(135deg, #00f0ff, #0080ff)",
              border: "none",
              borderRadius: "10px",
              color: startBlocked ? "#8aa0d5" : "#000",
              fontFamily: "'Orbitron', sans-serif",
              fontSize: "0.75rem",
              fontWeight: 700,
              letterSpacing: "0.1em",
              cursor: startBlocked ? "default" : "pointer",
              opacity: startBlocked ? 0.75 : 1,
              marginBottom: "10px"
            }}
          >
            {captureActive ? "CAPTURE RUNNING" : staleWorkerDetected ? "RESTART RUNTIME TO CAPTURE" : `CAPTURE ${activeModeLabel}`}
          </button>

          <div
            style={{
              padding: "12px",
              background: "rgba(255, 190, 92, 0.04)",
              borderRadius: "10px",
              border: "1px solid rgba(255, 190, 92, 0.18)",
              marginBottom: "10px"
            }}
          >
            <div
              style={{
                fontFamily: "'Orbitron', sans-serif",
                fontSize: "0.58rem",
                color: "#ffbf66",
                letterSpacing: "0.14em",
                marginBottom: "8px"
              }}
            >
              START DIAGNOSTICS
            </div>
            <div style={{ display: "grid", gap: "8px" }}>
              {diagnostics.map((diagnostic) => {
                const palette = colorForDiagnostic(diagnostic.level);
                return (
                  <div
                    key={`${diagnostic.label}:${diagnostic.detail}`}
                    style={{
                      padding: "8px 10px",
                      borderRadius: "8px",
                      border: `1px solid ${palette.border}`,
                      background: "rgba(4, 10, 18, 0.72)"
                    }}
                  >
                    <div
                      style={{
                        fontSize: "0.58rem",
                        fontFamily: "'Orbitron', sans-serif",
                        letterSpacing: "0.12em",
                        color: palette.label,
                        marginBottom: "4px"
                      }}
                    >
                      {diagnostic.label}
                    </div>
                    <div style={{ fontSize: "0.68rem", color: palette.detail, lineHeight: 1.55 }}>
                      {diagnostic.detail}
                    </div>
                  </div>
                );
              })}
            </div>
            <div
              style={{
                marginTop: "9px",
                fontSize: "0.55rem",
                color: "#7c8fb8",
                lineHeight: 1.5,
                fontFamily: "'JetBrains Mono', monospace"
              }}
            >
              {signalLine}
            </div>
          </div>

          {staleWorkerDetected ? (
            <div
              style={{
                padding: "12px",
                background: "rgba(255, 92, 120, 0.05)",
                borderRadius: "10px",
                border: "1px solid rgba(255, 92, 120, 0.2)",
                marginBottom: "10px"
              }}
            >
              <div
                style={{
                  fontFamily: "'Orbitron', sans-serif",
                  fontSize: "0.58rem",
                  color: "#ff7a96",
                  letterSpacing: "0.14em",
                  marginBottom: "8px"
                }}
              >
                RUNTIME RECOVERY
              </div>
              <div style={{ fontSize: "0.68rem", color: "#ffd6de", lineHeight: 1.55, marginBottom: "10px" }}>
                The popup can prove Chrome is still running an older background worker bundle. Restart the extension runtime so the current worker code loads, then reopen this popup and retry capture.
              </div>
              <button
                type="button"
                onClick={handleReloadRuntime}
                style={{
                  width: "100%",
                  padding: "10px",
                  background: "transparent",
                  border: "1px solid rgba(255, 122, 150, 0.3)",
                  borderRadius: "10px",
                  color: "#ff7a96",
                  fontFamily: "'Orbitron', sans-serif",
                  fontSize: "0.64rem",
                  letterSpacing: "0.1em",
                  cursor: "pointer"
                }}
              >
                RESTART EXTENSION RUNTIME
              </button>
            </div>
          ) : null}

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
            Navigate to a supported Canvas course surface and I&apos;ll detect the course automatically.
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
