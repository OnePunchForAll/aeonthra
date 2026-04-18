import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildInfoFilename,
  collectManifestReferencedFiles,
  validateBuiltExtensionDist
} from "./build.mjs";

const tempDirs = [];

async function makeTempDist() {
  const dir = await mkdtemp(resolve(tmpdir(), "aeonthra-extension-dist-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("extension build contract", () => {
  it("collects the manifest files that the unpacked extension must contain", () => {
    expect(
      collectManifestReferencedFiles({
        background: { service_worker: "service-worker.js" },
        side_panel: { default_path: "side-panel.html" },
        action: { default_popup: "popup.html" },
        options_page: "options.html",
        content_scripts: [
          { js: ["content-canvas.js"], css: ["global.css"] },
          { js: ["content-bridge.js", "content-canvas.js"] }
        ]
      })
    ).toEqual([
      "content-bridge.js",
      "content-canvas.js",
      "global.css",
      "options.html",
      "popup.html",
      "service-worker.js",
      "side-panel.html"
    ]);
  });

  it("rejects dist outputs whose manifest points at a missing file", async () => {
    const distDir = await makeTempDist();
    await writeFile(
      resolve(distDir, "manifest.json"),
      JSON.stringify({
        manifest_version: 3,
        background: { service_worker: "service-worker.js", type: "module" },
        action: { default_popup: "popup.html" }
      })
    );
    await writeFile(
      resolve(distDir, buildInfoFilename),
      JSON.stringify({
        version: "1.0.0",
        builtAt: "2026-04-17T00:00:00.000Z",
        sourceHash: "abc123",
        unpackedPath: "apps/extension/dist",
        markerPath: buildInfoFilename
      })
    );
    await writeFile(resolve(distDir, "popup.html"), "<html></html>");

    await expect(validateBuiltExtensionDist(distDir)).rejects.toThrow(
      /Missing files?: .*service-worker\.js/
    );
  });

  it("accepts a complete dist output whose manifest references stay inside dist", async () => {
    const distDir = await makeTempDist();
    const requiredFiles = [
      "service-worker.js",
      "content-canvas.js",
      "content-bridge.js",
      "popup.js",
      "side-panel.js",
      "options.js",
      "popup.html",
      "side-panel.html",
      "options.html",
      buildInfoFilename,
      "global.css",
      "tokens.css",
      "icon.ico"
    ];

    await Promise.all(requiredFiles.map((file) => writeFile(resolve(distDir, file), "")));
    await writeFile(
      resolve(distDir, "manifest.json"),
      JSON.stringify({
        manifest_version: 3,
        background: { service_worker: "service-worker.js", type: "module" },
        side_panel: { default_path: "side-panel.html" },
        action: { default_popup: "popup.html" },
        options_page: "options.html",
        content_scripts: [
          { js: ["content-canvas.js"] },
          { js: ["content-bridge.js"] }
        ]
      })
    );
    await writeFile(
      resolve(distDir, buildInfoFilename),
      JSON.stringify({
        version: "1.0.0",
        builtAt: "2026-04-17T00:00:00.000Z",
        sourceHash: "abc123",
        unpackedPath: "apps/extension/dist",
        markerPath: buildInfoFilename
      })
    );

    await expect(validateBuiltExtensionDist(distDir)).resolves.toMatchObject({
      buildInfo: {
        markerPath: buildInfoFilename,
        unpackedPath: "apps/extension/dist"
      },
      expectedFiles: expect.arrayContaining([buildInfoFilename, "service-worker.js", "popup.html", "content-canvas.js"])
    });
  });

  it("rejects manifest references that escape the unpacked extension output", async () => {
    const distDir = await makeTempDist();
    await mkdir(resolve(distDir, "nested"));
    await writeFile(resolve(distDir, "service-worker.js"), "");
    await writeFile(
      resolve(distDir, buildInfoFilename),
      JSON.stringify({
        version: "1.0.0",
        builtAt: "2026-04-17T00:00:00.000Z",
        sourceHash: "abc123",
        unpackedPath: "apps/extension/dist",
        markerPath: buildInfoFilename
      })
    );
    await writeFile(
      resolve(distDir, "manifest.json"),
      JSON.stringify({
        manifest_version: 3,
        background: { service_worker: "../service-worker.js", type: "module" }
      })
    );

    await expect(validateBuiltExtensionDist(distDir)).rejects.toThrow(
      /out-of-tree asset path/
    );
  });

  it("rejects malformed build-info markers in dist", async () => {
    const distDir = await makeTempDist();
    const requiredFiles = [
      "service-worker.js",
      "content-canvas.js",
      "content-bridge.js",
      "popup.js",
      "side-panel.js",
      "options.js",
      "popup.html",
      "side-panel.html",
      "options.html",
      "global.css",
      "tokens.css",
      "icon.ico"
    ];

    await Promise.all(requiredFiles.map((file) => writeFile(resolve(distDir, file), "")));
    await writeFile(
      resolve(distDir, "manifest.json"),
      JSON.stringify({
        manifest_version: 3,
        background: { service_worker: "service-worker.js", type: "module" },
        side_panel: { default_path: "side-panel.html" },
        action: { default_popup: "popup.html" },
        options_page: "options.html",
        content_scripts: [
          { js: ["content-canvas.js"] },
          { js: ["content-bridge.js"] }
        ]
      })
    );
    await writeFile(resolve(distDir, buildInfoFilename), JSON.stringify({ bad: true }));

    await expect(validateBuiltExtensionDist(distDir)).rejects.toThrow(
      /build info marker is malformed/
    );
  });

  it("rejects content scripts that still ship ESM syntax", async () => {
    const distDir = await makeTempDist();
    const requiredFiles = [
      "service-worker.js",
      "content-canvas.js",
      "content-bridge.js",
      "popup.js",
      "side-panel.js",
      "options.js",
      "popup.html",
      "side-panel.html",
      "options.html",
      "global.css",
      "tokens.css",
      "icon.ico"
    ];

    await Promise.all(requiredFiles.map((file) => writeFile(resolve(distDir, file), "")));
    await writeFile(resolve(distDir, "content-canvas.js"), "export { broken };\n");
    await writeFile(
      resolve(distDir, "manifest.json"),
      JSON.stringify({
        manifest_version: 3,
        background: { service_worker: "service-worker.js", type: "module" },
        side_panel: { default_path: "side-panel.html" },
        action: { default_popup: "popup.html" },
        options_page: "options.html",
        content_scripts: [
          { js: ["content-canvas.js"] },
          { js: ["content-bridge.js"] }
        ]
      })
    );
    await writeFile(
      resolve(distDir, buildInfoFilename),
      JSON.stringify({
        version: "1.0.0",
        builtAt: "2026-04-18T00:00:00.000Z",
        sourceHash: "abc123",
        unpackedPath: "apps/extension/dist",
        markerPath: buildInfoFilename
      })
    );

    await expect(validateBuiltExtensionDist(distDir)).rejects.toThrow(
      /contains ESM syntax/
    );
  });
});
