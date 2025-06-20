/**
 * Simplified Discord Bot Launcher
 * Start with basic functionality and gradually add features
 */

import { Client, GatewayIntentBits, Events, EmbedBuilder, TextChannel, Guild, ChannelType, PermissionsBitField } from 'discord.js';
import { env } from './utils/env';
import { logger } from './utils/logger';
import { CodeMonitor } from './services/CodeMonitor';
import { TodoManager, TodoItem } from './services/TodoManager';
import { TodoAPI } from './services/TodoAPI';
import { ChannelContentManager } from './services/ChannelContentManager';

class SimpleShaadBot {
  private client: Client;
  private codeMonitor: CodeMonitor;
  private todoManager: TodoManager;
  private todoAPI: TodoAPI;
  private channelContentManager: ChannelContentManager;

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
    this.todoManager = new TodoManager(this.client);
    this.todoAPI = new TodoAPI();
    this.channelContentManager = new ChannelContentManager(this.client);

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.client.once(Events.ClientReady, async (client) => {
      logger.info(`🤖 SHAAD Discord Bot is ready! Logged in as ${client.user.tag}`);
      logger.info(`📊 Bot is in ${this.client.guilds.cache.size} servers`);
      
      // List available channels
      const guild = this.client.guilds.cache.get(env.discord.guildId!);
      if (guild) {
        logger.info(`🏠 Connected to server: ${guild.name}`);
        logger.info(`📋 Available text channels:`);
        guild.channels.cache.forEach(channel => {
          if (channel.isTextBased()) {
            logger.info(`  - #${channel.name} (${channel.id})`);
          }
        });
        
        // Create required channels if they don't exist
        await this.createRequiredChannels(guild);
        
        // Start file monitoring
        await this.startFileMonitoring();
        
        // Initialize todo list
        await this.initializeTodoList();
        
        // Send startup notification
        await this.sendStartupNotification();
      }
      
      logger.info('✅ Bot initialization complete!');
    });

    // Basic message handler
    this.client.on(Events.MessageCreate, async (message) => {
      if (message.author.bot) return;
      
      if (message.content.startsWith(env.discord.prefix)) {
        const args = message.content.slice(env.discord.prefix.length).trim().split(/ +/);
        const command = args.shift()?.toLowerCase();
        
        switch (command) {
          case 'ping':
            await message.reply('🏓 Pong! SHAAD Bot is online!');
            break;
          case 'status':
            await message.reply('✅ All systems operational!');
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
          case 'todo':
          case 'todos':
            await this.handleTodoCommand(message, args);
            break;
          case 'info':
          case 'channels':
            await this.handleInfoChannelsCommand(message);
            break;
        }
      }
    });

