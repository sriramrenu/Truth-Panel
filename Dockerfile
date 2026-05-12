# --- STAGE 1: Dependencies ---
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# --- STAGE 2: Builder ---
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build

# --- STAGE 3: Runner ---
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME="0.0.0.0"

# Install PM2 for enterprise process management
RUN npm install -g pm2

# Create a non-privileged user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone build and necessary assets
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/standalone/server.js ./server.js
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/app/backend ./app/backend
COPY --from=builder /app/package.json ./package.json

# Copy PM2 configuration
COPY process.json ./

USER nextjs

# Use pm2-runtime for clustering and self-healing
CMD ["pm2-runtime", "start", "process.json"]
