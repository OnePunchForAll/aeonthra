/**
 * shell-mapper.ts
 *
 * Translates the real data pipeline (LearningBundle + workspace + CaptureBundle)
 * into the exact data shapes expected by AeonthraShell.
 *
 * Every field in every type here corresponds to a field used in the shell's JSX.
 * Do not remove fields — add optional ones if you extend the schema later.
 */

import type { CaptureBundle, LearningBundle, LearningConcept, ConceptRelation } from "@learning/schema";
import type { CourseTask, ForgeChapter } from "./workspace";
import { DEMO_ATTRIBUTIONS } from "./demo";

// ─── Shell data types ──────────────────────────────────────────────────────────

export type ShellCourse = {
  code: string;
  title: string;
  term: string;
};

export type ShellTFQuestion = {
  c: string;   // statement text
  a: boolean;  // correct answer
  e: string;   // explanation shown after answer
};

export type ShellMCOption = string;

export type ShellMCQuestion = {
  q: string;              // question text
  o: ShellMCOption[];     // answer options
  c: number;              // correct option index
  e: string;              // explanation shown after answer
};

export type ShellDilemmaOption = {
  t: string;  // option text
  f: string;  // framework label
  w: string;  // why this framework applies
};

export type ShellDilemma = {
  t: string;                    // scenario title/description
  o: ShellDilemmaOption[];      // 2-3 framework-tagged options
};

export type ShellConcept = {
  id: string;
  name: string;
  cat: string;
  core: string;     // 1-sentence definition
  depth: string;    // deeper explanation
  dist: string;     // how it differs from similar concepts
  hook: string;     // memory hook / mnemonic
  trap: string;     // common student mistake
  kw: string[];     // keywords for question generation
  conn: string[];   // related concept IDs
  dil: ShellDilemma;
  tf: ShellTFQuestion[];
  mc: ShellMCQuestion[];
};

export type ShellAssignment = {
  id: string;
  title: string;
  sub: string;          // subtitle / topic
  type: string;         // emoji type icon
  due: number;          // days until due (0 = today, negative = overdue)
  pts: number;          // point value
  con: string[];        // required concept IDs
  tip: string;
  reallyAsking: string;
  demand: string;
  demandIcon: string;
  secretCare: string;
  failModes: string[];
  evidence: string;
  quickPrep: string;
};

export type ShellTextbookChapter = {
  title: string;
  pages: string;
  summary: string;
};

export type ShellModule = {
  id: string;
  title: string;
  ch: string;      // "Chapters N-M"
  pages: string;   // "pp. X-Y"
  desc: string;
  concepts: string[];
  textbook: ShellTextbookChapter[];
};

export type ShellReadingSection = {
  heading: string;
  body: string;
};

export type ShellReading = {
  id: string;
  module: string;     // module ID this reading belongs to
  title: string;
  subtitle: string;   // "Chapter N · pp. X-Y"
  type: "chapter" | "discussion" | "document";
  concepts: string[];
  assignments: string[];
  sections: ShellReadingSection[];
};

export type ShellMarginAnnotation = {
  type: "hook" | "plain" | "confusion" | "assignment" | "border" | "thesis" | "oracle" | "memory";
  text: string;
  color: string;
};

export type ShellTranscriptLine = {
  t: number;     // timestamp in seconds
  text: string;
};

export type ShellTranscriptSegment = {
  id: string;
  label: string;
  ts: number;    // start timestamp
  lines: ShellTranscriptLine[];
};

export type ShellTranscript = {
  id: string;
  title: string;
  speaker: string;
  duration: number;  // total seconds
  type: "lecture" | "discussion";
  concepts: string[];
  assignments: string[];
  segments: ShellTranscriptSegment[];
};

export type ShellDistinction = {
  a: string;      // concept ID A
  b: string;      // concept ID B
  label: string;  // "X vs Y"
  border: string; // where one stops and other begins
  trap: string;   // why students confuse them
  twins: string;  // why they look similar
  enemy: string;  // where they directly conflict
};

