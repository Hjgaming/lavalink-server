# Multi-stage build for Lavalink with Dashboard
# Stage 1: Prepare static files
FROM nginx:alpine as nginx-builder

# Copy static dashboard files
COPY public/ /usr/share/nginx/html/

# Stage 2: Main application with Lavalink + Nginx
FROM ghcr.io/lavalink-devs/lavalink:4-alpine

# Metadata
LABEL maintainer="Lavalink Server"
LABEL description="Lavalink audio streaming node with web dashboard"
LABEL version="4.0"

# Install required packages
RUN apk add --no-cache \
    nginx \
    supervisor \
    curl

# Set working directory
WORKDIR /opt/Lavalink

# Copy application configuration
COPY application.yml ./

# Copy nginx configuration template
COPY nginx.conf /etc/nginx/nginx.conf.template

# Copy supervisor configuration
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Copy static files from nginx-builder stage
COPY --from=nginx-builder /usr/share/nginx/html /usr/share/nginx/html

# Copy startup script
COPY start.sh /opt/start.sh
RUN chmod +x /opt/start.sh

# Create necessary directories
RUN mkdir -p /var/log/supervisor /var/log/nginx /opt/Lavalink/logs

# Expose single port (default 2333, configurable via PORT env var)
EXPOSE 2333

# Health check configuration
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:${PORT:-2333}/version || exit 1

# Use startup script to run both Lavalink and Nginx via supervisord
CMD ["/opt/start.sh"]
