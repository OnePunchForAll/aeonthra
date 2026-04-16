import { stableHash } from "@learning/schema";
import { describe, expect, it } from "vitest";
import { createDemoSourceText, buildLearningBundleWithProgress } from "@learning/content-engine";
import { createDemoBundle } from "./demo";
import {
  buildOfflineSiteHtml,
  createOfflineSiteBundle,
  parseOfflineSiteBundle,
  restoreOfflineSiteBundle
} from "./offline-site";
import { createEmptyProgress } from "./shell-runtime";
import { mergeSourceBundles } from "./source-workspace";
import { createTextbookCaptureBundle } from "./textbook-import";

describe("offline replay bundle", () => {
  it("round-trips deterministic site bundles through parse and restore helpers", () => {
    const canvasBundle = createDemoBundle();
    const textbookBundle = createTextbookCaptureBundle({
      title: "AEONTHRA Demo Textbook",
      text: createDemoSourceText(),
      format: "text"
    });
    const mergedBundle = mergeSourceBundles(canvasBundle, textbookBundle);

    expect(mergedBundle).not.toBeNull();

    const learningBundle = buildLearningBundleWithProgress(mergedBundle!);
    const progress = createEmptyProgress();
    progress.conceptMastery[learningBundle.concepts[0]!.id] = 0.8;
    progress.practiceMode = true;

    const offlineBundle = createOfflineSiteBundle({
      canvasBundle,
      textbookBundle,
      mergedBundle: mergedBundle!,
      learningBundle,
      progress,
      notes: "Deterministic note lane."
    });

    expect(parseOfflineSiteBundle(JSON.stringify(offlineBundle))).toEqual(offlineBundle);
    expect(restoreOfflineSiteBundle(offlineBundle)).toEqual({
      canvasBundle,
      textbookBundle,
      mergedBundle,
      learningBundle,
      progress: { ...progress, practiceMode: false },
      notes: "Deterministic note lane."
    });
  });

  it("builds offline HTML from a validated replay bundle", () => {
    const canvasBundle = createDemoBundle();
    const textbookBundle = createTextbookCaptureBundle({
      title: "AEONTHRA Demo Textbook",
      text: createDemoSourceText(),
      format: "text"
    });
    const mergedBundle = mergeSourceBundles(canvasBundle, textbookBundle)!;
    const learningBundle = buildLearningBundleWithProgress(mergedBundle);
    const offlineBundle = createOfflineSiteBundle({
      canvasBundle,
      textbookBundle,
      mergedBundle,
      learningBundle,
      progress: createEmptyProgress(),
      notes: ""
    });

    const html = buildOfflineSiteHtml(offlineBundle);

    expect(html).toContain("AEONTHRA Offline Site");
    expect(html).toContain(offlineBundle.title);
    expect(html).toContain("Instructor Focus Map");
  });

  it("rejects malformed replay payloads", () => {
    expect(parseOfflineSiteBundle("{\"type\":\"not-an-offline-bundle\"}")).toBeNull();
  });

  it("accepts legacy replay payloads that were hashed before notes were introduced", () => {
    const canvasBundle = createDemoBundle();
    const textbookBundle = createTextbookCaptureBundle({
      title: "AEONTHRA Demo Textbook",
      text: createDemoSourceText(),
      format: "text"
    });
    const mergedBundle = mergeSourceBundles(canvasBundle, textbookBundle)!;
    const learningBundle = buildLearningBundleWithProgress(mergedBundle);
    const progress = createEmptyProgress();
    const legacySerialized = {
      canvasBundle,
      textbookBundle,
      mergedBundle,
      learningBundle,
      progress: {
        conceptMastery: progress.conceptMastery,
        chapterCompletion: progress.chapterCompletion,
        goalCompletion: progress.goalCompletion,
        practiceMode: false
      }
    };
    const legacyPayload = {
      schemaVersion: learningBundle.schemaVersion,
      exportedAt: "2026-04-16T00:00:00.000Z",
      title: mergedBundle.title,
      ...legacySerialized
    };

    const raw = JSON.stringify({
      ...legacyPayload,
      deterministicHash: stableHash(JSON.stringify(legacySerialized))
    });
    const parsed = parseOfflineSiteBundle(raw);

    expect(parsed).not.toBeNull();
    expect(parsed?.notes).toBe("");
  });
});
