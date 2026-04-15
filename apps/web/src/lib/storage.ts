import { CaptureBundleSchema, type CaptureBundle } from "@learning/schema";
import type { AppProgress } from "./workspace";
import { parseStoredSourceState, type SourceWorkspaceState } from "./source-workspace";
import { createEmptyProgress } from "./shell-runtime";

const bundleKey = "learning-freedom:capture-bundle";
const sourceStateKey = "learning-freedom:source-workspace";
const notesKey = "learning-freedom:notes";
const progressKey = "learning-freedom:progress";

function scopedKey(baseKey: string, scope?: string): string {
  return scope ? `${baseKey}:${scope}` : baseKey;
}

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
      return createEmptyProgress();
    }
    const parsed = JSON.parse(raw) as AppProgress;
    return {
      conceptMastery: parsed.conceptMastery ?? {},
      chapterCompletion: parsed.chapterCompletion ?? {},
      goalCompletion: parsed.goalCompletion ?? {},
      practiceMode: Boolean(parsed.practiceMode)
    };
  } catch {
    return createEmptyProgress();
  }
}

function storeProgress(progress: AppProgress, scope?: string): void {
  window.localStorage.setItem(scopedKey(progressKey, scope), JSON.stringify(progress));
}

export function storeScopedProgress(progress: AppProgress, scope: string): void {
  storeProgress(progress, scope);
}
