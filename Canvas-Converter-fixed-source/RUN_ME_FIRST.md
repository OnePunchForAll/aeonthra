# Run Me First

## What changed
This package was refocused around a simpler deterministic workflow:

1. Import **any source** first:
   - Canvas/SENTINEL JSON bundle
   - manual page-capture JSON
   - PDF / DOCX / TXT / pasted notes
2. Review the imported pages in a **source review queue**.
3. Exclude junk / LMS chrome / onboarding / broken fragments.
4. Run synthesis.
5. Study from the new **Study Workbench**:
   - assignment / discussion cards
   - cleaner concept cards
   - evidence-backed support sources
   - local notes and results export

The extension popup also adds **EXPORT CURRENT PAGE JSON** so any webpage can be captured manually and imported into the app.

## Clean rebuild on your Windows machine
Run these commands from the repo root:

```powershell
npm install
npm run typecheck
npm run build:extension
npm run dev:web
```

Then:

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select `apps/extension/dist`
5. Open the web app from the Vite URL shown by `npm run dev:web`

## Recommended first test
1. Open a webpage you want to study.
2. In the extension popup, click **EXPORT CURRENT PAGE JSON**.
3. In AEONTHRA, click **CHOOSE SOURCE JSON** and import that file.
4. Optionally add a PDF / DOCX / TXT / pasted source.
5. In **Review Queue**, exclude anything marked as junk / fragment / boilerplate.
6. Click **Begin Synthesis**.
7. Use the **Study Workbench** tabs:
   - Dashboard
   - Assignments & Discussions
   - Concepts
   - Sources
   - Notes & Results

## Local notes / results export
The Notes & Results tab stores notes locally in the browser and can export them to a `.txt` file.

## Important
Because the uploaded `node_modules` came from Windows and this repair was done in a Linux container, I could typecheck the repo but could not rebuild the Vite/esbuild bundles here. Rebuild on your Windows machine before testing.
