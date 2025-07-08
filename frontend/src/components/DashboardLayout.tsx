/**
 * Dashboard Layout Component
 * 
 * Provides the common layout structure for all dashboard pages
 * Features:
 * - Navigation sidebar
 * - App bar with user menu and AI status
 * - Responsive design
 */

import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  useTheme,
  useMediaQuery,
  Divider,
  Chip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  AccountCircle,
  Logout,
  Settings,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useSnackbar } from '../contexts/SnackbarContext';
import Navigation from './Navigation';

// Drawer width for desktop
const DRAWER_WIDTH = 280;

const DashboardLayout: React.FC = () => {
  const theme = useTheme();
  const { user, logout } = useAuth();
  const { showSnackbar } = useSnackbar();
  
  // AI service status - using HTTP API
  const [aiStatus, setAiStatus] = useState({ isOnline: true });
  
  // Responsive design: check if screen is mobile
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // State for mobile drawer
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  
  // State for user menu
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);

  // Check AI service status on mount
  useEffect(() => {
    const checkAiStatus = async () => {
      try {
        const response = await fetch('/api/status');
        const data = await response.json();
        setAiStatus({ 
          isOnline: data.status === 'ok'
        });
      } catch (error) {
        setAiStatus({ isOnline: false });
      }
    };
    
    checkAiStatus();
    // Check status every 30 seconds
    const interval = setInterval(checkAiStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  /**
   * Handle mobile drawer toggle
   */
  const handleDrawerToggle = () => {
    setMobileDrawerOpen(prev => !prev);
  };

  /**
   * Handle user menu open
   */
  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchor(event.currentTarget);
  };

  /**
   * Handle user menu close
   */
  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  /**
   * Handle logout
   */
  const handleLogout = async () => {
    try {
      await logout();
      showSnackbar('Logged out successfully', 'success');
    } catch (error) {
      showSnackbar('Logout failed', 'error');
    }
    handleUserMenuClose();
  };

  /**
   * Close mobile drawer when navigation item is clicked
   */
  const handleMobileNavClick = () => {
    if (isMobile) {
      setMobileDrawerOpen(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
          background: 'linear-gradient(135deg, rgba(13, 27, 42, 0.95), rgba(23, 48, 71, 0.95))',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 56, sm: 64 } }}>
          {/* Mobile menu button */}
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ 
              mr: 2, 
              display: { md: 'none' },
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              }
            }}
          >
            <MenuIcon />
          </IconButton>

          {/* App title - more elegant */}
          <Typography 
            variant="h6" 
            noWrap 
            component="div" 
            sx={{ 
              flexGrow: 1,
              fontWeight: 600,
              background: 'linear-gradient(45deg, #90caf9, #f48fb1)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            SHAAD Dashboard
          </Typography>

          {/* AI Status - sleeker design */}
          <Chip
            label={aiStatus.isOnline ? 'System Online' : 'System Offline'}
            color={aiStatus.isOnline ? 'success' : 'error'}
            size="small"
            sx={{ 
              mr: 2,
              '& .MuiChip-label': {
                fontWeight: 500,
              }
            }}
          />

          {/* User info and menu - enhanced */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography 
              variant="body2" 
              sx={{ 
                display: { xs: 'none', sm: 'block' },
                fontWeight: 500,
                color: 'rgba(255, 255, 255, 0.9)'
              }}
            >
              {user?.fullName || user?.username}
            </Typography>
            
            <IconButton
              size="large"
              edge="end"
              color="inherit"
              onClick={handleUserMenuOpen}
              sx={{
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                }
              }}
            >
              <Avatar 
                sx={{ 
                  width: 36, 
                  height: 36,
                  background: 'linear-gradient(45deg, #90caf9, #f48fb1)',
                  fontWeight: 600,
                }}
              >
                {user?.username.charAt(0).toUpperCase()}
              </Avatar>
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {/* User Menu */}
      <Menu
        anchorEl={userMenuAnchor}
        open={Boolean(userMenuAnchor)}
        onClose={handleUserMenuClose}
        onClick={handleUserMenuClose}
      >
        <MenuItem onClick={handleUserMenuClose}>
          <AccountCircle sx={{ mr: 1 }} />
          Profile
        </MenuItem>
        <MenuItem onClick={handleUserMenuClose}>
          <Settings sx={{ mr: 1 }} />
          Settings
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout}>
          <Logout sx={{ mr: 1 }} />
          Logout
        </MenuItem>
      </Menu>

      {/* Navigation Drawer - Desktop */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
          },
        }}
        open
      >
        <Navigation onItemClick={handleMobileNavClick} />
      </Drawer>

      {/* Navigation Drawer - Mobile */}
      <Drawer
        variant="temporary"
        open={mobileDrawerOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile
        }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
          },
        }}
      >
        <Navigation onItemClick={handleMobileNavClick} />
      </Drawer>

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          height: '100vh',
          overflow: 'hidden',
        }}
      >
        {/* Toolbar spacer */}
        <Toolbar />
        
        {/* Page Content */}
        <Box sx={{ height: 'calc(100vh - 64px)', overflow: 'auto', p: 2 }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default DashboardLayout;