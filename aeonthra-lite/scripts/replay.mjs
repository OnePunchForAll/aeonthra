#!/usr/bin/env node
// Standalone replay: load a workspace JSON, optionally simulate re-import
// (apply extract.ts hyphenation + heading detection to PDF sources),
// run the engine fresh, and emit a summary.
import { build } from "esbuild";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve, join } from "node:path";
import { readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const workspacePath = process.argv[2];
if (!workspacePath) {
  console.error("Usage: node scripts/replay.mjs <workspace.json> [--emit <out.json>] [--reimport]");
  process.exit(2);
}
const emitIdx = process.argv.indexOf("--emit");
const emitPath = emitIdx >= 0 ? process.argv[emitIdx + 1] : null;
const reimport = process.argv.includes("--reimport");

const bundleDir = await mkdtemp(join(tmpdir(), "aeonthra-replay-"));
const engineOut = join(bundleDir, "engine.mjs");
const extractOut = join(bundleDir, "extract.mjs");

await Promise.all([
  build({
    entryPoints: [resolve(root, "src/engine.ts")],
    bundle: true, format: "esm", platform: "neutral", target: "es2022",
    outfile: engineOut, logLevel: "silent"
  }),
  build({
    entryPoints: [resolve(root, "src/extract.ts")],
    bundle: true, format: "esm", platform: "neutral", target: "es2022",
    outfile: extractOut, logLevel: "silent",
    // Don't try to bundle pdfjs for a node replay (we won't call sourceFromPdf)
    external: ["pdfjs-dist"]
  })
]);

const { analyze } = await import(pathToFileURL(engineOut).href);
const extract = await import(pathToFileURL(extractOut).href);

const raw = await readFile(workspacePath, "utf8");
const workspace = JSON.parse(raw);

if (reimport) {
  // Apply rejoinHyphenation + heading detection to long unstructured sources (typical of PDFs).
  for (const source of workspace.sources ?? []) {
    if (source.kind === "pdf" || source.text.length > 40_000) {
      source.text = extract.rejoinHyphenation(source.text);
      // Re-detect headings using the public path via sourceFromText, which runs both
      // markdown and flow-embedded heading detection, then keep the union with existing.
      const reproc = extract.sourceFromText(source.title, source.text, source.kind);
      source.headings = Array.from(new Set([...(source.headings ?? []), ...reproc.headings])).slice(0, 800);
    }
  }
}

const started = performance.now();
const result = analyze(workspace.sources ?? []);
const elapsed = performance.now() - started;

function summarize(concept) {
  return {
    label: concept.label,
    score: concept.score,
    reasons: concept.admissionReasons,
    sources: concept.sourceIds.length,
    keywordCount: concept.keywords.length,
    hasDefinition: Boolean(concept.definition),
    evidence: concept.evidence.length,
    sample: concept.definition?.slice(0, 120) || concept.summary?.slice(0, 120) || "(no sentence)"
  };
}

const rejectionCodes = result.rejections.reduce((acc, rejection) => {
  acc[rejection.code] = (acc[rejection.code] ?? 0) + 1;
  return acc;
}, {});

const report = {
  source: workspacePath,
  reimport,
  elapsedMs: Math.round(elapsed),
  sourceCount: workspace.sources?.length ?? 0,
  sourceHeadingCounts: (workspace.sources ?? []).map((s) => ({ title: s.title, headings: (s.headings ?? []).length })),
  conceptCount: result.concepts.length,
  rejectionCount: result.rejections.length,
  rejectionTopCodes: Object.entries(rejectionCodes).sort(([, a], [, b]) => b - a).slice(0, 10),
  deterministicHash: result.deterministicHash,
  topConcepts: result.concepts.slice(0, 25).map(summarize),
  sampleRejections: result.rejections.slice(0, 15).map((rejection) => ({ code: rejection.code, candidate: rejection.candidate, detail: rejection.detail?.slice(0, 140) })),
  crossLinks: result.crossLinks.slice(0, 5)
};

console.log(JSON.stringify(report, null, 2));

if (emitPath) {
  await writeFile(emitPath, JSON.stringify({ ...workspace, analysis: result }, null, 2));
  console.error(`\nWrote: ${emitPath}`);
}

await rm(bundleDir, { recursive: true, force: true });
