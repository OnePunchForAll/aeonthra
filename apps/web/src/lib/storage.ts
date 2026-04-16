import { CaptureBundleSchema, type CaptureBundle } from "@learning/schema";
import type { AppProgress } from "./workspace";
import { parseStoredSourceState, type SourceWorkspaceState } from "./source-workspace";
import { createEmptyProgress } from "./shell-runtime";

const bundleKey = "learning-freedom:capture-bundle";
const sourceStateKey = "learning-freedom:source-workspace";
const notesKey = "learning-freedom:notes";
const activeNotesScopeKey = "learning-freedom:notes:active-scope";
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

function activeNotesScope(): string | null {
  const scope = window.localStorage.getItem(activeNotesScopeKey);
  return scope && scope.trim().length > 0 ? scope : null;
}

function scopedNotesKey(scope?: string | null): string {
  return scopedKey(notesKey, scope ?? activeNotesScope() ?? undefined);
}

export function setActiveNoteScope(scope: string | null): void {
  if (!scope || !scope.trim()) {
    window.localStorage.removeItem(activeNotesScopeKey);
    return;
  }

  window.localStorage.setItem(activeNotesScopeKey, scope.trim());
}

export function loadNotes(scope?: string): string {
  return window.localStorage.getItem(scopedNotesKey(scope)) ?? "";
}

export function storeNotes(value: string, scope?: string): void {
  window.localStorage.setItem(scopedNotesKey(scope), value);
}

export function clearStoredNotes(scope?: string): void {
  if (scope) {
    window.localStorage.removeItem(scopedNotesKey(scope));
    return;
  }

  const keysToClear: string[] = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (key === notesKey || key === activeNotesScopeKey || key?.startsWith(`${notesKey}:`)) {
      keysToClear.push(key);
    }
  }

  keysToClear.forEach((key) => window.localStorage.removeItem(key));
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

export function clearStoredProgress(scope?: string): void {
  if (scope) {
    window.localStorage.removeItem(scopedKey(progressKey, scope));
    return;
  }

  const keysToClear: string[] = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (key === progressKey || key?.startsWith(`${progressKey}:`)) {
      keysToClear.push(key);
    }
  }

  keysToClear.forEach((key) => window.localStorage.removeItem(key));
}
