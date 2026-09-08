<#
  PowerShell equivalent of the Makefile, for running the stack from
  PowerShell instead of WSL.

  Usage:  .\make.ps1 up
          .\make.ps1 smoke
          .\make.ps1 seed-stream
#>
param(
    [Parameter(Position = 0)]
    [ValidateSet('up','down','reset','cdc','seed-stream','batch','dbt','smoke','ps','logs','help')]
    [string]$Task = 'help'
)

$ErrorActionPreference = 'Stop'

function Invoke-Up {
    if (-not (Test-Path '.env')) {
        Copy-Item '.env.example' '.env'
        Write-Host 'created .env from .env.example' -ForegroundColor Yellow
    }
    docker compose up -d --build
    Write-Host 'waiting 45s for services to settle...' -ForegroundColor Cyan
    Start-Sleep -Seconds 45
    & "$PSScriptRoot\connect\register.ps1"
}

switch ($Task) {
    'up'          { Invoke-Up }
    'down'        { docker compose down }
    'reset'       { docker compose down -v; Invoke-Up }
    'cdc'         { & "$PSScriptRoot\connect\register.ps1" }
    'seed-stream' { python scripts\generate_activity.py --rate 2 }
    'batch'       { docker exec rs-airflow airflow dags trigger royal_batch_pipeline }
    'dbt'         { docker exec rs-airflow bash -c "cd /opt/dbt && dbt run --profiles-dir . && dbt test --profiles-dir ." }
    'smoke'       { & "$PSScriptRoot\scripts\smoke_test.ps1" }
    'ps'          { docker compose ps }
    'logs'        { docker compose logs -f --tail=50 }
    'help'        {
        Write-Host ''
        Write-Host '  .\make.ps1 up            bring the platform up and register CDC'
        Write-Host '  .\make.ps1 smoke         verify every layer is alive'
        Write-Host '  .\make.ps1 seed-stream   generate live OLTP activity'
        Write-Host '  .\make.ps1 batch         trigger the batch DAG'
        Write-Host '  .\make.ps1 dbt           dbt run + dbt test'
        Write-Host '  .\make.ps1 reset         wipe volumes and rebuild'
        Write-Host '  .\make.ps1 down          stop everything'
        Write-Host ''
    }
}
