#!/bin/sh
set -e

echo "Starting Lavalink Dashboard Server..."

# Get the port from environment variable, default to 2333
PORT=${PORT:-2333}
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
java -Xmx512m -Xms128m \
    -XX:+UseG1GC \
    -XX:MaxGCPauseMillis=200 \
    -XX:+UnlockExperimentalVMOptions \
    -XX:+UseContainerSupport \
    -Djdk.tls.client.protocols=TLSv1.2 \
    -jar /opt/Lavalink/Lavalink.jar &
LAVALINK_PID=$!
echo "Lavalink started with PID $LAVALINK_PID"

# Wait for Lavalink to be ready (max 60 seconds)
echo "Waiting for Lavalink to be ready..."
for i in $(seq 1 60); do
    if curl -s -f http://127.0.0.1:8080/version > /dev/null 2>&1; then
        echo "Lavalink is ready!"
        break
    fi
    if [ $i -eq 60 ]; then
        echo "WARNING: Lavalink did not start within 60 seconds"
    fi
    sleep 1
done

# Start Nginx in the background
echo "Starting Nginx on port $PORT..."
nginx -g 'daemon off;' &
NGINX_PID=$!
echo "Nginx started with PID $NGINX_PID"

echo "All services started successfully!"
echo "  - Dashboard: http://localhost:$PORT/"
echo "  - Lavalink API: http://localhost:$PORT/version"

# Wait for either process to exit
wait -n $LAVALINK_PID $NGINX_PID

# If we get here, one process died, so shutdown everything
echo "One of the processes exited unexpectedly"
shutdown
