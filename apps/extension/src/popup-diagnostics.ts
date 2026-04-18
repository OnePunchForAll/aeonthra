export type DetectionSource = "live-content-script" | "url-fallback" | "none";

export const POPUP_CODE_SIGNATURE = "popup-worker-check-v3";
export const EXPECTED_WORKER_CODE_SIGNATURE = "sw-recovery-trace-v5";

export interface ExtState {
  ok?: boolean;
  state: string;
  isCanvas?: boolean;
  courseId?: string | null;
  courseName?: string;
  url?: string;
  tabId?: number | null;
  error?: string;
  workerReachable?: boolean;
  detectionSource?: DetectionSource;
  activeCourseSource?: DetectionSource;
  workerCodeSignature?: string;
  history?: Array<{ id?: string; title?: string }>;
  build?: {
    version?: string | null;
    builtAt?: string | null;
    sourceHash?: string | null;
    unpackedPath?: string | null;
  } | null;
  forensics?: {
    status?: string | null;
    finalPhaseLabel?: string | null;
    finalErrorMessage?: string | null;
  } | null;
  settings?: {
    defaultMode?: "complete" | "learning";
  };
  runtime?: {
    status?: "idle" | "starting" | "discovering" | "capturing" | "paused" | "completed" | "cancelled" | "error";
    phaseLabel?: string;
    progressPct?: number;
    currentTitle?: string;
    completedCount?: number;
    totalQueued?: number;
    failedCount?: number;
    errorMessage?: string | null;
  };
}

export type PopupDiagnostic = {
  level: "info" | "warning" | "error";
  label: string;
  detail: string;
};

export function buildSignalLine(state: ExtState | null, host: string): string {
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

export function deriveDiagnostics(state: ExtState | null, error: string | null): PopupDiagnostic[] {
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
      "Course detection came from the active tab URL, not a live Canvas receiver. This tab may still be missing the receiver AEONTHRA uses to start capture, so AEONTHRA will fall back to a fresh background capture tab."
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

export function shouldOfferRuntimeReload(state: ExtState | null): boolean {
  if (state?.workerReachable === false) {
    return false;
  }

  const detectionContradiction = state?.state === "course-detected" && state?.detectionSource === "none";
  const workerSignatureMismatch = !state?.workerCodeSignature || state.workerCodeSignature !== EXPECTED_WORKER_CODE_SIGNATURE;

  return detectionContradiction || workerSignatureMismatch;
}
