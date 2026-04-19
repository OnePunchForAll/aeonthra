import type { DuelRound, InteractionCorpus, PanelResponse, Position, SynthesizedResponse } from "../types";
import { VoiceAttributionEngine } from "./voice-attribution";
import { PassageRetrievalEngine } from "./passage-retrieval";

export class DialogueSynthesisEngine {
  constructor(
    private readonly corpus: InteractionCorpus,
    private readonly attributionEngine: VoiceAttributionEngine,
    private readonly passageEngine: PassageRetrievalEngine
  ) {}

  buildPanelResponse(question: string, thinkers: string[]): PanelResponse {
    const topics = question.toLowerCase().match(/[a-z]{4,}/g) ?? [];
    const attributed = this.attributionEngine.getResponsesToQuestion(question, topics);
    const responses: Record<string, SynthesizedResponse> = {};

    thinkers.forEach((thinker) => {
      const attributions = attributed[thinker] ?? [];
      if (attributions.length === 0) {
        responses[thinker] = {
          text: "",
          sources: [],
          confidence: 0
        };
        return;
      }
      const primary = attributions[0]!;
      const support = attributions[1] ?? primary;
      const primaryLine = this.trimToSentence(primary.passage.text);
      const supportLine = this.trimToSentence(support.passage.text);
      const distinctSupport = this.sameText(primaryLine, supportLine) ? "" : supportLine;
      const text = distinctSupport
        ? `${primaryLine} ${distinctSupport}`
        : primaryLine;
      responses[thinker] = {
        text,
        sources: attributions.map((entry) => ({
          passage: entry.passage.text,
          page: entry.passage.pageNumber,
          confidence: entry.confidence
        })),
        confidence: attributions.reduce((sum, entry) => sum + entry.confidence, 0) / attributions.length
      };
    });

    return { question, responses };
  }

  buildDuelRound(left: string, right: string, roundNumber: number, previousRounds: DuelRound[]): DuelRound {
    const leftConcept = this.findConcept(left);
    const rightConcept = this.findConcept(right);
    const labels: Record<number, DuelRound["type"]> = { 1: "opening", 2: "objection", 3: "objection", 4: "synthesis", 5: "closing" };

    if (!leftConcept || !rightConcept) {
      return {
        round: roundNumber,
        type: labels[roundNumber] ?? "closing",
        leftPosition: this.toPosition(left, "Insufficient differentiated content for this duel round.", "AEONTHRA", 1, "claim"),
        rightPosition: this.toPosition(right, "Insufficient differentiated content for this duel round.", "AEONTHRA", 1, "claim"),
        verdictHint: "Judge which side is better grounded once stronger source material is available."
      };
    }

    const openingLeft = this.distinctContent(leftConcept, [leftConcept.definition, leftConcept.summary, leftConcept.excerpt]);
    const openingRight = this.distinctAgainst(
      openingLeft,
      rightConcept,
      [rightConcept.definition, rightConcept.summary, rightConcept.excerpt]
    );
    const leftPassage = this.passageEngine.searchByConcept(leftConcept.id)[0]?.passage;
    const rightPassage = this.passageEngine.searchByConcept(rightConcept.id)[0]?.passage;

    const makeObjection = (attacker: InteractionCorpus["learning"]["concepts"][number], defender: InteractionCorpus["learning"]["concepts"][number]) =>
      this.trimToSentence(
        attacker.commonConfusion
        || `If ${defender.label} were enough on its own, what would happen to ${attacker.label.toLowerCase()}?`
      );
    const makeDefense = (concept: InteractionCorpus["learning"]["concepts"][number]) =>
      this.distinctContent(concept, [concept.summary, concept.definition, concept.transferHook, concept.stakes]);

    const rounds: Record<number, { left: string; right: string; leftType: Position["type"]; rightType: Position["type"]; hint: string }> = {
      1: {
        left: openingLeft,
        right: openingRight,
        leftType: "claim",
        rightType: "claim",
        hint: "Which opening statement presents a clearer ethical foundation?"
      },
      2: {
        left: makeObjection(leftConcept, rightConcept),
        right: this.distinctAgainst(makeObjection(leftConcept, rightConcept), rightConcept, [makeDefense(rightConcept), rightConcept.summary, rightConcept.definition]),
        leftType: "objection",
        rightType: "defense",
        hint: "Which side answered the first challenge more convincingly?"
      },
      3: {
        left: this.distinctAgainst(makeObjection(rightConcept, leftConcept), leftConcept, [makeDefense(leftConcept), leftConcept.summary, leftConcept.definition]),
        right: makeObjection(rightConcept, leftConcept),
        leftType: "defense",
        rightType: "objection",
        hint: "Which side recovered better once the pressure reversed?"
      },
      4: {
        left: this.trimToSentence(`${leftConcept.label} preserves this claim: ${leftConcept.summary}`),
        right: this.distinctAgainst(leftConcept.summary, rightConcept, [`${rightConcept.label} preserves this claim: ${rightConcept.summary}`, rightConcept.transferHook]),
        leftType: "synthesis",
        rightType: "synthesis",
        hint: "Which synthesis keeps its own framework clearer without collapsing into the other?"
      },
      5: {
        left: this.trimToSentence(`Closing move for ${leftConcept.label}: ${leftConcept.transferHook}`),
        right: this.distinctAgainst(leftConcept.transferHook, rightConcept, [`Closing move for ${rightConcept.label}: ${rightConcept.transferHook}`, rightConcept.stakes]),
        leftType: "synthesis",
        rightType: "synthesis",
        hint: previousRounds.length > 0
          ? "Judge which side stayed distinct while still sounding usable in real course work."
          : "Judge which side would help a student most under assignment pressure."
      }
    };

    const current = rounds[roundNumber] ?? rounds[5]!;
    return {
      round: roundNumber,
      type: labels[roundNumber] ?? "closing",
      leftPosition: this.toPosition(leftConcept.label, current.left, leftPassage?.chapterTitle ?? leftConcept.category ?? leftConcept.label, leftPassage?.pageNumber ?? 1, current.leftType),
      rightPosition: this.toPosition(rightConcept.label, current.right, rightPassage?.chapterTitle ?? rightConcept.category ?? rightConcept.label, rightPassage?.pageNumber ?? 1, current.rightType),
      verdictHint: current.hint
    };
  }

