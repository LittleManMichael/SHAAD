/**
 * Discord Command Handler
 * 
 * Handles Discord slash commands and text commands for SHAAD integration
 */

import {
  Client,
  Message,
  Interaction,
  SlashCommandBuilder,
  EmbedBuilder,
  ChatInputCommandInteraction,
  GuildMember
} from 'discord.js';
import { ShaadIntegration } from './ShaadIntegration';
import { logger } from '../utils/logger';

export class CommandHandler {
  private client: Client;
  private shaadIntegration: ShaadIntegration;
  private commands: Map<string, any> = new Map();

  constructor(client: Client, shaadIntegration: ShaadIntegration) {
    this.client = client;
    this.shaadIntegration = shaadIntegration;
    this.setupCommands();
  }

  /**
   * Setup available commands
   */
  private setupCommands(): void {
    // Help command
    this.commands.set('help', {
      data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Show available SHAAD commands'),
      execute: this.handleHelpCommand.bind(this)
    });

    // Status command
    this.commands.set('status', {
      data: new SlashCommandBuilder()
        .setName('status')
        .setDescription('Check SHAAD system status'),
      execute: this.handleStatusCommand.bind(this)
    });

    // Conversations command
    this.commands.set('conversations', {
      data: new SlashCommandBuilder()
        .setName('conversations')
        .setDescription('List recent conversations')
        .addIntegerOption(option =>
          option.setName('limit')
            .setDescription('Number of conversations to show')
            .setMinValue(1)
            .setMaxValue(20)
        ),
      execute: this.handleConversationsCommand.bind(this)
    });

    // Chat command
    this.commands.set('chat', {
      data: new SlashCommandBuilder()
        .setName('chat')
        .setDescription('Send a message to SHAAD AI')
        .addStringOption(option =>
          option.setName('message')
            .setDescription('Your message to the AI')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('conversation')
            .setDescription('Conversation ID (optional)')
            .setRequired(false)
        ),
      execute: this.handleChatCommand.bind(this)
    });

    // Create conversation command
    this.commands.set('create', {
      data: new SlashCommandBuilder()
        .setName('create')
        .setDescription('Create a new conversation')
        .addStringOption(option =>
          option.setName('title')
            .setDescription('Conversation title')
            .setRequired(true)
        ),
      execute: this.handleCreateCommand.bind(this)
    });

    // Search command
    this.commands.set('search', {
      data: new SlashCommandBuilder()
        .setName('search')
        .setDescription('Search conversations')
        .addStringOption(option =>
          option.setName('query')
            .setDescription('Search query')
            .setRequired(true)
        ),
      execute: this.handleSearchCommand.bind(this)
    });

    // Stats command
    this.commands.set('stats', {
      data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('Show SHAAD statistics'),
      execute: this.handleStatsCommand.bind(this)
    });
  }

  /**
   * Handle text messages (for prefix commands)
   */
  public async handleMessage(message: Message): Promise<void> {
    const prefix = process.env.DISCORD_BOT_PREFIX || '!shaad';
    
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift()?.toLowerCase();

    if (!commandName) {
      await message.reply('Use `!shaad help` for available commands');
      return;
    }

    try {
      await this.executeTextCommand(message, commandName, args);
    } catch (error) {
      logger.error(`Error executing text command ${commandName}:`, error);
      await message.reply('❌ An error occurred while executing the command');
    }
  }

