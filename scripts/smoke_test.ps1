# Verifies every layer of the stack. Run after .\make.ps1 up
$pass = 0; $fail = 0
$envPath = Join-Path $PSScriptRoot '..\.env'
$pgUser = 'rs'
if (Test-Path $envPath) {
    $userLine = Get-Content $envPath | Where-Object { $_ -match '^PG_USER=' } | Select-Object -First 1
    if ($userLine) { $pgUser = ($userLine -split '=', 2)[1].Trim() }
}

function Check {
    param([string]$Name, [scriptblock]$Test)
    try {
        $result = & $Test
        if ($LASTEXITCODE -ne 0 -and $null -ne $LASTEXITCODE) { throw 'non-zero exit' }
        if ($result -eq $false) { throw 'returned false' }
        Write-Host "  PASS  $Name" -ForegroundColor Green
        $script:pass++
    } catch {
        Write-Host "  FAIL  $Name" -ForegroundColor Red
        $script:fail++
    }
}

function Test-Url { param([string]$Url)
    try { Invoke-WebRequest -Uri $Url -TimeoutSec 5 -UseBasicParsing | Out-Null; $true }
    catch { $false }
}

Write-Host '--- infrastructure ---'
Check 'postgres accepting connections' { docker exec rs-postgres pg_isready -U $pgUser 2>&1 | Out-Null; $LASTEXITCODE -eq 0 }
Check 'redpanda cluster healthy'       { docker exec rs-redpanda rpk cluster health 2>&1 | Out-Null; $LASTEXITCODE -eq 0 }
Check 'minio reachable'                { Test-Url 'http://localhost:9000/minio/health/live' }
Check 'kafka connect up'               { Test-Url 'http://localhost:8083/' }
Check 'airflow web up'                 { Test-Url 'http://localhost:8081/health' }
Check 'redis responding'               { (docker exec rs-redis redis-cli ping) -match 'PONG' }
Check 'api healthy'                    { Test-Url 'http://localhost:8000/health' }

Write-Host '--- data flow ---'
Check 'seed data loaded' {
    $n = docker exec rs-postgres psql -U $pgUser -d royalsquare -tAc 'SELECT count(*) FROM ops.policies'
    [int]$n -gt 0
}
Check 'cdc connector running' {
    (Invoke-RestMethod 'http://localhost:8083/connectors/royalsquare-cdc/status').connector.state -eq 'RUNNING'
}
Check 'cdc topics exist' {
    (docker exec rs-redpanda rpk topic list) -match 'rs.ops.claims'
}
Check 'stream view populated' {
    (docker exec rs-redis redis-cli exists claims:stage_counts) -match '1'
}

Write-Host ''
Write-Host "passed: $pass   failed: $fail"
if ($fail -gt 0) { exit 1 }
