# Engine V2 Integration Closeout

## Final cutover status

- Completed.
- The live production engine is now the v2 implementation.
- The old production engine package has been retired from the repo and runtime path.

## Final source-of-truth path

- Canonical implementation path: `packages/content-engine-v2/src`
- Canonical public package id: `@learning/content-engine`

## Final removed paths

- removed `packages/content-engine/**`

## Final verification state

- `npm run test --workspace @learning/content-engine` passed
- targeted web consumer tests passed through the redirected live seam
- `npm run test --workspace @learning/interactions-engine -- src/index.test.ts` passed through the canonical package id
- `npm test` passed
- `npm run typecheck` passed
- `npm run build` passed
- benchmark harness passed after retirement using the frozen v1 baseline with `82.67 -> 98.00` and `+15.33` delta over 3 stable repeated runs

## Remaining limitations

- the canonical implementation folder still carries the historical `content-engine-v2` directory name even though it is now the production engine
- the legacy benchmark baseline is snapshot data, not executable old-engine code
- several historical docs in the repo remain intentionally historical and still refer to the retired engine when describing past failures or prior passes
- some repo-local skills still preserve historical old-engine examples, but they now carry a cutover note that points contributors at `packages/content-engine-v2/src/**`
