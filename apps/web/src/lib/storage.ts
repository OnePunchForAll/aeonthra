import { CaptureBundleSchema, type CaptureBundle } from "@learning/schema";
import type { AppProgress } from "./workspace";

const bundleKey = "learning-freedom:capture-bundle";
const notesKey = "learning-freedom:notes";
const progressKey = "learning-freedom:progress";
const draftKey = "learning-freedom:drafts";
const forgeKey = "learning-freedom:forge-session";

export type ForgeSessionSnapshot = {
  chapterId: string;
  phase: "genesis" | "forge" | "crucible" | "architect" | "transcend";
  modeIndex: number;
  promptIndex: number;
  startedAt: number;
};

export function loadStoredBundle(): CaptureBundle | null {
  const raw = window.localStorage.getItem(bundleKey);
  if (!raw) {
    return null;
  }

  try {
    const parsed = CaptureBundleSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function storeBundle(bundle: CaptureBundle): void {
  window.localStorage.setItem(bundleKey, JSON.stringify(bundle));
}

export function clearStoredBundle(): void {
  window.localStorage.removeItem(bundleKey);
}

export function loadNotes(): string {
  return window.localStorage.getItem(notesKey) ?? "";
}

export function storeNotes(value: string): void {
  window.localStorage.setItem(notesKey, value);
}

export function loadProgress(): AppProgress {
  try {
    const raw = window.localStorage.getItem(progressKey);
    if (!raw) {
      return { conceptMastery: {}, chapterCompletion: {}, goalCompletion: {}, practiceMode: false };
    }
    const parsed = JSON.parse(raw) as AppProgress;
    return {
      conceptMastery: parsed.conceptMastery ?? {},
      chapterCompletion: parsed.chapterCompletion ?? {},
      goalCompletion: parsed.goalCompletion ?? {},
      practiceMode: Boolean(parsed.practiceMode)
    };
  } catch {
    return { conceptMastery: {}, chapterCompletion: {}, goalCompletion: {}, practiceMode: false };
  }
}

export function storeProgress(progress: AppProgress): void {
  window.localStorage.setItem(progressKey, JSON.stringify(progress));
}

export function loadDrafts(): Record<string, string> {
  try {
    return JSON.parse(window.localStorage.getItem(draftKey) ?? "{}") as Record<string, string>;
  } catch {
    return {};
  }
}

export function storeDrafts(drafts: Record<string, string>): void {
  window.localStorage.setItem(draftKey, JSON.stringify(drafts));
}

export function loadForgeSession(): ForgeSessionSnapshot | null {
  try {
    const raw = window.localStorage.getItem(forgeKey);
    return raw ? JSON.parse(raw) as ForgeSessionSnapshot : null;
  } catch {
    return null;
  }
}

export function storeForgeSession(snapshot: ForgeSessionSnapshot | null): void {
  if (!snapshot) {
    window.localStorage.removeItem(forgeKey);
    return;
  }
  window.localStorage.setItem(forgeKey, JSON.stringify(snapshot));
}
