# Execution Plan Final Pass

Date: 2026-04-16

## Objective

Leave the repo materially better in one run by fixing deterministic semantic quality, replacing Atlas with a real skill-tree progression surface, purging repo bloat, tightening brittle architecture, and verifying honestly.

## Phase order

1. Audit and purge planning
2. Semantic engine overhaul
3. Atlas skill-tree overhaul
4. Structural refactor and cleanup
5. Extension and handoff tightening
6. Regression expansion and verification
7. Docs and `.omega` truth alignment

## P0 execution

### Semantic engine

- Make source-quality assessment authoritative inside the engine build path.
- Replace regex-centric HTML extraction/segmentation hotspots with structure-aware block extraction.
- Split candidate extraction from stabilization scoring.
- Demote title/heading-only seeds unless confirmed by body evidence.
- Rework relation construction from final deduped concepts, not pre-dedup heuristic neighbors.
- Introduce deterministic provenance and field-attribution structures.
- Add field-distinctness gating:
  - prefer distinct evidence lanes
  - blank weak duplicate fields instead of templating them
- Reduce or remove shell-level semantic fabrication so engine weakness stays visible and fixable.

### Atlas

- Introduce a real deterministic skill model:
  - skill nodes
  - prerequisite edges
  - chapter rewards
  - assignment skill requirements
  - readiness and recovery loops
- Derive skills from chapters, concept clusters, assignment signals, and mastery state.
- Replace the current module climb surface with a skill-tree progression map.
- Keep AEONTHRA visual quality while making progression truthful.

## P1 execution

- Delete generated/log/disposable artifacts and end duplicate extension output at the package root.
- Refactor the worst hotspots into clearer seams without breaking deterministic IDs/hashes unnecessarily.
- Add adversarial fixtures and regression tests for:
  - nested HTML/wrapper captures
  - concept junk extraction
  - field repetition collapse
  - relation drift
  - skill derivation
  - assignment skill readiness

## P2 execution

- Tighten extension/service-worker boundaries where the cleanup materially reduces brittleness.
- Update docs, ledgers, and truth claims to match the post-overhaul reality.

## Guardrails

- No runtime LLMs
- No backend
- No auth
- No analytics/telemetry
- No fake semantic claims
- No cosmetic-only reskin
- Prefer omission over generic repetition
- Preserve local-first architecture and strongest existing surfaces

## Verification target

- `npm run typecheck`
- `npm test`
- `npm run build`
- extension build validation
- targeted regression tests for new semantics and Atlas progression

## Completion checkpoint

- Completed:
  - semantic evidence-lane hardening
  - Atlas skill-tree derivation and live-shell rollout
  - replay/storage/handoff hardening
  - extension truthfulness copy pass
  - extension build-path cleanup
  - docs and `.omega` alignment
  - final `typecheck`, `test`, and `build` verification
- Remaining by design:
  - deeper breakup of the remaining monolith files
  - queued/correlated bridge handoff model
  - broader mixed-source and contradictory-source fixture expansion

## Risks to manage

- deterministic IDs and `learning.synthesis.deterministicHash` can shift when relation/provenance/field logic changes
- unpacked extension path changes must remain documented and buildable
- refactoring large files without typed seams can create churn if not staged carefully
