/**
 * Main App Component
 * This is the root component that sets up routing, theme, and global state
 */
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './contexts/AuthContext';
import { SnackbarProvider } from './contexts/SnackbarContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PrivateRoute from './components/PrivateRoute';

// Create a dark theme for the AI assistant dashboard
// This gives it a modern, tech-focused appearance
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#90caf9', // Light blue for primary actions
    },
    secondary: {
      main: '#f48fb1', // Pink for secondary actions
    },
    background: {
      default: '#0a1929', // Very dark blue background
      paper: '#173047',   // Slightly lighter for cards/papers
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 12, // Rounded corners for modern look
  },
});

function App() {
  return (
    // ThemeProvider applies our custom theme to all child components
    <ThemeProvider theme={darkTheme}>
      {/* CssBaseline provides consistent CSS defaults across browsers */}
      <CssBaseline />
      
      {/* SnackbarProvider allows any component to show notifications */}
      <SnackbarProvider>
        {/* AuthProvider manages authentication state globally */}
        <AuthProvider>
          {/* Router enables client-side navigation */}
          <Router>
            <Routes>
              {/* Public route: Login page */}
              <Route path="/login" element={<Login />} />
              
              {/* Protected route: Dashboard (requires authentication) */}
              <Route
                path="/dashboard"
                element={
                  <PrivateRoute>
                    <Dashboard />
                  </PrivateRoute>
                }
              />
              
              {/* Redirect root to dashboard */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              
              {/* Catch all route - redirect to dashboard */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Router>
        </AuthProvider>
      </SnackbarProvider>
    </ThemeProvider>
  );
}

export default App;