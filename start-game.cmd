@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 22 or newer is required. Install it from https://nodejs.org/
  pause
  exit /b 1
)
echo Open http://localhost:4173/ in your browser.
echo Keep this window open while playing. Press Ctrl+C to stop.
node scripts/serve.mjs %*
pause
