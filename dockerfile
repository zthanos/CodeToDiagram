# Use Node.js LTS Alpine for smaller image size
FROM node:lts-alpine

# Set working directory
WORKDIR /app

# Create non-root user early
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 -G nodejs

# Copy package files first for better Docker layer caching
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production=false

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Change ownership of the app directory to the non-root user
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose the port that Vite preview uses
EXPOSE 4173

# Start the preview server with host binding for Docker
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0"]