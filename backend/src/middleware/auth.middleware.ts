/**
 * Authentication Middleware
 * 
 * Middleware to verify JWT tokens and authenticate users
 */

import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '@/config/database';
import { AuthRequest, JwtPayload, PublicUser } from '@/types/auth';

/**
 * Middleware to authenticate JWT tokens
 * Verifies the token and adds user info to the request object
 */
export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Access token required'
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify JWT token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET not configured');
    }

    const payload = jwt.verify(token, jwtSecret) as JwtPayload;

    // Get user from database
    const userResult = await pool.query(
      `SELECT id, username, email, full_name, role, is_active, preferences, created_at, updated_at
       FROM users 
       WHERE id = $1 AND is_active = true`,
      [payload.userId]
    );

    if (userResult.rows.length === 0) {
      res.status(401).json({
        success: false,
        message: 'User not found or inactive'
      });
      return;
    }

    // Add user to request object
    req.user = userResult.rows[0] as PublicUser;
    
    next();
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError') {
      res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
      return;
    }
    
    if (error.name === 'TokenExpiredError') {
      res.status(401).json({
        success: false,
        message: 'Token expired'
      });
      return;
    }

    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

/**
 * Middleware to check if user has admin role
 * Must be used after authMiddleware
 */
export const adminMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
    return;
  }

  if (req.user.role !== 'admin') {
    res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
    return;
  }

  next();
};