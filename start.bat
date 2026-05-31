@echo off
echo ========================================
echo   Leonardo Cookie API - Quick Start
echo ========================================
echo.

echo [1/4] Checking leonardo_cookies.json...
if not exist "..\leonardo_cookies.json" (
    echo [ERROR] leonardo_cookies.json not found!
    echo Expected location: C:\Tools\canva leonardo\leonardo_cookies.json
    pause
    exit /b 1
)
echo [OK] leonardo_cookies.json found
echo.

echo [2/4] Checking Docker...
docker --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker not found!
    echo Please install Docker Desktop first.
    pause
    exit /b 1
)
echo [OK] Docker found
echo.

echo [3/4] Starting services with Docker Compose...
docker-compose up -d
echo.

echo Waiting for services to be ready...
timeout /t 10 /nobreak >nul
echo.

echo [4/4] Running database migrations...
docker-compose exec -T app npm run migrate
echo.

echo Running database seed (admin user)...
docker-compose exec -T app npm run seed
echo.

echo ========================================
echo   Setup Complete!
echo ========================================
echo.
echo API URL: http://localhost:3000
echo Web UI: http://localhost:3000/ui
echo Health: http://localhost:3000/health
echo.
echo Auth Method: Cookies (7 accounts)
echo.
echo Default Admin Login:
echo   Email: admin@example.com
echo   Password: admin123
echo.
echo Commands:
echo   View logs: docker-compose logs -f
echo   Stop: docker-compose down
echo   Restart: docker-compose restart
echo.
echo Opening Web UI in browser...
timeout /t 2 /nobreak >nul
start http://localhost:3000/ui
echo.
pause
