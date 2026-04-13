# TODO NOW

## Wave-3 UI/UX — partially complete, outstanding items

- **Negation-only Core Ideas in Oracle**: concept `primer` / `summary` fields sometimes contain only "X is not Y" sentences. `isNegationOnlyText` from wave-3 filters these in KEY DISTINCTION but they can still appear in CORE IDEAS (`conceptCoreText` / `conceptDepthText`). Apply the same filter in the depth candidates loop.
- **Attribute phase cross-concept contamination**: when a course has concepts with overlapping keywords, the Attribute (note-taking) phase sometimes surfaces keyword hints from the wrong concept. Root cause not yet traced — needs diagnostic run.
- **Vite HMR not picking up `demo.ts` changes**: `demo.ts` changes require a full Vite server restart to propagate. Workaround: fixes applied at shell-mapper.ts layer. Long-term: investigate why `demo.ts` is not in the HMR graph (possible symlink or tsconfig path alias exclusion).

## Infrastructure

- Add golden regression fixtures for clone-heavy, admin-orientation, thin-discussion, and full-academic bundles so the pipeline has automated protection against scoring regressions.
- Add route-aware session capture for Canvas so the extension can accumulate visited course pages instead of only on-demand snapshots.
- Introduce larger FOUNDRY JSON fixtures for Canvas, textbook, and mixed-source imports.
- Add PDF/TXT import pipeline and cleanup heuristics inside the web app.
- Expand deterministic memory beyond notes into a real EMBER store for confusion patterns, aliases, and user corrections.
- Add higher-confidence integration coverage for capture → done learning → bridge import → workspace render.
- Wire vitest monorepo alias resolution so `@learning/schema` resolves correctly in test runs (currently pre-existing failure).
