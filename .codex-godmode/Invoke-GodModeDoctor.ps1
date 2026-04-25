param([string]$Project='.')
$ErrorActionPreference='Continue'; [Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
$S = Split-Path -Parent $MyInvocation.MyCommand.Path
foreach($l in 'Common','Queue','TraceCrystal','WindowsDoctor','WindowsTools','RealityRouter','CodexRouter','NetworkDoctor','PathDoctor','SafePatch','Operational','Live','Health') { . (Join-Path $S "lib/GodMode.$l.ps1") }
$root = Initialize-GodModeStructure $Project
$runId = New-GodModeRunId
$windows = Invoke-GodModeWindowsDoctor $Project
$tools = Resolve-GodModeTools $Project
$reality = Invoke-GodModeRealityRouter $Project
$codex = Invoke-GodModeCodexRouter $Project
$path = Invoke-GodModePathDoctor $Project
$network = Invoke-GodModeNetworkDoctor $Project
$patch = Test-GodModeSafePatchRoute $Project
$blockers = @(); $degraded = @()
foreach($obj in @($windows,$tools,$reality,$codex,$path,$network,$patch)) { foreach($b in @(Get-GodModeProperty $obj 'blockers' @())) { if($b) { $blockers += [string]$b } } }
foreach($obj in @($windows,$reality,$codex,$network,$patch)) { foreach($d in @(Get-GodModeProperty $obj 'degraded_reasons' @())) { if($d) { $degraded += [string]$d } } }
$doctor = [ordered]@{ schema_version=1; generated_at=Get-GodModeIso; run_id=$runId; status=if($blockers.Count){'blocked'}elseif($degraded.Count){'degraded'}else{'ok'}; windows=$windows; tools_summary=$tools.selected_summary; codex=$codex; reality=$reality; path=$path; network=$network; patch=$patch; blockers=@($blockers | Select-Object -Unique); degraded_reasons=@($degraded | Select-Object -Unique) }
Write-GodModeJsonAtomic (Join-GodModePath $root 'state/doctor-summary.json') $doctor | Out-Null
$traceStatus = 'degraded'; if($doctor.status -eq 'ok'){ $traceStatus='success' } elseif($doctor.status -eq 'blocked'){ $traceStatus='blocked' }
Add-GodModeTraceSpan $Project $runId 'doctor' $traceStatus @{doctor=$doctor.status} 'doctor' 'WINDOWS-DOCTOR' 'Invoke-GodModeDoctor.ps1' 0 @('state/doctor-summary.json') @('state/doctor-summary.json') 'Doctor summary written.' | Out-Null
Update-GodModeHealth $Project 'DOCTOR-CHECKED' $doctor.degraded_reasons $doctor.blockers @{ doctor_status=$doctor.status; selected_codex_route=$codex.structured_worker_route; selected_browser_route=$reality.selected_browser_route; selected_patch_route=$patch.selected_route } | Out-Null
Write-Host ("[DOCTOR] {0}" -f $doctor.status)
if ($doctor.blockers.Count) { $doctor.blockers | ForEach-Object { Write-Host "[BLOCKED] $_" } }
if ($doctor.degraded_reasons.Count) { $doctor.degraded_reasons | ForEach-Object { Write-Host "[DEGRADED] $_" } }
exit 0

