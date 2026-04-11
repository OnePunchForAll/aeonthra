import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import type { CourseTask, WeekGroup } from "../lib/workspace";

type FocusState = {
  conceptId: string | null;
  related: Set<string>;
};

const spring = { type: "spring", stiffness: 280, damping: 24, mass: 1 } as const;

function resonance(conceptIds: string[], focus: FocusState): "focused" | "related" | "dim" | "idle" {
  if (!focus.conceptId) return "idle";
  if (conceptIds.includes(focus.conceptId)) return "focused";
  if (conceptIds.some((id) => focus.related.has(id))) return "related";
  return "dim";
}

export function TimelineBoard(props: {
  weeks: WeekGroup[];
  tasks: CourseTask[];
  focus: FocusState;
  onOpenTask: (taskId: string) => void;
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) {
      return undefined;
    }

    let dragging = false;
    let startX = 0;
    let startScrollLeft = 0;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Element && target.closest(".timeline-event")) {
        return;
      }
      dragging = true;
      startX = event.clientX;
      startScrollLeft = track.scrollLeft;
      track.setPointerCapture(event.pointerId);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!dragging) {
        return;
      }
      track.scrollLeft = startScrollLeft - (event.clientX - startX);
    };

    const onPointerUp = (event: PointerEvent) => {
      dragging = false;
      if (track.hasPointerCapture(event.pointerId)) {
        track.releasePointerCapture(event.pointerId);
      }
    };

    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
        track.scrollLeft += event.deltaY;
        event.preventDefault();
      }
    };

    track.addEventListener("pointerdown", onPointerDown);
    track.addEventListener("pointermove", onPointerMove);
    track.addEventListener("pointerup", onPointerUp);
    track.addEventListener("pointercancel", onPointerUp);
    track.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      track.removeEventListener("pointerdown", onPointerDown);
      track.removeEventListener("pointermove", onPointerMove);
      track.removeEventListener("pointerup", onPointerUp);
      track.removeEventListener("pointercancel", onPointerUp);
      track.removeEventListener("wheel", onWheel);
    };
  }, []);

  if (props.weeks.length === 0) {
    return (
      <div className="timeline-view">
        <div className="eyebrow">SEMESTER TIMELINE</div>
        <div className="timeline-empty">No timeline items were derived from this capture yet.</div>
      </div>
    );
  }

  return (
    <div className="timeline-view">
      <div className="eyebrow">SEMESTER TIMELINE</div>
      <div ref={trackRef} className="timeline-track">
        <div className="timeline-track__today-line" style={{ left: "32px" }} />
        {props.weeks.map((week) => (
          <div key={week.id} className="week-column">
            <div className="week-column__header">WEEK OF {week.label.toUpperCase()}</div>
            {week.events.map((event) => {
              const task = props.tasks.find((entry) => entry.id === event.linkedItemId);
              return (
                <motion.button
                  key={event.id}
                  type="button"
                  transition={spring}
                  whileHover={{ y: -4 }}
                  className={`timeline-event timeline-event--${task ? resonance(task.conceptIds, props.focus) : "idle"}`}
                  data-kind={event.kind}
                  data-status={event.status}
                  aria-label={`${event.kind}: ${event.title}, due ${new Intl.DateTimeFormat(undefined, { month: "long", day: "numeric" }).format(event.dueDate)}`}
                  onPointerDown={(pointerEvent) => {
                    pointerEvent.stopPropagation();
                  }}
                  onClick={(clickEvent) => {
                    clickEvent.preventDefault();
                    clickEvent.stopPropagation();
                    props.onOpenTask(event.linkedItemId);
                  }}
                >
                  <div className="timeline-event__title">{event.title}</div>
                  <div className="timeline-event__detail">{event.detail}</div>
                  <div className="mono subtle">{new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(event.dueDate)}</div>
                </motion.button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
