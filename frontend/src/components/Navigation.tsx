/**
 * Navigation Component
 * 
 * Provides the main navigation sidebar with different sections of the dashboard
 */

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Box,
  Typography,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Chat as ChatIcon,
  AccountCircle,
  Settings,
  SmartToy as BotIcon,
  AccountTree as WorkflowIcon,
} from '@mui/icons-material';

interface NavigationProps {
  onItemClick?: () => void; // For closing mobile drawer
}

const Navigation: React.FC<NavigationProps> = ({ onItemClick }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigation = (path: string) => {
    navigate(path);
    onItemClick?.();
  };

  const navigationItems = [
    {
      section: 'Main',
      items: [
        { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
        { text: 'Chat', icon: <ChatIcon />, path: '/chat' },
      ]
    },
    {
      section: 'User',
      items: [
        { text: 'Profile', icon: <AccountCircle />, path: '/profile' },
        { text: 'Settings', icon: <Settings />, path: '/settings' },
      ]
    },
    {
      section: 'Integrations',
      items: [
        { text: 'n8n Workflows', icon: <WorkflowIcon />, path: '/n8n' },
        { text: 'Discord Bot', icon: <BotIcon />, path: '/discord' },
      ]
    }
  ];

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header - sleeker design */}
      <Box
        sx={{
          p: 3,
          background: 'linear-gradient(135deg, rgba(13, 27, 42, 0.3), rgba(23, 48, 71, 0.3))',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(45deg, rgba(144, 202, 249, 0.05), rgba(244, 143, 177, 0.05))',
            zIndex: 0,
          }
        }}
      >
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Typography 
            variant="h5" 
            noWrap
            sx={{
              fontWeight: 700,
              background: 'linear-gradient(45deg, #90caf9, #f48fb1)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 0.5,
            }}
          >
            SHAAD
          </Typography>
          <Typography 
            variant="caption" 
            color="text.secondary"
            sx={{
              fontWeight: 500,
              opacity: 0.8,
            }}
          >
            AI Assistant Platform
          </Typography>
        </Box>
      </Box>

      {/* Navigation Items - enhanced styling */}
      <Box sx={{ flex: 1, overflow: 'auto', py: 2 }}>
        {navigationItems.map((section, sectionIndex) => (
          <Box key={section.section}>
            {sectionIndex > 0 && <Divider sx={{ my: 2, opacity: 0.3 }} />}
            
            <Typography
              variant="overline"
              sx={{
                px: 3,
                py: 1,
                display: 'block',
                color: 'text.secondary',
                fontSize: '0.75rem',
                fontWeight: 700,
                letterSpacing: '0.1em',
                opacity: 0.8,
              }}
            >
              {section.section}
            </Typography>
            
            <List dense sx={{ px: 1 }}>
              {section.items.map((item) => (
                <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
                  <ListItemButton
                    selected={location.pathname === item.path}
                    onClick={() => handleNavigation(item.path)}
                    sx={{
                      mx: 1,
                      borderRadius: 2,
                      minHeight: 44,
                      transition: 'all 0.2s ease-in-out',
                      position: 'relative',
                      overflow: 'hidden',
                      '&:hover': {
                        backgroundColor: 'rgba(144, 202, 249, 0.08)',
                        transform: 'translateX(2px)',
                      },
                      '&.Mui-selected': {
                        background: 'linear-gradient(135deg, rgba(144, 202, 249, 0.15), rgba(244, 143, 177, 0.15))',
                        color: 'primary.light',
                        '&:hover': {
                          background: 'linear-gradient(135deg, rgba(144, 202, 249, 0.2), rgba(244, 143, 177, 0.2))',
                          transform: 'translateX(2px)',
                        },
                        '& .MuiListItemIcon-root': {
                          color: 'primary.light',
                        },
                        '&::before': {
                          content: '""',
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: 3,
                          background: 'linear-gradient(45deg, #90caf9, #f48fb1)',
                          borderRadius: '0 2px 2px 0',
                        }
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText 
                      primary={item.text}
                      primaryTypographyProps={{
                        fontSize: '0.875rem',
                        fontWeight: location.pathname === item.path ? 600 : 500,
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default Navigation;