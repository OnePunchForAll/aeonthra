---
name: aeonthra-godmode-status
description: "Use this proposed skill only after manual review. It is not auto-activated."
---

# AEONTHRA GodMode Status

Use this proposed skill only after manual review. It is not auto-activated.

## Purpose
Summarize process, queue, proof, trace, worker, and degraded capability state.

## Safe workflow
1. Stay inside the GodMode-only repo.
2. Prefer read-only probes before writes.
3. Write proof bundles or exact blockers.
4. Never claim success without the relevant command/browser/worker evidence.

## Daily command
``powershell
powershell -ExecutionPolicy Bypass -File .\.codex-godmode\Status-GodMode.ps1 -Project .
``

