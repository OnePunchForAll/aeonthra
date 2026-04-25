---
name: aeonthra-visual-feedback-routing
description: "Use this proposed skill only after manual review. It is not auto-activated."
---

# AEONTHRA Visual Feedback Routing

Use this proposed skill only after manual review. It is not auto-activated.

## Purpose
Convert persisted Comment Mode events into proof-required missions without patching directly.

## Safe workflow
1. Stay inside the GodMode-only repo.
2. Prefer read-only probes before writes.
3. Write proof bundles or exact blockers.
4. Never claim success without the relevant command/browser/worker evidence.

## Daily command
``powershell
powershell -ExecutionPolicy Bypass -File .\.codex-godmode\master-controller.ps1 -Project . -Mode safe -Once -NoSpawn -NoPatch
``

