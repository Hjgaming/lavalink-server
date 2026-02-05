# Multi-stage build for Lavalink with Dashboard
# Start from nginx base to have nginx pre-installed
FROM nginx:alpine

# Metadata
LABEL maintainer="Lavalink Server"
LABEL description="Lavalink audio streaming node with web dashboard"
LABEL version="4.0"

# Create lavalink user and group
RUN addgroup -g 322 lavalink && adduser -u 322 -G lavalink -s /bin/sh -D lavalink

# Copy Java and all dependencies from Lavalink image
# This includes the full JVM with all native libraries
COPY --from=ghcr.io/lavalink-devs/lavalink:4-alpine /usr/lib/jvm /usr/lib/jvm
COPY --from=ghcr.io/lavalink-devs/lavalink:4-alpine /usr/bin/java /usr/bin/java

# Set JAVA_HOME and update library path
ENV JAVA_HOME=/usr/lib/jvm/zulu17-ca
ENV PATH="$JAVA_HOME/bin:$PATH"
ENV LD_LIBRARY_PATH="$JAVA_HOME/lib:$JAVA_HOME/lib/server:$LD_LIBRARY_PATH"

# Set working directory
WORKDIR /opt/Lavalink

# Copy Lavalink jar from official image
COPY --from=ghcr.io/lavalink-devs/lavalink:4-alpine /opt/Lavalink/Lavalink.jar ./

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
    chmod 755 /var/log/nginx /run/nginx

# Expose single port (default 2333, configurable via PORT env var)
EXPOSE 2333

# Health check configuration  
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:${PORT:-2333}/version || exit 1

# Use our startup script
CMD ["/opt/start.sh"]
