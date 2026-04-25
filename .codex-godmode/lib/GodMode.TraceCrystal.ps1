Set-StrictMode -Version 2.0
function ConvertTo-GodModeTraceStatus {
  param([string]$Status)
  if ([string]::IsNullOrWhiteSpace($Status)) { return 'success' }
  $s = $Status.ToLowerInvariant()
  if ($s -in @('ok','pass','passed','success','succeeded')) { return 'success' }
  if ($s -in @('fail','failed','error')) { return 'failed' }
  if ($s -in @('block','blocked')) { return 'blocked' }
  if ($s -in @('degrade','degraded')) { return 'degraded' }
  return $Status
}
function Update-GodModeTraceSummary {
  param([string]$Project='.',[string]$TraceId)
  $r = Initialize-GodModeStructure $Project
  if ([string]::IsNullOrWhiteSpace($TraceId)) { return $null }
  $traceFile = Join-GodModePath $r ("traces/$TraceId.trace.jsonl")
  $summaryFile = Join-GodModePath $r ("traces/$TraceId.summary.json")
  $spans = @()
  if (Test-Path -LiteralPath $traceFile) {
    foreach ($line in Get-Content -LiteralPath $traceFile -Encoding UTF8) {
      if ([string]::IsNullOrWhiteSpace($line)) { continue }
      try { $spans += ($line | ConvertFrom-Json) } catch {}
    }
  }
  $counts = @{}
  $proofRefs = @()
  foreach ($span in $spans) {
    $status = 'unknown'
    if ($span.PSObject.Properties['status']) { $status = [string]$span.status }
    if (-not $counts.ContainsKey($status)) { $counts[$status] = 0 }
    $counts[$status] = [int]$counts[$status] + 1
    if ($span.PSObject.Properties['proof_refs']) { foreach ($p in @($span.proof_refs)) { if ($p) { $proofRefs += [string]$p } } }
  }
  $latest = $null
  if ($spans.Count -gt 0) { $latest = $spans[$spans.Count - 1] }
  $summary = [ordered]@{
    schema_version = 1
    mission_id = $TraceId
    updated_at = Get-GodModeIso
    trace_file = $traceFile
    summary_file = $summaryFile
    total_spans = $spans.Count
    status_counts = $counts
    latest_event_type = if ($latest -and $latest.PSObject.Properties['event_type']) { $latest.event_type } else { $null }
    latest_status = if ($latest -and $latest.PSObject.Properties['status']) { $latest.status } else { $null }
    latest_notes = if ($latest -and $latest.PSObject.Properties['notes']) { $latest.notes } else { $null }
    proof_refs = @($proofRefs | Select-Object -Unique)
    files = @($spans | ForEach-Object { if ($_.PSObject.Properties['files']) { $_.files } } | Select-Object -Unique)
  }
  Write-GodModeJsonAtomic $summaryFile $summary | Out-Null
  Write-GodModeJsonAtomic (Join-GodModePath $r 'state/latest-trace-summary.json') $summary | Out-Null
  return $summary
}
function Add-GodModeTraceSpan {
  param(
    [string]$Project='.',
    [string]$MissionId,
    [string]$Name,
    [string]$Status='success',
    [hashtable]$Data=@{},
    [string]$EventType,
    [string]$AgentRole='HOST',
    [string]$Command='',
    $ExitCode=$null,
    [array]$ProofRefs=@(),
    [array]$Files=@(),
    [string]$Notes='',
    [string]$ParentSpanId=''
  )
  $r = Initialize-GodModeStructure $Project
  $traceId = if ([string]::IsNullOrWhiteSpace($MissionId)) { New-GodModeRunId } else { $MissionId }
  $event = if ([string]::IsNullOrWhiteSpace($EventType)) { $Name } else { $EventType }
  $normalized = ConvertTo-GodModeTraceStatus $Status
  $span = [ordered]@{
    schema_version = 1
    span_id = [guid]::NewGuid().ToString('N')
    parent_span_id = if ([string]::IsNullOrWhiteSpace($ParentSpanId)) { $null } else { $ParentSpanId }
    mission_id = $traceId
    agent_role = $AgentRole
    event_type = $event
    started_at = Get-GodModeIso
    ended_at = Get-GodModeIso
    duration_ms = 0
    status = $normalized
    command = $Command
    exit_code = $ExitCode
    proof_refs = @($ProofRefs)
    files = @($Files)
    notes = if ([string]::IsNullOrWhiteSpace($Notes)) { ($Data | ConvertTo-Json -Depth 12 -Compress) } else { $Notes }
  }
  Add-GodModeJsonLine (Join-GodModePath $r ("traces/$traceId.trace.jsonl")) $span
  Add-GodModeJsonLine (Join-GodModePath $r 'memory/trace-crystal-ledger.jsonl') $span
  Update-GodModeTraceSummary $Project $traceId | Out-Null
  return $span
}
