# ---- Build stage ----
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root workspace files
COPY package.json package-lock.json ./
COPY services/telegram-bot/package.json ./services/telegram-bot/

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY services/telegram-bot/ ./services/telegram-bot/

# Build
RUN npm run build --workspace telegram-bot

# ---- Production stage ----
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

# Copy root workspace files
COPY package.json package-lock.json ./
COPY services/telegram-bot/package.json ./services/telegram-bot/

# Install production dependencies only
RUN npm ci --omit=dev

# Copy built output from builder
COPY --from=builder /app/services/telegram-bot/dist ./services/telegram-bot/dist

EXPOSE 3000

CMD ["node", "services/telegram-bot/dist/index.js"]
