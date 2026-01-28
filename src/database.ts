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

export function getAllChatsWithTasks(): number[] {
  const stmt = db.prepare(`
    SELECT DISTINCT chat_id FROM tasks
  `);
  const rows = stmt.all() as { chat_id: number }[];
  return rows.map(row => row.chat_id);
}

export function closeDatabase(): void {
  if (db) {
    db.close();
  }
}
