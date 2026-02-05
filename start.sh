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
echo "Starting Lavalink server (512MB Heap)..."
java -Xmx512m -Xms256m \
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
timeout=0
max_timeout=300
READY=false

while [ $timeout -lt $max_timeout ]; do
    if curl -s http://127.0.0.1:8080/version > /dev/null 2>&1; then
        echo "Lavalink is ready!"
        READY=true
        break
    fi
    sleep 2
    timeout=$((timeout + 2))
    if [ $((timeout % 10)) -eq 0 ]; then
        echo "  Still waiting... ($timeout/$max_timeout seconds)"
    fi
done

if [ "$READY" = false ]; then
    echo "ERROR: Lavalink failed to start within $max_timeout seconds"
    kill -TERM "$LAVALINK_PID" 2>/dev/null || true
    exit 1
fi

# Start Nginx in the background
echo ""
echo "Starting Nginx reverse proxy on port $PORT..."
nginx -g 'daemon off;' &
NGINX_PID=$!
echo "Nginx PID: $NGINX_PID"

# Wait a moment for nginx to fully start
sleep 2

# Test that nginx is proxying correctly
echo ""
echo "Testing nginx proxy to Lavalink..."
if curl -s "http://127.0.0.1:$PORT/version" > /dev/null 2>&1; then
    echo "  ✓ Nginx proxy is working correctly"
else
    echo "  WARNING: Nginx proxy test failed"
fi

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

# Monitor both processes - Alpine's ash doesn't support wait -n
# Use a polling loop to check if processes are still running
while true; do
    # Check if Lavalink is still running
    if ! kill -0 "$LAVALINK_PID" 2>/dev/null; then
        echo "Lavalink process exited unexpectedly"
        shutdown
    fi
    
    # Check if Nginx is still running
    if ! kill -0 "$NGINX_PID" 2>/dev/null; then
        echo "Nginx process exited unexpectedly"
        shutdown
    fi
    
    # Sleep briefly before next check
    sleep 5
done
