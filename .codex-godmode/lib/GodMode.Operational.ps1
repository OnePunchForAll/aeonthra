Set-StrictMode -Version 2.0
function Get-GodModeProperty {
  param($Object,[string]$Name,$Default=$null)
  if ($null -eq $Object) { return $Default }
  if ($Object -is [System.Collections.IDictionary]) {
    if ($Object.Contains($Name)) { return $Object[$Name] }
    return $Default
  }
  $prop = $Object.PSObject.Properties[$Name]
  if ($prop) { return $prop.Value }
  return $Default
}
function Invoke-GodModeHttpProbe {
  param([string]$Url,[int]$TimeoutSeconds=3)
  $result = [ordered]@{ url=$Url; ok=$false; status_code=$null; error=$null; checked_at=Get-GodModeIso }
  if ([string]::IsNullOrWhiteSpace($Url)) { $result.error='missing_url'; return $result }
  try {
    $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec $TimeoutSeconds -ErrorAction Stop
    $result.status_code = [int]$response.StatusCode
    $result.ok = ($response.StatusCode -ge 200 -and $response.StatusCode -lt 400)
  } catch {
    $result.error = $_.Exception.Message
    try { if ($_.Exception.Response) { $result.status_code = [int]$_.Exception.Response.StatusCode } } catch {}
  }
  return $result
}
function Get-GodModeLatestFilePath {
  param([string]$Directory,[string]$Filter='*')
  $f = Get-ChildItem -LiteralPath $Directory -Filter $Filter -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if ($f) { return $f.FullName }
  return $null
}
function Get-GodModeListeningProcessInfo {
  param([int]$Port)
  try {
    $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Stop | Where-Object { $_.LocalAddress -in @('127.0.0.1','0.0.0.0','::','::1') } | Select-Object -First 1
    if ($conn) {
      $pidValue = [int]$conn.OwningProcess
      $cmd = $null
      try { $cmd = (Get-CimInstance Win32_Process -Filter "ProcessId=$pidValue" -ErrorAction Stop).CommandLine } catch {}
      return [ordered]@{ pid=$pidValue; command_line=$cmd }
    }
  } catch {}
  return [ordered]@{ pid=$null; command_line=$null }
}
function Get-GodModeProcessRegistry {
  param([string]$Project='.')
  $r = Initialize-GodModeStructure $Project
  $path = Join-GodModePath $r 'state/process-registry.json'
  $default = [ordered]@{ schema_version=1; owner='aeonthra-godmode'; updated_at=Get-GodModeIso; run_id=$null; components=@(); startup_blockers=@(); shutdown_events=@() }
  $obj = Read-GodModeJson $path $default
  if ($null -eq $obj) { return $default }
  return $obj
}
function Save-GodModeProcessRegistry {
  param([string]$Project='.', $Registry)
  $r = Initialize-GodModeStructure $Project
  if ($Registry -is [System.Collections.IDictionary]) { $Registry['updated_at'] = Get-GodModeIso } else { $Registry.updated_at = Get-GodModeIso }
  Write-GodModeJsonAtomic (Join-GodModePath $r 'state/process-registry.json') $Registry | Out-Null
  return $Registry
}
function Test-GodModeProcessEntry {
  param($Entry)
  $pidValue = Get-GodModeProperty $Entry 'pid' $null
  $url = [string](Get-GodModeProperty $Entry 'url' '')
  $alive = $false
  if ($null -ne $pidValue -and "$pidValue" -ne '') {
    try { $alive = [bool](Get-Process -Id ([int]$pidValue) -ErrorAction Stop) } catch { $alive = $false }
  }
  $http = Invoke-GodModeHttpProbe $url 2
  return [ordered]@{ pid=$pidValue; alive=$alive; http=$http; reusable=($http.ok -and ($alive -or $null -eq $pidValue -or "$pidValue" -eq '')) }
}
function Get-GodModeQueueSnapshot {
  param([string]$Project='.')
  $q = Get-GodModeQueueDepth $Project
  $r = Initialize-GodModeStructure $Project
  $pending = @(Get-ChildItem (Join-GodModePath $r 'queues/pending') -Filter '*.json' -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 10 | ForEach-Object { $_.Name })
  $active = @(Get-ChildItem (Join-GodModePath $r 'queues/active') -Filter '*.json' -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 10 | ForEach-Object { $_.Name })
  $failed = @(Get-ChildItem (Join-GodModePath $r 'queues/failed') -Filter '*.json' -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 10 | ForEach-Object { $_.Name })
  return [ordered]@{ depth=$q; pending=$pending; active=$active; failed=$failed }
}
function Read-GodModeVisualFeedbackEvents {
  param([string]$Project='.')
  $r = Initialize-GodModeStructure $Project
  $path = Join-GodModePath $r 'live/visual-feedback-events.jsonl'
  $events = @()
  if (-not (Test-Path -LiteralPath $path)) { return $events }
  foreach ($line in Get-Content -LiteralPath $path -Encoding UTF8) {
    if ([string]::IsNullOrWhiteSpace($line)) { continue }
    try { $events += ($line | ConvertFrom-Json) } catch {
      $events += [pscustomobject]@{ schema_version=1; id='unreadable-'+([guid]::NewGuid().ToString('N').Substring(0,8)); target='visual-feedback-events.jsonl'; text='Unreadable feedback line quarantined.'; created_at=Get-GodModeIso; degraded=$true }
    }
  }
  return $events
}

