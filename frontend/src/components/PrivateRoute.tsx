/**
 * Private Route Component
 * 
 * This component protects routes that require authentication.
 * If the user is not logged in, they're redirected to the login page.
 * If the user is logged in, the wrapped component is rendered.
 * 
 * Usage: <PrivateRoute><Dashboard /></PrivateRoute>
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Box, CircularProgress, Typography } from '@mui/material';

interface PrivateRouteProps {
  children: React.ReactNode;
}

/**
 * PrivateRoute Component
 * Renders children only if user is authenticated
 */
const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        gap={2}
      >
        {/* Circular loading indicator */}
        <CircularProgress size={60} />
        <Typography variant="h6" color="textSecondary">
          Loading SHAAD...
        </Typography>
      </Box>
    );
  }

  // If user is not authenticated, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // User is authenticated, render the protected component
  return <>{children}</>;
};

export default PrivateRoute;