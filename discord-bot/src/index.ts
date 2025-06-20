/**
 * SHAAD Discord Bot
 * 
 * Main entry point for the Discord bot that provides:
 * - Real-time codebase change notifications
 * - System monitoring and alerts
 * - AI interaction through Discord
 * - Remote SHAAD administration
 */

import { Client, GatewayIntentBits, Events, Collection, EmbedBuilder, TextChannel } from 'discord.js';
import dotenv from 'dotenv';
import path from 'path';
import { ShaadIntegration } from './services/ShaadIntegration';
import { CodeMonitor } from './services/CodeMonitor';
import { SystemMonitor } from './services/SystemMonitor';
import { WebhookService } from './services/WebhookService';
import { CommandHandler } from './services/CommandHandler';
import { logger } from './utils/logger';
import { env } from './utils/env';

// Environment variables are loaded and validated in env.ts

class ShaadDiscordBot {
  private client: Client;
  private shaadIntegration: ShaadIntegration;
  private codeMonitor: CodeMonitor;
  private systemMonitor: SystemMonitor;
  private webhookService: WebhookService;
  private commandHandler: CommandHandler;

  constructor() {
    // Initialize Discord client with required intents
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages
      ]
    });

    // Initialize services
    this.shaadIntegration = new ShaadIntegration();
    this.codeMonitor = new CodeMonitor();
    this.systemMonitor = new SystemMonitor();
    this.webhookService = new WebhookService();
    this.commandHandler = new CommandHandler(this.client, this.shaadIntegration);

    this.setupEventHandlers();
  }

  /**
   * Set up Discord event handlers
   */
  private setupEventHandlers(): void {
    // Bot ready event
    this.client.once(Events.ClientReady, async (client) => {
      logger.info(`🤖 SHAAD Discord Bot is ready! Logged in as ${client.user.tag}`);
      
      // Initialize services
      await this.initializeServices();
      
      // Set bot status
      this.client.user?.setActivity('SHAAD Development', { type: 3 }); // Type 3 = Watching
      
      // Send startup notification
      await this.sendStartupNotification();
    });

    // Message handler for commands
    this.client.on(Events.MessageCreate, async (message) => {
      if (message.author.bot) return;
      await this.commandHandler.handleMessage(message);
    });

    // Interaction handler for slash commands
    this.client.on(Events.InteractionCreate, async (interaction) => {
      await this.commandHandler.handleInteraction(interaction);
    });

    // Error handling
    this.client.on(Events.Error, (error) => {
      logger.error('Discord client error:', error);
    });

    // Reconnection handling
    this.client.on('reconnecting' as any, () => {
      logger.info('Discord bot reconnecting...');
    });

    this.client.on('resume' as any, () => {
      logger.info('Discord bot resumed connection');
    });
  }

  /**
   * Initialize all monitoring and integration services
   */
  private async initializeServices(): Promise<void> {
    try {
      logger.info('Initializing SHAAD Discord Bot services...');

      // Initialize SHAAD API integration
      await this.shaadIntegration.initialize();

      // Start code monitoring (watches for file changes)
      await this.codeMonitor.start({
        projectPath: env.monitoring.projectPath,
        onFileChange: this.handleCodeChange.bind(this),
        onGitCommit: this.handleGitCommit.bind(this),
        gitPollingInterval: env.monitoring.gitPollingInterval,
        maxFileSize: env.monitoring.maxFileSize
      });

      // Start system monitoring
      await this.systemMonitor.start({
        onSystemAlert: this.handleSystemAlert.bind(this),
        onHealthCheck: this.handleHealthCheck.bind(this),
        checkInterval: env.monitoring.healthCheckInterval,
        alertThresholds: {
          memory: env.monitoring.memoryThreshold,
          cpu: env.monitoring.cpuThreshold,
          disk: env.monitoring.diskThreshold
        }
      });

      // Start webhook service for external integrations
      await this.webhookService.start({
        port: env.webhook.port,
        secret: env.webhook.secret,
        onWebhook: this.handleWebhook.bind(this)
      });

      logger.info('✅ All SHAAD Discord Bot services initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize services:', error);
      throw error;
    }
  }

  /**
   * Handle code changes detected by file monitor
   */
  private async handleCodeChange(change: {
    type: 'add' | 'change' | 'unlink';
    path: string;
    content?: string;
  }): Promise<void> {
    // Try to find the code changes channel
    const channel = await this.findChannelByName(env.channels.fileChanges);
    if (!channel) return;

    const emoji = {
      add: '🆕',
      change: '✏️',
      unlink: '🗑️'
    };

    const action = {
      add: 'Added',
      change: 'Modified',
      unlink: 'Deleted'
    };

    const embed = new EmbedBuilder()
      .setColor(change.type === 'add' ? 0x00ff00 : change.type === 'change' ? 0xffff00 : 0xff0000)
      .setTitle(`${emoji[change.type]} ${action[change.type]} File`)
      .setDescription(`\`${change.path}\``)
      .setTimestamp()
      .setFooter({ text: 'SHAAD Code Monitor' });

    // Add code diff if it's a small change
    if (change.content && change.content.length < 1000) {
      embed.addFields({
        name: 'Preview',
        value: `\`\`\`${this.getFileExtension(change.path)}\n${change.content.substring(0, 500)}${change.content.length > 500 ? '\n...' : ''}\n\`\`\``,
        inline: false
      });
    }

    await (channel as TextChannel).send({ embeds: [embed] });
  }

  /**
   * Handle Git commits
   */
  private async handleGitCommit(commit: {
    hash: string;
    message: string;
    author: string;
    files: string[];
  }): Promise<void> {
    // Try to find the git commits channel
    const channel = await this.findChannelByName(env.channels.gitCommits);
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setColor(0x7289da)
      .setTitle('📝 New Git Commit')
      .setDescription(commit.message)
      .addFields(
        {
          name: 'Author',
          value: commit.author,
          inline: true
        },
        {
          name: 'Commit Hash',
          value: `\`${commit.hash.substring(0, 8)}\``,
          inline: true
        },
        {
          name: 'Files Changed',
          value: commit.files.length > 5 
            ? `${commit.files.slice(0, 5).map(f => `\`${f}\``).join('\n')}\n... and ${commit.files.length - 5} more`
            : commit.files.map(f => `\`${f}\``).join('\n') || 'No files',
          inline: false
        }
      )
      .setTimestamp()
      .setFooter({ text: 'SHAAD Git Monitor' });

    await (channel as TextChannel).send({ embeds: [embed] });
  }

  /**
   * Handle system alerts
   */
  private async handleSystemAlert(alert: {
    level: 'info' | 'warning' | 'error' | 'critical';
    title: string;
    message: string;
    details?: any;
  }): Promise<void> {
    // Try to find the system alerts channel
    const channel = await this.findChannelByName(env.channels.systemAlerts);
    if (!channel) return;

    const colors = {
      info: 0x36a2eb,
      warning: 0xffa500,
      error: 0xff0000,
      critical: 0x8b0000
    };

    const emojis = {
      info: 'ℹ️',
      warning: '⚠️',
      error: '❌',
      critical: '🚨'
    };

    const embed = new EmbedBuilder()
      .setColor(colors[alert.level])
      .setTitle(`${emojis[alert.level]} ${alert.title}`)
      .setDescription(alert.message)
      .setTimestamp()
      .setFooter({ text: 'SHAAD System Monitor' });

    if (alert.details) {
      embed.addFields({
        name: 'Details',
        value: `\`\`\`json\n${JSON.stringify(alert.details, null, 2).substring(0, 1000)}\n\`\`\``,
        inline: false
      });
    }

    await (channel as TextChannel).send({ embeds: [embed] });
  }

  /**
   * Handle health checks
   */
  private async handleHealthCheck(health: any): Promise<void> {
    // Only send if status changed or if it's been a while
    const channel = await this.findChannelByName(env.channels.systemAlerts);
    if (!channel) return;

    // Send detailed health reports every hour or on status change
    // Implementation would track last status and time
    logger.debug('Health check received:', health);
  }

  /**
   * Handle webhook events
   */
  private async handleWebhook(webhook: {
    source: string;
    event: string;
    data: any;
  }): Promise<void> {
    // Try to find a suitable channel for webhook notifications
    const channel = await this.findChannelByName(env.channels.general);
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setColor(0x9932cc)
      .setTitle(`🔗 Webhook: ${webhook.source}`)
      .setDescription(`Event: \`${webhook.event}\``)
      .addFields({
        name: 'Data',
        value: `\`\`\`json\n${JSON.stringify(webhook.data, null, 2).substring(0, 1000)}\n\`\`\``,
        inline: false
      })
      .setTimestamp()
      .setFooter({ text: 'SHAAD Webhook Handler' });

    await (channel as TextChannel).send({ embeds: [embed] });
  }

  /**
   * Send startup notification
   */
  private async sendStartupNotification(): Promise<void> {
    // Try to find the general channel
    const channel = await this.findChannelByName(env.channels.general);
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle('🚀 SHAAD Discord Bot Started')
      .setDescription('Bot is now online and monitoring your SHAAD development environment!')
      .addFields(
        {
          name: 'Features Active',
          value: '• 📁 Code change monitoring\n• 🔧 System health monitoring\n• 🔗 Webhook integrations\n• 🤖 AI command interface',
          inline: false
        },
        {
          name: 'Available Commands',
          value: `Type \`${env.discord.prefix} help\` for a list of available commands`,
          inline: false
        }
      )
      .setTimestamp()
      .setFooter({ text: 'SHAAD Development Team' });

    await (channel as TextChannel).send({ embeds: [embed] });
  }

  /**
   * Get file extension for syntax highlighting
   */
  private getFileExtension(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const mapping: Record<string, string> = {
      '.ts': 'typescript',
      '.js': 'javascript',
      '.json': 'json',
      '.md': 'markdown',
      '.yml': 'yaml',
      '.yaml': 'yaml',
      '.sql': 'sql',
      '.env': 'bash',
      '.sh': 'bash'
    };
    return mapping[ext] || 'text';
  }

  /**
   * Start the Discord bot
   */
  /**
   * Find Discord channel by name across all guilds
   */
  private async findChannelByName(channelName: string): Promise<TextChannel | null> {
    // Search through all guilds for the channel
    for (const guild of this.client.guilds.cache.values()) {
      const channel = guild.channels.cache.find(ch => 
        ch.name === channelName && ch.isTextBased()
      ) as TextChannel;
      if (channel) return channel;
    }
    
    // If not found, try to use the first available text channel
    const firstGuild = this.client.guilds.cache.first();
    if (firstGuild) {
      const firstChannel = firstGuild.channels.cache.find(ch => ch.isTextBased()) as TextChannel;
      if (firstChannel) {
        logger.warn(`Channel '${channelName}' not found, using '${firstChannel.name}' instead`);
        return firstChannel;
      }
    }
    
    logger.warn(`No suitable Discord channel found for '${channelName}'`);
    return null;
  }

  public async start(): Promise<void> {
    try {
      logger.info('Starting SHAAD Discord Bot...');
      await this.client.login(env.discord.token);
      
      // Register slash commands after login
      this.client.once(Events.ClientReady, async () => {
        await this.commandHandler.registerSlashCommands();
      });
    } catch (error) {
      logger.error('Failed to start Discord bot:', error);
      throw error;
    }
  }

  /**
   * Stop the Discord bot gracefully
   */
  public async stop(): Promise<void> {
    logger.info('Stopping SHAAD Discord Bot...');
    
    // Stop services
    await this.codeMonitor.stop();
    await this.systemMonitor.stop();
    await this.webhookService.stop();
    
    // Destroy Discord client
    this.client.destroy();
    
    logger.info('SHAAD Discord Bot stopped');
  }
}

// Start the bot if this file is run directly
if (require.main === module) {
  const bot = new ShaadDiscordBot();
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\nReceived SIGINT, shutting down gracefully...');
    await bot.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\nReceived SIGTERM, shutting down gracefully...');
    await bot.stop();
    process.exit(0);
  });

  // Start the bot
  bot.start().catch((error) => {
    console.error('Failed to start SHAAD Discord Bot:', error);
    process.exit(1);
  });
}

export { ShaadDiscordBot };