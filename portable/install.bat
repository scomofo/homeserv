@echo off
setlocal enabledelayedexpansion

echo.
echo  ╔══════════════════════════════════════════╗
echo  ║       HomeServ Portable Installer        ║
echo  ║       Home Server Dashboard              ║
echo  ╚══════════════════════════════════════════╝
echo.

:: Check for Docker
where docker >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Docker is not installed or not in PATH.
    echo.
    echo Please install Docker Desktop from:
    echo   https://www.docker.com/products/docker-desktop/
    echo.
    echo After installing, restart your terminal and run this script again.
    pause
    exit /b 1
)

:: Check Docker is running
docker info >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Docker is not running.
    echo.
    echo Please start Docker Desktop and try again.
    pause
    exit /b 1
)

echo [OK] Docker is installed and running.
echo.

:: Determine script directory (USB root)
set "SCRIPT_DIR=%~dp0"

:: ── Load or build the image ──

:: Option 1: Pre-built image tar (preferred — fast, no build needed)
if exist "%SCRIPT_DIR%homeserv-image.tar" (
    echo [INFO] Found pre-built image. Loading...
    docker load -i "%SCRIPT_DIR%homeserv-image.tar"
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Failed to load Docker image.
        pause
        exit /b 1
    )
    echo [OK] Image loaded successfully.
    goto :image_ready
)

:: Option 2: Build from source (fallback — copies source to local temp first)
if exist "%SCRIPT_DIR%app\Dockerfile" (
    echo [INFO] No pre-built image found. Building from source...
    echo [INFO] Copying source to local temp directory...

    :: Copy to a local path Docker can always access
    set "BUILD_DIR=%TEMP%\homeserv-build"
    if exist "!BUILD_DIR!" rmdir /s /q "!BUILD_DIR!"
    mkdir "!BUILD_DIR!"
    xcopy /s /q /y "%SCRIPT_DIR%app" "!BUILD_DIR!\app\" >nul

    echo [INFO] Building Docker image (this may take a few minutes)...
    docker build --no-cache -t homeserv:latest -f "!BUILD_DIR!\app\Dockerfile" "!BUILD_DIR!\app"
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Docker build failed.
        rmdir /s /q "!BUILD_DIR!" >nul 2>nul
        pause
        exit /b 1
    )

    rmdir /s /q "!BUILD_DIR!" >nul 2>nul
    echo [OK] Image built successfully.
    goto :image_ready
)

:: Neither found
echo [ERROR] No homeserv-image.tar or app\Dockerfile found.
echo         Make sure you're running this from the HomeServ USB directory.
pause
exit /b 1

:image_ready
echo.

:: ── Generate config ──

set "INSTALL_DIR=%USERPROFILE%\.homeserv"
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"

if not exist "%INSTALL_DIR%\.env" (
    echo [INFO] Generating configuration...

    for /f "delims=" %%i in ('powershell -Command "[Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])"') do set "JWT_SECRET=%%i"

    (
        echo # HomeServ Configuration
        echo JWT_SECRET=!JWT_SECRET!
        echo HOMESERV_PORT=3001
        echo VNC_WS_PORT=3002
        echo VNC_HOST=host.docker.internal
        echo VNC_PORT=5900
    ) > "%INSTALL_DIR%\.env"

    echo [OK] Config created at %INSTALL_DIR%\.env
) else (
    echo [OK] Using existing config at %INSTALL_DIR%\.env
)

:: ── Write docker-compose.yml ──
:: Always write a fresh one using the loaded image (no build context needed)

(
    echo services:
    echo   homeserv:
    echo     image: homeserv:latest
    echo     container_name: homeserv
    echo     restart: unless-stopped
    echo     ports:
    echo       - "${HOMESERV_PORT:-3001}:3001"
    echo       - "${VNC_WS_PORT:-3002}:3002"
    echo     volumes:
    echo       - homeserv-data:/app/data
    echo     environment:
    echo       - NODE_ENV=production
    echo       - PORT=3001
    echo       - JWT_SECRET=${JWT_SECRET}
    echo       - VNC_HOST=${VNC_HOST:-host.docker.internal}
    echo       - VNC_PORT=${VNC_PORT:-5900}
    echo       - VNC_WS_PORT=3002
    echo     extra_hosts:
    echo       - "host.docker.internal:host-gateway"
    echo     cap_add:
    echo       - NET_RAW
    echo volumes:
    echo   homeserv-data:
    echo     driver: local
) > "%INSTALL_DIR%\docker-compose.yml"

echo.
echo [INFO] Starting HomeServ...

:: Stop any existing instance
docker compose -f "%INSTALL_DIR%\docker-compose.yml" --env-file "%INSTALL_DIR%\.env" down >nul 2>nul

:: Start
docker compose -f "%INSTALL_DIR%\docker-compose.yml" --env-file "%INSTALL_DIR%\.env" up -d

if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to start HomeServ.
    pause
    exit /b 1
)

echo.
echo  ╔══════════════════════════════════════════╗
echo  ║       HomeServ is running!               ║
echo  ║                                          ║
echo  ║   Open: http://localhost:3001            ║
echo  ║                                          ║
echo  ║   Config: %USERPROFILE%\.homeserv        ║
echo  ╚══════════════════════════════════════════╝
echo.

:: Open browser
start http://localhost:3001

pause
