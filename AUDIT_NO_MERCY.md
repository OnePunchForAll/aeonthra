# Audit No Mercy

Date: 2026-04-16
Workspace: `C:\Users\aquae\OneDrive\Documents (Dokyumento)\Canvas Converter`

## Verified strengths

- The repo is a real multi-package product, not a stub. `apps/web`, `apps/extension`, `packages/content-engine`, `packages/interactions-engine`, and `packages/schema` are live and wired.
- The local-first and no-runtime-API boundary is real in the current implementation.
- Final verification in this environment is green:
  - `npm run typecheck`
  - `npm test`
  - `npm run build`
- There is meaningful existing test coverage across web, extension, content-engine, and interactions-engine.
- The extension-to-web bridge is implemented with schema validation and explicit message types.
- The current UI shell has premium visual ambition and some genuinely strong surfaces, especially the full-screen study shell and assignment/reader flows.
- Atlas now has a real deterministic skill-tree layer with prerequisite, readiness, mastery, and recovery states instead of only module/concept aggregation.
- The semantic engine now preserves application and misconception evidence lanes well enough for the new transfer/confusion regression to pass.

## Verified weaknesses

- `apps/web/src/AeonthraShell.tsx` is a `// @ts-nocheck` monolith with UI, state, persistence, keyboard handlers, practice generation, reader logic, and route screens fused together.
- `apps/web/src/App.tsx` is an orchestration god-object mixing bridge, persistence, import, worker orchestration, export, demo mode, and intake UI.
- `apps/web/src/lib/shell-mapper.ts` is doing projection, secondary filtering, practice fabrication, concept field fallback logic, and Atlas/module assembly. It is not a pure mapper.
- `packages/content-engine/src/pipeline.ts` is overloaded with normalization, HTML extraction, segmentation, candidate mining, field phrasing, and graph construction.
- `apps/extension/src/service-worker.ts` is oversized and owns chrome adapters, runtime state, session capture, handoff, exports, and the message router.
- `apps/web` currently has two architectural directions: the monolithic live shell and a parallel componentized interaction path that is not the active app architecture.
- The extension handoff still uses a single pending-pack slot rather than a correlated queue, so overlapping imports remain a real reliability limit.

## Unverified claims

- Any claim that current semantic output is consistently deep, distinct, or meaningfully source-grounded across real captures.
- Any claim that Atlas is already a real skill tree rather than a dressed-up module/concept board.
- Any claim that current “green” tests prove semantic quality.
- Any claim that all repo bloat has already been cleaned.

## Semantic engine failure modes

- HTML evidence loss occurs before concept mining:
  - Nested `.show-content` / `.user_content` extraction is regex-based and can truncate trailing content.
  - Chrome stripping is regex-based and can leak wrapper remnants or malformed leftovers.
  - Segmentation ignores tables, blockquotes, figcaptions, and meaningful content-bearing `div` structures.
- Candidate generation is too title-heavy:
  - Heading/title/block seeds are over-weighted and then effectively counted twice in stabilization.
  - Heading-only blocks can become definitions and then collapse to bundle-title fallback behavior.
  - Noun-phrase extraction admits junk like verb fragments and abstract singleton nouns.
- Stability scoring is not evidence-pure:
  - `concept.score` from extraction feeds back into `buildConceptSupport()`.
  - Same-source co-occurrence and broad keyword overlap inflate weak concepts.
- Relations are noisy:
  - `supports` often means “same page.”
  - `contrasts` can be created from scaffold confusion language.
  - `extends` relies on broad dictionary overlap instead of local evidence.
  - `relatedConceptIds` and `relations` come from separate logic and drift.
- Provenance is too thin:
  - Evidence lacks block IDs, sentence ranges, extraction stage, and field-level attribution.
  - Downstream synthesis and shell mapping often relabel derived text as “evidence.”

## Display-layer repetition failure modes

- The shell mapper fabricates `hook`, `trap`, `cat`, TF, MC, and dilemmas when engine output is weak.
- `resolveDominantShellConceptId()` uses mapper-authored fields as evidence, then UI margins echo those same fields back, creating a circular proof loop.
- Core/depth/dist reuse the same small pool of strings with only light distinctness checks.
- Practice and Oracle surfaces can look rich even when the engine only produced shallow concept bodies.
- The UI dedupes repeated panels cosmetically, which masks engine weakness instead of exposing it.

