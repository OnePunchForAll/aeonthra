# Execution Plan Ultimate Pass

## Phase Order

1. Control artifacts and skill creation
2. Swarm launch and targeted audits
3. Bridge contract and correlated handoff repair
4. Semantic provenance and distinctness hardening
5. Atlas skill-tree and shell refactor pass
6. Purge, canonicality, and doc truth alignment
7. Verification, review, and repeated refinement loops

## Working Rules

- Preserve the dirty tree and do not revert unrelated work.
- Edit only through `apply_patch`.
- Add regression coverage before claiming nontrivial fixes complete.
- Update `.omega/IMPLEMENTATION_LEDGER.md`, `.omega/ERROR_LEDGER.md`, `.omega/DECISIONS.md`, and `.omega/TODO_NOW.md` as meaningful changes land.
- Treat desktop slash commands as human-trigger surfaces unless actually demonstrated by the agent.

## Bridge P0 Worklist

1. Tighten `inspectCanvasCourseKnowledgePack()` to require:
   - `source === "extension-capture"`
   - at least one non-textbook item
   - non-empty `captureMeta.courseId`
   - non-empty `captureMeta.sourceHost`
   - at least one non-textbook URL or manifest URL that resolves to the same host and Canvas course identity
2. Replace raw `aeonthra:pending-bundle` storage with correlated `aeonthra:pending-handoffs`.
3. Add `BridgeHandoffEnvelopeSchema`.
4. Extend bridge messages with additive `requestId`, `handoffId`, and `packId` fields where appropriate.
5. Keep manual JSON import and offline replay outside the live extension queue.
6. Add contract tests, migration tests, expiry tests, mismatch tests, and exact-clear tests.
7. Produce `BRIDGE_FAILURE_ROOT_CAUSE_ULTIMATE.md`.

## Semantic Worklist

1. Split normalization and extraction concerns from field assembly and provenance concerns.
2. Add field-level provenance and field-quality metadata for concept-facing fields.
3. Add optional relation evidence.
4. Strengthen evidence ranking, omission behavior, and repetition blanking.
5. Remove shell-layer circular proof and require source-backed transfer evidence in real workspaces.
6. Add deterministic regression fixtures for wrappers, aliases, contradictions, weak evidence omission, and downstream repetition.

## Atlas Worklist

1. Preserve `atlas-skill-tree.ts` and `atlas-shell.ts` as canonical seams.
2. Add `transfer` and `chapter-reward` node kinds plus branch metadata where needed.
3. Extract Atlas rendering from `AeonthraShell.tsx`.
4. Show explicit prerequisite labels.
5. Add inspect-first locked-node behavior and dependency inspection.
6. Promote locked and recovery summaries.
7. Rename misleading reward wording unless a real claim mechanic exists.
8. Delete `GravityFieldBoard` if it remains unwired.

## Purge And Canonicality Worklist

1. Audit `output/**`, `.claude/worktrees/**`, stale prompt and spec docs, duplicate build outputs, orphaned helpers, and duplicate extension assets.
2. Narrow `apps/web/vite.config.ts` `server.fs.allow`.
3. Keep `apps/extension/dist` as the canonical unpacked extension artifact.
4. Record every deletion or preservation decision in `PURGE_REPORT_ULTIMATE.md`.

## Verify And Stop Rule

- Mandatory every loop: `npm run typecheck`, `npm test`, `npm run build`
- Targeted verification each loop: bridge contract tests, semantic fixtures, Atlas tests, and canonicality checks
- Stop only after two consecutive loops produce no material delta or a hard environment limit blocks further proof
