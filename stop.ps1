# ============================================================
#  AI Study Planner — Stop All Services
#  Usage: .\stop.ps1
# ============================================================

$ErrorActionPreference = "SilentlyContinue"

function Write-Step($msg) { Write-Host "`n▶  $msg" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "   ✔  $msg" -ForegroundColor Green }

# ── 1. Kill Spring Boot (any java process running our app) ────
Write-Step "Stopping Spring Boot backend..."
$java = Get-Process -Name "java" -ErrorAction SilentlyContinue
if ($java) {
    $java | Stop-Process -Force
    Write-Ok "Stopped Java / Spring Boot process(es)."
} else {
    Write-Host "   –  No Java process found." -ForegroundColor DarkGray
}

# ── 2. Kill Vite dev server ───────────────────────────────────
Write-Step "Stopping Vite frontend..."
# Vite runs under node.exe; kill processes listening on 5173
$vite = Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty OwningProcess -ErrorAction SilentlyContinue
if ($vite) {
    Stop-Process -Id $vite -Force -ErrorAction SilentlyContinue
    Write-Ok "Stopped Vite dev server (port 5173)."
} else {
    Write-Host "   –  No process found on port 5173." -ForegroundColor DarkGray
}

# ── 3. Stop MySQL ─────────────────────────────────────────────
Write-Step "Stopping MySQL server..."
$mysqlAdmin = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqladmin.exe"
if (Test-Path $mysqlAdmin) {
    & $mysqlAdmin -u root shutdown 2>$null
    Write-Ok "Sent graceful shutdown signal to MySQL."
} else {
    Stop-Process -Name "mysqld" -Force -ErrorAction SilentlyContinue
    Write-Ok "Killed mysqld process."
}

Write-Host ""
Write-Host "  All services stopped." -ForegroundColor Green
Write-Host ""
