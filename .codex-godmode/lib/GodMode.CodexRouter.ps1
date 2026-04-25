Set-StrictMode -Version 2.0
function Get-GodModeCodexExecutable {
  $commands = @(Get-Command -All codex -ErrorAction SilentlyContinue)
  foreach($c in $commands){ if($c.CommandType -eq 'Application' -and $c.Source -match '\.(cmd|exe)$'){ return $c.Source } }
  foreach($c in $commands){ if($c.CommandType -eq 'Application'){ return $c.Source } }
  foreach($c in $commands){ if($c.Source){ return $c.Source } }
  return $null
}
function Invoke-GodModeCodexRouter {
  param([string]$Project='.')
  $r=Initialize-GodModeStructure $Project
  $path=Get-GodModeCodexExecutable
  $ver=$null; $exec=$false; $json=$false; $schema=$false; $app=$false; $blockers=@()
  if($path){
    try { $v=Invoke-GodModeNativeCommand $path @('--version') (Resolve-GodModeProjectPath $Project) 15; if($v.exit_code -eq 0){$ver=($v.stdout+$v.stderr).Trim()}else{$blockers += "codex --version exit $($v.exit_code): $($v.stderr)"} } catch { $blockers += $_.Exception.Message }
    try { $h=Invoke-GodModeNativeCommand $path @('exec','--help') (Resolve-GodModeProjectPath $Project) 20; $txt=$h.stdout+$h.stderr; if($h.exit_code -eq 0){$exec=$true}; if($txt -match '--json'){$json=$true}; if($txt -match '--output-schema'){$schema=$true}; if($h.exit_code -ne 0){$blockers += "codex exec --help exit $($h.exit_code): $($h.stderr)"} } catch { $blockers += $_.Exception.Message }
    try { $a=Invoke-GodModeNativeCommand $path @('app-server','--help') (Resolve-GodModeProjectPath $Project) 8; if($a.exit_code -eq 0){$app=$true} } catch {}
  }
  $router=@{schema_version=1;generated_at=Get-GodModeIso;codex_app_installed='unknown';codex_app_version=$null;codex_cli_installed=[bool]$path;codex_cli_path=$path;codex_cli_version=$ver;codex_command_executes=[bool]$ver;codex_exec_exists=$exec;codex_exec_json_available=$json;codex_exec_output_schema_available=$schema;codex_exec_readonly_probe='not_run_to_avoid_worker_call';codex_app_server_exists=$app;project_trusted='unknown';current_surface='codex_app_or_cli_unknown';structured_worker_route=if($exec -and $schema){'codex_exec_output_schema'}elseif($exec){'codex_exec_manual_schema'}else{'dry_run_agent_skeleton'};visual_browser_route='reality_router';degraded_reasons=@();blockers=$blockers}
  if(-not $exec){$router.degraded_reasons+='codex_exec_not_verified'}
  Write-GodModeJsonAtomic (Join-GodModePath $r 'state/codex-router.json') $router|Out-Null
  return $router
}