  /**
   * Handle slash command interactions
   */
  public async handleInteraction(interaction: Interaction): Promise<void> {
    if (!interaction.isChatInputCommand()) return;

    const command = this.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (error) {
      logger.error(`Error executing slash command ${interaction.commandName}:`, error);
      
      const reply = { content: '❌ An error occurred while executing the command', ephemeral: true };
      
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(reply);
      } else {
        await interaction.reply(reply);
      }
    }
  }

  /**
   * Execute text command
   */
  private async executeTextCommand(message: Message, commandName: string, args: string[]): Promise<void> {
    switch (commandName) {
      case 'help':
        await this.sendHelpMessage(message);
        break;
      case 'status':
        await this.sendStatusMessage(message);
        break;
      case 'conversations':
        await this.sendConversationsMessage(message, parseInt(args[0]) || 10);
        break;
      case 'chat':
        await this.sendChatMessage(message, args.join(' '));
        break;
      case 'stats':
        await this.sendStatsMessage(message);
        break;
      default:
        await message.reply(`Unknown command: ${commandName}. Use \`${process.env.DISCORD_BOT_PREFIX || '!shaad'} help\` for available commands.`);
    }
  }

  /**
   * Help command handler
   */
  private async handleHelpCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    const embed = new EmbedBuilder()
      .setColor(0x7289da)
      .setTitle('🤖 SHAAD Discord Bot Commands')
      .setDescription('Available commands for interacting with SHAAD')
      .addFields([
        {
          name: '📊 `/status`',
          value: 'Check SHAAD system health and status',
          inline: true
        },
        {
          name: '💬 `/conversations`',
          value: 'List recent conversations',
          inline: true
        },
        {
          name: '🤖 `/chat <message>`',
          value: 'Send a message to SHAAD AI',
          inline: true
        },
        {
          name: '➕ `/create <title>`',
          value: 'Create a new conversation',
          inline: true
        },
        {
          name: '🔍 `/search <query>`',
          value: 'Search through conversations',
          inline: true
        },
        {
          name: '📈 `/stats`',
          value: 'Show system statistics',
          inline: true
        }
      ])
      .setFooter({
        text: 'SHAAD AI Assistant Dashboard',
        iconURL: this.client.user?.avatarURL() || undefined
      })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }

  /**
   * Status command handler
   */
  private async handleStatusCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();

    try {
      const health = await this.shaadIntegration.checkHealth();
      
      const embed = new EmbedBuilder()
        .setColor(health.status === 'ok' ? 0x00ff00 : 0xff0000)
        .setTitle('🏥 SHAAD System Status')
        .addFields([
          {
            name: 'API Status',
            value: health.status === 'ok' ? '✅ Online' : '❌ Offline',
            inline: true
          },
          {
            name: 'Services',
            value: Object.entries(health.services || {})
              .map(([service, status]) => `${status === 'running' ? '✅' : '❌'} ${service}`)
              .join('\n') || 'No service info',
            inline: true
          },
          {
            name: 'Last Check',
            value: new Date().toLocaleString(),
            inline: true
          }
        ])
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('❌ Unable to Check Status')
        .setDescription('Failed to connect to SHAAD API')
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    }
  }

  /**
   * Conversations command handler
   */
  private async handleConversationsCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();

    try {
      const limit = interaction.options.getInteger('limit') || 10;
      const conversations = await this.shaadIntegration.getConversations();
      
      if (conversations.length === 0) {
        await interaction.editReply('No conversations found.');
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(0x7289da)
        .setTitle('💬 Recent Conversations')
        .setDescription(`Showing ${Math.min(limit, conversations.length)} of ${conversations.length} conversations`)
        .setTimestamp();

      conversations.slice(0, limit).forEach((conv, index) => {
        embed.addFields({
          name: `${index + 1}. ${conv.title}`,
          value: `ID: \`${conv.id}\`\nUpdated: ${new Date(conv.updated_at).toLocaleDateString()}`,
          inline: true
        });
      });

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      await interaction.editReply('❌ Failed to fetch conversations');
    }
  }

  /**
   * Chat command handler
   */
  private async handleChatCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();

    try {
      const message = interaction.options.getString('message', true);
      const conversationId = interaction.options.getString('conversation');
      
      let targetConversationId = conversationId;
      
      // Create new conversation if none specified
      if (!targetConversationId) {
        const newConv = await this.shaadIntegration.createConversation(`Discord Chat - ${new Date().toLocaleDateString()}`);
        targetConversationId = newConv.id;
      }

      // Send message
      const response = await this.shaadIntegration.sendMessage(targetConversationId, message);
      
      const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle('🤖 SHAAD AI Response')
        .addFields([
          {
            name: '👤 Your Message',
            value: message.length > 1000 ? message.substring(0, 1000) + '...' : message,
            inline: false
          },
          {
            name: '🤖 AI Response',
            value: response.assistantMessage.content.length > 1000 
              ? response.assistantMessage.content.substring(0, 1000) + '...'
              : response.assistantMessage.content,
            inline: false
          },
          {
            name: 'Conversation ID',
            value: `\`${targetConversationId}\``,
            inline: true
          }
        ])
        .setTimestamp();

      if (response.assistantMessage.ai_provider) {
        embed.addFields({
          name: 'AI Provider',
          value: response.assistantMessage.ai_provider,
          inline: true
        });
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      await interaction.editReply('❌ Failed to send message to SHAAD AI');
    }
  }

  /**
   * Create conversation command handler
   */
  private async handleCreateCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();

    try {
      const title = interaction.options.getString('title', true);
      const conversation = await this.shaadIntegration.createConversation(title);
      
      const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle('✅ Conversation Created')
        .addFields([
          {
            name: 'Title',
            value: conversation.title,
            inline: true
          },
          {
            name: 'ID',
            value: `\`${conversation.id}\``,
            inline: true
          },
          {
            name: 'Created',
            value: new Date(conversation.created_at).toLocaleString(),
            inline: true
          }
        ])
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      await interaction.editReply('❌ Failed to create conversation');
    }
  }

  /**
   * Search command handler
   */
  private async handleSearchCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();

    try {
      const query = interaction.options.getString('query', true);
      const results = await this.shaadIntegration.searchConversations(query);
      
      if (results.length === 0) {
        await interaction.editReply(`No conversations found for query: "${query}"`);
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(0x7289da)
        .setTitle(`🔍 Search Results for "${query}"`)
        .setDescription(`Found ${results.length} conversations`)
        .setTimestamp();

      results.slice(0, 10).forEach((conv, index) => {
        embed.addFields({
          name: `${index + 1}. ${conv.title}`,
          value: `ID: \`${conv.id}\`\nUpdated: ${new Date(conv.updated_at).toLocaleDateString()}`,
          inline: true
        });
      });

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      await interaction.editReply('❌ Failed to search conversations');
    }
  }

  /**
   * Stats command handler
   */
  private async handleStatsCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();

    try {
      const stats = await this.shaadIntegration.getSystemStats();
      
      const embed = new EmbedBuilder()
        .setColor(0x7289da)
        .setTitle('📈 SHAAD Statistics')
        .addFields([
          {
            name: 'Conversations',
            value: stats.conversations.toString(),
            inline: true
          },
          {
            name: 'Messages',
            value: stats.messages.toString(),
            inline: true
          },
          {
            name: 'Users',
            value: stats.users.toString(),
            inline: true
          },
          {
            name: 'Uptime',
            value: this.formatUptime(stats.uptime),
            inline: true
          }
        ])
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      await interaction.editReply('❌ Failed to fetch statistics');
    }
  }

  /**
   * Send help message (text command)
   */
  private async sendHelpMessage(message: Message): Promise<void> {
    const prefix = process.env.DISCORD_BOT_PREFIX || '!shaad';
    
    const embed = new EmbedBuilder()
      .setColor(0x7289da)
      .setTitle('🤖 SHAAD Discord Bot Commands')
      .setDescription(`Use \`${prefix} <command>\` or slash commands`)
      .addFields([
        {
          name: 'Available Commands',
          value: [
            `\`${prefix} help\` - Show this help message`,
            `\`${prefix} status\` - Check system status`,
            `\`${prefix} conversations\` - List conversations`,
            `\`${prefix} chat <message>\` - Chat with AI`,
            `\`${prefix} stats\` - Show statistics`
          ].join('\n'),
          inline: false
        }
      ])
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  }

  /**
   * Send status message (text command)
   */
  private async sendStatusMessage(message: Message): Promise<void> {
    const health = await this.shaadIntegration.checkHealth();
    
    const embed = new EmbedBuilder()
      .setColor(health.status === 'ok' ? 0x00ff00 : 0xff0000)
      .setTitle('🏥 SHAAD System Status')
      .addFields([
        {
          name: 'Status',
          value: health.status === 'ok' ? '✅ Online' : '❌ Offline',
          inline: true
        }
      ])
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  }

  /**
   * Send conversations message (text command)
   */
  private async sendConversationsMessage(message: Message, limit: number): Promise<void> {
    const conversations = await this.shaadIntegration.getConversations();
    
    const embed = new EmbedBuilder()
      .setColor(0x7289da)
      .setTitle('💬 Recent Conversations')
      .setDescription(`Showing ${Math.min(limit, conversations.length)} conversations`)
      .setTimestamp();

    conversations.slice(0, limit).forEach((conv, index) => {
      embed.addFields({
        name: `${index + 1}. ${conv.title}`,
        value: `ID: \`${conv.id}\``,
        inline: true
      });
    });

    await message.reply({ embeds: [embed] });
  }

  /**
   * Send chat message (text command)
   */
  private async sendChatMessage(message: Message, content: string): Promise<void> {
    if (!content) {
      await message.reply('Please provide a message to send to the AI');
      return;
    }

    const newConv = await this.shaadIntegration.createConversation(`Discord Chat - ${new Date().toLocaleDateString()}`);
    const response = await this.shaadIntegration.sendMessage(newConv.id, content);
    
    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle('🤖 SHAAD AI Response')
      .addFields([
        {
          name: 'AI Response',
          value: response.assistantMessage.content.length > 1000 
            ? response.assistantMessage.content.substring(0, 1000) + '...'
            : response.assistantMessage.content,
          inline: false
        }
      ])
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  }

  /**
   * Send stats message (text command)
   */
  private async sendStatsMessage(message: Message): Promise<void> {
    const stats = await this.shaadIntegration.getSystemStats();
    
    const embed = new EmbedBuilder()
      .setColor(0x7289da)
      .setTitle('📈 SHAAD Statistics')
      .addFields([
        {
          name: 'Conversations',
          value: stats.conversations.toString(),
          inline: true
        },
        {
          name: 'Messages',
          value: stats.messages.toString(),
          inline: true
        }
      ])
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  }

  /**
   * Format uptime in human readable format
   */
  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / (24 * 60 * 60));
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((seconds % (60 * 60)) / 60);
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  /**
   * Register slash commands with Discord
   */
  public async registerSlashCommands(): Promise<void> {
    try {
      const commandData = Array.from(this.commands.values()).map(cmd => cmd.data.toJSON());
      
      // Register commands globally or for specific guild
      const guildId = process.env.DISCORD_GUILD_ID;
      
      if (guildId) {
        // Register for specific guild (faster for development)
        const guild = await this.client.guilds.fetch(guildId);
        await guild.commands.set(commandData);
        logger.info(`Registered ${commandData.length} slash commands for guild ${guild.name}`);
      } else {
        // Register globally (takes up to 1 hour to propagate)
        await this.client.application?.commands.set(commandData);
        logger.info(`Registered ${commandData.length} slash commands globally`);
      }
    } catch (error) {
      logger.error('Failed to register slash commands:', error);
    }
  }
}