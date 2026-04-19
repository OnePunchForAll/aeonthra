# Old Engine Retirement Plan

## What was removed

- the entire retired package tree at `packages/content-engine`
- old engine tests tied only to that implementation path
- old dictionaries, synthesis helpers, protocol generation, and heuristic pipeline files that belonged only to the retired engine

## What references changed

- `@learning/content-engine` now resolves to `packages/content-engine-v2`
- `tsconfig.base.json` points `@learning/content-engine` at `packages/content-engine-v2/src/index.ts`
- `apps/web/vite.config.ts` points the live web alias at `packages/content-engine-v2/src/index.ts`
- `packages/content-engine-v2/package.json` now owns the canonical `@learning/content-engine` package id
- lockfiles now resolve `node_modules/@learning/content-engine` to `packages/content-engine-v2`

## Benchmark artifacts that remain on purpose

- `packages/content-engine-v2/src/fixtures/corpus.ts`
- `packages/content-engine-v2/src/benchmarks/score.ts`
- `packages/content-engine-v2/src/benchmarks/run.ts`
- `packages/content-engine-v2/src/benchmarks/legacy-v1-surfaces.json`
- `ENGINE_SHADOW_DIFF_MATRIX.md`

## What should not remain after cutover

- no second live engine package
- no runtime imports of retired old-engine code
- no benchmark code that imports the retired engine directly
- no docs claiming `packages/content-engine` is still the canonical live engine

## Why the deletion was safe

- the redirected live seam passed targeted web, Atlas, workspace, shell-mapper, offline-site, App, and interactions-engine tests before retirement
- the canonical engine package passed its own tests after the benchmark harness was rewired away from live old-engine imports
- the old-vs-new benchmark result was frozen before deletion, so retirement did not erase comparison evidence
- the final repo still has one canonical production engine path and no live fallback to the old heuristics
