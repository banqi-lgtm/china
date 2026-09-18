import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';
import { DB_PATH, UPLOAD_DIR } from '../config';

// Ensure uploads and database directories exist
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const sqlite = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Failed to open SQLite database:', err.message);
  } else {
    console.log('Connected to SQLite database at:', DB_PATH);
  }
});

// Enable foreign keys
sqlite.run('PRAGMA foreign_keys = ON');

export const db = {
  run(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
    return new Promise((resolve, reject) => {
      sqlite.run(sql, params, function (err) {
        if (err) return reject(err);
        resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  },

  get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      sqlite.get(sql, params, (err, row) => {
        if (err) return reject(err);
        resolve(row as T | undefined);
      });
    });
  },

  all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      sqlite.all(sql, params, (err, rows) => {
        if (err) return reject(err);
        resolve(rows as T[]);
      });
    });
  },

  exec(sql: string): Promise<void> {
    return new Promise((resolve, reject) => {
      sqlite.exec(sql, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }
};

export async function initDatabase(): Promise<void> {
  const schemaPath = path.resolve(__dirname, 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await db.exec(schemaSql);
    console.log('Database tables verified and initialized.');
  }
}
