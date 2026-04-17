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
  - `builtAt`: `2026-04-17T08:24:40.799Z`
  - `sourceHash`: `86681f705eeda2e233d74fd990a68548df4aaedf25e81da6542bb1245e9590bf`
  - `unpackedPath`: `apps/extension/dist`
  - `markerPath`: `build-info.json`

## How to tell if Chrome is loading the wrong build

1. Open the extension side panel.
2. Check the `Build Identity` card.
3. If the card is missing or says `build-info.json` could not be read, Chrome is not using the current canonical `dist` output.
4. If the `builtAt` timestamp does not change after `npm run build:extension` and a Chrome reload, Chrome is still loading a stale unpacked folder.
5. If Chrome was pointed at `apps/extension` instead of `apps/extension/dist`, the manifest exists but the referenced built files do not, so that load target is wrong.

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
