param([string]$Project='.')
$ErrorActionPreference='Continue'; [Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
$S=Split-Path -Parent $MyInvocation.MyCommand.Path
foreach($l in 'Common','TraceCrystal','Operational','Operational','CodexRouter') { . (Join-Path $S "lib/GodMode.$l.ps1") }
$root=Initialize-GodModeStructure $Project; $projectPath=Resolve-GodModeProjectPath $Project
$hooksDir=Join-GodModePath $root 'hooks'; $blockers=@(); $degraded=@(); $nativeAvailable=$false
try{Get-Content -LiteralPath (Join-Path $hooksDir 'hooks.json') -Raw -Encoding UTF8|ConvertFrom-Json|Out-Null}catch{$blockers += "hooks.json parse failed: $($_.Exception.Message)"}
foreach($ps in Get-ChildItem -LiteralPath $hooksDir -Filter '*.ps1' -ErrorAction SilentlyContinue){$tokens=$null;$errors=$null;[System.Management.Automation.Language.Parser]::ParseFile($ps.FullName,[ref]$tokens,[ref]$errors)|Out-Null;if($errors -and $errors.Count){$blockers += "hook parse failed $($ps.Name): $($errors[0].Message)"}; $txt=Get-Content -LiteralPath $ps.FullName -Raw -Encoding UTF8; if($txt -notmatch 'events/hooks\.jsonl'){ $blockers += "hook $($ps.Name) does not declare events/hooks.jsonl write boundary" } }
try{ $router=Invoke-GodModeCodexRouter $Project; $codexPath=Get-GodModeProperty $router 'codex_cli_path' $null; if($codexPath){$probe=Invoke-GodModeNativeCommand $codexPath @('hooks','--help') $projectPath 15; if($probe.exit_code -eq 0){$nativeAvailable=$true}else{$degraded += "codex hooks unavailable or unsupported: exit $($probe.exit_code)"}}else{$degraded += 'codex CLI unavailable; hooks cannot be natively activated'}}catch{$degraded += "codex hooks probe failed: $($_.Exception.Message)"}
$status=if($blockers.Count){'failed'}elseif($degraded.Count){'degraded'}else{'passed'}
$result=[ordered]@{schema_version=1;generated_at=Get-GodModeIso;status=$status;activation='proposal_only';native_hooks_available=$nativeAvailable;write_boundary='.codex-godmode/events/hooks.jsonl';blockers=$blockers;degraded_reasons=$degraded;rollback_command='powershell -ExecutionPolicy Bypass -File .\.codex-godmode\Disable-GodModeHooks.ps1 -Project .'}
Write-GodModeJsonAtomic (Join-GodModePath $root 'state/hook-bus-status.json') $result | Out-Null
$traceStatus=if($blockers.Count){'failed'}elseif($degraded.Count){'degraded'}else{'success'}
Add-GodModeTraceSpan $Project 'hook-bus' 'validate-hooks' $traceStatus @{status=$status;degraded=$degraded;blockers=$blockers} 'validate_hooks' 'HOST' 'Validate-GodModeHooks.ps1' $null @('state/hook-bus-status.json') @('hooks','state/hook-bus-status.json') 'Hook Bus validation completed without activating user hooks.' | Out-Null
Write-Host ("[HOOKS] {0}" -f $status); $degraded|ForEach-Object{Write-Host "[DEGRADED] $_"}; $blockers|ForEach-Object{Write-Host "[BLOCKED] $_"}
if($blockers.Count){exit 1}else{exit 0}

