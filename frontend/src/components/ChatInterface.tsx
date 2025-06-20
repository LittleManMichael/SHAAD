/**
 * Chat Interface Component
 * 
 * This is the main chat interface where users interact with the AI assistant.
 * Features:
 * - Message display with different styles for user/assistant
 * - Real-time message sending
 * - Typing indicators
 * - Markdown support for AI responses
 * - Auto-scroll to latest messages
 * - Message actions (copy, delete)
 * - File upload support (future)
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  TextField,
  IconButton,
  Typography,
  Divider,
  Chip,
  CircularProgress,
  Alert,
  Avatar,
  Tooltip,
  Fab,
} from '@mui/material';
import {
  Send,
  SmartToy,
  Person,
  ContentCopy,
  Delete,
  KeyboardArrowDown,
} from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import { format } from 'date-fns';
import { conversationService } from '../services/conversation.service';
import type { Message, ConversationWithMessages } from '../services/conversation.service';
import { useSnackbar } from '../contexts/SnackbarContext';
import { useWebSocket } from '../hooks/useWebSocket';
import { webSocketService } from '../services/websocket.service';

interface ChatInterfaceProps {
  conversationId: string | null;
  onConversationChange: (conversationId: string) => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  conversationId,
  onConversationChange,
}) => {
  const { showSnackbar } = useSnackbar();
  
  // WebSocket integration
  const { 
    sendMessage: sendWebSocketMessage, 
    joinConversation,
    isTyping,
    isConnected 
  } = useWebSocket({ 
    autoConnect: true, 
    conversationId 
  });
  
  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [conversation, setConversation] = useState<ConversationWithMessages | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [useRealTime, setUseRealTime] = useState(true); // Toggle for real-time vs HTTP

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /**
   * Load conversation and messages
   */
  const loadConversation = async (convId: string) => {
    try {
      setLoading(true);
      setError('');
      
      const conversationData = await conversationService.getConversation(convId);
      setConversation(conversationData);
      setMessages(conversationData.messages || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load conversation');
      setMessages([]);
      setConversation(null);
    } finally {
      setLoading(false);
    }
  };

  // WebSocket event handlers
  useEffect(() => {
    const handleMessageReceived = (message: Message) => {
      setMessages(prev => {
        // Check if message already exists to avoid duplicates
        const exists = prev.some(m => m.id === message.id);
        if (exists) return prev;
        
        return [...prev, message];
      });
      setSending(false);
    };

    const handleError = (error: any) => {
      console.error('WebSocket error:', error);
      showSnackbar(error.message || 'Real-time connection error', 'error');
      setSending(false);
    };

    // Add WebSocket event listeners
    webSocketService.on('message_received', handleMessageReceived);
    webSocketService.on('error', handleError);

    // Cleanup
    return () => {
      webSocketService.off('message_received', handleMessageReceived);
      webSocketService.off('error', handleError);
    };
  }, [showSnackbar]);

  // Load conversation when conversationId changes
  useEffect(() => {
    if (conversationId) {
      loadConversation(conversationId);
      // Join WebSocket conversation for real-time updates
      if (isConnected) {
        joinConversation(conversationId);
      }
    } else {
      setMessages([]);
      setConversation(null);
      setError('');
    }
  }, [conversationId, isConnected, joinConversation]);

  /**
   * Auto-scroll to bottom when new messages arrive
   */
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  /**
   * Handle scroll to detect if user has scrolled up
   */
  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    
    setShowScrollButton(!isNearBottom);
  };

  /**
   * Send a message to the AI assistant
   */
  const handleSendMessage = async () => {
    if (!messageInput.trim() || sending) return;
    
    let currentConversationId = conversationId;
    
    // If no conversation is selected, create a new one
    if (!currentConversationId) {
      try {
        const newConversation = await conversationService.createConversation({
          title: messageInput.slice(0, 50) + (messageInput.length > 50 ? '...' : ''),
        });
        currentConversationId = newConversation.id;
        onConversationChange(currentConversationId);
        
        // Join the new conversation via WebSocket
        if (isConnected) {
          joinConversation(currentConversationId);
        }
      } catch (err: any) {
        showSnackbar(err.message || 'Failed to create conversation', 'error');
        return;
      }
    }

    const currentMessage = messageInput;
    setMessageInput(''); // Clear input immediately
    setSending(true);

    try {
      // Use WebSocket for real-time messaging if connected, otherwise fall back to HTTP
      if (useRealTime && isConnected) {
        // Send via WebSocket for real-time experience
        sendWebSocketMessage(currentConversationId, currentMessage);
        // The response will be handled by WebSocket event listeners
      } else {
        // Fallback to HTTP API
        // Add user message to UI immediately for better UX
        const tempUserMessage: Message = {
          id: 'temp-' + Date.now(),
          conversation_id: currentConversationId,
          role: 'user',
          content: currentMessage,
          created_at: new Date().toISOString(),
        };
        
        setMessages(prev => [...prev, tempUserMessage]);

        // Send message to backend
        const response = await conversationService.sendMessage(currentConversationId, currentMessage);
        
        // Replace temp message with real messages from backend
        setMessages(prev => {
          const filtered = prev.filter(msg => msg.id !== tempUserMessage.id);
          return [
            ...filtered,
            response.data.userMessage,
            response.data.assistantMessage,
          ];
        });
        
        setSending(false);
      }
      
    } catch (err: any) {
      // Remove temp message on error
      setMessages(prev => prev.filter(msg => msg.id.startsWith('temp-')));
      showSnackbar(err.message || 'Failed to send message', 'error');
      setSending(false);
    } finally {
      // Focus back to input
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  /**
   * Handle Enter key press in input
   */
  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  /**
   * Copy message content to clipboard
   */
  const handleCopyMessage = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      showSnackbar('Message copied to clipboard', 'success');
    } catch (err) {
      showSnackbar('Failed to copy message', 'error');
    }
  };

  /**
   * Format message timestamp
   */
  const formatMessageTime = (timestamp: string) => {
    return format(new Date(timestamp), 'HH:mm');
  };

  /**
   * Render a single message
   */
  const renderMessage = (message: Message) => {
    const isUser = message.role === 'user';
    const isSystem = message.role === 'system';
    
    return (
      <Box
        key={message.id}
        sx={{
          display: 'flex',
          justifyContent: isUser ? 'flex-end' : 'flex-start',
          mb: 2,
          px: 2,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: isUser ? 'row-reverse' : 'row',
            alignItems: 'flex-start',
            maxWidth: '80%',
            gap: 1,
          }}
        >
          {/* Avatar */}
          <Avatar
            sx={{
              width: 32,
              height: 32,
              bgcolor: isUser ? 'primary.main' : 'secondary.main',
            }}
          >
            {isUser ? <Person /> : <SmartToy />}
          </Avatar>

          {/* Message Bubble */}
          <Paper
            elevation={1}
            sx={{
              p: 2,
              bgcolor: isUser ? 'primary.main' : 'background.paper',
              color: isUser ? 'primary.contrastText' : 'text.primary',
              borderRadius: 2,
              position: 'relative',
              '&:hover .message-actions': {
                opacity: 1,
              },
            }}
          >
            {/* Message Content */}
            <Box sx={{ mb: 1 }}>
              {isUser ? (
                <Typography variant="body1">{message.content}</Typography>
              ) : (
                <ReactMarkdown
                  components={{
                    // Custom styling for markdown elements
                    p: ({ children }) => (
                      <Typography variant="body1" component="div" sx={{ mb: 1 }}>
                        {children}
                      </Typography>
                    ),
                    code: ({ children }) => (
                      <Box
                        component="code"
                        sx={{
                          bgcolor: 'grey.100',
                          color: 'grey.900',
                          px: 0.5,
                          borderRadius: 0.5,
                          fontFamily: 'monospace',
                        }}
                      >
                        {children}
                      </Box>
                    ),
                    pre: ({ children }) => (
                      <Box
                        component="pre"
                        sx={{
                          bgcolor: 'grey.100',
                          color: 'grey.900',
                          p: 2,
                          borderRadius: 1,
                          overflow: 'auto',
                          fontFamily: 'monospace',
                          fontSize: '0.875rem',
                        }}
                      >
                        {children}
                      </Box>
                    ),
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              )}
            </Box>

            {/* Message Metadata */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="caption" sx={{ opacity: 0.7 }}>
                {formatMessageTime(message.created_at)}
              </Typography>
              
              {message.ai_provider && (
                <Chip
                  label={message.ai_provider}
                  size="small"
                  sx={{ height: 16, fontSize: '0.6rem' }}
                />
              )}
            </Box>

            {/* Message Actions */}
            <Box
              className="message-actions"
              sx={{
                position: 'absolute',
                top: -10,
                right: isUser ? 'auto' : -10,
                left: isUser ? -10 : 'auto',
                opacity: 0,
                transition: 'opacity 0.2s',
                display: 'flex',
                gap: 0.5,
              }}
            >
              <Tooltip title="Copy message">
                <IconButton
                  size="small"
                  onClick={() => handleCopyMessage(message.content)}
                  sx={{ bgcolor: 'background.paper', boxShadow: 1 }}
                >
                  <ContentCopy fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Paper>
        </Box>
      </Box>
    );
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Chat Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            {conversation ? (
              <>
                <Typography variant="h6" noWrap>
                  {conversation.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {messages.length} messages
                </Typography>
              </>
            ) : (
              <Typography variant="h6" noWrap>
                SHAAD AI Assistant
              </Typography>
            )}
          </Box>
          {/* Space for future actions */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          </Box>
        </Box>
      </Box>

      {/* Messages Area */}
      <Box
        ref={messagesContainerRef}
        onScroll={handleScroll}
        sx={{
          flex: 1,
          overflow: 'auto',
          py: 1,
        }}
      >
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Box sx={{ p: 2 }}>
            <Alert severity="error">{error}</Alert>
          </Box>
        ) : !conversationId ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <SmartToy sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Welcome to SHAAD
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Select a conversation or start a new one to begin chatting with your AI assistant.
            </Typography>
          </Box>
        ) : messages.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <SmartToy sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Start a Conversation
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Type a message below to start chatting with your AI assistant.
            </Typography>
          </Box>
        ) : (
          messages.map(renderMessage)
        )}

        {/* Real-time Typing Indicator */}
        {(sending || isTyping) && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 2, px: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
                <SmartToy />
              </Avatar>
              <Paper elevation={1} sx={{ p: 2, borderRadius: 2 }}>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: 'text.secondary',
                      animation: 'typing 1.4s infinite ease-in-out',
                      animationDelay: '0s',
                    }}
                  />
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: 'text.secondary',
                      animation: 'typing 1.4s infinite ease-in-out',
                      animationDelay: '0.2s',
                    }}
                  />
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: 'text.secondary',
                      animation: 'typing 1.4s infinite ease-in-out',
                      animationDelay: '0.4s',
                    }}
                  />
                </Box>
              </Paper>
            </Box>
          </Box>
        )}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </Box>

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <Fab
          size="small"
          sx={{
            position: 'absolute',
            bottom: 80,
            right: 16,
          }}
          onClick={scrollToBottom}
        >
          <KeyboardArrowDown />
        </Fab>
      )}

      {/* Message Input */}
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            ref={inputRef}
            fullWidth
            multiline
            maxRows={4}
            placeholder="Type your message..."
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={sending}
            variant="outlined"
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 3,
              },
            }}
          />
          <IconButton
            color="primary"
            onClick={handleSendMessage}
            disabled={!messageInput.trim() || sending}
            sx={{
              bgcolor: 'primary.main',
              color: 'white',
              '&:hover': {
                bgcolor: 'primary.dark',
              },
              '&.Mui-disabled': {
                bgcolor: 'action.disabledBackground',
              },
            }}
          >
            {sending ? <CircularProgress size={24} /> : <Send />}
          </IconButton>
        </Box>
      </Box>

      {/* CSS for typing animation */}
      <style>
        {`
          @keyframes typing {
            0%, 60%, 100% {
              transform: scale(1);
              opacity: 0.5;
            }
            30% {
              transform: scale(1.2);
              opacity: 1;
            }
          }
        `}
      </style>
    </Box>
  );
};

export default ChatInterface;