@echo off
rem KREW - Windows installer.
rem One-time setup: checks prerequisites, creates runtime directories
rem (config defaults, zones, logs). Idempotent - safe to re-run.
setlocal
set "KREW_ROOT=%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js >= 18 is required but was not found.
  echo        Install it from https://nodejs.org and re-run this script.
  exit /b 1
)

mkdir "%KREW_ROOT%zones" "%KREW_ROOT%logs" >nul
mkdir "%KREW_ROOT%config" >nul

echo KREW installed. Runtime directories ready.
echo Next: run 'run.bat' to launch the KREW CLI.
endlocal
