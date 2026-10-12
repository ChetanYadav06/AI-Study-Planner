# Stop local MySQL Server
$ErrorActionPreference = "SilentlyContinue"

$mysqlAdmin = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqladmin.exe"
if (Test-Path $mysqlAdmin) {
    & $mysqlAdmin -u root shutdown
    Write-Host "Sent shutdown signal to MySQL server." -ForegroundColor Yellow
} else {
    Stop-Process -Name mysqld -Force -ErrorAction SilentlyContinue
    Write-Host "Stopped mysqld process." -ForegroundColor Yellow
}
