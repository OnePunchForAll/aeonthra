import type { CSSProperties } from "react";
import type { ShellAssignment, ShellConcept, ShellModule } from "../lib/shell-mapper";

type AssignmentReadinessLike = {
  status: string;
  progressPercent: number;
};

type HomeTheme = {
  BD: string;
  CD2: string;
  CY: string;
  DM: string;
  GD: string;
  MU: string;
  RD: string;
  T2: string;
  TL: string;
  TX: string;
  card: CSSProperties;
  ey: CSSProperties;
  heading: (size: number) => CSSProperties;
  button: (background: string, color: string) => CSSProperties;
  masteryColor: (mastery: number) => string;
  percent: (value: number) => string;
};

type HomeDashboardPanelProps = {
  synthesisQualityBanner?: string | null;
  averageMastery: number;
  visibleMastered: number;
  visibleConceptCount: number;
  visibleDoneCount: number;
  bestStreak: number;
  totalAnswered: number;
  totalCorrect: number;
  nextAssignment: ShellAssignment | null;
  nextAssignmentHeader: string;
  nextAssignmentVisibleReady: ShellConcept[];
  nextAssignmentVisibleNotReady: ShellConcept[];
  nextAssignmentVisibleConcepts: ShellConcept[];
  nextAssignmentVisibleSupportText: string;
  nextAssignmentReadiness: AssignmentReadinessLike | null;
  assignments: ShellAssignment[];
  modules: ShellModule[];
  visibleConcepts: ShellConcept[];
  visibleConceptById: Map<string, ShellConcept>;
  visibleDone: Set<string>;
  theme: HomeTheme;
  memoryStageIcon: (stage: string) => string;
  getMemoryStage: (conceptId: string) => string;
  assignmentReadiness: (assignment: ShellAssignment) => AssignmentReadinessLike;
  assignmentReadinessLabel: (readiness: AssignmentReadinessLike) => string;
  assignmentDueLine: (assignment: ShellAssignment, urgent: boolean) => string;
  assignmentDueCounter: (assignment: ShellAssignment) => string;
  onOpenQuickReview: () => void;
  onOpenNextAssignment: () => void;
  onOpenJourney: () => void;
  onOpenExplore: () => void;
  onOpenCourseware: () => void;
  onOpenStats: () => void;
  onOpenAssignment: (assignment: ShellAssignment) => void;
  onOpenConcept: (concept: ShellConcept) => void;
};

