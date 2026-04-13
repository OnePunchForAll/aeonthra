# assignment-intent-cleanroom

Extracts genuine learning intent from assignment, discussion, and quiz items
while discarding Canvas chrome metadata that has no educational signal.

## The problem

A Canvas discussion item typically embeds three layers:
1. **Chrome layer** — "Available until Oct 15 · 10 pts · Submission type: Online"
2. **Scaffold layer** — "In this discussion you will…", "Initial post due by…"
3. **Intent layer** — the actual topic, concept, or skill being assessed

Concept mining must operate on the intent layer only. Chrome and scaffold layers
contaminate extraction with point values, dates, and generic instructions.

## Item kind classification

| Item `kind` | Intent extraction strategy |
|-------------|---------------------------|
| `assignment` | Strip submission metadata, focus on description body |
| `discussion_topic` | Strip "initial post / reply" scaffold; use the prompt question only |
| `quiz` | Strip attempt-limit / time-limit lines; use title + question stems |
| `page` | Treat body directly — pages rarely contain Chrome chrome |
| `file` | Title only if no body text available |

## Chrome strip patterns

Patterns removed BEFORE concept extraction:

```
/\d+\s*pts?\.?/gi                              // "10 pts", "100 points"
/available\s+(until|after)\s+\S+/gi            // availability dates
/due\s+(date|by)?\s*:?\s*\S+/gi               // due dates
/submission\s+type\s*:\s*[^\n]+/gi             // submission type lines
/attempt\s+limit\s*:\s*[^\n]+/gi              // attempt limit lines
/grading\s+type\s*:\s*[^\n]+/gi               // grading type lines
/click\s+here\s+to\s+(submit|view|access)/gi  // nav prompts
/please\s+(submit|upload|attach)/gi            // imperative admin instructions
```

## Scaffold strip patterns

Removed BEFORE concept extraction:

```
INSTRUCTION_LABEL_RE — defined in shell-mapper.ts
SCAFFOLD_LABEL_PATTERNS — defined in pipeline.ts
/^in this (discussion|assignment|quiz)\b/i
/initial post\s+(must be|is|should be)\s+\d+/i
/reply to\s+(at least)?\s*\d+/i
/you (will|should|must) (post|respond|submit)/i
```

## Intent extraction

After stripping, the remaining text forms `cleanBody`. Pipeline uses `cleanBody`
as the primary extraction surface for discussion, quiz, and assignment items.

`buildBlocks(bundle)` applies the strip pipeline in place — blocks derived from
these items already carry clean text.

## Verb signal preservation

Strip ONLY metadata/scaffold. Preserve instructor verbs:
- analyze, compare, contrast, evaluate, argue, defend, critique
- explain how/why/what, identify, define, describe

These verbs are the strongest signal for `verbHits` in `buildConceptSupport()`.

## Implementation files

- `packages/content-engine/src/blocks.ts` — chrome/scaffold stripping on item text
- `packages/content-engine/src/pipeline.ts` — `buildBlocks()` call site
- `apps/web/src/lib/shell-mapper.ts` — `INSTRUCTION_LABEL_RE`, `isScaffoldConceptLabel()`
