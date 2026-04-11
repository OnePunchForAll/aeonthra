import { motion } from "framer-motion";
import type { LearningBundle } from "@learning/schema";
import { Button } from "./primitives/Button";
import { Card } from "./primitives/Card";
import { ProgressBar } from "./primitives/ProgressBar";
import { Tag } from "./primitives/Tag";
import type { AppProgress, CourseTask, SourceTeachMatch, WeekGroup } from "../lib/workspace";

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

export function MissionControl(props: {
  title: string;
  sourceHost: string;
  learning: LearningBundle;
  progress: AppProgress;
  tasks: CourseTask[];
  sourceMatches: SourceTeachMatch[];
  weeks: WeekGroup[];
  focus: FocusState;
  onConceptHover: (conceptId: string | null) => void;
  onOpenTask: (taskId: string) => void;
  onOpenSurface: (surface: "timeline" | "concept-map" | "forge") => void;
}) {
  const unlocked = props.tasks.filter((task) => task.conceptIds.every((id) => (props.progress.conceptMastery[id] ?? 0) >= 0.6) || props.progress.practiceMode).length;
  const nextWeek = props.weeks[0];

  return (
    <div className="stack-lg">
      <div className="summary-grid grid-cards">
        <Card accent="cyan">
          <div className="eyebrow">CAPTURE SUMMARY</div>
          <h3>{props.title}</h3>
          <div className="source-facts">
            <div className="fact-row"><span className="eyebrow">Source</span><span>{props.sourceHost}</span></div>
            <div className="fact-row"><span className="eyebrow">Tasks</span><span className="counter">{props.tasks.length}</span></div>
            <div className="fact-row"><span className="eyebrow">Concepts</span><span className="counter">{props.learning.concepts.length}</span></div>
            <div className="fact-row"><span className="eyebrow">Top concept</span><span>{props.learning.concepts[0]?.label ?? "None"}</span></div>
          </div>
        </Card>

        <Card accent="purple">
          <div className="eyebrow">MISSION CONTROL</div>
          <div className="stats-grid">
            <div className="stat-card"><div className="stat-label">Unlocked</div><div className="stat-value">{unlocked}/{props.tasks.length}</div></div>
            <div className="stat-card"><div className="stat-label">Mastered</div><div className="stat-value">{props.learning.concepts.filter((concept) => (props.progress.conceptMastery[concept.id] ?? 0) >= 0.8).length}</div></div>
            <div className="stat-card"><div className="stat-label">Forge Ready</div><div className="stat-value">{props.learning.protocol.totalMinutes} min</div></div>
            <div className="stat-card"><div className="stat-label">Practice Mode</div><div className="stat-value">{props.progress.practiceMode ? "ON" : "OFF"}</div></div>
          </div>
        </Card>
      </div>

      <div className="dashboard-stream stack-lg">
        <Card accent="teal">
          <div className="eyebrow">TIMELINE</div>
          {props.weeks.length > 0 ? (
            <button className="timeline-preview" onClick={() => props.onOpenSurface("timeline")}>
              {props.weeks.slice(0, 3).map((week) => (
                <div key={week.id} className="timeline-preview__week">
                  <div className="eyebrow">{week.label}</div>
                  {week.events.slice(0, 3).map((event) => (
                    <div key={event.id} className={`timeline-preview__event timeline-preview__event--${event.status}`}>{event.title}</div>
                  ))}
                </div>
              ))}
            </button>
          ) : (
            <div className="timeline-empty">No timeline items are available yet.</div>
          )}
          {nextWeek ? <div className="subtle">Current window opens on {nextWeek.label}.</div> : null}
        </Card>

        <Card accent="cyan">
          <div className="eyebrow">ACTIVE WORK</div>
          <div className="task-list">
            {props.tasks.length > 0 ? props.tasks.slice(0, 8).map((task) => {
              const locked = !props.progress.practiceMode && task.conceptIds.some((id) => (props.progress.conceptMastery[id] ?? 0) < 0.6);
              return (
                <motion.button
                  key={task.id}
                  layout
                  transition={spring}
                  whileHover={{ y: -4 }}
                  className={`task-card task-card--${resonance(task.conceptIds, props.focus)}`}
                  onClick={() => props.onOpenTask(task.id)}
                >
                  <div className="task-card__top">
                    <Tag accent={task.kind === "discussion" ? "teal" : task.kind === "quiz" ? "purple" : "cyan"}>{task.kind}</Tag>
                    {locked ? <Tag accent="orange">Locked</Tag> : <Tag accent="green">Open</Tag>}
                  </div>
                  <div className="task-card__title">{task.title}</div>
                  <p className="muted">{task.summary}</p>
                  <div className="task-card__foot mono">{task.estimatedMinutes} min</div>
                </motion.button>
              );
            }) : <div className="timeline-empty">No task cards were derived from this capture.</div>}
          </div>
        </Card>

        <Card accent="gold">
          <div className="eyebrow">CONCEPT FIELD</div>
          <div className="concept-chip-grid">
            {props.learning.concepts.length > 0 ? props.learning.concepts.slice(0, 10).map((concept) => {
              const mastery = Math.round((props.progress.conceptMastery[concept.id] ?? 0) * 100);
              return (
                <motion.button
                  key={concept.id}
                  layout
                  transition={spring}
                  className={`concept-chip concept-chip--${resonance([concept.id], props.focus)}`}
                  onMouseEnter={() => props.onConceptHover(concept.id)}
                  onMouseLeave={() => props.onConceptHover(null)}
                  onClick={() => props.onOpenSurface("concept-map")}
                >
                  <div className="concept-chip__title">{concept.label}</div>
                  <ProgressBar value={mastery} />
                  <div className="mono subtle">{mastery}%</div>
                </motion.button>
              );
            }) : <div className="timeline-empty">No concepts survived the quality gates for this source.</div>}
          </div>
          <div className="action-row"><Button onClick={() => props.onOpenSurface("forge")}>Open Neural Forge</Button></div>
        </Card>

        <Card accent="purple">
          <div className="eyebrow">SOURCE TRAIL</div>
          <div className="trail-list">
            {props.sourceMatches.length > 0 ? props.sourceMatches.slice(0, 6).map((match) => (
              <motion.div key={match.sourceItemId} layout transition={spring} className={`trail-panel trail-panel--${resonance(match.concepts.map((concept) => concept.id), props.focus)}`}>
                <div className="trail-head">
                  <Tag accent={match.level === "strongly-related" ? "cyan" : match.level === "related" ? "teal" : "purple"}>{match.level}</Tag>
                  <a className="trail-link" href={match.url} target="_blank" rel="noreferrer">{match.title}</a>
                </div>
                <div className="trail-concepts">
                  {match.concepts.map((concept) => (
                    <span
                      key={concept.id}
                      className="trail-concept"
                      onMouseEnter={() => props.onConceptHover(concept.id)}
                      onMouseLeave={() => props.onConceptHover(null)}
                    >
                      {concept.label} | {concept.matchType}
                    </span>
                  ))}
                </div>
              </motion.div>
            )) : <div className="timeline-empty">No clean source trail matches were available.</div>}
          </div>
        </Card>
      </div>
    </div>
  );
}
