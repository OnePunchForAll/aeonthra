import { useEffect, useMemo, useState } from "react";
import { SpringPhysicsEngine } from "@learning/interactions-engine";
import type { GravityAssignmentNode, GravityConceptNode } from "../lib/interactions-runtime";
import { Button } from "./primitives/Button";
import { Card } from "./primitives/Card";

type BodyFrame = Record<string, { x: number; y: number }>;

function orbitPosition(cx: number, cy: number, radius: number, angle: number) {
  return {
    x: cx + Math.cos(angle) * radius,
    y: cy + Math.sin(angle) * radius
  };
}

export function GravityFieldBoard(props: {
  concepts: GravityConceptNode[];
  assignments: GravityAssignmentNode[];
  onPractice: (conceptId: string) => void;
}) {
  const [selectedConceptId, setSelectedConceptId] = useState<string | null>(props.concepts[0]?.id ?? null);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [frame, setFrame] = useState<BodyFrame>({});

  useEffect(() => {
    if (props.concepts.length === 0) return;
    const physics = new SpringPhysicsEngine();
    const conceptSeeds = new Map<string, { x: number; y: number }>();
    props.concepts.forEach((concept, index) => {
      const angle = (index / props.concepts.length) * Math.PI * 2;
      const seed = orbitPosition(500, 320, 180 + (index % 3) * 40, angle);
      conceptSeeds.set(concept.id, seed);
      physics.addBody({
        id: concept.id,
        position: seed,
        velocity: { x: 0, y: 0 },
        mass: 1 + concept.mass * 4,
        radius: 24 + concept.mass * 18,
        fixed: true
      });
    });
    props.assignments.forEach((assignment, index) => {
      const base = assignment.homeConceptId ? (conceptSeeds.get(assignment.homeConceptId) ?? { x: 500, y: 320 }) : { x: 500, y: 320 };
      const radius = 90 + index * 10 + assignment.urgency * 24;
      physics.addBody({
        id: assignment.id,
        position: orbitPosition(base.x, base.y, radius, index),
        velocity: { x: 0, y: 0 },
        mass: 0.8,
        radius: 12
      });
      if (assignment.homeConceptId) {
        physics.orbit(assignment.id, assignment.homeConceptId, radius, 260 + index * 30);
        physics.addSpring(assignment.id, assignment.homeConceptId, radius, 0.0006 + assignment.urgency * 0.0014);
      }
    });
    physics.start((bodies) => {
      const next: BodyFrame = {};
      bodies.forEach((body, id) => {
        next[id] = { x: body.position.x, y: body.position.y };
      });
      setFrame(next);
    });
    return () => physics.stop();
  }, [props.assignments, props.concepts]);

  const inspectorConcept = useMemo(
    () => props.concepts.find((concept) => concept.id === selectedConceptId) ?? null,
    [props.concepts, selectedConceptId]
  );
  const inspectorAssignment = useMemo(
    () => props.assignments.find((assignment) => assignment.id === selectedAssignmentId) ?? null,
    [props.assignments, selectedAssignmentId]
  );

  return (
    <div className="interaction-surface gravity-layout">
      <Card accent="gold">
        <div className="eyebrow">GRAVITY FIELD</div>
        {props.concepts.length === 0 ? (
          <div className="requirement-line requirement-line--empty">
            Gravity Field is waiting for stronger study concepts before it draws the semester map.
          </div>
        ) : (
          <svg viewBox="0 0 1000 640" className="gravity-svg">
            {props.assignments.map((assignment) => {
              const current = frame[assignment.id];
              const home = assignment.homeConceptId ? frame[assignment.homeConceptId] : null;
              const dx = current && home ? current.x - home.x : 0;
              const dy = current && home ? current.y - home.y : 0;
              const orbitRadius = current && home ? Math.sqrt(dx * dx + dy * dy) : 0;
              return (
                <g key={assignment.id}>
                  {home && current ? <circle cx={home.x} cy={home.y} r={orbitRadius} fill="none" stroke="rgba(255,255,255,0.08)" strokeDasharray="6 8" /> : null}
                  {current ? (
                    <g
                      onClick={() => { setSelectedAssignmentId(assignment.id); setSelectedConceptId(assignment.homeConceptId); }}
                    >
                      <circle
                        cx={current.x}
                        cy={current.y}
                        r={assignment.wobble ? 10 : 8}
                        fill={assignment.wobble ? "#94a3b8" : "#f8fafc"}
                      />
                      <text x={current.x} y={current.y - 14} textAnchor="middle" className="gravity-label">
                        {assignment.title.split(/\s+/).slice(0, 2).join(" ")}
                      </text>
                    </g>
                  ) : null}
                </g>
              );
            })}
            {props.concepts.map((concept) => {
              const current = frame[concept.id];
              if (!current) return null;
              const radius = 24 + concept.mass * 28;
              return (
                <g key={concept.id} onClick={() => { setSelectedConceptId(concept.id); setSelectedAssignmentId(null); }}>
                  <circle cx={current.x} cy={current.y} r={radius + 10} fill={concept.color} opacity={0.16} />
                  <circle cx={current.x} cy={current.y} r={radius} fill={concept.color} />
                  <text x={current.x} y={current.y + radius + 18} className="gravity-label" textAnchor="middle">{concept.label}</text>
                </g>
              );
            })}
          </svg>
        )}
      </Card>
      <Card accent="cyan">
        <div className="eyebrow">INSPECTOR</div>
        {inspectorConcept ? (
          <div className="stack-md">
            <h3>{inspectorConcept.label}</h3>
            <div className="mono subtle">Mastery {Math.round(inspectorConcept.mastery * 100)}% | Mass {inspectorConcept.mass.toFixed(2)}</div>
            <div className="muted">Dependent assignments: {inspectorConcept.dependencyCount}</div>
            <Button onClick={() => props.onPractice(inspectorConcept.id)}>Practice Now</Button>
          </div>
        ) : null}
        {inspectorAssignment ? (
          <div className="trail-panel">
            <div className="issue__title">{inspectorAssignment.title}</div>
            {inspectorAssignment.dependencyStrengths.map((dependency) => {
              const label = props.concepts.find((c) => c.id === dependency.conceptId)?.label
                ?? dependency.conceptId.replace(/-/g, " ");
              return (
                <div key={dependency.conceptId} className="mono subtle">
                  {label} | {Math.round(dependency.strength * 100)}%
                </div>
              );
            })}
          </div>
        ) : null}
      </Card>
    </div>
  );
}
