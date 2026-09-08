# Registers the Debezium CDC connector. Safe to re-run.
$ErrorActionPreference = 'Stop'
$Connect = 'http://localhost:8083'
$ConfigPath = Join-Path $PSScriptRoot 'debezium-postgres.json'

Write-Host 'waiting for Kafka Connect...' -ForegroundColor Cyan
$ready = $false
for ($i = 0; $i -lt 40; $i++) {
    try {
        Invoke-RestMethod -Uri "$Connect/connectors" -TimeoutSec 3 | Out-Null
        $ready = $true; break
    } catch { Start-Sleep -Seconds 3 }
}
if (-not $ready) { throw "Kafka Connect did not come up at $Connect" }

try {
    Invoke-RestMethod -Method Delete -Uri "$Connect/connectors/royalsquare-cdc" | Out-Null
} catch { }

# -Infile avoids PowerShell re-encoding the JSON body
Invoke-RestMethod -Method Post -Uri "$Connect/connectors" `
    -ContentType 'application/json' -InFile $ConfigPath | ConvertTo-Json -Depth 5

Start-Sleep -Seconds 5
Write-Host "`nconnector status:" -ForegroundColor Cyan
Invoke-RestMethod -Uri "$Connect/connectors/royalsquare-cdc/status" | ConvertTo-Json -Depth 5
