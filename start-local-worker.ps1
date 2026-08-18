$ErrorActionPreference = "Stop"

# A changed .dev.vars file requires a real process restart. Stopping only
# workerd is insufficient because Wrangler can spawn it again with the old
# environment, so close every existing Wrangler layer bound to this port.
$wranglerProcesses = Get-CimInstance Win32_Process | Where-Object {
  $_.Name -eq "node.exe" -and
  $_.CommandLine -match "wrangler(.js)? dev" -and
  $_.CommandLine -match "(--port\s+8787|--port=8787)"
}
$listener = Get-NetTCPConnection -LocalPort 8787 -State Listen -ErrorAction SilentlyContinue
$processIds = @(
  $wranglerProcesses | Select-Object -ExpandProperty ProcessId
  $listener | Select-Object -ExpandProperty OwningProcess
) | Where-Object { $_ } | Sort-Object -Unique

if ($processIds.Count -gt 0) {
  Stop-Process -Id $processIds -Force -ErrorAction SilentlyContinue
  Start-Sleep -Milliseconds 800
}

$remainingListener = Get-NetTCPConnection -LocalPort 8787 -State Listen -ErrorAction SilentlyContinue
if ($remainingListener) {
  throw "Port 8787 is still occupied by PID $($remainingListener.OwningProcess)."
}

npx wrangler dev `
  --ip 0.0.0.0 `
  --port 8787 `
  --local-protocol https `
  --persist-to .wrangler/state `
  --env-file .env.local `
  --env-file .dev.vars
