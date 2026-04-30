# ─── Base ─────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./

# ─── Development ──────────────────────────────────────────────────────────────
FROM base AS development
RUN npm ci && npm cache clean --force
COPY . .
EXPOSE 3001
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3001"]

# ─── Builder ──────────────────────────────────────────────────────────────────
FROM base AS builder
RUN npm ci
COPY . .
ARG VITE_API_URL=http://localhost:5001
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# ─── Production (serve built assets via nginx) ────────────────────────────────
FROM nginx:1.25-alpine AS production
COPY --from=builder /app/dist /usr/share/nginx/html
COPY docker/nginx/spa.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
