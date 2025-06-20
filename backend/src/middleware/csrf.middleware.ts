import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

// Store CSRF tokens in memory (use Redis in production)
const csrfTokenStore = new Map<string, { token: string; expires: number }>();

// CSRF token configuration
const CSRF_TOKEN_EXPIRY = 3600000; // 1 hour
const CSRF_SECRET = process.env.CSRF_SECRET || crypto.randomBytes(32).toString('hex');

export interface CsrfRequest extends Request {
  csrfToken: () => string;
}

/**
 * Generate a new CSRF token for a session
 */
export const generateCsrfToken = (sessionId: string): string => {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = Date.now() + CSRF_TOKEN_EXPIRY;
  
  csrfTokenStore.set(sessionId, { token, expires });
  
  // Clean up expired tokens
  cleanupExpiredTokens();
  
  return token;
};

/**
 * Verify CSRF token
 */
const verifyCsrfToken = (sessionId: string, token: string): boolean => {
  const stored = csrfTokenStore.get(sessionId);
  
  if (!stored) return false;
  if (Date.now() > stored.expires) {
    csrfTokenStore.delete(sessionId);
    return false;
  }
  
  return crypto.timingSafeEqual(
    Buffer.from(stored.token),
    Buffer.from(token)
  );
};

/**
 * Clean up expired tokens periodically
 */
const cleanupExpiredTokens = () => {
  const now = Date.now();
  for (const [sessionId, data] of csrfTokenStore.entries()) {
    if (now > data.expires) {
      csrfTokenStore.delete(sessionId);
    }
  }
};

/**
 * CSRF protection middleware
 */
export const csrfProtection = (req: CsrfRequest, res: Response, next: NextFunction) => {
  // Skip CSRF for certain paths
  const skipPaths = ['/api/auth/login', '/api/auth/register', '/health', '/api/status'];
  if (skipPaths.includes(req.path)) {
    return next();
  }
  
  // Skip CSRF for GET requests (they should be idempotent)
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }
  
  // Get session ID from JWT token
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  try {
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
    const sessionId = decoded.userId;
    
    // Get CSRF token from header or body
    const csrfToken = req.headers['x-csrf-token'] as string || req.body._csrf;
    
    if (!csrfToken) {
      return res.status(403).json({ error: 'CSRF token missing' });
    }
    
    if (!verifyCsrfToken(sessionId, csrfToken)) {
      return res.status(403).json({ error: 'Invalid CSRF token' });
    }
    
    next();
  } catch (error) {
    return res.status(403).json({ error: 'CSRF verification failed' });
  }
};

/**
 * Middleware to add CSRF token generation function to request
 */
export const csrfTokenGenerator = (req: CsrfRequest, res: Response, next: NextFunction) => {
  req.csrfToken = () => {
    // Get session ID from JWT token if available
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return '';
    }
    
    try {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
      return generateCsrfToken(decoded.userId);
    } catch {
      return '';
    }
  };
  
  next();
};

// Clean up expired tokens every 5 minutes
setInterval(cleanupExpiredTokens, 300000);