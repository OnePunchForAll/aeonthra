import { useDeferredValue, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import type { AssignmentRequirement, Citation, Concept, MemoryStage, PracticeQuestion, SourceDoc, Workspace } from "./types";

// Spaced-repetition interval ladder in days. A correct answer steps forward,
// a missed one resets to 1d. Research report recommends 1/3/7/14/30; I keep
// those exact values so the behavior matches published SRS heuristics.
const SRS_INTERVALS_DAYS = [1, 3, 7, 14, 30];
const DAY_MS = 86_400_000;

function scheduleNextReview(stepCurrent: number, correct: boolean): { step: number; nextDueAt: number } {
  const nextStep = correct ? Math.min(stepCurrent + 1, SRS_INTERVALS_DAYS.length - 1) : 0;
  return { step: nextStep, nextDueAt: Date.now() + SRS_INTERVALS_DAYS[nextStep]! * DAY_MS };
}
import { analyze, computeStreak, conceptDescribingText, detectThesis, dueConcepts, extractRequirements, findInText, generateDistinctionPairs, generateFlashcards, generateQuestions, generateSleuthPrompts, memoryStage, memoryStageLabel, practicedToday, readingStats, scoreTeachback, searchConcepts, thesisHint } from "./engine";
import type { Flashcard, SleuthPrompt, TeachbackScore } from "./engine";

type PracticeKind = "quiz" | "flashcards" | "teachback" | "sleuth";
import { sourceFromDocx, sourceFromHtml, sourceFromJson, sourceFromPdf, sourceFromText } from "./extract";
import { exportConceptAsTxt, exportWorkspaceJson, formatCitationForInsert, loadNotesFromTxt, saveNotesAsMarkdown, saveNotesAsTxt } from "./notes";
import { emptyWorkspace, loadWorkspace, saveWorkspace, stableHash } from "./storage";

const DIRECT_QUOTE_MAX = 3;
const PARAPHRASE_MAX = 2;

type View = "home" | "ingest" | "read" | "concepts" | "study" | "gym" | "notes";

type Toast = { kind: "good" | "warn"; text: string } | null;

export function App() {
  const [workspace, setWorkspace] = useState<Workspace>(loadWorkspace);
  const [view, setView] = useState<View>(() => {
    const loaded = loadWorkspace();
    return loaded.sources.length === 0 ? "home" : "home";
  });
  const [ingestTab, setIngestTab] = useState<"paste" | "upload" | "url" | "json">("paste");
  const [analyzeStage, setAnalyzeStage] = useState<string | null>(null);
  const [conceptQuery, setConceptQuery] = useState("");
  const [conceptFilterStage, setConceptFilterStage] = useState<MemoryStage | "all">("all");
  const [conceptSort, setConceptSort] = useState<"score" | "weakest" | "alpha">("score");
  const [readerFindQuery, setReaderFindQuery] = useState("");
  const [readerSepia, setReaderSepia] = useState(false);
  const [gymIdx, setGymIdx] = useState(0);
  const [gymPicked, setGymPicked] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [theme, setTheme] = useState<string>(() => localStorage.getItem("aeonthra-lite:theme") ?? "cyberpunk");
  const [accent, setAccent] = useState<string>(() => localStorage.getItem("aeonthra-lite:accent") ?? "default");
  const [density, setDensity] = useState<string>(() => localStorage.getItem("aeonthra-lite:density") ?? "comfy");
  const [readingFont, setReadingFont] = useState<string>(() => localStorage.getItem("aeonthra-lite:reading-font") ?? "serif");
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "cyberpunk") root.removeAttribute("data-theme"); else root.setAttribute("data-theme", theme);
    if (accent === "default") root.removeAttribute("data-accent"); else root.setAttribute("data-accent", accent);
    if (density === "comfy") root.removeAttribute("data-density"); else root.setAttribute("data-density", density);
    if (readingFont === "serif") root.removeAttribute("data-reading-font"); else root.setAttribute("data-reading-font", readingFont);
    localStorage.setItem("aeonthra-lite:theme", theme);
    localStorage.setItem("aeonthra-lite:accent", accent);
    localStorage.setItem("aeonthra-lite:density", density);
    localStorage.setItem("aeonthra-lite:reading-font", readingFont);
  }, [theme, accent, density, readingFont]);
  // Session mode — a focused N-question drill with a completion summary so the
  // user actually feels they finished something, not just "looked at study view".
  const [session, setSession] = useState<{
    size: number;
    answered: number;
    correct: number;
    startedAt: number;
  } | null>(null);
  const [pasteTitle, setPasteTitle] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [urlTitle, setUrlTitle] = useState("");
  const [urlValue, setUrlValue] = useState("");
  const [urlHtml, setUrlHtml] = useState("");
  const [toast, setToast] = useState<Toast>(null);
  const [pdfProgress, setPdfProgress] = useState<{ label: string; progress: number } | null>(null);
  const [runningAnalyze, setRunningAnalyze] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const jsonRef = useRef<HTMLInputElement | null>(null);
  const [activeNoteScope, setActiveNoteScope] = useState<string>("__all__");
  const [practiceIdx, setPracticeIdx] = useState(0);
  const [practicePicked, setPracticePicked] = useState<string | null>(null);
  const [practiceKind, setPracticeKind] = useState<PracticeKind>("quiz");
  // Flashcards state
  const [flashRevealed, setFlashRevealed] = useState<boolean>(false);
  const [flashHintShown, setFlashHintShown] = useState<boolean>(false);
  // Teach-back state
  const [teachbackText, setTeachbackText] = useState<string>("");
  const [teachbackScore, setTeachbackScoreState] = useState<TeachbackScore | null>(null);
  // Source sleuth state
  const [sleuthPicked, setSleuthPicked] = useState<string | null>(null);
  const [expandedSourceId, setExpandedSourceId] = useState<string | null>(null);
  const [readerSourceId, setReaderSourceId] = useState<string | null>(null);
  const [readerFontScale, setReaderFontScale] = useState<number>(1);
  const [readerFocusConceptId, setReaderFocusConceptId] = useState<string | null>(null);
  const [studyMode, setStudyMode] = useState<"weakest" | "sequence">("weakest");
  const excludedSourceIds = workspace.excludedSourceIds ?? [];
  const isExcluded = (id: string) => excludedSourceIds.includes(id);
  const activeSources = useMemo(
    () => workspace.sources.filter((source) => !isExcluded(source.id)),
    [workspace.sources, excludedSourceIds]
  );

  useEffect(() => {
    saveWorkspace(workspace);
  }, [workspace]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (readerSourceId && !workspace.sources.some((source) => source.id === readerSourceId)) {
      setReaderSourceId(null);
      setReaderFocusConceptId(null);
    }
  }, [workspace.sources, readerSourceId]);

  useEffect(() => {
    const onKeydown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isInput = target && /^(INPUT|TEXTAREA|SELECT)$/i.test(target.tagName);
      // Command palette — global, works even inside inputs (Ctrl/Cmd+K is universal).
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((prev) => !prev);
        return;
      }
      if (event.key === "Escape") {
        if (paletteOpen) { setPaletteOpen(false); return; }
        if (helpOpen) { setHelpOpen(false); return; }
        if (settingsOpen) { setSettingsOpen(false); return; }
      }
      if ((event.metaKey || event.ctrlKey) && event.key === ",") {
        event.preventDefault();
        setSettingsOpen((prev) => !prev);
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isInput) {
        // Reader find bar: Enter advances to next match, Esc clears.
        if (target?.closest(".find-bar")) {
          if (event.key === "Enter") {
            event.preventDefault();
            window.dispatchEvent(new CustomEvent("aeonthra:find-next", { detail: { reverse: event.shiftKey } }));
          }
          if (event.key === "Escape") {
            setReaderFindQuery("");
            (target as HTMLInputElement).blur();
          }
        }
        return;
      }
      // Help overlay
      if (event.key === "?") {
        event.preventDefault();
        setHelpOpen(true);
        return;
      }
      // View shortcuts
      if (event.key === "0") { setView("home"); return; }
      if (event.key === "1") { setView("ingest"); return; }
      if (event.key === "2" && workspace.sources.length > 0) { setView("read"); return; }
      if (event.key === "3") { setView("concepts"); return; }
      if (event.key === "4" && (workspace.analysis?.concepts.length ?? 0) > 0) { setView("study"); return; }
      if (event.key === "5" && (workspace.analysis?.concepts.length ?? 0) >= 2) { setView("gym"); return; }
      if (event.key === "6") { setView("notes"); return; }
      // View-specific shortcuts
      if (view === "study" || view === "gym") {
        const map: Record<string, number> = { a: 0, b: 1, c: 2, d: 3, "1": 0, "2": 1, "3": 2, "4": 3 };
        const key = event.key.toLowerCase();
        if (key in map) {
          event.preventDefault();
          window.dispatchEvent(new CustomEvent("aeonthra:answer-pick", { detail: { index: map[key] } }));
        }
        if (event.key === " " || event.key === "Enter") {
          event.preventDefault();
          window.dispatchEvent(new CustomEvent("aeonthra:answer-next"));
        }
        if (event.key === "?" || event.key.toLowerCase() === "h") {
          event.preventDefault();
          window.dispatchEvent(new CustomEvent("aeonthra:answer-idk"));
        }
      }
      if (view === "read") {
        if (event.key === "/" ) {
          event.preventDefault();
          const findInput = document.querySelector(".find-bar input") as HTMLInputElement | null;
          findInput?.focus();
        }
      }
    };
    window.addEventListener("keydown", onKeydown);
    return () => window.removeEventListener("keydown", onKeydown);
  }, [view, workspace.sources.length, workspace.analysis?.concepts.length, paletteOpen, helpOpen, settingsOpen]);

  const concepts = workspace.analysis?.concepts ?? [];
  const generatedQuestions = useMemo<PracticeQuestion[]>(
    () => generateQuestions(concepts, 1, 12),
    [concepts]
  );
  const questions = useMemo<PracticeQuestion[]>(() => {
    if (studyMode !== "weakest" || generatedQuestions.length === 0) return generatedQuestions;
    // Weakness ranking — lowest value is studied first.
    // 1. Unseen concepts always come first (record === undefined).
    // 2. Then concepts past their nextDueAt (due for review).
    // 3. Then sorted by net (correct − missed) ascending so most-struggled come next.
    // 4. Future-due concepts come last regardless of mastery.
    const now = Date.now();
    const weakness = (conceptId: string) => {
      const record = workspace.mastery[conceptId];
      if (!record) return -1_000_000; // unseen → highest priority
      const net = record.correct - record.missed;
      const due = record.nextDueAt ?? 0;
      if (due > 0 && due > now) return 1_000_000 - net; // not yet due → deprioritize
      return net - (now - record.lastSeen) / (1000 * 60 * 60 * 24 * 14);
    };
    return [...generatedQuestions].sort((left, right) => weakness(left.conceptId) - weakness(right.conceptId));
  }, [generatedQuestions, studyMode, workspace.mastery]);
  const activeQuestion = questions[practiceIdx] ?? null;

  const upsertSource = (source: SourceDoc) => {
    setWorkspace((current) => {
      const existing = current.sources.findIndex((entry) => entry.id === source.id);
      const nextSources = existing >= 0
        ? current.sources.map((entry, index) => (index === existing ? source : entry))
        : [...current.sources, source];
      return { ...current, sources: nextSources, analysis: null };
    });
    setToast({ kind: "good", text: `Added: ${source.title}` });
  };

  const removeSource = (id: string) => {
    setWorkspace((current) => {
      const nextNotes = { ...current.notesByScope };
      delete nextNotes[id];
      const nextExcluded = (current.excludedSourceIds ?? []).filter((entry) => entry !== id);
      const nextCitations = (current.citations ?? []).filter((entry) => entry.sourceId !== id && entry.scope !== id);
      return {
        ...current,
        sources: current.sources.filter((source) => source.id !== id),
        analysis: null,
        notesByScope: nextNotes,
        excludedSourceIds: nextExcluded,
        citations: nextCitations
      };
    });
  };

  const runAnalyze = () => {
    if (activeSources.length === 0) {
      setToast({ kind: "warn", text: workspace.sources.length === 0 ? "Add at least one source first." : "All sources are excluded. Include at least one." });
      return;
    }
    setRunningAnalyze(true);
    setAnalyzeStage("Normalizing sources…");
    window.setTimeout(() => {
      setAnalyzeStage("Admitting concepts through truth gates…");
      window.setTimeout(() => {
        setAnalyzeStage("Building evidence lanes…");
        window.setTimeout(() => {
          setAnalyzeStage("Cross-linking sources…");
          window.setTimeout(() => {
            try {
              const result = analyze(activeSources);
              setWorkspace((current) => ({ ...current, analysis: result }));
              setView("concepts");
              setToast({ kind: "good", text: `Found ${result.concepts.length} concepts · hash ${result.deterministicHash.slice(0, 8)}` });
            } catch (error) {
              setToast({ kind: "warn", text: error instanceof Error ? error.message : "Analyze failed" });
            } finally {
              setRunningAnalyze(false);
              setAnalyzeStage(null);
            }
          }, 40);
        }, 120);
      }, 140);
    }, 60);
  };

  const toggleExcluded = (id: string) => {
    setWorkspace((current) => {
      const excluded = new Set(current.excludedSourceIds ?? []);
      if (excluded.has(id)) excluded.delete(id); else excluded.add(id);
      return { ...current, excludedSourceIds: [...excluded], analysis: null };
    });
  };

  const addCitation = (input: Omit<Citation, "id" | "pickedAt">) => {
    const citations = workspace.citations ?? [];
    const direct = citations.filter((entry) => entry.kind === "direct").length;
    const paraphrase = citations.filter((entry) => entry.kind === "paraphrase").length;
    if (input.kind === "direct" && direct >= DIRECT_QUOTE_MAX) {
      setToast({ kind: "warn", text: `Direct-quote budget used (${DIRECT_QUOTE_MAX}). Remove one first.` });
      return;
    }
    if (input.kind === "paraphrase" && paraphrase >= PARAPHRASE_MAX) {
      setToast({ kind: "warn", text: `Paraphrase budget used (${PARAPHRASE_MAX}). Remove one first.` });
      return;
    }
    if (citations.some((entry) => entry.sourceId === input.sourceId && entry.sentence === input.sentence && entry.kind === input.kind)) {
      setToast({ kind: "warn", text: "Already picked." });
      return;
    }
    const citation: Citation = {
      ...input,
      id: `cite-${stableHash(`${input.sourceId}:${input.sentence}:${input.kind}:${Date.now()}`).slice(0, 10)}`,
      pickedAt: Date.now()
    };
    setWorkspace((current) => ({ ...current, citations: [...(current.citations ?? []), citation] }));
    setToast({ kind: "good", text: `${input.kind === "direct" ? "Direct quote" : "Paraphrase"} picked (${(input.kind === "direct" ? direct : paraphrase) + 1}/${input.kind === "direct" ? DIRECT_QUOTE_MAX : PARAPHRASE_MAX}).` });
  };

  const removeCitation = (id: string) => {
    setWorkspace((current) => ({ ...current, citations: (current.citations ?? []).filter((entry) => entry.id !== id) }));
  };

  const openInReader = (sourceId: string, conceptId?: string) => {
    setReaderSourceId(sourceId);
    setReaderFocusConceptId(conceptId ?? null);
    setView("read");
  };

  const addPaste = () => {
    if (!pasteText.trim()) {
      setToast({ kind: "warn", text: "Paste some text first." });
      return;
    }
    upsertSource(sourceFromText(pasteTitle, pasteText, "paste"));
    setPasteText("");
    setPasteTitle("");
  };

  const addUrlHtml = () => {
    if (!urlHtml.trim()) {
      setToast({ kind: "warn", text: "Paste the page HTML first." });
      return;
    }
    try {
      const source = sourceFromHtml(urlTitle, urlHtml, urlValue.trim() || undefined);
      upsertSource(source);
      setUrlHtml("");
      setUrlTitle("");
      setUrlValue("");
    } catch (error) {
      setToast({ kind: "warn", text: error instanceof Error ? error.message : "HTML import failed" });
    }
  };

  const handleFile = async (file: File) => {
    const lower = file.name.toLowerCase();
    try {
      if (file.type === "application/json" || lower.endsWith(".json")) {
        const raw = await file.text();
        const sources = sourceFromJson(raw);
        sources.forEach(upsertSource);
        return;
      }
      if (file.type === "application/pdf" || lower.endsWith(".pdf")) {
        setPdfProgress({ label: "Loading PDF", progress: 2 });
        const source = await sourceFromPdf(file, (page, total) => {
          setPdfProgress({ label: `Extracting page ${page} of ${total}`, progress: total > 0 ? (page / total) * 100 : 100 });
        });
        upsertSource(source);
        setPdfProgress(null);
        return;
      }
      if (lower.endsWith(".docx") || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        setPdfProgress({ label: "Extracting DOCX", progress: 40 });
        const source = await sourceFromDocx(file);
        upsertSource(source);
        setPdfProgress(null);
        return;
      }
      if (file.type.startsWith("text/") || lower.endsWith(".txt") || lower.endsWith(".md")) {
        const text = await file.text();
        upsertSource(sourceFromText(file.name.replace(/\.(txt|md)$/i, ""), text, "txt"));
        return;
      }
      if (lower.endsWith(".html") || lower.endsWith(".htm") || file.type === "text/html") {
        const text = await file.text();
        upsertSource(sourceFromHtml(file.name.replace(/\.html?$/i, ""), text));
        return;
      }
      setToast({ kind: "warn", text: "Unsupported file type." });
    } catch (error) {
      setPdfProgress(null);
      setToast({ kind: "warn", text: error instanceof Error ? error.message : "File import failed" });
    }
  };

  const onFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      await handleFile(file);
    } finally {
      event.target.value = "";
    }
  };

  const onJsonChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const raw = await file.text();
      const sources = sourceFromJson(raw);
      sources.forEach(upsertSource);
    } catch (error) {
      setToast({ kind: "warn", text: error instanceof Error ? error.message : "JSON import failed" });
    } finally {
      event.target.value = "";
    }
  };

  const recordAnswer = (question: PracticeQuestion, correct: boolean) => {
    // If a session is active, increment its counters.
    if (session) {
      setSession((prev) => prev ? { ...prev, answered: prev.answered + 1, correct: prev.correct + (correct ? 1 : 0) } : prev);
    }
    setWorkspace((current) => {
      const prev = current.mastery[question.conceptId] ?? { correct: 0, missed: 0, lastSeen: 0, intervalStep: 0 };
      const schedule = scheduleNextReview(prev.intervalStep ?? 0, correct);
      const prevStats = current.questionStats?.[question.id] ?? { shown: 0, correct: 0, missed: 0 };
      return {
        ...current,
        mastery: {
          ...current.mastery,
          [question.conceptId]: {
            correct: prev.correct + (correct ? 1 : 0),
            missed: prev.missed + (correct ? 0 : 1),
            lastSeen: Date.now(),
            intervalStep: schedule.step,
            nextDueAt: schedule.nextDueAt
          }
        },
        questionStats: {
          ...(current.questionStats ?? {}),
          [question.id]: {
            shown: prevStats.shown + 1,
            correct: prevStats.correct + (correct ? 1 : 0),
            missed: prevStats.missed + (correct ? 0 : 1)
          }
        }
      };
    });
  };

  return (
    <div className="page">
      <header className="header">
        <div className="brand">
          AEONTHRA LITE
          <small>Deterministic study workspace — v0.1</small>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="ghost icon-btn" onClick={() => setSettingsOpen(true)} title="Settings · theme, density, fonts" aria-label="Open settings">
            ⚙
          </button>
        </div>
      </header>

      <nav className="nav">
        <button className={view === "home" ? "active" : ""} onClick={() => setView("home")} title="Home · shortcut 0">⌂ Home</button>
        <button className={view === "ingest" ? "active" : ""} onClick={() => setView("ingest")} title="Ingest · shortcut 1">1. Ingest {workspace.sources.length > 0 && <span style={{ opacity: 0.6, fontWeight: 400 }}>({activeSources.length}/{workspace.sources.length})</span>}</button>
        <button className={view === "read" ? "active" : ""} onClick={() => setView("read")} disabled={workspace.sources.length === 0} title="Read · shortcut 2">2. Read</button>
        <button className={view === "concepts" ? "active" : ""} onClick={() => setView("concepts")} title="Concepts · shortcut 3">3. Concepts {concepts.length > 0 && <span style={{ opacity: 0.6, fontWeight: 400 }}>({concepts.length})</span>}</button>
        <button className={view === "study" ? "active" : ""} onClick={() => setView("study")} disabled={concepts.length === 0} title="Study · shortcut 4">4. Study</button>
        <button className={view === "gym" ? "active" : ""} onClick={() => setView("gym")} disabled={concepts.length < 2} title="Distinction Gym · shortcut 5">5. Gym</button>
        <button className={view === "notes" ? "active" : ""} onClick={() => setView("notes")} title="Notes · shortcut 6">6. Notes</button>
      </nav>

      {view === "home" ? (
        <HomeView
          workspace={workspace}
          activeSources={activeSources}
          onNavigate={setView}
          onOpenReader={openInReader}
          onStartQuickSession={(size) => {
            setStudyMode("weakest");
            setPracticeIdx(0);
            setPracticePicked(null);
            setSession({ size, answered: 0, correct: 0, startedAt: Date.now() });
            setView("study");
          }}
          onLaunchGym={() => {
            setGymIdx(0);
            setGymPicked(null);
            setView("gym");
          }}
          onLaunchDeepRead={() => {
            const largest = [...activeSources].sort((a, b) => b.text.length - a.text.length)[0];
            if (largest) {
              setReaderSourceId(largest.id);
              setReaderFocusConceptId(null);
            }
            setView("read");
          }}
        />
      ) : null}

      {view === "ingest" ? (
        <div className="grid grid-2">
          <section className="card">
            <h2 style={{ margin: "0 0 4px" }}>Add sources</h2>
            <p className="muted" style={{ marginTop: 0 }}>Paste, upload, or import. All processing is local — nothing leaves your browser.</p>

            <div className="ingest-tabs">
              <button className={ingestTab === "paste" ? "active" : ""} onClick={() => setIngestTab("paste")}>✍ Paste</button>
              <button className={ingestTab === "upload" ? "active" : ""} onClick={() => setIngestTab("upload")}>📂 Upload</button>
              <button className={ingestTab === "url" ? "active" : ""} onClick={() => setIngestTab("url")}>🌐 URL / HTML</button>
              <button className={ingestTab === "json" ? "active" : ""} onClick={() => setIngestTab("json")}>🧩 Extension JSON</button>
            </div>

            {ingestTab === "paste" ? (
              <>
                <input value={pasteTitle} onChange={(event) => setPasteTitle(event.target.value)} placeholder="Title (optional)" />
                <textarea value={pasteText} onChange={(event) => setPasteText(event.target.value)} placeholder="Paste raw text, markdown, or lecture notes…" style={{ marginTop: 8, minHeight: 220 }} />
                <div style={{ display: "flex", gap: 10, marginTop: 10, alignItems: "center" }}>
                  <button className="primary" onClick={addPaste} disabled={!pasteText.trim()}>Add Pasted Source</button>
                  <span className="muted" style={{ fontSize: ".78rem" }}>{pasteText.length.toLocaleString()} chars</span>
                </div>
              </>
            ) : null}

            {ingestTab === "upload" ? (
              <>
                <input ref={fileRef} type="file" accept=".pdf,.docx,.txt,.md,.html,.htm,.json,text/*,application/pdf,application/json,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={onFileChange} />
                <p className="muted" style={{ fontSize: ".82rem", marginTop: 10, lineHeight: 1.6 }}>
                  Supported: <span className="kbd">.pdf</span> <span className="kbd">.docx</span> <span className="kbd">.txt</span> <span className="kbd">.md</span> <span className="kbd">.html</span> <span className="kbd">.json</span><br />
                  DOCX via <span className="kbd">mammoth</span>, HTML cleaned with <span className="kbd">Readability</span>, PDF via <span className="kbd">pdf.js</span>.
                </p>
                {pdfProgress ? (
                  <div style={{ marginTop: 10 }}>
                    <div className="muted" style={{ fontSize: ".85rem", marginBottom: 4 }}>{pdfProgress.label}</div>
                    <div className="progress"><div style={{ width: `${Math.max(pdfProgress.progress, 4)}%` }} /></div>
                  </div>
                ) : null}
              </>
            ) : null}

            {ingestTab === "url" ? (
              <>
                <input value={urlTitle} onChange={(event) => setUrlTitle(event.target.value)} placeholder="Title (optional)" />
                <input value={urlValue} onChange={(event) => setUrlValue(event.target.value)} placeholder="Source URL (optional)" style={{ marginTop: 8 }} />
                <textarea value={urlHtml} onChange={(event) => setUrlHtml(event.target.value)} placeholder="Paste the full HTML of the page (right-click → View Source)…" style={{ marginTop: 8, minHeight: 200 }} />
                <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                  <button className="violet" onClick={addUrlHtml} disabled={!urlHtml.trim()}>Add Page from HTML</button>
                </div>
              </>
            ) : null}

            {ingestTab === "json" ? (
              <>
                <p className="muted" style={{ fontSize: ".85rem", marginTop: 0 }}>Accepts the JSON exported by the AEONTHRA extension (page dump or capture bundle).</p>
                <input ref={jsonRef} type="file" accept=".json,application/json" onChange={onJsonChange} />
              </>
            ) : null}
          </section>

          <section className="card">
            <h2 style={{ margin: "0 0 4px" }}>
              Loaded sources
              <span className="muted" style={{ fontWeight: 400, fontSize: ".85rem", marginLeft: 8 }}>
                {activeSources.length} active{excludedSourceIds.length > 0 ? ` · ${excludedSourceIds.length} excluded` : ""}
              </span>
            </h2>
            <p className="muted" style={{ marginTop: 0, fontSize: ".82rem" }}>
              Click a source to preview. Exclude junk pages before analyzing — the engine will skip them and the deterministic hash will reflect only what you kept.
            </p>
            {workspace.sources.length === 0 ? (
              <p className="muted">No sources yet. Add at least one, then click <span className="kbd">Analyze</span>.</p>
            ) : (
              <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                {workspace.sources.map((source) => {
                  const excluded = isExcluded(source.id);
                  const isOpen = expandedSourceId === source.id;
                  const preview = (source.readerText || source.text).slice(0, 600);
                  return (
                    <div key={source.id} className={`source-row ${excluded ? "excluded" : ""}`} style={{ flexDirection: "column", alignItems: "stretch" }}>
                      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                        <span className={`tag ${source.kind === "canvas" ? "good" : source.kind === "generic-page" ? "violet" : source.kind === "pdf" ? "warn" : "muted"}`}>{source.kind}</span>
                        <button
                          className="ghost source-row-btn"
                          style={{ flex: 1, textAlign: "left", padding: "6px 10px", border: "none", background: "transparent", minWidth: 0 }}
                          onClick={() => setExpandedSourceId(isOpen ? null : source.id)}
                        >
                          <div className="source-row-title">{source.title}</div>
                          <div className="muted source-row-meta">
                            <span>{source.text.length.toLocaleString()} chars</span>
                            <span>·</span>
                            <span>{source.headings.length} heading{source.headings.length === 1 ? "" : "s"}</span>
                            {source.url ? (
                              <>
                                <span>·</span>
                                <span className="source-row-url">{source.url}</span>
                              </>
                            ) : null}
                          </div>
                        </button>
                        <div className="source-row-actions">
                          <button className="ghost icon-btn" title={`Open "${source.title}" in Reader`} onClick={() => openInReader(source.id)} aria-label={`Open "${source.title}" in Reader`}>📖</button>
                          <button
                            className={`icon-btn ${excluded ? "warn" : "ghost"}`}
                            title={excluded ? "Include in next analysis" : "Exclude from next analysis"}
                            onClick={() => toggleExcluded(source.id)}
                            aria-label={excluded ? `Include "${source.title}"` : `Exclude "${source.title}"`}
                            aria-pressed={excluded}
                          >
                            {excluded ? "↻" : "⊘"}
                          </button>
                          <button className="ghost icon-btn" title={`Remove "${source.title}"`} onClick={() => removeSource(source.id)} aria-label={`Remove source "${source.title}"`}>✕</button>
                        </div>
                      </div>
                      {isOpen ? (
                        <div style={{ marginTop: 10, padding: 12, background: "rgba(7,10,18,0.6)", borderRadius: 10, border: "1px solid var(--border)" }}>
                          {source.headings.length > 0 ? (
                            <div style={{ marginBottom: 8 }}>
                              {source.headings.slice(0, 10).map((heading, index) => (
                                <span key={index} className="tag muted" style={{ marginRight: 4 }}>{heading}</span>
                              ))}
                              {source.headings.length > 10 ? <span className="muted">+{source.headings.length - 10} more</span> : null}
                            </div>
                          ) : null}
                          <div className="muted" style={{ fontSize: ".82rem", whiteSpace: "pre-wrap", lineHeight: 1.55, maxHeight: 200, overflow: "auto" }}>
                            {preview}{(source.readerText || source.text).length > 600 ? "…" : ""}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
            <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <button className="primary" onClick={runAnalyze} disabled={activeSources.length === 0 || runningAnalyze}>
                {runningAnalyze ? "Analyzing…" : `Analyze ${activeSources.length} source${activeSources.length === 1 ? "" : "s"}`}
              </button>
              {workspace.analysis ? <span className="muted" style={{ alignSelf: "center" }}>Hash: {workspace.analysis.deterministicHash.slice(0, 12)}</span> : null}
              {excludedSourceIds.length > 0 ? (
                <button className="ghost" onClick={() => setWorkspace((current) => ({ ...current, excludedSourceIds: [], analysis: null }))}>
                  Clear excluded ({excludedSourceIds.length})
                </button>
              ) : null}
            </div>
            {runningAnalyze && analyzeStage ? (
              <div className="analyze-stage">
                <div className="muted" style={{ fontSize: ".82rem", marginBottom: 6 }}>{analyzeStage}</div>
                <div className="progress"><div className="progress-indeterminate" /></div>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}

      {view === "read" ? (
        <ReaderView
          workspace={workspace}
          activeSourceId={readerSourceId}
          focusConceptId={readerFocusConceptId}
          fontScale={readerFontScale}
          sepia={readerSepia}
          findQuery={readerFindQuery}
          onSelectSource={(id) => { setReaderSourceId(id); setReaderFocusConceptId(null); }}
          onFocusConcept={setReaderFocusConceptId}
          onChangeFontScale={setReaderFontScale}
          onToggleSepia={() => setReaderSepia((prev) => !prev)}
          onChangeFindQuery={setReaderFindQuery}
          onWriteNotes={(scope, text) => setWorkspace((current) => ({ ...current, notesByScope: { ...current.notesByScope, [scope]: text } }))}
          onPickCitation={addCitation}
        />
      ) : null}

      {view === "concepts" ? (
        <ConceptsView
          concepts={concepts}
          workspace={workspace}
          onToast={setToast}
          onOpenReader={openInReader}
          query={conceptQuery}
          stageFilter={conceptFilterStage}
          sort={conceptSort}
          onChangeQuery={setConceptQuery}
          onChangeStageFilter={setConceptFilterStage}
          onChangeSort={setConceptSort}
        />
      ) : null}

      {view === "gym" ? (
        <GymView
          workspace={workspace}
          pairIdx={gymIdx}
          picked={gymPicked}
          onPick={(conceptId, correctId) => {
            setGymPicked(conceptId);
            const correct = conceptId === correctId;
            setWorkspace((current) => {
              const prev = current.mastery[correctId] ?? { correct: 0, missed: 0, lastSeen: 0 };
              return {
                ...current,
                mastery: {
                  ...current.mastery,
                  [correctId]: {
                    correct: prev.correct + (correct ? 1 : 0),
                    missed: prev.missed + (correct ? 0 : 1),
                    lastSeen: Date.now()
                  }
                }
              };
            });
          }}
          onNext={() => { setGymPicked(null); setGymIdx((index) => index + 1); }}
          onReset={() => { setGymIdx(0); setGymPicked(null); }}
          onJumpToReader={openInReader}
        />
      ) : null}

      {view === "study" ? (
        <StudyView
          workspace={workspace}
          question={activeQuestion}
          picked={practicePicked}
          count={questions.length}
          index={practiceIdx}
          mode={studyMode}
          session={session}
          practiceKind={practiceKind}
          onPracticeKindChange={(next) => {
            setPracticeKind(next);
            setPracticeIdx(0);
            setPracticePicked(null);
            setFlashRevealed(false);
            setFlashHintShown(false);
            setTeachbackText("");
            setTeachbackScoreState(null);
            setSleuthPicked(null);
          }}
          flashRevealed={flashRevealed}
          flashHintShown={flashHintShown}
          onFlashReveal={() => setFlashRevealed(true)}
          onFlashHint={() => setFlashHintShown(true)}
          onFlashRate={(rating) => {
            // Record answer into mastery using the same SRS flow
            const concept = concepts[practiceIdx];
            if (concept) {
              // Treat "easy/good" as correct, "hard" as missed
              const correct = rating !== "hard";
              recordAnswer({ id: `${concept.id}:flash`, conceptId: concept.id, kind: "recall", prompt: concept.label, correct: concept.label, distractors: [] }, correct);
            }
            setFlashRevealed(false);
            setFlashHintShown(false);
            setPracticeIdx((i) => (i + 1) % Math.max(1, concepts.length));
          }}
          teachbackText={teachbackText}
          teachbackScore={teachbackScore}
          onTeachbackChange={setTeachbackText}
          onTeachbackScore={() => {
            const concept = concepts[practiceIdx];
            if (!concept) return;
            const scored = scoreTeachback(concept, teachbackText);
            setTeachbackScoreState(scored);
            // Feed into mastery — 60+ score counts as correct
            recordAnswer({ id: `${concept.id}:teach`, conceptId: concept.id, kind: "recall", prompt: concept.label, correct: concept.label, distractors: [] }, scored.overall >= 60);
          }}
          onTeachbackNext={() => {
            setTeachbackText("");
            setTeachbackScoreState(null);
            setPracticeIdx((i) => (i + 1) % Math.max(1, concepts.length));
          }}
          sleuthPicked={sleuthPicked}
          onSleuthPick={(sourceId, correctSourceId, conceptLabel) => {
            setSleuthPicked(sourceId);
            // Find concept by label to record mastery
            const concept = concepts.find((c) => c.label === conceptLabel);
            if (concept) {
              recordAnswer({ id: `${concept.id}:sleuth`, conceptId: concept.id, kind: "recall", prompt: conceptLabel, correct: conceptLabel, distractors: [] }, sourceId === correctSourceId);
            }
          }}
          onSleuthNext={() => {
            setSleuthPicked(null);
            setPracticeIdx((i) => i + 1);
          }}
          onStartSession={(size) => {
            setStudyMode("weakest");
            setPracticeIdx(0);
            setPracticePicked(null);
            setSession({ size, answered: 0, correct: 0, startedAt: Date.now() });
          }}
          onEndSession={() => setSession(null)}
          onModeChange={(nextMode) => { setStudyMode(nextMode); setPracticeIdx(0); setPracticePicked(null); }}
          onPick={(answer) => {
            if (!activeQuestion) return;
            setPracticePicked(answer);
            const correct = answer === activeQuestion.correct;
            recordAnswer(activeQuestion, correct);
          }}
          onNext={() => {
            setPracticePicked(null);
            setPracticeIdx((index) => (index + 1) % Math.max(1, questions.length));
          }}
          onReset={() => { setPracticeIdx(0); setPracticePicked(null); }}
          onSkip={() => {
            if (!activeQuestion) return;
            // Don't record as missed — just skip without affecting mastery
            setPracticePicked(null);
            setPracticeIdx((index) => (index + 1) % Math.max(1, questions.length));
          }}
          onIDontKnow={() => {
            if (!activeQuestion) return;
            setPracticePicked(activeQuestion.correct + "__idk__"); // sentinel that never matches
            recordAnswer(activeQuestion, false);
          }}
          onJumpToReader={(sourceId, conceptId) => openInReader(sourceId, conceptId)}
        />
      ) : null}

      {view === "notes" ? (
        <NotesView
          workspace={workspace}
          activeScope={activeNoteScope}
          onSetActiveScope={setActiveNoteScope}
          onWriteNotes={(scope, text) => setWorkspace((current) => ({ ...current, notesByScope: { ...current.notesByScope, [scope]: text } }))}
          onToast={setToast}
          onRemoveCitation={removeCitation}
          onInsertCitation={(citation) => {
            const source = workspace.sources.find((entry) => entry.id === citation.sourceId);
            const snippet = formatCitationForInsert(citation, source);
            const current = workspace.notesByScope[activeNoteScope] ?? "";
            const nextText = current.trim() ? `${current.trim()}\n\n${snippet}\n` : `${snippet}\n`;
            setWorkspace((prev) => ({ ...prev, notesByScope: { ...prev.notesByScope, [activeNoteScope]: nextText } }));
            setToast({ kind: "good", text: "Inserted into notes." });
            // Focus + jump-to-end after state commits.
            window.requestAnimationFrame(() => {
              const textarea = document.querySelector("textarea") as HTMLTextAreaElement | null;
              if (textarea) {
                textarea.focus();
                textarea.selectionStart = nextText.length;
                textarea.selectionEnd = nextText.length;
                textarea.scrollTop = textarea.scrollHeight;
              }
            });
          }}
          onSetAssignment={(prompt) => {
            const requirements: AssignmentRequirement[] = extractRequirements(prompt).map((text, index) => ({
              id: `req-${stableHash(`${text}:${index}`).slice(0, 8)}`,
              text,
              checked: false
            }));
            setWorkspace((current) => ({ ...current, assignment: { prompt, requirements } }));
          }}
          onToggleRequirement={(id) => setWorkspace((current) => {
            if (!current.assignment) return current;
            return {
              ...current,
              assignment: {
                ...current.assignment,
                requirements: current.assignment.requirements.map((req) => req.id === id ? { ...req, checked: !req.checked } : req)
              }
            };
          })}
        />
      ) : null}

      {toast ? <div className={`toast ${toast.kind}`}>{toast.text}</div> : null}
      {paletteOpen ? (
        <CommandPalette
          workspace={workspace}
          onNavigate={(next) => { setView(next); setPaletteOpen(false); }}
          onOpenReader={(sourceId, conceptId) => { openInReader(sourceId, conceptId); setPaletteOpen(false); }}
          onClose={() => setPaletteOpen(false)}
        />
      ) : null}
      {helpOpen ? <HelpOverlay onClose={() => setHelpOpen(false)} /> : null}
      {settingsOpen ? (
        <SettingsDrawer
          theme={theme}
          accent={accent}
          density={density}
          readingFont={readingFont}
          onChangeTheme={setTheme}
          onChangeAccent={setAccent}
          onChangeDensity={setDensity}
          onChangeReadingFont={setReadingFont}
          onExport={() => exportWorkspaceJson(workspace).then((result) => {
            if (!result.ok) setToast({ kind: "warn", text: result.error });
            else setToast({ kind: "good", text: "Workspace exported" });
          })}
          onReset={() => {
            if (!window.confirm("Reset the entire workspace? Sources, analysis, notes, citations — all cleared.")) return;
            setWorkspace(emptyWorkspace());
            setSettingsOpen(false);
            setToast({ kind: "good", text: "Workspace reset" });
          }}
          onClose={() => setSettingsOpen(false)}
        />
      ) : null}
      <footer className="hint-bar">
        <span><span className="kbd">0–6</span> nav</span>
        <span><span className="kbd">⌘K</span> palette</span>
        <span><span className="kbd">?</span> help</span>
        <span><span className="kbd">Esc</span> close</span>
        {workspace.analysis ? <span className="muted">· {concepts.length} concepts · hash {workspace.analysis.deterministicHash.slice(0, 8)} · {workspace.sources.length} source{workspace.sources.length === 1 ? "" : "s"}</span> : null}
      </footer>
    </div>
  );
}

function ConceptsView({ concepts, workspace, onToast, onOpenReader, query, stageFilter, sort, onChangeQuery, onChangeStageFilter, onChangeSort }: {
  concepts: Concept[];
  workspace: Workspace;
  onToast: (toast: Toast) => void;
  onOpenReader: (sourceId: string, conceptId?: string) => void;
  query: string;
  stageFilter: MemoryStage | "all";
  sort: "score" | "weakest" | "alpha";
  onChangeQuery: (value: string) => void;
  onChangeStageFilter: (value: MemoryStage | "all") => void;
  onChangeSort: (value: "score" | "weakest" | "alpha") => void;
}) {
  const sourceMap = new Map(workspace.sources.map((source) => [source.id, source] as const));
  const rejections = workspace.analysis?.rejections ?? [];
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedAll, setExpandedAll] = useState<boolean>(false);
  const deferredQuery = useDeferredValue(query);
  const rejectionsByCode = useMemo(() => {
    const buckets = new Map<string, typeof rejections>();
    for (const entry of rejections) {
      const list = buckets.get(entry.code);
      if (list) list.push(entry); else buckets.set(entry.code, [entry]);
    }
    return [...buckets.entries()].sort((left, right) => right[1].length - left[1].length);
  }, [rejections]);
  const filteredConcepts = useMemo(() => {
    let result = searchConcepts(concepts, deferredQuery);
    if (stageFilter !== "all") {
      result = result.filter((concept) => memoryStage(workspace.mastery[concept.id]) === stageFilter);
    }
    const sorted = [...result];
    if (sort === "alpha") sorted.sort((left, right) => left.label.localeCompare(right.label));
    else if (sort === "weakest") {
      sorted.sort((left, right) => {
        const leftRecord = workspace.mastery[left.id];
        const rightRecord = workspace.mastery[right.id];
        const leftScore = leftRecord ? leftRecord.correct - leftRecord.missed : -999;
        const rightScore = rightRecord ? rightRecord.correct - rightRecord.missed : -999;
        return leftScore - rightScore;
      });
    } else {
      sorted.sort((left, right) => right.score - left.score);
    }
    return sorted;
  }, [concepts, deferredQuery, stageFilter, sort, workspace.mastery]);
  return (
    <div className="grid">
      {concepts.length > 0 ? (
        <div className="concepts-toolbar">
          <input
            value={query}
            onChange={(event) => onChangeQuery(event.target.value)}
            placeholder={`Search ${concepts.length} concepts by label, definition, keyword, evidence…`}
            style={{ flex: 1 }}
          />
          <select value={stageFilter} onChange={(event) => onChangeStageFilter(event.target.value as MemoryStage | "all")} style={{ width: "auto", minWidth: 150 }}>
            <option value="all">All stages</option>
            <option value="crystallized">💎 Crystallized</option>
            <option value="stable">🟢 Stable</option>
            <option value="forming">🔵 Forming</option>
            <option value="fragile">🟠 Fragile</option>
            <option value="unseen">⚪ Unseen</option>
          </select>
          <select value={sort} onChange={(event) => onChangeSort(event.target.value as "score" | "weakest" | "alpha")} style={{ width: "auto", minWidth: 140 }}>
            <option value="score">Sort: score</option>
            <option value="weakest">Sort: weakest first</option>
            <option value="alpha">Sort: A → Z</option>
          </select>
          <button
            className="ghost"
            style={{ fontSize: ".78rem", padding: "6px 10px" }}
            onClick={() => { setExpandedAll((prev) => !prev); setExpandedId(null); }}
            title={expandedAll ? "Collapse all concepts" : "Expand all concepts"}
          >
            {expandedAll ? "▾ Collapse all" : "▸ Expand all"}
          </button>
          <span className="muted" style={{ fontSize: ".82rem", whiteSpace: "nowrap" }}>{filteredConcepts.length} / {concepts.length}</span>
        </div>
      ) : null}
      {concepts.length === 0 ? (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>No concepts admitted</h2>
          <p className="muted">Either no sources yet, or the content didn't pass the truth gates (needs explicit definitions, heading support, or repeated noun phrases). Rejections below show what was considered.</p>
          {rejections.length > 0 ? (
            <div style={{ marginTop: 12 }}>
              <div className="muted" style={{ marginBottom: 8 }}>{rejections.length} rejections across {rejectionsByCode.length} categories</div>
              {rejectionsByCode.map(([code, entries]) => (
                <details key={code} style={{ marginBottom: 6 }}>
                  <summary className="muted" style={{ fontSize: ".85rem" }}>
                    <span className="tag warn">{code}</span> {entries.length} item{entries.length === 1 ? "" : "s"}
                  </summary>
                  <ul>{entries.slice(0, 20).map((entry, index) => <li key={index} className="muted" style={{ fontSize: ".78rem" }}>{entry.detail}{entry.candidate ? <> — <em>{entry.candidate}</em></> : null}</li>)}</ul>
                </details>
              ))}
            </div>
          ) : null}
        </div>
      ) : filteredConcepts.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon">🔎</div>
          <h2 style={{ marginTop: 0 }}>No concepts match your filters.</h2>
          <p className="muted">Try clearing the search or widening the stage filter.</p>
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap", justifyContent: "center" }}>
            {query ? <button className="ghost" onClick={() => onChangeQuery("")}>Clear search</button> : null}
            {stageFilter !== "all" ? <button className="ghost" onClick={() => onChangeStageFilter("all")}>Show all stages</button> : null}
          </div>
        </div>
      ) : (
        filteredConcepts.map((concept) => {
          const stage = memoryStage(workspace.mastery[concept.id]);
          const stageMeta = memoryStageLabel(stage);
          const isExpanded = expandedAll || expandedId === concept.id;
          return (
            <article key={concept.id} className={`concept ${isExpanded ? "expanded" : ""}`}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span className={`stage-pill stage-${stage}`} title={`Memory stage: ${stageMeta.label}`} style={{ fontSize: ".72rem" }}>{stageMeta.icon}</span>
                    {concept.label}
                  </h3>
                </div>
                <span className="score">{concept.score}</span>
              </div>
              <div style={{ margin: "6px 0" }}>
                {concept.admissionReasons.map((reason, index) => <span key={`r-${index}-${reason}`} className="tag good">{reason}</span>)}
                {concept.keywords.slice(0, 6).map((keyword, index) => <span key={`k-${index}-${keyword}`} className="tag muted">{keyword}</span>)}
                {concept.sourceIds.slice(0, 4).map((id, index) => {
                  const title = sourceMap.get(id)?.title ?? id;
                  const shortTitle = title.length > 42 ? title.slice(0, 40).trimEnd() + "…" : title;
                  return (
                    <button
                      key={`s-${index}-${id}`}
                      className="tag violet source-tag"
                      title={`Open "${title}" in Reader with this concept highlighted`}
                      onClick={() => onOpenReader(id, concept.id)}
                    >
                      {shortTitle}
                    </button>
                  );
                })}
                {concept.sourceIds.length > 4 ? (
                  <span className="tag muted" title={concept.sourceIds.slice(4).map((id) => sourceMap.get(id)?.title ?? id).join(", ")}>
                    +{concept.sourceIds.length - 4} more
                  </span>
                ) : null}
              </div>
              {concept.definition ? <div className="def"><strong>Definition.</strong> {concept.definition}</div> : null}
              {isExpanded && concept.summary && concept.summary !== concept.definition ? <div className="def"><strong>Explanation.</strong> {concept.summary}</div> : null}
              {isExpanded && concept.evidence.length > 0 ? (
                <div className="ev">
                  {concept.evidence.map((span, index) => (
                    <div key={index} className="ev-row">
                      <span className={`role-pill role-${span.role}`} title={`Evidence role: ${span.role}`}>{span.role}</span>
                      <div className="ev-body">
                        <div className="ev-sentence">{span.sentence}</div>
                        <div className="ev-source">
                          <button
                            onClick={() => onOpenReader(span.sourceId, concept.id)}
                            className="ghost"
                            style={{ padding: "1px 6px", fontSize: ".74rem", border: "none", background: "transparent", color: "var(--accent)", cursor: "pointer" }}
                            aria-label={`Open ${sourceMap.get(span.sourceId)?.title ?? span.sourceId} in Reader`}
                          >
                            {sourceMap.get(span.sourceId)?.title ?? span.sourceId} ↗
                          </button>
                          {span.headingTrail.length > 0 ? ` · ${span.headingTrail.join(" / ")}` : ""}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
              <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                <button className="ghost" onClick={() => setExpandedId(isExpanded ? null : concept.id)}>
                  {isExpanded ? "▾ Collapse" : `▸ ${concept.evidence.length} evidence span${concept.evidence.length === 1 ? "" : "s"}`}
                </button>
                <button className="ghost" onClick={async () => {
                  const result = await exportConceptAsTxt(concept, workspace.sources);
                  if (!result.ok && result.error !== "Cancelled") onToast({ kind: "warn", text: result.error });
                  else if (result.ok) onToast({ kind: "good", text: `${concept.label} exported` });
                }}>Export .txt</button>
              </div>
            </article>
          );
        })
      )}
      {rejections.length > 0 && concepts.length > 0 ? (
        <div className="card">
          <details>
            <summary className="muted">Rejection ledger — {rejections.length} items in {rejectionsByCode.length} categories</summary>
            <div style={{ marginTop: 8 }}>
              {rejectionsByCode.map(([code, entries]) => (
                <details key={code} style={{ marginBottom: 6 }}>
                  <summary className="muted" style={{ fontSize: ".85rem" }}>
                    <span className="tag warn">{code}</span> {entries.length} item{entries.length === 1 ? "" : "s"}
                  </summary>
                  <ul>{entries.slice(0, 20).map((entry, index) => <li key={index} className="muted" style={{ fontSize: ".78rem" }}>{entry.detail}{entry.candidate ? <> — <em>{entry.candidate}</em></> : null}</li>)}</ul>
                </details>
              ))}
            </div>
          </details>
        </div>
      ) : null}
    </div>
  );
}

function StudyView(props: {
  workspace: Workspace;
  question: PracticeQuestion | null;
  picked: string | null;
  count: number;
  index: number;
  mode: "weakest" | "sequence";
  session: { size: number; answered: number; correct: number; startedAt: number } | null;
  practiceKind: PracticeKind;
  onPracticeKindChange: (kind: PracticeKind) => void;
  flashRevealed: boolean;
  flashHintShown: boolean;
  onFlashReveal: () => void;
  onFlashHint: () => void;
  onFlashRate: (rating: "hard" | "good" | "easy") => void;
  teachbackText: string;
  teachbackScore: TeachbackScore | null;
  onTeachbackChange: (text: string) => void;
  onTeachbackScore: () => void;
  onTeachbackNext: () => void;
  sleuthPicked: string | null;
  onSleuthPick: (sourceId: string, correctSourceId: string, conceptLabel: string) => void;
  onSleuthNext: () => void;
  onStartSession: (size: number) => void;
  onEndSession: () => void;
  onModeChange: (mode: "weakest" | "sequence") => void;
  onPick: (value: string) => void;
  onNext: () => void;
  onReset: () => void;
  onSkip: () => void;
  onIDontKnow: () => void;
  onJumpToReader: (sourceId: string, conceptId: string) => void;
}) {
  const { workspace, question, picked, count, index, mode, session, practiceKind, onStartSession, onEndSession, onModeChange, onPick, onNext, onReset, onSkip, onIDontKnow, onJumpToReader } = props;
  const total = workspace.analysis?.concepts.length ?? 0;
  const stageCounts = useMemo(() => {
    const counts: Record<MemoryStage, number> = { unseen: 0, fragile: 0, forming: 0, stable: 0, crystallized: 0 };
    for (const concept of workspace.analysis?.concepts ?? []) {
      counts[memoryStage(workspace.mastery[concept.id])] += 1;
    }
    return counts;
  }, [workspace.analysis?.concepts, workspace.mastery]);
  const activeConcept = workspace.analysis?.concepts.find((concept) => concept.id === question?.conceptId) ?? null;
  const activeConceptSourceId = activeConcept?.sourceIds[0] ?? activeConcept?.evidence[0]?.sourceId ?? null;
  const activeRecord = activeConcept ? workspace.mastery[activeConcept.id] : undefined;
  const activeStage = memoryStage(activeRecord);
  const hasGhost = !!activeRecord && activeRecord.missed > 0;
  const lastFive = useMemo(() => {
    const history = Object.values(workspace.mastery).sort((left, right) => right.lastSeen - left.lastSeen).slice(0, 5);
    const netRecent = history.reduce((sum, entry) => sum + (entry.correct > entry.missed ? 1 : entry.missed > entry.correct ? -1 : 0), 0);
    if (netRecent >= 3) return "flow" as const;
    if (netRecent <= -2) return "struggling" as const;
    return "neutral" as const;
  }, [workspace.mastery]);
  useEffect(() => {
    const onAnswerPick = (event: Event) => {
      const detail = (event as CustomEvent).detail as { index: number };
      if (!question || picked) return;
      const options = [question.correct, ...question.distractors].slice(0, 4);
      const target = options[detail.index];
      if (target) onPick(target);
    };
    const onAnswerNext = () => {
      if (picked) onNext();
    };
    const onAnswerIdk = () => {
      if (!picked && question) onIDontKnow();
    };
    window.addEventListener("aeonthra:answer-pick", onAnswerPick);
    window.addEventListener("aeonthra:answer-next", onAnswerNext);
    window.addEventListener("aeonthra:answer-idk", onAnswerIdk);
    return () => {
      window.removeEventListener("aeonthra:answer-pick", onAnswerPick);
      window.removeEventListener("aeonthra:answer-next", onAnswerNext);
      window.removeEventListener("aeonthra:answer-idk", onAnswerIdk);
    };
  }, [question, picked, onPick, onNext, onIDontKnow]);
  // Define practice tabs upfront so every branch below can include them.
  const practiceTabsEarly = (
    <div className="practice-tabs" role="tablist" aria-label="Practice mode">
      {([
        { id: "quiz" as PracticeKind, label: "📝 Quiz", sub: "Multiple choice" },
        { id: "flashcards" as PracticeKind, label: "🎴 Flashcards", sub: "Front / back recall" },
        { id: "teachback" as PracticeKind, label: "✍ Teach-back", sub: "Write your own" },
        { id: "sleuth" as PracticeKind, label: "🔍 Sleuth", sub: "Which source?" }
      ]).map((tab) => (
        <button key={tab.id} role="tab" aria-selected={practiceKind === tab.id} className={`practice-tab ${practiceKind === tab.id ? "active" : ""}`} onClick={() => props.onPracticeKindChange(tab.id)}>
          <span className="practice-tab-label">{tab.label}</span>
          <span className="practice-tab-sub">{tab.sub}</span>
        </button>
      ))}
    </div>
  );
  // Quiz-mode-only guard: other modes (flashcards/teachback/sleuth) don't use `question`.
  if (practiceKind === "quiz" && !question) {
    return (
      <>
      {practiceTabsEarly}
      <div className="card empty-state">
        <div className="empty-state-icon">🎯</div>
        <h2 style={{ marginTop: 0 }}>No questions yet</h2>
        <p className="muted">Analyze at least one source first to generate practice questions.</p>
      </div>
      </>
    );
  }
  // The branches below only run for quiz mode; question is guaranteed non-null by the guard above.
  const options = question ? [question.correct, ...question.distractors].slice(0, 4) : [];
  const idk = picked?.endsWith("__idk__") ?? false;
  const effectivePicked = idk ? null : picked;
  const isCorrect = !!question && effectivePicked === question.correct;
  const conceptsSorted = [...(workspace.analysis?.concepts ?? [])].sort((left, right) => {
    const leftRecord = workspace.mastery[left.id];
    const rightRecord = workspace.mastery[right.id];
    const leftScore = leftRecord ? leftRecord.correct - leftRecord.missed : -999;
    const rightScore = rightRecord ? rightRecord.correct - rightRecord.missed : -999;
    return leftScore - rightScore;
  });
  const activeStageMeta = memoryStageLabel(activeStage);
  // Session completion: show summary card once user has answered `size` questions.
  if (practiceKind === "quiz" && session && session.answered >= session.size) {
    const accuracy = session.answered > 0 ? Math.round((session.correct / session.answered) * 100) : 0;
    const elapsedSec = Math.max(1, Math.round((Date.now() - session.startedAt) / 1000));
    const elapsedLabel = elapsedSec < 60 ? `${elapsedSec}s` : `${Math.floor(elapsedSec / 60)}m ${elapsedSec % 60}s`;
    const message = accuracy >= 90 ? "🔥 Crystal clarity — mastery incoming." : accuracy >= 70 ? "🟢 Solid session. The gains compound." : accuracy >= 40 ? "🔵 Good first pass. Another round will sharpen it." : "🟠 The borders are still fuzzy — review definitions, then retry.";
    return (
      <>
      {practiceTabsEarly}
      <div className="card session-complete">
        <div className="session-complete-eyebrow">Session complete</div>
        <h2 style={{ margin: "4px 0 14px", fontSize: "1.6rem" }}>{message}</h2>
        <div className="session-stats">
          <div className="session-stat">
            <div className="session-stat-value" style={{ color: accuracy >= 70 ? "var(--good)" : accuracy >= 40 ? "var(--accent)" : "var(--warn)" }}>{accuracy}%</div>
            <div className="session-stat-label">Accuracy</div>
          </div>
          <div className="session-stat">
            <div className="session-stat-value">{session.correct}<span className="muted" style={{ fontSize: "1.1rem", fontWeight: 400 }}>/{session.answered}</span></div>
            <div className="session-stat-label">Correct</div>
          </div>
          <div className="session-stat">
            <div className="session-stat-value">{elapsedLabel}</div>
            <div className="session-stat-label">Time</div>
          </div>
          <div className="session-stat">
            <div className="session-stat-value">{Math.round(elapsedSec / session.answered)}s</div>
            <div className="session-stat-label">Per question</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 20 }}>
          <button className="primary" onClick={() => onStartSession(session.size)}>Another {session.size}-question round →</button>
          <button className="ghost" onClick={() => onStartSession(Math.min(session.size * 2, 40))}>Double it · {Math.min(session.size * 2, 40)} questions</button>
          <button className="ghost" onClick={onEndSession}>End session</button>
        </div>
      </div>
      </>
    );
  }

  // Reuse the tabs instance defined upfront for the mode-specific branches below.
  const practiceTabs = practiceTabsEarly;

  // Flashcards panel
  if (practiceKind === "flashcards") {
    const cards = workspace.analysis?.concepts ?? [];
    if (cards.length === 0) {
      return (
        <>
          {practiceTabs}
          <div className="card empty-state">
            <div className="empty-state-icon">🎴</div>
            <h2 style={{ marginTop: 0 }}>No flashcards yet</h2>
            <p className="muted">Analyze at least one source so the engine can build front/back cards.</p>
          </div>
        </>
      );
    }
    const card = cards[index % cards.length]!;
    const back = card.definition || card.summary || card.evidence[0]?.sentence || "";
    const stage = memoryStage(workspace.mastery[card.id]);
    const stageMeta = memoryStageLabel(stage);
    return (
      <>
        {practiceTabs}
        <div className="card flash-card">
          <div className="flash-header">
            <span className="muted" style={{ fontSize: ".78rem", letterSpacing: ".1em", textTransform: "uppercase" }}>Card {index + 1} of {cards.length}</span>
            <span className={`stage-pill stage-${stage}`}>{stageMeta.icon} {stageMeta.label}</span>
          </div>
          <div className={`flash-face ${props.flashRevealed ? "revealed" : ""}`}>
            <div className="flash-front">
              <div className="flash-front-label">Concept</div>
              <h2 className="flash-front-title">{card.label}</h2>
              {props.flashHintShown && card.keywords.length > 0 ? (
                <div className="flash-hints">
                  <div className="muted" style={{ fontSize: ".72rem", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 4 }}>Hints</div>
                  {card.keywords.slice(0, 4).map((kw, i) => <span key={i} className="tag muted">{kw}</span>)}
                </div>
              ) : null}
              {!props.flashRevealed ? (
                <div className="flash-actions">
                  {!props.flashHintShown ? (
                    <button className="ghost" onClick={props.onFlashHint}>💡 Show hints</button>
                  ) : null}
                  <button className="primary" onClick={props.onFlashReveal}>Reveal answer →</button>
                </div>
              ) : null}
            </div>
            {props.flashRevealed ? (
              <div className="flash-back">
                <div className="flash-back-label">Answer</div>
                <div className="flash-back-body">{back}</div>
                <div className="flash-rate">
                  <div className="muted" style={{ fontSize: ".78rem", marginBottom: 6 }}>How well did you recall it?</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button className="flash-rate-btn rate-hard" onClick={() => props.onFlashRate("hard")}>😰 Hard</button>
                    <button className="flash-rate-btn rate-good" onClick={() => props.onFlashRate("good")}>🙂 Good</button>
                    <button className="flash-rate-btn rate-easy" onClick={() => props.onFlashRate("easy")}>🚀 Easy</button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </>
    );
  }

  // Teach-back panel
  if (practiceKind === "teachback") {
    const cards = workspace.analysis?.concepts ?? [];
    if (cards.length === 0) {
      return (
        <>
          {practiceTabs}
          <div className="card empty-state">
            <div className="empty-state-icon">✍</div>
            <h2 style={{ marginTop: 0 }}>Nothing to teach-back yet</h2>
            <p className="muted">Add at least one source and analyze — then you can write an explanation for each admitted concept.</p>
          </div>
        </>
      );
    }
    const concept = cards[index % cards.length]!;
    return (
      <>
        {practiceTabs}
        <div className="card teachback-card">
          <div className="muted" style={{ fontSize: ".78rem", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 6 }}>Explain in your own words · {index + 1} of {cards.length}</div>
          <h2 style={{ marginTop: 0, fontSize: "1.4rem" }}>{concept.label}</h2>
          {concept.keywords.length > 0 ? (
            <div style={{ margin: "8px 0 14px" }}>
              <span className="muted" style={{ fontSize: ".72rem", letterSpacing: ".1em", textTransform: "uppercase", marginRight: 8 }}>Key terms to weave in</span>
              {concept.keywords.slice(0, 6).map((kw, i) => (
                <span
                  key={i}
                  className={`tag ${(props.teachbackScore?.hitKeywords ?? []).includes(kw) ? "good" : "muted"}`}
                  style={{ marginRight: 4 }}
                >
                  {kw}
                  {(props.teachbackScore?.hitKeywords ?? []).includes(kw) ? " ✓" : ""}
                </span>
              ))}
            </div>
          ) : null}
          <textarea
            value={props.teachbackText}
            onChange={(e) => props.onTeachbackChange(e.target.value)}
            placeholder={`Write what you understand about ${concept.label} as if you were explaining it to a classmate. Aim for 60–240 words; weave in the key terms naturally.`}
            style={{ minHeight: 220, fontFamily: "var(--font-body)" }}
            aria-label={`Your explanation of ${concept.label}`}
            disabled={!!props.teachbackScore}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, flexWrap: "wrap", gap: 8 }}>
            <span className="muted" style={{ fontSize: ".78rem" }}>
              {(props.teachbackText.trim().match(/\S+/g) ?? []).length} words
            </span>
            {!props.teachbackScore ? (
              <button className="primary" onClick={props.onTeachbackScore} disabled={props.teachbackText.trim().length < 20}>
                Score my explanation →
              </button>
            ) : null}
          </div>
          {props.teachbackScore ? (
            <div className="teachback-result">
              <div className="teachback-score">
                <div className="teachback-score-value" style={{ color: props.teachbackScore.overall >= 80 ? "var(--good)" : props.teachbackScore.overall >= 60 ? "var(--accent)" : props.teachbackScore.overall >= 40 ? "var(--accent)" : "var(--warn)" }}>
                  {props.teachbackScore.overall}
                </div>
                <div className="teachback-score-label">/ 100</div>
              </div>
              <div className="teachback-feedback">
                <div style={{ fontSize: "1rem", fontWeight: 600 }}>{props.teachbackScore.message}</div>
                <div className="muted" style={{ fontSize: ".86rem", marginTop: 6, lineHeight: 1.5 }}>
                  Keyword coverage {Math.round(props.teachbackScore.coverage * 100)}% · Missed: {props.teachbackScore.missedKeywords.length ? props.teachbackScore.missedKeywords.join(", ") : "none"}
                </div>
                <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                  <button className="primary" onClick={props.onTeachbackNext}>Next concept →</button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </>
    );
  }

  // Source Sleuth panel
  if (practiceKind === "sleuth") {
    const cards = workspace.analysis?.concepts ?? [];
    const sourceMap = new Map(workspace.sources.map((s) => [s.id, s] as const));
    const prompts = cards.length >= 4 && workspace.sources.length >= 4 ? generateSleuthPrompts(cards, workspace.sources, 30) : [];
    if (prompts.length === 0) {
      return (
        <>
          {practiceTabs}
          <div className="card empty-state">
            <div className="empty-state-icon">🔍</div>
            <h2 style={{ marginTop: 0 }}>Not enough sources for Sleuth</h2>
            <p className="muted">Source Sleuth needs at least 4 sources with evidence so the distractors aren't obvious. Add more sources and reanalyze.</p>
          </div>
        </>
      );
    }
    const prompt = prompts[index % prompts.length]!;
    const correctSource = sourceMap.get(prompt.correctSourceId);
    return (
      <>
        {practiceTabs}
        <div className="card sleuth-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <div className="muted" style={{ fontSize: ".78rem", letterSpacing: ".1em", textTransform: "uppercase" }}>Provenance · {index + 1} of {prompts.length}</div>
            <span className="tag violet">🔍 Source Sleuth</span>
          </div>
          <h2 style={{ marginTop: 12, marginBottom: 6 }}>Which source does this passage come from?</h2>
          <div className="sleuth-evidence">
            <span className="muted" style={{ fontSize: ".74rem" }}>about <strong style={{ color: "var(--violet)" }}>{prompt.conceptLabel}</strong></span>
            <div style={{ marginTop: 6, fontSize: "1rem", lineHeight: 1.6 }}>"{prompt.evidence}"</div>
          </div>
          <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
            {prompt.sourceIds.map((sid, i) => {
              const source = sourceMap.get(sid);
              const label = source?.title ?? sid;
              const isCorrect = sid === prompt.correctSourceId;
              const isChosen = sid === props.sleuthPicked;
              const base = props.sleuthPicked ? (isCorrect ? "good" : isChosen ? "warn" : "ghost") : "ghost";
              return (
                <button
                  key={sid}
                  className={base}
                  onClick={() => props.sleuthPicked ? undefined : props.onSleuthPick(sid, prompt.correctSourceId, prompt.conceptLabel)}
                  disabled={!!props.sleuthPicked}
                  style={{ textAlign: "left", padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}
                >
                  <span className="option-key">{String.fromCharCode(65 + i)}</span>
                  <span style={{ flex: 1 }}>{label}</span>
                </button>
              );
            })}
          </div>
          {props.sleuthPicked ? (
            <div style={{ marginTop: 14, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
              <span className={`tag ${props.sleuthPicked === prompt.correctSourceId ? "good" : "warn"}`}>
                {props.sleuthPicked === prompt.correctSourceId ? "✓ Right on — provenance locked in" : `✗ It's actually from "${correctSource?.title ?? prompt.correctSourceId}"`}
              </span>
              <button className="ghost" style={{ fontSize: ".8rem" }} onClick={() => onJumpToReader(prompt.correctSourceId, "")}>Read in context ↗</button>
              <button className="primary" style={{ marginLeft: 6 }} onClick={props.onSleuthNext}>Next →</button>
            </div>
          ) : null}
        </div>
      </>
    );
  }

  return (
    <>
    {practiceTabs}
    <div className="grid grid-2">
      <div className={`card study-card flow-${lastFive}`}>
        {session ? (
          <div className="session-bar" aria-label={`Session progress: ${session.answered} of ${session.size}`}>
            <div className="session-bar-track">
              <div className="session-bar-fill" style={{ width: `${Math.min(100, (session.answered / session.size) * 100)}%` }} />
            </div>
            <div className="session-bar-meta">
              <span>Session · <strong>{session.answered}</strong> / {session.size}</span>
              <span className="muted">{session.correct}✓ · {Math.round((session.correct / Math.max(1, session.answered)) * 100) || 0}% accuracy</span>
              <button className="ghost" style={{ fontSize: ".72rem", padding: "2px 8px" }} onClick={onEndSession}>End</button>
            </div>
          </div>
        ) : null}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div className="muted" style={{ fontSize: ".78rem", letterSpacing: ".1em", textTransform: "uppercase" }}>Question {index + 1} of {count}</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <button className={mode === "weakest" ? "primary" : "ghost"} style={{ fontSize: ".75rem", padding: "4px 10px" }} onClick={() => onModeChange("weakest")}>Weakest first</button>
            <button className={mode === "sequence" ? "primary" : "ghost"} style={{ fontSize: ".75rem", padding: "4px 10px" }} onClick={() => onModeChange("sequence")}>Sequence</button>
            {!session ? (
              <>
                <span className="muted" style={{ fontSize: ".72rem", margin: "0 4px" }}>·</span>
                <button className="ghost" style={{ fontSize: ".72rem", padding: "4px 10px" }} onClick={() => onStartSession(5)} title="Start a 5-question session with completion summary">⚡ 5</button>
                <button className="ghost" style={{ fontSize: ".72rem", padding: "4px 10px" }} onClick={() => onStartSession(10)}>10</button>
                <button className="ghost" style={{ fontSize: ".72rem", padding: "4px 10px" }} onClick={() => onStartSession(20)}>20</button>
              </>
            ) : null}
          </div>
        </div>
        {hasGhost ? (
          <div className="ghost-banner" title="You missed this concept before">
            👻 This tripped you up before — pay close attention.
          </div>
        ) : null}
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4, fontSize: ".78rem" }}>
          {activeConcept ? <span className="muted">{activeConcept.label}</span> : null}
          <span className={`stage-pill stage-${activeStage}`} title={`Memory stage: ${activeStageMeta.label}`}>
            {activeStageMeta.icon} {activeStageMeta.label}
          </span>
          {lastFive === "flow" ? <span className="flow-pill flow">🔥 Flow</span> : null}
          {lastFive === "struggling" ? <span className="flow-pill struggling">🧘 Take your time</span> : null}
        </div>
        <h3 style={{ margin: "10px 0 18px", lineHeight: 1.5 }}>{question?.prompt ?? ""}</h3>
        <div style={{ display: "grid", gap: 10 }}>
          {options.map((option, optionIndex) => {
            const correct = option === question?.correct;
            const chosen = option === effectivePicked;
            const base = picked ? (correct ? "good" : chosen ? "warn" : "ghost") : "ghost";
            return (
              <button
                key={option}
                className={base}
                onClick={(event) => {
                  if (picked) return;
                  // Blur to prevent a later Space/Enter from synth-clicking this same
                  // button onto the *next* question (picked is null by then, so the
                  // guard above doesn't help). preventDefault on keydown doesn't stop
                  // HTML button activation — that fires on keyup after Space release.
                  event.currentTarget.blur();
                  onPick(option);
                }}
                onKeyDown={(event) => {
                  // Also swallow Space/Enter on an already-picked button so keyboard
                  // users can't re-activate the current button after answering.
                  if (picked && (event.key === " " || event.key === "Enter")) {
                    event.preventDefault();
                  }
                }}
                disabled={!!picked}
                style={{ textAlign: "left", padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}
                aria-label={`Option ${optionIndex + 1}: ${option}${correct && picked ? " (correct)" : ""}`}
              >
                <span className="option-key" aria-hidden="true">{String.fromCharCode(65 + optionIndex)}</span>
                <span style={{ flex: 1 }}>{option}</span>
              </button>
            );
          })}
        </div>
        {!picked ? (
          <div style={{ marginTop: 14, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <button className="ghost" onClick={onIDontKnow} title="Reveal the answer — counts as missed (shortcut: H or ?)">🤔 I don't know</button>
            <button className="ghost" onClick={onSkip} title="Skip without counting (no mastery change)">⤼ Skip</button>
            <span className="muted" style={{ fontSize: ".72rem", marginLeft: "auto" }}>
              <span className="kbd">A</span> <span className="kbd">B</span> <span className="kbd">C</span> <span className="kbd">D</span> to pick · <span className="kbd">H</span> hint · <span className="kbd">Space</span> next
            </span>
          </div>
        ) : null}
        {picked ? (
          <>
            <div style={{ marginTop: 14, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
              <span className={`tag ${isCorrect ? "good" : "warn"}`}>
                {idk ? "🤔 Revealed — counted as missed" : isCorrect ? (lastFive === "flow" ? "🔥 Yes!" : "Correct") : "Missed"}
              </span>
              {activeConcept && activeConceptSourceId ? (
                <button className="ghost" style={{ fontSize: ".8rem" }} onClick={() => onJumpToReader(activeConceptSourceId, activeConcept.id)}>
                  Read evidence ↗
                </button>
              ) : null}
              <button className="primary" style={{ marginLeft: 6 }} onClick={onNext}>Next →</button>
              <button className="ghost" onClick={onReset}>Reset</button>
            </div>
            {activeConcept ? (
              <div className="memory-imprint" style={{ marginTop: 14 }}>
                <div style={{ fontSize: ".72rem", color: "var(--muted)", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 4 }}>
                  Memory Imprint
                </div>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>{activeConcept.label}</div>
                <div style={{ fontSize: ".9rem", lineHeight: 1.6 }}>{activeConcept.definition || activeConcept.summary || "(no definition available)"}</div>
                <div style={{ marginTop: 6, fontSize: ".78rem", color: "var(--muted)" }}>
                  Stage: <span className={`stage-pill stage-${activeStage}`}>{activeStageMeta.icon} {activeStageMeta.label}</span>
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Mastery</h3>
        <p className="muted" style={{ marginTop: 0 }}>{stageCounts.crystallized + stageCounts.stable} / {total} at Stable+ · tracked per-stage below.</p>
        <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
          {(["crystallized", "stable", "forming", "fragile", "unseen"] as MemoryStage[]).map((stage) => {
            const meta = memoryStageLabel(stage);
            return (
              <span key={stage} className={`stage-pill stage-${stage}`} title={`${stageCounts[stage]} concepts ${meta.label}`}>
                {meta.icon} {stageCounts[stage]}
              </span>
            );
          })}
        </div>
        <div style={{ display: "grid", gap: 6 }}>
          {conceptsSorted.slice(0, 12).map((concept) => {
            const record = workspace.mastery[concept.id] ?? { correct: 0, missed: 0, lastSeen: 0 };
            const stage = memoryStage(record);
            const stageMeta = memoryStageLabel(stage);
            const net = record.correct - record.missed;
            const ratio = record.correct + record.missed === 0 ? 0 : record.correct / (record.correct + record.missed);
            return (
              <div key={concept.id} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 600, display: "flex", gap: 6, alignItems: "center" }}>
                    <span className={`stage-pill stage-${stage}`} title={stageMeta.label} style={{ fontSize: ".7rem", padding: "1px 6px" }}>{stageMeta.icon}</span>
                    {concept.label}
                  </div>
                  <div className="progress"><div style={{ width: `${Math.max(2, ratio * 100)}%` }} /></div>
                </div>
                <div className="muted" style={{ fontSize: ".78rem", whiteSpace: "nowrap" }}>{record.correct}✓ {record.missed}✗ · net {net}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
    </>
  );
}

function NotesView({ workspace, activeScope, onSetActiveScope, onWriteNotes, onToast, onRemoveCitation, onInsertCitation, onSetAssignment, onToggleRequirement }: {
  workspace: Workspace;
  activeScope: string;
  onSetActiveScope: (value: string) => void;
  onWriteNotes: (scope: string, text: string) => void;
  onToast: (toast: Toast) => void;
  onRemoveCitation: (id: string) => void;
  onInsertCitation: (citation: Citation) => void;
  onSetAssignment: (prompt: string) => void;
  onToggleRequirement: (id: string) => void;
}) {
  const notes = workspace.notesByScope[activeScope] ?? "";
  const scopes = ["__all__", ...workspace.sources.map((source) => source.id)];
  const label = (scope: string) => {
    if (scope === "__all__") return "All sources";
    return workspace.sources.find((source) => source.id === scope)?.title ?? scope;
  };
  const citations = (workspace.citations ?? []).filter((entry) => activeScope === "__all__" || entry.scope === activeScope);
  const directUsed = (workspace.citations ?? []).filter((entry) => entry.kind === "direct").length;
  const paraphraseUsed = (workspace.citations ?? []).filter((entry) => entry.kind === "paraphrase").length;
  const thesisResult = useMemo(() => detectThesis(notes), [notes]);
  const assignment = workspace.assignment;
  const notesTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [assignmentDraft, setAssignmentDraft] = useState<string>(assignment?.prompt ?? "");
  const [assignmentEditing, setAssignmentEditing] = useState<boolean>(!assignment?.prompt);
  useEffect(() => { setAssignmentDraft(assignment?.prompt ?? ""); }, [assignment?.prompt]);
  const requirementsChecked = assignment ? assignment.requirements.filter((req) => req.checked).length : 0;
  const requirementsTotal = assignment ? assignment.requirements.length : 0;
  const allRequirementsChecked = requirementsTotal > 0 && requirementsChecked === requirementsTotal;
  const hasThesis = thesisResult.confidence === "strong";
  const hasEnoughCitations = directUsed + paraphraseUsed >= 2;
  const requirementsMet = assignment != null && requirementsTotal > 0 && allRequirementsChecked;
  const readyCriteria = [
    { label: "Thesis detected", met: hasThesis, detail: thesisResult.reason },
    { label: "Assignment requirements addressed", met: requirementsMet, detail: assignment == null ? "Load an assignment prompt below" : requirementsTotal === 0 ? "No checklist items extracted from the prompt" : `${requirementsChecked}/${requirementsTotal} checked` },
    { label: "At least 2 citations", met: hasEnoughCitations, detail: `${directUsed} direct, ${paraphraseUsed} paraphrased` },
    { label: "Notes ≥ 200 characters", met: notes.trim().length >= 200, detail: `${notes.length} chars so far` }
  ];
  const readyCount = readyCriteria.filter((entry) => entry.met).length;
  const isReady = readyCount === readyCriteria.length;
  return (
    <div className="grid grid-2">
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <h2 style={{ margin: 0 }}>Notes</h2>
          <div className="readiness-indicator" title={`${readyCount}/${readyCriteria.length} criteria met`}>
            <span className={`readiness-dot ${isReady ? "ready" : "pending"}`} />
            <span style={{ fontSize: ".78rem", color: isReady ? "var(--good)" : "var(--muted)" }}>
              {isReady ? "Ready to submit" : `${readyCount}/${readyCriteria.length} ready`}
            </span>
          </div>
        </div>
        <p className="muted" style={{ marginTop: 4 }}>Stored in your browser. Export the current scope as Markdown (with citations + works used) or plain .txt.</p>
        <label className="block">Scope</label>
        <select value={activeScope} onChange={(event) => onSetActiveScope(event.target.value)}>
          {scopes.map((scope) => <option key={scope} value={scope}>{label(scope)}</option>)}
        </select>

        <div style={{ marginTop: 14 }}>
          <details open={assignmentEditing || !assignment?.prompt}>
            <summary style={{ cursor: "pointer", fontSize: ".84rem", fontWeight: 600, color: "var(--accent)" }}>
              📋 Assignment prompt {assignment?.prompt ? `· ${requirementsChecked}/${requirementsTotal} requirements` : "(not set)"}
            </summary>
            <div style={{ marginTop: 10 }}>
              {assignmentEditing || !assignment?.prompt ? (
                <>
                  <textarea
                    value={assignmentDraft}
                    onChange={(event) => setAssignmentDraft(event.target.value)}
                    placeholder="Paste the assignment prompt. Requirements (bulleted/numbered/imperative sentences) will be auto-extracted."
                    style={{ minHeight: 140 }}
                  />
                  <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                    <button className="primary" onClick={() => { onSetAssignment(assignmentDraft); setAssignmentEditing(false); }} disabled={!assignmentDraft.trim()}>Save assignment</button>
                    {assignment?.prompt ? <button className="ghost" onClick={() => { setAssignmentDraft(assignment.prompt); setAssignmentEditing(false); }}>Cancel</button> : null}
                  </div>
                </>
              ) : (
                <>
                  <div className="muted" style={{ fontSize: ".82rem", whiteSpace: "pre-wrap", maxHeight: 160, overflow: "auto", padding: 10, background: "rgba(7,10,18,0.5)", borderRadius: 10 }}>{assignment.prompt}</div>
                  <button className="ghost" style={{ marginTop: 8, fontSize: ".78rem" }} onClick={() => setAssignmentEditing(true)}>Edit</button>
                </>
              )}
              {assignment && assignment.requirements.length > 0 ? (
                <ul style={{ listStyle: "none", paddingLeft: 0, marginTop: 12 }}>
                  {assignment.requirements.map((req) => (
                    <li key={req.id} style={{ marginBottom: 6, display: "flex", gap: 8, alignItems: "flex-start" }}>
                      <input type="checkbox" checked={req.checked} onChange={() => onToggleRequirement(req.id)} style={{ width: "auto", marginTop: 4 }} />
                      <span style={{ fontSize: ".86rem", textDecoration: req.checked ? "line-through" : "none", color: req.checked ? "var(--muted)" : "var(--text)" }}>{req.text}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </details>
        </div>

        <label className="block" style={{ marginTop: 14 }}>Notes</label>
        <textarea ref={notesTextareaRef} value={notes} onChange={(event) => onWriteNotes(activeScope, event.target.value)} style={{ minHeight: 260 }} placeholder={`Write notes for ${label(activeScope)}…`} aria-label={`Notes for ${label(activeScope)}`} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: ".76rem", marginTop: 4, flexWrap: "wrap", gap: 6 }}>
          <span className={`thesis-pill ${thesisResult.confidence}`} title={thesisResult.reason}>
            {thesisResult.confidence === "strong" ? "✓ Thesis" : thesisResult.confidence === "weak" ? "⚠ Possible thesis" : "○ No thesis"}
          </span>
          {(() => {
            const stats = readingStats(notes);
            return <span className="muted">{stats.words.toLocaleString()} words · {stats.chars.toLocaleString()} chars · ~{stats.minutes} min · autosaved</span>;
          })()}
        </div>
        {thesisResult.confidence !== "strong" && notes.trim().length > 40 ? (
          <div className="thesis-hint" role="note">
            <span className="muted" style={{ fontSize: ".72rem", textTransform: "uppercase", letterSpacing: ".1em", fontWeight: 600, display: "block", marginBottom: 4 }}>Thesis coach</span>
            <span style={{ fontSize: ".82rem", lineHeight: 1.5 }}>{thesisHint(thesisResult.confidence)}</span>
          </div>
        ) : null}
        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          <button className="primary" onClick={async () => {
            const result = await saveNotesAsMarkdown(notes, { title: label(activeScope), scope: activeScope }, workspace);
            if (!result.ok && result.error !== "Cancelled") onToast({ kind: "warn", text: result.error });
            else if (result.ok) onToast({ kind: "good", text: "Saved as .md" });
          }}>⬇ Save as .md</button>
          <button className="ghost" onClick={async () => {
            const result = await saveNotesAsTxt(notes, { title: label(activeScope), scope: activeScope });
            if (!result.ok && result.error !== "Cancelled") onToast({ kind: "warn", text: result.error });
            else if (result.ok) onToast({ kind: "good", text: "Saved as .txt" });
          }}>.txt</button>
          <button className="ghost" onClick={async () => {
            const result = await loadNotesFromTxt();
            if (!result.ok) {
              if (result.error !== "Cancelled") onToast({ kind: "warn", text: result.error });
              return;
            }
            onWriteNotes(activeScope, (notes ? notes + "\n\n" : "") + result.text);
            onToast({ kind: "good", text: `Loaded ${result.fileName}` });
          }}>⬆ Load .txt</button>
        </div>

        <div style={{ marginTop: 14, padding: 10, background: "rgba(7,10,18,0.5)", border: "1px solid var(--border)", borderRadius: 10 }}>
          <div style={{ fontSize: ".78rem", fontWeight: 600, color: "var(--muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".1em" }}>Readiness</div>
          <ul style={{ listStyle: "none", paddingLeft: 0, margin: 0 }}>
            {readyCriteria.map((entry) => (
              <li key={entry.label} style={{ fontSize: ".82rem", marginBottom: 2 }}>
                <span style={{ color: entry.met ? "var(--good)" : "var(--muted)" }}>{entry.met ? "●" : "○"}</span>{" "}
                <strong style={{ color: entry.met ? "var(--text)" : "var(--muted)" }}>{entry.label}</strong>
                <span className="muted"> — {entry.detail}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 8 }}>
          Citations
          <span className="muted" style={{ fontSize: ".78rem", fontWeight: 400 }}>
            {directUsed}/{DIRECT_QUOTE_MAX} direct · {paraphraseUsed}/{PARAPHRASE_MAX} paraphrased
          </span>
        </h3>
        {citations.length === 0 ? (
          <p className="muted">No citations picked yet. In Reader, click any highlighted sentence to pick it as a direct quote or paraphrase (hard budgets enforced).</p>
        ) : (
          <ul style={{ listStyle: "none", paddingLeft: 0, marginTop: 6 }}>
            {citations.map((citation) => {
              const source = workspace.sources.find((entry) => entry.id === citation.sourceId);
              return (
                <li key={citation.id} className="citation-row">
                  <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4, flexWrap: "wrap" }}>
                    <span className={`tag ${citation.kind === "direct" ? "good" : "violet"}`}>{citation.kind === "direct" ? "❝ direct" : "≈ paraphrase"}</span>
                    <span className="muted" style={{ fontSize: ".74rem" }}>{new Date(citation.pickedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    <button className="ghost" style={{ marginLeft: "auto", fontSize: ".7rem", padding: "2px 8px" }} onClick={() => onInsertCitation(citation)}>↪ Insert into notes</button>
                    <button className="ghost" style={{ fontSize: ".7rem", padding: "2px 8px" }} onClick={() => onRemoveCitation(citation.id)}>Remove</button>
                  </div>
                  <blockquote style={{ margin: 0, fontSize: ".86rem", lineHeight: 1.5, borderLeft: "3px solid var(--accent)", paddingLeft: 10, color: "var(--text)" }}>
                    "{citation.sentence}"
                  </blockquote>
                  <div className="muted" style={{ fontSize: ".72rem", marginTop: 4 }}>
                    — {source?.title ?? citation.sourceId}{citation.headingTrail.length > 0 ? ` · ${citation.headingTrail.join(" / ")}` : ""}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <p className="muted" style={{ fontSize: ".72rem", marginTop: 10, fontStyle: "italic" }}>
          ⚠ Verify each quote against the source and confirm citation format before submitting.
        </p>

        {(workspace.analysis?.crossLinks ?? []).length > 0 ? (
          <details style={{ marginTop: 14 }}>
            <summary style={{ cursor: "pointer", fontSize: ".84rem", fontWeight: 600, color: "var(--muted)" }}>Cross-links ({(workspace.analysis?.crossLinks ?? []).length})</summary>
            <ul style={{ marginTop: 8 }}>
              {(workspace.analysis?.crossLinks ?? []).slice(0, 12).map((link, index) => {
                const left = workspace.sources.find((source) => source.id === link.fromSourceId);
                const right = workspace.sources.find((source) => source.id === link.toSourceId);
                return (
                  <li key={index} className="muted" style={{ marginBottom: 6 }}>
                    <strong>{left?.title ?? link.fromSourceId}</strong> ↔ <strong>{right?.title ?? link.toSourceId}</strong>
                    <div style={{ fontSize: ".78rem" }}>overlap {(link.overlap * 100).toFixed(1)}% · {link.sharedTokens.slice(0, 6).join(", ")}</div>
                  </li>
                );
              })}
            </ul>
          </details>
        ) : null}
      </div>
    </div>
  );
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function HomeView({ workspace, activeSources, onNavigate, onOpenReader, onStartQuickSession, onLaunchGym, onLaunchDeepRead }: {
  workspace: Workspace;
  activeSources: SourceDoc[];
  onNavigate: (view: View) => void;
  onOpenReader: (sourceId: string, conceptId?: string) => void;
  onStartQuickSession: (size: number) => void;
  onLaunchGym: () => void;
  onLaunchDeepRead: () => void;
}) {
  const concepts = workspace.analysis?.concepts ?? [];
  const stageCounts = useMemo(() => {
    const counts: Record<MemoryStage, number> = { unseen: 0, fragile: 0, forming: 0, stable: 0, crystallized: 0 };
    for (const concept of concepts) counts[memoryStage(workspace.mastery[concept.id])] += 1;
    return counts;
  }, [concepts, workspace.mastery]);
  const citations = workspace.citations ?? [];
  const directCount = citations.filter((entry) => entry.kind === "direct").length;
  const paraphraseCount = citations.filter((entry) => entry.kind === "paraphrase").length;
  const practicedCount = Object.values(workspace.mastery).filter((entry) => entry.correct + entry.missed > 0).length;
  const totalAttempts = Object.values(workspace.mastery).reduce((sum, entry) => sum + entry.correct + entry.missed, 0);
  const accuracy = totalAttempts > 0 ? Math.round((Object.values(workspace.mastery).reduce((sum, entry) => sum + entry.correct, 0) / totalAttempts) * 100) : null;
  const assignment = workspace.assignment;
  const requirementsDone = assignment ? assignment.requirements.filter((req) => req.checked).length : 0;
  const requirementsTotal = assignment ? assignment.requirements.length : 0;
  const thesisResult = detectThesis(workspace.notesByScope.__all__ ?? "");
  const hasSources = workspace.sources.length > 0;
  const hasConcepts = concepts.length > 0;
  const hasPractice = Object.keys(workspace.mastery).length > 0;
  const isFirstTime = !hasSources && !hasConcepts && !hasPractice && citations.length === 0 && !assignment?.prompt;
  const readyCount = (
    (thesisResult.confidence === "strong" ? 1 : 0) +
    (assignment && requirementsTotal > 0 && requirementsDone === requirementsTotal ? 1 : 0) +
    (citations.length >= 2 ? 1 : 0) +
    ((workspace.notesByScope.__all__ ?? "").length >= 200 ? 1 : 0)
  );

  return (
    <div className="home-view">
      <section className="home-hero">
        <div>
          <div className="home-hero-eyebrow">{isFirstTime ? "Welcome" : "Welcome back"}</div>
          <h1 className="home-hero-title">
            {hasConcepts ? <>Your knowledge map has <span style={{ color: "var(--accent)" }}>{concepts.length}</span> concept{concepts.length === 1 ? "" : "s"} across <span style={{ color: "var(--gold)" }}>{activeSources.length}</span> source{activeSources.length === 1 ? "" : "s"}.</>
              : hasSources ? <>You have <span style={{ color: "var(--accent)" }}>{activeSources.length}</span> source{activeSources.length === 1 ? "" : "s"} waiting to be analyzed.</>
              : <>Let's build your first study workspace.</>}
          </h1>
          <p className="home-hero-sub">
            {hasConcepts ? "Pick up where you left off — or start a fresh study session."
              : hasSources ? "Run Analyze to extract concepts, evidence, and cross-links."
              : "Paste text, upload a PDF, or import a captured page. The deterministic engine will do the rest — offline, in your browser."}
          </p>
        </div>
      </section>

      <section className="home-metrics">
        <button className="home-metric" onClick={() => onNavigate("ingest")}>
          <div className="home-metric-icon">📚</div>
          <div className="home-metric-value">{workspace.sources.length}</div>
          <div className="home-metric-label">Sources</div>
          <div className="home-metric-sub">{activeSources.length} active</div>
        </button>
        <button className="home-metric" onClick={() => onNavigate("concepts")} disabled={!hasConcepts}>
          <div className="home-metric-icon">🧠</div>
          <div className="home-metric-value">{concepts.length}</div>
          <div className="home-metric-label">Concepts</div>
          <div className="home-metric-sub">
            {hasConcepts ? (
              <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                <span className="stage-pill stage-crystallized" style={{ fontSize: ".68rem", padding: "1px 6px" }}>💎 {stageCounts.crystallized}</span>
                <span className="stage-pill stage-stable" style={{ fontSize: ".68rem", padding: "1px 6px" }}>🟢 {stageCounts.stable}</span>
                {stageCounts.forming > 0 ? <span className="stage-pill stage-forming" style={{ fontSize: ".68rem", padding: "1px 6px" }}>🔵 {stageCounts.forming}</span> : null}
              </span>
            ) : "Not analyzed yet"}
          </div>
        </button>
        <button className="home-metric" onClick={() => onNavigate("study")} disabled={!hasConcepts}>
          <div className="home-metric-icon">🎯</div>
          <div className="home-metric-value">{accuracy !== null ? `${accuracy}%` : "—"}</div>
          <div className="home-metric-label">Accuracy</div>
          <div className="home-metric-sub">{practicedCount} concepts practiced</div>
        </button>
        <button className="home-metric" onClick={() => onNavigate("notes")}>
          <div className="home-metric-icon">✍</div>
          <div className="home-metric-value">{directCount}/{DIRECT_QUOTE_MAX}<span className="muted" style={{ fontWeight: 400, fontSize: "1.1rem" }}> · {paraphraseCount}/{PARAPHRASE_MAX}</span></div>
          <div className="home-metric-label">Quote budget</div>
          <div className="home-metric-sub">{citations.length} picked</div>
        </button>
        <button className="home-metric home-metric-ready" onClick={() => onNavigate("notes")}>
          <div className="home-metric-icon">🏁</div>
          <div className="home-metric-value">{readyCount}/4</div>
          <div className="home-metric-label">Readiness</div>
          <div className="home-metric-sub">
            {readyCount === 4 ? <span style={{ color: "var(--good)" }}>✓ Ready to submit</span> : "Thesis · Requirements · Citations · Content"}
          </div>
        </button>
      </section>

      <section className="home-actions">
        <h2>Next step</h2>
        <div className="grid grid-3">
          {!hasSources ? (
            <>
              <button className="home-action primary" onClick={() => onNavigate("ingest")}>
                <div className="home-action-icon">⚡</div>
                <div className="home-action-title">Add your first source</div>
                <div className="home-action-sub">Paste, upload, or import — we'll extract concepts automatically.</div>
              </button>
              <button className="home-action" onClick={() => onNavigate("notes")}>
                <div className="home-action-icon">📋</div>
                <div className="home-action-title">Set up an assignment</div>
                <div className="home-action-sub">Paste the prompt to generate a requirements checklist.</div>
              </button>
            </>
          ) : !hasConcepts ? (
            <>
              <button className="home-action primary" onClick={() => onNavigate("ingest")}>
                <div className="home-action-icon">🚀</div>
                <div className="home-action-title">Analyze {activeSources.length} source{activeSources.length === 1 ? "" : "s"}</div>
                <div className="home-action-sub">Extract concepts, evidence lanes, and cross-links.</div>
              </button>
              <button className="home-action" onClick={() => onNavigate("read")}>
                <div className="home-action-icon">📖</div>
                <div className="home-action-title">Preview sources</div>
                <div className="home-action-sub">Read before analyzing — exclude junk pages.</div>
              </button>
            </>
          ) : (
            <>
              <button className="home-action primary" onClick={() => onStartQuickSession(10)}>
                <div className="home-action-icon">⚡</div>
                <div className="home-action-title">Quick 10-question sprint</div>
                <div className="home-action-sub">Weakest first · timer runs · ends with accuracy summary and next-action suggestion.</div>
              </button>
              <button className="home-action" onClick={() => onStartQuickSession(5)}>
                <div className="home-action-icon">🎯</div>
                <div className="home-action-title">5-minute warmup</div>
                <div className="home-action-sub">Five questions targeting your fragile concepts. Good pre-class prime.</div>
              </button>
              <button className="home-action" onClick={() => onLaunchGym()}>
                <div className="home-action-icon">🥊</div>
                <div className="home-action-title">Distinction Gym</div>
                <div className="home-action-sub">Opens a fresh pair of rival concepts — learn where their borders actually sit.</div>
              </button>
              <button className="home-action" onClick={() => onLaunchDeepRead()}>
                <div className="home-action-icon">📖</div>
                <div className="home-action-title">Deep read largest source</div>
                <div className="home-action-sub">Jumps to your biggest source in pristine mode — ideal for a long reading block.</div>
              </button>
              <button className="home-action" onClick={() => onNavigate("notes")}>
                <div className="home-action-icon">✍</div>
                <div className="home-action-title">Draft &amp; cite</div>
                <div className="home-action-sub">Thesis · requirements · quote budget · markdown export.</div>
              </button>
              <button className="home-action" onClick={() => onNavigate("concepts")}>
                <div className="home-action-icon">🔎</div>
                <div className="home-action-title">Browse concepts</div>
                <div className="home-action-sub">{concepts.length} admitted — search, filter by memory stage, sort by mastery.</div>
              </button>
            </>
          )}
        </div>
      </section>

      {hasConcepts ? (() => {
        const due = dueConcepts(concepts, workspace.mastery);
        if (due.length === 0) return null;
        return (
          <section className="home-review">
            <button className="home-review-card review-due" onClick={() => onNavigate("study")}>
              <div className="home-review-icon">⏰</div>
              <div>
                <div className="home-review-title">{due.length} concept{due.length === 1 ? "" : "s"} due for review</div>
                <div className="home-review-sub">Spaced-repetition schedule says now is the moment → jump into Study.</div>
              </div>
            </button>
          </section>
        );
      })() : null}

      {hasConcepts && Object.keys(workspace.mastery).length > 0 ? (() => {
        const streak = computeStreak(workspace.mastery);
        const todayCount = practicedToday(workspace.mastery);
        return (
        <section className="home-recent">
          <div className="home-recent-heading">
            <h2>Recently studied</h2>
            <div className="home-recent-meta">
              {streak > 0 ? (
                <span className="recent-streak-badge" title={`${streak} consecutive day${streak === 1 ? "" : "s"} of practice`}>
                  <span aria-hidden="true">🔥</span>
                  <strong>{streak}</strong>
                  <span className="muted">day streak</span>
                </span>
              ) : null}
              {todayCount > 0 ? (
                <span className="recent-today-badge" title={`${todayCount} concepts practiced today`}>
                  <strong>{todayCount}</strong> <span className="muted">today</span>
                </span>
              ) : null}
            </div>
          </div>
          <div className="home-recent-strip">
            {Object.entries(workspace.mastery)
              .sort(([, leftRecord], [, rightRecord]) => rightRecord.lastSeen - leftRecord.lastSeen)
              .slice(0, 6)
              .map(([conceptId, record]) => {
                const concept = concepts.find((entry) => entry.id === conceptId);
                if (!concept) return null;
                const stage = memoryStage(record);
                const stageMeta = memoryStageLabel(stage);
                const firstSource = concept.sourceIds[0] ?? concept.evidence[0]?.sourceId ?? null;
                const timeAgo = (() => {
                  const delta = Math.max(0, Date.now() - record.lastSeen);
                  const minutes = Math.round(delta / 60000);
                  if (minutes < 1) return "just now";
                  if (minutes < 60) return `${minutes}m ago`;
                  const hours = Math.round(minutes / 60);
                  if (hours < 24) return `${hours}h ago`;
                  const days = Math.round(hours / 24);
                  return `${days}d ago`;
                })();
                return (
                  <button
                    key={conceptId}
                    className="home-recent-card"
                    onClick={() => firstSource ? onOpenReader(firstSource, conceptId) : onNavigate("concepts")}
                    title={`Open in Reader with ${concept.label} focused`}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span className={`stage-pill stage-${stage}`} style={{ fontSize: ".68rem", padding: "1px 6px" }}>{stageMeta.icon}</span>
                      <strong style={{ fontSize: ".88rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{concept.label}</strong>
                    </div>
                    <div className="muted" style={{ fontSize: ".72rem", marginTop: 4 }}>
                      {record.correct}✓ {record.missed}✗ · {timeAgo}
                    </div>
                  </button>
                );
              })}
          </div>
        </section>
        );
      })() : null}

      {hasConcepts ? (
        <section className="home-stages">
          <h2>Memory distribution</h2>
          <div className="home-stage-bar">
            {(["crystallized", "stable", "forming", "fragile", "unseen"] as MemoryStage[]).map((stage) => {
              const count = stageCounts[stage];
              const pct = concepts.length > 0 ? (count / concepts.length) * 100 : 0;
              if (pct === 0) return null;
              return <div key={stage} className={`home-stage-segment stage-${stage}`} style={{ width: `${pct}%` }} title={`${memoryStageLabel(stage).icon} ${memoryStageLabel(stage).label}: ${count}`} />;
            })}
          </div>
          <div className="home-stage-legend">
            {(["crystallized", "stable", "forming", "fragile", "unseen"] as MemoryStage[]).map((stage) => {
              const meta = memoryStageLabel(stage);
              return (
                <span key={stage} className={`stage-pill stage-${stage}`}>
                  {meta.icon} {meta.label} · {stageCounts[stage]}
                </span>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function GymView({ workspace, pairIdx, picked, onPick, onNext, onReset, onJumpToReader }: {
  workspace: Workspace;
  pairIdx: number;
  picked: string | null;
  onPick: (conceptId: string, correctId: string) => void;
  onNext: () => void;
  onReset: () => void;
  onJumpToReader: (sourceId: string, conceptId: string) => void;
}) {
  const concepts = workspace.analysis?.concepts ?? [];
  const pairs = useMemo(() => generateDistinctionPairs(concepts, 30), [concepts]);
  const pair = pairs[pairIdx] ?? null;
  useEffect(() => {
    const onAnswerPick = (event: Event) => {
      const detail = (event as CustomEvent).detail as { index: number };
      if (!pair || picked) return;
      const options = [pair.left, pair.right];
      const target = options[detail.index];
      if (target) onPick(target.id, pair.correctId);
    };
    const onAnswerNext = () => { if (picked) onNext(); };
    window.addEventListener("aeonthra:answer-pick", onAnswerPick);
    window.addEventListener("aeonthra:answer-next", onAnswerNext);
    return () => {
      window.removeEventListener("aeonthra:answer-pick", onAnswerPick);
      window.removeEventListener("aeonthra:answer-next", onAnswerNext);
    };
  }, [pair, picked, onPick, onNext]);
  if (concepts.length < 2) {
    return (
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Distinction Gym</h2>
        <p className="muted">Need at least 2 concepts with shared keywords to start training. Analyze more sources first.</p>
      </div>
    );
  }
  if (!pair) {
    return (
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Distinction Gym</h2>
        <p className="muted">
          You've completed all {pairs.length} distinction pair{pairs.length === 1 ? "" : "s"}. No rival concepts with meaningful overlap remain in the current corpus.
        </p>
        <button className="primary" onClick={onReset}>Restart</button>
      </div>
    );
  }
  const options = [pair.left, pair.right];
  return (
    <div className="grid grid-2">
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="muted" style={{ fontSize: ".78rem", letterSpacing: ".1em", textTransform: "uppercase" }}>Pair {pairIdx + 1} of {pairs.length}</div>
          <span className="tag violet">🥊 Distinction</span>
        </div>
        <h2 style={{ marginTop: 12, marginBottom: 6 }}>Which concept does this describe?</h2>
        <div className="gym-evidence">
          <span className="tag muted">{pair.evidence.role}</span>
          <div style={{ marginTop: 6, fontSize: "1rem", lineHeight: 1.6 }}>"{pair.evidence.sentence}"</div>
        </div>
        <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
          {options.map((option, optionIndex) => {
            const isCorrect = option.id === pair.correctId;
            const isChosen = option.id === picked;
            const base = picked ? (isCorrect ? "good" : isChosen ? "warn" : "ghost") : "ghost";
            const description = conceptDescribingText(option) || option.keywords.slice(0, 4).join(", ");
            return (
              <button
                key={option.id}
                className={base}
                onClick={(event) => {
                  if (picked) return;
                  event.currentTarget.blur();
                  onPick(option.id, pair.correctId);
                }}
                onKeyDown={(event) => {
                  if (picked && (event.key === " " || event.key === "Enter")) event.preventDefault();
                }}
                disabled={!!picked}
                style={{ textAlign: "left", padding: "14px 18px", display: "flex", gap: 12, alignItems: "flex-start" }}
                aria-label={`Option ${optionIndex + 1}: ${option.label}`}
              >
                <span className="option-key" aria-hidden="true">{String.fromCharCode(65 + optionIndex)}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: "1.05rem" }}>{option.label}</div>
                  <div className="muted" style={{ fontSize: ".82rem", marginTop: 2, lineHeight: 1.5 }}>
                    {description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        {!picked ? (
          <div style={{ marginTop: 12, fontSize: ".72rem", color: "var(--muted)" }}>
            <span className="kbd">A</span>/<span className="kbd">B</span> to pick · <span className="kbd">Space</span> next
          </div>
        ) : null}
        {picked ? (
          <div style={{ marginTop: 14, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <span className={`tag ${picked === pair.correctId ? "good" : "warn"}`}>
              {picked === pair.correctId ? "✓ Correct — the right lens sharpens." : `✗ The evidence belongs to "${pair.left.label}".`}
            </span>
            <button className="ghost" style={{ fontSize: ".8rem" }} onClick={() => onJumpToReader(pair.evidence.sourceId, pair.correctId)}>
              Read in context ↗
            </button>
            <button className="primary" style={{ marginLeft: 6 }} onClick={onNext}>Next →</button>
            <button className="ghost" onClick={onReset}>Reset</button>
          </div>
        ) : null}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Why this pair?</h3>
        <p className="muted" style={{ marginTop: 0, fontSize: ".85rem" }}>
          Distinction pairs surface concepts with overlapping vocabulary — where borders blur and students often confuse them. Knowing definitions isn't enough; the gym teaches borders.
        </p>
        <div style={{ marginTop: 14 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>{pair.left.label}</div>
          <div style={{ fontSize: ".88rem", marginBottom: 10, lineHeight: 1.6 }}>{conceptDescribingText(pair.left) || "(no description)"}</div>
          <div className="muted" style={{ fontSize: ".74rem", marginBottom: 14 }}>Keywords: {pair.left.keywords.slice(0, 6).join(", ")}</div>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>{pair.right.label}</div>
          <div style={{ fontSize: ".88rem", marginBottom: 10, lineHeight: 1.6 }}>{conceptDescribingText(pair.right) || "(no description)"}</div>
          <div className="muted" style={{ fontSize: ".74rem" }}>Keywords: {pair.right.keywords.slice(0, 6).join(", ")}</div>
        </div>
      </div>
    </div>
  );
}

type ReaderSegment = { text: string; highlighted: boolean; heading: boolean; key: string; conceptId?: string; headingTrail: string[]; findMatch?: boolean };

function buildReaderSegments(source: SourceDoc, sentenceToConcept: Map<string, string>): ReaderSegment[] {
  const body = (source.readerText && source.readerText.trim().length > 0) ? source.readerText : source.text;
  if (!body) return [];
  const headings = new Set(source.headings.map((heading) => heading.trim()).filter(Boolean));
  const highlights = [...sentenceToConcept.keys()]
    .filter((entry) => entry.length >= 6)
    .sort((left, right) => right.length - left.length);
  const paragraphs = body.split(/\n{2,}/);
  const segments: ReaderSegment[] = [];
  const headingTrail: string[] = [];
  paragraphs.forEach((paragraph, paragraphIndex) => {
    const trimmed = paragraph.trim();
    if (!trimmed) return;
    if (headings.has(trimmed)) {
      headingTrail.length = 0;
      headingTrail.push(trimmed);
      segments.push({ text: trimmed, highlighted: false, heading: true, key: `h-${paragraphIndex}`, headingTrail: [...headingTrail] });
      return;
    }
    if (highlights.length === 0) {
      segments.push({ text: trimmed, highlighted: false, heading: false, key: `p-${paragraphIndex}`, headingTrail: [...headingTrail] });
      return;
    }
    const pattern = new RegExp(`(${highlights.map(escapeRegExp).join("|")})`, "gi");
    const parts = trimmed.split(pattern);
    parts.forEach((part, partIndex) => {
      if (!part) return;
      const matchedKey = highlights.find((entry) => entry.toLowerCase() === part.toLowerCase());
      segments.push({
        text: part,
        highlighted: !!matchedKey,
        heading: false,
        key: `p-${paragraphIndex}-${partIndex}`,
        conceptId: matchedKey ? sentenceToConcept.get(matchedKey) : undefined,
        headingTrail: [...headingTrail]
      });
    });
    segments.push({ text: "\n\n", highlighted: false, heading: false, key: `br-${paragraphIndex}`, headingTrail: [] });
  });
  return segments;
}

function ReaderView({ workspace, activeSourceId, focusConceptId, fontScale, sepia, findQuery, onSelectSource, onFocusConcept, onChangeFontScale, onToggleSepia, onChangeFindQuery, onWriteNotes, onPickCitation }: {
  workspace: Workspace;
  activeSourceId: string | null;
  focusConceptId: string | null;
  fontScale: number;
  sepia: boolean;
  findQuery: string;
  onSelectSource: (id: string) => void;
  onFocusConcept: (id: string | null) => void;
  onChangeFontScale: (value: number) => void;
  onToggleSepia: () => void;
  onChangeFindQuery: (value: string) => void;
  onWriteNotes: (scope: string, text: string) => void;
  onPickCitation: (input: Omit<Citation, "id" | "pickedAt">) => void;
}) {
  const effectiveSourceId = activeSourceId ?? workspace.sources[0]?.id ?? null;
  const source = workspace.sources.find((entry) => entry.id === effectiveSourceId) ?? null;
  const [pickerOpenKey, setPickerOpenKey] = useState<string | null>(null);
  const conceptsForSource = useMemo(() => {
    if (!source || !workspace.analysis) return [];
    return workspace.analysis.concepts.filter((concept) =>
      concept.sourceIds.includes(source.id) || concept.evidence.some((span) => span.sourceId === source.id)
    );
  }, [workspace.analysis, source]);
  const focusConcept = conceptsForSource.find((concept) => concept.id === focusConceptId) ?? null;
  const sentenceToConcept = useMemo(() => {
    const map = new Map<string, string>();
    if (!source) return map;
    const pool = focusConcept
      ? focusConcept.evidence.filter((span) => span.sourceId === source.id).map((span) => ({ sentence: span.sentence, conceptId: focusConcept.id }))
      : conceptsForSource.flatMap((concept) => concept.evidence.filter((span) => span.sourceId === source.id).map((span) => ({ sentence: span.sentence, conceptId: concept.id })));
    for (const entry of pool) {
      const trimmed = entry.sentence.trim();
      if (trimmed.length >= 6 && !map.has(trimmed)) map.set(trimmed, entry.conceptId);
    }
    return map;
  }, [focusConcept, conceptsForSource, source]);
  const baseSegments = useMemo(() => source ? buildReaderSegments(source, sentenceToConcept) : [], [source, sentenceToConcept]);
  const segments = useMemo(() => {
    const q = findQuery.trim();
    if (!q || q.length < 2) return baseSegments;
    const pattern = new RegExp(`(${escapeRegExp(q)})`, "gi");
    const next: typeof baseSegments = [];
    for (const segment of baseSegments) {
      if (segment.heading || segment.text === "\n\n") { next.push(segment); continue; }
      const parts = segment.text.split(pattern);
      parts.forEach((part, index) => {
        if (!part) return;
        const isFindMatch = part.toLowerCase() === q.toLowerCase();
        next.push({ ...segment, text: part, key: `${segment.key}-f${index}`, findMatch: isFindMatch });
      });
    }
    return next;
  }, [baseSegments, findQuery]);
  const scope = source?.id ?? "__all__";
  const notes = workspace.notesByScope[scope] ?? "";
  const readerRef = useRef<HTMLDivElement | null>(null);
  const citations = workspace.citations ?? [];
  const directUsed = citations.filter((entry) => entry.kind === "direct").length;
  const paraphraseUsed = citations.filter((entry) => entry.kind === "paraphrase").length;
  const findMatches = useMemo(() => {
    if (!source || !findQuery.trim()) return 0;
    return findInText(source.readerText || source.text, findQuery).length;
  }, [source, findQuery]);

  const [findHitIndex, setFindHitIndex] = useState(0);

  useEffect(() => { setFindHitIndex(0); }, [findQuery, effectiveSourceId]);

  useEffect(() => {
    if (!findQuery.trim() || !readerRef.current) return;
    const hits = readerRef.current.querySelectorAll("mark.reader-find");
    const target = hits[findHitIndex] ?? hits[0];
    hits.forEach((hit) => hit.classList.remove("active"));
    if (target) {
      target.classList.add("active");
      if (typeof target.scrollIntoView === "function") {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [findQuery, effectiveSourceId, findHitIndex, segments]);

  useEffect(() => {
    const onNext = (event: Event) => {
      const detail = (event as CustomEvent).detail as { reverse: boolean } | undefined;
      if (!readerRef.current) return;
      const total = readerRef.current.querySelectorAll("mark.reader-find").length;
      if (total === 0) return;
      setFindHitIndex((prev) => {
        const delta = detail?.reverse ? -1 : 1;
        return (prev + delta + total) % total;
      });
    };
    window.addEventListener("aeonthra:find-next", onNext);
    return () => window.removeEventListener("aeonthra:find-next", onNext);
  }, []);

  useEffect(() => {
    if (!focusConceptId || !readerRef.current) return;
    const firstHighlight = readerRef.current.querySelector("mark.reader-highlight");
    if (firstHighlight && typeof firstHighlight.scrollIntoView === "function") {
      firstHighlight.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [focusConceptId, effectiveSourceId]);

  if (!source) {
    return (
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Reader</h2>
        <p className="muted">No source selected. Add a source in Ingest first.</p>
      </div>
    );
  }

  return (
    <div className="reader">
      <aside className="reader-side">
        <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>
          <div className="muted" style={{ fontSize: ".72rem", textTransform: "uppercase", letterSpacing: ".1em" }}>Sources ({workspace.sources.length})</div>
        </div>
        <div style={{ overflowY: "auto", padding: "6px 6px 10px" }}>
          {workspace.sources.map((entry) => (
            <button
              key={entry.id}
              onClick={() => onSelectSource(entry.id)}
              className={`reader-source-btn ${entry.id === source.id ? "active" : ""}`}
              style={{ display: "block", width: "100%", textAlign: "left", marginBottom: 4 }}
            >
              <div style={{ fontWeight: 600, fontSize: ".85rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{entry.title}</div>
              <div className="muted" style={{ fontSize: ".7rem" }}>{entry.kind} · {entry.text.length.toLocaleString()} chars</div>
            </button>
          ))}
        </div>
        {conceptsForSource.length > 0 ? (
          <>
            <div style={{ padding: "10px 12px", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
              <div className="muted" style={{ fontSize: ".72rem", textTransform: "uppercase", letterSpacing: ".1em" }}>
                Concepts in this source ({conceptsForSource.length})
              </div>
            </div>
            <div style={{ overflowY: "auto", padding: "6px 6px 10px", flex: 1 }}>
              <button
                className={`reader-source-btn ${focusConceptId === null ? "active" : ""}`}
                onClick={() => onFocusConcept(null)}
                style={{ display: "block", width: "100%", textAlign: "left", marginBottom: 4 }}
              >
                <div style={{ fontWeight: 600, fontSize: ".82rem" }}>Show all evidence</div>
                <div className="muted" style={{ fontSize: ".7rem" }}>{conceptsForSource.reduce((sum, concept) => sum + concept.evidence.filter((span) => span.sourceId === source.id).length, 0)} spans</div>
              </button>
              {conceptsForSource.map((concept) => (
                <button
                  key={concept.id}
                  className={`reader-source-btn ${focusConceptId === concept.id ? "active" : ""}`}
                  onClick={() => onFocusConcept(concept.id)}
                  style={{ display: "block", width: "100%", textAlign: "left", marginBottom: 4 }}
                >
                  <div style={{ fontWeight: 600, fontSize: ".82rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{concept.label}</div>
                  <div className="muted" style={{ fontSize: ".7rem" }}>{concept.evidence.filter((span) => span.sourceId === source.id).length} spans · score {concept.score}</div>
                </button>
              ))}
            </div>
          </>
        ) : null}
      </aside>

      <main className="reader-main">
        <div className="reader-toolbar">
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{source.title}</div>
            <div className="muted" style={{ fontSize: ".75rem" }}>
              {(() => {
                const stats = readingStats(source.readerText || source.text);
                return (
                  <>
                    {source.kind}
                    {source.url ? <> · <a href={source.url} target="_blank" rel="noreferrer">{new URL(source.url, "https://x.local").host}</a></> : null}
                    {source.headings.length > 0 ? ` · ${source.headings.length} headings` : ""}
                    {` · ${stats.words.toLocaleString()} words · ~${stats.minutes} min read`}
                    {source.readerText ? " · pristine" : " · raw text only"}
                    {focusConcept ? <> · focused on <strong style={{ color: "var(--accent)" }}>{focusConcept.label}</strong></> : null}
                  </>
                );
              })()}
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
            <div className="find-bar" role="search">
              <span style={{ fontSize: ".9rem" }} aria-hidden="true">🔎</span>
              <input
                value={findQuery}
                onChange={(event) => onChangeFindQuery(event.target.value)}
                placeholder="Find in source (/ to focus, Enter next, Shift+Enter prev)"
                style={{ padding: "4px 8px", fontSize: ".78rem" }}
                aria-label="Find in source"
              />
              {findQuery ? (
                <>
                  <span className="muted" style={{ fontSize: ".72rem", minWidth: 64, textAlign: "right" }} aria-live="polite">
                    {findMatches === 0 ? "0 matches" : `${(findHitIndex + 1).toLocaleString()} / ${findMatches.toLocaleString()}`}
                  </span>
                  <button
                    className="ghost"
                    style={{ padding: "2px 7px", fontSize: ".72rem" }}
                    onClick={() => setFindHitIndex((prev) => (findMatches === 0 ? 0 : (prev - 1 + findMatches) % findMatches))}
                    disabled={findMatches === 0}
                    aria-label="Previous match"
                    title="Previous (Shift+Enter)"
                  >↑</button>
                  <button
                    className="ghost"
                    style={{ padding: "2px 7px", fontSize: ".72rem" }}
                    onClick={() => setFindHitIndex((prev) => (findMatches === 0 ? 0 : (prev + 1) % findMatches))}
                    disabled={findMatches === 0}
                    aria-label="Next match"
                    title="Next (Enter)"
                  >↓</button>
                  <button className="ghost" style={{ padding: "2px 8px", fontSize: ".72rem" }} onClick={() => onChangeFindQuery("")} aria-label="Clear find" title="Clear (Esc)">✕</button>
                </>
              ) : null}
            </div>
            <span className={`budget-pill ${directUsed >= DIRECT_QUOTE_MAX ? "full" : ""}`} title="Direct-quote budget">❝ {directUsed}/{DIRECT_QUOTE_MAX}</span>
            <span className={`budget-pill paraphrase ${paraphraseUsed >= PARAPHRASE_MAX ? "full" : ""}`} title="Paraphrase budget">≈ {paraphraseUsed}/{PARAPHRASE_MAX}</span>
            <button className={`ghost ${sepia ? "active-toggle" : ""}`} style={{ padding: "4px 10px", fontSize: ".78rem" }} onClick={onToggleSepia} title="Toggle sepia reading mode">
              {sepia ? "🌙 Dark" : "☀ Sepia"}
            </button>
            <button className="ghost" style={{ padding: "4px 10px", fontSize: ".78rem" }} onClick={() => onChangeFontScale(Math.max(0.8, Number((fontScale - 0.1).toFixed(2))))}>A−</button>
            <span className="muted" style={{ fontSize: ".72rem", minWidth: 32, textAlign: "center" }}>{Math.round(fontScale * 100)}%</span>
            <button className="ghost" style={{ padding: "4px 10px", fontSize: ".78rem" }} onClick={() => onChangeFontScale(Math.min(1.6, Number((fontScale + 0.1).toFixed(2))))}>A+</button>
          </div>
        </div>
        <div ref={readerRef} className={`reader-body ${sepia ? "sepia" : ""}`} style={{ fontSize: `${fontScale}rem` }}>
          {segments.length === 0 ? (
            <p className="muted">No readable text.</p>
          ) : segments.map((segment) => {
            if (segment.text === "\n\n") return <div key={segment.key} style={{ height: 10 }} />;
            if (segment.heading) return <h3 key={segment.key} className="reader-heading">{segment.text}</h3>;
            if (segment.findMatch && !segment.highlighted) {
              return <mark key={segment.key} className="reader-find">{segment.text}</mark>;
            }
            if (segment.highlighted) {
              const isOpen = pickerOpenKey === segment.key;
              const alreadyPickedDirect = citations.some((entry) => entry.sourceId === source.id && entry.kind === "direct" && entry.sentence === segment.text);
              const alreadyPickedPara = citations.some((entry) => entry.sourceId === source.id && entry.kind === "paraphrase" && entry.sentence === segment.text);
              return (
                <span key={segment.key} className="reader-highlight-wrap">
                  <mark
                    className={`reader-highlight ${isOpen ? "open" : ""}`}
                    onClick={() => setPickerOpenKey(isOpen ? null : segment.key)}
                    role="button"
                    tabIndex={0}
                  >
                    {segment.text}
                  </mark>
                  {isOpen ? (
                    <span className="quote-picker" role="dialog">
                      <button
                        className="ghost"
                        disabled={alreadyPickedDirect || directUsed >= DIRECT_QUOTE_MAX}
                        onClick={() => {
                          onPickCitation({ sourceId: source.id, conceptId: segment.conceptId, sentence: segment.text, headingTrail: segment.headingTrail, kind: "direct", scope });
                          setPickerOpenKey(null);
                        }}
                      >
                        ❝ Direct ({directUsed}/{DIRECT_QUOTE_MAX})
                      </button>
                      <button
                        className="ghost"
                        disabled={alreadyPickedPara || paraphraseUsed >= PARAPHRASE_MAX}
                        onClick={() => {
                          onPickCitation({ sourceId: source.id, conceptId: segment.conceptId, sentence: segment.text, headingTrail: segment.headingTrail, kind: "paraphrase", scope });
                          setPickerOpenKey(null);
                        }}
                      >
                        ≈ Paraphrase ({paraphraseUsed}/{PARAPHRASE_MAX})
                      </button>
                      <button className="ghost" onClick={() => setPickerOpenKey(null)}>✕</button>
                    </span>
                  ) : null}
                </span>
              );
            }
            return <span key={segment.key}>{segment.text}</span>;
          })}
        </div>
      </main>

      <aside className="reader-notes">
        <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>
          <div className="muted" style={{ fontSize: ".72rem", textTransform: "uppercase", letterSpacing: ".1em" }}>Notes for this source</div>
        </div>
        <textarea
          value={notes}
          onChange={(event) => onWriteNotes(scope, event.target.value)}
          placeholder={`Write notes for "${source.title}"…`}
          style={{ flex: 1, borderRadius: 0, border: "none", resize: "none", minHeight: 200 }}
        />
        <div className="muted" style={{ fontSize: ".7rem", padding: "4px 12px", textAlign: "right", borderTop: "1px solid var(--border)" }}>{notes.length} chars · autosaved</div>
      </aside>
    </div>
  );
}

type PaletteItem = {
  kind: "view" | "source" | "concept";
  id: string;
  label: string;
  sublabel: string;
  action: () => void;
};

function CommandPalette({ workspace, onNavigate, onOpenReader, onClose }: {
  workspace: Workspace;
  onNavigate: (view: View) => void;
  onOpenReader: (sourceId: string, conceptId?: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const concepts = workspace.analysis?.concepts ?? [];
  useEffect(() => { inputRef.current?.focus(); }, []);

  const items = useMemo<PaletteItem[]>(() => {
    const base: PaletteItem[] = [
      { kind: "view", id: "home", label: "Go to Home", sublabel: "Dashboard · metrics · review queue", action: () => onNavigate("home") },
      { kind: "view", id: "ingest", label: "Go to Ingest", sublabel: "Paste, upload, URL, JSON — 4 tabs", action: () => onNavigate("ingest") },
      ...(workspace.sources.length > 0 ? [{ kind: "view" as const, id: "read", label: "Go to Reader", sublabel: "Pristine source text with evidence highlights", action: () => onNavigate("read") }] : []),
      { kind: "view", id: "concepts", label: "Go to Concepts", sublabel: `${concepts.length} concepts extracted`, action: () => onNavigate("concepts") },
      ...(concepts.length > 0 ? [{ kind: "view" as const, id: "study", label: "Go to Study", sublabel: "Deterministic practice questions", action: () => onNavigate("study") }] : []),
      ...(concepts.length >= 2 ? [{ kind: "view" as const, id: "gym", label: "Go to Distinction Gym", sublabel: "Learn borders between rival concepts", action: () => onNavigate("gym") }] : []),
      { kind: "view", id: "notes", label: "Go to Notes", sublabel: "Thesis · requirements · citations · markdown export", action: () => onNavigate("notes") },
      ...workspace.sources.slice(0, 40).map((source): PaletteItem => ({
        kind: "source",
        id: source.id,
        label: source.title,
        sublabel: `${source.kind} · ${source.text.length.toLocaleString()} chars${source.url ? " · " + source.url.slice(0, 48) : ""}`,
        action: () => onOpenReader(source.id)
      })),
      ...concepts.slice(0, 80).map((concept): PaletteItem => ({
        kind: "concept",
        id: concept.id,
        label: concept.label,
        sublabel: `score ${concept.score} · ${concept.evidence.length} evidence · ${(concept.definition || concept.summary || "").slice(0, 80)}`,
        action: () => { const first = concept.sourceIds[0] ?? concept.evidence[0]?.sourceId; if (first) onOpenReader(first, concept.id); else onNavigate("concepts"); }
      }))
    ];
    const q = query.trim().toLowerCase();
    if (!q) return base.slice(0, 12);
    return base.filter((item) =>
      item.label.toLowerCase().includes(q) || item.sublabel.toLowerCase().includes(q)
    ).slice(0, 24);
  }, [query, workspace.sources, concepts, onNavigate, onOpenReader]);

  useEffect(() => { setCursor(0); }, [query]);

  return (
    <div className="palette-scrim" onClick={onClose} role="dialog" aria-label="Command palette">
      <div className="palette" onClick={(event) => event.stopPropagation()}>
        <div className="palette-header">
          <span style={{ fontSize: "1rem" }}>⌘</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") { event.preventDefault(); setCursor((prev) => Math.min(prev + 1, items.length - 1)); }
              else if (event.key === "ArrowUp") { event.preventDefault(); setCursor((prev) => Math.max(prev - 1, 0)); }
              else if (event.key === "Enter") { event.preventDefault(); items[cursor]?.action(); }
            }}
            placeholder="Jump to view, source, or concept…"
            aria-label="Command palette search"
          />
          <span className="muted" style={{ fontSize: ".72rem" }}>{items.length} result{items.length === 1 ? "" : "s"}</span>
        </div>
        <ul className="palette-list">
          {items.length === 0 ? (
            <li className="palette-empty">No matches.</li>
          ) : items.map((item, index) => (
            <li
              key={`${item.kind}-${item.id}`}
              className={`palette-item ${index === cursor ? "active" : ""} palette-kind-${item.kind}`}
              onMouseEnter={() => setCursor(index)}
              onClick={() => item.action()}
            >
              <span className="palette-kind-tag">{item.kind === "view" ? "⌂" : item.kind === "source" ? "📚" : "🧠"}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="palette-label">{item.label}</div>
                <div className="palette-sublabel">{item.sublabel}</div>
              </div>
              {index === cursor ? <span className="muted" style={{ fontSize: ".7rem" }}>↵</span> : null}
            </li>
          ))}
        </ul>
        <div className="palette-footer muted">
          <span><span className="kbd">↑↓</span> navigate</span>
          <span><span className="kbd">↵</span> open</span>
          <span><span className="kbd">Esc</span> close</span>
        </div>
      </div>
    </div>
  );
}

function HelpOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div className="palette-scrim" onClick={onClose} role="dialog" aria-label="Keyboard shortcuts">
      <div className="help-overlay" onClick={(event) => event.stopPropagation()}>
        <div className="help-overlay-header">
          <h2 style={{ margin: 0 }}>Keyboard shortcuts</h2>
          <button className="ghost" onClick={onClose} aria-label="Close help">✕</button>
        </div>
        <div className="help-grid">
          <section>
            <h3>Navigation</h3>
            <ul>
              <li><span className="kbd">0</span>–<span className="kbd">6</span> jump to view</li>
              <li><span className="kbd">⌘K</span> / <span className="kbd">Ctrl+K</span> command palette</li>
              <li><span className="kbd">?</span> this help</li>
              <li><span className="kbd">Esc</span> close any overlay</li>
            </ul>
          </section>
          <section>
            <h3>Study & Gym</h3>
            <ul>
              <li><span className="kbd">A</span>–<span className="kbd">D</span> or <span className="kbd">1</span>–<span className="kbd">4</span> pick option</li>
              <li><span className="kbd">Space</span> / <span className="kbd">Enter</span> next question</li>
              <li><span className="kbd">H</span> or <span className="kbd">?</span> "I don't know"</li>
            </ul>
          </section>
          <section>
            <h3>Reader</h3>
            <ul>
              <li><span className="kbd">/</span> focus find bar</li>
              <li><span className="kbd">Enter</span> next find match</li>
              <li><span className="kbd">Shift+Enter</span> previous match</li>
              <li>Click a highlight to pick a quote</li>
            </ul>
          </section>
          <section>
            <h3>Concepts</h3>
            <ul>
              <li>Click a row to expand evidence</li>
              <li>Source tag opens Reader with concept focused</li>
              <li>Evidence ↗ jumps to that span</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

function SettingsDrawer({ theme, accent, density, readingFont, onChangeTheme, onChangeAccent, onChangeDensity, onChangeReadingFont, onExport, onReset, onClose }: {
  theme: string;
  accent: string;
  density: string;
  readingFont: string;
  onChangeTheme: (value: string) => void;
  onChangeAccent: (value: string) => void;
  onChangeDensity: (value: string) => void;
  onChangeReadingFont: (value: string) => void;
  onExport: () => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const themes = [
    { id: "cyberpunk", label: "Cyberpunk", sub: "Cyan + gold · high-tech focus", swatch: ["#00e5ff", "#ffd86b"] },
    { id: "aurora", label: "Aurora", sub: "Violet + teal · dreamy flow", swatch: ["#b798ff", "#4ed5c4"] },
    { id: "forest", label: "Forest", sub: "Sage + amber · grounded calm", swatch: ["#6fd19b", "#e7c86b"] },
    { id: "mono", label: "Mono", sub: "Grayscale · pure contemplation", swatch: ["#f5f5f7", "#8a919a"] },
    { id: "paperwhite", label: "Paperwhite", sub: "Warm paper · print-like reading", swatch: ["#fffcf1", "#2a6bad"] }
  ];
  const accents = [
    { id: "default", label: "Default", color: "var(--accent)" },
    { id: "violet", label: "Violet", color: "#b798ff" },
    { id: "gold", label: "Gold", color: "#ffd86b" },
    { id: "green", label: "Green", color: "#10d990" },
    { id: "coral", label: "Coral", color: "#ff96a9" },
    { id: "rose", label: "Rose", color: "#f5a3d4" }
  ];
  return (
    <div className="palette-scrim" onClick={onClose} role="dialog" aria-label="Settings">
      <div className="settings-drawer" onClick={(event) => event.stopPropagation()}>
        <div className="settings-header">
          <div>
            <h2 style={{ margin: 0 }}>Settings</h2>
            <div className="muted" style={{ fontSize: ".82rem", marginTop: 2 }}>All preferences persist in your browser.</div>
          </div>
          <button className="ghost icon-btn" onClick={onClose} aria-label="Close settings">✕</button>
        </div>

        <section className="settings-section">
          <h3>Theme</h3>
          <div className="theme-grid">
            {themes.map((t) => (
              <button
                key={t.id}
                className={`theme-swatch ${theme === t.id ? "active" : ""}`}
                onClick={() => onChangeTheme(t.id)}
                aria-pressed={theme === t.id}
              >
                <div className="theme-swatch-preview" style={{ background: `linear-gradient(135deg, ${t.swatch[0]} 0%, ${t.swatch[1]} 100%)` }} />
                <div className="theme-swatch-label">{t.label}</div>
                <div className="theme-swatch-sub">{t.sub}</div>
              </button>
            ))}
          </div>
        </section>

        <section className="settings-section">
          <h3>Accent</h3>
          <div className="accent-row">
            {accents.map((a) => (
              <button
                key={a.id}
                className={`accent-dot ${accent === a.id ? "active" : ""}`}
                onClick={() => onChangeAccent(a.id)}
                aria-pressed={accent === a.id}
                title={a.label}
                style={{ "--dot-color": a.color } as React.CSSProperties}
              >
                <span className="accent-dot-swatch" />
                <span className="accent-dot-label">{a.label}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="settings-section">
          <h3>Density</h3>
          <div className="segmented">
            {["compact", "comfy", "spacious"].map((d) => (
              <button key={d} className={`seg ${density === d ? "active" : ""}`} onClick={() => onChangeDensity(d)} aria-pressed={density === d}>
                {d[0]!.toUpperCase() + d.slice(1)}
              </button>
            ))}
          </div>
        </section>

        <section className="settings-section">
          <h3>Reader font</h3>
          <div className="segmented">
            {["serif", "sans"].map((f) => (
              <button key={f} className={`seg ${readingFont === f ? "active" : ""}`} onClick={() => onChangeReadingFont(f)} aria-pressed={readingFont === f}>
                {f === "serif" ? "Serif · Source Serif" : "Sans · Inter"}
              </button>
            ))}
          </div>
        </section>

        <section className="settings-section settings-actions">
          <h3>Workspace</h3>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="ghost" onClick={onExport}>⬇ Export workspace JSON</button>
            <button className="warn" onClick={onReset}>⚠ Reset everything</button>
          </div>
        </section>

        <div className="settings-footer muted">
          <span><span className="kbd">⌘,</span> toggle</span>
          <span><span className="kbd">Esc</span> close</span>
        </div>
      </div>
    </div>
  );
}

