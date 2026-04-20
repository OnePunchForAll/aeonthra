import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AeonthraShell } from "./AeonthraShell";
import { createDemoBundle, createDemoLearningBundle, createDemoProgress } from "./lib/demo";
import { mapToShellData } from "./lib/shell-mapper";
import { deriveWorkspace } from "./lib/workspace";
import { createEmptyProgress, enhanceShellData } from "./lib/shell-runtime";

vi.mock("./lib/storage", () => ({
  loadNotes: () => "",
  storeNotes: () => {}
}));

function buildShellFixture() {
  const bundle = createDemoBundle();
  const learning = createDemoLearningBundle(bundle);
  const progress = createDemoProgress(learning, createEmptyProgress());
  const workspace = deriveWorkspace(bundle, learning, progress);
  const shellData = enhanceShellData(
    mapToShellData(bundle, learning, workspace),
    learning,
    workspace,
    null
  );

  return { progress, shellData };
}

describe("AeonthraShell inspect view", () => {
  it("mounts the canonical inspector when the shell starts on the inspect route", () => {
    const { progress, shellData } = buildShellFixture();
    const markup = renderToStaticMarkup(
      <AeonthraShell
        data={shellData}
        progress={progress}
        onProgressUpdate={() => {}}
        onReset={() => {}}
        onDownloadCanonicalArtifact={() => {}}
        onDownloadDiagnostics={() => {}}
        onDownloadOfflineSite={() => {}}
        onSaveReplayBundle={() => {}}
        isDemoMode
        initialView="inspect"
      />
    );

    expect(markup).toContain("Inspect The Truth Boundary");
    expect(markup).toContain("Export Diagnostics JSON");
    expect(markup).toContain("Provenance Lanes");
  });
});
