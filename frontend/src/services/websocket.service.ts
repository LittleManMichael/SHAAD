/**
 * WebSocket Service for Real-time Communication
 * 
 * This service manages WebSocket connections to the SHAAD backend
 * for real-time chat functionality, typing indicators, and live updates.
 * 
 * Features:
 * - Real-time message sending and receiving
 * - Typing indicators
 * - Connection management with auto-reconnect
 * - Authentication integration
 * - Event-based architecture
 */

import { authService } from './auth.service';
import type { Message } from './conversation.service';

export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

type EventCallback = (data: any) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private isAuthenticated = false;
  private currentConversationId: string | null = null;
  private eventListeners: Map<string, EventCallback[]> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  // Get WebSocket URL from environment
  private getWebSocketUrl(): string {
    const wsUrl = import.meta.env.VITE_WS_URL || 'wss://myshaad.com';
    const baseUrl = wsUrl.replace('http://', 'ws://').replace('https://', 'wss://');
    // Add /ws path for nginx proxy
    return `${baseUrl}/ws`;
  }

  /**
   * Connect to WebSocket server
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = this.getWebSocketUrl();
        console.log('🔌 Connecting to WebSocket:', wsUrl);
        
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('✅ WebSocket connected');
          this.reconnectAttempts = 0;
          this.reconnectDelay = 1000;
          this.startHeartbeat();
          this.authenticate();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('❌ Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onclose = (event) => {
          console.log('🔌 WebSocket connection closed:', event.code, event.reason);
          this.isAuthenticated = false;
          this.stopHeartbeat();
          
          // Auto-reconnect if not a normal closure
          if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          reject(error);
        };

      } catch (error) {
        console.error('❌ Failed to create WebSocket connection:', error);
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.ws) {
      this.stopHeartbeat();
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
      this.isAuthenticated = false;
      this.currentConversationId = null;
    }
  }

  /**
   * Authenticate WebSocket connection
   */
  private authenticate(): void {
    const token = authService.getToken();
    if (token && this.ws?.readyState === WebSocket.OPEN) {
      this.send({
        type: 'authenticate',
        token: token
      });
    }
  }

  /**
   * Join a conversation for real-time updates
   */
  joinConversation(conversationId: string): void {
    this.currentConversationId = conversationId;
    if (this.isAuthenticated && this.ws?.readyState === WebSocket.OPEN) {
      this.send({
        type: 'join_conversation',
        conversationId: conversationId
      });
    }
  }

  /**
   * Send a message via WebSocket
   */
  sendMessage(conversationId: string, content: string): void {
    if (this.isAuthenticated && this.ws?.readyState === WebSocket.OPEN) {
      this.send({
        type: 'send_message',
        conversationId: conversationId,
        content: content
      });
    } else {
      console.error('❌ Cannot send message: WebSocket not connected or authenticated');
      this.emit('error', { message: 'Not connected to real-time chat' });
    }
  }

  /**
   * Send raw message to WebSocket
   */
  private send(message: WebSocketMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(message: WebSocketMessage): void {
    console.log('📨 WebSocket message received:', message.type);

    switch (message.type) {
      case 'connected':
        console.log('🔌 WebSocket connected, connection ID:', message.connectionId);
        break;

      case 'authenticated':
        console.log('🔐 WebSocket authenticated for user:', message.userId);
        this.isAuthenticated = true;
        this.emit('authenticated', message);
        
        // Join current conversation if set
        if (this.currentConversationId) {
          this.joinConversation(this.currentConversationId);
        }
        break;

      case 'conversation_joined':
        console.log('💬 Joined conversation:', message.conversationId);
        this.emit('conversation_joined', message);
        break;

      case 'conversation_created':
        console.log('✨ New conversation created:', message.conversation.title);
        this.emit('conversation_created', message.conversation);
        break;

      case 'conversation_updated':
        console.log('🔄 Conversation updated:', message.conversation.title);
        this.emit('conversation_updated', message.conversation);
        break;

      case 'conversation_deleted':
        console.log('🗑️ Conversation deleted:', message.conversationId);
        this.emit('conversation_deleted', message);
        break;

      case 'message_received':
        console.log('📩 Message received:', message.message.role);
        this.emit('message_received', message.message);
        break;

      case 'typing_start':
        console.log('⌨️ User started typing:', message.userId);
        this.emit('typing_start', message);
        break;

      case 'typing_stop':
        console.log('⌨️ User stopped typing:', message.userId);
        this.emit('typing_stop', message);
        break;

      case 'error':
        console.error('❌ WebSocket error:', message.message);
        this.emit('error', message);
        break;

      case 'pong':
        // Heartbeat response
        break;

      default:
        console.log('❓ Unknown WebSocket message type:', message.type);
    }
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({ type: 'ping' });
      }
    }, 30000); // Ping every 30 seconds
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    console.log(`🔄 Scheduling reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${this.reconnectDelay}ms`);
    
    setTimeout(() => {
      if (this.reconnectAttempts <= this.maxReconnectAttempts) {
        this.connect().catch(() => {
          // Exponential backoff
          this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
        });
      }
    }, this.reconnectDelay);
  }

  /**
   * Add event listener
   */
  on(event: string, callback: EventCallback): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  /**
   * Remove event listener
   */
  off(event: string, callback: EventCallback): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Emit event to listeners
   */
  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('❌ Error in event listener:', error);
        }
      });
    }
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN && this.isAuthenticated;
  }

  /**
   * Get current conversation ID
   */
  getCurrentConversation(): string | null {
    return this.currentConversationId;
  }
}

// Export singleton instance
export const webSocketService = new WebSocketService();