param([string]$Project='.',[int]$ArenaPort=7374,[int]$LivePort=7474,[int]$MissionControlPort=7575,[switch]$NoMissionControl)
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
function Start-ComponentServer([string]$Name,[string]$ScriptRel,[int]$Port,[string]$PathSuffix,[string]$PortFileRel) {
  $existing = Get-ExistingComponent $Name
  if ($existing) { $script:reused += $Name; return $existing }
  $candidateUrl = "http://127.0.0.1:$Port/$PathSuffix"
  $candidateProbe = Invoke-GodModeHttpProbe $candidateUrl 2
  if ($candidateProbe.ok) {
    $listen = Get-GodModeListeningProcessInfo $Port
    if ($listen.pid -and $listen.command_line -match '\.codex-godmode') {
      $script:reused += $Name
      return [ordered]@{ component=$Name; pid=$listen.pid; port=$Port; url=$candidateUrl; bind_host='127.0.0.1'; script_path=(Join-GodModePath $script:root $ScriptRel); command=$listen.command_line; log=$null; error_log=$null; started_at=Get-GodModeIso; status='reused_existing_owned_pid'; owned_by='aeonthra-godmode'; http_probe=$candidateProbe }
    }
    $script:blockers += "$Name port $Port already serves HTTP but is not an AEONTHRA-owned .codex-godmode process."
    return [ordered]@{ component=$Name; pid=$listen.pid; port=$Port; url=$candidateUrl; bind_host='127.0.0.1'; script_path=(Join-GodModePath $script:root $ScriptRel); command=$listen.command_line; log=$null; error_log=$null; started_at=Get-GodModeIso; status='blocked_port_in_use_not_owned'; owned_by='unknown'; http_probe=$candidateProbe }
  }
  $scriptPath = Join-GodModePath $script:root $ScriptRel
  $log = Join-GodModePath $script:root ("logs/$Name-$script:runId.out.log")
  $err = Join-GodModePath $script:root ("logs/$Name-$script:runId.err.log")
  $argString = '-NoProfile -ExecutionPolicy Bypass -File "' + $scriptPath + '" -Port ' + $Port + ' -Project "' + $script:projectPath + '"'
  try {
    $proc = Start-Process -FilePath $script:psExe -ArgumentList $argString -WorkingDirectory $script:projectPath -WindowStyle Hidden -RedirectStandardOutput $log -RedirectStandardError $err -PassThru
    Start-Sleep -Milliseconds 900
    $portFile = Join-GodModePath $script:root $PortFileRel
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
$arena = Start-ComponentServer 'arena' 'arena/Start-Arena.ps1' $ArenaPort '' 'state/arena-port.txt'
$live = Start-ComponentServer 'live' 'live/Start-LivePreview.ps1' $LivePort 'live.html' 'state/live-preview-port.txt'
$missionControl = if($NoMissionControl){ [ordered]@{ component='mission-control'; pid=$null; port=$null; url=$null; status='skipped'; owned_by='aeonthra-godmode'; note='Mission Control skipped by -NoMissionControl.' } } else { Start-ComponentServer 'mission-control' 'mission-control/Start-MissionControl.ps1' $MissionControlPort '' 'state/mission-control-port.txt' }
$newComponents = @($arena,$live,$missionControl)
$devServer = [ordered]@{ component='legacy-app-dev-server'; pid=$null; port=$null; url=$null; status='not_started'; owned_by='aeonthra-godmode'; note='No old app dev server is started by GodMode-only Start-GodMode.' }
if (Test-Path (Join-Path $projectPath 'package.json')) { $devServer.status='available_but_not_started'; $devServer.note='package.json exists; Start-GodMode intentionally does not start old app dev server without explicit request.' }
$newComponents += $devServer
$registryOut = [ordered]@{ schema_version=1; owner='aeonthra-godmode'; updated_at=Get-GodModeIso; run_id=$runId; components=$newComponents; startup_blockers=$blockers; shutdown_events=@(Get-GodModeProperty $registry 'shutdown_events' @()); started=$started; reused=$reused }
Save-GodModeProcessRegistry $Project $registryOut | Out-Null
if ($arena.port) { Set-Content -LiteralPath (Join-GodModePath $root 'state/arena-port.txt') -Value ([string]$arena.port) -Encoding UTF8 }
if ($live.port) { Set-Content -LiteralPath (Join-GodModePath $root 'state/live-preview-port.txt') -Value ([string]$live.port) -Encoding UTF8; Set-Content -LiteralPath (Join-GodModePath $root 'state/latest-result.url') -Value $live.url -Encoding UTF8 }
if ($missionControl.port) { Set-Content -LiteralPath (Join-GodModePath $root 'state/mission-control-port.txt') -Value ([string]$missionControl.port) -Encoding UTF8; Set-Content -LiteralPath (Join-GodModePath $root 'state/mission-control.url') -Value $missionControl.url -Encoding UTF8 }
Update-GodModeHealth $Project 'STARTED-PHASE5' @($blockers) @($blockers) @{ current_arena_port=[string]$arena.port; current_live_preview_port=[string]$live.port; current_mission_control_port=[string]$missionControl.port; mission_control_url=$missionControl.url; live_result_status='running'; process_registry='state/process-registry.json' } | Out-Null
Update-GodModeLiveResult $Project @{ status=if($blockers.Count){'DEGRADED'}else{'STARTED-PHASE5'}; headline='Aeonthra GodMode control plane started'; live_url=$live.url; arena_url=$arena.url; mission_control_url=$missionControl.url; browser_status='not browser-verified by Start-GodMode'; what_changed=@("Started/reused Live Result Viewer: $($live.url)","Started/reused Arena: $($arena.url)","Started/reused Mission Control: $($missionControl.url)"); what_still_failed=@($blockers); next_repair_action='Run Status-GodMode.ps1 then Run-GodModeValidation.ps1.'; process_registry='state/process-registry.json' } | Out-Null
Write-Host "[START] Live Result Viewer: $($live.url)"
Write-Host "[START] Arena: $($arena.url)"
Write-Host "[START] Mission Control: $($missionControl.url)"
if ($blockers.Count) { $blockers | ForEach-Object { Write-Host "[BLOCKED] $_" }; exit 1 }
exit 0




