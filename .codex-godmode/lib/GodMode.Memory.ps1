Set-StrictMode -Version 2.0
function Get-GodModeMemorySnapshot { param([string]$Project='.') @{schema_version=1;generated_at=(Get-Date).ToUniversalTime().ToString('o');status='deferred_mvp';helper='GodMode.Memory.ps1'} }
