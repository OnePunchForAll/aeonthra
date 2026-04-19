import type { Citation, Concept, SourceDoc, Workspace } from "./types";

const HEADER = "# AEONTHRA Lite Notes";

function supportsFsAccess(): boolean {
  return typeof window !== "undefined" && typeof (window as unknown as { showSaveFilePicker?: unknown }).showSaveFilePicker === "function";
}

function safeFileName(value: string): string {
  return value.replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/(^-+|-+$)/g, "").slice(0, 80) || "aeonthra-notes";
}

export function formatNotes(notes: string, meta: { title: string; scope?: string; savedAt: string }): string {
  return `${HEADER}\nScope: ${meta.scope ?? "(all sources)"}\nTitle: ${meta.title}\nSaved: ${meta.savedAt}\n\n${notes.trim()}\n`;
}

export function stripHeader(contents: string): string {
  const text = contents.replace(/\r\n?/g, "\n");
  if (!text.startsWith(HEADER)) return text.trim();
  const idx = text.indexOf("\n\n");
  return idx < 0 ? "" : text.slice(idx + 2).trim();
}

async function saveText(body: string, suggestedName: string): Promise<{ ok: true; via: string } | { ok: false; error: string }> {
  try {
    if (supportsFsAccess()) {
      const picker = (window as unknown as { showSaveFilePicker: (init: unknown) => Promise<{ createWritable: () => Promise<{ write: (chunk: string) => Promise<void>; close: () => Promise<void> }> }> }).showSaveFilePicker;
      const handle = await picker({
        suggestedName,
        types: [{ description: "Plain text", accept: { "text/plain": [".txt"] } }]
      });
      const writable = await handle.createWritable();
      await writable.write(body);
      await writable.close();
      return { ok: true, via: "fs-access" };
    }
    const blob = new Blob([body], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = suggestedName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return { ok: true, via: "download" };
  } catch (error) {
    if (error && typeof error === "object" && "name" in error && (error as { name: string }).name === "AbortError") {
      return { ok: false, error: "Cancelled" };
    }
    return { ok: false, error: error instanceof Error ? error.message : "Save failed" };
  }
}

export async function saveNotesAsTxt(notes: string, meta: { title: string; scope?: string }): Promise<{ ok: true; via: string } | { ok: false; error: string }> {
  return saveText(formatNotes(notes, { ...meta, savedAt: new Date().toISOString() }), `${safeFileName(meta.title)}-notes.txt`);
}

export async function loadNotesFromTxt(): Promise<{ ok: true; text: string; fileName: string } | { ok: false; error: string }> {
  try {
    if (supportsFsAccess()) {
      const picker = (window as unknown as { showOpenFilePicker: (init: unknown) => Promise<Array<{ getFile: () => Promise<File> }>> }).showOpenFilePicker;
      const [handle] = await picker({ multiple: false, types: [{ description: "Plain text", accept: { "text/plain": [".txt", ".md"] } }] });
      if (!handle) return { ok: false, error: "No file selected" };
      const file = await handle.getFile();
      const text = await file.text();
      return { ok: true, text: stripHeader(text), fileName: file.name };
    }
    return await new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".txt,.md,text/plain";
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) { resolve({ ok: false, error: "No file selected" }); return; }
        const text = await file.text();
        resolve({ ok: true, text: stripHeader(text), fileName: file.name });
      };
      input.click();
    });
  } catch (error) {
    if (error && typeof error === "object" && "name" in error && (error as { name: string }).name === "AbortError") {
      return { ok: false, error: "Cancelled" };
    }
    return { ok: false, error: error instanceof Error ? error.message : "Load failed" };
  }
}

