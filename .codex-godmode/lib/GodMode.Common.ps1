Set-StrictMode -Version 2.0
$script:GodModeRequiredDirs = @('lib','bin','docs','profiles/regular','profiles/mini-masters','profiles/baselines','profiles/adversarial','memory','queues/pending','queues/active','queues/done','queues/failed','queues/replay','queues/tournament','queues/adversarial','inbox/results','inbox/heartbeats','events','logs','traces','worktrees','arena/vendor','live','mission-control','journeys','schemas','safety','rules','hooks','feedback','tests/golden/missions','tests/replay','checkpoints','archive/ledgers','archive/corrupted','archive/snapshots','archive/proposals','archive/patches','archive/worktrees','archive/missions','archive/host-actions','host-actions','state','graphs','skills','config')
$script:GodModeMemoryLedgers = @('experience-ledger.jsonl','evolution-ledger.jsonl','lineage-ledger.jsonl','stability-ledger.jsonl','validation-history.jsonl','failure-patterns.jsonl','baseline-ledger.jsonl','tournament-ledger.jsonl','adversarial-ledger.jsonl','replay-ledger.jsonl','browser-reality-ledger.jsonl','live-preview-ledger.jsonl','trace-crystal-ledger.jsonl','windows-capability-ledger.jsonl','host-action-ledger.jsonl','visual-feedback-ledger.jsonl')
function Get-GodModeIso { (Get-Date).ToUniversalTime().ToString('o') }
function New-GodModeRunId { 'run-' + (Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssZ') + '-' + ([guid]::NewGuid().ToString('N').Substring(0,8)) }
function Resolve-GodModeProjectPath { param([string]$Project='.') (Resolve-Path -LiteralPath $Project).Path }
function Get-GodModeRoot { param([string]$Project='.') Join-Path (Resolve-GodModeProjectPath $Project) '.codex-godmode' }
function Join-GodModePath { param([string]$Root,[string]$Child) Join-Path $Root ($Child -replace '/', [IO.Path]::DirectorySeparatorChar) }
function Ensure-GodModeDirectory { param([string]$Path) if(-not(Test-Path -LiteralPath $Path)){ New-Item -ItemType Directory -Force -Path $Path | Out-Null } }
function Initialize-GodModeStructure { param([string]$Project='.') $r=Get-GodModeRoot $Project; Ensure-GodModeDirectory $r; foreach($d in $script:GodModeRequiredDirs){ Ensure-GodModeDirectory (Join-GodModePath $r $d) }; foreach($l in $script:GodModeMemoryLedgers){ $p=Join-GodModePath $r ('memory/'+$l); if(-not(Test-Path $p)){ New-Item -ItemType File -Force -Path $p | Out-Null } }; $r }
function Get-GodModeFileHash { param([string]$Path) if(Test-Path -LiteralPath $Path -PathType Leaf){ try{ (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant() }catch{$null} } else { $null } }
function Write-GodModeJsonAtomic { param([string]$Path,[Parameter(Mandatory=$true)]$InputObject) $dir=Split-Path -Parent $Path; Ensure-GodModeDirectory $dir; $lock=$Path+'.lock'; $start=Get-Date; while(Test-Path $lock){ if(((Get-Date)-$start).TotalSeconds -gt 10){ throw "lock timeout $lock" }; Start-Sleep -Milliseconds 100 }; Set-Content $lock (@{pid=$PID;created_at=Get-GodModeIso}|ConvertTo-Json -Compress) -Encoding UTF8; try{ $before=Get-GodModeFileHash $Path; $tmp=$Path+'.tmp-'+([guid]::NewGuid().ToString('N')); $json=$InputObject|ConvertTo-Json -Depth 40; $null=$json|ConvertFrom-Json; Set-Content -LiteralPath $tmp -Value $json -Encoding UTF8; Move-Item -LiteralPath $tmp -Destination $Path -Force; @{path=$Path;before_hash=$before;after_hash=(Get-GodModeFileHash $Path)} } finally { Remove-Item $lock -Force -ErrorAction SilentlyContinue } }
function Read-GodModeJson { param([string]$Path,$Default=$null) if(Test-Path $Path){ try{ Get-Content $Path -Raw -Encoding UTF8|ConvertFrom-Json }catch{ $Default } } else { $Default } }
function Add-GodModeJsonLine { param([string]$Path,[Parameter(Mandatory=$true)]$InputObject) Ensure-GodModeDirectory (Split-Path -Parent $Path); $line=$InputObject|ConvertTo-Json -Depth 30 -Compress; $null=$line|ConvertFrom-Json; Add-Content -LiteralPath $Path -Value $line -Encoding UTF8 }
function ConvertTo-GodModeProcessArgumentString { param([string[]]$Arguments=@())
  $parts=@()
  foreach($a in $Arguments){
    $s=[string]$a
    if($s -match '[\s"]') { $s='"' + ($s -replace '\\','\\' -replace '"','\"') + '"' }
    $parts += $s
  }
  return ($parts -join ' ')
}
function Invoke-GodModeNativeCommand { param([string]$FilePath,[string[]]$Arguments=@(),[string]$WorkingDirectory='.',[int]$TimeoutSeconds=20)
  $psi=New-Object Diagnostics.ProcessStartInfo
  $psi.FileName=$FilePath
  $psi.Arguments=ConvertTo-GodModeProcessArgumentString $Arguments
  $psi.WorkingDirectory=(Resolve-Path $WorkingDirectory).Path
  $psi.RedirectStandardOutput=$true; $psi.RedirectStandardError=$true; $psi.UseShellExecute=$false
  $proc=New-Object Diagnostics.Process; $proc.StartInfo=$psi
  if(-not $proc.Start()){ return @{exit_code=-1;stdout='';stderr='failed to start';timed_out=$false} }
  if(-not $proc.WaitForExit($TimeoutSeconds*1000)){ try{$proc.Kill()}catch{}; return @{exit_code=-2;stdout=$proc.StandardOutput.ReadToEnd();stderr=$proc.StandardError.ReadToEnd();timed_out=$true} }
  return @{exit_code=$proc.ExitCode;stdout=$proc.StandardOutput.ReadToEnd();stderr=$proc.StandardError.ReadToEnd();timed_out=$false}
}
function Get-GodModePackageSnapshot { param([string]$Project='.') $p=Join-Path (Resolve-GodModeProjectPath $Project) 'package.json'; if(-not(Test-Path $p)){ return @{exists=$false;scripts=@{}} }; $pkg=Get-Content $p -Raw|ConvertFrom-Json; $scripts=@{}; if($pkg.scripts){ $pkg.scripts.PSObject.Properties|%{$scripts[$_.Name]=[string]$_.Value} }; @{exists=$true;name=$pkg.name;scripts=$scripts;package_manager=$pkg.packageManager} }
function Get-GodModeDevServerCandidates { param([string]$Project='.') $pkg=Get-GodModePackageSnapshot $Project; $c=@(); if($pkg.exists){ foreach($k in $pkg.scripts.Keys){ if($k -match '^(dev|start|serve|preview)(:|$)' -or $k -eq 'dev:web'){ $c += @{command='npm';args=@('run',$k);script=$k;value=$pkg.scripts[$k]} } } }; $c }
function Get-GodModeValidationCommandCandidates { param([string]$Project='.') $pkg=Get-GodModePackageSnapshot $Project; $c=@(); foreach($k in @('typecheck','test','build','test:web','test:extension','build:web','build:extension')){ if($pkg.exists -and $pkg.scripts.ContainsKey($k)){ $c += @{command='npm';args=@('run',$k);script=$k;value=$pkg.scripts[$k]} } }; $c }
function New-GodModeCheckpoint { param([string]$Project='.',[string]$RunId=(New-GodModeRunId)) $r=Initialize-GodModeStructure $Project; $pp=Resolve-GodModeProjectPath $Project; $cp=Join-GodModePath $r ('checkpoints/'+$RunId); Ensure-GodModeDirectory $cp; foreach($rel in @('AGENTS.md','README.md','package.json','.codex/config.toml','.codex/hooks.json')){ $src=Join-Path $pp $rel; if(Test-Path $src -PathType Leaf){ Copy-Item $src (Join-Path $cp (($rel -replace '[\\/:]','__')+'.snapshot')) -Force } }; try{ $out=Invoke-GodModeNativeCommand git @('status','-sb') $pp 20; Set-Content (Join-Path $cp 'git-status.txt') ($out.stdout+$out.stderr) -Encoding UTF8 }catch{}; $m=@{schema_version=1;run_id=$RunId;created_at=Get-GodModeIso;project=$pp}; Write-GodModeJsonAtomic (Join-Path $cp 'checkpoint.json') $m|Out-Null; $m }

