import { useMemo, useState } from "react";
import type { PanelResponse } from "@learning/interactions-engine";
import type { OracleThinkerSummary } from "../lib/interactions-runtime";
import { Button } from "./primitives/Button";
import { Card } from "./primitives/Card";

export function OraclePanel(props: {
  thinkers: OracleThinkerSummary[];
  onAsk: (question: string) => PanelResponse;
}) {
  const [question, setQuestion] = useState("Is this assignment's central framework actually persuasive?");
  const [panel, setPanel] = useState<PanelResponse | null>(null);
  const [openThinkers, setOpenThinkers] = useState<Record<string, boolean>>({});

  const visibleThinkers = useMemo(() => props.thinkers.slice(0, 6), [props.thinkers]);

  return (
    <div className="interaction-surface stack-lg">
      <Card accent="purple">
        <div className="eyebrow">ORACLE PANEL</div>
        {visibleThinkers.length === 0 ? (
          <div className="requirement-line requirement-line--empty">
            Oracle Panel is waiting for clearly attributed thinkers in the imported source.
          </div>
        ) : (
          <>
            <div className="oracle-roster">
              {visibleThinkers.map((thinker) => (
                <div key={thinker.thinker} className="oracle-thinker">
                  <div className="oracle-thinker__name">{thinker.thinker}</div>
                  {thinker.tradition ? <div className="subtle">{thinker.tradition}</div> : null}
                  <div className="subtle">{thinker.quoteCount} positions indexed</div>
                </div>
              ))}
            </div>
            <textarea className="notes-area" value={question} onChange={(event) => setQuestion(event.target.value)} />
            <div className="action-row">
              <Button variant="purple" onClick={() => setPanel(props.onAsk(question))}>Ask the Panel</Button>
            </div>
          </>
        )}
      </Card>

      {panel ? (
        <div className="interaction-grid">
          {Object.entries(panel.responses).map(([thinker, response]) => (
            <Card key={thinker} accent="cyan">
              <div className="eyebrow">{thinker}</div>
              {visibleThinkers.find((entry) => entry.thinker === thinker)?.tradition ? (
                <div className="subtle">{visibleThinkers.find((entry) => entry.thinker === thinker)?.tradition}</div>
              ) : null}
              <p>{response.text || response.sources[0]?.passage || "Insufficient source material for this response."}</p>
              {response.sources[0]?.page ? (
                <div className="subtle">p. {response.sources[0].page}</div>
              ) : null}
              <div className="subtle">[SYNTHESIZED FROM TEXTBOOK QUOTES]</div>
              <Button variant="ghost" onClick={() => setOpenThinkers((current) => ({ ...current, [thinker]: !current[thinker] }))}>
                {openThinkers[thinker] ? "Hide Source Passages" : "Show Source Passages"}
              </Button>
              {openThinkers[thinker] ? (
                <div className="stack-sm">
                  {response.sources.map((source, index) => (
                    <div key={`${thinker}-${index}`} className="trail-panel">
                      <div className="eyebrow">p. {source.page}</div>
                      <div className="muted">{source.passage}</div>
                    </div>
                  ))}
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}
