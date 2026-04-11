import { Card } from "./primitives/Card";
import { Button } from "./primitives/Button";

type InteractionSurface = "oracle" | "gravity" | "collision" | "duel";

export function InteractionDeck(props: {
  hasAssignment: boolean;
  onOpenSurface: (surface: InteractionSurface) => void;
  onOpenAssignment: () => void;
}) {
  const cards: Array<{ title: string; line: string; cta: string; action: () => void; accent: "cyan" | "teal" | "gold" | "purple" | "orange" }> = [
    { title: "Echo Chamber", line: "The book whispers while you write.", cta: "Open Assignment", action: props.onOpenAssignment, accent: "cyan" },
    { title: "Oracle Panel", line: "Ask the thinkers directly.", cta: "Open Oracle", action: () => props.onOpenSurface("oracle"), accent: "purple" },
    { title: "Gravity Field", line: "Watch your workload orbit knowledge.", cta: "Open Gravity", action: () => props.onOpenSurface("gravity"), accent: "gold" },
    { title: "Shadow Reader", line: "The textbook drifts at the edges of your work.", cta: "Always On", action: props.onOpenAssignment, accent: "teal" },
    { title: "Failure Atlas", line: "Learn what failure looks like before you try.", cta: "Open Assignment", action: props.onOpenAssignment, accent: "orange" },
    { title: "Collision Lab", line: "Smash ideas together and see what survives.", cta: "Open Collision", action: () => props.onOpenSurface("collision"), accent: "cyan" },
    { title: "Duel Arena", line: "Let concepts argue and judge the winner.", cta: "Open Duel", action: () => props.onOpenSurface("duel"), accent: "purple" },
    { title: "Prompt Prism", line: "Refract one prompt into five valid paths.", cta: "Open Assignment", action: props.onOpenAssignment, accent: "teal" },
    { title: "Time Capsule", line: "Promise something to the version of you who submits.", cta: "Open Assignment", action: props.onOpenAssignment, accent: "gold" }
  ];

  return (
    <div className="interaction-grid">
      {cards.map((card) => (
        <Card key={card.title} accent={card.accent}>
          <div className="eyebrow">INTERACTION</div>
          <h3>{card.title}</h3>
          <p className="muted">{card.line}</p>
          <Button variant={card.title === "Oracle Panel" ? "purple" : card.title === "Gravity Field" ? "gold" : "primary"} onClick={card.action} disabled={!props.hasAssignment && card.cta === "Open Assignment"}>
            {card.cta}
          </Button>
        </Card>
      ))}
    </div>
  );
}
