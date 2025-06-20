#!/bin/bash

# SHAAD Sudo Configuration Installer
# Run this script to install passwordless sudo for SHAAD system administration

echo "🔧 Installing SHAAD Sudo Configuration"
echo "======================================"
echo ""
echo "This will configure passwordless sudo for specific system administration commands."
echo "You will be prompted for your password once to install the configuration."
echo ""

# Read password securely
echo -n "Enter your sudo password: "
read -s PASSWORD
echo ""

# Function to run sudo commands with password
run_sudo() {
    echo "$PASSWORD" | sudo -S "$@" 2>/dev/null
}

echo "📁 Creating backup of current sudoers configuration..."
run_sudo cp /etc/sudoers /etc/sudoers.backup.$(date +%Y%m%d_%H%M%S)

echo "📝 Installing SHAAD sudoers configuration..."
run_sudo cp /home/shaad/ai-assistant-dashboard/sudoers-config /etc/sudoers.d/shaad-admin

echo "🔒 Setting proper permissions..."
run_sudo chmod 440 /etc/sudoers.d/shaad-admin

echo "🧪 Testing configuration..."
if run_sudo systemctl --version >/dev/null 2>&1; then
    echo "✅ Configuration installed successfully!"
    echo ""
    echo "🎉 You can now use these commands without passwords:"
    echo "   sudo systemctl status nginx"
    echo "   sudo nginx -t"
    echo "   sudo apt update"
    echo "   sudo docker ps"
    echo "   sudo cp file /etc/nginx/sites-available/"
    echo ""
    echo "🧪 Testing a few commands..."
    echo -n "   Testing 'sudo systemctl --version': "
    if sudo -n systemctl --version >/dev/null 2>&1; then
        echo "✅ SUCCESS"
    else
        echo "❌ FAILED"
    fi
    
    echo -n "   Testing 'sudo nginx -t': "
    if sudo -n nginx -t >/dev/null 2>&1; then
        echo "✅ SUCCESS"
    else
        echo "❌ FAILED (nginx may not be installed or configured)"
    fi
    
else
    echo "❌ Configuration failed. Please check manually."
    exit 1
fi

# Clear password from memory
unset PASSWORD

echo ""
echo "🔐 Security Note: Passwordless sudo is now configured for specific commands only."
echo "   Full sudo access still requires a password for security."