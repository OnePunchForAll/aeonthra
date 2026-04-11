import type { FailureExample, RubricCriterion } from "../types";
import type { LearningBundle } from "@learning/schema";

type FailureTemplate = {
  id: string;
  rubricCategory: FailureExample["rubricCategory"];
  failureMode: string;
  template: string;
  contrastTemplate: string;
  annotationTemplate: string;
  inputs: (concepts: LearningBundle["concepts"]) => Record<string, string> | null;
};

const TEMPLATES: FailureTemplate[] = [
  {
    id: "vague-thesis",
    rubricCategory: "thesis",
    failureMode: "VAGUE THESIS",
    template: "This paper will discuss {topic} and some of its problems. There are good things and bad things about it.",
    contrastTemplate: "This paper argues that {topic} is strongest when {strength}, but weakest when {weakness}.",
    annotationTemplate: "This names {topic} without taking a position. A reader still does not know what the paper will prove.",
    inputs: (concepts) => {
      const concept = concepts[0];
      return concept ? {
        topic: concept.label,
        strength: compactStrength(concept),
        weakness: compactWeakness(concept)
      } : null;
    }
  },
  {
    id: "overclaim",
    rubricCategory: "thesis",
    failureMode: "OVER-BROAD CLAIM",
    template: "{topic} explains every moral problem and completely solves human conflict.",
    contrastTemplate: "{topic} clarifies one major dimension of moral reasoning, but it leaves real objections in place.",
    annotationTemplate: "This overclaims. The course text never supports the idea that {topic} solves every problem.",
    inputs: (concepts) => concepts[0] ? { topic: concepts[0]!.label } : null
  },
  {
    id: "misattributed-quote",
    rubricCategory: "evidence",
    failureMode: "MISATTRIBUTED EVIDENCE",
    template: "As {wrong} argued, \"{quote}\".",
    contrastTemplate: "As {right} argues, \"{quote}\".",
    annotationTemplate: "The quote belongs to {right}, not {wrong}. Misattribution breaks trust immediately.",
    inputs: (concepts) => concepts[1] ? {
      wrong: concepts[0]?.label ?? "the wrong thinker",
      right: concepts[1]!.label,
      quote: concepts[1]!.definition
    } : null
  },
  {
    id: "evidence-drop",
    rubricCategory: "evidence",
    failureMode: "UNUSED EVIDENCE",
    template: "\"{quote}\" This quote is interesting.",
    contrastTemplate: "\"{quote}\" This matters because it directly supports the claim about {topic}.",
    annotationTemplate: "The quote appears, but the writer never explains why it matters.",
    inputs: (concepts) => concepts[0] ? { quote: concepts[0]!.definition, topic: concepts[0]!.label } : null
  },
  {
    id: "summary-not-analysis",
    rubricCategory: "analysis",
    failureMode: "SUMMARY DISGUISED AS ANALYSIS",
    template: "{topic} says {definition}. This shows what {topic} says.",
    contrastTemplate: "{topic} says {definition}. That matters because {stakes}.",
    annotationTemplate: "This repeats the definition without explaining why it matters or what tension it creates.",
    inputs: (concepts) => concepts[0] ? { topic: concepts[0]!.label, definition: concepts[0]!.definition.toLowerCase(), stakes: concepts[0]!.stakes.toLowerCase() } : null
  },
  {
    id: "reversed-distinction",
    rubricCategory: "analysis",
    failureMode: "REVERSED DISTINCTION",
    template: "{topic} is basically the same as {other}.",
    contrastTemplate: "{topic} differs from {other} because {difference}.",
    annotationTemplate: "This erases the distinction the chapter spends time building.",
    inputs: (concepts) => concepts[1] ? {
      topic: concepts[0]!.label,
      other: concepts[1]!.label,
      difference: compactDifference(concepts[0]!, concepts[1]!)
    } : null
  },
  {
    id: "structure-drifts",
    rubricCategory: "structure",
    failureMode: "STRUCTURE DRIFTS",
    template: "The paper begins with evidence, jumps to a conclusion, then returns to background without any clear order.",
    contrastTemplate: "The paper opens with a claim, supports it with evidence, then closes by returning to the main question.",
    annotationTemplate: "The structure makes the reader do the organizing work.",
    inputs: () => ({})
  },
  {
    id: "missing-signpost",
    rubricCategory: "structure",
    failureMode: "MISSING SIGNPOSTS",
    template: "The response shifts topics without telling the reader why the movement is happening.",
    contrastTemplate: "The response uses clear transitions so each paragraph feels connected to the last one.",
    annotationTemplate: "The reader can feel the jumps between ideas, but nothing announces the logic of the sequence.",
    inputs: () => ({})
  },
  {
    id: "citation-shell",
    rubricCategory: "citations",
    failureMode: "CITATION SHELL",
    template: "Many experts agree with this idea (Someone, 2020).",
    contrastTemplate: "The source directly supports the point by showing how {topic} works in context ({author}, 2020).",
    annotationTemplate: "The citation exists, but the sentence says nothing specific enough for the evidence to matter.",
    inputs: (concepts) => ({ topic: concepts[0]?.label ?? "the concept", author: "Author" })
  },
  {
    id: "floating-reference",
    rubricCategory: "citations",
    failureMode: "FLOATING REFERENCE",
    template: "The paper ends with a reference list entry, but the body never cites it.",
    contrastTemplate: "Every reference in the list is pulled into the paper through a matching in-text citation.",
    annotationTemplate: "A reference list entry without body use looks copied in rather than earned by the draft.",
    inputs: () => ({})
  }
];

