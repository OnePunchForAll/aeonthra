# Live Proof Checklist

## Preflight

1. Run `npm run build:extension`.
2. In Chrome, remove any unpacked load that points anywhere except `apps/extension/dist`.
3. Reload the unpacked extension from `apps/extension/dist`.
4. Open the side panel and confirm the `Build Identity` card is present.
5. Confirm `build-info.json` is readable and `builtAt` reflects the latest rebuild.
6. Open the popup on the target Canvas page and confirm `START DIAGNOSTICS` does not show `worker-sig missing`. If it does, use `RESTART EXTENSION RUNTIME`, reopen the popup, and confirm the worker signature now reads `sw-recovery-trace-v5`.
7. Open the ATLAS app with the same imported workspace and use `#inspect` in the URL hash if you want the truth boundary to open directly on load.

## Exact page to retest

- Retest the same Canvas course and page flow that previously ended with `No Importable Pages Captured`.
- If the original failing page is unknown, start from the same course home/modules page and repeat the same full-course capture path.

## Expected behavior after this pass

1. `Discovery Snapshot` shows non-zero queue counts.
2. `Live Capture Forensics` begins recording verdicts.
3. `Persisted` or `Last persisted item` changes from zero/null once the first real page is retained.
4. If the bundle is importable, the run ends with `Capture Complete` and a saved capture appears under `Latest Capture`.
5. `Open + Import` should queue/import the new capture without falling back to a stale queued handoff.
6. If the popup initially shows `detect url-fallback`, the extension may open a fresh background Canvas modules tab before capture starts and wait there for the declarative Canvas receiver; that is now the intended reliability fallback, not a duplicate-launch bug.
7. After import, open the app `Inspect` route and confirm the canonical hashes, provenance coverage, provenance lanes, and capture lanes render without any regeneration step.
8. If the app does not open directly on the inspect surface, reload it with `#inspect` appended to the URL and confirm the same imported workspace still renders there without re-running synthesis.
9. Save a replay bundle and verify the exported JSON still contains `learningBundle.synthesis.canonicalArtifact` and that its hashes match the `Inspect` route.

## Exact debug outputs to inspect if it still fails

### In the side panel

- `Build Identity`
- `Live Capture Forensics`
- `Final inspection`
- `finalErrorMessage`
- recent rejection verdicts
- `Last persisted item`

### In the popup

- `START DIAGNOSTICS`
- `Worker code signature`
- `Build contradiction`
- the final signal line

### What to record

- `queueTotal`
- `partialBundleItemCount`
- `partialBundleSourceUrlCount`
- `finalInspection.code`
- every visible `itemVerdict` URL and message
- the exact `builtAt` and `sourceHash`
- the exact popup worker signature state before and after any runtime restart
- the app `Inspect` status, semantic hash, structural hash, and provenance hash after import
- whether the app needed `#inspect` to deep-link or whether the current shell state already opened the inspect surface

## Failure interpretation

- `No Importable Pages Captured` + `partialBundleItemCount = 0`
  - The live run retained zero items.
  - Use the verdict list to identify which specific pages were skipped or failed.

- `Capture Identity Rejected`
  - The run retained items, but course identity or host identity still disagreed.
  - Record `finalInspection.distinctIdentities`.

- Build card missing or stale
  - Chrome is loading the wrong unpacked folder or an older dist build.
  - Stop and fix the load path before drawing any capture conclusions.

- Popup says `worker-sig missing` or reports a signature other than `sw-recovery-trace-v5`
  - The popup page is newer than the running service worker.
  - Use `RESTART EXTENSION RUNTIME`, reopen the popup, and only continue once the worker signature matches.

- Import request fails after a successful capture
  - Record the bridge error and confirm the queued handoff matches the just-finished capture, not an older pack.

- Import succeeds but the app `Inspect` route is blank or missing hashes
  - Record whether `learningBundle.synthesis.canonicalArtifact` exists in the replay bundle and whether the shell route rendered stale data or no data.

## Manual evidence to keep

- Screenshot of the side panel `Build Identity` and `Live Capture Forensics` cards
- Exact failing Canvas page URL
- Final error text
- Whether `Latest Capture` appeared
- Whether AEONTHRA imported the new capture and acknowledged it
- Screenshot of the app `Inspect` route after import
