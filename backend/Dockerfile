FROM node:22-alpine AS base
RUN npm install -g pnpm

# ── Dependencies ────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ── Build ───────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Generate drizzle migrations if not already present
RUN mkdir -p drizzle
RUN pnpm build

# ── Production image ─────────────────────────────────────────────
FROM node:22-alpine AS runner
RUN npm install -g pnpm
WORKDIR /app

ENV NODE_ENV=production

# Copy only production dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

# Copy compiled output
COPY --from=builder /app/dist ./dist

# Copy drizzle migrations (needed for db:migrate at startup if used)
COPY --from=builder /app/drizzle ./drizzle
COPY drizzle.config.ts ./

EXPOSE 3001

CMD ["node", "dist/index.js"]
