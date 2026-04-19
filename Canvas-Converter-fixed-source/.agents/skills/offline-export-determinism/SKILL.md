# offline-export-determinism

Cutover note: the canonical engine runtime now lives in `packages/content-engine-v2/src/**` and is consumed as `@learning/content-engine`. Any older `packages/content-engine/src/**` references in this skill are historical and should be mapped onto the v2 engine before editing.

AEONTHRA is a fully offline, client-side application. Every output it produces
must be deterministic: the same CaptureBundle input always produces the same
LearningBundle output.

## Why determinism matters

- Export files shared between users must be identical for the same source
- Regression tests compare serialized output byte-for-byte
- No network calls, no random seeds, no wall-clock timestamps in content

## Determinism rules

### IDs

Concept IDs are derived from the label, not randomly generated:
```typescript
concept.id = `concept-${normalizePhrase(concept.label).replace(/\s+/g, "-").slice(0, 40)}`
```

Relation IDs are derived from their endpoints:
```typescript
relation.id = `rel-${fromId}--${toId}`
```

Block IDs are derived from item ID + position:
```typescript
block.id = `block-${item.id}-${index}`
```

**NEVER use `Math.random()`, `crypto.randomUUID()`, or `Date.now()` in any
ID-generating path.**

### Ordering

All arrays in LearningBundle are sorted before serialization:
- `concepts` — sorted by `supportScore DESC`, then `label ASC`
- `relations` — sorted by `fromId ASC`, then `toId ASC`
- `protocol.phases` — sorted by phase order constant, not insertion order
- `synthesis.topConcepts` — sorted by `score DESC`

### Timestamps

`generatedAt` is passed through from `bundle.capturedAt` (user's capture time).
Never inject `new Date()` or `Date.now()` into content fields.

### Floating-point stability

All scores are rounded to 2 decimal places via `.toFixed(2)` before storage:
```typescript
supportScore = Number(rawScore.toFixed(2));
```

This prevents float representation drift across JS engines.

## Export format

`buildLearningBundle(bundle: CaptureBundle): LearningBundle`

The output is validated against `LearningBundleSchema` (Zod) before return.
Schema validation acts as a determinism contract: if a field is missing or wrong
type, it throws before any non-deterministic state can escape.

## Chrome Extension capture determinism

The Chrome extension captures items in DOM order (top-to-bottom Canvas modules).
Item ordering in CaptureBundle.items is stable across captures of the same course.

## Testing determinism

Golden fixtures: run `buildLearningBundle(fixture)` twice → deep-equal check.
See `.agents/skills/golden-regression-fixtures/SKILL.md` for fixture format.

## Implementation files

- `packages/content-engine/src/index.ts` — `buildLearningBundle()` entry point
- `packages/content-engine/src/pipeline.ts` — ID derivation, sorting
- `packages/content-engine/src/synthesis.ts` — score rounding
- `packages/schema/src/index.ts` — `LearningBundleSchema` (Zod)
