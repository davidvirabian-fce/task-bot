import cron from 'node-cron';
import { getAllChatsWithTasks } from './database.js';
import { sendTasksToChat } from './bot.js';

// Schedule daily follow-up at 10:00 UAE time (Asia/Dubai)
// UAE is UTC+4, so 10:00 UAE = 06:00 UTC
export function startScheduler(): void {
  console.log('Starting daily task follow-up scheduler (10:00 UAE / 06:00 UTC)');

  cron.schedule('0 6 * * *', async () => {
    console.log('Running daily task follow-up...');

    try {
      const chatIds = getAllChatsWithTasks();

      for (const chatId of chatIds) {
        try {
          await sendTasksToChat(chatId);
          console.log(`Sent tasks to chat ${chatId}`);
        } catch (error) {
          console.error(`Failed to send tasks to chat ${chatId}:`, error);
        }
      }

      console.log(`Daily follow-up completed for ${chatIds.length} chats`);
    } catch (error) {
      console.error('Daily follow-up error:', error);
    }
  });
}

// Manual trigger for testing
export async function triggerFollowUp(): Promise<void> {
  const chatIds = getAllChatsWithTasks();

  for (const chatId of chatIds) {
    await sendTasksToChat(chatId);
  }
}
