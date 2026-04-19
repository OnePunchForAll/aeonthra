# TODO NOW

## Highest leverage next work

- Surface the new `canonicalArtifact` in user-inspectable export and diagnostics paths:
  - add a web-side canonical inspector with semantic / structural / provenance hashes and coverage counts
  - include canonical artifact summaries in offline-site export and replay diagnostics
  - expose provenance-lane differences between API, HTML fetch, DOM session capture, textbook import, and manual/demo inputs
- Start the compatibility migration away from synthesis-scoped storage identity:
  - version note/progress scope so legacy `deterministicHash` and future canonical scope can coexist
  - add replay/import migration tests before any cutover from `learning.synthesis.deterministicHash`
  - shadow-compare canonical hash stability against the current synthesis hash on the frozen fixture corpus
- Decompose the shell at the highest-friction seams instead of adding more copy-only polish:
  - split `AeonthraShell.tsx` by route/view
  - remove `@ts-nocheck`
  - replace remaining user-facing forge/oracle/gym terminology with grounded study-workspace language
- Run one authenticated Chrome -> Canvas -> extension -> import -> shell proof using the new provenance fields as the oracle:
  - confirm full capture writes explicit provenance lanes per item/resource
  - confirm mixed-noise pages do not create shell assignments or wrapper module titles
  - confirm live import preserves the new canonical artifact through to the app

## Repo hygiene and determinism

- Decide whether `Canvas-Converter-fixed-source/`, `aeonthra-lite/`, `aeonthra-lite-extension/`, and the remaining tracked root zip archives should be archived out of the repo after a deliberate rollback review.
- Split `packages/schema/src/index.ts` into smaller `capture`, `bridge`, `learning`, and `hash` modules once the new canonical fields settle.

## Product hardening

- Add one UI regression around the renamed overview/practice/viewpoints shell labels and the calmer token set so the trust-tone pass cannot silently revert.
- Add mounted UI coverage for extension-side `Build Identity`, `Live Capture Forensics`, and future canonical inspector cards.
- Strengthen regression coverage for visited-session save and clear targeting plus interrupted partial-capture cleanup.
