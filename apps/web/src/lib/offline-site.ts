import {
  OfflineSiteBundleSchema,
  stableHash,
  type AppProgress as StoredAppProgress,
  type CaptureBundle,
  type LearningBundle,
  type OfflineSiteBundle
} from "@learning/schema";
import { deriveWorkspace, type AppProgress } from "./workspace";

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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function toStoredProgress(progress: AppProgress): StoredAppProgress {
  return {
    conceptMastery: progress.conceptMastery,
    chapterCompletion: progress.chapterCompletion,
    goalCompletion: progress.goalCompletion,
    practiceMode: progress.practiceMode
  };
}

function fromStoredProgress(progress: StoredAppProgress): AppProgress {
  return {
    conceptMastery: progress.conceptMastery,
    chapterCompletion: progress.chapterCompletion,
    goalCompletion: progress.goalCompletion,
    practiceMode: progress.practiceMode
  };
}

export function createOfflineSiteBundle(input: {
  canvasBundle: CaptureBundle;
  textbookBundle: CaptureBundle;
  mergedBundle: CaptureBundle;
  learningBundle: LearningBundle;
  progress: AppProgress;
}): OfflineSiteBundle {
  const serialized = {
    canvasBundle: input.canvasBundle,
    textbookBundle: input.textbookBundle,
    mergedBundle: input.mergedBundle,
    learningBundle: input.learningBundle,
    progress: toStoredProgress(input.progress)
  };

  return OfflineSiteBundleSchema.parse({
    schemaVersion: input.learningBundle.schemaVersion,
    exportedAt: input.learningBundle.generatedAt,
    title: input.mergedBundle.title,
    ...serialized,
    deterministicHash: stableHash(JSON.stringify(serialized))
  });
}

