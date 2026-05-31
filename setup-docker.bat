@echo off
echo ========================================
echo   Leonardo Cookie API - Docker Setup
echo ========================================
echo.

echo [1/3] Checking Docker...
docker --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker not found!
    echo Please install Docker Desktop first.
    echo Download: https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)
echo [OK] Docker found
echo.

echo [2/3] Starting PostgreSQL with Docker...
docker run -d ^
  --name leonardo-postgres ^
  -p 5432:5432 ^
  -e POSTGRES_PASSWORD=postgres ^
  -e POSTGRES_DB=leonardo_cookie_api ^
  postgres:16-alpine

if errorlevel 1 (
    echo [WARNING] Container might already exist, trying to start...
    docker start leonardo-postgres
)

echo.
echo Waiting for PostgreSQL to be ready...
timeout /t 5 /nobreak >nul
echo.

echo [3/3] Running migrations...
npm run migrate
echo.

echo Running seed (admin user)...
npm run seed
echo.

echo ========================================
echo   Setup Complete!
echo ========================================
echo.
echo PostgreSQL: localhost:5432
echo Database: leonardo_cookie_api
echo User: postgres
echo Password: postgres
echo.
echo Now you can run: npm run dev
echo.
pause
