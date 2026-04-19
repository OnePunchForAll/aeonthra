# AEONTHRA Lite

A single-folder, from-scratch study workspace. Deterministic, offline, no Canvas assumptions.

## What it does
- **Ingest**: paste text, upload PDF / TXT / HTML, paste a page's HTML with its URL, or import a JSON file from the AEONTHRA browser extension (`ExtractedPage` or `CaptureBundle` — including `generic-page`-tagged bundles).
- **Analyze**: a deterministic engine extracts concepts using explicit definitions (`X is Y` / `X refers to Y`), repeated capitalized noun phrases, quoted terms, and heading support. TF-IDF weighting + provenance gates. Every concept carries a score, admission reasons, and evidence spans back to the source.
- **Study**: auto-generated fill-in-the-blank questions with distractors. Mastery tracked per concept in `localStorage`.
- **Notes**: per-source notes + "all sources" scope. Save / load `.txt` via File System Access API (Chromium) with download fallback. Concepts and the whole workspace both exportable.

## Run it
```bash
cd aeonthra-lite
npm install
npm run dev      # http://localhost:5180
npm run build    # tsc + vite build → dist/
```

## Why it exists
The main AEONTHRA app is a 1950-line animated shell coupled to Canvas-specific validation, extension handoff, and a multi-package monorepo. This is the same engineering idea reduced to its core loop: ingest → analyze → study → notes. No shell, no extension coupling, no course-identity checks. Useful as a second opinion against the bigger app, or to drop onto any site's content (via paste, HTML, or the extension's generic-page JSON).

## Engine notes
File: [`src/engine.ts`](src/engine.ts).

Gate stack (fail-closed):
1. Hard-noise filter (`HARD_NOISE` — LMS chrome, navigation strings).
2. Generic-wrapper reject (Week N, Module N, Discussion, etc.).
3. Label gate (`evaluateLabel`) — length, token shape, stopword-heavy, clause-opener heads.
4. Candidate admission — explicit definition **or** heading support **or** ≥ 2 mentions.
5. Evidence admission — a concept must have at least one definitional / explanatory / heading-backed span.

Scoring: `40 + mentions × log(1 + N/df) × headingBonus × defBonus`, capped at 100. Stable across re-runs via `deterministicHash` over concept IDs, labels, scores, and evidence IDs.

Cross-linking: documents are compared by shared meaningful-token sets; links shown when overlap ≥ 4 tokens, top 50 sorted by density.

## File map
```
src/
  main.tsx      - React entry
  App.tsx       - single-component UI (ingest / concepts / study / notes)
  engine.ts     - deterministic semantic engine
  extract.ts    - text / HTML / PDF / JSON import
  notes.ts     - .txt save/load (File System Access + fallback)
  storage.ts    - workspace persistence + FNV-ish stableHash
  types.ts      - shared types
  styles.css    - dark UI
index.html
vite.config.ts
tsconfig.json
package.json
```

## Honest caveats
- Concept extraction is conservative. If your sources rely on implicit definitions (narrative with no `X is Y`), you'll get fewer concepts. Tune `passesMinMentions` / distinct sentence patterns in `engine.ts` if you want to loosen the gate.
- PDF extraction strips formatting; dense multi-column PDFs may collapse strangely. Use the paste path for those.
- No backend. Everything in `localStorage` and the File System Access API.
- No automated tests in this starter (the main repo has 149 tests across its engine, extension, and web). Add Vitest if you want to freeze the gates against corpus drift.
