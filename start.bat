@echo off
title Startup Blueprint Agent - Launcher
color 0A

echo ============================================
echo   Startup Blueprint Agent - Starting...
echo ============================================
echo.

:: Start Backend Server
echo [1/2] Starting Backend Server (port 8000)...
start "Backend - FastAPI" cmd /k "cd /d %~dp0 && call venv\Scripts\activate.bat && cd backend && uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

:: Wait a moment for backend to initialize
timeout /t 5 /nobreak >nul

:: Start Frontend Server
echo [2/2] Starting Frontend Server (port 5173)...
start "Frontend - Vite" cmd /k "cd /d %~dp0 && cd frontend && npx vite"

echo.
echo ============================================
echo   Both servers are starting!
echo.
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:8000
echo ============================================
echo.
echo   Opening app in browser in 5 seconds...
timeout /t 5 /nobreak >nul
start http://localhost:5173
echo.
echo   You can close this window now.
echo   To stop servers, close the Backend and Frontend terminal windows.
pause
