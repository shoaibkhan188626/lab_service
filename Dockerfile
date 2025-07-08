# Use Node.js 18 LTS for stability
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files first for caching
COPY package*.json ./

# Install dependencies
RUN npm ci --production && npm cache clean --force

# Copy application code
COPY . .

# Expose port
EXPOSE 8085

# Healthcheck for container monitoring
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8085/health || exit 1

# Start application
CMD ["npm", "start"]