@echo off
setlocal

echo.
echo  ╔══════════════════════════════════════════╗
echo  ║     HomeServ USB Package Builder         ║
echo  ╚══════════════════════════════════════════╝
echo.

set "ROOT=%~dp0"
set "OUTPUT=%ROOT%homeserv-usb"

:: Check Docker
where docker >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Docker required to build. Install Docker Desktop first.
    pause
    exit /b 1
)

docker info >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Docker is not running. Start Docker Desktop first.
    pause
    exit /b 1
)

:: Clean output
if exist "%OUTPUT%" rmdir /s /q "%OUTPUT%"
mkdir "%OUTPUT%"
mkdir "%OUTPUT%\app"

echo [1/4] Building Docker image...
docker build --no-cache -t homeserv:latest -f "%ROOT%app\Dockerfile" "%ROOT%app"
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Docker build failed.
    pause
    exit /b 1
)
echo [OK] Image built.

echo.
echo [2/4] Exporting Docker image (this may take a minute)...
docker save homeserv:latest -o "%OUTPUT%\homeserv-image.tar"
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to export image.
    pause
    exit /b 1
)

:: Show size
for %%A in ("%OUTPUT%\homeserv-image.tar") do (
    set "SIZE=%%~zA"
)
echo [OK] Image exported (%SIZE% bytes).

echo.
echo [3/4] Copying install scripts and config...

:: Copy portable scripts
copy /y "%ROOT%portable\install.bat" "%OUTPUT%\install.bat" >nul
copy /y "%ROOT%portable\install.sh" "%OUTPUT%\install.sh" >nul
copy /y "%ROOT%portable\uninstall.bat" "%OUTPUT%\uninstall.bat" >nul
copy /y "%ROOT%docker-compose.yml" "%OUTPUT%\docker-compose.yml" >nul
copy /y "%ROOT%.env.example" "%OUTPUT%\.env.example" >nul

:: Copy source as fallback (for rebuilding on different arch)
xcopy /s /q /y "%ROOT%app\src" "%OUTPUT%\app\src\" >nul
xcopy /s /q /y "%ROOT%app\public" "%OUTPUT%\app\public\" >nul
copy /y "%ROOT%app\package.json" "%OUTPUT%\app\package.json" >nul
copy /y "%ROOT%app\package-lock.json" "%OUTPUT%\app\package-lock.json" >nul 2>nul
copy /y "%ROOT%app\tsconfig.json" "%OUTPUT%\app\tsconfig.json" >nul
copy /y "%ROOT%app\next.config.ts" "%OUTPUT%\app\next.config.ts" >nul
copy /y "%ROOT%app\postcss.config.mjs" "%OUTPUT%\app\postcss.config.mjs" >nul
copy /y "%ROOT%app\drizzle.config.ts" "%OUTPUT%\app\drizzle.config.ts" >nul
copy /y "%ROOT%app\eslint.config.mjs" "%OUTPUT%\app\eslint.config.mjs" >nul
copy /y "%ROOT%app\Dockerfile" "%OUTPUT%\app\Dockerfile" >nul
copy /y "%ROOT%app\.dockerignore" "%OUTPUT%\app\.dockerignore" >nul
copy /y "%ROOT%app\docker-entrypoint.sh" "%OUTPUT%\app\docker-entrypoint.sh" >nul
copy /y "%ROOT%app\vnc-server.ts" "%OUTPUT%\app\vnc-server.ts" >nul

echo [OK] Files copied.

echo.
echo [4/4] Creating README...

(
    echo # HomeServ - Portable USB Install
    echo.
    echo ## Quick Install
    echo.
    echo ### Windows
    echo 1. Install Docker Desktop ^(https://www.docker.com/products/docker-desktop/^)
    echo 2. Double-click `install.bat`
    echo 3. Open http://localhost:3001
    echo.
    echo ### Linux / macOS
    echo 1. Install Docker: `curl -fsSL https://get.docker.com ^| sh`
    echo 2. Run: `chmod +x install.sh ^&^& ./install.sh`
    echo 3. Open http://localhost:3001
    echo.
    echo ## First Run
    echo - Create your admin account at the setup screen
    echo - Configure integrations in Settings
    echo.
    echo ## Included
    echo - Pre-built Docker image ^(homeserv-image.tar^)
    echo - Full source code ^(app/^) for rebuilding on different architectures
    echo - Install/uninstall scripts for Windows and Linux
    echo.
    echo ## Architecture
    echo The pre-built image is for amd64 ^(x86_64^).
    echo If installing on ARM ^(e.g. Raspberry Pi^), the installer will
    echo automatically build from source instead.
    echo.
    echo ## Ports
    echo - 3001: Web UI
    echo - 3002: VNC WebSocket proxy
    echo.
    echo ## Data
    echo Data is stored in a Docker volume ^(homeserv-data^).
    echo Config is stored at:
    echo - Windows: %%USERPROFILE%%\.homeserv\
    echo - Linux:   ~/.homeserv/
    echo.
    echo ## Uninstall
    echo - Windows: Run `uninstall.bat`
    echo - Linux:   `docker compose -f ~/.homeserv/docker-compose.yml down`
    echo            `docker rmi homeserv:latest`
    echo            `docker volume rm homeserv-data`
) > "%OUTPUT%\README.md"

echo [OK] README created.

echo.
echo  ╔══════════════════════════════════════════╗
echo  ║  USB package ready!                      ║
echo  ║                                          ║
echo  ║  Output: %OUTPUT%
echo  ║                                          ║
echo  ║  Copy the homeserv-usb folder to a       ║
echo  ║  USB drive and run install.bat on the    ║
echo  ║  target machine.                         ║
echo  ╚══════════════════════════════════════════╝
echo.

:: Show contents
echo Contents:
dir /b "%OUTPUT%"
echo.

pause
