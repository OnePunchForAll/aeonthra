Set-StrictMode -Version 2.0
if (-not (Get-Command Get-GodModeVisualProofPolicy -ErrorAction SilentlyContinue)) {
  $proofLib = Join-Path $PSScriptRoot 'GodMode.Proof.ps1'
  if (Test-Path -LiteralPath $proofLib) { . $proofLib }
}
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
  $default = [ordered]@{ schema_version=1; updated_at=Get-GodModeIso; events=@(); rejected=@(); feedback_count=0; routed_count=0; unresolved_count=0; rejected_count=0; duplicate_count=0; obsolete_count=0; backlog_count=0; classification_status='unclassified' }
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
function Get-GodModeVisualFeedbackClassification {
  param($Event,[string]$Signature='',[string]$DuplicateOfEventId='')
  $target = ([string](Get-GodModeProperty $Event 'target' '')).Trim()
  $text = ([string](Get-GodModeProperty $Event 'text' '')).Trim()
  if (-not [string]::IsNullOrWhiteSpace($DuplicateOfEventId)) {
    return [ordered]@{ classification='duplicate'; feedback_status='resolved'; resolved=$true; proof_required=$false; reason=("Duplicate of visual feedback event {0}; original carries any required proof." -f $DuplicateOfEventId); duplicate_of_event_id=$DuplicateOfEventId }
  }
  if ($target -match '(?i)^validation-smoke$' -or $text -match '(?i)^validation smoke harmless comment\b') {
    return [ordered]@{ classification='obsolete'; feedback_status='resolved'; resolved=$true; proof_required=$false; reason='Automated validation smoke feedback; POST path was proven and no product patch is requested.'; duplicate_of_event_id=$null }
  }
  if ($target -match '(?i)^phase[0-9-]*-smoke$' -or $text -match '(?i)\bphase\s+\d+\b.*\bharmless\b.*\b(feedback|smoke|test)\b') {
    return [ordered]@{ classification='obsolete'; feedback_status='resolved'; resolved=$true; proof_required=$false; reason='Historical phase smoke/test feedback; proof path already validated and no user-facing issue remains.'; duplicate_of_event_id=$null }
  }
  if ($text -match '(?i)\bduplicate-safe harmless feedback comment\b') {
    return [ordered]@{ classification='obsolete'; feedback_status='resolved'; resolved=$true; proof_required=$false; reason='Historical duplicate-safety smoke comment; no patch is authorized or required.'; duplicate_of_event_id=$null }
  }
  return [ordered]@{ classification='valid'; feedback_status='routed'; resolved=$false; proof_required=$true; reason='Valid feedback requires proof-based review before any patch.'; duplicate_of_event_id=$null }
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
  $classification = [string](Get-GodModeProperty $Record 'classification' '')
  $backlog = [bool](Get-GodModeProperty $Record 'backlog' $false)
  if ($resolved) { $status = 'resolved' }
  elseif ($backlog -or $classification -eq 'proof-required-backlog') { $status = 'backlog' }
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
      $classification = Get-GodModeVisualFeedbackClassification $event $signature (Get-GodModeProperty $existing 'event_id' $null)
      $rec = [ordered]@{ event_id=$eventId; mission_id=(Get-GodModeProperty $existing 'mission_id' $null); duplicate_of_event_id=(Get-GodModeProperty $existing 'event_id' $null); role=(Get-GodModeProperty $existing 'role' 'UI-POLISH'); feedback_status='resolved'; routed_status='resolved'; queue=(Get-GodModeProperty $existing 'queue' 'pending'); resolved=$true; allow_patch=$false; requires_browser_validation=$true; proof_required=$false; classification='duplicate'; classification_reason=(Get-GodModeProperty $classification 'reason' 'Duplicate visual feedback.'); signature=$signature; updated_at=Get-GodModeIso }
      $records += $rec; $duplicates += $rec; Add-GodModeJsonLine (Join-GodModePath $r 'memory/visual-feedback-ledger.jsonl') $rec; continue
    }
    $classification = Get-GodModeVisualFeedbackClassification $event $signature ''
    if ((Get-GodModeProperty $classification 'classification' '') -eq 'obsolete') {
      $rec = [ordered]@{ event_id=$eventId; mission_id=$null; role='SYSTEM-SMOKE'; feedback_status='resolved'; routed_status='resolved'; queue=$null; resolved=$true; allow_patch=$false; requires_browser_validation=$false; proof_required=$false; classification='obsolete'; classification_reason=(Get-GodModeProperty $classification 'reason' 'Obsolete smoke feedback.'); signature=$signature; updated_at=Get-GodModeIso }
      $records += $rec; $signatureToRecord[$signature]=$rec
      Add-GodModeJsonLine (Join-GodModePath $r 'memory/visual-feedback-ledger.jsonl') $rec
      continue
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
    $rec = [ordered]@{ event_id=$eventId; mission_id=$missionId; role=$role; feedback_status='routed'; routed_status='routed'; queue='pending'; resolved=$false; allow_patch=$false; requires_browser_validation=$true; proof_required=$true; proof_refs=@(); classification='valid'; classification_reason=(Get-GodModeProperty $classification 'reason' 'Valid feedback requires proof-based review.'); signature=$signature; updated_at=Get-GodModeIso }
    $records += $rec; $created += $rec; $signatureToRecord[$signature]=$rec
    Add-GodModeJsonLine (Join-GodModePath $r 'memory/visual-feedback-ledger.jsonl') $rec
    Add-GodModeTraceSpan $Project $missionId 'route-visual-feedback' 'success' @{event_id=$eventId;role=$role} 'route_visual_feedback' 'MASTER' '' $null @() @('live/visual-feedback-events.jsonl','state/visual-feedback-routing.json') 'Visual feedback routed to proof-required mission.' | Out-Null
  }
  $refreshed = @()
  foreach($record in $records){ $refreshed += (Update-GodModeFeedbackRecordRuntimeStatus $Project $record) }
  $feedbackCount = @($events).Count
  $unresolved = @($refreshed | Where-Object { (Get-GodModeProperty $_ 'feedback_status' '') -in @('new','routed','in_review') -and -not [bool](Get-GodModeProperty $_ 'resolved' $false) })
  $duplicateTotal = @($refreshed | Where-Object { (Get-GodModeProperty $_ 'classification' '') -eq 'duplicate' -or -not [string]::IsNullOrWhiteSpace([string](Get-GodModeProperty $_ 'duplicate_of_event_id' '')) }).Count
  $obsoleteTotal = @($refreshed | Where-Object { (Get-GodModeProperty $_ 'classification' '') -eq 'obsolete' }).Count
  $backlogTotal = @($refreshed | Where-Object { (Get-GodModeProperty $_ 'feedback_status' '') -eq 'backlog' -or (Get-GodModeProperty $_ 'classification' '') -eq 'proof-required-backlog' }).Count
  $newState = [ordered]@{ schema_version=1; updated_at=Get-GodModeIso; events=@($refreshed); rejected=@($rejected); feedback_count=$feedbackCount; routed_count=@($refreshed).Count; unresolved_count=@($unresolved).Count; rejected_count=@($rejected).Count; duplicate_count=$duplicateTotal; obsolete_count=$obsoleteTotal; backlog_count=$backlogTotal; classification_status=if(@($unresolved).Count){'needs_review'}else{'classified'}; status=if(@($blocked).Count){'degraded'}else{'operational'}; resolution_report=(Get-GodModeProperty $state 'resolution_report' $null) }
  Write-GodModeJsonAtomic (Join-GodModePath $r 'state/visual-feedback-routing.json') $newState | Out-Null
  return [ordered]@{ created=@($created); duplicates=@($duplicates); rejected=@($blocked); unresolved=@($unresolved); state=$newState }
}

