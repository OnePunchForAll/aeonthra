import type { ShellConcept } from "../lib/shell-mapper";

type ShellConceptWithMastery = ShellConcept & {
  mastery?: number;
};

type CompareConceptsPanelProps = {
  concepts: ShellConceptWithMastery[];
  selectedA: ShellConceptWithMastery | null;
  selectedB: ShellConceptWithMastery | null;
  onSelectA: (concept: ShellConceptWithMastery | null) => void;
  onSelectB: (concept: ShellConceptWithMastery | null) => void;
};

function masteryColor(mastery: number): string {
  if (mastery >= 0.8) return "#f4c94f";
  if (mastery >= 0.5) return "#11d9b5";
  if (mastery >= 0.2) return "#53b6ff";
  return "#8692b9";
}

function detailSection(label: string, value: string, accent: string) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ fontSize: ".74rem", fontWeight: 700, letterSpacing: ".12em", color: accent, textTransform: "uppercase", marginBottom: 8 }}>{label}</div>
      <p style={{ fontSize: ".98rem", color: "#d4ddf6", lineHeight: 1.8, margin: 0 }}>{value || "No grounded detail recorded."}</p>
    </div>
  );
}

function masteryValue(concept: ShellConceptWithMastery): number {
  return concept.mastery ?? 0;
}

export function CompareConceptsPanel({
  concepts,
  selectedA,
  selectedB,
  onSelectA,
  onSelectB
}: CompareConceptsPanelProps) {
  return (
    <div style={{ maxWidth: 1020, margin: "0 auto" }}>
      <h2 style={{ fontSize: "1.7rem", fontWeight: 800, color: "#eef1ff", marginBottom: 10 }}>Compare Concepts</h2>
      <p style={{ color: "#98a5d1", fontSize: "1rem", margin: "10px 0 32px", lineHeight: 1.7 }}>
        Inspect two concepts side by side, compare their boundaries, and keep the distinctions explicit.
      </p>
      <div style={{ display: "flex", gap: 18, marginBottom: 36, flexWrap: "wrap" }}>
        <select value={selectedA?.id || ""} onChange={(event) => onSelectA(concepts.find((concept) => concept.id === event.target.value) ?? null)} style={{ flex: 1, minWidth: 240, padding: "16px 20px", borderRadius: 16, border: "1px solid rgba(120,143,199,0.18)", background: "rgba(11,16,28,0.94)", color: "#eef1ff", fontSize: "1rem" }}>
          <option value="">Concept A</option>
          {concepts.map((concept) => <option key={concept.id} value={concept.id}>{concept.name}</option>)}
        </select>
        <select value={selectedB?.id || ""} onChange={(event) => onSelectB(concepts.find((concept) => concept.id === event.target.value) ?? null)} style={{ flex: 1, minWidth: 240, padding: "16px 20px", borderRadius: 16, border: "1px solid rgba(120,143,199,0.18)", background: "rgba(11,16,28,0.94)", color: "#eef1ff", fontSize: "1rem" }}>
          <option value="">Concept B</option>
          {concepts.map((concept) => <option key={concept.id} value={concept.id}>{concept.name}</option>)}
        </select>
      </div>
      {selectedA && selectedB && selectedA.id !== selectedB.id ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24 }}>
          {[selectedA, selectedB].map((concept) => {
            const mastery = masteryValue(concept);
            return (
            <div key={concept.id} style={{ background: "rgba(9,12,22,0.94)", border: "1px solid rgba(120,143,199,0.18)", borderTop: `4px solid ${masteryColor(mastery)}`, borderRadius: 24, boxShadow: "0 24px 64px rgba(0,0,0,0.35)", padding: "28px 30px" }}>
              <div style={{ fontSize: ".74rem", fontWeight: 700, letterSpacing: ".12em", color: masteryColor(mastery), textTransform: "uppercase", marginBottom: 10 }}>{concept.cat}</div>
              <h3 style={{ fontSize: "1.35rem", fontWeight: 800, color: "#eef1ff", marginBottom: 8 }}>{concept.name}</h3>
              <div style={{ color: masteryColor(mastery), fontSize: ".88rem", fontWeight: 700, marginBottom: 22 }}>{Math.round(mastery * 100)}% mastery</div>
              {detailSection("Core", concept.core, "#53b6ff")}
              {detailSection("Key Distinction", concept.dist, "#c9a7ff")}
              {detailSection("Memory Hook", concept.hook, "#11d9b5")}
            </div>
          );})}
        </div>
      ) : (
        <div style={{ background: "rgba(9,12,22,0.94)", border: "1px solid rgba(120,143,199,0.18)", borderRadius: 24, boxShadow: "0 24px 64px rgba(0,0,0,0.35)", padding: "44px 28px", textAlign: "center" }}>
          <div style={{ fontSize: "2rem", marginBottom: 16 }}>⇄</div>
          <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#eef1ff", marginBottom: 8 }}>Select two concepts to compare</h3>
          <p style={{ fontSize: ".98rem", color: "#98a5d1", margin: 0 }}>Choose one concept for each side and the contrast view will appear here.</p>
        </div>
      )}
    </div>
  );
}
