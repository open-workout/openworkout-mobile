import { useEffect } from 'react';
import { Stack } from "expo-router";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SQLiteProvider, type SQLiteDatabase } from 'expo-sqlite';
import { I18nextProvider } from 'react-i18next';
import '@/global.css';
import { setDb } from '@/db/database';
import { insertCsvExercises } from '@/db/exercises';
import i18n from '@/i18n';
import { getLanguage } from '@/storage';
import { C } from '@/theme/colors';

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
  // Migration: add distance and measurement_type columns to sets if missing
  // (measurement_type is per-set — the same exercise can be logged with
  // different sets in reps, time, or distance)
  if (setCols.length > 0 && !setCols.find((c) => c.name === 'distance')) {
    await database.execAsync('ALTER TABLE sets ADD COLUMN distance REAL;');
  }
  if (setCols.length > 0 && !setCols.find((c) => c.name === 'measurement_type')) {
    await database.execAsync(`ALTER TABLE sets ADD COLUMN measurement_type TEXT NOT NULL DEFAULT 'reps';`);
  }
  // Migration: add drop_set_number column to sets if missing (0 = normal set, N = the Nth drop in its chain)
  if (setCols.length > 0 && !setCols.find((c) => c.name === 'drop_set_number')) {
    await database.execAsync('ALTER TABLE sets ADD COLUMN drop_set_number INTEGER NOT NULL DEFAULT 0;');
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

  // Migration: add equipment and csv_id columns to exercises if missing (from the CSV-imported dataset)
  if (exerciseCols.length > 0 && !exerciseCols.find((c) => c.name === 'equipment')) {
    await database.execAsync(`ALTER TABLE exercises ADD COLUMN equipment TEXT NOT NULL DEFAULT '[]';`);
  }
  if (exerciseCols.length > 0 && !exerciseCols.find((c) => c.name === 'csv_id')) {
    await database.execAsync('ALTER TABLE exercises ADD COLUMN csv_id TEXT;');
  }
  if (exerciseCols.length > 0 && !exerciseCols.find((c) => c.name === 'human_readable_id')) {
    await database.execAsync('ALTER TABLE exercises ADD COLUMN human_readable_id TEXT;');
  }

  // Migration: drop exercise_type — the compound/accessory/isolation concept was removed.
  if (exerciseCols.length > 0 && exerciseCols.find((c) => c.name === 'exercise_type')) {
    await database.execAsync('ALTER TABLE exercises DROP COLUMN exercise_type;');
  }

  // Migration: add split_day_name column to workouts if missing (tracks split rotation)
  const workoutCols = await database.getAllAsync<{ name: string }>('PRAGMA table_info(workouts)');
  if (workoutCols.length > 0 && !workoutCols.find((c) => c.name === 'split_day_name')) {
    await database.execAsync('ALTER TABLE workouts ADD COLUMN split_day_name TEXT;');
  }
  // Migration: add superset_links column to workouts if missing (JSON array of exercise refs
  // that are each linked with whichever exercise comes right after them)
  if (workoutCols.length > 0 && !workoutCols.find((c) => c.name === 'superset_links')) {
    await database.execAsync(`ALTER TABLE workouts ADD COLUMN superset_links TEXT NOT NULL DEFAULT '[]';`);
  }

  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS exercises (
      id                TEXT PRIMARY KEY,
      name              TEXT NOT NULL,
      primary_muscles   TEXT,
      secondary_muscles TEXT,
      alt_names         TEXT,
      description       TEXT,
      weight_direction  INTEGER DEFAULT 1,
      logging_type      TEXT NOT NULL DEFAULT 'reps',
      created_at        INTEGER,
      equipment         TEXT NOT NULL DEFAULT '[]',
      csv_id            TEXT,
      human_readable_id TEXT,
      animation_name    TEXT,
      can_be_done_in_reps     INTEGER NOT NULL DEFAULT 1,
      can_be_done_in_time     INTEGER NOT NULL DEFAULT 1,
      can_be_done_in_distance INTEGER NOT NULL DEFAULT 0,
      requires_weight         INTEGER NOT NULL DEFAULT 0
    );
  `);
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS workouts (
      id             TEXT PRIMARY KEY,
      title          TEXT NOT NULL DEFAULT '',
      started_at     TEXT NOT NULL,
      finished_at    TEXT,
      split_day_name TEXT,
      created_at     INTEGER NOT NULL,
      superset_links TEXT NOT NULL DEFAULT '[]'
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
      position         INTEGER NOT NULL DEFAULT 0,
      drop_set_number  INTEGER NOT NULL DEFAULT 0,
      distance         REAL,
      measurement_type TEXT NOT NULL DEFAULT 'reps'
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

  // Migration: remove exercises seeded from the retired curated SEED_EXERCISES
  // dataset — the CSV-derived catalog (seedcsv_-prefixed, seeded below) is now
  // the only preloaded exercise source. ESCAPE keeps SQLite's '_' wildcard
  // from also matching "seedcsv_" rows, which must be left alone; sets
  // logged against a removed exercise aren't touched, same as deleting any
  // other exercise.
  await database.runAsync(`DELETE FROM exercises WHERE id LIKE 'seed\\_%' ESCAPE '\\'`);

  // Seed the CSV-derived exercise dataset. Gated on its own one-time marker so
  // it only runs once. Supersedes the older seedjson_ dataset (thinner: no
  // equipment, no csv_id) — delete those rows first so upgrading installs
  // don't end up with both.
  const csvSeeded = await database.getFirstAsync<{ id: string }>(
    `SELECT id FROM exercises WHERE id LIKE 'seedcsv_%' LIMIT 1`,
  );
  if (!csvSeeded) {
    await database.runAsync(`DELETE FROM exercises WHERE id LIKE 'seedjson_%'`);
    await insertCsvExercises(database);
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
          <Stack.Screen name="exercise-stats" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
          <Stack.Screen name="muscle-stats" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
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
