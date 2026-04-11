import { useState } from "react";
import type { DuelRound } from "@learning/interactions-engine";
import type { LearningBundle } from "@learning/schema";
import { Button } from "./primitives/Button";
import { Card } from "./primitives/Card";
import { sanitizeDisplayText } from "../lib/display";

export function DuelArena(props: {
  learning: LearningBundle;
  oracleMemory: Array<{ thinker: string; response: string; askedAt: number }>;
  onBuildRounds: (leftConceptId: string, rightConceptId: string) => DuelRound[];
}) {
  const [left, setLeft] = useState(props.learning.concepts[0]?.id ?? "");
  const [right, setRight] = useState(props.learning.concepts[1]?.id ?? props.learning.concepts[0]?.id ?? "");
  const [rounds, setRounds] = useState<DuelRound[]>([]);

  return (
    <div className="interaction-surface stack-lg">
      <Card accent="purple">
        <div className="eyebrow">DUEL ARENA</div>
        {props.learning.concepts.length < 2 ? (
          <div className="requirement-line requirement-line--empty">
            Duel Arena needs at least two strong concepts before it can stage a real clash.
          </div>
        ) : (
          <>
            <div className="settings-grid">
              <select className="text-input" value={left} onChange={(event) => setLeft(event.target.value)}>
                {props.learning.concepts.map((concept) => <option key={concept.id} value={concept.id}>{concept.label}</option>)}
              </select>
              <select className="text-input" value={right} onChange={(event) => setRight(event.target.value)}>
                {props.learning.concepts.map((concept) => <option key={concept.id} value={concept.id}>{concept.label}</option>)}
              </select>
            </div>
            <Button variant="purple" onClick={() => setRounds(props.onBuildRounds(left, right))}>Start Duel</Button>
          </>
        )}
      </Card>

      <div className="stack-md">
        {rounds.map((round) => (
          <Card key={round.round} accent={round.type === "opening" ? "cyan" : round.type === "closing" ? "gold" : "teal"}>
            <div className="eyebrow">ROUND {round.round} | {round.type.toUpperCase()}</div>
            <div className="duel-grid">
              <div>
                <h3>{round.leftPosition.speaker}</h3>
                <p>{round.leftPosition.content}</p>
                <div className="subtle">{sanitizeDisplayText(round.leftPosition.source)}</div>
              </div>
              <div>
                <h3>{round.rightPosition.speaker}</h3>
                <p>{round.rightPosition.content}</p>
                <div className="subtle">{sanitizeDisplayText(round.rightPosition.source)}</div>
              </div>
            </div>
            <div className="processing-note">{round.verdictHint}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}
