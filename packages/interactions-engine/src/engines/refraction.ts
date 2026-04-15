import type { Angle } from "../types";
import type { LearningBundle } from "@learning/schema";

type PromptAnalysis = {
  originalPrompt: string;
  actionVerbs: string[];
  topicNouns: string[];
  modifiers: string[];
  questionStructure: "open" | "evaluative" | "comparative" | "directive";
};

type AngleTemplate = Omit<Angle, "thesisScaffold" | "conceptLineage"> & {
  applicabilityCheck: (analysis: PromptAnalysis) => boolean;
};

const ANGLES: AngleTemplate[] = [
  {
    id: "biographic",
    name: "Biographic Hook",
    tagline: "Start with lived experience and pull theory into it",
    difficulty: "low",
    conceptCountRange: [2, 3],
    thesisTemplate: "{topic} first made sense when {personal}. Its real strength appears in {strength}, but its weakness surfaces in {weakness}.",
    riskStatement: "Can feel too personal if the theory disappears.",
    applicabilityCheck: (analysis) => analysis.modifiers.some((entry) => /your own|personal|life|experience/.test(entry))
  },
  {
    id: "theoretical",
    name: "Theoretical with Illustration",
    tagline: "Lead with the textbook idea and ground it in one example",
    difficulty: "medium",
    conceptCountRange: [4, 5],
    thesisTemplate: "{topic}'s strongest move is {strength}. A real example shows this, but {weakness} keeps the framework from feeling complete.",
    riskStatement: "Needs careful balance between explanation and example.",
    applicabilityCheck: () => true
  },
  {
    id: "dialectical",
    name: "Dialectical Challenge",
    tagline: "Take a side and answer the strongest objection",
    difficulty: "high",
    conceptCountRange: [6, 8],
    thesisTemplate: "Although {topic} appears persuasive because {strength}, its best objection from {other} shows why the theory remains contested.",
    riskStatement: "Highest ceiling, but easiest angle to overstate.",
    applicabilityCheck: (analysis) => analysis.questionStructure === "evaluative"
  },
  {
    id: "counterfactual",
    name: "Counterfactual Lens",
    tagline: "Ask what would change if the framework had guided the decision",
    difficulty: "medium-high",
    conceptCountRange: [4, 6],
    thesisTemplate: "If {topic} had guided the decision, {counterfactual}. That reveals the framework's power, but also its limit in {weakness}.",
    riskStatement: "Counterfactuals must stay anchored to the assigned text.",
    applicabilityCheck: (analysis) => analysis.questionStructure === "open"
  },
  {
    id: "comparative",
    name: "Comparative Arc",
    tagline: "Compare two frameworks around the same situation",
    difficulty: "medium",
    conceptCountRange: [5, 7],
    thesisTemplate: "Where {topic} clarifies {strength}, {other} explains {otherStrength}, showing that neither framework fully captures the whole problem alone.",
    riskStatement: "Requires a real criterion for comparison.",
    applicabilityCheck: (analysis) => analysis.questionStructure === "comparative" || analysis.actionVerbs.some((verb) => /compare|contrast/.test(verb))
  },
  {
    id: "historical",
    name: "Historical Build",
    tagline: "Show how the idea responds to an earlier problem",
    difficulty: "medium",
    conceptCountRange: [3, 5],
    thesisTemplate: "{topic} becomes clearer when read as an answer to {other}. Its strength is the correction it offers; its weakness is what still remains unresolved.",
    riskStatement: "Only works if the chapter actually contains development over time.",
    applicabilityCheck: (analysis) => analysis.actionVerbs.some((verb) => /trace|develop|history/.test(verb))
  },
  {
    id: "critical",
    name: "Critical Pressure",
    tagline: "Organize the paper around the sharpest objection",
    difficulty: "high",
    conceptCountRange: [5, 6],
    thesisTemplate: "{topic} looks strongest until the objection from {other} forces the theory to answer a deeper problem: {weakness}.",
    riskStatement: "Needs precise objection handling or it collapses into summary.",
    applicabilityCheck: (analysis) => analysis.actionVerbs.some((verb) => /critique|evaluate|assess/.test(verb))
  },
  {
    id: "applied",
    name: "Applied Transfer",
    tagline: "Take the concept into a modern scenario",
    difficulty: "medium-high",
    conceptCountRange: [4, 6],
    thesisTemplate: "{topic} becomes most visible in {personal}. Applied there, its strength is {strength}, but its weakness appears when {weakness}.",
    riskStatement: "Transfer examples must remain faithful to the source.",
    applicabilityCheck: () => true
  }
];

export class RefractionEngine {
  refract(prompt: string, availableConcepts: LearningBundle["concepts"]): Angle[] {
    const analysis = this.analyzePrompt(prompt);
    const concepts = availableConcepts.slice(0, 8);
    const applicable = ANGLES.filter((angle) => angle.applicabilityCheck(analysis));
    return applicable
      .slice(0, 5)
      .map((angle, index) => {
        const other = concepts.length > 1 ? concepts[(index + 1) % concepts.length] : concepts[0];
        return this.instantiateAngle(angle, concepts, other);
      })
      .filter((angle, index, array) => array.findIndex((entry) => entry.id === angle.id) === index);
  }

  private analyzePrompt(prompt: string): PromptAnalysis {
    const lower = prompt.toLowerCase();
    const actionVerbs = (lower.match(/\b(compare|contrast|evaluate|assess|discuss|explain|analyze|trace|argue|critique|reflect)\b/g) ?? []);
    const topicNouns = (lower.match(/\b[a-z]{5,}\b/g) ?? []).slice(0, 8);
    const modifiers = (lower.match(/\b(your own|personal|life|experience|examples?|history|objection|weakness|strength)\b/g) ?? []);
    const questionStructure = /compare|contrast/.test(lower)
      ? "comparative"
      : /evaluate|assess|strength|weakness|argue|critique/.test(lower)
        ? "evaluative"
        : /write|discuss|explain/.test(lower)
          ? "directive"
          : "open";
    return { originalPrompt: prompt, actionVerbs, topicNouns, modifiers, questionStructure };
  }

  private instantiateAngle(template: AngleTemplate, concepts: LearningBundle["concepts"], otherConcept: LearningBundle["concepts"][number] | undefined): Angle {
    const primary = concepts[0];
    const secondary = otherConcept ?? concepts[1] ?? primary;
    const thesisScaffold = template.thesisTemplate
      .replaceAll("{topic}", primary?.label ?? "the topic")
      .replaceAll("{personal}", "one concrete moment from your own experience")
      .replaceAll("{strength}", primary?.stakes.toLowerCase() ?? "its strongest explanatory move")
      .replaceAll("{weakness}", primary?.commonConfusion.toLowerCase() ?? "the objection that still remains")
      .replaceAll("{other}", secondary?.label ?? "another framework")
      .replaceAll("{otherStrength}", secondary?.stakes.toLowerCase() ?? "something the rival view makes visible")
      .replaceAll("{counterfactual}", "the decision would have been made for a different reason");
    return {
      id: template.id,
      name: template.name,
      tagline: template.tagline,
      difficulty: template.difficulty,
      conceptCountRange: template.conceptCountRange,
      thesisTemplate: template.thesisTemplate,
      thesisScaffold,
      riskStatement: template.riskStatement,
      conceptLineage: [primary?.label, secondary?.label].filter((entry): entry is string => Boolean(entry))
    };
  }
}
