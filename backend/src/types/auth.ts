/**
 * Authentication Types
 * 
 * Type definitions for authentication-related interfaces
 */

import { Request } from 'express';

// User interface - matches database schema
export interface User {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  full_name?: string;
  role: 'admin' | 'user';
  is_active: boolean;
  preferences: any;
  created_at: string;
  updated_at: string;
}

// Public user info (without sensitive data)
export interface PublicUser {
  id: string;
  username: string;
  email: string;
  full_name?: string;
  role: 'admin' | 'user';
  is_active: boolean;
  preferences: any;
  created_at: string;
  updated_at: string;
}

// Extended Express Request with user information
export interface AuthRequest extends Request {
  user?: PublicUser;
}

// JWT Payload
export interface JwtPayload {
  userId: string;
  username: string;
  role: 'admin' | 'user';
  iat?: number;
  exp?: number;
}

// Login request body
export interface LoginRequest {
  username: string;
  password: string;
}

// Register request body
export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  fullName?: string;
}

// Auth response
export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: PublicUser;
  message?: string;
}