    this.client.on(Events.Error, (error) => {
      logger.error('Discord client error:', error);
    });
  }

  private async sendStartupNotification(): Promise<void> {
    const channel = await this.findChannelByName(env.channels.general);
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle('🚀 SHAAD Discord Bot Started')
      .setDescription('Bot is now online and ready to monitor your SHAAD development!')
      .addFields(
        {
          name: 'Basic Commands',
          value: `\`${env.discord.prefix} ping\` - Test bot connection\n\`${env.discord.prefix} status\` - Check bot status\n\`${env.discord.prefix} help\` - Show help\n\`${env.discord.prefix} setup\` - Create monitoring channels`,
          inline: false
        }
      )
      .setTimestamp()
      .setFooter({ text: 'SHAAD Development Team' });

    await channel.send({ embeds: [embed] });
  }

  private async sendHelpMessage(message: any): Promise<void> {
    const embed = new EmbedBuilder()
      .setColor(0x7289da)
      .setTitle('🤖 SHAAD Bot Commands')
      .setDescription('Available commands:')
      .addFields(
        {
          name: 'Basic Commands',
          value: [
            `\`${env.discord.prefix} ping\` - Test connection`,
            `\`${env.discord.prefix} status\` - Bot status`,
            `\`${env.discord.prefix} help\` - This help message`,
            `\`${env.discord.prefix} setup\` - Create monitoring channels (Admin only)`
          ].join('\n'),
          inline: false
        },
        {
          name: 'Todo List Commands',
          value: [
            `\`${env.discord.prefix} todo\` - Show todo commands`,
            `\`${env.discord.prefix} todo large\` - Post todo list with larger text`,
            `\`${env.discord.prefix} todo refresh\` - Refresh the todo list`
          ].join('\n'),
          inline: false
        },
        {
          name: 'Information Commands',
          value: [
            `\`${env.discord.prefix} info\` - Create comprehensive info channels`,
            `\`${env.discord.prefix} channels\` - Same as above (alias)`
          ].join('\n'),
          inline: false
        }
      )
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  }

  private async findChannelByName(channelName: string): Promise<TextChannel | null> {
    for (const guild of this.client.guilds.cache.values()) {
      const channel = guild.channels.cache.find(ch => 
        ch.name === channelName && ch.isTextBased()
      ) as TextChannel;
      if (channel) return channel;
    }
    
    // Fallback to first available text channel
    const firstGuild = this.client.guilds.cache.first();
    if (firstGuild) {
      const firstChannel = firstGuild.channels.cache.find(ch => ch.isTextBased()) as TextChannel;
      if (firstChannel) {
        logger.warn(`Channel '${channelName}' not found, using '${firstChannel.name}' instead`);
        return firstChannel;
      }
    }
    
    return null;
  }

  private async createRequiredChannels(guild: Guild): Promise<void> {
    const requiredChannels = [
      { name: env.channels.codeUpdates, description: '📁 Real-time code changes and file updates' },
      { name: env.channels.gitCommits, description: '📝 Git commit notifications and repository activity' },
      { name: env.channels.systemAlerts, description: '🚨 System health alerts and monitoring' },
      { name: env.channels.fileChanges, description: '📄 Detailed file modification tracking' },
      { name: env.channels.todoList, description: '📋 Project todo list and task tracking' }
    ];

    let createdChannels = 0;

    for (const channelInfo of requiredChannels) {
      const existingChannel = guild.channels.cache.find(ch => ch.name === channelInfo.name);
      
      if (!existingChannel) {
        try {
          const newChannel = await guild.channels.create({
            name: channelInfo.name,
            type: ChannelType.GuildText,
            topic: channelInfo.description,
            permissionOverwrites: [
              {
                id: guild.roles.everyone,
                allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.ReadMessageHistory],
                deny: [PermissionsBitField.Flags.SendMessages] // Only bot can post initially
              }
            ]
          });
          
          logger.info(`✅ Created channel: #${channelInfo.name}`);
          createdChannels++;
          
          // Send welcome message to new channel
          await newChannel.send({
            embeds: [new EmbedBuilder()
              .setColor(0x00ff00)
              .setTitle(`📋 Welcome to #${channelInfo.name}`)
              .setDescription(channelInfo.description)
              .addFields({
                name: 'Purpose',
                value: 'This channel will receive automated notifications from the SHAAD Discord Bot.',
                inline: false
              })
              .setTimestamp()
              .setFooter({ text: 'SHAAD Bot Channel Setup' })
            ]
          });
          
        } catch (error) {
          logger.error(`Failed to create channel ${channelInfo.name}:`, error);
        }
      } else {
        logger.info(`✅ Channel #${channelInfo.name} already exists`);
      }
    }

    if (createdChannels > 0) {
      logger.info(`🎉 Created ${createdChannels} new channels for SHAAD monitoring`);
    }
  }

  private async setupChannels(message: any): Promise<void> {
    const guild = message.guild;
    if (!guild) return;

    const embed = new EmbedBuilder()
      .setColor(0x7289da)
      .setTitle('🛠️ Setting up SHAAD channels...')
      .setDescription('Creating required channels for monitoring and notifications.')
      .setTimestamp();

    const statusMessage = await message.reply({ embeds: [embed] });

    await this.createRequiredChannels(guild);

    const successEmbed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle('✅ SHAAD Channel Setup Complete!')
      .setDescription('All required channels have been created or verified.')
      .addFields(
        {
          name: 'Created Channels',
          value: [
            `#${env.channels.codeUpdates} - Code changes and updates`,
            `#${env.channels.gitCommits} - Git commit notifications`,
            `#${env.channels.systemAlerts} - System health alerts`,
            `#${env.channels.fileChanges} - File modification tracking`
          ].join('\n'),
          inline: false
        },
        {
          name: 'Next Steps',
          value: 'The bot will now automatically post monitoring updates to these channels.',
          inline: false
        }
      )
      .setTimestamp();

    await statusMessage.edit({ embeds: [successEmbed] });
  }

  private async startFileMonitoring(): Promise<void> {
    try {
      logger.info('🔧 Starting file monitoring...');
      
      await this.codeMonitor.start({
        projectPath: env.monitoring.projectPath,
        onFileChange: this.handleFileChange.bind(this),
        onGitCommit: this.handleGitCommit.bind(this),
        gitPollingInterval: env.monitoring.gitPollingInterval,
        maxFileSize: env.monitoring.maxFileSize
      });
      
      logger.info('✅ File monitoring started successfully');
    } catch (error) {
      logger.error('❌ Failed to start file monitoring:', error);
    }
  }

  private async handleFileChange(change: {
    type: 'add' | 'change' | 'unlink';
    path: string;
    content?: string;
    size?: number;
    timestamp: Date;
  }): Promise<void> {
    // Find the file changes channel
    const channel = await this.findChannelByName(env.channels.fileChanges);
    if (!channel) {
      logger.warn('File changes channel not found, skipping notification');
      return;
    }

    const emoji = { add: '🆕', change: '✏️', unlink: '🗑️' };
    const action = { add: 'Added', change: 'Modified', unlink: 'Deleted' };
    const color = { add: 0x00ff00, change: 0xffff00, unlink: 0xff0000 };

    const embed = new EmbedBuilder()
      .setColor(color[change.type])
      .setTitle(`${emoji[change.type]} ${action[change.type]} File`)
      .setDescription(`\`${change.path}\``)
      .setTimestamp(change.timestamp)
      .setFooter({ text: 'SHAAD File Monitor' });

    // Add file size if available
    if (change.size !== undefined) {
      embed.addFields({
        name: 'File Size',
        value: this.formatFileSize(change.size),
        inline: true
      });
    }

    // Add code preview for small changes
    if (change.content && change.content.length < 1000 && change.type !== 'unlink') {
      const fileExt = this.getFileExtension(change.path);
      embed.addFields({
        name: 'Preview',
        value: `\`\`\`${fileExt}\n${change.content.substring(0, 400)}${change.content.length > 400 ? '\n...' : ''}\n\`\`\``,
        inline: false
      });
    }

    try {
      await channel.send({ embeds: [embed] });
      logger.info(`📁 File change notification sent: ${change.type} ${change.path}`);
    } catch (error) {
      logger.error('Failed to send file change notification:', error);
    }
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
    // Find the git commits channel
    const channel = await this.findChannelByName(env.channels.gitCommits);
    if (!channel) {
      logger.warn('Git commits channel not found, skipping notification');
      return;
    }

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
          value: commit.files.length > 8 
            ? `${commit.files.slice(0, 8).map(f => `\`${f}\``).join('\n')}\n... and ${commit.files.length - 8} more`
            : commit.files.map(f => `\`${f}\``).join('\n') || 'No files',
          inline: false
        }
      )
      .setTimestamp(commit.date)
      .setFooter({ text: 'SHAAD Git Monitor' });

    try {
      await channel.send({ embeds: [embed] });
      logger.info(`📝 Git commit notification sent: ${commit.hash.substring(0, 8)}`);
    } catch (error) {
      logger.error('Failed to send git commit notification:', error);
    }
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
      'sql': 'sql', 'env': 'bash', 'sh': 'bash', 'py': 'python',
      'txt': 'text', 'log': 'text'
    };
    return mapping[ext || ''] || 'text';
  }

  private async initializeTodoList(): Promise<void> {
    try {
      // Load current todo list from SHAAD project
      const todos = await this.loadTodoList();
      await this.todoManager.updateTodoList(todos);
      logger.info('📋 Todo list initialized in Discord');
    } catch (error) {
      logger.error('Failed to initialize todo list:', error);
    }
  }

  private async loadTodoList(): Promise<TodoItem[]> {
    return await this.todoAPI.loadTodos();
  }

  private async handleTodoCommand(message: any, args: string[]): Promise<void> {
    const subcommand = args[0]?.toLowerCase();

    switch (subcommand) {
      case 'large':
      case 'big':
        // Post todo list as regular messages for larger text
        try {
          const todos = await this.loadTodoList();
          await this.todoManager.updateTodoList(todos, true); // true = use regular messages
          await message.reply('📋 Posted todo list with larger text in #todo-list!');
        } catch (error) {
          await message.reply('❌ Failed to post todo list');
          logger.error('Error posting large todo list:', error);
        }
        break;
      
      case 'refresh':
      case 'update':
        // Refresh the todo list
        try {
          const todos = await this.loadTodoList();
          await this.todoManager.updateTodoList(todos);
          await message.reply('📋 Todo list refreshed!');
        } catch (error) {
          await message.reply('❌ Failed to refresh todo list');
          logger.error('Error refreshing todo list:', error);
        }
        break;
        
      default:
        await message.reply(`📋 **Todo Commands:**
\`${env.discord.prefix} todo large\` - Post todo list with larger text
\`${env.discord.prefix} todo refresh\` - Refresh the todo list
\`${env.discord.prefix} todo\` - Show this help`);
        break;
    }
  }

  private async handleInfoChannelsCommand(message: any): Promise<void> {
    if (!message.member?.permissions.has('ManageChannels')) {
      await message.reply('❌ You need "Manage Channels" permission to create information channels.');
      return;
    }

    try {
      await message.reply('🏗️ Creating comprehensive information channels with content...');
      
      const guild = message.guild;
      if (!guild) {
        await message.reply('❌ Could not find guild');
        return;
      }

      await this.channelContentManager.createInformationChannels(guild);
      
      await message.reply(`✅ **Information channels created successfully!**

📚 **New channels available:**
• #readme - Project overview and quick start
• #setup-guide - Complete installation instructions  
• #api-docs - API endpoints and integration docs
• #architecture - System design and technical overview
• #environment - Configuration and environment variables
• #deployment - Production deployment guide
• #troubleshooting - Common issues and solutions
• #changelog - Release notes and version history
• #team-info - Team members and contributors
• #resources - Useful links and external resources

All channels are populated with comprehensive, up-to-date content! 🎉`);

    } catch (error) {
      await message.reply('❌ Failed to create information channels');
      logger.error('Error creating information channels:', error);
    }
  }

  public async start(): Promise<void> {
    try {
      logger.info('Starting SHAAD Discord Bot...');
      await this.client.login(env.discord.token);
    } catch (error) {
      logger.error('Failed to start Discord bot:', error);
      throw error;
    }
  }

  public async stop(): Promise<void> {
    logger.info('Stopping SHAAD Discord Bot...');
    
    // Stop code monitoring
    if (this.codeMonitor) {
      await this.codeMonitor.stop();
    }
    
    this.client.destroy();
  }
}

// Start the bot
const bot = new SimpleShaadBot();

process.on('SIGINT', async () => {
  console.log('\nShutting down...');
  await bot.stop();
  process.exit(0);
});

bot.start().catch((error) => {
  console.error('Failed to start bot:', error);
  process.exit(1);
});