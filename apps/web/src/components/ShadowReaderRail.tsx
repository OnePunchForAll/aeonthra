import { useEffect, useMemo, useRef, useState } from "react";
import type { AmbientItem } from "@learning/interactions-engine";
import type { ShadowSettings } from "../lib/interactions-runtime";
import { sanitizeDisplayText } from "../lib/display";

export function ShadowReaderRail(props: {
  items: AmbientItem[];
  seen: number;
  familiar: number;
  settings: ShadowSettings;
  onSettingsChange: (settings: ShadowSettings) => void;
  onAnchor: (item: AmbientItem) => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const fadeTimerRef = useRef<number | null>(null);

  const durationMs = props.settings.intensity === "gentle"
    ? 14000
    : props.settings.intensity === "immersive"
      ? 9000
      : 12000;

  useEffect(() => {
    setCurrentIndex(0);
    setVisible(true);
  }, [props.items.length, props.settings.intensity]);

  useEffect(() => {
    if (props.items.length <= 1) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      setVisible(false);
      fadeTimerRef.current = window.setTimeout(() => {
        setCurrentIndex((previous) => (previous + 1) % props.items.length);
        setVisible(true);
      }, 600);
    }, durationMs);

    return () => {
      window.clearInterval(interval);
      if (fadeTimerRef.current !== null) {
        window.clearTimeout(fadeTimerRef.current);
      }
    };
  }, [durationMs, props.items.length]);

  const current = props.items[Math.min(currentIndex, props.items.length - 1)] ?? props.items[0]!;
  const source = useMemo(() => sanitizeDisplayText(current?.source ?? ""), [current?.source]);
  const content = useMemo(() => sanitizeDisplayText(current?.content ?? ""), [current?.content]);

  if (props.items.length === 0 || !current) {
    return null;
  }

  return (
    <aside className="shadow-rail">
      <div className="shadow-rail__header">
        <div className="shadow-rail__label">SHADOW READER</div>
        <div className="shadow-counter">Seen: {props.seen} | Familiar: {props.familiar}</div>
      </div>
      <div className="shadow-controls">
        <select
          className="text-input"
          value={props.settings.intensity}
          onChange={(event) => props.onSettingsChange({ ...props.settings, intensity: event.target.value as ShadowSettings["intensity"] })}
        >
          <option value="off">Off</option>
          <option value="gentle">Gentle</option>
          <option value="steady">Steady</option>
          <option value="immersive">Immersive</option>
        </select>
      </div>
      <div className="shadow-rail__body">
        <button
          key={`${current.id}:${current.lastShownAt}`}
          className={`shadow-passage ${visible ? "shadow-passage--visible" : "shadow-passage--hidden"}`}
          type="button"
          onClick={() => props.onAnchor(current)}
        >
          <span className="shadow-passage__source">{source}</span>
          <span className="shadow-passage__text">{content}</span>
        </button>
      </div>
    </aside>
  );
}
