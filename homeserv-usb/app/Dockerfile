# ── Stage 1: Install dependencies ──
FROM node:20-bookworm-slim AS deps

WORKDIR /app

# Build tools for native modules (better-sqlite3, bcrypt)
RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 make g++ && \
    rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN npm ci

# ── Stage 2: Build the Next.js app ──
FROM node:20-bookworm-slim AS builder

WORKDIR /app

RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 make g++ && \
    rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules

# Copy source files explicitly
COPY package.json package-lock.json* ./
COPY tsconfig.json next.config.ts postcss.config.mjs eslint.config.mjs drizzle.config.ts ./
COPY docker-entrypoint.sh vnc-server.ts ./
COPY src ./src
COPY public ./public

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ── Stage 3: Production image ──
FROM node:20-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3001
ENV HOSTNAME=0.0.0.0

# Runtime deps: system monitoring, ping for WOL
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      iputils-ping procps lm-sensors dmidecode util-linux net-tools && \
    rm -rf /var/lib/apt/lists/*

RUN addgroup --system --gid 1001 homeserv && \
    adduser --system --uid 1001 --ingroup homeserv homeserv

# Copy the entire standalone output (includes server.js + .next/ + node_modules/)
# In Docker (no parent lockfile), standalone output is flat at /app/.next/standalone/
COPY --from=builder /app/.next/standalone ./

# Static assets are NOT included in standalone — copy them in
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Overwrite native modules with full compiled binaries from builder
COPY --from=builder /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3
COPY --from=builder /app/node_modules/bcrypt ./node_modules/bcrypt
COPY --from=builder /app/node_modules/systeminformation ./node_modules/systeminformation
COPY --from=builder /app/node_modules/mqtt ./node_modules/mqtt
COPY --from=builder /app/node_modules/ws ./node_modules/ws

# Copy entrypoint
COPY --from=builder /app/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

# Persistent data directory
RUN mkdir -p /app/data && chown -R homeserv:homeserv /app

VOLUME ["/app/data"]
EXPOSE 3001 3002

USER homeserv
ENTRYPOINT ["./docker-entrypoint.sh"]
