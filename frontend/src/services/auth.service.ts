/**
 * Authentication Service
 * 
 * This service handles all authentication-related API calls.
 * It includes token management and automatic token inclusion in requests.
 */

import axios from 'axios';
import type { AxiosResponse } from 'axios';

// Get API URL from environment variables, with fallback for development
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Create axios instance with default configuration
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Axios request interceptor
 * Automatically adds JWT token to all requests if it exists
 */
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      // Add Bearer token to Authorization header
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Axios response interceptor
 * Handles common response scenarios like token expiration
 */
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // If we get a 401 (Unauthorized), the token might be expired
    if (error.response?.status === 401) {
      // Clear the invalid token
      localStorage.removeItem('token');
      // Redirect to login page
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Type definitions for API responses
interface LoginResponse {
  success: boolean;
  token: string;
  user: {
    id: string;
    username: string;
    email: string;
    role: 'admin' | 'user';
    fullName?: string;
  };
}

interface RegisterResponse {
  success: boolean;
  message: string;
  user: {
    id: string;
    username: string;
    email: string;
  };
}

interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'user';
  fullName?: string;
}

/**
 * Authentication Service Class
 * Contains all auth-related API methods
 */
class AuthService {
  /**
   * Login user with username and password
   * @param username - User's username
   * @param password - User's password
   * @returns Promise with login response
   */
  async login(username: string, password: string): Promise<LoginResponse> {
    try {
      const response: AxiosResponse<LoginResponse> = await api.post('/auth/login', {
        username,
        password,
      });
      
      return response.data;
    } catch (error: any) {
      // Extract error message from response
      const message = error.response?.data?.message || 'Login failed';
      throw new Error(message);
    }
  }

  /**
   * Register a new user
   * @param userData - Registration data
   * @returns Promise with registration response
   */
  async register(userData: {
    username: string;
    email: string;
    password: string;
    fullName?: string;
  }): Promise<RegisterResponse> {
    try {
      const response: AxiosResponse<RegisterResponse> = await api.post('/auth/register', userData);
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Registration failed';
      throw new Error(message);
    }
  }

  /**
   * Get current user information
   * Requires valid JWT token
   * @returns Promise with user data
   */
  async getCurrentUser(): Promise<User> {
    try {
      const response: AxiosResponse<{ success: boolean; user: User }> = await api.get('/auth/me');
      return response.data.user;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to get user info';
      throw new Error(message);
    }
  }

  /**
   * Logout user
   * Calls backend to invalidate session
   */
  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      // Logout errors are not critical, we'll clear local storage anyway
      console.error('Logout API call failed:', error);
    }
  }

  /**
   * Check if user is currently authenticated
   * @returns true if user has a valid token
   */
  isAuthenticated(): boolean {
    const token = localStorage.getItem('token');
    return !!token; // Convert to boolean
  }

  /**
   * Get stored JWT token
   * @returns JWT token or null
   */
  getToken(): string | null {
    return localStorage.getItem('token');
  }

  /**
   * Clear stored authentication data
   * Used for logout or when token expires
   */
  clearAuth(): void {
    localStorage.removeItem('token');
  }
}

// Export a singleton instance
export const authService = new AuthService();

// Also export the axios instance for other services to use
export { api };