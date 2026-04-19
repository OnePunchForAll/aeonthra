# Local Fixes Applied

## Web app
- Replaced the live shell handoff with a simpler **Study Workbench** view after synthesis.
- Made Canvas optional at intake; support sources can now start a workspace.
- Added support for importing generic `CaptureBundle` JSON as support sources.
- Added a **source review** layer so noisy pages can be excluded before synthesis.
- Added optional canonical URL support for pasted/imported textbook sources.
- Added local notes and results export as `.txt`.

## Manual page JSON support
- Added manual page JSON export from the extension service worker.
- Added popup buttons so the current page can be exported from **any webpage**, not just Canvas.

## Deterministic truth gating
- Added review/gating logic to suppress boilerplate, onboarding content, weak fragments, and suspicious due dates before they reach the study surface.
- Added a cleaner workbench mapper that prefers fewer trustworthy tasks/concepts over noisy semantic clutter.
