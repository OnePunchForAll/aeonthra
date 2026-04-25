param([string]$Project='.',[switch]$Json)
$ErrorActionPreference='Continue'; [Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
$S = Split-Path -Parent $MyInvocation.MyCommand.Path
foreach($l in 'Common','Queue','Schema','Safety','TraceCrystal','Proof','Operational','Health','Live') { . (Join-Path $S "lib/GodMode.$l.ps1") }
$root = Initialize-GodModeStructure $Project
$status = Get-GodModeOperationalStatusObject $Project
Write-GodModeJsonAtomic (Join-GodModePath $root 'state/status-summary.json') $status | Out-Null
$healthExtra = @{
  operational_level = $status.operational_level
  clean_doctor_state = $status.clean_doctor_state
  mission_control_url = $status.mission_control_url
  mission_control_state = ($status.process_status | Where-Object { $_.component -eq 'mission-control' } | Select-Object -First 1)
  failed_mission_state = $status.failed_mission_state
  visual_feedback_pipeline_state = $status.visual_feedback_routing
  rules_forge_state = $status.rules_forge_state
  hook_bus_state = $status.hook_bus_state
  internal_rules_state = $status.internal_rules_state
  internal_hook_bus_state = $status.internal_hook_bus_state
  skill_forge_state = $status.skill_forge_state
  latest_validation_bundle = $status.latest_validation_bundle
  latest_browser_proof = $status.latest_browser_proof
  latest_worker_proof = $status.latest_worker_proof
  latest_trace_proof = $status.latest_trace_proof
  visual_proof_policy = $status.visual_proof_policy
  ignored_runtime_tracking_state = $status.ignored_runtime_tracking_state
}
try { Update-GodModeHealth $Project $status.operational_level @($status.degraded_capabilities) @($status.phase5_core_blockers) $healthExtra | Out-Null } catch {}
Add-GodModeTraceSpan $Project 'status-godmode' 'status' 'success' @{branch=$status.branch;queue=$status.queue.depth;operational_level=$status.operational_level} 'status' 'HOST' 'Status-GodMode.ps1' 0 @('state/status-summary.json') @('state/status-summary.json') 'Status projection updated.' | Out-Null
if ($Json) { $status | ConvertTo-Json -Depth 40; exit 0 }
Write-Host 'AEONTHRA GODMODE STATUS'
Write-Host ("Operational level: {0}" -f $status.operational_level)
if(@($status.full_godmode_blockers).Count){ Write-Host ("Full GodMode blockers: {0}" -f (($status.full_godmode_blockers | Select-Object -Unique) -join '; ')) }
Write-Host ("Branch: {0}" -f $status.branch)
Write-Host 'Git:'; Write-Host $status.git_status
Write-Host ("Clean doctor: {0}" -f (Get-GodModeProperty $status.clean_doctor_state 'status' 'unknown'))
Write-Host ("Live Result URL: {0}" -f $status.live_url)
Write-Host ("Arena URL: {0}" -f $status.arena_url)
Write-Host ("Mission Control URL: {0}" -f $status.mission_control_url)
Write-Host 'Server PIDs:'
foreach($p in @($status.process_status)) { Write-Host (" - {0}: pid={1} alive={2} http={3} url={4}" -f $p.component,$p.pid,$p.alive,$p.http_ok,$p.url) }
Write-Host ("Validation status: {0}" -f (Get-GodModeProperty $status.validation_status 'status' 'unknown'))
Write-Host ("Browser proof status: {0}" -f (Get-GodModeProperty $status.browser_route_status 'selected_browser_route' 'unknown'))
Write-Host ("Visual proof policy: {0} via {1}" -f (Get-GodModeProperty $status.visual_proof_policy 'status' 'unknown'), (Get-GodModeProperty $status.visual_proof_policy 'selected_visual_proof_route' 'unknown'))
foreach($routeName in @('codex_browser_screenshot','codex_browser_dom_console','chrome_headless_screenshot_fallback','degraded_no_screenshot')) {
  $routeInfo = Get-GodModeProperty (Get-GodModeProperty $status.visual_proof_policy 'route_statuses' @{}) $routeName $null
  if($routeInfo){ Write-Host (" - visual route {0}: {1}" -f $routeName,(Get-GodModeProperty $routeInfo 'status' 'unknown')) }
}
foreach($degraded in @(Get-GodModeProperty $status.visual_proof_policy 'optional_degraded_evidence' @())){ if($degraded){ Write-Host (" - optional visual degradation: {0}" -f $degraded) } }
Write-Host ("Codex worker route: {0}" -f (Get-GodModeProperty $status.codex_worker_route_status 'structured_worker_route' 'unknown'))
Write-Host ("Latest proof bundle: {0}" -f $status.latest_proof_bundle)
Write-Host ("Latest worker proof: {0}" -f $status.latest_worker_proof)
Write-Host ("Latest trace crystal: {0}" -f (Get-GodModeProperty $status.latest_trace_crystal 'summary_file' 'unknown'))
Write-Host ("Queue depth: pending={0} active={1} done={2} failed={3}" -f $status.queue.depth.pending,$status.queue.depth.active,$status.queue.depth.done,$status.queue.depth.failed)
Write-Host ("Active missions: {0}" -f (@($status.active_missions).Count))
Write-Host ("Failed missions: {0} ({1})" -f (@($status.failed_missions).Count),(Get-GodModeProperty $status.failed_mission_state 'status' 'unknown'))
Write-Host ("Visual feedback: total={0} routed={1} unresolved={2} backlog={3} classification={4}" -f $status.visual_feedback_count,$status.visual_feedback_routed_count,$status.visual_feedback_unresolved_count,$status.visual_feedback_backlog_count,$status.visual_feedback_classification_status)
if($status.visual_feedback_resolution_report){ Write-Host ("Visual feedback report: {0}" -f $status.visual_feedback_resolution_report) }
Write-Host ("Visual feedback note: {0}" -f $status.visual_feedback_explanation)
Write-Host ("Rules Forge: {0}" -f (Get-GodModeProperty $status.rules_forge_state 'status' 'unknown'))
Write-Host ("Hook Bus: {0}" -f (Get-GodModeProperty $status.hook_bus_state 'status' 'unknown'))
Write-Host ("Internal Rules Engine: {0}" -f (Get-GodModeProperty $status.internal_rules_state 'status' 'unknown'))
Write-Host ("Internal Hook Bus: {0}" -f (Get-GodModeProperty $status.internal_hook_bus_state 'status' 'unknown'))
Write-Host ("Skill Forge: {0}" -f (Get-GodModeProperty $status.skill_forge_state 'status' 'unknown'))
Write-Host ("Runtime artifact tracking: {0}" -f (Get-GodModeProperty $status.ignored_runtime_tracking_state 'status' 'unknown'))
Write-Host ("Degraded capabilities ({0}): {1}" -f $status.degraded_capability_count, (($status.degraded_capabilities | Select-Object -Unique) -join '; '))
Write-Host ("Next recommended command: {0}" -f $status.next_recommended_command)
exit 0
