/**
 * Todo Manager Service
 * 
 * Handles posting and updating todo lists in Discord
 * Features:
 * - Initial todo list posting
 * - Auto-updating existing messages
 * - Formatted todo display with status icons
 * - Priority-based organization
 */

import { Client, Message, TextChannel, EmbedBuilder } from 'discord.js';
import { logger } from '../utils/logger';
import { env } from '../utils/env';

export interface TodoItem {
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'high' | 'medium' | 'low';
  id: string;
}

export class TodoManager {
  private client: Client;
  private todoMessageId?: string;
  private lastTodoHash?: string;

  constructor(client: Client) {
    this.client = client;
  }

  /**
   * Post or update the todo list in Discord
   */
  public async updateTodoList(todos: TodoItem[], useRegularMessage = false): Promise<void> {
    try {
      const channel = await this.findTodoChannel();
      if (!channel) {
        logger.error('❌ Todo list channel not found - cannot post todo list');
        return;
      }
      
      logger.debug(`✅ Found todo channel: #${channel.name}`);

      const todoHash = this.hashTodos(todos);

      // Skip update if nothing changed (disabled for debugging)
      if (todoHash === this.lastTodoHash && !useRegularMessage) {
        logger.debug('Todo hash unchanged, skipping update');
        return;
      }

      if (useRegularMessage) {
        // Post as regular message with larger text
        logger.info('📋 Posting todo list as regular messages for larger text...');
        await this.postTodoAsMessage(channel, todos);
      } else {
        // Post as embed (default)
        const embed = this.createTodoEmbed(todos);
        
        if (this.todoMessageId) {
          // Try to edit existing message
          try {
            const existingMessage = await channel.messages.fetch(this.todoMessageId);
            await existingMessage.edit({ embeds: [embed] });
            logger.info('📋 Todo list updated in Discord');
          } catch (error) {
            // Message might have been deleted, create a new one
            logger.warn('Could not edit existing todo message, creating new one');
            await this.createNewTodoMessage(channel, embed);
          }
        } else {
          // Create new message
          await this.createNewTodoMessage(channel, embed);
        }
      }

      this.lastTodoHash = todoHash;

    } catch (error) {
      logger.error('Error updating todo list:', error);
    }
  }

  /**
   * Find the todo list channel
   */
  private async findTodoChannel(): Promise<TextChannel | null> {
    try {
      const guild = this.client.guilds.cache.first();
      if (!guild) {
        logger.error('No guild found for todo channel');
        return null;
      }

      logger.debug(`Looking for todo channel: "${env.channels.todoList}"`);
      
      // First try exact match
      let channel = guild.channels.cache.find(ch => 
        ch.isTextBased() && ch.name === env.channels.todoList
      ) as TextChannel;

      // If no exact match, try partial match
      if (!channel) {
        channel = guild.channels.cache.find(ch => 
          ch.isTextBased() && 
          ch.name.toLowerCase().includes(env.channels.todoList.toLowerCase())
        ) as TextChannel;
      }

      if (channel) {
        logger.debug(`Found todo channel: #${channel.name} (${channel.id})`);
        return channel;
      } else {
        logger.warn(`Todo channel "${env.channels.todoList}" not found. Available channels:`);
        guild.channels.cache.forEach(ch => {
          if (ch.isTextBased()) {
            logger.warn(`  - #${ch.name} (${ch.id})`);
          }
        });
        return null;
      }
    } catch (error) {
      logger.error('Error finding todo channel:', error);
      return null;
    }
  }

  /**
   * Create new todo message
   */
  private async createNewTodoMessage(channel: TextChannel, embed: EmbedBuilder): Promise<void> {
    const message = await channel.send({ embeds: [embed] });
    this.todoMessageId = message.id;
    logger.info('📋 New todo list posted to Discord');
  }

