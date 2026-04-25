param([string]$Project='.',[string]$EventPath='')
$ErrorActionPreference='Continue'; [Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
try { $projectPath=(Resolve-Path -LiteralPath $Project).Path } catch { $projectPath=(Get-Location).Path }
$root=Join-Path $projectPath '.codex-godmode'
$outDir=Join-Path $root 'events'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$out=Join-Path $outDir 'hooks.jsonl'
$event=[ordered]@{schema_version=1;created_at=(Get-Date).ToUniversalTime().ToString('o');hook='PermissionRequest';event_path=$EventPath;write_boundary='.codex-godmode/events/hooks.jsonl';mutates_shared_state=$false;source='aeonthra-hook-bus'}
$line=$event|ConvertTo-Json -Compress -Depth 8
[IO.File]::AppendAllText($out, $line+"
", [Text.UTF8Encoding]::new($false))
Write-Host '[HOOK] Aeonthra hook event recorded to .codex-godmode/events/hooks.jsonl'
