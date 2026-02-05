import cron from 'node-cron';
import { getAllChatsWithTasks } from './database.js';
import { sendTasksToChat, sendSarcasticMessage } from './bot.js';

// Schedule daily follow-up at 10:00 UAE time (Asia/Dubai)
// UAE is UTC+4, so 10:00 UAE = 06:00 UTC
export function startScheduler(): void {
  console.log('Starting daily task follow-up scheduler (10:00 UAE / 06:00 UTC)');

  // Daily task list at 10:00 UAE
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

  // Schedule random sarcastic message once per day
  // Run at midnight UTC to schedule that day's random message
  scheduleDailySarcasticMessage();
  cron.schedule('0 0 * * *', () => {
    scheduleDailySarcasticMessage();
  });
}

// Schedule a sarcastic message at a random time during the day
function scheduleDailySarcasticMessage(): void {
  // Random hour between 8:00 and 20:00 UAE time (04:00-16:00 UTC)
  const randomHourUTC = Math.floor(Math.random() * 12) + 4; // 4-16 UTC
  const randomMinute = Math.floor(Math.random() * 60);

  const now = new Date();
  const scheduledTime = new Date(now);
  scheduledTime.setUTCHours(randomHourUTC, randomMinute, 0, 0);

  // If the time has already passed today, don't schedule
  if (scheduledTime <= now) {
    console.log('Sarcastic message time already passed for today');
    return;
  }

  const delay = scheduledTime.getTime() - now.getTime();
  const scheduledUAE = new Date(scheduledTime.getTime() + 4 * 60 * 60 * 1000);

  console.log(`Scheduling sarcastic message at ${scheduledUAE.toISOString().slice(11, 16)} UAE time`);

  setTimeout(async () => {
    console.log('Sending daily sarcastic message...');
    try {
      const chatIds = getAllChatsWithTasks();

      for (const chatId of chatIds) {
        try {
          await sendSarcasticMessage(chatId);
          console.log(`Sent sarcastic message to chat ${chatId}`);
        } catch (error) {
          console.error(`Failed to send sarcastic message to chat ${chatId}:`, error);
        }
      }
    } catch (error) {
      console.error('Sarcastic message error:', error);
    }
  }, delay);
}

// Manual trigger for testing
export async function triggerFollowUp(): Promise<void> {
  const chatIds = getAllChatsWithTasks();

  for (const chatId of chatIds) {
    await sendTasksToChat(chatId);
  }
}

// Manual trigger for sarcastic message testing
export async function triggerSarcasticMessage(): Promise<void> {
  const chatIds = getAllChatsWithTasks();

  for (const chatId of chatIds) {
    await sendSarcasticMessage(chatId);
  }
}
