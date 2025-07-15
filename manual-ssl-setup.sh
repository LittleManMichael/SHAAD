#!/bin/bash

# Manual SSL Certificate Setup for SHAAD
# Run this script AFTER configuring DNS to point to your server

set -e

echo "🔐 SHAAD Manual SSL Certificate Setup"
echo "====================================="

# Check if domains are accessible
check_domain() {
    local domain=$1
    echo "🔍 Checking if $domain is accessible from the internet..."
    
    if curl -s --max-time 10 "http://$domain/.well-known/acme-challenge/test" | grep -q "test"; then
        echo "✅ $domain is accessible"
        return 0
    else
        echo "❌ $domain is not accessible"
        return 1
    fi
}

echo "📋 This script will:"
echo "1. Check if your domains are accessible from the internet"
echo "2. Obtain SSL certificates from Let's Encrypt"
echo "3. Configure HTTPS redirects"
echo "4. Update environment variables for HTTPS"
echo ""

read -p "Have you configured DNS for myshaad.com, api.myshaad.com, and n8n.myshaad.com? (y/N): " dns_ready

if [[ $dns_ready != [yY] ]]; then
    echo "❌ Please configure DNS first:"
    echo ""
    echo "Add these A records to your DNS provider:"
    echo "A    myshaad.com          → $(curl -s ifconfig.me)"
    echo "A    api.myshaad.com      → $(curl -s ifconfig.me)"
    echo "A    n8n.myshaad.com      → $(curl -s ifconfig.me)"
    echo ""
    echo "Wait for DNS propagation (5-30 minutes) then run this script again."
    exit 1
fi

# Check domain accessibility
echo "🔍 Checking domain accessibility..."

all_accessible=true
for domain in myshaad.com api.myshaad.com n8n.myshaad.com; do
    if ! check_domain $domain; then
        all_accessible=false
    fi
done

if [ "$all_accessible" = false ]; then
    echo ""
    echo "❌ Some domains are not accessible. Please:"
    echo "1. Verify DNS configuration"
    echo "2. Wait for DNS propagation"
    echo "3. Ensure firewall allows port 80"
    echo "4. Check that nginx is running: docker ps | grep shaad_nginx"
    exit 1
fi

echo ""
echo "✅ All domains are accessible! Proceeding with SSL certificate setup..."

# Run Certbot
echo "🔐 Obtaining SSL certificates..."
docker run --rm -it \
    -v /home/shaad/ai-assistant-dashboard/nginx/ssl:/etc/letsencrypt \
    -v /home/shaad/ai-assistant-dashboard/nginx/certbot-webroot:/var/www/certbot \
    certbot/certbot:latest \
    certonly --webroot \
    --webroot-path=/var/www/certbot \
    --email admin@myshaad.com \
    --agree-tos \
    --no-eff-email \
    -d myshaad.com \
    -d api.myshaad.com \
    -d n8n.myshaad.com

if [ $? -eq 0 ]; then
    echo "✅ SSL certificates obtained successfully!"
    
    # Enable HTTPS configuration
    echo "🔧 Enabling HTTPS configuration..."
    
    # Copy HTTPS configuration
    cp /home/shaad/ai-assistant-dashboard/nginx/conf.d/myshaad-ssl.conf.template \
       /home/shaad/ai-assistant-dashboard/nginx/conf.d/myshaad-ssl.conf
    
    # Update HTTP configuration to redirect to HTTPS
    sed -i 's|# return 301 https://\$server_name\$request_uri;|return 301 https://\$server_name\$request_uri;|g' \
        /home/shaad/ai-assistant-dashboard/nginx/conf.d/myshaad.conf
    
    # Update environment variables for HTTPS
    echo "🔧 Updating environment variables for HTTPS..."
    sed -i 's|http://api.myshaad.com|https://api.myshaad.com|g' /home/shaad/ai-assistant-dashboard/.env
    sed -i 's|ws://api.myshaad.com|wss://api.myshaad.com|g' /home/shaad/ai-assistant-dashboard/.env
    sed -i 's|http://n8n.myshaad.com|https://n8n.myshaad.com|g' /home/shaad/ai-assistant-dashboard/.env
    sed -i 's|http://myshaad.com|https://myshaad.com|g' /home/shaad/ai-assistant-dashboard/.env
    sed -i 's|N8N_PROTOCOL=http|N8N_PROTOCOL=https|g' /home/shaad/ai-assistant-dashboard/docker-compose.yml
    
    # Restart services
    echo "🔄 Restarting services with HTTPS configuration..."
    docker restart shaad_nginx
    docker compose --profile backend --profile frontend restart
    
    # Setup automatic renewal
    echo "🔄 Setting up automatic SSL renewal..."
    cat > /home/shaad/ai-assistant-dashboard/renew-ssl.sh << 'EOF'
#!/bin/bash
cd /home/shaad/ai-assistant-dashboard
docker run --rm \
    -v /home/shaad/ai-assistant-dashboard/nginx/ssl:/etc/letsencrypt \
    -v /home/shaad/ai-assistant-dashboard/nginx/certbot-webroot:/var/www/certbot \
    certbot/certbot:latest renew
docker restart shaad_nginx
EOF
    
    chmod +x /home/shaad/ai-assistant-dashboard/renew-ssl.sh
    
    # Add to crontab (runs twice daily)
    (crontab -l 2>/dev/null; echo "0 */12 * * * /home/shaad/ai-assistant-dashboard/renew-ssl.sh >> /var/log/letsencrypt-renewal.log 2>&1") | crontab -
    
    echo ""
    echo "🎉 SSL setup complete!"
    echo "===================="
    echo ""
    echo "Your SHAAD platform is now secured with HTTPS:"
    echo "🌐 https://myshaad.com"
    echo "🔗 https://api.myshaad.com"
    echo "⚙️  https://n8n.myshaad.com"
    echo ""
    echo "✅ HTTPS redirects enabled"
    echo "✅ SSL certificates installed"
    echo "✅ Automatic renewal configured"
    echo ""
    echo "Test your setup:"
    echo "curl https://myshaad.com"
    echo "curl https://api.myshaad.com/health"
    echo "curl https://n8n.myshaad.com/healthz"
    
else
    echo "❌ Failed to obtain SSL certificates"
    echo "Please check:"
    echo "1. Domain DNS configuration"
    echo "2. Firewall allows port 80"
    echo "3. nginx is running and accessible"
    exit 1
fi