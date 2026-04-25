param([string]$Project='.',[switch]$ListOnly)
$ErrorActionPreference='Continue'; [Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
$S=Split-Path -Parent $MyInvocation.MyCommand.Path
foreach($l in 'Common','Queue','TraceCrystal','Operational') { . (Join-Path $S "lib/GodMode.$l.ps1") }
$root=Initialize-GodModeStructure $Project
$failedDir=Join-GodModePath $root 'queues/failed'
$archiveDir=Join-GodModePath $root 'archive/missions'
Ensure-GodModeDirectory $archiveDir
$stamp=(Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssZ')
$files=@(Get-ChildItem -LiteralPath $failedDir -Filter '*.json' -ErrorAction SilentlyContinue | Sort-Object LastWriteTime)
$records=@(); $archived=@(); $unresolved=@(); $replayable=@()
foreach($file in $files){
  $classification='unresolved'; $reason='Could not classify failed mission.'; $obj=$null; $parseError=$null
  try{ $obj=Get-Content -LiteralPath $file.FullName -Raw -Encoding UTF8 | ConvertFrom-Json }catch{ $parseError=$_.Exception.Message }
  if($parseError){ $classification='unresolved'; $reason="invalid JSON: $parseError" }
  elseif($file.Name -match '^worker-smoke-.*\.failed\.json$' -and [string](Get-GodModeProperty $obj 'status' '') -eq 'success'){
    $classification='historical-invalid-schema'; $reason='Historical worker smoke result used a generic mission_id before per-run schema enforcement. Later worker smoke passed with schema-constrained output.'
  }
  elseif((Get-GodModeProperty $obj 'role' $null) -or (Get-GodModeProperty $obj 'task' $null)) { $classification='replayable'; $reason='Mission-shaped failed item can be replayed by creating a new safe mission.' }
  $record=[ordered]@{ file=$file.FullName; name=$file.Name; classification=$classification; reason=$reason; parsed=($null -ne $obj); archive_path=$null; proof_refs=@(); preserved=$true }
  if($obj -and (Get-GodModeProperty $obj 'proof_bundle' $null)){ $record.proof_refs=@(Get-GodModeProperty (Get-GodModeProperty $obj 'proof_bundle' @{}) 'proof_refs' @()) }
  $records += $record
  if($classification -eq 'historical-invalid-schema' -and -not $ListOnly){
    $dest=Join-Path $archiveDir ("$stamp-$($file.Name)")
    $rootFull=(Resolve-Path -LiteralPath $root).Path
    $destParent=(Resolve-Path -LiteralPath (Split-Path -Parent $dest)).Path
    if(-not $destParent.StartsWith($rootFull,[StringComparison]::OrdinalIgnoreCase)){ throw "Archive path escaped GodMode root: $dest" }
    $event=[ordered]@{schema_version=1;created_at=Get-GodModeIso;type='archive_failed_mission';source=$file.FullName;destination=$dest;classification=$classification;reason=$reason;preserved_history=$true}
    Add-GodModeJsonLine (Join-Path $archiveDir 'archive-events.jsonl') $event
    Add-GodModeJsonLine (Join-GodModePath $root 'memory/failure-patterns.jsonl') $event
    Move-Item -LiteralPath $file.FullName -Destination $dest -Force
    $record.archive_path=$dest; $archived += $record
    Add-GodModeTraceSpan $Project 'failed-mission-resolution' 'archive-failed-mission' 'success' @{file=$file.FullName;archive=$dest;classification=$classification} 'resolve_failed_mission' 'HOST' 'Resolve-FailedMissions.ps1' 0 @($dest) @($dest) 'Historical failed mission archived with reason; history preserved.' | Out-Null
  } elseif($classification -eq 'replayable') { $replayable += $record } elseif($classification -eq 'unresolved') { $unresolved += $record }
}
if(-not $ListOnly){
  try { & (Join-Path $S 'master-controller.ps1') -Project $Project -Mode safe -Once -NoSpawn -NoBrowser -NoWorker -NoPatch | Out-Null } catch {}
}
$remaining=@(Get-ChildItem -LiteralPath $failedDir -Filter '*.json' -ErrorAction SilentlyContinue)
$status='no_failed_missions'
if($files.Count -and $remaining.Count -eq 0){$status='archived_historical_failures'}
elseif($remaining.Count -gt 0){$status='unresolved_failed_missions'}
$result=[ordered]@{schema_version=1;generated_at=Get-GodModeIso;status=$status;list_only=[bool]$ListOnly;inspected_count=$files.Count;archived_count=$archived.Count;remaining_failed_count=$remaining.Count;records=$records;archived=$archived;replayable=$replayable;unresolved=$unresolved;note='Failed mission history is preserved under archive/missions when archived.'}
Write-GodModeJsonAtomic (Join-GodModePath $root 'state/failed-mission-resolution.json') $result | Out-Null
$traceStatus = if($remaining.Count){'degraded'}else{'success'}
Add-GodModeTraceSpan $Project 'failed-mission-resolution' 'failed-mission-resolution-summary' $traceStatus @{status=$status;remaining=$remaining.Count} 'resolve_failed_missions' 'HOST' 'Resolve-FailedMissions.ps1' 0 @('state/failed-mission-resolution.json') @('state/failed-mission-resolution.json','archive/missions') 'Failed mission queue inspected and archiveable historical failures preserved.' | Out-Null
Write-Host ("[FAILED-MISSIONS] {0} inspected={1} archived={2} remaining={3}" -f $status,$files.Count,$archived.Count,$remaining.Count)
foreach($r in $records){ Write-Host (" - {0}: {1} ({2})" -f $r.name,$r.classification,$r.reason) }
exit 0