## Atlas design flaws

- Atlas is still module-first and concept-first:
  - Modules own progression.
  - Concepts are the visible unit of advancement.
  - Assignments derive readiness from concept mastery percentages.
- There is no real skill node model.
- There are no deterministic prerequisite chains across chapter clusters or higher-order skills.
- There is no clean representation of locked, available, earned, mastered, or recovery-loop skill states beyond concept mastery percentages.
- Chapter rewards are chapters/modules with concept chips, not earned skill unlocks.
- Assignment readiness is concept aggregation, not assignment-skill requirement modeling.

## File and architecture concentration risks

- Largest verified concentration risks:
  - `apps/web/src/AeonthraShell.tsx`
  - `apps/web/src/App.tsx`
  - `apps/web/src/lib/shell-mapper.ts`
  - `packages/content-engine/src/pipeline.ts`
  - `apps/extension/src/service-worker.ts`
- `packages/schema/src/index.ts` is also a single-point contract concentration surface.
- `apps/web/vite.config.ts` still contains worktree-specific path assumptions tied to `.claude/worktrees`.

## Test coverage gaps

- Current tests are green but weak on the highest-risk semantic failure modes.
- Missing or insufficient coverage:
  - HTML-path segmentation with nested wrappers
  - table-based and `div`-based semantic evidence
  - abbreviation-sensitive sentence splitting
  - heading-first / title-first false concepts
  - noun-phrase junk concepts
  - field distinctness collapse across `summary`, `primer`, `mnemonic`, `commonConfusion`, `transferHook`
  - relation specificity and graph balance
  - shell-mapper fail-closed behavior when engine fields are absent
  - Atlas skill derivation and prerequisite logic
  - bridge/handoff integration beyond narrow helpers
  - extension unpacked-build hygiene after artifact cleanup

## Build and repo hygiene issues

- The repo contains obvious disposable or duplicated artifacts:
  - `.playwright-cli/**`
  - `output/**`
  - root screenshots
  - `apps/*/dist`
  - duplicate generated extension artifacts at `apps/extension/*`
  - likely detached `dse-extracted/`
- `.claude/worktrees/**` is a major duplication hotspot.
- Empty or staging-style folders remain in-tree.
- Root prompt/spec markdown sprawl is high and not part of the runtime product.

## Truth-boundary risks

- The current shell can overstate semantic confidence by fabricating study artifacts from labels/keywords.
- The current Atlas surface can imply a real progression system where only concept/module aggregation exists.
- The current evidence and relation model is too weak to support strong semantic claims without caveat.

## Prioritized plan

### P0

- Completed:
  - fixed semantic evidence loss and repetition at the source
  - added evidence-lane-aware field distinctness gating
  - stopped several shell-layer fallback fabrications from masking weak engine output
  - rebuilt Atlas into a deterministic skill-tree progression model with skill nodes, prerequisites, chapter rewards, and assignment-skill readiness

### P1

- Completed:
  - purged disposable `output/**` artifacts
  - established `apps/extension/dist` as the canonical unpacked build output
  - added adversarial regression coverage for semantic collapse and Atlas skill derivation
- Remaining:
  - deeper file breakup for `AeonthraShell.tsx`, `App.tsx`, and `service-worker.ts`

### P2

- Tighten extension/service-worker structure, build hygiene, docs, and release hardening.
- Improve accessibility/performance on large Atlas and reader surfaces after the skill-tree overhaul lands.

## Verified commands run

- `npm run typecheck`
- `npm test`
- `npm run build`
- `git status --short`
- `Get-ChildItem` / `Get-Content` / `Select-String` across root, `apps/web`, `apps/extension`, `packages/*`, `docs`, `.omega`, `.agents`

## Verified vs assumed vs unresolved

- Verified:
  - file concentration risks
  - final typecheck/tests/build passing
  - duplicate generated extension artifact pattern
  - repo bloat hotspots
  - semantic failure mechanisms described above
  - semantic distinctness regression now fixed in the current worktree
- Assumed:
  - some root prompt/spec markdowns are historical rather than active contributor workflow
- Unresolved:
  - exact live-bundle incidence rates for each semantic failure mode before larger mixed-source fixtures are added
