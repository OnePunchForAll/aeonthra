param([string]$Project='.')
$ErrorActionPreference='Continue'; [Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
$S = Split-Path -Parent $MyInvocation.MyCommand.Path
foreach($l in 'Common','TraceCrystal','Operational','InternalHookBus') { . (Join-Path $S "lib/GodMode.$l.ps1") }
$root = Initialize-GodModeStructure $Project
$result = Invoke-GodModeInternalHookBusValidation $Project
$traceStatus = if($result.status -eq 'passed'){'success'}else{'failed'}
Add-GodModeTraceSpan $Project 'internal-hook-bus' 'validate-internal-hook-bus' $traceStatus @{status=$result.status;blockers=$result.blockers} 'validate_hooks' 'HOST' 'Validate-InternalHookBus.ps1' $null @('state/internal-hook-bus-status.json','events/hooks.jsonl') @('events/hooks.jsonl','state/internal-hook-bus-status.json') 'Internal hook bus validation completed; hooks write only to events/hooks.jsonl.' | Out-Null
Write-Host ("[INTERNAL-HOOK-BUS] {0}" -f $result.status)
foreach($b in @($result.blockers)){ Write-Host "[BLOCKED] $b" }
if($result.status -eq 'passed'){ exit 0 } else { exit 1 }
