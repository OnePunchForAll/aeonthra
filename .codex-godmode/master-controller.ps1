param(
  [string]$Project='.',
  [ValidateSet('safe','fullauto','yolo')][string]$Mode='safe',
  [switch]$Once,
  [switch]$Loop,
  [switch]$DryRun,
  [int]$MaxIterations=1,
  [switch]$NoSpawn,
  [switch]$NoBrowser,
  [switch]$NoWorker,
  [switch]$NoPatch
)
$ErrorActionPreference='Continue'; [Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
$S=Split-Path -Parent $MyInvocation.MyCommand.Path
foreach($l in 'Common','Queue','Schema','Safety','Health','Arena','Live','Proof','TraceCrystal','SafePatch','CodexRouter','RealityRouter','Operational'){ . (Join-Path $S "lib/GodMode.$l.ps1") }
$root=Initialize-GodModeStructure $Project
if(-not $Loop -and -not $Once){ $Once=$true }
if($MaxIterations -lt 1){ $MaxIterations=1 }
$run=New-GodModeRunId
$iteration=0
$allProcessed=@(); $allFailed=@(); $allRouted=@()
function Invoke-MasterIteration {
  param([int]$Iteration)
  $processed=@(); $failed=@(); $events=@()
  Add-GodModeTraceSpan $Project $script:run "master-iteration-$Iteration-start" 'success' @{iteration=$Iteration;mode=$Mode;dry_run=[bool]$DryRun} 'master_iteration_start' 'MASTER' 'master-controller.ps1' $null @() @() 'Master loop iteration started.' | Out-Null
  try {
    $routing=Invoke-GodModeVisualFeedbackRouting $Project
    $script:allRouted += @($routing.created)
    $events += @{type='visual_feedback_routing';created=@($routing.created).Count;rejected=@($routing.rejected).Count;created_at=Get-GodModeIso}
  } catch {
    $failed += @{file='visual-feedback-routing';error=$_.Exception.Message}
    Add-GodModeTraceSpan $Project $script:run 'visual-feedback-routing' 'failed' @{error=$_.Exception.Message} 'route_visual_feedback' 'MASTER' '' $null @() @('live/visual-feedback-events.jsonl') 'Visual feedback routing failed.' | Out-Null
  }

  try {
    $hookPath = Join-GodModePath $root 'events/hooks.jsonl'
    $acceptedHooks=@(); $rejectedHooks=@()
    if(Test-Path -LiteralPath $hookPath){
      foreach($line in Get-Content -LiteralPath $hookPath -Encoding UTF8){
        if([string]::IsNullOrWhiteSpace($line)){continue}
        try{
          $hookEvent=$line|ConvertFrom-Json
          $scan=Test-GodModeInjectionText ([string](Get-GodModeProperty $hookEvent 'event_path' '')) $Project
          if(-not $scan.ok){$rejectedHooks += @{reason='injection';hits=$scan.hits;event=$hookEvent}}
          else{$acceptedHooks += $hookEvent}
        }catch{$rejectedHooks += @{reason='parse';error=$_.Exception.Message}}
      }
    }
    $hookState=@{schema_version=1;updated_at=Get-GodModeIso;accepted_count=$acceptedHooks.Count;rejected_count=$rejectedHooks.Count;write_boundary='.codex-godmode/events/hooks.jsonl'}
    Write-GodModeJsonAtomic (Join-GodModePath $root 'state/hook-events-ingested.json') $hookState | Out-Null
    $events += @{type='hook_events_ingested';accepted=$acceptedHooks.Count;rejected=$rejectedHooks.Count;created_at=Get-GodModeIso}
    Add-GodModeTraceSpan $Project $script:run 'ingest-hook-events' 'success' $hookState 'ingest_hook_events' 'MASTER' '' $null @('state/hook-events-ingested.json') @('events/hooks.jsonl','state/hook-events-ingested.json') 'Hook events ingested through master projection boundary.' | Out-Null
  } catch {
    $failed += @{file='events/hooks.jsonl';error=$_.Exception.Message}
    Add-GodModeTraceSpan $Project $script:run 'ingest-hook-events' 'failed' @{error=$_.Exception.Message} 'ingest_hook_events' 'MASTER' '' $null @() @('events/hooks.jsonl') 'Hook event ingestion failed.' | Out-Null
  }

  foreach($file in Get-ChildItem (Join-GodModePath $root 'inbox/results') -Filter '*.json' -ErrorAction SilentlyContinue){
    try{
      $res=Get-Content $file.FullName -Raw -Encoding UTF8|ConvertFrom-Json
      $schema=Test-GodModeJsonLite $file.FullName (Get-GodModeSchemaRequiredKeys 'result')
      if(-not $schema.ok){throw ('schema_lite_failed '+($schema.errors -join ','))}
      $safe=Test-GodModeResultSafety $res $Project
      if(-not $safe.ok){throw ('injection_gate_failed '+($safe.errors -join ','))}
      $xp=25+(5*@($res.verified_claims).Count)
      Add-GodModeJsonLine (Join-GodModePath $root 'memory/experience-ledger.jsonl') @{schema_version=1;mission_id=$res.mission_id;role=$res.agent_role;status=$res.status;xp_awarded_by_host=$xp;stability=72;created_at=Get-GodModeIso;evidence_hashes=(Get-GodModeProperty $res 'evidence_hashes' @{})}
      Add-GodModeJsonLine (Join-GodModePath $root 'memory/validation-history.jsonl') @{schema_version=1;mission_id=$res.mission_id;status='accepted';created_at=Get-GodModeIso;validation_results=$res.validation_results}
      Move-Item -LiteralPath $file.FullName -Destination (Join-GodModePath $root "queues/done/$($res.mission_id).result.json") -Force
      $processed+=$res.mission_id
      Add-GodModeTraceSpan $Project $res.mission_id 'ingest-result' 'success' @{result=$file.FullName;xp=$xp} 'ingest_result' 'MASTER' '' $null @($file.FullName) @($file.FullName) 'Schema-valid worker result ingested by master.' | Out-Null
    } catch {
      $failed+=@{file=$file.FullName;error=$_.Exception.Message}
      Move-Item -LiteralPath $file.FullName -Destination (Join-GodModePath $root "queues/failed/$($file.BaseName).failed.json") -Force
      Add-GodModeTraceSpan $Project $script:run 'ingest-result' 'failed' @{file=$file.FullName;error=$_.Exception.Message} 'ingest_result' 'MASTER' '' $null @($file.FullName) @($file.FullName) 'Worker result rejected.' | Out-Null
    }
  }
  $stale=@()
  foreach($hb in Get-ChildItem (Join-GodModePath $root 'inbox/heartbeats') -Filter '*.json' -ErrorAction SilentlyContinue){ if(((Get-Date)-$hb.LastWriteTime).TotalMinutes -gt 30){ $stale += $hb.Name } }
  if($stale.Count){ Add-GodModeTraceSpan $Project $script:run 'reap-stale-heartbeats' 'degraded' @{stale=$stale} 'reap_stale_heartbeats' 'MASTER' '' $null @() @('inbox/heartbeats') 'Stale heartbeats detected; not deleted.' | Out-Null }
  $codex=Invoke-GodModeCodexRouter $Project
  $reality=Invoke-GodModeRealityRouter $Project
  $patch=Test-GodModeSafePatchRoute $Project
  $pending=@(Get-ChildItem (Join-GodModePath $root 'queues/pending') -Filter '*.json' -ErrorAction SilentlyContinue | Sort-Object LastWriteTime | Select-Object -First 3)
  if($pending.Count -and -not $NoSpawn -and -not $DryRun -and -not $NoWorker){
    foreach($missionFile in $pending){
      try{
        $mission=Get-Content $missionFile.FullName -Raw -Encoding UTF8|ConvertFrom-Json
        if((Get-GodModeProperty $mission 'allow_patch' $false) -and $NoPatch){ throw 'mission requested patch but -NoPatch is active' }
        & (Join-Path $S 'spawn-agent.ps1') -Project $Project -MissionId $mission.id -Role $mission.role -Task $mission.task -DryRun | Out-Null
        Move-Item -LiteralPath $missionFile.FullName -Destination (Join-GodModePath $root "queues/active/$($mission.id).json") -Force
        Add-GodModeTraceSpan $Project $mission.id 'spawn-safe-mission' 'success' @{role=$mission.role} 'spawn_mission' 'MASTER' 'spawn-agent.ps1 -DryRun' 0 @() @($missionFile.FullName) 'Spawned safe dry-run mission.' | Out-Null
      } catch {
        $failed+=@{file=$missionFile.FullName;error=$_.Exception.Message}
        Move-Item -LiteralPath $missionFile.FullName -Destination (Join-GodModePath $root "queues/failed/$($missionFile.BaseName).failed.json") -Force
      }
    }
  } else {
    Add-GodModeTraceSpan $Project $script:run 'pending-queue-observed' 'success' @{pending=$pending.Count;no_spawn=[bool]$NoSpawn;dry_run=[bool]$DryRun;no_worker=[bool]$NoWorker} 'process_pending_queue' 'MASTER' '' $null @() @('queues/pending') 'Pending queue observed without spawning unsafe work.' | Out-Null
  }
  $queue=Get-GodModeQueueSnapshot $Project
  Update-GodModeDeityManifest $Project @($queue.active) @($events + @(@{type='master_cycle';run_id=$script:run;processed=$processed;failed=$failed.Count;pending=$queue.depth.pending;created_at=Get-GodModeIso}))|Out-Null
  $proofs=@(Get-ChildItem (Join-GodModePath $root 'logs') -Recurse -Filter 'browser-proof.json' -ErrorAction SilentlyContinue|sort LastWriteTime -Descending|select -First 3|%{$_.FullName})
  $logs=@(Get-ChildItem (Join-GodModePath $root 'logs') -Filter '*.log' -ErrorAction SilentlyContinue|sort LastWriteTime -Descending|select -First 5|%{$_.FullName})
  $liveUrl=[string](Get-Content (Join-GodModePath $root 'state/latest-result.url') -ErrorAction SilentlyContinue|Select-Object -First 1)
  $arenaPort=[string](Get-Content (Join-GodModePath $root 'state/arena-port.txt') -ErrorAction SilentlyContinue|Select-Object -First 1)
  $arenaUrl=if($arenaPort){"http://127.0.0.1:$arenaPort/"}else{$null}
  Update-GodModeLiveResult $Project @{status='VERIFIED-OPERATIONAL-PHASE5';headline='Master operational loop projected state';live_url=$liveUrl;arena_url=$arenaUrl;browser_status=if($NoBrowser){'browser disabled for master loop'}else{(Get-GodModeProperty $reality 'selected_browser_route' 'unknown')};latest_proof_bundle=if($proofs.Count){$proofs[0]}else{$null};what_changed=@("Processed inbox results: $($processed.Count)","Routed visual feedback: $(@($script:allRouted).Count)","Pending missions: $($queue.depth.pending)");what_still_failed=@($failed|%{$_.error})+@($reality.degraded_reasons);validation_logs=$logs;proof_bundles=$proofs;next_repair_action='Run Status-GodMode.ps1 or Run-GodModeValidation.ps1.';queue_depth=$queue.depth;latest_trace=(Join-GodModePath $root "traces/$script:run.summary.json")}|Out-Null
  Update-GodModeHealth $Project 'VERIFIED-OPERATIONAL-PHASE5' @($reality.degraded_reasons) @($failed|%{$_.error}) @{selected_codex_route=$codex.structured_worker_route;selected_browser_route=$reality.selected_browser_route;selected_patch_route=$patch.selected_route;live_result_status='ready';xp_awarded_by_host=(30*$processed.Count);active_agents=0;latest_trace=(Join-GodModePath $root "traces/$script:run.summary.json")}|Out-Null
  $status=Get-GodModeOperationalStatusObject $Project
  Write-GodModeJsonAtomic (Join-GodModePath $root 'state/status-summary.json') $status | Out-Null
  $traceStatus = 'success'; if($failed.Count){ $traceStatus = 'degraded' }
  Add-GodModeTraceSpan $Project $script:run "master-iteration-$Iteration-end" $traceStatus @{processed=$processed;failed=$failed;queue=$queue.depth} 'master_iteration_end' 'MASTER' 'master-controller.ps1' 0 @('live/result-state.json','state/health.json','arena/deity-manifest.json') @('live/result-state.json','state/health.json','arena/deity-manifest.json') 'Master iteration completed.' | Out-Null
  return @{processed=$processed;failed=$failed}
}
while($true){
  if(Test-Path (Join-GodModePath $root 'state/STOP')){ Add-GodModeTraceSpan $Project $run 'stop-file-detected' 'blocked' @{} 'stop_file_detected' 'MASTER' '' $null @('state/STOP') @('state/STOP') 'Master loop stopped by STOP file.' | Out-Null; break }
  $iteration++
  $result=Invoke-MasterIteration $iteration
  $allProcessed += @($result.processed)
  $allFailed += @($result.failed)
  if($Once -or -not $Loop){ break }
  if($iteration -ge $MaxIterations){ break }
  Start-Sleep -Seconds 2
}
Write-Host "[DONE] Master loop $run iterations=$iteration processed=$($allProcessed.Count) failed=$($allFailed.Count)."
if($allFailed.Count){ exit 1 } else { exit 0 }

