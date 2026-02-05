#!/bin/sh
set -e

echo "Starting Lavalink Dashboard Server..."

# Get the port from environment variable, default to 10000 (Render's standard)
PORT=${PORT:-10000}
echo "Using port: $PORT"

# Replace ${PORT} in nginx.conf with actual port value
sed "s/\${PORT}/$PORT/g" /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

echo "Nginx configuration updated with port $PORT"

# Create log directories
mkdir -p /var/log/nginx
mkdir -p /opt/Lavalink/logs

# Function to handle shutdown
shutdown() {
    echo "Shutting down gracefully..."
    kill -TERM "$LAVALINK_PID" 2>/dev/null || true
    kill -TERM "$NGINX_PID" 2>/dev/null || true
    wait "$LAVALINK_PID" 2>/dev/null || true
    wait "$NGINX_PID" 2>/dev/null || true
    echo "Shutdown complete"
    exit 0
}

# Trap signals
trap shutdown SIGTERM SIGINT

# Start Lavalink in the background
echo "Starting Lavalink on port 8080..."
java -Xmx400m -Xms100m \
    -XX:+UseG1GC \
    -XX:MaxGCPauseMillis=200 \
    -XX:+UnlockExperimentalVMOptions \
    -XX:+UseContainerSupport \
    -Djdk.tls.client.protocols=TLSv1.2 \
    -DLAVALINK_SERVER_PASSWORD="${LAVALINK_SERVER_PASSWORD:-youshallnotpass}" \
    -jar /opt/Lavalink/Lavalink.jar &
LAVALINK_PID=$!
echo "Lavalink started with PID $LAVALINK_PID"

# Wait for Lavalink to be ready
echo "Waiting for Lavalink to be ready..."
MAX_WAIT=120  # Maximum wait time in seconds
WAIT_COUNT=0
READY=false

while [ $WAIT_COUNT -lt $MAX_WAIT ]; do
    if curl -s http://127.0.0.1:8080/version > /dev/null 2>&1; then
        echo "Lavalink is ready!"
        READY=true
        break
    fi
    echo "Waiting for Lavalink... ($WAIT_COUNT/$MAX_WAIT seconds)"
    sleep 2
    WAIT_COUNT=$((WAIT_COUNT + 2))
done

if [ "$READY" = false ]; then
    echo "ERROR: Lavalink failed to start within $MAX_WAIT seconds"
    kill -TERM "$LAVALINK_PID" 2>/dev/null || true
    exit 1
fi

# Start Nginx in the background
echo "Starting Nginx on port $PORT..."
nginx -g 'daemon off;' &
NGINX_PID=$!
echo "Nginx started with PID $NGINX_PID"

echo "All services started successfully!"
echo "  - Dashboard: http://localhost:$PORT/"
echo "  - Lavalink API: http://localhost:$PORT/version"
echo "  - Note: Lavalink may take 30-60 seconds to fully initialize"

# Wait for either process to exit
wait -n $LAVALINK_PID $NGINX_PID

# If we get here, one process died, so shutdown everything
echo "One of the processes exited unexpectedly"
shutdown
