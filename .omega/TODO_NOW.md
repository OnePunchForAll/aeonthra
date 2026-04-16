# TODO NOW

## Wave-3 UI/UX - partially complete, outstanding items

- **Reader/Attribute interaction coverage**: the fail-closed dominant-concept resolver now protects hints/highlights/practice selection, but the next step is shell-level interaction coverage that proves ambiguous sections do not create a `conceptId` or mastery bump through the full reader flow.
- **Vite HMR not picking up `demo.ts` changes**: `demo.ts` changes require a full Vite server restart to propagate. Workaround: fixes applied at `shell-mapper.ts` layer. Long-term: investigate why `demo.ts` is not in the HMR graph (possible symlink or tsconfig path-alias exclusion).

## Infrastructure

- Extend the new golden regression fixture suite beyond thin-discussion, clone-heavy/admin-orientation, and full-academic bundles into larger mixed-source and cross-term captures.
- Expand the new route-aware Canvas session capture with stronger regression coverage and decide whether saved sessions should optionally open AEONTHRA immediately after materialization.
- Introduce larger FOUNDRY JSON fixtures for Canvas, textbook, and mixed-source imports.
- Harden PDF/DOCX/TXT intake cleanup heuristics with regression fixtures for messy textbook inputs. Completed in the 2026-04-15 intake pass; next step is larger fixture breadth rather than more cleanup heuristics.
- Expand deterministic memory beyond notes into a real EMBER store for confusion patterns, aliases, and user corrections.
- Add higher-confidence integration coverage for capture -> open classroom / auto-handoff -> bridge import -> `NF_PACK_ACK` cleanup -> workspace render.
- Add app-level regression coverage for bridge/runtime flows beyond request gating, intake classification, restore hydration, and reset persistence.
