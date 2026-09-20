# ── Stage 1: Dependencies ────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@12

# Copy workspace manifests and lockfile
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY packages/domain/package.json ./packages/domain/
COPY packages/db/package.json ./packages/db/
COPY apps/api/package.json ./apps/api/

# Install all deps (frozen)
RUN pnpm install --frozen-lockfile --prod=false

# ── Stage 2: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

RUN npm install -g pnpm@12

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/domain/node_modules ./packages/domain/node_modules
COPY --from=deps /app/packages/db/node_modules ./packages/db/node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules

COPY . .

# Generate Prisma Client and build packages
RUN pnpm --filter @pos/db exec prisma generate --schema=./prisma/schema.prisma
RUN pnpm --filter @pos/domain build
RUN pnpm --filter @pos/db build
RUN pnpm --filter @pos/api build

# ── Stage 3: Production image ─────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN npm install -g pnpm@12

# Only production deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY packages/domain/package.json ./packages/domain/
COPY packages/db/package.json ./packages/db/
COPY apps/api/package.json ./apps/api/

RUN pnpm install --frozen-lockfile --prod

# Copy built artifacts
COPY --from=builder /app/packages/domain/dist ./packages/domain/dist
COPY --from=builder /app/packages/db/dist ./packages/db/dist
COPY --from=builder /app/packages/db/prisma ./packages/db/prisma
COPY --from=builder /app/apps/api/dist ./apps/api/dist

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nestjs
USER nestjs

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "apps/api/dist/main.js"]
