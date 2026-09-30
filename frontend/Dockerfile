# ==============================================================================
# FraudGuard Frontend — Production Multi-Stage Dockerfile
# Builder: Node 20 Alpine (Vite build) | Runtime: Nginx 1.25 Alpine
# ==============================================================================

# ── Stage 1: Install dependencies (cached layer) ─────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --prefer-offline

# ── Stage 2: Build Vite production bundle ─────────────────────────────────────
FROM deps AS builder
COPY . .
# VITE_API_URL is injected at build time via --build-arg or docker-compose env
ARG VITE_API_URL=http://localhost:8080
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

# ── Stage 3: Nginx runtime ────────────────────────────────────────────────────
FROM nginx:1.25-alpine AS runtime

# Remove default nginx page
RUN rm -rf /usr/share/nginx/html/*

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
