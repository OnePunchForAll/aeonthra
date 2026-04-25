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

## Aeonthra Operating Contract

This repo may include an optional local `.codex-godmode/` orchestration layer for Windows-first Codex workflows.

- Preserve the no-runtime-API boundary: the control plane must not add hosted inference, secrets, or backend requirements.
- Evidence is required before claims: validation logs, command exit codes, hashes, and browser proof bundles must back success reports.
- Browser/UI success is not claimed unless a loopback browser proof bundle or equivalent runtime evidence exists.
- Master-controller projections are the only writer for shared `.codex-godmode/state`, ledgers, Arena manifest, and Live Result state.
- Agents and dry-run workers write only to `.codex-godmode/inbox/results` and `.codex-godmode/inbox/heartbeats`.
- Full details live in `.codex-godmode/docs/AEONTHRA-SYSTEM-SPEC.md` and `.codex-godmode/docs/SAFETY-CONTRACT.md`.
