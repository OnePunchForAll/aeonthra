import type { ReactElement, ReactNode } from "react";
import type { WorkspaceDiagnostics } from "../lib/canonical-diagnostics";

type CanonicalArtifactInspectorProps = {
  diagnostics: WorkspaceDiagnostics;
  onDownloadCanonicalArtifact: () => void;
  onDownloadDiagnostics: () => void;
  onDownloadOfflineSite: () => void;
  onSaveReplayBundle: () => void;
};

function panel(title: string, body: ReactNode, accent: string): ReactElement {
  return (
    <section
      style={{
        background: "rgba(9,12,22,0.94)",
        border: "1px solid rgba(120,143,199,0.18)",
        borderTop: `3px solid ${accent}`,
        borderRadius: 24,
        boxShadow: "0 24px 64px rgba(0,0,0,0.35)",
        padding: "24px 26px"
      }}
    >
      <div
        style={{
          fontSize: ".72rem",
          fontWeight: 700,
          letterSpacing: ".14em",
          color: accent,
          marginBottom: 14,
          textTransform: "uppercase"
        }}
      >
        {title}
      </div>
      {body}
    </section>
  );
}

function statCard(label: string, value: string | number, accent: string): ReactElement {
  return (
    <div
      style={{
        padding: "14px 16px",
        borderRadius: 16,
        background: "rgba(7,10,18,0.78)",
        border: "1px solid rgba(120,143,199,0.18)"
      }}
    >
      <div style={{ fontSize: ".72rem", color: "#8b97be", textTransform: "uppercase", letterSpacing: ".1em" }}>{label}</div>
      <div style={{ fontSize: "1.02rem", fontWeight: 800, color: accent, marginTop: 6, overflowWrap: "anywhere" }}>{value}</div>
    </div>
  );
}

