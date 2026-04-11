# IMPLEMENTATION LEDGER

## 2026-04-09

### Completed

- Scaffolded the local-first monorepo with shared schema, deterministic content engine, static React app, and MV3 extension.
- Expanded the learning runtime into a five-phase, twenty-submode protocol with four engine profiles.
- Added a typed extension-to-app bridge:
  - pending bundle storage in the extension
  - `Done Learning` direct handoff
  - page bridge messages for import request, pack ready, ack, and ping/pong
  - manual JSON export fallback remains intact
- Hardened stored bundle parsing through schema validation in both extension and web app.
- Added repo operating artifacts and repo-local skills scaffolding under `.agents/skills`.
- Added architecture, handoff, and truth-boundary docs.

### Current vertical slice

- Capture highlight or visible page in SENTINEL.
- Queue bundle and open/focus ATLAS with `Done Learning`.
- Import queued pack automatically when the bridge is available.
- Fall back to JSON export/import when the bridge is unavailable.
- Generate the full deterministic study protocol entirely in-browser.
