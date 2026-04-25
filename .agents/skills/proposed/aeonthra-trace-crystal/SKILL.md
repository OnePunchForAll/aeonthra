---
name: aeonthra-trace-crystal
description: "Use this proposed skill only after manual review. It is not auto-activated."
---

# AEONTHRA Trace Crystal

Use this proposed skill only after manual review. It is not auto-activated.

## Purpose
Convert latest operational evidence into trace JSONL and summary JSON.

## Safe workflow
1. Stay inside the GodMode-only repo.
2. Prefer read-only probes before writes.
3. Write proof bundles or exact blockers.
4. Never claim success without the relevant command/browser/worker evidence.

## Daily command
``powershell
powershell -ExecutionPolicy Bypass -File .\.codex-godmode\Run-TraceCrystal.ps1 -Project .
``

