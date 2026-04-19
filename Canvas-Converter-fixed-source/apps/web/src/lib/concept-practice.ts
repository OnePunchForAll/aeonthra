import type { ShellConcept, ShellMCQuestion, ShellTFQuestion } from "./shell-mapper";

const INVALID_CONCEPT_LABELS = new Set([
  "common confusion",
  "common mistake",
  "core idea",
  "going deeper",
  "initial post",
  "key distinction",
  "memory hook",
  "real world application"
]);

type QuestionSource = "hand" | "gen";

export type PracticeTFQuestion = ShellTFQuestion & { source: QuestionSource };
export type PracticeMCQuestion = ShellMCQuestion & { source: QuestionSource };

const normalizePanelText = (value: string | null | undefined): string =>
  (value ?? "").replace(/\s+/g, " ").trim();

const normalizeComparisonText = (value: string | null | undefined): string =>
  normalizePanelText(value).toLowerCase();

const isBadConceptLabel = (label: string | null | undefined): boolean => {
  const normalized = normalizeComparisonText(label);
  return normalized.length < 4 || INVALID_CONCEPT_LABELS.has(normalized);
};

const isRenderableConcept = (concept: ShellConcept | null | undefined): concept is ShellConcept =>
  Boolean(concept)
  && !isBadConceptLabel(concept?.name || "")
  && normalizePanelText(concept?.core).length >= 12;

const firstSentence = (value: string | null | undefined): string => {
  const normalized = normalizePanelText(value);
  if (!normalized) {
    return "";
  }
  const match = normalized.match(/.+?[.!?](?:\s|$)/);
  return (match?.[0] ?? normalized).trim();
};

const normalizeTfQuestion = (
  question: ShellTFQuestion,
  source: QuestionSource
): PracticeTFQuestion | null => {
  const statement = normalizePanelText(question.statement);
  const explanation = normalizePanelText(question.explanation);
  if (!statement || !explanation) {
    return null;
  }
  return {
    statement,
    answer: question.answer,
    explanation,
    source
  };
};

const normalizeMcQuestion = (
  question: ShellMCQuestion,
  source: QuestionSource
): PracticeMCQuestion | null => {
  const prompt = normalizePanelText(question.question);
  const explanation = normalizePanelText(question.explanation);
  if (!prompt || !explanation) {
    return null;
  }

  const options: string[] = [];
  const optionIndexByKey = new Map<string, number>();
  let correctIndex = -1;

  question.options.forEach((option, index) => {
    const normalizedOption = normalizePanelText(option);
    if (!normalizedOption) {
      return;
    }
    const optionKey = normalizeComparisonText(normalizedOption);
    const existingIndex = optionIndexByKey.get(optionKey);
    if (existingIndex !== undefined) {
      if (index === question.correctIndex && correctIndex < 0) {
        correctIndex = existingIndex;
      }
      return;
    }

    const nextIndex = options.length;
    optionIndexByKey.set(optionKey, nextIndex);
    options.push(normalizedOption);
    if (index === question.correctIndex) {
      correctIndex = nextIndex;
    }
  });

  if (correctIndex < 0 || options.length < 3) {
    return null;
  }

  return {
    question: prompt,
    options,
    correctIndex,
    explanation,
    source
  };
};

function differenceText(concept: ShellConcept): string {
  return firstSentence(concept.dist) || firstSentence(concept.core);
}

