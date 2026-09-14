# Lightweight multi-stage Node.js container
FROM node:22-alpine AS base

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application source
COPY src/ ./src/
COPY public/ ./public/

# Use unprivileged user
USER node

# Environment defaults
ENV NODE_ENV=production
ENV PORT=3355

EXPOSE 3355

# Container healthcheck using built-in /api/health
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1:${PORT}/api/health || exit 1

CMD ["node", "src/server.js"]
