Set-StrictMode -Version 2.0
function Get-GodModeLatestBrowserProofPath {
  param([string]$Project='.')
  $r=Initialize-GodModeStructure $Project
  $p=Get-ChildItem (Join-GodModePath $r 'logs') -Recurse -Filter 'browser-proof.json' -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if($p){return $p.FullName}; return $null
}
function Get-GodModeBeautyGateState {
  param([string]$Project='.')
  $r=Initialize-GodModeStructure $Project
  Read-GodModeJson (Join-GodModePath $r 'state/beauty-gate.json') ([ordered]@{schema_version=1;status='pending-human-review';evidence=@();blockers=@('Beauty Gate requires browser screenshots and objective selector checks after visual implementation.')})
}
function Update-GodModeLevelingProjection {
  param([string]$Project='.')
  $r=Initialize-GodModeStructure $Project
  $manifest=Read-GodModeJson (Join-GodModePath $r 'arena/deity-manifest.json') ([ordered]@{entities=@()})
  $status=Read-GodModeJson (Join-GodModePath $r 'state/status-summary.json') ([ordered]@{})
  $validation=Read-GodModeJson (Join-GodModePath $r 'state/validation-status.json') ([ordered]@{})
  $worker=Read-GodModeJson (Join-GodModePath $r 'state/worker-smoke.json') ([ordered]@{})
  $trace=Read-GodModeJson (Join-GodModePath $r 'state/latest-trace-summary.json') ([ordered]@{})
  $clean=Read-GodModeJson (Join-GodModePath $r 'state/clean-doctor.json') ([ordered]@{status='unknown'})
  $reality=Read-GodModeJson (Join-GodModePath $r 'state/reality-router.json') ([ordered]@{})
  $beauty=Get-GodModeBeautyGateState $Project
  $blockers=@()
  if((Get-GodModeProperty $validation 'status' '') -ne 'passed'){ $blockers += 'validation_not_passed' }
  if((Get-GodModeProperty $worker 'status' '') -ne 'passed'){ $blockers += 'worker_smoke_not_passed' }
  if((Get-GodModeProperty $reality 'selected_browser_route' '') -ne 'codex_browser_use_iab' -or -not (Get-GodModeLatestBrowserProofPath $Project)){ $blockers += 'browser_proof_not_passed' }
  if(-not (Get-GodModeProperty $trace 'summary_file' $null)){ $blockers += 'trace_crystal_missing' }
  if((Get-GodModeProperty $clean 'status' 'unknown') -notin @('CLEAN','DIRTY-BUT-SAFE')){ $blockers += 'clean_doctor_not_safe' }
  foreach($b in @(Get-GodModeProperty $status 'full_godmode_blockers' @())){ if($b){$blockers += "full_blocker:$b"} }
  $beautyStatus=[string](Get-GodModeProperty $beauty 'status' 'pending-human-review')
  if($beautyStatus -ne 'passed'){ $blockers += "beauty_gate:$beautyStatus" }
  $eligible=($blockers.Count -eq 0)
  $agents=[ordered]@{}
  foreach($e in @(Get-GodModeProperty $manifest 'entities' @())){
    $id=[string](Get-GodModeProperty $e 'id' ([guid]::NewGuid().ToString('n')))
    $start=[int](Get-GodModeProperty $e 'project_level_start' (Get-GodModeProperty $e 'level' 1))
    $current=[int](Get-GodModeProperty $e 'level' $start)
    $delta=[Math]::Max(0,[Math]::Min(5,$current-$start))
    $agents[$id]=[ordered]@{
      schema_version=1
      id=$id
      role=Get-GodModeProperty $e 'role' 'UNKNOWN'
      project_level_start=$start
      project_level_current=($start+$delta)
      project_level_delta=$delta
      project_level_cap_remaining=(5-$delta)
      level_gate_status=if($eligible){'eligible'}elseif($beautyStatus -eq 'pending-human-review'){'pending'}else{'locked'}
      beauty_gate_status=$beautyStatus
      last_level_proof_ref=if($eligible){Get-GodModeLatestBrowserProofPath $Project}else{$null}
    }
  }
  $projection=[ordered]@{
    schema_version=1
    generated_at=Get-GodModeIso
    status=if($eligible){'eligible'}else{'locked'}
    level_gate_status=if($eligible){'eligible'}elseif($beautyStatus -eq 'pending-human-review'){'pending'}else{'locked'}
    beauty_gate_status=$beautyStatus
    max_project_level_delta=5
    blockers=@($blockers | Select-Object -Unique)
    evidence=[ordered]@{validation=(Get-GodModeProperty $validation 'status' 'unknown');worker=(Get-GodModeProperty $worker 'status' 'unknown');browser=(Get-GodModeProperty $reality 'selected_browser_route' 'unknown');trace=(Get-GodModeProperty $trace 'summary_file' $null);clean=(Get-GodModeProperty $clean 'status' 'unknown');beauty_gate=$beauty}
    agents=$agents
  }
  Write-GodModeJsonAtomic (Join-GodModePath $r 'state/leveling-projection.json') $projection | Out-Null
  return $projection
}
