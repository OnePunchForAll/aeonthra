export { analyzeBundle, analyzeBundleWithProgress } from "./outputs/result.ts";
export { projectToLegacy } from "./compatibility/legacy-projection.ts";
export {
  buildLearningBundle,
  buildLearningBundleFromAnalysis,
  buildLearningBundleWithProgress,
  createDemoSourceText,
  summarizeBundle
} from "./compatibility/learning-bundle.ts";
export { buildV1BenchmarkSurface, buildV2BenchmarkSurface } from "./compatibility/benchmark-surface.ts";
export { benchmarkCorpus } from "./fixtures/corpus.ts";
export { runBenchmark, runBenchmarkRepeated } from "./benchmarks/run.ts";
export { assessSourceQuality, qualityBannerText } from "./source-quality.ts";
export type {
  AssignmentSignalV2,
  BenchmarkComparisonReport,
  BenchmarkFixtureExpectation,
  BenchmarkSurface,
  ConceptV2,
  EngineV2Result,
  FocusThemeV2,
  LegacyProjection,
  ReadinessV2,
  RelationV2,
  SourceClassification,
  StructuralNode
} from "./contracts/types.ts";
export type { LearningBuildStage } from "./compatibility/learning-bundle.ts";
export type { SourceQualityReport, SynthesisMode } from "./source-quality.ts";
