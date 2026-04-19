import type { InteractionState } from "../types";
import { stableId } from "../utils";

let sessionCounter = 0;

type FocusEvent = {
  modeId: string;
  entityType: string;
  entityId: string;
};

type Listener = (event: FocusEvent) => void;

const STORAGE_PREFIX = "aeonthra:interaction:";
const HISTORY_PREFIX = "aeonthra:interaction-history:";

export class InteractionStateEngine {
  private readonly active = new Map<string, InteractionState>();
  private readonly listeners = new Set<Listener>();

  startSession<T extends Record<string, unknown>>(modeId: string, initialData?: T): string {
    const sessionId = stableId(`${modeId}:${Date.now()}:${++sessionCounter}`);
    const state: InteractionState<T> = {
      modeId,
      sessionId,
      startedAt: Date.now(),
      lastUpdated: Date.now(),
      data: initialData ?? ({} as T),
      history: []
    };
    this.active.set(sessionId, state as InteractionState);
    this.persist(state);
    return sessionId;
  }

  updateSession<T extends Record<string, unknown>>(sessionId: string, updater: (data: T) => T): void {
    const state = this.active.get(sessionId) as InteractionState<T> | undefined;
    if (!state) return;
    const prevData = { ...(state.data as T) };
    state.data = updater(state.data as T);
    state.lastUpdated = Date.now();
    state.history.push({
      timestamp: Date.now(),
      snapshot: prevData as Record<string, unknown>
    });
    if (state.history.length > 40) {
      state.history = state.history.slice(-40);
    }
    this.persist(state);
  }

  getSession<T extends Record<string, unknown>>(sessionId: string): InteractionState<T> | null {
    const live = this.active.get(sessionId) as InteractionState<T> | undefined;
    if (live) return live;
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${sessionId}`);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as InteractionState<T>;
      this.active.set(sessionId, parsed as InteractionState);
      return parsed;
    } catch {
      return null;
    }
  }

  getHistoryFor<T extends Record<string, unknown>>(modeId: string, limit = 10): InteractionState<T>[] {
    const raw = window.localStorage.getItem(`${HISTORY_PREFIX}${modeId}`);
    if (!raw) return [];
    try {
      return (JSON.parse(raw) as InteractionState<T>[]).slice(0, limit);
    } catch {
      return [];
    }
  }

  onFocus(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  broadcastFocus(modeId: string, entityType: string, entityId: string): void {
    const event = { modeId, entityType, entityId };
    this.listeners.forEach((listener) => listener(event));
  }

  private pushHistory<T extends Record<string, unknown>>(modeId: string, state: InteractionState<T>): void {
    const current = this.getHistoryFor<T>(modeId, 20);
    const next = [state, ...current.filter((entry) => entry.sessionId !== state.sessionId)].slice(0, 20);
    window.localStorage.setItem(`${HISTORY_PREFIX}${modeId}`, JSON.stringify(next));
  }

  private persist<T extends Record<string, unknown>>(state: InteractionState<T>): void {
    window.localStorage.setItem(`${STORAGE_PREFIX}${state.sessionId}`, JSON.stringify(state));
    this.pushHistory(state.modeId, state);
  }
}
