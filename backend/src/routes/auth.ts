/**
 * Authentication Routes
 * 
 * Handles user registration, login, logout, and profile management
 */

import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { pool } from '@/config/database';
import { authMiddleware } from '@/middleware/auth.middleware';
import { AuthRequest, RegisterRequest, LoginRequest, JwtPayload } from '@/types/auth';
import { generateCsrfToken } from '@/middleware/csrf.middleware';
import { validate, authValidation } from '@/middleware/validation.middleware';
import { generateTokenPair, refreshAccessToken, revokeRefreshToken } from '@/services/token.service';
import { verifyLogin, checkPasswordStrength } from '@/services/auth.service';

const router = Router();

// Register new user
router.post('/register', 
  validate(authValidation.register), 
  async (req: Request, res: Response): Promise<void> => {
  try {

    const { username, email, password, fullName }: RegisterRequest = req.body;

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existingUser.rows.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Username or email already exists'
      });
      return;
    }

    // Hash password
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, full_name)
       VALUES ($1, $2, $3, $4)
       RETURNING id, username, email, full_name, role, is_active, created_at`,
      [username, email, passwordHash, fullName]
    );

    const user = result.rows[0];

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        isActive: user.is_active,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed'
    });
  }
});

// Login user
router.post('/login', 
  validate(authValidation.login), 
  async (req: Request, res: Response): Promise<void> => {
  try {

    const { username, password }: LoginRequest = req.body;

    // Verify login with account lockout protection
    const loginResult = await verifyLogin(username, password);

    if (!loginResult.success) {
      if (loginResult.locked) {
        res.status(423).json({
          success: false,
          message: `Account is locked until ${loginResult.lockedUntil?.toISOString()}`,
          locked: true,
          lockedUntil: loginResult.lockedUntil
        });
        return;
      }

      const message = loginResult.remainingAttempts !== undefined
        ? `Invalid credentials. ${loginResult.remainingAttempts} attempts remaining.`
        : 'Invalid credentials';

      res.status(401).json({
        success: false,
        message,
        remainingAttempts: loginResult.remainingAttempts
      });
      return;
    }

    const user = loginResult.user;

    // Generate token pair
    const payload: JwtPayload = {
      userId: user.id,
      username: user.username,
      role: user.role
    };

    const tokens = await generateTokenPair(payload);
    
    // Generate CSRF token for this session
    const csrfToken = generateCsrfToken(user.id);

    res.json({
      success: true,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      csrfToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        isActive: user.is_active
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
});

// Get current user profile
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    res.json({
      success: true,
      user: req.user
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user profile'
    });
  }
});

// Refresh access token
router.post('/refresh', 
  body('refreshToken').notEmpty().withMessage('Refresh token is required'),
  async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;
    
    const tokens = await refreshAccessToken(refreshToken);
    
    if (!tokens) {
      res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token'
      });
      return;
    }
    
    res.json({
      success: true,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      message: 'Token refresh failed'
    });
  }
});

// Logout user (revoke refresh token)
router.post('/logout', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Revoke refresh token
    if (req.user?.id) {
      await revokeRefreshToken(req.user.id);
    }
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
});

// Check password strength
router.post('/password-strength',
  body('password').notEmpty().withMessage('Password is required'),
  async (req: Request, res: Response): Promise<void> => {
  try {
    const { password } = req.body;
    
    const strength = checkPasswordStrength(password);
    
    res.json({
      success: true,
      valid: strength.valid,
      score: strength.score,
      errors: strength.errors
    });
  } catch (error) {
    console.error('Password strength check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check password strength'
    });
  }
});

export default router;