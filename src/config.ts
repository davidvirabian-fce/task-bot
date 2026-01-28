import 'dotenv/config';

export const config = {
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
  },
  database: {
    path: process.env.DATABASE_PATH || './data/tasks.db',
  },
  scheduler: {
    // 10:00 UAE time (Asia/Dubai, UTC+4) = 06:00 UTC
    cronExpression: '0 6 * * *',
    timezone: 'Asia/Dubai',
  },
};

export function validateConfig(): void {
  if (!config.telegram.botToken) {
    throw new Error('TELEGRAM_BOT_TOKEN is required');
  }
}
