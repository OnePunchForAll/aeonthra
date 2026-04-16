# TODO NOW

## Highest leverage next work

- Add true end-to-end coverage for `capture -> open AEONTHRA -> bridge import -> durable persist -> NF_PACK_ACK cleanup -> workspace render`.
- Replace the single pending-pack slot with a queued or correlated handoff model so overlapping imports cannot overwrite each other.
- Break down `apps/web/src/AeonthraShell.tsx`, `apps/web/src/App.tsx`, and `apps/extension/src/service-worker.ts` into smaller maintained seams now that the major repair pass is stable.

## Semantic and Atlas breadth

- Extend the golden fixture suite beyond thin-discussion, clone-heavy/admin-heavy, and transfer/confusion regressions into larger mixed-source and contradictory-source captures.
- Add more Atlas progression tests around recovery loops, chapter reward ordering, and assignment-readiness edge cases.
- Expand deterministic memory beyond notes into a real EMBER store for confusion patterns, aliases, and user corrections.

## Platform hygiene

- Expand the visited-page session path with stronger regression coverage and decide whether saved sessions should optionally open AEONTHRA immediately after materialization.
- Investigate why `demo.ts` still needs a full Vite restart to propagate in dev mode.
