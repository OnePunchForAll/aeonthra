param([string]$Project='.',[switch]$Enable)
$ErrorActionPreference='Continue'; [Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
$S=Split-Path -Parent $MyInvocation.MyCommand.Path
foreach($l in 'Common','TraceCrystal','Operational') { . (Join-Path $S "lib/GodMode.$l.ps1") }
$root=Initialize-GodModeStructure $Project; $projectPath=Resolve-GodModeProjectPath $Project
& (Join-Path $S 'Validate-GodModeHooks.ps1') -Project $Project; $validateExit=$LASTEXITCODE
$status=Read-GodModeJson (Join-GodModePath $root 'state/hook-bus-status.json') ([ordered]@{status='unknown'})
if(-not $Enable){Write-Host '[HOOKS] Proposal-only. Re-run with -Enable only after project trust is explicit.'; exit 0}
if($validateExit -ne 0 -or (Get-GodModeProperty $status 'status' '') -ne 'passed'){Write-Host '[HOOKS] Not enabled because validation did not pass cleanly or native hooks are unavailable.'; exit 1}
$targetDir=Join-Path $projectPath '.codex'; New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
$target=Join-Path $targetDir 'hooks.json'; $source=Join-GodModePath $root 'hooks/hooks.json'
$backup=$null; if(Test-Path -LiteralPath $target){$backup=Join-GodModePath $root ("archive/proposals/hooks.json.$((Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssZ')).bak"); Copy-Item -LiteralPath $target -Destination $backup -Force}
Copy-Item -LiteralPath $source -Destination $target -Force
$out=[ordered]@{schema_version=1;generated_at=Get-GodModeIso;status='enabled';target=$target;backup=$backup;write_boundary='.codex-godmode/events/hooks.jsonl';rollback_command='powershell -ExecutionPolicy Bypass -File .\.codex-godmode\Disable-GodModeHooks.ps1 -Project .'}
Write-GodModeJsonAtomic (Join-GodModePath $root 'state/hook-bus-status.json') $out | Out-Null
Add-GodModeTraceSpan $Project 'hook-bus' 'enable-hooks' 'success' @{target=$target;backup=$backup} 'enable_hooks' 'HOST' 'Enable-GodModeHooks.ps1 -Enable' 0 @() @($target) 'Hooks enabled only after explicit -Enable and validation pass.' | Out-Null
Write-Host "[HOOKS] enabled $target"
exit 0

