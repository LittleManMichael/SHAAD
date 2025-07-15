#!/bin/bash

# Check if SHAAD domains are properly configured and accessible

echo "🔍 SHAAD Domain Accessibility Check"
echo "===================================="

# Get server's public IP
PUBLIC_IP=$(curl -s ifconfig.me)
echo "📍 Your server's public IP: $PUBLIC_IP"
echo ""

# Check DNS resolution
check_dns() {
    local domain=$1
    echo "🌐 Checking DNS for $domain..."
    
    # Get IP that domain resolves to
    RESOLVED_IP=$(dig +short $domain | tail -n1)
    
    if [ -z "$RESOLVED_IP" ]; then
        echo "❌ $domain does not resolve to any IP"
        return 1
    elif [ "$RESOLVED_IP" = "$PUBLIC_IP" ]; then
        echo "✅ $domain resolves to $RESOLVED_IP (correct)"
        return 0
    else
        echo "⚠️  $domain resolves to $RESOLVED_IP (expected: $PUBLIC_IP)"
        return 1
    fi
}

# Check HTTP accessibility
check_http() {
    local domain=$1
    echo "🔗 Checking HTTP accessibility for $domain..."
    
    if curl -s --max-time 10 "http://$domain/.well-known/acme-challenge/test" | grep -q "test"; then
        echo "✅ $domain is accessible via HTTP"
        return 0
    else
        echo "❌ $domain is not accessible via HTTP"
        return 1
    fi
}

# Check all domains
domains=("myshaad.com" "api.myshaad.com" "n8n.myshaad.com")
all_ready=true

for domain in "${domains[@]}"; do
    echo ""
    echo "🔍 Testing $domain:"
    echo "─────────────────────────"
    
    dns_ok=false
    http_ok=false
    
    if check_dns $domain; then
        dns_ok=true
    fi
    
    if check_http $domain; then
        http_ok=true
    fi
    
    if [ "$dns_ok" = true ] && [ "$http_ok" = true ]; then
        echo "✅ $domain is ready for SSL certificates"
    else
        echo "❌ $domain is not ready"
        all_ready=false
    fi
done

echo ""
echo "📋 Summary:"
echo "==========="

if [ "$all_ready" = true ]; then
    echo "🎉 All domains are ready for SSL certificate setup!"
    echo ""
    echo "Run this command to obtain SSL certificates:"
    echo "./manual-ssl-setup.sh"
else
    echo "⚠️  Some domains are not ready. Please:"
    echo ""
    echo "1. Configure DNS A records:"
    for domain in "${domains[@]}"; do
        echo "   A    $domain → $PUBLIC_IP"
    done
    echo ""
    echo "2. Wait for DNS propagation (5-30 minutes)"
    echo "3. Ensure firewall allows port 80"
    echo "4. Run this script again to verify"
fi

echo ""
echo "🛠️  Manual DNS Configuration:"
echo "If you're using a DNS provider, add these A records:"
echo ""
for domain in "${domains[@]}"; do
    echo "Record Type: A"
    echo "Name: ${domain%.*myshaad.com}"
    echo "Value: $PUBLIC_IP"
    echo "TTL: 300"
    echo ""
done