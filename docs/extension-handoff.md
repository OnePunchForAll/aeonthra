# Extension Handoff

The extension and app communicate through a narrow page bridge.

## Primary messages

- `NF_IMPORT_REQUEST`
- `NF_PACK_READY`
- `NF_PACK_ACK`
- `NF_IMPORT_RESULT`

Diagnostic `NF_PING` / `NF_PONG` traffic still exists for bridge checks, but it is not part of the normal learner flow.

## Capture modes

- `Complete Snapshot`: broad recovery-oriented capture with raw HTML, metadata, files, discussions, and larger output.
- `Learning Content Only`: smaller forge-ready capture that strips more Canvas chrome and keeps the most useful teaching text.
- `Visited-page session`: bounded learning-mode-only accumulation of pages the learner actually visited, with explicit save/clear controls.

## Current flow

1. User starts `Capture Supported Content` from the popup or side panel, or saves a visited-page session as a normal capture.
2. The background worker saves the finalized bundle as the pending pack.
3. The extension opens or focuses the configured AEONTHRA classroom URL when the user clicks `Open AEONTHRA` or when auto-handoff is enabled.
4. The page bridge and worker coordinate a pending-pack handoff around `NF_IMPORT_REQUEST` and `NF_PACK_READY`.
5. The app imports the pack, persists it locally, and replies with `NF_PACK_ACK`.
6. The extension clears the pending pack and may auto-delete imported history if that setting is enabled.

## Interruption caveat

If a full capture tab closes mid-run, the worker can keep temporary partial state locally for recovery, but that state is not the same thing as a saved capture in normal history.

## Supported classroom URLs

Direct handoff only works when the page bridge can load on the classroom origin. In this repo that means:

- `https://*.github.io/*`
- `http://localhost/*`
- `http://127.0.0.1/*`

## Fallback

If the bridge is unavailable because of page timing or content-script conditions, the manual JSON export path remains available. That fallback is intentional and part of the reliability story.
