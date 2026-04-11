import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "./primitives/Button";
import { Card } from "./primitives/Card";
import { Tag } from "./primitives/Tag";
import type { ForgeQuestion, ForgeSessionData } from "../lib/forge-session";
import { aeonthraTts } from "../lib/tts";

export type ForgePhase = "genesis" | "forge" | "crucible" | "architect" | "transcend";

export type ForgeRuntimeState = {
  phase: ForgePhase;
  maxPhaseReached: ForgePhase;
  modeIndex: number;
  promptIndex: number;
  selectedOption: number | null;
  revealed: boolean;
  flipped: boolean;
  learnFirst: boolean;
  confidence: number | null;
  teachBack: Record<string, string>;
  score: { correct: number; wrong: number };
};

const PHASE_META: Array<{ id: ForgePhase; label: string; accent: string; duration: number; line: string }> = [
  { id: "genesis", label: "GENESIS", accent: "teal", duration: 12, line: "Know before you know" },
  { id: "forge", label: "FORGE", accent: "cyan", duration: 12, line: "Test under fire" },
  { id: "crucible", label: "CRUCIBLE", accent: "orange", duration: 12, line: "Break false confidence" },
  { id: "architect", label: "ARCHITECT", accent: "purple", duration: 12, line: "Build from nothing" },
  { id: "transcend", label: "TRANSCEND", accent: "gold", duration: 12, line: "Prove mastery" }
];

const spring = { type: "spring", stiffness: 280, damping: 24, mass: 1 } as const;

function phaseIndex(phase: ForgePhase): number {
  return PHASE_META.findIndex((entry) => entry.id === phase);
}

