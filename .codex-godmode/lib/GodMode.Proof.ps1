Set-StrictMode -Version 2.0

function New-GodModeProofBundle {
  param(
    [string]$Project='.',
    [string]$MissionId,
    [array]$Commands=@(),
    [array]$Files=@(),
    $BrowserValidation=$null,
    $LivePreview=$null,
    $WindowsRoute=$null
  )
  $h=@{}
  foreach($f in $Files){ $h[$f]=Get-GodModeFileHash (Join-Path (Resolve-GodModeProjectPath $Project) $f) }
  @{
    schema_version=1
    mission_id=$MissionId
    created_at=Get-GodModeIso
    worktree_path=''
    git_diff_hash=''
    files_before_hashes=@{}
    files_after_hashes=$h
    commands=$Commands
    browser_validation=$BrowserValidation
    live_preview=$LivePreview
    windows_route=$WindowsRoute
  }
}

function Save-GodModeProofBundle {
  param([string]$Project='.',[hashtable]$Proof)
  $r=Initialize-GodModeStructure $Project
  $p=Join-GodModePath $r ("traces/proof-$($Proof.mission_id).json")
  Write-GodModeJsonAtomic $p $Proof|Out-Null
  $p
}

function Get-GodModeLatestVisualAscensionProofPath {
  param([string]$Project='.')
  $r = Initialize-GodModeStructure $Project
  $proof = Get-ChildItem (Join-GodModePath $r 'logs') -Recurse -Filter 'visual-ascension-proof.json' -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1
  if ($proof) { return $proof.FullName }
  return $null
}

function Get-GodModeLatestBrowserProofPath {
  param([string]$Project='.')
  $r = Initialize-GodModeStructure $Project
  $proof = Get-ChildItem (Join-GodModePath $r 'logs') -Recurse -Filter 'browser-proof.json' -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1
  if ($proof) { return $proof.FullName }
  return $null
}

function Get-GodModeVisualSelectorState {
  param([string]$Project='.')
  $r = Initialize-GodModeStructure $Project
  $arenaHtml = Join-GodModePath $r 'arena/index.html'
  $liveHtml = Join-GodModePath $r 'live/live.html'
  $missionHtml = Join-GodModePath $r 'mission-control/index.html'
  $arena = if(Test-Path -LiteralPath $arenaHtml){ Get-Content -LiteralPath $arenaHtml -Raw -Encoding UTF8 }else{''}
  $live = if(Test-Path -LiteralPath $liveHtml){ Get-Content -LiteralPath $liveHtml -Raw -Encoding UTF8 }else{''}
  $mission = if(Test-Path -LiteralPath $missionHtml){ Get-Content -LiteralPath $missionHtml -Raw -Encoding UTF8 }else{''}
  $checks = [ordered]@{
    arena_hero = ($arena -match 'id=["'']arena-hero["'']')
    arena_verdict = ($arena -match 'id=["'']verdict["'']')
    arena_telemetry = ($arena -match 'id=["'']telemetry["'']')
    arena_safe_commands = ($arena -match 'id=["'']safeCommands["'']')
    arena_feedback = ($arena -match 'id=["'']feedback["'']')
    arena_agent_roster = ($arena -match 'id=["'']agentRoster["'']')
    ascension_theater = ($arena -match 'id=["'']ascensionTheater["'']')
    live_hero = ($live -match 'id=["'']liveHero["'']')
    live_verification_chain = ($live -match 'id=["'']verificationChain["'']')
    live_comment_toggle = ($live -match 'id=["'']toggleComments["'']')
    live_proof_json = ($live -match 'id=["'']proofs["'']')
    mission_control_safe_commands = ($mission -match 'id=["'']safeCommands["'']')
  }
  $missing = @()
  foreach($p in $checks.GetEnumerator()){ if(-not [bool]$p.Value){ $missing += $p.Key } }
  return [ordered]@{
    schema_version = 1
    status = if($missing.Count){'failed'}else{'passed'}
    checks = $checks
    missing = $missing
  }
}

