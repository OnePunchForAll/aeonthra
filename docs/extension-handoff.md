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

1. User captures content in the extension.
2. User clicks `Done Learning`.
3. The background worker saves the current bundle as the pending pack.
4. The extension opens or focuses the workspace and nudges the page bridge.
5. The app requests any pending pack.
6. The background worker returns `NF_PACK_READY`.
7. The app imports the pack and replies with `NF_PACK_ACK`.
8. The extension clears the pending pack.

## Fallback

If the bridge is unavailable because of page timing or content-script conditions, the manual JSON export path remains available. That fallback is intentional and part of the reliability story.
