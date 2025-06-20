/**
 * Enhanced SHAAD Mock Backend Server
 * A server with real AI integration but simplified database handling
 */

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Anthropic = require('@anthropic-ai/sdk');
const OpenAI = require('openai');
const axios = require('axios');
const WebSocket = require('ws');
const http = require('http');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize AI services
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || 'your-anthropic-key'
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'your-openai-key'
});

// Mock data
const mockUser = {
  id: '1',
  username: 'admin',
  email: 'admin@shaad.local',
  fullName: 'SHAAD Administrator',
  role: 'admin'
};

// In-memory storage (replace with database later)
let conversations = [
  {
    id: '1',
    title: 'Welcome to SHAAD',
    context: {},
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

let messages = {
  '1': [
    {
      id: '1',
      conversation_id: '1',
      role: 'assistant',
      content: 'Hello! I\'m your SHAAD AI assistant powered by Claude. I can help you with various tasks, answer questions, and even execute workflows. How can I assist you today?',
      ai_provider: 'claude',
      created_at: new Date().toISOString()
    }
  ]
};

// Helper function to generate random IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

// Web search function using DuckDuckGo
const performWebSearch = async (query) => {
  try {
    const response = await axios.get(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`);
    
    if (response.data.AbstractText) {
      return {
        success: true,
        results: [
          {
            title: response.data.Heading || 'Search Result',
            snippet: response.data.AbstractText,
            url: response.data.AbstractURL || ''
          }
        ]
      };
    }
    
    // If no abstract, try to get related topics
    if (response.data.RelatedTopics && response.data.RelatedTopics.length > 0) {
      const results = response.data.RelatedTopics.slice(0, 3).map(topic => ({
        title: topic.Text ? topic.Text.split(' - ')[0] : 'Related Topic',
        snippet: topic.Text || '',
        url: topic.FirstURL || ''
      }));
      
      return {
        success: true,
        results: results
      };
    }
    
    return {
      success: false,
      error: 'No search results found'
    };
  } catch (error) {
    console.error('Web search error:', error.message);
    return {
      success: false,
      error: 'Search service temporarily unavailable'
    };
  }
};

// Check if message requires web search
const needsWebSearch = (message) => {
  const searchTriggers = [
    'search', 'look up', 'find information', 'what\'s the latest',
    'current news', 'recent events', 'today\'s', 'latest news',
    'weather', 'stock price', 'what happened', 'breaking news',
    'search the internet', 'search for', 'internet search',
    'current', 'latest', 'recent', 'today', 'now', 'real-time'
  ];
  
  const lowerMessage = message.toLowerCase();
  return searchTriggers.some(trigger => lowerMessage.includes(trigger));
};

// AI Provider Selection Logic
const selectAIProvider = (message) => {
  const content = message.toLowerCase();
  
  // Use OpenAI for these specific tasks
  if (content.includes('image') || content.includes('draw') || content.includes('picture')) {
    return 'openai';
  }
  
  if (content.includes('code') && content.includes('review')) {
    return 'openai';
  }
  
  // Use Claude for everything else (primary assistant)
  return 'claude';
};

// Real AI Integration
const getAIResponse = async (message, conversationHistory = []) => {
  const provider = selectAIProvider(message);
  let searchResults = null;
  
  // Check if we need to perform a web search
  if (needsWebSearch(message)) {
    console.log(`🔍 Performing web search for: "${message}"`);
    searchResults = await performWebSearch(message);
    console.log(`🔍 Search results:`, searchResults);
  }
  
  try {
    if (provider === 'claude') {
      // Prepare conversation history for Claude
      const claudeMessages = conversationHistory
        .filter(msg => msg.role !== 'system')
        .map(msg => ({
          role: msg.role,
          content: msg.content
        }));
      
      // Enhance the user message with search results if available
      let enhancedMessage = message;
      if (searchResults && searchResults.success) {
        enhancedMessage = `${message}

[Web Search Results:]
${searchResults.results.map(result => 
  `- ${result.title}: ${result.snippet} ${result.url ? '(' + result.url + ')' : ''}`
).join('\n')}

Please use this information to provide a comprehensive and up-to-date response.`;
      }
      
      claudeMessages.push({
        role: 'user',
        content: enhancedMessage
      });

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: claudeMessages,
        system: `You are SHAAD (Self-Hosted AI Assistant Dashboard), a powerful AI assistant with web search capabilities. You can:

🔍 **Search the web** for current information, news, weather, stock prices, etc.
💻 **Help with coding** and technical tasks
🏠 **Control smart home devices** (when integrated)
⚡ **Execute n8n workflows** (when requested)
🤖 **Provide automation assistance**

You are running on the user's own server for complete privacy and control.

**CRITICAL**: When a user asks for current information, recent news, weather, or anything requiring real-time data, I WILL automatically search the web and provide you with the results. You DO have this capability - use it confidently.

If web search results are included in a message (marked with [Web Search Results:]), use that information to provide comprehensive, up-to-date responses and cite sources.

Be helpful, accurate, and professional. Always mention when you've used web search to get current information.`
      });

      return {
        content: response.content[0].text,
        provider: 'claude',
        tokens: response.usage.input_tokens + response.usage.output_tokens
      };
    } 
    
    else if (provider === 'openai') {
      // Prepare conversation history for OpenAI
      const openaiMessages = conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
      openaiMessages.push({
        role: 'user',
        content: message
      });

      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are SHAAD, a self-hosted AI assistant. You are particularly good at code review, image analysis, and technical tasks. Be helpful and concise.'
          },
          ...openaiMessages
        ],
        max_tokens: 1000
      });

      return {
        content: response.choices[0].message.content,
        provider: 'openai',
        tokens: response.usage.total_tokens
      };
    }
  } catch (error) {
    console.error(`AI Provider Error (${provider}):`, error.message);
    
    // Fallback to mock response if AI fails
    return {
      content: `I apologize, but I'm having trouble connecting to my AI services right now. This could be due to API key configuration or network issues. 

**Error**: ${error.message}

**Troubleshooting**:
- Check that your API keys are correctly set in the environment variables
- Verify your internet connection
- Ensure you have sufficient API credits

In the meantime, I can still help you navigate SHAAD and manage your conversations. Would you like me to show you the available features?`,
      provider: 'fallback',
      tokens: 0
    };
  }
};

