# TODO NOW

## Highest leverage next work

- Expand the semantic-garbage regression corpus with more wrapper-title, front-matter, and textbook-container cases so future concept/theme/readiness leaks stay closed after the support-gate relaxation.
- Project canonical readiness and due-trust metadata through the compatibility boundary so the app stops reparsing trust from raw prose:
  - carry `readiness` / `dueTrust` instead of reconstructing `Unmapped` and due state from shell heuristics
  - keep grounded requirement chains and evidence visible without flattening them into generic fallback strings
  - make sure `data.synthesis` consumers do not outlive the richer `skillTree` / readiness truth
- Audit the remaining shell consumers of `data.synthesis` versus `skillTree` for any last heuristic fallback that still weakens Atlas or assignment surfaces:
  - remove stale display-time slices where they hide real support data
  - keep the learner-facing summary truthful when support is grounded but incomplete
- Run one live textbook import retest with a real PDF now that the pre-page progress/fallback repair is in:
  - confirm the intake card advances past `Loading PDF runtime` / `Opening PDF document`
  - confirm a healthy file reaches page extraction instead of staying at `0%`
  - if a file still fails, record the exact final textbook error message rather than only the stalled percentage

## Repo hygiene and determinism

- Delete the remaining non-UTF8 `output/*.log` files once the environment allows direct filesystem deletion, or keep recording the desktop-policy blocker.
- Decide whether any additional historical artifacts still belong in the repo after the ultimate purge.

## Product hardening

- Run one authenticated Chrome -> Canvas -> SENTINEL manual retest on a real course to confirm the popup's `RESTART EXTENSION RUNTIME` path reloads the worker to `worker-sig sw-recovery-trace-v5`, the hybrid launch policy chooses the correct tab strategy, the overlay is visible on the launch surface, and import still completes end-to-end.
- Add one UI-level regression around PDF intake stage copy so future pre-page stalls cannot silently regress back to a `0%` frozen state.
- Add mounted UI coverage for extension-side `Build Identity` and `Live Capture Forensics` cards.
- Strengthen regression coverage for visited-session save and clear targeting plus interrupted partial-capture cleanup.
