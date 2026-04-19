import { Component, useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent, type ReactNode } from "react";
import { createDemoSourceText, type LearningBuildStage } from "@learning/content-engine";
import {
  CaptureBundleSchema,
  inspectCanvasCourseKnowledgePack,
  type BridgeMessage,
  type CanvasCourseKnowledgePackIssueCode,
  type CaptureBundle,
  type LearningBundle
} from "@learning/schema";
import { createDemoBundle, createDemoProgress } from "./lib/demo";
import { acknowledgeImportedPack, requestImportFromBridge, respondToBridgePing, subscribeToBridgeMessages } from "./lib/bridge";
import {
  clearLegacyProgress,
  clearStoredBundle,
  clearStoredNotes,
  clearStoredProgress,
  clearStoredSourceWorkspace,
  loadNotes,
  loadProgress,
  storeScopedProgress,
  storeNotes,
  loadStoredBundle,
  loadStoredSourceWorkspace,
  setActiveNoteScope,
  storeSourceWorkspace
} from "./lib/storage";
import { deriveWorkspace, type AppProgress } from "./lib/workspace";
import { getTextbookProcessor } from "./lib/textbook-processor";
import { mapToShellData } from "./lib/shell-mapper";
import { createEmptyProgress, enhanceShellData, isEmptyProgress, normalizeProgressForWorkspace } from "./lib/shell-runtime";
import { createTextbookCaptureBundle, type TextbookImportInput } from "./lib/textbook-import";
import { sanitizeImportedText, sanitizeImportedTitle } from "./lib/source-cleaning";
import {
  createOfflineSiteBundle,
  downloadOfflineReplayBundle,
  downloadOfflineSiteHtml,
  parseOfflineSiteBundle,
  restoreOfflineSiteBundle
} from "./lib/offline-site";
import {
  describeCanvasLoadState,
  describeTextbookLoadState,
  determineAppStage,
  isSameCourse,
  mergeSourceBundles,
  splitLegacyBundle,
  summarizeBundle,
  type BundleSummary
} from "./lib/source-workspace";
import {
  appendCaptureBundle,
  buildSourceReviewEntries,
  downloadCaptureBundleJson,
  downloadCaptureItemJson,
  filterCaptureBundle,
  type SourceReviewEntry
} from "./lib/source-review";
import { StudyWorkbench } from "./components/StudyWorkbench";

type ShellErrorBoundaryState = { error: Error | null };

function loadInitialSourceState(): {
  sourceState: ReturnType<typeof splitLegacyBundle>;
  usedLegacyBundle: boolean;
} {
  const storedSourceState = loadStoredSourceWorkspace();
  if (storedSourceState) {
    return {
      sourceState: storedSourceState,
      usedLegacyBundle: false
    };
  }

  const legacyBundle = loadStoredBundle();
  return {
    sourceState: splitLegacyBundle(legacyBundle),
    usedLegacyBundle: Boolean(legacyBundle)
  };
}

class ShellErrorBoundary extends Component<{ children: ReactNode }, ShellErrorBoundaryState> {
  state: ShellErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ShellErrorBoundaryState {
    return { error };
  }

  override render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: "100dvh", background: "#020308", color: "#edf2ff", display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}>
          <div style={{ maxWidth: 540, textAlign: "center" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: 16 }}>⚠</div>
            <h2 style={{ fontSize: "1.4rem", fontWeight: 800, marginBottom: 12 }}>Something went wrong</h2>
            <p style={{ color: "#8b97be", marginBottom: 24, lineHeight: 1.6 }}>{this.state.error.message}</p>
            <button
              onClick={() => this.setState({ error: null })}
              style={{ padding: "12px 28px", borderRadius: 12, background: "linear-gradient(135deg,#00f0ff,#0080ff)", color: "#000", fontWeight: 700, border: "none", cursor: "pointer" }}
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
import { Button } from "./components/primitives/Button";
import { Glow } from "./components/primitives/Glow";
import { Loader } from "./components/primitives/Loader";

type ProcessingState = {
  active: boolean;
  stage: LearningBuildStage;
  progress: number;
  hidden: boolean;
  charCount: number;
  error: string | null;
};

type UploadState = {
  kind: "pdf" | "text";
  progress: number;
  label: string;
};

type PdfIngestModule = typeof import("./lib/pdf-ingest");

const EMPTY_PROGRESS: AppProgress = createEmptyProgress();

const STAGE_LABELS: Record<LearningBuildStage, string> = {
  "normalizing-sources": "Normalizing Canvas and textbook sources",
  "segmenting-evidence": "Segmenting evidence blocks",
  "extracting-candidates": "Extracting concepts and cues",
  "ranking-instructor-focus": "Ranking instructor focus",
  "fusing-sources": "Fusing Canvas and textbook evidence",
  "crystallizing-knowledge": "Crystallizing stable concept set",
  "generating-learning-artifacts": "Generating study artifacts",
  "finalizing-bundle": "Packaging deterministic workspace"
};

const SYNTHESIS_STEPS: Array<{ stage: LearningBuildStage; label: string }> = [
  { stage: "normalizing-sources", label: "Normalize Canvas and textbook sources" },
  { stage: "segmenting-evidence", label: "Segment source evidence into sections and signals" },
  { stage: "extracting-candidates", label: "Extract concept, action, and assessment candidates" },
  { stage: "ranking-instructor-focus", label: "Rank instructor emphasis and likely assessed skills" },
  { stage: "fusing-sources", label: "Fuse assignment expectations with textbook concepts" },
  { stage: "crystallizing-knowledge", label: "Keep only the strongest evidence-backed concepts" },
  { stage: "generating-learning-artifacts", label: "Build module, concept, and retention views" },
  { stage: "finalizing-bundle", label: "Finalize the offline-ready workspace bundle" }
];

