import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { motion } from "framer-motion";
import type { AmbientItem, Angle } from "@learning/interactions-engine";
import type { LearningBuildStage } from "@learning/content-engine";
import { CaptureBundleSchema, type CaptureBundle, type LearningBundle, createManualCaptureBundle } from "@learning/schema";
import { createDemoBundle, createDemoLearningBundle, createDemoProgress } from "./lib/demo";
import { createInteractionRuntime, type ShadowSettings } from "./lib/interactions-runtime";
import { loadEchoAnchors, loadFailureSeen, loadOracleHistory, loadPrismChoices, loadShadowSettings, loadTimeCapsules, storeEchoAnchors, storeFailureSeen, storeOracleHistory, storePrismChoices, storeShadowSettings, storeTimeCapsules, type FailureSeenRecord, type OracleHistoryRecord } from "./lib/interactions-storage";
import { acknowledgeImportedPack, requestImportFromBridge, respondToBridgePing, subscribeToBridgeMessages } from "./lib/bridge";
import { loadDrafts, loadForgeSession, loadProgress, loadStoredBundle, storeBundle, storeDrafts, storeForgeSession, storeProgress, clearStoredBundle, type ForgeSessionSnapshot } from "./lib/storage";
import { deriveWorkspace, type AppProgress } from "./lib/workspace";
import { chapterForTask, createForgeSession } from "./lib/forge-session";
import { getTextbookProcessor } from "./lib/textbook-processor";
import { exportForgeSummaryMarkdown } from "./lib/export";
import { AssignmentWorkbench } from "./components/AssignmentWorkbench";
import { CollisionLab } from "./components/CollisionLab";
import { ConceptMapBoard } from "./components/ConceptMapBoard";
import { ForgeStudio, type ForgePhase, type ForgeRuntimeState } from "./components/ForgeStudio";
import { GravityFieldBoard } from "./components/GravityFieldBoard";
import { InteractionDeck } from "./components/InteractionDeck";
import { MissionControl } from "./components/MissionControl";
import { OraclePanel } from "./components/OraclePanel";
import { ShadowReaderRail } from "./components/ShadowReaderRail";
import { TimelineBoard } from "./components/TimelineBoard";
import { DuelArena } from "./components/DuelArena";
import { Button } from "./components/primitives/Button";
import { Card } from "./components/primitives/Card";
import { Glow } from "./components/primitives/Glow";
import { Loader } from "./components/primitives/Loader";
import { Timer } from "./components/primitives/Timer";

type Surface = "dashboard" | "timeline" | "concept-map" | "assignment" | "forge" | "oracle" | "gravity" | "collision" | "duel";
type FocusState = { conceptId: string | null; related: Set<string> };
type ProcessingState = {
  active: boolean;
  stage: LearningBuildStage;
  progress: number;
  hidden: boolean;
  charCount: number;
  error: string | null;
};
type CollisionHighlight = { fromId: string; toId: string; label: string } | null;
type UploadState = {
  kind: "pdf" | "text";
  progress: number;
  label: string;
};

const PHASES: Array<{ id: ForgePhase; duration: number }> = [
  { id: "genesis", duration: 12 },
  { id: "forge", duration: 12 },
  { id: "crucible", duration: 12 },
  { id: "architect", duration: 12 },
  { id: "transcend", duration: 12 }
];

const STAGE_LABELS: Record<LearningBuildStage, string> = {
  "cleaning-source": "Cleaning source",
  "building-blocks": "Segmenting content",
  "mining-concepts": "Extracting concepts",
  "mapping-relations": "Mapping relationships",
  "forging-protocol": "Forging study systems",
  "finalizing-bundle": "Finalizing bundle"
};