export type ShellPhilosopherQuote = {
  x: string;    // quote text
  p: number;    // page number
  tg: string[]; // tags for oracle matching
};

export type ShellPhilosopher = {
  n: string;             // name
  t: string;             // tradition
  q: ShellPhilosopherQuote[];
};

export type ShellData = {
  course: ShellCourse;
  concepts: ShellConcept[];
  assignments: ShellAssignment[];
  modules: ShellModule[];
  reading: ShellReading[];
  margins: Record<string, ShellMarginAnnotation[]>;
  transcripts: ShellTranscript[];
  dists: ShellDistinction[];
  philosophers: ShellPhilosopher[];
};

// ─── Question generators ───────────────────────────────────────────────────────

function generateTF(c: LearningConcept): ShellTFQuestion[] {
  const shortDef = c.definition.length > 120
    ? c.definition.slice(0, 120).trimEnd() + "..."
    : c.definition;

  const items: ShellTFQuestion[] = [
    {
      c: `${c.label} holds that: ${shortDef}`,
      a: true,
      e: c.definition
    },
    {
      c: c.commonConfusion,
      a: false,
      e: c.mnemonic
    }
  ];

  // Third question: transferHook as a true statement
  if (c.transferHook && c.transferHook.length > 20) {
    items.push({
      c: c.transferHook,
      a: true,
      e: c.primer
    });
  }

  // Fourth question: a negation of the mnemonic concept (false)
  if (c.keywords.length > 0) {
    items.push({
      c: `${c.label} is primarily concerned with ${c.keywords[c.keywords.length - 1] ?? "rules"} rather than ${c.keywords[0] ?? "outcomes"}.`,
      a: false,
      e: c.definition
    });
  }

  return items.slice(0, 4);
}

function generateMC(c: LearningConcept, allConcepts: LearningConcept[]): ShellMCQuestion[] {
  // Get 2 other concepts for distractor options
  const others = allConcepts.filter((x) => x.id !== c.id).slice(0, 3);

  const q1: ShellMCQuestion = {
    q: `Which best describes ${c.label}?`,
    o: [
      c.definition,
      others[0]?.definition ?? `The study of ${c.keywords[1] ?? "moral character"}.`,
      c.commonConfusion,
      others[1]?.definition ?? `Rules that apply universally without exception.`
    ],
    c: 0,
    e: c.definition
  };

  const q2: ShellMCQuestion = {
    q: `When should you apply ${c.label} in an ethical analysis?`,
    o: [
      `Only when the question involves legal systems`,
      c.transferHook,
      `When the outcome is the only thing that matters`,
      `Whenever a philosopher's name appears in the prompt`
    ],
    c: 1,
    e: c.transferHook
  };

  const q3: ShellMCQuestion = {
    q: `A common misunderstanding about ${c.label} is:`,
    o: [
      c.commonConfusion,
      c.definition,
      c.mnemonic,
      `That it was developed by Aristotle exclusively`
    ],
    c: 0,
    e: `This is the trap: ${c.commonConfusion}. The correct understanding is: ${c.definition}`
  };

  return [q1, q2, q3];
}

function generateDilemma(c: LearningConcept): ShellDilemma {
  return {
    t: `A student is deciding whether to be honest about their sources in an essay. Apply ${c.label} to this situation.`,
    o: [
      {
        t: `Apply ${c.label}: consider what ${c.transferHook.slice(0, 80)}`,
        f: c.label,
        w: c.definition
      },
      {
        t: `Consider only the immediate consequences for everyone involved.`,
        f: "Consequentialist view",
        w: "What produces the best overall outcome?"
      },
      {
        t: `Ask what kind of person this choice will build over time.`,
        f: "Character-based view",
        w: "What habits does this decision cultivate?"
      }
    ]
  };
}

