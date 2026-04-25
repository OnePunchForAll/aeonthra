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
  $default = [ordered]@{ schema_version=1; updated_at=Get-GodModeIso; events=@(); rejected=@(); routed_count=0; rejected_count=0 }
  $state = Read-GodModeJson $path $default
  if ($null -eq $state) { return $default }
  return $state
}
function Invoke-GodModeVisualFeedbackRouting {
  param([string]$Project='.')
  $r = Initialize-GodModeStructure $Project
  $events = @(Read-GodModeVisualFeedbackEvents $Project)
  $state = Get-GodModeFeedbackRoutingState $Project
  $records = @(Get-GodModeProperty $state 'events' @())
  $rejected = @(Get-GodModeProperty $state 'rejected' @())
  $seen = @{}
  foreach ($record in $records) { $eid = [string](Get-GodModeProperty $record 'event_id' ''); if ($eid) { $seen[$eid] = $true } }
  foreach ($record in $rejected) { $eid = [string](Get-GodModeProperty $record 'event_id' ''); if ($eid) { $seen[$eid] = $true } }
  $created = @(); $blocked = @()
  foreach ($event in $events) {
    $eventId = [string](Get-GodModeProperty $event 'id' '')
    $text = [string](Get-GodModeProperty $event 'text' '')
    if ([string]::IsNullOrWhiteSpace($eventId)) { $eventId = 'event-'+([guid]::NewGuid().ToString('N').Substring(0,12)) }
    if ($seen.ContainsKey($eventId)) { continue }
    $scan = Test-GodModeInjectionText $text $Project
    if (-not $scan.ok) {
      $rec = [ordered]@{ event_id=$eventId; routed_status='rejected'; reason='injection-suspected'; hits=@($scan.hits); updated_at=Get-GodModeIso; resolved=$false }
      $rejected += $rec; $blocked += $rec
      Add-GodModeJsonLine (Join-GodModePath $r 'memory/visual-feedback-ledger.jsonl') $rec
      continue
    }
    $role = 'UI-POLISH'
    if ($text -match '(?i)\b(click|browser|render|visible|screenshot|layout|viewport)\b') { $role = 'BROWSER-REALITY' }
    if ($text -match '(?i)\b(error|bug|fail|broken|crash|wrong)\b') { $role = 'BUG-HUNTER' }
    $suffix = ($eventId -replace '[^a-zA-Z0-9]','')
    if ($suffix.Length -gt 14) { $suffix = $suffix.Substring(0,14) }
    if ([string]::IsNullOrWhiteSpace($suffix)) { $suffix = [guid]::NewGuid().ToString('N').Substring(0,10) }
    $missionId = "vf-$suffix"
    $mission = New-GodModeMissionObject $missionId $role "Review visual feedback without patching. Comment: $text" $false $true 4
    $mission['visual_feedback_event_id'] = $eventId
    $mission['source'] = 'visual-feedback-events.jsonl'
    $mission['proof_required'] = 'browser proof or explicit blocker required before patching'
    Save-GodModeMission $Project $mission 'pending' | Out-Null
    $rec = [ordered]@{ event_id=$eventId; mission_id=$missionId; role=$role; routed_status='queued'; queue='pending'; resolved=$false; allow_patch=$false; requires_browser_validation=$true; updated_at=Get-GodModeIso }
    $records += $rec; $created += $rec
    Add-GodModeJsonLine (Join-GodModePath $r 'memory/visual-feedback-ledger.jsonl') $rec
    Add-GodModeTraceSpan $Project $missionId 'route-visual-feedback' 'success' @{event_id=$eventId;role=$role} 'route_visual_feedback' 'MASTER' '' $null @() @('live/visual-feedback-events.jsonl','state/visual-feedback-routing.json') 'Visual feedback routed to proof-required mission.' | Out-Null
  }
  $newState = [ordered]@{ schema_version=1; updated_at=Get-GodModeIso; events=@($records); rejected=@($rejected); routed_count=@($records).Count; rejected_count=@($rejected).Count }
  Write-GodModeJsonAtomic (Join-GodModePath $r 'state/visual-feedback-routing.json') $newState | Out-Null
  return [ordered]@{ created=@($created); rejected=@($blocked); state=$newState }
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
  $routing = Get-GodModeFeedbackRoutingState $Project
  $latestProof = $null
  $latestProofFile = Get-ChildItem -LiteralPath (Join-GodModePath $r 'logs') -Recurse -Filter 'browser-proof.json' -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if ($latestProofFile) { $latestProof = $latestProofFile.FullName }
  $queue = Get-GodModeQueueSnapshot $Project
  $degraded = @()
  foreach ($x in @(Get-GodModeProperty $health 'degraded_reasons' @())) { if ($x) { $degraded += [string]$x } }
  foreach ($x in @(Get-GodModeProperty $reality 'degraded_reasons' @())) { if ($x) { $degraded += [string]$x } }
  foreach ($x in @(Get-GodModeProperty $codex 'degraded_reasons' @())) { if ($x) { $degraded += [string]$x } }
  $liveUrl = [string](Get-Content (Join-GodModePath $r 'state/latest-result.url') -ErrorAction SilentlyContinue | Select-Object -First 1)
  $arenaPort = [string](Get-Content (Join-GodModePath $r 'state/arena-port.txt') -ErrorAction SilentlyContinue | Select-Object -First 1)
  $livePort = [string](Get-Content (Join-GodModePath $r 'state/live-preview-port.txt') -ErrorAction SilentlyContinue | Select-Object -First 1)
  $arenaUrl = if ($arenaPort) { "http://127.0.0.1:$arenaPort/" } else { $null }
  $next = 'powershell -ExecutionPolicy Bypass -File .\.codex-godmode\Run-GodModeValidation.ps1 -Project .'
  if (-not ($components | Where-Object { $_.component -eq 'live' -and $_.http_ok })) { $next = 'powershell -ExecutionPolicy Bypass -File .\.codex-godmode\Start-GodMode.ps1 -Project .' }
  elseif ((Get-GodModeProperty $validation 'status' '') -ne 'passed') { $next = 'powershell -ExecutionPolicy Bypass -File .\.codex-godmode\Run-GodModeValidation.ps1 -Project .' }
  elseif ((Get-GodModeProperty $worker 'status' '') -notin @('passed','degraded')) { $next = 'powershell -ExecutionPolicy Bypass -File .\.codex-godmode\Run-WorkerSmoke.ps1 -Project .' }
  return [ordered]@{ schema_version=1; updated_at=Get-GodModeIso; branch=$branch; git_status=$gitDirty; live_url=$liveUrl; arena_url=$arenaUrl; live_port=$livePort; arena_port=$arenaPort; process_registry=$registry; process_status=$components; validation_status=$validation; browser_route_status=$reality; codex_worker_route_status=$codex; worker_smoke=$worker; latest_proof_bundle=$latestProof; latest_trace_crystal=$trace; queue=$queue; active_missions=$queue.active; failed_missions=$queue.failed; visual_feedback_routing=$routing; degraded_capability_count=(@($degraded | Select-Object -Unique)).Count; degraded_capabilities=@($degraded | Select-Object -Unique); next_recommended_command=$next }
}


