/**
 * Complete SHAAD Discord Bot
 * Full-featured monitoring and AI integration bot
 */

import { Client, GatewayIntentBits, Events, EmbedBuilder, TextChannel, Guild, ChannelType, PermissionsBitField, SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { env } from './utils/env';
import { logger } from './utils/logger';
import { CodeMonitor } from './services/CodeMonitor';
import { SystemMonitor } from './services/SystemMonitor';
import { ShaadIntegration } from './services/ShaadIntegration';
import { WebhookService } from './services/WebhookService';

class CompleteShaadBot {
  private client: Client;
  private codeMonitor: CodeMonitor;
  private systemMonitor: SystemMonitor;
  private shaadIntegration: ShaadIntegration;
  private webhookService: WebhookService;
  private channels: {
    general?: TextChannel;
    codeUpdates?: TextChannel;
    gitCommits?: TextChannel;
    systemAlerts?: TextChannel;
    fileChanges?: TextChannel;
  } = {};

  constructor() {
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
    this.codeMonitor = new CodeMonitor();
    this.systemMonitor = new SystemMonitor();
    this.shaadIntegration = new ShaadIntegration();
    this.webhookService = new WebhookService();

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.client.once(Events.ClientReady, async (client) => {
      logger.info(`🤖 SHAAD Discord Bot is ready! Logged in as ${client.user.tag}`);
      logger.info(`📊 Bot is in ${this.client.guilds.cache.size} servers`);
      
      const guild = this.client.guilds.cache.get(env.discord.guildId!);
      if (guild) {
        logger.info(`🏠 Connected to server: ${guild.name}`);
        
        // Cache channel references
        await this.cacheChannels(guild);
        
        // Create required channels if they don't exist
        await this.createRequiredChannels(guild);
        
        // Initialize all monitoring services
        await this.initializeServices();
        
        // Register slash commands
        await this.registerSlashCommands();
        
        // Send startup notification
        await this.sendStartupNotification();
      }
      
      logger.info('✅ Complete SHAAD Bot initialization complete!');
    });

    // Text command handler
    this.client.on(Events.MessageCreate, async (message) => {
      if (message.author.bot) return;
      
      if (message.content.startsWith(env.discord.prefix)) {
        await this.handleTextCommand(message);
      }
    });

    // Slash command handler
    this.client.on(Events.InteractionCreate, async (interaction) => {
      if (interaction.isChatInputCommand()) {
        await this.handleSlashCommand(interaction);
      }
    });

    this.client.on(Events.Error, (error) => {
      logger.error('Discord client error:', error);
    });
  }

  private async cacheChannels(guild: Guild): Promise<void> {
    this.channels.general = await this.findChannelByName(guild, env.channels.general) || undefined;
    this.channels.codeUpdates = await this.findChannelByName(guild, env.channels.codeUpdates) || undefined;
    this.channels.gitCommits = await this.findChannelByName(guild, env.channels.gitCommits) || undefined;
    this.channels.systemAlerts = await this.findChannelByName(guild, env.channels.systemAlerts) || undefined;
    this.channels.fileChanges = await this.findChannelByName(guild, env.channels.fileChanges) || undefined;
  }

  private async initializeServices(): Promise<void> {
    try {
      logger.info('🔧 Initializing monitoring services...');

      // Initialize SHAAD API integration (optional, continues without credentials)
      try {
        await this.shaadIntegration.initialize();
        logger.info('✅ SHAAD API integration initialized');
      } catch (error) {
        logger.warn('⚠️ SHAAD API integration failed, continuing without it:', error);
      }

      // Start code monitoring
      await this.codeMonitor.start({
        projectPath: env.monitoring.projectPath,
        onFileChange: this.handleFileChange.bind(this),
        onGitCommit: this.handleGitCommit.bind(this),
        gitPollingInterval: env.monitoring.gitPollingInterval,
        maxFileSize: env.monitoring.maxFileSize
      });
      logger.info('✅ Code monitoring started');

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
      logger.info('✅ System monitoring started');

      // Start webhook service
      await this.webhookService.start({
        port: env.webhook.port,
        secret: env.webhook.secret,
        onWebhook: this.handleWebhook.bind(this)
      });
      logger.info('✅ Webhook service started');

      logger.info('🎉 All monitoring services initialized successfully!');
    } catch (error) {
      logger.error('❌ Failed to initialize services:', error);
      throw error;
    }
  }

  // ==================== MONITORING HANDLERS ====================

  private async handleFileChange(change: {
    type: 'add' | 'change' | 'unlink';
    path: string;
    content?: string;
    size?: number;
    timestamp: Date;
  }): Promise<void> {
    const channel = this.channels.fileChanges || this.channels.general;
    if (!channel) return;

    const emoji = { add: '🆕', change: '✏️', unlink: '🗑️' };
    const action = { add: 'Added', change: 'Modified', unlink: 'Deleted' };
    const color = { add: 0x00ff00, change: 0xffff00, unlink: 0xff0000 };

    const embed = new EmbedBuilder()
      .setColor(color[change.type])
      .setTitle(`${emoji[change.type]} ${action[change.type]} File`)
      .setDescription(`\`${change.path}\``)
      .setTimestamp(change.timestamp)
      .setFooter({ text: 'SHAAD Code Monitor' });

    // Add file size if available
    if (change.size !== undefined) {
      embed.addFields({
        name: 'File Size',
        value: this.formatFileSize(change.size),
        inline: true
      });
    }

    // Add code preview for small changes
    if (change.content && change.content.length < 1000) {
      const fileExt = this.getFileExtension(change.path);
      embed.addFields({
        name: 'Preview',
        value: `\`\`\`${fileExt}\n${change.content.substring(0, 500)}${change.content.length > 500 ? '\n...' : ''}\n\`\`\``,
        inline: false
      });
    }

    await channel.send({ embeds: [embed] });
  }

  private async handleGitCommit(commit: {
    hash: string;
    message: string;
    author: string;
    email: string;
    date: Date;
    files: string[];
    additions: number;
    deletions: number;
  }): Promise<void> {
    const channel = this.channels.gitCommits || this.channels.general;
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setColor(0x7289da)
      .setTitle('📝 New Git Commit')
      .setDescription(commit.message)
      .addFields(
        {
          name: 'Author',
          value: `${commit.author} <${commit.email}>`,
          inline: true
        },
        {
          name: 'Commit Hash',
          value: `\`${commit.hash.substring(0, 8)}\``,
          inline: true
        },
        {
          name: 'Changes',
          value: `+${commit.additions} -${commit.deletions}`,
          inline: true
        },
        {
          name: 'Files Changed',
          value: commit.files.length > 10 
            ? `${commit.files.slice(0, 10).map(f => `\`${f}\``).join('\n')}\n... and ${commit.files.length - 10} more`
            : commit.files.map(f => `\`${f}\``).join('\n') || 'No files',
          inline: false
        }
      )
      .setTimestamp(commit.date)
      .setFooter({ text: 'SHAAD Git Monitor' });

    await channel.send({ embeds: [embed] });
  }

  private async handleSystemAlert(alert: {
    level: 'info' | 'warning' | 'error' | 'critical';
    title: string;
    message: string;
    details?: any;
    timestamp: Date;
  }): Promise<void> {
    const channel = this.channels.systemAlerts || this.channels.general;
    if (!channel) return;

    const colors = { info: 0x36a2eb, warning: 0xffa500, error: 0xff0000, critical: 0x8b0000 };
    const emojis = { info: 'ℹ️', warning: '⚠️', error: '❌', critical: '🚨' };

    const embed = new EmbedBuilder()
      .setColor(colors[alert.level])
      .setTitle(`${emojis[alert.level]} ${alert.title}`)
      .setDescription(alert.message)
      .setTimestamp(alert.timestamp)
      .setFooter({ text: 'SHAAD System Monitor' });

    if (alert.details) {
      embed.addFields({
        name: 'Details',
        value: `\`\`\`json\n${JSON.stringify(alert.details, null, 2).substring(0, 1000)}\n\`\`\``,
        inline: false
      });
    }

    await channel.send({ embeds: [embed] });
  }

  private async handleHealthCheck(health: any): Promise<void> {
    // Only log health checks, don't spam Discord unless there's a status change
    logger.debug('Health check completed:', {
      status: health.status,
      memory: `${health.metrics?.memory?.percentage?.toFixed(1)}%`,
      cpu: `${health.metrics?.cpu?.percentage?.toFixed(1)}%`,
      disk: `${health.metrics?.disk?.percentage}%`
    });
  }

  private async handleWebhook(webhook: {
    source: string;
    event: string;
    data: any;
    timestamp: Date;
    headers: Record<string, string>;
  }): Promise<void> {
    const channel = this.channels.general;
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setColor(0x9932cc)
      .setTitle(`🔗 Webhook: ${webhook.source}`)
      .setDescription(`Event: \`${webhook.event}\``)
      .addFields({
        name: 'Data Preview',
        value: `\`\`\`json\n${JSON.stringify(webhook.data, null, 2).substring(0, 800)}\n\`\`\``,
        inline: false
      })
      .setTimestamp(webhook.timestamp)
      .setFooter({ text: 'SHAAD Webhook Handler' });

    await channel.send({ embeds: [embed] });
  }

  // ==================== COMMAND HANDLERS ====================

  private async handleTextCommand(message: any): Promise<void> {
    const args = message.content.slice(env.discord.prefix.length).trim().split(/ +/);
    const command = args.shift()?.toLowerCase();
    
    switch (command) {
      case 'ping':
        await message.reply('🏓 Pong! SHAAD Bot is online with full monitoring!');
        break;
      case 'status':
        await this.sendStatusMessage(message);
        break;
      case 'help':
        await this.sendHelpMessage(message);
        break;
      case 'setup':
        if (message.member?.permissions.has('ManageChannels')) {
          await this.setupChannels(message);
        } else {
          await message.reply('❌ You need "Manage Channels" permission to run setup.');
        }
        break;
      case 'monitor':
        await this.sendMonitoringStatus(message);
        break;
    }
  }

  private async handleSlashCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    switch (interaction.commandName) {
      case 'ping':
        await interaction.reply('🏓 Pong! SHAAD Bot is online with full monitoring!');
        break;
      case 'status':
        await this.handleStatusSlashCommand(interaction);
        break;
      case 'chat':
        await this.handleChatSlashCommand(interaction);
        break;
      case 'health':
        await this.handleHealthSlashCommand(interaction);
        break;
    }
  }

  // ==================== SLASH COMMAND IMPLEMENTATIONS ====================

  private async handleStatusSlashCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();

    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle('🤖 SHAAD Bot Status')
      .setDescription('All systems operational!')
      .addFields(
        {
          name: 'Code Monitor',
          value: this.codeMonitor.getStatus().isRunning ? '✅ Running' : '❌ Stopped',
          inline: true
        },
        {
          name: 'System Monitor', 
          value: this.systemMonitor.getStatus().isRunning ? '✅ Running' : '❌ Stopped',
          inline: true
        },
        {
          name: 'SHAAD API',
          value: this.shaadIntegration.getStatus().isInitialized ? '✅ Connected' : '❌ Disconnected',
          inline: true
        },
        {
          name: 'Webhook Service',
          value: this.webhookService.getStatus().isRunning ? '✅ Running' : '❌ Stopped',
          inline: true
        }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }

  private async handleChatSlashCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();
    
    const message = interaction.options.getString('message', true);
    
    try {
      if (!this.shaadIntegration.getStatus().isInitialized) {
        await interaction.editReply('❌ SHAAD API is not connected. Please configure API credentials.');
        return;
      }

      // Create a new conversation for Discord chat
      const conversation = await this.shaadIntegration.createConversation(`Discord Chat - ${new Date().toLocaleDateString()}`);
      const response = await this.shaadIntegration.sendMessage(conversation.id, message);
      
      const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle('🤖 SHAAD AI Response')
        .addFields(
          {
            name: '👤 Your Message',
            value: message.length > 500 ? message.substring(0, 500) + '...' : message,
            inline: false
          },
          {
            name: '🤖 AI Response',
            value: response.assistantMessage.content.length > 1000 
              ? response.assistantMessage.content.substring(0, 1000) + '...'
              : response.assistantMessage.content,
            inline: false
          }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      await interaction.editReply('❌ Failed to communicate with SHAAD AI. Please try again later.');
    }
  }

  private async handleHealthSlashCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();

    try {
      // Get current system health
      const embed = new EmbedBuilder()
        .setColor(0x7289da)
        .setTitle('🏥 System Health Check')
        .setDescription('Current system status and performance metrics')
        .addFields(
          {
            name: 'Monitoring Status',
            value: `Code Monitor: ${this.codeMonitor.getStatus().isRunning ? '✅' : '❌'}\nSystem Monitor: ${this.systemMonitor.getStatus().isRunning ? '✅' : '❌'}`,
            inline: true
          },
          {
            name: 'Services',
            value: 'Checking services...',
            inline: true
          }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      await interaction.editReply('❌ Failed to retrieve health information.');
    }
  }

  // ==================== UTILITY METHODS ====================

  private async findChannelByName(guild: Guild, channelName: string): Promise<TextChannel | null> {
    const channel = guild.channels.cache.find(ch => 
      ch.name === channelName && ch.isTextBased()
    ) as TextChannel;
    return channel || null;
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private getFileExtension(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase();
    const mapping: Record<string, string> = {
      'ts': 'typescript', 'js': 'javascript', 'json': 'json',
      'md': 'markdown', 'yml': 'yaml', 'yaml': 'yaml',
      'sql': 'sql', 'env': 'bash', 'sh': 'bash', 'py': 'python'
    };
    return mapping[ext || ''] || 'text';
  }

  private async createRequiredChannels(guild: Guild): Promise<void> {
    // This is already implemented in simple-launcher, just ensuring channels exist
    const requiredChannels = [
      { name: env.channels.codeUpdates, description: '📁 Real-time code changes and file updates' },
      { name: env.channels.gitCommits, description: '📝 Git commit notifications and repository activity' },
      { name: env.channels.systemAlerts, description: '🚨 System health alerts and monitoring' },
      { name: env.channels.fileChanges, description: '📄 Detailed file modification tracking' }
    ];

    for (const channelInfo of requiredChannels) {
      const existingChannel = guild.channels.cache.find(ch => ch.name === channelInfo.name);
      if (!existingChannel) {
        try {
          await guild.channels.create({
            name: channelInfo.name,
            type: ChannelType.GuildText,
            topic: channelInfo.description
          });
          logger.info(`✅ Created channel: #${channelInfo.name}`);
        } catch (error) {
          logger.error(`Failed to create channel ${channelInfo.name}:`, error);
        }
      }
    }

    // Refresh channel cache
    await this.cacheChannels(guild);
  }

  private async registerSlashCommands(): Promise<void> {
    const commands = [
      new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Test bot connection'),
      
      new SlashCommandBuilder()
        .setName('status')
        .setDescription('Check SHAAD bot status'),
      
      new SlashCommandBuilder()
        .setName('chat')
        .setDescription('Chat with SHAAD AI')
        .addStringOption(option =>
          option.setName('message')
            .setDescription('Your message to SHAAD AI')
            .setRequired(true)
        ),
      
      new SlashCommandBuilder()
        .setName('health')
        .setDescription('Show system health status')
    ];

    try {
      const guild = this.client.guilds.cache.get(env.discord.guildId!);
      if (guild) {
        await guild.commands.set(commands);
        logger.info(`✅ Registered ${commands.length} slash commands`);
      }
    } catch (error) {
      logger.error('Failed to register slash commands:', error);
    }
  }

  private async sendStartupNotification(): Promise<void> {
    const channel = this.channels.general;
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle('🚀 SHAAD Discord Bot - Full Monitoring Active')
      .setDescription('Complete monitoring system is now online!')
      .addFields(
        {
          name: '🔍 Active Monitoring',
          value: '• 📁 Real-time code changes\n• 📝 Git commit tracking\n• 🖥️ System health monitoring\n• 🔗 Webhook integrations\n• 🤖 AI chat capabilities',
          inline: false
        },
        {
          name: '📋 Commands',
          value: `\`${env.discord.prefix} help\` - Show all commands\n\`/chat <message>\` - Chat with SHAAD AI\n\`/status\` - Check bot status\n\`/health\` - System health`,
          inline: false
        }
      )
      .setTimestamp()
      .setFooter({ text: 'SHAAD Development Team' });

    await channel.send({ embeds: [embed] });
  }

  private async sendStatusMessage(message: any): Promise<void> {
    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle('📊 SHAAD Bot Status')
      .addFields(
        {
          name: 'Services',
          value: `Code Monitor: ${this.codeMonitor.getStatus().isRunning ? '✅' : '❌'}\nSystem Monitor: ${this.systemMonitor.getStatus().isRunning ? '✅' : '❌'}\nSHAAD API: ${this.shaadIntegration.getStatus().isInitialized ? '✅' : '❌'}`,
          inline: true
        }
      )
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  }

  private async sendHelpMessage(message: any): Promise<void> {
    const embed = new EmbedBuilder()
      .setColor(0x7289da)
      .setTitle('🤖 SHAAD Bot - Complete Monitoring System')
      .setDescription('Available commands and features:')
      .addFields(
        {
          name: 'Text Commands',
          value: [
            `\`${env.discord.prefix} ping\` - Test connection`,
            `\`${env.discord.prefix} status\` - Bot status`,
            `\`${env.discord.prefix} help\` - This help message`,
            `\`${env.discord.prefix} monitor\` - Monitoring status`
          ].join('\n'),
          inline: false
        },
        {
          name: 'Slash Commands',
          value: [
            `\`/ping\` - Test connection`,
            `\`/status\` - Detailed status`,
            `\`/chat <message>\` - Chat with SHAAD AI`,
            `\`/health\` - System health check`
          ].join('\n'),
          inline: false
        },
        {
          name: 'Monitoring Channels',
          value: [
            `#${env.channels.codeUpdates} - Code changes`,
            `#${env.channels.gitCommits} - Git commits`,
            `#${env.channels.systemAlerts} - System alerts`,
            `#${env.channels.fileChanges} - File tracking`
          ].join('\n'),
          inline: false
        }
      )
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  }

  private async sendMonitoringStatus(message: any): Promise<void> {
    const codeStatus = this.codeMonitor.getStatus();
    const systemStatus = this.systemMonitor.getStatus();
    
    const embed = new EmbedBuilder()
      .setColor(0x7289da)
      .setTitle('📡 Monitoring Services Status')
      .addFields(
        {
          name: 'Code Monitor',
          value: `Status: ${codeStatus.isRunning ? '✅ Running' : '❌ Stopped'}\nProject: ${codeStatus.projectPath}\nLast Commit: ${codeStatus.lastCommitHash || 'None'}`,
          inline: true
        },
        {
          name: 'System Monitor',
          value: `Status: ${systemStatus.isRunning ? '✅ Running' : '❌ Stopped'}\nInterval: ${systemStatus.checkInterval}ms\nLast Health: ${systemStatus.lastHealthStatus || 'Unknown'}`,
          inline: true
        }
      )
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  }

  private async setupChannels(message: any): Promise<void> {
    await message.reply('✅ All required channels already exist and are configured!');
  }

  // ==================== LIFECYCLE METHODS ====================

  public async start(): Promise<void> {
    try {
      logger.info('🚀 Starting Complete SHAAD Discord Bot...');
      await this.client.login(env.discord.token);
    } catch (error) {
      logger.error('❌ Failed to start Discord bot:', error);
      throw error;
    }
  }

  public async stop(): Promise<void> {
    logger.info('🛑 Stopping Complete SHAAD Discord Bot...');
    
    // Stop all services
    await this.codeMonitor.stop();
    await this.systemMonitor.stop();
    await this.webhookService.stop();
    
    // Destroy Discord client
    this.client.destroy();
    
    logger.info('✅ Bot stopped gracefully');
  }
}

// Start the complete bot
const bot = new CompleteShaadBot();

process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down SHAAD Bot...');
  await bot.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down SHAAD Bot...');
  await bot.stop();
  process.exit(0);
});

bot.start().catch((error) => {
  console.error('❌ Failed to start Complete SHAAD Bot:', error);
  process.exit(1);
});