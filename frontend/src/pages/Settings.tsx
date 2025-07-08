/**
 * Settings Page Component
 * 
 * Comprehensive settings page for SHAAD dashboard
 */

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Divider,
  Card,
  CardContent,
  CardHeader,
  Alert,
  Tabs,
  Tab,
  InputAdornment,
  IconButton,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Visibility,
  VisibilityOff,
  Save as SaveIcon,
  Security,
  Api,
  Notifications,
  Palette,
} from '@mui/icons-material';
import { useSnackbar } from '../contexts/SnackbarContext';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const Settings: React.FC = () => {
  const { showSnackbar } = useSnackbar();
  const [currentTab, setCurrentTab] = useState(0);
  
  // API Keys state
  const [apiKeys, setApiKeys] = useState({
    anthropic: '',
    openai: '',
    discord: '',
  });
  
  const [showApiKeys, setShowApiKeys] = useState({
    anthropic: false,
    openai: false,
    discord: false,
  });

  // General preferences
  const [preferences, setPreferences] = useState({
    darkMode: true,
    notifications: true,
    autoSave: true,
    soundEffects: false,
    defaultAiModel: 'claude',
  });

  // Security settings
  const [security, setSecurity] = useState({
    twoFactorAuth: false,
    sessionTimeout: 30,
    passwordExpiry: 90,
  });

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const handleApiKeyChange = (provider: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setApiKeys(prev => ({
      ...prev,
      [provider]: event.target.value
    }));
  };

  const toggleApiKeyVisibility = (provider: string) => {
    setShowApiKeys(prev => ({
      ...prev,
      [provider]: !prev[provider as keyof typeof prev]
    }));
  };

  const handlePreferenceChange = (setting: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setPreferences(prev => ({
      ...prev,
      [setting]: event.target.checked
    }));
  };

  const handleSecurityChange = (setting: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setSecurity(prev => ({
      ...prev,
      [setting]: setting === 'twoFactorAuth' ? event.target.checked : event.target.value
    }));
  };

  const saveSettings = async () => {
    try {
      // TODO: Implement API call to save settings
      showSnackbar('Settings saved successfully', 'success');
    } catch (error) {
      showSnackbar('Failed to save settings', 'error');
    }
  };

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto' }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
        Settings
      </Typography>

      <Paper sx={{ width: '100%' }}>
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          aria-label="settings tabs"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab icon={<Api />} label="API Keys" />
          <Tab icon={<Palette />} label="Preferences" />
          <Tab icon={<Security />} label="Security" />
          <Tab icon={<Notifications />} label="Notifications" />
        </Tabs>

        {/* API Keys Tab */}
        <TabPanel value={currentTab} index={0}>
          <Grid container spacing={3}>
            <Grid size={12}>
              <Alert severity="info" sx={{ mb: 3 }}>
                Store your API keys securely. These keys are encrypted and used to connect to AI services.
              </Alert>
            </Grid>

            {/* Anthropic API Key */}
            <Grid size={12}>
              <Card variant="outlined">
                <CardHeader title="Anthropic Claude API" subheader="Required for Claude AI functionality" />
                <CardContent>
                  <TextField
                    fullWidth
                    label="API Key"
                    type={showApiKeys.anthropic ? 'text' : 'password'}
                    value={apiKeys.anthropic}
                    onChange={handleApiKeyChange('anthropic')}
                    placeholder="sk-ant-..."
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => toggleApiKeyVisibility('anthropic')}
                            edge="end"
                          >
                            {showApiKeys.anthropic ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </CardContent>
              </Card>
            </Grid>

            {/* OpenAI API Key */}
            <Grid size={12}>
              <Card variant="outlined">
                <CardHeader title="OpenAI API" subheader="Required for ChatGPT functionality" />
                <CardContent>
                  <TextField
                    fullWidth
                    label="API Key"
                    type={showApiKeys.openai ? 'text' : 'password'}
                    value={apiKeys.openai}
                    onChange={handleApiKeyChange('openai')}
                    placeholder="sk-..."
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => toggleApiKeyVisibility('openai')}
                            edge="end"
                          >
                            {showApiKeys.openai ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </CardContent>
              </Card>
            </Grid>

            {/* Discord Bot Token */}
            <Grid size={12}>
              <Card variant="outlined">
                <CardHeader title="Discord Bot Token" subheader="Required for Discord bot integration" />
                <CardContent>
                  <TextField
                    fullWidth
                    label="Bot Token"
                    type={showApiKeys.discord ? 'text' : 'password'}
                    value={apiKeys.discord}
                    onChange={handleApiKeyChange('discord')}
                    placeholder="Discord bot token..."
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => toggleApiKeyVisibility('discord')}
                            edge="end"
                          >
                            {showApiKeys.discord ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Preferences Tab */}
        <TabPanel value={currentTab} index={1}>
          <Grid container spacing={3}>
            <Grid size={12}>
              <Card variant="outlined">
                <CardHeader title="General Preferences" />
                <CardContent>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={preferences.darkMode}
                            onChange={handlePreferenceChange('darkMode')}
                          />
                        }
                        label="Dark Mode"
                      />
                    </Grid>
                    
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={preferences.notifications}
                            onChange={handlePreferenceChange('notifications')}
                          />
                        }
                        label="Enable Notifications"
                      />
                    </Grid>
                    
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={preferences.autoSave}
                            onChange={handlePreferenceChange('autoSave')}
                          />
                        }
                        label="Auto-save Conversations"
                      />
                    </Grid>
                    
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={preferences.soundEffects}
                            onChange={handlePreferenceChange('soundEffects')}
                          />
                        }
                        label="Sound Effects"
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Security Tab */}
        <TabPanel value={currentTab} index={2}>
          <Grid container spacing={3}>
            <Grid size={12}>
              <Card variant="outlined">
                <CardHeader title="Security Settings" />
                <CardContent>
                  <Grid container spacing={3}>
                    <Grid size={12}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={security.twoFactorAuth}
                            onChange={handleSecurityChange('twoFactorAuth')}
                          />
                        }
                        label="Two-Factor Authentication"
                      />
                    </Grid>
                    
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        fullWidth
                        label="Session Timeout (minutes)"
                        type="number"
                        value={security.sessionTimeout}
                        onChange={handleSecurityChange('sessionTimeout')}
                        inputProps={{ min: 5, max: 480 }}
                      />
                    </Grid>
                    
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        fullWidth
                        label="Password Expiry (days)"
                        type="number"
                        value={security.passwordExpiry}
                        onChange={handleSecurityChange('passwordExpiry')}
                        inputProps={{ min: 30, max: 365 }}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Notifications Tab */}
        <TabPanel value={currentTab} index={3}>
          <Grid container spacing={3}>
            <Grid size={12}>
              <Card variant="outlined">
                <CardHeader title="Notification Settings" />
                <CardContent>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Configure when and how you receive notifications from SHAAD.
                  </Typography>
                  
                  <Grid container spacing={2}>
                    <Grid size={12}>
                      <FormControlLabel
                        control={<Switch defaultChecked />}
                        label="New Message Notifications"
                      />
                    </Grid>
                    
                    <Grid size={12}>
                      <FormControlLabel
                        control={<Switch defaultChecked />}
                        label="Workflow Completion Notifications"
                      />
                    </Grid>
                    
                    <Grid size={12}>
                      <FormControlLabel
                        control={<Switch />}
                        label="System Maintenance Notifications"
                      />
                    </Grid>
                    
                    <Grid size={12}>
                      <FormControlLabel
                        control={<Switch />}
                        label="Discord Bot Activity Notifications"
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Save Button */}
        <Box sx={{ p: 3, borderTop: 1, borderColor: 'divider' }}>
          <Button
            variant="contained"
            size="large"
            startIcon={<SaveIcon />}
            onClick={saveSettings}
          >
            Save Settings
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default Settings;