import { useEffect, useMemo, useState, type ButtonHTMLAttributes, type PropsWithChildren, type ReactNode } from "react";
import type { ExtensionSettings, ExtensionStatusPayload, RuntimeState } from "../core/types";

export function normalizeExtensionError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (message.includes("message channel closed before a response was received") || message.includes("Receiving end does not exist")) {
    return "Extension is loading. Refresh and try again.";
  }
  if (!message) {
    return "Loading extension state...";
  }
  return "Extension communication failed. Try reloading the extension.";
}

export async function sendExtensionMessage<T>(message: Record<string, unknown>): Promise<T> {
  return chrome.runtime.sendMessage(message) as Promise<T>;
}

export function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatRuntime(runtime: RuntimeState): string {
  if (runtime.status === "idle") return "Ready";
  if (runtime.status === "discovering" || runtime.status === "capturing" || runtime.status === "paused" || runtime.status === "starting") {
    return `${runtime.completedCount}/${runtime.totalQueued || "?"} captured`;
  }
  if (runtime.status === "completed") return "Capture ready";
  if (runtime.status === "cancelled") return "Partial capture saved";
  if (runtime.status === "error") return runtime.errorMessage ?? "Capture failed";
  return runtime.phaseLabel;
}

export function useExtensionState(pollMs = 1400) {
  const [state, setState] = useState<ExtensionStatusPayload | null>(null);
  const [statusText, setStatusText] = useState("Loading extension state...");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const next = await sendExtensionMessage<ExtensionStatusPayload | { ok?: false; message?: string; error?: string }>({ type: "aeon:get-extension-state" });
        if (!cancelled) {
          if (next && typeof next === "object" && "ok" in next && next.ok === true) {
            setState(next);
            setStatusText("");
            return;
          }

          setState(null);
          const message = next && typeof next === "object"
            ? ("message" in next && typeof next.message === "string" ? next.message : null)
              ?? ("error" in next && typeof next.error === "string" ? next.error : null)
            : null;
          setStatusText(message ?? "Open a Canvas course to unlock auto-capture.");
        }
      } catch (error) {
        if (!cancelled) {
          setState(null);
          setStatusText(normalizeExtensionError(error));
        }
      }
    };

    void load();
    const timer = window.setInterval(load, pollMs);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [pollMs]);

  return { state, statusText, setStatusText };
}

export function Shell({ title, subtitle, children, footer }: PropsWithChildren<{ title: string; subtitle: string; footer?: ReactNode }>) {
  return (
    <div className="ae-shell">
      <header className="ae-shell__header">
        <div className="ext-wordmark">
          <span className="ext-wordmark__name">AEONTHRA</span>
          <span className="ext-wordmark__sub">CAPTURE INTELLIGENCE</span>
        </div>
        <div className="ae-shell__eyebrow">{title}</div>
        <div className="ae-shell__subtitle">{subtitle}</div>
      </header>
      <main className="ae-shell__content">{children}</main>
      {footer ? <footer className="ae-shell__footer">{footer}</footer> : null}
    </div>
  );
}

export function Card({ children, accent = "cyan", className = "" }: PropsWithChildren<{ accent?: "cyan" | "teal" | "orange" | "purple" | "gold"; className?: string }>) {
  return <section className={`ae-card ae-card--${accent} ${className}`.trim()}>{children}</section>;
}

export function Button(
  { children, variant = "primary", disabled, ...props }:
  PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "teal" | "orange" | "danger" }>
) {
  return (
    <button {...props} disabled={disabled} className={`ae-btn ae-btn--${variant}`.trim()}>
      {children}
    </button>
  );
}

export function Progress({ value }: { value: number }) {
  const safe = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
  return (
    <div className="ae-progress" aria-hidden="true">
      <div className="ae-progress__fill" style={{ width: `${safe}%` }} />
    </div>
  );
}

export function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="ae-stat">
      <div className="ae-stat__label">{label}</div>
      <div className="ae-stat__value">{value}</div>
    </div>
  );
}

export function useEditableSettings(state: ExtensionStatusPayload | null) {
  const seed = useMemo<ExtensionSettings | null>(() => (state ? state.settings : null), [state?.settings]);
  const seedKey = useMemo(() => (seed ? JSON.stringify(seed) : null), [seed]);
  const [draft, setDraft] = useState<ExtensionSettings | null>(seed);
  const [draftKey, setDraftKey] = useState<string | null>(seedKey);

  useEffect(() => {
    if (!seed) {
      return;
    }
    if (draft === null || draftKey === null || draftKey === seedKey) {
      setDraft(seed);
      setDraftKey(seedKey);
    }
  }, [draft, draftKey, seed, seedKey]);

  return {
    draft,
    setDraft: (next: ExtensionSettings | null) => {
      setDraft(next);
      setDraftKey(next ? JSON.stringify(next) : null);
    }
  };
}
