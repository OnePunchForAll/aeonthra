# AEONTHRA Git Clean Doctor

Use this proposed skill only after manual review. It is not auto-activated.

## Purpose
Verify source dirty state is safe and runtime artifacts remain ignored/not tracked.

## Daily command
```powershell
powershell -ExecutionPolicy Bypass -File .\.codex-godmode\Test-GodModeClean.ps1 -Project .
```

## Safety
- Runtime proof is required before success claims.
- Do not auto-activate this skill.
- Do not write runtime/proof artifacts into Git.
