/**
 * Environment Variable Validation and Type Safety
 * 
 * Ensures all required environment variables are present and properly typed
 */

import * as dotenv from 'dotenv';
import { logger } from './logger';

// Load environment variables
dotenv.config();

export interface EnvironmentConfig {
  // Discord Bot Configuration
  discord: {
    token: string;
    clientId: string;
    guildId?: string;
    prefix: string;
    ownerId?: string;
  };

  // Channel Configuration
  channels: {
    general: string;
    codeUpdates: string;
    systemAlerts: string;
    gitCommits: string;
    fileChanges: string;
    todoList: string;
  };

  // SHAAD Integration
  shaad: {
    apiUrl: string;
    botUsername?: string;
    botPassword?: string;
  };

  // Monitoring Configuration
  monitoring: {
    projectPath: string;
    gitPollingInterval: number;
    maxFileSize: number;
    healthCheckInterval: number;
    memoryThreshold: number;
    cpuThreshold: number;
    diskThreshold: number;
  };

  // Webhook Service
  webhook: {
    port: number;
    secret?: string;
  };

  // Application Settings
  app: {
    logLevel: string;
    logDir: string;
    nodeEnv: string;
  };

  // Rate Limiting
  rateLimit: {
    alerts: number;
    window: number;
  };
}

/**
 * Validate and parse environment variables
 */
function validateEnvironment(): EnvironmentConfig {
  const errors: string[] = [];

  // Helper function to get required env var
  const getRequired = (key: string): string => {
    const value = process.env[key];
    if (!value) {
      errors.push(`Missing required environment variable: ${key}`);
      return '';
    }
    return value;
  };

  // Helper function to get optional env var with default
  const getOptional = (key: string, defaultValue: string): string => {
    return process.env[key] || defaultValue;
  };

  // Helper function to parse integer with default
  const getInt = (key: string, defaultValue: number): number => {
    const value = process.env[key];
    if (!value) return defaultValue;
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
      errors.push(`Invalid integer value for ${key}: ${value}`);
      return defaultValue;
    }
    return parsed;
  };

  const config: EnvironmentConfig = {
    discord: {
      token: getRequired('DISCORD_BOT_TOKEN'),
      clientId: getRequired('DISCORD_CLIENT_ID'),
      guildId: process.env.DISCORD_GUILD_ID,
      prefix: getOptional('DISCORD_BOT_PREFIX', '!shaad'),
      ownerId: process.env.DISCORD_OWNER_ID,
    },

    channels: {
      general: getOptional('DISCORD_CHANNEL_GENERAL', 'general'),
      codeUpdates: getOptional('DISCORD_CHANNEL_CODE_UPDATES', 'code-updates'),
      systemAlerts: getOptional('DISCORD_CHANNEL_SYSTEM_ALERTS', 'system-alerts'),
      gitCommits: getOptional('DISCORD_CHANNEL_GIT_COMMITS', 'git-commits'),
      fileChanges: getOptional('DISCORD_CHANNEL_FILE_CHANGES', 'file-changes'),
      todoList: getOptional('DISCORD_CHANNEL_TODO_LIST', 'todo-list'),
    },

    shaad: {
      apiUrl: getOptional('SHAAD_API_URL', 'https://myshaad.com/api'),
      botUsername: process.env.SHAAD_BOT_USERNAME,
      botPassword: process.env.SHAAD_BOT_PASSWORD,
    },

    monitoring: {
      projectPath: getOptional('PROJECT_PATH', '/home/shaad/ai-assistant-dashboard'),
      gitPollingInterval: getInt('GIT_POLLING_INTERVAL', 30000),
      maxFileSize: getInt('MAX_FILE_SIZE', 1024 * 1024),
      healthCheckInterval: getInt('HEALTH_CHECK_INTERVAL', 60000),
      memoryThreshold: getInt('MEMORY_ALERT_THRESHOLD', 85),
      cpuThreshold: getInt('CPU_ALERT_THRESHOLD', 80),
      diskThreshold: getInt('DISK_ALERT_THRESHOLD', 90),
    },

    webhook: {
      port: getInt('WEBHOOK_PORT', 3003),
      secret: process.env.WEBHOOK_SECRET,
    },

    app: {
      logLevel: getOptional('LOG_LEVEL', 'info'),
      logDir: getOptional('LOG_DIR', './logs'),
      nodeEnv: getOptional('NODE_ENV', 'development'),
    },

    rateLimit: {
      alerts: getInt('DISCORD_RATE_LIMIT_ALERTS', 5),
      window: getInt('DISCORD_RATE_LIMIT_WINDOW', 3600000), // 1 hour
    },
  };

  // Check if there were validation errors
  if (errors.length > 0) {
    logger.error('Environment validation failed:', { errors });
    throw new Error(`Environment validation failed:\n${errors.join('\n')}`);
  }

  // Log configuration (without sensitive data)
  logger.info('Environment configuration loaded:', {
    discord: {
      clientId: config.discord.clientId,
      guildId: config.discord.guildId,
      prefix: config.discord.prefix,
      hasToken: !!config.discord.token,
    },
    shaad: {
      apiUrl: config.shaad.apiUrl,
      hasCredentials: !!(config.shaad.botUsername && config.shaad.botPassword),
    },
    monitoring: {
      projectPath: config.monitoring.projectPath,
      gitPollingInterval: config.monitoring.gitPollingInterval,
      healthCheckInterval: config.monitoring.healthCheckInterval,
    },
    webhook: {
      port: config.webhook.port,
      hasSecret: !!config.webhook.secret,
    },
    app: {
      logLevel: config.app.logLevel,
      nodeEnv: config.app.nodeEnv,
    },
  });

  return config;
}

// Export validated configuration
export const env = validateEnvironment();

// Export validation function for testing
export { validateEnvironment };

// Helper function to check if running in development
export const isDevelopment = (): boolean => env.app.nodeEnv === 'development';

// Helper function to check if running in production
export const isProduction = (): boolean => env.app.nodeEnv === 'production';

// Helper function to check if testing
export const isTesting = (): boolean => env.app.nodeEnv === 'test';