# deterministic-concept-firewall

Cutover note: the canonical engine runtime now lives in `packages/content-engine-v2/src/**` and is consumed as `@learning/content-engine`. Any older `packages/content-engine/src/**` references in this skill are historical and should be mapped onto the v2 engine before editing.

Defines which candidate labels must be blocked or demoted before stabilization.
Applied in `packages/content-engine/src/pipeline.ts::blockedLabel()`.

## Blocked label classes

### 1. Interrogative fragments
Pattern: starts with `What|How|Why|Which|When|Where|Who`
Example: "What Parts", "How Students", "Why This Matters"
→ BLOCK

### 2. Modal/linking-verb clauses
Pattern: contains `would likely|might argue|should consider`
Example: "Deontologist Would Likely Argue That Lying"
→ BLOCK

### 3. Instructional imperatives
Pattern: starts with `Please|Make Sure|Be Sure|Keep In Mind|Note That|Remember|Always|Never`
Example: "Please Note", "Make Sure To Submit"
→ BLOCK (INSTRUCTION_LABEL_RE in shell-mapper.ts)

### 4. Dash-format activity wrappers
Pattern: `^(Module|Week|Unit)\s+\d+\s*[-–]\s*(Reflection|Discussion|Quiz|Activity)`
Example: "Module 1 - Reflection Activity", "Week 5 - Discussion"
→ BLOCK (GENERIC_ACTIVITY_PATTERNS)

### 5. Scaffold prefix headings
Set: common confusion, common mistake, core idea, going deeper, initial post,
key distinction, memory hook, real world application, why it matters,
key takeaway, overview, introduction, summary, context, reflection, application
→ BLOCK (SCAFFOLD_LABELS in shell-mapper.ts + SCAFFOLD_LABEL_PATTERNS in pipeline.ts)

### 6. Sentence-like / overlong labels
Rule: label.length > 60 characters → BLOCK
Rule: label contains a verb + object clause structure → demote

### 7. Canvas chrome labels
Pattern: matches any CHROME_FRAGMENT_PATTERNS entry
→ BLOCK with score = 0

## Canonicalization rules

Merge aliases before final stabilization:
- Normalize trailing derivational suffixes: `/ing|edly|ed|ies|s|tion|ment|ity|ism|ist|ally|ly$/`
- Remove leading articles: `^(the|a|an|this|that|these|those)\s/i`
- Apply `normalizePhrase()` before key comparison in `mergeCandidates()`

## Definition-quality guard

A concept must NOT stabilize unless:
- `isValidSentence(definition)` returns true
- Sentence contains a linking verb: `is|are|was|were|refers to|involves|focuses|consists of|includes|requires`
- `contentWordCount(definition) >= 3`
- `lexicalDiversity(definition) >= 0.4`

Reject definitions that are:
- Administrative instructions
- Prompt wrappers ("In this discussion you will…")
- Quiz access notes
- Platform guidance

## Anti-overblocking safeguards

- `minimumBlocks = 1` for very small captures (≤ 2 items) to avoid zero-concept output
- Emergency fallback: if ALL candidates are blocked, emit one "Source Focus" concept
  from bundle.items[0].excerpt to prevent empty shell
- Never block entire textbook-backed concepts just because they co-appear with admin items

## Implementation files
- `packages/content-engine/src/pipeline.ts` — `blockedLabel()`, `isValidConcept()`, `isValidSentence()`
- `apps/web/src/lib/shell-mapper.ts` — `isScaffoldConceptLabel()`, `INSTRUCTION_LABEL_RE`, shell-level filter
