param([string]$Project='.')
& (Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) 'validate-system.ps1') -Project $Project
exit $LASTEXITCODE
