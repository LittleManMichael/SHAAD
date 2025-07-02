// src/config/database.ts
import { Pool } from 'pg';
import { createClient } from 'redis';
import { QdrantClient } from '@qdrant/js-client-rest';

// Debug environment variables
console.log('🔍 Environment Debug:');
console.log('POSTGRES_HOST:', process.env.POSTGRES_HOST);
console.log('POSTGRES_DB:', process.env.POSTGRES_DB);
console.log('POSTGRES_USER:', process.env.POSTGRES_USER);
console.log('POSTGRES_PASSWORD:', process.env.POSTGRES_PASSWORD ? 'SET' : 'NOT SET');
console.log('REDIS_PASSWORD:', process.env.REDIS_PASSWORD ? 'SET' : 'NOT SET');


// PostgreSQL configuration - use localhost for development
const pgPool = new Pool({
  host: 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  database: process.env.POSTGRES_DB || 'shaad_db',
  user: process.env.POSTGRES_USER || 'shaad_user',
  password: process.env.POSTGRES_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Redis configuration - use localhost for development  
const redisClient = createClient({
  socket: {
    host: 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
  password: process.env.REDIS_PASSWORD || undefined,
});

// Qdrant configuration (for later use)
const qdrantClient = new QdrantClient({
  url: `http://${process.env.QDRANT_HOST || 'localhost'}:${process.env.QDRANT_PORT || '6333'}`,
  checkCompatibility: false, // Disable version compatibility check
});

// Database connection functions
export const connectDatabases = async () => {
  try {
    // Test PostgreSQL connection
    console.log('🔌 Connecting to PostgreSQL...');
    const pgClient = await pgPool.connect();
    const pgResult = await pgClient.query('SELECT NOW()');
    pgClient.release();
    console.log('✅ PostgreSQL connected at:', pgResult.rows[0].now);

    // Connect to Redis
    console.log('🔌 Connecting to Redis...');
    await redisClient.connect();
    await redisClient.ping();
    console.log('✅ Redis connected');

    // Skip Qdrant for now
    console.log('🔌 Qdrant: Skipped for now (will add back later)');
    console.log('✅ Core databases connected successfully');

    return { pgPool, redisClient, qdrantClient };
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error; // Let the caller handle the error
  }
};

// Graceful shutdown
export const closeDatabases = async () => {
  try {
    // Only close if connections are open
    if (!pgPool.ended) {
      await pgPool.end();
    }
    if (redisClient.isReady) {
      await redisClient.quit();
    }
    console.log('🔌 Database connections closed');
  } catch (error) {
    console.error('Error closing databases:', error);
  }
};

// Export with expected names
export const pool = pgPool;
export { redisClient, qdrantClient };
