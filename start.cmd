@echo off
rem Double-click launcher for Windows.
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required to run Edith but wasn't found on this PC.
  echo Install it from https://nodejs.org and run this again.
  pause
  exit /b 1
)

node server.mjs
echo.
pause
