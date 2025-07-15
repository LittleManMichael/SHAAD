#!/bin/bash

# Fix system nginx configuration for SHAAD
echo "🔧 Fixing system nginx configuration..."

# Backup current configuration
sudo cp /etc/nginx/sites-available/shaad /etc/nginx/sites-available/shaad.backup

# Update frontend port from 3002 to 3000
sudo sed -i 's/server localhost:3002;/server localhost:3000;/' /etc/nginx/sites-available/shaad

# Test nginx configuration
echo "🧪 Testing nginx configuration..."
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Nginx configuration is valid"
    
    # Reload nginx
    echo "🔄 Reloading nginx..."
    sudo systemctl reload nginx
    
    echo "✅ System nginx configuration updated!"
    echo ""
    echo "Your SHAAD platform should now be accessible at:"
    echo "🌐 https://myshaad.com"
    echo ""
else
    echo "❌ Nginx configuration has errors. Restoring backup..."
    sudo cp /etc/nginx/sites-available/shaad.backup /etc/nginx/sites-available/shaad
    exit 1
fi