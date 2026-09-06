import type { SQLiteDatabase } from 'expo-sqlite';
import { getDb } from './database';
import exercisesCsv from '../constants/exercisesCsv.json';

type CsvExercise = {
  csvId: string;
  name: string;
  humanReadableId: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipment: string[];
  canBeDoneInReps: boolean;
  canBeDoneInTime: boolean;
  canBeDoneInDistance: boolean;
  requiresWeight: boolean;
  weightDirection: number;
};

export type LoggingType = 'reps' | 'time';

export type Exercise = {
  id: string;
  name: string;
  primary_muscles: string[];
  secondary_muscles: string[];
  alt_names: string[];
  description: string;
  weight_direction: number;
  logging_type: LoggingType;
  created_at: number;
  animation_name: string | null;
  can_be_done_in_reps: boolean;
  can_be_done_in_time: boolean;
  can_be_done_in_distance: boolean;
  requires_weight: boolean;
  equipment: string[];
  csv_id: string | null;
  human_readable_id: string | null;
};

export type NewExerciseInput = {
  name: string;
  primary_muscles: string[];
  secondary_muscles: string[];
  alt_names: string[];
  description: string;
  weight_direction: number;
  logging_type?: LoggingType;
};

type RawRow = {
  id: string;
  name: string;
  primary_muscles: string;
  secondary_muscles: string;
  alt_names: string;
  description: string;
  weight_direction: number;
  logging_type: string;
  created_at: number;
  animation_name: string | null;
  can_be_done_in_reps: number;
  can_be_done_in_time: number;
  can_be_done_in_distance: number;
  requires_weight: number;
  equipment: string;
  csv_id: string | null;
  human_readable_id: string | null;
};

function parseRow(row: RawRow): Exercise {
  return {
    ...row,
    primary_muscles: JSON.parse(row.primary_muscles || '[]'),
    secondary_muscles: JSON.parse(row.secondary_muscles || '[]'),
    alt_names: JSON.parse(row.alt_names || '[]'),
    equipment: JSON.parse(row.equipment || '[]'),
    logging_type: row.logging_type === 'time' ? 'time' : 'reps',
    can_be_done_in_reps: !!row.can_be_done_in_reps,
    can_be_done_in_time: !!row.can_be_done_in_time,
    can_be_done_in_distance: !!row.can_be_done_in_distance,
    requires_weight: !!row.requires_weight,
  };
}

function generateId(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

// Lets any mounted useExercises() instance know the table changed from outside its own
// create/edit/delete calls (currently just resetCsvExerciseLibrary), so it can refresh
// without relying on navigation focus events (which aren't available in unit tests).
const exerciseChangeListeners = new Set<() => void>();

export function subscribeToExerciseChanges(listener: () => void): () => void {
  exerciseChangeListeners.add(listener);
  return () => exerciseChangeListeners.delete(listener);
}

function notifyExerciseChangeListeners(): void {
  exerciseChangeListeners.forEach((listener) => listener());
}

export async function insertExercise(input: NewExerciseInput): Promise<string> {
  const db = await getDb();
  const id = generateId();
  await db.runAsync(
    `INSERT INTO exercises
       (id, name, primary_muscles, secondary_muscles,
        alt_names, description, weight_direction, logging_type, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.name,
    JSON.stringify(input.primary_muscles),
    JSON.stringify(input.secondary_muscles),
    JSON.stringify(input.alt_names),
    input.description,
    input.weight_direction,
    input.logging_type ?? 'reps',
    Date.now(),
  );
  return id;
}

export async function updateExercise(exercise: Exercise, input: NewExerciseInput): Promise<void> {
  const db = await getDb();
  if (exercise.id) {
    await db.runAsync(
      `UPDATE exercises SET name=?, primary_muscles=?, secondary_muscles=?, alt_names=?, description=?, weight_direction=?, logging_type=? WHERE id=?`,
      input.name, JSON.stringify(input.primary_muscles),
      JSON.stringify(input.secondary_muscles), JSON.stringify(input.alt_names),
      input.description, input.weight_direction, input.logging_type ?? 'reps', exercise.id,
    );
  } else {
    await db.runAsync(
      `UPDATE exercises SET name=?, primary_muscles=?, secondary_muscles=?, alt_names=?, description=?, weight_direction=?, logging_type=? WHERE name=?`,
      input.name, JSON.stringify(input.primary_muscles),
      JSON.stringify(input.secondary_muscles), JSON.stringify(input.alt_names),
      input.description, input.weight_direction, input.logging_type ?? 'reps', exercise.name,
    );
  }
}

export async function deleteExercise(exercise: Exercise): Promise<void> {
  const db = await getDb();
  if (exercise.id) {
    await db.runAsync(`DELETE FROM exercises WHERE id=?`, exercise.id);
  } else {
    await db.runAsync(`DELETE FROM exercises WHERE name=?`, exercise.name);
  }
}

export async function deleteAllSeedExercises(): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM exercises WHERE id LIKE 'seed_%'`);
}

export async function deleteAllUserExercises(): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM exercises WHERE id NOT LIKE 'seed_%'`);
}

// Inserts the CSV-derived exercise dataset (constants/exercisesCsv.json) into the
// exercises table under seedcsv_-prefixed ids. Shared by the initial app-launch seeding
// in app/_layout.tsx and the dev-only resetCsvExerciseLibrary below, so both stay in sync.
export async function insertCsvExercises(db: SQLiteDatabase): Promise<void> {
  const now = Date.now();
  await db.withTransactionAsync(async () => {
    for (const ex of exercisesCsv as CsvExercise[]) {
      const id = `seedcsv_${ex.csvId}`;
      const loggingType = ex.canBeDoneInReps ? 'reps' : 'time';
      await db.runAsync(
        `INSERT INTO exercises
           (id, name, primary_muscles, secondary_muscles,
            alt_names, description, weight_direction, logging_type, created_at,
            can_be_done_in_reps, can_be_done_in_time,
            can_be_done_in_distance, requires_weight, equipment, csv_id, human_readable_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        id,
        ex.name,
        JSON.stringify(ex.primaryMuscles),
        JSON.stringify(ex.secondaryMuscles),
        '[]',
        '',
        ex.weightDirection,
        loggingType,
        now,
        ex.canBeDoneInReps ? 1 : 0,
        ex.canBeDoneInTime ? 1 : 0,
        ex.canBeDoneInDistance ? 1 : 0,
        ex.requiresWeight ? 1 : 0,
        JSON.stringify(ex.equipment),
        ex.csvId,
        ex.humanReadableId,
      );
    }
  });
}

// Dev-only: wipes the CSV-derived exercises and reseeds them from the current
// exercisesCsv.json, so tweaks to scripts/generate-exercises-from-csv.js can be seen
// without uninstalling the app / clearing its storage.
export async function resetCsvExerciseLibrary(): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM exercises WHERE id LIKE 'seedcsv_%'`);
  await insertCsvExercises(db);
  notifyExerciseChangeListeners();
}

export async function getAllExercises(): Promise<Exercise[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<RawRow>(
    `SELECT * FROM exercises ORDER BY created_at DESC`,
  );
  return rows.map(parseRow);
}
