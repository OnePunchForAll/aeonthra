param([string]$Project='.',[int]$ArenaPort=7374,[int]$LivePort=7474,[switch]$NoMissionControl)
$ErrorActionPreference='Continue'; [Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
$S = Split-Path -Parent $MyInvocation.MyCommand.Path
foreach($l in 'Common','Queue','Schema','Safety','TraceCrystal','Operational','Live','Health') { . (Join-Path $S "lib/GodMode.$l.ps1") }
$root = Initialize-GodModeStructure $Project
$projectPath = Resolve-GodModeProjectPath $Project
$runId = New-GodModeRunId
$registry = Get-GodModeProcessRegistry $Project
$components = @()
foreach($entry in @(Get-GodModeProperty $registry 'components' @())) { $components += $entry }
$blockers = @(); $started = @(); $reused = @()
$psExe = (Get-Process -Id $PID).Path
if ([string]::IsNullOrWhiteSpace($psExe)) { $psExe = 'powershell.exe' }
function Get-ExistingComponent([string]$Name) {
  foreach($entry in $script:components) {
    if ((Get-GodModeProperty $entry 'component' '') -eq $Name) {
      $probe = Test-GodModeProcessEntry $entry
      if ($probe.reusable) {
        if (-not (Get-GodModeProperty $entry 'pid' $null)) {
          $portValue = [int](Get-GodModeProperty $entry 'port' 0)
          if ($portValue -gt 0) {
            $listen = Get-GodModeListeningProcessInfo $portValue
            if ($listen.pid -and $listen.command_line -match '\.codex-godmode') {
              $copy = [ordered]@{}
              foreach($p in $entry.PSObject.Properties) { $copy[$p.Name] = $p.Value }
              $copy['pid'] = $listen.pid
              $copy['command'] = $listen.command_line
              $copy['status'] = 'reused_existing_owned_pid'
              return $copy
            }
          }
        }
        return $entry
      }
    }
  }
  return $null
}
function Start-ComponentServer([string]$Name,[string]$ScriptRel,[int]$Port,[string]$PathSuffix) {
  $existing = Get-ExistingComponent $Name
  if ($existing) { $script:reused += $Name; return $existing }
  $candidateUrl = "http://127.0.0.1:$Port/$PathSuffix"
  $candidateProbe = Invoke-GodModeHttpProbe $candidateUrl 2
  if ($candidateProbe.ok) {
    $script:reused += $Name
    $listen = Get-GodModeListeningProcessInfo $Port
    $adoptPid = $null
    $adoptCommand = 'adopted existing loopback server without pid'
    if ($listen.pid -and $listen.command_line -match '\.codex-godmode') { $adoptPid = $listen.pid; $adoptCommand = $listen.command_line }
    return [ordered]@{ component=$Name; pid=$adoptPid; port=$Port; url=$candidateUrl; bind_host='127.0.0.1'; script_path=(Join-GodModePath $script:root $ScriptRel); command=$adoptCommand; log=$null; error_log=$null; started_at=Get-GodModeIso; status=if($adoptPid){'reused_existing_owned_pid'}else{'reused_existing_no_pid'}; owned_by='aeonthra-godmode'; http_probe=$candidateProbe }
  }
  $scriptPath = Join-GodModePath $script:root $ScriptRel
  $log = Join-GodModePath $script:root ("logs/$Name-$script:runId.out.log")
  $err = Join-GodModePath $script:root ("logs/$Name-$script:runId.err.log")
  $argString = '-NoProfile -ExecutionPolicy Bypass -File "' + $scriptPath + '" -Port ' + $Port + ' -Project "' + $script:projectPath + '"'
  try {
    $proc = Start-Process -FilePath $script:psExe -ArgumentList $argString -WorkingDirectory $script:projectPath -WindowStyle Hidden -RedirectStandardOutput $log -RedirectStandardError $err -PassThru
    Start-Sleep -Milliseconds 900
    $portFile = if ($Name -eq 'arena') { Join-GodModePath $script:root 'state/arena-port.txt' } else { Join-GodModePath $script:root 'state/live-preview-port.txt' }
    $actualPort = $Port
    if (Test-Path -LiteralPath $portFile) { $raw = [string](Get-Content -LiteralPath $portFile -ErrorAction SilentlyContinue | Select-Object -First 1); if($raw.Trim()){ $actualPort = [int]$raw.Trim() } }
    $url = "http://127.0.0.1:$actualPort/$PathSuffix"
    $probe = Invoke-GodModeHttpProbe $url 8
    $entry = [ordered]@{ component=$Name; pid=$proc.Id; port=$actualPort; url=$url; bind_host='127.0.0.1'; script_path=$scriptPath; command="$script:psExe $argString"; log=$log; error_log=$err; started_at=Get-GodModeIso; status=if($probe.ok){'running'}else{'started_unhealthy'}; owned_by='aeonthra-godmode'; http_probe=$probe }
    $script:started += $Name
    $traceStatus = 'degraded'; if($probe.ok){ $traceStatus = 'success' }
    Add-GodModeTraceSpan $script:Project $script:runId "start-$Name" $traceStatus @{url=$url;pid=$proc.Id;probe=$probe} 'start_server' 'HOST' $entry.command $null @($log,$err) @($ScriptRel) "Started $Name loopback server." | Out-Null
    return $entry
  } catch {
    $script:blockers += "$Name startup failed: $($_.Exception.Message)"
    Add-GodModeTraceSpan $script:Project $script:runId "start-$Name" 'failed' @{error=$_.Exception.Message} 'start_server' 'HOST' $argString $null @($log,$err) @($ScriptRel) "Failed to start $Name." | Out-Null
    return [ordered]@{ component=$Name; pid=$null; port=$Port; url="http://127.0.0.1:$Port/$PathSuffix"; bind_host='127.0.0.1'; script_path=$scriptPath; command="$script:psExe $argString"; log=$log; error_log=$err; started_at=Get-GodModeIso; status='startup_failed'; owned_by='aeonthra-godmode'; error=$_.Exception.Message }
  }
}
$arena = Start-ComponentServer 'arena' 'arena/Start-Arena.ps1' $ArenaPort ''
$live = Start-ComponentServer 'live' 'live/Start-LivePreview.ps1' $LivePort 'live.html'
$newComponents = @($arena,$live)
$newComponents += [ordered]@{ component='mission-control'; pid=$null; port=$null; url=$null; status=if($NoMissionControl){'skipped'}else{'not_implemented_as_server'}; owned_by='aeonthra-godmode'; note='mission-control.ps1 is a CLI projection, not a persistent server.' }
$devServer = [ordered]@{ component='legacy-app-dev-server'; pid=$null; port=$null; url=$null; status='not_started'; owned_by='aeonthra-godmode'; note='No old app dev server is started by GodMode-only Start-GodMode.' }
if (Test-Path (Join-Path $projectPath 'package.json')) { $devServer.status='available_but_not_started'; $devServer.note='package.json exists; Start-GodMode intentionally does not start old app dev server without explicit request.' }
$newComponents += $devServer
$registryOut = [ordered]@{ schema_version=1; owner='aeonthra-godmode'; updated_at=Get-GodModeIso; run_id=$runId; components=$newComponents; startup_blockers=$blockers; shutdown_events=@(Get-GodModeProperty $registry 'shutdown_events' @()); started=$started; reused=$reused }
Save-GodModeProcessRegistry $Project $registryOut | Out-Null
if ($arena.port) { Set-Content -LiteralPath (Join-GodModePath $root 'state/arena-port.txt') -Value ([string]$arena.port) -Encoding UTF8 }
if ($live.port) { Set-Content -LiteralPath (Join-GodModePath $root 'state/live-preview-port.txt') -Value ([string]$live.port) -Encoding UTF8; Set-Content -LiteralPath (Join-GodModePath $root 'state/latest-result.url') -Value $live.url -Encoding UTF8 }
Update-GodModeHealth $Project 'VERIFIED-OPERATIONAL-PHASE3' @($blockers) @($blockers) @{ current_arena_port=[string]$arena.port; current_live_preview_port=[string]$live.port; live_result_status='running'; process_registry='state/process-registry.json' } | Out-Null
Update-GodModeLiveResult $Project @{ status=if($blockers.Count){'DEGRADED'}else{'VERIFIED-OPERATIONAL-PHASE3'}; headline='Aeonthra GodMode control plane started'; live_url=$live.url; arena_url=$arena.url; browser_status='not browser-verified by Start-GodMode'; what_changed=@("Started/reused Live Result Viewer: $($live.url)","Started/reused Arena: $($arena.url)"); what_still_failed=@($blockers); next_repair_action='Run Status-GodMode.ps1 then Run-GodModeValidation.ps1.'; process_registry='state/process-registry.json' } | Out-Null
Write-Host "[START] Live Result Viewer: $($live.url)"
Write-Host "[START] Arena: $($arena.url)"
if ($blockers.Count) { $blockers | ForEach-Object { Write-Host "[BLOCKED] $_" }; exit 1 }
exit 0




