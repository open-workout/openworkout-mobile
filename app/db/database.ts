import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('openworkout.db');
  await db.execAsync('PRAGMA foreign_keys = ON;');
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS exercises (
      id                TEXT PRIMARY KEY,
      name              TEXT NOT NULL,
      exercise_type     TEXT,
      primary_muscles   TEXT,
      secondary_muscles TEXT,
      alt_names         TEXT,
      description       TEXT,
      weight_direction  INTEGER DEFAULT 1,
      created_at        INTEGER
    );
    CREATE TABLE IF NOT EXISTS workouts (
      id          TEXT PRIMARY KEY,
      title       TEXT NOT NULL DEFAULT '',
      started_at  TEXT NOT NULL,
      finished_at TEXT,
      created_at  INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sets (
      id          TEXT PRIMARY KEY,
      workout_id  TEXT NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
      exercise_id TEXT NOT NULL,
      reps        INTEGER NOT NULL DEFAULT 0,
      difficulty  INTEGER NOT NULL DEFAULT 0,
      weight      REAL NOT NULL DEFAULT 0,
      unit        TEXT NOT NULL DEFAULT 'kg',
      logged_at   TEXT NOT NULL,
      created_at  INTEGER NOT NULL
    );
  `);
  return db;
}
