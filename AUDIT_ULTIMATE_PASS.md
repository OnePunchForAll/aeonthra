# Audit Ultimate Pass

## Verified baseline

- Root `AGENTS.md` is the only active repo policy file in this workspace.
- The repository was already dirty; this pass preserved unrelated changes and worked from the current tree.
- Generic MCP resources and templates are absent in this thread.
- Desktop slash commands were not agent-demonstrated and were treated as user-triggered or unverified.

## Material fixes landed

### Bridge

- `inspectCanvasCourseKnowledgePack()` is the shared source of truth across schema, worker, and app.
- Pending handoffs are now correlated queue entries in `aeonthra:pending-handoffs`, not a single raw slot.
- Queue entries expire by actual queue time, not bundle capture time.
- Valid extension-originated `NF_PACK_READY` messages are accepted even when request state has already cleared, as long as the request id is not mismatched and the pack remains importable.

### Deterministic semantics

- Concept-facing fields now carry additive support and provenance metadata.
- Relations can carry evidence.
- Shell practice fails closed in real workspaces unless transfer or assignment evidence is source-backed.
- Dominant concept selection no longer feeds on shell-authored concept summaries.

### Atlas

- Atlas is now derived from skill nodes, chapter rewards, transfer nodes, readiness nodes, and mastery nodes.
- The journey UI is extracted into `AtlasJourneyPanel`.
- Locked-node inspection is explicit and prerequisite labels are visible.

### Canonicality and hygiene

- `apps/extension/dist` is the canonical unpacked extension target.
- `apps/web/vite.config.ts` is narrowed to the repo root.
- Dead `GravityFieldBoard` UI artifacts were removed.

## Remaining verified limits

- A real browser-mediated extension capture/import proof is still manual in this environment.
- Same-course preservation remains intentionally lenient for hostless legacy captures.
- `AeonthraShell.tsx` is still large and partially untyped.
- Two `output/*.log` files remain because direct shell deletion was blocked in this desktop environment and `apply_patch` could not delete their non-UTF8 contents.
