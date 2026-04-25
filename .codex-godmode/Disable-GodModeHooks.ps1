param([string]$Project='.')
$ErrorActionPreference='Continue'; [Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
$S=Split-Path -Parent $MyInvocation.MyCommand.Path
foreach($l in 'Common','TraceCrystal') { . (Join-Path $S "lib/GodMode.$l.ps1") }
$root=Initialize-GodModeStructure $Project; $projectPath=Resolve-GodModeProjectPath $Project
$target=Join-Path $projectPath '.codex\hooks.json'
$result='not_present'
if(Test-Path -LiteralPath $target){$backup=Join-GodModePath $root ("archive/proposals/disabled-hooks.json.$((Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssZ')).bak"); Move-Item -LiteralPath $target -Destination $backup -Force; $result="disabled_to_backup:$backup"}
$out=[ordered]@{schema_version=1;generated_at=Get-GodModeIso;status='disabled';result=$result;target=$target}
Write-GodModeJsonAtomic (Join-GodModePath $root 'state/hook-bus-status.json') $out | Out-Null
Add-GodModeTraceSpan $Project 'hook-bus' 'disable-hooks' 'success' @{result=$result} 'disable_hooks' 'HOST' 'Disable-GodModeHooks.ps1' 0 @() @($target) 'Hook activation disabled or confirmed absent.' | Out-Null
Write-Host "[HOOKS] $result"
exit 0