function Get-GodModeScreenshotHashRecords {
  param(
    [string]$Project='.',
    [array]$Paths=@()
  )
  $records = @()
  foreach($raw in @($Paths)){
    $path = [string]$raw
    if([string]::IsNullOrWhiteSpace($path)){ continue }
    $exists = Test-Path -LiteralPath $path -PathType Leaf
    $bytes = 0
    if($exists){
      try { $bytes = [int64](Get-Item -LiteralPath $path).Length } catch { $bytes = 0 }
    }
    $hash = if($exists){ Get-GodModeFileHash $path }else{$null}
    $records += [ordered]@{
      path = $path
      exists = [bool]$exists
      bytes = $bytes
      sha256 = $hash
      non_blank_size = ($bytes -gt 20000)
    }
  }
  return @($records)
}

function Get-GodModeVisualProofPolicy {
  param([string]$Project='.')
  $r = Initialize-GodModeStructure $Project
  $visualProofPath = Get-GodModeLatestVisualAscensionProofPath $Project
  $browserProofPath = Get-GodModeLatestBrowserProofPath $Project
  $visualProof = if($visualProofPath){ Read-GodModeJson $visualProofPath $null }else{$null}
  $browserProof = if($browserProofPath){ Read-GodModeJson $browserProofPath $null }else{$null}
  $beauty = Read-GodModeJson (Join-GodModePath $r 'state/beauty-gate.json') ([ordered]@{})
  $selectors = Get-GodModeVisualSelectorState $Project

  $blockers = @()
  $optionalDegraded = @()

  $consoleCount = 999
  $clicked = $false
  $domSelectorsPassed = $false
  $externalDependencyClean = $false

  if($visualProof){
    $consoleCount = [int](Get-GodModeProperty $visualProof 'console_error_count' 999)
    $clicked = [bool](Get-GodModeProperty $visualProof 'clicked_comment_mode' $false)
    $externalDependencyClean = [bool](Get-GodModeProperty $visualProof 'no_external_runtime_dependency' $false)
    $obs = @(Get-GodModeProperty $visualProof 'observations' @())
    $domSelectorsPassed = ($obs.Count -ge 3 -and @($obs | Where-Object { -not [bool](Get-GodModeProperty $_ 'all_selectors_present' $false) }).Count -eq 0)
  }

  if($browserProof -and -not $visualProof){
    $consoleCount = [int](Get-GodModeProperty $browserProof 'console_error_count' 999)
    $clicked = [bool](Get-GodModeProperty $browserProof 'clicked_comment_mode' $false)
    $inApp = Get-GodModeProperty $browserProof 'in_app_proof' $null
    if($inApp){
      $domSelectorsPassed = [bool](Get-GodModeProperty $inApp 'all_required_checks_passed' $false)
      $externalDependencyClean = $true
    }
  }

  $domConsolePassed = ($domSelectorsPassed -and $clicked -and $consoleCount -eq 0 -and $externalDependencyClean)
  if(-not $domSelectorsPassed){ $blockers += 'browser_dom_selector_proof_missing_or_failed' }
  if(-not $clicked){ $blockers += 'comment_mode_click_proof_missing' }
  if($consoleCount -ne 0){ $blockers += "console_errors_nonzero:$consoleCount" }
  if(-not $externalDependencyClean){ $blockers += 'external_dependency_clean_proof_missing' }
  if((Get-GodModeProperty $selectors 'status' 'failed') -ne 'passed'){ $blockers += 'visual_structural_selectors_missing:' + (@(Get-GodModeProperty $selectors 'missing' @()) -join ',') }

  $codexScreenshotPaths = @()
  foreach($field in @('codex_browser_screenshots','in_app_screenshots','browser_use_screenshots')){
    foreach($p in @(Get-GodModeProperty $visualProof $field @())){ if($p){ $codexScreenshotPaths += [string]$p } }
  }
  $codexScreenshotHashes = @(Get-GodModeScreenshotHashRecords $Project $codexScreenshotPaths)
  $codexScreenshotPassed = (@($codexScreenshotHashes).Count -gt 0 -and @($codexScreenshotHashes | Where-Object { -not $_.exists -or -not $_.sha256 -or -not $_.non_blank_size }).Count -eq 0)

  $headlessPaths = @()
  foreach($p in @(Get-GodModeProperty $visualProof 'headless_screenshots' @())){ if($p){ $headlessPaths += [string]$p } }
  if(@($headlessPaths).Count -eq 0){
    foreach($p in @(Get-GodModeProperty $beauty 'screenshots' @())){ if($p){ $headlessPaths += [string]$p } }
  }
  $headlessHashes = @(Get-GodModeScreenshotHashRecords $Project $headlessPaths)
  $headlessPassed = (@($headlessHashes).Count -ge 3 -and @($headlessHashes | Where-Object { -not $_.exists -or -not $_.sha256 -or -not $_.non_blank_size }).Count -eq 0)
  if(-not $codexScreenshotPassed -and -not $headlessPassed){ $blockers += 'screenshot_proof_missing_or_unhashed' }

  $screenshotTimeout = [string](Get-GodModeProperty $visualProof 'in_app_screenshot_blocker' '')
  if([string]::IsNullOrWhiteSpace($screenshotTimeout)){ $screenshotTimeout = [string](Get-GodModeProperty $beauty 'in_app_screenshot_blocker' '') }
  if(-not [string]::IsNullOrWhiteSpace($screenshotTimeout)){ $optionalDegraded += "codex_browser_screenshot_timeout:$screenshotTimeout" }

  $routeStatuses = [ordered]@{
    codex_browser_screenshot = [ordered]@{
      status = if($codexScreenshotPassed){'passed'}elseif($screenshotTimeout){'degraded'}else{'not_proven'}
      screenshot_hashes = @($codexScreenshotHashes)
      blocker = if($codexScreenshotPassed){$null}elseif($screenshotTimeout){$screenshotTimeout}else{'no_codex_browser_screenshots_recorded'}
    }
    codex_browser_dom_console = [ordered]@{
      status = if($domConsolePassed){'passed'}else{'failed'}
      clicked_comment_mode = $clicked
      console_error_count = $consoleCount
      dom_selectors_passed = $domSelectorsPassed
      no_external_runtime_dependency = $externalDependencyClean
    }
    chrome_headless_screenshot_fallback = [ordered]@{
      status = if($headlessPassed){'passed'}else{'failed'}
      screenshot_hashes = @($headlessHashes)
    }
    degraded_no_screenshot = [ordered]@{
      status = if(-not $codexScreenshotPassed -and -not $headlessPassed){'active'}else{'inactive'}
    }
  }

  $selected = 'degraded_no_screenshot'
  if($codexScreenshotPassed){ $selected = 'codex_browser_screenshot' }
  elseif($domConsolePassed -and $headlessPassed){ $selected = 'chrome_headless_screenshot_fallback' }
  elseif($domConsolePassed){ $selected = 'codex_browser_dom_console' }

  $policyPassed = (($codexScreenshotPassed -or ($domConsolePassed -and $headlessPassed)) -and ((Get-GodModeProperty $selectors 'status' 'failed') -eq 'passed'))
  if($policyPassed){
    $blockers = @($blockers | Where-Object { $_ -ne 'screenshot_proof_missing_or_unhashed' })
  }

  return [ordered]@{
    schema_version = 1
    generated_at = Get-GodModeIso
    status = if($policyPassed){'passed'}else{'failed'}
    selected_visual_proof_route = $selected
    route_statuses = $routeStatuses
    visual_selectors = $selectors
    visual_proof_path = $visualProofPath
    browser_proof_path = $browserProofPath
    beauty_gate_path = (Join-GodModePath $r 'state/beauty-gate.json')
    in_app_screenshot_timeout_recorded = (-not [string]::IsNullOrWhiteSpace($screenshotTimeout))
    optional_degraded_evidence = @($optionalDegraded)
    blockers = @($blockers | Select-Object -Unique)
  }
}

function Update-GodModeVisualProofPolicy {
  param([string]$Project='.')
  $r = Initialize-GodModeStructure $Project
  $policy = Get-GodModeVisualProofPolicy $Project
  Write-GodModeJsonAtomic (Join-GodModePath $r 'state/visual-proof-policy.json') $policy | Out-Null
  return $policy
}
