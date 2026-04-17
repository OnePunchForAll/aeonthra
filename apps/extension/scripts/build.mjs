import { constants as fsConstants } from "node:fs";
import { build } from "esbuild";
import { access, copyFile, mkdir, readFile, rm } from "node:fs/promises";
import { dirname, isAbsolute, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));
const extensionRoot = resolve(currentDir, "..");
const outDir = resolve(extensionRoot, "dist");

export const buildEntryPoints = [
  {
    entryPoint: resolve(extensionRoot, "src/service-worker.ts"),
    output: "service-worker.js"
  },
  {
    entryPoint: resolve(extensionRoot, "src/content-canvas.ts"),
    output: "content-canvas.js"
  },
  {
    entryPoint: resolve(extensionRoot, "src/content-bridge.ts"),
    output: "content-bridge.js"
  },
  {
    entryPoint: resolve(extensionRoot, "src/popup.tsx"),
    output: "popup.js"
  },
  {
    entryPoint: resolve(extensionRoot, "src/side-panel.tsx"),
    output: "side-panel.js"
  },
  {
    entryPoint: resolve(extensionRoot, "src/options.tsx"),
    output: "options.js"
  }
];

export const copiedAssets = [
  {
    from: resolve(extensionRoot, "manifest.json"),
    output: "manifest.json"
  },
  {
    from: resolve(extensionRoot, "src/popup.html"),
    output: "popup.html"
  },
  {
    from: resolve(extensionRoot, "src/side-panel.html"),
    output: "side-panel.html"
  },
  {
    from: resolve(extensionRoot, "src/options.html"),
    output: "options.html"
  },
  {
    from: resolve(extensionRoot, "src/styles/global.css"),
    output: "global.css"
  },
  {
    from: resolve(extensionRoot, "src/styles/tokens.css"),
    output: "tokens.css"
  },
  {
    from: resolve(extensionRoot, "public/icon.ico"),
    output: "icon.ico"
  }
];

export function collectManifestReferencedFiles(manifest) {
  const referencedFiles = new Set();

  if (manifest?.background?.service_worker) {
    referencedFiles.add(manifest.background.service_worker);
  }
  if (manifest?.side_panel?.default_path) {
    referencedFiles.add(manifest.side_panel.default_path);
  }
  if (manifest?.action?.default_popup) {
    referencedFiles.add(manifest.action.default_popup);
  }
  if (manifest?.options_page) {
    referencedFiles.add(manifest.options_page);
  }
  if (Array.isArray(manifest?.content_scripts)) {
    for (const script of manifest.content_scripts) {
      for (const file of script?.js ?? []) {
        referencedFiles.add(file);
      }
      for (const file of script?.css ?? []) {
        referencedFiles.add(file);
      }
    }
  }

  return [...referencedFiles].sort();
}

function resolveDistPath(baseOutDir, relativePath) {
  if (typeof relativePath !== "string" || relativePath.length === 0) {
    throw new Error("Extension dist validation encountered an empty manifest asset path.");
  }
  if (isAbsolute(relativePath)) {
    throw new Error(`Extension dist validation rejected absolute asset path "${relativePath}".`);
  }

  const absolutePath = resolve(baseOutDir, relativePath);
  const normalizedOutDir = `${baseOutDir}${sep}`;
  if (absolutePath !== baseOutDir && !absolutePath.startsWith(normalizedOutDir)) {
    throw new Error(`Extension dist validation rejected out-of-tree asset path "${relativePath}".`);
  }

  return absolutePath;
}

export async function validateBuiltExtensionDist(baseOutDir = outDir) {
  const manifestPath = resolve(baseOutDir, "manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const expectedFiles = new Set([
    "manifest.json",
    ...buildEntryPoints.map((entry) => entry.output),
    ...copiedAssets.map((asset) => asset.output),
    ...collectManifestReferencedFiles(manifest)
  ]);
  const missingFiles = [];

  for (const relativePath of [...expectedFiles].sort()) {
    const absolutePath = resolveDistPath(baseOutDir, relativePath);
    try {
      await access(absolutePath, fsConstants.F_OK);
    } catch {
      missingFiles.push(relativePath);
    }
  }

  if (missingFiles.length > 0) {
    throw new Error(
      `Extension dist is incomplete. Missing file${missingFiles.length === 1 ? "" : "s"}: ${missingFiles.join(", ")}`
    );
  }

  return {
    manifest,
    expectedFiles: [...expectedFiles].sort()
  };
}

export async function buildExtensionDist() {
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  await Promise.all(
    buildEntryPoints.map(({ entryPoint, output }) =>
      build({
        entryPoints: [entryPoint],
        outfile: resolve(outDir, output),
        bundle: true,
        format: "esm",
        platform: "browser",
        target: "chrome120",
        sourcemap: false
      })
    )
  );

  await Promise.all(
    copiedAssets.map(({ from, output }) =>
      copyFile(from, resolve(outDir, output))
    )
  );

  return validateBuiltExtensionDist(outDir);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await buildExtensionDist();
}
