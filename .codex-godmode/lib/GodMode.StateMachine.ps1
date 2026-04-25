Set-StrictMode -Version 2.0
function Get-GodModeMissionTransitions { @{queued=@('claimed');claimed=@('spawning');spawning=@('running','failed');running=@('browser_observing','validating','failed','blocked');browser_observing=@('validating','failed','blocked');validating=@('completed','failed','blocked');completed=@('archived','replay');failed=@('replay','archived');blocked=@('replay','archived')} }
function Test-GodModeMissionTransition { param([string]$From,[string]$To) $t=Get-GodModeMissionTransitions; $t.ContainsKey($From) -and ($t[$From] -contains $To) }
