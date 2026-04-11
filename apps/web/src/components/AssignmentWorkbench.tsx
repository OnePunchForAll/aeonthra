import { useEffect, useMemo, useRef, useState } from "react";
import type { LearningBundle } from "@learning/schema";
import type { Angle } from "@learning/interactions-engine";
import { analyzeSubmission, exportSubmissionDocx } from "../lib/submission";
import type { FailureSeenRecord, TimeCapsuleRecord, EchoAnchor } from "../lib/interactions-storage";
import type { InteractionRuntime } from "../lib/interactions-runtime";
import { taskGate, type AppProgress, type CourseTask, type ForgeChapter } from "../lib/workspace";
import { Button } from "./primitives/Button";
import { Card } from "./primitives/Card";
import { ProgressBar } from "./primitives/ProgressBar";
import { Tag } from "./primitives/Tag";

export function AssignmentWorkbench(props: {
  task: CourseTask;
  learning: LearningBundle;
  progress: AppProgress;
  draft: string;
  onDraftChange: (value: string) => void;
  onStartForge: () => void;
  chapter: ForgeChapter | null;
  studentName: string;
  professorName: string;
  universityName: string;
  onStudentNameChange: (value: string) => void;
  onProfessorNameChange: (value: string) => void;
  onUniversityNameChange: (value: string) => void;
  novel?: {
    runtime: InteractionRuntime;
    prismChoice: Angle | null;
    echoAnchors: EchoAnchor[];
    recentEchoPassageIds: number[];
    capsule: TimeCapsuleRecord | null;
    failureSeen: FailureSeenRecord[];
    onSavePrismChoice: (angle: Angle) => void;
    onAnchorEcho: (anchor: EchoAnchor) => void;
    onTrackEchoPassage: (passageId: number) => void;
    onSealCapsule: (record: TimeCapsuleRecord) => void;
    onUpdateCapsule: (patch: Partial<TimeCapsuleRecord>) => void;
    onMarkFailureSeen: (record: FailureSeenRecord) => void;
  } | null;
}) {
  const gate = taskGate(props.task, props.progress);
  const result = useMemo(
    () => analyzeSubmission(props.draft, props.task.requirementLines, { failureSeen: props.novel?.failureSeen }),
    [props.draft, props.novel?.failureSeen, props.task.requirementLines]
  );
  const linkedConcepts = props.task.conceptIds
    .map((id) => props.learning.concepts.find((concept) => concept.id === id))
    .filter((concept): concept is LearningBundle["concepts"][number] => Boolean(concept));
  const prismAngles = useMemo(() => props.novel?.runtime.promptAngles(props.task) ?? [], [props.novel, props.task]);
  const failureAtlas = useMemo(() => props.novel?.runtime.failureAtlas(props.task) ?? [], [props.novel, props.task]);
  const [showPrism, setShowPrism] = useState(false);
  const [letterDraft, setLetterDraft] = useState("");
  const [capsuleReportOpen, setCapsuleReportOpen] = useState(false);
  const [activeEcho, setActiveEcho] = useState<ReturnType<InteractionRuntime["echoForDraft"]>>(null);
  const editorRef = useRef<HTMLTextAreaElement | null>(null);

  const capsuleStatuses = useMemo(() => {
    if (!props.novel?.capsule) return [];
    const wordCount = props.draft.trim().split(/\s+/).filter(Boolean).length;
    return props.novel.runtime.commitment.verify(
      props.novel.capsule.commitments,
      {
        text: props.draft,
        wordCount,
        dueDate: props.task.dueDate,
        draftCompletedAt: props.novel.capsule.draftCompletedAt ?? (wordCount >= 180 ? Date.now() : null)
      },
      props.progress
    );
  }, [props.draft, props.novel, props.progress, props.task.dueDate]);

  useEffect(() => {
    if (!props.novel?.capsule) return;
    if (props.draft.trim().length > 0 && !props.novel.capsule.draftStartedAt) {
      props.novel.onUpdateCapsule({ draftStartedAt: Date.now() });
    }
    const wordCount = props.draft.trim().split(/\s+/).filter(Boolean).length;
    if (wordCount >= 180 && !props.novel.capsule.draftCompletedAt) {
      props.novel.onUpdateCapsule({ draftCompletedAt: Date.now() });
    }
  }, [props.draft, props.novel]);

  useEffect(() => {
    if (!props.novel || gate.locked || !props.novel.capsule) {
      setActiveEcho(null);
      return;
    }
    const handle = window.setTimeout(() => {
      const candidate = props.novel?.runtime.echoForDraft(props.task, props.draft, props.novel.recentEchoPassageIds) ?? null;
      setActiveEcho(candidate);
      if (candidate) {
        props.novel?.onTrackEchoPassage(candidate.passageId);
      }
    }, 3000);
    return () => window.clearTimeout(handle);
  }, [gate.locked, props.draft, props.novel, props.task]);

  const exportNow = async () => {
    await exportSubmissionDocx({
      assignmentTitle: props.task.title,
      courseTitle: props.learning.sourceBundleTitle,
      professorName: props.professorName,
      studentName: props.studentName,
      universityName: props.universityName,
      text: props.draft,
      result
    });
    setCapsuleReportOpen(true);
    if (props.draft.trim()) {
      await navigator.clipboard.writeText(props.draft.trim());
    }
  };

  const insertCitation = (citation: string) => {
    const target = editorRef.current;
    if (!target) {
      props.onDraftChange(`${props.draft}${props.draft.endsWith(" ") ? "" : " "}${citation}`);
      return;
    }
    const start = target.selectionStart ?? props.draft.length;
    const end = target.selectionEnd ?? start;
    const next = `${props.draft.slice(0, start)}${citation}${props.draft.slice(end)}`;
    props.onDraftChange(next);
    requestAnimationFrame(() => {
      target.focus();
      target.selectionStart = start + citation.length;
      target.selectionEnd = start + citation.length;
    });
  };

  const chooseAngle = (angle: Angle) => {
    props.novel?.onSavePrismChoice(angle);
    setShowPrism(false);
    const scaffold = `${angle.thesisScaffold}\n\n`;
    props.onDraftChange(props.draft.trim().length === 0 ? scaffold : `${scaffold}${props.draft}`);
    if (props.novel && !props.novel.capsule) {
      const suggestions = props.novel.runtime.capsuleSuggestionsFromAngle(angle);
      setLetterDraft((current) => [current.trim(), ...suggestions].filter(Boolean).join("\n"));
    }
  };

  return (
    <div className="assignment-detail">
      <Card accent="cyan">
        <div className="eyebrow">BREAKDOWN</div>
        <h3>{props.task.title}</h3>
        <div className="mono subtle">{props.task.estimatedMinutes} min</div>
        <p>{props.task.summary}</p>
        <div className="stack-sm">
          <div className="eyebrow">REQUIREMENTS</div>
          {props.task.requirementLines.length > 0 ? (
            props.task.requirementLines.map((line) => <div key={line} className="requirement-line">{line}</div>)
          ) : (
            <div className="requirement-line requirement-line--empty">
              No specific requirements detected in the captured assignment text. Read the original assignment carefully to confirm the expectations.
            </div>
          )}
        </div>
        {props.task.rawText ? (
          <details className="raw-text-panel">
            <summary>Raw assignment text</summary>
            <pre>{props.task.rawText}</pre>
          </details>
        ) : null}
      </Card>

      <Card accent={gate.locked ? "orange" : "teal"}>
        <div className="eyebrow">SUBMISSION WORKSPACE</div>
        {gate.locked ? (
          <div className="lock-overlay-static stack-md">
            <div className="lock-icon">🔒</div>
            <div className="lock-title">PREPARE FIRST</div>
            <p className="muted">Complete Neural Forge on the required concepts before drafting here.</p>
            {gate.conceptIds.map((id) => {
              const concept = props.learning.concepts.find((entry) => entry.id === id);
              const mastery = Math.round((props.progress.conceptMastery[id] ?? 0) * 100);
              return (
                <div key={id} className="lock-req-row">
                  <span>{concept?.label ?? id}</span>
                  <div className="lock-req-bar"><ProgressBar value={mastery} /></div>
                  <span className="mono">{mastery}%</span>
                </div>
              );
            })}
            {props.novel?.capsule?.commitments.some((commitment) => commitment.type === "prerequisite") ? (
              <div className="processing-note">Your sealed Time Capsule also requires Neural Forge before drafting. Unlock the required concept path first.</div>
            ) : null}
            <Button variant="teal" onClick={props.onStartForge}>PREPARE IN NEURAL FORGE</Button>
          </div>
        ) : (
          <div className="stack-md">
            {props.novel?.capsule ? (
              <div className="commitment-strip">
                {capsuleStatuses.map((commitment) => (
                  <span key={commitment.id} className={`commitment-pill commitment-pill--${commitment.status}`}>
                    {commitment.status === "kept" ? "OK" : commitment.status === "partial" ? "PARTIAL" : commitment.status === "broken" ? "BROKEN" : "PENDING"} {commitment.text}
                  </span>
                ))}
              </div>
            ) : (
              <Card accent="gold" className="time-capsule-card">
                <div className="eyebrow">TIME CAPSULE</div>
                <h3>Leave a letter for future you</h3>
                <p className="muted">Seal a few concrete promises before you begin drafting. The system will audit them when you export.</p>
                <textarea className="notes-area submission-area" value={letterDraft} onChange={(event) => setLetterDraft(event.target.value)} placeholder="Dear future me..." />
                <div className="action-row">
                  <Button
                    variant="gold"
                    disabled={letterDraft.trim().length < 40}
                    onClick={() => {
                      if (!props.novel) return;
                      const commitments = props.novel.runtime.commitment.parseLetter(letterDraft);
                      props.novel.onSealCapsule({
                        taskId: props.task.id,
                        letter: letterDraft,
                        commitments,
                        sealedAt: Date.now(),
                        draftStartedAt: null,
                        draftCompletedAt: null
                      });
                    }}
                  >
                    Seal the Capsule
                  </Button>
                </div>
              </Card>
            )}
            <div className="settings-grid">
              <input className="text-input" value={props.studentName} onChange={(event) => props.onStudentNameChange(event.target.value)} placeholder="Student name" />
              <input className="text-input" value={props.professorName} onChange={(event) => props.onProfessorNameChange(event.target.value)} placeholder="Professor name" />
              <input className="text-input" value={props.universityName} onChange={(event) => props.onUniversityNameChange(event.target.value)} placeholder="University" />
            </div>
            <div className="editor-shell">
              <div className="editor-main">
                <div className="action-row">
                  <Button variant="ghost" disabled={!props.novel?.capsule} onClick={() => setShowPrism((current) => !current)}>Prompt Prism</Button>
                </div>
                {showPrism ? (
                  <div className="prism-grid">
                    {prismAngles.map((angle) => (
                      <div key={angle.id} className="prism-card">
                        <div className="eyebrow">{angle.name}</div>
                        <div className="muted">{angle.tagline}</div>
                        <div className="mono subtle">{angle.difficulty} | {angle.conceptCountRange[0]}-{angle.conceptCountRange[1]} concepts</div>
                        <div className="subtle">{angle.riskStatement}</div>
                        <div className="muted">{angle.thesisScaffold}</div>
                        <Button variant="teal" onClick={() => chooseAngle(angle)}>Choose</Button>
                      </div>
                    ))}
                  </div>
                ) : null}
                <div className="editor-wrap">
                  <textarea ref={editorRef} className="notes-area submission-area" value={props.draft} onChange={(event) => props.onDraftChange(event.target.value)} placeholder={props.novel?.capsule ? "Write your response here..." : "Seal the Time Capsule first to unlock drafting..."} disabled={!props.novel?.capsule} />
                  {activeEcho ? (
                    <button
                      type="button"
                      className="echo-drift"
                      data-state="visible"
                      onClick={() => props.novel?.onAnchorEcho({
                        passageId: activeEcho.passageId,
                        text: activeEcho.text,
                        source: activeEcho.source,
                        citation: activeEcho.citation,
                        conceptIds: activeEcho.conceptIds,
                        savedAt: Date.now()
                      })}
                    >
                      {activeEcho.source}: {activeEcho.text}
                    </button>
                  ) : null}
                </div>
              </div>
              <div className="echo-anchor-rail">
                <div className="eyebrow">ECHOES</div>
                {props.novel?.echoAnchors.map((anchor) => (
                  <div key={`${anchor.passageId}-${anchor.savedAt}`} className="echo-anchor">
                    <div className="echo-anchor__source">{anchor.source}</div>
                    <div className="echo-anchor__text">{anchor.text}</div>
                    <button className="echo-anchor__cite" onClick={() => insertCitation(anchor.citation)}>CITE</button>
                  </div>
                ))}
              </div>
            </div>
            <div className="action-row">
              <Button variant="gold" disabled={!props.novel?.capsule} onClick={exportNow}>GRADE & EXPORT</Button>
              <Tag accent={result.grade === "GREEN" ? "green" : result.grade === "YELLOW" ? "gold" : "orange"}>{result.grade} | {result.score}%</Tag>
              <div className="mono subtle">{result.wordCount} words | {result.citationCount} citations</div>
            </div>
            <div className="submission-issues">
              {result.issues.map((issue) => (
                <div key={issue.id} className={`issue issue--${issue.severity}`}>
                  <div className="issue__title">{issue.title}</div>
                  <div className="issue__detail">{issue.detail}</div>
                </div>
              ))}
            </div>
            {capsuleReportOpen && props.novel?.capsule ? (
              <Card accent="gold">
                <div className="eyebrow">TIME CAPSULE REPORT</div>
                <div className="muted">Your past self wrote this on {new Date(props.novel.capsule.sealedAt).toLocaleString()}.</div>
                <div className="stack-sm">
                  {capsuleStatuses.map((commitment) => (
                    <div key={commitment.id} className={`requirement-line requirement-line--${commitment.status}`}>
                      {commitment.status.toUpperCase()} | {commitment.text} | {commitment.detail}
                    </div>
                  ))}
                </div>
              </Card>
            ) : null}
          </div>
        )}
      </Card>

      <Card accent="purple">
        <div className="eyebrow">TEXTBOOK BRIDGE</div>
        {props.chapter ? (
          <div className="stack-md">
            <h3>{props.chapter.title}</h3>
            <p>{props.chapter.summary}</p>
            <div className="concept-chip-grid">
              {linkedConcepts.map((concept) => (
                <div key={concept.id} className="mini-chip">
                  <div className="mini-chip__title">{concept.label}</div>
                  <div className="subtle">{Math.round((props.progress.conceptMastery[concept.id] ?? 0) * 100)}%</div>
                </div>
              ))}
            </div>
            <Button variant="teal" onClick={props.onStartForge}>Start Forge</Button>
          </div>
        ) : (
          <p className="muted">No paired chapter was derived for this item yet.</p>
        )}
      </Card>

      {props.novel ? (
        <Card accent="orange">
          <div className="eyebrow">FAILURE ATLAS</div>
          {failureAtlas.length === 0 ? (
            <div className="requirement-line requirement-line--empty">
              Failure Atlas is waiting for stronger source-grounded concepts before it generates examples.
            </div>
          ) : (
            <div className="stack-md">
              {failureAtlas.map((group) => (
                <div key={group.criterion.id} className="trail-panel">
                  <div className="issue__title">{group.criterion.label}</div>
                  {group.examples.map((example) => (
                    <div key={example.failureMode} className="stack-sm">
                      <div className="muted">{example.text}</div>
                      <div className="subtle">{example.annotation}</div>
                      <div className="processing-note">Contrast: {example.contrastExample}</div>
                      <Button variant="ghost" onClick={() => props.novel?.onMarkFailureSeen({ taskId: props.task.id, failureMode: example.failureMode, seenAt: Date.now(), sample: example.text })}>
                        Mark Seen
                      </Button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </Card>
      ) : null}
    </div>
  );
}
