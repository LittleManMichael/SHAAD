/**
 * Chat Page Component
 * 
 * Dedicated chat interface with conversation management
 */

import React, { useState } from 'react';
import {
  Box,
  Drawer,
  useTheme,
  useMediaQuery,
  IconButton,
  Fab,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Chat as ChatIcon,
} from '@mui/icons-material';
import ConversationList from '../components/ConversationList';
import ChatInterface from '../components/ChatInterface';

// Drawer width for conversation list
const DRAWER_WIDTH = 320;

const ChatPage: React.FC = () => {
  const theme = useTheme();
  
  // Responsive design: check if screen is mobile
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // State for mobile drawer
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  
  // Currently selected conversation ID
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);


  /**
   * Handle mobile drawer toggle
   */
  const handleDrawerToggle = () => {
    setMobileDrawerOpen(prev => !prev);
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
    <Box sx={{ display: 'flex', height: '100%', position: 'relative' }}>
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
            position: 'relative',
            height: '100%',
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

      {/* Main Chat Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          height: '100%',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Chat Interface */}
        <ChatInterface
          conversationId={selectedConversationId}
          onConversationChange={setSelectedConversationId}
        />
      </Box>

      {/* Mobile FAB for opening conversations */}
      {isMobile && (
        <Fab
          color="primary"
          aria-label="open conversations"
          onClick={handleDrawerToggle}
          sx={{
            position: 'absolute',
            bottom: 16,
            left: 16,
            zIndex: theme.zIndex.speedDial,
          }}
        >
          <ChatIcon />
        </Fab>
      )}
    </Box>
  );
};

export default ChatPage;