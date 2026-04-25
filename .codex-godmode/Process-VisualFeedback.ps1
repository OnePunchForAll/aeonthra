param(
  [string]$Project='.',
  [string]$ResolveEventId='',
  [string]$ProofRef='',
  [string]$ResolutionNote='Resolved by supplied proof reference.',
  [switch]$ClassifyBacklog
)
$ErrorActionPreference='Continue'; [Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
$S=Split-Path -Parent $MyInvocation.MyCommand.Path
foreach($l in 'Common','Queue','Safety','TraceCrystal','Operational') { . (Join-Path $S "lib/GodMode.$l.ps1") }
$root=Initialize-GodModeStructure $Project
$result=$null; $blockers=@()
try { $result=Invoke-GodModeVisualFeedbackRouting $Project } catch { $blockers += "routing failed: $($_.Exception.Message)" }
if(-not [string]::IsNullOrWhiteSpace($ResolveEventId)){
  $state=Get-GodModeFeedbackRoutingState $Project
  $records=@(); $found=$false
  foreach($record in @(Get-GodModeProperty $state 'events' @())){
    $copy=[ordered]@{}; foreach($p in $record.PSObject.Properties){$copy[$p.Name]=$p.Value}
    if([string](Get-GodModeProperty $record 'event_id' '') -eq $ResolveEventId){
      $found=$true
      $proofs=@(Get-GodModeProperty $record 'proof_refs' @())
      if(-not [string]::IsNullOrWhiteSpace($ProofRef)){ $proofs += $ProofRef }
      $copy['resolved']=$true; $copy['feedback_status']='resolved'; $copy['routed_status']='resolved'; $copy['resolved_at']=Get-GodModeIso; $copy['resolution_note']=$ResolutionNote; $copy['proof_refs']=@($proofs | Select-Object -Unique)
    }
    $records += $copy
  }
  if(-not $found){ $blockers += "resolve event id not found: $ResolveEventId" }
  else {
    $rejected=@(Get-GodModeProperty $state 'rejected' @())
    $unresolved=@($records | Where-Object { (Get-GodModeProperty $_ 'feedback_status' '') -in @('new','routed','in_review') -and -not [bool](Get-GodModeProperty $_ 'resolved' $false) })
    $newState=[ordered]@{schema_version=1;updated_at=Get-GodModeIso;events=$records;rejected=$rejected;feedback_count=(Get-GodModeProperty $state 'feedback_count' @($records).Count);routed_count=@($records).Count;unresolved_count=@($unresolved).Count;rejected_count=@($rejected).Count;duplicate_count=(Get-GodModeProperty $state 'duplicate_count' 0);status='operational'}
    Write-GodModeJsonAtomic (Join-GodModePath $root 'state/visual-feedback-routing.json') $newState | Out-Null
    Add-GodModeTraceSpan $Project 'visual-feedback-routing' 'resolve-feedback' 'success' @{event_id=$ResolveEventId;proof_ref=$ProofRef} 'resolve_visual_feedback' 'HOST' 'Process-VisualFeedback.ps1' 0 @($ProofRef) @('state/visual-feedback-routing.json') 'Visual feedback event resolved with proof reference.' | Out-Null
  }
}
if($ClassifyBacklog){
  try {
    $resolution = Resolve-GodModeVisualFeedbackBacklog $Project
    Write-Host ("[VISUAL-FEEDBACK-RESOLUTION] {0} unresolved={1} backlog={2} report={3}" -f $resolution.status,$resolution.unresolved_count,$resolution.backlog_count,$resolution.report)
  } catch {
    $blockers += "classification failed: $($_.Exception.Message)"
  }
}
$state=Get-GodModeFeedbackRoutingState $Project
$summary=[ordered]@{schema_version=1;generated_at=Get-GodModeIso;status=if($blockers.Count){'degraded'}else{'passed'};created_count=if($result){@($result.created).Count}else{0};duplicate_count=if($result){@($result.duplicates).Count}else{0};rejected_count=if($result){@($result.rejected).Count}else{0};feedback_count=Get-GodModeProperty $state 'feedback_count' 0;routed_count=Get-GodModeProperty $state 'routed_count' 0;unresolved_count=Get-GodModeProperty $state 'unresolved_count' 0;blockers=$blockers;state_path='state/visual-feedback-routing.json'}
Write-GodModeJsonAtomic (Join-GodModePath $root 'state/visual-feedback-process.json') $summary | Out-Null
$traceStatus=if($blockers.Count){'degraded'}else{'success'}
Add-GodModeTraceSpan $Project 'visual-feedback-routing' 'process-feedback' $traceStatus @{summary=$summary} 'process_visual_feedback' 'HOST' 'Process-VisualFeedback.ps1' 0 @('state/visual-feedback-routing.json') @('state/visual-feedback-routing.json','queues/pending') 'Visual feedback events validated, deduped, and routed to proof-required missions.' | Out-Null
Write-Host ("[VISUAL-FEEDBACK] {0} total={1} routed={2} unresolved={3} created={4} duplicates={5} rejected={6}" -f $summary.status,$summary.feedback_count,$summary.routed_count,$summary.unresolved_count,$summary.created_count,$summary.duplicate_count,$summary.rejected_count)
if($blockers.Count){$blockers|ForEach-Object{Write-Host "[BLOCKED] $_"}; exit 1}
exit 0
