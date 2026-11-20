# ---- deps ----
FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
# better-sqlite3 is local-only; its native build is skipped in the container.
RUN npm ci --ignore-scripts

# ---- build ----
FROM node:22-bookworm-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# prisma.config.ts reads DATABASE_URL at generate time; the real value arrives at runtime.
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
# Page-data collection imports auth config; runtime values replace these.
ENV NEXTAUTH_SECRET="build-only-placeholder-secret-32-chars"
ENV NEXTAUTH_URL="https://placeholder.invalid"
ENV APP_URL="https://placeholder.invalid"
RUN npx prisma generate --schema prisma/schema.postgres.prisma && npm run build

# ---- run (prod: set DATABASE_URL to Postgres) ----
FROM node:22-bookworm-slim AS runner
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
EXPOSE 3000
CMD ["sh", "-c", "npx prisma db push --schema prisma/schema.postgres.prisma --accept-data-loss && npx next start -p ${PORT:-3000}"]
