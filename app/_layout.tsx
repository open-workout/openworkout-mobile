import { useEffect } from 'react';
import { Stack } from "expo-router";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SQLiteProvider, type SQLiteDatabase } from 'expo-sqlite';
import { I18nextProvider } from 'react-i18next';
import '@/global.css';
import { setDb } from './db/database';
import { SEED_EXERCISES } from './constants/exerciseData';
import exercisesJson from './constants/exercises.json';
import i18n from './i18n';
import { getLanguage } from './storage';
import { C } from './theme/colors';

async function initializeDb(database: SQLiteDatabase) {
  setDb(database);

  await database.execAsync('PRAGMA journal_mode = WAL;');
  await database.execAsync('PRAGMA foreign_keys = ON;');

  // Migration: add id column to exercises if missing (older installs pre-date this column)
  const exerciseCols = await database.getAllAsync<{ name: string }>('PRAGMA table_info(exercises)');
  if (exerciseCols.length > 0 && !exerciseCols.find((c) => c.name === 'id')) {
    await database.execAsync('ALTER TABLE exercises ADD COLUMN id TEXT;');
  }

  // Migration: add unit column to exercise_stats if missing
  const statCols = await database.getAllAsync<{ name: string }>('PRAGMA table_info(exercise_stats)');
  if (statCols.length > 0 && !statCols.find((c) => c.name === 'unit')) {
    await database.execAsync(`ALTER TABLE exercise_stats ADD COLUMN unit TEXT NOT NULL DEFAULT 'kg';`);
  }

  // Migration: add is_pr column to sets if missing
  const setCols = await database.getAllAsync<{ name: string }>('PRAGMA table_info(sets)');
  if (setCols.length > 0 && !setCols.find((c) => c.name === 'is_pr')) {
    await database.execAsync('ALTER TABLE sets ADD COLUMN is_pr INTEGER NOT NULL DEFAULT 0;');
  }
  // Migration: add duration_seconds column to sets if missing (time-based sets)
  if (setCols.length > 0 && !setCols.find((c) => c.name === 'duration_seconds')) {
    await database.execAsync('ALTER TABLE sets ADD COLUMN duration_seconds INTEGER;');
  }
  // Migration: add is_warmup column to sets if missing
  if (setCols.length > 0 && !setCols.find((c) => c.name === 'is_warmup')) {
    await database.execAsync('ALTER TABLE sets ADD COLUMN is_warmup INTEGER NOT NULL DEFAULT 0;');
  }
  // Migration: add position column to sets if missing (explicit ordering for pre-generated sets)
  if (setCols.length > 0 && !setCols.find((c) => c.name === 'position')) {
    await database.execAsync('ALTER TABLE sets ADD COLUMN position INTEGER NOT NULL DEFAULT 0;');
  }

  // Migration: add logging_type column to exercises if missing (reps vs. time based)
  if (exerciseCols.length > 0 && !exerciseCols.find((c) => c.name === 'logging_type')) {
    await database.execAsync(`ALTER TABLE exercises ADD COLUMN logging_type TEXT NOT NULL DEFAULT 'reps';`);
  }

  // Migration: add capability columns to exercises if missing (from the imported exercise dataset)
  if (exerciseCols.length > 0 && !exerciseCols.find((c) => c.name === 'animation_name')) {
    await database.execAsync('ALTER TABLE exercises ADD COLUMN animation_name TEXT;');
  }
  if (exerciseCols.length > 0 && !exerciseCols.find((c) => c.name === 'can_be_done_in_reps')) {
    await database.execAsync('ALTER TABLE exercises ADD COLUMN can_be_done_in_reps INTEGER NOT NULL DEFAULT 1;');
  }
  if (exerciseCols.length > 0 && !exerciseCols.find((c) => c.name === 'can_be_done_in_time')) {
    await database.execAsync('ALTER TABLE exercises ADD COLUMN can_be_done_in_time INTEGER NOT NULL DEFAULT 1;');
  }
  if (exerciseCols.length > 0 && !exerciseCols.find((c) => c.name === 'can_be_done_in_distance')) {
    await database.execAsync('ALTER TABLE exercises ADD COLUMN can_be_done_in_distance INTEGER NOT NULL DEFAULT 0;');
  }
  if (exerciseCols.length > 0 && !exerciseCols.find((c) => c.name === 'requires_weight')) {
    await database.execAsync('ALTER TABLE exercises ADD COLUMN requires_weight INTEGER NOT NULL DEFAULT 0;');
  }

  // Migration: add split_day_name column to workouts if missing (tracks split rotation)
  const workoutCols = await database.getAllAsync<{ name: string }>('PRAGMA table_info(workouts)');
  if (workoutCols.length > 0 && !workoutCols.find((c) => c.name === 'split_day_name')) {
    await database.execAsync('ALTER TABLE workouts ADD COLUMN split_day_name TEXT;');
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
      logging_type      TEXT NOT NULL DEFAULT 'reps',
      created_at        INTEGER
    );
  `);
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS workouts (
      id             TEXT PRIMARY KEY,
      title          TEXT NOT NULL DEFAULT '',
      started_at     TEXT NOT NULL,
      finished_at    TEXT,
      split_day_name TEXT,
      created_at     INTEGER NOT NULL
    );
  `);
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS sets (
      id               TEXT PRIMARY KEY,
      workout_id       TEXT NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
      exercise_id      TEXT NOT NULL,
      reps             INTEGER NOT NULL DEFAULT 0,
      difficulty       INTEGER NOT NULL DEFAULT 0,
      weight           REAL    NOT NULL DEFAULT 0,
      unit             TEXT    NOT NULL DEFAULT 'kg',
      logged_at        TEXT    NOT NULL,
      created_at       INTEGER NOT NULL,
      is_pr            INTEGER NOT NULL DEFAULT 0,
      duration_seconds INTEGER,
      is_warmup        INTEGER NOT NULL DEFAULT 0,
      position         INTEGER NOT NULL DEFAULT 0
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
    CREATE TABLE IF NOT EXISTS routines (
      id           TEXT    PRIMARY KEY,
      name         TEXT    NOT NULL,
      exercise_ids TEXT    NOT NULL DEFAULT '[]',
      created_at   INTEGER NOT NULL
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

  const row = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM exercises',
  );
  if ((row?.count ?? 0) === 0) {
    const now = Date.now();
    await database.withTransactionAsync(async () => {
      for (const ex of SEED_EXERCISES) {
        const id = `seed_${Math.random().toString(36).slice(2, 10)}`;
        await database.runAsync(
          `INSERT INTO exercises
             (id, name, exercise_type, primary_muscles, secondary_muscles,
              alt_names, description, weight_direction, logging_type, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          id,
          ex.name,
          ex.exercise_type,
          JSON.stringify(ex.primary_muscles),
          JSON.stringify(ex.secondary_muscles),
          JSON.stringify(ex.alt_names),
          ex.description,
          ex.weight_direction,
          ex.logging_type ?? 'reps',
          now,
        );
      }
    });
  }

  // Seed the larger imported exercise dataset (independent of the check above, since
  // installs that already had the original SEED_EXERCISES seeded would otherwise never
  // pick this up). Gated on its own one-time marker so it only runs once.
  const jsonSeeded = await database.getFirstAsync<{ id: string }>(
    `SELECT id FROM exercises WHERE id LIKE 'seedjson_%' LIMIT 1`,
  );
  if (!jsonSeeded) {
    const now = Date.now();
    await database.withTransactionAsync(async () => {
      for (const ex of exercisesJson as Array<{
        id: string;
        name: string;
        animationName: string;
        canBeDoneInReps: boolean;
        canBeDoneInTime: boolean;
        canBeDoneInDistance: boolean;
        requiresWeight: boolean;
        primaryMuscles: string[];
      }>) {
        const id = `seedjson_${ex.id}`;
        const weightDirection = /assisted/i.test(ex.name) ? -1 : 1;
        const loggingType = ex.canBeDoneInReps ? 'reps' : 'time';
        await database.runAsync(
          `INSERT INTO exercises
             (id, name, exercise_type, primary_muscles, secondary_muscles,
              alt_names, description, weight_direction, logging_type, created_at,
              animation_name, can_be_done_in_reps, can_be_done_in_time,
              can_be_done_in_distance, requires_weight)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          id,
          ex.name,
          'accessory',
          JSON.stringify(ex.primaryMuscles),
          '[]',
          '[]',
          '',
          weightDirection,
          loggingType,
          now,
          ex.animationName,
          ex.canBeDoneInReps ? 1 : 0,
          ex.canBeDoneInTime ? 1 : 0,
          ex.canBeDoneInDistance ? 1 : 0,
          ex.requiresWeight ? 1 : 0,
        );
      }
    });
  }
}

export default function RootLayout() {
  useEffect(() => {
    getLanguage().then((lang) => {
      if (lang && lang !== i18n.language) i18n.changeLanguage(lang);
    });
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <I18nextProvider i18n={i18n}>
      <SQLiteProvider databaseName="openworkout.db" onInit={initializeDb}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="welcome" options={{ headerShown: false, gestureEnabled: false, animation: 'none' }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false, animation: 'none' }} />
          <Stack.Screen name="pick-day" options={{ headerShown: false, presentation: 'modal' }} />
          <Stack.Screen name="edit-split" options={{ headerShown: false, presentation: 'modal' }} />
          <Stack.Screen name="edit-routine" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
          <Stack.Screen name="settings" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
          <Stack.Screen
            name="generated-workout"
            options={{
              headerShown: false,
              presentation: 'fullScreenModal',
              animation: 'slide_from_bottom',
              contentStyle: { backgroundColor: C.bg },
            }}
          />
        </Stack>
      </SQLiteProvider>
    </I18nextProvider>
    </GestureHandlerRootView>
  );
}
