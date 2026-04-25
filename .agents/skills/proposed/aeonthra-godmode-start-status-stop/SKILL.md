# AEONTHRA GodMode Start Status Stop

Use this proposed skill only after manual review. It is not auto-activated.

## Purpose
Run the local loopback control plane daily start/status/stop workflow without touching old app code.

## Daily command
```powershell
powershell -ExecutionPolicy Bypass -File .\.codex-godmode\Start-GodMode.ps1 -Project . ; powershell -ExecutionPolicy Bypass -File .\.codex-godmode\Status-GodMode.ps1 -Project . ; powershell -ExecutionPolicy Bypass -File .\.codex-godmode\Stop-GodMode.ps1 -Project .
```

## Safety
- Runtime proof is required before success claims.
- Do not auto-activate this skill.
- Do not write runtime/proof artifacts into Git.
