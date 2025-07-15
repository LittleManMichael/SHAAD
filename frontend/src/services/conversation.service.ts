/**
 * Conversation Service
 * 
 * This service handles all conversation and message-related API calls.
 * It manages the communication with the backend for:
 * - Creating, reading, updating, deleting conversations
 * - Sending and receiving messages
 * - Managing conversation history
 */

import { api } from './auth.service';

// Type definitions
export interface Conversation {
  id: string;
  title: string;
  context: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: any;
  tokens_used?: number;
  ai_provider?: string;
  created_at: string;
}

export interface ConversationWithMessages extends Conversation {
  messages: Message[];
}

export interface SendMessageResponse {
  success: boolean;
  data: {
    userMessage: Message;
    assistantMessage: Message;
  };
}

/**
 * Conversation Service Class
 * Contains all conversation and message-related API methods
 */
class ConversationService {
  /**
   * Get all conversations for the current user
   */
  async getConversations(): Promise<Conversation[]> {
    try {
      const response = await api.get('/conversations');
      return response.data.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch conversations';
      throw new Error(message);
    }
  }

  /**
   * Get a specific conversation with its messages
   * @param conversationId - The ID of the conversation to fetch
   */
  async getConversation(conversationId: string): Promise<ConversationWithMessages> {
    try {
      const response = await api.get(`/conversations/${conversationId}`);
      return response.data.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch conversation';
      throw new Error(message);
    }
  }

  /**
   * Create a new conversation
   * @param data - Conversation creation data
   */
  async createConversation(data: {
    title?: string;
    context?: any;
  }): Promise<Conversation> {
    try {
      const response = await api.post('/conversations', data);
      return response.data.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to create conversation';
      throw new Error(message);
    }
  }

  /**
   * Update a conversation
   * @param conversationId - The ID of the conversation to update
   * @param data - Update data
   */
  async updateConversation(
    conversationId: string,
    data: {
      title?: string;
      context?: any;
    }
  ): Promise<Conversation> {
    try {
      const response = await api.put(`/conversations/${conversationId}`, data);
      return response.data.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update conversation';
      throw new Error(message);
    }
  }

  /**
   * Delete a conversation
   * @param conversationId - The ID of the conversation to delete
   */
  async deleteConversation(conversationId: string): Promise<void> {
    try {
      await api.delete(`/conversations/${conversationId}`);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to delete conversation';
      throw new Error(message);
    }
  }

  /**
   * Send a message to the AI assistant
   * @param conversationId - The conversation to send the message to
   * @param content - The message content
   */
  async sendMessage(
    conversationId: string, 
    content: string, 
    model?: 'claude' | 'gpt'
  ): Promise<SendMessageResponse> {
    try {
      const response = await api.post(`/conversations/${conversationId}/messages`, {
        content,
        model: model || 'claude', // Default to Claude if not specified
      });
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to send message';
      throw new Error(message);
    }
  }

  /**
   * Get messages for a conversation with pagination
   * @param conversationId - The conversation ID
   * @param options - Pagination options
   */
  async getMessages(
    conversationId: string,
    options: {
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{
    messages: Message[];
    total: number;
    limit: number;
    offset: number;
  }> {
    try {
      const { limit = 50, offset = 0 } = options;
      const response = await api.get(`/conversations/${conversationId}/messages`, {
        params: { limit, offset },
      });
      return response.data.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch messages';
      throw new Error(message);
    }
  }

  /**
   * Delete a specific message
   * @param conversationId - The conversation ID
   * @param messageId - The message ID to delete
   */
  async deleteMessage(conversationId: string, messageId: string): Promise<void> {
    try {
      await api.delete(`/conversations/${conversationId}/messages/${messageId}`);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to delete message';
      throw new Error(message);
    }
  }

  /**
   * Search conversations by title or content
   * @param query - Search query
   */
  async searchConversations(query: string): Promise<Conversation[]> {
    try {
      const response = await api.get('/conversations', {
        params: { search: query },
      });
      return response.data.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to search conversations';
      throw new Error(message);
    }
  }

  /**
   * Get conversation statistics
   * @param conversationId - The conversation ID
   */
  async getConversationStats(conversationId: string): Promise<{
    messageCount: number;
    totalTokens: number;
    lastActivity: string;
  }> {
    try {
      const response = await api.get(`/conversations/${conversationId}/stats`);
      return response.data.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch conversation stats';
      throw new Error(message);
    }
  }

  /**
   * Export conversation as JSON
   * @param conversationId - The conversation ID to export
   */
  async exportConversation(conversationId: string): Promise<ConversationWithMessages> {
    try {
      const conversation = await this.getConversation(conversationId);
      return conversation;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to export conversation';
      throw new Error(message);
    }
  }
}

// Export a singleton instance
export const conversationService = new ConversationService();