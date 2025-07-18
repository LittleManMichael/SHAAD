/**
 * Dashboard Page Component
 * 
 * This is the main interface of SHAAD where users interact with the AI assistant.
 * Features:
 * - Sidebar with conversation list
 * - Main chat interface
 * - Real-time messaging
 * - User profile menu
 * - Responsive design
 */

import React, { useState, useEffect } from 'react';
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
  Select,
  FormControl,
  Chip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  MoreVert,
  AccountCircle,
  Logout,
  Settings,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useSnackbar } from '../contexts/SnackbarContext';
import { useWebSocket } from '../hooks/useWebSocket';
import ConversationList from '../components/ConversationList';
import ChatInterface from '../components/ChatInterface';

// Drawer width for desktop
const DRAWER_WIDTH = 320;

const Dashboard: React.FC = () => {
  const theme = useTheme();
  const { user, logout } = useAuth();
  const { showSnackbar } = useSnackbar();
  
  // AI service status - using HTTP API
  const [aiStatus, setAiStatus] = useState({ isOnline: true, model: 'claude' });
  
  // AI model selection
  const [selectedModel, setSelectedModel] = useState<'claude' | 'gpt'>('claude');
  
  // Responsive design: check if screen is mobile
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // State for mobile drawer
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  
  // State for user menu
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  
  // Currently selected conversation ID
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  // Check AI service status on mount
  useEffect(() => {
    const checkAiStatus = async () => {
      try {
        const response = await fetch('/api/status');
        const data = await response.json();
        setAiStatus({ 
          isOnline: data.status === 'ok', 
          model: selectedModel 
        });
      } catch (error) {
        setAiStatus({ isOnline: false, model: selectedModel });
      }
    };
    
    checkAiStatus();
    // Check status every 30 seconds
    const interval = setInterval(checkAiStatus, 30000);
    return () => clearInterval(interval);
  }, [selectedModel]);

  // Handle AI model change
  const handleModelChange = (event: any) => {
    setSelectedModel(event.target.value);
    setAiStatus(prev => ({ ...prev, model: event.target.value }));
  };

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
   * Handle conversation selection
   * Closes mobile drawer after selection
   */
  const handleConversationSelect = (conversationId: string) => {
    setSelectedConversationId(conversationId);
    
    // Close mobile drawer after selection
    if (isMobile) {
      setMobileDrawerOpen(false);
    }
  };

  /**
   * Drawer content (conversation list)
   * This content is used in both desktop persistent drawer and mobile drawer
   */
  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Drawer Header */}
      <Box
        sx={{
          p: 2,
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Typography variant="h6" noWrap>
          Conversations
        </Typography>
      </Box>

      {/* Conversation List */}
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        <ConversationList
          selectedConversationId={selectedConversationId}
          onConversationSelect={handleConversationSelect}
        />
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
        }}
      >
        <Toolbar>
          {/* Mobile menu button */}
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          {/* App title */}
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            SHAAD - AI Assistant
          </Typography>

          {/* AI Model Selector */}
          <FormControl size="small" sx={{ mr: 2, minWidth: 120 }}>
            <Select
              value={selectedModel}
              onChange={handleModelChange}
              sx={{
                color: 'white',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                },
                '& .MuiSvgIcon-root': {
                  color: 'white',
                },
              }}
            >
              <MenuItem value="claude">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'success.main' }} />
                  Claude AI
                </Box>
              </MenuItem>
              <MenuItem value="gpt">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'success.main' }} />
                  ChatGPT
                </Box>
              </MenuItem>
            </Select>
          </FormControl>

          {/* AI Status */}
          <Chip
            label={aiStatus.isOnline ? 'AI Online' : 'AI Offline'}
            color={aiStatus.isOnline ? 'success' : 'error'}
            size="small"
            sx={{ mr: 2 }}
          />

          {/* User info and menu */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' } }}>
              {user?.fullName || user?.username}
            </Typography>
            
            <IconButton
              size="large"
              edge="end"
              color="inherit"
              onClick={handleUserMenuOpen}
            >
              <Avatar sx={{ width: 32, height: 32 }}>
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
        {drawerContent}
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
        {drawerContent}
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
        
        {/* Chat Interface */}
        <ChatInterface
          conversationId={selectedConversationId}
          onConversationChange={setSelectedConversationId}
        />
      </Box>
    </Box>
  );
};

export default Dashboard;