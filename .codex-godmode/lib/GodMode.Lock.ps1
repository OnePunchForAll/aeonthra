Set-StrictMode -Version 2.0
function New-GodModeLock { param([string]$Path,[int]$TimeoutSeconds=10) $l=$Path+'.lock'; $s=Get-Date; while(Test-Path $l){ if(((Get-Date)-$s).TotalSeconds -gt $TimeoutSeconds){ throw "lock timeout: $l" }; Start-Sleep -Milliseconds 100 }; Set-Content $l (@{pid=$PID;created_at=(Get-Date).ToUniversalTime().ToString('o')}|ConvertTo-Json -Compress) -Encoding UTF8; $l }
function Remove-GodModeLock { param([string]$LockPath) Remove-Item $LockPath -Force -ErrorAction SilentlyContinue }
