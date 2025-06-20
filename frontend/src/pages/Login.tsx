/**
 * Login Page Component
 * 
 * This page handles user authentication with a clean, modern UI.
 * Features:
 * - Username/password login form
 * - Form validation
 * - Loading states
 * - Error handling
 * - Responsive design
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  PersonOutline,
  LockOutlined,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useSnackbar } from '../contexts/SnackbarContext';

const Login: React.FC = () => {
  // Navigation hook for redirecting after login
  const navigate = useNavigate();
  
  // Auth context for login functionality
  const { login, user } = useAuth();
  
  // Snackbar for showing notifications
  const { showSnackbar } = useSnackbar();

  // Form state
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  /**
   * Handle form input changes
   * Updates the corresponding field in formData state
   */
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    
    // Clear error when user starts typing
    if (error) {
      setError('');
    }
  };

  /**
   * Handle form submission
   * Validates input and calls login function
   */
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault(); // Prevent default form submission
    
    // Basic validation
    if (!formData.username.trim() || !formData.password.trim()) {
      setError('Please enter both username and password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Attempt to login
      await login(formData.username.trim(), formData.password);
      
      // Show success message
      showSnackbar('Login successful! Welcome to SHAAD.', 'success');
      
      // Navigation will happen automatically via useEffect when user state updates
    } catch (err: any) {
      // Show error message
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Toggle password visibility
   */
  const handleTogglePasswordVisibility = () => {
    setShowPassword(prev => !prev);
  };

  return (
    <Container maxWidth="sm">
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        py={4}
      >
        {/* Login Card */}
        <Paper
          elevation={8}
          sx={{
            p: 4,
            width: '100%',
            maxWidth: 400,
            borderRadius: 3,
          }}
        >
          {/* Header */}
          <Box textAlign="center" mb={4}>
            <Typography variant="h3" component="h1" gutterBottom>
              SHAAD
            </Typography>
            <Typography variant="h6" color="textSecondary">
              AI Assistant Dashboard
            </Typography>
            <Typography variant="body2" color="textSecondary" mt={1}>
              Sign in to access your intelligent assistant
            </Typography>
          </Box>

          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Login Form */}
          <Box component="form" onSubmit={handleSubmit}>
            {/* Username Field */}
            <TextField
              fullWidth
              name="username"
              label="Username"
              value={formData.username}
              onChange={handleInputChange}
              margin="normal"
              variant="outlined"
              autoComplete="username"
              autoFocus
              disabled={loading}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonOutline color="action" />
                  </InputAdornment>
                ),
              }}
            />

            {/* Password Field */}
            <TextField
              fullWidth
              name="password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={handleInputChange}
              margin="normal"
              variant="outlined"
              autoComplete="current-password"
              disabled={loading}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockOutlined color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={handleTogglePasswordVisibility}
                      edge="end"
                      disabled={loading}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            {/* Login Button */}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
              sx={{ mt: 3, mb: 2, py: 1.5 }}
            >
              {loading ? (
                <>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  Signing In...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </Box>

          {/* Default Credentials Info */}
          <Box mt={3} p={2} bgcolor="background.default" borderRadius={2}>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              <strong>Default Admin Credentials:</strong>
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Username: <code>admin</code>
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Password: <code>password</code>
            </Typography>
            <Typography variant="caption" color="warning.main" display="block" mt={1}>
              ⚠️ Please change these credentials after first login
            </Typography>
          </Box>
        </Paper>

        {/* Footer */}
        <Typography variant="body2" color="textSecondary" mt={4} textAlign="center">
          SHAAD - Self-Hosted AI Assistant Dashboard
        </Typography>
      </Box>
    </Container>
  );
};

export default Login;