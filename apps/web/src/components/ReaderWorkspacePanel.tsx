import type { CSSProperties, RefObject } from "react";

type ReaderSection = {
  heading: string;
  body: string;
};

type ReaderContent = {
  id: string;
  title: string;
  subtitle: string;
  sections: ReaderSection[];
  concepts?: string[];
};

type ReaderConcept = {
  id: string;
  name: string;
  mastery: number;
};

type ReaderHighlight = {
  id: string;
  tag: string;
  text: string;
};

type ReaderMargin = {
  type: string;
  text: string;
  color: string;
};

type ReaderTheme = {
  bd: string;
  cy: string;
  tl: string;
  mu: string;
  tx: string;
  t2: string;
  dm: string;
  inner: string;
  surface: string;
};

type HighlightPopover = {
  x: number;
  y: number;
} | null;

type ReaderWorkspacePanelProps = {
  mobileLayout: boolean;
  prefersReducedMotion: boolean;
  readerContent: ReaderContent | null;
  readerSection: number;
  readingPositions: Record<string, number>;
  readings: ReaderContent[];
  readerUtilOpen: boolean;
  readerScrollRef: RefObject<HTMLDivElement>;
  readerPrimaryConceptId: string | null;
  visibleConceptById: Map<string, ReaderConcept>;
  highlights: ReaderHighlight[];
  hlPopover: HighlightPopover;
  margins: Record<string, ReaderMargin[]>;
  marginTypes: Record<string, { label: string; icon?: string }>;
  marginDismissed: Set<string>;
  theme: ReaderTheme;
  buttonStyle: (background: string, color: string) => CSSProperties;
  headingStyle: (size: number) => CSSProperties;
  getReadingProgress: (readingId: string, totalSections: number) => number;
  getSectionMark: (readingId: string, sectionIndex: number) => string | null;
  isSectionRead: (readingId: string, sectionIndex: number) => boolean;
  sectionMarkColor: (mark: string) => string;
  sectionMarkIcon: (mark: string) => string;
  memoryStageIcon: (stage: string) => string;
  getMemoryStage: (conceptId: string) => string;
  highlightTagColor: (tag: string) => string;
  highlightTagIcon: (tag: string) => string;
  onOpenReader: (readingId: string) => void;
  onCloseReader: () => void;
  onSelectSection: (readingId: string, sectionIndex: number) => void;
  onMarkSection: (readingId: string, sectionIndex: number, mark: string) => void;
  onDismissMargin: (key: string) => void;
  onSaveSection: (section: { heading: string; body: string; from: string }) => void;
  onFlashSaved: () => void;
  onPracticeConcept: (concept: ReaderConcept) => void;
  onOpenViewpoints: () => void;
  onToggleReaderTools: () => void;
  onAddHighlight: (tag: string) => void;
  onClearHighlightPopover: () => void;
};

