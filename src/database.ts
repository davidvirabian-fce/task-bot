import Database from 'better-sqlite3';
import { config } from './config.js';
import path from 'path';
import fs from 'fs';

export interface Task {
  id: number;
  chat_id: number;
  description: string;
  created_at: string;
}

let db: Database.Database;

export function initDatabase(): void {
  // Ensure data directory exists
  const dbDir = path.dirname(config.database.path);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  db = new Database(config.database.path);

  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_id INTEGER NOT NULL,
      description TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_chat_id ON tasks(chat_id);

    CREATE TABLE IF NOT EXISTS message_counts (
      chat_id INTEGER NOT NULL,
      hour_key TEXT NOT NULL,
      count INTEGER DEFAULT 0,
      PRIMARY KEY (chat_id, hour_key)
    );
  `);
}

export function addTask(chatId: number, description: string): Task {
  const stmt = db.prepare(`
    INSERT INTO tasks (chat_id, description) VALUES (?, ?)
  `);
  const result = stmt.run(chatId, description);

  return {
    id: result.lastInsertRowid as number,
    chat_id: chatId,
    description,
    created_at: new Date().toISOString(),
  };
}

export function getTasks(chatId: number): Task[] {
  const stmt = db.prepare(`
    SELECT id, chat_id, description, created_at
    FROM tasks
    WHERE chat_id = ?
    ORDER BY id ASC
  `);
  return stmt.all(chatId) as Task[];
}

export function getTaskByNumber(chatId: number, taskNumber: number): Task | undefined {
  const tasks = getTasks(chatId);
  return tasks[taskNumber - 1];
}

export function deleteTask(taskId: number): boolean {
  const stmt = db.prepare(`DELETE FROM tasks WHERE id = ?`);
  const result = stmt.run(taskId);
  return result.changes > 0;
}

export function deleteAllTasks(chatId: number): number {
  const stmt = db.prepare(`DELETE FROM tasks WHERE chat_id = ?`);
  const result = stmt.run(chatId);
  return result.changes;
}

export function getAllChatsWithTasks(): number[] {
  const stmt = db.prepare(`
    SELECT DISTINCT chat_id FROM tasks
  `);
  const rows = stmt.all() as { chat_id: number }[];
  return rows.map(row => row.chat_id);
}

// Get current hour key (YYYY-MM-DD-HH format)
function getCurrentHourKey(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}-${String(now.getUTCHours()).padStart(2, '0')}`;
}

// Increment message count for current hour, returns new count
export function incrementMessageCount(chatId: number): number {
  const hourKey = getCurrentHourKey();

  const stmt = db.prepare(`
    INSERT INTO message_counts (chat_id, hour_key, count)
    VALUES (?, ?, 1)
    ON CONFLICT(chat_id, hour_key) DO UPDATE SET count = count + 1
    RETURNING count
  `);

  const result = stmt.get(chatId, hourKey) as { count: number } | undefined;
  return result?.count || 1;
}

// Get message count for current hour
export function getMessageCount(chatId: number): number {
  const hourKey = getCurrentHourKey();

  const stmt = db.prepare(`
    SELECT count FROM message_counts
    WHERE chat_id = ? AND hour_key = ?
  `);

  const result = stmt.get(chatId, hourKey) as { count: number } | undefined;
  return result?.count || 0;
}

// Clean up old message counts (older than 24 hours)
export function cleanupOldMessageCounts(): void {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const cutoffKey = `${yesterday.getUTCFullYear()}-${String(yesterday.getUTCMonth() + 1).padStart(2, '0')}-${String(yesterday.getUTCDate()).padStart(2, '0')}-00`;

  const stmt = db.prepare(`DELETE FROM message_counts WHERE hour_key < ?`);
  stmt.run(cutoffKey);
}

export function closeDatabase(): void {
  if (db) {
    db.close();
  }
}