// ─── Core mappers ──────────────────────────────────────────────────────────────

function mapCourse(bundle: CaptureBundle): ShellCourse {
  const courseName = bundle.captureMeta?.courseName ?? bundle.title;
  const courseId = bundle.captureMeta?.courseId ?? "";
  // Try to extract a short course code from the title (e.g. "PHI 208")
  const codeMatch = courseName.match(/\b([A-Z]{2,4})\s*(\d{3,4})\b/);
  const code = codeMatch ? `${codeMatch[1]} ${codeMatch[2]}` : courseId.slice(0, 10) || "COURSE";
  const capturedDate = new Date(bundle.capturedAt);
  const term = `${capturedDate.toLocaleString("default", { month: "long" })} ${capturedDate.getFullYear()}`;
  return { code, title: courseName, term };
}

function mapConcept(
  c: LearningConcept,
  allConcepts: LearningConcept[],
  relations: ConceptRelation[]
): ShellConcept {
  const connectedIds = relations
    .filter((r) => r.fromId === c.id || r.toId === c.id)
    .map((r) => (r.fromId === c.id ? r.toId : r.fromId))
    .filter((id) => id !== c.id);

  return {
    id: c.id,
    name: c.label,
    cat: c.category ?? "Concept",
    core: c.definition,
    depth: c.primer,
    dist: c.excerpt || c.summary,
    hook: c.mnemonic,
    trap: c.commonConfusion,
    kw: c.keywords,
    conn: [...new Set(connectedIds)],
    dil: generateDilemma(c),
    tf: generateTF(c),
    mc: generateMC(c, allConcepts)
  };
}

function taskTypeIcon(kind: CourseTask["kind"]): string {
  switch (kind) {
    case "discussion": return "💬";
    case "quiz": return "❓";
    case "page": return "📄";
    default: return "📝";
  }
}

function taskDemand(kind: CourseTask["kind"]): { demand: string; icon: string } {
  switch (kind) {
    case "discussion": return { demand: "Respond + Engage", icon: "💬" };
    case "quiz": return { demand: "Recall + Apply", icon: "🧠" };
    default: return { demand: "Analyze + Synthesize", icon: "🔬" };
  }
}

function daysUntil(timestamp: number | null): number {
  if (!timestamp) return 30;
  const ms = timestamp - Date.now();
  return Math.round(ms / (24 * 60 * 60 * 1000));
}

function mapAssignment(task: CourseTask): ShellAssignment {
  const { demand, icon } = taskDemand(task.kind);
  const reqLines = task.requirementLines.slice(0, 4);
  const failModes = reqLines.length > 0
    ? reqLines.map((r) => `Missing: ${r.slice(0, 80)}`)
    : [
        "Summarizing instead of analyzing",
        "Not applying the specific framework requested",
        "Missing citations or textbook evidence",
        "Neglecting to address counterarguments"
      ];

  const evidenceNeeded = reqLines.length > 0
    ? reqLines.slice(0, 2).join("; ")
    : "Textbook concepts applied to a concrete case with reasoning shown";

  return {
    id: task.id,
    title: task.title,
    sub: task.summary.slice(0, 60) || task.title,
    type: taskTypeIcon(task.kind),
    due: daysUntil(task.dueDate),
    pts: 100, // not directly in CourseTask; use a sensible default
    con: task.conceptIds,
    tip: task.summary.slice(0, 100) || `Focus on ${task.conceptIds[0] ?? "the core concept"}.`,
    reallyAsking: task.summary || `This assignment asks you to demonstrate mastery of ${task.conceptIds.join(", ")}.`,
    demand,
    demandIcon: icon,
    secretCare: `Instructors look for specific concept application, not just general knowledge. Show that you understand ${task.conceptIds[0] ?? "the framework"} deeply.`,
    failModes,
    evidence: evidenceNeeded,
    quickPrep: `Review ${task.conceptIds.slice(0, 2).join(" and ")} then work through one practice question. ~${Math.round(task.estimatedMinutes * 0.4)} minutes.`
  };
}

