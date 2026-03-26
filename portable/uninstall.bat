@echo off
echo.
echo  HomeServ Uninstaller
echo  ====================
echo.

set "INSTALL_DIR=%USERPROFILE%\.homeserv"

echo This will:
echo   1. Stop the HomeServ container
echo   2. Remove the container and image
echo   3. Optionally delete config and data
echo.

set /p CONFIRM="Continue? (y/N): "
if /i not "%CONFIRM%"=="y" exit /b 0

:: Stop and remove container
echo [INFO] Stopping HomeServ...
docker compose -f "%INSTALL_DIR%\docker-compose.yml" --env-file "%INSTALL_DIR%\.env" down >nul 2>nul
docker rm -f homeserv >nul 2>nul

:: Remove image
echo [INFO] Removing Docker image...
docker rmi homeserv:latest >nul 2>nul

echo.
set /p DELETE_DATA="Delete config and data at %INSTALL_DIR%? (y/N): "
if /i "%DELETE_DATA%"=="y" (
    echo [INFO] Removing data volume...
    docker volume rm homeserv-data >nul 2>nul
    rmdir /s /q "%INSTALL_DIR%" >nul 2>nul
    echo [OK] Data removed.
) else (
    echo [OK] Config and data preserved at %INSTALL_DIR%
)

echo.
echo HomeServ has been uninstalled.
pause
