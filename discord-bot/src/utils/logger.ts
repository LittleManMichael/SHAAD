/**
 * Logger Utility
 * 
 * Centralized logging for the Discord bot with multiple output formats
 */

import * as winston from 'winston';
import * as path from 'path';

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const LOG_DIR = process.env.LOG_DIR || path.join(__dirname, '../../logs');

// Create logs directory if it doesn't exist
import * as fs from 'fs-extra';
fs.ensureDirSync(LOG_DIR);

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Define console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, service, ...meta }: any) => {
    let log = `${timestamp} [${level}]`;
    if (service) log += ` [${service}]`;
    log += `: ${message}`;
    
    // Add metadata if present
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    if (metaStr) log += `\n${metaStr}`;
    
    return log;
  })
);

// Create logger instance
export const logger = winston.createLogger({
  level: LOG_LEVEL,
  format: logFormat,
  defaultMeta: { service: 'discord-bot' },
  transports: [
    // Console-only for now to avoid infinite loop with file monitoring
    new winston.transports.Console({
      format: consoleFormat,
      level: 'debug'
    })
  ]
});

// Console transport already added above

// Exception and rejection handling disabled temporarily to avoid file monitoring loop

// Helper functions for different log levels with context
export const createLogger = (context: string) => {
  return {
    debug: (message: string, meta?: any) => logger.debug(message, { context, ...meta }),
    info: (message: string, meta?: any) => logger.info(message, { context, ...meta }),
    warn: (message: string, meta?: any) => logger.warn(message, { context, ...meta }),
    error: (message: string, meta?: any) => logger.error(message, { context, ...meta }),
    fatal: (message: string, meta?: any) => logger.error(message, { context, level: 'fatal', ...meta })
  };
};

// Export default logger
export default logger;