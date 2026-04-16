import { build } from "esbuild";
import { mkdir, copyFile, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));
const extensionRoot = resolve(currentDir, "..");
const outDir = resolve(extensionRoot, "dist");

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

await Promise.all([
  build({
    entryPoints: [resolve(extensionRoot, "src/service-worker.ts")],
    outfile: resolve(outDir, "service-worker.js"),
    bundle: true,
    format: "esm",
    platform: "browser",
    target: "chrome120",
    sourcemap: false
  }),
  build({
    entryPoints: [resolve(extensionRoot, "src/content-canvas.ts")],
    outfile: resolve(outDir, "content-canvas.js"),
    bundle: true,
    format: "esm",
    platform: "browser",
    target: "chrome120",
    sourcemap: false
  }),
  build({
    entryPoints: [resolve(extensionRoot, "src/content-bridge.ts")],
    outfile: resolve(outDir, "content-bridge.js"),
    bundle: true,
    format: "esm",
    platform: "browser",
    target: "chrome120",
    sourcemap: false
  }),
  build({
    entryPoints: [resolve(extensionRoot, "src/popup.tsx")],
    outfile: resolve(outDir, "popup.js"),
    bundle: true,
    format: "esm",
    platform: "browser",
    target: "chrome120",
    sourcemap: false
  }),
  build({
    entryPoints: [resolve(extensionRoot, "src/side-panel.tsx")],
    outfile: resolve(outDir, "side-panel.js"),
    bundle: true,
    format: "esm",
    platform: "browser",
    target: "chrome120",
    sourcemap: false
  }),
  build({
    entryPoints: [resolve(extensionRoot, "src/options.tsx")],
    outfile: resolve(outDir, "options.js"),
    bundle: true,
    format: "esm",
    platform: "browser",
    target: "chrome120",
    sourcemap: false
  })
]);

await Promise.all([
  copyFile(resolve(extensionRoot, "manifest.json"), resolve(outDir, "manifest.json")),
  copyFile(resolve(extensionRoot, "src/popup.html"), resolve(outDir, "popup.html")),
  copyFile(resolve(extensionRoot, "src/side-panel.html"), resolve(outDir, "side-panel.html")),
  copyFile(resolve(extensionRoot, "src/options.html"), resolve(outDir, "options.html")),
  copyFile(resolve(extensionRoot, "src/styles/global.css"), resolve(outDir, "global.css")),
  copyFile(resolve(extensionRoot, "src/styles/tokens.css"), resolve(outDir, "tokens.css")),
  copyFile(resolve(extensionRoot, "public/icon.ico"), resolve(outDir, "icon.ico"))
]);
