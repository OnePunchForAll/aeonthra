import { useMemo, useState } from "react";
import type { LearningBundle } from "@learning/schema";
import type { CollisionReport } from "@learning/interactions-engine";
import { Button } from "./primitives/Button";
import { Card } from "./primitives/Card";
import { sanitizeDisplayText } from "../lib/display";

export function CollisionLab(props: {
  learning: LearningBundle;
  onCollide: (leftConceptId: string, rightConceptId: string) => CollisionReport | null;
}) {
  const [left, setLeft] = useState(props.learning.concepts[0]?.id ?? "");
  const [right, setRight] = useState(props.learning.concepts[1]?.id ?? props.learning.concepts[0]?.id ?? "");
  const [report, setReport] = useState<CollisionReport | null>(null);

  const selected = useMemo(() => ({
    left: props.learning.concepts.find((concept) => concept.id === left),
    right: props.learning.concepts.find((concept) => concept.id === right)
  }), [left, props.learning.concepts, right]);

  return (
    <div className="interaction-surface stack-lg">
      <Card accent="cyan">
        <div className="eyebrow">COLLISION LAB</div>
        <div className="collision-dropzones">
          <div className="collision-dropzone">
            <div className="eyebrow">Concept A</div>
            <select className="text-input" value={left} onChange={(event) => setLeft(event.target.value)}>
              {props.learning.concepts.map((concept) => <option key={concept.id} value={concept.id}>{concept.label}</option>)}
            </select>
          </div>
          <div className="collision-dropzone">
            <div className="eyebrow">Concept B</div>
            <select className="text-input" value={right} onChange={(event) => setRight(event.target.value)}>
              {props.learning.concepts.map((concept) => <option key={concept.id} value={concept.id}>{concept.label}</option>)}
            </select>
          </div>
        </div>
        <div className="action-row">
          <Button onClick={() => setReport(props.onCollide(left, right))}>Collide Concepts</Button>
        </div>
        {selected.left && selected.right ? <div className="subtle">{selected.left.label} vs {selected.right.label}</div> : null}
      </Card>

      {report ? (
        <div className="interaction-grid">
          <Card accent="teal">
            <div className="eyebrow">SHARED GROUND</div>
            {report.sharedGround.map((line) => <div key={line} className="requirement-line">{line}</div>)}
          </Card>
          <Card accent="orange">
            <div className="eyebrow">TENSIONS</div>
            {report.tensions.map((tension) => (
              <div key={tension.dimension} className="trail-panel">
                <div className="issue__title">{tension.dimension}</div>
                <div className="muted">{tension.aPosition}</div>
                <div className="muted">{tension.bPosition}</div>
                <div className="subtle">{tension.evidence}</div>
              </div>
            ))}
          </Card>
          <Card accent="gold">
            <div className="eyebrow">SYNTHESIS</div>
            <p>{report.synthesis?.explanation ?? "No direct bridge concept was found. Let the tension stand."}</p>
          </Card>
          <Card accent="purple">
            <div className="eyebrow">HISTORICAL COLLISIONS</div>
            {report.historicalCollisions.map((reference, index) => (
              <div key={`${reference.source}:${index}:${reference.passage.slice(0, 24)}`} className="trail-panel">
                <div className="muted">{reference.passage}</div>
                <div className="subtle">{sanitizeDisplayText(reference.source)}</div>
              </div>
            ))}
          </Card>
        </div>
      ) : null}
    </div>
  );
}
