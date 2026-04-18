import { useEffect, useState, type CSSProperties, type RefObject } from "react";
import {
  buildAtlasNodeInspector,
  formatAtlasSkillKindLabel,
  getChapterRewardStateLabel,
  type AssignmentReadinessState
} from "../lib/atlas-shell";
import type { MaterializedAtlasSkillNode, MaterializedAtlasSkillTree } from "../lib/atlas-skill-tree";
import type { ShellAssignment, ShellConcept, ShellModule } from "../lib/shell-mapper";

type AtlasJourneyTheme = {
  BD: string;
  CY: string;
  MU: string;
  T2: string;
  TL: string;
  GD: string;
  RD: string;
  DM: string;
  CD2: string;
  TX: string;
  innr: string;
  card: CSSProperties;
  ey: CSSProperties;
  heading: (size: number) => CSSProperties;
};

type AtlasJourneyPanelProps = {
  atlasSkillModel: MaterializedAtlasSkillTree | null;
  atlasSkillById: Map<string, MaterializedAtlasSkillNode>;
  assignmentReadinessById: Map<string, AssignmentReadinessState>;
  assignments: ShellAssignment[];
  concepts: ShellConcept[];
  modules: ShellModule[];
  mobileLayout: boolean;
  atlasLaneWidth: number;
  atlasScrollRef: RefObject<HTMLDivElement>;
  scrollAtlasLanes: (direction: number) => void;
  openReaderForChapter: (moduleId: string | null | undefined, sectionIndex: number) => void;
  goToCourseware: () => void;
  goToAssignment: (assignment: ShellAssignment) => void;
  goToGym: () => void;
  goToConcept: (concept: ShellConcept, destination: "forge" | "explore") => void;
  flash: (message: string, ok: boolean) => void;
  theme: AtlasJourneyTheme;
};

function previewList(values: string[], emptyLabel: string): string {
  return values.length > 0 ? values.join(" · ") : emptyLabel;
}

function readinessLabel(state: AssignmentReadinessState): string {
  if (state.status === "unmapped") {
    return "Needs mapping";
  }
  if (state.status === "concept-prep") {
    return "Concept prep";
  }
  return state.label;
}

function dueLabel(assignment: ShellAssignment): string {
  return assignment.dueState === "unknown" ? "Date not captured" : assignment.dueLabel;
}

function readinessSummary(status: AssignmentReadinessState["status"], missing: { label: string }[]): string {
  if (status === "unmapped") {
    return "Concept grounding still needs a skill chain.";
  }
  if (status === "concept-prep") {
    return "Concept grounding exists, but the checklist-backed skill chain is not complete yet.";
  }
  return missing.length ? `Missing ${missing.map((node) => node.label).join(" · ")}` : "Skill chain earned";
}

function humanizeStatusSummary(summary: string): string {
  return summary
    .replace("Atlas skill chain still needs deterministic evidence mapping.", "Concept grounding still needs a skill chain.")
    .replace("No assignment-specific skill chains were derived yet.", "No assignment-ready skill chains were derived yet.");
}