export function CanonicalArtifactInspector({
  diagnostics,
  onDownloadCanonicalArtifact,
  onDownloadDiagnostics,
  onDownloadOfflineSite,
  onSaveReplayBundle
}: CanonicalArtifactInspectorProps) {
  return (
    <div style={{ maxWidth: 1160, margin: "0 auto", display: "grid", gap: 22 }}>
      <div style={{ textAlign: "center", marginBottom: 6 }}>
        <h2 style={{ fontSize: "1.9rem", fontWeight: 800, color: "#eef1ff", marginBottom: 10 }}>Inspect The Truth Boundary</h2>
        <p style={{ color: "#98a5d1", fontSize: "1rem", lineHeight: 1.7, maxWidth: 760, margin: "0 auto" }}>
          Inspect the canonical artifact, hashes, provenance lanes, and capture strategy directly. Export the same evidence as JSON without regenerating anything.
        </p>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
        <button onClick={onDownloadCanonicalArtifact} style={{ padding: "12px 20px", borderRadius: 14, border: "none", background: "linear-gradient(135deg,#00d1c7,#53b6ff)", color: "#06111a", fontWeight: 800, cursor: "pointer" }}>Export Canonical JSON</button>
        <button onClick={onDownloadDiagnostics} style={{ padding: "12px 20px", borderRadius: 14, border: "1px solid rgba(120,143,199,0.18)", background: "rgba(9,12,22,0.94)", color: "#dfe7ff", fontWeight: 700, cursor: "pointer" }}>Export Diagnostics JSON</button>
        <button onClick={onDownloadOfflineSite} style={{ padding: "12px 20px", borderRadius: 14, border: "1px solid rgba(120,143,199,0.18)", background: "rgba(9,12,22,0.94)", color: "#dfe7ff", fontWeight: 700, cursor: "pointer" }}>Download Offline Site</button>
        <button onClick={onSaveReplayBundle} style={{ padding: "12px 20px", borderRadius: 14, border: "1px solid rgba(120,143,199,0.18)", background: "rgba(9,12,22,0.94)", color: "#dfe7ff", fontWeight: 700, cursor: "pointer" }}>Save Replay Bundle</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
        {statCard("Status", diagnostics.status === "complete" ? "Complete" : "Partial", diagnostics.status === "complete" ? "#11d9b5" : "#ffbf66")}
        {statCard("Source Items", diagnostics.canonicalArtifact?.sourceItemCount ?? diagnostics.captureSummary.itemCount, "#00d1c7")}
        {statCard("Semantic Units", diagnostics.canonicalArtifact?.semanticUnitCount ?? 0, "#53b6ff")}
        {statCard("Structural Units", diagnostics.canonicalArtifact?.structuralUnitCount ?? 0, "#d6b5ff")}
        {statCard("Explicit Provenance", `${diagnostics.provenanceCoverage.percent}%`, "#11d9b5")}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 22 }}>
        {panel(
          "Canonical Hashes",
          <div style={{ display: "grid", gap: 12 }}>
            {statCard("Semantic Hash", diagnostics.hashes.semantic || "Unavailable", "#00d1c7")}
            {statCard("Structural Hash", diagnostics.hashes.structural || "Unavailable", "#53b6ff")}
            {statCard("Provenance Hash", diagnostics.hashes.provenance || "Unavailable", "#d6b5ff")}
            {statCard("Synthesis Hash", diagnostics.hashes.synthesis || "Unavailable", "#ffbf66")}
          </div>,
          "#00d1c7"
        )}

        {panel(
          "Capture Summary",
          <div style={{ display: "grid", gap: 12 }}>
            <p style={{ color: "#98a5d1", margin: 0, lineHeight: 1.7 }}>
              Source: <strong style={{ color: "#eef1ff" }}>{diagnostics.bundleSource}</strong><br />
              Course: <strong style={{ color: "#eef1ff" }}>{diagnostics.captureSummary.courseName || diagnostics.bundleTitle}</strong><br />
              Host: <strong style={{ color: "#eef1ff" }}>{diagnostics.captureSummary.sourceHost || "not recorded"}</strong>
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
              {statCard("Items", diagnostics.captureSummary.itemCount, "#eef1ff")}
              {statCard("Resources", diagnostics.captureSummary.resourceCount, "#eef1ff")}
              {statCard("Warnings", diagnostics.captureSummary.warningCount, diagnostics.captureSummary.warningCount > 0 ? "#ffbf66" : "#eef1ff")}
              {statCard("Failed", diagnostics.captureSummary.failedCount, diagnostics.captureSummary.failedCount > 0 ? "#ff7a96" : "#eef1ff")}
            </div>
            {diagnostics.partialReasons.length > 0 ? (
              <div style={{ padding: "14px 16px", borderRadius: 14, background: "rgba(255,191,102,0.08)", border: "1px solid rgba(255,191,102,0.18)" }}>
                <div style={{ fontSize: ".72rem", textTransform: "uppercase", letterSpacing: ".1em", color: "#ffbf66", marginBottom: 8 }}>Partial Status</div>
                <ul style={{ margin: 0, paddingLeft: 18, color: "#dfe7ff", lineHeight: 1.7 }}>
                  {diagnostics.partialReasons.map((reason) => <li key={reason}>{reason}</li>)}
                </ul>
              </div>
            ) : (
              <p style={{ color: "#98a5d1", margin: 0, lineHeight: 1.7 }}>No partial-capture warning is recorded for this bundle.</p>
            )}
          </div>,
          "#53b6ff"
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 22 }}>
        {panel(
          "Provenance Lanes",
          diagnostics.provenanceLanes.length > 0 ? (
            <div style={{ display: "grid", gap: 10 }}>
              {diagnostics.provenanceLanes.map((lane) => (
                <div key={lane.id} style={{ padding: "14px 16px", borderRadius: 14, background: "rgba(7,10,18,0.78)", border: "1px solid rgba(120,143,199,0.18)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                    <div>
                      <div style={{ color: "#eef1ff", fontWeight: 700 }}>{lane.label}</div>
                      <div style={{ color: "#98a5d1", fontSize: ".82rem", marginTop: 4 }}>{lane.stance}</div>
                    </div>
                    <div style={{ color: "#00d1c7", fontWeight: 800 }}>{lane.itemCount} item{lane.itemCount === 1 ? "" : "s"}</div>
                  </div>
                  {lane.resourceCount > 0 ? <div style={{ color: "#98a5d1", fontSize: ".82rem", marginTop: 6 }}>{lane.resourceCount} linked resource{lane.resourceCount === 1 ? "" : "s"}</div> : null}
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: "#98a5d1", margin: 0 }}>No provenance lanes were recorded.</p>
          ),
          "#11d9b5"
        )}

        {panel(
          "Capture Strategy Lanes",
          diagnostics.captureStrategyLanes.length > 0 ? (
            <div style={{ display: "grid", gap: 10 }}>
              {diagnostics.captureStrategyLanes.map((lane) => (
                <div key={lane.id} style={{ padding: "14px 16px", borderRadius: 14, background: "rgba(7,10,18,0.78)", border: "1px solid rgba(120,143,199,0.18)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                    <div>
                      <div style={{ color: "#eef1ff", fontWeight: 700 }}>{lane.label}</div>
                      <div style={{ color: "#98a5d1", fontSize: ".82rem", marginTop: 4 }}>{lane.stance}</div>
                    </div>
                    <div style={{ color: "#53b6ff", fontWeight: 800 }}>{lane.itemCount} item{lane.itemCount === 1 ? "" : "s"}</div>
                  </div>
                  {lane.resourceCount > 0 ? <div style={{ color: "#98a5d1", fontSize: ".82rem", marginTop: 6 }}>{lane.resourceCount} linked resource{lane.resourceCount === 1 ? "" : "s"}</div> : null}
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: "#98a5d1", margin: 0 }}>No capture strategy lanes were recorded.</p>
          ),
          "#53b6ff"
        )}
      </div>

      {panel(
        "Canonical Preview",
        diagnostics.preview.length > 0 ? (
          <div style={{ display: "grid", gap: 10 }}>
            {diagnostics.preview.map((snippet, index) => (
              <div key={`${index}:${snippet.slice(0, 24)}`} style={{ padding: "14px 16px", borderRadius: 14, background: "rgba(7,10,18,0.78)", border: "1px solid rgba(120,143,199,0.18)", color: "#dfe7ff", lineHeight: 1.7 }}>
                {snippet}
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: "#98a5d1", margin: 0 }}>No canonical preview is available for this workspace.</p>
        ),
        "#d6b5ff"
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 22 }}>
        {panel(
          "Canonical Item Samples",
          diagnostics.itemSamples.length > 0 ? (
            <div style={{ display: "grid", gap: 10 }}>
              {diagnostics.itemSamples.map((item) => (
                <div key={item.sourceItemId} style={{ padding: "14px 16px", borderRadius: 14, background: "rgba(7,10,18,0.78)", border: "1px solid rgba(120,143,199,0.18)" }}>
                  <div style={{ color: "#eef1ff", fontWeight: 700 }}>{item.title}</div>
                  <div style={{ color: "#98a5d1", fontSize: ".82rem", marginTop: 4 }}>{item.kind} | {item.provenanceKind ?? "provenance missing"} | {item.captureStrategy ?? "strategy missing"}</div>
                  <div style={{ color: "#98a5d1", fontSize: ".82rem", marginTop: 8, overflowWrap: "anywhere" }}>{item.canonicalUrl}</div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: "#98a5d1", margin: 0 }}>No canonical item sample is available.</p>
          ),
          "#00d1c7"
        )}

        {panel(
          "Linked Resource Samples",
          diagnostics.resourceSamples.length > 0 ? (
            <div style={{ display: "grid", gap: 10 }}>
              {diagnostics.resourceSamples.map((resource) => (
                <div key={resource.id} style={{ padding: "14px 16px", borderRadius: 14, background: "rgba(7,10,18,0.78)", border: "1px solid rgba(120,143,199,0.18)" }}>
                  <div style={{ color: "#eef1ff", fontWeight: 700 }}>{resource.title}</div>
                  <div style={{ color: "#98a5d1", fontSize: ".82rem", marginTop: 4 }}>{resource.kind} | {resource.provenanceKind ?? "provenance missing"} | {resource.captureStrategy ?? "strategy missing"}</div>
                  <div style={{ color: "#98a5d1", fontSize: ".82rem", marginTop: 8, overflowWrap: "anywhere" }}>{resource.url}</div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: "#98a5d1", margin: 0 }}>No linked resources were captured for this workspace.</p>
          ),
          "#ffbf66"
        )}
      </div>
    </div>
  );
}
