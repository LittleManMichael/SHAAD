/**
 * Discord Bot Dashboard Component
 * 
 * Manages Discord bot configuration, monitoring, and control
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardActions,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Switch,
  FormControlLabel,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Avatar,
  Divider,
} from '@mui/material';
import {
  PowerSettingsNew,
  Refresh,
  Settings,
  Add,
  Delete,
  Edit,
  People,
  Message,
  TrendingUp,
  Error,
  CheckCircle,
  Schedule,
} from '@mui/icons-material';
import Grid from '@mui/material/Grid';
import { useSnackbar } from '../contexts/SnackbarContext';

interface DiscordServer {
  id: string;
  name: string;
  icon?: string;
  memberCount: number;
  botActive: boolean;
  permissions: string[];
}

interface BotCommand {
  name: string;
  description: string;
  usage: string;
  enabled: boolean;
  usageCount: number;
}

interface BotStats {
  status: 'online' | 'offline' | 'error';
  uptime: string;
  messagesSent: number;
  commandsExecuted: number;
  serversConnected: number;
  lastSeen?: string;
}

const DiscordDashboard: React.FC = () => {
  const { showSnackbar } = useSnackbar();
  
  const [botStats, setBotStats] = useState<BotStats>({
    status: 'offline',
    uptime: '0h 0m',
    messagesSent: 1247,
    commandsExecuted: 423,
    serversConnected: 3,
    lastSeen: '2025-07-04T12:00:00Z'
  });

  const [servers, setServers] = useState<DiscordServer[]>([
    {
      id: '1',
      name: 'SHAAD Development',
      memberCount: 25,
      botActive: true,
      permissions: ['Send Messages', 'Read Message History', 'Use Slash Commands']
    },
    {
      id: '2',
      name: 'AI Enthusiasts',
      memberCount: 142,
      botActive: true,
      permissions: ['Send Messages', 'Read Message History', 'Manage Messages']
    },
    {
      id: '3',
      name: 'Test Server',
      memberCount: 8,
      botActive: false,
      permissions: ['Send Messages']
    }
  ]);

  const [commands, setCommands] = useState<BotCommand[]>([
    {
      name: '/chat',
      description: 'Start a conversation with SHAAD AI',
      usage: '/chat [message]',
      enabled: true,
      usageCount: 156
    },
    {
      name: '/status',
      description: 'Check SHAAD system status',
      usage: '/status',
      enabled: true,
      usageCount: 89
    },
    {
      name: '/help',
      description: 'Show available commands',
      usage: '/help [command]',
      enabled: true,
      usageCount: 245
    },
    {
      name: '/workflow',
      description: 'Trigger n8n workflows',
      usage: '/workflow [name]',
      enabled: false,
      usageCount: 12
    }
  ]);

  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [botToken, setBotToken] = useState('');
  const [botPrefix, setBotPrefix] = useState('!');

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <CheckCircle color="success" />;
      case 'error':
        return <Error color="error" />;
      default:
        return <Schedule color="disabled" />;
    }
  };

  const getStatusColor = (status: string): "success" | "error" | "warning" | "default" => {
    switch (status) {
      case 'online':
        return 'success';
      case 'error':
        return 'error';
      case 'offline':
        return 'warning';
      default:
        return 'default';
    }
  };

  const toggleBot = async () => {
    try {
      const newStatus = botStats.status === 'online' ? 'offline' : 'online';
      setBotStats(prev => ({ ...prev, status: newStatus }));
      showSnackbar(`Bot ${newStatus === 'online' ? 'started' : 'stopped'} successfully`, 'success');
      // TODO: Implement actual bot start/stop API call
    } catch (error) {
      showSnackbar('Failed to toggle bot status', 'error');
    }
  };

  const toggleCommand = (commandName: string) => {
    setCommands(prev =>
      prev.map(cmd =>
        cmd.name === commandName
          ? { ...cmd, enabled: !cmd.enabled }
          : cmd
      )
    );
    showSnackbar(`Command ${commandName} ${commands.find(c => c.name === commandName)?.enabled ? 'disabled' : 'enabled'}`, 'success');
  };

  const saveConfiguration = () => {
    // TODO: Implement API call to save bot configuration
    showSnackbar('Bot configuration saved', 'success');
    setConfigDialogOpen(false);
  };

  const refreshStats = () => {
    showSnackbar('Refreshing bot statistics...', 'info');
    // TODO: Implement API call to fetch latest stats
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Discord Bot Manager
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={refreshStats}
          >
            Refresh
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<Settings />}
            onClick={() => setConfigDialogOpen(true)}
          >
            Configure
          </Button>
          
          <Button
            variant={botStats.status === 'online' ? 'contained' : 'outlined'}
            color={botStats.status === 'online' ? 'error' : 'success'}
            startIcon={<PowerSettingsNew />}
            onClick={toggleBot}
          >
            {botStats.status === 'online' ? 'Stop Bot' : 'Start Bot'}
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Bot Status Overview */}
        <Grid size={12}>
          <Card>
            <CardHeader
              avatar={getStatusIcon(botStats.status)}
              title="Bot Status"
              subheader={`Last seen: ${botStats.lastSeen ? new Date(botStats.lastSeen).toLocaleString() : 'Never'}`}
              action={
                <Chip
                  label={botStats.status.toUpperCase()}
                  color={getStatusColor(botStats.status)}
                />
              }
            />
            <CardContent>
              <Grid container spacing={3}>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Typography variant="h4" color="primary">
                    {botStats.messagesSent}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Messages Sent
                  </Typography>
                </Grid>
                
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Typography variant="h4" color="secondary">
                    {botStats.commandsExecuted}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Commands Executed
                  </Typography>
                </Grid>
                
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Typography variant="h4" color="success.main">
                    {botStats.serversConnected}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Servers Connected
                  </Typography>
                </Grid>
                
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Typography variant="h4" color="info.main">
                    {botStats.uptime}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Uptime
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Connected Servers */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardHeader title="Connected Servers" />
            <CardContent>
              <List dense>
                {servers.map((server, index) => (
                  <React.Fragment key={server.id}>
                    <ListItem>
                      <Avatar sx={{ mr: 2, bgcolor: server.botActive ? 'success.main' : 'grey.500' }}>
                        {server.name.charAt(0)}
                      </Avatar>
                      
                      <ListItemText
                        primary={server.name}
                        secondary={`${server.memberCount} members • ${server.permissions.length} permissions`}
                      />
                      
                      <ListItemSecondaryAction>
                        <Chip
                          label={server.botActive ? 'Active' : 'Inactive'}
                          color={server.botActive ? 'success' : 'default'}
                          size="small"
                        />
                      </ListItemSecondaryAction>
                    </ListItem>
                    {index < servers.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Bot Commands */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardHeader title="Bot Commands" />
            <CardContent>
              <List dense>
                {commands.map((command, index) => (
                  <React.Fragment key={command.name}>
                    <ListItem>
                      <ListItemText
                        primary={command.name}
                        secondary={command.description}
                      />
                      
                      <ListItemSecondaryAction>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="caption" color="text.secondary">
                            {command.usageCount}
                          </Typography>
                          <Switch
                            checked={command.enabled}
                            onChange={() => toggleCommand(command.name)}
                            size="small"
                          />
                        </Box>
                      </ListItemSecondaryAction>
                    </ListItem>
                    {index < commands.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Activity */}
        <Grid size={12}>
          <Card>
            <CardHeader title="Recent Activity" />
            <CardContent>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Time</TableCell>
                      <TableCell>Server</TableCell>
                      <TableCell>User</TableCell>
                      <TableCell>Action</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>12:45 PM</TableCell>
                      <TableCell>SHAAD Development</TableCell>
                      <TableCell>@shaad_admin</TableCell>
                      <TableCell>/chat Hello, how can I help?</TableCell>
                      <TableCell>
                        <Chip label="Success" color="success" size="small" />
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>12:42 PM</TableCell>
                      <TableCell>AI Enthusiasts</TableCell>
                      <TableCell>@user123</TableCell>
                      <TableCell>/status</TableCell>
                      <TableCell>
                        <Chip label="Success" color="success" size="small" />
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>12:38 PM</TableCell>
                      <TableCell>Test Server</TableCell>
                      <TableCell>@developer</TableCell>
                      <TableCell>/workflow backup</TableCell>
                      <TableCell>
                        <Chip label="Failed" color="error" size="small" />
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Configuration Dialog */}
      <Dialog open={configDialogOpen} onClose={() => setConfigDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Bot Configuration</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid size={12}>
              <TextField
                fullWidth
                label="Bot Token"
                type="password"
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                placeholder="Enter Discord bot token"
                helperText="Get your bot token from Discord Developer Portal"
              />
            </Grid>
            
            <Grid size={12}>
              <TextField
                fullWidth
                label="Command Prefix"
                value={botPrefix}
                onChange={(e) => setBotPrefix(e.target.value)}
                placeholder="!"
                helperText="Prefix for text-based commands (e.g., !help)"
              />
            </Grid>
            
            <Grid size={12}>
              <FormControlLabel
                control={<Switch defaultChecked />}
                label="Enable Slash Commands"
              />
            </Grid>
            
            <Grid size={12}>
              <FormControlLabel
                control={<Switch defaultChecked />}
                label="Auto-respond to Mentions"
              />
            </Grid>
            
            <Grid size={12}>
              <FormControlLabel
                control={<Switch />}
                label="Log All Interactions"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfigDialogOpen(false)}>Cancel</Button>
          <Button onClick={saveConfiguration} variant="contained">Save Configuration</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DiscordDashboard;