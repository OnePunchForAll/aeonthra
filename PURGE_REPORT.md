# Purge Report

Date: 2026-04-16
Workspace: `C:\Users\aquae\OneDrive\Documents (Dokyumento)\Canvas Converter`

This report was started as an audit-first purge ledger and is now updated with the deletions performed in this pass.

## Definitely delete

- `output/dev-web-app.log`
- `output/dev-web.log`
- `output/playwright/*`
- root mirrored extension build artifacts in `apps/extension/`:
  - `content-bridge.js`
  - `content-canvas.js`
  - `global.css`
  - `icon.ico`
  - `options.css`
  - `options.html`
  - `options.js`
  - `popup.css`
  - `popup.html`
  - `popup.js`
  - `service-worker.js`
  - `side-panel.css`
  - `side-panel.html`
  - `side-panel.js`
  - `tokens.css`

Rationale:
- These are logs, screenshots, or duplicate generated extension artifacts that no longer need to live in the tracked source tree.

## Likely delete

- `forge-screen.png`
- `home-screen.png`
- `workspace-screen.png`
- `.playwright-cli/wave*.png`
- `dse-extracted/`
- `AEONTHRA_LIVE_AUDIT_RESULTS.md`
- `AEONTHRA_TEST_RESULTS_FIX.md`
- `AEONTHRA_EXTENSION_EMERGENCY_FIX.md`

Rationale:
- These appear to be disposable screenshots, detached extracted artifacts, or one-off tactical notes rather than active product or contributor workflow.

## Keep

- `AGENTS.md`
- `.omega/**`
- `.agents/skills/**`
- `README.md`
- `docs/**`
- `apps/web/src/**`
- `apps/extension/src/**`
- `apps/extension/public/**`
- `apps/extension/scripts/build.mjs`
- `apps/extension/manifest.json`
- `packages/**/src/**`
- all active tests under `apps/**` and `packages/**`

Rationale:
- These are active source-of-truth files, governance files, or current documentation/tests.

## Archive only if needed

- `.claude/worktrees/**`
- root prompt/spec markdown corpus:
  - `AEONTHRA_BREATH_PROMPT.md`
  - `AEONTHRA_COMPETITION_EDGE.md`
  - `AEONTHRA_CORRECTIVE.md`
  - `AEONTHRA_DEFINITIVE_FIX.md`
  - `AEONTHRA_ENGINE_FORCING_PROMPT.md`
  - `AEONTHRA_EXTENSION_PROMPT.md`
  - `AEONTHRA_GRAND_SCALE.md`
  - `AEONTHRA_NOVEL_INTERACTIONS_PROMPT.md`
  - `AEONTHRA_PERFORMANCE_ARCHITECTURE.md`
  - `AEONTHRA_POLISH_PASS.md`
  - `AEONTHRA_SPEC.md`
  - `canvas-converter-neural-forge-v5-monolithic-codex-build-contract.md`
  - `omega-forge-one-pass-codex-master-spec.md`
- ad hoc QA harness files in `.playwright-cli/` that are not part of the tracked test suite

Rationale:
- These look historical or duplicate-heavy, but some may still matter to the user's private workflow. They should be removed only when their non-runtime status is clearly documented.

## Exact files and folders inspected

- root files
- `.claude/worktrees/**`
- `.playwright-cli/**`
- `output/**`
- `apps/web/**`
- `apps/extension/**`
- `packages/content-engine/**`
- `packages/interactions-engine/**`
- `packages/schema/**`
- `docs/**`
- `.omega/**`
- `.agents/skills/**`

## Exact files and folders removed

- `output/dev-web-app.log`
- `output/dev-web.log`
- `output/playwright/atlas-audit-atlas-desktop.png`
- `output/playwright/atlas-audit-atlas-mobile.png`
- `output/playwright/atlas-audit-home-desktop.png`
- `output/playwright/atlas-audit-preview.err.log`
- `output/playwright/atlas-audit-preview.log`
- `output/playwright/atlas-audit-web.err.log`
- `output/playwright/atlas-audit-web.log`
- `apps/extension/content-bridge.js`
- `apps/extension/content-canvas.js`
- `apps/extension/global.css`
- `apps/extension/icon.ico`
- `apps/extension/options.css`
- `apps/extension/options.html`
- `apps/extension/options.js`
- `apps/extension/popup.css`
- `apps/extension/popup.html`
- `apps/extension/popup.js`
- `apps/extension/service-worker.js`
- `apps/extension/side-panel.css`
- `apps/extension/side-panel.html`
- `apps/extension/side-panel.js`
- `apps/extension/tokens.css`

## Exact files and folders intentionally preserved

- `AGENTS.md`
- `.omega/**`
- `.agents/skills/**`
- active source files in `apps/` and `packages/`
- current docs in `README.md` and `docs/**`
- current tests in `apps/**` and `packages/**`

## Notes

- `apps/extension/dist/` is now the canonical unpacked-extension output. The deleted root JS/HTML/CSS/icon files were duplicate generated mirrors, not source of truth.
- `.claude/worktrees/**` is a special case because it contains tracked gitlinks/submodule-like entries and local duplicate worktree directories. Removal must be explicit and documented.
