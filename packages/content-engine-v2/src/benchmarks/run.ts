import type { BenchmarkComparisonReport, BenchmarkFixture } from "../contracts/types.ts";
import { buildV1BenchmarkSurface, buildV2BenchmarkSurface } from "../compatibility/benchmark-surface.ts";
import { analyzeBundle } from "../outputs/result.ts";
import { compareReports } from "./score.ts";

export function runBenchmark(fixtures: BenchmarkFixture[]): BenchmarkComparisonReport {
  const v1Surfaces = fixtures.map((fixture) => buildV1BenchmarkSurface(fixture.expectation.fixtureId));
  const v2Results = fixtures.map((fixture) => analyzeBundle(fixture.bundle));
  const v2Surfaces = v2Results.map((result) => buildV2BenchmarkSurface(result));
  const v1Hashes = v1Surfaces.map((surface) => surface.deterministicHash);
  const v2Hashes = v2Surfaces.map((surface) => surface.deterministicHash);
  return compareReports(fixtures, v1Surfaces, v2Surfaces, v1Hashes, v2Hashes);
}

export function runBenchmarkRepeated(fixtures: BenchmarkFixture[], runs = 3): BenchmarkComparisonReport {
  let latest: BenchmarkComparisonReport | null = null;
  const v1HashesByFixture = new Map<string, Set<string>>();
  const v2HashesByFixture = new Map<string, Set<string>>();
  for (let index = 0; index < runs; index += 1) {
    latest = runBenchmark(fixtures);
    latest.fixtures.forEach((fixture, fixtureIndex) => {
      const v1HashSet = v1HashesByFixture.get(fixture.fixtureId) ?? new Set<string>();
      v1HashSet.add(latest!.v1.deterministicHashes[fixtureIndex] ?? "");
      v1HashesByFixture.set(fixture.fixtureId, v1HashSet);
      const v2HashSet = v2HashesByFixture.get(fixture.fixtureId) ?? new Set<string>();
      v2HashSet.add(latest!.v2.deterministicHashes[fixtureIndex] ?? "");
      v2HashesByFixture.set(fixture.fixtureId, v2HashSet);
    });
  }
  if (!latest) {
    throw new Error("Benchmark did not run.");
  }
  return {
    ...latest,
    repeatedRunStable: [...v1HashesByFixture.values()].every((set) => set.size === 1)
      && [...v2HashesByFixture.values()].every((set) => set.size === 1)
  };
}