export async function exportConceptAsTxt(concept: Concept, sources: SourceDoc[]): Promise<{ ok: true; via: string } | { ok: false; error: string }> {
  const sourceMap = new Map(sources.map((source) => [source.id, source] as const));
  const lines = [
    `# ${concept.label}`,
    `Score: ${concept.score} (${concept.admissionReasons.join(", ") || "no-reasons"})`,
    concept.definition ? `\nDefinition: ${concept.definition}` : "",
    concept.summary ? `\nSummary: ${concept.summary}` : "",
    concept.keywords.length ? `\nKeywords: ${concept.keywords.join(", ")}` : "",
    `\nEvidence:`
  ];
  for (const span of concept.evidence) {
    const source = sourceMap.get(span.sourceId);
    const origin = source ? `${source.title}${source.url ? ` — ${source.url}` : ""}` : span.sourceId;
    lines.push(`  - [${span.role}] ${span.sentence}  (from ${origin})`);
  }
  return saveText(lines.filter(Boolean).join("\n"), `${safeFileName(concept.label)}.txt`);
}

export async function saveNotesAsMarkdown(notes: string, meta: { title: string; scope: string }, workspace: Workspace): Promise<{ ok: true; via: string } | { ok: false; error: string }> {
  const sourceMap = new Map(workspace.sources.map((source) => [source.id, source] as const));
  const citations = (workspace.citations ?? []).filter((entry) => entry.scope === meta.scope || meta.scope === "__all__");
  const lines: string[] = [];
  lines.push(`# ${meta.title}`);
  lines.push("");
  lines.push(`_Scope:_ ${meta.scope === "__all__" ? "All sources" : meta.title}`);
  lines.push(`_Exported:_ ${new Date().toISOString()}`);
  if (workspace.analysis) lines.push(`_Deterministic hash:_ \`${workspace.analysis.deterministicHash.slice(0, 16)}\``);
  if (workspace.assignment?.prompt) {
    lines.push("");
    lines.push("## Assignment");
    lines.push("");
    lines.push("> " + workspace.assignment.prompt.trim().split("\n").join("\n> "));
    if (workspace.assignment.requirements.length > 0) {
      lines.push("");
      lines.push("### Requirements");
      for (const req of workspace.assignment.requirements) {
        lines.push(`- [${req.checked ? "x" : " "}] ${req.text}`);
      }
    }
  }
  lines.push("");
  lines.push("## Notes");
  lines.push("");
  lines.push(notes.trim() || "_(empty)_");
  if (citations.length > 0) {
    lines.push("");
    lines.push("## Citations");
    lines.push("");
    for (const citation of citations) {
      const source = sourceMap.get(citation.sourceId);
      const attribution = source ? `${source.title}${source.url ? ` — ${source.url}` : ""}` : citation.sourceId;
      const label = citation.kind === "direct" ? "Direct" : "Paraphrase";
      const trail = citation.headingTrail.length > 0 ? ` (${citation.headingTrail.join(" / ")})` : "";
      lines.push(`- **${label}** · ${attribution}${trail}`);
      lines.push(`  > ${citation.sentence}`);
    }
  }
  const usedSourceIds = new Set<string>(citations.map((entry) => entry.sourceId));
  if (meta.scope === "__all__") {
    workspace.sources.forEach((source) => usedSourceIds.add(source.id));
  } else if (sourceMap.has(meta.scope)) {
    usedSourceIds.add(meta.scope);
  }
  if (usedSourceIds.size > 0) {
    lines.push("");
    lines.push("## Works Referenced");
    lines.push("");
    for (const sourceId of usedSourceIds) {
      const source = sourceMap.get(sourceId);
      if (!source) continue;
      lines.push(`- ${source.title} (${source.kind})${source.url ? ` — ${source.url}` : ""}`);
    }
  }
  return saveText(lines.join("\n") + "\n", `${safeFileName(meta.title)}.md`);
}

export function formatCitationForInsert(citation: Citation, source: SourceDoc | undefined): string {
  const attribution = source ? source.title : citation.sourceId;
  if (citation.kind === "direct") {
    return `> "${citation.sentence}" — ${attribution}`;
  }
  return `${citation.sentence} (paraphrased from ${attribution})`;
}

export async function exportWorkspaceJson(workspace: Workspace): Promise<{ ok: true; via: string } | { ok: false; error: string }> {
  const body = JSON.stringify(workspace, null, 2);
  try {
    const blob = new Blob([body], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "aeonthra-lite-workspace.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return { ok: true, via: "download" };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Export failed" };
  }
}
