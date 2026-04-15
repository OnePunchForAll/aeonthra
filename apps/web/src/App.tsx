import { Component, useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent, type ReactNode } from "react";
import { createDemoSourceText, type LearningBuildStage } from "@learning/content-engine";
import { CaptureBundleSchema, type CaptureBundle, type LearningBundle } from "@learning/schema";
import { createDemoBundle, createDemoProgress } from "./lib/demo";
import { acknowledgeImportedPack, requestImportFromBridge, respondToBridgePing, subscribeToBridgeMessages } from "./lib/bridge";
import {
  clearStoredBundle,
  clearStoredSourceWorkspace,
  loadProgress,
  storeScopedProgress,
  loadStoredBundle,
  loadStoredSourceWorkspace,
  storeBundle,
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
  determineAppStage,
  isSameCourse,
  mergeSourceBundles,
  splitLegacyBundle,
  summarizeBundle,
  type BundleSummary
} from "./lib/source-workspace";
import { AeonthraShell } from "./AeonthraShell";

type ShellErrorBoundaryState = { error: Error | null };

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

function acceptedJsonFile(file: File): boolean {
  return file.name.toLowerCase().endsWith(".json") || file.type.includes("json");
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
  const initialSourceState = useMemo(
    () => loadStoredSourceWorkspace() ?? splitLegacyBundle(loadStoredBundle()),
    []
  );

  const [canvasBundle, setCanvasBundle] = useState<CaptureBundle | null>(initialSourceState.canvasBundle);
  const [textbookBundle, setTextbookBundle] = useState<CaptureBundle | null>(initialSourceState.textbookBundle);
  const [learning, setLearning] = useState<LearningBundle | null>(null);
  const [status, setStatus] = useState("Waiting for Canvas course import.");
  const [pasteTitle, setPasteTitle] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [uploadState, setUploadState] = useState<UploadState | null>(null);
  const [progress, setProgress] = useState<AppProgress>(EMPTY_PROGRESS);
  const [processing, setProcessing] = useState<ProcessingState | null>(null);
  const [synthesisRequested, setSynthesisRequested] = useState(() => Boolean(initialSourceState.canvasBundle && initialSourceState.textbookBundle));
  const [demoBannerDismissed, setDemoBannerDismissed] = useState(false);

  const handleProgressUpdate = useCallback((update: Partial<AppProgress>) => {
    setProgress((current) => ({ ...current, ...update }));
  }, []);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textbookInputRef = useRef<HTMLInputElement | null>(null);
  const bridgeRequestModeRef = useRef<"auto" | "manual" | null>(null);
  const initialBridgeAttemptRef = useRef(false);
  const hydratedProgressScopeRef = useRef<string | null>(null);

  const mergedBundle = useMemo(
    () => mergeSourceBundles(canvasBundle, textbookBundle),
    [canvasBundle, textbookBundle]
  );

  const canvasSummary = useMemo(() => summarizeBundle(canvasBundle), [canvasBundle]);
  const textbookSummary = useMemo(() => summarizeBundle(textbookBundle), [textbookBundle]);

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

    const persistedBundle = mergedBundle ?? canvasBundle ?? textbookBundle;
    if (persistedBundle) {
      storeBundle(persistedBundle);
    }
  }, [canvasBundle, textbookBundle, mergedBundle]);

  useEffect(() => {
    if (!progressScope || !shellData || !workspace) {
      return;
    }
    if (hydratedProgressScopeRef.current === progressScope) {
      return;
    }

    const scopedProgress = normalizeProgressForWorkspace(loadProgress(progressScope), shellData, workspace);
    const legacyProgress = normalizeProgressForWorkspace(loadProgress(), shellData, workspace);
    const restoredProgress = isEmptyProgress(scopedProgress) ? legacyProgress : scopedProgress;
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
      if (message.type === "NF_PING") {
        respondToBridgePing();
        return;
      }
      if (message.type === "NF_PACK_READY") {
        applyCanvasBundle(message.pack, `Canvas bundle imported: ${message.pack.title}.`);
        acknowledgeImportedPack(message.pack);
        bridgeRequestModeRef.current = null;
        return;
      }
      if (message.type === "NF_IMPORT_RESULT" && !message.success) {
        if (bridgeRequestModeRef.current === "manual") {
          setStatus(message.error ?? "No queued extension handoff was available.");
        }
        bridgeRequestModeRef.current = null;
      }
    });
  }, [canvasBundle, textbookBundle]);

  useEffect(() => {
    if (initialBridgeAttemptRef.current) {
      return;
    }
    initialBridgeAttemptRef.current = true;
    bridgeRequestModeRef.current = "auto";
    requestImportFromBridge();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash.toLowerCase();
    if (!canvasBundle && !textbookBundle && (params.get("demo") === "1" || hash.includes("demo"))) {
      loadDemoMode();
    }
  }, [canvasBundle, textbookBundle]);

  const applyCanvasBundle = (nextBundle: CaptureBundle, successMessage: string) => {
    const keepTextbook = textbookBundle && isSameCourse(canvasBundle, nextBundle) ? textbookBundle : null;

    setCanvasBundle(nextBundle);
    setTextbookBundle(keepTextbook);
    setLearning(null);
    setProcessing(null);
    setSynthesisRequested(false);
    setDemoBannerDismissed(false);
    hydratedProgressScopeRef.current = null;

    if (!isSameCourse(canvasBundle, nextBundle)) {
      setProgress(EMPTY_PROGRESS);
    }

    if (keepTextbook) {
      setStatus(`${successMessage} Textbook preserved. Begin synthesis when ready.`);
      return;
    }

    setStatus(`${successMessage} Textbook required before synthesis can begin.`);
  };

  const applyRestoredSite = (raw: string) => {
    const parsed = parseOfflineSiteBundle(raw);
    if (!parsed) {
      return false;
    }

    const restored = restoreOfflineSiteBundle(parsed);
    setCanvasBundle(restored.canvasBundle);
    setTextbookBundle(restored.textbookBundle);
    setLearning(restored.learningBundle);
    setProgress(restored.progress);
    setProcessing(null);
    setSynthesisRequested(false);
    setDemoBannerDismissed(false);
    hydratedProgressScopeRef.current = restored.learningBundle.synthesis.deterministicHash;
    setStatus(`Offline site bundle restored: ${parsed.title}`);
    return true;
  };

  const loadDemoMode = () => {
    setCanvasBundle(createDemoBundle());
    setTextbookBundle(makeDemoTextbookBundle());
    setLearning(null);
    setProcessing(null);
    setProgress(EMPTY_PROGRESS);
    setSynthesisRequested(true);
    setDemoBannerDismissed(false);
    hydratedProgressScopeRef.current = null;
    setStatus("Demo workspace loaded. Running deterministic synthesis...");
  };

  const importJsonPayload = (raw: string) => {
    if (applyRestoredSite(raw)) {
      return;
    }

    const parsed = parseCaptureBundle(raw);
    if (!parsed) {
      setStatus("That JSON file did not validate as a Canvas capture or saved site bundle.");
      return;
    }

    applyCanvasBundle(parsed, `Canvas bundle imported: ${parsed.title}.`);
  };

  const importBundleFromFile = async (file: File) => {
    if (!acceptedJsonFile(file)) {
      setStatus("Choose a Canvas JSON bundle or a saved site bundle.");
      return;
    }
    importJsonPayload(await file.text());
  };

  const applyTextbookImport = (input: TextbookImportInput, successMessage: string) => {
    setTextbookBundle(createTextbookCaptureBundle(input));
    setLearning(null);
    setProcessing(null);
    setSynthesisRequested(false);
    setStatus(successMessage);
    setPasteTitle("");
    setPasteText("");
  };

  const handleTextbookFile = async (file: File) => {
    if (!canvasBundle) {
      setStatus("Canvas course content is required before textbook intake.");
      return;
    }

    const lower = file.name.toLowerCase();
    if (file.type === "application/pdf" || lower.endsWith(".pdf")) {
      setUploadState({ kind: "pdf", progress: 0, label: "Extracting PDF" });
      const { extractTextFromPdf } = await import("./lib/pdf-ingest");
      const extracted = await extractTextFromPdf(file, (page, total) => {
        setUploadState({
          kind: "pdf",
          progress: total > 0 ? (page / total) * 100 : 0,
          label: `Extracting page ${page} of ${total}`
        });
      });
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
      setStatus(error instanceof Error ? error.message : "Textbook import failed.");
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

    try {
      if (acceptedJsonFile(file)) {
        await importBundleFromFile(file);
      } else {
        await handleTextbookFile(file);
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Import failed.");
      setUploadState(null);
    }
  };

  const handlePasteImport = () => {
    if (!canvasBundle) {
      setStatus("Canvas course content is required before textbook intake.");
      return;
    }
    if (!pasteText.trim()) {
      setStatus("Paste textbook text first.");
      return;
    }
    const title = pasteTitle.trim() || inferTextbookTitle(pasteText);
    applyTextbookImport(
      {
        title,
        text: pasteText,
        format: "paste"
      },
      `Textbook imported: ${title}. Deterministic synthesis is ready to begin.`
    );
  };

  const beginSynthesis = () => {
    if (!canvasBundle) {
      setStatus("Canvas course content is required first.");
      return;
    }
    if (!textbookBundle) {
      setStatus("A textbook is required before synthesis can begin.");
      return;
    }
    setLearning(null);
    setProcessing(null);
    setSynthesisRequested(true);
    setStatus("Preparing deterministic synthesis...");
  };

  const resetWorkspace = () => {
    clearStoredBundle();
    clearStoredSourceWorkspace();
    setCanvasBundle(null);
    setTextbookBundle(null);
    setLearning(null);
    setProcessing(null);
    setSynthesisRequested(false);
    setProgress(EMPTY_PROGRESS);
    setUploadState(null);
    setStatus("Workspace reset. Waiting for Canvas course import.");
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
      progress
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
      progress
    });
    downloadOfflineReplayBundle(offlineBundle);
    setStatus(`Replay bundle saved: ${offlineBundle.title}`);
  };

  const renderIntake = () => {
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
            <div style={{ maxWidth: 760, margin: "28px auto 0" }}>
              <div style={cardStyle}>
                <div style={{ color: "#00f0ff", fontSize: ".74rem", fontWeight: 700, letterSpacing: ".14em", fontFamily: "'Orbitron', 'Space Grotesk', sans-serif" }}>
                  STEP 1 OF 3
                </div>
                <div style={{ fontSize: "1.55rem", fontWeight: 800, marginTop: 10 }}>Load Canvas course content</div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 18 }}>
                  <Button onClick={() => fileInputRef.current?.click()}>CHOOSE CANVAS JSON</Button>
                  <Button variant="ghost" onClick={loadDemoMode}>TRY DEMO</Button>
                </div>
                <button
                  onClick={() => {
                    bridgeRequestModeRef.current = "manual";
                    setStatus("Checking extension handoff...");
                    requestImportFromBridge();
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
                  Use Canvas extension instead
                </button>
                {status !== "Waiting for Canvas course import." ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#8b97be", minHeight: 28, marginTop: 16 }}>
                    {status.toLowerCase().includes("checking") ? <Loader /> : null}
                    <span>{status}</span>
                  </div>
                ) : null}
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
                <div style={{ fontSize: "1.55rem", fontWeight: 800, marginTop: 10 }}>Provide the textbook</div>
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
                {summaryCard("Canvas Course Summary", canvasSummary, "#00f0ff", "No Canvas course data has been loaded yet.")}
                {statusCard("Textbook Status", "#11d9b5", "Required", status)}
              </div>
              {renderInputs}
            </div>
          ) : null}

          {appStage === "synthesis-ready" ? (
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.05fr) minmax(320px, 0.95fr)", gap: 22, marginTop: 28 }}>
              <div style={cardStyle}>
                <div style={{ color: "#f8d24a", fontSize: ".74rem", fontWeight: 700, letterSpacing: ".14em", fontFamily: "'Orbitron', 'Space Grotesk', sans-serif" }}>
                  STEP 3 OF 3
                </div>
                <div style={{ fontSize: "1.55rem", fontWeight: 800, marginTop: 10 }}>Generate the study workspace</div>
                <div style={{ display: "grid", gap: 12, marginTop: 18 }}>
                  <div style={{ padding: "16px 18px", borderRadius: 18, background: "rgba(7,10,18,0.78)", border: "1px solid rgba(120,143,199,0.18)", color: "#8b97be", lineHeight: 1.7 }}>
                    {status}
                  </div>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <Button onClick={beginSynthesis} disabled={!canvasBundle || !textbookBundle || Boolean(uploadState)}>Begin Synthesis</Button>
                    <Button variant="ghost" onClick={resetWorkspace}>Reset Workspace</Button>
                  </div>
                </div>
              </div>
              <div style={{ display: "grid", gap: 18 }}>
                {summaryCard("Canvas Course Summary", canvasSummary, "#00f0ff", "No Canvas course data has been loaded yet.")}
                {summaryCard("Textbook Summary", textbookSummary, "#11d9b5", "Textbook intake unlocks after Canvas import and is required before synthesis.")}
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

  if (appStage === "synthesizing" || !learning || !workspace || !shellData || !mergedBundle) {
    return renderProcessing();
  }

  return (
    <ShellErrorBoundary>
      <AeonthraShell
        data={shellData}
        progress={progress}
        onProgressUpdate={handleProgressUpdate}
        onReset={resetWorkspace}
        onDownloadOfflineSite={downloadOfflineSite}
        onSaveReplayBundle={downloadReplayBundle}
        isDemoMode={isDemoMode}
      />
    </ShellErrorBoundary>
  );
}

