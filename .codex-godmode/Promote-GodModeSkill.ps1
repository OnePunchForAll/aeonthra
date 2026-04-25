param([string]$Project='.',[Parameter(Mandatory=$true)][string]$SkillId,[Parameter(Mandatory=$true)][string]$ProofRef,[ValidateSet('validated','deprecated','negative-skill','experimental')][string]$Status='validated')
$ErrorActionPreference='Continue'; [Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
$S=Split-Path -Parent $MyInvocation.MyCommand.Path
foreach($l in 'Common','TraceCrystal','Operational') { . (Join-Path $S "lib/GodMode.$l.ps1") }
$root=Initialize-GodModeStructure $Project
$path=Join-GodModePath $root "skills/$SkillId.json"
if(-not(Test-Path -LiteralPath $path)){Write-Host "[SKILLS] missing skill $SkillId"; exit 1}
if([string]::IsNullOrWhiteSpace($ProofRef)){Write-Host '[SKILLS] ProofRef is required for promotion.'; exit 1}
$obj=Get-Content -LiteralPath $path -Raw -Encoding UTF8|ConvertFrom-Json
$map=[ordered]@{}; foreach($p in $obj.PSObject.Properties){$map[$p.Name]=$p.Value}
$proofs=@(Get-GodModeProperty $obj 'proof_refs' @()); $proofs += $ProofRef
$map['status']=$Status; $map['confidence_status']=$Status; $map['proof_refs']=@($proofs|Select-Object -Unique); $map['success_count']=[int](Get-GodModeProperty $obj 'success_count' 0)+1; $map['updated_at']=Get-GodModeIso; $map['auto_activate']=$false
Write-GodModeJsonAtomic $path $map | Out-Null
& (Join-Path $S 'Validate-GodModeSkills.ps1') -Project $Project | Out-Null
Add-GodModeTraceSpan $Project 'skill-forge' 'promote-skill' 'success' @{skill_id=$SkillId;status=$Status;proof_ref=$ProofRef} 'promote_skill' 'HOST' 'Promote-GodModeSkill.ps1' 0 @($ProofRef) @($path) 'Skill promoted in source catalog only; no auto-activation performed.' | Out-Null
Write-Host "[SKILLS] promoted $SkillId to $Status with proof $ProofRef"
exit 0

