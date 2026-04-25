param([string]$Project='.')
$ErrorActionPreference='Stop'; [Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
$S=Split-Path -Parent $MyInvocation.MyCommand.Path; . (Join-Path $S 'lib/GodMode.Common.ps1'); . (Join-Path $S 'lib/GodMode.Queue.ps1')
$r=Initialize-GodModeStructure $Project; $h=Read-GodModeJson (Join-GodModePath $r 'state/health.json') @{}; $l=Read-GodModeJson (Join-GodModePath $r 'live/result-state.json') @{}
Write-Host 'AEONTHRA MISSION CONTROL'; Write-Host "Status: $($h.status)"; Write-Host "Live Result: $($l.live_url)"; Write-Host "Arena: $($l.arena_url)"; Write-Host "Browser: $($l.browser_status)"; Write-Host "Queues: $((Get-GodModeQueueDepth $Project|ConvertTo-Json -Compress))"; Write-Host "Proof: $($l.latest_proof_bundle)"
