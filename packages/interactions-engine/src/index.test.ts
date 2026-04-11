import { describe, expect, it } from "vitest";
import { createManualCaptureBundle } from "@learning/schema";
import { buildLearningBundle } from "@learning/content-engine";
import {
  AmbientSurfaceEngine,
  CollisionEngine,
  CommitmentEngine,
  DialogueSynthesisEngine,
  InteractionStateEngine,
  NegativeExampleEngine,
  PassageRetrievalEngine,
  ProximityEngine,
  RefractionEngine,
  TemplateSynthesisEngine,
  VoiceAttributionEngine,
  type InteractionCorpus,
  type RubricCriterion
} from "./index";

const storage = new Map<string, string>();
(globalThis as { window?: Window & typeof globalThis }).window = {
  localStorage: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, value);
    },
    removeItem: (key: string) => {
      storage.delete(key);
    },
    clear: () => {
      storage.clear();
    },
    key: (index: number) => [...storage.keys()][index] ?? null,
    get length() {
      return storage.size;
    }
  }
} as Window & typeof globalThis;

function makeCorpus(): InteractionCorpus {
  const bundle = createManualCaptureBundle({
    title: "Ethics Reader",
    text: [
      "Bentham argued, \"The right act is the one that maximizes pleasure and minimizes pain.\"",
      "According to Kant, moral rules hold even when breaking them would seem useful.",
      "Aristotle's view is that virtue is a mean between extremes and must be cultivated through practice.",
      "Nozick argues that the experience machine shows pleasure alone cannot explain the good life.",
      "Assignment prompt: Discuss the strengths and weaknesses of utilitarianism using examples from your own life."
    ].join(" ")
  });
  const learning = buildLearningBundle(bundle);
  return {
    bundle,
    learning,
    tasks: [
      {
        id: "assignment-1",
        title: "Ethics Paper",
        summary: "Discuss the strengths and weaknesses of utilitarianism using examples from your own life.",
        kind: "assignment",
        conceptIds: learning.concepts.slice(0, 3).map((concept) => concept.id),
        requirementLines: ["Discuss the strengths and weaknesses of utilitarianism.", "Use examples from your own life."]
      }
    ]
  };
}

describe("interactions engine", () => {
  it("retrieves passages and attributes named thinkers", () => {
    const corpus = makeCorpus();
    const retrieval = new PassageRetrievalEngine(corpus);
    const attribution = new VoiceAttributionEngine(corpus, retrieval);
    const results = retrieval.search("utilitarianism pleasure pain", { limit: 3 });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]!.score).toBeGreaterThan(0.1);
    expect(attribution.getAttributions().some((entry) => entry.thinker === "Bentham")).toBe(true);
    expect(attribution.getAttributions().some((entry) => entry.thinker === "Kant")).toBe(true);
  });

  it("fills templates and rejects broken output", () => {
    const engine = new TemplateSynthesisEngine();
    const good = engine.fill({
      id: "ok",
      template: "{claim} {support}",
      slots: [
        { name: "claim", required: true, type: "sentence", constraints: { minLength: 10 } },
        { name: "support", required: true, type: "sentence", constraints: { minLength: 10 } }
      ]
    }, {
      claim: "Utilitarianism judges acts by consequences",
      support: "This keeps the focus on who is helped or harmed"
    });
    const bad = engine.fill({
      id: "bad",
      template: "{claim} {support}",
      slots: [
        { name: "claim", required: true, type: "sentence", constraints: { minLength: 10 } },
        { name: "support", required: true, type: "sentence", constraints: { minLength: 10 } }
      ]
    }, {
      claim: "a",
      support: "b"
    });
    expect(good).toMatch(/^\w/);
    expect(bad).toBeNull();
  });

  it("builds refracted prompt angles, commitments, and collision reports", () => {
    const corpus = makeCorpus();
    const retrieval = new PassageRetrievalEngine(corpus);
    const proximity = new ProximityEngine(corpus.bundle.items.map((item) => item.plainText));
    const refraction = new RefractionEngine();
    const commitment = new CommitmentEngine();
    const collision = new CollisionEngine(corpus, retrieval, proximity);
    const angles = refraction.refract(corpus.tasks[0]!.summary, corpus.learning.concepts);
    const commitments = commitment.parseLetter("I promise to cite at least 4 textbook sources, avoid \"I think\", and complete Neural Forge on chapter 3 before writing.");
    const report = collision.collide(corpus.learning.concepts[0]!.id, corpus.learning.concepts[1]!.id);

    expect(angles.length).toBeGreaterThanOrEqual(4);
    expect(new Set(angles.map((angle) => angle.name)).size).toBe(angles.length);
    expect(commitments.length).toBeGreaterThanOrEqual(3);
    expect(report?.sharedGround.length).toBeGreaterThan(0);
  });

  it("supports ambient familiarity, dialogue synthesis, failures, and persistent state", () => {
    const corpus = makeCorpus();
    const retrieval = new PassageRetrievalEngine(corpus);
    const attribution = new VoiceAttributionEngine(corpus, retrieval);
    const dialogue = new DialogueSynthesisEngine(corpus, attribution, retrieval);
    const failures = new NegativeExampleEngine();
    const state = new InteractionStateEngine();
    const sessionId = state.startSession("oracle-panel", { question: "Is utilitarianism enough?" });
    state.updateSession(sessionId, (data) => ({ ...data, answered: true }));
    const history = state.getHistoryFor("oracle-panel");
    const ambient = new AmbientSurfaceEngine(
      { intensity: "steady", contextBias: "random", display: "right-rail" },
      retrieval.getPassages().slice(0, 3).map((passage) => ({
        id: `ambient-${passage.id}`,
        content: passage.text,
        source: `${passage.chapterTitle} p. ${passage.pageNumber}`,
        shownCount: 0,
        lastShownAt: 0,
        contextTags: ["assignment"],
        concepts: passage.concepts,
        passageId: passage.id
      }))
    );
    const first = ambient.tick();
    const second = ambient.tick();
    const panel = dialogue.buildPanelResponse("Is capital punishment ever justified?", ["Bentham", "Kant", "Aristotle"]);
    const criterion: RubricCriterion = { id: "crit-1", label: "Analysis", description: "Shows critical analysis and comparison." };
    const failureExamples = failures.generateFailureExamples(criterion, corpus.learning.concepts);

    expect(history.length).toBeGreaterThan(0);
    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(ambient.getFamiliarityStats().seen).toBeGreaterThan(0);
    expect(Object.keys(panel.responses).length).toBeGreaterThanOrEqual(2);
    expect(failureExamples.length).toBeGreaterThan(0);
  });
});