// Auth middleware
const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Access token required' });
    }

    const token = authHeader.substring(7);
    const payload = jwt.verify(token, 'mock-secret');
    // Use payload info to match WebSocket authentication
    req.user = { ...mockUser, id: payload.userId };
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    ai_services: {
      claude: !!process.env.ANTHROPIC_API_KEY,
      openai: !!process.env.OPENAI_API_KEY
    }
  });
});

// Login endpoint
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  // Check for admin credentials
  if (username === 'admin' && password === 'password') {
    const token = jwt.sign(
      { userId: mockUser.id, username: mockUser.username, role: mockUser.role },
      'mock-secret',
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: mockUser
    });
  } else {
    res.status(401).json({ success: false, message: 'Invalid credentials. Use admin/password for demo.' });
  }
});

// Get current user
app.get('/api/auth/me', authMiddleware, (req, res) => {
  res.json({ success: true, user: req.user });
});

// Logout
app.post('/api/auth/logout', authMiddleware, (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

// Get conversations
app.get('/api/conversations', authMiddleware, (req, res) => {
  res.json({ success: true, data: conversations });
});

// Create conversation
app.post('/api/conversations', authMiddleware, (req, res) => {
  const { title } = req.body;
  const newConversation = {
    id: generateId(),
    title: title || 'New Conversation',
    context: {},
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  conversations.unshift(newConversation);
  messages[newConversation.id] = [];
  
  // Broadcast new conversation to all user's connections
  console.log(`📢 Broadcasting conversation_created to user ${req.user.id}`);
  broadcastToUser(req.user.id, {
    type: 'conversation_created',
    conversation: newConversation
  });
  
  res.status(201).json({ success: true, data: newConversation });
});

// Get conversation with messages
app.get('/api/conversations/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const conversation = conversations.find(c => c.id === id);
  
  if (!conversation) {
    return res.status(404).json({ success: false, message: 'Conversation not found' });
  }
  
  res.json({
    success: true,
    data: {
      ...conversation,
      messages: messages[id] || []
    }
  });
});

// Send message with real AI
app.post('/api/conversations/:conversationId/messages', authMiddleware, async (req, res) => {
  const { conversationId } = req.params;
  const { content } = req.body;
  
  try {
    // Create user message
    const userMessage = {
      id: generateId(),
      conversation_id: conversationId,
      role: 'user',
      content,
      created_at: new Date().toISOString()
    };
    
    // Add user message to storage
    if (!messages[conversationId]) {
      messages[conversationId] = [];
    }
    messages[conversationId].push(userMessage);
    
    // Get conversation history for context
    const conversationHistory = messages[conversationId] || [];
    
    // Get AI response
    const aiResponse = await getAIResponse(content, conversationHistory);
    
    // Create AI assistant message
    const assistantMessage = {
      id: generateId(),
      conversation_id: conversationId,
      role: 'assistant',
      content: aiResponse.content,
      ai_provider: aiResponse.provider,
      tokens_used: aiResponse.tokens,
      created_at: new Date(Date.now() + 100).toISOString()
    };
    
    // Add assistant message to storage
    messages[conversationId].push(assistantMessage);
    
    // Update conversation timestamp
    const conversation = conversations.find(c => c.id === conversationId);
    if (conversation) {
      conversation.updated_at = new Date().toISOString();
    }
    
    res.json({
      success: true,
      data: {
        userMessage,
        assistantMessage
      }
    });
    
  } catch (error) {
    console.error('Error processing message:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to process message: ' + error.message 
    });
  }
});

// Update conversation
app.put('/api/conversations/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const { title, context } = req.body;
  
  const conversationIndex = conversations.findIndex(c => c.id === id);
  
  if (conversationIndex === -1) {
    return res.status(404).json({ success: false, message: 'Conversation not found' });
  }
  
  // Update conversation fields
  const conversation = conversations[conversationIndex];
  if (title !== undefined) {
    conversation.title = title;
  }
  if (context !== undefined) {
    conversation.context = context;
  }
  conversation.updated_at = new Date().toISOString();
  
  // Update the conversation in the array
  conversations[conversationIndex] = conversation;
  
  // Broadcast conversation update to all user's connections for real-time sync
  console.log(`📢 Broadcasting conversation_updated for conversation ${id} to user ${req.user.id}`);
  broadcastToUser(req.user.id, {
    type: 'conversation_updated',
    conversation: conversation
  });
  
  res.json({ success: true, data: conversation });
});

