# Extension Handoff

The extension and app communicate through a narrow page bridge.

## Messages

- `NF_IMPORT_REQUEST`
- `NF_PACK_READY`
- `NF_PACK_ACK`
- `NF_IMPORT_RESULT`
- `NF_PING`
- `NF_PONG`

## Current flow

1. User starts a course capture from the popup or side panel.
2. The background worker saves the finalized bundle as the pending pack.
3. The extension opens or focuses the configured AEONTHRA classroom URL when the user clicks `Open AEONTHRA` or when auto-handoff is enabled.
4. The page bridge requests any pending pack.
5. The background worker returns `NF_PACK_READY`.
6. The app imports the pack and replies with `NF_PACK_ACK`.
7. The extension clears the pending pack.

## Supported classroom URLs

Direct handoff only works when the page bridge can load on the classroom origin. In this repo that means:

- `https://*.github.io/*`
- `http://localhost/*`
- `http://127.0.0.1/*`

## Fallback

If the bridge is unavailable because of page timing or content-script conditions, the manual JSON export path remains available. That fallback is intentional and part of the reliability story.
