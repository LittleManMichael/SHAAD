#!/bin/bash

# SHAAD Sudo Setup Script
# This script configures passwordless sudo for specific system administration commands

echo "🔧 SHAAD Sudo Configuration Setup"
echo "=================================="
echo ""

# Check if we're running as the shaad user
if [ "$USER" != "shaad" ]; then
    echo "❌ This script should be run as the 'shaad' user"
    exit 1
fi

echo "📋 This script will configure passwordless sudo for SHAAD system administration."
echo "   The following commands will be allowed without password:"
echo "   - systemctl (service management)"
echo "   - nginx (web server configuration)"
echo "   - apt (package management)"
echo "   - docker/docker-compose (container management)"
echo "   - File operations in SHAAD project directory"
echo "   - System monitoring and logs"
echo ""

# Backup existing sudoers file
echo "📁 Creating backup of current sudoers configuration..."
sudo -S cp /etc/sudoers /etc/sudoers.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null

# Copy our configuration to sudoers.d
echo "📝 Installing SHAAD sudoers configuration..."
sudo -S cp /home/shaad/ai-assistant-dashboard/sudoers-config /etc/sudoers.d/shaad-admin 2>/dev/null

# Set proper permissions
echo "🔒 Setting proper permissions..."
sudo -S chmod 440 /etc/sudoers.d/shaad-admin 2>/dev/null

# Test the configuration
echo "🧪 Testing sudo configuration..."
if sudo -n systemctl --version >/dev/null 2>&1; then
    echo "✅ Sudo configuration successful!"
    echo "🎉 You can now use sudo without passwords for system administration tasks."
else
    echo "❌ Sudo configuration failed. Please check manually."
    exit 1
fi

echo ""
echo "🚀 Setup complete! You can now run system administration commands like:"
echo "   sudo systemctl status nginx"
echo "   sudo nginx -t"
echo "   sudo apt update"
echo "   sudo docker ps"
echo ""
echo "⚠️  Security Note: This configuration allows specific system commands without"
echo "   passwords for automation. Review /etc/sudoers.d/shaad-admin if needed."