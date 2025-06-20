# SHAAD Discord Bot

The SHAAD Discord Bot provides comprehensive integration between your Discord server and the SHAAD AI Assistant Dashboard, enabling real-time monitoring, notifications, and AI interaction directly from Discord.

## Features

### 🤖 AI Integration
- Chat with SHAAD AI directly from Discord using slash commands
- Create and manage conversations
- Search through conversation history
- Get system status and statistics

### 📁 Code Monitoring
- Real-time file change notifications
- Git commit detection and announcements
- Automatic code diff posting to designated channels
- Support for multiple file types and filtering

### 🖥️ System Monitoring
- CPU, memory, and disk usage alerts
- Service health monitoring (PostgreSQL, Redis, Nginx)
- Custom alert thresholds
- Rate-limited notifications to prevent spam

### 🔗 Webhook Integration
- GitHub webhook support for repository events
- CI/CD pipeline integration
- Docker Hub webhook support
- Custom webhook endpoints

### 📊 Real-time Updates
- WebSocket integration with SHAAD backend
- Live conversation updates
- System health broadcasts
- Event-driven architecture

## Installation

### Prerequisites
- Node.js 18+ and npm
- Discord Bot Token ([Discord Developer Portal](https://discord.com/developers/applications))
- Running SHAAD backend instance
- PostgreSQL and Redis (for full functionality)

### Setup

1. **Clone and Install Dependencies**
```bash
cd /home/shaad/ai-assistant-dashboard/discord-bot
npm install
```

2. **Configure Environment Variables**
```bash
cp .env.example .env
# Edit .env with your Discord bot token and other settings
```

3. **Build the Project**
```bash
npm run build
```

4. **Start the Bot**
```bash
npm start
```

For development:
```bash
npm run dev
```

## Configuration

### Required Environment Variables

```env
# Discord Bot - Required
DISCORD_BOT_TOKEN=your_bot_token
DISCORD_CLIENT_ID=your_client_id

# SHAAD Integration - Required
SHAAD_API_URL=https://your-shaad-instance.com/api
```

### Optional Environment Variables

```env
# Discord Settings
DISCORD_GUILD_ID=guild_id_for_dev_commands
DISCORD_BOT_PREFIX=!shaad
DISCORD_OWNER_ID=your_user_id

# Monitoring Thresholds
MEMORY_ALERT_THRESHOLD=85
CPU_ALERT_THRESHOLD=80
DISK_ALERT_THRESHOLD=90
```

See `.env.example` for all available configuration options.

## Discord Commands

### Slash Commands

- `/help` - Show all available commands
- `/status` - Check SHAAD system health
- `/conversations [limit]` - List recent conversations
- `/chat <message> [conversation]` - Send message to SHAAD AI
- `/create <title>` - Create new conversation
- `/search <query>` - Search conversations
- `/stats` - Show system statistics

### Text Commands (Prefix: `!shaad`)

- `!shaad help` - Show help message
- `!shaad status` - System status
- `!shaad conversations` - List conversations
- `!shaad chat <message>` - Chat with AI
- `!shaad stats` - System statistics

## Discord Channel Setup

The bot will automatically use these channel names if they exist:

- `#code-updates` - File changes and code updates
- `#git-commits` - Git commit notifications
- `#system-alerts` - System health alerts
- `#general` - General bot messages and responses

If these channels don't exist, the bot will post to the channel where commands are invoked.

## Architecture

### Core Services

1. **CodeMonitor** - Watches for file changes and Git commits
2. **SystemMonitor** - Monitors system health and performance
3. **ShaadIntegration** - Communicates with SHAAD API
4. **WebhookService** - Handles external webhooks
5. **CommandHandler** - Processes Discord commands

### Event Flow

```
File Change → CodeMonitor → Discord Notification
Git Commit → CodeMonitor → Discord Announcement
System Alert → SystemMonitor → Discord Alert
User Command → CommandHandler → SHAAD API → Discord Response
```

## Development

### Project Structure

```
src/
├── index.ts              # Main bot entry point
├── services/             # Core services
│   ├── CodeMonitor.ts    # File/Git monitoring
│   ├── SystemMonitor.ts  # System health monitoring
│   ├── ShaadIntegration.ts # SHAAD API client
│   ├── WebhookService.ts # Webhook server
│   └── CommandHandler.ts # Discord commands
└── utils/
    └── logger.ts         # Logging utility
```

### Building and Running

```bash
# Development with hot reload
npm run dev

# Build for production
npm run build

# Start production build
npm start

# Run type checking
npm run type-check

# Run linter
npm run lint
```

### Adding New Commands

1. Add command definition in `CommandHandler.setupCommands()`
2. Implement handler method
3. Register slash command with Discord
4. Update documentation

Example:
```typescript
// In setupCommands()
this.commands.set('example', {
  data: new SlashCommandBuilder()
    .setName('example')
    .setDescription('Example command'),
  execute: this.handleExampleCommand.bind(this)
});

// Handler method
private async handleExampleCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.reply('Example response!');
}
```

## Monitoring and Logging

### Log Files
- `logs/combined.log` - All logs
- `logs/error.log` - Error logs only
- `logs/debug.log` - Debug logs (development)
- `logs/exceptions.log` - Uncaught exceptions
- `logs/rejections.log` - Unhandled promise rejections

### Health Monitoring
The bot continuously monitors:
- SHAAD backend API health
- PostgreSQL connection
- Redis connection
- Nginx service status
- System resources (CPU, memory, disk)

### Alert Thresholds
- Memory: 85% (configurable)
- CPU: 80% (configurable)
- Disk: 90% (configurable)
- Rate limiting: 1 alert per hour per type

## Security

### Best Practices
- Bot token stored in environment variables
- Webhook signature verification for GitHub
- Rate limiting for alerts and commands
- Input sanitization for all user inputs
- Secure logging (no sensitive data in logs)

### Permissions
The bot requires these Discord permissions:
- Send Messages
- Use Slash Commands
- Read Message History
- Embed Links
- Attach Files

## Troubleshooting

### Common Issues

1. **Bot not responding to commands**
   - Check bot token is correct
   - Verify bot has required permissions
   - Check if slash commands are registered

2. **File monitoring not working**
   - Verify PROJECT_PATH is correct
   - Check file permissions
   - Ensure Git repository is accessible

3. **SHAAD API connection failing**
   - Verify SHAAD_API_URL is correct
   - Check authentication credentials
   - Ensure SHAAD backend is running

### Debug Mode
Enable debug logging:
```env
LOG_LEVEL=debug
NODE_ENV=development
```

### Support
For issues and feature requests, please check the main SHAAD repository or contact the development team.

## License

This Discord bot is part of the SHAAD project and follows the same licensing terms.