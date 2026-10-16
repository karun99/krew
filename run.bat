@echo off
rem KREW - Windows launcher. Runs the KREW CLI (core\krew.ts).
setlocal
set "KREW_ROOT=%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js >= 18 is required to run KREW.
  echo        Install it from https://nodejs.org
  exit /b 1
)

node "%KREW_ROOT%core\krew.ts" %*
endlocal
