import type { ForgeSessionData } from "./forge-session";
import type { AppProgress } from "./workspace";

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "aeonthra";
}

export function exportJson(filename: string, value: unknown): void {
  downloadBlob(new Blob([JSON.stringify(value, null, 2)], { type: "application/json;charset=utf-8" }), filename);
}

export function exportConceptMapPng(svg: SVGSVGElement): Promise<void> {
  const serializer = new XMLSerializer();
  const svgText = serializer.serializeToString(svg);
  const svgBlob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const viewBox = svg.viewBox.baseVal;
      const width = Math.max(viewBox.width || svg.clientWidth || 920, 920);
      const height = Math.max(viewBox.height || svg.clientHeight || 620, 620);
      const canvas = document.createElement("canvas");
      canvas.width = width * 2;
      canvas.height = height * 2;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas export was unavailable."));
        return;
      }
      ctx.scale(2, 2);
      ctx.fillStyle = "#020208";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(image, 0, 0, width, height);
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url);
        if (!blob) {
          reject(new Error("PNG export failed."));
          return;
        }
        downloadBlob(blob, `aeonthra-concept-map-${Date.now()}.png`);
        resolve();
      }, "image/png");
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Concept map image could not be rendered."));
    };
    image.src = url;
  });
}

export function exportForgeSummaryMarkdown(data: ForgeSessionData, progress: AppProgress, score: { correct: number; wrong: number }): void {
  const total = Math.max(score.correct + score.wrong, 1);
  const pct = Math.round((score.correct / total) * 100);
  const concepts = data.genesis.scan.map((concept) => ({
    label: concept.label,
    mastery: progress.conceptMastery[concept.id] ?? 0
  }));
  const mastered = concepts.filter((entry) => entry.mastery >= 0.8);
  const review = concepts.filter((entry) => entry.mastery < 0.6);
  const today = new Intl.DateTimeFormat(undefined, { month: "long", day: "numeric", year: "numeric" }).format(new Date());

  const markdown = [
    "# AEONTHRA Study Summary",
    `## ${data.chapter.title} - ${today}`,
    "",
    `### Score: ${pct}%`,
    `### Correct: ${score.correct}`,
    `### Needs review: ${score.wrong}`,
    "",
    "### Concepts Mastered",
    ...(mastered.length > 0 ? mastered.map((entry) => `- ${entry.label} (${Math.round(entry.mastery * 100)}%)`) : ["- None yet"]),
    "",
    "### Concepts To Review",
    ...(review.length > 0 ? review.map((entry) => `- ${entry.label} (${Math.round(entry.mastery * 100)}%)`) : ["- None"]),
    "",
    "### Active Takeaway",
    `- ${data.chapter.summary}`,
    ""
  ].join("\n");

  downloadBlob(new Blob([markdown], { type: "text/markdown;charset=utf-8" }), `aeonthra-summary-${slugify(data.chapter.title)}.md`);
}

export function exportCanonicalArtifactJson(title: string, artifact: unknown): void {
  exportJson(`aeonthra-canonical-artifact-${slugify(title)}.json`, artifact);
}

export function exportWorkspaceDiagnosticsJson(title: string, diagnostics: unknown): void {
  exportJson(`aeonthra-workspace-diagnostics-${slugify(title)}.json`, diagnostics);
}
