Set-StrictMode -Version 2.0

function Get-GodModeInternalHookEventTypes {
  @('BeforeCommand','AfterCommand','BeforeStateWrite','AfterStateWrite','BeforeWorkerIngest','AfterWorkerIngest','BeforeBrowserProof','AfterBrowserProof')
}

function New-GodModeInternalHookEvent {
  param(
    [string]$EventType,
    [string]$Source='internal',
    [hashtable]$Data=@{},
    [bool]$MutatesSharedState=$false
  )
  [ordered]@{
    schema_version=1
    event_id=[guid]::NewGuid().ToString('N')
    event_type=$EventType
    created_at=Get-GodModeIso
    source=$Source
    write_boundary='.codex-godmode/events/hooks.jsonl'
    mutates_shared_state=$MutatesSharedState
    data=$Data
  }
}

function Test-GodModeInternalHookEvent {
  param($Event)
  $errors = @()
  foreach($key in @('schema_version','event_id','event_type','created_at','source','write_boundary','mutates_shared_state','data')) {
    $hasKey = $false
    if ($Event -is [System.Collections.IDictionary]) { $hasKey = $Event.Contains($key) } else { $hasKey = [bool]$Event.PSObject.Properties[$key] }
    if (-not $hasKey) { $errors += "missing:$key" }
  }
  $eventType = [string](Get-GodModeProperty $Event 'event_type' '')
  if ($eventType -notin (Get-GodModeInternalHookEventTypes)) { $errors += "invalid_event_type:$eventType" }
  if ([string](Get-GodModeProperty $Event 'write_boundary' '') -ne '.codex-godmode/events/hooks.jsonl') { $errors += 'invalid_write_boundary' }
  if ([bool](Get-GodModeProperty $Event 'mutates_shared_state' $true)) { $errors += 'hook_event_claims_shared_state_mutation' }
  return [ordered]@{ ok=($errors.Count -eq 0); errors=@($errors) }
}

function Write-GodModeInternalHookEvent {
  param([string]$Project='.', $Event)
  $validation = Test-GodModeInternalHookEvent $Event
  if (-not $validation.ok) { throw "invalid internal hook event: $($validation.errors -join ',')" }
  $r = Initialize-GodModeStructure $Project
  $path = Join-GodModePath $r 'events/hooks.jsonl'
  Add-GodModeJsonLine $path $Event
  return $path
}

function Invoke-GodModeInternalHook {
  param([string]$Project='.',[string]$EventType,[string]$Source='internal',[hashtable]$Data=@{})
  $event = New-GodModeInternalHookEvent -EventType $EventType -Source $Source -Data $Data -MutatesSharedState:$false
  $path = Write-GodModeInternalHookEvent $Project $event
  return [ordered]@{ ok=$true; path=$path; event=$event }
}

function Invoke-GodModeInternalHookBusValidation {
  param([string]$Project='.')
  $r = Initialize-GodModeStructure $Project
  $blockers = @()
  $checks = @()
  foreach($eventType in (Get-GodModeInternalHookEventTypes)) {
    try {
      $event = New-GodModeInternalHookEvent -EventType $eventType -Source 'Validate-InternalHookBus.ps1' -Data @{ validation=$true; event_type=$eventType } -MutatesSharedState:$false
      $validation = Test-GodModeInternalHookEvent $event
      if (-not $validation.ok) { $blockers += "event schema failed: $eventType"; $checks += [ordered]@{ name=$eventType; passed=$false; validation=$validation }; continue }
      $path = Write-GodModeInternalHookEvent $Project $event
      $checks += [ordered]@{ name=$eventType; passed=$true; path=$path; validation=$validation }
    } catch {
      $blockers += "event write failed: $($eventType): $($_.Exception.Message)"
      $checks += [ordered]@{ name=$eventType; passed=$false; error=$_.Exception.Message }
    }
  }
  $parseFailures = @()
  $hookLog = Join-GodModePath $r 'events/hooks.jsonl'
  if (Test-Path -LiteralPath $hookLog) {
    foreach($line in Get-Content -LiteralPath $hookLog -Encoding UTF8) {
      if ([string]::IsNullOrWhiteSpace($line)) { continue }
      try {
        $obj = $line | ConvertFrom-Json
        $valid = Test-GodModeInternalHookEvent $obj
        if (-not $valid.ok) { $parseFailures += ($valid.errors -join ',') }
      } catch {
        $parseFailures += $_.Exception.Message
      }
    }
  } else {
    $parseFailures += 'events/hooks.jsonl was not created'
  }
  if ($parseFailures.Count) { $blockers += "hook event log parse/schema failures: $($parseFailures.Count)" }
  $status = if($blockers.Count){'failed'}else{'passed'}
  $result = [ordered]@{
    schema_version=1
    generated_at=Get-GodModeIso
    status=$status
    engine='internal'
    supported_events=Get-GodModeInternalHookEventTypes
    write_boundary='.codex-godmode/events/hooks.jsonl'
    master_single_writer=$true
    hooks_mutate_shared_state=$false
    checks=@($checks)
    parse_failures=@($parseFailures | Select-Object -First 20)
    blockers=@($blockers)
    codex_native_hooks='optional_degraded_if_codex_hooks_unavailable'
  }
  Write-GodModeJsonAtomic (Join-GodModePath $r 'state/internal-hook-bus-status.json') $result | Out-Null
  return $result
}
