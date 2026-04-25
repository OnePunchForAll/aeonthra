param([string]$Project='.')
$ErrorActionPreference='Continue'; [Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
$S = Split-Path -Parent $MyInvocation.MyCommand.Path
foreach($l in 'Common','Queue','TraceCrystal','Operational','Live','Health') { . (Join-Path $S "lib/GodMode.$l.ps1") }
$root = Initialize-GodModeStructure $Project
$runId = New-GodModeRunId
$registry = Get-GodModeProcessRegistry $Project
$events = @(); $componentsOut = @()
foreach($entry in @(Get-GodModeProperty $registry 'components' @())) {
  $component = [string](Get-GodModeProperty $entry 'component' '')
  $pidValue = Get-GodModeProperty $entry 'pid' $null
  $scriptPath = [string](Get-GodModeProperty $entry 'script_path' '')
  $owned = [string](Get-GodModeProperty $entry 'owned_by' '')
  $event = [ordered]@{ component=$component; pid=$pidValue; attempted_at=Get-GodModeIso; result='skipped'; reason=$null }
  if ($component -in @('arena','live') -and $owned -eq 'aeonthra-godmode' -and $scriptPath -match '\.codex-godmode' -and $null -ne $pidValue -and "$pidValue" -ne '') {
    try {
      Get-Process -Id ([int]$pidValue) -ErrorAction Stop | Out-Null
      Stop-Process -Id ([int]$pidValue) -Force -ErrorAction Stop
      $event.result = 'stopped'
      Add-GodModeTraceSpan $Project $runId "stop-$component" 'success' @{pid=$pidValue} 'stop_server' 'HOST' "Stop-Process -Id $pidValue" 0 @() @() "Stopped AEONTHRA-owned $component process." | Out-Null
    } catch {
      $event.result = 'not_stopped'; $event.reason = $_.Exception.Message
      Add-GodModeTraceSpan $Project $runId "stop-$component" 'degraded' @{pid=$pidValue;error=$_.Exception.Message} 'stop_server' 'HOST' "Stop-Process -Id $pidValue" $null @() @() "Could not stop $component; process may already be gone." | Out-Null
    }
  } else { $event.reason = 'not an owned persistent server process or missing pid' }
  $events += $event
  $copy = [ordered]@{}
  foreach($p in $entry.PSObject.Properties) { $copy[$p.Name] = $p.Value }
  $copy['status'] = if($event.result -eq 'stopped'){'stopped'}elseif($event.result -eq 'not_stopped'){'stop_degraded'}else{Get-GodModeProperty $entry 'status' 'skipped'}
  $copy['stopped_at'] = Get-GodModeIso
  $componentsOut += $copy
}
$oldShutdown = @(Get-GodModeProperty $registry 'shutdown_events' @())
$registryOut = [ordered]@{ schema_version=1; owner='aeonthra-godmode'; updated_at=Get-GodModeIso; run_id=(Get-GodModeProperty $registry 'run_id' $null); components=$componentsOut; startup_blockers=@(Get-GodModeProperty $registry 'startup_blockers' @()); shutdown_events=@($oldShutdown + @([ordered]@{ run_id=$runId; created_at=Get-GodModeIso; events=$events })) }
Save-GodModeProcessRegistry $Project $registryOut | Out-Null
Add-GodModeJsonLine (Join-GodModePath $root 'memory/host-action-ledger.jsonl') @{schema_version=1;created_at=Get-GodModeIso;type='stop-godmode';run_id=$runId;events=$events}
Update-GodModeHealth $Project 'STOPPED' @() @() @{ live_result_status='stopped'; process_registry='state/process-registry.json' } | Out-Null
Update-GodModeLiveResult $Project @{ status='STOPPED'; headline='Aeonthra GodMode servers stopped'; browser_status='not running'; what_changed=@('Stopped only AEONTHRA-owned registry processes.'); what_still_failed=@($events | Where-Object { $_.result -eq 'not_stopped' } | ForEach-Object { $_.reason }); next_repair_action='Run Start-GodMode.ps1 to restart.' } | Out-Null
Write-Host '[STOP] Stop-GodMode completed. Owned process events:'
$events | ForEach-Object { Write-Host (" - {0} pid={1} result={2} {3}" -f $_.component,$_.pid,$_.result,$_.reason) }
exit 0
