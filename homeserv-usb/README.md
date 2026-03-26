# HomeServ - Portable USB Install

## Quick Install

### Windows
1. Install Docker Desktop (https://www.docker.com/products/docker-desktop/)
2. Double-click `install.bat`
3. Open http://localhost:3001

### Linux / macOS
1. Install Docker: `curl -fsSL https://get.docker.com | sh`
2. Run: `chmod +x install.sh && ./install.sh`
3. Open http://localhost:3001

## First Run
- Create your admin account at the setup screen
- Configure integrations in Settings

## Included
- Pre-built Docker image (homeserv-image.tar)
- Full source code (app/) for rebuilding on different architectures
- Install/uninstall scripts for Windows and Linux

## Architecture
The pre-built image is for amd64 (x86_64).
If installing on ARM (e.g. Raspberry Pi), the installer will
automatically build from source instead.

## Ports
- 3001: Web UI
- 3002: VNC WebSocket proxy

## Data
Data is stored in a Docker volume (homeserv-data).
Config is stored at:
- Windows: %USERPROFILE%\.homeserv\
- Linux:   ~/.homeserv/

## Uninstall
- Windows: Run `uninstall.bat`
- Linux:   `docker compose -f ~/.homeserv/docker-compose.yml down`
           `docker rmi homeserv:latest`
           `docker volume rm homeserv-data`
