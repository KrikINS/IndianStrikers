# Script to start Cloud SQL Auth Proxy for Indian Strikers
# Instance: project-9c12c6c8-cfd5-47ed-bfc:asia-south1:strikers-pulse-db
# Local Port: 5433

Write-Host "Attempting to start Cloud SQL Auth Proxy..." -ForegroundColor Cyan

if (-not (Test-Path ".\cloud-sql-proxy.exe")) {
    Write-Error "cloud-sql-proxy.exe not found in the current directory."
    exit 1
}

.\cloud-sql-proxy.exe --port 5433 project-9c12c6c8-cfd5-47ed-bfc:asia-south1:strikers-pulse-db
