#!/bin/bash

# Switch from system nginx to Docker nginx
echo "🔄 Switching from system nginx to Docker nginx..."

# Stop and disable system nginx
echo "📛 Stopping system nginx..."
sudo systemctl stop nginx
sudo systemctl disable nginx

# Update Docker nginx to use standard ports
echo "🔧 Updating Docker nginx to use ports 80/443..."
sed -i 's/8080:80/80:80/g' /home/shaad/ai-assistant-dashboard/docker-compose.yml
sed -i 's/8443:443/443:443/g' /home/shaad/ai-assistant-dashboard/docker-compose.yml

# Restart Docker nginx
echo "🚀 Starting Docker nginx on standard ports..."
docker stop shaad_nginx
docker rm shaad_nginx
docker compose --profile backend --profile frontend up -d nginx

echo "✅ Switched to Docker nginx!"
echo ""
echo "Test your setup:"
echo "curl -H 'Host: myshaad.com' http://localhost/"
echo "curl -H 'Host: api.myshaad.com' http://localhost/health"
echo "curl -H 'Host: n8n.myshaad.com' http://localhost/healthz"