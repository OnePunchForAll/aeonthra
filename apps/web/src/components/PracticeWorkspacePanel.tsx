import type { CSSProperties } from "react";

type PracticeScore = {
  c: number;
  w: number;
};

type PracticeTFQuestionLike = {
  cid: string;
  statement: string;
  answer: boolean;
  explanation: string;
};

type PracticeMCQuestionLike = {
  cid: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

type PracticeQuestionLike = PracticeTFQuestionLike | PracticeMCQuestionLike;

type PracticeTheme = {
  BD: string;
  CY: string;
  GD: string;
  MU: string;
  RD: string;
  T2: string;
  TL: string;
  TX: string;
  DM: string;
  card: CSSProperties;
  heading: (size: number) => CSSProperties;
  button: (background: string, color: string) => CSSProperties;
};

type PracticeWorkspacePanelProps = {
  questions: PracticeQuestionLike[];
  index: number;
  answer: number | boolean | null;
  score: PracticeScore;
  mode: "tf" | "mc";
  showExplanations: boolean;
  theme: PracticeTheme;
  onBackToCourseware: () => void;
  onBackHome: () => void;
  onAnswerTrue: () => void;
  onAnswerFalse: () => void;
  onSelectOption: (index: number) => void;
  onNext: () => void;
};

function isTFQuestion(question: PracticeQuestionLike | undefined): question is PracticeTFQuestionLike {
  return Boolean(question && "statement" in question);
}

function isMCQuestion(question: PracticeQuestionLike | undefined): question is PracticeMCQuestionLike {
  return Boolean(question && "question" in question);
}

export function PracticeWorkspacePanel({
  questions,
  index,
  answer,
  score,
  mode,
  showExplanations,
  theme,
  onBackToCourseware,
  onBackHome,
  onAnswerTrue,
  onAnswerFalse,
  onSelectOption,
  onNext
}: PracticeWorkspacePanelProps) {
  const { BD, CY, GD, MU, RD, T2, TL, TX, DM, card, heading, button } = theme;
  const question = questions[index];
  const answered = score.c + score.w;

  if (!question) {
    return (
      <div style={{ maxWidth: 820, margin: "0 auto" }}>
        <div style={{ ...card, textAlign: "center", padding: 68 }}>
          <div style={{ fontSize: "2.5rem", marginBottom: 20 }}>🏆</div>
          <h3 style={{ ...heading(1.4), background: `linear-gradient(135deg,${CY},${TL},${GD})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Practice Complete!</h3>
          <p style={{ fontSize: "1.2rem", color: TX, margin: "16px 0 6px" }}>{score.c} correct out of {answered}</p>
          <p style={{ fontSize: "1rem", color: MU }}>{answered > 0 ? Math.round((score.c / answered) * 100) : 0}% accuracy</p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", marginTop: 32 }}>
            <button onClick={onBackToCourseware} style={button(`linear-gradient(135deg,${CY},#0080ff)`, "#000")}>Back to Courseware</button>
            <button onClick={onBackHome} style={{ ...button("transparent", MU), border: `1px solid ${BD}` }}>Overview</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 820, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div style={{ fontSize: ".88rem", fontWeight: 700, color: CY, fontFamily: "'Space Grotesk',sans-serif" }}>PRACTICE · {index + 1}/{questions.length}</div>
        <div style={{ display: "flex", gap: 16, fontSize: ".95rem", fontWeight: 700 }}>
          <span style={{ color: TL }}>✓{score.c}</span>
          <span style={{ color: RD }}>✗{score.w}</span>
        </div>
      </div>
      <div style={{ width: "100%", height: 6, borderRadius: 3, background: DM, marginBottom: 28, overflow: "hidden" }}>
        <div style={{ height: "100%", borderRadius: 3, background: `linear-gradient(90deg,${CY},${TL})`, width: `${questions.length > 0 ? (index / questions.length) * 100 : 0}%`, transition: "width 400ms ease" }} />
      </div>

      {mode === "tf" && isTFQuestion(question) ? (
        <div style={{ ...card, borderTop: `3px solid ${TL}` }}>
          <p style={{ fontSize: "1.15rem", lineHeight: 1.9, color: T2, margin: "0 0 32px" }}>{question.statement}</p>
          {answer === null ? (
            <div style={{ display: "flex", gap: 18 }}>
              <button onClick={onAnswerTrue} style={{ flex: 1, padding: "22px", borderRadius: 18, fontWeight: 700, fontSize: "1.1rem", cursor: "pointer", background: `${TL}12`, color: TL, border: `2px solid ${TL}44` }}>TRUE</button>
              <button onClick={onAnswerFalse} style={{ flex: 1, padding: "22px", borderRadius: 18, fontWeight: 700, fontSize: "1.1rem", cursor: "pointer", background: `${RD}12`, color: RD, border: `2px solid ${RD}44` }}>FALSE</button>
            </div>
          ) : (
            <>
              <div style={{ padding: "18px 22px", borderRadius: 16, background: answer === question.answer ? `${TL}12` : `${RD}12`, border: `2px solid ${answer === question.answer ? TL : RD}`, marginBottom: 18, fontSize: "1.02rem", animation: "fadeUp .3s ease" }}>
                <strong>{answer === question.answer ? "✓ Correct" : "✗ Incorrect"}</strong>
              </div>
              {showExplanations ? <p style={{ fontSize: "1rem", lineHeight: 1.8, color: T2 }}>{question.explanation}</p> : null}
              <button onClick={onNext} style={{ ...button(`linear-gradient(135deg,${TL},#00b088)`, "#000"), marginTop: 22 }}>Next →</button>
            </>
          )}
        </div>
      ) : null}

      {mode === "mc" && isMCQuestion(question) ? (
        <div style={{ ...card, borderTop: `3px solid ${GD}` }}>
          <p style={{ fontSize: "1.15rem", lineHeight: 1.9, color: T2, margin: "0 0 28px" }}>{question.question}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {question.options.map((option, optionIndex) => (
              <button
                key={optionIndex}
                onClick={() => onSelectOption(optionIndex)}
                style={{
                  textAlign: "left",
                  padding: "20px 24px",
                  borderRadius: 16,
                  border: `2px solid ${answer !== null && optionIndex === question.correctIndex ? TL : answer === optionIndex && optionIndex !== question.correctIndex ? RD : BD}`,
                  background: answer !== null && optionIndex === question.correctIndex ? `${TL}0a` : answer === optionIndex && optionIndex !== question.correctIndex ? `${RD}0a` : "rgba(255,255,255,.02)",
                  cursor: answer !== null ? "default" : "pointer",
                  color: TX,
                  fontSize: "1rem",
                  width: "100%",
                  opacity: answer !== null && answer !== optionIndex && optionIndex !== question.correctIndex ? 0.2 : 1,
                  transition: "all 300ms"
                }}
              >
                {option}
              </button>
            ))}
          </div>
          {answer !== null ? (
            <>
              <p style={{ fontSize: "1rem", lineHeight: 1.8, color: T2, marginTop: 22, animation: "fadeUp .3s ease" }}>{question.explanation}</p>
              <button onClick={onNext} style={{ ...button(`linear-gradient(135deg,${GD},#cc8800)`, "#000"), marginTop: 22 }}>Next →</button>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
