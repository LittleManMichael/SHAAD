/**
 * React Hook for WebSocket Integration
 * 
 * This hook provides easy WebSocket functionality for React components
 * with automatic connection management and event handling.
 */

import { useState, useEffect, useCallback } from 'react';
import { webSocketService } from '../services/websocket.service';
import type { Message } from '../services/conversation.service';
import { useAuth } from '../contexts/AuthContext';

interface UseWebSocketOptions {
  autoConnect?: boolean;
  conversationId?: string | null;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  isAuthenticated: boolean;
  sendMessage: (conversationId: string, content: string) => void;
  joinConversation: (conversationId: string) => void;
  connect: () => Promise<void>;
  disconnect: () => void;
  error: string | null;
  isTyping: boolean;
}

export const useWebSocket = (options: UseWebSocketOptions = {}): UseWebSocketReturn => {
  const { autoConnect = true, conversationId } = options;
  const { user } = useAuth();
  
  // State
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);

  // Connect to WebSocket
  const connect = useCallback(async () => {
    try {
      await webSocketService.connect();
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to connect to WebSocket');
    }
  }, []);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    webSocketService.disconnect();
  }, []);

  // Send message via WebSocket
  const sendMessage = useCallback((conversationId: string, content: string) => {
    webSocketService.sendMessage(conversationId, content);
  }, []);

  // Join conversation
  const joinConversation = useCallback((conversationId: string) => {
    webSocketService.joinConversation(conversationId);
  }, []);

  // Set up event listeners
  useEffect(() => {
    const handleAuthenticated = () => {
      setIsAuthenticated(true);
      setIsConnected(true);
      setError(null);
    };

    const handleError = (data: any) => {
      setError(data.message || 'WebSocket error');
    };

    const handleTypingStart = (data: any) => {
      if (data.userId === 'assistant' || data.userId !== user?.id) {
        setIsTyping(true);
      }
    };

    const handleTypingStop = (data: any) => {
      if (data.userId === 'assistant' || data.userId !== user?.id) {
        setIsTyping(false);
      }
    };

    // Add event listeners
    webSocketService.on('authenticated', handleAuthenticated);
    webSocketService.on('error', handleError);
    webSocketService.on('typing_start', handleTypingStart);
    webSocketService.on('typing_stop', handleTypingStop);

    // Cleanup
    return () => {
      webSocketService.off('authenticated', handleAuthenticated);
      webSocketService.off('error', handleError);
      webSocketService.off('typing_start', handleTypingStart);
      webSocketService.off('typing_stop', handleTypingStop);
    };
  }, [user?.id]);

  // Auto-connect when user is authenticated
  useEffect(() => {
    if (autoConnect && user && !isConnected) {
      connect();
    }
  }, [autoConnect, user, isConnected, connect]);

  // Join conversation when conversationId changes
  useEffect(() => {
    if (isAuthenticated && conversationId) {
      joinConversation(conversationId);
    }
  }, [isAuthenticated, conversationId, joinConversation]);

  // Update connection status
  useEffect(() => {
    const checkConnection = () => {
      const connected = webSocketService.isConnected();
      setIsConnected(connected);
      setIsAuthenticated(connected);
    };

    const interval = setInterval(checkConnection, 5000);
    return () => clearInterval(interval);
  }, []);

  return {
    isConnected,
    isAuthenticated,
    sendMessage,
    joinConversation,
    connect,
    disconnect,
    error,
    isTyping,
  };
};