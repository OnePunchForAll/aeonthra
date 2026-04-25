param([string]$Project='.')
$ErrorActionPreference='Continue'; [Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
$S=Split-Path -Parent $MyInvocation.MyCommand.Path
foreach($l in 'Common','TraceCrystal','Operational','Operational','CodexRouter') { . (Join-Path $S "lib/GodMode.$l.ps1") }
$root=Initialize-GodModeStructure $Project; $projectPath=Resolve-GodModeProjectPath $Project
$rulesDir=Join-GodModePath $root 'rules'; Ensure-GodModeDirectory $rulesDir
$proposal=Join-Path $rulesDir 'proposed-godmode.rules'
if(-not(Test-Path -LiteralPath $proposal)){ Set-Content -LiteralPath $proposal -Value "# AEONTHRA proposed local rules`nEvidence before claims.`n" -Encoding UTF8 }
$blockers=@(); $degraded=@(); $execpolicyAvailable=$false; $execpolicyResult=$null
try{ $router=Invoke-GodModeCodexRouter $Project; $codexPath=Get-GodModeProperty $router 'codex_cli_path' $null; if($codexPath){ $probe=Invoke-GodModeNativeCommand $codexPath @('execpolicy','check') $projectPath 20; $execpolicyResult=@{exit_code=$probe.exit_code;stdout=$probe.stdout;stderr=$probe.stderr}; if($probe.exit_code -eq 0){$execpolicyAvailable=$true}else{$degraded += "codex execpolicy check unavailable or failed: exit $($probe.exit_code)"} } else { $degraded += 'codex CLI unavailable; execpolicy cannot be checked' } }catch{ $degraded += "execpolicy probe failed: $($_.Exception.Message)" }
try{ Get-Content -LiteralPath (Join-Path $rulesDir 'aeonthra-proposed-rules.json') -Raw -Encoding UTF8 | ConvertFrom-Json | Out-Null }catch{ $blockers += "rules JSON parse failed: $($_.Exception.Message)" }
$status=if($blockers.Count){'failed'}elseif($degraded.Count){'degraded'}else{'passed'}
$result=[ordered]@{schema_version=1;generated_at=Get-GodModeIso;status=$status;activation='proposal_only';execpolicy_available=$execpolicyAvailable;execpolicy_result=$execpolicyResult;proposal_path=$proposal;blockers=$blockers;degraded_reasons=$degraded;rollback_command='powershell -ExecutionPolicy Bypass -File .\.codex-godmode\Disable-GodModeRules.ps1 -Project .'}
Write-GodModeJsonAtomic (Join-GodModePath $root 'state/rules-forge-status.json') $result | Out-Null
$traceStatus=if($blockers.Count){'failed'}elseif($degraded.Count){'degraded'}else{'success'}
Add-GodModeTraceSpan $Project 'rules-forge' 'validate-rules' $traceStatus @{status=$status;degraded=$degraded;blockers=$blockers} 'validate_rules' 'HOST' 'Validate-GodModeRules.ps1' $null @('state/rules-forge-status.json') @('rules','state/rules-forge-status.json') 'Rules Forge validation completed without activating user rules.' | Out-Null
Write-Host ("[RULES] {0}" -f $status); $degraded|ForEach-Object{Write-Host "[DEGRADED] $_"}; $blockers|ForEach-Object{Write-Host "[BLOCKED] $_"}
if($blockers.Count){exit 1}else{exit 0}