function Get-GodModeFeedbackRoutingState {
  param([string]$Project='.')
  $r = Initialize-GodModeStructure $Project
  $path = Join-GodModePath $r 'state/visual-feedback-routing.json'
  $default = [ordered]@{ schema_version=1; updated_at=Get-GodModeIso; events=@(); rejected=@(); feedback_count=0; routed_count=0; unresolved_count=0; rejected_count=0; duplicate_count=0 }
  $state = Read-GodModeJson $path $default
  if ($null -eq $state) { return $default }
  return $state
}
function Get-GodModeFeedbackSignature {
  param($Event)
  $target = ([string](Get-GodModeProperty $Event 'target' 'live-result-viewer')).Trim().ToLowerInvariant()
  if ([string]::IsNullOrWhiteSpace($target)) { $target = 'live-result-viewer' }
  $text = ([string](Get-GodModeProperty $Event 'text' '') -replace '\s+',' ').Trim().ToLowerInvariant()
  return "$target|$text"
}
function Get-GodModeMissionQueueName {
  param([string]$Project='.',[string]$MissionId)
  if ([string]::IsNullOrWhiteSpace($MissionId)) { return $null }
  $r = Initialize-GodModeStructure $Project
  foreach($q in @('active','done','failed','pending','replay','tournament','adversarial')) {
    if (Test-Path -LiteralPath (Join-GodModePath $r ("queues/$q/$MissionId.json"))) { return $q }
  }
  return $null
}
function Update-GodModeFeedbackRecordRuntimeStatus {
  param([string]$Project='.', $Record)
  $missionId = [string](Get-GodModeProperty $Record 'mission_id' '')
  $queue = Get-GodModeMissionQueueName $Project $missionId
  $status = [string](Get-GodModeProperty $Record 'feedback_status' (Get-GodModeProperty $Record 'routed_status' 'routed'))
  $resolved = [bool](Get-GodModeProperty $Record 'resolved' $false)
  if ($resolved) { $status = 'resolved' }
  elseif ((Get-GodModeProperty $Record 'routed_status' '') -eq 'rejected') { $status = 'rejected' }
  elseif ($queue -eq 'active') { $status = 'in_review' }
  elseif ($queue -eq 'done') { $status = 'resolved'; $resolved = $true }
  elseif ($queue -eq 'failed') { $status = 'rejected' }
  elseif ($queue -eq 'pending' -or $missionId) { $status = 'routed' }
  else { $status = 'new' }
  if ($Record -is [System.Collections.IDictionary]) {
    $Record['feedback_status'] = $status; $Record['routed_status'] = $status; $Record['queue'] = $queue; $Record['resolved'] = $resolved; $Record['proof_required'] = $true; $Record['updated_at'] = Get-GodModeIso
    return $Record
  }
  $copy = [ordered]@{}
  foreach($p in $Record.PSObject.Properties){ $copy[$p.Name]=$p.Value }
  $copy['feedback_status']=$status; $copy['routed_status']=$status; $copy['queue']=$queue; $copy['resolved']=$resolved; $copy['proof_required']=$true; $copy['updated_at']=Get-GodModeIso
  return $copy
}
function Invoke-GodModeVisualFeedbackRouting {
  param([string]$Project='.')
  $r = Initialize-GodModeStructure $Project
  $events = @(Read-GodModeVisualFeedbackEvents $Project)
  $state = Get-GodModeFeedbackRoutingState $Project
  $records = @(Get-GodModeProperty $state 'events' @())
  $rejected = @(Get-GodModeProperty $state 'rejected' @())
  $eventById = @{}
  foreach($event in $events) { $eid=[string](Get-GodModeProperty $event 'id' ''); if($eid){ $eventById[$eid]=$event } }
  $seen = @{}
  $signatureToRecord = @{}
  foreach ($record in $records) {
    $eid = [string](Get-GodModeProperty $record 'event_id' '')
    if ($eid) { $seen[$eid] = $true }
    $sig = [string](Get-GodModeProperty $record 'signature' '')
    if ([string]::IsNullOrWhiteSpace($sig) -and $eid -and $eventById.ContainsKey($eid)) { $sig = Get-GodModeFeedbackSignature $eventById[$eid] }
    if ($sig -and (Get-GodModeProperty $record 'mission_id' '')) { $signatureToRecord[$sig] = $record }
  }
  foreach ($record in $rejected) { $eid = [string](Get-GodModeProperty $record 'event_id' ''); if ($eid) { $seen[$eid] = $true } }
  $created = @(); $blocked = @(); $duplicates = @()
  foreach ($event in $events) {
    $eventId = [string](Get-GodModeProperty $event 'id' '')
    $text = [string](Get-GodModeProperty $event 'text' '')
    $target = [string](Get-GodModeProperty $event 'target' '')
    $createdAt = [string](Get-GodModeProperty $event 'created_at' '')
    if ([string]::IsNullOrWhiteSpace($eventId)) { $eventId = 'event-'+([guid]::NewGuid().ToString('N').Substring(0,12)) }
    if ($seen.ContainsKey($eventId)) { continue }
    $schemaErrors = @()
    if ([string]::IsNullOrWhiteSpace($target)) { $schemaErrors += 'missing-target' }
    if ([string]::IsNullOrWhiteSpace($text)) { $schemaErrors += 'missing-text' }
    if ([string]::IsNullOrWhiteSpace($createdAt)) { $schemaErrors += 'missing-created_at' }
    if ($schemaErrors.Count) {
      $rec = [ordered]@{ event_id=$eventId; feedback_status='rejected'; routed_status='rejected'; reason='schema-invalid'; schema_errors=$schemaErrors; updated_at=Get-GodModeIso; resolved=$false; proof_required=$false }
      $rejected += $rec; $blocked += $rec; Add-GodModeJsonLine (Join-GodModePath $r 'memory/visual-feedback-ledger.jsonl') $rec; continue
    }
    $scan = Test-GodModeInjectionText $text $Project
    if (-not $scan.ok) {
      $rec = [ordered]@{ event_id=$eventId; feedback_status='rejected'; routed_status='rejected'; reason='injection-suspected'; hits=@($scan.hits); updated_at=Get-GodModeIso; resolved=$false; proof_required=$false }
      $rejected += $rec; $blocked += $rec
      Add-GodModeJsonLine (Join-GodModePath $r 'memory/visual-feedback-ledger.jsonl') $rec
      continue
    }
    $signature = Get-GodModeFeedbackSignature $event
    if ($signatureToRecord.ContainsKey($signature)) {
      $existing = $signatureToRecord[$signature]
      $rec = [ordered]@{ event_id=$eventId; mission_id=(Get-GodModeProperty $existing 'mission_id' $null); duplicate_of_event_id=(Get-GodModeProperty $existing 'event_id' $null); role=(Get-GodModeProperty $existing 'role' 'UI-POLISH'); feedback_status='routed'; routed_status='routed'; queue=(Get-GodModeProperty $existing 'queue' 'pending'); resolved=[bool](Get-GodModeProperty $existing 'resolved' $false); allow_patch=$false; requires_browser_validation=$true; proof_required=$true; signature=$signature; updated_at=Get-GodModeIso }
      $records += $rec; $duplicates += $rec; Add-GodModeJsonLine (Join-GodModePath $r 'memory/visual-feedback-ledger.jsonl') $rec; continue
    }
    $role = 'UI-POLISH'
    if ($text -match '(?i)\b(click|browser|render|visible|screenshot|layout|viewport|proof)\b') { $role = 'BROWSER-REALITY' }
    if ($text -match '(?i)\b(error|bug|fail|broken|crash|wrong)\b') { $role = 'BUG-HUNTER' }
    $suffix = ($eventId -replace '[^a-zA-Z0-9]','')
    if ($suffix.Length -gt 14) { $suffix = $suffix.Substring(0,14) }
    if ([string]::IsNullOrWhiteSpace($suffix)) { $suffix = [guid]::NewGuid().ToString('N').Substring(0,10) }
    $missionId = "vf-$suffix"
    $mission = New-GodModeMissionObject $missionId $role "Review visual feedback without patching. Comment: $text" $false $true 4
    $mission['visual_feedback_event_id'] = $eventId
    $mission['source'] = 'visual-feedback-events.jsonl'
    $mission['proof_required'] = 'browser proof or explicit blocker required before patching'
    $mission['feedback_signature'] = $signature
    Save-GodModeMission $Project $mission 'pending' | Out-Null
    $rec = [ordered]@{ event_id=$eventId; mission_id=$missionId; role=$role; feedback_status='routed'; routed_status='routed'; queue='pending'; resolved=$false; allow_patch=$false; requires_browser_validation=$true; proof_required=$true; proof_refs=@(); signature=$signature; updated_at=Get-GodModeIso }
    $records += $rec; $created += $rec; $signatureToRecord[$signature]=$rec
    Add-GodModeJsonLine (Join-GodModePath $r 'memory/visual-feedback-ledger.jsonl') $rec
    Add-GodModeTraceSpan $Project $missionId 'route-visual-feedback' 'success' @{event_id=$eventId;role=$role} 'route_visual_feedback' 'MASTER' '' $null @() @('live/visual-feedback-events.jsonl','state/visual-feedback-routing.json') 'Visual feedback routed to proof-required mission.' | Out-Null
  }
  $refreshed = @()
  foreach($record in $records){ $refreshed += (Update-GodModeFeedbackRecordRuntimeStatus $Project $record) }
  $feedbackCount = @($events).Count
  $unresolved = @($refreshed | Where-Object { (Get-GodModeProperty $_ 'feedback_status' '') -in @('new','routed','in_review') -and -not [bool](Get-GodModeProperty $_ 'resolved' $false) })
  $newState = [ordered]@{ schema_version=1; updated_at=Get-GodModeIso; events=@($refreshed); rejected=@($rejected); feedback_count=$feedbackCount; routed_count=@($refreshed).Count; unresolved_count=@($unresolved).Count; rejected_count=@($rejected).Count; duplicate_count=@($duplicates).Count; status=if(@($blocked).Count){'degraded'}else{'operational'} }
  Write-GodModeJsonAtomic (Join-GodModePath $r 'state/visual-feedback-routing.json') $newState | Out-Null
  return [ordered]@{ created=@($created); duplicates=@($duplicates); rejected=@($blocked); unresolved=@($unresolved); state=$newState }
}


