# Frontend Dockerfile for SHAAD
# Multi-stage build for production optimization

# Stage 1: Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Production stage with Nginx
FROM nginx:alpine AS production

# Copy built application from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Create non-root user for security
RUN addgroup -g 1001 -S nginx
RUN adduser -S shaad -u 1001

# Change ownership of nginx directories
RUN chown -R shaad:nginx /var/cache/nginx && \
    chown -R shaad:nginx /var/log/nginx && \
    chown -R shaad:nginx /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R shaad:nginx /var/run/nginx.pid

# Switch to non-root user
USER shaad

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]