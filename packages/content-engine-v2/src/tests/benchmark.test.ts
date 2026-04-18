import { describe, expect, it } from "vitest";
import { benchmarkCorpus } from "../fixtures/corpus.ts";
import { runBenchmarkRepeated } from "../index.ts";

describe("content-engine-v2 benchmark", () => {
  it("beats the current engine on the benchmark corpus and stays deterministic", () => {
    const report = runBenchmarkRepeated(benchmarkCorpus, 3);
    expect(report.repeatedRunStable).toBe(true);
    expect(report.delta).toBeGreaterThanOrEqual(15);
    expect(report.v2.metrics.noiseRejection?.score ?? 0).toBeGreaterThanOrEqual(report.v1.metrics.noiseRejection?.score ?? 0);
    expect(report.v2.metrics.provenanceCompleteness?.score ?? 0).toBeGreaterThanOrEqual(report.v1.metrics.provenanceCompleteness?.score ?? 0);
    expect(report.v2.metrics.failClosedBehavior?.score ?? 0).toBeGreaterThanOrEqual(report.v1.metrics.failClosedBehavior?.score ?? 0);
  });
});
