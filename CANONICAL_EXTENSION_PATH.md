# Canonical Extension Path

## Exact unpacked folder to load

- Load Chrome from:
  - `C:\Users\aquae\OneDrive\Documents (Dokyumento)\Canvas Converter\apps\extension\dist`

## Exact build command

```powershell
npm run build:extension
```

## Exact source-of-truth files

- Source code:
  - `apps/extension/src/**`
  - `apps/extension/manifest.json`
  - `apps/extension/scripts/build.mjs`
- Generated unpacked artifact:
  - `apps/extension/dist/**`

## Current build marker

- `apps/extension/dist/build-info.json`
- Current verified marker after this pass:
  - `version`: `1.0.0`
  - `builtAt`: `2026-04-18T08:47:26.683Z`
  - `sourceHash`: `4f9bc9b35028f9e61fc2a619ae997ced1b5d05bc3a1ca5c58b9d0d2924ad2e1f`
  - `unpackedPath`: `apps/extension/dist`
  - `markerPath`: `build-info.json`

## How to tell if Chrome is loading the wrong build

1. Open the extension side panel.
2. Check the `Build Identity` card.
3. If the card is missing or says `build-info.json` could not be read, Chrome is not using the current canonical `dist` output.
4. If the `builtAt` timestamp does not change after `npm run build:extension` and a Chrome reload, Chrome is still loading a stale unpacked folder.
5. If Chrome was pointed at `apps/extension` instead of `apps/extension/dist`, the manifest exists but the referenced built files do not, so that load target is wrong.
6. If the popup `START DIAGNOSTICS` box shows `worker-sig missing` or says the expected worker signature is not `sw-recovery-trace-v5`, the popup is newer than the live service worker. Use `RESTART EXTENSION RUNTIME` in the popup before drawing any capture conclusions.

## Current capture-start fallback truth

- If `START DIAGNOSTICS` reports `detect live-content-script`, capture starts in the current Canvas tab.
- If `START DIAGNOSTICS` reports `detect url-fallback`, the worker now falls back to the older known-good behavior and opens a fresh background `modules` tab, then waits for the declarative Canvas content script to attach on that navigation before capture starts.
- The worker keeps the DOM-seeded auto-start path as a lower-level recovery seam only when a same-tab receiver is still missing after verified injection.

## Why `apps/extension` is not the load target

- `apps/extension/manifest.json` references built runtime files such as:
  - `service-worker.js`
  - `content-canvas.js`
  - `content-bridge.js`
  - `popup.html`
  - `side-panel.html`
  - `options.html`
- Those files are generated into `apps/extension/dist`, not into `apps/extension/`.

## Build-identity marker added in this pass

- `apps/extension/scripts/build.mjs` now writes and validates `build-info.json`.
- `apps/extension/src/service-worker.ts` reads that marker.
- `apps/extension/src/side-panel.tsx` renders the marker so stale-build confusion is visible at runtime.
