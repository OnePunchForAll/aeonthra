type ShellSettingsPanelProps = {
  questionCount: number;
  difficulty: string;
  mode: string;
  notes: string;
  onQuestionCountChange: (value: number) => void;
  onDifficultyChange: (value: string) => void;
  onModeChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onOpenInspect: () => void;
  onDownloadOfflineSite: () => void;
  onSaveReplayBundle: () => void;
};

function optionButton(active: boolean) {
  return {
    padding: "10px 20px",
    borderRadius: 12,
    border: `1px solid ${active ? "#53b6ff" : "rgba(120,143,199,0.18)"}`,
    background: active ? "rgba(83,182,255,0.12)" : "transparent",
    color: active ? "#53b6ff" : "#98a5d1",
    fontWeight: 700,
    cursor: "pointer"
  } as const;
}

export function ShellSettingsPanel({
  questionCount,
  difficulty,
  mode,
  notes,
  onQuestionCountChange,
  onDifficultyChange,
  onModeChange,
  onNotesChange,
  onOpenInspect,
  onDownloadOfflineSite,
  onSaveReplayBundle
}: ShellSettingsPanelProps) {
  return (
    <div style={{ maxWidth: 620, margin: "0 auto" }}>
      <div style={{ background: "rgba(9,12,22,0.94)", border: "1px solid rgba(120,143,199,0.18)", borderRadius: 24, boxShadow: "0 24px 64px rgba(0,0,0,0.35)", padding: "28px 30px" }}>
        <div style={{ fontSize: ".72rem", fontWeight: 700, letterSpacing: ".12em", color: "#53b6ff", textTransform: "uppercase", marginBottom: 18 }}>Settings</div>

        <div style={{ marginBottom: 22 }}>
          <div style={{ fontSize: ".82rem", color: "#cfd8f4", marginBottom: 8 }}>Questions per set</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{[5, 10, 25, 50].map((value) => <button key={value} onClick={() => onQuestionCountChange(value)} style={optionButton(questionCount === value)}>{value}</button>)}</div>
        </div>

        <div style={{ marginBottom: 22 }}>
          <div style={{ fontSize: ".82rem", color: "#cfd8f4", marginBottom: 8 }}>Difficulty</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{["mixed", "hard", "review"].map((value) => <button key={value} onClick={() => onDifficultyChange(value)} style={optionButton(difficulty === value)}>{value}</button>)}</div>
        </div>

        <div style={{ marginBottom: 22 }}>
          <div style={{ fontSize: ".82rem", color: "#cfd8f4", marginBottom: 8 }}>Learning mode</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{["learn", "test", "adaptive"].map((value) => <button key={value} onClick={() => onModeChange(value)} style={optionButton(mode === value)}>{value}</button>)}</div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: ".72rem", fontWeight: 700, letterSpacing: ".12em", color: "#c9a7ff", textTransform: "uppercase", marginBottom: 12 }}>Session Notes</div>
          <textarea value={notes} onChange={(event) => onNotesChange(event.target.value)} placeholder="Capture what changed, what still feels weak, or what to ask next." rows={5} style={{ width: "100%", padding: "16px 18px", borderRadius: 16, border: "1px solid rgba(120,143,199,0.18)", background: "rgba(7,10,18,0.78)", color: "#eef1ff", fontSize: ".94rem", lineHeight: 1.7, resize: "vertical", boxSizing: "border-box" }} />
          <div style={{ fontSize: ".72rem", color: "#98a5d1", marginTop: 6, textAlign: "right" }}>{notes.length} chars • saved automatically</div>
        </div>

        <div style={{ padding: "20px 22px", borderRadius: 16, background: "rgba(83,182,255,0.08)", border: "1px solid rgba(83,182,255,0.18)" }}>
          <div style={{ fontSize: ".72rem", fontWeight: 700, letterSpacing: ".12em", color: "#53b6ff", textTransform: "uppercase", marginBottom: 12 }}>Export And Diagnostics</div>
          <p style={{ color: "#d4ddf6", fontSize: ".92rem", lineHeight: 1.7, margin: "0 0 16px" }}>
            Open the inspect view for canonical hashes and provenance lanes, then export the current workspace without regenerating it.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={onOpenInspect} style={{ padding: "12px 18px", borderRadius: 14, border: "none", background: "linear-gradient(135deg,#00d1c7,#53b6ff)", color: "#06111a", fontWeight: 800, cursor: "pointer" }}>Open Inspect View</button>
            <button onClick={onDownloadOfflineSite} style={{ padding: "12px 18px", borderRadius: 14, border: "1px solid rgba(120,143,199,0.18)", background: "rgba(9,12,22,0.94)", color: "#eef1ff", fontWeight: 700, cursor: "pointer" }}>Download Offline Site</button>
            <button onClick={onSaveReplayBundle} style={{ padding: "12px 18px", borderRadius: 14, border: "1px solid rgba(120,143,199,0.18)", background: "rgba(9,12,22,0.94)", color: "#eef1ff", fontWeight: 700, cursor: "pointer" }}>Save Replay Bundle</button>
          </div>
        </div>
      </div>
    </div>
  );
}
