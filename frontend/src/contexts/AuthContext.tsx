/**
 * Authentication Context
 * 
 * This context manages the global authentication state for the entire app.
 * It provides:
 * - Current user information
 * - Login/logout functions
 * - Token management
 * - Automatic token refresh
 * 
 * Any component can access auth state using: const { user, login, logout } = useAuth();
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { authService } from '../services/auth.service';

// Define the shape of our User object
interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'user';
  fullName?: string;
}

// Define what the Auth Context will provide
interface AuthContextType {
  user: User | null;                    // Current logged-in user or null
  loading: boolean;                     // True while checking auth status
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;    // Update user info without re-login
}

// Create the context with undefined default value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Props for the AuthProvider component
interface AuthProviderProps {
  children: ReactNode;
}

/**
 * AuthProvider Component
 * Wraps the app and provides authentication state to all children
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // State to store the current user
  const [user, setUser] = useState<User | null>(null);
  
  // Loading state while checking if user is logged in
  const [loading, setLoading] = useState(true);

  /**
   * Check if user is already logged in on app load
   * This runs once when the app starts
   */
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if we have a stored token
        const token = localStorage.getItem('token');
        if (token) {
          // Verify token with backend and get user info
          const userData = await authService.getCurrentUser();
          setUser(userData);
        }
      } catch (error) {
        // Token is invalid or expired
        console.error('Auth check failed:', error);
        localStorage.removeItem('token');
      } finally {
        // Always stop loading, whether successful or not
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  /**
   * Login function
   * @param username - User's username
   * @param password - User's password
   * @throws Error if login fails
   */
  const login = async (username: string, password: string) => {
    try {
      // Call the auth service to login
      const response = await authService.login(username, password);
      
      // Store the JWT token
      localStorage.setItem('token', response.accessToken);
      
      // Update user state
      setUser(response.user);
    } catch (error) {
      // Re-throw error to be handled by the login form
      throw error;
    }
  };

  /**
   * Logout function
   * Clears user data and redirects to login
   */
  const logout = async () => {
    try {
      // Call backend to invalidate session
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always clear local data
      localStorage.removeItem('token');
      setUser(null);
    }
  };

  /**
   * Update user information
   * Used when user updates their profile
   */
  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  // Context value that will be provided to children
  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Custom hook to use the Auth Context
 * This ensures the context is used within the AuthProvider
 * 
 * Usage: const { user, login, logout } = useAuth();
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  // Throw error if used outside of AuthProvider
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};