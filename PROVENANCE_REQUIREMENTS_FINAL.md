# Provenance Requirements Final

## Required provenance for visible concepts

Every visible concept must carry:

- source origin
- source type
- source snippet or structured-field reference
- evidence score
- pass reason

## Required provenance for visible readiness items

Every visible readiness item must carry:

- assignment source item id
- evidence source type
- captured requirement line or structured prompt reference
- evidence score or readiness-support score
- pass reason explaining why the task is considered mapped, building, or ready

## Required provenance for visible Atlas nodes

Every visible Atlas node must carry:

- underlying concept ids or assignment ids
- supporting source type
- supporting evidence snippet or structured requirement reference
- support score
- pass reason

## Current gap

- Current `EvidenceFragment` only guarantees `label`, `excerpt`, and `sourceItemId`.
- Current concept `fieldSupport` carries quality and support scores, but not explicit source type or pass reason.
- Current shell, readiness, and Atlas renderers do not require a visible provenance contract before showing content.

## Required implementation direction

- Extend provenance payloads so visible evidence can name the source type and score.
- Add truth-gate pass reasons at concept, readiness, and Atlas derivation points.
- Suppress user-facing surfaces that cannot produce provenance instead of guessing.

## Minimum acceptable visible provenance behavior

- Concept cards can show a compact provenance strip or diagnostics surface.
- Readiness and Atlas do not need to show every raw field by default, but the data must exist and the UI must be able to explain why an item passed.
- If that explanation cannot be produced, the item must not render as a grounded concept, readiness claim, or Atlas node.
