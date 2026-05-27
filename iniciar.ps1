param([switch]$Dev)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$nodeDir = "$env:TEMP\node-portable\node-v20.19.0-win-x64"

Write-Host "=== Triviahoot - Inicio Rapido ===" -ForegroundColor Cyan

# Detener cualquier servidor anterior
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# Verificar/descargar Node portable
if (!(Test-Path "$nodeDir\node.exe")) {
    Write-Host "[1/4] Descargando Node.js portable..." -ForegroundColor Yellow
    $url = "https://nodejs.org/dist/v20.19.0/node-v20.19.0-win-x64.zip"
    $zip = "$env:TEMP\node-portable.zip"
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::ExtractToDirectory($zip, "$env:TEMP\node-portable")
    Remove-Item $zip
    Write-Host "  Done" -ForegroundColor Green
}

$env:Path = "$nodeDir;$env:Path"
[Environment]::SetEnvironmentVariable("Path", "$nodeDir;$env:Path", "Process")
$npm = "$nodeDir\node_modules\corepack\dist\npm.js"

Write-Host "Node: $(& $nodeDir\node.exe --version)" -ForegroundColor Green

# Instalar dependencias si hace falta
if (!(Test-Path "$ProjectRoot\server\node_modules")) {
    Write-Host "[2/4] Instalando dependencias del servidor..." -ForegroundColor Yellow
    Push-Location "$ProjectRoot\server"
    & $nodeDir\node.exe $npm install | Out-Null
    Pop-Location
    Write-Host "  Done" -ForegroundColor Green
}

if (!(Test-Path "$ProjectRoot\client\node_modules")) {
    Write-Host "[3/4] Instalando dependencias del cliente..." -ForegroundColor Yellow
    Push-Location "$ProjectRoot\client"
    & $nodeDir\node.exe $npm install | Out-Null
    Pop-Location
    Write-Host "  Done" -ForegroundColor Green
}

# Compilar frontend si no existe
if (!(Test-Path "$ProjectRoot\client\dist")) {
    Write-Host "[4/4] Compilando frontend..." -ForegroundColor Yellow
    Push-Location "$ProjectRoot\client"
    & $nodeDir\node.exe $npm run build | Out-Null
    Pop-Location
    Write-Host "  Done" -ForegroundColor Green
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Triviahoot iniciado!" -ForegroundColor Green
Write-Host "  Abre: http://localhost:3000" -ForegroundColor White
Write-Host "  Ctrl+C para detener" -ForegroundColor Yellow
Write-Host "========================================`n" -ForegroundColor Cyan

Set-Location "$ProjectRoot\server"
& $nodeDir\node.exe src/index.js
