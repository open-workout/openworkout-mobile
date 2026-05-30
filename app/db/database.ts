import type * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export function setDb(instance: SQLite.SQLiteDatabase): void {
  db = instance;
}

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!db) throw new Error('Database not initialized — SQLiteProvider not mounted yet');
  return db;
}
