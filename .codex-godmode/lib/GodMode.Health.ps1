Set-StrictMode -Version 2.0
function Update-GodModeHealth {
  param([string]$Project='.',[string]$Status='VERIFIED-MVP',[array]$DegradedReasons=@(),[array]$Blockers=@(),[hashtable]$Extra=@{})
  $r=Initialize-GodModeStructure $Project
  $q=Get-GodModeQueueDepth $Project
  $arenaPort=[string](Get-Content (Join-GodModePath $r 'state/arena-port.txt') -ErrorAction SilentlyContinue | Select-Object -First 1)
  $livePort=[string](Get-Content (Join-GodModePath $r 'state/live-preview-port.txt') -ErrorAction SilentlyContinue | Select-Object -First 1)
  $health=@{
    schema_version=1; updated_at=Get-GodModeIso; status=$Status; active_agents=0; queue_depth=$q; failed_missions=$q.failed;
    crash_count=0; schema_rejection_count=0; injection_rejection_count=0; browser_rejection_count=0; windows_route_failure_count=0;
    average_stability=72; validation_pass_rate='unknown_until_validate_system'; browser_validation_pass_rate='unknown'; windows_route_success_rate='unknown';
    xp_awarded_by_host=0; quarantined_entities=0; current_arena_port=$arenaPort; current_live_preview_port=$livePort;
    current_app_port=$null; last_checkpoint=$null; degraded_mode_status=if($DegradedReasons.Count){'degraded'}else{'normal'};
    latest_blocker=if($Blockers.Count){$Blockers[0]}else{$null}; live_result_status=$null; selected_codex_route=$null; selected_browser_route=$null; selected_patch_route=$null;
    degraded_reasons=$DegradedReasons; blockers=$Blockers
  }
  foreach($k in $Extra.Keys){ $health[$k]=$Extra[$k] }
  Write-GodModeJsonAtomic (Join-GodModePath $r 'state/health.json') $health | Out-Null
  return $health
}
