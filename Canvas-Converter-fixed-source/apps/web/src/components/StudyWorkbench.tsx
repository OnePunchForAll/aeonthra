import { useMemo, useState, type CSSProperties } from "react";
import type { CaptureBundle, LearningBundle } from "@learning/schema";
import type { AppProgress, CourseTask, ForgeChapter } from "../lib/workspace";
import { buildStudyWorkbenchData } from "../lib/study-workbench";
import { downloadCaptureItemJson, downloadCaptureBundleJson } from "../lib/source-review";
import { loadNotes, storeNotes } from "../lib/storage";

type StudyWorkbenchProps = {
  bundle: CaptureBundle;
  learning: LearningBundle;
  workspace: { tasks: CourseTask[]; chapters: ForgeChapter[] };
  progress: AppProgress;
  noteScope: string | null;
  onReset: () => void;
  onExportOfflineSite?: () => void;
  onExportReplayBundle?: () => void;
};

type TabId = "dashboard" | "tasks" | "concepts" | "sources" | "notes";

function downloadText(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function safeSlug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "aeonthra";
}

function exportStudyLog(data: ReturnType<typeof buildStudyWorkbenchData>, notes: string): void {
  const lines = [
    `AEONTHRA Study Log`,
    `Workspace: ${data.title}`,
    `Generated hash: ${data.deterministicHash}`,
    ``,
    `Quality banner: ${data.qualityBanner || "none"}`,
    ...data.qualityWarnings.map((warning) => `Warning: ${warning}`),
    ``,
    `Assignments/Discussions`,
    ...data.tasks.flatMap((task) => [
      `- ${task.title} [${task.kind}]`,
      `  ${task.dueLabel}`,
      ...task.evidenceBullets.slice(0, 3).map((bullet) => `  • ${bullet}`)
    ]),
    ``,
    `Concepts`,
    ...data.concepts.slice(0, 12).flatMap((concept) => [
      `- ${concept.label}`,
      `  ${concept.definition}`
    ]),
    ``,
    `Notes`,
    notes || "(none)"
  ];

  downloadText(`${safeSlug(data.title)}-study-log.txt`, lines.join("\n"));
}

