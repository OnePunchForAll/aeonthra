import antonyms from "./dictionaries/antonyms.json";
import canvasChrome from "./dictionaries/canvas-chrome.json";
import definitionPatterns from "./dictionaries/definition-patterns.json";
import hypernyms from "./dictionaries/hypernyms.json";
import mnemonicTemplates from "./dictionaries/mnemonic-templates.json";
import philosophers from "./dictionaries/philosophers.json";
import questionStems from "./dictionaries/question-stems.json";
import scenarioShells from "./dictionaries/scenario-shells.json";
import stopwords from "./dictionaries/stopwords.json";
import synonyms from "./dictionaries/synonyms.json";
import wordFrequency from "./dictionaries/word-frequency.json";
import wrongAnswerPatterns from "./dictionaries/wrong-answer-patterns.json";

export const STOPWORDS = new Set(stopwords);
export const CANVAS_CHROME = new Set(canvasChrome);
export const DEFINITION_PATTERNS = definitionPatterns.map((entry) => ({
  ...entry,
  regex: new RegExp(entry.pattern, "gi")
}));
export const WORD_FREQUENCY = wordFrequency as Record<string, number>;
export const SYNONYMS = synonyms as Record<string, string[]>;
export const ANTONYMS = antonyms as Record<string, string[]>;
export const HYPERNYMS = hypernyms as Record<string, string[]>;
export const MNEMONIC_TEMPLATES = mnemonicTemplates;
export const SCENARIO_SHELLS = scenarioShells;
export const PHILOSOPHERS = philosophers;
export const QUESTION_STEMS = questionStems as Record<string, string[]>;
export const WRONG_ANSWER_PATTERNS = wrongAnswerPatterns;

export function frequencyRank(token: string): number {
  return WORD_FREQUENCY[token.toLowerCase()] ?? 20000;
}

export function synonymsFor(token: string): string[] {
  return SYNONYMS[token.toLowerCase()] ?? [];
}

export function antonymsFor(token: string): string[] {
  return ANTONYMS[token.toLowerCase()] ?? [];
}

export function hypernymsFor(token: string): string[] {
  return HYPERNYMS[token.toLowerCase()] ?? [];
}
