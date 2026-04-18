import type {
  BenchmarkComparisonReport,
  BenchmarkEngineReport,
  BenchmarkFixture,
  BenchmarkFixtureExpectation,
  BenchmarkFixtureScore,
  BenchmarkMetricScore,
  BenchmarkSurface
} from "../contracts/types.ts";
import { normalizeForCompare } from "../utils/text.ts";

const METRIC_WEIGHTS = {
  noiseRejection: 18,
  conceptLabelQuality: 12,
  provenanceCompleteness: 15,
  distinctnessQuality: 6,
  relationUsefulness: 7,
  dueDateSanity: 8,
  assignmentTitleSanity: 5,
  readinessHonesty: 10,
  failClosedBehavior: 14,
  outputUsefulness: 3
} as const;

function normalizedSet(values: string[]): Set<string> {
  return new Set(values.map((value) => normalizeForCompare(value)).filter(Boolean));
}

function metric(id: string, score: number, maxScore: number): BenchmarkMetricScore {
  return { id, score, maxScore, notes: [] };
}

function distinctnessPass(surface: BenchmarkSurface): number {
  const checks = surface.concepts.map((concept) => {
    const normalizedValues = Object.values(concept.visibleFields)
      .map((value) => normalizeForCompare(value))
      .filter(Boolean);
    return new Set(normalizedValues).size === normalizedValues.length ? 1 : 0;
  });
  if (checks.length === 0) {
    return 1;
  }
  return checks.reduce<number>((sum, value) => sum + value, 0) / checks.length;
}

function fixtureScore(surface: BenchmarkSurface, expectation: BenchmarkFixtureExpectation): BenchmarkFixtureScore {
  const actualConcepts = normalizedSet(surface.concepts.map((concept) => concept.label));
  const expectedConcepts = normalizedSet(expectation.expectedConceptLabels);
  const suppressedConcepts = normalizedSet(expectation.suppressedLabels);
  const actualAssignments = normalizedSet(surface.assignments.map((assignment) => assignment.title));
  const expectedAssignments = normalizedSet(expectation.expectedAssignmentTitles);
  const suppressedAssignments = normalizedSet(expectation.suppressedAssignmentTitles);
  const readinessAssignments = normalizedSet(surface.assignments.filter((assignment) => assignment.readinessEligible).map((assignment) => assignment.title));
  const expectedReadiness = normalizedSet(expectation.readinessTitles);

  const conceptRecall = expectedConcepts.size === 0
    ? 1
    : [...expectedConcepts].filter((label) => actualConcepts.has(label)).length / expectedConcepts.size;
  const suppressedPass = [...suppressedConcepts].every((label) => !actualConcepts.has(label));
  const suppressedAssignmentPass = [...suppressedAssignments].every((label) => !actualAssignments.has(label));
  const expectedAssignmentRecall = expectedAssignments.size === 0
    ? 1
    : [...expectedAssignments].filter((label) => actualAssignments.has(label)).length / expectedAssignments.size;
  const unknownDuePass = expectation.expectedUnknownDueTitles.every((title) => {
    const normalizedTitle = normalizeForCompare(title);
    return surface.assignments.some((assignment) => normalizeForCompare(assignment.title) === normalizedTitle && assignment.dueState === "unknown");
  });
  const readinessPass = expectedReadiness.size === 0
    ? readinessAssignments.size === 0 ? 1 : 0
    : [...expectedReadiness].filter((title) => readinessAssignments.has(title)).length / expectedReadiness.size;
  const provenancePass = surface.concepts.length === 0
    ? 1
    : surface.concepts.filter((concept) => concept.provenanceComplete).length / surface.concepts.length;
  const relationPass = expectation.expectedRelationPairs.length === 0
    ? 1
    : expectation.expectedRelationPairs.filter((relation) =>
        surface.relations.some((candidate) =>
          normalizeForCompare(candidate.fromLabel) === normalizeForCompare(relation.from)
          && normalizeForCompare(candidate.toLabel) === normalizeForCompare(relation.to)
          && candidate.type === relation.type
        )
      ).length / expectation.expectedRelationPairs.length;

  const metrics: BenchmarkMetricScore[] = [
    metric("noiseRejection", suppressedPass && suppressedAssignmentPass ? METRIC_WEIGHTS.noiseRejection : 0, METRIC_WEIGHTS.noiseRejection),
    metric("conceptLabelQuality", Math.round(METRIC_WEIGHTS.conceptLabelQuality * conceptRecall), METRIC_WEIGHTS.conceptLabelQuality),
    metric("provenanceCompleteness", Math.round(METRIC_WEIGHTS.provenanceCompleteness * provenancePass), METRIC_WEIGHTS.provenanceCompleteness),
    metric("distinctnessQuality", Math.round(METRIC_WEIGHTS.distinctnessQuality * distinctnessPass(surface)), METRIC_WEIGHTS.distinctnessQuality),
    metric("relationUsefulness", Math.round(METRIC_WEIGHTS.relationUsefulness * relationPass), METRIC_WEIGHTS.relationUsefulness),
    metric("dueDateSanity", unknownDuePass ? METRIC_WEIGHTS.dueDateSanity : 0, METRIC_WEIGHTS.dueDateSanity),
    metric("assignmentTitleSanity", Math.round(METRIC_WEIGHTS.assignmentTitleSanity * expectedAssignmentRecall), METRIC_WEIGHTS.assignmentTitleSanity),
    metric("readinessHonesty", Math.round(METRIC_WEIGHTS.readinessHonesty * readinessPass), METRIC_WEIGHTS.readinessHonesty),
    metric("failClosedBehavior", expectation.hardNoiseOnly ? (surface.concepts.length === 0 ? METRIC_WEIGHTS.failClosedBehavior : 0) : METRIC_WEIGHTS.failClosedBehavior, METRIC_WEIGHTS.failClosedBehavior),
    metric("outputUsefulness", Math.round(METRIC_WEIGHTS.outputUsefulness * conceptRecall), METRIC_WEIGHTS.outputUsefulness)
  ];

  return {
    fixtureId: expectation.fixtureId,
    metrics,
    totalScore: metrics.reduce((sum, entry) => sum + entry.score, 0),
    maxScore: metrics.reduce((sum, entry) => sum + entry.maxScore, 0)
  };
}

