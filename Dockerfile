# Multi-stage build for Lavalink with Dashboard
FROM ghcr.io/lavalink-devs/lavalink:4-alpine

# Metadata
LABEL maintainer="Lavalink Server"
LABEL description="Lavalink audio streaming node with web dashboard"
LABEL version="4.0"

# Install nginx using the base Alpine Linux repos (available in the base image)
USER root

# Update and install nginx
RUN apk update && apk add --no-cache nginx && rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /opt/Lavalink

# Copy application configuration
COPY application.yml ./

# Copy nginx configuration template
COPY nginx.conf /etc/nginx/nginx.conf.template

# Copy static dashboard files
COPY public/ /usr/share/nginx/html/

# Copy startup script
COPY start.sh /opt/start.sh
RUN chmod +x /opt/start.sh

# Create necessary directories and set permissions
RUN mkdir -p /var/log/nginx /opt/Lavalink/logs /run/nginx && \
    chown -R lavalink:lavalink /opt/Lavalink && \
    chmod 755 /var/log/nginx

# Switch back to lavalink user is not needed as we run as root for nginx
# Expose single port (default 2333, configurable via PORT env var)
EXPOSE 2333

# Health check configuration
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:${PORT:-2333}/version || exit 1

# Use startup script to run both Lavalink and Nginx
CMD ["/opt/start.sh"]
