type TranscriptLine = {
  t: number;
  text: string;
};

type TranscriptSegment = {
  id: string;
  label: string;
  ts: number;
  lines: TranscriptLine[];
};

type TranscriptRecord = {
  title: string;
  speaker: string;
  duration: number;
  segments: TranscriptSegment[];
};

type TranscriptTheme = {
  bd: string;
  mu: string;
  tx: string;
  t2: string;
  dm: string;
  inner: string;
};

type TranscriptWorkspacePanelProps = {
  mobileLayout: boolean;
  transcript: TranscriptRecord;
  txPlaying: boolean;
  txTime: number;
  txAutoScroll: boolean;
  theme: TranscriptTheme;
  formatTime: (seconds: number) => string;
  onBackToReader: () => void;
  onTogglePlaying: () => void;
  onSetTime: (time: number) => void;
  onSeekBy: (delta: number) => void;
  onToggleAutoScroll: () => void;
  onEnsurePlaying: () => void;
};

function segmentIsActive(transcript: TranscriptRecord, txTime: number, segment: TranscriptSegment): boolean {
  const nextSegment = transcript.segments.find((candidate) => candidate.ts > segment.ts);
  return txTime >= segment.ts && (!nextSegment || txTime < nextSegment.ts);
}

export function TranscriptWorkspacePanel({
  mobileLayout,
  transcript,
  txPlaying,
  txTime,
  txAutoScroll,
  theme,
  formatTime,
  onBackToReader,
  onTogglePlaying,
  onSetTime,
  onSeekBy,
  onToggleAutoScroll,
  onEnsurePlaying
}: TranscriptWorkspacePanelProps) {
  const { bd, mu, tx, t2, dm, inner } = theme;
  const accent = "#a78bfa";

  return (
    <div style={{ marginLeft: mobileLayout ? 0 : -44, marginRight: mobileLayout ? 0 : -44, marginTop: mobileLayout ? -24 : -48, minHeight: "calc(100dvh - 68px)", display: "flex", background: "#050510", flexDirection: mobileLayout ? "column" : "row" }}>
      <div style={{ width: mobileLayout ? "100%" : 260, flexShrink: 0, borderRight: `1px solid ${bd}`, padding: mobileLayout ? "20px 16px" : "28px 20px", overflowY: "auto", background: "rgba(6,6,16,.6)" }}>
        <button onClick={onBackToReader} style={{ background: "none", border: "none", color: mu, cursor: "pointer", fontSize: ".82rem", marginBottom: 20 }}>
          Back to reader
        </button>
        <div style={{ fontSize: ".68rem", fontWeight: 700, letterSpacing: ".14em", color: accent, marginBottom: 12 }}>Transcript</div>
        <h3 style={{ fontSize: "1rem", fontWeight: 700, color: tx, lineHeight: 1.4, marginBottom: 4 }}>{transcript.title}</h3>
        <p style={{ fontSize: ".78rem", color: mu, marginBottom: 16 }}>{transcript.speaker} | {formatTime(transcript.duration)}</p>

        <div style={{ padding: "14px 16px", borderRadius: 14, background: inner, border: `1px solid ${bd}`, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <button onClick={onTogglePlaying} style={{ width: 36, height: 36, borderRadius: "50%", border: `2px solid ${accent}`, background: txPlaying ? accent : "transparent", color: txPlaying ? "#000" : accent, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              {txPlaying ? "Pause" : "Play"}
            </button>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: ".88rem", fontWeight: 700, color: tx }}>{formatTime(txTime)}</div>
              <div
                role="slider"
                tabIndex={0}
                aria-label="Transcript position"
                aria-valuemin={0}
                aria-valuemax={transcript.duration}
                aria-valuenow={txTime}
                style={{ height: 4, borderRadius: 2, background: dm, marginTop: 4, overflow: "hidden", cursor: "pointer" }}
                onClick={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect();
                  onSetTime(Math.floor(((event.clientX - rect.left) / rect.width) * transcript.duration));
                }}
                onKeyDown={(event) => {
                  if (event.key === "ArrowLeft") {
                    event.preventDefault();
                    onSeekBy(-5);
                  }
                  if (event.key === "ArrowRight") {
                    event.preventDefault();
                    onSeekBy(5);
                  }
                }}
              >
                <div style={{ height: "100%", borderRadius: 2, background: accent, width: `${(txTime / transcript.duration) * 100}%` }} />
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => onSeekBy(-15)} style={{ padding: "3px 8px", borderRadius: 6, border: `1px solid ${bd}`, background: "transparent", color: mu, fontSize: ".7rem", cursor: "pointer" }}>-15s</button>
            <button onClick={() => onSeekBy(15)} style={{ padding: "3px 8px", borderRadius: 6, border: `1px solid ${bd}`, background: "transparent", color: mu, fontSize: ".7rem", cursor: "pointer" }}>+15s</button>
            <div style={{ flex: 1 }} />
            <button onClick={onToggleAutoScroll} style={{ padding: "3px 8px", borderRadius: 6, border: `1px solid ${txAutoScroll ? "#a78bfa33" : bd}`, background: txAutoScroll ? "rgba(167,139,250,.08)" : "transparent", color: txAutoScroll ? accent : mu, fontSize: ".7rem", cursor: "pointer" }}>
              {txAutoScroll ? "Auto on" : "Auto off"}
            </button>
          </div>
        </div>

        {transcript.segments.map((segment) => {
          const active = segmentIsActive(transcript, txTime, segment);
          return (
            <button key={segment.id} onClick={() => onSetTime(segment.ts)} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left", padding: "8px 12px", borderRadius: 10, marginBottom: 3, background: active ? "rgba(167,139,250,.1)" : "transparent", border: active ? "1px solid rgba(167,139,250,.18)" : "1px solid transparent", cursor: "pointer" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: active ? accent : `${mu}44`, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: ".8rem", fontWeight: active ? 600 : 400, color: active ? accent : tx }}>{segment.label}</div>
                <div style={{ fontSize: ".65rem", color: mu }}>{formatTime(segment.ts)}</div>
              </div>
            </button>
          );
        })}
      </div>

      <div style={{ flex: 1, overflowY: "auto", display: "flex", justifyContent: "center" }}>
        <div style={{ maxWidth: 700, padding: mobileLayout ? "32px 18px 88px" : "56px 48px 120px", width: "100%" }}>
          <div style={{ marginBottom: 48, paddingBottom: 32, borderBottom: `1px solid ${bd}` }}>
            <div style={{ fontSize: ".72rem", fontWeight: 700, letterSpacing: ".2em", color: accent, marginBottom: 12 }}>Lecture transcript</div>
            <h1 style={{ fontSize: "2rem", fontWeight: 700, color: tx, lineHeight: 1.35, marginBottom: 8, fontFamily: "'Space Grotesk',sans-serif" }}>{transcript.title}</h1>
            <span style={{ fontSize: ".88rem", color: t2 }}>{transcript.speaker} | {formatTime(transcript.duration)}</span>
          </div>

          {transcript.segments.map((segment) => {
            const active = segmentIsActive(transcript, txTime, segment);
            return (
              <div key={segment.id} style={{ marginBottom: 32 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, paddingBottom: 8, borderBottom: `1px solid ${active ? "rgba(167,139,250,.15)" : bd}` }}>
                  <div style={{ width: 4, height: 20, borderRadius: 2, background: active ? accent : "transparent" }} />
                  <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: active ? tx : t2, fontFamily: "'Space Grotesk',sans-serif", margin: 0, flex: 1 }}>{segment.label}</h3>
                  <span style={{ fontSize: ".75rem", color: mu }}>{formatTime(segment.ts)}</span>
                </div>

                {segment.lines.map((line, lineIndex) => {
                  const nextLine = segment.lines[lineIndex + 1];
                  const lineActive = active && txTime >= line.t && (!nextLine || txTime < nextLine.t);
                  return (
                    <button key={lineIndex} onClick={() => { onSetTime(line.t); onEnsurePlaying(); }} style={{ display: "flex", gap: 12, padding: "10px 14px", marginBottom: 2, borderRadius: 12, width: "100%", textAlign: "left", cursor: "pointer", border: "none", background: lineActive ? "rgba(167,139,250,.08)" : "transparent", transition: "all 300ms" }}>
                      <span style={{ fontSize: ".7rem", color: lineActive ? accent : mu, fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, minWidth: 36, paddingTop: 3, flexShrink: 0 }}>{formatTime(line.t)}</span>
                      <span style={{ fontSize: "1.02rem", lineHeight: 1.8, color: lineActive ? tx : t2 }}>{line.text}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
