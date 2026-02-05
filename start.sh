#!/bin/sh
set -e

echo "========================================"
echo "  Lavalink Public Server - Starting"
echo "========================================"

# Get the port from environment variable, default to 10000 (Render's standard)
PORT=${PORT:-10000}
echo "Port: $PORT"

# Get the Lavalink password from environment variable
LAVALINK_SERVER_PASSWORD=${LAVALINK_SERVER_PASSWORD:-youshallnotpass}
echo "Password configured: $(echo $LAVALINK_SERVER_PASSWORD | head -c 3)***"

# Escape special characters in the password for sed
# Replace / with \/ and & with \&
ESCAPED_PASSWORD=$(echo "$LAVALINK_SERVER_PASSWORD" | sed 's/[\/&]/\\&/g')

# Replace environment variables in nginx.conf
sed -e "s/\${PORT}/$PORT/g" \
    -e "s/\${LAVALINK_SERVER_PASSWORD}/$ESCAPED_PASSWORD/g" \
    /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

echo "Nginx configuration updated"

# Create log directories
mkdir -p /var/log/nginx
mkdir -p /opt/Lavalink/logs

# Function to handle shutdown
shutdown() {
    echo ""
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
echo ""
echo "Starting Lavalink server..."
java -Xmx400m -Xms100m \
    -XX:+UseG1GC \
    -XX:MaxGCPauseMillis=200 \
    -XX:+UnlockExperimentalVMOptions \
    -XX:+UseContainerSupport \
    -Djdk.tls.client.protocols=TLSv1.2 \
    -jar /opt/Lavalink/Lavalink.jar &
LAVALINK_PID=$!
echo "Lavalink PID: $LAVALINK_PID"

# Wait for Lavalink to be ready
echo ""
echo "Waiting for Lavalink to initialize..."
MAX_WAIT=120
WAIT_COUNT=0
READY=false

while [ $WAIT_COUNT -lt $MAX_WAIT ]; do
    if curl -s http://127.0.0.1:8080/version > /dev/null 2>&1; then
        echo "Lavalink is ready!"
        READY=true
        break
    fi
    if [ $((WAIT_COUNT % 10)) -eq 0 ]; then
        echo "  Still waiting... ($WAIT_COUNT/$MAX_WAIT seconds)"
    fi
    sleep 2
    WAIT_COUNT=$((WAIT_COUNT + 2))
done

if [ "$READY" = false ]; then
    echo "ERROR: Lavalink failed to start within $MAX_WAIT seconds"
    kill -TERM "$LAVALINK_PID" 2>/dev/null || true
    exit 1
fi

# Start Nginx in the background
echo ""
echo "Starting Nginx reverse proxy on port $PORT..."
nginx -g 'daemon off;' &
NGINX_PID=$!
echo "Nginx PID: $NGINX_PID"

echo ""
echo "========================================"
echo "  Lavalink Public Server - Running"
echo "========================================"
echo ""
echo "  WebSocket: wss://your-domain/v4/websocket"
echo "  Dashboard: https://your-domain/"
echo "  Version:   https://your-domain/version"
echo ""
echo "  Password:  Set in LAVALINK_SERVER_PASSWORD env var"
echo ""
echo "========================================"

# Wait for either process to exit
wait -n $LAVALINK_PID $NGINX_PID

# If we get here, one process died, so shutdown everything
echo "One of the processes exited unexpectedly"
shutdown
