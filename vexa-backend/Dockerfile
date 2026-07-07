# ═══════════════════════════════════════════════════════════════════════════════
# VEXA 2.0 Backend — Production Multi-Stage Dockerfile
# ═══════════════════════════════════════════════════════════════════════════════

# --- Stage 1: Build & Compile ---
FROM node:24-alpine AS builder

WORKDIR /usr/src/app

# Copy dependency manifests
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (including devDependencies for typescript build)
RUN npm ci

# Copy source files
COPY tsconfig.json ./
COPY src ./src

# Generate Prisma Client and compile TypeScript to production JS in /dist
RUN npx prisma generate
RUN npm run build

# --- Stage 2: Production Runner ---
FROM node:24-alpine AS runner

WORKDIR /usr/src/app

ENV NODE_ENV=production

# Copy manifests
COPY package*.json ./
COPY prisma ./prisma/

# Install only production dependencies
RUN npm ci --only=production

# Copy compiled files and prisma client from builder stage
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /usr/src/app/node_modules/@prisma/client ./node_modules/@prisma/client

# Expose server port (default 3000)
EXPOSE 3000

# Start production server using migrate deploy to apply migrations before starting Express
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
