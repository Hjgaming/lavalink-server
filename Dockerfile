FROM ghcr.io/lavalink-devs/lavalink:4-alpine

# Metadata
LABEL maintainer="Lavalink Server"
LABEL description="Lavalink audio streaming node for Discord bots"
LABEL version="4.0"

# Set working directory
WORKDIR /opt/Lavalink

# Copy application configuration
COPY application.yml ./

# Expose Lavalink port
EXPOSE 2333

# Health check configuration (using curl which is available in the base image)
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:${PORT:-2333}/version || exit 1

# Run Lavalink with optimized JVM flags for production
CMD ["java", \
     "-Xmx512m", \
     "-Xms128m", \
     "-XX:+UseG1GC", \
     "-XX:MaxGCPauseMillis=200", \
     "-XX:+UnlockExperimentalVMOptions", \
     "-XX:+UseContainerSupport", \
     "-Djdk.tls.client.protocols=TLSv1.2", \
     "-jar", "Lavalink.jar"]