export function AtlasJourneyPanel({
  atlasSkillModel,
  atlasSkillById,
  assignmentReadinessById,
  assignments,
  concepts,
  modules,
  mobileLayout,
  atlasLaneWidth,
  atlasScrollRef,
  scrollAtlasLanes,
  openReaderForChapter,
  goToCourseware,
  goToAssignment,
  goToGym,
  goToConcept,
  flash,
  theme
}: AtlasJourneyPanelProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  useEffect(() => {
    if (!atlasSkillModel || atlasSkillModel.nodes.length === 0) {
      setSelectedNodeId(null);
      return;
    }
    if (selectedNodeId && atlasSkillById.has(selectedNodeId)) {
      return;
    }
    const preferredNode = atlasSkillModel.nodes.find((node) => node.state === "recovery")
      ?? atlasSkillModel.nodes.find((node) => node.state === "locked")
      ?? atlasSkillModel.nodes.find((node) => node.state === "available")
      ?? atlasSkillModel.nodes[0]
      ?? null;
    setSelectedNodeId(preferredNode?.id ?? null);
  }, [atlasSkillById, atlasSkillModel, selectedNodeId]);

  const rewardByModule = new Map((atlasSkillModel?.chapterRewards || []).map((reward) => [reward.moduleId, reward]));
  const assignmentsById = new Map(assignments.map((assignment) => [assignment.id, assignment]));
  const selectedInspector = selectedNodeId
    ? buildAtlasNodeInspector(selectedNodeId, atlasSkillModel, atlasSkillById)
    : null;
  const selectedInspectorStatusSummary = selectedInspector ? humanizeStatusSummary(selectedInspector.statusSummary) : null;
  const selectedNode = selectedInspector?.node ?? null;
  const selectedConcept = selectedNode
    ? selectedNode.conceptIds
      .map((conceptId) => concepts.find((concept) => concept.id === conceptId))
      .find((concept): concept is ShellConcept => Boolean(concept))
    : null;
  const selectedAssignment = selectedNode
    ? selectedNode.assignmentIds
      .map((assignmentId) => assignmentsById.get(assignmentId))
      .find((assignment): assignment is ShellAssignment => Boolean(assignment))
    : null;
  const selectedModule = selectedNode?.moduleId
    ? modules.find((module) => module.id === selectedNode.moduleId) ?? null
    : null;

  const skillStateColor = (state: MaterializedAtlasSkillNode["state"]) =>
    state === "mastered" ? theme.GD
      : state === "earned" ? theme.TL
        : state === "recovery" ? "#fb923c"
          : state === "in-progress" ? theme.CY
            : state === "available" ? "#7dd3fc"
              : theme.MU;
  const skillStateFill = (state: MaterializedAtlasSkillNode["state"]) =>
    state === "mastered" ? `linear-gradient(135deg,${theme.GD},#ff8c38)`
      : state === "earned" ? `linear-gradient(135deg,${theme.TL},#0cc08f)`
        : state === "recovery" ? "linear-gradient(135deg,#fb923c,#f97316)"
          : state === "in-progress" ? `linear-gradient(135deg,${theme.CY},#2f7bff)`
            : state === "available" ? "rgba(125,211,252,.12)"
              : theme.CD2;
  const skillIcon = (kind: MaterializedAtlasSkillNode["kind"], state: MaterializedAtlasSkillNode["state"]) =>
    kind === "mastery" ? "✦"
      : kind === "chapter-reward" ? "◆"
        : kind === "assignment-readiness" ? "⬢"
          : kind === "distinction" ? "⇄"
            : kind === "applied" ? "➜"
              : kind === "transfer" ? "↗"
                : state === "mastered" ? "✦" : "◉";

  const upcomingAssignments = assignments
    .map((assignment) => {
      const readinessState = assignmentReadinessById.get(assignment.id) ?? {
        assignmentId: assignment.id,
        requirement: null,
        requiredSkills: [],
        missingSkills: [],
        readiness: null,
        status: "unmapped",
        label: "Needs mapping",
        progressPercent: 0
      };
      return {
        assignment,
        readiness: readinessState.progressPercent,
        status: readinessState.status,
        label: readinessLabel(readinessState),
        missing: readinessState.missingSkills.slice(0, 2)
      };
    })
    .sort((left, right) => left.assignment.due - right.assignment.due)
    .slice(0, 4);
  const recoveryNodes = (atlasSkillModel?.nodes || []).filter((node) => node.state === "recovery").slice(0, 4);

  const handleNodeInspect = (node: MaterializedAtlasSkillNode): void => {
    setSelectedNodeId(node.id);
    if (node.missingPrerequisiteIds.length > 0) {
      const inspector = buildAtlasNodeInspector(node.id, atlasSkillModel, atlasSkillById);
      flash(humanizeStatusSummary(inspector?.statusSummary ?? "This skill is still locked."), false);
    }
  };

  const openSelectedNode = (): void => {
    if (!selectedNode) {
      return;
    }
    if (selectedInspector && selectedInspector.missingPrerequisites.length > 0) {
      const blocker = selectedInspector.missingPrerequisites[0];
      const blockerNode = atlasSkillById.get(blocker.id);
      const blockerConcept = blockerNode?.conceptIds
        .map((conceptId) => concepts.find((concept) => concept.id === conceptId))
        .find((concept): concept is ShellConcept => Boolean(concept));
      if (blockerConcept) {
        goToConcept(blockerConcept, "forge");
        return;
      }
      if (blockerNode?.moduleId) {
        openReaderForChapter(blockerNode.moduleId, 0);
      }
      return;
    }
    if (selectedNode.kind === "assignment-readiness" && selectedAssignment) {
      goToAssignment(selectedAssignment);
      return;
    }
    if (selectedNode.kind === "distinction") {
      goToGym();
      return;
    }
    if (selectedConcept) {
      goToConcept(selectedConcept, ["earned", "mastered"].includes(selectedNode.state) ? "explore" : "forge");
      return;
    }
    if (selectedNode.moduleId) {
      openReaderForChapter(selectedNode.moduleId, 0);
    }
  };

  const primaryActionLabel = selectedInspector?.missingPrerequisites.length
    ? `Train ${selectedInspector.missingPrerequisites[0]?.label ?? "blocking skill"}`
    : selectedNode?.kind === "assignment-readiness" && selectedAssignment
      ? "Open assignment"
      : selectedNode?.kind === "distinction"
        ? "Open contrast gym"
        : selectedConcept
          ? ["earned", "mastered"].includes(selectedNode?.state ?? "") ? "Explore concept" : "Practice concept"
          : selectedModule
            ? "Read chapter"
            : "Open skill";

  return (
    <div style={{ marginLeft: mobileLayout ? 0 : -44, marginRight: mobileLayout ? 0 : -44, marginTop: mobileLayout ? -24 : -48 }}>
      <div style={{ padding: mobileLayout ? "20px 16px" : "28px 48px", background: "rgba(8,8,20,.88)", borderBottom: `1px solid ${theme.BD}`, display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 68, zIndex: 40, backdropFilter: "blur(16px)", gap: 24, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ ...theme.heading(1.5), marginBottom: 4 }}>Atlas Skill Tree</h2>
          <p style={{ color: theme.MU, fontSize: ".88rem", maxWidth: 620 }}>Chapters now pay out skills, assignments consume those skills, and weak skills reopen as recovery loops instead of hiding behind module averages.</p>
        </div>
        <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
          {[["Locked", atlasSkillModel?.summary.locked || 0, theme.RD], ["Available", atlasSkillModel?.summary.available || 0, "#7dd3fc"], ["In Flight", atlasSkillModel?.summary.inProgress || 0, theme.CY], ["Recovery", atlasSkillModel?.summary.recovery || 0, "#fb923c"], ["Earned", atlasSkillModel?.summary.earned || 0, theme.TL], ["Mastered", atlasSkillModel?.summary.mastered || 0, theme.GD]].map(([label, count, color]) => (
            <div key={String(label)} style={{ padding: "10px 14px", borderRadius: 14, background: "rgba(12,16,30,.78)", border: `1px solid ${theme.BD}` }}>
              <div style={{ fontSize: ".68rem", letterSpacing: ".14em", textTransform: "uppercase", color: String(color), marginBottom: 4, fontFamily: "'Space Grotesk',sans-serif" }}>{label}</div>
              <div style={{ fontSize: "1.05rem", fontWeight: 800, color: theme.TX, fontFamily: "'Space Grotesk',sans-serif" }}>{count}</div>
            </div>
          ))}
          <button onClick={goToCourseware} style={{ padding: "10px 18px", borderRadius: 12, border: `1px solid ${theme.BD}`, background: "transparent", color: theme.MU, fontSize: ".82rem", fontWeight: 600, cursor: "pointer" }}>📚 Library</button>
        </div>
      </div>
      <div style={{ padding: mobileLayout ? "24px 16px 20px" : "30px 48px 24px", display: "grid", gridTemplateColumns: mobileLayout ? "1fr" : "1.3fr .9fr", gap: 18 }}>
        <div style={{ ...theme.card, padding: "24px 28px", background: "linear-gradient(135deg,rgba(0,240,255,.08),rgba(3,8,18,.88))" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
            <div>
              <div style={theme.ey}>Progression Story</div>
              <h3 style={theme.heading(1.18)}>Read → Forge → Distinguish → Apply → Master</h3>
            </div>
            <div style={{ minWidth: 220 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".82rem", color: theme.MU, marginBottom: 8 }}><span>Overall command</span><span>{Math.round(((atlasSkillModel?.nodes || []).reduce((sum, node) => sum + node.progress, 0) / Math.max((atlasSkillModel?.nodes || []).length, 1)) * 100)}%</span></div>
              <div style={{ height: 8, borderRadius: 999, background: theme.DM, overflow: "hidden" }}><div style={{ height: "100%", width: `${Math.round(((atlasSkillModel?.nodes || []).reduce((sum, node) => sum + node.progress, 0) / Math.max((atlasSkillModel?.nodes || []).length, 1)) * 100)}%`, background: `linear-gradient(90deg,${theme.CY},${theme.TL},${theme.GD})`, borderRadius: 999 }} /></div>
            </div>
          </div>
        </div>
        <div style={{ ...theme.card, padding: "24px 28px" }}>
          <div style={theme.ey}>Assignment Readiness</div>
          <div style={{ display: "grid", gap: 10 }}>
            {upcomingAssignments.length ? upcomingAssignments.map(({ assignment, readiness, status, label, missing }) => {
              const readinessColor = status === "unmapped" ? theme.MU : status === "concept-prep" ? theme.CY : readiness >= 100 ? theme.TL : readiness > 60 ? theme.CY : "#fb923c";
              const dueUrgent = assignment.dueState === "today"
                || assignment.dueState === "overdue"
                || (assignment.dueState === "upcoming" && assignment.due <= 3);
              return (
                <button key={assignment.id} onClick={() => goToAssignment(assignment)} style={{ padding: "16px 18px", borderRadius: 16, background: theme.innr, border: `1px solid ${dueUrgent ? `${theme.RD}33` : theme.BD}`, cursor: "pointer", textAlign: "left", color: theme.TX }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                    <div>
                      <div style={{ fontSize: ".92rem", fontWeight: 700 }}>{assignment.title}</div>
                      <div style={{ fontSize: ".76rem", color: theme.MU, marginTop: 4 }}>{readinessSummary(status, missing)}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "1rem", fontWeight: 800, color: readinessColor, fontFamily: "'Space Grotesk',sans-serif" }}>{label}</div>
                      <div style={{ fontSize: ".68rem", color: dueUrgent ? theme.RD : theme.MU }}>{dueLabel(assignment)}</div>
                    </div>
                  </div>
                  {status === "unmapped"
                    ? <div style={{ height: 4, borderRadius: 999, background: theme.DM, opacity: .55, marginTop: 10 }} />
                    : <div style={{ height: 4, borderRadius: 999, background: theme.DM, overflow: "hidden", marginTop: 10 }}><div style={{ height: "100%", width: `${readiness}%`, background: readinessColor, borderRadius: 999 }} /></div>}
                </button>
              );
            }) : <div style={{ color: theme.MU, fontSize: ".88rem" }}>No assignment-ready skill chains were derived yet.</div>}
          </div>
        </div>
      </div>
      {recoveryNodes.length > 0 && <div style={{ padding: mobileLayout ? "0 16px 20px" : "0 48px 24px" }}><div style={{ ...theme.card, padding: "22px 24px", border: "1px solid #fb923c33", background: "linear-gradient(135deg,rgba(251,146,60,.08),rgba(10,12,22,.9))" }}><div style={{ ...theme.ey, color: "#fb923c" }}>Recovery Loop</div><div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>{recoveryNodes.map((node) => <button key={node.id} onClick={() => handleNodeInspect(node)} style={{ padding: "12px 16px", borderRadius: 14, border: "1px solid rgba(251,146,60,.24)", background: "rgba(251,146,60,.08)", color: theme.TX, cursor: "pointer", textAlign: "left" }}><div style={{ fontSize: ".82rem", fontWeight: 700, color: "#fb923c" }}>{node.label}</div><div style={{ fontSize: ".76rem", color: theme.T2, marginTop: 4 }}>{Math.round(node.progress * 100)}% command retained · reopen before the next assignment leans on it.</div></button>)}</div></div></div>}
      {selectedInspector && <div style={{ padding: mobileLayout ? "0 16px 18px" : "0 48px 20px" }}>
        <div style={{ ...theme.card, padding: mobileLayout ? "22px 20px" : "24px 26px", border: `1px solid ${skillStateColor(selectedNode?.state ?? "locked")}22`, background: `linear-gradient(135deg,${skillStateColor(selectedNode?.state ?? "locked")}12,rgba(8,12,24,.92))` }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 18, alignItems: "flex-start", flexWrap: "wrap" }}>
            <div style={{ maxWidth: 640 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(6,10,20,.42)", border: `1px solid ${skillStateColor(selectedNode?.state ?? "locked")}33`, color: skillStateColor(selectedNode?.state ?? "locked"), fontSize: "1rem", fontWeight: 700 }}>{skillIcon(selectedNode?.kind ?? "foundational", selectedNode?.state ?? "locked")}</div>
                <div>
                  <div style={{ fontSize: ".68rem", fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: skillStateColor(selectedNode?.state ?? "locked"), fontFamily: "'Space Grotesk',sans-serif" }}>{formatAtlasSkillKindLabel(selectedNode?.kind ?? "foundational")} · {selectedNode?.state}</div>
                  <div style={{ fontSize: "1.08rem", fontWeight: 800, color: theme.TX }}>{selectedNode?.label}</div>
                </div>
              </div>
              <p style={{ fontSize: ".92rem", lineHeight: 1.7, color: theme.T2, margin: "0 0 12px" }}>{selectedNode?.summary}</p>
              <div style={{ fontSize: ".84rem", color: theme.MU, marginBottom: 14 }}>{selectedInspectorStatusSummary}</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button onClick={openSelectedNode} style={{ padding: "10px 16px", borderRadius: 12, border: "none", background: `linear-gradient(135deg,${skillStateColor(selectedNode?.state ?? "locked")},${theme.CY})`, color: "#02040c", fontWeight: 700, cursor: "pointer" }}>{primaryActionLabel}</button>
                {selectedModule && <button onClick={() => openReaderForChapter(selectedModule.id, 0)} style={{ padding: "10px 16px", borderRadius: 12, border: `1px solid ${theme.BD}`, background: "transparent", color: theme.MU, fontWeight: 600, cursor: "pointer" }}>Open chapter</button>}
              </div>
            </div>
            <div style={{ minWidth: mobileLayout ? 0 : 220, flex: mobileLayout ? "1 1 100%" : "0 0 220px" }}>
              <div style={{ fontSize: ".72rem", fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: skillStateColor(selectedNode?.state ?? "locked"), marginBottom: 8, fontFamily: "'Space Grotesk',sans-serif" }}>Dependency inspector</div>
              <div style={{ fontSize: ".82rem", color: theme.MU, lineHeight: 1.6 }}>{selectedInspector.crossLaneDependencies.length > 0 ? previewList(selectedInspector.crossLaneDependencies.map((dependency) => dependency.label), "No cross-lane edges") : "No cross-lane edges"}</div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: mobileLayout ? "1fr" : "1fr 1fr 1fr", gap: 14, marginTop: 20 }}>
            <div style={{ padding: "16px 18px", borderRadius: 16, background: "rgba(6,10,20,.32)", border: `1px solid ${theme.BD}` }}>
              <div style={{ ...theme.ey, marginBottom: 10, color: selectedInspector.missingPrerequisites.length ? theme.RD : theme.MU }}>Prerequisites</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {selectedInspector.prerequisites.length > 0 ? selectedInspector.prerequisites.map((dependency) => (
                  <span key={dependency.id} style={{ padding: "6px 10px", borderRadius: 999, border: `1px solid ${dependency.missing ? `${theme.RD}33` : theme.BD}`, fontSize: ".74rem", color: dependency.missing ? theme.RD : theme.T2, background: dependency.missing ? "rgba(255,68,102,.08)" : "rgba(255,255,255,.02)" }}>{dependency.label}</span>
                )) : <span style={{ fontSize: ".82rem", color: theme.MU }}>No prerequisites.</span>}
              </div>
            </div>
            <div style={{ padding: "16px 18px", borderRadius: 16, background: "rgba(6,10,20,.32)", border: `1px solid ${theme.BD}` }}>
              <div style={{ ...theme.ey, marginBottom: 10 }}>Unlocks</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {selectedInspector.unlocks.length > 0 ? selectedInspector.unlocks.map((dependency) => (
                  <span key={dependency.id} style={{ padding: "6px 10px", borderRadius: 999, border: `1px solid ${theme.BD}`, fontSize: ".74rem", color: theme.T2, background: "rgba(255,255,255,.02)" }}>{dependency.label}</span>
                )) : <span style={{ fontSize: ".82rem", color: theme.MU }}>No downstream unlocks yet.</span>}
              </div>
            </div>
            <div style={{ padding: "16px 18px", borderRadius: 16, background: "rgba(6,10,20,.32)", border: `1px solid ${theme.BD}` }}>
              <div style={{ ...theme.ey, marginBottom: 10 }}>Cross-lane edges</div>
              <div style={{ display: "grid", gap: 8 }}>
                {selectedInspector.crossLaneDependencies.length > 0 ? selectedInspector.crossLaneDependencies.map((dependency) => (
                  <div key={dependency.id} style={{ fontSize: ".8rem", color: theme.T2 }}>
                    <span style={{ color: theme.TX, fontWeight: 700 }}>{dependency.label}</span>
                    <span style={{ color: theme.MU }}> · {formatAtlasSkillKindLabel(dependency.kind)} · {dependency.state}</span>
                  </div>
                )) : <span style={{ fontSize: ".82rem", color: theme.MU }}>This skill stays inside its current lane.</span>}
              </div>
            </div>
          </div>
        </div>
      </div>}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: mobileLayout ? "0 16px 14px" : "0 48px 16px", flexWrap: "wrap" }}>
        <div style={{ fontSize: ".78rem", color: theme.MU }}>Use Left/Right arrow keys or the lane controls to move through the Atlas.</div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => scrollAtlasLanes(-1)} style={{ padding: "10px 14px", borderRadius: 12, border: `1px solid ${theme.BD}`, background: "transparent", color: theme.MU, fontSize: ".78rem", fontWeight: 600, cursor: "pointer" }}>← Prev lane</button>
          <button onClick={() => scrollAtlasLanes(1)} style={{ padding: "10px 14px", borderRadius: 12, border: `1px solid ${theme.BD}`, background: "transparent", color: theme.MU, fontSize: ".78rem", fontWeight: 600, cursor: "pointer" }}>Next lane →</button>
        </div>
      </div>
      <div ref={atlasScrollRef} tabIndex={0} aria-label="Atlas skill lanes" onKeyDown={(event) => { if (event.key === "ArrowLeft") { event.preventDefault(); scrollAtlasLanes(-1); } if (event.key === "ArrowRight") { event.preventDefault(); scrollAtlasLanes(1); } }} style={{ overflowX: "auto", overflowY: "hidden", padding: mobileLayout ? "0 16px 64px" : "0 48px 80px", scrollbarWidth: "thin", scrollbarColor: `${theme.BD} transparent` }}>
        <div style={{ display: "flex", gap: 24, minWidth: "max-content", alignItems: "flex-start" }}>
          {(atlasSkillModel?.groups || []).map((group, groupIndex) => {
            const reward = rewardByModule.get(group.moduleId || "");
            const module = modules.find((entry) => entry.id === group.moduleId);
            const groupNodes = group.skillIds.map((id) => atlasSkillById.get(id)).filter((node): node is MaterializedAtlasSkillNode => Boolean(node));
            const masteryNode = group.moduleId ? atlasSkillById.get(`skill-mastery-${group.moduleId}`) : null;
            const rewardState = getChapterRewardStateLabel(masteryNode);
            return (
              <div key={group.id} style={{ width: atlasLaneWidth, flexShrink: 0, position: "relative", paddingTop: mobileLayout ? 0 : groupIndex * 24 }}>
                {groupIndex > 0 && <div style={{ position: "absolute", left: -18, top: 46, width: 18, height: 2, background: `linear-gradient(90deg,${theme.MU}00,${theme.BD})` }} />}
                <div style={{ ...theme.card, padding: "24px 24px 22px", marginBottom: 16, borderTop: `3px solid ${groupNodes.some((node) => node.state === "mastered") ? theme.GD : groupNodes.some((node) => node.state === "earned") ? theme.TL : theme.CY}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
                    <div>
                      <div style={theme.ey}>{module?.pages || "Skill Lane"}</div>
                      <h3 style={theme.heading(1.1)}>{group.title}</h3>
                    </div>
                    <button onClick={() => openReaderForChapter(group.moduleId, 0)} style={{ padding: "8px 12px", borderRadius: 10, border: `1px solid ${theme.CY}24`, background: `${theme.CY}0a`, color: theme.CY, fontSize: ".76rem", fontWeight: 700, cursor: "pointer" }}>Read →</button>
                  </div>
                  <p style={{ fontSize: ".88rem", color: theme.T2, lineHeight: 1.65, margin: "10px 0 0" }}>{group.summary}</p>
                </div>
                {reward && <div style={{ padding: "16px 18px", borderRadius: 18, background: "rgba(255,215,0,.05)", border: `1px solid ${theme.GD}22`, marginBottom: 16 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 8 }}><div style={{ fontSize: ".72rem", fontWeight: 700, letterSpacing: ".14em", color: theme.GD, fontFamily: "'Space Grotesk',sans-serif" }}>CHAPTER REWARD</div><span style={{ padding: "4px 10px", borderRadius: 999, border: `1px solid ${rewardState === "Mastered" ? `${theme.GD}33` : rewardState === "Earned" ? `${theme.TL}33` : `${theme.BD}`}`, fontSize: ".68rem", fontWeight: 700, color: rewardState === "Mastered" ? theme.GD : rewardState === "Earned" ? theme.TL : theme.MU, background: "rgba(6,10,20,.24)" }}>{rewardState}</span></div><div style={{ fontSize: ".95rem", fontWeight: 700, color: theme.TX, marginBottom: 6 }}>{reward.title}</div><p style={{ fontSize: ".82rem", color: theme.T2, lineHeight: 1.55, margin: 0 }}>{reward.summary}</p></div>}
                <div style={{ display: "grid", gap: 14 }}>
                  {groupNodes.map((node, nodeIndex) => {
                    const assignment = node.assignmentIds.map((id) => assignmentsById.get(id)).find((entry): entry is ShellAssignment => Boolean(entry));
                    const nodeInspector = buildAtlasNodeInspector(node.id, atlasSkillModel, atlasSkillById);
                    const missingLabels = nodeInspector?.missingPrerequisites.map((dependency) => dependency.label).slice(0, 2) ?? [];
                    const isSelected = node.id === selectedNodeId;
                    return (
                      <button key={node.id} onClick={() => handleNodeInspect(node)} style={{ position: "relative", padding: "20px 20px 18px", borderRadius: 20, background: skillStateFill(node.state), border: `1px solid ${isSelected ? skillStateColor(node.state) : `${skillStateColor(node.state)}28`}`, boxShadow: isSelected ? `0 0 0 1px ${skillStateColor(node.state)} inset, 0 0 26px ${skillStateColor(node.state)}22` : node.state === "mastered" ? `0 0 24px ${theme.GD}18` : "none", color: theme.TX, textAlign: "left", cursor: "pointer", overflow: "hidden" }}>
                        {nodeIndex < groupNodes.length - 1 && <div style={{ position: "absolute", left: 28, top: "100%", width: 2, height: 18, background: `linear-gradient(180deg,${skillStateColor(node.state)},${theme.BD})`, opacity: .55 }} />}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
                          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                            <div style={{ width: 42, height: 42, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(6,10,20,.4)", border: `1px solid ${skillStateColor(node.state)}33`, fontSize: "1.05rem", fontWeight: 700, color: skillStateColor(node.state) }}>{skillIcon(node.kind, node.state)}</div>
                            <div>
                              <div style={{ fontSize: ".68rem", fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: skillStateColor(node.state), fontFamily: "'Space Grotesk',sans-serif" }}>{formatAtlasSkillKindLabel(node.kind)}</div>
                              <div style={{ fontSize: "1rem", fontWeight: 700, marginTop: 6 }}>{node.label}</div>
                            </div>
                          </div>
                          <div style={{ textAlign: "right" }}><div style={{ fontSize: ".92rem", fontWeight: 800, color: skillStateColor(node.state), fontFamily: "'Space Grotesk',sans-serif" }}>{Math.round(node.progress * 100)}%</div><div style={{ fontSize: ".68rem", color: theme.MU, marginTop: 2 }}>{node.state}</div></div>
                        </div>
                        <p style={{ fontSize: ".84rem", lineHeight: 1.62, color: theme.T2, margin: "14px 0 12px" }}>{node.summary}</p>
                        <div style={{ height: 4, borderRadius: 999, background: theme.DM, overflow: "hidden", marginBottom: 12 }}><div style={{ height: "100%", width: `${Math.round(node.progress * 100)}%`, background: skillStateColor(node.state), borderRadius: 999 }} /></div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                          {assignment && <span style={{ padding: "6px 10px", borderRadius: 999, border: `1px solid ${theme.BD}`, fontSize: ".72rem", color: theme.MU, background: "rgba(6,10,20,.32)" }}>Assignment: {assignment.title}</span>}
                          {node.rewardLabel && <span style={{ padding: "6px 10px", borderRadius: 999, border: `1px solid ${theme.BD}`, fontSize: ".72rem", color: theme.MU, background: "rgba(6,10,20,.32)" }}>{node.rewardLabel}</span>}
                          {missingLabels.map((label) => <span key={`${node.id}:${label}`} style={{ padding: "6px 10px", borderRadius: 999, border: `1px solid ${theme.RD}22`, fontSize: ".72rem", color: theme.RD, background: "rgba(255,68,102,.08)" }}>Requires {label}</span>)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {(!atlasSkillModel || atlasSkillModel.nodes.length === 0) && <div style={{ textAlign: "center", padding: "20px 48px 40px" }}><p style={{ fontSize: "1rem", color: theme.MU }}>Atlas needs stronger chapter and assignment signals before it can derive a skill graph for this bundle.</p><button onClick={goToCourseware} style={{ padding: "14px 24px", borderRadius: 16, border: "none", background: `linear-gradient(135deg,${theme.CY},#0080ff)`, color: "#02040c", fontWeight: 700, cursor: "pointer", marginTop: 12 }}>Back to library</button></div>}
    </div>
  );
}
