param([string]$Project='.',[string]$InAppProofPath='')
$ErrorActionPreference='Continue'; [Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
$S = Split-Path -Parent $MyInvocation.MyCommand.Path
foreach($l in 'Common','Queue','TraceCrystal','Operational','Live','Proof') { . (Join-Path $S "lib/GodMode.$l.ps1") }
$root = Initialize-GodModeStructure $Project
$stamp = (Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssZ')
$bundleDir = Join-GodModePath $root "logs/browser-proof-$stamp"
Ensure-GodModeDirectory $bundleDir
$liveUrl = [string](Get-Content (Join-GodModePath $root 'state/latest-result.url') -ErrorAction SilentlyContinue | Select-Object -First 1)
$arenaPort = [string](Get-Content (Join-GodModePath $root 'state/arena-port.txt') -ErrorAction SilentlyContinue | Select-Object -First 1)
$missionPort = [string](Get-Content (Join-GodModePath $root 'state/mission-control-port.txt') -ErrorAction SilentlyContinue | Select-Object -First 1)
$arenaUrl = if ($arenaPort) { "http://127.0.0.1:$arenaPort/" } else { $null }
$missionUrl = if ($missionPort) { "http://127.0.0.1:$missionPort/" } else { $null }
$liveProbe = Invoke-GodModeHttpProbe $liveUrl 5
$arenaProbe = Invoke-GodModeHttpProbe $arenaUrl 5
$missionProbe = Invoke-GodModeHttpProbe $missionUrl 5
$route = 'http_static_fallback'; $status = 'degraded'; $blockers = @('Codex Browser Use cannot be invoked from standalone PowerShell; run in-app browser proof via Codex app tool and pass/record the proof bundle.')
$inApp = $null
if ([string]::IsNullOrWhiteSpace($InAppProofPath)) {
  $latestInApp = Get-ChildItem (Join-GodModePath $root 'logs') -Recurse -Filter 'browser-proof.json' -ErrorAction SilentlyContinue | Where-Object { $_.FullName -match 'browser-proof-iab' } | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if ($latestInApp) { $InAppProofPath = $latestInApp.FullName }
}
if (-not [string]::IsNullOrWhiteSpace($InAppProofPath) -and (Test-Path -LiteralPath $InAppProofPath)) {
  try { $inApp = Get-Content -LiteralPath $InAppProofPath -Raw -Encoding UTF8 | ConvertFrom-Json; $route='codex_browser_use_iab'; $status='passed'; $blockers=@() } catch { $blockers=@("In-app proof file parse failed: $($_.Exception.Message)") }
}
$clickedCommentMode = $false
$consoleErrorCount = 'unknown_without_browser_use'
if ($inApp) {
  $clickedCommentMode = [bool](Get-GodModeProperty $inApp 'clicked_comment_mode' $false)
  $consoleErrorCount = Get-GodModeProperty $inApp 'console_error_count' 0
}
$visualPolicy = $null
try {
  $visualPolicy = Update-GodModeVisualProofPolicy $Project
  if ((Get-GodModeProperty $visualPolicy 'status' '') -eq 'passed') {
    $status = 'passed'
    $route = [string](Get-GodModeProperty $visualPolicy 'selected_visual_proof_route' $route)
    $blockers = @()
    $policyDom = Get-GodModeProperty (Get-GodModeProperty $visualPolicy 'route_statuses' @{}) 'codex_browser_dom_console' $null
    if($policyDom){
      $clickedCommentMode = [bool](Get-GodModeProperty $policyDom 'clicked_comment_mode' $clickedCommentMode)
      $consoleErrorCount = Get-GodModeProperty $policyDom 'console_error_count' $consoleErrorCount
    }
  } else {
    foreach($b in @(Get-GodModeProperty $visualPolicy 'blockers' @())){ if($b){ $blockers += [string]$b } }
  }
} catch {
  $blockers += "visual proof policy evaluation failed: $($_.Exception.Message)"
}
$browserUseStatus = if($status -eq 'passed'){
  if($route -eq 'codex_browser_screenshot'){'codex-browser-screenshot-proof-recorded'}
  elseif($route -eq 'chrome_headless_screenshot_fallback'){'codex-browser-dom-console-with-headless-screenshot-fallback'}
  elseif($route -eq 'codex_browser_dom_console'){'codex-browser-dom-console-proof-recorded'}
  else{'codex-browser-use-proof-recorded'}
}else{'not_proven_in_powershell'}
$proof = [ordered]@{ schema_version=1; created_at=Get-GodModeIso; status=$status; route=$route; browser_use_status=$browserUseStatus; live_url=$liveUrl; arena_url=$arenaUrl; mission_control_url=$missionUrl; observations=@([ordered]@{target='live';url=$liveUrl;probe=$liveProbe},[ordered]@{target='arena';url=$arenaUrl;probe=$arenaProbe},[ordered]@{target='mission-control';url=$missionUrl;probe=$missionProbe}); clicked_comment_mode=$clickedCommentMode; console_error_count=$consoleErrorCount; blockers=$blockers; in_app_proof=$inApp; visual_proof_policy=$visualPolicy }
$proofPath = Join-Path $bundleDir 'browser-proof.json'
Write-GodModeJsonAtomic $proofPath $proof | Out-Null
$reality = Read-GodModeJson (Join-GodModePath $root 'state/reality-router.json') ([ordered]@{})
$realityOut = [ordered]@{}
foreach($p in $reality.PSObject.Properties) { $realityOut[$p.Name] = $p.Value }
$degradedReasons = @()
if($status -ne 'passed'){ $degradedReasons += 'codex_browser_use_not_proven' }
foreach($d in @(Get-GodModeProperty $visualPolicy 'optional_degraded_evidence' @())){ if($d){ $degradedReasons += [string]$d } }
$realityOut['generated_at'] = Get-GodModeIso; $realityOut['selected_browser_route'] = $route; $realityOut['browser_use_active'] = ($status -eq 'passed'); $realityOut['browser_use_probe'] = if($status -eq 'passed'){$browserUseStatus}else{'blocked_from_powershell_context'}; $realityOut['latest_browser_proof'] = $proofPath; $realityOut['visual_proof_policy'] = $visualPolicy; $realityOut['visual_proof_routes'] = Get-GodModeProperty $visualPolicy 'route_statuses' ([ordered]@{}); $realityOut['degraded_reasons'] = @($degradedReasons | Select-Object -Unique); $realityOut['blockers'] = $blockers
Write-GodModeJsonAtomic (Join-GodModePath $root 'state/reality-router.json') $realityOut | Out-Null
Update-GodModeLiveResult $Project @{ status=if($status -eq 'passed'){'VERIFIED-OPERATIONAL-PHASE5'}else{'DEGRADED'}; headline='Browser proof probe completed'; live_url=$liveUrl; arena_url=$arenaUrl; mission_control_url=$missionUrl; browser_status=$proof.browser_use_status; latest_proof_bundle=$proofPath; proof_bundles=@($proofPath); what_changed=@('Browser proof bundle written.'); what_still_failed=$blockers; next_repair_action=if($status -eq 'passed'){'Run Run-GodModeValidation.ps1.'}else{'Use Codex in-app Browser Use to inspect and click UI; do not claim browser-verified yet.'} } | Out-Null
$traceStatus = 'degraded'; if($status -eq 'passed'){ $traceStatus = 'success' }
Add-GodModeTraceSpan $Project 'browser-proof' 'run-browser-proof' $traceStatus @{proof=$proofPath;status=$status} 'run_browser_proof' 'BROWSER-REALITY' 'Run-BrowserProof.ps1' 0 @($proofPath) @($proofPath) 'Browser proof bundle written.' | Out-Null
Write-Host ("[BROWSER] {0} {1}" -f $status,$proofPath)
if ($liveProbe.ok -and $arenaProbe.ok -and $missionProbe.ok) { exit 0 } else { exit 1 }


