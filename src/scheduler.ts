import cron from 'node-cron';
import { getAllChatsWithTasks } from './database.js';
import { sendTasksToChat, sendSarcasticMessage } from './bot.js';

// Schedule follow-up every 2 days at 10:00 UAE time (Asia/Dubai)
// UAE is UTC+4, so 10:00 UAE = 06:00 UTC
export function startScheduler(): void {
  console.log('Starting task follow-up scheduler (every 2 days at 10:00 UAE / 06:00 UTC)');

  // Task list every 2 days at 10:00 UAE
  cron.schedule('0 6 */2 * *', async () => {
    console.log('Running task follow-up (every 2 days)...');

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

      console.log(`Task follow-up completed for ${chatIds.length} chats`);
    } catch (error) {
      console.error('Task follow-up error:', error);
    }
  });

  // Schedule random sarcastic message every 2 days
  // Run at midnight UTC on even days to schedule that day's random message
  scheduleSarcasticMessage();
  cron.schedule('0 0 */2 * *', () => {
    scheduleSarcasticMessage();
  });
}

// Schedule a sarcastic message at a random time (runs every 2 days)
function scheduleSarcasticMessage(): void {
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
    console.log('Sending sarcastic message...');
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
