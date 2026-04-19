import { describe, expect, it } from "vitest";
import { benchmarkCorpus } from "../fixtures/corpus.ts";
import { buildLearningBundle } from "../index.ts";
import { deriveWorkspace } from "../../../../apps/web/src/lib/workspace.ts";
import { mapToShellData } from "../../../../apps/web/src/lib/shell-mapper.ts";
import { createEmptyProgress } from "../../../../apps/web/src/lib/shell-runtime.ts";

function fixtureById(fixtureId: string) {
  return benchmarkCorpus.find((entry) => entry.expectation.fixtureId === fixtureId)!;
}

function buildProjectedSurfaces(fixtureId: string) {
  const fixture = fixtureById(fixtureId);
  const learning = buildLearningBundle(fixture.bundle);
  const workspace = deriveWorkspace(fixture.bundle, learning, createEmptyProgress());
  const shell = mapToShellData(fixture.bundle, learning, workspace);
  return { fixture, learning, workspace, shell };
}

describe("content-engine-v2 consumer compatibility", () => {
  it("keeps suspicious due dates unknown through workspace and shell projections", () => {
    const { learning, workspace, shell } = buildProjectedSurfaces("suspicious-date");
    const timelineEvents = workspace.weeks.flatMap((week) => week.events).filter((event) => event.linkedItemId === "Essay 2");

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
    expect(timelineEvents.every((event) => event.status === "upcoming")).toBe(true);
  });

  it("preserves grounded concept and Atlas lanes while suppressing orientation wrappers", () => {
    const { learning, shell } = buildProjectedSurfaces("orientation-salvage");
    const shellConceptNames = shell.concepts.map((concept) => concept.name);
    const learningConceptLabels = learning.concepts.map((concept) => concept.label);

    expect(learningConceptLabels).toContain("Operant Conditioning");
    expect(learning.synthesis.assignmentMappings).toHaveLength(0);
    expect(shellConceptNames).toContain("Positive Reinforcement");
    expect(shellConceptNames).not.toContain("Reflection Activity");
    expect(shell.assignments).toHaveLength(0);
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
    const { learning } = buildProjectedSurfaces("trusted-assignment");
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

  it("rejects wrapper-first module titles and fallback Atlas skill labels", () => {
    const fixtures = [
      "single-page-mixed-live-junk",
      "thin-discussion-salvage",
      "admin-heavy-orientation-clones"
    ] as const;

    for (const fixtureId of fixtures) {
      const { fixture, shell } = buildProjectedSurfaces(fixtureId);
      const moduleTitles = shell.modules.map((module) => module.title);
      const skillLabels = shell.skillTree.nodes.map((node) => node.label);
      const suppressedModuleTitles = fixture.expectation.suppressedModuleTitles ?? [];
      const suppressedSkillPrefixes = fixture.expectation.suppressedSkillLabelPrefixes ?? [];

      expect(moduleTitles.some((title) => suppressedModuleTitles.includes(title))).toBe(false);
      expect(skillLabels.some((label) => suppressedSkillPrefixes.some((prefix) => label.startsWith(prefix)))).toBe(false);
    }
  });

  it("keeps the single-page mixed-junk fixture from creating a shell assignment or noisy checklist", () => {
    const { fixture, learning, workspace, shell } = buildProjectedSurfaces("single-page-mixed-live-junk");
    const checklistFragments = fixture.expectation.suppressedChecklistFragments ?? [];
    const shellChecklist = shell.assignments.flatMap((assignment) => assignment.requirementLines);

    expect(learning.synthesis.assignmentMappings).toHaveLength(0);
    expect(workspace.tasks).toHaveLength(0);
    expect(shell.assignments).toHaveLength(0);
    expect(shell.modules.map((module) => module.title)).not.toContain("Course Capture");
    expect(shell.skillTree.nodes.some((node) => /^Explain\s+/i.test(node.label))).toBe(false);
    expect(checklistFragments.every((fragment) => shellChecklist.every((line) => !line.includes(fragment)))).toBe(true);
  });

  it("keeps thin discussion salvage rooted in the concept-bearing chapter rather than wrapper text", () => {
    const { learning, workspace, shell } = buildProjectedSurfaces("thin-discussion-salvage");

    expect(learning.synthesis.assignmentMappings).toHaveLength(0);
    expect(workspace.tasks).toHaveLength(0);
    expect(shell.assignments).toHaveLength(0);
    expect(shell.modules.map((module) => module.title)).toContain("Cognitive Load Theory");
    expect(shell.modules.map((module) => module.title)).not.toContain("Week 4 Discussion Forum");
    expect(shell.modules.map((module) => module.title)).not.toContain("Reply to Classmates");
    expect(shell.skillTree.nodes.some((node) => /^Explain\s+/i.test(node.label))).toBe(false);
  });

  it("keeps admin-heavy orientation clones from surfacing fake assignments or wrapper Atlas labels", () => {
    const { learning, workspace, shell } = buildProjectedSurfaces("admin-heavy-orientation-clones");
    const skillLabels = shell.skillTree.nodes.map((node) => node.label);

    expect(learning.concepts.map((concept) => concept.label)).toContain("Operant Conditioning");
    expect(learning.synthesis.assignmentMappings).toHaveLength(0);
    expect(workspace.tasks).toHaveLength(0);
    expect(shell.assignments).toHaveLength(0);
    expect(shell.modules.map((module) => module.title)).not.toContain("Reflection Activity");
    expect(shell.modules.map((module) => module.title)).not.toContain("Reflection Activity Copy");
    expect(shell.modules.map((module) => module.title)).not.toContain("Start Here");
    expect(skillLabels.some((label) => /^Explain\s+/i.test(label))).toBe(false);
    expect(skillLabels.some((label) => /Reflection Activity|Reflection Activity Copy|Start Here/i.test(label))).toBe(false);
  });
});