function formatTime(totalSeconds: number): string {
  const safeSeconds = Math.max(totalSeconds, 0);
  const minutes = Math.floor(safeSeconds / 60).toString().padStart(2, "0");
  const seconds = (safeSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function ForgeStudio(props: {
  data: ForgeSessionData;
  state: ForgeRuntimeState;
  running: boolean;
  secondsRemaining: number;
  onToggleTimer: () => void;
  onReveal: () => void;
  onFlip: () => void;
  onLearnFirst: () => void;
  onAnswer: (question: ForgeQuestion, answerIndex: number) => void;
  onSelectOption: (value: number) => void;
  onConfidence: (value: number) => void;
  onTeachBack: (id: string, value: string) => void;
  onAdvance: (completed?: boolean) => void;
  onPhaseSelect: (phase: ForgePhase) => void;
  onExportSummary: () => void;
}) {
  const activeMeta = PHASE_META[phaseIndex(props.state.phase)]!;
  const [primerIndex, setPrimerIndex] = useState(0);
  const ambientPrimers = useMemo(
    () => props.data.genesis.scan.map((concept) => concept.primer).filter((entry) => entry.length >= 20).slice(0, 8),
    [props.data.genesis.scan]
  );

  useEffect(() => {
    if (ambientPrimers.length <= 2) {
      return undefined;
    }
    const timer = window.setInterval(() => {
      setPrimerIndex((current) => (current + 1) % ambientPrimers.length);
    }, 12000);
    return () => window.clearInterval(timer);
  }, [ambientPrimers]);

  const visiblePrimers = ambientPrimers.length <= 2
    ? ambientPrimers
    : [ambientPrimers[primerIndex]!, ambientPrimers[(primerIndex + 1) % ambientPrimers.length]!];

  return (
    <div className="forge-layout">
      <Card accent={activeMeta.accent as "cyan"}>
        <div className="eyebrow">NEURAL FORGE</div>
        <h3>{props.data.chapter.title}</h3>
        <p className="muted">{props.data.chapter.summary}</p>
        <div className="phase-card-row">
          {PHASE_META.map((phase) => {
            const reached = phaseIndex(phase.id) <= phaseIndex(props.state.maxPhaseReached);
            const state = phase.id === props.state.phase ? "active" : reached ? "complete" : "locked";
            const locked = !reached;
            return (
              <motion.button
                key={phase.id}
                whileHover={{ y: locked ? 0 : -2, scale: locked ? 1 : 1.02 }}
                transition={spring}
                className="phase-card"
                data-state={state}
                disabled={locked}
                style={{ ["--phase-color" as string]: `var(--${phase.accent})`, ["--phase-glow" as string]: `rgba(255,255,255,0.18)` }}
                onClick={() => props.onPhaseSelect(phase.id)}
              >
                <div className="phase-card__label">{phase.label}</div>
                <div className="phase-card__duration">{phase.duration}:00</div>
              </motion.button>
            );
          })}
        </div>
        <div className="action-row">
          <Tag accent={activeMeta.accent as "cyan"}>{activeMeta.line}</Tag>
          <Button variant="primary" onClick={props.onToggleTimer}>{props.running ? "Pause Timer" : "Start Timer"}</Button>
          <Button variant="ghost" onClick={props.onExportSummary}>Export Summary</Button>
          <div className="mono subtle">{formatTime(props.secondsRemaining)} | {props.state.score.correct} correct | {props.state.score.wrong} wrong</div>
        </div>
        {renderPhaseBody(props)}
      </Card>
      <div className="notes-panel stack-md">
        <Card accent="teal">
          <div className="eyebrow">AMBIENT PRIMERS</div>
          <div className="forge-ambient">
            {visiblePrimers.length > 0 ? visiblePrimers.map((primer) => <div key={primer} className="ambient-line">{primer}</div>) : <div className="ambient-line ambient-line--empty">No clean primers were available for this chapter.</div>}
          </div>
        </Card>
        <Card accent="gold">
          <div className="eyebrow">PHASE STATUS</div>
          <div className="phase-status-list">
            {PHASE_META.map((phase) => {
              const reached = phaseIndex(phase.id) <= phaseIndex(props.state.maxPhaseReached);
              const status = phase.id === props.state.phase ? "active" : reached ? "complete" : "locked";
              return (
                <div key={phase.id} className={`phase-status-item phase-status-item--${status}`}>
                  <span>{phase.label}</span>
                  <span>{status === "active" ? "ACTIVE" : status === "complete" ? "COMPLETE" : "LOCKED"}</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}

function renderPhaseBody(props: Parameters<typeof ForgeStudio>[0]) {
  const { data, state } = props;
  if (state.phase === "genesis") {
    if (state.modeIndex === 0) {
      const dilemma = data.genesis.dilemmas[state.promptIndex]!;
      return (
        <div className="forge-stage">
          <div className="eyebrow">IMMERSION</div>
          <h3>{dilemma.scenario}</h3>
          <div className="forge-options">
            {dilemma.options.map((option, index) => (
              <button key={option.label} className={`forge-option ${state.selectedOption === index ? "forge-option--selected" : ""}`} onClick={() => props.onSelectOption(index)}>
                {option.label}
              </button>
            ))}
          </div>
          {state.selectedOption !== null ? <div className="forge-reveal">{dilemma.options[state.selectedOption]?.reveal}</div> : null}
          <div className="action-row"><Button variant="teal" disabled={state.selectedOption === null} onClick={() => props.onAdvance()}>Next</Button></div>
        </div>
      );
    }

    const concept = data.genesis.scan[state.promptIndex]!;
    return (
      <div className="forge-stage">
        <div className="eyebrow">CONCEPT SCAN</div>
      <motion.button layout transition={spring} className={`flip-card ${state.flipped ? "flip-card--flipped" : ""}`} onClick={props.onFlip}>
          <div className="flip-card__front"><h3>{concept.label}</h3><p>{concept.definition}</p></div>
          <div className="flip-card__back">
            <p>{concept.summary}</p>
            {concept.mnemonic ? <div className="subtle">{concept.mnemonic}</div> : null}
          </div>
      </motion.button>
        <div className="action-row">
          {aeonthraTts.supported() ? (
            <Button variant="ghost" onClick={() => aeonthraTts.speaking() ? aeonthraTts.stop() : aeonthraTts.speak(`${concept.label}. ${concept.definition}. ${concept.summary}`)}>
              {aeonthraTts.speaking() ? "Stop Audio" : "Read Card"}
            </Button>
          ) : null}
          <Button disabled={!state.flipped} onClick={() => props.onAdvance()}>Advance</Button>
        </div>
      </div>
    );
  }

  if (state.phase === "forge") {
    if (state.modeIndex === 0) {
      const question = data.forge.rapid[state.promptIndex]!;
      return <QuestionStage title="RAPID FIRE" question={question} binary {...props} />;
    }
    const question = data.forge.drill[state.promptIndex]!;
    const concept = data.genesis.scan.find((entry) => entry.id === question.conceptId);
    return <QuestionStage title="DEEP DRILL" question={question} {...props} learnFirst definition={concept?.definition ?? ""} summary={concept?.summary ?? ""} />;
  }

  if (state.phase === "crucible") {
    const challenge = state.modeIndex === 0 ? data.crucible.lies[state.promptIndex]! : state.modeIndex === 1 ? data.crucible.crossExam[state.promptIndex]! : data.crucible.transfer[state.promptIndex]!;
    return (
      <div className="forge-stage">
        <div className="eyebrow">{state.modeIndex === 0 ? "SPOT THE LIE" : state.modeIndex === 1 ? "CROSS-EXAM" : "TRANSFER"}</div>
        <h3>{challenge.prompt}</h3>
        {!state.revealed ? <Button variant="orange" onClick={props.onReveal}>Reveal</Button> : <div className="forge-reveal">{challenge.reveal}</div>}
        <div className="action-row"><Button disabled={!state.revealed} onClick={() => props.onAdvance()}>Next</Button></div>
      </div>
    );
  }

  if (state.phase === "architect") {
    const prompt = data.architect.teachBack[state.promptIndex]!;
    const response = state.teachBack[prompt.id] ?? "";
    return (
      <div className="forge-stage">
        <div className="eyebrow">TEACH BACK</div>
        <h3>{prompt.prompt}</h3>
        <textarea className="notes-area submission-area" value={response} onChange={(event) => props.onTeachBack(prompt.id, event.target.value)} placeholder="Teach it back in your own words..." />
        <div className="key-points">
          {prompt.keyPoints.map((point) => (
            <div key={point} className={`key-point ${response.toLowerCase().includes(point.toLowerCase()) ? "key-point--hit" : ""}`}>{point}</div>
          ))}
        </div>
        <div className="action-row"><Button variant="purple" disabled={response.trim().length < 40} onClick={() => props.onAdvance()}>Check and Advance</Button></div>
      </div>
    );
  }

  const question = data.transcend.boss[state.promptIndex]!;
  return (
    <div className="forge-stage">
      <div className="eyebrow">TRANSCEND</div>
      <div className="confidence-row">
        {[1, 2, 3, 4, 5].map((value) => (
          <button key={value} className={`confidence-pill ${state.confidence === value ? "confidence-pill--active" : ""}`} onClick={() => props.onConfidence(value)}>
            {value}
          </button>
        ))}
      </div>
      <QuestionStage title="BOSS FIGHT" question={question} {...props} />
    </div>
  );
}

function QuestionStage(props: {
  title: string;
  question: ForgeQuestion;
  binary?: boolean;
  learnFirst?: boolean;
  definition?: string;
  summary?: string;
  state: ForgeRuntimeState;
  onAnswer: (question: ForgeQuestion, answerIndex: number) => void;
  onSelectOption: (value: number) => void;
  onLearnFirst: () => void;
  onAdvance: (completed?: boolean) => void;
}) {
  const options = props.binary ? ["TRUE", "FALSE"] : props.question.options;
  const readyForNext = props.state.selectedOption !== null && (!props.title.includes("BOSS") || props.state.confidence !== null);
  return (
    <div className="forge-stage">
      <div className="eyebrow">{props.title}</div>
      <div className="action-row action-row--spread">
        <h3>{props.question.prompt}</h3>
        {aeonthraTts.supported() ? (
          <button
            className="micro-button"
            type="button"
            aria-label={`Read ${props.title} prompt aloud`}
            onClick={() => aeonthraTts.speaking()
              ? aeonthraTts.stop()
              : aeonthraTts.speak(`${props.question.prompt} ${options.map((option, index) => `Option ${index + 1}. ${option}.`).join(" ")}`)}
          >
            {aeonthraTts.speaking() ? "Stop Audio" : "Read Aloud"}
          </button>
        ) : null}
      </div>
      {props.learnFirst ? <div className="action-row"><Button variant="ghost" onClick={props.onLearnFirst}>Learn First</Button></div> : null}
      {props.learnFirst && props.state.learnFirst ? <div className="forge-reveal"><strong>{props.definition}</strong><div>{props.summary}</div></div> : null}
      <div className="forge-options">
        {options.map((option, index) => (
          <button
            key={option}
            className={`forge-option ${props.state.selectedOption === index ? "forge-option--selected" : ""}`}
            disabled={props.state.selectedOption !== null || (props.title.includes("BOSS") && props.state.confidence === null)}
            onClick={() => { props.onSelectOption(index); props.onAnswer(props.question, index); }}
          >
            {option}
          </button>
        ))}
      </div>
      {props.state.selectedOption !== null ? <div className="forge-reveal">{props.question.explanation}</div> : null}
      <div className="action-row"><Button disabled={!readyForNext} onClick={() => props.onAdvance(props.title === "BOSS FIGHT")}>Next</Button></div>
    </div>
  );
}
