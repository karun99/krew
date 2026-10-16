@echo off
rem KREW - command-line wrapper. Delegates to the KREW CLI core.
setlocal
set "KREW_ROOT=%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js >= 18 is required to run KREW.
  exit /b 1
)

node "%KREW_ROOT%core\krew.ts" %*
endlocal
