# category-and-module-normalization

Normalizes item categories, module keys, and task groupings across the pipeline
so that items from the same thematic unit cohere regardless of how Canvas labeled them.

## The problem

Canvas courses use inconsistent module/unit labeling:
- "Module 1: Introduction to Ethics"
- "Week 1 — Introduction"
- "Unit 1 | Ethics Overview"
- "1. Foundations"
- Items with no module at all

The pipeline must produce stable `moduleKey` values that:
- Group same-topic items together
- Survive minor label variations across course exports
- Never duplicate the same conceptual unit under two keys

## moduleKey construction

```typescript
moduleKey = normalizeModuleLabel(item.module ?? item.title)
```

`normalizeModuleLabel(raw: string): string`:
1. Lowercase entire string
2. Remove leading `(module|week|unit|section|part|chapter)\s*\d+\s*[-–:|]\s*`
3. Remove leading `\d+\.\s+`
4. Strip trailing parenthetical "(optional)", "(required)", etc.
5. `normalizePhrase()` — collapse whitespace, strip punctuation tails
6. Truncate to 60 chars

**Same-unit guarantee**: "Module 1 - Ethics" and "Module 1: Ethics" both
normalize to `"ethics"`.

## Item category buckets

| Canvas kind | Pipeline bucket | Used in |
|-------------|-----------------|---------|
| `page` | `reading` | Library (Reader), chapters |
| `discussion_topic` | `assignment` | Assignments view, concept support |
| `assignment` | `assignment` | Assignments view, concept support |
| `quiz` | `assignment` | Assignments view, concept support |
| `file` | `resource` | Resources |
| `external_url` | `resource` | Resources |
| `external_tool` | `resource` | Resources |

**Chapter source preference** (workspace.ts):
- If ≥ 2 `page` items have conceptIds → chapters come from pages only
- Otherwise → chapters come from all items with conceptIds (any kind)

This prevents discussion-heavy courses from having zero Reader content.

## normalizePhrase contract

```typescript
function normalizePhrase(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")   // strip diacritics
    .replace(/[''`´]/g, "")             // strip apostrophes
    .replace(/[^a-z0-9\s]/g, " ")      // non-alphanumeric → space
    .replace(/\s+/g, " ")              // collapse spaces
    .trim();
}
```

Used in: `mergeCandidates()`, `moduleKey`, concept label canonicalization.

## Alias merging

Before stabilization, `mergeCandidates()` collapses normalized duplicates:
- Strip derivational suffixes: `/ing|edly|ed|ies|s|tion|ment|ity|ism|ist|ally|ly$/`
- Remove leading articles: `/^(the|a|an|this|that|these|those)\s/i`
- If two candidates share the same normalized root → merge into higher-scored entry

## Implementation files

- `packages/content-engine/src/pipeline.ts` — `normalizeModuleLabel()`, `normalizePhrase()`, `mergeCandidates()`
- `apps/web/src/lib/workspace.ts` — `moduleKey` construction, chapter source preference
- `packages/schema/src/index.ts` — `CaptureItem.kind` enum
