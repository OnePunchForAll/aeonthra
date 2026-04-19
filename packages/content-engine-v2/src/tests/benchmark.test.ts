import { describe, expect, it } from "vitest";
import { benchmarkCorpus } from "../fixtures/corpus.ts";
import { buildLearningBundle, runBenchmarkRepeated } from "../index.ts";
import { deriveWorkspace } from "../../../../apps/web/src/lib/workspace.ts";
import { mapToShellData } from "../../../../apps/web/src/lib/shell-mapper.ts";
import { createEmptyProgress } from "../../../../apps/web/src/lib/shell-runtime.ts";

function buildProjectedSurfaces(fixtureId: string) {
  const fixture = benchmarkCorpus.find((entry) => entry.expectation.fixtureId === fixtureId)!;
  const learning = buildLearningBundle(fixture.bundle);
  const workspace = deriveWorkspace(fixture.bundle, learning, createEmptyProgress());
  const shell = mapToShellData(fixture.bundle, learning, workspace);
  return { fixture, learning, workspace, shell };
}

describe("content-engine-v2 benchmark", () => {
  it("beats the current engine on the benchmark corpus and stays deterministic", () => {
    const report = runBenchmarkRepeated(benchmarkCorpus, 3);
    expect(report.repeatedRunStable).toBe(true);
    expect(report.delta).toBeGreaterThanOrEqual(15);
    expect(report.v2.metrics.noiseRejection?.score ?? 0).toBeGreaterThanOrEqual(report.v1.metrics.noiseRejection?.score ?? 0);
    expect(report.v2.metrics.provenanceCompleteness?.score ?? 0).toBeGreaterThanOrEqual(report.v1.metrics.provenanceCompleteness?.score ?? 0);
    expect(report.v2.metrics.failClosedBehavior?.score ?? 0).toBeGreaterThanOrEqual(report.v1.metrics.failClosedBehavior?.score ?? 0);
  });

  it("fails when shell-facing wrapper titles, fallback skill labels, or noisy countdowns survive the benchmark fixtures", () => {
    const fixtureIds = [
      "single-page-mixed-live-junk",
      "thin-discussion-salvage",
      "admin-heavy-orientation-clones",
      "suspicious-date"
    ] as const;

    for (const fixtureId of fixtureIds) {
      const { fixture, learning, workspace, shell } = buildProjectedSurfaces(fixtureId);
      const moduleTitles = shell.modules.map((module) => module.title);
      const skillLabels = shell.skillTree.nodes.map((node) => node.label);
      const suppressedModuleTitles = fixture.expectation.suppressedModuleTitles ?? [];
      const suppressedSkillPrefixes = fixture.expectation.suppressedSkillLabelPrefixes ?? [];
      const shellChecklist = shell.assignments.flatMap((assignment) => assignment.requirementLines);

      expect(moduleTitles.some((title) => suppressedModuleTitles.includes(title))).toBe(false);
      expect(skillLabels.some((label) => suppressedSkillPrefixes.some((prefix) => label.startsWith(prefix)))).toBe(false);

      if (fixtureId === "single-page-mixed-live-junk") {
        expect(learning.synthesis.assignmentMappings).toHaveLength(0);
        expect(workspace.tasks).toHaveLength(0);
        expect(shell.assignments).toHaveLength(0);
        expect(shell.modules.map((module) => module.title)).not.toContain("Course Capture");
        expect(shellChecklist.every((line) => !line.includes("You need to have JavaScript enabled in order to access this site"))).toBe(true);
        expect(shellChecklist.every((line) => !line.includes("Creating Produce New Or"))).toBe(true);
      }

      if (fixtureId === "thin-discussion-salvage") {
        expect(learning.synthesis.assignmentMappings).toHaveLength(0);
        expect(workspace.tasks).toHaveLength(0);
        expect(shell.assignments).toHaveLength(0);
        expect(shell.modules.map((module) => module.title)).toContain("Cognitive Load Theory");
        expect(shell.modules.map((module) => module.title)).not.toContain("Week 4 Discussion Forum");
        expect(shell.modules.map((module) => module.title)).not.toContain("Reply to Classmates");
      }

      if (fixtureId === "admin-heavy-orientation-clones") {
        expect(shell.concepts.map((concept) => concept.name)).toContain("Operant Conditioning");
        expect(learning.synthesis.assignmentMappings).toHaveLength(0);
        expect(workspace.tasks).toHaveLength(0);
        expect(shell.assignments).toHaveLength(0);
        expect(shell.modules.map((module) => module.title)).not.toContain("Reflection Activity");
        expect(shell.modules.map((module) => module.title)).not.toContain("Reflection Activity Copy");
        expect(shell.modules.map((module) => module.title)).not.toContain("Start Here");
        expect(shell.skillTree.nodes.some((node) => /^Explain\s+/i.test(node.label))).toBe(false);
      }

      if (fixtureId === "suspicious-date") {
        const timelineEvents = workspace.weeks.flatMap((week) => week.events).filter((event) => event.linkedItemId === "Essay 2");
        expect(timelineEvents.every((event) => event.status === "upcoming")).toBe(true);
      }
    }
  });
});
