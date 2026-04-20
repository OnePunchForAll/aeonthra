import type { ShellConcept } from "../lib/shell-mapper";

type ShellConceptWithMastery = ShellConcept & {
  mastery?: number;
};

type ShellStatsPanelProps = {
  concepts: ShellConceptWithMastery[];
  masteredCount: number;
  totalConceptCount: number;
  averageMastery: number;
  totalAnswered: number;
  totalCorrect: number;
  memoryStageIcon: (conceptId: string) => string;
};

function masteryColor(mastery: number): string {
  if (mastery >= 0.8) return "#f4c94f";
  if (mastery >= 0.5) return "#11d9b5";
  if (mastery >= 0.2) return "#53b6ff";
  return "#8692b9";
}

function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function masteryValue(concept: ShellConceptWithMastery): number {
  return concept.mastery ?? 0;
}

export function ShellStatsPanel({
  concepts,
  masteredCount,
  totalConceptCount,
  averageMastery,
  totalAnswered,
  totalCorrect,
  memoryStageIcon
}: ShellStatsPanelProps) {
  return (
    <div style={{ maxWidth: 760, margin: "0 auto" }}>
      <div style={{ background: "rgba(9,12,22,0.94)", border: "1px solid rgba(120,143,199,0.18)", borderRadius: 24, boxShadow: "0 24px 64px rgba(0,0,0,0.35)", padding: "28px 30px" }}>
        <div style={{ fontSize: ".72rem", fontWeight: 700, letterSpacing: ".12em", color: "#53b6ff", textTransform: "uppercase", marginBottom: 18 }}>Performance</div>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div><div style={{ fontSize: "2rem", fontWeight: 800, color: "#53b6ff" }}>{masteredCount}/{totalConceptCount}</div><div style={{ color: "#98a5d1", fontSize: ".82rem" }}>Mastered</div></div>
          <div><div style={{ fontSize: "2rem", fontWeight: 800, color: "#11d9b5" }}>{percent(averageMastery)}</div><div style={{ color: "#98a5d1", fontSize: ".82rem" }}>Average</div></div>
          <div><div style={{ fontSize: "2rem", fontWeight: 800, color: "#f4c94f" }}>{totalAnswered > 0 ? `${totalCorrect}/${totalAnswered}` : "—"}</div><div style={{ color: "#98a5d1", fontSize: ".82rem" }}>Correct</div></div>
        </div>
      </div>
      {concepts.map((concept) => {
        const mastery = masteryValue(concept);
        return (
        <div key={concept.id} style={{ background: "rgba(9,12,22,0.94)", border: "1px solid rgba(120,143,199,0.18)", borderRadius: 18, boxShadow: "0 20px 54px rgba(0,0,0,0.28)", padding: "16px 20px", marginTop: 10, display: "flex", alignItems: "center", gap: 12 }}>
          <span>{memoryStageIcon(concept.id)}</span>
          <span style={{ flex: 1, fontWeight: 600, color: "#eef1ff" }}>{concept.name}</span>
          <span style={{ color: masteryColor(mastery), fontWeight: 700 }}>{percent(mastery)}</span>
        </div>
      );})}
    </div>
  );
}
