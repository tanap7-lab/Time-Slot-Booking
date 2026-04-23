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
RUN npm install --omit=dev

# Copy built frontend
COPY --from=builder /app/dist ./dist

# Copy server code
COPY server.ts ./

# Set environment variables
ENV NODE_ENV=production
# Note: Azure App Service will set its own PORT, but we provide a default
ENV PORT=3000

# Expose the port (informative for Azure)
EXPOSE 3000

# Start the application using the start script defined in package.json
CMD ["npm", "start"]
