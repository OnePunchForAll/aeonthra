param([string]$Project='.',[switch]$Json)
$ErrorActionPreference='Continue'; [Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
$S = Split-Path -Parent $MyInvocation.MyCommand.Path
foreach($l in 'Common','Queue','Schema','Safety','TraceCrystal','Operational') { . (Join-Path $S "lib/GodMode.$l.ps1") }
$root = Initialize-GodModeStructure $Project
$status = Get-GodModeOperationalStatusObject $Project
Write-GodModeJsonAtomic (Join-GodModePath $root 'state/status-summary.json') $status | Out-Null
Add-GodModeTraceSpan $Project 'status-godmode' 'status' 'success' @{branch=$status.branch;queue=$status.queue.depth} 'status' 'HOST' 'Status-GodMode.ps1' 0 @('state/status-summary.json') @('state/status-summary.json') 'Status projection updated.' | Out-Null
if ($Json) { $status | ConvertTo-Json -Depth 30; exit 0 }
Write-Host 'AEONTHRA GODMODE STATUS'
Write-Host ("Branch: {0}" -f $status.branch)
Write-Host 'Git:'; Write-Host $status.git_status
Write-Host ("Live Result URL: {0}" -f $status.live_url)
Write-Host ("Arena URL: {0}" -f $status.arena_url)
Write-Host 'Server PIDs:'
foreach($p in @($status.process_status)) { Write-Host (" - {0}: pid={1} alive={2} http={3} url={4}" -f $p.component,$p.pid,$p.alive,$p.http_ok,$p.url) }
Write-Host ("Validation status: {0}" -f (Get-GodModeProperty $status.validation_status 'status' 'unknown'))
Write-Host ("Browser proof status: {0}" -f (Get-GodModeProperty $status.browser_route_status 'selected_browser_route' 'unknown'))
Write-Host ("Codex worker route: {0}" -f (Get-GodModeProperty $status.codex_worker_route_status 'structured_worker_route' 'unknown'))
Write-Host ("Latest proof bundle: {0}" -f $status.latest_proof_bundle)
Write-Host ("Latest trace crystal: {0}" -f (Get-GodModeProperty $status.latest_trace_crystal 'summary_file' 'unknown'))
Write-Host ("Queue depth: pending={0} active={1} done={2} failed={3}" -f $status.queue.depth.pending,$status.queue.depth.active,$status.queue.depth.done,$status.queue.depth.failed)
Write-Host ("Active missions: {0}" -f (@($status.active_missions).Count))
Write-Host ("Failed missions: {0}" -f (@($status.failed_missions).Count))
Write-Host ("Degraded capabilities ({0}): {1}" -f $status.degraded_capability_count, (($status.degraded_capabilities | Select-Object -Unique) -join '; '))
Write-Host ("Next recommended command: {0}" -f $status.next_recommended_command)
exit 0