export function buildEngineReport(
  engineId: "v1" | "v2",
  fixtures: BenchmarkFixture[],
  surfaces: BenchmarkSurface[],
  hashes: string[]
): BenchmarkEngineReport {
  const scores = fixtures.map((fixture, index) => fixtureScore(surfaces[index]!, fixture.expectation));
  const metricsAggregate = new Map<string, { score: number; maxScore: number }>();
  scores.forEach((score) => {
    score.metrics.forEach((entry) => {
      const current = metricsAggregate.get(entry.id) ?? { score: 0, maxScore: 0 };
      current.score += entry.score;
      current.maxScore += entry.maxScore;
      metricsAggregate.set(entry.id, current);
    });
  });

  const normalizedMetrics: Record<string, { score: number; maxScore: number }> = {};
  for (const [key, value] of metricsAggregate.entries()) {
    const weight = METRIC_WEIGHTS[key as keyof typeof METRIC_WEIGHTS];
    normalizedMetrics[key] = {
      score: Number(((value.score / Math.max(1, value.maxScore)) * weight).toFixed(2)),
      maxScore: weight
    };
  }

  return {
    engineId,
    overallScore: Number(Object.values(normalizedMetrics).reduce((sum, entry) => sum + entry.score, 0).toFixed(2)),
    maxScore: Object.values(METRIC_WEIGHTS).reduce((sum, value) => sum + value, 0),
    metrics: normalizedMetrics,
    fixtures: scores,
    deterministicHashes: hashes
  };
}

export function compareReports(
  fixtures: BenchmarkFixture[],
  v1Surfaces: BenchmarkSurface[],
  v2Surfaces: BenchmarkSurface[],
  v1Hashes: string[],
  v2Hashes: string[]
): BenchmarkComparisonReport {
  const v1 = buildEngineReport("v1", fixtures, v1Surfaces, v1Hashes);
  const v2 = buildEngineReport("v2", fixtures, v2Surfaces, v2Hashes);
  return {
    fixtures: fixtures.map((fixture) => fixture.expectation),
    v1,
    v2,
    delta: Number((v2.overallScore - v1.overallScore).toFixed(2)),
    repeatedRunStable: new Set(v1Hashes).size === 1 && new Set(v2Hashes).size === 1
  };
}