  /**
   * Post todo list as regular messages for larger text
   */
  private async postTodoAsMessage(channel: TextChannel, todos: TodoItem[]): Promise<void> {
    const messages = this.createTodoMessages(todos);
    
    // Clear previous messages (delete last few bot messages in channel)
    try {
      const recentMessages = await channel.messages.fetch({ limit: 10 });
      const botMessages = recentMessages.filter(msg => msg.author.bot);
      for (const message of botMessages.values()) {
        await message.delete();
      }
    } catch (error) {
      logger.debug('Could not clean up previous messages:', error);
    }

    // Post new messages
    for (const messageContent of messages) {
      await channel.send(messageContent);
      // Small delay to ensure message order
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    logger.info('📋 Todo list posted as regular messages');
  }

  /**
   * Create formatted messages for regular Discord messages (larger text)
   */
  private createTodoMessages(todos: TodoItem[]): string[] {
    const messages: string[] = [];
    
    // Header message
    const total = todos.length;
    const completed = todos.filter(t => t.status === 'completed').length;
    const inProgress = todos.filter(t => t.status === 'in_progress').length;
    const pending = todos.filter(t => t.status === 'pending').length;
    const completionPercent = Math.round((completed / total) * 100);

    messages.push(`# 📋 SHAAD Project Todo List
    
**Progress:** ${completionPercent}% Complete | **Total:** ${total} tasks
✅ ${completed} Completed | 🔄 ${inProgress} In Progress | ⏳ ${pending} Pending

---`);

    // Group todos by priority
    const priorityGroups = {
      high: todos.filter(t => t.priority === 'high'),
      medium: todos.filter(t => t.priority === 'medium'),
      low: todos.filter(t => t.priority === 'low')
    };

    Object.entries(priorityGroups).forEach(([priority, items]) => {
      if (items.length === 0) return;

      const priorityIcon = {
        high: '🔴',
        medium: '🟡', 
        low: '🟢'
      }[priority];

      const priorityName = priority.charAt(0).toUpperCase() + priority.slice(1);
      
      // Group by status within priority
      const statusGroups = {
        in_progress: items.filter(t => t.status === 'in_progress'),
        pending: items.filter(t => t.status === 'pending'),
        completed: items.filter(t => t.status === 'completed')
      };

      let messageContent = `## ${priorityIcon} **${priorityName} Priority** (${items.length} tasks)

`;

      // Add in progress items first (most important)
      if (statusGroups.in_progress.length > 0) {
        messageContent += `### 🔄 **In Progress** (${statusGroups.in_progress.length})
`;
        statusGroups.in_progress.forEach(todo => {
          messageContent += `▶️ **${todo.content}**
`;
        });
        messageContent += '\n';
      }

      // Add pending items
      if (statusGroups.pending.length > 0) {
        const displayCount = Math.min(statusGroups.pending.length, 12);
        messageContent += `### ⏳ **Pending** (${statusGroups.pending.length})
`;
        statusGroups.pending.slice(0, displayCount).forEach(todo => {
          messageContent += `📌 ${todo.content}
`;
        });
        if (statusGroups.pending.length > displayCount) {
          messageContent += `*... and ${statusGroups.pending.length - displayCount} more pending tasks*
`;
        }
        messageContent += '\n';
      }

      // Add completed items (compressed)
      if (statusGroups.completed.length > 0) {
        messageContent += `### ✅ **Recently Completed** (${statusGroups.completed.length} total)
`;
        const recentCompleted = statusGroups.completed.slice(0, 5);
        recentCompleted.forEach(todo => {
          messageContent += `~~${todo.content}~~
`;
        });
        if (statusGroups.completed.length > 5) {
          messageContent += `*... and ${statusGroups.completed.length - 5} more completed*
`;
        }
      }

      // Split message if it's too long (Discord has 2000 char limit)
      if (messageContent.length > 1800) {
        const lines = messageContent.split('\n');
        let currentMessage = '';
        
        for (const line of lines) {
          if ((currentMessage + line).length > 1800) {
            messages.push(currentMessage);
            currentMessage = line + '\n';
          } else {
            currentMessage += line + '\n';
          }
        }
        
        if (currentMessage.trim()) {
          messages.push(currentMessage);
        }
      } else {
        messages.push(messageContent);
      }
    });

    return messages;
  }

  /**
   * Create formatted embed for todo list
   */
  private createTodoEmbed(todos: TodoItem[]): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setTitle('📋 **SHAAD Project Todo List**')
      .setDescription('**Current project tasks organized by priority and status**')
      .setColor(0x00AE86)
      .setTimestamp();

    // Group todos by priority
    const priorityGroups = {
      high: todos.filter(t => t.priority === 'high'),
      medium: todos.filter(t => t.priority === 'medium'),
      low: todos.filter(t => t.priority === 'low')
    };

    // Add priority sections
    Object.entries(priorityGroups).forEach(([priority, items]) => {
      if (items.length === 0) return;

      const priorityIcon = {
        high: '🔴',
        medium: '🟡', 
        low: '🟢'
      }[priority];

      const priorityName = priority.charAt(0).toUpperCase() + priority.slice(1);
      
      // Group by status within priority
      const statusGroups = {
        in_progress: items.filter(t => t.status === 'in_progress'),
        pending: items.filter(t => t.status === 'pending'),
        completed: items.filter(t => t.status === 'completed')
      };

      let fieldValue = '';

      // Add in progress items first (most important)
      if (statusGroups.in_progress.length > 0) {
        fieldValue += `## 🔄 **In Progress (${statusGroups.in_progress.length})**\n`;
        statusGroups.in_progress.forEach(todo => {
          fieldValue += `▶️ **${this.truncateText(todo.content, 70)}**\n`;
        });
        fieldValue += '\n';
      }

      // Add pending items
      if (statusGroups.pending.length > 0) {
        const displayCount = Math.min(statusGroups.pending.length, 8);
        fieldValue += `## ⏳ **Pending (${statusGroups.pending.length})**\n`;
        statusGroups.pending.slice(0, displayCount).forEach(todo => {
          fieldValue += `📌 ${this.truncateText(todo.content, 70)}\n`;
        });
        if (statusGroups.pending.length > displayCount) {
          fieldValue += `*... and ${statusGroups.pending.length - displayCount} more tasks*\n`;
        }
        fieldValue += '\n';
      }

      // Add completed items (compressed)
      if (statusGroups.completed.length > 0) {
        fieldValue += `## ✅ **Completed (${statusGroups.completed.length})**\n`;
        const recentCompleted = statusGroups.completed.slice(0, 3);
        recentCompleted.forEach(todo => {
          fieldValue += `~~${this.truncateText(todo.content, 60)}~~\n`;
        });
        if (statusGroups.completed.length > 3) {
          fieldValue += `*... and ${statusGroups.completed.length - 3} more completed*\n`;
        }
      }

      if (fieldValue.trim()) {
        embed.addFields({
          name: `${priorityIcon} **${priorityName} Priority**`,
          value: fieldValue.trim(),
          inline: false
        });
      }
    });

    // Add comprehensive summary
    const total = todos.length;
    const completed = todos.filter(t => t.status === 'completed').length;
    const inProgress = todos.filter(t => t.status === 'in_progress').length;
    const pending = todos.filter(t => t.status === 'pending').length;
    const completionPercent = Math.round((completed / total) * 100);

    embed.setFooter({ 
      text: `📊 Progress: ${completionPercent}% | Total: ${total} | ✅ ${completed} | 🔄 ${inProgress} | ⏳ ${pending}` 
    });

    return embed;
  }

  /**
   * Create a hash of the todos to detect changes
   */
  private hashTodos(todos: TodoItem[]): string {
    const todoString = todos
      .map(t => `${t.id}:${t.status}:${t.content}:${t.priority}`)
      .sort()
      .join('|');
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < todoString.length; i++) {
      const char = todoString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  /**
   * Truncate text to specified length
   */
  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  /**
   * Get the current todo message ID
   */
  public getTodoMessageId(): string | undefined {
    return this.todoMessageId;
  }

  /**
   * Set the todo message ID (for persistence)
   */
  public setTodoMessageId(messageId: string): void {
    this.todoMessageId = messageId;
  }
}