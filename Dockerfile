# Use Node.js LTS
FROM node:18-alpine as base

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy app source
COPY . .

# Build frontend
FROM base as frontend-builder
WORKDIR /app/realtime
COPY realtime/package*.json ./
RUN npm ci
COPY realtime/ ./
RUN npm run build

# Final image
FROM base
COPY --from=frontend-builder /app/realtime/dist /app/public

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Start the server
CMD ["node", "api/server.js"]