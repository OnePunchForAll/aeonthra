param([string]$Project='.',[string]$MissionId)
$ErrorActionPreference='Continue'; [Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
$S = Split-Path -Parent $MyInvocation.MyCommand.Path
foreach($l in 'Common','Queue','TraceCrystal','Operational') { . (Join-Path $S "lib/GodMode.$l.ps1") }
$root = Initialize-GodModeStructure $Project
if ([string]::IsNullOrWhiteSpace($MissionId)) { $MissionId = 'trace-' + (Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssZ') }
$registry = Read-GodModeJson (Join-GodModePath $root 'state/process-registry.json') ([ordered]@{})
$validation = Get-GodModeLatestFilePath (Join-GodModePath $root 'logs') 'validation-*.json'
$browserProof = Get-ChildItem (Join-GodModePath $root 'logs') -Recurse -Filter 'browser-proof.json' -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
$worker = Read-GodModeJson (Join-GodModePath $root 'state/worker-smoke.json') ([ordered]@{})
$queue = Get-GodModeQueueSnapshot $Project
Add-GodModeTraceSpan $Project $MissionId 'trace-crystal-start' 'success' @{mission_id=$MissionId} 'trace_crystal_start' 'TRACE-CRYSTAL' 'Run-TraceCrystal.ps1' 0 @() @() 'Trace Crystal smoke conversion started.' | Out-Null
Add-GodModeTraceSpan $Project $MissionId 'process-registry-snapshot' 'success' @{registry=$registry} 'process_registry_snapshot' 'TRACE-CRYSTAL' '' $null @('state/process-registry.json') @('state/process-registry.json') 'Process registry snapshot referenced.' | Out-Null
Add-GodModeTraceSpan $Project $MissionId 'queue-snapshot' 'success' @{queue=$queue} 'queue_snapshot' 'TRACE-CRYSTAL' '' $null @() @('queues') 'Queue snapshot referenced.' | Out-Null
if ($validation) { Add-GodModeTraceSpan $Project $MissionId 'latest-validation' 'success' @{validation=$validation} 'validation_reference' 'TRACE-CRYSTAL' '' $null @($validation) @($validation) 'Latest validation summary referenced.' | Out-Null } else { Add-GodModeTraceSpan $Project $MissionId 'latest-validation' 'degraded' @{} 'validation_reference' 'TRACE-CRYSTAL' '' $null @() @() 'No validation summary found.' | Out-Null }
if ($browserProof) { Add-GodModeTraceSpan $Project $MissionId 'latest-browser-proof' 'success' @{proof=$browserProof.FullName} 'browser_proof_reference' 'TRACE-CRYSTAL' '' $null @($browserProof.FullName) @($browserProof.FullName) 'Latest browser proof referenced.' | Out-Null } else { Add-GodModeTraceSpan $Project $MissionId 'latest-browser-proof' 'degraded' @{} 'browser_proof_reference' 'TRACE-CRYSTAL' '' $null @() @() 'No browser proof bundle found.' | Out-Null }
if ((Get-GodModeProperty $worker 'status' '') -ne '') { $traceStatus = 'degraded'; if((Get-GodModeProperty $worker 'status' '') -eq 'passed'){ $traceStatus='success' }; Add-GodModeTraceSpan $Project $MissionId 'worker-smoke-reference' $traceStatus @{worker=$worker} 'worker_reference' 'TRACE-CRYSTAL' '' $null @('state/worker-smoke.json') @('state/worker-smoke.json') 'Worker smoke state referenced.' | Out-Null }
$summary = Update-GodModeTraceSummary $Project $MissionId
Write-Host ("[TRACE] {0}" -f $summary.summary_file)
exit 0
