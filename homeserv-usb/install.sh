#!/usr/bin/env bash
set -e

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║       HomeServ Portable Installer        ║"
echo "║       Home Server Dashboard              ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# Check for Docker
if ! command -v docker &> /dev/null; then
    echo "[ERROR] Docker is not installed."
    echo ""
    echo "Install Docker:"
    echo "  curl -fsSL https://get.docker.com | sh"
    echo "  sudo usermod -aG docker \$USER"
    echo ""
    echo "Then log out/in and run this script again."
    exit 1
fi

if ! docker info &> /dev/null; then
    echo "[ERROR] Docker is not running."
    echo "  sudo systemctl start docker"
    exit 1
fi

echo "[OK] Docker is installed and running."
echo ""

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# ── Load or build the image ──

if [ -f "$SCRIPT_DIR/homeserv-image.tar" ]; then
    echo "[INFO] Found pre-built image. Loading..."
    docker load -i "$SCRIPT_DIR/homeserv-image.tar"
    echo "[OK] Image loaded."

elif [ -f "$SCRIPT_DIR/app/Dockerfile" ]; then
    echo "[INFO] No pre-built image. Building from source..."
    # Copy to local temp to avoid path issues with removable media
    BUILD_DIR=$(mktemp -d)
    cp -r "$SCRIPT_DIR/app" "$BUILD_DIR/app"
    docker build --no-cache -t homeserv:latest -f "$BUILD_DIR/app/Dockerfile" "$BUILD_DIR/app"
    rm -rf "$BUILD_DIR"
    echo "[OK] Image built."

else
    echo "[ERROR] No homeserv-image.tar or app/Dockerfile found."
    echo "        Make sure you're running this from the HomeServ USB directory."
    exit 1
fi

echo ""

# ── Setup install directory ──
INSTALL_DIR="$HOME/.homeserv"
mkdir -p "$INSTALL_DIR"

if [ ! -f "$INSTALL_DIR/.env" ]; then
    echo "[INFO] Generating configuration..."
    JWT_SECRET=$(openssl rand -base64 48 2>/dev/null || head -c 48 /dev/urandom | base64)

    cat > "$INSTALL_DIR/.env" << EOF
# HomeServ Configuration
JWT_SECRET=$JWT_SECRET
HOMESERV_PORT=3001
VNC_WS_PORT=3002
VNC_HOST=host.docker.internal
VNC_PORT=5900
EOF

    echo "[OK] Config created at $INSTALL_DIR/.env"
else
    echo "[OK] Using existing config at $INSTALL_DIR/.env"
fi

# Always write a fresh docker-compose using the loaded image
cat > "$INSTALL_DIR/docker-compose.yml" << 'COMPOSE'
services:
  homeserv:
    image: homeserv:latest
    container_name: homeserv
    restart: unless-stopped
    ports:
      - "${HOMESERV_PORT:-3001}:3001"
      - "${VNC_WS_PORT:-3002}:3002"
    volumes:
      - homeserv-data:/app/data
    environment:
      - NODE_ENV=production
      - PORT=3001
      - JWT_SECRET=${JWT_SECRET}
      - VNC_HOST=${VNC_HOST:-host.docker.internal}
      - VNC_PORT=${VNC_PORT:-5900}
      - VNC_WS_PORT=3002
    extra_hosts:
      - "host.docker.internal:host-gateway"
    cap_add:
      - NET_RAW
volumes:
  homeserv-data:
    driver: local
COMPOSE

echo ""
echo "[INFO] Starting HomeServ..."

docker compose -f "$INSTALL_DIR/docker-compose.yml" --env-file "$INSTALL_DIR/.env" down 2>/dev/null || true
docker compose -f "$INSTALL_DIR/docker-compose.yml" --env-file "$INSTALL_DIR/.env" up -d

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║       HomeServ is running!               ║"
echo "║                                          ║"
echo "║   Open: http://localhost:3001            ║"
echo "║                                          ║"
echo "║   Config: $INSTALL_DIR                   ║"
echo "╚══════════════════════════════════════════╝"
echo ""

if command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:3001 &
fi
