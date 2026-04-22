# Build stage
FROM node:22-slim AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source
COPY . .

# Build the frontend
RUN npm run build

# Production stage
FROM node:22-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
# Note: tsx is needed if we run the server with it
RUN npm install --omit=dev && npm install tsx

# Copy built frontend
COPY --from=builder /app/dist ./dist

# Copy server code
COPY server.ts ./

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose the port
EXPOSE 3000

# Start the application
CMD ["npx", "tsx", "server.ts"]
