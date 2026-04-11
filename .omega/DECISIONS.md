# DECISIONS

## 2026-04-09

### Use the existing repo layout and map spec codenames onto it

- Decision: keep `apps/extension` and `apps/web` rather than renaming the folders mid-stream.
- Why: it preserves the current working monorepo while still allowing docs and skills to refer to SENTINEL and ATLAS conceptually.

### Model the transport pack as the current capture bundle contract

- Decision: alias `CourseKnowledgePack` to the existing `CaptureBundle` contract for this vertical slice.
- Why: it gives the bridge a typed, validated transport immediately without inventing a second near-duplicate schema.

### Prefer bridge-then-fallback over hard failure

- Decision: `Done Learning` first queues a direct handoff and then falls back to JSON export if the page bridge is unavailable.
- Why: this matches the local-first truth boundary and avoids pretending the bridge is universally reliable on every page load timing edge case.
