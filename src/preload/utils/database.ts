import sqlite3 from 'sqlite3'
import { app } from 'electron'
import path from 'path'

class DatabaseManager {
  private static instance: sqlite3.Database

  static getDB(): sqlite3.Database {
    if (!this.instance) {
      const userDataPath = app.getPath('userData')
      const dbPath = path.join(userDataPath, 'chat.sqlite')
      this.instance = new sqlite3.Database(dbPath)
      this.initializeDatabase()
    }
    return this.instance
  }

  private static initializeDatabase(): void {
    this.instance.exec(`
        CREATE TABLE IF NOT EXISTS chats (
          id TEXT PRIMARY KEY NOT NULL,
          title TEXT NOT NULL,
          model TEXT DEFAULT 'gemma3:1b',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
  
        CREATE TABLE IF NOT EXISTS messages (
          id TEXT PRIMARY KEY NOT NULL,
          chat_id TEXT REFERENCES chats(id) ON DELETE CASCADE,
          user TEXT NOT NULL,
          assistant TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `)
  }
}

export { DatabaseManager }
