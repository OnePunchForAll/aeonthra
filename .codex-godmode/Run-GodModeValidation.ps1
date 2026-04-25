param([string]$Project='.',[switch]$SkipWorkerSmoke)
$ErrorActionPreference='Continue'; [Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
$S = Split-Path -Parent $MyInvocation.MyCommand.Path
foreach($l in 'Common','Queue','Schema','Safety','TraceCrystal','Operational','Live','Health') { . (Join-Path $S "lib/GodMode.$l.ps1") }
$root = Initialize-GodModeStructure $Project
$projectPath = Resolve-GodModeProjectPath $Project
$stamp = (Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssZ')
$runId = "validation-$stamp"
$checks = @(); $blockers = @()
function Add-Check([string]$Name,[string]$Status,$Detail=$null) { $script:checks += [ordered]@{ name=$Name; status=$Status; detail=$Detail; checked_at=Get-GodModeIso } }
$psExe = (Get-Process -Id $PID).Path
$validateScript = Join-GodModePath $root 'validate-system.ps1'
$validation = Invoke-GodModeNativeCommand $psExe @('-ExecutionPolicy','Bypass','-File',$validateScript,'-Project',$projectPath) $projectPath 120
$checkStatus = 'failed'; if($validation.exit_code -eq 0){ $checkStatus = 'passed' }
Add-Check 'validate-system.ps1' $checkStatus @{exit_code=$validation.exit_code;stdout=$validation.stdout;stderr=$validation.stderr}
if ($validation.exit_code -ne 0) { $blockers += 'validate-system.ps1 failed' }
$jsonFailures = @()
foreach($json in Get-ChildItem $root -Filter '*.json' -Recurse -ErrorAction SilentlyContinue) { try { Get-Content $json.FullName -Raw -Encoding UTF8 | ConvertFrom-Json | Out-Null } catch { $jsonFailures += "$($json.FullName): $($_.Exception.Message)" } }
$checkStatus = 'passed'; if($jsonFailures.Count){ $checkStatus = 'failed' }
Add-Check 'json-parse-checks' $checkStatus @{failures=$jsonFailures.Count; sample=@($jsonFailures | Select-Object -First 5)}
if($jsonFailures.Count){$blockers += 'JSON parse checks failed'}
$psFailures = @()
foreach($ps in Get-ChildItem $root -Filter '*.ps1' -Recurse -ErrorAction SilentlyContinue) { $tokens=$null; $errors=$null; [System.Management.Automation.Language.Parser]::ParseFile($ps.FullName,[ref]$tokens,[ref]$errors) | Out-Null; if($errors -and $errors.Count){ $psFailures += "$($ps.FullName): $($errors[0].Message)" } }
$checkStatus = 'passed'; if($psFailures.Count){ $checkStatus = 'failed' }
Add-Check 'powershell-parser-checks' $checkStatus @{failures=$psFailures.Count; sample=@($psFailures | Select-Object -First 5)}
if($psFailures.Count){$blockers += 'PowerShell parser checks failed'}
$liveUrl = [string](Get-Content (Join-GodModePath $root 'state/latest-result.url') -ErrorAction SilentlyContinue | Select-Object -First 1)
$arenaPort = [string](Get-Content (Join-GodModePath $root 'state/arena-port.txt') -ErrorAction SilentlyContinue | Select-Object -First 1)
$arenaUrl = if($arenaPort){"http://127.0.0.1:$arenaPort/"}else{$null}
$liveProbe = Invoke-GodModeHttpProbe $liveUrl 5; $arenaProbe = Invoke-GodModeHttpProbe $arenaUrl 5
$checkStatus = 'degraded'; if($liveProbe.ok){ $checkStatus = 'passed' }
Add-Check 'live-http-check' $checkStatus $liveProbe
$checkStatus = 'degraded'; if($arenaProbe.ok){ $checkStatus = 'passed' }
Add-Check 'arena-http-check' $checkStatus $arenaProbe
if(-not $liveProbe.ok){$blockers += 'Live Result Viewer HTTP check failed'}
if(-not $arenaProbe.ok){$blockers += 'Arena HTTP check failed'}
$feedbackStatus='degraded'; $feedbackDetail=$null
if($liveProbe.ok){
  try {
    $payload = @{ target='validation-smoke'; page_url=$liveUrl; text="Validation smoke harmless comment $stamp" } | ConvertTo-Json -Compress
    $resp = Invoke-WebRequest -Uri ($liveUrl -replace '/live.html$','/api/visual-feedback') -UseBasicParsing -Method Post -ContentType 'application/json' -Body $payload -TimeoutSec 8
    $feedbackDetail = @{status_code=[int]$resp.StatusCode;body=$resp.Content}
    $feedbackStatus = if($resp.StatusCode -eq 201){'passed'}else{'failed'}
  } catch { $feedbackDetail=@{error=$_.Exception.Message}; $feedbackStatus='failed' }
}
Add-Check 'visual-feedback-post-smoke' $feedbackStatus $feedbackDetail
if($feedbackStatus -eq 'failed'){$blockers += 'visual feedback POST smoke failed'}
try { $routing = Invoke-GodModeVisualFeedbackRouting $Project; Add-Check 'visual-feedback-routing' 'passed' @{created=@($routing.created).Count;rejected=@($routing.rejected).Count} } catch { Add-Check 'visual-feedback-routing' 'failed' @{error=$_.Exception.Message}; $blockers += 'visual feedback routing failed' }
$iabProof = Get-ChildItem (Join-GodModePath $root 'logs') -Recurse -Filter 'browser-proof.json' -ErrorAction SilentlyContinue | Where-Object { $_.FullName -match 'browser-proof-iab' } | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if($iabProof){ $browser = & (Join-Path $S 'Run-BrowserProof.ps1') -Project $Project -InAppProofPath $iabProof.FullName 2>&1 } else { $browser = & (Join-Path $S 'Run-BrowserProof.ps1') -Project $Project 2>&1 }
$browserExit = $LASTEXITCODE
$checkStatus = 'degraded'; if($browserExit -eq 0){ if($iabProof){ $checkStatus = 'passed' } else { $checkStatus = 'degraded_or_passed' } }
Add-Check 'browser-proof-smoke' $checkStatus @{exit_code=$browserExit;output=($browser -join "`n")}
if(-not $SkipWorkerSmoke){
  $workerOut = & (Join-Path $S 'Run-WorkerSmoke.ps1') -Project $Project 2>&1
  $workerExit = $LASTEXITCODE
  $checkStatus = 'degraded'; if($workerExit -eq 0){ $checkStatus = 'passed' }
  Add-Check 'worker-smoke' $checkStatus @{exit_code=$workerExit;output=($workerOut -join "`n")}
}
$traceOut = & (Join-Path $S 'Run-TraceCrystal.ps1') -Project $Project -MissionId $runId 2>&1; $traceExit = $LASTEXITCODE
$checkStatus = 'failed'; if($traceExit -eq 0){ $checkStatus = 'passed' }
Add-Check 'trace-crystal-smoke' $checkStatus @{exit_code=$traceExit;output=($traceOut -join "`n")}
if($traceExit -ne 0){$blockers += 'Trace Crystal smoke failed'}
$status = if($blockers.Count){'failed'}else{'passed'}
$summary = [ordered]@{ schema_version=1; generated_at=Get-GodModeIso; status=$status; run_id=$runId; checks=$checks; blockers=$blockers }
$summaryPath = Join-GodModePath $root "logs/godmode-validation-$stamp.json"
Write-GodModeJsonAtomic $summaryPath $summary | Out-Null
Write-GodModeJsonAtomic (Join-GodModePath $root 'state/validation-status.json') $summary | Out-Null
$traceStatus = 'failed'; if($status -eq 'passed'){ $traceStatus='success' }
Add-GodModeTraceSpan $Project $runId 'godmode-validation' $traceStatus @{summary=$summaryPath} 'run_validation' 'TEST-RUNNER' 'Run-GodModeValidation.ps1' $validation.exit_code @($summaryPath) @($summaryPath) "GodMode validation status: $status" | Out-Null
$healthStatus = 'DEGRADED'; if($status -eq 'passed'){ $healthStatus='VERIFIED-OPERATIONAL-PHASE4' }
Update-GodModeHealth $Project $healthStatus @($checks | Where-Object {$_.status -like 'degraded*'} | ForEach-Object {$_.name}) $blockers @{ live_result_status=$status; latest_validation=$summaryPath } | Out-Null
Update-GodModeLiveResult $Project @{ status=if($status -eq 'passed'){'VERIFIED-OPERATIONAL-PHASE4'}else{'DEGRADED'}; headline='GodMode validation completed'; live_url=$liveUrl; arena_url=$arenaUrl; latest_proof_bundle=$summaryPath; validation_logs=@($summaryPath); what_changed=@("GodMode validation status: $status"); what_still_failed=$blockers; next_repair_action=if($status -eq 'passed'){'Run Status-GodMode.ps1 or continue Phase 5 proposals.'}else{'Inspect state/validation-status.json.'} } | Out-Null
Write-Host ("[GODMODE-VALIDATION] {0} {1}" -f $status,$summaryPath)
if($status -eq 'passed'){exit 0}else{exit 1}



