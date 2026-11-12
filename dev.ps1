# ============================================================
#  AI Study Planner — One-Command Dev Launcher
#  Usage: .\dev.ps1
#         .\dev.ps1 -SkipMysql    (if MySQL is already running)
# ============================================================
param(
    [switch]$SkipMysql
)

$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot

# ── Helpers ─────────────────────────────────────────────────
function Write-Step($msg) {
    Write-Host "`n▶  $msg" -ForegroundColor Cyan
}
function Write-Ok($msg) {
    Write-Host "   ✔  $msg" -ForegroundColor Green
}
function Write-Warn($msg) {
    Write-Host "   ⚠  $msg" -ForegroundColor Yellow
}
function Wait-Port($port, $timeoutSec = 30) {
    $deadline = (Get-Date).AddSeconds($timeoutSec)
    while ((Get-Date) -lt $deadline) {
        $ok = (Test-NetConnection -ComputerName localhost -Port $port -WarningAction SilentlyContinue).TcpTestSucceeded
        if ($ok) { return $true }
        Start-Sleep -Milliseconds 500
    }
    return $false
}

# ── 0. Environment Setup ─────────────────────────────────────
$envFile = Join-Path $Root ".env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#") -and ($line -match '^\s*([A-Za-z_0-9]+)\s*=\s*(.*)$')) {
            $name = $matches[1]
            $val = $matches[2].Trim(' "''')
            if (-not [Environment]::GetEnvironmentVariable($name, 'Process')) {
                [Environment]::SetEnvironmentVariable($name, $val, 'Process')
            }
        }
    }
}

if (-not $env:JWT_SECRET) {
    $userJwt = [Environment]::GetEnvironmentVariable('JWT_SECRET', 'User')
    if (-not $userJwt) {
        $userJwt = [Environment]::GetEnvironmentVariable('JWT_SECRET', 'Machine')
    }
    if ($userJwt) {
        $env:JWT_SECRET = $userJwt
    } else {
        $genSecret = [guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')
        $env:JWT_SECRET = $genSecret
        try {
            [Environment]::SetEnvironmentVariable('JWT_SECRET', $genSecret, 'User')
            Add-Content -Path $envFile -Value "JWT_SECRET=$genSecret" -ErrorAction SilentlyContinue
        } catch {}
    }
}

# ── 1. MySQL ─────────────────────────────────────────────────
if (-not $SkipMysql) {
    Write-Step "Starting MySQL 8.0..."

    $alreadyUp = (Test-NetConnection -ComputerName localhost -Port 3306 -WarningAction SilentlyContinue).TcpTestSucceeded
    if ($alreadyUp) {
        Write-Ok "MySQL is already running on port 3306."
    } else {
        $mysqlExe  = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqld.exe"
        $cnfPath   = Join-Path $Root ".mysql\my.cnf"

        if (-not (Test-Path $mysqlExe)) {
            Write-Error "mysqld.exe not found at: $mysqlExe`nInstall MySQL 8.0 or run with -SkipMysql if using a system service."
            exit 1
        }

        Start-Process -FilePath $mysqlExe `
            -ArgumentList "--defaults-file=`"$cnfPath`"", "--console" `
            -WindowStyle Hidden

        Write-Host "   Waiting for MySQL to accept connections..." -ForegroundColor DarkGray
        $ready = Wait-Port 3306 -timeoutSec 30
        if ($ready) {
            Write-Ok "MySQL is ready on port 3306."
        } else {
            Write-Warn "MySQL did not respond within 30 s. The backend may fail to connect."
        }
    }
} else {
    Write-Warn "Skipping MySQL startup (-SkipMysql flag set)."
}

# ── 2. Backend (Spring Boot) ──────────────────────────────────
Write-Step "Starting Spring Boot backend (port 8080)..."
$backendDir = Join-Path $Root "backend"
$backendCmd = "`$env:JWT_SECRET='$($env:JWT_SECRET)'; cd '$backendDir'; mvn spring-boot:run"
Start-Process powershell `
    -ArgumentList "-NoExit", "-Command", $backendCmd `
    -WindowStyle Normal

Write-Host "   Waiting for Spring Boot to accept connections on port 8080..." -ForegroundColor DarkGray
$backendReady = Wait-Port 8080 -timeoutSec 45
if ($backendReady) {
    Write-Ok "Backend is ready on port 8080."
} else {
    Write-Warn "Backend did not respond within 45 s. Check the backend PowerShell window for startup errors."
}

# ── 3. Frontend (Vite) ────────────────────────────────────────
Write-Step "Starting Vite frontend (port 5173)..."
$frontendDir = Join-Path $Root "frontend"
Start-Process powershell `
    -ArgumentList "-NoExit", "-Command", "cd '$frontendDir'; npm run dev" `
    -WindowStyle Normal

# ── Done ──────────────────────────────────────────────────────
Write-Host ""
Write-Host "══════════════════════════════════════════════" -ForegroundColor DarkGray
Write-Host "  AI Study Planner is starting up!" -ForegroundColor White
Write-Host ""
Write-Host "  Frontend  →  http://localhost:5173" -ForegroundColor Cyan
Write-Host "  Backend   →  http://localhost:8080" -ForegroundColor Cyan
Write-Host "  MySQL     →  localhost:3306" -ForegroundColor Cyan
Write-Host ""
Write-Host "  To stop everything, run:  .\stop.ps1" -ForegroundColor Yellow
Write-Host "══════════════════════════════════════════════" -ForegroundColor DarkGray
Write-Host ""
