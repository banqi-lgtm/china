FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/
RUN npm --prefix client install
RUN npm --prefix server install

# Copy sources
COPY client ./client
COPY server ./server
COPY uploads ./uploads

# Build frontend and backend
RUN npm --prefix client run build
RUN npm --prefix server run build

# Production runtime stage
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000

COPY package.json ./
COPY --from=builder /app/client/dist ./client/dist
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/server/node_modules ./server/node_modules
COPY --from=builder /app/uploads ./uploads

EXPOSE 4000
CMD ["node", "server/dist/index.js"]
