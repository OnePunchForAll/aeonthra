param([string]$Project='.',[string]$InAppProofPath='')
$ErrorActionPreference='Continue'; [Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
$S = Split-Path -Parent $MyInvocation.MyCommand.Path
foreach($l in 'Common','Queue','TraceCrystal','Operational','Live') { . (Join-Path $S "lib/GodMode.$l.ps1") }
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
$proof = [ordered]@{ schema_version=1; created_at=Get-GodModeIso; status=$status; route=$route; browser_use_status=if($status -eq 'passed'){'codex-browser-use-proof-recorded'}else{'not_proven_in_powershell'}; live_url=$liveUrl; arena_url=$arenaUrl; mission_control_url=$missionUrl; observations=@([ordered]@{target='live';url=$liveUrl;probe=$liveProbe},[ordered]@{target='arena';url=$arenaUrl;probe=$arenaProbe},[ordered]@{target='mission-control';url=$missionUrl;probe=$missionProbe}); clicked_comment_mode=$clickedCommentMode; console_error_count=$consoleErrorCount; blockers=$blockers; in_app_proof=$inApp }
$proofPath = Join-Path $bundleDir 'browser-proof.json'
Write-GodModeJsonAtomic $proofPath $proof | Out-Null
$reality = Read-GodModeJson (Join-GodModePath $root 'state/reality-router.json') ([ordered]@{})
$realityOut = [ordered]@{}
foreach($p in $reality.PSObject.Properties) { $realityOut[$p.Name] = $p.Value }
$realityOut['generated_at'] = Get-GodModeIso; $realityOut['selected_browser_route'] = $route; $realityOut['browser_use_active'] = ($status -eq 'passed'); $realityOut['browser_use_probe'] = if($status -eq 'passed'){'proof_bundle_recorded'}else{'blocked_from_powershell_context'}; $realityOut['latest_browser_proof'] = $proofPath; $realityOut['degraded_reasons'] = if($status -eq 'passed'){@()}else{@('codex_browser_use_not_proven')}; $realityOut['blockers'] = $blockers
Write-GodModeJsonAtomic (Join-GodModePath $root 'state/reality-router.json') $realityOut | Out-Null
Update-GodModeLiveResult $Project @{ status=if($status -eq 'passed'){'VERIFIED-OPERATIONAL-PHASE5'}else{'DEGRADED'}; headline='Browser proof probe completed'; live_url=$liveUrl; arena_url=$arenaUrl; mission_control_url=$missionUrl; browser_status=$proof.browser_use_status; latest_proof_bundle=$proofPath; proof_bundles=@($proofPath); what_changed=@('Browser proof bundle written.'); what_still_failed=$blockers; next_repair_action=if($status -eq 'passed'){'Run Run-GodModeValidation.ps1.'}else{'Use Codex in-app Browser Use to inspect and click UI; do not claim browser-verified yet.'} } | Out-Null
$traceStatus = 'degraded'; if($status -eq 'passed'){ $traceStatus = 'success' }
Add-GodModeTraceSpan $Project 'browser-proof' 'run-browser-proof' $traceStatus @{proof=$proofPath;status=$status} 'run_browser_proof' 'BROWSER-REALITY' 'Run-BrowserProof.ps1' 0 @($proofPath) @($proofPath) 'Browser proof bundle written.' | Out-Null
Write-Host ("[BROWSER] {0} {1}" -f $status,$proofPath)
if ($liveProbe.ok -and $arenaProbe.ok -and $missionProbe.ok) { exit 0 } else { exit 1 }