function mapModulesFromChapters(chapters: ForgeChapter[]): ShellModule[] {
  const groups = new Map<string, { chapters: ForgeChapter[]; idx: number }>();
  chapters.forEach((ch) => {
    const existing = groups.get(ch.moduleKey);
    if (existing) {
      existing.chapters.push(ch);
    } else {
      groups.set(ch.moduleKey, { chapters: [ch], idx: groups.size + 1 });
    }
  });

  return Array.from(groups.entries()).map(([moduleKey, { chapters: chs, idx }]) => {
    const allConceptIds = [...new Set(chs.flatMap((ch) => ch.conceptIds))];
    const textbook: ShellTextbookChapter[] = chs.map((ch, i) => ({
      title: ch.title,
      pages: `Ch. ${idx}.${i + 1}`,
      summary: ch.summary
    }));

    return {
      id: moduleKey,
      title: chs[0]?.title ?? `Module ${idx}`,
      ch: chs.length === 1 ? `Chapter ${idx}` : `Chapters ${idx}.1-${idx}.${chs.length}`,
      pages: `Module ${idx}`,
      desc: chs[0]?.summary ?? "",
      concepts: allConceptIds,
      textbook
    };
  });
}

function mapReadingFromChapters(chapters: ForgeChapter[], tasks: CourseTask[]): ShellReading[] {
  return chapters.map((ch, i) => {
    // Find assignments that mention this chapter's concepts
    const relatedAssignments = tasks
      .filter((t) => t.conceptIds.some((id) => ch.conceptIds.includes(id)))
      .map((t) => t.id)
      .slice(0, 3);

    // Split summary into sections (by sentence breaks)
    const sentences = ch.summary
      .split(/(?<=[.!?])\s+/)
      .filter((s) => s.trim().length > 20);

    const sections: ShellReadingSection[] =
      sentences.length >= 3
        ? [
            { heading: "Overview", body: sentences.slice(0, 2).join(" ") },
            { heading: "Key Ideas", body: (sentences.slice(2, 4).join(" ") || sentences[2]) ?? ch.summary },
            { heading: "Application", body: sentences.slice(4).join(" ") || `This chapter connects to ${ch.conceptIds.join(", ")}.` }
          ]
        : [{ heading: ch.title, body: ch.summary }];

    return {
      id: ch.id,
      module: ch.moduleKey,
      title: ch.title,
      subtitle: `Chapter ${i + 1}`,
      type: "chapter" as const,
      concepts: ch.conceptIds,
      assignments: relatedAssignments,
      sections
    };
  });
}

function generateMargins(reading: ShellReading[], learning: LearningBundle): Record<string, ShellMarginAnnotation[]> {
  const margins: Record<string, ShellMarginAnnotation[]> = {};

  reading.forEach((r) => {
    r.sections.forEach((_, sIdx) => {
      const key = `${r.id}:${sIdx}`;
      const annotations: ShellMarginAnnotation[] = [];

      if (sIdx === 0) {
        annotations.push({
          type: "hook",
          text: "This section introduces core ideas that recur throughout the course. Read it carefully.",
          color: "#ffd700"
        });
      }

      // Find related concepts for this reading
      const relatedConcept = learning.concepts.find((c) => r.concepts.includes(c.id));
      if (relatedConcept && sIdx < 2) {
        annotations.push({
          type: "plain",
          text: `Plain English: ${relatedConcept.mnemonic}`,
          color: "#06d6a0"
        });
        if (relatedConcept.commonConfusion) {
          annotations.push({
            type: "confusion",
            text: `⚠ Common trap: ${relatedConcept.commonConfusion}`,
            color: "#ff4466"
          });
        }
      }

      if (r.assignments.length > 0 && sIdx === 1) {
        annotations.push({
          type: "assignment",
          text: `📋 This section connects directly to upcoming assignments. Take notes.`,
          color: "#fb923c"
        });
      }

      if (annotations.length > 0) {
        margins[key] = annotations;
      }
    });
  });

  return margins;
}

