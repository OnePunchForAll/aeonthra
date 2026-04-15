import { CaptureBundleSchema, type CaptureBundle } from "@learning/schema";
import type { AppProgress } from "./workspace";
import { parseStoredSourceState, type SourceWorkspaceState } from "./source-workspace";

const bundleKey = "learning-freedom:capture-bundle";
const sourceStateKey = "learning-freedom:source-workspace";
const notesKey = "learning-freedom:notes";
const progressKey = "learning-freedom:progress";
const draftKey = "learning-freedom:drafts";
const forgeKey = "learning-freedom:forge-session";

function scopedKey(baseKey: string, scope?: string): string {
  return scope ? `${baseKey}:${scope}` : baseKey;
}

export type ForgeSessionSnapshot = {
  conceptId: string;
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

export function loadStoredSourceWorkspace(): SourceWorkspaceState | null {
  return parseStoredSourceState(window.localStorage.getItem(sourceStateKey));
}

export function storeSourceWorkspace(state: SourceWorkspaceState): void {
  window.localStorage.setItem(sourceStateKey, JSON.stringify(state));
}

export function clearStoredSourceWorkspace(): void {
  window.localStorage.removeItem(sourceStateKey);
}

export function loadNotes(): string {
  return window.localStorage.getItem(notesKey) ?? "";
}

export function storeNotes(value: string): void {
  window.localStorage.setItem(notesKey, value);
}

export function loadProgress(scope?: string): AppProgress {
  try {
    const raw = window.localStorage.getItem(scopedKey(progressKey, scope));
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

export function storeProgress(progress: AppProgress, scope?: string): void {
  window.localStorage.setItem(scopedKey(progressKey, scope), JSON.stringify(progress));
}

export function storeScopedProgress(progress: AppProgress, scope: string): void {
  storeProgress(progress, scope);
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

export function loadForgeSession(scope?: string): ForgeSessionSnapshot | null {
  try {
    const raw = window.localStorage.getItem(scopedKey(forgeKey, scope));
    return raw ? JSON.parse(raw) as ForgeSessionSnapshot : null;
  } catch {
    return null;
  }
}

export function storeForgeSession(snapshot: ForgeSessionSnapshot | null, scope?: string): void {
  const key = scopedKey(forgeKey, scope);
  if (!snapshot) {
    window.localStorage.removeItem(key);
    return;
  }
  window.localStorage.setItem(key, JSON.stringify(snapshot));
}
