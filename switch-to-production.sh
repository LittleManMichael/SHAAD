#!/bin/bash

# Switch SHAAD to production mode with standard ports
# This script updates nginx to use ports 80/443 instead of 8080/8443

set -e

echo "🚀 Switching SHAAD to Production Mode"
echo "====================================="

# Check what's currently using port 80
check_port_80() {
    echo "🔍 Checking what's using port 80..."
    
    if ss -tlnp | grep :80 > /dev/null; then
        echo "⚠️  Port 80 is currently in use:"
        ss -tlnp | grep :80
        echo ""
        read -p "Do you want to continue? This may stop other services. (y/N): " confirm
        if [[ $confirm != [yY] ]]; then
            echo "❌ Aborted by user"
            exit 1
        fi
    else
        echo "✅ Port 80 is available"
    fi
}

# Update Docker Compose to use standard ports
update_ports() {
    echo "🔧 Updating nginx to use standard ports 80/443..."
    
    # Backup current configuration
    cp /home/shaad/ai-assistant-dashboard/docker-compose.yml \
       /home/shaad/ai-assistant-dashboard/docker-compose.yml.backup
    
    # Update ports
    sed -i 's/8080:80/80:80/g' /home/shaad/ai-assistant-dashboard/docker-compose.yml
    sed -i 's/8443:443/443:443/g' /home/shaad/ai-assistant-dashboard/docker-compose.yml
    
    echo "✅ Ports updated in docker-compose.yml"
}

# Restart services
restart_services() {
    echo "🔄 Restarting services with new port configuration..."
    
    # Stop nginx first
    docker stop shaad_nginx || true
    docker rm shaad_nginx || true
    
    # Start nginx with new ports
    docker compose --profile backend --profile frontend up -d nginx
    
    echo "✅ Services restarted on standard ports"
}

# Test the new configuration
test_configuration() {
    echo "🧪 Testing new configuration..."
    
    sleep 5
    
    # Test frontend
    if curl -H "Host: myshaad.com" -s http://localhost/ > /dev/null; then
        echo "✅ Frontend accessible on port 80"
    else
        echo "❌ Frontend not accessible on port 80"
    fi
    
    # Test API
    if curl -H "Host: api.myshaad.com" -s http://localhost/health > /dev/null; then
        echo "✅ API accessible on port 80"
    else
        echo "❌ API not accessible on port 80"
    fi
    
    # Test n8n
    if curl -H "Host: n8n.myshaad.com" -s http://localhost/healthz > /dev/null; then
        echo "✅ n8n accessible on port 80"
    else
        echo "❌ n8n not accessible on port 80"
    fi
}

# Show final status
show_status() {
    echo ""
    echo "🎉 Production Mode Setup Complete!"
    echo "=================================="
    echo ""
    echo "Your SHAAD platform is now running on standard ports:"
    echo "• Frontend: http://myshaad.com (port 80)"
    echo "• API: http://api.myshaad.com (port 80)"
    echo "• n8n: http://n8n.myshaad.com (port 80)"
    echo ""
    echo "Next steps:"
    echo "1. Configure your DNS to point domains to this server"
    echo "2. Run ./ssl-setup.sh to enable HTTPS"
    echo "3. Configure firewall to allow ports 80 and 443"
    echo ""
    echo "Current service status:"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep shaad
}

# Main execution
main() {
    echo "This will switch nginx from ports 8080/8443 to standard ports 80/443."
    echo ""
    read -p "Do you want to proceed? (y/N): " confirm
    
    if [[ $confirm != [yY] ]]; then
        echo "❌ Operation cancelled"
        exit 0
    fi
    
    check_port_80
    update_ports
    restart_services
    test_configuration
    show_status
}

# Run main function
main