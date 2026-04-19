# Engine Cutover Execution Plan

## Exact cutover phases

1. Audit the old public seam, v2 seam, and every live consumer.
2. Build the missing v2 public API and `LearningBundle` compatibility surface.
3. Run shadow old-vs-new benchmarks and consumer-facing compatibility tests before switching the live seam.
4. Redirect the canonical `@learning/content-engine` live seam to `packages/content-engine-v2/src/index.ts`.
5. Re-run downstream tests through the redirected live seam.
6. Freeze legacy-v1 benchmark surfaces for post-retirement comparison.
7. Retire `packages/content-engine` and stale references after the switched path is proven.
8. Run typecheck, targeted tests, full relevant tests, build, and repeated benchmark checks on the post-retirement repo.
9. Align docs, manifests, and ledgers with the final canonical engine path.

## Exact order of operations used in this pass

1. Read the active repo instructions and cutover docs.
2. Audited the live public engine seam and current consumers.
3. Added a v2-backed `LearningBundle` builder, progress wrapper, source-quality API, and richer legacy projection.
4. Added v2 consumer-compat tests through `deriveWorkspace`, `mapToShellData`, and Atlas-facing synthesis fields.
5. Ran the pre-retirement shadow benchmark and recorded the old-vs-new report.
6. Redirected `@learning/content-engine` aliases to `packages/content-engine-v2/src/index.ts`.
7. Verified web and interactions consumers through the redirected live seam.
8. Renamed `packages/content-engine-v2/package.json` to `@learning/content-engine`.
9. Snapshotted legacy v1 benchmark surfaces in `packages/content-engine-v2/src/benchmarks/legacy-v1-surfaces.json`.
10. Removed the old `packages/content-engine` tracked files and deleted the old package directory.
11. Updated lockfiles, docs, and cutover records.
12. Ran post-retirement verification.

## Temporary shadow strategy

- Pre-retirement old-vs-new comparison was run on the benchmark corpus through:
  - old engine benchmark surfaces
  - new v2 benchmark surfaces
- The old-engine result was frozen into:
  - `packages/content-engine-v2/src/benchmarks/legacy-v1-surfaces.json`
- That snapshot is now the benchmark baseline used after retirement so the repo can still prove a positive delta without leaving the old engine alive.

## Switching strategy

- The import surface stayed stable as `@learning/content-engine`.
- The live implementation behind that import now resolves to `packages/content-engine-v2/src/index.ts` through:
  - `tsconfig.base.json`
  - `apps/web/vite.config.ts`
  - the renamed workspace package in `packages/content-engine-v2/package.json`
- No live dual-engine fallback remains in production code.

## Retirement strategy

- Removed the old production package at `packages/content-engine`.
- Kept the replacement implementation in `packages/content-engine-v2` as the single canonical engine source-of-truth path.
- Kept only the legacy-v1 benchmark snapshot as migration evidence; no old engine code remains in the runtime path.

## Verification strategy

- Run the canonical engine package tests through `npm run test --workspace @learning/content-engine`.
- Run targeted downstream consumer tests through the redirected live seam.
- Run full relevant root `typecheck`, `test`, and `build`.
- Re-run benchmarks after retirement to confirm the positive delta still holds against the frozen v1 baseline.

## Rollback logic for the run

- Before retirement, rollback stayed available by leaving the old package tree intact until redirected-consumer tests were green.
- After retirement, rollback is only through git history. There is no second live engine left in the repo.

## Stop conditions

- Satisfied only when:
  - `@learning/content-engine` resolves to the new engine
  - the old production package is retired from the live repo path
  - downstream consumers pass through the new seam
  - benchmark evidence still shows a positive delta
  - docs and ledgers identify one canonical engine source of truth