export function buildConceptQuestionPool(
  concept: ShellConcept | null | undefined,
  allConcepts: ShellConcept[],
  type: "tf"
): PracticeTFQuestion[];
export function buildConceptQuestionPool(
  concept: ShellConcept | null | undefined,
  allConcepts: ShellConcept[],
  type: "mc"
): PracticeMCQuestion[];
export function buildConceptQuestionPool(
  concept: ShellConcept | null | undefined,
  allConcepts: ShellConcept[],
  type: "tf" | "mc"
): Array<PracticeTFQuestion | PracticeMCQuestion> {
  if (!isRenderableConcept(concept)) {
    return [];
  }
  if (concept.practiceReady === false) {
    return [];
  }

  const relatedConcepts = allConcepts.filter((entry) => entry.id !== concept.id && isRenderableConcept(entry));
  const handWritten = type === "tf"
    ? concept.tf
      .map((question) => normalizeTfQuestion(question, "hand"))
      .filter((question): question is PracticeTFQuestion => Boolean(question))
    : concept.mc
      .map((question) => normalizeMcQuestion(question, "hand"))
      .filter((question): question is PracticeMCQuestion => Boolean(question));

  if (type === "tf") {
    const generated: PracticeTFQuestion[] = [];
    const primaryKeyword = normalizePanelText(concept.kw[0] || concept.name.toLowerCase());
    const trapText = firstSentence(concept.trap);
    const depthText = firstSentence(concept.depth) || normalizePanelText(concept.core);

    relatedConcepts.forEach((otherConcept) => {
      const question = normalizeTfQuestion({
        statement: `${concept.name} and ${otherConcept.name} are both part of the ${concept.cat} tradition.`,
        answer: concept.cat === otherConcept.cat,
        explanation: concept.cat === otherConcept.cat
          ? `Correct - both fall under ${concept.cat}.`
          : `False - ${concept.name} is ${concept.cat} while ${otherConcept.name} is ${otherConcept.cat}.`
      }, "gen");
      if (question) {
        generated.push(question);
      }
    });

    const keywordQuestion = normalizeTfQuestion({
      statement: `${concept.name} focuses primarily on ${primaryKeyword}.`,
      answer: true,
      explanation: `Correct - ${primaryKeyword} is central to ${concept.name}.`
    }, "gen");
    if (keywordQuestion) {
      generated.push(keywordQuestion);
    }

    if (trapText) {
      const trapQuestion = normalizeTfQuestion({
        statement: `A key pitfall when studying ${concept.name} is: ${trapText}`,
        answer: true,
        explanation: `Correct - ${normalizePanelText(concept.trap)}`
      }, "gen");
      if (trapQuestion) {
        generated.push(trapQuestion);
      }
    }

    if (depthText) {
      const scopeQuestion = normalizeTfQuestion({
        statement: `${concept.name} applies only in academic writing contexts.`,
        answer: false,
        explanation: `Not specifically - ${depthText}`
      }, "gen");
      if (scopeQuestion) {
        generated.push(scopeQuestion);
      }
    }

    return [...handWritten, ...generated];
  }

  const generated: PracticeMCQuestion[] = [];
  relatedConcepts.slice(0, 4).forEach((otherConcept) => {
    const leftDifference = differenceText(concept);
    const rightDifference = differenceText(otherConcept);
    if (!leftDifference || !rightDifference || normalizeComparisonText(leftDifference) === normalizeComparisonText(rightDifference)) {
      return;
    }
    const question = normalizeMcQuestion({
      question: `What is the key difference between ${concept.name} and ${otherConcept.name}?`,
      options: [
        leftDifference,
        rightDifference,
        "They are interchangeable labels for the same move.",
        `${otherConcept.name} is simply a longer name for ${concept.name}.`
      ],
      correctIndex: 0,
      explanation: `${concept.name}: ${normalizePanelText(concept.core)} ${otherConcept.name}: ${normalizePanelText(otherConcept.core)}`
    }, "gen");
    if (question) {
      generated.push(question);
    }
  });

  const correctHook = firstSentence(concept.hook);
  const hookOptions = relatedConcepts
    .map((otherConcept) => firstSentence(otherConcept.hook))
    .filter((option) => option.length > 0);
  if (correctHook) {
    const question = normalizeMcQuestion({
      question: `Which memory hook best captures ${concept.name}?`,
      options: [correctHook, ...hookOptions.slice(0, 3)],
      correctIndex: 0,
      explanation: `The correct hook for ${concept.name}: ${normalizePanelText(concept.hook)}`
    }, "gen");
    if (question) {
      generated.push(question);
    }
  }

  return [...handWritten, ...generated];
}