export function parseOfflineSiteBundle(raw: string): OfflineSiteBundle | null {
  try {
    const parsed = OfflineSiteBundleSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function restoreOfflineSiteBundle(bundle: OfflineSiteBundle): {
  canvasBundle: CaptureBundle;
  textbookBundle: CaptureBundle;
  mergedBundle: CaptureBundle;
  learningBundle: LearningBundle;
  progress: AppProgress;
} {
  return {
    canvasBundle: bundle.canvasBundle,
    textbookBundle: bundle.textbookBundle,
    mergedBundle: bundle.mergedBundle,
    learningBundle: bundle.learningBundle,
    progress: fromStoredProgress(bundle.progress)
  };
}

function buildSectionList(title: string, items: string[]): string {
  const rows = items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  return `
    <section class="panel">
      <h2>${escapeHtml(title)}</h2>
      <ul>${rows || "<li>No items available.</li>"}</ul>
    </section>
  `;
}

export function buildOfflineSiteHtml(bundle: OfflineSiteBundle): string {
  const progress = fromStoredProgress(bundle.progress);
  const workspace = deriveWorkspace(bundle.mergedBundle, bundle.learningBundle, progress);
  const focusThemes = bundle.learningBundle.synthesis.focusThemes;
  const assignmentMappings = bundle.learningBundle.synthesis.assignmentMappings;
  const retentionModules = bundle.learningBundle.synthesis.retentionModules;
  const concepts = bundle.learningBundle.concepts;
  const conceptLabel = (id: string): string =>
    concepts.find((c) => c.id === id)?.label ?? id.replace(/-/g, " ");
  const exportDate = bundle.exportedAt.slice(0, 10);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(bundle.title)} | AEONTHRA Offline Site</title>
  <style>
    :root {
      --bg: #040710;
      --panel: rgba(10, 15, 28, 0.92);
      --border: rgba(87, 121, 219, 0.18);
      --text: #edf2ff;
      --muted: #98a5d1;
      --cyan: #00f0ff;
      --teal: #11d9b5;
      --gold: #ffd84d;
      --danger: #ff728a;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Inter, system-ui, sans-serif;
      background:
        radial-gradient(circle at top left, rgba(0, 240, 255, 0.12), transparent 25%),
        radial-gradient(circle at top right, rgba(17, 217, 181, 0.1), transparent 28%),
        linear-gradient(180deg, #020308 0%, #060814 34%, #05060d 100%);
      color: var(--text);
    }
    main { max-width: 1180px; margin: 0 auto; padding: 36px 24px 80px; }
    h1, h2, h3 { margin: 0 0 12px; font-family: "Space Grotesk", Inter, sans-serif; }
    p { color: var(--muted); line-height: 1.7; }
    .hero, .panel {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 22px;
      box-shadow: 0 24px 64px rgba(0,0,0,0.28);
      padding: 24px 26px;
    }
    .hero { margin-bottom: 24px; }
    .badge-row, .grid { display: grid; gap: 16px; }
    .badge-row { grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); margin-top: 18px; }
    .grid { grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); }
    .badge, .card {
      background: rgba(7, 10, 18, 0.78);
      border: 1px solid var(--border);
      border-radius: 18px;
      padding: 16px 18px;
    }
    .eyebrow { font-size: 0.75rem; letter-spacing: 0.14em; color: var(--cyan); text-transform: uppercase; font-weight: 700; }
    .score { color: var(--gold); font-weight: 800; }
    ul { margin: 0; padding-left: 18px; color: var(--muted); }
    li { margin: 8px 0; line-height: 1.6; }
    .concept-card h3 { margin-bottom: 10px; }
    .concept-card .meta { color: var(--cyan); font-size: 0.85rem; margin-bottom: 10px; }
    .small { font-size: 0.88rem; }
  </style>
</head>
<body>
  <main>
    <section class="hero">
      <div class="eyebrow">AEONTHRA Offline Site</div>
      <h1>${escapeHtml(bundle.title)}</h1>
      <p>This exported study site was built deterministically from captured Canvas course data and textbook content. It does not need regeneration to reopen offline.</p>
      <div class="badge-row">
        <div class="badge"><strong>Exported</strong><br /><span class="small">${escapeHtml(exportDate)}</span></div>
        <div class="badge"><strong>Canvas Items</strong><br /><span class="small">${bundle.learningBundle.synthesis.sourceCoverage.canvasItemCount}</span></div>
        <div class="badge"><strong>Textbook Items</strong><br /><span class="small">${bundle.learningBundle.synthesis.sourceCoverage.textbookItemCount}</span></div>
        <div class="badge"><strong>Stable Concepts</strong><br /><span class="small">${bundle.learningBundle.synthesis.stableConceptIds.length}</span></div>
      </div>
    </section>

    <div class="grid">
      <section class="panel">
        <h2>Instructor Focus Map</h2>
        ${focusThemes.map((theme) => `
          <div class="card">
            <h3>${escapeHtml(theme.label)}</h3>
            <div class="small">Score: <span class="score">${theme.score}</span> | Verbs: ${escapeHtml(theme.verbs.join(", ") || "none detected")}</div>
            <p>${escapeHtml(theme.summary)}</p>
            <ul>${theme.evidence.map((evidence) => `<li>${escapeHtml(evidence.excerpt)}</li>`).join("")}</ul>
          </div>
        `).join("")}
      </section>

      <section class="panel">
        <h2>Course Overview</h2>
        <ul>
          <li>Assignments: ${bundle.learningBundle.synthesis.sourceCoverage.assignmentCount}</li>
          <li>Discussions: ${bundle.learningBundle.synthesis.sourceCoverage.discussionCount}</li>
          <li>Quizzes: ${bundle.learningBundle.synthesis.sourceCoverage.quizCount}</li>
          <li>Pages: ${bundle.learningBundle.synthesis.sourceCoverage.pageCount}</li>
          <li>Modules: ${bundle.learningBundle.synthesis.sourceCoverage.moduleCount}</li>
          <li>Likely assessed skills: ${escapeHtml(bundle.learningBundle.synthesis.likelyAssessedSkills.join(", ") || "none detected")}</li>
        </ul>
      </section>
    </div>

    <div class="grid" style="margin-top: 24px;">
      <section class="panel">
        <h2>Module and Chapter Views</h2>
        ${workspace.chapters.map((chapter) => `
          <div class="card">
            <h3>${escapeHtml(chapter.title)}</h3>
            <p>${escapeHtml(chapter.summary)}</p>
            <div class="small">Concepts: ${escapeHtml(chapter.conceptIds.map(conceptLabel).join(", ") || "none")}</div>
          </div>
        `).join("") || "<p>No chapters were derived from the imported sources.</p>"}
      </section>

      <section class="panel">
        <h2>Assignment Intelligence</h2>
        ${assignmentMappings.map((mapping) => `
          <div class="card">
            <h3>${escapeHtml(mapping.title)}</h3>
            <p>${escapeHtml(mapping.summary)}</p>
            <div class="small">Skills: ${escapeHtml(mapping.likelySkills.join(", ") || "none")}</div>
            <ul>${mapping.checklist.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
          </div>
        `).join("")}
      </section>
    </div>

    <section class="panel" style="margin-top: 24px;">
      <h2>Concept Cards</h2>
      <div class="grid">
        ${concepts.map((concept) => `
          <article class="card concept-card">
            <h3>${escapeHtml(concept.label)}</h3>
            <div class="meta">${escapeHtml(concept.category ?? "Concept")}</div>
            <p>${escapeHtml(concept.definition)}</p>
            <p><strong>Why it matters:</strong> ${escapeHtml(concept.stakes)}</p>
            <p><strong>Common confusion:</strong> ${escapeHtml(concept.commonConfusion || "None recorded.")}</p>
            <p><strong>Memory hook:</strong> ${escapeHtml(concept.mnemonic || "No mnemonic generated.")}</p>
          </article>
        `).join("")}
      </div>
    </section>

    <section class="panel" style="margin-top: 24px;">
      <h2>Retention Architecture</h2>
      <div class="grid">
        ${retentionModules.map((module) => `
          <article class="card">
            <h3>${escapeHtml(module.title)}</h3>
            <div class="small">${escapeHtml(module.kind)}</div>
            <p>${escapeHtml(module.summary)}</p>
            <ul>${module.prompts.map((prompt) => `<li>${escapeHtml(prompt)}</li>`).join("")}</ul>
          </article>
        `).join("")}
      </div>
    </section>

    ${buildSectionList("Review Queue", retentionModules.find((module) => module.kind === "review-queue")?.prompts ?? [])}
  </main>
</body>
</html>`;
}

export function downloadOfflineSiteHtml(bundle: OfflineSiteBundle): void {
  const filename = `aeonthra-offline-site-${slugify(bundle.title)}.html`;
  downloadBlob(new Blob([buildOfflineSiteHtml(bundle)], { type: "text/html;charset=utf-8" }), filename);
}

export function downloadOfflineReplayBundle(bundle: OfflineSiteBundle): void {
  const filename = `aeonthra-site-bundle-${slugify(bundle.title)}.json`;
  downloadBlob(new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json;charset=utf-8" }), filename);
}
