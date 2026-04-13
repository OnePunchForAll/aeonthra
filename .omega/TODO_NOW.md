# TODO NOW

- Add golden regression fixtures for clone-heavy, admin-orientation, thin-discussion, and full-academic bundles so the pipeline has automated protection against scoring regressions.
- Add route-aware session capture for Canvas so the extension can accumulate visited course pages instead of only on-demand snapshots.
- Introduce larger FOUNDRY JSON fixtures for Canvas, textbook, and mixed-source imports.
- Add PDF/TXT import pipeline and cleanup heuristics inside the web app.
- Expand deterministic memory beyond notes into a real EMBER store for confusion patterns, aliases, and user corrections.
- Add higher-confidence integration coverage for capture → done learning → bridge import → workspace render.
- Wire vitest monorepo alias resolution so `@learning/schema` resolves correctly in test runs (currently pre-existing failure).
