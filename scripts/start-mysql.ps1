# Start MySQL Server
$ErrorActionPreference = "SilentlyContinue"

# Check if port 3306 is already responding
$tcp = Test-NetConnection -ComputerName localhost -Port 3306 -WarningAction SilentlyContinue
if ($tcp.TcpTestSucceeded) {
    Write-Host "MySQL is already active and listening on port 3306." -ForegroundColor Green
    exit 0
}

Write-Host "Starting MySQL Server daemon on port 3306..." -ForegroundColor Cyan
$baseDir = Split-Path -Parent $PSScriptRoot
$mysqlExe = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqld.exe"
$cnfPath = Join-Path $baseDir ".mysql\my.cnf"

if (-not (Test-Path $mysqlExe)) {
    Write-Error "mysqld.exe not found at standard location: $mysqlExe"
    exit 1
}

Start-Process -FilePath $mysqlExe -ArgumentList "--defaults-file=`"$cnfPath`"", "--console" -WindowStyle Hidden
Start-Sleep -Seconds 3

$check = Test-NetConnection -ComputerName localhost -Port 3306 -WarningAction SilentlyContinue
if ($check.TcpTestSucceeded) {
    Write-Host "MySQL Server started successfully on port 3306!" -ForegroundColor Green
} else {
    Write-Host "MySQL process launched. Verify status in Task Manager or logs." -ForegroundColor Yellow
}