function inferTextbookTitle(content: string): string {
  const sanitized = sanitizeImportedText(content);
  const markdownHeading = sanitized.match(/^#\s+(.+)$/m)?.[1]?.trim();
  if (markdownHeading) {
    return sanitizeImportedTitle(markdownHeading);
  }
  const firstLine = sanitized
    .split(/\n+/)
    .map((line) => line.trim())
    .find((line) => line.length > 0) ?? "";
  if (firstLine.length > 0 && firstLine.length <= 100) {
    return sanitizeImportedTitle(firstLine);
  }
  return "Untitled Textbook";
}

function parseCaptureBundle(raw: string): CaptureBundle | null {
  try {
    return CaptureBundleSchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

function describeCanvasCaptureImportFailure(
  code: CanvasCourseKnowledgePackIssueCode,
  context: "file" | "bridge"
): string {
  if (context === "file") {
    switch (code) {
      case "invalid-bundle":
        return "That JSON file did not validate as a Canvas capture or saved site bundle.";
      case "wrong-source":
        return "That JSON file is valid, but it is not a Canvas extension capture. Import a SENTINEL Canvas bundle or restore a saved offline site bundle.";
      case "empty-bundle":
        return "That extension bundle is valid, but it contains zero captured Canvas items. Re-run SENTINEL on at least one readable Canvas page before importing.";
      case "textbook-only":
        return "That extension bundle only contains textbook-tagged items, so it cannot seed the Canvas workspace.";
      case "missing-course-id":
        return "That extension bundle is missing the Canvas course id required for import.";
      case "missing-source-host":
        return "That extension bundle is missing the Canvas source host required for import.";
      case "missing-course-url":
        return "That extension bundle did not preserve any Canvas page URL that resolves back to one course identity.";
      case "ambiguous-course-identity":
        return "That extension bundle does not resolve to one Canvas host and course identity, so it cannot seed the Canvas workspace.";
      case "host-mismatch":
        return "That extension bundle's recorded Canvas host does not match the captured Canvas URLs, so it was rejected.";
      case "course-identity-mismatch":
        return "That extension bundle's recorded Canvas course id does not match the captured Canvas URLs, so it was rejected.";
    }
  }

  switch (code) {
    case "invalid-bundle":
      return "Queued bridge import was malformed and could not be parsed as a capture bundle.";
    case "wrong-source":
      return "Queued bridge import was valid JSON, but its source was not an extension capture.";
    case "empty-bundle":
      return "Queued bridge import came from the extension, but it contained zero captured Canvas items.";
    case "textbook-only":
      return "Queued bridge import contained only textbook-tagged items, so it could not seed the Canvas workspace.";
    case "missing-course-id":
      return "Queued bridge import was missing the Canvas course id required for import.";
    case "missing-source-host":
      return "Queued bridge import was missing the Canvas source host required for import.";
    case "missing-course-url":
      return "Queued bridge import did not preserve any Canvas page URL that resolves back to one course identity.";
    case "ambiguous-course-identity":
      return "Queued bridge import did not resolve to one Canvas host and course identity.";
    case "host-mismatch":
      return "Queued bridge import failed because its recorded Canvas host did not match the captured Canvas URLs.";
    case "course-identity-mismatch":
      return "Queued bridge import failed because its recorded Canvas course id did not match the captured Canvas URLs.";
  }

  return "Queued bridge import failed validation.";
}

type RestoredWorkspacePayload = ReturnType<typeof restoreOfflineSiteBundle>;
type LegacyProgressMigrationState = { current: boolean };

export function mergeProgressUpdate(current: AppProgress, update: Partial<AppProgress>): AppProgress {
  return {
    conceptMastery: {
      ...current.conceptMastery,
      ...(update.conceptMastery ?? {})
    },
    chapterCompletion: {
      ...current.chapterCompletion,
      ...(update.chapterCompletion ?? {})
    },
    goalCompletion: {
      ...current.goalCompletion,
      ...(update.goalCompletion ?? {})
    },
    skillHistory: {
      ...current.skillHistory,
      ...(update.skillHistory ?? {})
    },
    practiceMode: update.practiceMode ?? current.practiceMode
  };
}

export function buildAeonthraShellInstanceKey(
  progressScope: string | null,
  shellEpoch: number
): string {
  return `${progressScope ?? "no-scope"}:${shellEpoch}`;
}

export function discardLegacyProgressMigration(state: LegacyProgressMigrationState): void {
  if (!state.current) {
    return;
  }

  clearLegacyProgress();
  state.current = false;
}

export function normalizeRestoredWorkspacePayload(restored: RestoredWorkspacePayload): RestoredWorkspacePayload {
  const workspace = deriveWorkspace(restored.mergedBundle, restored.learningBundle, restored.progress);
  const baseShellData = mapToShellData(restored.mergedBundle, restored.learningBundle, workspace);
  const shellData = enhanceShellData(baseShellData, restored.learningBundle, workspace, restored.textbookBundle);
  return {
    ...restored,
    progress: normalizeProgressForWorkspace(restored.progress, shellData, workspace)
  };
}

export type ImportedJsonResolution =
  | {
      kind: "offline-site";
      restored: RestoredWorkspacePayload;
      noteScope: string;
      status: string;
    }
  | {
      kind: "canvas-bundle";
      bundle: CaptureBundle;
      successMessage: string;
    }
  | {
      kind: "support-bundle";
      bundle: CaptureBundle;
      successMessage: string;
    }
  | {
      kind: "error";
      message: string;
    };

export function resolveImportedJsonPayload(raw: string): ImportedJsonResolution {
  const parsedOfflineSite = parseOfflineSiteBundle(raw);
  if (parsedOfflineSite) {
    const restored = restoreOfflineSiteBundle(parsedOfflineSite);
    return {
      kind: "offline-site",
      restored,
      noteScope: restored.learningBundle.synthesis.deterministicHash,
      status: `Offline site bundle restored: ${parsedOfflineSite.title}`
    };
  }

  const parsedCaptureBundle = parseCaptureBundle(raw);
  if (!parsedCaptureBundle) {
    return {
      kind: "error",
      message: "That JSON file did not validate as a Canvas capture or saved site bundle."
    };
  }

  const inspection = inspectCanvasCourseKnowledgePack(parsedCaptureBundle);
  if (!inspection.ok) {
    return {
      kind: "support-bundle",
      bundle: parsedCaptureBundle,
      successMessage: `Support source bundle imported: ${parsedCaptureBundle.title}.`
    };
  }

  return {
    kind: "canvas-bundle",
    bundle: parsedCaptureBundle,
    successMessage: `Canvas bundle imported: ${parsedCaptureBundle.title}.`
  };
}

export type BridgePackResolution =
  | {
      ok: true;
      bundle: CaptureBundle;
      successMessage: string;
    }
  | {
      ok: false;
      message: string;
    };

export function resolveBridgePackImport(pack: CaptureBundle): BridgePackResolution {
  const inspection = inspectCanvasCourseKnowledgePack(pack);
  if (!inspection.ok) {
    return {
      ok: false,
      message: describeCanvasCaptureImportFailure(inspection.code, "bridge")
    };
  }

  return {
    ok: true,
    bundle: pack,
    successMessage: `Canvas bundle imported: ${pack.title}.`
  };
}

export type BridgeRequestMode = "auto" | "manual";
export type BridgeRequestState =
  | {
      mode: BridgeRequestMode;
      requestId: string;
    }
  | null;

export type BridgeMessageAction =
  | {
      kind: "ignore";
      nextRequestState: BridgeRequestState;
    }
  | {
      kind: "pong";
      nextRequestState: BridgeRequestState;
    }
  | {
      kind: "track-request";
      nextRequestState: BridgeRequestState;
    }
  | {
      kind: "reject-pack";
      message: string;
      nextRequestState: null;
    }
  | {
      kind: "accept-pack";
      bundle: CaptureBundle;
      successMessage: string;
      ackRequestId: string;
      ackHandoffId: string;
      ackPackId: string;
      nextRequestState: null;
    }
  | {
      kind: "import-result";
      status: string | null;
      nextRequestState: null;
    };

export function resolveBridgeMessageAction(
  message: BridgeMessage,
  requestState: BridgeRequestState
): BridgeMessageAction {
  if (message.type === "NF_PING") {
    return {
      kind: "pong",
      nextRequestState: requestState
    };
  }

  if (message.type === "NF_IMPORT_REQUEST") {
    return {
      kind: "track-request",
      nextRequestState: {
        mode: requestState?.mode ?? "auto",
        requestId: message.requestId
      }
    };
  }

  if (message.type === "NF_PACK_READY") {
    if (requestState && message.requestId !== requestState.requestId) {
      return {
        kind: "ignore",
        nextRequestState: requestState
      };
    }

    const resolution = resolveBridgePackImport(message.pack);
    if (!resolution.ok) {
      return {
        kind: "reject-pack",
        message: resolution.message,
        nextRequestState: null
      };
    }

    return {
      kind: "accept-pack",
      bundle: resolution.bundle,
      successMessage: resolution.successMessage,
      ackRequestId: message.requestId,
      ackHandoffId: message.handoffId,
      ackPackId: message.packId,
      nextRequestState: null
    };
  }

  if (message.type === "NF_IMPORT_RESULT") {
    if (!requestState || message.requestId !== requestState.requestId) {
      return {
        kind: "ignore",
        nextRequestState: requestState
      };
    }

    return {
      kind: "import-result",
      status:
        !message.success && requestState?.mode === "manual"
          ? message.error ?? "No queued extension handoff was available."
          : null,
      nextRequestState: null
    };
  }

  return {
    kind: "ignore",
    nextRequestState: requestState
  };
}

export function clearPersistedWorkspaceState(scope?: string): void {
  clearStoredBundle();
  clearStoredSourceWorkspace();
  clearStoredProgress(scope);
  clearStoredNotes(scope);
  setActiveNoteScope(null);
}

function acceptedJsonFile(file: File): boolean {
  return file.name.toLowerCase().endsWith(".json") || file.type.includes("json");
}

export function describePdfIngestLoadFailure(error: unknown): string {
  const detail = error instanceof Error ? error.message : "Unknown PDF intake loader failure.";
  if (detail.includes("Failed to fetch dynamically imported module")) {
    return `PDF intake module failed to load. Restart the web dev server and retry the upload. Original loader error: ${detail}`;
  }
  return `PDF intake module failed to load. ${detail}`;
}

export async function loadPdfIngestModule(
  importer: () => Promise<PdfIngestModule> = () => import("./lib/pdf-ingest")
): Promise<PdfIngestModule> {
  try {
    return await importer();
  } catch (error) {
    throw new Error(describePdfIngestLoadFailure(error));
  }
}

function makeDemoTextbookBundle(): CaptureBundle {
  return createTextbookCaptureBundle({
    title: "AEONTHRA Demo Textbook",
    text: createDemoSourceText(),
    format: "text"
  });
}

function summaryCard(
  label: string,
  summary: BundleSummary | null,
  accent: string,
  emptyMessage: string
): ReactNode {
  return (
    <div
      style={{
        background: "rgba(9,12,22,0.94)",
        border: "1px solid rgba(120,143,199,0.18)",
        borderRadius: 24,
        boxShadow: "0 24px 64px rgba(0,0,0,0.35)",
        padding: "22px 24px"
      }}
    >
      <div
        style={{
          color: accent,
          fontSize: ".74rem",
          fontWeight: 700,
          letterSpacing: ".14em",
          fontFamily: "'Orbitron', 'Space Grotesk', sans-serif"
        }}
      >
        {label}
      </div>
      {summary ? (
        <>
          <div style={{ fontSize: "1.28rem", fontWeight: 800, marginTop: 12 }}>{summary.title}</div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 10,
              marginTop: 18
            }}
          >
            {[
              [`${summary.itemCount}`, "Items"],
              [`${summary.assignmentCount}`, "Assignments"],
              [`${summary.discussionCount}`, "Discussions"],
              [`${summary.quizCount}`, "Quizzes"],
              [`${summary.pageCount}`, "Pages"],
              [`${summary.moduleCount}`, "Modules"],
              [`${summary.documentCount}`, "Documents"]
            ].map(([value, copy]) => (
              <div
                key={copy}
                style={{
                  padding: "12px 14px",
                  borderRadius: 16,
                  background: "rgba(7,10,18,0.78)",
                  border: "1px solid rgba(120,143,199,0.18)"
                }}
              >
                <div style={{ fontSize: "1.02rem", fontWeight: 800 }}>{value}</div>
                <div style={{ color: "#8b97be", fontSize: ".78rem", marginTop: 4 }}>{copy}</div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p style={{ color: "#8b97be", lineHeight: 1.7, marginTop: 14 }}>{emptyMessage}</p>
      )}
    </div>
  );
}

function statusCard(label: string, accent: string, headline: string, detail: string): ReactNode {
  return (
    <div
      style={{
        background: "rgba(9,12,22,0.94)",
        border: "1px solid rgba(120,143,199,0.18)",
        borderRadius: 24,
        boxShadow: "0 24px 64px rgba(0,0,0,0.35)",
        padding: "22px 24px"
      }}
    >
      <div
        style={{
          color: accent,
          fontSize: ".74rem",
          fontWeight: 700,
          letterSpacing: ".14em",
          fontFamily: "'Orbitron', 'Space Grotesk', sans-serif"
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: "1.24rem", fontWeight: 800, marginTop: 12 }}>{headline}</div>
      <div style={{ color: "#8b97be", lineHeight: 1.7, marginTop: 10 }}>{detail}</div>
    </div>
  );
}

export default function App() {
  const initialSourceState = useMemo(loadInitialSourceState, []);

  const [canvasBundle, setCanvasBundle] = useState<CaptureBundle | null>(initialSourceState.sourceState.canvasBundle);
  const [textbookBundle, setTextbookBundle] = useState<CaptureBundle | null>(initialSourceState.sourceState.textbookBundle);
  const [learning, setLearning] = useState<LearningBundle | null>(null);
  const [status, setStatus] = useState("Waiting for Canvas course import.");
  const [textbookImportError, setTextbookImportError] = useState<string | null>(null);
  const [pasteTitle, setPasteTitle] = useState("");
  const [pasteUrl, setPasteUrl] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [excludedItemIds, setExcludedItemIds] = useState<string[]>([]);
  const [uploadState, setUploadState] = useState<UploadState | null>(null);
  const [progress, setProgress] = useState<AppProgress>(EMPTY_PROGRESS);
  const [processing, setProcessing] = useState<ProcessingState | null>(null);
  const [synthesisRequested, setSynthesisRequested] = useState(() => Boolean(initialSourceState.sourceState.canvasBundle && initialSourceState.sourceState.textbookBundle));
  const [demoBannerDismissed, setDemoBannerDismissed] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textbookInputRef = useRef<HTMLInputElement | null>(null);
  const bridgeRequestRef = useRef<BridgeRequestState>(null);
  const initialBridgeAttemptRef = useRef(false);
  const hydratedProgressScopeRef = useRef<string | null>(null);
  const textbookImportTokenRef = useRef(0);
  const legacyProgressMigrationRef = useRef(initialSourceState.usedLegacyBundle);

  const excludedIdSet = useMemo(() => new Set(excludedItemIds), [excludedItemIds]);

  const reviewedCanvasBundle = useMemo(
    () => filterCaptureBundle(canvasBundle, excludedIdSet),
    [canvasBundle, excludedIdSet]
  );

  const reviewedTextbookBundle = useMemo(
    () => filterCaptureBundle(textbookBundle, excludedIdSet),
    [textbookBundle, excludedIdSet]
  );

  const mergedBundle = useMemo(
    () => mergeSourceBundles(reviewedCanvasBundle, reviewedTextbookBundle),
    [reviewedCanvasBundle, reviewedTextbookBundle]
  );

  const canvasSummary = useMemo(() => summarizeBundle(canvasBundle), [canvasBundle]);
  const textbookSummary = useMemo(() => summarizeBundle(textbookBundle), [textbookBundle]);
  const canvasLoadState = useMemo(() => describeCanvasLoadState(canvasBundle), [canvasBundle]);
  const reviewEntries = useMemo<SourceReviewEntry[]>(() => buildSourceReviewEntries(mergedBundle), [mergedBundle]);
  const textbookLoadState = useMemo(
    () => describeTextbookLoadState({
      canvasBundle,
      textbookBundle,
      uploadLabel: uploadState?.label ?? null,
      importError: textbookImportError
    }),
    [canvasBundle, textbookBundle, uploadState, textbookImportError]
  );

  const appStage = determineAppStage({
    canvasBundle,
    textbookBundle,
    learningReady: Boolean(learning),
    synthesisRequested: Boolean(synthesisRequested || processing?.active)
  });

  const workspace = useMemo(
    () => (mergedBundle && learning ? deriveWorkspace(mergedBundle, learning, progress) : null),
    [mergedBundle, learning, progress]
  );

  const baseShellData = useMemo(
    () => (mergedBundle && learning && workspace ? mapToShellData(mergedBundle, learning, workspace) : null),
    [mergedBundle, learning, workspace]
  );
  const progressScope = learning?.synthesis.deterministicHash ?? null;
  const progressReady = !progressScope || hydratedProgressScopeRef.current === progressScope;
  const shellData = useMemo(
    () => (baseShellData && learning && workspace ? enhanceShellData(baseShellData, learning, workspace, textbookBundle) : null),
    [baseShellData, learning, workspace, textbookBundle]
  );

  const isDemoMode = canvasBundle?.source === "demo";

  useEffect(() => {
    if (!canvasBundle && !textbookBundle) {
      clearStoredBundle();
      clearStoredSourceWorkspace();
      return;
    }

    storeSourceWorkspace({ canvasBundle, textbookBundle });
    clearStoredBundle();
  }, [canvasBundle, textbookBundle]);

  useEffect(() => {
    if (!progressScope || !shellData || !workspace) {
      return;
    }
    if (hydratedProgressScopeRef.current === progressScope) {
      return;
    }

    const scopedProgress = normalizeProgressForWorkspace(loadProgress(progressScope), shellData, workspace);
    let restoredProgress = scopedProgress;

    if (legacyProgressMigrationRef.current) {
      const legacyProgress = normalizeProgressForWorkspace(loadProgress(), shellData, workspace);
      if (isEmptyProgress(scopedProgress) && !isEmptyProgress(legacyProgress)) {
        restoredProgress = legacyProgress;
      }
      clearLegacyProgress();
      legacyProgressMigrationRef.current = false;
    }

    hydratedProgressScopeRef.current = progressScope;
    setProgress(restoredProgress);
  }, [progressScope, shellData, workspace]);

  useEffect(() => {
    if (!progressScope || !shellData || !workspace) {
      return;
    }
    if (hydratedProgressScopeRef.current !== progressScope) {
      return;
    }

    const normalizedProgress = normalizeProgressForWorkspace(progress, shellData, workspace);
    storeScopedProgress(normalizedProgress, progressScope);
  }, [progress, progressScope, shellData, workspace]);

  useEffect(() => {
    if (!mergedBundle || !synthesisRequested) {
      if (!mergedBundle) {
        setLearning(null);
        setProcessing(null);
      }
      return;
    }

    let cancelled = false;
    const charCount = mergedBundle.items.reduce((sum, item) => sum + item.plainText.length, 0);
    setLearning(null);
    setProcessing({
      active: true,
      stage: "normalizing-sources",
      progress: 0,
      hidden: false,
      charCount,
      error: null
    });
    setStatus("Running deterministic multi-source synthesis...");

    getTextbookProcessor()
      .process(mergedBundle, (stage, progressValue) => {
        if (cancelled) {
          return;
        }
        setProcessing((current) => current ? { ...current, stage, progress: progressValue } : current);
      })
      .then((result) => {
        if (cancelled) {
          return;
        }
        setActiveNoteScope(result.synthesis.deterministicHash);
        setLearning(result);
        setProcessing((current) => current ? { ...current, active: false, progress: 100 } : current);
        setSynthesisRequested(false);
        setStatus(`Synthesis complete. ${result.synthesis.stableConceptIds.length} stable concepts are ready.`);
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        const message = error instanceof Error ? error.message : "Synthesis failed.";
        setStatus(message);
        setProcessing((current) => current ? { ...current, active: false, error: message } : current);
        setSynthesisRequested(false);
      });

    return () => {
      cancelled = true;
    };
  }, [mergedBundle, synthesisRequested]);

  useEffect(() => {
    if (!learning || !isDemoMode) {
      return;
    }
    setProgress((current) => createDemoProgress(learning, current));
  }, [isDemoMode, learning]);

  useEffect(() => {
    return subscribeToBridgeMessages((message) => {
      const action = resolveBridgeMessageAction(message, bridgeRequestRef.current);
      bridgeRequestRef.current = action.nextRequestState;

      if (action.kind === "pong") {
        respondToBridgePing();
        return;
      }

      if (action.kind === "track-request") {
        return;
      }

      if (action.kind === "reject-pack") {
        setStatus(action.message);
        return;
      }

      if (action.kind === "accept-pack") {
        applyCanvasBundle(action.bundle, action.successMessage);
        acknowledgeImportedPack({
          bundle: action.bundle,
          requestId: action.ackRequestId,
          handoffId: action.ackHandoffId,
          packId: action.ackPackId
        });
        return;
      }

      if (action.kind === "import-result" && action.status) {
        setStatus(action.status);
      }
    });
  }, [canvasBundle, textbookBundle]);

  useEffect(() => {
    if (initialBridgeAttemptRef.current) {
      return;
    }
    initialBridgeAttemptRef.current = true;
    const requestId = requestImportFromBridge();
    bridgeRequestRef.current = {
      mode: "auto",
      requestId
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash.toLowerCase();
    if (!canvasBundle && !textbookBundle && (params.get("demo") === "1" || hash.includes("demo"))) {
      loadDemoMode();
    }
  }, [canvasBundle, textbookBundle]);

  const applyCanvasBundle = (nextBundle: CaptureBundle, successMessage: string) => {
    const keepTextbook = textbookBundle && isSameCourse(canvasBundle, nextBundle) ? textbookBundle : textbookBundle;

    textbookImportTokenRef.current += 1;
    discardLegacyProgressMigration(legacyProgressMigrationRef);
    setActiveNoteScope(null);
    setCanvasBundle(nextBundle);
    setTextbookBundle(keepTextbook);
    setLearning(null);
    setProcessing(null);
    setTextbookImportError(null);
    setSynthesisRequested(false);
    setDemoBannerDismissed(false);
    hydratedProgressScopeRef.current = null;
    setExcludedItemIds([]);

    if (!isSameCourse(canvasBundle, nextBundle)) {
      setProgress(EMPTY_PROGRESS);
    }

    setStatus(`${successMessage} Support sources ${keepTextbook ? "preserved" : "optional"}. Review the captured pages, remove noise, and synthesize when ready.`);
  };

  const applySupportBundle = (nextBundle: CaptureBundle, successMessage: string) => {
    setTextbookBundle((current) => appendCaptureBundle(current, nextBundle));
    setLearning(null);
    setProcessing(null);
    setTextbookImportError(null);
    setSynthesisRequested(false);
    setStatus(successMessage);
    setPasteTitle("");
    setPasteUrl("");
    setPasteText("");
  };

  const loadDemoMode = () => {
    textbookImportTokenRef.current += 1;
    discardLegacyProgressMigration(legacyProgressMigrationRef);
    setActiveNoteScope(null);
    setCanvasBundle(createDemoBundle());
    setTextbookBundle(makeDemoTextbookBundle());
    setLearning(null);
    setProcessing(null);
    setTextbookImportError(null);
    setProgress(EMPTY_PROGRESS);
    setSynthesisRequested(true);
    setDemoBannerDismissed(false);
    hydratedProgressScopeRef.current = null;
    setStatus("Demo workspace loaded. Running deterministic synthesis...");
  };

  const importJsonPayload = (raw: string) => {
    const resolution = resolveImportedJsonPayload(raw);

    if (resolution.kind === "offline-site") {
      const restored = normalizeRestoredWorkspacePayload(resolution.restored);
      textbookImportTokenRef.current += 1;
      discardLegacyProgressMigration(legacyProgressMigrationRef);
      setActiveNoteScope(resolution.noteScope);
      storeNotes(restored.notes, resolution.noteScope);
      setCanvasBundle(restored.canvasBundle);
      setTextbookBundle(restored.textbookBundle);
      setLearning(restored.learningBundle);
      setProgress(restored.progress);
      setProcessing(null);
      setTextbookImportError(null);
      setSynthesisRequested(false);
      setDemoBannerDismissed(false);
      hydratedProgressScopeRef.current = resolution.noteScope;
      setStatus(resolution.status);
      return;
    }

    if (resolution.kind === "error") {
      setStatus(resolution.message);
      return;
    }

    if (resolution.kind === "support-bundle") {
      applySupportBundle(resolution.bundle, resolution.successMessage);
      return;
    }

    applyCanvasBundle(resolution.bundle, resolution.successMessage);
  };

  const importBundleFromFile = async (file: File) => {
    if (!acceptedJsonFile(file)) {
      setStatus("Choose a source JSON bundle or a saved site bundle.");
      return;
    }
    importJsonPayload(await file.text());
  };

  const applyTextbookImport = (input: TextbookImportInput, successMessage: string) => {
    try {
      const bundle = createTextbookCaptureBundle(input);
      applySupportBundle(bundle, successMessage);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Support source import failed.";
      setTextbookImportError(message);
      setStatus(message);
    }
  };

  const handleTextbookFile = async (file: File) => {
    const importToken = ++textbookImportTokenRef.current;
    const lower = file.name.toLowerCase();
    setTextbookImportError(null);
    if (file.type === "application/pdf" || lower.endsWith(".pdf")) {
      setUploadState({ kind: "pdf", progress: 2, label: "Loading PDF intake module" });
      const { extractTextFromPdf } = await loadPdfIngestModule();
      const extracted = await extractTextFromPdf(
        file,
        (page, total) => {
          if (importToken !== textbookImportTokenRef.current) {
            return;
          }
          setUploadState({
            kind: "pdf",
            progress: total > 0 ? 24 + (page / total) * 76 : 24,
            label: `Extracting page ${page} of ${total}`
          });
        },
        (status) => {
          if (importToken !== textbookImportTokenRef.current) {
            return;
          }
          setUploadState({
            kind: "pdf",
            progress: status.progress,
            label: status.label
          });
        }
      );
      if (importToken !== textbookImportTokenRef.current) {
        setUploadState(null);
        return;
      }
      applyTextbookImport(
        {
          title: extracted.title,
          text: extracted.text,
          segments: extracted.chapters.map((chapter, index) => ({
            title: chapter.title,
            text: chapter.text,
            tags: [
              `segment-index:${index + 1}`,
              `page-range:${chapter.startPage}-${chapter.endPage}`
            ]
          })),
          format: "pdf"
        },
        `Textbook imported: ${extracted.title}. Deterministic synthesis is ready to begin.`
      );
      setUploadState(null);
      return;
    }

    if (
      file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      || lower.endsWith(".docx")
    ) {
      setUploadState({ kind: "text", progress: 20, label: "Extracting DOCX" });
      const { extractTextFromDocx } = await import("./lib/docx-ingest");
      const extracted = await extractTextFromDocx(file);
      if (importToken !== textbookImportTokenRef.current) {
        setUploadState(null);
        return;
      }
      setUploadState({ kind: "text", progress: 80, label: "Preparing textbook sections" });
      applyTextbookImport(
        {
          title: extracted.title,
          text: extracted.text,
          segments: extracted.segments,
          format: "docx"
        },
        `Textbook imported: ${extracted.title}. Deterministic synthesis is ready to begin.`
      );
      setUploadState(null);
      return;
    }

    if (lower.endsWith(".txt") || lower.endsWith(".text") || lower.endsWith(".md") || file.type.startsWith("text/")) {
      setUploadState({ kind: "text", progress: 50, label: "Reading text file" });
      const text = await file.text();
      if (importToken !== textbookImportTokenRef.current) {
        setUploadState(null);
        return;
      }
      const inferredTitle = inferTextbookTitle(text);
      applyTextbookImport(
        {
          title: inferredTitle,
          text,
          format: "text"
        },
        `Textbook imported: ${inferredTitle}. Deterministic synthesis is ready to begin.`
      );
      setUploadState(null);
      return;
    }

    setStatus("Choose a PDF, DOCX, TXT, TEXT, MD, or saved JSON bundle.");
    setTextbookImportError("Choose a PDF, DOCX, TXT, TEXT, MD, or saved JSON bundle.");
  };

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    try {
      await importBundleFromFile(file);
    } finally {
      event.target.value = "";
    }
  };

  const handleTextbookUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    try {
      await handleTextbookFile(file);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Textbook import failed.";
      setTextbookImportError(message);
      setStatus(message);
      setUploadState(null);
    } finally {
      event.target.value = "";
    }
  };

  const handleDrop = async (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (!file) {
      return;
    }

    const isJsonImport = acceptedJsonFile(file);
    try {
      if (isJsonImport) {
        await importBundleFromFile(file);
      } else {
        await handleTextbookFile(file);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Import failed.";
      if (!isJsonImport) {
        setTextbookImportError(message);
      }
      setStatus(message);
      setUploadState(null);
    }
  };

  const handlePasteImport = () => {
    if (!pasteText.trim()) {
      setStatus("Paste source text first.");
      return;
    }
    const title = pasteTitle.trim() || inferTextbookTitle(pasteText);
    applyTextbookImport(
      {
        title,
        text: pasteText,
        format: "paste",
        canonicalUrl: pasteUrl.trim() || undefined
      },
      `Support source imported: ${title}. Deterministic synthesis is ready when you are.`
    );
  };

  const beginSynthesis = () => {
    if (!mergedBundle || mergedBundle.items.length === 0) {
      setStatus("Import at least one source and keep at least one page included before synthesis.");
      return;
    }
    setLearning(null);
    setProcessing(null);
    setSynthesisRequested(true);
    setStatus("Preparing deterministic synthesis...");
  };

  const resetWorkspace = () => {
    textbookImportTokenRef.current += 1;
    discardLegacyProgressMigration(legacyProgressMigrationRef);
    clearPersistedWorkspaceState(progressScope ?? undefined);
    setCanvasBundle(null);
    setTextbookBundle(null);
    setLearning(null);
    setProcessing(null);
    setTextbookImportError(null);
    setSynthesisRequested(false);
    setProgress(EMPTY_PROGRESS);
    setUploadState(null);
    setExcludedItemIds([]);
    setStatus("Workspace reset. Waiting for a Canvas bundle, support sources, or a manual page JSON import.");
    setDemoBannerDismissed(false);
    hydratedProgressScopeRef.current = null;
  };

  const downloadOfflineSite = () => {
    if (!canvasBundle || !textbookBundle || !mergedBundle || !learning) {
      setStatus("Canvas, textbook, and synthesized workspace are required before export.");
      return;
    }
    const offlineBundle = createOfflineSiteBundle({
      canvasBundle,
      textbookBundle,
      mergedBundle,
      learningBundle: learning,
      progress,
      notes: loadNotes(progressScope ?? undefined)
    });
    downloadOfflineSiteHtml(offlineBundle);
    setStatus(`Offline site downloaded: ${offlineBundle.title}`);
  };

  const downloadReplayBundle = () => {
    if (!canvasBundle || !textbookBundle || !mergedBundle || !learning) {
      setStatus("Canvas, textbook, and synthesized workspace are required before export.");
      return;
    }
    const offlineBundle = createOfflineSiteBundle({
      canvasBundle,
      textbookBundle,
      mergedBundle,
      learningBundle: learning,
      progress,
      notes: loadNotes(progressScope ?? undefined)
    });
    downloadOfflineReplayBundle(offlineBundle);
    setStatus(`Replay bundle saved: ${offlineBundle.title}`);
  };

  const renderIntake = () => {
    const textbookStepTitle = textbookLoadState.state === "failed"
      ? "Textbook intake failed"
      : uploadState
        ? "Preparing the textbook"
        : "Provide the textbook";
    const textbookStepCopy = textbookLoadState.state === "failed"
      ? "Canvas course data remains loaded. Fix the textbook import issue and retry."
      : uploadState
        ? "Canvas course data is already loaded. AEONTHRA is preparing the textbook source."
        : "Canvas course data is already loaded. Add the textbook source to continue.";
    const frameStyle = {
      minHeight: "100dvh",
      background:
        "radial-gradient(circle at 12% 18%, rgba(0,240,255,0.14), transparent 24%), radial-gradient(circle at 88% 22%, rgba(17,217,181,0.12), transparent 26%), linear-gradient(180deg, #020308 0%, #050814 34%, #05060d 100%)",
      color: "#edf2ff",
      padding: "32px 28px 40px",
      boxSizing: "border-box" as const
    };

    const cardStyle = {
      background: "rgba(9,12,22,0.94)",
      border: "1px solid rgba(120,143,199,0.18)",
      borderRadius: 26,
      boxShadow: "0 24px 64px rgba(0,0,0,0.35)",
      padding: "24px 26px"
    };

    const renderInputs = (
      <>
        <input hidden ref={fileInputRef} type="file" accept=".json,application/json" onChange={handleImportFile} />
        <input hidden ref={textbookInputRef} type="file" accept=".pdf,.docx,.txt,.text,.md" onChange={handleTextbookUpload} />
      </>
    );

    const reviewCounts = {
      keep: reviewEntries.filter((entry) => entry.verdict === "keep").length,
      review: reviewEntries.filter((entry) => entry.verdict === "review").length,
      reject: reviewEntries.filter((entry) => entry.verdict === "reject").length
    };

    const sortedReviewEntries = [...reviewEntries].sort((left, right) => {
      const order = { reject: 0, review: 1, keep: 2 } as const;
      return order[left.verdict] - order[right.verdict];
    });

    const verdictAccent = (verdict: SourceReviewEntry["verdict"]): string => {
      if (verdict === "reject") return "#ff7a96";
      if (verdict === "review") return "#ffcf73";
      return "#11d9b5";
    };

    const toggleExcludedItem = (itemId: string) => {
      setExcludedItemIds((current) => current.includes(itemId)
        ? current.filter((entry) => entry !== itemId)
        : [...current, itemId]);
    };

    return (
      <div onDrop={handleDrop} onDragOver={(event) => event.preventDefault()} style={frameStyle}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div style={{ maxWidth: 860, margin: "0 auto", textAlign: "center", paddingTop: 18 }}>
            <Glow>AEONTHRA</Glow>
            <div
              style={{
                fontFamily: "'Orbitron', 'Space Grotesk', sans-serif",
                fontSize: "clamp(2.8rem, 6vw, 5.6rem)",
                fontWeight: 800,
                letterSpacing: ".05em",
                color: "#eef1ff",
                marginTop: 18
              }}
            >
              IMPORT. FUSE. MASTER.
            </div>
          </div>

          {appStage === "canvas-required" ? (
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.05fr) minmax(320px, 0.95fr)", gap: 22, marginTop: 28 }}>
              <div style={cardStyle}>
                <div style={{ color: "#00f0ff", fontSize: ".74rem", fontWeight: 700, letterSpacing: ".14em", fontFamily: "'Orbitron', 'Space Grotesk', sans-serif" }}>
                  STEP 1 OF 3
                </div>
                <div style={{ fontSize: "1.55rem", fontWeight: 800, marginTop: 10 }}>Load source content</div>
                <div style={{ color: "#8b97be", lineHeight: 1.7, marginTop: 12 }}>
                  Start from anything you already have: a Canvas/SENTINEL bundle, a manual page JSON, a PDF/DOCX/TXT support file, or pasted page/source text.
                </div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 18 }}>
                  <Button onClick={() => fileInputRef.current?.click()}>CHOOSE SOURCE JSON</Button>
                  <Button variant="teal" onClick={() => textbookInputRef.current?.click()} disabled={uploadState !== null}>CHOOSE PDF, DOCX, OR TXT</Button>
                  <Button variant="ghost" onClick={handlePasteImport} disabled={!pasteText.trim() || uploadState !== null}>LOAD PASTED SOURCE</Button>
                  <Button variant="ghost" onClick={loadDemoMode}>TRY DEMO</Button>
                </div>
                {uploadState ? (
                  <div style={{ marginTop: 18, padding: "16px 18px", borderRadius: 18, background: "rgba(7,10,18,0.78)", border: "1px solid rgba(120,143,199,0.18)" }}>
                    <div style={{ color: "#8b97be" }}>{uploadState.label}</div>
                    <div style={{ height: 8, borderRadius: 999, background: "#141a2c", overflow: "hidden", marginTop: 12 }}>
                      <div style={{ width: `${Math.max(uploadState.progress, 6)}%`, height: "100%", borderRadius: 999, background: "linear-gradient(90deg, #11d9b5, #00f0ff)" }} />
                    </div>
                    <div style={{ color: "#8b97be", marginTop: 10 }}>{Math.round(uploadState.progress)}%</div>
                  </div>
                ) : null}
                <div style={{ display: "grid", gap: 12, marginTop: 18 }}>
                  <input
                    value={pasteTitle}
                    onChange={(event) => setPasteTitle(event.target.value)}
                    placeholder="Source title (optional)"
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "14px 16px",
                      borderRadius: 16,
                      border: "1px solid rgba(120,143,199,0.18)",
                      background: "rgba(7,10,18,0.78)",
                      color: "#edf2ff",
                      fontSize: "1rem"
                    }}
                  />
                  <input
                    value={pasteUrl}
                    onChange={(event) => setPasteUrl(event.target.value)}
                    placeholder="Canonical source URL (optional, useful for webpage notes)"
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "14px 16px",
                      borderRadius: 16,
                      border: "1px solid rgba(120,143,199,0.18)",
                      background: "rgba(7,10,18,0.78)",
                      color: "#edf2ff",
                      fontSize: "1rem"
                    }}
                  />
                  <textarea
                    value={pasteText}
                    onChange={(event) => setPasteText(event.target.value)}
                    placeholder="Paste a page, textbook excerpt, discussion prompt, article, or notes here..."
                    style={{
                      width: "100%",
                      minHeight: 220,
                      boxSizing: "border-box",
                      padding: "16px 18px",
                      borderRadius: 18,
                      border: "1px solid rgba(120,143,199,0.18)",
                      background: "rgba(7,10,18,0.78)",
                      color: "#edf2ff",
                      fontSize: "1rem",
                      lineHeight: 1.7,
                      resize: "vertical"
                    }}
                  />
                  {pasteText.trim() ? (
                    <div style={{ color: "#8b97be" }}>
                      Ready to import as: {pasteTitle.trim() || inferTextbookTitle(pasteText)}
                      {pasteUrl.trim() ? ` · ${pasteUrl.trim()}` : ""}
                    </div>
                  ) : null}
                </div>
                <button
                  onClick={() => {
                    const requestId = requestImportFromBridge();
                    bridgeRequestRef.current = {
                      mode: "manual",
                      requestId
                    };
                    setStatus("Checking extension handoff...");
                  }}
                  style={{
                    marginTop: 14,
                    padding: 0,
                    background: "transparent",
                    border: "none",
                    color: "#8b97be",
                    fontSize: ".84rem",
                    cursor: "pointer",
                    textDecoration: "underline",
                    textUnderlineOffset: 4
                  }}
                >
                  Use SENTINEL extension instead
                </button>
                {status !== "Waiting for a Canvas bundle, support source, or manual page JSON import." ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#8b97be", minHeight: 28, marginTop: 16 }}>
                    {status.toLowerCase().includes("checking") ? <Loader /> : null}
                    <span>{status}</span>
                  </div>
                ) : null}
              </div>
              <div style={{ display: "grid", gap: 18 }}>
                {statusCard("Source Status", "#00f0ff", canvasLoadState.headline, canvasLoadState.detail)}
                {summaryCard("Imported Bundle Summary", mergedBundle ? summarizeBundle(mergedBundle) : null, "#11d9b5", "No source content has been loaded yet.")}
                {statusCard("Support Source Status", "#11d9b5", textbookLoadState.headline, textbookLoadState.detail)}
              </div>
              {renderInputs}
            </div>
          ) : null}

          {appStage === "textbook-required" ? (
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.05fr) minmax(320px, 0.95fr)", gap: 22, marginTop: 28 }}>
              <div style={cardStyle}>
                <div style={{ color: "#11d9b5", fontSize: ".74rem", fontWeight: 700, letterSpacing: ".14em", fontFamily: "'Orbitron', 'Space Grotesk', sans-serif" }}>
                  STEP 2 OF 3
                </div>
                <div style={{ fontSize: "1.55rem", fontWeight: 800, marginTop: 10 }}>{textbookStepTitle}</div>
                <div style={{ color: "#8b97be", lineHeight: 1.7, marginTop: 12 }}>{textbookStepCopy}</div>
                {uploadState ? (
                  <div style={{ marginTop: 18, padding: "16px 18px", borderRadius: 18, background: "rgba(7,10,18,0.78)", border: "1px solid rgba(120,143,199,0.18)" }}>
                    <div style={{ color: "#8b97be" }}>{uploadState.label}</div>
                    <div style={{ height: 8, borderRadius: 999, background: "#141a2c", overflow: "hidden", marginTop: 12 }}>
                      <div style={{ width: `${Math.max(uploadState.progress, 6)}%`, height: "100%", borderRadius: 999, background: "linear-gradient(90deg, #11d9b5, #00f0ff)" }} />
                    </div>
                    <div style={{ color: "#8b97be", marginTop: 10 }}>{Math.round(uploadState.progress)}%</div>
                  </div>
                ) : null}
                <div style={{ display: "grid", gap: 12, marginTop: 18 }}>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <Button variant="teal" onClick={() => textbookInputRef.current?.click()} disabled={uploadState !== null}>Choose PDF, DOCX, or Text</Button>
                    <Button variant="ghost" onClick={handlePasteImport} disabled={!pasteText.trim() || uploadState !== null}>Load Pasted Textbook</Button>
                  </div>
                  <input
                    value={pasteTitle}
                    onChange={(event) => setPasteTitle(event.target.value)}
                    placeholder="Textbook title (optional)"
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "14px 16px",
                      borderRadius: 16,
                      border: "1px solid rgba(120,143,199,0.18)",
                      background: "rgba(7,10,18,0.78)",
                      color: "#edf2ff",
                      fontSize: "1rem"
                    }}
                  />
                  <textarea
                    value={pasteText}
                    onChange={(event) => setPasteText(event.target.value)}
                    placeholder="Paste textbook text here..."
                    style={{
                      width: "100%",
                      minHeight: 220,
                      boxSizing: "border-box",
                      padding: "16px 18px",
                      borderRadius: 18,
                      border: "1px solid rgba(120,143,199,0.18)",
                      background: "rgba(7,10,18,0.78)",
                      color: "#edf2ff",
                      fontSize: "1rem",
                      lineHeight: 1.7,
                      resize: "vertical"
                    }}
                  />
                  {pasteText.trim() ? (
                    <div style={{ color: "#8b97be" }}>Detected title: {pasteTitle.trim() || inferTextbookTitle(pasteText)}</div>
                  ) : null}
                </div>
              </div>
              <div style={{ display: "grid", gap: 18 }}>
                {statusCard("Canvas Status", "#00f0ff", canvasLoadState.headline, canvasLoadState.detail)}
                {summaryCard("Canvas Course Summary", canvasSummary, "#00f0ff", "No Canvas course data has been loaded yet.")}
                {statusCard("Textbook Status", "#11d9b5", textbookLoadState.headline, textbookLoadState.detail)}
              </div>
              {renderInputs}
            </div>
          ) : null}

          {appStage === "synthesis-ready" ? (
            <div style={{ display: "grid", gap: 22, marginTop: 28 }}>
              <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.05fr) minmax(320px, 0.95fr)", gap: 22 }}>
                <div style={cardStyle}>
                  <div style={{ color: "#f8d24a", fontSize: ".74rem", fontWeight: 700, letterSpacing: ".14em", fontFamily: "'Orbitron', 'Space Grotesk', sans-serif" }}>
                    STEP 3 OF 3
                  </div>
                  <div style={{ fontSize: "1.55rem", fontWeight: 800, marginTop: 10 }}>Review, clean, and generate the study workspace</div>
                  <div style={{ display: "grid", gap: 12, marginTop: 18 }}>
                    <div style={{ padding: "16px 18px", borderRadius: 18, background: "rgba(7,10,18,0.78)", border: "1px solid rgba(120,143,199,0.18)", color: "#8b97be", lineHeight: 1.7 }}>
                      {status}
                    </div>
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                      <Button onClick={beginSynthesis} disabled={!mergedBundle || mergedBundle.items.length === 0 || Boolean(uploadState)}>Begin Synthesis</Button>
                      <Button variant="teal" onClick={() => textbookInputRef.current?.click()} disabled={uploadState !== null}>Add PDF, DOCX, or TXT</Button>
                      <Button variant="ghost" onClick={() => fileInputRef.current?.click()}>Import JSON</Button>
                      <Button variant="ghost" onClick={handlePasteImport} disabled={!pasteText.trim() || uploadState !== null}>Load Pasted Source</Button>
                      <Button variant="ghost" onClick={() => mergedBundle ? downloadCaptureBundleJson(mergedBundle, `${mergedBundle.title}-cleaned`) : null} disabled={!mergedBundle}>Export cleaned bundle</Button>
                      <Button variant="ghost" onClick={resetWorkspace}>Reset Workspace</Button>
                    </div>
                    {uploadState ? (
                      <div style={{ padding: "16px 18px", borderRadius: 18, background: "rgba(7,10,18,0.78)", border: "1px solid rgba(120,143,199,0.18)" }}>
                        <div style={{ color: "#8b97be" }}>{uploadState.label}</div>
                        <div style={{ height: 8, borderRadius: 999, background: "#141a2c", overflow: "hidden", marginTop: 12 }}>
                          <div style={{ width: `${Math.max(uploadState.progress, 6)}%`, height: "100%", borderRadius: 999, background: "linear-gradient(90deg, #11d9b5, #00f0ff)" }} />
                        </div>
                      </div>
                    ) : null}
                    <div style={{ display: "grid", gap: 12, marginTop: 4 }}>
                      <input
                        value={pasteTitle}
                        onChange={(event) => setPasteTitle(event.target.value)}
                        placeholder="Additional source title (optional)"
                        style={{
                          width: "100%",
                          boxSizing: "border-box",
                          padding: "14px 16px",
                          borderRadius: 16,
                          border: "1px solid rgba(120,143,199,0.18)",
                          background: "rgba(7,10,18,0.78)",
                          color: "#edf2ff",
                          fontSize: "1rem"
                        }}
                      />
                      <input
                        value={pasteUrl}
                        onChange={(event) => setPasteUrl(event.target.value)}
                        placeholder="Additional source URL (optional)"
                        style={{
                          width: "100%",
                          boxSizing: "border-box",
                          padding: "14px 16px",
                          borderRadius: 16,
                          border: "1px solid rgba(120,143,199,0.18)",
                          background: "rgba(7,10,18,0.78)",
                          color: "#edf2ff",
                          fontSize: "1rem"
                        }}
                      />
                      <textarea
                        value={pasteText}
                        onChange={(event) => setPasteText(event.target.value)}
                        placeholder="Paste another support source, article, notes, prompt, or webpage text here..."
                        style={{
                          width: "100%",
                          minHeight: 160,
                          boxSizing: "border-box",
                          padding: "16px 18px",
                          borderRadius: 18,
                          border: "1px solid rgba(120,143,199,0.18)",
                          background: "rgba(7,10,18,0.78)",
                          color: "#edf2ff",
                          fontSize: "1rem",
                          lineHeight: 1.7,
                          resize: "vertical"
                        }}
                      />
                    </div>
                  </div>
                </div>
                <div style={{ display: "grid", gap: 18 }}>
                  {statusCard("Canvas Status", "#00f0ff", canvasLoadState.headline, canvasLoadState.detail)}
                  {statusCard("Support Source Status", "#11d9b5", textbookLoadState.headline, textbookLoadState.detail)}
                  {summaryCard("Canvas Course Summary", canvasSummary, "#00f0ff", "No Canvas course data has been loaded yet.")}
                  {summaryCard("Support Sources Summary", textbookSummary, "#11d9b5", "No additional support sources have been added yet.")}
                  <div style={cardStyle}>
                    <div style={{ color: "#8b97be", fontSize: ".74rem", fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", fontFamily: "'Orbitron', 'Space Grotesk', sans-serif" }}>
                      Review Queue
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10, marginTop: 14 }}>
                      {[
                        [`${reviewCounts.keep}`, "Keep"],
                        [`${reviewCounts.review}`, "Review"],
                        [`${reviewCounts.reject}`, "Reject"]
                      ].map(([value, label]) => (
                        <div key={label} style={{ padding: "12px 14px", borderRadius: 16, background: "rgba(7,10,18,0.78)", border: "1px solid rgba(120,143,199,0.18)" }}>
                          <div style={{ fontSize: "1.02rem", fontWeight: 800 }}>{value}</div>
                          <div style={{ color: "#8b97be", fontSize: ".78rem", marginTop: 4 }}>{label}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ color: "#8b97be", lineHeight: 1.7, marginTop: 12 }}>
                      Exclude anything that looks like LMS chrome, onboarding/profile prompts, broken fragments, or low-value wrappers before you synthesize.
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
                <div style={{ padding: "18px 22px", borderBottom: "1px solid rgba(120,143,199,0.18)" }}>
                  <div style={{ color: "#00f0ff", fontSize: ".74rem", fontWeight: 700, letterSpacing: ".14em", fontFamily: "'Orbitron', 'Space Grotesk', sans-serif" }}>
                    SOURCE REVIEW
                  </div>
                  <div style={{ color: "#8b97be", lineHeight: 1.7, marginTop: 10 }}>
                    Each imported page is scored as keep, review, or reject. Reject anything noisy before the deterministic engine sees it.
                  </div>
                </div>
                <div style={{ display: "grid", gap: 0, maxHeight: 560, overflowY: "auto" }}>
                  {sortedReviewEntries.map((entry) => {
                    const excluded = excludedIdSet.has(entry.id);
                    return (
                      <div key={entry.id} style={{ padding: "18px 22px", borderTop: "1px solid rgba(120,143,199,0.12)", background: excluded ? "rgba(255,122,150,0.04)" : "transparent" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                          <div style={{ flex: "1 1 520px", minWidth: 0 }}>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                              <span style={{ color: verdictAccent(entry.verdict), fontSize: ".76rem", fontWeight: 800, letterSpacing: ".12em", textTransform: "uppercase" }}>{entry.verdict}</span>
                              <span style={{ color: "#8b97be", fontSize: ".76rem", textTransform: "uppercase" }}>{entry.kind}</span>
                            </div>
                            <div style={{ fontSize: "1.05rem", fontWeight: 800, marginTop: 8 }}>{entry.title}</div>
                            <div style={{ color: "#8b97be", lineHeight: 1.6, marginTop: 8 }}>{entry.preview || "No readable preview survived capture."}</div>
                            {entry.reasons.length > 0 ? (
                              <ul style={{ margin: "10px 0 0", paddingLeft: 18, color: "#d7def7", lineHeight: 1.7 }}>
                                {entry.reasons.map((reason) => <li key={reason}>{reason}</li>)}
                              </ul>
                            ) : null}
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                              {entry.tags.map((tag) => (
                                <span key={tag} style={{ padding: "4px 8px", borderRadius: 999, border: "1px solid rgba(0,240,255,0.16)", background: "rgba(0,240,255,0.06)", color: "#aeefff", fontSize: ".72rem" }}>{tag}</span>
                              ))}
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-start" }}>
                            <button onClick={() => toggleExcludedItem(entry.id)} style={{ padding: "10px 14px", borderRadius: 12, border: `1px solid ${excluded ? "rgba(17,217,181,0.28)" : "rgba(255,122,150,0.24)"}`, background: excluded ? "rgba(17,217,181,0.08)" : "rgba(255,122,150,0.08)", color: excluded ? "#11d9b5" : "#ff7a96", cursor: "pointer", fontWeight: 700 }}>
                              {excluded ? "Include again" : "Exclude from synthesis"}
                            </button>
                            <button onClick={() => {
                              const item = mergedBundle?.items.find((candidate) => candidate.id === entry.id);
                              if (item) downloadCaptureItemJson(item);
                            }} style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid rgba(120,143,199,0.22)", background: "rgba(7,10,18,0.82)", color: "#edf2ff", cursor: "pointer" }}>
                              Export page JSON
                            </button>
                            <a href={entry.url} target="_blank" rel="noreferrer" style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid rgba(120,143,199,0.22)", background: "rgba(7,10,18,0.82)", color: "#edf2ff", textDecoration: "none" }}>
                              Open source
                            </a>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              {renderInputs}
            </div>
          ) : null}
        </div>
      </div>
    );
  };

  const renderProcessing = () => {
    const stageLabel = processing ? STAGE_LABELS[processing.stage] : "Preparing deterministic synthesis";
    const charCount = processing?.charCount ?? 0;
    const largeInput = charCount >= 200_000;

    return (
      <div
        style={{
          minHeight: "100dvh",
          background: "radial-gradient(circle at top, rgba(0,240,255,0.12), transparent 22%), linear-gradient(180deg, #020308 0%, #060814 34%, #05060d 100%)",
          color: "#edf2ff",
          padding: "28px 28px 40px",
          boxSizing: "border-box"
        }}
      >
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div style={{ background: "rgba(9,12,22,0.94)", border: "1px solid rgba(120,143,199,0.18)", borderRadius: 24, boxShadow: "0 24px 64px rgba(0,0,0,0.35)", padding: "22px 26px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 18, alignItems: "center" }}>
              <Glow>AEONTHRA</Glow>
              <div>
                <div style={{ fontSize: "1.35rem", fontWeight: 800 }}>{mergedBundle?.title ?? canvasBundle?.title ?? "Learning Workspace"}</div>
                <div style={{ color: "#8b97be", fontSize: ".74rem", fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", fontFamily: "'Orbitron', 'Space Grotesk', sans-serif" }}>
                  MULTI-PASS DETERMINISTIC SYNTHESIS
                </div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <Button variant="ghost" onClick={() => setProcessing((current) => current ? { ...current, hidden: !current.hidden } : current)}>
                  {processing?.hidden ? "Show Progress" : "Hide Progress"}
                </Button>
                <Button variant="ghost" onClick={resetWorkspace}>Reset</Button>
              </div>
            </div>
          </div>

          {isDemoMode && !demoBannerDismissed ? (
            <div style={{ marginTop: 12, padding: "14px 18px", borderRadius: 14, background: "rgba(0,240,255,0.06)", border: "1px solid rgba(0,240,255,0.12)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "#8b97be" }}>Demo mode: exploring a synthetic course and textbook pair. Import your own sources at any time.</span>
              <button style={{ background: "transparent", border: "none", color: "#8b97be", cursor: "pointer", fontSize: ".82rem" }} onClick={() => setDemoBannerDismissed(true)}>Dismiss</button>
            </div>
          ) : null}

          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 0.85fr)", gap: 22, marginTop: 24 }}>
            <div style={{ background: "rgba(9,12,22,0.94)", border: "1px solid rgba(120,143,199,0.18)", borderRadius: 24, boxShadow: "0 24px 64px rgba(0,0,0,0.35)", padding: "24px 26px" }}>
              <div style={{ color: "#8b97be", fontSize: ".74rem", fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", fontFamily: "'Orbitron', 'Space Grotesk', sans-serif" }}>
                SYNTHESIS STATUS
              </div>
              <h3 style={{ fontSize: "1.7rem", marginTop: 12 }}>{stageLabel}</h3>
              {largeInput ? (
                <div style={{ padding: "16px 18px", borderRadius: 18, background: "rgba(0,240,255,0.06)", border: "1px solid rgba(0,240,255,0.12)", color: "#8b97be", marginTop: 18 }}>
                  Large input detected ({charCount.toLocaleString()} characters). Deeper synthesis passes may take 30-60 seconds.
                </div>
              ) : null}
              {!processing?.hidden ? (
                <>
                  <div style={{ marginTop: 20, height: 10, borderRadius: 999, background: "#141a2c", overflow: "hidden" }}>
                    <div style={{ width: `${Math.max(8, processing?.progress ?? 0)}%`, height: "100%", borderRadius: 999, background: "linear-gradient(90deg, #00f0ff, #11d9b5)" }} />
                  </div>
                  <div style={{ color: "#8b97be", marginTop: 12 }}>{Math.round(processing?.progress ?? 0)}%</div>
                </>
              ) : null}
              {processing?.error ? (
                <div style={{ marginTop: 18, padding: "14px 16px", borderRadius: 14, background: "rgba(255,102,122,0.08)", border: "1px solid rgba(255,102,122,0.2)", color: "#ff667a" }}>
                  {processing.error}
                </div>
              ) : null}
            </div>

            <div style={{ background: "rgba(9,12,22,0.94)", border: "1px solid rgba(120,143,199,0.18)", borderRadius: 24, boxShadow: "0 24px 64px rgba(0,0,0,0.35)", padding: "24px 26px" }}>
              <div style={{ color: "#8b97be", fontSize: ".74rem", fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", fontFamily: "'Orbitron', 'Space Grotesk', sans-serif" }}>
                PIPELINE PASSES
              </div>
              <div style={{ display: "grid", gap: 12, marginTop: 18 }}>
                {SYNTHESIS_STEPS.map((step, index) => {
                  const completed = (processing?.progress ?? 0) >= (index + 1) * 11;
                  return (
                    <div key={step.stage} style={{ padding: "14px 16px", borderRadius: 16, background: "rgba(7,10,18,0.78)", border: "1px solid rgba(120,143,199,0.18)", color: completed ? "#11d9b5" : "#8b97be" }}>
                      {step.label}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (appStage === "canvas-required" || appStage === "textbook-required" || appStage === "synthesis-ready") {
    return renderIntake();
  }

  if (appStage === "synthesizing" || !learning || !workspace || !shellData || !mergedBundle || !progressReady) {
    return renderProcessing();
  }

  return (
    <ShellErrorBoundary>
      <StudyWorkbench
        bundle={mergedBundle}
        learning={learning}
        workspace={workspace}
        progress={progress}
        noteScope={progressScope}
        onExportOfflineSite={canvasBundle && textbookBundle ? downloadOfflineSite : undefined}
        onExportReplayBundle={canvasBundle && textbookBundle ? downloadReplayBundle : undefined}
        onReset={resetWorkspace}
      />
    </ShellErrorBoundary>
  );
}