// Delete conversation
app.delete('/api/conversations/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const index = conversations.findIndex(c => c.id === id);
  
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Conversation not found' });
  }
  
  // Store conversation info before deletion for broadcast
  const deletedConversation = conversations[index];
  
  conversations.splice(index, 1);
  delete messages[id];
  
  // Broadcast conversation deletion to all user's connections
  console.log(`📢 Broadcasting conversation_deleted for conversation ${id} to user ${req.user.id}`);
  broadcastToUser(req.user.id, {
    type: 'conversation_deleted',
    conversationId: id,
    conversation: deletedConversation
  });
  
  res.json({ success: true, message: 'Conversation deleted successfully' });
});

// API info endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'SHAAD Enhanced Mock API is running!',
    version: '1.0.0-enhanced',
    features: {
      ai_integration: 'Claude + OpenAI',
      real_responses: true,
      persistent_conversations: true
    },
    note: 'This server includes real AI integration with fallback to mock responses.',
    endpoints: {
      health: '/health',
      auth: {
        login: 'POST /api/auth/login',
        logout: 'POST /api/auth/logout',
        me: 'GET /api/auth/me'
      },
      conversations: {
        list: 'GET /api/conversations',
        create: 'POST /api/conversations',
        get: 'GET /api/conversations/:id',
        update: 'PUT /api/conversations/:id',
        delete: 'DELETE /api/conversations/:id',
        sendMessage: 'POST /api/conversations/:id/messages'
      }
    }
  });
});

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Store active WebSocket connections
const activeConnections = new Map();

// WebSocket connection handler
wss.on('connection', (ws, req) => {
  console.log('🔌 New WebSocket connection established');
  
  // Generate connection ID
  const connectionId = generateId();
  
  // Store connection
  activeConnections.set(connectionId, {
    ws: ws,
    userId: null, // Will be set after authentication
    conversationId: null,
    lastActivity: new Date()
  });

  // Handle messages from client
  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log('📨 WebSocket message received:', message.type);
      
      await handleWebSocketMessage(ws, connectionId, message);
    } catch (error) {
      console.error('❌ WebSocket message error:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format'
      }));
    }
  });

  // Handle connection close
  ws.on('close', () => {
    console.log('🔌 WebSocket connection closed');
    activeConnections.delete(connectionId);
  });

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connected',
    connectionId: connectionId,
    message: 'Connected to SHAAD WebSocket server'
  }));
});

