FROM node:24-alpine AS builder

# Set working directory
WORKDIR /app

# Enable corepack for pnpm
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

# Copy root workspace and package manifests
COPY pnpm-lock.yaml package.json pnpm-workspace.yaml ./
COPY backend/ backend/
COPY frontend/ frontend/
COPY shared/ shared/
COPY ml/ ml/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Generate Prisma Client (in case postinstall missed it)
WORKDIR /app/backend
RUN pnpm exec prisma generate

# Build stage complete
FROM node:24-alpine AS runner

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

# Copy dependencies and built code from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/ml ./ml
COPY --from=builder /app/backend ./backend

# Default working directory to backend
WORKDIR /app/backend

# Add non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app
USER nodejs

# Expose API port
EXPOSE 4000

# The CMD can be overridden to run `npm run start:worker` in a separate container
CMD ["npm", "run", "start"]
