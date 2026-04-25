param([string]$Project='.',[switch]$WindowsDoctorOnly,[switch]$NoValidate)
$ErrorActionPreference='Stop'; [Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
$S=Split-Path -Parent $MyInvocation.MyCommand.Path
foreach($l in 'Common','WindowsDoctor','WindowsTools','PathDoctor','NetworkDoctor','WslBridge','CodexRouter','RealityRouter','Queue','Health','Arena','Live','SafePatch','TraceCrystal'){ . (Join-Path $S "lib/GodMode.$l.ps1") }
$root=Initialize-GodModeStructure $Project; $run=New-GodModeRunId; $cp=New-GodModeCheckpoint $Project $run
$windows=Invoke-GodModeWindowsDoctor $Project
if($WindowsDoctorOnly){ Write-Host "[WINDOWS] Windows Doctor wrote $root\state\windows-capabilities.json"; exit 0 }
$path=Invoke-GodModePathDoctor $Project; $tools=Resolve-GodModeTools $Project; $net=Invoke-GodModeNetworkDoctor $Project; $wsl=Invoke-GodModeWslBridgeProbe $Project; $codex=Invoke-GodModeCodexRouter $Project; $reality=Invoke-GodModeRealityRouter $Project; $safe=Test-GodModeSafePatchRoute $Project
Update-GodModeDeityManifest $Project | Out-Null
$degraded=@(); $degraded+=@($windows.degraded_reasons); $degraded+=@($path.risks); $degraded+=@($codex.degraded_reasons); $degraded+=@($reality.degraded_reasons)
Update-GodModeLiveResult $Project @{status='ready';what_changed=@('Installed/refreshed Aeonthra MVP control-plane projections.');what_still_failed=$degraded;next_repair_action='Run master-controller.ps1 -Mode safe, then validate-system.ps1.'} | Out-Null
Update-GodModeHealth $Project 'VERIFIED-MVP' $degraded @($windows.blockers) @{last_checkpoint=$cp.run_id;selected_codex_route=$codex.structured_worker_route;selected_browser_route=$reality.selected_browser_route;selected_patch_route=$safe.selected_route;live_result_status='ready'} | Out-Null
Add-GodModeTraceSpan $Project $run 'install-or-upgrade' 'ok' @{degraded_reasons=$degraded}|Out-Null
if(-not $NoValidate){ & (Join-Path $S 'validate-system.ps1') -Project $Project; exit $LASTEXITCODE }
Write-Host '[DONE] install-or-upgrade MVP refresh completed.'