export function HomeDashboardPanel({
  synthesisQualityBanner,
  averageMastery,
  visibleMastered,
  visibleConceptCount,
  visibleDoneCount,
  bestStreak,
  totalAnswered,
  totalCorrect,
  nextAssignment,
  nextAssignmentHeader,
  nextAssignmentVisibleReady,
  nextAssignmentVisibleNotReady,
  nextAssignmentVisibleConcepts,
  nextAssignmentVisibleSupportText,
  nextAssignmentReadiness,
  assignments,
  modules,
  visibleConcepts,
  visibleConceptById,
  visibleDone,
  theme,
  memoryStageIcon,
  getMemoryStage,
  assignmentReadiness,
  assignmentReadinessLabel,
  assignmentDueLine,
  assignmentDueCounter,
  onOpenQuickReview,
  onOpenNextAssignment,
  onOpenJourney,
  onOpenExplore,
  onOpenCourseware,
  onOpenStats,
  onOpenAssignment,
  onOpenConcept
}: HomeDashboardPanelProps) {
  const { BD, CD2, CY, DM, GD, MU, RD, T2, TL, TX, card, ey, heading, button, masteryColor, percent } = theme;

  return (
    <>
      {synthesisQualityBanner ? (
        <div style={{ background: "rgba(251,146,60,.12)", border: "1px solid rgba(251,146,60,.35)", borderRadius: 10, padding: "12px 18px", marginBottom: 24, fontSize: ".9rem", color: "#fb923c", lineHeight: 1.6 }}>
          {synthesisQualityBanner}
        </div>
      ) : null}

      <div style={{ textAlign: "center", marginBottom: 36, animation: "fadeUp .4s ease" }}>
        <h1 style={{ ...heading(1.8), marginBottom: 10 }}>{averageMastery > 0 ? "Welcome back." : "Let's get started."}</h1>
        <p style={{ color: T2, fontSize: "1.1rem", lineHeight: 1.7, maxWidth: 600, margin: "0 auto" }}>
          {averageMastery === 0 ? "Every expert started at zero. Pick one concept, answer one question, and the rest follows."
            : averageMastery < 0.3 ? "You've started building your foundation. Keep going - every answer strengthens it."
            : averageMastery < 0.6 ? "You're making real progress. The concepts are starting to connect."
            : averageMastery < 0.8 ? "You're in strong shape. A few more sessions and you'll be fully prepared."
            : "You've mastered the core material. Time to apply it with confidence."}
        </p>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 56, marginBottom: 40, animation: "fadeUp .5s ease" }}>
        <div style={{ position: "relative", width: 110, height: 110 }}>
          <svg viewBox="0 0 110 110" style={{ width: 110, height: 110 }}>
            <circle cx="55" cy="55" r="48" fill="none" stroke={DM} strokeWidth="5" />
            <circle
              cx="55"
              cy="55"
              r="48"
              fill="none"
              stroke={averageMastery >= 0.8 ? GD : averageMastery >= 0.5 ? TL : CY}
              strokeWidth="5"
              strokeDasharray={`${averageMastery * 301} 301`}
              strokeLinecap="round"
              transform="rotate(-90 55 55)"
              style={{ transition: "stroke-dasharray 1.2s ease", filter: `drop-shadow(0 0 8px ${averageMastery >= 0.8 ? GD : averageMastery >= 0.5 ? TL : CY}55)` }}
            />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
            <div style={{ fontSize: "1.6rem", fontWeight: 800, color: TX, fontFamily: "'Space Grotesk',sans-serif" }}>{percent(averageMastery)}</div>
            <div style={{ fontSize: ".62rem", color: MU, letterSpacing: ".1em" }}>OVERALL</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 36 }}>
          {[
            [`${visibleMastered}/${visibleConceptCount}`, "Mastered", "🏆"],
            [`${visibleDoneCount}/${visibleConceptCount}`, "Learned", "🧠"],
            [bestStreak > 0 ? `${bestStreak}x` : "—", "Streak", "🔥"],
            [totalAnswered > 0 ? `${Math.round((totalCorrect / totalAnswered) * 100)}%` : "—", "Accuracy", "🎯"]
          ].map(([value, label, icon], index) => (
            <div key={index} style={{ textAlign: "center" }}>
              <div style={{ fontSize: ".95rem", marginBottom: 4 }}>{icon}</div>
              <div style={{ fontSize: "1.5rem", fontWeight: 700, fontVariantNumeric: "tabular-nums", fontFamily: "'Space Grotesk',sans-serif" }}>{value}</div>
              <div style={{ fontSize: ".68rem", color: MU, letterSpacing: ".1em", textTransform: "uppercase", marginTop: 3 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 32, animation: "fadeUp .55s ease", justifyContent: "center" }}>
        {([
          ["⚡", "Quick 5-min review", onOpenQuickReview],
          ["📝", "Assignment prep", onOpenNextAssignment],
          ["🗺", "Journey map", onOpenJourney],
          ["🧠", "Explore concepts", onOpenExplore],
          ["📚", "Library", onOpenCourseware],
          ["📊", "My stats", onOpenStats]
        ] as Array<[string, string, () => void]>).map(([icon, label, action]) => (
          <button key={label} onClick={() => action()} style={{ padding: "14px 22px", borderRadius: 16, border: `1px solid ${BD}`, background: CD2, cursor: "pointer", color: TX, fontSize: ".88rem", fontWeight: 500, transition: "all 250ms", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: "1.1rem" }}>{icon}</span>
            {label}
          </button>
        ))}
      </div>

      {nextAssignment ? (
        <div style={{ ...card, marginBottom: 28, borderLeft: `5px solid ${CY}`, background: `linear-gradient(90deg,rgba(0,240,255,.05),${CD2})`, boxShadow: "0 8px 48px rgba(0,240,255,.06)", animation: "fadeUp .6s ease" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 320 }}>
              <div style={{ ...ey, color: CY, fontFamily: "'Space Grotesk',sans-serif" }}>🎯 YOUR NEXT WIN</div>
              <h2 style={heading(1.35)}>{nextAssignmentHeader}</h2>
              <p style={{ color: MU, fontSize: ".9rem", marginTop: 8 }}>{nextAssignment.type} {nextAssignment.pts}pts · {assignmentDueLine(nextAssignment, false)}</p>

              <div style={{ marginTop: 16, padding: "16px 20px", borderRadius: 14, background: "rgba(255,255,255,.02)", border: `1px solid ${BD}` }}>
                <div style={{ fontSize: ".72rem", fontWeight: 700, letterSpacing: ".12em", color: TL, marginBottom: 6, fontFamily: "'Space Grotesk',sans-serif" }}>WHY THIS MATTERS</div>
                <p style={{ color: T2, fontSize: ".92rem", lineHeight: 1.65, margin: 0 }}>{nextAssignment.tip || "Completing this strengthens your foundation for everything that comes after."}</p>
              </div>

              <div style={{ marginTop: 16 }}>
                {nextAssignmentVisibleReady.length > 0 ? <p style={{ color: TL, fontSize: ".88rem", marginBottom: 6 }}>✓ You already know {nextAssignmentVisibleReady.map((concept) => concept.name).join(", ")}</p> : null}
                {nextAssignmentVisibleNotReady.length > 0 ? (
                  <p style={{ color: CY, fontSize: ".88rem" }}>→ {nextAssignmentVisibleNotReady.length === 1 ? "One concept still needs attention" : "Concept groundwork still needs attention"}: {nextAssignmentVisibleNotReady.map((concept) => concept.name).join(", ")}.</p>
                ) : nextAssignmentVisibleConcepts.length > 0 ? (
                  <p style={{ color: nextAssignmentReadiness?.status === "ready" ? TL : CY, fontSize: ".92rem", fontWeight: 600 }}>
                    {nextAssignmentReadiness?.status === "ready" ? "✓ Skill chain earned. You can move into the assignment." : "→ Concept grounding exists, but it is not a readiness claim yet."}
                  </p>
                ) : (
                  <p style={{ color: MU, fontSize: ".88rem" }}>{nextAssignmentVisibleSupportText}</p>
                )}
                {nextAssignmentReadiness?.status && nextAssignmentReadiness.status !== "ready" ? <p style={{ color: MU, fontSize: ".82rem", marginTop: 8 }}>{nextAssignmentVisibleSupportText}</p> : null}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-end" }}>
              {nextAssignmentVisibleNotReady.length > 0 || nextAssignmentReadiness?.status !== "ready" ? (
                <button onClick={onOpenQuickReview} style={{ ...button(`linear-gradient(135deg,${CY},#0066ff)`, "#000"), animation: "glow 3s ease infinite" }}>⚡ Strengthen groundwork</button>
              ) : (
                <button onClick={() => onOpenAssignment(nextAssignment)} style={button(`linear-gradient(135deg,${TL},#00b088)`, "#000")}>✓ Open Assignment</button>
              )}
              <button onClick={onOpenJourney} style={{ ...button("transparent", MU), border: `1px solid ${BD}`, padding: "10px 22px", fontSize: ".82rem" }}>See full path →</button>
            </div>
          </div>
        </div>
      ) : null}

      <div style={{ ...card, marginBottom: 28, padding: "28px 36px", animation: "fadeUp .65s ease" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <div style={{ ...ey, color: TL, margin: 0, fontFamily: "'Space Grotesk',sans-serif" }}>📊 ASSIGNMENT READINESS</div>
          <span style={{ fontSize: ".82rem", color: MU }}>How prepared you are for each task</span>
        </div>
        {assignments.map((assignment) => {
          const readinessState = assignmentReadiness(assignment);
          const readiness = readinessState.progressPercent;
          const readinessColor = readinessState.status === "unmapped" ? MU : readinessState.status === "concept-prep" ? CY : readiness >= 100 ? TL : readiness > 50 ? CY : "#ff8800";
          const urgent = assignment.dueState === "today" || assignment.dueState === "overdue" || (assignment.dueState === "upcoming" && assignment.due <= 3);

          return (
            <button key={assignment.id} onClick={() => onOpenAssignment(assignment)} style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 18px", background: theme.card.background as string ?? "rgba(255,255,255,0.02)", border: `1px solid ${urgent ? `${RD}33` : BD}`, borderRadius: 16, cursor: "pointer", width: "100%", color: TX, transition: "all 250ms", marginBottom: 8 }}>
              <span style={{ fontSize: "1.3rem", width: 36 }}>{assignment.type}</span>
              <div style={{ flex: 1, textAlign: "left" }}>
                <div style={{ fontSize: ".92rem", fontWeight: 600 }}>{assignment.title}</div>
                {readinessState.status === "unmapped" ? (
                  <div style={{ marginTop: 6, height: 4, borderRadius: 2, background: DM, opacity: 0.55 }} />
                ) : (
                  <div style={{ width: "100%", height: 4, borderRadius: 2, background: DM, marginTop: 6, overflow: "hidden" }}>
                    <div style={{ height: "100%", borderRadius: 2, background: readinessColor, width: `${readiness}%`, transition: "width 500ms ease" }} />
                  </div>
                )}
              </div>
              <div style={{ textAlign: "right", minWidth: 70, position: "relative" }}>
                <div style={{ fontSize: "1.1rem", fontWeight: 800, color: readinessColor, fontFamily: "'Space Grotesk',sans-serif" }}>{assignmentReadinessLabel(readinessState)}</div>
                <div style={{ fontSize: ".65rem", color: urgent ? RD : MU, position: "absolute", right: 0, top: 24, background: CD2, paddingLeft: 6 }}>{assignmentDueLine(assignment, urgent)}</div>
                {assignment.dueState !== "unknown" ? <div style={{ fontSize: ".65rem", color: urgent ? RD : MU }}>{assignmentDueCounter(assignment)}</div> : null}
              </div>
            </button>
          );
        })}
      </div>

      <div style={{ animation: "fadeUp .7s ease" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 14, marginBottom: 28 }}>
          {modules.map((module) => {
            const moduleConcepts = module.concepts.map((id) => visibleConceptById.get(id)).filter(Boolean) as ShellConcept[];
            const moduleAverage = moduleConcepts.length ? moduleConcepts.reduce((sum, concept) => sum + concept.mastery, 0) / moduleConcepts.length : 0;
            const allDone = moduleConcepts.every((concept) => visibleDone.has(concept.id));

            return (
              <button key={module.id} onClick={onOpenCourseware} style={{ ...card, padding: "22px 18px", textAlign: "center", cursor: "pointer", borderTop: `3px solid ${allDone ? GD : moduleAverage > 0.5 ? TL : moduleAverage > 0 ? CY : BD}`, transition: "all 250ms" }}>
                <div style={{ fontSize: allDone ? "1.3rem" : ".9rem", marginBottom: 8 }}>{allDone ? "🔥" : moduleAverage > 0.5 ? "⚡" : "📖"}</div>
                <div style={{ fontSize: ".72rem", fontWeight: 700, color: allDone ? GD : moduleAverage > 0.5 ? TL : CY, letterSpacing: ".08em", fontFamily: "'Space Grotesk',sans-serif" }}>{module.ch.replace("Chapters ", "Ch ").replace("Chapter ", "Ch ")}</div>
                <div style={{ fontSize: "1.3rem", fontWeight: 800, color: TX, margin: "6px 0", fontFamily: "'Space Grotesk',sans-serif" }}>{percent(moduleAverage)}</div>
                <div style={{ height: 4, borderRadius: 2, background: DM, overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 2, background: allDone ? GD : masteryColor(moduleAverage), width: percent(moduleAverage), transition: "width 600ms cubic-bezier(.22,1,.36,1)" }} />
                </div>
              </button>
            );
          })}
        </div>

        <div style={{ ...card, padding: "32px 36px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ ...ey, margin: 0, fontFamily: "'Space Grotesk',sans-serif" }}>CONCEPT MASTERY</div>
            <span style={{ fontSize: ".82rem", color: MU }}>{visibleDoneCount} completed · {visibleMastered} mastered</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {visibleConcepts.map((concept) => (
              <button key={concept.id} onClick={() => onOpenConcept(concept)} style={{ display: "flex", alignItems: "center", gap: 12, background: CD2, border: `1px solid ${BD}`, borderRadius: 14, padding: "14px 18px", cursor: "pointer", color: TX, fontSize: ".92rem", textAlign: "left", width: "100%", transition: "all 250ms" }}>
                <span style={{ fontSize: ".72rem", width: 16, textAlign: "center" }}>{memoryStageIcon(getMemoryStage(concept.id))}</span>
                <span style={{ flex: 1, fontWeight: 500 }}>{concept.name}</span>
                {visibleDone.has(concept.id) ? <span style={{ fontSize: ".85rem" }}>🔥</span> : null}
                <div style={{ width: 80, height: 5, borderRadius: 3, background: DM, overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 3, background: masteryColor(concept.mastery), width: percent(concept.mastery), transition: "width 600ms cubic-bezier(.22,1,.36,1)" }} />
                </div>
                <span style={{ color: masteryColor(concept.mastery), fontSize: ".82rem", fontWeight: 700, width: 40, textAlign: "right" }}>{concept.mastery > 0 ? percent(concept.mastery) : "—"}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
