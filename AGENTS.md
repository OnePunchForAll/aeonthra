# AGENTS

This repository implements a truthful local-first learning platform.

## Mission

Build OMEGA FORGE as a deterministic study system:
- `apps/extension` is the SENTINEL capture extension
- `apps/web` is the ATLAS static learning app
- `packages/schema` defines the FOUNDRY JSON contracts and bridge messages
- `packages/content-engine-v2` is the canonical production engine implementation consumed as `@learning/content-engine`

## Operating rules

1. Preserve the no-runtime-API boundary. Do not add secret keys, SaaS inference, or backend requirements without explicitly documenting the scope change.
2. Prefer TypeScript and runtime validation at boundaries.
3. Keep capture and learning synthesis separate.
4. Add regression coverage when fixing nontrivial bugs.
5. Record meaningful implementation steps in `.omega/IMPLEMENTATION_LEDGER.md`.
6. Record nontrivial defects and repairs in `.omega/ERROR_LEDGER.md`.
7. Record architecture or threshold changes in `.omega/DECISIONS.md`.
8. Keep `.omega/TODO_NOW.md` current with the next highest-leverage work.

## Truth boundary

Do not claim:
- universal extraction from unseen pages
- live scholarly search without infrastructure
- semantic understanding equivalent to a model
- perfect grading of freeform student answers

Do claim:
- deterministic extraction
- source-grounded concept derivation
- local persistence and export
- graceful fallback paths when capture or handoff is incomplete
