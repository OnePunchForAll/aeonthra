Set-StrictMode -Version 2.0
function Invoke-GodModeEvolutionScan { param([string]$Project='.') @{schema_version=1;generated_at=(Get-Date).ToUniversalTime().ToString('o');status='deferred_mvp';helper='GodMode.Evolution.ps1'} }
