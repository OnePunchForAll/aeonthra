# TODO NOW

## Highest leverage next work

- Run one authenticated Chrome -> Canvas -> extension -> import -> inspect proof:
  - confirm the side panel shows provenance lanes and capture-strategy lanes for the finished run
  - confirm `Open + Import` reaches the app without stale queued-handoff confusion
  - confirm the app `Inspect` surface exposes the same canonical hashes and provenance summary as the saved replay bundle
- Continue shell decomposition until `apps/web/src/AeonthraShell.tsx` can drop `@ts-nocheck`:
  - pull the remaining `forge`, `explore`, and `gym` state core into standalone route surfaces
  - replace remaining theatrical copy and labels with grounded study-workspace language
  - type the remaining minified state buckets so `useState(null)` no longer explodes into `never` inference
- Start the compatibility migration away from synthesis-scoped storage identity:
  - version note/progress scope so legacy `deterministicHash` and future canonical scope can coexist
  - add replay/import migration tests before any cutover from `learning.synthesis.deterministicHash`
  - shadow-compare canonical hash stability against the current synthesis hash on the frozen fixture corpus

## Repo hygiene and determinism

- Decide whether `Canvas-Converter-fixed-source/`, `aeonthra-lite/`, and `aeonthra-lite-extension/` can be archived out of the repo after a deliberate rollback review.
- Expand the DOM-vs-API parity corpus only for cases where the API lane still preserves equivalent meaning, and keep list-structure checks in the structural-diff suite.

## Product hardening

- Add mounted UI coverage for extension-side `Build Identity` and `Live Capture Forensics`.
- Strengthen regression coverage for interrupted partial-capture cleanup beyond the storage boundary and through the service-worker handoff path.
- Record the live-proof evidence pack once a real authenticated Canvas session is available.