function mapTranscriptsFromBundle(_bundle: CaptureBundle): ShellTranscript[] {
  // Look for video/audio-linked items (currently not captured, but reserved for future)
  // Return empty for now — transcripts are generated from real media when available
  return [];
}

function mapDistinctions(relations: ConceptRelation[], concepts: LearningConcept[]): ShellDistinction[] {
  const contrasts = relations.filter((r) => r.type === "contrasts");
  const seen = new Set<string>();
  const result: ShellDistinction[] = [];

  for (const rel of contrasts) {
    const pairKey = [rel.fromId, rel.toId].sort().join("|");
    if (seen.has(pairKey)) continue;
    seen.add(pairKey);

    const a = concepts.find((c) => c.id === rel.fromId);
    const b = concepts.find((c) => c.id === rel.toId);
    if (!a || !b) continue;

    result.push({
      a: rel.fromId,
      b: rel.toId,
      label: rel.label || `${a.label} vs ${b.label}`,
      border: `${a.label}: ${a.definition.slice(0, 80)}. ${b.label}: ${b.definition.slice(0, 80)}.`,
      trap: `Students confuse ${a.label} and ${b.label} because ${a.commonConfusion.slice(0, 60)} while ${b.commonConfusion.slice(0, 60)}.`,
      twins: `Both ${a.label} and ${b.label} are major ethical frameworks used in similar contexts.`,
      enemy: `They conflict directly on: ${rel.label}.`
    });

    if (result.length >= 6) break; // cap for shell layout
  }

  return result;
}

function mapPhilosophers(_bundle: CaptureBundle): ShellPhilosopher[] {
  // Use the demo attribution groups as baseline (they reflect the real course's thinkers).
  // When real attribution data is available in the bundle, this can be extended.
  return DEMO_ATTRIBUTIONS.map((group) => ({
    n: group.thinker,
    t: group.tradition,
    q: group.passages.map((p) => ({
      x: p.text,
      p: p.page,
      tg: p.text
        .toLowerCase()
        .replace(/[^a-z\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 3)
        .slice(0, 8)
    }))
  }));
}

// ─── Public entry point ────────────────────────────────────────────────────────

export function mapToShellData(
  bundle: CaptureBundle,
  learning: LearningBundle,
  workspace: { tasks: CourseTask[]; chapters: ForgeChapter[] }
): ShellData {
  const { tasks, chapters } = workspace;

  const concepts = learning.concepts.map((c) =>
    mapConcept(c, learning.concepts, learning.relations)
  );

  const assignments = tasks.map(mapAssignment);
  const modules = mapModulesFromChapters(chapters);
  const reading = mapReadingFromChapters(chapters, tasks);
  const margins = generateMargins(reading, learning);
  const transcripts = mapTranscriptsFromBundle(bundle);
  const dists = mapDistinctions(learning.relations, learning.concepts);
  const philosophers = mapPhilosophers(bundle);
  const course = mapCourse(bundle);

  return {
    course,
    concepts,
    assignments,
    modules,
    reading,
    margins,
    transcripts,
    dists,
    philosophers
  };
}

/**
 * Demo fallback — produces ShellData from the demo LearningBundle.
 * This ensures the demo mode experience goes through the same mapper path
 * as real data, so there's a single rendering code path.
 */
export function mapDemoToShellData(
  bundle: CaptureBundle,
  learning: LearningBundle,
  workspace: { tasks: CourseTask[]; chapters: ForgeChapter[] }
): ShellData {
  return mapToShellData(bundle, learning, workspace);
}
