# Final Truth Gate Root Cause

## Exact live output failures

- System text like `You need to have JavaScript enabled in order to access this site.` surfaced as a real assignment/task.
- Broken fragment labels like `Creating Produce New Or` surfaced as concepts.
- Assignment surfaces rendered impossible date text like `Due in -101 days`.
- Low-signal readiness rows like `Week 1`, `Week 2`, `Week 3` still appeared.
- Semantic-looking concept, readiness, and Atlas surfaces still rendered when evidence quality was obviously weak.
- Atlas and assignment readiness still built on concept substrate that was not strongly grounded.

## Why each failure happened

### 1. System text surfaced as real work

- Cause type: noise ingestion + threshold failure + truth-surface failure.
- `apps/extension/src/content-canvas.ts` removes some LMS shell text, but its `BLOCKLIST_PATTERNS` does not include the exact JS-disabled string. `learningBlocks()` can therefore retain that text if it survives DOM cleanup.
- `packages/content-engine/src/pipeline.ts` strips that exact phrase in `cleanPassage()`, but assignment/task truth surfaces do not run through the same hard gate.
- `apps/web/src/lib/workspace.ts` uses `shouldSkipWorkspaceItem()` for course/task filtering, but that skip list does not fail closed on generic chrome-heavy captures. Tasks still survive if they are assignments/discussions/quizzes.
- `apps/web/src/lib/shell-mapper.ts` maps surviving tasks directly into assignment UI surfaces even when the underlying task evidence is weak.

### 2. Broken fragments became concepts

- Cause type: weak extraction + threshold failure + fallback promotion.
- `packages/content-engine/src/pipeline.ts` creates concept seeds from titles, headings, bold text, noun phrases, and subject matches.
- `topicCandidatesFromBlock()`, `deriveNounPhraseCandidates()`, `headingSeeds`, `titleSeeds`, and `blockSeeds` all permit short or malformed phrase candidates if they are not caught by `blockedLabel()`.
- `isValidConcept()` only checks length, blocked-label patterns, and whether the definition looks like a sentence. It does not reject truncated, stopword-heavy, malformed, or low-provenance labels.
- `mergeCandidates()` and later supplement paths can still promote weak labels into final concepts if they outscore even weaker neighbors.

### 3. Negative nonsense due dates rendered

- Cause type: over-broad parsing + render truth failure.
- `apps/web/src/lib/workspace.ts::dueDateFromText()` accepts `due:`, `unlock:`, and `lock:` tags, natural-language due text, numeric dates anywhere in the text, and even weekday-only fallbacks.
- That allows non-due dates and weak date hints to be promoted into `dueDate`.
- `apps/web/src/lib/shell-mapper.ts::daysUntil()` returns raw negative integers for past timestamps.
- `apps/web/src/AeonthraShell.tsx` renders `Due in {n} days` directly, so overdue or suspicious dates can display as absurd negative countdowns instead of truthful states.

### 4. `Week 1 / Week 2 / Week 3` clutter still appeared

- Cause type: weak extraction + fallback fabrication + truth-surface drift.
- `apps/web/src/lib/workspace.ts::deriveTaskTitle()` falls back through title text, heading trail, and module tags. It does not fail closed on generic week wrappers unless they exactly match a small generic-title list.
- `extractModuleKey()` and module grouping intentionally preserve `week-*` buckets.
- `apps/web/src/lib/shell-mapper.ts::mapModulesFromTasks()` and `mapReadingFromTasks()` still build user-facing module/reading surfaces from those buckets even when the source content is thin.
- `apps/web/src/lib/atlas-skill-tree.ts` can still emit assignment requirement/readiness structures from weak concept links and derived checklists.

### 5. Semantic-looking output survived weak evidence

- Cause type: fallback fabrication + provenance failure + threshold failure.
- `packages/content-engine/src/pipeline.ts::buildConcepts()` contains a forced fallback concept (`Source Focus`) when no trustworthy concept survives.
- `packages/content-engine/src/index.ts` always continues into protocol, synthesis, and Neural Forge generation.
- `packages/content-engine/src/protocol.ts` and `packages/content-engine/src/neural-forge.ts` always write semantic prompts/cards from whatever concept survives, even if the concept substrate is weak.
- `apps/web/src/lib/shell-mapper.ts` further amplifies weak concepts into `reallyAsking`, `secretCare`, `failModes`, reading/module prose, and practice flows.

### 6. Atlas and readiness still built on junk substrate

- Cause type: provenance failure + concept-threshold failure + downstream trust drift.
- `apps/web/src/lib/shell-mapper.ts` currently filters shell concepts mostly by score and a few label heuristics; it does not require strong provenance or explicit truth-gate pass reasons.
- `apps/web/src/lib/atlas-skill-tree.ts` builds foundational, applied, transfer, and readiness nodes from any surviving shell concepts plus assignment mappings.
- `apps/web/src/lib/atlas-shell.ts` truthfully distinguishes `ready`, `building`, `concept-prep`, and `unmapped`, but it still accepts weak upstream assignment requirements and concept-only substrate as meaningful readiness inputs.

## Exact files involved

- `apps/extension/src/content-canvas.ts`
- `apps/web/src/AeonthraShell.tsx`
- `apps/web/src/lib/workspace.ts`
- `apps/web/src/lib/shell-mapper.ts`
- `apps/web/src/lib/atlas-skill-tree.ts`
- `apps/web/src/lib/atlas-shell.ts`
- `packages/content-engine/src/index.ts`
- `packages/content-engine/src/pipeline.ts`
- `packages/content-engine/src/synthesis.ts`
- `packages/content-engine/src/source-quality.ts`
- `packages/content-engine/src/protocol.ts`
- `packages/content-engine/src/neural-forge.ts`
- `packages/content-engine/src/artifact-support.ts`
- `packages/schema/src/index.ts`

## Root cause classification

- Noise ingestion: yes
- Parser error: yes
- Weak extraction: yes
- Fallback fabrication: yes
- Threshold failure: yes
- Provenance failure: yes
- Multiple causes: yes

## Exact fix plan

1. Add a shared deterministic noise firewall for extension capture, workspace derivation, content-engine concept extraction, and shell mapping.
2. Tighten concept validity so truncated or weak fragments fail closed before they can become concepts.
3. Prefer structured fields for assignment titles, due dates, and module hierarchy before any prose inference.
4. Add due-date sanity gates and render overdue or unknown states truthfully instead of showing raw negative countdowns.
5. Remove or gate semantic fallbacks that currently rescue weak evidence into believable-looking concepts, readings, assignment copy, and Atlas nodes.
6. Require explicit provenance for visible concept/readiness/Atlas surfaces and suppress anything that cannot explain why it passed.
7. Add regression fixtures that encode the exact live failures so these outputs cannot reappear silently.
