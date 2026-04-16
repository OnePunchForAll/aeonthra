# AEONTHRA

AEONTHRA is a local-first Canvas learning workspace: a Chrome extension captures course material, a static web app forges it into deterministic study systems, and the student keeps control of everything without a backend or runtime AI calls.

Repo docs also use the OMEGA FORGE mission codenames: `SENTINEL` for the extension, `ATLAS` for the web app, and `FOUNDRY` for the shared contracts. The shipped product/UI name in this repo is `AEONTHRA`.

## What it does

- Captures supported Canvas course content through a Manifest V3 extension in either `Complete Snapshot` or `Learning Content Only` mode
- Supports a passive visited-page session path that can be saved into normal local capture history without a backend
- Imports capture bundles into a static React/Vite classroom that runs on GitHub Pages or locally
- Builds deterministic concepts, relations, Atlas skill-tree progression, assignment readiness, and Neural Forge study runs without runtime AI calls
- Exports offline replay bundles with scoped notes and deterministic hash validation

## Why it stands out

- Zero hosted API requirement for the main experience
- Deterministic extraction and study generation
- Extension-to-classroom handoff for a near one-click workflow
- Premium full-screen study surfaces instead of a plain dashboard
- Honest failure behavior: when quality is weak, AEONTHRA leaves fields empty instead of inventing nonsense

## Main surfaces

- `Home`: source-quality banner, readiness overview, and launch points into the current workspace
- `Atlas`: a deterministic skill tree with locked, available, in-progress, earned, mastered, assignment-readiness, and recovery states
- `Concepts`: concept roster and concept detail access
- `Learn`, `Read`, `Gym`, and `Oracle`: the current mounted study shell for guided practice, reader flow, contrast work, and synthesis views
- `Offline replay`: export and restore of deterministic site bundles with scoped notes

## Project structure

- `apps/web` - static AEONTHRA classroom
- `apps/extension` - MV3 Chrome extension for Canvas capture and bridge handoff
- `packages/content-engine` - deterministic extraction pipeline
- `packages/interactions-engine` - deterministic ambient and novel interaction systems
- `packages/schema` - shared schemas and bridge contracts

## Quick start

```bash
npm ci
npm run typecheck
npm test
npm run build
```

Use Node `24.x` and npm `11.x`.

### Run the web app locally

```bash
npm run dev:web
```

The local classroom is commonly available at:

`http://127.0.0.1:5176/`

### Build the extension

```bash
npm run build:extension
```

Load the unpacked extension from `apps/extension/dist`.

Canonical source of truth:

- `apps/extension/src/**` for extension code
- `apps/web/src/**` for the classroom
- `packages/**/src/**` for shared deterministic logic
- `apps/extension/dist/` as the generated unpacked-extension output

## Publish to GitHub Pages

AEONTHRA now includes a GitHub Pages workflow at `.github/workflows/deploy-pages.yml`.

One-time setup:

1. Push this repo to GitHub.
2. Open the repo's `Settings` -> `Pages`.
3. Set `Source` to `GitHub Actions`.
4. Push to `main` or `master`, or run the workflow manually from the `Actions` tab.

URL rules:

- If the repo is named `aeonthra`, the site URL will be `https://YOUR-USER.github.io/aeonthra/`
- If the repo is named `YOUR-USER.github.io`, the site URL will be `https://YOUR-USER.github.io/`

Until Pages is live, point the extension's AEONTHRA URL setting to your local app:

`http://127.0.0.1:5176/`

## Privacy note before going public

- Keep real Canvas captures, Playwright audit dumps, and exported assignment artifacts out of the public repo.
- The extension-to-classroom handoff is local. Captured course data does not need to be committed to GitHub for AEONTHRA to work.
- If you want the extension to forget imported captures after a successful handoff, enable the auto-delete option in the extension settings.
- Interrupted full-course captures can leave temporary local partial state until they are finalized or cleared; that is not the same as a saved history capture.

## Demo mode

If you do not have a Canvas capture yet, open the web app and click `OPEN NEURAL FORGE DEMO`. AEONTHRA loads a prebuilt ethics course so the whole system is explorable immediately.

## Performance posture

- Workerized content processing for imported bundles
- Static-site-safe service worker registration in the web app
- Progressive processing overlay for large textbook imports
- Atlas skill-tree materialization is derived once from synthesis output and learner progress rather than rebuilt ad hoc in the UI
- Extension bridge returns structured failures instead of dropping the message channel silently

## Accessibility and ergonomics

- Keyboard-accessible controls across the main shell
- Reduced-motion-friendly base shell
- Strong contrast dark theme and explicit status messaging

## Current scripts

- `npm run dev:web`
- `npm run test:web`
- `npm run build:web`
- `npm run build:extension`
- `npm run build`
- `npm run test`
- `npm run typecheck`

## Status

AEONTHRA is implemented as a real local-first learning product, not just a mockup. The current focus is reliability and semantic hardening: stronger regression coverage, cleaner extension build posture, broader fixture breadth, and deeper end-to-end verification of capture-to-workspace handoff.
