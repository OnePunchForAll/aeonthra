param([string]$Project='.',[switch]$Enable)
$ErrorActionPreference='Continue'; [Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
$S=Split-Path -Parent $MyInvocation.MyCommand.Path
foreach($l in 'Common','TraceCrystal','Operational') { . (Join-Path $S "lib/GodMode.$l.ps1") }
$root=Initialize-GodModeStructure $Project; $projectPath=Resolve-GodModeProjectPath $Project
& (Join-Path $S 'Validate-GodModeRules.ps1') -Project $Project; $validateExit=$LASTEXITCODE
$status=Read-GodModeJson (Join-GodModePath $root 'state/rules-forge-status.json') ([ordered]@{status='unknown'})
if(-not $Enable){ Write-Host '[RULES] Proposal-only. Re-run with -Enable after validation if project trust is explicit.'; exit 0 }
if($validateExit -ne 0 -or (Get-GodModeProperty $status 'status' '') -ne 'passed') { Write-Host '[RULES] Not enabled because validation did not pass cleanly.'; exit 1 }
$targetDir=Join-Path $projectPath '.codex\rules'; New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
$target=Join-Path $targetDir 'aeonthra-godmode.rules'; $source=Join-GodModePath $root 'rules/proposed-godmode.rules'
$backup=$null; if(Test-Path -LiteralPath $target){$backup=Join-GodModePath $root ("archive/proposals/aeonthra-godmode.rules.$((Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssZ')).bak"); Copy-Item -LiteralPath $target -Destination $backup -Force}
Copy-Item -LiteralPath $source -Destination $target -Force
$out=[ordered]@{schema_version=1;generated_at=Get-GodModeIso;status='enabled';target=$target;backup=$backup;rollback_command='powershell -ExecutionPolicy Bypass -File .\.codex-godmode\Disable-GodModeRules.ps1 -Project .'}
Write-GodModeJsonAtomic (Join-GodModePath $root 'state/rules-forge-status.json') $out | Out-Null
Add-GodModeTraceSpan $Project 'rules-forge' 'enable-rules' 'success' @{target=$target;backup=$backup} 'enable_rules' 'HOST' 'Enable-GodModeRules.ps1 -Enable' 0 @() @($target) 'Rules enabled only after explicit -Enable and validation pass.' | Out-Null
Write-Host "[RULES] enabled $target"
exit 0

