import { useMemo, useRef } from "react";
import type { LearningBundle } from "@learning/schema";
import { Card } from "./primitives/Card";
import type { AppProgress } from "../lib/workspace";
import { exportConceptMapPng } from "../lib/export";
import { aeonthraTts } from "../lib/tts";

type FocusState = {
  conceptId: string | null;
  related: Set<string>;
};

type PositionedConcept = {
  id: string;
  x: number;
  y: number;
  labelX: number;
  labelY: number;
  labelAnchor: "start" | "end";
  concept: LearningBundle["concepts"][number];
};

function resonance(conceptId: string, focus: FocusState): "focused" | "related" | "dim" | "idle" {
  if (!focus.conceptId) return "idle";
  if (conceptId === focus.conceptId) return "focused";
  if (focus.related.has(conceptId)) return "related";
  return "dim";
}

function masteryColor(value: number): string {
  if (value < 0.2) return "#334155";
  if (value < 0.4) return "#0ea5e9";
  if (value < 0.6) return "#00f0ff";
  if (value < 0.8) return "#06d6a0";
  return "#ffd700";
}

function truncateLabel(label: string): string {
  return label.length > 26 ? `${label.slice(0, 23).trim()}...` : label;
}

function normalized(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function hasMemoryAnchor(text: string): boolean {
  return /picture|imagine|think of|remember|like|not|rhymes|glowing|meter|guitar|string|matrix|compass/i.test(text);
}

function layoutConcepts(concepts: LearningBundle["concepts"], width: number, height: number): PositionedConcept[] {
  const centerX = width / 2;
  const centerY = height / 2;
  const outerRadius = Math.min(width, height) * 0.34;
  const innerRadius = outerRadius * 0.68;
  const positioned = concepts.map((concept, index) => {
    const useOuter = index % 2 === 0;
    const angle = (index / Math.max(concepts.length, 1)) * Math.PI * 2 - Math.PI / 2;
    const radius = useOuter ? outerRadius : innerRadius;
    return {
      id: concept.id,
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
      targetX: centerX + Math.cos(angle) * radius,
      targetY: centerY + Math.sin(angle) * radius,
      angle,
      concept
    };
  });

  for (let iteration = 0; iteration < 36; iteration += 1) {
    for (let i = 0; i < positioned.length; i += 1) {
      for (let j = i + 1; j < positioned.length; j += 1) {
        const left = positioned[i]!;
        const right = positioned[j]!;
        const dx = right.x - left.x;
        const dy = right.y - left.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;
        const minimum = 108;
        if (distance >= minimum) continue;
        const force = (minimum - distance) / 2;
        const offsetX = (dx / distance) * force;
        const offsetY = (dy / distance) * force;
        left.x -= offsetX;
        left.y -= offsetY;
        right.x += offsetX;
        right.y += offsetY;
      }
    }

    positioned.forEach((node) => {
      node.x += (node.targetX - node.x) * 0.08;
      node.y += (node.targetY - node.y) * 0.08;
      node.x = Math.max(96, Math.min(width - 96, node.x));
      node.y = Math.max(72, Math.min(height - 72, node.y));
    });
  }

  return positioned.map((node) => {
    const anchor = node.x < centerX ? "end" : "start";
    const labelOffsetX = anchor === "start" ? 34 : -34;
    const labelOffsetY = Math.sin(node.angle) * 8;
    return {
      id: node.id,
      x: node.x,
      y: node.y,
      labelX: node.x + labelOffsetX,
      labelY: node.y + labelOffsetY,
      labelAnchor: anchor,
      concept: node.concept
    };
  });
}

export function ConceptMapBoard(props: {
  learning: LearningBundle;
  progress: AppProgress;
  focus: FocusState;
  selectedConceptId: string | null;
  onFocus: (conceptId: string | null) => void;
  collisionHighlight?: { fromId: string; toId: string; label: string } | null;
}) {
  const width = 920;
  const height = 620;
  const svgRef = useRef<SVGSVGElement | null>(null);
  const positions = useMemo(() => layoutConcepts(props.learning.concepts, width, height), [props.learning.concepts]);
  const positionMap = new Map(positions.map((entry) => [entry.id, entry]));
  const selected = props.learning.concepts.find((concept) => concept.id === props.selectedConceptId) ?? props.learning.concepts[0] ?? null;
  const detail = selected && normalized(selected.summary) !== normalized(selected.definition) ? selected.summary : "";
  const mnemonic = selected?.mnemonic && hasMemoryAnchor(selected.mnemonic) ? selected.mnemonic : "";
  const confusion = selected?.commonConfusion && !/easy mistake|page label|title and lose|actual claim/i.test(selected.commonConfusion)
    ? selected.commonConfusion
    : "";

  return (
    <div className="concept-map-layout">
      <Card accent="cyan">
        <div className="action-row action-row--spread">
          <div className="eyebrow">CONCEPT MAP</div>
          <button className="micro-button" type="button" onClick={() => { if (svgRef.current) { void exportConceptMapPng(svgRef.current); } }}>
            Export PNG
          </button>
        </div>
        <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} className="concept-map-svg">
          {props.learning.relations.map((relation) => {
            const from = positionMap.get(relation.fromId);
            const to = positionMap.get(relation.toId);
            if (!from || !to) return null;
            const active = props.focus.related.has(relation.fromId) || props.focus.related.has(relation.toId);
            const collided = props.collisionHighlight && (
              (props.collisionHighlight.fromId === relation.fromId && props.collisionHighlight.toId === relation.toId) ||
              (props.collisionHighlight.fromId === relation.toId && props.collisionHighlight.toId === relation.fromId)
            );
            return (
              <g key={`${relation.fromId}-${relation.toId}`}>
                <line
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke={collided ? "rgba(255,215,0,0.72)" : active ? "rgba(0,240,255,0.55)" : "rgba(26,26,58,0.92)"}
                  strokeWidth={collided ? 3 : active ? 2.2 : 1.2}
                />
                {collided ? (
                  <text x={(from.x + to.x) / 2} y={(from.y + to.y) / 2 - 10} textAnchor="middle" className="concept-node__label">
                    {props.collisionHighlight?.label}
                  </text>
                ) : null}
              </g>
            );
          })}
          {positions.map(({ concept, x, y, labelX, labelY, labelAnchor }) => {
            const mastery = props.progress.conceptMastery[concept.id] ?? 0;
            const radius = 18 + mastery * 14 + (props.selectedConceptId === concept.id ? 6 : 0);
            return (
              <g
                key={concept.id}
                transform={`translate(${x} ${y})`}
                className={`concept-node concept-node--${resonance(concept.id, props.focus)}`}
                role="button"
                aria-label={`${concept.label}, mastery ${Math.round(mastery * 100)} percent`}
                tabIndex={0}
                onMouseEnter={() => props.onFocus(concept.id)}
                onMouseLeave={() => props.onFocus(null)}
                onClick={() => props.onFocus(concept.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    props.onFocus(concept.id);
                  }
                }}
              >
                <circle r={radius + 7} fill={masteryColor(mastery)} opacity={0.12} />
                <circle r={radius} fill={masteryColor(mastery)} />
                <text x={labelX - x} y={labelY - y} textAnchor={labelAnchor} className="concept-node__label">
                  {truncateLabel(concept.label)}
                </text>
              </g>
            );
          })}
        </svg>
      </Card>

      <Card accent="gold">
        <div className="eyebrow">CONCEPT DETAIL</div>
        {selected ? (
          <div className="stack-md">
            <div className="action-row action-row--spread">
              <h3>{selected.label}</h3>
              {aeonthraTts.supported() ? (
                <button
                  className="micro-button"
                  type="button"
                  aria-label={`Read ${selected.label} aloud`}
                  onClick={() => aeonthraTts.speaking() ? aeonthraTts.stop() : aeonthraTts.speak(`${selected.label}. ${selected.definition}. ${selected.summary}`)}
                >
                  {aeonthraTts.speaking() ? "Stop Audio" : "Read Aloud"}
                </button>
              ) : null}
            </div>
            <p>{selected.definition}</p>
            {detail ? <p className="muted">{detail}</p> : null}
            {mnemonic ? <div className="subtle">{mnemonic}</div> : null}
            {confusion ? <div className="subtle">{confusion}</div> : null}
          </div>
        ) : (
          <p className="muted">No concept selected yet.</p>
        )}
      </Card>
    </div>
  );
}
