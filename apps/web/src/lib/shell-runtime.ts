import type { CaptureBundle, CaptureItem, LearningBundle } from "@learning/schema";
import type { AppProgress, CourseTask, ForgeChapter, Goal } from "./workspace";
import {
  buildForgeRuntime,
  type ForgeConceptRuntime,
  type ForgeDilemma,
  type ForgeQuestion
} from "./forge-session";
import type {
  ShellConcept,
  ShellData,
  ShellDilemma,
  ShellMCQuestion,
  ShellReading,
  ShellReadingSection,
  ShellTFQuestion
} from "./shell-mapper";

type WorkspaceSlice = {
  tasks: CourseTask[];
  chapters: ForgeChapter[];
  goals: Goal[];
};

function clampMastery(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeKey(value: string): string {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tagValue(item: CaptureItem, prefix: string): string | null {
  return (item.tags ?? [])
    .find((entry) => entry.toLowerCase().startsWith(prefix.toLowerCase()))
    ?.slice(prefix.length)
    .trim() ?? null;
}

function sentenceChunks(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length >= 40);
}

function paragraphChunks(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length >= 40);
}

function buildReadingSections(item: CaptureItem): ShellReadingSection[] {
  const blocks = paragraphChunks(item.plainText);
  const sourceBlocks = blocks.length >= 2 ? blocks : sentenceChunks(item.plainText);
  if (sourceBlocks.length === 0) {
    return [{ heading: item.title, body: normalizeText(item.plainText) }];
  }

  const grouped: ShellReadingSection[] = [];
  for (let index = 0; index < sourceBlocks.length; index += 2) {
    const chunk = sourceBlocks.slice(index, index + 2);
    const headingLine = chunk[0]!.split(/\n/)[0]!.trim();
    const heading = headingLine.length <= 72
      ? headingLine
      : `${item.title} · Section ${grouped.length + 1}`;
    grouped.push({
      heading,
      body: normalizeText(chunk.join("\n\n"))
    });
  }

  return grouped.slice(0, 12);
}

