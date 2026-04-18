## What the app currently implies

- Step 2 already shows a Canvas Course Summary card, but the main step headline and the raw `status` string can still make the flow read like one generic import state.
- When textbook upload fails, the same raw `status` string is reused for textbook failure even though Canvas data is already loaded.
- The right-side `Textbook Status` card currently mirrors the raw `status` string instead of a structured intake state.

## What the screenshot/live evidence proves

- Canvas transfer/import already succeeded far enough to populate:
  - course title
  - item counts
- Therefore the Canvas import state and the textbook ingest state are separate realities.

## Where state/truth messaging is misleading

- `apps/web/src/App.tsx`
  - Step 2 headline only says `Provide the textbook`, without explicitly stating that Canvas is already loaded.
  - `Textbook Status` is fed from the global `status` string, so a textbook loader failure can visually dominate the screen without preserving the truth that Canvas import succeeded.
  - There is no explicit `Canvas Status` card on the intake steps.

## Required distinctions

### Canvas loaded

- Must say plainly that Canvas course data is loaded.
- Must remain visible when textbook import fails.

### Textbook missing

- Must say Canvas is loaded and a textbook is still required.

### Textbook ingest failed

- Must say Canvas remains loaded.
- Must say textbook import failed.
- Must preserve the exact textbook failure reason.

### Textbook ready

- Must say both sources are loaded and synthesis can begin.

## Exact files to change

- `apps/web/src/App.tsx`
- `apps/web/src/lib/source-workspace.ts`
- `apps/web/src/lib/source-workspace.test.ts`
- `apps/web/src/App.test.ts`
