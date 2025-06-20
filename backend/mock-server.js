/**
 * Mock SHAAD Backend Server
 * A simple server with mock data for frontend testing
 */

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Mock data
const mockUser = {
  id: '1',
  username: 'admin',
  email: 'admin@shaad.local',
  fullName: 'SHAAD Administrator',
  role: 'admin'
};

const mockConversations = [
  {
    id: '1',
    title: 'Welcome to SHAAD',
    context: {},
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '2',
    title: 'AI Assistant Demo',
    context: {},
    is_active: true,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString()
  }
];

const mockMessages = {
  '1': [
    {
      id: '1',
      conversation_id: '1',
      role: 'assistant',
      content: 'Welcome to SHAAD! I\'m your AI assistant. I can help you with various tasks including home automation, scheduling, and general questions. How can I assist you today?',
      ai_provider: 'claude',
      created_at: new Date().toISOString()
    }
  ],
  '2': [
    {
      id: '2',
      conversation_id: '2',
      role: 'user',
      content: 'Hello, can you help me understand what SHAAD can do?',
      created_at: new Date(Date.now() - 86400000).toISOString()
    },
    {
      id: '3',
      conversation_id: '2',
      role: 'assistant',
      content: 'Absolutely! SHAAD (Self-Hosted AI Assistant Dashboard) is a powerful platform that combines AI assistance with automation capabilities. Here\'s what I can do:\n\n**🤖 AI Assistance:**\n- Answer questions and provide information\n- Help with coding and technical tasks\n- Assist with writing and analysis\n\n**🏠 Home Automation:**\n- Control smart home devices\n- Create automation workflows\n- Schedule tasks and reminders\n\n**⚡ Workflow Integration:**\n- Execute n8n workflows\n- Integrate with various APIs\n- Automate repetitive tasks\n\n**🔒 Privacy & Security:**\n- Self-hosted for complete control\n- Your data stays on your server\n- Secure authentication\n\nWhat would you like to explore first?',
      ai_provider: 'claude',
      created_at: new Date(Date.now() - 86300000).toISOString()
    }
  ]
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
    req.user = mockUser;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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
    res.status(401).json({ success: false, message: 'Username and password required' });
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
  res.json({ success: true, data: mockConversations });
});

// Create conversation
app.post('/api/conversations', authMiddleware, (req, res) => {
  const { title } = req.body;
  const newConversation = {
    id: String(mockConversations.length + 1),
    title: title || 'New Conversation',
    context: {},
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  mockConversations.unshift(newConversation);
  mockMessages[newConversation.id] = [];
  
  res.status(201).json({ success: true, data: newConversation });
});

// Get conversation with messages
app.get('/api/conversations/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const conversation = mockConversations.find(c => c.id === id);
  
  if (!conversation) {
    return res.status(404).json({ success: false, message: 'Conversation not found' });
  }
  
  res.json({
    success: true,
    data: {
      ...conversation,
      messages: mockMessages[id] || []
    }
  });
});

// Send message
app.post('/api/conversations/:conversationId/messages', authMiddleware, (req, res) => {
  const { conversationId } = req.params;
  const { content } = req.body;
  
  // Create user message
  const userMessage = {
    id: String(Date.now()),
    conversation_id: conversationId,
    role: 'user',
    content,
    created_at: new Date().toISOString()
  };
  
  // Create AI response
  const responses = [
    "I understand! Let me help you with that. This is a demo response from SHAAD.",
    "That's a great question! I'm processing your request using my AI capabilities.",
    "I can help with that task. In a full implementation, I would coordinate with other services to complete this action.",
    "Excellent! I'm analyzing your message and preparing a comprehensive response.",
    "I'm your SHAAD AI assistant. I can see your message and I'm ready to help you with various tasks.",
    "That's interesting! Let me process that information and provide you with a helpful response."
  ];
  
  const randomResponse = responses[Math.floor(Math.random() * responses.length)];
  
  const assistantMessage = {
    id: String(Date.now() + 1),
    conversation_id: conversationId,
    role: 'assistant',
    content: `${randomResponse}\n\n**Your message:** "${content}"\n\n**Note:** This is a demo response. In the full version, I would:\n- Process your request with Claude AI\n- Execute relevant workflows via n8n\n- Provide intelligent, contextual responses\n- Remember our conversation history`,
    ai_provider: 'demo',
    created_at: new Date(Date.now() + 100).toISOString()
  };
  
  // Add messages to mock data
  if (!mockMessages[conversationId]) {
    mockMessages[conversationId] = [];
  }
  mockMessages[conversationId].push(userMessage, assistantMessage);
  
  // Update conversation timestamp
  const conversation = mockConversations.find(c => c.id === conversationId);
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
});

// Delete conversation
app.delete('/api/conversations/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const index = mockConversations.findIndex(c => c.id === id);
  
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Conversation not found' });
  }
  
  mockConversations.splice(index, 1);
  delete mockMessages[id];
  
  res.json({ success: true, message: 'Conversation deleted successfully' });
});

// API info endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'SHAAD Mock API is running!',
    version: '1.0.0-demo',
    note: 'This is a demo server with mock data for frontend testing.',
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
        delete: 'DELETE /api/conversations/:id',
        sendMessage: 'POST /api/conversations/:id/messages'
      }
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 SHAAD Mock Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔐 Login with admin/password for demo`);
  console.log('✨ Ready for frontend testing!');
});