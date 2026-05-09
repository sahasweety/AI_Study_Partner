@echo off
echo ====================================
echo   AI Study Partner - Start All
echo ====================================
echo.

REM Kill any existing node processes
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 >nul

echo [1/2] Starting Backend Server (port 5000)...
start "AI Study Partner - Backend" cmd /k "cd /d C:\Users\USER\Desktop\my_project\backend && node src/index.js"

echo Waiting 3 seconds for backend to start...
timeout /t 3 >nul

echo [2/2] Starting Frontend Server (port 3000)...
start "AI Study Partner - Frontend" cmd /k "cd /d C:\Users\USER\Desktop\my_project\frontend && npm run dev"

echo.
echo ====================================
echo  Both servers are starting!
echo.
echo  - Frontend: http://localhost:3000
echo  - Backend:  http://localhost:5000
echo.
echo  Open http://localhost:3000 in your browser
echo ====================================
echo.
timeout /t 5 >nul
start "" "http://localhost:3000"
