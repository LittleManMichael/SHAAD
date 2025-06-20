import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { pool } from '@/config/database';
import { JwtPayload } from '@/types/auth';

// Token configuration
const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRY = '7d'; // 7 days
const REFRESH_TOKEN_LENGTH = 64; // bytes

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * Generate a secure random refresh token
 */
const generateRefreshToken = (): string => {
  return crypto.randomBytes(REFRESH_TOKEN_LENGTH).toString('base64url');
};

/**
 * Generate access and refresh token pair
 */
export const generateTokenPair = async (payload: JwtPayload): Promise<TokenPair> => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET not configured');
  }

  // Generate access token
  const accessToken = jwt.sign(payload, jwtSecret, { 
    expiresIn: ACCESS_TOKEN_EXPIRY,
    issuer: 'SHAAD',
    audience: 'shaad-api'
  });

  // Generate refresh token
  const refreshToken = generateRefreshToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

  // Store refresh token in database
  await pool.query(
    `INSERT INTO refresh_tokens (token, user_id, expires_at)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id) 
     DO UPDATE SET 
       token = EXCLUDED.token,
       expires_at = EXCLUDED.expires_at,
       created_at = CURRENT_TIMESTAMP`,
    [refreshToken, payload.userId, expiresAt]
  );

  return {
    accessToken,
    refreshToken,
    expiresIn: 900 // 15 minutes in seconds
  };
};

/**
 * Verify and refresh access token using refresh token
 */
export const refreshAccessToken = async (refreshToken: string): Promise<TokenPair | null> => {
  try {
    // Get refresh token from database
    const result = await pool.query(
      `SELECT rt.user_id, rt.expires_at, u.username, u.role
       FROM refresh_tokens rt
       JOIN users u ON rt.user_id = u.id
       WHERE rt.token = $1 AND rt.expires_at > CURRENT_TIMESTAMP`,
      [refreshToken]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const { user_id, username, role } = result.rows[0];

    // Generate new token pair
    const payload: JwtPayload = {
      userId: user_id,
      username,
      role
    };

    return await generateTokenPair(payload);
  } catch (error) {
    console.error('Refresh token error:', error);
    return null;
  }
};

/**
 * Revoke refresh token (for logout)
 */
export const revokeRefreshToken = async (userId: string): Promise<void> => {
  await pool.query(
    'DELETE FROM refresh_tokens WHERE user_id = $1',
    [userId]
  );
};

/**
 * Clean up expired refresh tokens
 */
export const cleanupExpiredTokens = async (): Promise<void> => {
  await pool.query(
    'DELETE FROM refresh_tokens WHERE expires_at < CURRENT_TIMESTAMP'
  );
};

// Run cleanup every hour
setInterval(cleanupExpiredTokens, 3600000);