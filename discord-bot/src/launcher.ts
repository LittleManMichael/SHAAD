/**
 * Discord Bot Launcher
 * Simple launcher that starts the SHAAD Discord Bot
 */

import { ShaadDiscordBot } from './index';

const bot = new ShaadDiscordBot();

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nReceived SIGINT, shutting down gracefully...');
  await bot.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nReceived SIGTERM, shutting down gracefully...');
  await bot.stop();
  process.exit(0);
});

// Start the bot
bot.start().catch((error) => {
  console.error('Failed to start SHAAD Discord Bot:', error);
  process.exit(1);
});