import type { Workspace } from "./types";

const WORKSPACE_KEY = "aeonthra-lite:workspace:v1";

export function emptyWorkspace(): Workspace {
  return {
    version: 1,
    sources: [],
    analysis: null,
    notesByScope: {},
    mastery: {}
  };
}

export function loadWorkspace(): Workspace {
  try {
    const raw = window.localStorage.getItem(WORKSPACE_KEY);
    if (!raw) {
      return emptyWorkspace();
    }
    const parsed = JSON.parse(raw) as Workspace;
    if (parsed.version !== 1 || !Array.isArray(parsed.sources)) {
      return emptyWorkspace();
    }
    return {
      ...emptyWorkspace(),
      ...parsed,
      sources: parsed.sources,
      notesByScope: parsed.notesByScope ?? {},
      mastery: parsed.mastery ?? {}
    };
  } catch {
    return emptyWorkspace();
  }
}

export function saveWorkspace(workspace: Workspace): void {
  window.localStorage.setItem(WORKSPACE_KEY, JSON.stringify(workspace));
}

export function clearWorkspace(): void {
  window.localStorage.removeItem(WORKSPACE_KEY);
}

export function stableHash(input: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x1b873593;
  for (let i = 0; i < input.length; i += 1) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ ch, 0x85ebca6b) >>> 0;
  }
  return `${h1.toString(16).padStart(8, "0")}${h2.toString(16).padStart(8, "0")}`;
}
