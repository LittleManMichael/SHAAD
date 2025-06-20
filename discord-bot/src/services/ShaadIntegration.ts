/**
 * SHAAD Integration Service
 * 
 * Handles communication with the SHAAD API backend
 * Provides Discord bot with access to SHAAD functionality
 */

import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger';

export interface ShaadUser {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
}

export interface ShaadConversation {
  id: string;
  title: string;
  context: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ShaadMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  ai_provider?: string;
  tokens_used?: number;
  created_at: string;
}

export interface ShaadHealthStatus {
  status: string;
  services: Record<string, string>;
  timestamp: string;
  uptime?: number;
  memory?: number;
  cpu?: number;
}

export class ShaadIntegration {
  private api: AxiosInstance;
  private authToken?: string;
  private isInitialized = false;

  constructor() {
    const apiUrl = process.env.SHAAD_API_URL || 'https://myshaad.com/api';
    
    this.api = axios.create({
      baseURL: apiUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SHAAD-Discord-Bot/1.0.0'
      }
    });

    // Add request interceptor for authentication
    this.api.interceptors.request.use((config) => {
      if (this.authToken) {
        config.headers.Authorization = `Bearer ${this.authToken}`;
      }
      return config;
    });

    // Add response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        logger.error('SHAAD API error:', {
          status: error.response?.status,
          message: error.response?.data?.message || error.message,
          url: error.config?.url
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Initialize the SHAAD integration
   */
  public async initialize(): Promise<void> {
    try {
      logger.info('Initializing SHAAD integration...');

      // Test API connectivity
      await this.checkHealth();

      // Authenticate if credentials are provided
      const username = process.env.SHAAD_BOT_USERNAME;
      const password = process.env.SHAAD_BOT_PASSWORD;

      if (username && password) {
        await this.authenticate(username, password);
      }

      this.isInitialized = true;
      logger.info('✅ SHAAD integration initialized successfully');

    } catch (error) {
      logger.error('Failed to initialize SHAAD integration:', error);
      throw error;
    }
  }

  /**
   * Authenticate with SHAAD API
   */
  public async authenticate(username: string, password: string): Promise<void> {
    try {
      const response = await this.api.post('/auth/login', {
        username,
        password
      });

      this.authToken = response.data.accessToken || response.data.token;
      logger.info('Authenticated with SHAAD API');

    } catch (error) {
      logger.error('SHAAD authentication failed:', error);
      throw error;
    }
  }

  /**
   * Check SHAAD system health
   */
  public async checkHealth(): Promise<ShaadHealthStatus> {
    try {
      const response = await this.api.get('/status');
      return response.data;
    } catch (error) {
      // Fallback to basic health endpoint
      try {
        const response = await this.api.get('/health');
        return {
          status: response.data.status || 'unknown',
          services: { api: 'running' },
          timestamp: response.data.timestamp || new Date().toISOString()
        };
      } catch (healthError) {
        throw new Error('SHAAD API is not accessible');
      }
    }
  }

  /**
   * Get all conversations
   */
  public async getConversations(): Promise<ShaadConversation[]> {
    this.ensureInitialized();
    
    const response = await this.api.get('/conversations');
    return response.data.data || response.data;
  }

  /**
   * Get a specific conversation with messages
   */
  public async getConversation(conversationId: string): Promise<{
    conversation: ShaadConversation;
    messages: ShaadMessage[];
  }> {
    this.ensureInitialized();
    
    const response = await this.api.get(`/conversations/${conversationId}`);
    const data = response.data.data || response.data;
    
    return {
      conversation: data,
      messages: data.messages || []
    };
  }

  /**
   * Create a new conversation
   */
  public async createConversation(title: string): Promise<ShaadConversation> {
    this.ensureInitialized();
    
    const response = await this.api.post('/conversations', { title });
    return response.data.data || response.data;
  }

  /**
   * Send a message to SHAAD AI
   */
  public async sendMessage(conversationId: string, content: string): Promise<{
    userMessage: ShaadMessage;
    assistantMessage: ShaadMessage;
  }> {
    this.ensureInitialized();
    
    const response = await this.api.post(`/conversations/${conversationId}/messages`, {
      content
    });
    
    return response.data.data || response.data;
  }

  /**
   * Get system statistics
   */
  public async getSystemStats(): Promise<{
    conversations: number;
    messages: number;
    users: number;
    uptime: number;
  }> {
    this.ensureInitialized();
    
    try {
      // This would need to be implemented in the SHAAD backend
      const response = await this.api.get('/admin/stats');
      return response.data.data || response.data;
    } catch (error) {
      // Fallback to basic stats
      const conversations = await this.getConversations();
      return {
        conversations: conversations.length,
        messages: 0, // Would need aggregation
        users: 1, // Would need user count endpoint
        uptime: 0 // Would need uptime tracking
      };
    }
  }

  /**
   * Search conversations
   */
  public async searchConversations(query: string): Promise<ShaadConversation[]> {
    this.ensureInitialized();
    
    const response = await this.api.get('/conversations', {
      params: { search: query }
    });
    
    return response.data.data || response.data;
  }

  /**
   * Delete a conversation
   */
  public async deleteConversation(conversationId: string): Promise<void> {
    this.ensureInitialized();
    
    await this.api.delete(`/conversations/${conversationId}`);
  }

  /**
   * Get current user profile
   */
  public async getCurrentUser(): Promise<ShaadUser> {
    this.ensureInitialized();
    
    const response = await this.api.get('/auth/me');
    return response.data.user || response.data.data;
  }

  /**
   * Update conversation title
   */
  public async updateConversation(conversationId: string, updates: {
    title?: string;
    context?: any;
  }): Promise<ShaadConversation> {
    this.ensureInitialized();
    
    const response = await this.api.put(`/conversations/${conversationId}`, updates);
    return response.data.data || response.data;
  }

  /**
   * Trigger a system backup (if implemented)
   */
  public async triggerBackup(): Promise<{ success: boolean; message: string }> {
    this.ensureInitialized();
    
    try {
      const response = await this.api.post('/admin/backup');
      return response.data;
    } catch (error) {
      return {
        success: false,
        message: 'Backup endpoint not available'
      };
    }
  }

  /**
   * Get API version and info
   */
  public async getApiInfo(): Promise<any> {
    const response = await this.api.get('/');
    return response.data;
  }

  /**
   * Check if integration is properly initialized
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('SHAAD integration not initialized. Call initialize() first.');
    }
  }

  /**
   * Get current authentication status
   */
  public isAuthenticated(): boolean {
    return !!this.authToken;
  }

  /**
   * Get integration status
   */
  public getStatus() {
    return {
      isInitialized: this.isInitialized,
      isAuthenticated: this.isAuthenticated(),
      apiUrl: this.api.defaults.baseURL
    };
  }
}