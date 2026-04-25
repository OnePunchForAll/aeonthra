Set-StrictMode -Version 2.0
function Invoke-GodModeRealityRouter {
  param([string]$Project='.')
  $r=Initialize-GodModeStructure $Project
  $chrome=Get-Command chrome -ErrorAction SilentlyContinue|select -First 1
  $edge=Get-Command msedge -ErrorAction SilentlyContinue|select -First 1
  $pkg=Get-GodModePackageSnapshot $Project
  $pw=Test-Path (Join-Path (Resolve-GodModeProjectPath $Project) 'node_modules/playwright')
  $latestIab = Get-ChildItem (Join-GodModePath $r 'logs') -Recurse -Filter 'browser-proof.json' -ErrorAction SilentlyContinue | Where-Object { $_.FullName -match 'browser-proof-iab' } | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  $latestAny = Get-ChildItem (Join-GodModePath $r 'logs') -Recurse -Filter 'browser-proof.json' -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  $route=if($latestIab){'codex_browser_use_iab'}elseif($chrome){'chrome_headless_static'}elseif($edge){'edge_headless_static'}elseif($pw){'playwright_project'}else{'static_preview'}
  $degraded=@()
  if(-not $latestIab){$degraded+='codex_browser_use_not_proven'}
  $h=@{schema_version=1;generated_at=Get-GodModeIso;browser_use_probe=if($latestIab){'proof_bundle_recorded'}else{'not_available_in_shell_context'};browser_use_active=[bool]$latestIab;playwright_available=$pw;chrome_available=[bool]$chrome;chrome_path=if($chrome){$chrome.Source}else{$null};edge_available=[bool]$edge;edge_path=if($edge){$edge.Source}else{$null};selected_browser_route=$route;selected_live_route='loopback_static_viewer';selected_artifact_route='latest_validation_or_dashboard';browser_mode=if($latestIab){'codex_in_app_browser'}elseif($chrome -or $edge){'devtools'}else{'static_preview'};computer_use_mode='not_required_unavailable_on_windows';app_has_web_ui=($pkg.scripts.ContainsKey('dev:web') -or $pkg.scripts.ContainsKey('dev'));latest_browser_proof=if($latestAny){$latestAny.FullName}else{$null};degraded_reasons=$degraded;blockers=@()}
  Write-GodModeJsonAtomic (Join-GodModePath $r 'state/reality-router.json') $h|Out-Null
  return $h
}
