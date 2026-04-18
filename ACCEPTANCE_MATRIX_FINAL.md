# Acceptance Matrix Final

## Assignment title quality

- Pass: title comes from structured Canvas fields, validated heading text, or a grounded prompt line; it is not generic, chrome, week-only clutter, or a broken fragment.
- Fail: title is boilerplate, LMS shell text, `Week N` clutter, a prompt fragment, or a title rescued from weak text.

## Due date sanity

- Pass: due date comes from a trustworthy structured field or a strongly signaled due-date parse and renders as `due soon`, `overdue`, or a valid positive countdown.
- Pass: if no trustworthy due date exists, the UI says `No trustworthy due date detected`.
- Fail: raw negative countdowns, unlock dates treated as due dates without evidence, or standalone stray dates promoted into assignment due dates.

## Concept label validity

- Pass: label is complete, meaningful, non-generic, non-boilerplate, non-truncated, and supported by real source evidence.
- Fail: label is a week wrapper, platform text, scaffold heading, stopword-heavy fragment, malformed phrase, or shell-derived filler.

## Concept provenance

- Pass: every visible concept has source origin, source type, source snippet or structured-field reference, evidence score, and pass reason.
- Fail: a visible concept lacks any of those fields or only survives because of a fallback concept rescue.

## Readiness truthfulness

- Pass: readiness only renders as a real readiness state when requirement evidence and skill-chain grounding exist.
- Pass: concept-only grounding is labeled as concept groundwork or pending evidence, not readiness.
- Fail: week-label clutter, fake readiness percentages, or confident preparation language without requirement evidence.

## Atlas skill grounding

- Pass: Atlas nodes derive only from grounded concepts and evidence-backed assignment requirements.
- Pass: when substrate is weak, Atlas reduces node count or explicitly says evidence is pending.
- Fail: junk concepts, concept-only noise, or fabricated checklist text create Atlas nodes.

## Noise rejection

- Pass: JS-disabled text, LMS chrome, nav/accessibility shell text, rubric clutter, and repetitive boilerplate are rejected before assignment/concept/readiness/Atlas surfaces.
- Fail: any of those phrases appear as a user-facing assignment, concept, readiness target, or Atlas node.

## Fallback suppression

- Pass: weak evidence leads to omission or explicit truth messaging.
- Fail: fallback concept rescue, shell-authored semantic padding, or plausible-looking assignment prose appears when evidence is weak.

## User-facing error and truth messaging

- Pass: the UI distinguishes `Canvas loaded`, `textbook imported`, `textbook required`, `textbook ingest failed`, `not enough grounded concept evidence yet`, and `No trustworthy due date detected`.
- Fail: the UI implies synthesis readiness, assignment readiness, or semantic understanding when the evidence gate has not been passed.