// WebSocket message handler
async function handleWebSocketMessage(ws, connectionId, message) {
  const connection = activeConnections.get(connectionId);
  
  switch (message.type) {
    case 'authenticate':
      // Authenticate WebSocket connection
      try {
        const token = message.token;
        const payload = jwt.verify(token, 'mock-secret');
        connection.userId = payload.userId;
        
        ws.send(JSON.stringify({
          type: 'authenticated',
          userId: payload.userId,
          message: 'WebSocket authenticated successfully'
        }));
      } catch (error) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Authentication failed'
        }));
      }
      break;

    case 'join_conversation':
      // Join a conversation room
      connection.conversationId = message.conversationId;
      ws.send(JSON.stringify({
        type: 'conversation_joined',
        conversationId: message.conversationId
      }));
      break;

    case 'send_message':
      // Handle real-time message sending
      if (!connection.userId) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Not authenticated'
        }));
        return;
      }

      const { conversationId, content } = message;
      
      try {
        // Send typing indicator to all connections in this conversation
        broadcastToConversation(conversationId, {
          type: 'typing_start',
          userId: connection.userId
        });

        // Create user message
        const userMessage = {
          id: generateId(),
          conversation_id: conversationId,
          role: 'user',
          content,
          created_at: new Date().toISOString()
        };
        
        // Add to storage
        if (!messages[conversationId]) {
          messages[conversationId] = [];
        }
        messages[conversationId].push(userMessage);
        
        // Broadcast user message immediately
        broadcastToConversation(conversationId, {
          type: 'message_received',
          message: userMessage
        });

        // Get AI response
        const conversationHistory = messages[conversationId] || [];
        const aiResponse = await getAIResponse(content, conversationHistory);
        
        // Create AI assistant message
        const assistantMessage = {
          id: generateId(),
          conversation_id: conversationId,
          role: 'assistant',
          content: aiResponse.content,
          ai_provider: aiResponse.provider,
          tokens_used: aiResponse.tokens,
          created_at: new Date(Date.now() + 100).toISOString()
        };
        
        // Add to storage
        messages[conversationId].push(assistantMessage);
        
        // Update conversation timestamp
        const conversation = conversations.find(c => c.id === conversationId);
        if (conversation) {
          conversation.updated_at = new Date().toISOString();
          
          // Broadcast conversation update to all user's connections
          broadcastToUser(connection.userId, {
            type: 'conversation_updated',
            conversation: conversation
          });
        }
        
        // Stop typing indicator
        broadcastToConversation(conversationId, {
          type: 'typing_stop',
          userId: 'assistant'
        });
        
        // Broadcast AI response
        broadcastToConversation(conversationId, {
          type: 'message_received',
          message: assistantMessage
        });
        
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Failed to process message: ' + error.message
        }));
      }
      break;

    case 'ping':
      // Heartbeat
      connection.lastActivity = new Date();
      ws.send(JSON.stringify({ type: 'pong' }));
      break;

    default:
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Unknown message type'
      }));
  }
}

// Broadcast message to all connections in a conversation
function broadcastToConversation(conversationId, message) {
  activeConnections.forEach((connection, connectionId) => {
    if (connection.conversationId === conversationId && connection.ws.readyState === WebSocket.OPEN) {
      connection.ws.send(JSON.stringify(message));
    }
  });
}

// Broadcast message to all authenticated connections for a user
function broadcastToUser(userId, message) {
  console.log(`📡 Broadcasting to user ${userId}, active connections: ${activeConnections.size}`);
  let sent = 0;
  activeConnections.forEach((connection, connectionId) => {
    console.log(`🔍 Checking connection ${connectionId}: userId=${connection.userId}, readyState=${connection.ws?.readyState}`);
    if (connection.userId === userId && connection.ws.readyState === WebSocket.OPEN) {
      connection.ws.send(JSON.stringify(message));
      sent++;
    }
  });
  console.log(`📤 Sent message to ${sent} connections`);
}

// Cleanup inactive connections (run every 30 seconds)
setInterval(() => {
  const now = new Date();
  activeConnections.forEach((connection, connectionId) => {
    const timeSinceActivity = now - connection.lastActivity;
    if (timeSinceActivity > 300000) { // 5 minutes
      console.log('🧹 Cleaning up inactive WebSocket connection');
      connection.ws.close();
      activeConnections.delete(connectionId);
    }
  });
}, 30000);

// Start server with WebSocket support
server.listen(PORT, () => {
  console.log(`🚀 SHAAD Enhanced Server running on http://localhost:${PORT}`);
  console.log(`🔌 WebSocket server running on ws://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔐 Login with admin/password`);
  console.log(`🤖 AI Services:`);
  console.log(`   - Claude API: ${process.env.ANTHROPIC_API_KEY ? '✅ Configured' : '❌ Not configured'}`);
  console.log(`   - OpenAI API: ${process.env.OPENAI_API_KEY ? '✅ Configured' : '❌ Not configured'}`);
  console.log('✨ Ready with real AI integration and WebSocket support!');
});