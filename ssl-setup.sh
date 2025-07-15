#!/bin/bash

# SSL Certificate Setup Script for SHAAD
# This script helps obtain and configure SSL certificates for myshaad.com

set -e

echo "🔒 SHAAD SSL Certificate Setup"
echo "=============================="

# Check if running as root or with sudo
if [[ $EUID -eq 0 ]]; then
    echo "⚠️  Warning: Running as root. Consider using a non-root user with sudo."
fi

# Function to check if domain is accessible
check_domain() {
    local domain=$1
    echo "🔍 Checking if $domain is accessible..."
    
    if curl -s --max-time 10 "http://$domain/.well-known/acme-challenge/test" > /dev/null 2>&1; then
        echo "✅ $domain is accessible"
        return 0
    else
        echo "❌ $domain is not accessible"
        return 1
    fi
}

# Function to obtain SSL certificates
obtain_certificates() {
    echo "🔄 Obtaining SSL certificates..."
    
    # Stop nginx temporarily to free up port 80
    echo "📛 Stopping nginx temporarily..."
    docker stop shaad_nginx || true
    
    # Update nginx to use standard port 80 for certificate verification
    echo "🔧 Updating nginx configuration for standard ports..."
    sed -i 's/8080:80/80:80/g' /home/shaad/ai-assistant-dashboard/docker-compose.yml
    sed -i 's/8443:443/443:443/g' /home/shaad/ai-assistant-dashboard/docker-compose.yml
    
    # Start nginx for ACME challenge
    echo "🚀 Starting nginx for ACME challenge..."
    docker compose --profile backend --profile frontend up -d nginx
    
    # Wait for nginx to be ready
    sleep 5
    
    # Run certbot
    echo "🔐 Running Certbot to obtain certificates..."
    docker compose --profile ssl run --rm certbot
    
    if [ $? -eq 0 ]; then
        echo "✅ SSL certificates obtained successfully!"
        return 0
    else
        echo "❌ Failed to obtain SSL certificates"
        return 1
    fi
}

# Function to enable HTTPS configuration
enable_https() {
    echo "🔧 Enabling HTTPS configuration..."
    
    # Copy HTTPS configuration
    cp /home/shaad/ai-assistant-dashboard/nginx/conf.d/myshaad-ssl.conf.template \
       /home/shaad/ai-assistant-dashboard/nginx/conf.d/myshaad-ssl.conf
    
    # Update HTTP configuration to redirect to HTTPS
    sed -i 's|# return 301 https://\$server_name\$request_uri;|return 301 https://\$server_name\$request_uri;|g' \
        /home/shaad/ai-assistant-dashboard/nginx/conf.d/myshaad.conf
    
    # Comment out HTTP service locations (keep ACME challenge)
    sed -i '/# For now, serve directly over HTTP/,/^    }$/c\
    # Redirect all HTTP to HTTPS\
    location / {\
        return 301 https://$server_name$request_uri;\
    }\
}' /home/shaad/ai-assistant-dashboard/nginx/conf.d/myshaad.conf
    
    echo "✅ HTTPS configuration enabled"
}

# Function to update environment variables for HTTPS
update_environment() {
    echo "🔧 Updating environment variables for HTTPS..."
    
    # Update .env file
    sed -i 's|http://api.myshaad.com|https://api.myshaad.com|g' /home/shaad/ai-assistant-dashboard/.env
    sed -i 's|ws://api.myshaad.com|wss://api.myshaad.com|g' /home/shaad/ai-assistant-dashboard/.env
    sed -i 's|http://n8n.myshaad.com|https://n8n.myshaad.com|g' /home/shaad/ai-assistant-dashboard/.env
    sed -i 's|http://myshaad.com|https://myshaad.com|g' /home/shaad/ai-assistant-dashboard/.env
    
    # Update Docker Compose for HTTPS
    sed -i 's|N8N_PROTOCOL=http|N8N_PROTOCOL=https|g' /home/shaad/ai-assistant-dashboard/docker-compose.yml
    
    echo "✅ Environment variables updated for HTTPS"
}

# Function to restart services with HTTPS
restart_services() {
    echo "🔄 Restarting services with HTTPS configuration..."
    
    # Restart nginx to load new configuration
    docker restart shaad_nginx
    
    # Restart services with updated environment
    docker compose --profile backend --profile frontend restart
    
    echo "✅ Services restarted with HTTPS"
}

# Function to setup automatic renewal
setup_renewal() {
    echo "🔄 Setting up automatic SSL renewal..."
    
    # Create renewal script
    cat > /home/shaad/ai-assistant-dashboard/renew-ssl.sh << 'EOF'
#!/bin/bash
cd /home/shaad/ai-assistant-dashboard
docker compose --profile ssl run --rm certbot renew
docker restart shaad_nginx
EOF
    
    chmod +x /home/shaad/ai-assistant-dashboard/renew-ssl.sh
    
    # Add to crontab (runs twice daily)
    (crontab -l 2>/dev/null; echo "0 */12 * * * /home/shaad/ai-assistant-dashboard/renew-ssl.sh >> /var/log/letsencrypt-renewal.log 2>&1") | crontab -
    
    echo "✅ Automatic renewal configured (runs twice daily)"
}

# Main execution
main() {
    echo "📋 SSL Certificate Setup Options:"
    echo "1. Obtain SSL certificates (requires domains to be accessible)"
    echo "2. Enable HTTPS configuration (after certificates are obtained)"
    echo "3. Full setup (obtain certificates + enable HTTPS)"
    echo "4. Setup automatic renewal only"
    echo ""
    
    read -p "Choose option (1-4): " choice
    
    case $choice in
        1)
            obtain_certificates
            echo "🎉 SSL certificates obtained! Run option 2 to enable HTTPS."
            ;;
        2)
            enable_https
            update_environment
            restart_services
            echo "🎉 HTTPS enabled! Your site should now be accessible via HTTPS."
            ;;
        3)
            if obtain_certificates; then
                enable_https
                update_environment
                restart_services
                setup_renewal
                echo "🎉 Full SSL setup complete! Your site is now secured with HTTPS."
            else
                echo "❌ SSL certificate obtaining failed. Please check domain accessibility."
                exit 1
            fi
            ;;
        4)
            setup_renewal
            echo "🎉 Automatic renewal configured."
            ;;
        *)
            echo "❌ Invalid option selected."
            exit 1
            ;;
    esac
}

# Run main function
main