export function StudyWorkbench(props: StudyWorkbenchProps) {
  const [tab, setTab] = useState<TabId>("dashboard");
  const [notes, setNotes] = useState(() => loadNotes(props.noteScope ?? undefined));
  const data = useMemo(
    () => buildStudyWorkbenchData(props.bundle, props.learning, props.workspace, props.progress),
    [props.bundle, props.learning, props.workspace, props.progress]
  );

  const setAndStoreNotes = (value: string) => {
    setNotes(value);
    storeNotes(value, props.noteScope ?? undefined);
  };

  const tabButton = (id: TabId, label: string) => (
    <button
      key={id}
      onClick={() => setTab(id)}
      style={{
        padding: "10px 14px",
        borderRadius: 12,
        border: `1px solid ${tab === id ? "rgba(0,240,255,0.35)" : "rgba(120,143,199,0.18)"}`,
        background: tab === id ? "rgba(0,240,255,0.12)" : "rgba(7,10,18,0.78)",
        color: tab === id ? "#00f0ff" : "#d7def7",
        cursor: "pointer",
        fontWeight: 700
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ minHeight: "100dvh", background: "linear-gradient(180deg,#030611 0%,#040816 100%)", color: "#edf2ff", padding: 24 }}>
      <div style={{ maxWidth: 1440, margin: "0 auto", display: "grid", gap: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ color: "#00f0ff", fontFamily: "Orbitron, sans-serif", letterSpacing: ".18em", fontSize: ".82rem" }}>AEONTHRA WORKBENCH</div>
            <h1 style={{ margin: "10px 0 6px", fontSize: "2.4rem" }}>{data.title}</h1>
            <div style={{ color: "#8b97be" }}>Deterministic, source-grounded study workspace.</div>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={() => downloadCaptureBundleJson(props.bundle, props.bundle.title)} style={ghostBtn}>Export cleaned source bundle</button>
            <button onClick={() => exportStudyLog(data, notes)} style={ghostBtn}>Export notes/results .txt</button>
            {props.onExportOfflineSite ? <button onClick={props.onExportOfflineSite} style={ghostBtn}>Download offline site</button> : null}
            {props.onExportReplayBundle ? <button onClick={props.onExportReplayBundle} style={ghostBtn}>Download replay bundle</button> : null}
            <button onClick={props.onReset} style={ghostBtn}>Reset workspace</button>
          </div>
        </div>

        {data.qualityBanner ? (
          <div style={{ padding: 14, borderRadius: 16, background: "rgba(255,191,102,0.08)", border: "1px solid rgba(255,191,102,0.22)", color: "#ffe1b3" }}>
            {data.qualityBanner}
          </div>
        ) : null}

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {tabButton("dashboard", "Dashboard")}
          {tabButton("tasks", `Assignments & Discussions (${data.tasks.length})`)}
          {tabButton("concepts", `Concepts (${data.concepts.length})`)}
          {tabButton("sources", `Sources (${data.sources.length})`)}
          {tabButton("notes", "Notes & Results")}
        </div>

        {tab === "dashboard" ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 16 }}>
            {metricCard("Sources", `${data.sourceSummary.items}`, `${data.sourceSummary.documents} documents · ${data.sourceSummary.pages} pages`)}
            {metricCard("Assignments / Discussions", `${data.sourceSummary.assignments + data.sourceSummary.discussions}`, `${data.sourceSummary.assignments} assignments · ${data.sourceSummary.discussions} discussions`)}
            {metricCard("Concepts", `${data.progress.totalConcepts}`, `${data.progress.mastered} mastered · ${data.progress.learning} in progress`)}
            {metricCard("Likely skills", `${data.likelySkills.length}`, data.likelySkills.slice(0, 4).join(", ") || "No strong signals yet")}
            <div style={panelStyle}>
              <div style={eyebrow}>NEXT BEST MOVE</div>
              <div style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: 8 }}>{data.tasks[0]?.title ?? "Review your strongest concepts"}</div>
              <div style={{ color: "#8b97be", lineHeight: 1.7 }}>{data.tasks[0]?.summary || data.concepts[0]?.definition || "Import richer sources or add textbook excerpts to strengthen the workspace."}</div>
            </div>
            <div style={panelStyle}>
              <div style={eyebrow}>QUALITY WARNINGS</div>
              {data.qualityWarnings.length > 0 ? (
                <ul style={{ margin: 0, paddingLeft: 18, color: "#d7def7", lineHeight: 1.8 }}>
                  {data.qualityWarnings.map((warning) => <li key={warning}>{warning}</li>)}
                </ul>
              ) : (
                <div style={{ color: "#8b97be" }}>No active quality warnings.</div>
              )}
            </div>
          </div>
        ) : null}

        {tab === "tasks" ? (
          <div style={{ display: "grid", gap: 16 }}>
            {data.tasks.length === 0 ? <div style={panelStyle}>No trustworthy assignments or discussions were derived from the current sources.</div> : null}
            {data.tasks.map((task) => (
              <div key={task.id} style={panelStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                  <div>
                    <div style={eyebrow}>{task.kind.toUpperCase()} · {task.readiness.replace(/-/g, " ")}</div>
                    <div style={{ fontSize: "1.28rem", fontWeight: 800 }}>{task.title}</div>
                    <div style={{ color: "#8b97be", marginTop: 6 }}>{task.dueLabel}</div>
                  </div>
                  <div style={{ minWidth: 220, color: "#8b97be" }}>{task.summary}</div>
                </div>
                {task.requirementLines.length > 0 ? (
                  <div style={{ marginTop: 16 }}>
                    <div style={eyebrow}>WHAT THE TASK REQUIRES</div>
                    <ul style={{ margin: "8px 0 0", paddingLeft: 20, lineHeight: 1.8 }}>
                      {task.requirementLines.map((line) => <li key={line}>{line}</li>)}
                    </ul>
                  </div>
                ) : null}
                {task.evidenceBullets.length > 0 ? (
                  <div style={{ marginTop: 16 }}>
                    <div style={eyebrow}>EVIDENCE-BACKED STUDY SUMMARY</div>
                    <ul style={{ margin: "8px 0 0", paddingLeft: 20, lineHeight: 1.8 }}>
                      {task.evidenceBullets.map((line) => <li key={line}>{line}</li>)}
                    </ul>
                  </div>
                ) : null}
                {task.concepts.length > 0 ? (
                  <div style={{ marginTop: 16 }}>
                    <div style={eyebrow}>KEY CONCEPTS</div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
                      {task.concepts.map((concept) => (
                        <div key={concept.id} style={{ padding: 10, borderRadius: 12, background: "rgba(7,10,18,0.78)", border: "1px solid rgba(120,143,199,0.18)", maxWidth: 280 }}>
                          <div style={{ fontWeight: 700 }}>{concept.label}</div>
                          <div style={{ color: "#8b97be", fontSize: ".9rem", marginTop: 6 }}>{concept.summary}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                {task.sourceSupport.length > 0 ? (
                  <div style={{ marginTop: 16 }}>
                    <div style={eyebrow}>BEST SUPPORTING SOURCES</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: 12, marginTop: 10 }}>
                      {task.sourceSupport.map((source) => (
                        <div key={source.id} style={{ padding: 12, borderRadius: 12, background: "rgba(7,10,18,0.78)", border: "1px solid rgba(120,143,199,0.18)" }}>
                          <div style={{ fontWeight: 700 }}>{source.title}</div>
                          <div style={{ color: "#8b97be", fontSize: ".88rem", marginTop: 4 }}>{source.preview}</div>
                          <div style={{ marginTop: 8 }}><a href={source.url} target="_blank" rel="noreferrer" style={{ color: "#00f0ff" }}>Open source</a></div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        {tab === "concepts" ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 16 }}>
            {data.concepts.map((concept) => (
              <div key={concept.id} style={panelStyle}>
                <div style={eyebrow}>CONCEPT</div>
                <div style={{ fontSize: "1.2rem", fontWeight: 800 }}>{concept.label}</div>
                <div style={{ color: "#d7def7", lineHeight: 1.7, marginTop: 10 }}>{concept.definition}</div>
                {concept.summary ? <div style={{ color: "#8b97be", lineHeight: 1.7, marginTop: 10 }}>{concept.summary}</div> : null}
                {concept.transfer ? <div style={{ marginTop: 12 }}><strong>Transfer:</strong> {concept.transfer}</div> : null}
                {concept.trap ? <div style={{ marginTop: 8 }}><strong>Common trap:</strong> {concept.trap}</div> : null}
                {concept.evidence.length > 0 ? (
                  <div style={{ marginTop: 12 }}>
                    <div style={eyebrow}>PROVENANCE</div>
                    <ul style={{ margin: "8px 0 0", paddingLeft: 18, lineHeight: 1.7 }}>
                      {concept.evidence.map((entry) => <li key={entry}>{entry}</li>)}
                    </ul>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        {tab === "sources" ? (
          <div style={{ display: "grid", gap: 12 }}>
            {data.sources.map((source) => (
              <div key={source.id} style={panelStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start", flexWrap: "wrap" }}>
                  <div>
                    <div style={eyebrow}>{source.kind.toUpperCase()}</div>
                    <div style={{ fontWeight: 800, fontSize: "1.05rem" }}>{source.title}</div>
                    <div style={{ color: "#8b97be", marginTop: 6 }}>{source.preview}</div>
                    <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>{source.tags.map((tag) => <span key={tag} style={tagStyle}>{tag}</span>)}</div>
                  </div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button onClick={() => downloadCaptureItemJson(props.bundle.items.find((item) => item.id === source.id)!)} style={ghostBtn}>Export page JSON</button>
                    <a href={source.url} target="_blank" rel="noreferrer" style={{ ...ghostBtn, textDecoration: "none", display: "inline-flex", alignItems: "center" }}>Open source</a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {tab === "notes" ? (
          <div style={{ display: "grid", gap: 16, gridTemplateColumns: "minmax(0,1.2fr) minmax(300px,0.8fr)" }}>
            <div style={panelStyle}>
              <div style={eyebrow}>NOTES</div>
              <textarea value={notes} onChange={(event) => setAndStoreNotes(event.target.value)} rows={18} style={{ width: "100%", marginTop: 12, borderRadius: 14, border: "1px solid rgba(120,143,199,0.22)", background: "rgba(7,10,18,0.82)", color: "#edf2ff", padding: 16, lineHeight: 1.6, resize: "vertical" }} placeholder="Capture what you learned, what confused you, and what to review next..." />
              <div style={{ color: "#8b97be", marginTop: 8 }}>{notes.length} characters · saved locally</div>
            </div>
            <div style={panelStyle}>
              <div style={eyebrow}>RESULTS SNAPSHOT</div>
              <ul style={{ margin: "12px 0 0", paddingLeft: 18, lineHeight: 1.8 }}>
                <li>{data.progress.mastered} concepts mastered</li>
                <li>{data.progress.learning} concepts actively being learned</li>
                <li>{data.tasks.length} assignment/discussion surfaces in the workspace</li>
                <li>{data.sources.length} cleaned source pages available</li>
              </ul>
              <button onClick={() => exportStudyLog(data, notes)} style={{ ...ghostBtn, marginTop: 18 }}>Download notes/results .txt</button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

const panelStyle: CSSProperties = {
  background: "rgba(9,12,22,0.94)",
  border: "1px solid rgba(120,143,199,0.18)",
  borderRadius: 20,
  padding: 20,
  boxShadow: "0 24px 64px rgba(0,0,0,0.28)"
};

const ghostBtn: CSSProperties = {
  padding: "10px 14px",
  borderRadius: 12,
  border: "1px solid rgba(120,143,199,0.22)",
  background: "rgba(7,10,18,0.82)",
  color: "#edf2ff",
  cursor: "pointer"
};

const eyebrow: CSSProperties = {
  color: "#00f0ff",
  fontFamily: "Orbitron, sans-serif",
  fontSize: ".72rem",
  letterSpacing: ".14em"
};

const tagStyle: CSSProperties = {
  padding: "4px 8px",
  borderRadius: 999,
  border: "1px solid rgba(0,240,255,0.16)",
  background: "rgba(0,240,255,0.06)",
  color: "#aeefff",
  fontSize: ".74rem"
};

function metricCard(label: string, value: string, detail: string) {
  return (
    <div style={panelStyle}>
      <div style={eyebrow}>{label}</div>
      <div style={{ fontSize: "1.8rem", fontWeight: 800, marginTop: 10 }}>{value}</div>
      <div style={{ color: "#8b97be", marginTop: 6 }}>{detail}</div>
    </div>
  );
}
