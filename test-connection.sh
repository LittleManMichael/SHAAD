#!/bin/bash

echo "🔍 SHAAD Connection Test"
echo "========================"
echo ""

# Get public IP
PUBLIC_IP=$(curl -s ifconfig.me)
echo "📍 Server Public IP: $PUBLIC_IP"
echo ""

# Test DNS resolution
echo "🌐 DNS Resolution Test:"
echo "─────────────────────"
for domain in myshaad.com api.myshaad.com n8n.myshaad.com; do
    echo -n "Testing $domain... "
    resolved_ip=$(getent hosts $domain | awk '{ print $1 }' | head -n1)
    if [ "$resolved_ip" = "$PUBLIC_IP" ]; then
        echo "✅ Resolves to $resolved_ip"
    else
        echo "❌ Resolves to $resolved_ip (expected $PUBLIC_IP)"
    fi
done
echo ""

# Test HTTP connectivity
echo "🔗 HTTP Connectivity Test:"
echo "──────────────────────────"
for domain in myshaad.com api.myshaad.com n8n.myshaad.com; do
    echo -n "Testing http://$domain... "
    if curl -s -o /dev/null -w "%{http_code}" --max-time 5 "http://$domain" | grep -q "200\|301\|302"; then
        echo "✅ Accessible"
    else
        echo "❌ Not accessible"
    fi
done
echo ""

echo "💡 Troubleshooting Tips:"
echo "────────────────────────"
echo "1. Clear your browser cache and cookies"
echo "2. Try accessing in incognito/private mode"
echo "3. Try a different browser"
echo "4. Flush your DNS cache:"
echo "   - Windows: ipconfig /flushdns"
echo "   - Mac: sudo dscacheutil -flushcache"
echo "   - Linux: sudo systemctl restart systemd-resolved"
echo "5. Try accessing directly by IP: http://$PUBLIC_IP"
echo ""
echo "📱 Test from your phone on mobile data (not WiFi)"
echo "   to rule out local network issues"