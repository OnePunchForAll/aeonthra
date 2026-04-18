import { createHash } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import { build } from "esbuild";
import { access, copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));
const extensionRoot = resolve(currentDir, "..");
const outDir = resolve(extensionRoot, "dist");
export const buildInfoFilename = "build-info.json";

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

function sourceFingerprintInputFiles() {
  return [
    ...buildEntryPoints.map((entry) => entry.entryPoint),
    ...copiedAssets.map((asset) => asset.from),
    resolve(currentDir, "build.mjs")
  ].sort();
}

async function createBuildInfo(baseOutDir = outDir) {
  const manifest = JSON.parse(await readFile(resolve(extensionRoot, "manifest.json"), "utf8"));
  const hash = createHash("sha256");
  for (const path of sourceFingerprintInputFiles()) {
    hash.update(path);
    hash.update(await readFile(path));
  }

  const buildInfo = {
    version: typeof manifest.version === "string" ? manifest.version : "0.0.0",
    builtAt: new Date().toISOString(),
    sourceHash: hash.digest("hex"),
    unpackedPath: "apps/extension/dist",
    markerPath: buildInfoFilename
  };

  await writeFile(
    resolve(baseOutDir, buildInfoFilename),
    JSON.stringify(buildInfo, null, 2)
  );

  return buildInfo;
}

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

function containsClassicScriptBreakingEsmSyntax(code) {
  return /^\s*(?:import|export)\s/m.test(code);
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
  const buildInfoPath = resolve(baseOutDir, buildInfoFilename);
  const buildInfo = JSON.parse(await readFile(buildInfoPath, "utf8"));
  const expectedFiles = new Set([
    "manifest.json",
    buildInfoFilename,
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

  if (Array.isArray(manifest?.content_scripts)) {
    const contentScriptFiles = new Set(
      manifest.content_scripts.flatMap((script) => Array.isArray(script?.js) ? script.js : [])
    );
    for (const relativePath of [...contentScriptFiles].sort()) {
      const absolutePath = resolveDistPath(baseOutDir, relativePath);
      const code = await readFile(absolutePath, "utf8");
      if (containsClassicScriptBreakingEsmSyntax(code)) {
        throw new Error(
          `Content script "${relativePath}" contains ESM syntax and will not load as a classic MV3 content script.`
        );
      }
    }
  }

  if (
    typeof buildInfo.version !== "string" ||
    typeof buildInfo.builtAt !== "string" ||
    typeof buildInfo.sourceHash !== "string" ||
    typeof buildInfo.unpackedPath !== "string" ||
    typeof buildInfo.markerPath !== "string"
  ) {
    throw new Error("Extension build info marker is malformed.");
  }

  return {
    manifest,
    buildInfo,
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

  await createBuildInfo(outDir);

  return validateBuiltExtensionDist(outDir);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await buildExtensionDist();
}
