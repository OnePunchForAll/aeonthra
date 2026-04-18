## Exact symptom

- Browser PDF upload failed with `Failed to fetch dynamically imported module: http://localhost:5176/src/lib/pdf-ingest.ts`.
- The same live AEONTHRA screen still showed a populated Canvas Course Summary with course title and item counts.

## Exact failing import path

- `http://localhost:5176/src/lib/pdf-ingest.ts`
- Source call site: `apps/web/src/App.tsx` via `await import("./lib/pdf-ingest")`

## Exact files involved

- `apps/web/src/App.tsx`
- `apps/web/src/lib/pdf-ingest.ts`
- `apps/web/vite.config.ts`
- `node_modules/pdfjs-dist/build/pdf.worker.min.mjs`
- `node_modules/pdfjs-dist/webpack.mjs`

## What is proven

- `apps/web/src/lib/pdf-ingest.ts` exists in the repo.
- The app source import path is correct: `./lib/pdf-ingest`.
- Current production build succeeds and emits both the PDF ingest chunk and the PDF worker asset.
- A fresh local Vite dev server serves:
  - `/src/lib/pdf-ingest.ts` with `200`
  - the optimized `pdfjs-dist` dep with `200`
  - the worker asset URL with `200`

## Failure classification

- Not a missing-file failure.
- Not an import-path typo in `App.tsx`.
- Not a case-sensitive filename mismatch.
- Not a build-output mismatch.
- The brittle point is the dev-time module-loading chain inside `apps/web/src/lib/pdf-ingest.ts`.
- The old implementation used a custom top-level worker asset import:
  - `import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url"`
- In Vite dev this becomes an extra `@fs/...pdf.worker.min.mjs?url` dependency plus the optimized `pdfjs-dist` module.
- The observed browser error therefore belongs to the PDF ingest dependency/module-loading path, not to a missing `pdf-ingest.ts` file.

## Exact reproduction path

1. Open AEONTHRA on the Vite dev server.
2. Import or transfer a valid Canvas course bundle until the Canvas Course Summary is populated.
3. In Step 2, choose a PDF textbook.
4. The live failing session reported `Failed to fetch dynamically imported module: http://localhost:5176/src/lib/pdf-ingest.ts`.

## Exact fix plan

1. Remove the app-owned `?url` worker wiring from `apps/web/src/lib/pdf-ingest.ts`.
2. Switch PDF.js loading to the installed bundler entry `pdfjs-dist/webpack.mjs`, which sets up the worker through `new URL(..., import.meta.url)` instead of the custom `?url` path.
3. Wrap the lazy PDF module import in `App.tsx` so loader failures produce a precise textbook message instead of a raw browser dynamic-import error.
4. Split intake truth messaging so Canvas-loaded state stays explicit even when textbook import fails.
5. Add regressions for:
   - PDF lazy-loader failure handling
   - PDF runtime loader availability
   - Canvas loaded + textbook failed truth state
