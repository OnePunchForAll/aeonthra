---
name: aeonthra-worker-smoke
description: "Use this proposed skill only after manual review. It is not auto-activated."
---

# AEONTHRA Worker Smoke

Use this proposed skill only after manual review. It is not auto-activated.

## Purpose
Probe codex exec JSON/schema worker route and ingest a bounded SUMMARIZER result.

## Safe workflow
1. Stay inside the GodMode-only repo.
2. Prefer read-only probes before writes.
3. Write proof bundles or exact blockers.
4. Never claim success without the relevant command/browser/worker evidence.

## Daily command
``powershell
powershell -ExecutionPolicy Bypass -File .\.codex-godmode\Run-WorkerSmoke.ps1 -Project .
``

