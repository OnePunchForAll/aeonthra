## Runtime repair

1. Replace the custom PDF worker `?url` wiring in `apps/web/src/lib/pdf-ingest.ts`.
2. Use the installed `pdfjs-dist/webpack.mjs` entry so worker setup is owned by the package's bundler entry.
3. Expose a cached PDF runtime loader and reuse it from the extractor.
4. Wrap the lazy `import("./lib/pdf-ingest")` call in `apps/web/src/App.tsx` so loader failures become precise user-facing textbook errors.

## Truth-state repair

1. Stop using the raw global `status` string as the only textbook state source.
2. Add explicit derived status helpers for:
   - Canvas loaded vs required
   - textbook blocked vs required vs loading vs failed vs ready
3. Update Step 2 copy so it says Canvas is already loaded.
4. Add a dedicated `Canvas Status` card so textbook failure cannot imply Canvas failure.

## Regression coverage

1. Add a PDF runtime loader regression in `apps/web/src/lib/pdf-ingest.test.ts`.
2. Add lazy-loader failure handling regressions in `apps/web/src/App.test.ts`.
3. Add step-truth regressions in `apps/web/src/lib/source-workspace.test.ts`.

## Verification

1. Run targeted web tests for the changed paths.
2. Run full web tests.
3. Run repo typecheck.
4. Run web build.
5. Recheck the dev-server PDF module path after the code change.
