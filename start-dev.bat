@echo off
title NoteGenie Dev Server
cd /d "%~dp0"

echo.
echo  NoteGenie - Starting...
echo  ======================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo  ERROR: Node.js is not installed or not in PATH.
  echo  Download from https://nodejs.org and install LTS, then try again.
  echo.
  pause
  exit /b 1
)

if not exist "server\node_modules\" (
  echo  Installing server dependencies...
  call npm install --prefix server
  if errorlevel 1 goto failed
)

if not exist "client\node_modules\" (
  echo  Installing client dependencies...
  call npm install --prefix client
  if errorlevel 1 goto failed
)

if not exist ".env" (
  echo  WARNING: .env file missing. Copy .env.example to .env and fill in values.
  echo.
)

echo  Starting API + frontend...
echo  Keep this window OPEN while you use the app.
echo  Press Ctrl+C to stop.
echo.

call npm run dev
if errorlevel 1 goto failed
echo.
echo  Dev server stopped.
goto end

:failed
echo.
echo  Setup failed. Fix the errors above and run this file again.
echo.

:end
pause
