/**
 * Main Dashboard Component
 * 
 * Overview dashboard with key metrics and quick access to features
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Paper,
  LinearProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
  IconButton,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  TrendingUp,
  Chat,
  SmartToy,
  AccountTree as Workflow,
  Security,
  Notifications,
  Launch,
  Refresh,
  MoreVert,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface DashboardMetric {
  title: string;
  value: string | number;
  change?: string;
  icon: React.ReactNode;
  color: string;
}

interface RecentActivity {
  id: string;
  type: 'chat' | 'workflow' | 'discord' | 'system';
  message: string;
  timestamp: string;
  status: 'success' | 'error' | 'info';
}

const MainDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [metrics, setMetrics] = useState<DashboardMetric[]>([
    {
      title: 'Active Conversations',
      value: 8,
      change: '+2',
      icon: <Chat />,
      color: '#1976d2'
    },
    {
      title: 'AI Responses Today',
      value: 156,
      change: '+23%',
      icon: <SmartToy />,
      color: '#2e7d32'
    },
    {
      title: 'Workflows Running',
      value: 5,
      change: '0',
      icon: <Workflow />,
      color: '#ed6c02'
    },
    {
      title: 'Discord Commands',
      value: 42,
      change: '+15',
      icon: <Security />,
      color: '#9c27b0'
    }
  ]);

  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([
    {
      id: '1',
      type: 'chat',
      message: 'New conversation started with Claude AI',
      timestamp: '2 minutes ago',
      status: 'success'
    },
    {
      id: '2',
      type: 'workflow',
      message: 'SHAAD Webhook Handler executed successfully',
      timestamp: '5 minutes ago',
      status: 'success'
    },
    {
      id: '3',
      type: 'discord',
      message: 'Discord bot responded to /status command',
      timestamp: '8 minutes ago',
      status: 'success'
    },
    {
      id: '4',
      type: 'system',
      message: 'Daily backup workflow completed',
      timestamp: '15 minutes ago',
      status: 'info'
    },
    {
      id: '5',
      type: 'workflow',
      message: 'Data sync workflow failed - connection timeout',
      timestamp: '23 minutes ago',
      status: 'error'
    }
  ]);

  const [systemHealth, setSystemHealth] = useState({
    api: 98,
    database: 95,
    ai: 99,
    workflows: 87
  });

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'chat': return <Chat />;
      case 'workflow': return <Workflow />;
      case 'discord': return <SmartToy />;
      default: return <Notifications />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'success';
      case 'error': return 'error';
      default: return 'info';
    }
  };

  const refreshData = () => {
    // TODO: Implement API calls to refresh dashboard data
    console.log('Refreshing dashboard data...');
  };

  return (
    <Box>
      {/* Welcome Section - Enhanced */}
      <Box 
        sx={{ 
          mb: 4, 
          p: 3,
          borderRadius: 3,
          background: 'linear-gradient(135deg, rgba(13, 27, 42, 0.4), rgba(23, 48, 71, 0.4))',
          border: '1px solid rgba(255, 255, 255, 0.1)',
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
            variant="h4" 
            sx={{ 
              fontWeight: 700, 
              mb: 1,
              background: 'linear-gradient(45deg, #90caf9, #f48fb1)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Welcome back, {user?.fullName || user?.username}! 👋
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ opacity: 0.8 }}>
            Here's an overview of your SHAAD AI Assistant Dashboard
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Key Metrics - Enhanced */}
        <Grid size={12}>
          <Grid container spacing={3}>
            {metrics.map((metric, index) => (
              <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
                <Card 
                  sx={{
                    background: 'linear-gradient(135deg, rgba(13, 27, 42, 0.6), rgba(23, 48, 71, 0.6))',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: 3,
                    transition: 'all 0.3s ease-in-out',
                    position: 'relative',
                    overflow: 'hidden',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                    },
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 3,
                      background: `linear-gradient(45deg, ${metric.color}, ${metric.color}88)`,
                    }
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography 
                          variant="h4" 
                          sx={{ 
                            fontWeight: 700, 
                            color: metric.color,
                            mb: 1,
                            textShadow: `0 0 20px ${metric.color}44`
                          }}
                        >
                          {metric.value}
                        </Typography>
                        <Typography 
                          variant="body2" 
                          color="text.secondary"
                          sx={{ fontWeight: 500, mb: 1 }}
                        >
                          {metric.title}
                        </Typography>
                        {metric.change && (
                          <Chip
                            label={metric.change}
                            size="small"
                            sx={{
                              background: metric.change.startsWith('+') 
                                ? 'linear-gradient(45deg, rgba(76, 175, 80, 0.2), rgba(129, 199, 132, 0.2))'
                                : 'linear-gradient(45deg, rgba(158, 158, 158, 0.2), rgba(189, 189, 189, 0.2))',
                              color: metric.change.startsWith('+') ? 'success.light' : 'text.secondary',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              fontWeight: 600,
                            }}
                          />
                        )}
                      </Box>
                      <Avatar 
                        sx={{ 
                          bgcolor: 'transparent',
                          background: `linear-gradient(45deg, ${metric.color}20, ${metric.color}40)`,
                          border: `2px solid ${metric.color}30`,
                          width: 56,
                          height: 56,
                        }}
                      >
                        <Box sx={{ color: metric.color, fontSize: 28 }}>
                          {metric.icon}
                        </Box>
                      </Avatar>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Grid>

        {/* Quick Actions - Enhanced */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card 
            sx={{
              background: 'linear-gradient(135deg, rgba(13, 27, 42, 0.6), rgba(23, 48, 71, 0.6))',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 3,
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Typography 
                variant="h6" 
                sx={{ 
                  mb: 3, 
                  fontWeight: 600,
                  background: 'linear-gradient(45deg, #90caf9, #f48fb1)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Quick Actions
              </Typography>
              
              <Grid container spacing={2}>
                <Grid size={12}>
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={<Chat />}
                    onClick={() => navigate('/chat')}
                  >
                    Start New Chat
                  </Button>
                </Grid>
                
                <Grid size={12}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<Workflow />}
                    onClick={() => navigate('/n8n')}
                  >
                    Manage Workflows
                  </Button>
                </Grid>
                
                <Grid size={12}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<SmartToy />}
                    onClick={() => navigate('/discord')}
                  >
                    Discord Bot Control
                  </Button>
                </Grid>
                
                <Grid size={12}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<Launch />}
                    onClick={() => window.open('http://localhost:5678', '_blank')}
                  >
                    Open n8n Editor
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* System Health */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  System Health
                </Typography>
                <IconButton size="small" onClick={refreshData}>
                  <Refresh />
                </IconButton>
              </Box>
              
              <Box sx={{ space: 2 }}>
                {Object.entries(systemHealth).map(([key, value]) => (
                  <Box key={key} sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                        {key === 'ai' ? 'AI Services' : key}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {value}%
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={value}
                      color={value >= 95 ? 'success' : value >= 85 ? 'warning' : 'error'}
                      sx={{ height: 6, borderRadius: 3 }}
                    />
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Activity */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Recent Activity
              </Typography>
              
              <List dense>
                {recentActivity.slice(0, 6).map((activity) => (
                  <ListItem key={activity.id} sx={{ px: 0 }}>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <Avatar sx={{ width: 32, height: 32, bgcolor: 'transparent' }}>
                        {getActivityIcon(activity.type)}
                      </Avatar>
                    </ListItemIcon>
                    <ListItemText
                      primary={activity.message}
                      secondary={activity.timestamp}
                      primaryTypographyProps={{ variant: 'body2' }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                    <Chip
                      size="small"
                      color={getStatusColor(activity.status) as any}
                      sx={{ ml: 1 }}
                    />
                  </ListItem>
                ))}
              </List>
              
              <Button
                fullWidth
                variant="text"
                sx={{ mt: 1 }}
                onClick={() => {/* TODO: Navigate to activity log */}}
              >
                View All Activity
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default MainDashboard;