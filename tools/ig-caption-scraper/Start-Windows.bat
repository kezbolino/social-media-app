@echo off
REM Double-click this file to start the Instagram Caption Grabber.
REM It opens the tool in your web browser. Keep the window that appears open
REM while you use it; close it when you're done.

cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   Node.js needs to be installed first ^(one-time, free^).
  echo   Opening the download page in your browser...
  echo   Install the big green "LTS" version, then double-click this file again.
  echo.
  start "" "https://nodejs.org/en/download"
  pause
  exit /b 1
)

node server.js
pause