function inferTextbookTitle(content: string): string {
  const markdownHeading = content.match(/^#\s+(.+)$/m)?.[1]?.trim();
  if (markdownHeading) {
    return markdownHeading;
  }
  const firstLine = content.split(/\n+/).map((line) => line.trim()).find((line) => line.length > 0) ?? "";
  if (firstLine.length > 0 && firstLine.length <= 100) {
    return firstLine;
  }
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

function sourceHost(bundle: CaptureBundle): string {
  const firstUrl = bundle.manifest.sourceUrls[0];
  if (!firstUrl) return "local workspace";
  try {
    return new URL(firstUrl).host.replace(/^www\./, "");
  } catch {
    return firstUrl;
  }
}

function forgeDefaults(): ForgeRuntimeState {
  return {
    phase: "genesis",
    maxPhaseReached: "genesis",
    modeIndex: 0,
    promptIndex: 0,
    selectedOption: null,
    revealed: false,
    flipped: false,
    learnFirst: false,
    confidence: null,
    teachBack: {},
    score: { correct: 0, wrong: 0 }
  };
}

export default function App() {
  const [bundle, setBundle] = useState<CaptureBundle | null>(() => loadStoredBundle());
  const [learning, setLearning] = useState<LearningBundle | null>(null);
  const [status, setStatus] = useState("Ready for import.");
  const [surface, setSurface] = useState<Surface>("dashboard");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedConceptId, setSelectedConceptId] = useState<string | null>(null);
  const [pasteTitle, setPasteTitle] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [uploadState, setUploadState] = useState<UploadState | null>(null);
  const [progress, setProgress] = useState<AppProgress>(() => loadProgress());
  const [drafts, setDrafts] = useState<Record<string, string>>(() => loadDrafts());
  const [resumeSnapshot] = useState<ForgeSessionSnapshot | null>(() => loadForgeSession());
  const [forgeState, setForgeState] = useState<ForgeRuntimeState>(forgeDefaults);
  const [running, setRunning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(12 * 60);
  const [studentName, setStudentName] = useState(window.localStorage.getItem("aeonthra:student") ?? "Student Name");
  const [professorName, setProfessorName] = useState(window.localStorage.getItem("aeonthra:professor") ?? "Professor Name");
  const [universityName, setUniversityName] = useState(window.localStorage.getItem("aeonthra:university") ?? "University Name");
  const [focus, setFocus] = useState<FocusState>({ conceptId: null, related: new Set() });
  const [processing, setProcessing] = useState<ProcessingState | null>(null);
  const [shadowSettings, setShadowSettings] = useState<ShadowSettings>(() => loadShadowSettings());
  const [echoAnchors, setEchoAnchors] = useState(() => loadEchoAnchors());
  const [timeCapsules, setTimeCapsules] = useState(() => loadTimeCapsules());
  const [prismChoices, setPrismChoices] = useState<Record<string, Angle>>(() => loadPrismChoices());
  const [failureSeen, setFailureSeen] = useState<FailureSeenRecord[]>(() => loadFailureSeen());
  const [oracleHistory, setOracleHistory] = useState<OracleHistoryRecord[]>(() => loadOracleHistory());
  const [shadowItems, setShadowItems] = useState<AmbientItem[]>([]);
  const [recentEchoPassageIds, setRecentEchoPassageIds] = useState<number[]>([]);
  const [collisionHighlight, setCollisionHighlight] = useState<CollisionHighlight>(null);
  const [demoBannerDismissed, setDemoBannerDismissed] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textbookInputRef = useRef<HTMLInputElement | null>(null);
  const bridgeRequestModeRef = useRef<"auto" | "manual" | null>(null);
  const initialBridgeAttemptRef = useRef(false);

  const workspace = useMemo(() => (bundle && learning ? deriveWorkspace(bundle, learning, progress) : null), [bundle, learning, progress]);
  const interactions = useMemo(() => (bundle && learning && workspace ? createInteractionRuntime(bundle, learning, workspace.tasks, progress, shadowSettings) : null), [bundle, learning, progress, shadowSettings, workspace]);
  const selectedTask = useMemo(() => workspace?.tasks.find((task) => task.id === selectedTaskId) ?? null, [workspace, selectedTaskId]);
  const selectedChapter = useMemo(() => {
    if (!bundle || !learning || !workspace) return null;
    if (selectedTaskId) return chapterForTask(learning, bundle, selectedTaskId, progress);
    if (resumeSnapshot) return workspace.chapters.find((chapter) => chapter.id === resumeSnapshot.chapterId) ?? workspace.chapters[0] ?? null;
    return workspace.chapters[0] ?? null;
  }, [bundle, learning, progress, resumeSnapshot, selectedTaskId, workspace]);
  const forgeData = useMemo(() => (learning && selectedChapter ? createForgeSession(learning, selectedChapter) : null), [learning, selectedChapter]);
  const isDemoMode = bundle?.source === "demo";
  const shadowActive = shadowSettings.intensity !== "off";

  useEffect(() => { if (bundle) storeBundle(bundle); }, [bundle]);
  useEffect(() => { storeProgress(progress); }, [progress]);
  useEffect(() => { storeDrafts(drafts); }, [drafts]);
  useEffect(() => { storeShadowSettings(shadowSettings); }, [shadowSettings]);
  useEffect(() => { storeEchoAnchors(echoAnchors); }, [echoAnchors]);
  useEffect(() => { storeTimeCapsules(timeCapsules); }, [timeCapsules]);
  useEffect(() => { storePrismChoices(prismChoices); }, [prismChoices]);
  useEffect(() => { storeFailureSeen(failureSeen); }, [failureSeen]);
  useEffect(() => { storeOracleHistory(oracleHistory); }, [oracleHistory]);

  useEffect(() => {
    if (!bundle) {
      setLearning(null);
      setProcessing(null);
      return;
    }
    if (bundle.source === "demo") {
      setLearning(createDemoLearningBundle(bundle));
      setProcessing(null);
      return;
    }
    let cancelled = false;
    const charCount = bundle.items.reduce((sum, item) => sum + item.plainText.length, 0);
    setLearning(null);
    setProcessing({
      active: true,
      stage: "cleaning-source",
      progress: 0,
      hidden: false,
      charCount,
      error: null
    });

    getTextbookProcessor()
      .process(bundle, (stage, progressValue) => {
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
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        setStatus(error instanceof Error ? error.message : "Processing failed.");
        setProcessing((current) => current ? { ...current, active: false, error: error instanceof Error ? error.message : "Processing failed." } : current);
      });

    return () => {
      cancelled = true;
    };
  }, [bundle]);

  useEffect(() => {
    if (!learning || !isDemoMode) {
      return;
    }
    setProgress((current) => createDemoProgress(learning, current));
  }, [isDemoMode, learning]);

  useEffect(() => {
    window.localStorage.setItem("aeonthra:student", studentName);
    window.localStorage.setItem("aeonthra:professor", professorName);
    window.localStorage.setItem("aeonthra:university", universityName);
  }, [studentName, professorName, universityName]);

  useEffect(() => {
    return subscribeToBridgeMessages((message) => {
      if (message.type === "NF_PING") {
        respondToBridgePing();
        return;
      }
      if (message.type === "NF_PACK_READY") {
        setBundle(message.pack);
        setSurface("dashboard");
        setStatus(`Bundle imported: ${message.pack.title}`);
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
    const wantsDemo = params.get("demo") === "1" || hash.includes("demo");
    const wantsForge = params.get("mode") === "forge" || hash.includes("forge");
    if (!bundle && wantsDemo) {
      setBundle(createDemoBundle());
      setDemoBannerDismissed(false);
      setStatus("Demo forge ready.");
    }
    if (wantsForge) {
      setSurface("forge");
    }
  }, [bundle]);

  useEffect(() => {
    const duration = PHASES.find((phase) => phase.id === forgeState.phase)?.duration ?? 12;
    setSecondsRemaining(duration * 60);
    setRunning(false);
  }, [forgeState.phase]);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      setSecondsRemaining((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  useEffect(() => {
    if (!workspace || !learning) return;
    const totalItems = workspace.tasks.length + workspace.chapters.length + learning.concepts.length;
    const density = totalItems <= 10 ? 0.2 : totalItems <= 25 ? 0.4 : totalItems <= 50 ? 0.6 : totalItems <= 100 ? 0.8 : 1;
    document.documentElement.style.setProperty("--density", String(density));
    document.documentElement.style.setProperty("--space-multiplier", String(1.5 - density * 0.75));
    document.documentElement.style.setProperty("--card-min-width", `${320 - density * 80}px`);
    document.documentElement.style.setProperty("--font-scale", String(1.05 - density * 0.1));
  }, [learning, workspace]);

  useEffect(() => {
    if (!interactions || shadowSettings.intensity === "off") {
      setShadowItems([]);
      return;
    }
    interactions.ambient.setItems(interactions.shadowPool(surface, recentEchoPassageIds));
    interactions.ambient.setContext(surface);
    interactions.ambient.start((item) => {
      const snapshot: AmbientItem = {
        ...item,
        contextTags: [...item.contextTags],
        concepts: [...item.concepts]
      };
      setShadowItems((current) => {
        const deduped = current.filter((entry) => entry.passageId !== snapshot.passageId || entry.lastShownAt !== snapshot.lastShownAt);
        return [snapshot, ...deduped].slice(0, 5);
      });
    });
    return () => interactions.ambient.stop();
  }, [interactions, recentEchoPassageIds, shadowSettings.intensity, surface]);

  const importBundleFromFile = async (file: File) => {
    if (!acceptedJsonFile(file)) {
      setStatus("Choose a JSON capture bundle.");
      return;
    }
    const parsed = parseBundle(await file.text());
    if (!parsed) {
      setStatus("That file did not validate as a capture bundle.");
      return;
    }
    setBundle(parsed);
    setSurface("dashboard");
    setStatus(`Bundle imported: ${parsed.title}`);
  };

  const loadDemoMode = async () => {
    setStatus("Loading demo course...");
    setBundle(createDemoBundle());
    setDemoBannerDismissed(false);
    setSurface("dashboard");
    setStatus("Demo forge ready.");
  };

  const handleTextbookFile = async (file: File) => {
    const lower = file.name.toLowerCase();
    if (file.type === "application/pdf" || lower.endsWith(".pdf")) {
      setUploadState({ kind: "pdf", progress: 0, label: "Extracting PDF" });
      const { extractTextFromPdf } = await import("./lib/pdf-ingest");
      const extracted = await extractTextFromPdf(file, (page, total) => {
        setUploadState({ kind: "pdf", progress: total > 0 ? (page / total) * 100 : 0, label: `Extracting page ${page} of ${total}` });
      });
      const selectedText = extracted.chapters.map((chapter) => `${chapter.title}\n${chapter.text}`).join("\n\n");
      const nextBundle = createManualCaptureBundle({
        title: extracted.title,
        text: selectedText || extracted.text,
        kind: "document"
      });
      setBundle(nextBundle);
      setSurface("dashboard");
      setStatus(`PDF imported: ${extracted.title} (${extracted.totalPages} pages, ${extracted.chapters.length} sections detected).`);
      setUploadState(null);
      return;
    }

    if (file.type.startsWith("text/") || /\.(txt|text|md)$/i.test(file.name)) {
      setUploadState({ kind: "text", progress: 100, label: "Importing text file" });
      const text = await file.text();
      const nextBundle = createManualCaptureBundle({
        title: inferTextbookTitle(text) || file.name.replace(/\.[^.]+$/, ""),
        text,
        kind: "document"
      });
      setBundle(nextBundle);
      setSurface("dashboard");
      setStatus(`Text file imported: ${nextBundle.title}`);
      setUploadState(null);
      return;
    }

    setStatus("Choose a PDF, text file, or JSON bundle.");
  };

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await importBundleFromFile(file);
    event.target.value = "";
  };

  const handleTextbookUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
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
    if (!file) return;
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
    if (!pasteText.trim()) {
      setStatus("Paste textbook or source text first.");
      return;
    }
    const inferredTitle = pasteTitle.trim() || inferTextbookTitle(pasteText);
    const nextBundle = createManualCaptureBundle({ title: inferredTitle, text: pasteText, kind: "document" });
    setBundle(nextBundle);
    setSurface("dashboard");
    setStatus(`Textbook source queued: ${nextBundle.title}`);
  };

  const setConceptFocus = (conceptId: string | null) => {
    if (!learning || !conceptId) {
      setFocus({ conceptId: null, related: new Set() });
      return;
    }
    const related = new Set<string>([conceptId]);
    learning.relations.forEach((relation) => {
      if (relation.fromId === conceptId) related.add(relation.toId);
      if (relation.toId === conceptId) related.add(relation.fromId);
    });
    setSelectedConceptId(conceptId);
    setFocus({ conceptId, related });
    interactions?.state.broadcastFocus(surface, "concept", conceptId);
  };

  const saveEchoAnchor = (taskId: string, anchor: { passageId: number; text: string; source: string; citation: string; conceptIds: string[] }) => {
    setEchoAnchors((current) => ({
      ...current,
      [taskId]: [
        anchor as typeof current[string][number],
        ...(current[taskId] ?? []).filter((entry) => entry.passageId !== anchor.passageId)
      ].slice(0, 8)
    }));
  };

  const saveCapsule = (taskId: string, record: typeof timeCapsules[string]) => {
    setTimeCapsules((current) => ({ ...current, [taskId]: record }));
  };

  const updateCapsule = (taskId: string, patch: Partial<typeof timeCapsules[string]>) => {
    setTimeCapsules((current) => current[taskId] ? { ...current, [taskId]: { ...current[taskId], ...patch } } : current);
  };

  const nextForge = (completed = false) => {
    if (!forgeData || !selectedChapter) return;
    const order: ForgePhase[] = ["genesis", "forge", "crucible", "architect", "transcend"];
    const lengths: Record<ForgePhase, number> = {
      genesis: forgeState.modeIndex === 0 ? forgeData.genesis.dilemmas.length : forgeData.genesis.scan.length,
      forge: forgeState.modeIndex === 0 ? forgeData.forge.rapid.length : forgeData.forge.drill.length,
      crucible: forgeState.modeIndex === 0 ? forgeData.crucible.lies.length : forgeState.modeIndex === 1 ? forgeData.crucible.crossExam.length : forgeData.crucible.transfer.length,
      architect: forgeData.architect.teachBack.length,
      transcend: forgeData.transcend.boss.length
    };
    const modes: Record<ForgePhase, number> = { genesis: 2, forge: 2, crucible: 3, architect: 1, transcend: 1 };
    if (forgeState.promptIndex < lengths[forgeState.phase] - 1) {
      setForgeState((current) => ({ ...current, promptIndex: current.promptIndex + 1, selectedOption: null, revealed: false, flipped: false, learnFirst: false, confidence: null }));
      return;
    }
    if (forgeState.modeIndex < modes[forgeState.phase] - 1) {
      setForgeState((current) => ({ ...current, modeIndex: current.modeIndex + 1, promptIndex: 0, selectedOption: null, revealed: false, flipped: false, learnFirst: false, confidence: null }));
      return;
    }
    const nextIndex = order.indexOf(forgeState.phase) + 1;
    if (nextIndex >= order.length) {
      const nextMastery = { ...progress.conceptMastery };
      selectedChapter.conceptIds.forEach((id) => { nextMastery[id] = Math.max(nextMastery[id] ?? 0, completed ? 0.85 : 0.65); });
      setProgress((current) => ({ ...current, conceptMastery: nextMastery, chapterCompletion: { ...current.chapterCompletion, [selectedChapter.id]: 1 } }));
      storeForgeSession(null);
      setForgeState(forgeDefaults());
      setSurface(selectedTaskId ? "assignment" : "dashboard");
      return;
    }
    setForgeState((current) => ({
      ...current,
      phase: order[nextIndex]!,
      maxPhaseReached: order[Math.max(order.indexOf(current.maxPhaseReached), nextIndex)]!,
      modeIndex: 0,
      promptIndex: 0,
      selectedOption: null,
      revealed: false,
      flipped: false,
      learnFirst: false,
      confidence: null
    }));
  };

  if (!bundle) {
    return (
      <div className="app home-shell fade-in" onDrop={handleDrop} onDragOver={(event) => event.preventDefault()}>
        <div className="home-stack breath-shell">
          <Glow>AEONTHRA</Glow>
          <div className="hero-headline">IMPORT. FORGE. MASTER.</div>
          <p className="hero-subtitle">Your course. Your textbook. Your learning instrument.</p>
          <div className="home-grid grid-cards">
            <Card accent="cyan" className="input-card">
              <div>
                <div className="input-card__icon">📥</div>
                <div className="input-card__title">IMPORT CAPTURE</div>
                <p className="input-card__copy">Drop a JSON bundle from the extension or pull the queued handoff directly.</p>
              </div>
              <div className="action-row">
                <Button onClick={() => fileInputRef.current?.click()}>Choose File</Button>
                <Button variant="ghost" onClick={() => { bridgeRequestModeRef.current = "manual"; setStatus("Checking extension handoff..."); requestImportFromBridge(); }}>Pull Handoff</Button>
              </div>
              <div className="action-row">
                {status.toLowerCase().includes("checking") ? <Loader /> : null}
                <span className="muted">{status}</span>
              </div>
            </Card>
            <Card accent="teal" className="input-card">
              <div>
                <div className="input-card__icon">📖</div>
                <div className="input-card__title">UPLOAD TEXTBOOK</div>
                <p className="input-card__copy">Drop a PDF, import a text file, or paste textbook text to build a deterministic study run locally.</p>
              </div>
              {uploadState ? (
                <div className="stack-sm">
                  <div className="subtle">{uploadState.label}</div>
                  <div className="progress-shell">
                    <div className="progress-shell__bar">
                      <div className="progress-shell__fill" style={{ width: `${Math.max(uploadState.progress, 6)}%` }} />
                    </div>
                    <div className="mono subtle">{Math.round(uploadState.progress)}%</div>
                  </div>
                </div>
              ) : null}
              <input className="text-input" value={pasteTitle} onChange={(event) => setPasteTitle(event.target.value)} placeholder="Source title (optional)" />
              <textarea className="text-area" value={pasteText} onChange={(event) => setPasteText(event.target.value)} placeholder="Paste textbook text here..." />
              {pasteText.trim() ? <div className="subtle">Detected title: {pasteTitle.trim() || inferTextbookTitle(pasteText)}</div> : null}
              <div className="action-row">
                <Button variant="teal" onClick={handlePasteImport}>Upload</Button>
                <Button variant="ghost" onClick={() => textbookInputRef.current?.click()}>Choose PDF or Text</Button>
              </div>
            </Card>
          </div>
          <div className="eyebrow">or start fresh</div>
          <Button variant="ghost" onClick={() => void loadDemoMode()}>⚡ OPEN NEURAL FORGE DEMO</Button>
          <div className="foot-pill">Local-first | Zero API | Works offline | GitHub Pages ready</div>
          <input hidden ref={fileInputRef} type="file" accept="application/json" onChange={handleImportFile} />
          <input hidden ref={textbookInputRef} type="file" accept=".pdf,.txt,.text,.md" onChange={handleTextbookUpload} />
        </div>
      </div>
    );
  }

  if (!learning || !workspace) {
    const stage = processing ? STAGE_LABELS[processing.stage] : "Forging content";
    const largeTextbook = (processing?.charCount ?? 0) >= 200000;
    return (
      <div className="app workspace-shell fade-in view">
        <div className="topbar">
          <Glow className="topbar__brand">AEONTHRA</Glow>
          <div className="phase-dots">{PHASES.map((phase) => <span key={phase.id} className="dot" />)}</div>
          <div><div className="topbar__title">{bundle.title}</div><div className="eyebrow">{sourceHost(bundle)}</div></div>
          <div className="topbar__timer">
            {processing?.active ? <div className="processing-pill">Processing textbook... {Math.round(processing.progress)}%</div> : null}
          </div>
          <div className="action-row">
            <Button variant="ghost" onClick={() => setProcessing((current) => current ? { ...current, hidden: !current.hidden } : current)}>
              {processing?.hidden ? "Show Progress" : "Hide Progress"}
            </Button>
            <Button variant="ghost" onClick={() => { clearStoredBundle(); setBundle(null); setProcessing(null); }}>Reset</Button>
          </div>
        </div>
        {isDemoMode && !demoBannerDismissed ? (
          <div className="demo-banner">
            <span>Demo mode: exploring PHI 208. Import your own course to replace this workspace.</span>
            <button className="micro-button" type="button" onClick={() => setDemoBannerDismissed(true)}>Dismiss</button>
          </div>
        ) : null}
        <Card accent="cyan">
          <div className="eyebrow">FORGING CONTENT</div>
          <h3>{bundle.title}</h3>
          <p className="muted">The deterministic engine is processing your imported content in a background worker. You can hide the overlay and let the forge continue.</p>
          {largeTextbook ? (
            <div className="processing-note">
              This is a large textbook ({processing?.charCount.toLocaleString()} characters). Processing may take 30-60 seconds, but the interface will stay responsive while it runs.
            </div>
          ) : null}
        </Card>
        {processing && !processing.hidden ? (
          <div className="processing-overlay">
            <Card accent="teal" className="processing-modal">
              <div className="eyebrow">FORGING CONTENT</div>
              <h3>{stage}</h3>
              <div className="processing-orbit" />
              <div className="progress-shell">
                <div className="progress-shell__bar">
                  <div className="progress-shell__fill" style={{ width: `${Math.max(8, processing.progress)}%` }} />
                </div>
                <div className="mono subtle">{Math.round(processing.progress)}%</div>
              </div>
              <div className="subtle">Processing {processing.charCount.toLocaleString()} characters</div>
              {processing.error ? <div className="issue issue--red">{processing.error}</div> : null}
              <div className="action-row">
                <Button variant="ghost" onClick={() => setProcessing((current) => current ? { ...current, hidden: true } : current)}>Continue in background</Button>
              </div>
            </Card>
          </div>
        ) : null}
      </div>
    );
  }

  let surfaceKey: string = surface;
  let surfaceContent: JSX.Element | null = null;

  if (surface === "dashboard") {
    surfaceContent = (
      <div className="stack-lg">
        <MissionControl
          title={bundle.title}
          sourceHost={sourceHost(bundle)}
          learning={learning}
          progress={progress}
          tasks={workspace.tasks}
          sourceMatches={workspace.sourceMatches}
          weeks={workspace.weeks}
          focus={focus}
          onConceptHover={setConceptFocus}
          onOpenTask={(taskId) => { setSelectedTaskId(taskId); setSurface("assignment"); }}
          onOpenSurface={(next) => setSurface(next)}
        />
        <InteractionDeck
          hasAssignment={Boolean(selectedTask ?? workspace.tasks[0])}
          onOpenSurface={(next) => setSurface(next)}
          onOpenAssignment={() => {
            const task = selectedTask ?? workspace.tasks[0];
            if (!task) return;
            setSelectedTaskId(task.id);
            setSurface("assignment");
          }}
        />
      </div>
    );
  } else if (surface === "timeline") {
    surfaceContent = (
      <TimelineBoard
        weeks={workspace.weeks}
        tasks={workspace.tasks}
        focus={focus}
        onOpenTask={(taskId) => { setSelectedTaskId(taskId); setSurface("assignment"); }}
      />
    );
  } else if (surface === "concept-map") {
    surfaceContent = (
      <ConceptMapBoard
        learning={learning}
        progress={progress}
        focus={focus}
        selectedConceptId={selectedConceptId}
        onFocus={setConceptFocus}
        collisionHighlight={collisionHighlight}
      />
    );
  } else if (surface === "assignment" && selectedTask) {
    surfaceKey = `assignment:${selectedTask.id}`;
    surfaceContent = (
      <AssignmentWorkbench
        task={selectedTask}
        learning={learning}
        progress={progress}
        draft={drafts[selectedTask.id] ?? ""}
        onDraftChange={(value) => setDrafts((current) => ({ ...current, [selectedTask.id]: value }))}
        onStartForge={() => setSurface("forge")}
        chapter={selectedChapter}
        studentName={studentName}
        professorName={professorName}
        universityName={universityName}
        onStudentNameChange={setStudentName}
        onProfessorNameChange={setProfessorName}
        onUniversityNameChange={setUniversityName}
        novel={interactions && selectedTask ? {
          runtime: interactions,
          prismChoice: prismChoices[selectedTask.id] ?? null,
          echoAnchors: echoAnchors[selectedTask.id] ?? [],
          recentEchoPassageIds,
          capsule: timeCapsules[selectedTask.id] ?? null,
          failureSeen: failureSeen.filter((entry) => entry.taskId === selectedTask.id),
          onSavePrismChoice: (angle) => setPrismChoices((current) => ({ ...current, [selectedTask.id]: angle })),
          onAnchorEcho: (anchor) => saveEchoAnchor(selectedTask.id, anchor),
          onTrackEchoPassage: (passageId) => setRecentEchoPassageIds((current) => [passageId, ...current.filter((entry) => entry !== passageId)].slice(0, 12)),
          onSealCapsule: (record) => saveCapsule(selectedTask.id, record),
          onUpdateCapsule: (patch) => updateCapsule(selectedTask.id, patch),
          onMarkFailureSeen: (record) => setFailureSeen((current) => [record, ...current.filter((entry) => !(entry.taskId === record.taskId && entry.failureMode === record.failureMode))].slice(0, 60))
        } : null}
      />
    );
  } else if (surface === "forge" && forgeData) {
    surfaceContent = (
      <ForgeStudio
        data={forgeData}
        state={forgeState}
        running={running}
        secondsRemaining={secondsRemaining}
        onToggleTimer={() => setRunning((value) => !value)}
        onReveal={() => setForgeState((current) => ({ ...current, revealed: true, flipped: true }))}
        onFlip={() => setForgeState((current) => ({ ...current, flipped: !current.flipped }))}
        onLearnFirst={() => setForgeState((current) => ({ ...current, learnFirst: !current.learnFirst }))}
        onAnswer={(question, answerIndex) => {
          const correct = answerIndex === question.correctIndex;
          setForgeState((current) => ({ ...current, selectedOption: answerIndex, revealed: true, score: { correct: current.score.correct + (correct ? 1 : 0), wrong: current.score.wrong + (correct ? 0 : 1) } }));
          setProgress((current) => ({
            ...current,
            conceptMastery: { ...current.conceptMastery, [question.conceptId]: Math.max(0, Math.min(1, (current.conceptMastery[question.conceptId] ?? 0.2) + (correct ? 0.12 : 0.03))) }
          }));
        }}
        onSelectOption={(value) => setForgeState((current) => ({ ...current, selectedOption: value }))}
        onConfidence={(value) => setForgeState((current) => ({ ...current, confidence: value }))}
        onTeachBack={(id, value) => setForgeState((current) => ({ ...current, teachBack: { ...current.teachBack, [id]: value } }))}
        onAdvance={nextForge}
        onExportSummary={() => exportForgeSummaryMarkdown(forgeData, progress, forgeState.score)}
        onPhaseSelect={(phase) => setForgeState((current) => {
          const currentIndex = PHASES.findIndex((entry) => entry.id === current.maxPhaseReached);
          const requestedIndex = PHASES.findIndex((entry) => entry.id === phase);
          if (requestedIndex > currentIndex) {
            return current;
          }
          return { ...current, phase, modeIndex: 0, promptIndex: 0, selectedOption: null, revealed: false, flipped: false, learnFirst: false, confidence: null };
        })}
      />
    );
  } else if (surface === "oracle" && interactions) {
    surfaceContent = (
      <OraclePanel
        thinkers={interactions.thinkerRoster}
        onAsk={(question) => {
          const panel = interactions.oracle(question);
          const nextHistory = Object.entries(panel.responses).map(([thinker, response]) => ({
            question,
            thinker,
            response: response.text,
            askedAt: Date.now()
          }));
          setOracleHistory((current) => [...nextHistory, ...current].slice(0, 40));
          return panel;
        }}
      />
    );
  } else if (surface === "gravity" && interactions) {
    surfaceContent = (
      <GravityFieldBoard
        concepts={interactions.gravityModel().conceptNodes}
        assignments={interactions.gravityModel().assignmentNodes}
        onPractice={(conceptId) => {
          setConceptFocus(conceptId);
          setSurface("forge");
        }}
      />
    );
  } else if (surface === "collision" && interactions) {
    surfaceContent = (
      <CollisionLab
        learning={learning}
        onCollide={(leftConceptId, rightConceptId) => {
          const report = interactions.collisionReport(leftConceptId, rightConceptId);
          if (report) {
            setCollisionHighlight({ fromId: leftConceptId, toId: rightConceptId, label: report.tensions[0]?.dimension ?? "Collision" });
          }
          return report;
        }}
      />
    );
  } else if (surface === "duel" && interactions) {
    surfaceContent = (
      <DuelArena
        learning={learning}
        oracleMemory={oracleHistory}
        onBuildRounds={(leftConceptId, rightConceptId) => interactions.duel(leftConceptId, rightConceptId)}
      />
    );
  }

  return (
    <div className={`app workspace-shell fade-in view ${shadowActive ? "workspace-shell--shadowed" : ""}`.trim()}>
      <div className="topbar">
        <Glow className="topbar__brand">AEONTHRA</Glow>
        <div className="phase-dots">{PHASES.map((phase) => <span key={phase.id} className={surface === "forge" && phase.id === forgeState.phase ? "dot active" : "dot"} />)}</div>
        <div><div className="topbar__title">{bundle.title}</div><div className="eyebrow">{sourceHost(bundle)}</div></div>
        <div className="topbar__timer"><Timer seconds={surface === "forge" ? secondsRemaining : 0} /></div>
        <div className="action-row">
          <Button variant="ghost" onClick={() => setProgress((current) => ({ ...current, practiceMode: !current.practiceMode }))}>{progress.practiceMode ? "Practice Mode On" : "Practice Mode Off"}</Button>
          <Button variant="ghost" onClick={() => { clearStoredBundle(); setBundle(null); setProcessing(null); }}>Reset</Button>
        </div>
      </div>
      {isDemoMode && !demoBannerDismissed ? (
        <div className="demo-banner">
          <span>Demo mode: exploring PHI 208. Import your own course to replace this workspace.</span>
          <button className="micro-button" type="button" onClick={() => setDemoBannerDismissed(true)}>Dismiss</button>
        </div>
      ) : null}

      <div className="surface-tabs">
        {(["dashboard", "timeline", "concept-map", "forge", "oracle", "gravity", "collision", "duel"] as Surface[]).map((entry) => (
          <motion.button key={entry} layout className={`surface-tab ${surface === entry ? "surface-tab--active" : ""}`} onClick={() => setSurface(entry)}>
            {entry === "concept-map" ? "CONCEPT MAP" : entry === "oracle" ? "ORACLE" : entry === "gravity" ? "GRAVITY FIELD" : entry === "collision" ? "COLLISION LAB" : entry === "duel" ? "DUEL ARENA" : entry.toUpperCase()}
          </motion.button>
        ))}
        {selectedTask ? <motion.button layout className={`surface-tab ${surface === "assignment" ? "surface-tab--active" : ""}`} onClick={() => setSurface("assignment")}>ASSIGNMENT</motion.button> : null}
      </div>

      {surfaceContent ? (
        <motion.div key={surfaceKey} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          {surfaceContent}
        </motion.div>
      ) : null}

      {shadowSettings.intensity !== "off" ? (
        <ShadowReaderRail
          items={shadowItems}
          seen={interactions?.ambient.getFamiliarityStats().seen ?? 0}
          familiar={interactions?.ambient.getFamiliarityStats().familiar ?? 0}
          settings={shadowSettings}
          onSettingsChange={setShadowSettings}
          onAnchor={(item) => {
            const targetTask = selectedTask ?? workspace.tasks[0];
            if (!targetTask) return;
            saveEchoAnchor(targetTask.id, {
              passageId: item.passageId ?? -1,
              text: item.content,
              source: item.source,
              citation: `(Course Text, ${item.source.split(" p. ")[1] ? `p. ${item.source.split(" p. ")[1]}` : "source"})`,
              conceptIds: item.concepts
            });
          }}
        />
      ) : null}

      <input hidden ref={fileInputRef} type="file" accept="application/json" onChange={handleImportFile} />
    </div>
  );
}
