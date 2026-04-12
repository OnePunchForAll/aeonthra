import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import type { LearningBuildStage } from "@learning/content-engine";
import { CaptureBundleSchema, type CaptureBundle, type LearningBundle, createManualCaptureBundle } from "@learning/schema";
import { createDemoBundle, createDemoLearningBundle, createDemoProgress } from "./lib/demo";
import { acknowledgeImportedPack, requestImportFromBridge, respondToBridgePing, subscribeToBridgeMessages } from "./lib/bridge";
import { clearStoredBundle, loadProgress, loadStoredBundle, storeBundle, storeProgress } from "./lib/storage";
import { deriveWorkspace, type AppProgress } from "./lib/workspace";
import { mapToShellData } from "./lib/shell-mapper";
import { getTextbookProcessor } from "./lib/textbook-processor";
import { AeonthraShell } from "./AeonthraShell";

type ProcessingState = {
  active: boolean;
  stage: LearningBuildStage;
  progress: number;
  charCount: number;
  error: string | null;
};

type UploadState = {
  kind: "pdf" | "text";
  progress: number;
  label: string;
};

const STAGE_LABELS: Record<LearningBuildStage, string> = {
  "cleaning-source": "Cleaning source",
  "building-blocks": "Segmenting content",
  "mining-concepts": "Extracting concepts",
  "mapping-relations": "Mapping relationships",
  "forging-protocol": "Forging study systems",
  "finalizing-bundle": "Finalizing bundle",
};

