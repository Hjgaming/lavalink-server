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
mkdir -p /var/log/supervisor
mkdir -p /var/log/nginx
mkdir -p /opt/Lavalink/logs

# Start supervisord to manage both processes
echo "Starting supervisor to manage Lavalink and Nginx..."
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
