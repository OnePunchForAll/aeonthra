# Deterministic Boundary Redesign

## What deterministic logic should do

- Extract structured course and textbook content.
- Normalize captured text into stable, comparable units.
- Reject platform chrome, boilerplate, and broken fragments early.
- Prefer structured assignment/module/date fields over prose inference.
- Rank candidates by explicit evidence quality, source diversity, and provenance.
- Surface only concepts, skills, readiness hints, and Atlas nodes that can explain why they passed the truth gate.
- Fail closed with explicit user-facing truth when evidence is weak.

## What deterministic logic must stop pretending to do

- It must stop inventing a last-resort semantic concept when no trustworthy concept survives.
- It must stop promoting generic headings, week wrappers, or malformed noun phrases into concepts.
- It must stop rendering assignment interpretation prose from weak summaries.
- It must stop turning concept-only overlap into a readiness claim.
- It must stop building rich Atlas branches from low-confidence concept substrate.
- It must stop using semantic-looking fallback copy to make weak evidence look complete.

## Semantic surfaces that stay

- Extracted course structure.
- Extracted textbook structure.
- Normalized assignments, discussions, quizzes, pages, modules, and chapters.
- Grounded concept candidates that pass truth gates.
- Grounded skill or readiness hints that are tied to captured requirements and evidence.
- Atlas only when it is built from grounded concepts and requirement evidence.

## Semantic surfaces that must be gated, simplified, or removed

- Concept cards when the concept lacks strong label quality or provenance.
- Assignment panels such as `reallyAsking`, `secretCare`, `failModes`, `quickPrep`, and semantic summaries when requirement evidence is weak.
- Module/reading fallback prose built from week wrappers or thin task groupings.
- Practice flows when transfer or assignment evidence is not source-backed.
- Focus themes, retention modules, protocol prompts, and Neural Forge cards when the concept substrate is not trustworthy enough.
- Atlas readiness states derived from `concept-only` substrate or weak checklist fabrication.

## New doctrine for concepts

- No concept without a valid label.
- No concept without source-backed evidence.
- No concept if the label looks truncated, malformed, generic, boilerplate, or shell-derived.
- No concept if provenance cannot say where it came from, what source type it came from, and why it passed.

## New doctrine for readiness

- Assignment readiness is not a vibe score.
- `captured-requirements` remains allowed.
- `derived-checklist` is only allowed when the derived lines are grounded in captured prompt evidence.
- `concept-only` cannot masquerade as readiness. It should degrade to explicit pending-evidence or concept-groundwork messaging.

## New doctrine for Atlas

- Atlas nodes should derive only from grounded concepts and evidence-backed assignment requirements.
- If the substrate is weak, Atlas should show fewer nodes, explicit pending evidence, or no lane at all.
- Atlas should never become denser than the available evidence deserves.

## Operational consequence

- The system becomes a deterministic study compiler:
  - extract
  - normalize
  - filter
  - cluster
  - rank
  - prove
  - synthesize only after passing the truth gate

- When that gate fails, the UI must prefer `insufficient evidence`, `no trustworthy due date detected`, `not enough grounded concept evidence yet`, or `textbook imported, synthesis gated pending better evidence` over semantic theater.
