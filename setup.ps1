# Advanced setup (Windows). Invoked by install.bat; optional.
# Creates runtime directories and seeds default configuration files.
$ErrorActionPreference = 'Stop'
$KrewRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Error 'Node.js >= 18 is required to run KREW. Install it from https://nodejs.org.'
}

New-Item -ItemType Directory -Force -Path (Join-Path $KrewRoot 'zones') | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $KrewRoot 'logs') | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $KrewRoot 'config') | Out-Null

Write-Host 'KREW installed. Runtime directories ready.'
Write-Host "Next: run 'run.bat' to launch the KREW CLI."
