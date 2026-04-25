param([string]$Project='.',[switch]$NoIngest)
$ErrorActionPreference='Continue'; [Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
$S = Split-Path -Parent $MyInvocation.MyCommand.Path
foreach($l in 'Common','Queue','Schema','Safety','TraceCrystal','Operational','CodexRouter','Live') { . (Join-Path $S "lib/GodMode.$l.ps1") }
$root = Initialize-GodModeStructure $Project
$projectPath = Resolve-GodModeProjectPath $Project
$stamp = (Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssZ')
$missionId = "worker-smoke-$stamp"
$logDir = Join-GodModePath $root "logs/worker-smoke-$stamp"; Ensure-GodModeDirectory $logDir
$schemaPath = Join-GodModePath $root 'schemas/worker-output.schema.json'
$runSchemaPath = Join-Path $logDir 'worker-output.schema.json'
try {
  $schemaObject = Get-Content -LiteralPath $schemaPath -Raw -Encoding UTF8 | ConvertFrom-Json
  $schemaObject.properties.mission_id | Add-Member -NotePropertyName enum -NotePropertyValue @($missionId) -Force
  [IO.File]::WriteAllText($runSchemaPath, ($schemaObject | ConvertTo-Json -Depth 40), [Text.UTF8Encoding]::new($false))
} catch { $runSchemaPath = $schemaPath }
$resultPath = Join-GodModePath $root "inbox/results/$missionId.json"
$stdoutLog = Join-Path $logDir 'codex-stdout.jsonl'; $stderrLog = Join-Path $logDir 'codex-stderr.txt'
$router = Invoke-GodModeCodexRouter $Project
$blockers = @(); $status = 'degraded'; $cmdText = ''
if (-not (Get-GodModeProperty $router 'codex_cli_installed' $false)) { $blockers += 'codex CLI not installed or not on PATH' }
if (-not (Get-GodModeProperty $router 'codex_exec_exists' $false)) { $blockers += 'codex exec unavailable' }
if (-not (Get-GodModeProperty $router 'codex_exec_output_schema_available' $false)) { $blockers += 'codex exec --output-schema unavailable' }
if (-not (Test-Path -LiteralPath $schemaPath)) { $blockers += 'worker output schema missing' }
if ($blockers.Count -eq 0) {
  $prompt = @"
You are the AEONTHRA SUMMARIZER worker in a smoke test.
Return ONLY a JSON object matching the provided schema.
Mission id EXACTLY: $missionId
Set the JSON field mission_id to EXACTLY this value: $missionId
Agent role: SUMMARIZER
Rules: read-only; do not patch files; do not mutate shared ledgers; do not claim browser proof; include verified/unverified/rejected claims and exact blockers.
Task: Summarize the local GodMode-only repo shape from the prompt context and report that this worker smoke produced schema-constrained output if successful.
"@
  $codexPath = Get-GodModeProperty $router 'codex_cli_path' $null
  $args = @('exec','--json','--sandbox','read-only','--ephemeral','-C',$projectPath,'--output-schema',$runSchemaPath,'--output-last-message',$resultPath,$prompt)
  $cmdText = 'codex ' + ($args -join ' ')
  try {
    $argString = ConvertTo-GodModeProcessArgumentString $args
    $proc = Start-Process -FilePath $codexPath -ArgumentList $argString -WorkingDirectory $projectPath -RedirectStandardOutput $stdoutLog -RedirectStandardError $stderrLog -WindowStyle Hidden -PassThru
    if (-not $proc.WaitForExit(120000)) {
      try { & taskkill.exe /T /F /PID $proc.Id | Out-Null } catch { try { Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue } catch {} }
      $blockers += 'codex exec worker smoke timed out after 120 seconds'
    } else {
      $procExit = $proc.ExitCode
      if ($null -ne $procExit -and $procExit -ne 0) { $blockers += "codex exec exit code $procExit" }
    }
    if (-not (Test-Path -LiteralPath $resultPath)) { $blockers += 'codex did not write output-last-message result file' }
    else {
      $schema = Test-GodModeJsonLite $resultPath (Get-GodModeSchemaRequiredKeys 'result')
      if (-not $schema.ok) { $blockers += ('result schema lite failed: ' + ($schema.errors -join ',')) }
      else {
        $result = Get-Content -LiteralPath $resultPath -Raw -Encoding UTF8 | ConvertFrom-Json
        if ([string]$result.mission_id -ne $missionId) { $blockers += ('result mission_id mismatch: ' + [string]$result.mission_id) }
        $safe = Test-GodModeResultSafety $result $Project
        if (-not $safe.ok) { $blockers += ('result safety failed: ' + ($safe.errors -join ',')) } elseif ($blockers.Count -eq 0) { $status = 'passed' }
      }
    }
  } catch { $blockers += $_.Exception.Message }
}
if ($status -eq 'passed' -and -not $NoIngest) {
  try { & (Join-Path $S 'master-controller.ps1') -Project $Project -Mode safe -Once -NoSpawn -NoBrowser -NoWorker -NoPatch; if($LASTEXITCODE -ne 0){ $blockers += ('master ingest exit code ' + $LASTEXITCODE); $status='degraded' } } catch { $blockers += ('master ingest failed: ' + $_.Exception.Message); $status='degraded' }
}
$smoke = [ordered]@{ schema_version=1; created_at=Get-GodModeIso; status=$status; mission_id=$missionId; result_path=$resultPath; stdout_log=$stdoutLog; stderr_log=$stderrLog; command=$cmdText; route=Get-GodModeProperty $router 'structured_worker_route' 'unknown'; blockers=$blockers }
Write-GodModeJsonAtomic (Join-GodModePath $root 'state/worker-smoke.json') $smoke | Out-Null
$traceStatus = 'degraded'; if($status -eq 'passed'){ $traceStatus = 'success' }
Add-GodModeTraceSpan $Project $missionId 'run-worker-smoke' $traceStatus @{smoke=$smoke} 'run_worker' 'SUMMARIZER' $cmdText $null @($resultPath,$stdoutLog,$stderrLog) @('schemas/worker-output.schema.json',$runSchemaPath,'inbox/results') 'Worker smoke completed or degraded with exact blockers.' | Out-Null
Update-GodModeLiveResult $Project @{ status=if($status -eq 'passed'){'VERIFIED-OPERATIONAL-PHASE4'}else{'DEGRADED'}; headline='Worker smoke completed'; latest_proof_bundle=$resultPath; proof_bundles=@($resultPath); what_changed=@("Worker smoke status: $status"); what_still_failed=$blockers; next_repair_action=if($status -eq 'passed'){'Run Run-GodModeValidation.ps1.'}else{'Inspect state/worker-smoke.json and codex stderr log.'} } | Out-Null
Write-Host ("[WORKER] {0} {1}" -f $status,$resultPath)
if ($status -eq 'passed') { exit 0 } else { exit 1 }




