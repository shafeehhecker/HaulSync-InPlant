# ─── Base ─────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ─── Development ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS development
WORKDIR /app
RUN apk add --no-cache openssl wget
COPY package*.json ./
RUN npm ci && npm cache clean --force
COPY . .
RUN npx prisma generate
EXPOSE 5001
CMD ["npm", "run", "dev"]

# ─── Builder (generate prisma client for prod) ────────────────────────────────
FROM base AS builder
COPY . .
RUN npm ci && npx prisma generate && npm prune --production

# ─── Production ───────────────────────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app
RUN apk add --no-cache openssl wget

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs

COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/prisma      ./prisma
COPY --from=builder --chown=nodejs:nodejs /app/src         ./src
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./

EXPOSE 5001
CMD ["node", "src/server.js"]
