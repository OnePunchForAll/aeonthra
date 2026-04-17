# Live Proof Checklist

## Preflight

1. Run `npm run build:extension`.
2. In Chrome, remove any unpacked load that points anywhere except `apps/extension/dist`.
3. Reload the unpacked extension from `apps/extension/dist`.
4. Open the side panel and confirm the `Build Identity` card is present.
5. Confirm `build-info.json` is readable and `builtAt` reflects the latest rebuild.

## Exact page to retest

- Retest the same Canvas course and page flow that previously ended with `No Importable Pages Captured`.
- If the original failing page is unknown, start from the same course home/modules page and repeat the same full-course capture path.

## Expected behavior after this pass

1. `Discovery Snapshot` shows non-zero queue counts.
2. `Live Capture Forensics` begins recording verdicts.
3. `Persisted` or `Last persisted item` changes from zero/null once the first real page is retained.
4. If the bundle is importable, the run ends with `Capture Complete` and a saved capture appears under `Latest Capture`.
5. `Open + Import` should queue/import the new capture without falling back to a stale queued handoff.

## Exact debug outputs to inspect if it still fails

### In the side panel

- `Build Identity`
- `Live Capture Forensics`
- `Final inspection`
- `finalErrorMessage`
- recent rejection verdicts
- `Last persisted item`

### What to record

- `queueTotal`
- `partialBundleItemCount`
- `partialBundleSourceUrlCount`
- `finalInspection.code`
- every visible `itemVerdict` URL and message
- the exact `builtAt` and `sourceHash`

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

- Import request fails after a successful capture
  - Record the bridge error and confirm the queued handoff matches the just-finished capture, not an older pack.

## Manual evidence to keep

- Screenshot of the side panel `Build Identity` and `Live Capture Forensics` cards
- Exact failing Canvas page URL
- Final error text
- Whether `Latest Capture` appeared
- Whether AEONTHRA imported the new capture and acknowledged it
