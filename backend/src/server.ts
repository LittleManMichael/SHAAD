// src/server.ts
// IMPORTANT: Load environment variables BEFORE any other imports
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from the project root
// Look for .env file in current directory, then parent directories
const envPath = process.env.NODE_ENV === 'production' 
  ? '.env.production' 
  : '.env';

const envResult = dotenv.config({ 
  path: path.resolve(process.cwd(), envPath) 
});

if (envResult.error && process.env.NODE_ENV !== 'production') {
  console.warn('⚠️  Could not load .env file, falling back to environment variables');
}

// Only log in development mode
if (process.env.NODE_ENV !== 'production') {
  console.log('🔍 Environment loading result:', envResult.error ? 'Using system env vars' : 'Loaded from .env file');
  console.log('🔍 Critical services configured:', {
    postgres: !!process.env.POSTGRES_PASSWORD,
    redis: !!process.env.REDIS_URL,
    anthropic: !!process.env.ANTHROPIC_API_KEY,
    openai: !!process.env.OPENAI_API_KEY
  });
}

// Now import everything else
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { connectDatabases, closeDatabases } from './config/database';
import routes from './routes';

const app = express();
const PORT = parseInt(process.env.API_PORT || '3001', 10);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS configuration with stricter settings
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS
      ? process.env.CORS_ALLOWED_ORIGINS.split(',').map(o => o.trim())
      : ['https://myshaad.com'];
    
    // Allow requests with no origin (e.g., mobile apps, Postman) in development
    if (!origin && process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  maxAge: 86400 // 24 hours
};

app.use(cors(corsOptions));

// Logging middleware
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: process.env.UPLOAD_MAX_SIZE || '100mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'SHAAD Backend API',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Database status endpoint
app.get('/api/status', async (req, res) => {
  try {
    res.json({
      status: 'ok',
      services: {
        api: 'running',
        database: 'connected',
        redis: 'connected',
        qdrant: 'connected'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Service check failed'
    });
  }
});

// API routes
app.use('/api', routes);

// API info endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'SHAAD API is running with database connections!',
    endpoints: {
      health: '/health',
      status: '/api/status',
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        profile: 'GET /api/auth/me',
        logout: 'POST /api/auth/logout'
      },
      conversations: {
        list: 'GET /api/conversations',
        create: 'POST /api/conversations',
        get: 'GET /api/conversations/:id',
        update: 'PUT /api/conversations/:id',
        delete: 'DELETE /api/conversations/:id',
        sendMessage: 'POST /api/conversations/:id/messages',
        getMessages: 'GET /api/conversations/:id/messages'
      }
    },
    version: '1.0.0'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`
  });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Initialize databases and start server
const startServer = async () => {
  let databasesConnected = false;
  
  try {
    // Try to connect to all databases
    await connectDatabases();
    databasesConnected = true;

    console.log('✅ Database connections successful');

  } catch (error) {
    console.warn('⚠️  Database connection failed, starting server without databases');
    console.warn('📝 Note: Database-dependent features will not work');
    if (process.env.NODE_ENV === 'development') {
      console.warn('🔧 Database error:', error instanceof Error ? error.message : error);
    }
    databasesConnected = false;
  }

  // Start HTTP server regardless of database connection
  const server = app.listen(PORT, () => {
    const host = process.env.API_HOST || 'localhost';
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    
    if (databasesConnected) {
      console.log('🚀 SHAAD Backend API started with database connections');
    } else {
      console.log('🚀 SHAAD Backend API started (databases unavailable)');
    }
    
    console.log(`📊 Server running on port ${PORT}`);  
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔒 CORS origin: ${process.env.CORS_ORIGIN || 'https://myshaad.com'}`);
    
    // Only show detailed URLs in development
    if (process.env.NODE_ENV !== 'production') {
      console.log(`📊 Health check: ${protocol}://${host}:${PORT}/health`);
      console.log(`🔌 API status: ${protocol}://${host}:${PORT}/api/status`);
      console.log(`🔐 Auth endpoints: ${protocol}://${host}:${PORT}/api/auth/*`);
    }
  });

  // Graceful shutdown handlers
  const shutdown = async () => {
    console.log('\n🛑 Shutting down gracefully...');
    server.close(async () => {
      if (databasesConnected) {
        await closeDatabases();
      }
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
};

startServer();

export default app;