function inferTextbookTitle(content: string): string {
  const markdownHeading = content.match(/^#\s+(.+)$/m)?.[1]?.trim();
  if (markdownHeading) return markdownHeading;
  const firstLine = content.split(/\n+/).map((l) => l.trim()).find((l) => l.length > 0) ?? "";
  if (firstLine.length > 0 && firstLine.length <= 100) return firstLine;
  return "Untitled Textbook";
}

function parseBundle(raw: string): CaptureBundle | null {
  try {
    return CaptureBundleSchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

function acceptedJsonFile(file: File): boolean {
  return file.name.toLowerCase().endsWith(".json") || file.type.includes("json");
}

export default function App() {
  const [bundle, setBundle] = useState<CaptureBundle | null>(() => loadStoredBundle());
  const [learning, setLearning] = useState<LearningBundle | null>(null);
  const [processing, setProcessing] = useState<ProcessingState | null>(null);
  const [progress, setProgress] = useState<AppProgress>(() => loadProgress());
  const [pasteTitle, setPasteTitle] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [uploadState, setUploadState] = useState<UploadState | null>(null);
  const [status, setStatus] = useState("Ready for import.");

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textbookInputRef = useRef<HTMLInputElement | null>(null);
  const bridgeRequestModeRef = useRef<"auto" | "manual" | null>(null);
  const initialBridgeAttemptRef = useRef(false);

  const workspace = useMemo(
    () => (bundle && learning ? deriveWorkspace(bundle, learning, progress) : null),
    [bundle, learning, progress]
  );

  const shellData = useMemo(
    () =>
      bundle && learning && workspace
        ? mapToShellData(bundle, learning, { tasks: workspace.tasks, chapters: workspace.chapters })
        : null,
    [bundle, learning, workspace]
  );

  const isDemoMode = bundle?.source === "demo";

  useEffect(() => { if (bundle) storeBundle(bundle); }, [bundle]);
  useEffect(() => { storeProgress(progress); }, [progress]);

  useEffect(() => {
    if (!bundle) { setLearning(null); setProcessing(null); return; }
    if (bundle.source === "demo") { setLearning(createDemoLearningBundle(bundle)); setProcessing(null); return; }
    let cancelled = false;
    const charCount = bundle.items.reduce((sum, item) => sum + item.plainText.length, 0);
    setLearning(null);
    setProcessing({ active: true, stage: "cleaning-source", progress: 0, charCount, error: null });
    getTextbookProcessor()
      .process(bundle, (stage, progressValue) => {
        if (!cancelled) setProcessing((c) => c ? { ...c, stage, progress: progressValue } : c);
      })
      .then((result) => {
        if (cancelled) return;
        setLearning(result);
        setProcessing((c) => c ? { ...c, active: false, progress: 100 } : c);
      })
      .catch((error) => {
        if (cancelled) return;
        setProcessing((c) => c ? { ...c, active: false, error: error instanceof Error ? error.message : "Processing failed." } : c);
      });
    return () => { cancelled = true; };
  }, [bundle]);

  useEffect(() => {
    if (!learning || !isDemoMode) return;
    setProgress((current) => createDemoProgress(learning, current));
  }, [isDemoMode, learning]);

  useEffect(() => {
    return subscribeToBridgeMessages((message) => {
      if (message.type === "NF_PING") { respondToBridgePing(); return; }
      if (message.type === "NF_PACK_READY") {
        setBundle(message.pack);
        setStatus(`Bundle imported: ${message.pack.title}`);
        acknowledgeImportedPack(message.pack);
        bridgeRequestModeRef.current = null;
        return;
      }
      if (message.type === "NF_IMPORT_RESULT" && !message.success) {
        if (bridgeRequestModeRef.current === "manual") setStatus(message.error ?? "No queued extension handoff was available.");
        bridgeRequestModeRef.current = null;
      }
    });
  }, []);

  useEffect(() => {
    if (initialBridgeAttemptRef.current) return;
    initialBridgeAttemptRef.current = true;
    bridgeRequestModeRef.current = "auto";
    requestImportFromBridge();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash.toLowerCase();
    if (!bundle && (params.get("demo") === "1" || hash.includes("demo"))) {
      setBundle(createDemoBundle());
      setStatus("Demo forge ready.");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const importBundleFromFile = async (file: File) => {
    if (!acceptedJsonFile(file)) { setStatus("Choose a JSON capture bundle."); return; }
    const parsed = parseBundle(await file.text());
    if (!parsed) { setStatus("That file did not validate as a capture bundle."); return; }
    setBundle(parsed);
    setStatus(`Bundle imported: ${parsed.title}`);
  };

  const handleTextbookFile = async (file: File) => {
    const lower = file.name.toLowerCase();
    if (file.type === "application/pdf" || lower.endsWith(".pdf")) {
      setUploadState({ kind: "pdf", progress: 0, label: "Extracting PDF" });
      const { extractTextFromPdf } = await import("./lib/pdf-ingest");
      const extracted = await extractTextFromPdf(file, (page, total) => {
        setUploadState({ kind: "pdf", progress: total > 0 ? (page / total) * 100 : 0, label: `Extracting page ${page} of ${total}` });
      });
      const text = extracted.chapters.map((c) => `${c.title}\n${c.text}`).join("\n\n") || extracted.text;
      setBundle(createManualCaptureBundle({ title: extracted.title, text, kind: "document" }));
      setStatus(`PDF imported: ${extracted.title} (${extracted.totalPages} pages)`);
      setUploadState(null);
      return;
    }
    if (file.type.startsWith("text/") || /\.(txt|text|md)$/i.test(file.name)) {
      setUploadState({ kind: "text", progress: 100, label: "Importing text file" });
      const text = await file.text();
      const nextBundle = createManualCaptureBundle({ title: inferTextbookTitle(text) || file.name.replace(/\.[^.]+$/, ""), text, kind: "document" });
      setBundle(nextBundle);
      setStatus(`Text file imported: ${nextBundle.title}`);
      setUploadState(null);
      return;
    }
    setStatus("Choose a PDF, text file, or JSON bundle.");
  };

  const handleImportFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await importBundleFromFile(file);
    e.target.value = "";
  };

  const handleTextbookUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try { await handleTextbookFile(file); }
    catch (error) { setStatus(error instanceof Error ? error.message : "Textbook import failed."); setUploadState(null); }
    finally { e.target.value = ""; }
  };

  const handleDrop = async (e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    try {
      if (acceptedJsonFile(file)) await importBundleFromFile(file);
      else await handleTextbookFile(file);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Import failed.");
      setUploadState(null);
    }
  };

  const handlePasteImport = () => {
    if (!pasteText.trim()) { setStatus("Paste textbook or source text first."); return; }
    const title = pasteTitle.trim() || inferTextbookTitle(pasteText);
    setBundle(createManualCaptureBundle({ title, text: pasteText, kind: "document" }));
    setStatus(`Textbook source queued: ${title}`);
  };

  // ── Shell ready ──────────────────────────────────────────────────────────────

  if (shellData) {
    return (
      <AeonthraShell
        data={shellData}
        progress={progress}
        onProgressUpdate={(update) => setProgress((cur) => ({ ...cur, ...update }))}
        onReset={() => { clearStoredBundle(); setBundle(null); setProcessing(null); }}
        isDemoMode={isDemoMode}
      />
    );
  }

  // ── Processing screen ────────────────────────────────────────────────────────

  if (processing) {
    const label = STAGE_LABELS[processing.stage] ?? processing.stage;
    return (
      <div style={{ minHeight: "100vh", background: "#020208", display: "flex", alignItems: "center", justifyContent: "center", color: "#e0e0ff", fontFamily: "'Inter',sans-serif" }}>
        <div style={{ textAlign: "center", maxWidth: 480, padding: 40 }}>
          <div style={{ fontSize: "2rem", marginBottom: 24 }}>⚙</div>
          <h2 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: 12, margin: 0 }}>Building your learning system</h2>
          <p style={{ color: "#6a6a9a", margin: "12px 0 32px" }}>{label}</p>
          <div style={{ height: 6, borderRadius: 3, background: "rgba(50,50,100,.4)", overflow: "hidden" }}>
            <div style={{ height: "100%", borderRadius: 3, background: "#00f0ff", width: `${processing.progress}%`, transition: "width 300ms ease" }} />
          </div>
          {processing.error && <p style={{ color: "#ff4466", marginTop: 20, fontSize: ".88rem" }}>{processing.error}</p>}
        </div>
      </div>
    );
  }

  // ── Import screen ────────────────────────────────────────────────────────────

  return (
    <div
      style={{ minHeight: "100vh", background: "#020208", display: "flex", alignItems: "center", justifyContent: "center", color: "#e0e0ff", fontFamily: "'Inter',sans-serif" }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <div style={{ maxWidth: 580, width: "100%", padding: 40 }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{ fontSize: "2.4rem", fontWeight: 900, letterSpacing: ".22em", color: "#00f0ff", marginBottom: 6, fontFamily: "'Space Grotesk',sans-serif" }}>AEONTHRA</div>
          <div style={{ fontSize: ".78rem", letterSpacing: ".3em", color: "#6a6a9a", textTransform: "uppercase" }}>Neural Learning System</div>
        </div>

        <div style={{ background: "rgba(16,16,36,.94)", border: "1px solid rgba(50,50,100,.55)", borderRadius: 24, padding: "44px 50px", marginBottom: 24 }}>
          <div style={{ fontSize: ".84rem", fontWeight: 800, letterSpacing: ".2em", textTransform: "uppercase", color: "#6a6a9a", marginBottom: 20, fontFamily: "'Space Grotesk',sans-serif" }}>IMPORT COURSE</div>

          <div style={{ display: "flex", gap: 12, marginBottom: 32 }}>
            <button
              onClick={() => { setBundle(createDemoBundle()); }}
              style={{ flex: 1, padding: "14px 20px", borderRadius: 14, border: "1px solid rgba(0,240,255,.2)", background: "rgba(0,240,255,.05)", color: "#00f0ff", fontWeight: 700, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}
            >
              ⚡ Try Demo
            </button>
            <button
              onClick={() => { bridgeRequestModeRef.current = "manual"; requestImportFromBridge(); }}
              style={{ flex: 1, padding: "14px 20px", borderRadius: 14, border: "1px solid rgba(50,50,100,.55)", background: "transparent", color: "#b8b8d8", fontWeight: 600, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}
            >
              🔗 Canvas Extension
            </button>
          </div>

          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: ".82rem", color: "#6a6a9a", marginBottom: 8 }}>Upload PDF or text file</div>
            <input ref={textbookInputRef} type="file" accept=".pdf,.txt,.text,.md" onChange={handleTextbookUpload} style={{ display: "none" }} />
            <button
              onClick={() => textbookInputRef.current?.click()}
              style={{ width: "100%", padding: "14px 20px", borderRadius: 14, border: "2px dashed rgba(50,50,100,.55)", background: "transparent", color: "#b8b8d8", cursor: "pointer", fontFamily: "'Inter',sans-serif" }}
            >
              {uploadState ? `${uploadState.label} (${Math.round(uploadState.progress)}%)` : "Click to upload or drag & drop"}
            </button>
          </div>

          <div>
            <div style={{ fontSize: ".82rem", color: "#6a6a9a", marginBottom: 8 }}>Paste textbook text</div>
            <input
              value={pasteTitle}
              onChange={(e) => setPasteTitle(e.target.value)}
              placeholder="Title (optional)"
              style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(50,50,100,.55)", background: "rgba(22,22,48,.7)", color: "#e0e0ff", fontSize: ".88rem", marginBottom: 8, boxSizing: "border-box", fontFamily: "'Inter',sans-serif" }}
            />
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Paste textbook chapter or source text here..."
              rows={5}
              style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(50,50,100,.55)", background: "rgba(22,22,48,.7)", color: "#e0e0ff", fontSize: ".88rem", resize: "vertical", boxSizing: "border-box", fontFamily: "'Inter',sans-serif" }}
            />
            <button
              onClick={handlePasteImport}
              style={{ marginTop: 8, width: "100%", padding: "12px 20px", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#00f0ff,#0066ff)", color: "#000", fontWeight: 700, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}
            >
              Import Pasted Text
            </button>
          </div>

          <input ref={fileInputRef} type="file" accept=".json" onChange={handleImportFile} style={{ display: "none" }} />
        </div>

        {status && status !== "Ready for import." && (
          <p style={{ textAlign: "center", fontSize: ".88rem", color: "#6a6a9a", margin: 0 }}>{status}</p>
        )}
      </div>
    </div>
  );
}
