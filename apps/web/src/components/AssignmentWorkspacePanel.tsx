import type { CSSProperties, Dispatch, SetStateAction } from "react";
import type { ShellAssignment, ShellConcept } from "../lib/shell-mapper";

type AssignmentReadinessRequirement = {
  checklist?: string[];
  pitfalls?: string[];
};

type AssignmentReadinessSkill = {
  id: string;
  label: string;
  summary: string;
  progress: number;
  state: string;
};

type AssignmentReadinessLike = {
  status: string;
  progressPercent: number;
  requiredSkills: AssignmentReadinessSkill[];
  requirement?: AssignmentReadinessRequirement;
};

type ParagraphType = {
  id: string;
  label: string;
  icon: string;
  color: string;
  desc: string;
};

type OutlineBlock = {
  type: string;
  content: string;
};

type AssignmentTheme = {
  BD: string;
  CY: string;
  GD: string;
  MU: string;
  RD: string;
  T2: string;
  TL: string;
  TX: string;
  DM: string;
  CD2: string;
  innr: string;
  card: CSSProperties;
  heading: (size: number) => CSSProperties;
  button: (background: string, color: string) => CSSProperties;
  masteryColor: (mastery: number) => string;
  percent: (value: number) => string;
};

type AssignmentWorkspacePanelProps = {
  assignment: ShellAssignment;
  assignmentHeader: string;
  readinessState: AssignmentReadinessLike;
  visibleConcepts: ShellConcept[];
  visibleReady: ShellConcept[];
  visibleNotReady: ShellConcept[];
  visibleSupportText: string;
  thesisTemplates: Record<string, string[]>;
  paragraphTypes: ParagraphType[];
  argumentStage: string;
  setArgumentStage: Dispatch<SetStateAction<string>>;
  thesis: Record<string, string>;
  setThesis: Dispatch<SetStateAction<Record<string, string>>>;
  outline: Record<string, OutlineBlock[]>;
  setOutline: Dispatch<SetStateAction<Record<string, OutlineBlock[]>>>;
  draft: Record<string, string>;
  setDraft: Dispatch<SetStateAction<Record<string, string>>>;
  theme: AssignmentTheme;
  assignmentDueLine: (assignment: ShellAssignment, urgent: boolean) => string;
  assignmentReadinessLabel: (readiness: AssignmentReadinessLike) => string;
  assignmentReadinessStateLabel: (readiness: AssignmentReadinessLike) => string;
  memoryStageIcon: (stage: string) => string;
  getMemoryStage: (conceptId: string) => string;
  onBack: () => void;
  onOpenConcept: (concept: ShellConcept) => void;
  onStartPractice: (concept: ShellConcept) => void;
};