function conceptIdsForItem(item: CaptureItem, learning: LearningBundle): string[] {
  const direct = learning.concepts
    .filter((concept) => concept.sourceItemIds.includes(item.id))
    .sort((left, right) => right.score - left.score || left.label.localeCompare(right.label))
    .map((concept) => concept.id);

  if (direct.length > 0) {
    return direct.slice(0, 5);
  }

  const normalizedItem = normalizeKey(`${item.title} ${item.headingTrail.join(" ")} ${item.plainText}`);
  return learning.concepts
    .map((concept) => {
      const tokens = [concept.label, concept.definition, concept.summary, ...concept.keywords]
        .join(" ")
        .split(/\s+/)
        .map((entry) => normalizeKey(entry))
        .filter((entry) => entry.length >= 4);
      const score = tokens.reduce((sum, token) => sum + (normalizedItem.includes(token) ? 1 : 0), 0);
      return { id: concept.id, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.id.localeCompare(right.id))
    .slice(0, 4)
    .map((entry) => entry.id);
}

function linkedAssignments(conceptIds: string[], tasks: CourseTask[]): string[] {
  return tasks
    .filter((task) => task.conceptIds.some((id) => conceptIds.includes(id)))
    .sort((left, right) => left.plannedDate - right.plannedDate || left.title.localeCompare(right.title))
    .slice(0, 3)
    .map((task) => task.id);
}

function buildTextbookReadings(
  textbookBundle: CaptureBundle | null,
  learning: LearningBundle,
  tasks: CourseTask[]
): ShellReading[] {
  if (!textbookBundle) {
    return [];
  }

  return textbookBundle.items
    .filter((item) => (item.tags ?? []).includes("textbook"))
    .sort((left, right) => {
      const leftIndex = Number(tagValue(left, "segment-index:") ?? "0");
      const rightIndex = Number(tagValue(right, "segment-index:") ?? "0");
      return leftIndex - rightIndex || left.title.localeCompare(right.title);
    })
    .map((item) => {
      const conceptIds = conceptIdsForItem(item, learning);
      const subtitleBits = [
        "Textbook",
        tagValue(item, "import:"),
        tagValue(item, "segment-index:") ? `Section ${tagValue(item, "segment-index:")}` : null
      ].filter(Boolean);

      return {
        id: `textbook:${item.id}`,
        module: tagValue(item, "module-key:") ?? "textbook",
        title: item.title,
        subtitle: subtitleBits.join(" · "),
        type: "document" as const,
        concepts: conceptIds,
        assignments: linkedAssignments(conceptIds, tasks),
        sections: buildReadingSections(item)
      };
    });
}

function toShellTFQuestion(question: ForgeQuestion): ShellTFQuestion {
  return {
    statement: normalizeText(question.prompt),
    answer: question.correctIndex === 0,
    explanation: normalizeText(question.explanation)
  };
}

function toShellMCQuestion(question: ForgeQuestion): ShellMCQuestion {
  return {
    question: normalizeText(question.prompt),
    options: question.options.map((option) => normalizeText(option)),
    correctIndex: question.correctIndex,
    explanation: normalizeText(question.explanation)
  };
}

function frameworkLabelFromOption(label: string, conceptName: string): string {
  // Extract the perspective name from the option label.
  // Options often start with "Apply X: ...", "Do what produces ...", or "Avoid ..."
  const beforeColon = label.split(/[:—]/)[0]?.trim() ?? "";
  if (beforeColon.length >= 4 && beforeColon.length <= 40) return beforeColon;
  if (/consequenti|utilitarian|best outcome/i.test(label)) return "Consequentialist";
  if (/duty|obligation|deontolog|categorical/i.test(label)) return "Deontological";
  if (/virtue|character|wise|compassion|courageous/i.test(label)) return "Virtue Ethics";
  if (/avoid|wait|passive|sidestep/i.test(label)) return "Avoidance";
  return conceptName;
}

function toShellDilemma(dilemma: ForgeDilemma, concept: ShellConcept, runtime: ForgeConceptRuntime): ShellDilemma {
  return {
    text: normalizeText(dilemma.scenario),
    options: dilemma.options.map((option) => ({
      text: normalizeText(option.label),
      framework: frameworkLabelFromOption(option.label, concept.name || runtime.chapterTitle),
      why: normalizeText(option.reveal)
    }))
  };
}

function fallbackTfFromRuntime(concept: ShellConcept, runtime: ForgeConceptRuntime): ShellTFQuestion[] {
  const explanation = normalizeText(runtime.teachBack[0]?.prompt || concept.depth || concept.core);
  if (!explanation) {
    return [];
  }
  return [
    {
      statement: `According to ${runtime.chapterTitle}, ${concept.name} should stay grounded in this move: ${concept.core}`,
      answer: true,
      explanation
    },
    {
      statement: `${concept.name} is only a generic activity label, not a real concept you need to explain in ${runtime.chapterTitle}.`,
      answer: false,
      explanation
    }
  ];
}

function fallbackMcFromRuntime(concept: ShellConcept, runtime: ForgeConceptRuntime): ShellMCQuestion[] {
  const correctOption = normalizeText(concept.core);
  if (correctOption.length < 20) {
    return [];
  }
  // Distractors: trap, hook, dist — filtered to >= 20 chars and distinct from correctOption
  const distractors = [normalizeText(concept.trap), normalizeText(concept.hook), normalizeText(concept.dist)]
    .filter((entry) => entry.length >= 20 && entry !== correctOption);
  const options = [correctOption, ...distractors]; // correctIndex is always 0
  if (options.length < 2) {
    return [];
  }
  return [
    {
      question: `Which preparation line best fits ${concept.name} in ${runtime.chapterTitle}?`,
      options,
      correctIndex: 0,
      explanation: normalizeText(runtime.teachBack[0]?.prompt || concept.depth || concept.core)
    }
  ];
}

function enrichConcept(concept: ShellConcept, runtime: ForgeConceptRuntime | undefined): ShellConcept {
  if (!runtime) {
    return concept;
  }

  const liveTf = (
    runtime.rapid.length > 0
      ? runtime.rapid.map(toShellTFQuestion)
      : fallbackTfFromRuntime(concept, runtime)
  )
    .filter((entry) => entry.statement.length >= 20)
    .slice(0, 6);
  const liveMc = (
    runtime.drill.length > 0
      ? runtime.drill.map(toShellMCQuestion)
      : fallbackMcFromRuntime(concept, runtime)
  )
    .filter((entry) => entry.question.length >= 20 && entry.options.length >= 2)
    .slice(0, 8);
  const liveDilemma = runtime.dilemmas[0] ? toShellDilemma(runtime.dilemmas[0], concept, runtime) : null;
  const teachBackPrompt = runtime.teachBack[0]?.prompt ? normalizeText(runtime.teachBack[0].prompt) : "";

  return {
    ...concept,
    depth: teachBackPrompt || concept.depth,
    dil: liveDilemma ?? concept.dil,
    tf: liveTf.length > 0 ? liveTf : concept.tf,
    mc: liveMc.length > 0 ? liveMc : concept.mc
  };
}

function dedupeReadings(existing: ShellReading[], textbookReadings: ShellReading[]): ShellReading[] {
  const seen = new Set<string>();
  const merged: ShellReading[] = [];
  for (const reading of [...textbookReadings, ...existing]) {
    const key = `${normalizeKey(reading.title)}|${normalizeKey(reading.subtitle)}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    merged.push(reading);
  }
  return merged;
}

export function isEmptyProgress(progress: AppProgress): boolean {
  return (
    Object.keys(progress.conceptMastery).length === 0
    && Object.keys(progress.chapterCompletion).length === 0
    && Object.keys(progress.goalCompletion).length === 0
    && !progress.practiceMode
  );
}

export function normalizeProgressForWorkspace(
  progress: AppProgress,
  shellData: ShellData,
  workspace: WorkspaceSlice
): AppProgress {
  const validConceptIds = new Set(shellData.concepts.map((concept) => concept.id));
  const validChapterIds = new Set([
    ...shellData.modules.map((module) => module.id),
    ...shellData.reading.map((reading) => reading.id),
    ...workspace.chapters.map((chapter) => chapter.id)
  ]);
  const validGoalIds = new Set(workspace.goals.map((goal) => goal.id));

  return {
    conceptMastery: Object.fromEntries(
      Object.entries(progress.conceptMastery)
        .filter(([id]) => validConceptIds.has(id))
        .map(([id, value]) => [id, clampMastery(value)])
        .sort(([left], [right]) => String(left).localeCompare(String(right)))
    ),
    chapterCompletion: Object.fromEntries(
      Object.entries(progress.chapterCompletion)
        .filter(([id]) => validChapterIds.has(id))
        .map(([id, value]) => [id, clampMastery(value)])
        .sort(([left], [right]) => String(left).localeCompare(String(right)))
    ),
    goalCompletion: Object.fromEntries(
      Object.entries(progress.goalCompletion)
        .filter(([id]) => validGoalIds.has(id))
        .sort(([left], [right]) => left.localeCompare(right))
    ),
    practiceMode: Boolean(progress.practiceMode)
  };
}

export function createEmptyProgress(): AppProgress {
  return {
    conceptMastery: {},
    chapterCompletion: {},
    goalCompletion: {},
    practiceMode: false
  };
}

export function enhanceShellData(
  shellData: ShellData,
  learning: LearningBundle,
  workspace: WorkspaceSlice,
  textbookBundle: CaptureBundle | null
): ShellData {
  const forgeRuntime = buildForgeRuntime(learning, workspace);
  const concepts = shellData.concepts.map((concept) => enrichConcept(concept, forgeRuntime[concept.id]));
  const textbookReadings = buildTextbookReadings(textbookBundle, learning, workspace.tasks);
  const reading = dedupeReadings(shellData.reading, textbookReadings);

  return {
    ...shellData,
    concepts,
    reading
  };
}
