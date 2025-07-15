/**
 * Main App Component
 * This is the root component that sets up routing, theme, and global state
 */
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './contexts/AuthContext';
import { SnackbarProvider } from './contexts/SnackbarContext';
import Login from './pages/Login';
import Register from './pages/Register';
import DashboardLayout from './components/DashboardLayout';
import MainDashboard from './pages/MainDashboard';
import ChatPage from './pages/ChatPage';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import N8nDashboard from './pages/N8nDashboard';
import DiscordDashboard from './pages/DiscordDashboard';
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
              
              {/* Public route: Register page */}
              <Route path="/register" element={<Register />} />
              
              {/* Protected routes with dashboard layout */}
              <Route
                path="/"
                element={
                  <PrivateRoute>
                    <DashboardLayout />
                  </PrivateRoute>
                }
              >
                {/* Dashboard routes */}
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<MainDashboard />} />
                <Route path="chat" element={<ChatPage />} />
                <Route path="profile" element={<Profile />} />
                <Route path="settings" element={<Settings />} />
                <Route path="n8n" element={<N8nDashboard />} />
                <Route path="discord" element={<DiscordDashboard />} />
              </Route>
              
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