function Get-GodModeRuntimeTrackingState {
  param([string]$Project='.')
  $pp = Resolve-GodModeProjectPath $Project
  $tracked = @()
  try {
    $out = Invoke-GodModeNativeCommand git @('ls-files') $pp 20
    foreach($line in @($out.stdout -split "`r?`n")) {
      if ([string]::IsNullOrWhiteSpace($line)) { continue }
      $path = $line.Trim()
      if ($path -eq '.codex-godmode/state/STOP.example') { continue }
      if ($path -match '^\.codex-godmode/(logs|checkpoints|archive|worktrees|traces|events|inbox)/' -or
          $path -match '^\.codex-godmode/queues/(active|done|failed|pending)/' -or
          $path -match '^\.codex-godmode/state/.*\.(json|txt|lock)$' -or
          $path -match '^\.codex-godmode/live/(result-state\.json|preview-history\.jsonl|visual-feedback-events\.jsonl)$' -or
          $path -match '^\.codex-godmode/memory/.*\.jsonl$' -or
          $path -match '^\.codex-godmode/arena/(deity-manifest\.json|lore-ledger\.jsonl)$') { $tracked += $path }
    }
  } catch {}
  return [ordered]@{ schema_version=1; status=if($tracked.Count){'unsafe_tracked_runtime'}else{'safe'}; tracked_runtime_artifacts=@($tracked); checked_at=Get-GodModeIso }
}
function Get-GodModeOperationalStatusObject {
  param([string]$Project='.')
  $r = Initialize-GodModeStructure $Project
  $pp = Resolve-GodModeProjectPath $Project
  $branch = ''; $gitDirty = ''
  try { $branch = (Invoke-GodModeNativeCommand git @('branch','--show-current') $pp 10).stdout.Trim() } catch {}
  try { $gitDirty = (Invoke-GodModeNativeCommand git @('status','-sb') $pp 10).stdout.Trim() } catch {}
  $registry = Get-GodModeProcessRegistry $Project
  $components = @()
  foreach ($entry in @(Get-GodModeProperty $registry 'components' @())) {
    $probe = Test-GodModeProcessEntry $entry
    $components += [ordered]@{ component=Get-GodModeProperty $entry 'component' ''; pid=Get-GodModeProperty $entry 'pid' $null; port=Get-GodModeProperty $entry 'port' $null; url=Get-GodModeProperty $entry 'url' ''; status=Get-GodModeProperty $entry 'status' ''; alive=$probe.alive; http_ok=$probe.http.ok; http_status=$probe.http.status_code; http_error=$probe.http.error }
  }
  $health = Read-GodModeJson (Join-GodModePath $r 'state/health.json') ([ordered]@{})
  $codex = Read-GodModeJson (Join-GodModePath $r 'state/codex-router.json') ([ordered]@{})
  $reality = Read-GodModeJson (Join-GodModePath $r 'state/reality-router.json') ([ordered]@{})
  $validation = Read-GodModeJson (Join-GodModePath $r 'state/validation-status.json') ([ordered]@{})
  $trace = Read-GodModeJson (Join-GodModePath $r 'state/latest-trace-summary.json') ([ordered]@{})
  $worker = Read-GodModeJson (Join-GodModePath $r 'state/worker-smoke.json') ([ordered]@{})
  $clean = Read-GodModeJson (Join-GodModePath $r 'state/clean-doctor.json') ([ordered]@{status='unknown';blockers=@()})
  $failedResolution = Read-GodModeJson (Join-GodModePath $r 'state/failed-mission-resolution.json') ([ordered]@{status='unknown';unresolved_count=$null})
  $rules = Read-GodModeJson (Join-GodModePath $r 'state/rules-forge-status.json') ([ordered]@{status='unknown'})
  $hooks = Read-GodModeJson (Join-GodModePath $r 'state/hook-bus-status.json') ([ordered]@{status='unknown'})
  $skills = Read-GodModeJson (Join-GodModePath $r 'state/skill-forge-status.json') ([ordered]@{status='unknown'})
  $routing = Get-GodModeFeedbackRoutingState $Project
  $runtimeTracking = Get-GodModeRuntimeTrackingState $Project
  $latestProof = $null
  $latestProofFile = Get-ChildItem -LiteralPath (Join-GodModePath $r 'logs') -Recurse -Filter 'browser-proof.json' -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if ($latestProofFile) { $latestProof = $latestProofFile.FullName }
  $latestValidationBundle = Get-GodModeProperty $validation 'run_id' $null
  $latestValidationPath = Get-GodModeProperty $health 'latest_validation' $null
  if (-not $latestValidationPath) { $vf = Get-ChildItem -LiteralPath (Join-GodModePath $r 'logs') -Filter 'godmode-validation-*.json' -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1; if($vf){$latestValidationPath=$vf.FullName} }
  $queue = Get-GodModeQueueSnapshot $Project
  $degraded = @()
  foreach ($x in @(Get-GodModeProperty $health 'degraded_reasons' @())) { if ($x) { $degraded += [string]$x } }
  foreach ($x in @(Get-GodModeProperty $reality 'degraded_reasons' @())) { if ($x) { $degraded += [string]$x } }
  foreach ($x in @(Get-GodModeProperty $codex 'degraded_reasons' @())) { if ($x) { $degraded += [string]$x } }
  foreach ($forge in @($rules,$hooks,$skills)) { $fs=[string](Get-GodModeProperty $forge 'status' 'unknown'); if($fs -in @('degraded','unknown','proposal_only')){ $degraded += "forge:$fs" } }
  $liveUrl = [string](Get-Content (Join-GodModePath $r 'state/latest-result.url') -ErrorAction SilentlyContinue | Select-Object -First 1)
  $arenaPort = [string](Get-Content (Join-GodModePath $r 'state/arena-port.txt') -ErrorAction SilentlyContinue | Select-Object -First 1)
  $livePort = [string](Get-Content (Join-GodModePath $r 'state/live-preview-port.txt') -ErrorAction SilentlyContinue | Select-Object -First 1)
  $missionPort = [string](Get-Content (Join-GodModePath $r 'state/mission-control-port.txt') -ErrorAction SilentlyContinue | Select-Object -First 1)
  $arenaUrl = if ($arenaPort) { "http://127.0.0.1:$arenaPort/" } else { $null }
  $missionUrl = if ($missionPort) { "http://127.0.0.1:$missionPort/" } else { [string](Get-Content (Join-GodModePath $r 'state/mission-control.url') -ErrorAction SilentlyContinue | Select-Object -First 1) }
  $missionComponent = $components | Where-Object { $_.component -eq 'mission-control' } | Select-Object -First 1
  $liveComponent = $components | Where-Object { $_.component -eq 'live' } | Select-Object -First 1
  $arenaComponent = $components | Where-Object { $_.component -eq 'arena' } | Select-Object -First 1
  $failedCount = [int](Get-GodModeProperty $queue.depth 'failed' 0)
  $unresolvedFeedback = [int](Get-GodModeProperty $routing 'unresolved_count' 0)
  $coreBlockers = @()
  if (-not ($liveComponent -and $liveComponent.http_ok)) { $coreBlockers += 'live_result_http_missing' }
  if (-not ($arenaComponent -and $arenaComponent.http_ok)) { $coreBlockers += 'arena_http_missing' }
  if (-not ($missionComponent -and $missionComponent.http_ok)) { $coreBlockers += 'mission_control_http_missing' }
  if ((Get-GodModeProperty $validation 'status' '') -ne 'passed') { $coreBlockers += 'validation_not_passed' }
  if ((Get-GodModeProperty $worker 'status' '') -ne 'passed') { $coreBlockers += 'worker_smoke_not_passed' }
  if (-not $latestProof -or (Get-GodModeProperty $reality 'selected_browser_route' '') -ne 'codex_browser_use_iab') { $coreBlockers += 'codex_browser_use_proof_missing' }
  if (-not (Get-GodModeProperty $trace 'summary_file' $null)) { $coreBlockers += 'trace_crystal_missing' }
  if ($failedCount -gt 0) { $coreBlockers += 'failed_missions_unresolved' }
  if ((Get-GodModeProperty $runtimeTracking 'status' '') -ne 'safe') { $coreBlockers += 'runtime_artifacts_tracked' }
  $cleanStatus=[string](Get-GodModeProperty $clean 'status' 'unknown')
  if ($cleanStatus -in @('DIRTY-UNSAFE','BLOCKED')) { $coreBlockers += 'git_hygiene_unsafe' }
  $forgeUnknown = @()
  foreach($pair in @(@('rules',$rules),@('hooks',$hooks),@('skills',$skills))) { if((Get-GodModeProperty $pair[1] 'status' 'unknown') -eq 'unknown'){ $forgeUnknown += $pair[0] } }
  if ($forgeUnknown.Count -eq 0) { $degraded = @($degraded | Where-Object { $_ -ne 'forge:unknown' }) }
  if ($forgeUnknown.Count) { $coreBlockers += ('forge_state_unknown:' + ($forgeUnknown -join ',')) }
  $operationalLevel = 'VERIFIED-OPERATIONAL-PHASE5'
  if ($coreBlockers.Count -gt 0) { $operationalLevel = 'DEGRADED' }
  if ($cleanStatus -eq 'BLOCKED' -or ($coreBlockers -contains 'runtime_artifacts_tracked')) { $operationalLevel = 'BLOCKED' }
  $fullBlockers = @()
  $fullBlockers += $coreBlockers
  if ($unresolvedFeedback -gt 0) { $fullBlockers += 'pending_feedback_unresolved_but_explained' }
  foreach($pair in @(@('rules',$rules),@('hooks',$hooks),@('skills',$skills))) { $st=[string](Get-GodModeProperty $pair[1] 'status' 'unknown'); if($st -notin @('passed','validated','enabled')){ $fullBlockers += ("{0}_not_fully_enabled:{1}" -f $pair[0],$st) } }
  if ($fullBlockers.Count -eq 0) { $operationalLevel = 'FULL-GODMODE-OPERATIONAL' }
  $next = 'powershell -ExecutionPolicy Bypass -File .\.codex-godmode\Run-GodModeValidation.ps1 -Project .'
  if (-not ($liveComponent -and $liveComponent.http_ok) -or -not ($arenaComponent -and $arenaComponent.http_ok) -or -not ($missionComponent -and $missionComponent.http_ok)) { $next = 'powershell -ExecutionPolicy Bypass -File .\.codex-godmode\Start-GodMode.ps1 -Project .' }
  elseif ($failedCount -gt 0) { $next = 'powershell -ExecutionPolicy Bypass -File .\.codex-godmode\Resolve-FailedMissions.ps1 -Project .' }
  elseif ((Get-GodModeProperty $validation 'status' '') -ne 'passed') { $next = 'powershell -ExecutionPolicy Bypass -File .\.codex-godmode\Run-GodModeValidation.ps1 -Project .' }
  elseif ((Get-GodModeProperty $worker 'status' '') -ne 'passed') { $next = 'powershell -ExecutionPolicy Bypass -File .\.codex-godmode\Run-WorkerSmoke.ps1 -Project .' }
  elseif ($cleanStatus -eq 'unknown') { $next = 'powershell -ExecutionPolicy Bypass -File .\.codex-godmode\Test-GodModeClean.ps1 -Project .' }
  $workerProof = Get-GodModeProperty $worker 'ingested_result_path' $null
  if (-not $workerProof) { $workerProof = Get-GodModeProperty $worker 'result_path' $null }
  $degraded = @($degraded | Where-Object { -not [string]::IsNullOrWhiteSpace([string]$_) })
  return [ordered]@{ schema_version=1; updated_at=Get-GodModeIso; operational_level=$operationalLevel; full_godmode_blockers=@($fullBlockers | Select-Object -Unique); phase5_core_blockers=@($coreBlockers | Select-Object -Unique); branch=$branch; git_status=$gitDirty; live_url=$liveUrl; arena_url=$arenaUrl; mission_control_url=$missionUrl; live_port=$livePort; arena_port=$arenaPort; mission_control_port=$missionPort; process_registry=$registry; process_status=$components; validation_status=$validation; clean_doctor_state=$clean; browser_route_status=$reality; codex_worker_route_status=$codex; worker_smoke=$worker; latest_proof_bundle=$latestProof; latest_browser_proof=$latestProof; latest_worker_proof=$workerProof; latest_trace_crystal=$trace; latest_trace_proof=(Get-GodModeProperty $trace 'summary_file' $null); latest_validation_bundle=$latestValidationPath; queue=$queue; active_missions=$queue.active; failed_missions=$queue.failed; failed_mission_state=$failedResolution; visual_feedback_routing=$routing; visual_feedback_count=(Get-GodModeProperty $routing 'feedback_count' 0); visual_feedback_routed_count=(Get-GodModeProperty $routing 'routed_count' 0); visual_feedback_unresolved_count=$unresolvedFeedback; visual_feedback_explanation=if($unresolvedFeedback -gt 0){'Feedback creates proof-required review missions and does not authorize direct patches.'}else{'No unresolved feedback events.'}; rules_forge_state=$rules; hook_bus_state=$hooks; skill_forge_state=$skills; ignored_runtime_tracking_state=$runtimeTracking; degraded_capability_count=(@($degraded | Select-Object -Unique)).Count; degraded_capabilities=@($degraded | Select-Object -Unique); next_recommended_command=$next }
}

