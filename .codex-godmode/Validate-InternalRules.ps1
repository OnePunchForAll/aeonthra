param([string]$Project='.')
$ErrorActionPreference='Continue'; [Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
$S = Split-Path -Parent $MyInvocation.MyCommand.Path
foreach($l in 'Common','TraceCrystal','Operational','InternalRules') { . (Join-Path $S "lib/GodMode.$l.ps1") }
$root = Initialize-GodModeStructure $Project
$result = Invoke-GodModeInternalRulesValidation $Project
$traceStatus = if($result.status -eq 'passed'){'success'}else{'failed'}
Add-GodModeTraceSpan $Project 'internal-rules' 'validate-internal-rules' $traceStatus @{status=$result.status;blockers=$result.blockers} 'validate_rules' 'HOST' 'Validate-InternalRules.ps1' $null @('state/internal-rules-status.json') @('safety/command-allowlist.json','safety/protected-paths.json','state/internal-rules-status.json') 'Internal command/path safety rules validation completed.' | Out-Null
Write-Host ("[INTERNAL-RULES] {0}" -f $result.status)
foreach($b in @($result.blockers)){ Write-Host "[BLOCKED] $b" }
if($result.status -eq 'passed'){ exit 0 } else { exit 1 }
