#!/usr/bin/env bash
set -e

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║     HomeServ USB Package Builder         ║"
echo "╚══════════════════════════════════════════╝"
echo ""

ROOT="$(cd "$(dirname "$0")" && pwd)"
OUTPUT="$ROOT/homeserv-usb"

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "[ERROR] Docker required. Install it first."
    exit 1
fi

# Clean
rm -rf "$OUTPUT"
mkdir -p "$OUTPUT/app"

echo "[1/4] Building Docker image..."
docker build -t homeserv:latest -f "$ROOT/app/Dockerfile" "$ROOT/app"
echo "[OK] Image built."

echo ""
echo "[2/4] Exporting Docker image..."
docker save homeserv:latest -o "$OUTPUT/homeserv-image.tar"
SIZE=$(du -h "$OUTPUT/homeserv-image.tar" | cut -f1)
echo "[OK] Image exported ($SIZE)."

echo ""
echo "[3/4] Copying files..."

# Scripts
cp "$ROOT/portable/install.bat" "$OUTPUT/"
cp "$ROOT/portable/install.sh" "$OUTPUT/"
cp "$ROOT/portable/uninstall.bat" "$OUTPUT/"
cp "$ROOT/docker-compose.yml" "$OUTPUT/"
cp "$ROOT/.env.example" "$OUTPUT/"
chmod +x "$OUTPUT/install.sh"

# Source (fallback for different arch)
cp -r "$ROOT/app/src" "$OUTPUT/app/src"
cp -r "$ROOT/app/public" "$OUTPUT/app/public"
for f in package.json package-lock.json tsconfig.json next.config.ts postcss.config.mjs \
         drizzle.config.ts eslint.config.mjs Dockerfile .dockerignore docker-entrypoint.sh vnc-server.ts; do
    [ -f "$ROOT/app/$f" ] && cp "$ROOT/app/$f" "$OUTPUT/app/"
done

echo "[OK] Files copied."

echo ""
echo "[4/4] Creating README..."
cat > "$OUTPUT/README.md" << 'EOF'
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

## Ports
- 3001: Web UI
- 3002: VNC WebSocket proxy

## Uninstall
- Windows: Run `uninstall.bat`
- Linux: `docker compose -f ~/.homeserv/docker-compose.yml down && docker rmi homeserv:latest`
EOF

echo "[OK] README created."

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║  USB package ready!                      ║"
echo "║  Output: $OUTPUT"
echo "║                                          ║"
echo "║  Copy homeserv-usb/ to a USB drive.      ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "Contents:"
ls -lh "$OUTPUT"
