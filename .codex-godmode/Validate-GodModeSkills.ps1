param([string]$Project='.')
$ErrorActionPreference='Continue'; [Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
$S=Split-Path -Parent $MyInvocation.MyCommand.Path
foreach($l in 'Common','TraceCrystal','Operational') { . (Join-Path $S "lib/GodMode.$l.ps1") }
$root=Initialize-GodModeStructure $Project; $projectPath=Resolve-GodModeProjectPath $Project
$skillDir=Join-GodModePath $root 'skills'; $blockers=@(); $skills=@(); $allowed=@('experimental','validated','deprecated','negative-skill')
foreach($f in Get-ChildItem -LiteralPath $skillDir -Filter '*.json' -ErrorAction SilentlyContinue | Where-Object {$_.Name -ne 'index.json'}){
  try{ $obj=Get-Content -LiteralPath $f.FullName -Raw -Encoding UTF8|ConvertFrom-Json }catch{ $blockers += "skill JSON parse failed $($f.Name): $($_.Exception.Message)"; continue }
  foreach($key in @('schema_version','id','name','status','success_count','failure_count','proof_refs')){ if(-not $obj.PSObject.Properties[$key]){ $blockers += "skill $($f.Name) missing $key" } }
  $st=[string](Get-GodModeProperty $obj 'status' '')
  if($st -notin $allowed){ $blockers += "skill $($f.Name) invalid status $st" }
  if($st -eq 'validated' -and @((Get-GodModeProperty $obj 'proof_refs' @())).Count -eq 0){ $blockers += "validated skill $($f.Name) has no proof_refs" }
  $skills += [ordered]@{id=Get-GodModeProperty $obj 'id' $f.BaseName;name=Get-GodModeProperty $obj 'name' $f.BaseName;status=$st;success_count=Get-GodModeProperty $obj 'success_count' 0;failure_count=Get-GodModeProperty $obj 'failure_count' 0;proof_refs=@(Get-GodModeProperty $obj 'proof_refs' @());path=$f.FullName}
}
$proposalRoot=Join-Path $projectPath '.agents\skills\proposed'; $proposalChecks=@()
if(Test-Path -LiteralPath $proposalRoot){ foreach($dir in Get-ChildItem -LiteralPath $proposalRoot -Directory -ErrorAction SilentlyContinue){ $md=Join-Path $dir.FullName 'SKILL.md'; if(-not(Test-Path -LiteralPath $md)){ $blockers += "proposed skill missing SKILL.md: $($dir.Name)"; continue }; $text=Get-Content -LiteralPath $md -Raw -Encoding UTF8; if($text.Trim().Length -lt 40){$blockers += "proposed skill too short: $($dir.Name)"}; $proposalChecks += [ordered]@{id=$dir.Name;path=$md;bytes=$text.Length} } } else { $blockers += 'proposed skill root missing .agents/skills/proposed' }
$status=if($blockers.Count){'failed'}else{'passed'}
$index=[ordered]@{schema_version=1;generated_at=Get-GodModeIso;status=$status;skills=$skills;proposed_skills=$proposalChecks;blockers=$blockers;note='Skill definitions are not auto-activated. Promotion requires proof_refs.'}
Write-GodModeJsonAtomic (Join-GodModePath $root 'skills/index.json') $index | Out-Null
Write-GodModeJsonAtomic (Join-GodModePath $root 'state/skill-forge-status.json') $index | Out-Null
$traceStatus=if($blockers.Count){'failed'}else{'success'}
Add-GodModeTraceSpan $Project 'skill-forge' 'validate-skills' $traceStatus @{status=$status;blockers=$blockers} 'validate_skills' 'HOST' 'Validate-GodModeSkills.ps1' $null @('skills/index.json') @('skills','skills/index.json') 'Skill Forge validation completed without auto-activation.' | Out-Null
Write-Host ("[SKILLS] {0} skills={1} proposals={2}" -f $status,$skills.Count,$proposalChecks.Count); $blockers|ForEach-Object{Write-Host "[BLOCKED] $_"}
if($blockers.Count){exit 1}else{exit 0}

