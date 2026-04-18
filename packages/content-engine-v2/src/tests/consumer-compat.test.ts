import { describe, expect, it } from "vitest";
import { benchmarkCorpus } from "../fixtures/corpus.ts";
import { buildLearningBundle } from "../index.ts";
import { deriveWorkspace } from "../../../../apps/web/src/lib/workspace.ts";
import { mapToShellData } from "../../../../apps/web/src/lib/shell-mapper.ts";
import { createEmptyProgress } from "../../../../apps/web/src/lib/shell-runtime.ts";

function fixtureById(fixtureId: string) {
  return benchmarkCorpus.find((entry) => entry.expectation.fixtureId === fixtureId)!;
}

describe("content-engine-v2 consumer compatibility", () => {
  it("keeps suspicious due dates unknown through workspace and shell projections", () => {
    const fixture = fixtureById("suspicious-date");
    const learning = buildLearningBundle(fixture.bundle);
    const workspace = deriveWorkspace(fixture.bundle, learning, createEmptyProgress());
    const shell = mapToShellData(fixture.bundle, learning, workspace);

    expect(learning.synthesis.assignmentMappings.length).toBe(1);
    expect(learning.synthesis.assignmentMappings[0]).toMatchObject({
      dueAt: null,
      dueTrust: {
        state: "rejected"
      },
      readinessEligible: false
    });
    expect(workspace.tasks[0]?.dueDate).toBeNull();
    expect(shell.assignments[0]).toMatchObject({
      title: "Essay 2",
      dueState: "unknown",
      dueLabel: "Date not captured"
    });
  });

  it("preserves grounded concept and Atlas lanes while suppressing orientation wrappers", () => {
    const fixture = fixtureById("orientation-salvage");
    const learning = buildLearningBundle(fixture.bundle);
    const workspace = deriveWorkspace(fixture.bundle, learning, createEmptyProgress());
    const shell = mapToShellData(fixture.bundle, learning, workspace);
    const shellConceptNames = shell.concepts.map((concept) => concept.name);
    const learningConceptLabels = learning.concepts.map((concept) => concept.label);

    expect(learningConceptLabels).toContain("Operant Conditioning");
    expect(shellConceptNames).toContain("Positive Reinforcement");
    expect(shellConceptNames).not.toContain("Reflection Activity");
    expect(shell.skillTree.nodes.length).toBeGreaterThan(0);
  });

  it("keeps focus themes grounded when the source family supports them", () => {
    const fixture = fixtureById("clean-textbook-ethics");
    const learning = buildLearningBundle(fixture.bundle);

    expect(learning.synthesis.focusThemes.length).toBeGreaterThan(0);
    expect(learning.synthesis.focusThemes[0]?.conceptIds.length ?? 0).toBeGreaterThan(0);
    expect(learning.synthesis.focusThemes[0]?.evidence.length ?? 0).toBeGreaterThan(0);
  });

  it("preserves related concept links through legacy projection indexing", () => {
    const fixture = fixtureById("clean-textbook-ethics");
    const learning = buildLearningBundle(fixture.bundle);
    const relationRichConcept = learning.concepts.find((concept) => concept.relatedConceptIds.length > 0);

    expect(relationRichConcept).toBeDefined();
    expect(relationRichConcept?.relatedConceptIds.length).toBeGreaterThan(0);
  });

  it("keeps assignment evidence, checklist, and likely skills grounded for downstream consumers", () => {
    const fixture = fixtureById("trusted-assignment");
    const learning = buildLearningBundle(fixture.bundle);
    const mapping = learning.synthesis.assignmentMappings[0];
    const readiness = learning.synthesis.assignmentReadiness[0];

    expect(mapping).toBeDefined();
    expect(mapping?.title).toBe("Essay 1");
    expect(mapping?.dueAt).not.toBeNull();
    expect(mapping?.dueTrust.state).toBe("accepted");
    expect(mapping?.readinessEligible).toBe(true);
    expect(mapping?.readinessAcceptanceReasons.length ?? 0).toBeGreaterThan(0);
    expect(mapping?.evidence.length).toBeGreaterThan(0);
    expect(mapping?.checklist.length).toBeGreaterThan(0);
    expect(mapping?.likelySkills).toContain("compare");
    expect(learning.synthesis.likelyAssessedSkills).toContain("compare");
    expect(readiness).toMatchObject({
      title: "Essay 1",
      ready: true
    });
    expect(readiness?.acceptanceReasons.length ?? 0).toBeGreaterThan(0);
    expect(readiness?.checklist.length ?? 0).toBeGreaterThan(0);
  });
});
