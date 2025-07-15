#!/bin/bash

echo "🔍 SHAAD Connection Diagnostics"
echo "==============================="
echo ""

# Server Info
echo "📍 Server Information:"
echo "─────────────────────"
PUBLIC_IP=$(curl -s ifconfig.me)
echo "Public IP: $PUBLIC_IP"
echo "Hostname: $(hostname)"
echo "OS: $(uname -a | cut -d' ' -f1-3)"
echo ""

# Check if running on cloud provider
echo "☁️  Cloud Provider Detection:"
echo "──────────────────────────"
if [ -f /sys/class/dmi/id/sys_vendor ]; then
    echo "System Vendor: $(cat /sys/class/dmi/id/sys_vendor 2>/dev/null || echo 'Unknown')"
fi
if [ -f /etc/cloud/cloud.cfg ]; then
    echo "Cloud-init detected"
fi
echo ""

# Check for multiple nginx instances
echo "🔧 Nginx Instances:"
echo "──────────────────"
ps aux | grep nginx | grep -v grep | while read line; do
    echo "$line" | awk '{print $2 " " $11 " " $12}'
done
echo ""

# Docker status
echo "🐳 Docker Containers:"
echo "────────────────────"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "NAME|nginx|frontend"
echo ""

# Test local connectivity
echo "🔗 Local Connectivity Tests:"
echo "───────────────────────────"
for url in "http://localhost" "http://127.0.0.1" "http://$PUBLIC_IP"; do
    echo -n "Testing $url... "
    code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 2 "$url")
    if [ "$code" = "200" ] || [ "$code" = "301" ]; then
        echo "✅ OK ($code)"
    else
        echo "❌ Failed ($code)"
    fi
done
echo ""

# Test domain connectivity
echo "🌐 Domain Connectivity Tests:"
echo "────────────────────────────"
for domain in myshaad.com api.myshaad.com n8n.myshaad.com; do
    echo -n "Testing http://$domain... "
    code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "http://$domain")
    if [ "$code" = "200" ] || [ "$code" = "301" ]; then
        echo "✅ OK ($code)"
    else
        echo "❌ Failed ($code)"
    fi
done
echo ""

# Check for cloud firewall hints
echo "🔥 Firewall/Security Hints:"
echo "──────────────────────────"
echo "UFW Status: $(sudo ufw status 2>&1 | head -1 || echo 'Cannot check without sudo')"
echo ""

# Provider-specific checks
echo "💡 Cloud Provider Specific:"
echo "─────────────────────────"
if [[ "$PUBLIC_IP" =~ ^15\.204\. ]]; then
    echo "⚠️  This appears to be an OVH server (IP range 15.204.x.x)"
    echo "   OVH often has a cloud firewall that needs configuration:"
    echo "   1. Log into OVH Manager"
    echo "   2. Go to Bare Metal Cloud → IP → Firewall"
    echo "   3. Ensure ports 80 and 443 are open"
    echo "   4. Check if Anti-DDoS is blocking legitimate traffic"
fi

if [[ "$PUBLIC_IP" =~ ^172\.31\. ]] || [[ "$PUBLIC_IP" =~ ^10\. ]]; then
    echo "⚠️  This appears to be AWS (private IP detected)"
    echo "   Check Security Groups in EC2 console"
fi

echo ""
echo "🚀 Next Steps:"
echo "─────────────"
echo "1. Check cloud provider's firewall/security group settings"
echo "2. Ensure ports 80 and 443 are open in the cloud panel"
echo "3. Test with: curl -v http://$PUBLIC_IP"
echo "4. From another server, test: telnet $PUBLIC_IP 80"