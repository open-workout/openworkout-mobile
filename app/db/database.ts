import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('openworkout.db');
  await db.execAsync('PRAGMA foreign_keys = ON;');
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS exercises (
      local_id         TEXT PRIMARY KEY,
      exercise_id      INTEGER UNIQUE,
      name             TEXT NOT NULL,
      exercise_type    TEXT,
      primary_muscles  TEXT,
      secondary_muscles TEXT,
      alt_names        TEXT,
      description      TEXT,
      user_id          TEXT,
      is_private       INTEGER DEFAULT 0,
      weight_direction INTEGER DEFAULT 1,
      sync_status      TEXT DEFAULT 'synced',
      created_at       INTEGER
    );
    CREATE TABLE IF NOT EXISTS sync_meta (
      key   TEXT PRIMARY KEY,
      value TEXT
    );
    CREATE TABLE IF NOT EXISTS workouts (
      local_id     TEXT PRIMARY KEY,
      workout_id   INTEGER UNIQUE,
      user_id      TEXT NOT NULL,
      title        TEXT NOT NULL DEFAULT '',
      started_at   TEXT NOT NULL,
      finished_at  TEXT,
      sync_status  TEXT NOT NULL DEFAULT 'pending_create',
      created_at   INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sets (
      local_id         TEXT PRIMARY KEY,
      set_id           INTEGER UNIQUE,
      local_workout_id TEXT NOT NULL REFERENCES workouts(local_id) ON DELETE CASCADE,
      workout_id       INTEGER,
      exercise_id      INTEGER NOT NULL,
      reps             INTEGER NOT NULL DEFAULT 0,
      difficulty       INTEGER NOT NULL DEFAULT 0,
      weight           REAL NOT NULL DEFAULT 0,
      unit             TEXT NOT NULL DEFAULT 'kg',
      logged_at        TEXT NOT NULL,
      sync_status      TEXT NOT NULL DEFAULT 'pending_create',
      created_at       INTEGER NOT NULL
    );
  `);
  return db;
}