export function AssignmentWorkspacePanel({
  assignment,
  assignmentHeader,
  readinessState,
  visibleConcepts,
  visibleReady,
  visibleNotReady,
  visibleSupportText,
  thesisTemplates,
  paragraphTypes,
  argumentStage,
  setArgumentStage,
  thesis,
  setThesis,
  outline,
  setOutline,
  draft,
  setDraft,
  theme,
  assignmentDueLine,
  assignmentReadinessLabel,
  assignmentReadinessStateLabel,
  memoryStageIcon,
  getMemoryStage,
  onBack,
  onOpenConcept,
  onStartPractice
}: AssignmentWorkspacePanelProps) {
  const { BD, CY, GD, MU, RD, T2, TL, TX, DM, CD2, innr, card, heading, button, masteryColor, percent } = theme;
  const requiredSkills = readinessState.requiredSkills;
  const needed = visibleConcepts;
  const ready = visibleReady;
  const weak = visibleNotReady;
  const readiness = readinessState.progressPercent;
  const readinessLabel = assignmentReadinessLabel(readinessState);
  const urgent = assignment.dueState === "today" || assignment.dueState === "overdue" || (assignment.dueState === "upcoming" && assignment.due <= 3);
  const readinessColor = readinessState.status === "unmapped" ? MU : readinessState.status === "concept-prep" ? CY : readiness >= 100 ? TL : readiness > 50 ? CY : "#ff8800";
  const readinessBorder = readinessState.status === "unmapped" ? BD : readinessState.status === "concept-prep" ? CY : readiness >= 100 ? TL : urgent ? RD : CY;
  const readinessFill = readinessState.status === "unmapped" ? "rgba(125,148,178,.06)" : readinessState.status === "concept-prep" ? "rgba(61,149,255,.08)" : readiness >= 100 ? `${TL}06` : urgent ? `${RD}04` : `${CY}04`;

  return (
    <div style={{ maxWidth: 880 }}>
      <button onClick={onBack} style={{ background: "transparent", border: "none", color: MU, cursor: "pointer", fontSize: ".92rem", marginBottom: 20 }}>
        ← Back
      </button>

      <div style={{ ...card, marginBottom: 24, borderTop: `4px solid ${readinessBorder}`, background: `linear-gradient(135deg,${readinessFill},${CD2})` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 20 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <span style={{ fontSize: "2rem" }}>{assignment.type}</span>
              <div>
                <h2 style={heading(1.4)}>{assignmentHeader}</h2>
                <p style={{ color: MU, fontSize: ".88rem", margin: "4px 0 0" }}>{[assignment.sub && assignment.sub !== assignment.title ? assignment.sub : null, `${assignment.pts}pts`, assignmentDueLine(assignment, urgent)].filter(Boolean).join(" · ")}</p>
              </div>
            </div>
            {assignment.demandIcon ? (
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 12, background: innr, border: `1px solid ${BD}`, marginTop: 4 }}>
                <span style={{ fontSize: "1rem" }}>{assignment.demandIcon}</span>
                <span style={{ fontSize: ".82rem", fontWeight: 700, color: CY, fontFamily: "'Space Grotesk',sans-serif", letterSpacing: ".06em" }}>{assignment.demand}</span>
              </div>
            ) : null}
          </div>
          <div style={{ textAlign: "center", minWidth: 100 }}>
            <div style={{ position: "relative", width: 80, height: 80, margin: "0 auto" }}>
              <svg viewBox="0 0 80 80" style={{ width: 80, height: 80 }}>
                <circle cx="40" cy="40" r="36" fill="none" stroke={DM} strokeWidth="4" />
                <circle cx="40" cy="40" r="36" fill="none" stroke={readinessColor} strokeWidth="4" strokeDasharray={`${(readiness / 100) * 226} 226`} strokeLinecap="round" transform="rotate(-90 40 40)" style={{ transition: "stroke-dasharray 800ms ease" }} />
              </svg>
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: "1.3rem", fontWeight: 800, color: readinessColor, fontFamily: "'Space Grotesk',sans-serif" }}>{readinessLabel}</span>
              </div>
            </div>
            <div style={{ fontSize: ".68rem", color: MU, marginTop: 6 }}>{assignmentReadinessStateLabel(readinessState)}</div>
          </div>
        </div>
      </div>

      {["unmapped", "concept-prep"].includes(readinessState.status) ? (
        <div style={{ ...card, marginBottom: 20, borderLeft: `4px solid ${readinessState.status === "concept-prep" ? CY : MU}` }}>
          <div style={{ fontSize: ".72rem", fontWeight: 700, letterSpacing: ".12em", color: readinessState.status === "concept-prep" ? CY : MU, marginBottom: 12, fontFamily: "'Space Grotesk',sans-serif" }}>{readinessState.status === "concept-prep" ? "Concept prep" : "Needs mapping"}</div>
          <p style={{ color: T2, fontSize: ".9rem", lineHeight: 1.6, margin: 0 }}>{readinessState.status === "concept-prep" ? "Concept grounding exists, but the checklist-backed skill chain is not complete yet." : visibleSupportText}</p>
          {readinessState.requirement?.checklist?.length ? (
            <div style={{ marginTop: 14, display: "grid", gap: 8 }}>
              {readinessState.requirement.checklist.slice(0, 3).map((line, index) => (
                <div key={`${assignment.id}-check-${index}`} style={{ padding: "10px 12px", borderRadius: 12, background: innr, border: `1px solid ${BD}`, color: T2, fontSize: ".82rem" }}>{line}</div>
              ))}
            </div>
          ) : null}
          {readinessState.requirement?.pitfalls?.length ? <p style={{ color: MU, fontSize: ".78rem", lineHeight: 1.5, margin: "12px 0 0" }}>Watch for: {readinessState.requirement.pitfalls.slice(0, 2).join(" · ")}</p> : null}
        </div>
      ) : null}

      {requiredSkills.length > 0 ? (
        <div style={{ ...card, marginBottom: 20, borderLeft: `4px solid ${CY}` }}>
          <div style={{ fontSize: ".72rem", fontWeight: 700, letterSpacing: ".12em", color: CY, marginBottom: 16, fontFamily: "'Space Grotesk',sans-serif" }}>⬢ SKILL CHAIN</div>
          <div style={{ display: "grid", gap: 10 }}>
            {requiredSkills.map((skill) => (
              <div key={skill.id} style={{ padding: "14px 16px", borderRadius: 14, background: innr, border: `1px solid ${skill.state === "mastered" ? `${GD}22` : skill.state === "earned" ? `${TL}22` : skill.state === "recovery" ? "rgba(251,146,60,.24)" : BD}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                  <div style={{ position: "relative", minHeight: 50 }}>
                    <div style={{ fontSize: ".86rem", fontWeight: 700, color: TX }}>{skill.label}</div>
                    <div style={{ fontSize: ".76rem", color: MU, marginTop: 4 }}>{skill.summary}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: ".88rem", fontWeight: 800, color: skill.state === "mastered" ? GD : skill.state === "earned" ? TL : skill.state === "recovery" ? "#fb923c" : CY, fontFamily: "'Space Grotesk',sans-serif" }}>{Math.round(skill.progress * 100)}%</div>
                    <div style={{ fontSize: ".68rem", color: MU, marginTop: 2 }}>{skill.state}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {assignment.reallyAsking ? (
        <div style={{ ...card, marginBottom: 20, borderLeft: `4px solid ${CY}` }}>
          <div style={{ fontSize: ".72rem", fontWeight: 700, letterSpacing: ".12em", color: CY, marginBottom: 10, fontFamily: "'Space Grotesk',sans-serif" }}>🎯 WHAT IT'S REALLY ASKING</div>
          <p style={{ fontSize: "1.08rem", lineHeight: 1.85, color: TX, margin: 0 }}>{assignment.reallyAsking}</p>
        </div>
      ) : null}

      {assignment.secretCare ? (
        <div style={{ ...card, marginBottom: 20, borderLeft: `4px solid ${GD}` }}>
          <div style={{ fontSize: ".72rem", fontWeight: 700, letterSpacing: ".12em", color: GD, marginBottom: 10, fontFamily: "'Space Grotesk',sans-serif" }}>🔑 WHAT INSTRUCTORS SECRETLY CARE ABOUT</div>
          <p style={{ fontSize: "1rem", lineHeight: 1.8, color: T2, margin: 0 }}>{assignment.secretCare}</p>
        </div>
      ) : null}

      <div style={{ ...card, marginBottom: 20 }}>
        <div style={{ fontSize: ".72rem", fontWeight: 700, letterSpacing: ".12em", color: TL, marginBottom: 16, fontFamily: "'Space Grotesk',sans-serif" }}>🧠 CONCEPT READINESS</div>
        {needed.length === 0 ? <p style={{ color: MU, fontSize: ".92rem", marginBottom: 12 }}>{visibleSupportText}</p> : null}
        {ready.length > 0 ? <p style={{ color: TL, fontSize: ".92rem", marginBottom: 12 }}>✓ You're prepared in: {ready.map((concept) => concept.name).join(", ")}</p> : null}
        {weak.length > 0 ? <p style={{ color: "#ff8800", fontSize: ".92rem", marginBottom: 16 }}>→ Needs work: {weak.map((concept) => concept.name).join(", ")}</p> : null}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {needed.map((concept) => {
            const readyForAssignment = concept.mastery >= 0.6;
            const stage = getMemoryStage(concept.id);

            return (
              <div key={concept.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderRadius: 14, background: innr, border: `1px solid ${readyForAssignment ? `${TL}22` : BD}` }}>
                <span style={{ fontSize: ".82rem" }}>{memoryStageIcon(stage)}</span>
                <button onClick={() => onOpenConcept(concept)} style={{ flex: 1, background: "none", border: "none", color: TX, cursor: "pointer", textAlign: "left", fontSize: ".95rem", fontWeight: 500 }}>{concept.name}</button>
                <div style={{ width: 80, height: 4, borderRadius: 2, background: DM, overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 2, background: masteryColor(concept.mastery), width: percent(concept.mastery), transition: "width 500ms cubic-bezier(.22,1,.36,1)" }} />
                </div>
                <span style={{ color: masteryColor(concept.mastery), fontSize: ".82rem", fontWeight: 700, width: 36, textAlign: "right" }}>{percent(concept.mastery)}</span>
                {!readyForAssignment ? <button onClick={() => onStartPractice(concept)} style={{ padding: "6px 14px", borderRadius: 10, border: `1px solid ${CY}33`, background: `${CY}0d`, color: CY, fontSize: ".75rem", fontWeight: 700, cursor: "pointer" }}>Learn →</button> : null}
              </div>
            );
          })}
        </div>
        {weak.length > 0 ? (
          <div style={{ marginTop: 20, padding: "16px 20px", borderRadius: 14, background: `${CY}06`, border: `1px solid ${CY}15` }}>
            <div style={{ fontSize: ".72rem", fontWeight: 700, color: CY, marginBottom: 8, fontFamily: "'Space Grotesk',sans-serif" }}>⚡ FASTEST PATH TO READY</div>
            <p style={{ fontSize: ".92rem", color: T2, margin: "0 0 12px" }}>{assignment.quickPrep || `Learn ${weak.map((concept) => concept.name).join(", ")}. About ${weak.length * 5} minutes.`}</p>
            <button onClick={() => onStartPractice(weak[0]!)} style={button(`linear-gradient(135deg,${CY},#0066ff)`, "#000")}>⚡ Start prep: {weak[0]!.name}</button>
          </div>
        ) : null}
      </div>

      {assignment.failModes ? (
        <div style={{ ...card, marginBottom: 20, borderLeft: `4px solid ${RD}` }}>
          <div style={{ fontSize: ".72rem", fontWeight: 700, letterSpacing: ".12em", color: RD, marginBottom: 14, fontFamily: "'Space Grotesk',sans-serif" }}>⚠ COMMON MISTAKES TO AVOID</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {assignment.failModes.map((failureMode, index) => (
              <div key={index} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <span style={{ color: RD, fontSize: ".88rem", fontWeight: 700, flexShrink: 0 }}>✗</span>
                <p style={{ fontSize: ".95rem", color: T2, lineHeight: 1.65, margin: 0 }}>{failureMode}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {assignment.evidence ? (
        <div style={{ ...card, marginBottom: 20, borderLeft: "4px solid #a78bfa" }}>
          <div style={{ fontSize: ".72rem", fontWeight: 700, letterSpacing: ".12em", color: "#a78bfa", marginBottom: 10, fontFamily: "'Space Grotesk',sans-serif" }}>📋 WHAT YOUR RESPONSE NEEDS</div>
          <p style={{ fontSize: "1rem", lineHeight: 1.8, color: T2, margin: 0 }}>{assignment.evidence}</p>
        </div>
      ) : null}

      <div style={{ ...card }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontSize: ".72rem", fontWeight: 700, letterSpacing: ".12em", color: TL, fontFamily: "'Space Grotesk',sans-serif" }}>✍ RESPONSE BUILDER</div>
          <div style={{ display: "flex", gap: 4 }}>
            {[["thesis", "1. Thesis"], ["outline", "2. Outline"], ["draft", "3. Draft"]].map(([id, label]) => (
              <button key={id} onClick={() => setArgumentStage(id)} style={{ padding: "8px 18px", borderRadius: 12, border: argumentStage === id ? `2px solid ${TL}` : `1px solid ${BD}`, background: argumentStage === id ? `${TL}0d` : "transparent", color: argumentStage === id ? TL : MU, fontSize: ".78rem", fontWeight: 700, cursor: "pointer" }}>{label}</button>
            ))}
          </div>
        </div>

        {argumentStage === "thesis" ? (
          <div style={{ animation: "fadeUp .3s ease" }}>
            <p style={{ fontSize: ".92rem", color: T2, marginBottom: 20, lineHeight: 1.6 }}>Your thesis is the single claim your entire response defends. Start here - everything else flows from this.</p>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: ".68rem", fontWeight: 700, color: CY, marginBottom: 10, letterSpacing: ".1em" }}>AVAILABLE CONCEPTS</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {needed.map((concept) => (
                  <span key={concept.id} style={{ padding: "8px 16px", borderRadius: 20, background: `${CY}0a`, border: `1px solid ${CY}22`, fontSize: ".85rem", color: CY }}>{concept.name}</span>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: ".68rem", fontWeight: 700, color: GD, marginBottom: 10, letterSpacing: ".1em" }}>THESIS STARTERS FOR "{assignment.demand}"</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(thesisTemplates[assignment.demand?.split(" ")[0] || "Apply"] || thesisTemplates.Apply || []).map((template, index) => (
                  <button key={index} onClick={() => setThesis((current) => ({ ...current, [assignment.id]: template }))} style={{ padding: "14px 18px", borderRadius: 14, border: thesis[assignment.id] === template ? `2px solid ${GD}` : `1px solid ${BD}`, background: thesis[assignment.id] === template ? `${GD}08` : innr, cursor: "pointer", color: T2, fontSize: ".92rem", lineHeight: 1.6, textAlign: "left", fontStyle: "italic", transition: "all 250ms" }}>{template}</button>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: ".68rem", fontWeight: 700, color: TL, marginBottom: 10, letterSpacing: ".1em" }}>YOUR THESIS</div>
              <textarea value={thesis[assignment.id] || ""} onChange={(event) => setThesis((current) => ({ ...current, [assignment.id]: event.target.value }))} placeholder="State your central claim in one sentence..." style={{ width: "100%", minHeight: 80, padding: "18px 22px", borderRadius: 16, border: `1px solid ${BD}`, background: innr, color: TX, fontSize: "1.05rem", lineHeight: 1.8, resize: "vertical", fontFamily: "'Inter',sans-serif" }} />
            </div>
            {thesis[assignment.id] ? <button onClick={() => setArgumentStage("outline")} style={{ ...button(`linear-gradient(135deg,${TL},#00b088)`, "#000"), marginTop: 20 }}>Build outline →</button> : null}
          </div>
        ) : null}

        {argumentStage === "outline" ? (
          <div style={{ animation: "fadeUp .3s ease" }}>
            {thesis[assignment.id] ? (
              <div style={{ padding: "14px 18px", borderRadius: 14, background: `${TL}06`, border: `1px solid ${TL}15`, marginBottom: 20 }}>
                <div style={{ fontSize: ".68rem", fontWeight: 700, color: TL, marginBottom: 6 }}>YOUR THESIS</div>
                <p style={{ fontSize: ".92rem", color: TX, margin: 0, fontStyle: "italic" }}>{thesis[assignment.id]}</p>
              </div>
            ) : null}
            <p style={{ fontSize: ".92rem", color: T2, marginBottom: 20 }}>Build your argument by adding paragraph blocks. Each block has a purpose - click to add it to your structure.</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
              {paragraphTypes.map((paragraphType) => (
                <button key={paragraphType.id} onClick={() => setOutline((current) => ({ ...current, [assignment.id]: [...(current[assignment.id] || []), { type: paragraphType.id, content: "" }] }))} style={{ padding: "10px 16px", borderRadius: 14, border: `1px solid ${paragraphType.color}33`, background: `${paragraphType.color}08`, cursor: "pointer", color: paragraphType.color, fontSize: ".82rem", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                  <span>{paragraphType.icon}</span>
                  {paragraphType.label}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {(outline[assignment.id] || []).map((block, index) => {
                const paragraphType = paragraphTypes.find((candidate) => candidate.id === block.type) || paragraphTypes[0]!;

                return (
                  <div key={index} style={{ padding: "18px 22px", borderRadius: 16, background: innr, border: `1px solid ${BD}`, borderLeft: `4px solid ${paragraphType.color}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: ".9rem" }}>{paragraphType.icon}</span>
                        <span style={{ fontSize: ".72rem", fontWeight: 700, color: paragraphType.color, letterSpacing: ".08em", fontFamily: "'Space Grotesk',sans-serif" }}>{paragraphType.label.toUpperCase()}</span>
                        <span style={{ fontSize: ".75rem", color: MU }}>- {paragraphType.desc}</span>
                      </div>
                      <button onClick={() => setOutline((current) => ({ ...current, [assignment.id]: (current[assignment.id] || []).filter((_, currentIndex) => currentIndex !== index) }))} style={{ background: "none", border: "none", color: MU, cursor: "pointer", fontSize: ".82rem" }}>✕</button>
                    </div>
                    <textarea value={block.content} onChange={(event) => setOutline((current) => ({ ...current, [assignment.id]: (current[assignment.id] || []).map((currentBlock, currentIndex) => currentIndex === index ? { ...currentBlock, content: event.target.value } : currentBlock) }))} placeholder={`What will this ${paragraphType.label.toLowerCase()} paragraph say?`} style={{ width: "100%", minHeight: 60, padding: "12px 16px", borderRadius: 12, border: `1px solid ${BD}`, background: "rgba(0,0,0,.15)", color: TX, fontSize: ".95rem", lineHeight: 1.7, resize: "vertical", fontFamily: "'Inter',sans-serif" }} />
                  </div>
                );
              })}
            </div>
            {(outline[assignment.id] || []).length === 0 ? <div style={{ padding: "32px", borderRadius: 16, background: innr, border: `1px dashed ${BD}`, textAlign: "center" }}><p style={{ color: MU, margin: 0 }}>Click paragraph types above to build your outline</p></div> : null}
            {(outline[assignment.id] || []).length >= 2 ? <button onClick={() => setArgumentStage("draft")} style={{ ...button(`linear-gradient(135deg,${TL},#00b088)`, "#000"), marginTop: 20 }}>Start drafting →</button> : null}
          </div>
        ) : null}

        {argumentStage === "draft" ? (
          <div style={{ animation: "fadeUp .3s ease" }}>
            {thesis[assignment.id] ? (
              <div style={{ padding: "12px 16px", borderRadius: 12, background: `${TL}06`, border: `1px solid ${TL}12`, marginBottom: 16 }}>
                <span style={{ fontSize: ".72rem", fontWeight: 700, color: TL }}>THESIS: </span>
                <span style={{ fontSize: ".88rem", color: TX, fontStyle: "italic" }}>{thesis[assignment.id]}</span>
              </div>
            ) : null}
            <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 16 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ fontSize: ".68rem", fontWeight: 700, color: MU, marginBottom: 4, letterSpacing: ".1em" }}>STRUCTURE</div>
                {(outline[assignment.id] || []).map((block, index) => {
                  const paragraphType = paragraphTypes.find((candidate) => candidate.id === block.type) || paragraphTypes[0]!;
                  return (
                    <div key={index} style={{ padding: "10px 12px", borderRadius: 10, background: innr, border: `1px solid ${BD}`, borderLeft: `3px solid ${paragraphType.color}` }}>
                      <div style={{ fontSize: ".72rem", fontWeight: 700, color: paragraphType.color }}>{paragraphType.icon} {paragraphType.label}</div>
                      {block.content ? <div style={{ fontSize: ".72rem", color: MU, marginTop: 4, lineHeight: 1.4 }}>{block.content.slice(0, 60)}{block.content.length > 60 ? "..." : ""}</div> : null}
                    </div>
                  );
                })}
                {(outline[assignment.id] || []).length === 0 ? <p style={{ fontSize: ".78rem", color: MU }}>No outline yet</p> : null}
              </div>
              <div>
                <textarea value={draft[assignment.id] || ""} onChange={(event) => setDraft((current) => ({ ...current, [assignment.id]: event.target.value }))} placeholder="Write your full response here. Your outline is on the left for reference." style={{ width: "100%", minHeight: 320, padding: "22px 26px", borderRadius: 16, border: `1px solid ${BD}`, background: innr, color: TX, fontSize: "1rem", lineHeight: 1.9, resize: "vertical", fontFamily: "'Inter',sans-serif" }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
                  <span style={{ fontSize: ".78rem", color: MU }}>{(draft[assignment.id] || "").split(/\s+/).filter(Boolean).length} words</span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setArgumentStage("outline")} style={{ fontSize: ".78rem", color: MU, background: "none", border: `1px solid ${BD}`, padding: "6px 14px", borderRadius: 10, cursor: "pointer" }}>← Edit outline</button>
                    <button onClick={() => setArgumentStage("thesis")} style={{ fontSize: ".78rem", color: MU, background: "none", border: `1px solid ${BD}`, padding: "6px 14px", borderRadius: 10, cursor: "pointer" }}>← Edit thesis</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