  private toPosition(
    speaker: string,
    content: string,
    chapterTitle = "Indexed source",
    pageNumber = 1,
    type: Position["type"]
  ): Position {
    return {
      speaker,
      content,
      type,
      topic: speaker.toLowerCase().split(/\s+/),
      source: `${chapterTitle} p. ${pageNumber}`
    };
  }

  private findConcept(conceptId: string) {
    return this.corpus.learning.concepts.find((concept) => concept.id === conceptId) ?? null;
  }

  private sameText(left: string, right: string): boolean {
    return left.trim().toLowerCase() === right.trim().toLowerCase();
  }

  private trimToSentence(text: string): string {
    const cleaned = text.replace(/\s+/g, " ").trim();
    if (!cleaned) {
      return "Insufficient differentiated content for this duel round.";
    }
    const sentence = cleaned.split(/(?<=[.!?])\s+/).find((entry) => entry.trim().length >= 24) ?? cleaned;
    return /[.!?]$/.test(sentence) ? sentence : `${sentence}.`;
  }

  private distinctContent(
    concept: InteractionCorpus["learning"]["concepts"][number],
    candidates: string[]
  ): string {
    const cleaned = candidates.map((candidate) => this.trimToSentence(candidate)).filter(Boolean);
    return cleaned.find((candidate) => candidate.length >= 24) ?? `Insufficient differentiated content for ${concept.label}.`;
  }

  private distinctAgainst(
    otherSide: string,
    concept: InteractionCorpus["learning"]["concepts"][number],
    candidates: string[]
  ): string {
    const normalizedOther = otherSide.trim().toLowerCase();
    const choice = candidates
      .map((candidate) => this.trimToSentence(candidate))
      .find((candidate) => candidate.trim().toLowerCase() !== normalizedOther && candidate.length >= 24);
    return choice ?? `Insufficient differentiated content for ${concept.label}.`;
  }
}