export class NegativeExampleEngine {
  generateFailureExamples(rubricCriterion: RubricCriterion, concepts: LearningBundle["concepts"]): FailureExample[] {
    const category = this.mapCriterionToCategory(rubricCriterion);
    return TEMPLATES
      .filter((template) => template.rubricCategory === category)
      .map((template) => {
        const inputs = template.inputs(concepts);
        if (!inputs) return null;
        const text = fill(template.template, inputs);
        const contrastExample = fill(template.contrastTemplate, inputs);
        const annotation = fill(template.annotationTemplate, inputs);
        if (!this.validateIsActuallyWrong(text, contrastExample)) return null;
        return {
          failureMode: template.failureMode,
          text,
          annotation,
          contrastExample,
          rubricCategory: template.rubricCategory
        };
      })
      .filter((example): example is FailureExample => Boolean(example))
      .slice(0, 2);
  }

  private mapCriterionToCategory(criterion: RubricCriterion): FailureExample["rubricCategory"] {
    const label = `${criterion.label} ${criterion.description}`.toLowerCase();
    if (/thesis|claim|position/.test(label)) return "thesis";
    if (/evidence|support|source/.test(label)) return "evidence";
    if (/analysis|thinking|interpret/.test(label)) return "analysis";
    if (/citation|apa|mla|reference/.test(label)) return "citations";
    return "structure";
  }

  private validateIsActuallyWrong(text: string, contrast: string): boolean {
    return text.trim().length > 30 && text !== contrast;
  }
}

function fill(template: string, data: Record<string, string>): string {
  return template.replace(/\{([^}]+)\}/g, (_, key: string) => data[key] ?? "").replace(/\s+/g, " ").trim();
}

function firstSentence(text: string): string {
  return text.split(/(?<=[.!?])\s+/)[0]?.trim() ?? text.trim();
}

function clauseFromDefinition(definition: string, label: string): string {
  return firstSentence(definition)
    .replace(new RegExp(`^${escapeRegex(label)}\\s+(?:is|are|asks|focuses on|judges|describes)\\s+`, "i"), "")
    .replace(/[.!?]+$/, "")
    .trim();
}

function compactStrength(concept: LearningBundle["concepts"][number]): string {
  const clause = clauseFromDefinition(concept.definition, concept.label);
  if (clause.length >= 12) {
    return clause.toLowerCase();
  }
  return "it clarifies the core moral question cleanly";
}

function compactWeakness(concept: LearningBundle["concepts"][number]): string {
  const line = firstSentence(concept.commonConfusion)
    .replace(new RegExp(`^${escapeRegex(concept.label)}\\s+is\\s+not\\s+`, "i"), "")
    .replace(/[.!?]+$/, "")
    .trim();
  if (line.length >= 12) {
    return line.toLowerCase();
  }
  return "a rival framework keeps a different pressure in view";
}

function compactDifference(left: LearningBundle["concepts"][number], right: LearningBundle["concepts"][number]): string {
  const leftClause = clauseFromDefinition(left.definition, left.label);
  const rightClause = clauseFromDefinition(right.definition, right.label);
  if (leftClause && rightClause && leftClause.toLowerCase() !== rightClause.toLowerCase()) {
    return `${leftClause.toLowerCase()}, while ${right.label.toLowerCase()} ${rightClause.toLowerCase()}`;
  }
  return `${left.label.toLowerCase()} and ${right.label.toLowerCase()} answer the same case from different priorities`;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
