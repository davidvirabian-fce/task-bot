import { bot } from './bot.js';
import { initDatabase, closeDatabase } from './database.js';
import { startScheduler } from './scheduler.js';
import { validateConfig } from './config.js';

async function main(): Promise<void> {
  console.log('Starting Task Bot...');

  // Validate configuration
  validateConfig();

  // Initialize database
  initDatabase();
  console.log('Database initialized');

  // Start scheduler for daily follow-ups
  startScheduler();

  // Start bot
  bot.start({
    onStart: (botInfo) => {
      console.log(`Bot @${botInfo.username} is running!`);
      console.log('Commands: /add, /task, /done');
    },
  });
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down...');
  bot.stop();
  closeDatabase();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Shutting down...');
  bot.stop();
  closeDatabase();
  process.exit(0);
});

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