function Move-GodModeVisualFeedbackMissionToDone {
  param([string]$Project='.',[string]$MissionId,[string]$Classification,[string]$Reason)
  if ([string]::IsNullOrWhiteSpace($MissionId)) { return $null }
  $r = Initialize-GodModeStructure $Project
  $pending = Join-GodModePath $r ("queues/pending/$MissionId.json")
  $done = Join-GodModePath $r ("queues/done/$MissionId.json")
  if (Test-Path -LiteralPath $done) { return $done }
  if (-not (Test-Path -LiteralPath $pending)) { return $null }
  $mission = Read-GodModeJson $pending $null
  if ($null -eq $mission) {
    Move-Item -LiteralPath $pending -Destination $done -Force
    return $done
  }
  $copy = [ordered]@{}
  foreach($p in $mission.PSObject.Properties){ $copy[$p.Name]=$p.Value }
  $copy['status'] = 'resolved'
  $copy['resolved_at'] = Get-GodModeIso
  $copy['classification'] = $Classification
  $copy['resolution_reason'] = $Reason
  $copy['allow_patch'] = $false
  Write-GodModeJsonAtomic $done $copy | Out-Null
  Remove-Item -LiteralPath $pending -Force -ErrorAction SilentlyContinue
  return $done
}

function Resolve-GodModeVisualFeedbackBacklog {
  param([string]$Project='.')
  $r = Initialize-GodModeStructure $Project
  $state = Get-GodModeFeedbackRoutingState $Project
  $events = @(Read-GodModeVisualFeedbackEvents $Project)
  $eventById = @{}
  foreach($event in $events) { $eid=[string](Get-GodModeProperty $event 'id' ''); if($eid){ $eventById[$eid]=$event } }
  $records = @()
  $seenSignatures = @{}
  $rows = @()
  $rejected = @(Get-GodModeProperty $state 'rejected' @())
  $moved = @()
  foreach($record in @(Get-GodModeProperty $state 'events' @())) {
    $copy = [ordered]@{}
    foreach($p in $record.PSObject.Properties){ $copy[$p.Name]=$p.Value }
    $eventId = [string](Get-GodModeProperty $copy 'event_id' '')
    $event = if($eventById.ContainsKey($eventId)){ $eventById[$eventId] } else { [pscustomobject]@{ id=$eventId; target='unknown'; text=''; created_at='' } }
    $signature = [string](Get-GodModeProperty $copy 'signature' '')
    if ([string]::IsNullOrWhiteSpace($signature)) { $signature = Get-GodModeFeedbackSignature $event; $copy['signature'] = $signature }
    $duplicateOf = [string](Get-GodModeProperty $copy 'duplicate_of_event_id' '')
    if ([string]::IsNullOrWhiteSpace($duplicateOf) -and $seenSignatures.ContainsKey($signature)) { $duplicateOf = [string]$seenSignatures[$signature] }
    if (-not $seenSignatures.ContainsKey($signature)) { $seenSignatures[$signature] = $eventId }
    $scan = Test-GodModeInjectionText ([string](Get-GodModeProperty $event 'text' '')) $Project
    if (-not $scan.ok) {
      $copy['classification']='rejected'; $copy['feedback_status']='rejected'; $copy['routed_status']='rejected'; $copy['resolved']=$false; $copy['proof_required']=$false; $copy['classification_reason']='Injection scan rejected comment text: ' + (@($scan.hits) -join ', ')
    } else {
      $classification = Get-GodModeVisualFeedbackClassification $event $signature $duplicateOf
      $class = [string](Get-GodModeProperty $classification 'classification' 'valid')
      if ($class -eq 'valid' -and -not [bool](Get-GodModeProperty $copy 'resolved' $false)) { $class = 'proof-required-backlog' }
      $reason = [string](Get-GodModeProperty $classification 'reason' 'Classified during Phase 6 feedback resolution.')
      if ($class -eq 'proof-required-backlog') { $reason = 'Valid feedback retained as explicit proof-required backlog; no direct patch is authorized without a separate mission proof.' }
      $copy['classification'] = $class
      $copy['classification_reason'] = $reason
      if ($class -eq 'duplicate') {
        $copy['duplicate_of_event_id'] = $duplicateOf
        $copy['feedback_status']='resolved'; $copy['routed_status']='resolved'; $copy['resolved']=$true; $copy['proof_required']=$false; $copy['resolved_at']=Get-GodModeIso
      } elseif ($class -eq 'obsolete') {
        $copy['feedback_status']='resolved'; $copy['routed_status']='resolved'; $copy['resolved']=$true; $copy['proof_required']=$false; $copy['resolved_at']=Get-GodModeIso
      } elseif ($class -eq 'proof-required-backlog') {
        $copy['feedback_status']='backlog'; $copy['routed_status']='backlog'; $copy['resolved']=$false; $copy['backlog']=$true; $copy['proof_required']=$true
      }
    }
    $missionId = [string](Get-GodModeProperty $copy 'mission_id' '')
    $classNow = [string](Get-GodModeProperty $copy 'classification' '')
    if ($classNow -in @('duplicate','obsolete','rejected')) {
      $donePath = Move-GodModeVisualFeedbackMissionToDone $Project $missionId $classNow ([string](Get-GodModeProperty $copy 'classification_reason' 'Classified by Phase 6 feedback resolver.'))
      if ($donePath) { $moved += $donePath; $copy['queue']='done'; $copy['proof_refs']=@($donePath) }
    }
    $records += (Update-GodModeFeedbackRecordRuntimeStatus $Project $copy)
    $rows += [ordered]@{
      event_id=$eventId
      mission_id=$missionId
      target=[string](Get-GodModeProperty $event 'target' '')
      text=[string](Get-GodModeProperty $event 'text' '')
      classification=[string](Get-GodModeProperty $copy 'classification' '')
      status=[string](Get-GodModeProperty $copy 'feedback_status' '')
      reason=[string](Get-GodModeProperty $copy 'classification_reason' '')
      duplicate_of=[string](Get-GodModeProperty $copy 'duplicate_of_event_id' '')
    }
  }
  $unresolved = @($records | Where-Object { (Get-GodModeProperty $_ 'feedback_status' '') -in @('new','routed','in_review') -and -not [bool](Get-GodModeProperty $_ 'resolved' $false) })
  $backlog = @($records | Where-Object { (Get-GodModeProperty $_ 'feedback_status' '') -eq 'backlog' -or (Get-GodModeProperty $_ 'classification' '') -eq 'proof-required-backlog' })
  $duplicates = @($records | Where-Object { (Get-GodModeProperty $_ 'classification' '') -eq 'duplicate' })
  $obsolete = @($records | Where-Object { (Get-GodModeProperty $_ 'classification' '') -eq 'obsolete' })
  $rejectedRows = @($records | Where-Object { (Get-GodModeProperty $_ 'classification' '') -eq 'rejected' })
  $reportRel = 'feedback/feedback-resolution-report.md'
  $reportPath = Join-GodModePath $r $reportRel
  $md = New-Object System.Collections.Generic.List[string]
  $md.Add('# AEONTHRA Visual Feedback Resolution Report')
  $md.Add('')
  $md.Add(("Generated: {0}" -f (Get-GodModeIso)))
  $md.Add('')
  $md.Add('## Summary')
  $md.Add(("- Total feedback records: {0}" -f @($records).Count))
  $md.Add(("- Resolved obsolete records: {0}" -f @($obsolete).Count))
  $md.Add(("- Resolved duplicate records: {0}" -f @($duplicates).Count))
  $md.Add(("- Rejected records: {0}" -f @($rejectedRows).Count))
  $md.Add(("- Proof-required backlog records: {0}" -f @($backlog).Count))
  $md.Add(("- Unresolved records after classification: {0}" -f @($unresolved).Count))
  $md.Add('')
  $md.Add('## Resolution Table')
  $md.Add('| Event | Mission | Classification | Status | Reason |')
  $md.Add('|---|---|---|---|---|')
  foreach($row in $rows) {
    $reason = (([string]$row.reason) -replace '\|','/' -replace "`r?`n",' ')
    $md.Add(("| `{0}` | `{1}` | {2} | {3} | {4} |" -f $row.event_id,$row.mission_id,$row.classification,$row.status,$reason))
  }
  $md.Add('')
  $md.Add('## Policy')
  $md.Add('Visual feedback does not authorize direct patching. Obsolete smoke comments are closed with recorded reasons; duplicates link to the original; valid unresolved comments become proof-required backlog.')
  Set-Content -LiteralPath $reportPath -Value $md -Encoding UTF8
  $newState = [ordered]@{
    schema_version=1
    updated_at=Get-GodModeIso
    events=@($records)
    rejected=@($rejected)
    feedback_count=@($events).Count
    routed_count=@($records).Count
    unresolved_count=@($unresolved).Count
    rejected_count=@($rejected).Count + @($rejectedRows).Count
    duplicate_count=@($duplicates).Count
    obsolete_count=@($obsolete).Count
    backlog_count=@($backlog).Count
    classification_status=if(@($unresolved).Count -eq 0){'classified'}else{'needs_review'}
    status=if(@($unresolved).Count -eq 0){'operational'}else{'degraded'}
    resolution_report=$reportRel
  }
  Write-GodModeJsonAtomic (Join-GodModePath $r 'state/visual-feedback-routing.json') $newState | Out-Null
  $summary = [ordered]@{ schema_version=1; generated_at=Get-GodModeIso; status=$newState.status; report=$reportRel; total=@($records).Count; unresolved_count=@($unresolved).Count; backlog_count=@($backlog).Count; duplicate_count=@($duplicates).Count; obsolete_count=@($obsolete).Count; rejected_count=@($rejectedRows).Count; moved_missions=@($moved) }
  Write-GodModeJsonAtomic (Join-GodModePath $r 'state/visual-feedback-resolution.json') $summary | Out-Null
  Add-GodModeTraceSpan $Project 'visual-feedback-resolution' 'resolve-feedback-backlog' 'success' @{summary=$summary} 'route_visual_feedback' 'MASTER' 'Process-VisualFeedback.ps1 -ClassifyBacklog' 0 @($reportRel) @('state/visual-feedback-routing.json','state/visual-feedback-resolution.json',$reportRel) 'Visual feedback records classified without direct patching.' | Out-Null
  return $summary
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
  $internalRules = Read-GodModeJson (Join-GodModePath $r 'state/internal-rules-status.json') ([ordered]@{status='unknown'})
  $internalHooks = Read-GodModeJson (Join-GodModePath $r 'state/internal-hook-bus-status.json') ([ordered]@{status='unknown'})
  $skills = Read-GodModeJson (Join-GodModePath $r 'state/skill-forge-status.json') ([ordered]@{status='unknown'})
  $routing = Get-GodModeFeedbackRoutingState $Project
  $runtimeTracking = Get-GodModeRuntimeTrackingState $Project
  $visualPolicy = Read-GodModeJson (Join-GodModePath $r 'state/visual-proof-policy.json') ([ordered]@{status='unknown';selected_visual_proof_route='unknown';route_statuses=[ordered]@{};blockers=@('visual proof policy not evaluated')})
  try { $visualPolicy = Update-GodModeVisualProofPolicy $Project } catch {}
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
  foreach ($forge in @($internalRules,$internalHooks)) { $fs=[string](Get-GodModeProperty $forge 'status' 'unknown'); if($fs -notin @('passed','validated')){ $degraded += "internal-safety:$fs" } }
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
  $visualProofPassed = ((Get-GodModeProperty $visualPolicy 'status' '') -eq 'passed')
  if (-not $latestProof -or -not $visualProofPassed) { $coreBlockers += 'browser_visual_proof_policy_not_passed' }
  if (-not (Get-GodModeProperty $trace 'summary_file' $null)) { $coreBlockers += 'trace_crystal_missing' }
  if ($failedCount -gt 0) { $coreBlockers += 'failed_missions_unresolved' }
  if ((Get-GodModeProperty $runtimeTracking 'status' '') -ne 'safe') { $coreBlockers += 'runtime_artifacts_tracked' }
  $cleanStatus=[string](Get-GodModeProperty $clean 'status' 'unknown')
  if ($cleanStatus -in @('DIRTY-UNSAFE','BLOCKED')) { $coreBlockers += 'git_hygiene_unsafe' }
  $forgeUnknown = @()
  foreach($pair in @(@('skills',$skills),@('internal-rules',$internalRules),@('internal-hooks',$internalHooks))) { if((Get-GodModeProperty $pair[1] 'status' 'unknown') -eq 'unknown'){ $forgeUnknown += $pair[0] } }
  if ($forgeUnknown.Count -eq 0) { $degraded = @($degraded | Where-Object { $_ -ne 'forge:unknown' }) }
  if ($forgeUnknown.Count) { $coreBlockers += ('forge_state_unknown:' + ($forgeUnknown -join ',')) }
  $operationalLevel = 'VERIFIED-OPERATIONAL-PHASE5'
  if ($coreBlockers.Count -gt 0) { $operationalLevel = 'DEGRADED' }
  if ($cleanStatus -eq 'BLOCKED' -or ($coreBlockers -contains 'runtime_artifacts_tracked')) { $operationalLevel = 'BLOCKED' }
  $fullBlockers = @()
  $fullBlockers += $coreBlockers
  $classificationStatus = [string](Get-GodModeProperty $routing 'classification_status' 'unclassified')
  $backlogCount = [int](Get-GodModeProperty $routing 'backlog_count' 0)
  if ($unresolvedFeedback -gt 0 -and $classificationStatus -ne 'classified') { $fullBlockers += 'pending_feedback_unresolved_unclassified' }
  if ($unresolvedFeedback -gt 0 -and $classificationStatus -eq 'classified' -and $backlogCount -lt $unresolvedFeedback) { $fullBlockers += 'pending_feedback_not_all_backlog' }
  foreach($pair in @(@('internal_rules',$internalRules),@('internal_hooks',$internalHooks),@('skills',$skills))) { $st=[string](Get-GodModeProperty $pair[1] 'status' 'unknown'); if($st -notin @('passed','validated','enabled')){ $fullBlockers += ("{0}_not_ready:{1}" -f $pair[0],$st) } }
  if(-not $visualProofPassed) {
    foreach($b in @(Get-GodModeProperty $visualPolicy 'blockers' @())){ if($b){ $fullBlockers += "visual_proof:$b" } }
  }
  if ($fullBlockers.Count -eq 0) { $operationalLevel = 'FULL-GODMODE-OPERATIONAL-VISUAL' }
  $next = 'powershell -ExecutionPolicy Bypass -File .\.codex-godmode\Run-GodModeValidation.ps1 -Project .'
  if (-not ($liveComponent -and $liveComponent.http_ok) -or -not ($arenaComponent -and $arenaComponent.http_ok) -or -not ($missionComponent -and $missionComponent.http_ok)) { $next = 'powershell -ExecutionPolicy Bypass -File .\.codex-godmode\Start-GodMode.ps1 -Project .' }
  elseif ($failedCount -gt 0) { $next = 'powershell -ExecutionPolicy Bypass -File .\.codex-godmode\Resolve-FailedMissions.ps1 -Project .' }
  elseif ((Get-GodModeProperty $validation 'status' '') -ne 'passed') { $next = 'powershell -ExecutionPolicy Bypass -File .\.codex-godmode\Run-GodModeValidation.ps1 -Project .' }
  elseif ((Get-GodModeProperty $worker 'status' '') -ne 'passed') { $next = 'powershell -ExecutionPolicy Bypass -File .\.codex-godmode\Run-WorkerSmoke.ps1 -Project .' }
  elseif ($cleanStatus -eq 'unknown') { $next = 'powershell -ExecutionPolicy Bypass -File .\.codex-godmode\Test-GodModeClean.ps1 -Project .' }
  $workerProof = Get-GodModeProperty $worker 'ingested_result_path' $null
  if (-not $workerProof) { $workerProof = Get-GodModeProperty $worker 'result_path' $null }
  $degraded = @($degraded | Where-Object { -not [string]::IsNullOrWhiteSpace([string]$_) })
  return [ordered]@{ schema_version=1; updated_at=Get-GodModeIso; operational_level=$operationalLevel; full_godmode_blockers=@($fullBlockers | Select-Object -Unique); phase5_core_blockers=@($coreBlockers | Select-Object -Unique); branch=$branch; git_status=$gitDirty; live_url=$liveUrl; arena_url=$arenaUrl; mission_control_url=$missionUrl; live_port=$livePort; arena_port=$arenaPort; mission_control_port=$missionPort; process_registry=$registry; process_status=$components; validation_status=$validation; clean_doctor_state=$clean; browser_route_status=$reality; visual_proof_policy=$visualPolicy; codex_worker_route_status=$codex; worker_smoke=$worker; latest_proof_bundle=$latestProof; latest_browser_proof=$latestProof; latest_worker_proof=$workerProof; latest_trace_crystal=$trace; latest_trace_proof=(Get-GodModeProperty $trace 'summary_file' $null); latest_validation_bundle=$latestValidationPath; queue=$queue; active_missions=$queue.active; failed_missions=$queue.failed; failed_mission_state=$failedResolution; visual_feedback_routing=$routing; visual_feedback_count=(Get-GodModeProperty $routing 'feedback_count' 0); visual_feedback_routed_count=(Get-GodModeProperty $routing 'routed_count' 0); visual_feedback_unresolved_count=$unresolvedFeedback; visual_feedback_backlog_count=(Get-GodModeProperty $routing 'backlog_count' 0); visual_feedback_classification_status=(Get-GodModeProperty $routing 'classification_status' 'unclassified'); visual_feedback_resolution_report=(Get-GodModeProperty $routing 'resolution_report' $null); visual_feedback_explanation=if($unresolvedFeedback -gt 0){'Feedback creates proof-required review missions and does not authorize direct patches.'}elseif((Get-GodModeProperty $routing 'backlog_count' 0) -gt 0){'All remaining feedback items are explicitly classified proof-required backlog.'}else{'No unresolved feedback events.'}; rules_forge_state=$rules; hook_bus_state=$hooks; internal_rules_state=$internalRules; internal_hook_bus_state=$internalHooks; skill_forge_state=$skills; optional_codex_native_integrations=[ordered]@{ rules=$rules; hooks=$hooks }; ignored_runtime_tracking_state=$runtimeTracking; degraded_capability_count=(@($degraded | Select-Object -Unique)).Count; degraded_capabilities=@($degraded | Select-Object -Unique); next_recommended_command=$next }
}

