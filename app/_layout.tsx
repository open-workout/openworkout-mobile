import { Stack } from "expo-router";
import { SQLiteProvider, type SQLiteDatabase } from 'expo-sqlite';
import '@/global.css';
import { setDb } from './db/database';

async function initializeDb(database: SQLiteDatabase) {
  setDb(database);

  await database.execAsync('PRAGMA journal_mode = WAL;');
  await database.execAsync('PRAGMA foreign_keys = ON;');

  // Migration: add id column to exercises if missing (older installs pre-date this column)
  const exerciseCols = await database.getAllAsync<{ name: string }>('PRAGMA table_info(exercises)');
  if (exerciseCols.length > 0 && !exerciseCols.find((c) => c.name === 'id')) {
    await database.execAsync('ALTER TABLE exercises ADD COLUMN id TEXT;');
  }

  await database.execAsync(`
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
  `);
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS workouts (
      id          TEXT PRIMARY KEY,
      title       TEXT NOT NULL DEFAULT '',
      started_at  TEXT NOT NULL,
      finished_at TEXT,
      created_at  INTEGER NOT NULL
    );
  `);
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS sets (
      id          TEXT PRIMARY KEY,
      workout_id  TEXT NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
      exercise_id TEXT NOT NULL,
      reps        INTEGER NOT NULL DEFAULT 0,
      difficulty  INTEGER NOT NULL DEFAULT 0,
      weight      REAL    NOT NULL DEFAULT 0,
      unit        TEXT    NOT NULL DEFAULT 'kg',
      logged_at   TEXT    NOT NULL,
      created_at  INTEGER NOT NULL
    );
  `);
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS splits (
      id         TEXT    PRIMARY KEY,
      name       TEXT    NOT NULL,
      days       TEXT    NOT NULL DEFAULT '[]',
      created_at INTEGER NOT NULL
    );
  `);
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS exercise_stats (
      exercise_id        TEXT    NOT NULL PRIMARY KEY,
      last_performed_at  INTEGER,
      times_last_21_days INTEGER DEFAULT 0,
      last_weight        REAL,
      last_reps          INTEGER,
      unit               TEXT    NOT NULL DEFAULT 'kg'
    );
  `);
}

export default function RootLayout() {
  return (
    <SQLiteProvider databaseName="openworkout.db" onInit={initializeDb}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="welcome" options={{ headerShown: false, gestureEnabled: false, animation: 'none' }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false, animation: 'none' }} />
        <Stack.Screen name="pick-day" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="edit-split" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="workout" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="generated-workout" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
      </Stack>
    </SQLiteProvider>
  );
}
