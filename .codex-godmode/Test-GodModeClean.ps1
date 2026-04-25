param([string]$Project='.')
$ErrorActionPreference='Continue'; [Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
$S=Split-Path -Parent $MyInvocation.MyCommand.Path
foreach($l in 'Common','Queue','TraceCrystal','Operational') { . (Join-Path $S "lib/GodMode.$l.ps1") }
$root=Initialize-GodModeStructure $Project
$projectPath=Resolve-GodModeProjectPath $Project
$blockers=@(); $warnings=@(); $remediation=@()
function Add-Blocker([string]$m){$script:blockers+=$m}
function Add-Warning([string]$m){$script:warnings+=$m}
function Is-RuntimeArtifact([string]$Path){
  $p=$Path -replace '\\','/'
  if($p -eq '.codex-godmode/state/STOP.example'){ return $false }
  return ($p -match '^\.codex-godmode/(logs|checkpoints|archive|worktrees|traces|events|feedback|inbox)/' -or
    $p -match '^\.codex-godmode/queues/(active|done|failed|pending)/' -or
    $p -match '^\.codex-godmode/state/.*\.(json|txt|lock)$' -or
    $p -match '^\.codex-godmode/live/(result-state\.json|preview-history\.jsonl|visual-feedback-events\.jsonl)$' -or
    $p -match '^\.codex-godmode/memory/.*\.jsonl$' -or
    $p -match '^\.codex-godmode/arena/(deity-manifest\.json|lore-ledger\.jsonl)$' -or
    $p -match '^\.codex-godmode/.*\.(png|jpg|jpeg|webp|zip)$' -or
    $p -match '^\.codex-godmode/.*\.jsonl$')
}
$branch=''; try{$branch=(& git -C $projectPath branch --show-current).Trim()}catch{Add-Blocker "git branch probe failed: $($_.Exception.Message)"}
$gitStatus=@(); try{$gitStatus=@(& git -C $projectPath status --porcelain=v1)}catch{Add-Blocker "git status probe failed: $($_.Exception.Message)"}
$trackedRuntime=@(); try{ foreach($f in @(& git -C $projectPath ls-files)){ if(Is-RuntimeArtifact $f){$trackedRuntime+=$f} } }catch{Add-Blocker "git ls-files probe failed: $($_.Exception.Message)"}
if($trackedRuntime.Count){ Add-Blocker ('Runtime artifacts are tracked: ' + (($trackedRuntime|Select-Object -First 10) -join ', ')); $remediation += 'git rm --cached <tracked-runtime-artifact> ; keep source/config files only' }
$cached=@(); try{$cached=@(& git -C $projectPath diff --cached --name-status)}catch{}
$stagedRuntime=@(); $stagedDeletes=@()
foreach($line in $cached){ if([string]::IsNullOrWhiteSpace($line)){continue}; $parts=$line -split "`t"; $status=$parts[0]; $path=$parts[-1]; if(Is-RuntimeArtifact $path){$stagedRuntime+=$path}; if($status -match 'D'){ $stagedDeletes+=$path } }
if($stagedRuntime.Count){ Add-Blocker ('Runtime artifacts are staged: ' + (($stagedRuntime|Select-Object -First 10)-join ', ')); $remediation += 'git restore --staged <runtime-artifact>' }
if($stagedDeletes.Count){ Add-Blocker ('Staged deletions detected: ' + (($stagedDeletes|Select-Object -First 10)-join ', ')); $remediation += 'git restore --staged <deleted-path> ; git restore <deleted-path>' }
$workingDeletes=@()
foreach($line in $gitStatus){ if($line.Length -ge 4){ $xy=$line.Substring(0,2); $path=$line.Substring(3); if($xy -match 'D' -and -not (Is-RuntimeArtifact $path)){ $workingDeletes+=$path } } }
if($workingDeletes.Count){ Add-Blocker ('Working-tree source deletions detected: ' + (($workingDeletes|Select-Object -First 10)-join ', ')); $remediation += 'git restore <deleted-source-path>' }
$rootGitignore=Join-Path $projectPath '.gitignore'; $godGitignore=Join-GodModePath $root '.gitignore'
$rootText=if(Test-Path $rootGitignore){Get-Content $rootGitignore -Raw -Encoding UTF8}else{''}
$godText=if(Test-Path $godGitignore){Get-Content $godGitignore -Raw -Encoding UTF8}else{''}
foreach($pat in @('.codex-godmode/logs/','.codex-godmode/checkpoints/','.codex-godmode/traces/','.codex-godmode/inbox/','.codex-godmode/state/*.json','.codex-godmode/state/*.txt','.codex-godmode/live/visual-feedback-events.jsonl','.codex-godmode/queues/pending/')){ if($rootText -notmatch [regex]::Escape($pat)){ Add-Blocker "root .gitignore missing $pat" } }
foreach($pat in @('logs/','checkpoints/','traces/','inbox/','state/*.json','state/*.txt','live/visual-feedback-events.jsonl','queues/pending/')){ if($godText -notmatch [regex]::Escape($pat)){ Add-Blocker ".codex-godmode/.gitignore missing $pat" } }
$requiredScripts=@('Start-GodMode.ps1','Stop-GodMode.ps1','Status-GodMode.ps1','Run-GodModeValidation.ps1','Run-BrowserProof.ps1','Run-WorkerSmoke.ps1','Run-TraceCrystal.ps1','Invoke-GodModeDoctor.ps1','Test-GodModeClean.ps1','Resolve-FailedMissions.ps1','Process-VisualFeedback.ps1','Validate-GodModeRules.ps1','Enable-GodModeRules.ps1','Disable-GodModeRules.ps1','Validate-GodModeHooks.ps1','Enable-GodModeHooks.ps1','Disable-GodModeHooks.ps1','Validate-GodModeSkills.ps1','Promote-GodModeSkill.ps1')
foreach($script in $requiredScripts){ $path=Join-GodModePath $root $script; if(-not(Test-Path -LiteralPath $path -PathType Leaf)){ Add-Blocker "missing daily/source script $script" } }
$parseFailures=@()
foreach($ps in Get-ChildItem -LiteralPath $root -Filter '*.ps1' -Recurse -ErrorAction SilentlyContinue){ $tokens=$null;$errors=$null;[System.Management.Automation.Language.Parser]::ParseFile($ps.FullName,[ref]$tokens,[ref]$errors)|Out-Null; if($errors -and $errors.Count){$parseFailures += "$($ps.FullName): $($errors[0].Message)"} }
if($parseFailures.Count){ Add-Blocker ('PowerShell parse failures: ' + (($parseFailures|Select-Object -First 5)-join '; ')); $remediation += 'Fix parser errors reported by Test-GodModeClean.ps1' }
$registryPath=Join-GodModePath $root 'state/process-registry.json'
if(Test-Path -LiteralPath $registryPath){ try{Get-Content $registryPath -Raw -Encoding UTF8|ConvertFrom-Json|Out-Null}catch{Add-Blocker "process-registry.json invalid JSON: $($_.Exception.Message)"} }
foreach($sample in @('.codex-godmode/logs/probe.log','.codex-godmode/checkpoints/probe/.keep','.codex-godmode/traces/probe.trace.jsonl','.codex-godmode/feedback/feedback-resolution-report.md','.codex-godmode/inbox/results/probe.json','.codex-godmode/state/process-registry.json','.codex-godmode/state/mission-control-port.txt','.codex-godmode/live/visual-feedback-events.jsonl','.codex-godmode/queues/pending/probe.json')){
  try { $out=& git -C $projectPath check-ignore $sample 2>$null; if($LASTEXITCODE -ne 0){ Add-Blocker "runtime ignore probe not ignored: $sample" } } catch { Add-Blocker "git check-ignore failed for $sample" }
}
if($gitStatus.Count){ Add-Warning ('Git working tree has source/config changes: ' + (($gitStatus|Select-Object -First 12)-join ' | ')); $remediation += 'git diff --stat ; review source changes before staging' }
$status='CLEAN'
if($blockers.Count){$status='DIRTY-UNSAFE'}elseif($gitStatus.Count){$status='DIRTY-BUT-SAFE'}
if(-not $branch){$status='BLOCKED'}
if($status -eq 'CLEAN'){$remediation += 'No remediation needed.'}
elseif($status -eq 'DIRTY-BUT-SAFE'){$remediation += 'When ready: git add <source-files-only>; git diff --cached --stat'}
elseif($status -eq 'DIRTY-UNSAFE'){$remediation += 'Do not commit until blockers above are cleared.'}
else{$remediation += 'Restore Git availability and rerun Test-GodModeClean.ps1.'}
$result=[ordered]@{schema_version=1;generated_at=Get-GodModeIso;status=$status;branch=$branch;git_status=$gitStatus;tracked_runtime_artifacts=$trackedRuntime;staged_runtime_artifacts=$stagedRuntime;staged_deletions=$stagedDeletes;working_tree_deletions=$workingDeletes;warnings=$warnings;blockers=$blockers;remediation_commands=$remediation}
Write-GodModeJsonAtomic (Join-GodModePath $root 'state/clean-doctor.json') $result | Out-Null
$traceStatus = if($blockers.Count){'failed'}else{'success'}
Add-GodModeTraceSpan $Project 'clean-doctor' 'clean-doctor' $traceStatus @{status=$status;blockers=$blockers} 'clean_doctor' 'HOST' 'Test-GodModeClean.ps1' $null @('state/clean-doctor.json') @('state/clean-doctor.json') 'Git hygiene and runtime artifact tracking checked.' | Out-Null
Write-Host $status
Write-Host ("Branch: {0}" -f $branch)
if($warnings.Count){Write-Host 'WARNINGS:'; $warnings|ForEach-Object{Write-Host " - $_"}}
if($blockers.Count){Write-Host 'BLOCKERS:'; $blockers|ForEach-Object{Write-Host " - $_"}}
Write-Host 'REMEDIATION:'; $remediation|ForEach-Object{Write-Host " - $_"}
if($status -in @('CLEAN','DIRTY-BUT-SAFE')){exit 0}else{exit 1}
