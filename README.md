# AEONTHRA

AEONTHRA is a local-first Canvas learning workspace: a Chrome extension captures course material, a static web app forges it into deterministic study systems, and the student keeps control of everything without a backend or runtime AI calls.

Repo docs also use the OMEGA FORGE mission codenames: `SENTINEL` for the extension, `ATLAS` for the web app, and `FOUNDRY` for the shared contracts. The shipped product/UI name in this repo is `AEONTHRA`.

## What it does

- Captures Canvas assignments, discussions, quizzes, pages, modules, and supporting metadata through a Manifest V3 extension
- Imports capture bundles into a static React/Vite classroom that runs on GitHub Pages or locally
- Builds deterministic concepts, relationships, timelines, assignment prep, and Neural Forge study runs in a web worker
- Supports one-click demo mode, textbook paste import, PDF textbook extraction, concept-map PNG export, forge summary export, and text-to-speech

## Why it stands out

- Zero hosted API requirement for the main experience
- Deterministic extraction and study generation
- Extension-to-classroom handoff for a near one-click workflow
- Premium full-screen study surfaces instead of a plain dashboard
- Honest failure behavior: when quality is weak, AEONTHRA leaves fields empty instead of inventing nonsense

## Main surfaces

- `Mission Control`: course overview, active work, concept momentum, and interaction launch points
- `Timeline`: semester-scale horizontal planning surface
- `Concept Map`: large concept constellation with mastery coloring and export
- `Neural Forge`: five-phase guided study run with gating, ambient primers, and summary export
- `Assignment Workbench`: gated writing and interaction layer for captured assignments

## Project structure

- `apps/web` - static AEONTHRA classroom
- `apps/extension` - MV3 Chrome extension for Canvas capture and bridge handoff
- `packages/content-engine` - deterministic extraction pipeline
- `packages/interactions-engine` - deterministic ambient and novel interaction systems
- `packages/schema` - shared schemas and bridge contracts

## Quick start

```bash
npm install
npm run typecheck
npm test
npm run build
```

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

Load the unpacked extension from the repo's `apps/extension` folder.

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

## Demo mode

If you do not have a Canvas capture yet, open the web app and click `OPEN NEURAL FORGE DEMO`. AEONTHRA loads a prebuilt ethics course so the whole system is explorable immediately.

## Performance posture

- Workerized content processing for imported bundles
- Static-site-safe service worker registration in the web app
- Progressive processing overlay for large textbook imports
- Extension bridge now returns structured failures instead of dropping the message channel silently

## Accessibility and ergonomics

- Keyboard-accessible controls across the main shell
- Text-to-speech support for concept details and forge prompts via the browser speech engine
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

AEONTHRA is implemented as a real local-first learning product, not just a mockup. The remaining work is mostly refinement: deeper demo content, broader PDF chapter controls, and more aggressive performance polishing on the grand-scale views.