export function ReaderWorkspacePanel({
  mobileLayout,
  prefersReducedMotion,
  readerContent,
  readerSection,
  readingPositions,
  readings,
  readerUtilOpen,
  readerScrollRef,
  readerPrimaryConceptId,
  visibleConceptById,
  highlights,
  hlPopover,
  margins,
  marginTypes,
  marginDismissed,
  theme,
  buttonStyle,
  headingStyle,
  getReadingProgress,
  getSectionMark,
  isSectionRead,
  sectionMarkColor,
  sectionMarkIcon,
  memoryStageIcon,
  getMemoryStage,
  highlightTagColor,
  highlightTagIcon,
  onOpenReader,
  onCloseReader,
  onSelectSection,
  onMarkSection,
  onDismissMargin,
  onSaveSection,
  onFlashSaved,
  onPracticeConcept,
  onOpenViewpoints,
  onToggleReaderTools,
  onAddHighlight,
  onClearHighlightPopover
}: ReaderWorkspacePanelProps) {
  const { bd, cy, tl, mu, tx, t2, dm, inner, surface } = theme;
  const activeConcept = readerPrimaryConceptId ? visibleConceptById.get(readerPrimaryConceptId) ?? null : null;
  const windowWidth = typeof window !== "undefined" ? window.innerWidth : 1440;

  return (
    <div
      style={{
        marginLeft: mobileLayout ? 0 : -44,
        marginRight: mobileLayout ? 0 : -44,
        marginTop: mobileLayout ? -24 : -48,
        minHeight: "calc(100dvh - 68px)",
        display: "flex",
        background: "#050510",
        flexDirection: mobileLayout ? "column" : "row"
      }}
    >
      <div
        style={{
          width: readerContent ? (mobileLayout ? "100%" : 280) : 0,
          flexShrink: 0,
          borderRight: `1px solid ${bd}`,
          padding: readerContent ? (mobileLayout ? "20px 16px" : "28px 20px") : "0",
          overflowY: "auto",
          background: "rgba(6,6,16,.6)",
          transition: "width 300ms ease"
        }}
      >
        {readerContent ? (
          <>
            <button onClick={onCloseReader} style={{ background: "none", border: "none", color: mu, cursor: "pointer", fontSize: ".82rem", marginBottom: 20 }}>
              Back to library
            </button>
            <div style={{ fontSize: ".68rem", fontWeight: 700, letterSpacing: ".14em", color: cy, marginBottom: 12, fontFamily: "'Space Grotesk',sans-serif" }}>
              Reading
            </div>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, color: tx, lineHeight: 1.4, marginBottom: 4 }}>{readerContent.title}</h3>
            <p style={{ fontSize: ".78rem", color: mu, marginBottom: 4 }}>{readerContent.subtitle}</p>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
              <div style={{ flex: 1, height: 4, borderRadius: 2, background: dm, overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    borderRadius: 2,
                    background: `linear-gradient(90deg,${cy},${tl})`,
                    width: `${getReadingProgress(readerContent.id, readerContent.sections.length)}%`,
                    transition: "width 500ms ease"
                  }}
                />
              </div>
              <span style={{ fontSize: ".72rem", color: cy, fontWeight: 700 }}>{getReadingProgress(readerContent.id, readerContent.sections.length)}%</span>
            </div>
            <div style={{ fontSize: ".62rem", fontWeight: 700, letterSpacing: ".12em", color: mu, marginBottom: 10 }}>Sections</div>
            {readerContent.sections.map((section, index) => {
              const mark = getSectionMark(readerContent.id, index);
              const read = isSectionRead(readerContent.id, index);
              const active = readerSection === index;
              return (
                <button
                  key={index}
                  id={`rail-btn-${index}`}
                  onClick={() => {
                    onSelectSection(readerContent.id, index);
                    const element = document.getElementById(`rs-${index}`);
                    if (element) {
                      element.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
                    }
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    width: "100%",
                    textAlign: "left",
                    padding: "10px 14px",
                    borderRadius: 12,
                    marginBottom: 3,
                    background: active ? `${cy}0c` : "transparent",
                    border: active ? `1px solid ${cy}1a` : "1px solid transparent",
                    cursor: "pointer",
                    transition: "all 250ms"
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      flexShrink: 0,
                      background: mark ? sectionMarkColor(mark) : read ? `${tl}66` : active ? cy : `${mu}44`,
                      transition: "all 300ms"
                    }}
                  />
                  <span style={{ flex: 1, fontSize: ".84rem", fontWeight: active ? 600 : 400, color: active ? cy : read ? tx : t2, lineHeight: 1.35 }}>
                    {section.heading}
                  </span>
                  {mark ? <span style={{ fontSize: ".7rem", color: sectionMarkColor(mark), fontWeight: 700 }}>{sectionMarkIcon(mark)}</span> : null}
                </button>
              );
            })}
            {readerContent.concepts && readerContent.concepts.length > 0 ? (
              <>
                <div style={{ fontSize: ".62rem", fontWeight: 700, letterSpacing: ".12em", color: tl, marginTop: 24, marginBottom: 10 }}>Related concepts</div>
                {readerContent.concepts.map((id) => {
                  const concept = visibleConceptById.get(id);
                  if (!concept) {
                    return null;
                  }
                  return (
                    <button
                      key={id}
                      onClick={() => onPracticeConcept(concept)}
                      style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 10, background: inner, border: `1px solid ${bd}`, cursor: "pointer", width: "100%", color: tx, fontSize: ".82rem", marginBottom: 4 }}
                    >
                      <span style={{ fontSize: ".7rem" }}>{memoryStageIcon(getMemoryStage(concept.id))}</span>
                      <span style={{ flex: 1 }}>{concept.name}</span>
                      <span style={{ color: concept.mastery > 0 ? cy : mu, fontSize: ".72rem", fontWeight: 600 }}>{concept.mastery > 0 ? `${Math.round(concept.mastery * 100)}%` : ""}</span>
                    </button>
                  );
                })}
              </>
            ) : null}
          </>
        ) : null}
      </div>

      {hlPopover ? (
        <div style={{ position: "fixed", left: Math.max(60, Math.min(hlPopover.x - 140, windowWidth - 340)), top: Math.max(10, hlPopover.y - 52), zIndex: 200, animation: "fadeUp .15s ease" }}>
          <div style={{ display: "flex", gap: 4, padding: "8px 10px", borderRadius: 14, background: "rgba(8,8,20,.95)", border: `1px solid ${bd}`, boxShadow: "0 8px 32px rgba(0,0,0,.6)" }}>
            {["key idea", "evidence", "quote", "thesis fuel", "confusing", "revisit"].map((tag) => (
              <button
                key={tag}
                onClick={() => onAddHighlight(tag)}
                style={{ padding: "6px 10px", borderRadius: 10, border: `1px solid ${bd}`, background: "transparent", color: highlightTagColor(tag), fontSize: ".7rem", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}
              >
                {highlightTagIcon(tag)} {tag}
              </button>
            ))}
            <button onClick={onClearHighlightPopover} style={{ padding: "4px 8px", borderRadius: 8, border: "none", background: "transparent", color: mu, cursor: "pointer" }}>
              Close
            </button>
          </div>
        </div>
      ) : null}

      <div ref={readerScrollRef} style={{ flex: 1, overflowY: "auto", display: "flex", justifyContent: "center" }}>
        {readerContent ? (
          <div style={{ maxWidth: 680, padding: mobileLayout ? "32px 18px 88px" : "56px 48px 120px", animation: "fadeUp .4s ease" }}>
            {(readingPositions[readerContent.id] ?? 0) > 0 && readerSection === readingPositions[readerContent.id] ? (
              <div style={{ padding: "14px 20px", borderRadius: 14, background: `${cy}06`, border: `1px solid ${cy}15`, marginBottom: 32 }}>
                <span style={{ fontSize: ".85rem", color: cy }}>Resumed from "{readerContent.sections[readerSection]?.heading}"</span>
              </div>
            ) : null}

            <div style={{ marginBottom: 48, paddingBottom: 32, borderBottom: `1px solid ${bd}` }}>
              <div style={{ fontSize: ".72rem", fontWeight: 700, letterSpacing: ".2em", color: cy, marginBottom: 12, fontFamily: "'Space Grotesk',sans-serif" }}>{readerContent.subtitle}</div>
              <h1 style={{ fontSize: "2.2rem", fontWeight: 700, color: tx, lineHeight: 1.35, marginBottom: 12, fontFamily: "'Space Grotesk',sans-serif" }}>{readerContent.title}</h1>
            </div>

            {readerContent.sections.map((section, index) => {
              const mark = getSectionMark(readerContent.id, index);
              const active = readerSection === index;
              const marginKey = `${readerContent.id}:${index}`;
              const notes = margins[marginKey] ?? [];
              const visibleNotes = active ? notes : notes.filter((note) => note.type === "confusion");
              return (
                <div
                  key={index}
                  id={`rs-${index}`}
                  data-section-idx={index}
                  style={{
                    marginBottom: 48,
                    scrollMarginTop: 80,
                    padding: "24px 28px",
                    marginLeft: -28,
                    marginRight: -28,
                    borderRadius: 18,
                    background: mark === "understood" ? "rgba(6,214,160,.03)" : mark === "confusing" ? "rgba(255,68,102,.02)" : "transparent",
                    border: mark === "understood" ? "1px solid rgba(6,214,160,.08)" : mark === "confusing" ? "1px solid rgba(255,68,102,.06)" : "1px solid transparent",
                    transition: "all 500ms ease"
                  }}
                >
                  {active && activeConcept ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, padding: "10px 14px", borderRadius: 12, background: `${cy}04`, border: `1px solid ${cy}0a` }}>
                      <span style={{ fontSize: ".72rem" }}>{memoryStageIcon(getMemoryStage(activeConcept.id))}</span>
                      <span style={{ fontSize: ".78rem", color: cy, fontWeight: 600 }}>{activeConcept.name}</span>
                    </div>
                  ) : null}

                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                    <div style={{ width: 4, height: 32, borderRadius: 2, background: active ? cy : mark ? sectionMarkColor(mark) : "transparent", transition: "all 400ms ease", flexShrink: 0 }} />
                    <h2 style={{ fontSize: "1.4rem", fontWeight: 700, color: active ? tx : t2, lineHeight: 1.4, fontFamily: "'Space Grotesk',sans-serif", margin: 0, flex: 1 }}>{section.heading}</h2>
                    {mark ? <span style={{ fontSize: ".72rem", fontWeight: 700, color: sectionMarkColor(mark), padding: "4px 10px", borderRadius: 8, background: `${sectionMarkColor(mark)}12` }}>{sectionMarkIcon(mark)} {mark}</span> : null}
                  </div>

                  {section.body.split("\n\n").map((paragraph, paragraphIndex) => (
                    <p key={paragraphIndex} style={{ fontSize: "1.08rem", lineHeight: 2.05, color: t2, marginBottom: 20, letterSpacing: ".01em" }}>
                      {paragraph}
                    </p>
                  ))}

                  {visibleNotes.length > 0 ? (
                    <div style={{ marginTop: 8, marginBottom: 16, display: "flex", flexDirection: "column", gap: 8, animation: active ? "fadeUp .4s ease" : "none" }}>
                      {visibleNotes.map((note, noteIndex) => {
                        const dismissalKey = `${marginKey}:${noteIndex}`;
                        if (marginDismissed.has(dismissalKey)) {
                          return null;
                        }
                        const typeInfo = marginTypes[note.type] ?? { label: "Note" };
                        return (
                          <div key={dismissalKey} style={{ display: "flex", gap: 12, padding: "12px 16px", borderRadius: 14, background: `${note.color}06`, borderLeft: `3px solid ${note.color}44` }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: ".64rem", fontWeight: 700, letterSpacing: ".1em", color: note.color, marginBottom: 4 }}>{typeInfo.label.toUpperCase()}</div>
                              <p style={{ fontSize: ".85rem", lineHeight: 1.6, color: t2, margin: 0 }}>{note.text}</p>
                            </div>
                            <button onClick={() => onDismissMargin(dismissalKey)} style={{ background: "none", border: "none", color: mu, cursor: "pointer", fontSize: ".72rem", opacity: 0.5 }}>
                              Close
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}

                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(50,50,100,.25)", flexWrap: "wrap" }}>
                    {["understood", "important", "revisit", "confusing"].map((nextMark) => (
                      <button
                        key={nextMark}
                        onClick={() => onMarkSection(readerContent.id, index, nextMark)}
                        style={{
                          padding: "5px 12px",
                          borderRadius: 10,
                          border: `1px solid ${mark === nextMark ? `${sectionMarkColor(nextMark)}44` : bd}`,
                          background: mark === nextMark ? `${sectionMarkColor(nextMark)}12` : "transparent",
                          color: mark === nextMark ? sectionMarkColor(nextMark) : mu,
                          fontSize: ".72rem",
                          fontWeight: 600,
                          cursor: "pointer"
                        }}
                      >
                        {sectionMarkIcon(nextMark)} {nextMark}
                      </button>
                    ))}
                    <div style={{ flex: 1 }} />
                    <button
                      onClick={() => {
                        onSaveSection({ heading: section.heading, body: section.body.slice(0, 120), from: readerContent.title });
                        onFlashSaved();
                      }}
                      style={{ padding: "5px 12px", borderRadius: 10, border: `1px solid ${bd}`, background: "transparent", color: mu, fontSize: ".72rem", cursor: "pointer" }}
                    >
                      Save
                    </button>
                  </div>
                </div>
              );
            })}

            <div style={{ textAlign: "center", padding: "40px 0", borderTop: `1px solid ${bd}` }}>
              <p style={{ color: tx, fontSize: "1.05rem", fontWeight: 600, marginBottom: 16 }}>Reading complete</p>
              <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                {activeConcept ? <button onClick={() => onPracticeConcept(activeConcept)} style={buttonStyle(`linear-gradient(135deg,${cy},#0066ff)`, "#000")}>Practice</button> : null}
                <button onClick={onCloseReader} style={{ ...buttonStyle("transparent", mu), border: `1px solid ${bd}` }}>Library</button>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ maxWidth: 720, padding: mobileLayout ? "32px 18px" : "56px 48px", width: "100%" }}>
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <h2 style={{ ...headingStyle(1.5), marginBottom: 8 }}>Reading workspace</h2>
              <p style={{ color: t2, fontSize: "1rem" }}>Focused, distraction-free reading with explicit progress and evidence markers.</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {readings.map((reading) => {
                const progress = getReadingProgress(reading.id, reading.sections.length);
                const lastPosition = readingPositions[reading.id];
                return (
                  <button key={reading.id} onClick={() => onOpenReader(reading.id)} style={{ display: "flex", alignItems: "center", gap: 16, padding: "22px 26px", borderRadius: 18, background: surface, border: `1px solid ${bd}`, cursor: "pointer", color: tx, textAlign: "left", width: "100%" }}>
                    <div style={{ position: "relative", width: 44, height: 44, flexShrink: 0 }}>
                      <svg viewBox="0 0 44 44" style={{ width: 44, height: 44 }}>
                        <circle cx="22" cy="22" r="19" fill="none" stroke={dm} strokeWidth="3" />
                        <circle cx="22" cy="22" r="19" fill="none" stroke={progress >= 100 ? tl : progress > 0 ? cy : dm} strokeWidth="3" strokeDasharray={`${(progress / 100) * 119} 119`} strokeLinecap="round" transform="rotate(-90 22 22)" />
                      </svg>
                      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".7rem" }}>{progress >= 100 ? "OK" : "Read"}</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "1.02rem", fontWeight: 600, marginBottom: 2 }}>{reading.title}</div>
                      <div style={{ fontSize: ".82rem", color: mu }}>{reading.subtitle}</div>
                      {lastPosition > 0 && progress < 100 ? <div style={{ fontSize: ".75rem", color: cy, marginTop: 4 }}>Resume from "{reading.sections[lastPosition]?.heading}"</div> : null}
                    </div>
                    <span style={{ color: cy }}>Open</span>
                  </button>
                );
              })}
            </div>
            {highlights.length > 0 ? (
              <div style={{ marginTop: 36 }}>
                <div style={{ fontSize: ".72rem", fontWeight: 700, letterSpacing: ".14em", color: "#a78bfa", marginBottom: 12 }}>Highlights ({highlights.length})</div>
                {highlights.slice(0, 8).map((highlight) => (
                  <div key={highlight.id} style={{ padding: "12px 16px", borderRadius: 12, background: inner, border: `1px solid ${bd}`, borderLeft: `3px solid ${highlightTagColor(highlight.tag)}`, marginBottom: 6 }}>
                    <div style={{ fontSize: ".7rem", color: highlightTagColor(highlight.tag), fontWeight: 700, marginBottom: 4 }}>{highlightTagIcon(highlight.tag)} {highlight.tag}</div>
                    <p style={{ fontSize: ".82rem", color: t2, margin: 0 }}>{highlight.text.length > 80 ? `${highlight.text.slice(0, 80)}...` : highlight.text}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        )}
      </div>

      {readerContent ? (
        <div style={{ width: mobileLayout ? "100%" : readerUtilOpen ? 240 : 48, flexShrink: 0, borderLeft: `1px solid ${bd}`, background: "rgba(6,6,16,.6)", transition: "width 300ms ease", overflow: "hidden" }}>
          <button onClick={onToggleReaderTools} style={{ width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", color: mu, cursor: "pointer", fontSize: "1.1rem" }}>
            {readerUtilOpen ? ">" : "<"}
          </button>
          {readerUtilOpen ? (
            <div style={{ padding: "0 16px 28px" }}>
              <div style={{ fontSize: ".68rem", fontWeight: 700, letterSpacing: ".12em", color: mu, marginBottom: 16 }}>Tools</div>
              <div style={{ fontSize: "1.4rem", fontWeight: 800, color: cy, marginBottom: 12 }}>{getReadingProgress(readerContent.id, readerContent.sections.length)}%</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {activeConcept ? (
                  <button onClick={() => onPracticeConcept(activeConcept)} style={{ padding: "12px 14px", borderRadius: 12, border: `1px solid ${cy}33`, background: `${cy}08`, color: cy, fontSize: ".82rem", fontWeight: 600, cursor: "pointer", textAlign: "left" }}>
                    Practice
                  </button>
                ) : null}
                <button onClick={onOpenViewpoints} style={{ padding: "12px 14px", borderRadius: 12, border: `1px solid ${tl}33`, background: `${tl}08`, color: tl, fontSize: ".82rem", fontWeight: 600, cursor: "pointer", textAlign: "left" }}>
                  Viewpoints
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
