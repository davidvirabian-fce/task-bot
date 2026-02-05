import { Bot, Context, InlineKeyboard } from 'grammy';
import { config } from './config.js';
import { addTask, getTasks, getTaskByNumber, deleteTask, deleteAllTasks, Task, incrementMessageCount } from './database.js';
import { generateSarcasticMessage } from './openai.js';

const MAX_MESSAGE_LENGTH = 4000; // Leave some buffer for Telegram's 4096 limit
const OVERDUE_HOURS = 24; // Task is overdue after 24 hours
const MESSAGE_THRESHOLD = 20; // "Распизделись" trigger threshold

export const bot = new Bot(config.telegram.botToken);

// Check if task is overdue (older than 24 hours)
function isOverdue(task: Task): boolean {
  const createdAt = new Date(task.created_at);
  const now = new Date();
  const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
  return hoursDiff > OVERDUE_HOURS;
}

// /start command
bot.command('start', async (ctx) => {
  await ctx.reply(
    'Task Bot\n\n' +
    'Commands:\n' +
    '/add <task> - Add a new task\n' +
    '/task - Show all tasks\n' +
    '/done <number> - Complete task by number\n' +
    '/clearall - Delete all tasks'
  );
});

// /add command - add a new task
bot.command('add', async (ctx) => {
  const chatId = ctx.chat.id;
  const text = ctx.message?.text || '';
  const description = text.replace(/^\/add\s*/, '').trim();

  if (!description) {
    await ctx.reply('Please provide a task description.\nExample: /add Prepare presentation');
    return;
  }

  addTask(chatId, description);
  try {
    await ctx.react('👀');
  } catch (e) {
    // Reactions might not be available in all chats
  }
});

// /task command - show all tasks
bot.command('task', async (ctx) => {
  const chatId = ctx.chat.id;
  const tasks = getTasks(chatId);

  if (tasks.length === 0) {
    await ctx.reply('No tasks yet. Use /add to create one.');
    return;
  }

  const message = formatTaskList(tasks);
  await ctx.reply(message, { parse_mode: 'HTML' });
});

// /done command - delete task by number
bot.command('done', async (ctx) => {
  const chatId = ctx.chat.id;
  const text = ctx.message?.text || '';
  const numberStr = text.replace(/^\/done\s*/, '').trim();
  const taskNumber = parseInt(numberStr, 10);

  if (isNaN(taskNumber) || taskNumber < 1) {
    await ctx.reply('Please provide a valid task number.\nExample: /done 1');
    return;
  }

  const task = getTaskByNumber(chatId, taskNumber);
  if (!task) {
    await ctx.reply(`Task #${taskNumber} not found.`);
    return;
  }

  deleteTask(task.id);
  try {
    await ctx.react('😎');
  } catch (e) {
    // Reactions might not be available in all chats
  }
});

// /clearall command - delete all tasks with confirmation
bot.command('clearall', async (ctx) => {
  const chatId = ctx.chat.id;
  const tasks = getTasks(chatId);

  if (tasks.length === 0) {
    await ctx.reply('No tasks to delete.');
    return;
  }

  const keyboard = new InlineKeyboard()
    .text('Yes, delete all', `clearall_confirm_${chatId}`)
    .text('Cancel', 'clearall_cancel');

  await ctx.reply(
    `Are you sure you want to delete all ${tasks.length} tasks?`,
    { reply_markup: keyboard }
  );
});

// Handle clearall confirmation
bot.callbackQuery(/^clearall_confirm_(\d+)$/, async (ctx) => {
  const chatId = parseInt(ctx.match![1], 10);
  const deleted = deleteAllTasks(chatId);

  await ctx.answerCallbackQuery();
  await ctx.editMessageText(`Deleted ${deleted} tasks.`);
});

// Handle clearall cancel
bot.callbackQuery('clearall_cancel', async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText('Cancelled.');
});

// Track all messages and trigger "Распизделись" at 20+ per hour
bot.on('message:text', async (ctx) => {
  const chatId = ctx.chat.id;

  // Don't count bot commands
  if (ctx.message.text.startsWith('/')) {
    return;
  }

  // Increment message count and check threshold
  const count = incrementMessageCount(chatId);
  console.log(`Chat ${chatId} message count this hour: ${count}`);

  // Trigger "Распизделись" exactly at 20 messages
  if (count === MESSAGE_THRESHOLD) {
    await ctx.reply('Распизделись');
  }
});

export function formatTaskList(tasks: Task[]): string {
  let message = '<b>Open tasks:</b>\n\n';

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    const num = i + 1;
    const overdue = isOverdue(task);
    const desc = escapeHtml(task.description);

    // Bold number always, bold description only if overdue
    const line = overdue
      ? `<b>${num}.</b> <b>${desc}</b>\n`
      : `<b>${num}.</b> ${desc}\n`;

    if (message.length + line.length > MAX_MESSAGE_LENGTH) {
      message += `\n... and ${tasks.length - i} more tasks`;
      break;
    }

    message += line;
  }

  return message;
}

// Escape HTML special characters
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export async function sendTasksToChat(chatId: number): Promise<void> {
  const tasks = getTasks(chatId);

  if (tasks.length === 0) {
    return; // Don't send if no tasks
  }

  const message = formatTaskList(tasks);
  await bot.api.sendMessage(chatId, message, { parse_mode: 'HTML' });
}

export async function sendSarcasticMessage(chatId: number): Promise<void> {
  const tasks = getTasks(chatId);

  if (tasks.length === 0) {
    return; // Don't send if no tasks
  }

  const sarcasticText = await generateSarcasticMessage();
  if (sarcasticText) {
    await bot.api.sendMessage(chatId, sarcasticText);
  }
}
