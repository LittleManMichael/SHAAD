/**
 * Simple Test Server
 * A minimal Node.js server to test the basic functionality
 */

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

// Load environment variables first
require('dotenv').config({ path: '../.env' });

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());


// PostgreSQL connection  
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'shaad_db',
  user: process.env.POSTGRES_USER || 'shaad_user',
  password: process.env.POSTGRES_PASSWORD,
  max: 20,
});

// Auth middleware
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Access token required' });
    }

    const token = authHeader.substring(7);
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'GT%^YHNBgt56yhnb');
    
    const userResult = await pool.query(
      'SELECT id, username, email, full_name, role FROM users WHERE id = $1',
      [payload.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    req.user = userResult.rows[0];
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
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const result = await pool.query(
      'SELECT id, username, email, password_hash, full_name, role FROM users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    
    if (!passwordMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'GT%^YHNBgt56yhnb',
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
});

// Get current user
app.get('/api/auth/me', authMiddleware, (req, res) => {
  res.json({ success: true, user: req.user });
});

// Get conversations
app.get('/api/conversations', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, title, context, is_active, created_at, updated_at FROM conversations WHERE user_id = $1 ORDER BY updated_at DESC',
      [req.user.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ success: false, message: 'Failed to get conversations' });
  }
});

// Create conversation
app.post('/api/conversations', authMiddleware, async (req, res) => {
  try {
    const { title } = req.body;
    const result = await pool.query(
      'INSERT INTO conversations (user_id, title) VALUES ($1, $2) RETURNING id, title, context, is_active, created_at, updated_at',
      [req.user.id, title || 'New Conversation']
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({ success: false, message: 'Failed to create conversation' });
  }
});

// Send message (simplified - no AI integration yet)
app.post('/api/conversations/:conversationId/messages', authMiddleware, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { content } = req.body;
    
    // Save user message
    const userMessage = await pool.query(
      'INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3) RETURNING id, role, content, created_at',
      [conversationId, 'user', content]
    );
    
    // Simple AI response for testing
    const aiResponse = `I received your message: "${content}". This is a test response from SHAAD!`;
    
    const assistantMessage = await pool.query(
      'INSERT INTO messages (conversation_id, role, content, ai_provider) VALUES ($1, $2, $3, $4) RETURNING id, role, content, ai_provider, created_at',
      [conversationId, 'assistant', aiResponse, 'test']
    );
    
    res.json({
      success: true,
      data: {
        userMessage: userMessage.rows[0],
        assistantMessage: assistantMessage.rows[0]
      }
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ success: false, message: 'Failed to send message' });
  }
});

// Start server
const startServer = async () => {
  try {
    // Test database connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connected');
    
    app.listen(PORT, () => {
      console.log(`🚀 SHAAD Test Server running on http://localhost:${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log('🔐 Ready for frontend testing!');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();