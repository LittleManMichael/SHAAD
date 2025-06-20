#!/bin/bash

# SHAAD Discord Bot Setup Script
# Automates the setup and configuration of the Discord bot

set -e

echo "🤖 SHAAD Discord Bot Setup"
echo "=========================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Create logs directory
echo "📁 Creating logs directory..."
mkdir -p logs
chmod 755 logs

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
else
    echo "✅ Dependencies already installed"
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚙️ Creating .env file from template..."
    cp .env.example .env
    echo "❓ Please edit .env file with your Discord bot token and other settings"
    echo "   Required: DISCORD_BOT_TOKEN, DISCORD_CLIENT_ID"
    echo "   Optional: SHAAD_API_URL, DISCORD_GUILD_ID, etc."
    
    # Prompt for basic configuration
    read -p "Enter your Discord Bot Token (or press Enter to skip): " DISCORD_TOKEN
    if [ ! -z "$DISCORD_TOKEN" ]; then
        sed -i "s/your_discord_bot_token_here/$DISCORD_TOKEN/" .env
        echo "✅ Discord bot token configured"
    fi
    
    read -p "Enter your Discord Client ID (or press Enter to skip): " DISCORD_CLIENT
    if [ ! -z "$DISCORD_CLIENT" ]; then
        sed -i "s/your_discord_client_id_here/$DISCORD_CLIENT/" .env
        echo "✅ Discord client ID configured"
    fi
    
    read -p "Enter your Discord Guild ID for dev commands (or press Enter to skip): " DISCORD_GUILD
    if [ ! -z "$DISCORD_GUILD" ]; then
        sed -i "s/your_discord_guild_id_for_dev_commands/$DISCORD_GUILD/" .env
        echo "✅ Discord guild ID configured"
    fi
else
    echo "✅ .env file already exists"
fi

# Build the project
echo "🔨 Building TypeScript..."
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Build successful"
else
    echo "❌ Build failed"
    exit 1
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your Discord bot configuration"
echo "2. Create Discord bot at https://discord.com/developers/applications"
echo "3. Invite bot to your Discord server with appropriate permissions"
echo "4. Run 'npm start' to start the bot"
echo ""
echo "Development commands:"
echo "- npm run dev    # Start with hot reload"
echo "- npm run build  # Build TypeScript"
echo "- npm start      # Start production build"
echo ""
echo "For detailed setup instructions, see README.md"